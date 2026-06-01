import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

vi.mock("@/lib/chains", () => ({
  getActiveChain: vi.fn(() => ({
    id: 66238,
    explorerApiUrl: "https://explorer.testnet.chain.oma3.org/api",
  })),
}))

import { checkProofOnChain } from "@/lib/proof-check"

// SSRF guard for the proof-check explorer fallback — asserted through the
// public `checkProofOnChain` boundary rather than importing the internal
// `isSafeExplorerUrl` helper (which isn't, and shouldn't be forced to be, a
// public export). The behavior under test: a client-provided explorer URL is
// only fetched server-side when it is safe; unsafe URLs must never be fetched.
//
// Maps to threat-model section S2 in
// docs/testing/review-widget-security-tests.md.

const baseInput = {
  walletAddress: "0x1111111111111111111111111111111111111111",
  contractAddress: "0x2222222222222222222222222222222222222222",
  // Deliberately NOT the mocked active chain id (66238) so the chain-config
  // explorer fallback can't fire and muddy the fetch-count assertions.
  chainId: 8453,
}

// A non-ok Insight response whose reason contains "Thirdweb Insight" is what
// makes `checkProofOnChain` consider the client-provided explorer fallback.
function mockInsightFailure(mockFetch: Mock) {
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ error: "unsupported chain" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  )
}

describe("proof-check explorer SSRF guard (via checkProofOnChain)", () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  const unsafeUrls: Array<[string, string]> = [
    ["non-HTTPS", "http://api.basescan.org/api"],
    ["localhost", "https://localhost/api"],
    ["loopback IPv4", "https://127.0.0.1/api"],
    ["documentation IPv4", "https://192.0.2.1/api"],
    ["private IPv4", "https://10.0.0.1/api"],
    [".internal suffix", "https://metadata.internal/api"],
    [".local suffix", "https://router.local/api"],
    ["hostname without a dot", "https://localhosttest/api"],
    ["userinfo disguising loopback", "https://user@127.0.0.1/api"],
  ]

  it.each(unsafeUrls)(
    "does not fetch an unsafe explorer URL (%s)",
    async (_label, explorerApiUrl) => {
      mockInsightFailure(mockFetch)

      const result = await checkProofOnChain({ ...baseInput, explorerApiUrl })

      // Only the Insight call should have happened — the unsafe URL is never fetched.
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(String(mockFetch.mock.calls[0][0])).toContain("insight.thirdweb.com")
      expect(result.verified).toBe(false)
    }
  )

  const safeUrls: string[] = ["https://api.basescan.org/api", "https://basescan.org/api"]

  it.each(safeUrls)("fetches a safe public HTTPS explorer URL (%s)", async (explorerApiUrl) => {
    mockInsightFailure(mockFetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ result: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await checkProofOnChain({ ...baseInput, explorerApiUrl })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(String(mockFetch.mock.calls[1][0])).toContain(new URL(explorerApiUrl).host)
  })
})

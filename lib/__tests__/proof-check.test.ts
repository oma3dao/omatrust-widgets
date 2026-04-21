import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/chains", () => ({
  getActiveChain: vi.fn(() => ({
    id: 66238,
    explorerApiUrl: "https://explorer.testnet.chain.oma3.org/api",
  })),
}))

import { checkProofOnChain } from "@/lib/proof-check"

describe("checkProofOnChain", () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  it("returns verified when Thirdweb Insight finds a transaction", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ hash: "0xabc" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )

    const result = await checkProofOnChain(
      {
        walletAddress: "0x1111111111111111111111111111111111111111",
        contractAddress: "0x2222222222222222222222222222222222222222",
        chainId: 8453,
      },
      "client-id"
    )

    expect(result.verified).toBe(true)
    expect(result.txHash).toBe("0xabc")
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [firstUrl, firstInit] = mockFetch.mock.calls[0]
    expect(String(firstUrl)).toContain("8453.insight.thirdweb.com/v1/transactions")
    expect(firstInit.headers["x-client-id"]).toBe("client-id")
  })

  it("falls back to safe client explorer when Insight returns a Thirdweb error", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "unsupported chain" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: [{ to: "0x2222222222222222222222222222222222222222", isError: "0", hash: "0xdef" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )

    const result = await checkProofOnChain({
      walletAddress: "0x1111111111111111111111111111111111111111",
      contractAddress: "0x2222222222222222222222222222222222222222",
      chainId: 8453,
      explorerApiUrl: "https://api.basescan.org",
    })

    expect(result.verified).toBe(true)
    expect(result.txHash).toBe("0xdef")
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(String(mockFetch.mock.calls[1][0])).toContain("https://api.basescan.org/api?")
  })

  it("does not call unsafe client explorer URL and returns Insight failure", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "auth required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    )

    const result = await checkProofOnChain({
      walletAddress: "0x1111111111111111111111111111111111111111",
      contractAddress: "0x2222222222222222222222222222222222222222",
      chainId: 8453,
      explorerApiUrl: "https://127.0.0.1/api",
    })

    expect(result.verified).toBe(false)
    expect(result.reason).toContain("Thirdweb Insight returned 401")
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("falls back to chain explorer when client explorer is missing", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "temporary failure" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    const result = await checkProofOnChain({
      walletAddress: "0x1111111111111111111111111111111111111111",
      contractAddress: "0x2222222222222222222222222222222222222222",
      chainId: 66238,
    })

    expect(result.verified).toBe(false)
    expect(result.reason).toContain("No transactions found")
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(String(mockFetch.mock.calls[1][0])).toContain("explorer.testnet.chain.oma3.org/api?")
  })

  it("does not fallback when Insight returns a non-Thirdweb reason", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const result = await checkProofOnChain({
      walletAddress: "0x1111111111111111111111111111111111111111",
      contractAddress: "0x2222222222222222222222222222222222222222",
      chainId: 66238,
      explorerApiUrl: "https://api.basescan.org",
    })

    expect(result.verified).toBe(false)
    expect(result.reason).toContain("No transactions found")
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("returns explorer format error when fallback response is malformed", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "auth required" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "NOTOK", result: "bad" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    const result = await checkProofOnChain({
      walletAddress: "0x1111111111111111111111111111111111111111",
      contractAddress: "0x2222222222222222222222222222222222222222",
      chainId: 8453,
      explorerApiUrl: "https://api.basescan.org/api",
    })

    expect(result.verified).toBe(false)
    expect(result.reason).toContain("Explorer API returned unexpected format")
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

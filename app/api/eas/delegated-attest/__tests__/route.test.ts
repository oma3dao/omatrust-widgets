import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/chains", () => ({
  getActiveChain: vi.fn(() => ({
    relayBaseUrl: "https://api.omatrust.org",
  })),
}))

import { POST } from "@/app/api/eas/delegated-attest/route"
import { getActiveChain } from "@/lib/chains"

describe("POST /api/eas/delegated-attest", () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch)
    vi.mocked(getActiveChain).mockReturnValue({
      relayBaseUrl: "https://api.omatrust.org",
    } as ReturnType<typeof getActiveChain>)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  it("proxies JSON body to relay and returns relay status + JSON", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ uid: "0x123", txHash: "0xabc" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const body = JSON.stringify({ attester: "0x1111111111111111111111111111111111111111", signature: "0xsig" })
    const res = await POST(
      new Request("http://localhost/api/eas/delegated-attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(String(url)).toContain("/v1/delegated-attest")
    expect(init.method).toBe("POST")
    expect(init.headers["Content-Type"]).toBe("application/json")
    expect(init.body).toBe(body)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.uid).toBe("0x123")
  })

  it("uses local relay delegated-attest path when base URL is non-gateway", async () => {
    vi.mocked(getActiveChain).mockReturnValue({
      relayBaseUrl: "http://localhost:3001",
    } as ReturnType<typeof getActiveChain>)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ uid: "0xlocal" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const res = await POST(
      new Request("http://localhost/api/eas/delegated-attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ any: "thing" }),
      })
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(String(mockFetch.mock.calls[0][0])).toBe("http://localhost:3001/api/eas/delegated-attest")
    expect(res.status).toBe(200)
  })

  it("returns structured error when relay returns non-JSON", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("<html>bad gateway</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      })
    )

    const res = await POST(
      new Request("http://localhost/api/eas/delegated-attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ any: "thing" }),
      })
    )

    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toContain("Relay returned non-JSON response (502)")
  })
})

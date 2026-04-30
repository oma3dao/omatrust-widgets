import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { GET } from "@/app/api/eas/nonce/route"

describe("GET /api/eas/nonce", () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ nonce: "7" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  it("returns 400 when attester is missing", async () => {
    const res = await GET(new Request("http://localhost/api/eas/nonce"))
    expect(res.status).toBe(400)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("returns 400 when attester is not a valid EVM address", async () => {
    const res = await GET(
      new Request("http://localhost/api/eas/nonce?attester=0x123&foo=bar")
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Invalid attester address")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("proxies to relay with encoded query and returns relay JSON", async () => {
    const attester = "0x1111111111111111111111111111111111111111"
    const res = await GET(new Request(`http://localhost/api/eas/nonce?attester=${attester}`))

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const relayUrl = mockFetch.mock.calls[0][0] as string
    expect(relayUrl).toMatch(/\/v1\/nonce\?/)
    expect(relayUrl).toContain(`attester=${encodeURIComponent(attester)}`)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.nonce).toBe("7")
  })
})

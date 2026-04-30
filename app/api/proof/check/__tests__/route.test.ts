import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/proof-check", () => ({
  checkProofOnChain: vi.fn(),
}))

import { POST } from "@/app/api/proof/check/route"
import { checkProofOnChain } from "@/lib/proof-check"

describe("POST /api/proof/check", () => {
  beforeEach(() => {
    vi.mocked(checkProofOnChain).mockReset()
  })

  it("returns 400 when body is not valid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/proof/check", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      })
    )
    expect(res.status).toBe(400)
    expect(checkProofOnChain).not.toHaveBeenCalled()
  })

  it("returns 400 when Zod validation fails", async () => {
    const res = await POST(
      new Request("http://localhost/api/proof/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: "0xbad",
          contractAddress: "0x2222222222222222222222222222222222222222",
          chainId: 1,
        }),
      })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Invalid proof check request")
    expect(checkProofOnChain).not.toHaveBeenCalled()
  })

  it("calls checkProofOnChain and returns its JSON", async () => {
    vi.mocked(checkProofOnChain).mockResolvedValue({
      verified: false,
      chainId: 8453,
      contractAddress: "0x2222222222222222222222222222222222222222",
      reason: "No transactions found from this wallet to the configured contract.",
    })

    const body = {
      walletAddress: "0x1111111111111111111111111111111111111111",
      contractAddress: "0x2222222222222222222222222222222222222222",
      chainId: 8453,
      explorerApiUrl: "https://api.basescan.org/api",
    }

    const res = await POST(
      new Request("http://localhost/api/proof/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.verified).toBe(false)
    expect(json.chainId).toBe(8453)
    expect(checkProofOnChain).toHaveBeenCalledTimes(1)
    expect(checkProofOnChain).toHaveBeenCalledWith(
      {
        walletAddress: body.walletAddress,
        contractAddress: body.contractAddress,
        chainId: body.chainId,
        explorerApiUrl: body.explorerApiUrl,
      },
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID
    )
  })
})

import { describe, expect, it } from "vitest"
import { validateHostSignTypedDataRequest } from "@/lib/host-bridge-validation"

const validPayload = {
  type: "omatrust:signTypedData",
  id: "req-1",
  domain: {
    name: "EAS",
    version: "1.4.0",
    chainId: 66238,
    verifyingContract: "0x1111111111111111111111111111111111111111",
  },
  types: {
    Attest: [
      { name: "schema", type: "bytes32" },
      { name: "recipient", type: "address" },
    ],
  },
  message: {
    schema: "0xabc",
  },
}

describe("validateHostSignTypedDataRequest", () => {
  it("accepts valid attestation signing payload", () => {
    const res = validateHostSignTypedDataRequest(validPayload)
    expect(res.ok).toBe(true)
    expect(res.parsed?.id).toBe("req-1")
  })

  it("rejects unsupported message type", () => {
    const res = validateHostSignTypedDataRequest({ ...validPayload, type: "omatrust:ready" })
    expect(res.ok).toBe(false)
    expect(res.error).toContain("Unsupported")
  })

  it("rejects missing id", () => {
    const { id: _id, ...rest } = validPayload
    const res = validateHostSignTypedDataRequest(rest)
    expect(res.ok).toBe(false)
    expect(res.error).toContain("request id")
  })

  it("rejects wrong EIP-712 domain", () => {
    const res = validateHostSignTypedDataRequest({
      ...validPayload,
      domain: { ...validPayload.domain, name: "NotEAS" },
    })
    expect(res.ok).toBe(false)
    expect(res.error).toContain("Unexpected EIP-712 domain")
  })

  it("rejects payload without Attest type", () => {
    const res = validateHostSignTypedDataRequest({
      ...validPayload,
      types: { Other: [] },
    })
    expect(res.ok).toBe(false)
    expect(res.error).toContain("Missing Attest type")
  })
})


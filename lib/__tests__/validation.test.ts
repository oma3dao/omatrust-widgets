import { describe, expect, it } from "vitest"
import { builderFormSchema, proofCheckRequestSchema } from "@/lib/validation"

describe("proofCheckRequestSchema", () => {
  const valid = {
    walletAddress: "0x1111111111111111111111111111111111111111",
    contractAddress: "0x2222222222222222222222222222222222222222",
    chainId: 8453,
  }

  it("accepts a valid request", () => {
    const r = proofCheckRequestSchema.safeParse(valid)
    expect(r.success).toBe(true)
  })

  it("rejects invalid wallet address", () => {
    const r = proofCheckRequestSchema.safeParse({
      ...valid,
      walletAddress: "0x123",
    })
    expect(r.success).toBe(false)
  })

  it("rejects invalid contract address", () => {
    const r = proofCheckRequestSchema.safeParse({
      ...valid,
      contractAddress: "not-an-address",
    })
    expect(r.success).toBe(false)
  })

  it("rejects non-positive chainId", () => {
    const r = proofCheckRequestSchema.safeParse({ ...valid, chainId: 0 })
    expect(r.success).toBe(false)
  })

  it("rejects malformed explorer URL when present", () => {
    const r = proofCheckRequestSchema.safeParse({
      ...valid,
      explorerApiUrl: "not-a-url",
    })
    expect(r.success).toBe(false)
  })
})

describe("builderFormSchema", () => {
  const base = {
    appUrl: "mygame.com",
    appName: "",
    iconUrl: "",
    contractAddress: "0x1111111111111111111111111111111111111111",
    chainId: 8453,
    explorerApiUrl: "",
  }

  it("accepts minimal valid builder input", () => {
    const r = builderFormSchema.safeParse(base)
    expect(r.success).toBe(true)
  })

  it("rejects invalid contract address", () => {
    const r = builderFormSchema.safeParse({ ...base, contractAddress: "0x1" })
    expect(r.success).toBe(false)
  })

  it("rejects non-positive chainId", () => {
    const r = builderFormSchema.safeParse({ ...base, chainId: 0 })
    expect(r.success).toBe(false)
  })

  it("rejects icon URL that is not a valid URL string", () => {
    const r = builderFormSchema.safeParse({
      ...base,
      iconUrl: "not a valid url",
    })
    expect(r.success).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import { getExpectedHostOriginFromReferrer, isTrustedHostSignatureMessage } from "@/lib/signing-bridge"

describe("getExpectedHostOriginFromReferrer", () => {
  it("returns null when referrer is empty or invalid", () => {
    expect(getExpectedHostOriginFromReferrer("")).toBe(null)
    expect(getExpectedHostOriginFromReferrer("not-a-url")).toBe(null)
  })

  it("extracts origin from referrer", () => {
    expect(getExpectedHostOriginFromReferrer("https://host.example/path?q=1")).toBe("https://host.example")
  })

  it("keeps localhost origin and port", () => {
    expect(getExpectedHostOriginFromReferrer("http://localhost:3000/widgets/reviews/examples/host")).toBe(
      "http://localhost:3000"
    )
  })
})

describe("isTrustedHostSignatureMessage", () => {
  const parentWindow = {} as Window
  const otherWindow = {} as Window
  const base = {
    data: { id: "req-1", type: "omatrust:signature" as const, signature: "0xabc" },
    expectedId: "req-1",
    source: parentWindow as MessageEventSource,
    parentWindow,
    origin: "https://host.example",
    expectedHostOrigin: "https://host.example",
  }

  it("accepts a valid signature response from parent", () => {
    expect(isTrustedHostSignatureMessage(base)).toBe(true)
  })

  it("rejects wrong request id", () => {
    expect(
      isTrustedHostSignatureMessage({
        ...base,
        data: { ...base.data, id: "req-2" },
      })
    ).toBe(false)
  })

  it("rejects unexpected message type", () => {
    expect(
      isTrustedHostSignatureMessage({
        ...base,
        data: { ...base.data, type: "omatrust:hostReady" },
      })
    ).toBe(false)
  })

  it("rejects messages not sent by parent window", () => {
    expect(
      isTrustedHostSignatureMessage({
        ...base,
        source: otherWindow as MessageEventSource,
      })
    ).toBe(false)
  })

  it("rejects wrong origin when expected host origin is known", () => {
    expect(
      isTrustedHostSignatureMessage({
        ...base,
        origin: "https://evil.example",
      })
    ).toBe(false)
  })

  it("allows any origin when expected host origin is unknown", () => {
    expect(
      isTrustedHostSignatureMessage({
        ...base,
        origin: "https://unknown.example",
        expectedHostOrigin: null,
      })
    ).toBe(true)
  })
})

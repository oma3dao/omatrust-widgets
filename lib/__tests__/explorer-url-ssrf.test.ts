import { describe, expect, it } from "vitest"
import { isSafeExplorerUrl } from "@/lib/proof-check"

describe("isSafeExplorerUrl (SSRF guard for proof-check fallback)", () => {
  it("allows typical public HTTPS explorer API hosts", () => {
    expect(isSafeExplorerUrl("https://api.basescan.org/api")).toBe(true)
    expect(isSafeExplorerUrl("https://basescan.org/api")).toBe(true)
  })

  it("rejects non-HTTPS", () => {
    expect(isSafeExplorerUrl("http://api.basescan.org/api")).toBe(false)
  })

  it("rejects localhost and loopback hostnames", () => {
    expect(isSafeExplorerUrl("https://localhost/api")).toBe(false)
    expect(isSafeExplorerUrl("https://127.0.0.1/api")).toBe(false)
  })

  it("rejects literal IPv4 hostnames", () => {
    expect(isSafeExplorerUrl("https://192.0.2.1/api")).toBe(false)
    expect(isSafeExplorerUrl("https://10.0.0.1/api")).toBe(false)
  })

  it("rejects .local and .internal", () => {
    expect(isSafeExplorerUrl("https://metadata.internal/api")).toBe(false)
    expect(isSafeExplorerUrl("https://router.local/api")).toBe(false)
  })

  it("rejects hostnames without a dot (no real public domain)", () => {
    expect(isSafeExplorerUrl("https://localhosttest/api")).toBe(false)
  })

  it("rejects loopback when userinfo tries to disguise the host (URL parser uses real hostname)", () => {
    expect(isSafeExplorerUrl("https://user@127.0.0.1/api")).toBe(false)
  })
})

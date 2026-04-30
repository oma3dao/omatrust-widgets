import { describe, expect, it } from "vitest"
import {
  buildWidgetQuery,
  coerceDomain,
  createWidgetArtifacts,
  deriveSubjectDid,
  getBaseUrl,
  parseWidgetConfigFromSearch,
} from "@/lib/widget-config"
import { SEPOLIA_PROTOCOL_PRESETS } from "@/lib/protocol-presets"

describe("coerceDomain", () => {
  it("strips www and normalizes hostname", () => {
    expect(coerceDomain("www.example.com")).toBe("example.com")
    expect(coerceDomain("https://www.example.com/path")).toBe("example.com")
  })

  it("returns null for empty or invalid input", () => {
    expect(coerceDomain("")).toBe(null)
    expect(coerceDomain("   ")).toBe(null)
  })
})

describe("deriveSubjectDid", () => {
  it("returns did:web for a valid domain", () => {
    const did = deriveSubjectDid("example.com")
    expect(did).toBe("did:web:example.com")
  })

  it("returns null when domain cannot be normalized", () => {
    expect(deriveSubjectDid("")).toBe(null)
  })
})

describe("parseWidgetConfigFromSearch", () => {
  it("returns null when required params are missing", () => {
    expect(parseWidgetConfigFromSearch(new URLSearchParams())).toBe(null)
    expect(parseWidgetConfigFromSearch(new URLSearchParams("url=x.com&contract=0x1111111111111111111111111111111111111111"))).toBe(
      null
    )
  })

  it("returns null for invalid chainId", () => {
    const p = new URLSearchParams({
      url: "game.com",
      contract: "0x1111111111111111111111111111111111111111",
      chainId: "0",
    })
    expect(parseWidgetConfigFromSearch(p)).toBe(null)

    const p2 = new URLSearchParams({
      url: "game.com",
      contract: "0x1111111111111111111111111111111111111111",
      chainId: "abc",
    })
    expect(parseWidgetConfigFromSearch(p2)).toBe(null)
  })

  it("parses optional params", () => {
    const p = new URLSearchParams({
      url: "game.com",
      contract: "0x2222222222222222222222222222222222222222",
      chainId: "8453",
      name: "My Game",
      icon: "https://game.com/icon.png",
      wallet: "0x3333333333333333333333333333333333333333",
      explorer: "https://api.basescan.org/api",
    })
    const c = parseWidgetConfigFromSearch(p)
    expect(c).not.toBeNull()
    expect(c!.chainId).toBe(8453)
    expect(c!.appName).toBe("My Game")
    expect(c!.iconUrl).toBe("https://game.com/icon.png")
    expect(c!.wallet).toBe("0x3333333333333333333333333333333333333333")
    expect(c!.explorerApiUrl).toBe("https://api.basescan.org/api")
    expect(c!.subjectDid).toBe("did:web:game.com")
  })
})

describe("buildWidgetQuery", () => {
  it("serializes required and optional fields", () => {
    const q = buildWidgetQuery({
      appUrl: "app.com",
      domain: "app.com",
      subjectDid: "did:web:app.com",
      contractAddress: "0x4444444444444444444444444444444444444444",
      chainId: 1,
      appName: "A",
      wallet: "0x5555555555555555555555555555555555555555",
    })
    expect(q.get("url")).toBe("app.com")
    expect(q.get("contract")).toBe("0x4444444444444444444444444444444444444444")
    expect(q.get("chainId")).toBe("1")
    expect(q.get("name")).toBe("A")
    expect(q.get("wallet")).toBe("0x5555555555555555555555555555555555555555")
  })
})

describe("getBaseUrl", () => {
  it("uses override when provided", () => {
    expect(getBaseUrl("https://custom.example")).toBe("https://custom.example")
  })

  it("defaults to production reputation origin", () => {
    expect(getBaseUrl()).toBe("https://reputation.omatrust.org")
  })
})

describe("createWidgetArtifacts", () => {
  it("builds sepolia iframe URL for protocol preset with integrated mode snippet", () => {
    const preset = SEPOLIA_PROTOCOL_PRESETS.uniswap
    const artifacts = createWidgetArtifacts(
      {
        appUrl: preset.appUrl,
        appName: preset.appName,
        iconUrl: preset.iconUrl ?? "",
        contractAddress: preset.contractAddress,
        chainId: preset.chainId,
        explorerApiUrl: preset.explorerApiUrl ?? "",
      },
      { baseUrl: "http://localhost:3000", signingMode: "integrated" }
    )

    expect(artifacts.widgetUrl).toContain("/widgets/reviews/embed?")
    expect(artifacts.widgetUrl).toContain("chainId=11155111")
    expect(artifacts.widgetUrl).toContain(`contract=${encodeURIComponent(preset.contractAddress)}`)
    expect(artifacts.snippets.iframe).toContain('id="omatrust-widget"')
    expect(artifacts.snippets.installCmd).toBe("npm install @oma3/omatrust")
  })
})

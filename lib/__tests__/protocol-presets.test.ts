import { describe, expect, it } from "vitest"
import {
  SEPOLIA_CHAIN_ID,
  SEPOLIA_EXPLORER_API_URL,
  SEPOLIA_PROTOCOL_PRESETS,
} from "@/lib/protocol-presets"

describe("SEPOLIA_PROTOCOL_PRESETS", () => {
  it("includes uniswap and aave presets", () => {
    expect(SEPOLIA_PROTOCOL_PRESETS.uniswap).toBeDefined()
    expect(SEPOLIA_PROTOCOL_PRESETS.aave).toBeDefined()
  })

  it("pins all presets to sepolia chain id", () => {
    for (const preset of Object.values(SEPOLIA_PROTOCOL_PRESETS)) {
      expect(preset.chainId).toBe(SEPOLIA_CHAIN_ID)
    }
  })

  it("uses valid-looking contract addresses", () => {
    for (const preset of Object.values(SEPOLIA_PROTOCOL_PRESETS)) {
      expect(preset.contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)
    }
  })

  it("sets etherscan v2 sepolia explorer endpoint", () => {
    for (const preset of Object.values(SEPOLIA_PROTOCOL_PRESETS)) {
      expect(preset.explorerApiUrl).toBe(SEPOLIA_EXPLORER_API_URL)
      expect(preset.explorerApiUrl).toContain("chainid=11155111")
    }
  })
})


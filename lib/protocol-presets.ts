export type SepoliaProtocolPresetId = "uniswap" | "aave"

export type SepoliaProtocolPreset = {
  id: SepoliaProtocolPresetId
  name: string
  appUrl: string
  appName: string
  contractAddress: string
  chainId: number
  iconUrl?: string
  explorerApiUrl?: string
}

export const SEPOLIA_CHAIN_ID = 11155111
export const SEPOLIA_EXPLORER_API_URL = "https://api.etherscan.io/v2/api?chainid=11155111"

export const SEPOLIA_PROTOCOL_PRESETS: Record<SepoliaProtocolPresetId, SepoliaProtocolPreset> = {
  uniswap: {
    id: "uniswap",
    name: "Uniswap (Sepolia)",
    appUrl: "app.uniswap.org",
    appName: "Uniswap",
    contractAddress: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
    chainId: SEPOLIA_CHAIN_ID,
    iconUrl: "https://app.uniswap.org/favicon.ico",
    explorerApiUrl: SEPOLIA_EXPLORER_API_URL,
  },
  aave: {
    id: "aave",
    name: "Aave (Sepolia)",
    appUrl: "app.aave.com",
    appName: "Aave",
    contractAddress: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
    chainId: SEPOLIA_CHAIN_ID,
    iconUrl: "https://app.aave.com/favicon.ico",
    explorerApiUrl: SEPOLIA_EXPLORER_API_URL,
  },
}


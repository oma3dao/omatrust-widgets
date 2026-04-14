/**
 * Attestation chain configuration.
 *
 * The active chain is determined by NEXT_PUBLIC_ACTIVE_CHAIN.
 * Schema UIDs and contract addresses are looked up from the chain config,
 * matching the pattern used by rep-attestation-frontend.
 */

export type ChainConfig = {
  id: number
  name: string
  rpc: string
  easContractAddress: string
  userReviewSchemaUid: string
  relayBaseUrl: string
  explorerApiUrl?: string
}

const omachainTestnet: ChainConfig = {
  id: 66238,
  name: "OMAchain Testnet",
  rpc: "https://rpc.testnet.chain.oma3.org/",
  easContractAddress: "0x8835AF90f1537777F52E482C8630cE4e947eCa32",
  userReviewSchemaUid: "0x7ab3911527e5e47eaab9f5a2c571060026532dde8cb4398185553053963b2a47",
  relayBaseUrl: process.env.NEXT_PUBLIC_RELAY_BASE_URL || "https://api.omatrust.org",
  explorerApiUrl: "https://explorer.testnet.chain.oma3.org/api",
}

const omachainMainnet: ChainConfig = {
  id: 6623,
  name: "OMAchain Mainnet",
  rpc: "https://rpc.chain.oma3.org/",
  easContractAddress: "0x0000000000000000000000000000000000000000", // TODO: deploy
  userReviewSchemaUid: "0x0000000000000000000000000000000000000000000000000000000000000000", // TODO: deploy
  relayBaseUrl: process.env.NEXT_PUBLIC_RELAY_BASE_URL || "https://api.omatrust.org",
  explorerApiUrl: "https://explorer.chain.oma3.org/api", // TODO: confirm
}

export function getActiveChain(): ChainConfig {
  const active = process.env.NEXT_PUBLIC_ACTIVE_CHAIN

  switch (active) {
    case "omachain-mainnet":
      return omachainMainnet
    case "omachain-testnet":
    default:
      return omachainTestnet
  }
}

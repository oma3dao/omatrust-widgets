/**
 * Proof-check logic: verifies a wallet has interacted with a contract.
 *
 * Tries Thirdweb Insight first. If that fails (unsupported chain, auth error),
 * falls back to an Etherscan-compatible block explorer API if configured.
 *
 * Exported as a library function for testability. The API route is a
 * thin HTTP wrapper around checkProofOnChain().
 */

import { getActiveChain } from "@/lib/chains"

export type ProofCheckResult = {
  verified: boolean
  chainId: number
  contractAddress: string
  txHash?: string
  reason: string
}

export type ProofCheckInput = {
  walletAddress: string
  contractAddress: string
  chainId: number
  explorerApiUrl?: string
}

/**
 * Validate that a URL is safe to fetch server-side.
 * Rejects IP addresses, localhost, and private/reserved hostnames.
 * Exported for security regression tests (SSRF).
 */
export function isSafeExplorerUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)

    // Must be HTTPS
    if (url.protocol !== "https:") return false

    const hostname = url.hostname.toLowerCase()

    // Reject localhost
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return false

    // Reject IP addresses (v4 and v6)
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false
    if (hostname.startsWith("[") || hostname.includes(":")) return false

    // Reject common internal hostnames
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return false

    // Must have at least one dot (a real domain)
    if (!hostname.includes(".")) return false

    return true
  } catch {
    return false
  }
}

/**
 * Check if a wallet has interacted with a contract on a given chain.
 * Tries Thirdweb Insight, then falls back to the explorer API.
 * Client-provided explorer URLs are validated to prevent SSRF.
 */
export async function checkProofOnChain(
  input: ProofCheckInput,
  thirdwebClientId?: string
): Promise<ProofCheckResult> {
  // Try Thirdweb Insight first
  const insightResult = await checkViaThirdwebInsight(input, thirdwebClientId)
  if (insightResult.verified || !insightResult.reason.includes("Thirdweb Insight")) {
    return insightResult
  }

  // Thirdweb Insight failed — try client-provided explorer URL (with SSRF protection)
  if (input.explorerApiUrl && isSafeExplorerUrl(input.explorerApiUrl)) {
    return checkViaExplorerApi(input, input.explorerApiUrl)
  }

  // Try the chain config's explorer API as a last resort
  const chain = getActiveChain()
  if (chain.explorerApiUrl && input.chainId === chain.id) {
    return checkViaExplorerApi(input, chain.explorerApiUrl)
  }

  return insightResult
}

/**
 * Query Thirdweb Insight for transactions from wallet to contract.
 */
async function checkViaThirdwebInsight(
  input: ProofCheckInput,
  thirdwebClientId?: string
): Promise<ProofCheckResult> {
  const { walletAddress, contractAddress, chainId } = input

  const insightUrl = new URL(
    `https://${chainId}.insight.thirdweb.com/v1/transactions`
  )
  insightUrl.searchParams.set("filter_from_address", walletAddress.toLowerCase())
  insightUrl.searchParams.set("filter_to_address", contractAddress.toLowerCase())
  insightUrl.searchParams.set("limit", "1")

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (thirdwebClientId) {
    headers["x-client-id"] = thirdwebClientId
  }

  try {
    const response = await fetch(insightUrl.toString(), { headers })

    if (!response.ok) {
      let detail = ""
      try {
        const body = await response.json()
        detail = body.error ?? body.message ?? JSON.stringify(body)
      } catch {
        detail = await response.text().catch(() => "")
      }

      return {
        verified: false,
        chainId,
        contractAddress,
        reason: `Thirdweb Insight returned ${response.status}${detail ? `: ${detail}` : ""}`,
      }
    }

    const data = await response.json()
    const transactions = data.data ?? data.transactions ?? data ?? []

    if (Array.isArray(transactions) && transactions.length > 0) {
      const tx = transactions[0]
      return {
        verified: true,
        chainId,
        contractAddress,
        txHash: tx.hash ?? tx.transaction_hash ?? tx.txHash ?? undefined,
        reason: "Wallet has at least one transaction to the configured contract.",
      }
    }

    return {
      verified: false,
      chainId,
      contractAddress,
      reason: "No transactions found from this wallet to the configured contract.",
    }
  } catch (err) {
    return {
      verified: false,
      chainId,
      contractAddress,
      reason: `Thirdweb Insight error: ${err instanceof Error ? err.message : "Unknown error"}`,
    }
  }
}

/**
 * Fallback: query an Etherscan-compatible block explorer API.
 */
async function checkViaExplorerApi(
  input: ProofCheckInput,
  explorerApiUrl: string
): Promise<ProofCheckResult> {
  const { walletAddress, contractAddress, chainId } = input

  // Normalize: append /api if the URL doesn't already end with it
  let normalizedUrl = explorerApiUrl.replace(/\/+$/, "")
  if (!normalizedUrl.endsWith("/api")) {
    normalizedUrl += "/api"
  }

  const url = new URL(normalizedUrl)
  url.searchParams.set("module", "account")
  url.searchParams.set("action", "txlist")
  url.searchParams.set("address", walletAddress)
  url.searchParams.set("startblock", "0")
  url.searchParams.set("endblock", "99999999")
  url.searchParams.set("sort", "desc")
  url.searchParams.set("page", "1")
  url.searchParams.set("offset", "100")

  try {
    const response = await fetch(url.toString())

    if (!response.ok) {
      return {
        verified: false,
        chainId,
        contractAddress,
        reason: `Explorer API returned ${response.status}`,
      }
    }

    const data = await response.json()
    const transactions = data.result

    if (!Array.isArray(transactions)) {
      return {
        verified: false,
        chainId,
        contractAddress,
        reason: `Explorer API returned unexpected format: ${data.message ?? "unknown"}`,
      }
    }

    // Find a transaction to the target contract
    const match = transactions.find(
      (tx: { to?: string; isError?: string }) =>
        tx.to?.toLowerCase() === contractAddress.toLowerCase() &&
        tx.isError !== "1"
    )

    if (match) {
      return {
        verified: true,
        chainId,
        contractAddress,
        txHash: match.hash ?? undefined,
        reason: "Wallet has at least one transaction to the configured contract (via explorer).",
      }
    }

    return {
      verified: false,
      chainId,
      contractAddress,
      reason: "No transactions found from this wallet to the configured contract.",
    }
  } catch (err) {
    return {
      verified: false,
      chainId,
      contractAddress,
      reason: `Explorer API error: ${err instanceof Error ? err.message : "Unknown error"}`,
    }
  }
}

/**
 * Client-side helper to call the proof-check API route.
 */
export async function checkProof(
  walletAddress: string,
  contractAddress: string,
  chainId: number,
  explorerApiUrl?: string
): Promise<ProofCheckResult> {
  const res = await fetch("/api/proof/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, contractAddress, chainId, explorerApiUrl }),
  })

  if (!res.ok) {
    return {
      verified: false,
      chainId,
      contractAddress,
      reason: `Proof check request failed (${res.status})`,
    }
  }

  return res.json()
}

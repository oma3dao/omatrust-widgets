/**
 * Delegated attestation logic for the review widget.
 *
 * Uses the @oma3/omatrust SDK to build EIP-712 typed data,
 * sign via an ethers Signer, and submit to the relay server.
 *
 * Chain config is derived from NEXT_PUBLIC_ACTIVE_CHAIN,
 * matching the pattern used by rep-attestation-frontend.
 */

import {
  prepareDelegatedAttestation,
  submitDelegatedAttestation,
  createTxInteractionProof,
} from "@oma3/omatrust/reputation"
import type { Hex } from "@oma3/omatrust/reputation"
import { getActiveChain } from "@/lib/chains"

export { recoverSigner } from "@/lib/recover-signer"

const USER_REVIEW_SCHEMA_STRING =
  "string subject, string version, uint256 ratingValue, string reviewBody, string[] screenshotUrls, string[] proofs"

export type ReviewData = {
  subjectDid: string
  ratingValue: number
  reviewBody: string
  proofChainId?: number
  proofTxHash?: string
}

export type AttestationResult = {
  uid: string
  txHash: string
}

export type PreparedReview = {
  prepared: Awaited<ReturnType<typeof prepareDelegatedAttestation>>
  typedData: {
    domain: Record<string, unknown>
    types: Record<string, Array<{ name: string; type: string }>>
    message: Record<string, unknown>
  }
}

/**
 * Fetch the current EAS nonce for an attester address.
 */
async function fetchNonce(attester: string): Promise<bigint> {
  const res = await fetch(`/api/eas/nonce?attester=${attester}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to fetch nonce (${res.status})`)
  }
  const { nonce } = await res.json()
  return BigInt(nonce)
}

/**
 * Build the EIP-712 typed data for a user review attestation.
 */
export async function prepareReviewAttestation(
  attester: string,
  review: ReviewData
): Promise<PreparedReview> {
  const chain = getActiveChain()
  const nonce = await fetchNonce(attester)

  // Build proofs array
  const proofs: string[] = []
  if (review.proofTxHash && review.proofChainId) {
    const proof = createTxInteractionProof(review.proofChainId, review.proofTxHash as Hex)
    proofs.push(JSON.stringify(proof))
  }

  const prepared = await prepareDelegatedAttestation({
    chainId: chain.id,
    easContractAddress: chain.easContractAddress as Hex,
    schemaUid: chain.userReviewSchemaUid as Hex,
    schema: USER_REVIEW_SCHEMA_STRING,
    data: {
      subject: review.subjectDid,
      version: "",
      ratingValue: review.ratingValue,
      reviewBody: review.reviewBody,
      screenshotUrls: [],
      proofs,
    },
    attester: attester as Hex,
    nonce,
    revocable: false,
  })

  return {
    prepared,
    typedData: {
      domain: prepared.typedData.domain as Record<string, unknown>,
      types: prepared.typedData.types as Record<string, Array<{ name: string; type: string }>>,
      message: prepared.typedData.message as Record<string, unknown>,
    },
  }
}

/**
 * Submit the signed attestation to the relay server.
 */
export async function submitReview(
  prepared: PreparedReview["prepared"],
  signature: string,
  attester: string
): Promise<AttestationResult> {
  const result = await submitDelegatedAttestation({
    relayUrl: `/api/eas/delegated-attest`,
    prepared,
    signature,
    attester: attester as Hex,
  })

  return {
    uid: result.uid || "unknown",
    txHash: result.txHash || "unknown",
  }
}

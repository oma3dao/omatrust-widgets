"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle2, LoaderCircle, ShieldCheck, Wallet } from "lucide-react"
import { useActiveAccount } from "thirdweb/react"
import { ConnectButton, useSwitchActiveWalletChain } from "thirdweb/react"
import { createWallet, walletConnect } from "thirdweb/wallets"
import { defineChain } from "thirdweb"
import { thirdwebClient } from "@/lib/thirdweb-client"
import type { WidgetConfig } from "@/lib/widget-config"
import { checkProof, type ProofCheckResult } from "@/lib/proof-check"
import {
  prepareReviewAttestation,
  recoverSigner,
  submitReview,
  type AttestationResult,
  type PreparedReview,
} from "@/lib/attestation"
import { cn } from "@/lib/utils"
import { getExpectedHostOriginFromReferrer, isTrustedHostSignatureMessage } from "@/lib/signing-bridge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Notice } from "@/components/ui/notice"
import { RatingStars } from "@/components/ui/rating-stars"
import { Textarea } from "@/components/ui/textarea"

type ReviewWidgetProps = {
  config: WidgetConfig
  previewMode?: boolean
}

type SubmitState = "idle" | "checking" | "confirming" | "signing" | "verifying" | "submitting" | "success" | "error"
type SigningMode = "detecting" | "integrated" | "basic"

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  66238: "OMAchain Testnet",
  6623: "OMAchain Mainnet",
}

function chainName(id: number): string {
  return CHAIN_NAMES[id] ? `${CHAIN_NAMES[id]} (${id})` : `Chain ${id}`
}

const CRYPTO_WALLETS = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  walletConnect(),
]

function WidgetIcon({ iconUrl, name }: { iconUrl?: string; name?: string }) {
  if (iconUrl) {
    return (
      <img
        alt={name ?? "App icon"}
        className="size-11 rounded-2xl object-cover"
        src={iconUrl}
      />
    )
  }
  return (
    <div className="flex size-11 items-center justify-center rounded-2xl bg-ink text-white">
      <ShieldCheck className="size-5" />
    </div>
  )
}

/** Detect whether the host page supports the postMessage signing bridge. */
function useSigningMode(): SigningMode {
  const [mode, setMode] = React.useState<SigningMode>("detecting")

  React.useEffect(() => {
    if (window.self === window.top) {
      setMode("basic")
      return
    }

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "omatrust:hostReady") {
        setMode("integrated")
      }
    }

    window.addEventListener("message", handleMessage)

    // Send ready immediately and retry a few times to handle race conditions
    // where the bridge isn't set up yet when the iframe first loads
    window.parent.postMessage({ type: "omatrust:ready" }, "*")
    const retry1 = window.setTimeout(() => window.parent.postMessage({ type: "omatrust:ready" }, "*"), 500)
    const retry2 = window.setTimeout(() => window.parent.postMessage({ type: "omatrust:ready" }, "*"), 1000)
    const retry3 = window.setTimeout(() => window.parent.postMessage({ type: "omatrust:ready" }, "*"), 2000)

    const timeout = window.setTimeout(() => {
      setMode((current) => (current === "detecting" ? "basic" : current))
    }, 3000)

    return () => {
      window.removeEventListener("message", handleMessage)
      window.clearTimeout(retry1)
      window.clearTimeout(retry2)
      window.clearTimeout(retry3)
      window.clearTimeout(timeout)
    }
  }, [])

  return mode
}

/** Request a signature from the host page via postMessage. */
function requestHostSignature(
  domain: Record<string, unknown>,
  types: Record<string, unknown>,
  message: Record<string, unknown>
): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID()
    const expectedHostOrigin = getExpectedHostOriginFromReferrer(document.referrer)

    function handleMessage(event: MessageEvent) {
      if (
        !isTrustedHostSignatureMessage({
          data: event.data ?? {},
          expectedId: id,
          source: event.source,
          parentWindow: window.parent,
          origin: event.origin,
          expectedHostOrigin,
        })
      ) {
        return
      }

      if (event.data.type === "omatrust:signature") {
        cleanup()
        if (typeof event.data.signature !== "string" || !event.data.signature.startsWith("0x")) {
          reject(new Error("Host returned an invalid signature payload"))
          return
        }
        resolve(event.data.signature)
      }
      if (event.data.type === "omatrust:signatureError") {
        cleanup()
        const error = typeof event.data.error === "string" ? event.data.error : "Host signing failed"
        reject(new Error(error))
      }
    }

    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error("Signing request timed out"))
    }, 120_000)

    function cleanup() {
      window.removeEventListener("message", handleMessage)
      window.clearTimeout(timeout)
    }

    window.addEventListener("message", handleMessage)
    window.parent.postMessage({ type: "omatrust:signTypedData", id, domain, types, message }, "*")
  })
}

export function ReviewWidget({ config, previewMode = false }: ReviewWidgetProps) {
  const [rating, setRating] = React.useState(0)
  const [reviewBody, setReviewBody] = React.useState("")
  const [submitState, setSubmitState] = React.useState<SubmitState>("idle")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [proofResult, setProofResult] = React.useState<ProofCheckResult | null>(null)
  const [attestationResult, setAttestationResult] = React.useState<AttestationResult | null>(null)
  const [pendingReview, setPendingReview] = React.useState<PreparedReview | null>(null)

  const signingMode = useSigningMode()
  const thirdwebAccount = useActiveAccount()
  const switchChain = useSwitchActiveWalletChain()

  // Report content height to parent so the iframe can resize
  // (Currently disabled — using fixed iframe height instead)

  // Wallet address: prefer query param, then Thirdweb connected account
  const walletAddress = config.wallet ?? thirdwebAccount?.address ?? null

  // Run proof check when wallet address becomes available
  React.useEffect(() => {
    if (!walletAddress || previewMode) return

    let cancelled = false
    setProofResult(null)

    checkProof(walletAddress, config.contractAddress, config.chainId, config.explorerApiUrl).then((result) => {
      if (!cancelled) setProofResult(result)
    })

    return () => { cancelled = true }
  }, [walletAddress, config.contractAddress, config.chainId, previewMode])

  const verifiedUser = proofResult?.verified === true

  const canSubmit =
    rating > 0 &&
    walletAddress &&
    submitState !== "checking" &&
    submitState !== "confirming" &&
    submitState !== "signing" &&
    submitState !== "verifying" &&
    submitState !== "submitting" &&
    submitState !== "success"

  async function handlePrepare() {
    if (!walletAddress || !config.subjectDid) {
      setErrorMessage("Missing wallet or subject DID.")
      setSubmitState("error")
      return
    }
    if (rating === 0) {
      setErrorMessage("Please select a rating.")
      setSubmitState("error")
      return
    }

    setErrorMessage("")

    try {
      setSubmitState("checking")
      const prepared = await prepareReviewAttestation(walletAddress, {
        subjectDid: config.subjectDid,
        ratingValue: rating,
        reviewBody,
        proofChainId: proofResult?.verified ? config.chainId : undefined,
        proofTxHash: proofResult?.verified ? proofResult.txHash : undefined,
      })
      setPendingReview(prepared)
      setSubmitState("confirming")
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to prepare attestation")
      setSubmitState("error")
    }
  }

  async function handleSign() {
    if (!pendingReview || !walletAddress) return

    const { prepared, typedData } = pendingReview

    try {
      setSubmitState("signing")
      let signature: string

      if (signingMode === "integrated") {
        signature = await requestHostSignature(
          typedData.domain,
          typedData.types as Record<string, unknown>,
          typedData.message
        )
      } else if (signingMode === "basic" && !thirdwebAccount && window.self !== window.top) {
        // We're in an iframe but the handshake may have been missed.
        // Try postMessage signing as a last resort before failing.
        signature = await requestHostSignature(
          typedData.domain,
          typedData.types as Record<string, unknown>,
          typedData.message
        )
      } else {
        if (!thirdwebAccount) {
          throw new Error("No wallet connected. Please connect a wallet.")
        }

        const attestationChainId = Number(typedData.domain.chainId)
        try {
          await switchChain(defineChain(attestationChainId))
        } catch (switchErr) {
          const msg = switchErr instanceof Error ? switchErr.message : ""
          if (msg.includes("user rejected") || msg.includes("User denied")) {
            throw new Error("Chain switch was rejected. The wallet must be on the attestation chain to sign.")
          }
        }

        signature = await thirdwebAccount.signTypedData({
          domain: {
            name: typedData.domain.name as string,
            version: typedData.domain.version as string,
            chainId: attestationChainId,
            verifyingContract: typedData.domain.verifyingContract as `0x${string}`,
          },
          types: typedData.types,
          primaryType: "Attest",
          message: typedData.message,
        })
      }

      setSubmitState("verifying")
      const recoveredSigner = recoverSigner(
        typedData.domain,
        typedData.types,
        typedData.message,
        signature
      )

      if (recoveredSigner.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(
          `Signer mismatch: expected ${walletAddress}, got ${recoveredSigner}`
        )
      }

      setSubmitState("submitting")
      const result = await submitReview(prepared, signature, walletAddress)
      setAttestationResult(result)
      setSubmitState("success")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed"
      if (message.includes("user rejected") || message.includes("User denied") || message.includes("ACTION_REJECTED")) {
        setErrorMessage("Signature request was rejected.")
      } else if (message.includes("chainId")) {
        setErrorMessage("Wallet chain mismatch. Please try again.")
      } else {
        setErrorMessage(message)
      }
      setSubmitState("error")
    }
  }

  return (
    <Card className="w-full max-w-[400px] overflow-hidden rounded-[28px] border-white/90 bg-white">
      <div className="border-b bg-gradient-to-br from-accent via-white to-white px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <WidgetIcon iconUrl={config.iconUrl} name={config.appName} />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {config.appName ?? config.domain ?? "App review"}
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {config.domain ?? "Waiting for valid domain"}
              </p>
            </div>
          </div>
          {verifiedUser ? (
            <Badge variant="success" dot>
              Verified User
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        {submitState !== "success" ? (
          <>
            <div className="rounded-[22px] border bg-secondary/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Write a review for:
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {config.domain ?? "Domain will appear once a valid URL is entered"}
                  </p>
                </div>
                {verifiedUser ? (
                  <CheckCircle2 className="mt-1 size-5 text-success" />
                ) : walletAddress && proofResult && !proofResult.verified ? (
                  <AlertTriangle className="mt-1 size-5 text-warning" />
                ) : (
                  <Wallet className="mt-1 size-5 text-primary" />
                )}
              </div>
            </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Rating<span className="ml-1 text-danger">*</span>
          </p>
          <div className="flex items-center justify-between rounded-[22px] border bg-white px-3 py-2">
            <RatingStars value={rating} onChange={setRating} />
            <span className="text-sm text-muted-foreground">{rating} of 5</span>
          </div>
        </div>

        <Textarea
          label="Review text"
          maxLength={500}
          placeholder="Tell other users what worked, what broke, or what felt worth coming back to."
          value={reviewBody}
          onChange={(event) => setReviewBody(event.target.value)}
        />

        <div className="rounded-[22px] border bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Signing wallet</p>
              <p className="text-sm text-muted-foreground break-all">
                {walletAddress ?? "No wallet connected"}
              </p>
            </div>
            {!walletAddress && signingMode === "basic" ? (
              <ConnectButton
                client={thirdwebClient}
                wallets={CRYPTO_WALLETS}
                connectButton={{ label: "Connect" }}
                connectModal={{
                  size: "compact",
                  showThirdwebBranding: false,
                }}
                appMetadata={{
                  name: "OMATrust Review Widget",
                  url: "https://reputation.omatrust.org",
                }}
              />
            ) : null}
          </div>
        </div>

        {submitState === "confirming" && pendingReview ? (
          <div className="rounded-[22px] border border-primary/20 bg-accent/50 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
              Confirm your review before signing
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Chain</p>
                <p className="font-medium text-foreground">{chainName(pendingReview.typedData.domain.chainId as number)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Contract</p>
                <p className="font-mono text-foreground text-xs break-all">{pendingReview.typedData.domain.verifyingContract as string}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Action</p>
                <p className="font-medium text-foreground">Submit attestation</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Rating</p>
                <p className="text-foreground">{"★".repeat(rating)}{"☆".repeat(5 - rating)} ({rating} of 5)</p>
              </div>
              {reviewBody ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Comment</p>
                  <p className="text-foreground">{reviewBody.length > 80 ? `${reviewBody.slice(0, 80)}…` : reviewBody}</p>
                </div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" className="flex-1" onClick={handleSign}>
                Confirm and sign
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPendingReview(null)
                  setSubmitState("idle")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
          </>
        ) : null}

        {submitState === "success" && attestationResult ? (
          <div className="space-y-4">
            <div className="rounded-[22px] border border-green-200 bg-green-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-600" />
                <p className="text-sm font-semibold text-green-800">Review submitted</p>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Rating</p>
                  <p className="text-foreground">{"★".repeat(rating)}{"☆".repeat(5 - rating)} ({rating} of 5)</p>
                </div>
                {reviewBody ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Comment</p>
                    <p className="text-foreground">{reviewBody}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Subject</p>
                  <p className="text-foreground">{config.domain}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Wallet</p>
                  <p className="font-mono text-xs text-foreground break-all">{walletAddress}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Attestation UID</p>
                  <p className="font-mono text-xs text-foreground break-all">{attestationResult.uid}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Transaction</p>
                  <p className="font-mono text-xs text-foreground break-all">{attestationResult.txHash}</p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => window.parent.postMessage({ type: "omatrust:close" }, "*")}
            >
              Done
            </Button>
          </div>
        ) : submitState === "error" ? (
          <Notice tone="warning" title="Error">
            {errorMessage}
          </Notice>
        ) : null}

        {submitState !== "confirming" && submitState !== "success" ? (
          <>
            <Button
              type="button"
              disabled={!canSubmit}
              className={cn("w-full")}
              onClick={handlePrepare}
            >
              {(submitState === "checking" || submitState === "signing" || submitState === "verifying" || submitState === "submitting") ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {submitState === "checking"
                ? "Preparing attestation..."
                : submitState === "signing"
                  ? "Requesting signature..."
                  : submitState === "verifying"
                    ? "Verifying signer..."
                    : submitState === "submitting"
                      ? "Submitting review..."
                      : "Sign and submit review"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => window.parent.postMessage({ type: "omatrust:close" }, "*")}
            >
              Cancel
            </Button>
          </>
        ) : null}

        <div className="flex items-center justify-center border-t pt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>Powered by OMATrust</span>
        </div>
      </div>
    </Card>
  )
}

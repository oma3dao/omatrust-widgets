"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle2, LoaderCircle, ShieldCheck, Wallet } from "lucide-react"
import { useActiveAccount } from "thirdweb/react"
import { ConnectButton } from "thirdweb/react"
import { createWallet, walletConnect } from "thirdweb/wallets"
import { thirdwebClient } from "@/lib/thirdweb-client"
import type { WidgetConfig } from "@/lib/widget-config"
import { cn } from "@/lib/utils"
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

type SubmitState = "idle" | "signing" | "submitting" | "success" | "error"
type SigningMode = "detecting" | "integrated" | "basic"

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

/**
 * Hook to detect whether the host page supports the postMessage signing bridge.
 * Sends a handshake on mount; if the host responds, we use integrated mode.
 */
function useSigningMode(): SigningMode {
  const [mode, setMode] = React.useState<SigningMode>("detecting")

  React.useEffect(() => {
    // Skip detection if not in an iframe
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
    window.parent.postMessage({ type: "omatrust:ready" }, "*")

    // If no response within 1.5s, fall back to basic mode
    const timeout = window.setTimeout(() => {
      setMode((current) => (current === "detecting" ? "basic" : current))
    }, 1500)

    return () => {
      window.removeEventListener("message", handleMessage)
      window.clearTimeout(timeout)
    }
  }, [])

  return mode
}

/**
 * Request a signature from the host page via postMessage.
 * Returns a promise that resolves with the signature or rejects on error/timeout.
 */
function requestHostSignature(
  domain: Record<string, unknown>,
  types: Record<string, unknown>,
  message: Record<string, unknown>
): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID()

    function handleMessage(event: MessageEvent) {
      if (event.data?.id !== id) return
      if (event.data?.type === "omatrust:signature") {
        cleanup()
        resolve(event.data.signature)
      }
      if (event.data?.type === "omatrust:signatureError") {
        cleanup()
        reject(new Error(event.data.error || "Host signing failed"))
      }
    }

    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error("Signing request timed out — host did not respond"))
    }, 120_000)

    function cleanup() {
      window.removeEventListener("message", handleMessage)
      window.clearTimeout(timeout)
    }

    window.addEventListener("message", handleMessage)
    window.parent.postMessage(
      { type: "omatrust:signTypedData", id, domain, types, message },
      "*"
    )
  })
}

export function ReviewWidget({ config, previewMode = false }: ReviewWidgetProps) {
  const [rating, setRating] = React.useState(0)
  const [reviewBody, setReviewBody] = React.useState("")
  const [submitState, setSubmitState] = React.useState<SubmitState>("idle")
  const [errorMessage, setErrorMessage] = React.useState("")

  const signingMode = useSigningMode()
  const thirdwebAccount = useActiveAccount()

  // Wallet address: prefer query param, then Thirdweb connected account
  const walletAddress = config.wallet ?? thirdwebAccount?.address ?? null

  const proofWallet = config.wallet
  const signerMatchesProofWallet =
    !proofWallet ||
    !walletAddress ||
    proofWallet.toLowerCase() === walletAddress.toLowerCase()

  const verifiedUser = Boolean(proofWallet && walletAddress && signerMatchesProofWallet)

  const walletStatus = !walletAddress
    ? "wallet-missing"
    : proofWallet && !signerMatchesProofWallet
      ? "wallet-mismatch"
      : verifiedUser
        ? "verified-user"
        : "ready"

  // Can submit if we have a wallet and a rating
  const canSubmit =
    rating > 0 &&
    walletAddress &&
    (signingMode === "integrated" || !!thirdwebAccount) &&
    submitState !== "signing" &&
    submitState !== "submitting"

  async function handleSubmit() {
    if (!walletAddress) {
      setErrorMessage("Connect a wallet to sign the review.")
      setSubmitState("error")
      return
    }
    if (rating === 0) {
      setErrorMessage("Please select a rating.")
      setSubmitState("error")
      return
    }

    setErrorMessage("")
    setSubmitState("signing")

    try {
      // TODO: Build real EIP-712 typed data using @oma3/omatrust SDK
      // For now, use placeholder typed data to test the signing flow
      const domain = { name: "EAS", version: "1.4.0" }
      const types = { Review: [{ name: "rating", type: "uint256" }] }
      const message = { rating }

      let _signature: string

      if (signingMode === "integrated") {
        // Host page handles signing via postMessage bridge
        _signature = await requestHostSignature(domain, types, message)
      } else {
        // Basic mode: sign directly via Thirdweb
        if (!thirdwebAccount) {
          throw new Error("No wallet connected. Please connect a wallet.")
        }
        // TODO: Use ethers6Adapter.signer.toEthers() for real EIP-712 signing
        // For now, simulate the signing step
        await new Promise((resolve) => setTimeout(resolve, 500))
        _signature = "0x_placeholder_signature"
      }

      setSubmitState("submitting")

      // TODO: Submit to delegated attestation API
      await new Promise((resolve) => setTimeout(resolve, 700))

      setSubmitState("success")
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Signing failed")
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
            {walletStatus === "verified-user" ? (
              <CheckCircle2 className="mt-1 size-5 text-success" />
            ) : walletStatus === "wallet-mismatch" ? (
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
                wallets={[
                  createWallet("io.metamask"),
                  createWallet("com.coinbase.wallet"),
                  createWallet("me.rainbow"),
                  walletConnect(),
                ]}
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

        {submitState === "success" ? (
          <Notice tone="success" title="Review submitted">
            Attestation UID: <span className="font-mono text-foreground">0x7ab3...2a47</span>
            <br />
            Transaction hash: <span className="font-mono text-foreground">0x5a1c...d9f2</span>
          </Notice>
        ) : submitState === "error" ? (
          <Notice tone="warning" title="Error">
            {errorMessage}
          </Notice>
        ) : null}

        <Button
          type="button"
          disabled={!canSubmit}
          className={cn("w-full")}
          onClick={handleSubmit}
        >
          {submitState === "signing" ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {submitState === "submitting" ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {submitState === "signing"
            ? "Requesting signature"
            : submitState === "submitting"
              ? "Submitting review"
              : "Sign and submit review"}
        </Button>

        <div className="flex items-center justify-center border-t pt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>Powered by OMATrust</span>
        </div>
      </div>
    </Card>
  )
}

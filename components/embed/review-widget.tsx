"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle2, LoaderCircle, ShieldCheck, Wallet, XCircle } from "lucide-react"
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

const demoSigner = "0x1111111111111111111111111111111111111111"
const demoAltSigner = "0x2222222222222222222222222222222222222222"

function WidgetIcon({ iconUrl, name }: { iconUrl?: string; name?: string }) {
  if (iconUrl) {
    return (
      <img
        alt={name ?? "Game icon"}
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

export function ReviewWidget({ config, previewMode = false }: ReviewWidgetProps) {
  const [rating, setRating] = React.useState(4)
  const [reviewBody, setReviewBody] = React.useState("")
  const [connectedWallet, setConnectedWallet] = React.useState<string | null>(
    previewMode ? config.wallet ?? demoSigner : null
  )
  const [submitState, setSubmitState] = React.useState<SubmitState>("idle")
  const [errorMessage, setErrorMessage] = React.useState("")

  const proofWallet = config.wallet
  const signerMatchesProofWallet =
    !proofWallet ||
    !connectedWallet ||
    proofWallet.toLowerCase() === connectedWallet.toLowerCase()

  const verifiedPlayer =
    previewMode || Boolean(proofWallet && connectedWallet && signerMatchesProofWallet)

  const walletStatus = !connectedWallet
    ? "wallet-missing"
    : proofWallet && !signerMatchesProofWallet
      ? "wallet-mismatch"
      : verifiedPlayer
        ? "verified-player"
        : "ready"

  async function handleSubmit() {
    if (!connectedWallet) {
      setErrorMessage("Connect a wallet before requesting the attestation signature.")
      setSubmitState("error")
      return
    }

    setErrorMessage("")
    setSubmitState("signing")
    await new Promise((resolve) => window.setTimeout(resolve, previewMode ? 250 : 500))
    setSubmitState("submitting")
    await new Promise((resolve) => window.setTimeout(resolve, previewMode ? 250 : 700))
    setSubmitState("success")
  }

  return (
    <Card className="w-full max-w-[400px] overflow-hidden rounded-[28px] border-white/90 bg-white">
      <div className="border-b bg-gradient-to-br from-accent via-white to-white px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <WidgetIcon iconUrl={config.iconUrl} name={config.gameName} />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {config.gameName ?? config.domain ?? "Game review"}
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {config.domain ?? "Waiting for valid domain"}
              </p>
            </div>
          </div>
          <Badge variant={verifiedPlayer ? "success" : "neutral"} dot>
            {verifiedPlayer ? "Verified Player" : "Hosted review"}
          </Badge>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="rounded-[22px] border bg-secondary/60 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Review target
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {config.subjectDid ?? "did:web target will appear once the domain is valid"}
              </p>
            </div>
            {walletStatus === "verified-player" ? (
              <CheckCircle2 className="mt-1 size-5 text-success" />
            ) : walletStatus === "wallet-mismatch" ? (
              <AlertTriangle className="mt-1 size-5 text-warning" />
            ) : (
              <Wallet className="mt-1 size-5 text-primary" />
            )}
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            {walletStatus === "wallet-missing"
              ? "Connect the signing wallet to continue. If a wallet is prefilled, the signer must match it for the review to earn Verified Player status."
              : walletStatus === "wallet-mismatch"
                ? "The connected signer does not match the wallet used for proof checking, so this review can still be submitted but it cannot be marked Verified Player."
                : verifiedPlayer
                  ? "Signer and proof wallet match, so this review is ready to be labeled Verified Player once the proof service is wired."
                  : "This wallet can still submit a review even if it does not qualify for the Verified Player badge."}
          </div>
        </div>

        {previewMode ? null : proofWallet ? (
          <Notice tone={signerMatchesProofWallet ? "info" : "warning"} title="Wallet passthrough">
            Proof check wallet: <span className="font-mono text-foreground">{proofWallet}</span>
          </Notice>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Rating</p>
          <div className="flex items-center justify-between rounded-[22px] border bg-white px-3 py-2">
            <RatingStars value={rating} onChange={setRating} />
            <span className="text-sm text-muted-foreground">{rating} of 5</span>
          </div>
        </div>

        <Textarea
          label="Review text"
          hint="Optional. The user-review schema only requires the rating and subject."
          maxLength={500}
          placeholder="Tell other players what worked, what broke, or what felt worth coming back to."
          value={reviewBody}
          onChange={(event) => setReviewBody(event.target.value)}
        />

        <div className="rounded-[22px] border bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Signing wallet</p>
              <p className="text-sm text-muted-foreground">
                {connectedWallet ? connectedWallet : "No wallet connected yet"}
              </p>
            </div>
            {previewMode ? null : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConnectedWallet(proofWallet ?? demoSigner)}
                >
                  Use matching wallet
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConnectedWallet(demoAltSigner)}
                >
                  Mismatch demo
                </Button>
              </div>
            )}
          </div>
        </div>

        {submitState === "success" ? (
          <Notice tone="success" title="Review submitted">
            Attestation UID: <span className="font-mono text-foreground">0x7ab3...2a47</span>
            <br />
            Transaction hash: <span className="font-mono text-foreground">0x5a1c...d9f2</span>
          </Notice>
        ) : submitState === "error" ? (
          <Notice tone="warning" title="Signature request blocked">
            {errorMessage}
          </Notice>
        ) : null}

        <Button
          type="button"
          className={cn("w-full", submitState !== "idle" && submitState !== "error" && "pointer-events-none")}
          onClick={handleSubmit}
        >
          {submitState === "signing" ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {submitState === "submitting" ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {submitState === "signing"
            ? "Requesting signature"
            : submitState === "submitting"
              ? "Submitting review"
              : verifiedPlayer
                ? "Sign and submit verified review"
                : "Sign and submit review"}
        </Button>

        <div className="flex items-center justify-between gap-4 border-t pt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>Powered by OMATrust</span>
          <span>{verifiedPlayer ? "Verified Player" : "Open review"}</span>
        </div>
      </div>
    </Card>
  )
}

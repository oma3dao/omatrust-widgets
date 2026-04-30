"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ExternalLink, Wallet } from "lucide-react"
import { ethers } from "ethers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CodeBlock } from "@/components/ui/code-block"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import {
  DEFAULT_PUBLIC_ORIGIN,
  REVIEW_WIDGET_CREATE_PATH,
  REVIEW_WIDGET_EMBED_PATH,
  REVIEW_WIDGET_HOST_EXAMPLE_PATH,
  createWidgetArtifacts,
  type SigningMode,
} from "@/lib/widget-config"
import type { BuilderFormValues } from "@/lib/validation"
import { SEPOLIA_PROTOCOL_PRESETS, type SepoliaProtocolPresetId } from "@/lib/protocol-presets"
import { validateHostSignTypedDataRequest } from "@/lib/host-bridge-validation"

type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}

const navItems = [
  { href: REVIEW_WIDGET_CREATE_PATH, label: "Widget Builder", external: false },
  { href: REVIEW_WIDGET_HOST_EXAMPLE_PATH, label: "Host Example", external: false },
  { href: "https://docs.omatrust.org/widgets/overview", label: "Docs", external: true },
]

export function SepoliaHostDemo() {
  const [baseUrl, setBaseUrl] = React.useState(DEFAULT_PUBLIC_ORIGIN)
  const [protocolId, setProtocolId] = React.useState<SepoliaProtocolPresetId>("uniswap")
  const [signingMode, setSigningMode] = React.useState<SigningMode>("basic")
  const [walletAddress, setWalletAddress] = React.useState("")
  const [bridgeStatus, setBridgeStatus] = React.useState("Waiting for iframe...")
  const [simulationStatus, setSimulationStatus] = React.useState("No simulation sent yet.")
  const [urlSigningSynced, setUrlSigningSynced] = React.useState(false)

  React.useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    setSigningMode(q.get("signing") === "integrated" ? "integrated" : "basic")
    setUrlSigningSynced(true)
  }, [])

  const preset = SEPOLIA_PROTOCOL_PRESETS[protocolId]
  const builderValues: BuilderFormValues = {
    appUrl: preset.appUrl,
    appName: preset.appName,
    iconUrl: preset.iconUrl ?? "",
    contractAddress: preset.contractAddress,
    chainId: preset.chainId,
    explorerApiUrl: preset.explorerApiUrl ?? "",
  }

  const artifacts = React.useMemo(
    () => createWidgetArtifacts(builderValues, { baseUrl, signingMode }),
    [baseUrl, preset, signingMode]
  )

  const iframeUrl = React.useMemo(() => {
    const url = new URL(artifacts.widgetUrl)
    if (walletAddress) {
      url.searchParams.set("wallet", walletAddress)
    } else {
      url.searchParams.delete("wallet")
    }
    return url.toString()
  }, [artifacts.widgetUrl, walletAddress])

  async function connectWallet() {
    const provider = (window as Window & { ethereum?: Eip1193Provider }).ethereum
    if (!provider) {
      setBridgeStatus("No injected wallet found. Install MetaMask or another EIP-1193 wallet.")
      return
    }

    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[]
    const first = accounts?.[0]
    if (!first) {
      setBridgeStatus("No account returned by wallet.")
      return
    }
    setWalletAddress(first)
    setBridgeStatus(`Connected ${first.slice(0, 6)}...${first.slice(-4)}`)
  }

  React.useEffect(() => {
    if (signingMode !== "integrated") return

    let mounted = true

    async function signWithInjectedWallet(
      domain: Record<string, unknown>,
      types: Record<string, Array<{ name: string; type: string }>>,
      message: Record<string, unknown>
    ): Promise<string> {
      const provider = (window as Window & { ethereum?: Eip1193Provider }).ethereum
      if (!provider) throw new Error("No injected wallet found")
      const browserProvider = new ethers.BrowserProvider(provider as unknown as ethers.Eip1193Provider)
      const signer = await browserProvider.getSigner()
      const signature = await signer.signTypedData(
        domain as ethers.TypedDataDomain,
        types as Record<string, ethers.TypedDataField[]>,
        message
      )
      return signature
    }

    async function handleMessage(event: MessageEvent) {
      const iframe = document.getElementById("omatrust-widget") as HTMLIFrameElement | null
      if (!iframe?.contentWindow || event.source !== iframe.contentWindow) return

      if (event.data?.type === "omatrust:ready") {
        iframe.contentWindow.postMessage({ type: "omatrust:hostReady" }, event.origin || "*")
        if (mounted) setBridgeStatus("Integrated bridge ready")
        return
      }

      if (event.data?.type !== "omatrust:signTypedData") return
      const validated = validateHostSignTypedDataRequest(event.data)
      if (!validated.ok) {
        iframe.contentWindow.postMessage(
          {
            type: "omatrust:signatureError",
            id: typeof event.data?.id === "string" ? event.data.id : undefined,
            error: validated.error ?? "Malformed signTypedData request",
          },
          event.origin || "*"
        )
        if (mounted) setBridgeStatus(`Rejected signing request: ${validated.error}`)
        return
      }
      const req = validated.parsed
      if (!req) {
        iframe.contentWindow.postMessage(
          { type: "omatrust:signatureError", error: "Malformed signTypedData request" },
          event.origin || "*"
        )
        return
      }

      try {
        if (mounted) setBridgeStatus("Signing typed data in host wallet...")
        const signature = await signWithInjectedWallet(req.domain, req.types, req.message)
        iframe.contentWindow.postMessage(
          { type: "omatrust:signature", id: req.id, signature },
          event.origin || "*"
        )
        if (mounted) setBridgeStatus("Signature returned to widget")
      } catch (err) {
        const error = err instanceof Error ? err.message : "Unknown host signing error"
        iframe.contentWindow.postMessage(
          { type: "omatrust:signatureError", id: req.id, error },
          event.origin || "*"
        )
        if (mounted) setBridgeStatus(`Host signing failed: ${error}`)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => {
      mounted = false
      window.removeEventListener("message", handleMessage)
    }
  }, [signingMode])

  const iframeSnippet = `<iframe
  id="omatrust-widget"
  src="${iframeUrl}"
  width="440"
  height="760"
  style="border:0; width:100%; max-width:440px; background:transparent;"
  loading="lazy"
  title="OMATrust Review Widget"
></iframe>`

  const integratedBridgeSnippet = `window.addEventListener("message", async (event) => {
  const iframe = document.getElementById("omatrust-widget");
  if (!iframe?.contentWindow || event.source !== iframe.contentWindow) return;

  if (event.data?.type === "omatrust:ready") {
    iframe.contentWindow.postMessage({ type: "omatrust:hostReady" }, event.origin);
    return;
  }

  if (event.data?.type !== "omatrust:signTypedData") return;
  const { id, domain, types, message } = event.data;
  const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
  const signature = await signer.signTypedData(domain, types, message);
  iframe.contentWindow.postMessage({ type: "omatrust:signature", id, signature }, event.origin);
});`

  function postToIframeForSimulation(payload: Record<string, unknown>) {
    const iframe = document.getElementById("omatrust-widget") as HTMLIFrameElement | null
    if (!iframe?.contentWindow) {
      setSimulationStatus("Simulation skipped: iframe window not available.")
      return
    }
    iframe.contentWindow.postMessage(payload, window.location.origin)
  }

  function simulateMalformedHostResponse() {
    postToIframeForSimulation({
      type: "omatrust:signature",
      id: "simulated-invalid-id",
      signature: "not-a-hex-signature",
    })
    setSimulationStatus("Sent malformed host response to iframe (invalid id/signature).")
  }

  function simulateUnexpectedHostMessageType() {
    postToIframeForSimulation({
      type: "omatrust:hostReady",
      id: "simulated-hostready-id",
    })
    setSimulationStatus("Sent unexpected host message type to iframe.")
  }

  if (!urlSigningSynced) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading demo…
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center">
            <Link href={REVIEW_WIDGET_CREATE_PATH} className="flex items-center">
              <Image src="/oma3_logo.svg" alt="OMA3 Logo" width={120} height={40} priority />
            </Link>
            <div className="flex-1" />
            <nav className="hidden md:flex space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-lg font-medium text-gray-600 transition-colors hover:text-blue-600"
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_460px]">
          <section className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="neutral">Sepolia Host Demo</Badge>
                <Badge variant="accent" dot>Basic + Integrated</Badge>
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-foreground">
                Run a localhost host frontend for Uniswap and Aave and submit OMATrust reviews from Sepolia wallets.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                Choose a protocol preset, pick signing mode, optionally inject wallet address, then use the embedded widget.
              </p>
            </div>

            <Notice title="MVP behavior">
              This demo focuses on host + widget integration. It does not execute swaps or supplies; it only configures and embeds review flow.
              Append <code className="text-xs">?signing=integrated</code> to this page URL to open directly in integrated mode (recommended for automated tests so the signing bridge attaches before the iframe handshake).
            </Notice>

            <Card>
              <CardHeader>
                <CardTitle>Host controls</CardTitle>
                <CardDescription>Set protocol and signing mode, then test the review widget in-place.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Protocol preset</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={protocolId === "uniswap" ? "primary" : "outline"}
                        onClick={() => setProtocolId("uniswap")}
                      >
                        Uniswap
                      </Button>
                      <Button
                        type="button"
                        variant={protocolId === "aave" ? "primary" : "outline"}
                        onClick={() => setProtocolId("aave")}
                      >
                        Aave
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Signing mode</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={signingMode === "basic" ? "primary" : "outline"}
                        onClick={() => setSigningMode("basic")}
                      >
                        Basic
                      </Button>
                      <Button
                        type="button"
                        variant={signingMode === "integrated" ? "primary" : "outline"}
                        onClick={() => setSigningMode("integrated")}
                      >
                        Integrated
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Injected wallet query param (optional)"
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(event) => setWalletAddress(event.target.value)}
                  />
                  <div className="flex items-end">
                    <Button type="button" variant="outline" onClick={connectWallet}>
                      <Wallet className="size-4" />
                      Connect browser wallet
                    </Button>
                  </div>
                </div>

                <div
                  className="rounded-2xl border bg-secondary/50 p-4 text-sm space-y-2"
                  data-testid="host-preset-summary"
                >
                  <p><span className="font-medium">App:</span> {preset.name}</p>
                  <p><span className="font-medium">Domain:</span> {preset.appUrl}</p>
                  <p className="break-all"><span className="font-medium">Contract:</span> {preset.contractAddress}</p>
                  <p><span className="font-medium">Chain:</span> {preset.chainId} (Sepolia)</p>
                  <p className="break-all"><span className="font-medium">Embed route:</span> {REVIEW_WIDGET_EMBED_PATH}</p>
                  <p data-testid="host-bridge-status">
                    <span className="font-medium">Bridge status:</span> {bridgeStatus}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Embed snippet</CardTitle>
                <CardDescription>Use this in your localhost host page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeBlock label="Iframe" code={iframeSnippet} language="html" />
                {signingMode === "integrated" ? (
                  <CodeBlock label="Integrated bridge (host-side)" code={integratedBridgeSnippet} language="javascript" />
                ) : null}
                <a href={iframeUrl} target="_blank" rel="noreferrer">
                  <Button type="button" variant="outline">
                    Open iframe target
                    <ExternalLink className="size-4" />
                  </Button>
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security simulation</CardTitle>
                <CardDescription>
                  Send intentionally bad host messages to verify iframe-side bridge defenses during local testing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={simulateMalformedHostResponse}>
                    Simulate bad signature response
                  </Button>
                  <Button type="button" variant="outline" onClick={simulateUnexpectedHostMessageType}>
                    Simulate wrong message type
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{simulationStatus}</p>
                <div className="rounded-2xl border bg-secondary/50 p-4 text-sm space-y-2">
                  <p className="font-medium text-foreground">Expected outcomes</p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Bad signature response:</span>{" "}
                    Widget should ignore this message (request id mismatch and/or invalid payload), and review flow should remain unchanged.
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Wrong message type:</span>{" "}
                    Widget should ignore this message and continue waiting for valid `omatrust:signature` or `omatrust:signatureError`.
                  </p>
                  <p className="text-muted-foreground">
                    If the widget unexpectedly reacts to either simulation, treat it as a signing-bridge regression.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4">
            <Badge variant="success" dot>Live embedded widget</Badge>
            <div className="rounded-[32px] border bg-white p-4 shadow-panel">
              <iframe
                key={`${signingMode}-${iframeUrl}`}
                id="omatrust-widget"
                src={iframeUrl}
                title="Embedded OMATrust Review Widget"
                className="h-[760px] w-full rounded-[24px]"
                style={{ border: 0 }}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}


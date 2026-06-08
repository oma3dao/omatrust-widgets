"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { ExternalLink, Globe, Link2, ShieldCheck, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Notice } from "@/components/ui/notice"
import { CodeBlock } from "@/components/ui/code-block"
import {
  DEFAULT_PUBLIC_ORIGIN,
  REVIEW_WIDGET_CREATE_PATH,
  REVIEW_WIDGET_EMBED_PATH,
  REVIEW_WIDGET_HOST_EXAMPLE_PATH,
  REVIEW_WIDGET_SEPOLIA_HOST_EXAMPLE_PATH,
  createWidgetArtifacts,
} from "@/lib/widget-config"
import type { BuilderFormValues } from "@/lib/validation"

const SEPOLIA_CHAIN_ID = 11155111
const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io/address"

type ProtocolPreset = {
  id: string
  label: string
  protocol: string
  description: string
  values: BuilderFormValues
}

/**
 * Real, verifiable contracts deployed on Ethereum Sepolia. Sources:
 * - Uniswap: @uniswap/sdk-core CHAIN_TO_ADDRESSES_MAP + universal-router-sdk
 * - Aave: aave-address-book (AaveV3Sepolia)
 */
const presets: ProtocolPreset[] = [
  {
    id: "uniswap-router",
    label: "Uniswap V3 SwapRouter02",
    protocol: "Uniswap",
    description:
      "The router users hit when swapping through the Uniswap V3 interface on Sepolia.",
    values: {
      appUrl: "app.uniswap.org",
      appName: "Uniswap",
      iconUrl: "",
      contractAddress: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
      chainId: SEPOLIA_CHAIN_ID,
    },
  },
  {
    id: "uniswap-universal-router",
    label: "Uniswap Universal Router",
    protocol: "Uniswap",
    description:
      "The Universal Router that aggregates V2/V3 swaps and NFT trades on Sepolia.",
    values: {
      appUrl: "app.uniswap.org",
      appName: "Uniswap",
      iconUrl: "",
      contractAddress: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
      chainId: SEPOLIA_CHAIN_ID,
    },
  },
  {
    id: "aave-pool",
    label: "Aave V3 Pool",
    protocol: "Aave",
    description:
      "The Aave V3 Pool contract users transact with to supply, borrow, and repay on Sepolia.",
    values: {
      appUrl: "app.aave.com",
      appName: "Aave",
      iconUrl: "",
      contractAddress: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
      chainId: SEPOLIA_CHAIN_ID,
    },
  },
]

const navItems = [
  { href: REVIEW_WIDGET_CREATE_PATH, label: "Widget Builder", external: false },
  { href: REVIEW_WIDGET_HOST_EXAMPLE_PATH, label: "Host Example", external: false },
  { href: REVIEW_WIDGET_SEPOLIA_HOST_EXAMPLE_PATH, label: "Sepolia Host", external: false },
  { href: "https://registry.omatrust.org", label: "Registry", external: true },
  { href: "https://docs.omatrust.org", label: "Docs", external: true },
]

export function SepoliaHostExample() {
  const [selectedPresetId, setSelectedPresetId] = React.useState(presets[0].id)
  const [walletInput, setWalletInput] = React.useState("")
  const [useWalletParam, setUseWalletParam] = React.useState(false)
  const [baseUrl, setBaseUrl] = React.useState(DEFAULT_PUBLIC_ORIGIN)

  React.useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const selectedPreset = React.useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) ?? presets[0],
    [selectedPresetId]
  )

  const baseArtifacts = React.useMemo(
    () => createWidgetArtifacts(selectedPreset.values, { baseUrl }),
    [selectedPreset, baseUrl]
  )

  const trimmedWallet = walletInput.trim()

  const iframeUrl = React.useMemo(() => {
    const url = new URL(baseArtifacts.widgetUrl)

    if (useWalletParam && trimmedWallet) {
      url.searchParams.set("wallet", trimmedWallet)
    } else {
      url.searchParams.delete("wallet")
    }

    return url.toString()
  }, [baseArtifacts.widgetUrl, useWalletParam, trimmedWallet])

  const exampleSnippet = `<iframe
  id="omatrust-widget"
  src="${iframeUrl}"
  width="440"
  height="760"
  style="border:0; width:100%; max-width:440px; background:transparent;"
  loading="lazy"
  title="OMATrust Review Widget"
></iframe>`

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center">
            <Link href={REVIEW_WIDGET_CREATE_PATH} className="flex items-center">
              <Image
                src="/oma3_logo.svg"
                alt="OMA3 Logo"
                width={120}
                height={40}
                priority
              />
            </Link>

            <div className="flex-1" />

            <div className="flex items-center space-x-6">
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

              <a href={baseArtifacts.widgetUrl} target="_blank" rel="noreferrer">
                <Button type="button" variant="outline" size="sm" className="rounded-md px-4">
                  Open widget
                  <ExternalLink className="size-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_440px]">
          <section className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="neutral">Example Host</Badge>
                <Badge variant="accent" dot>
                  Sepolia testnet
                </Badge>
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-foreground">
                Run the review widget against a live testnet using real protocol contracts.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                This host example is wired to Ethereum Sepolia (chain ID {SEPOLIA_CHAIN_ID}). Pick a
                deployed protocol preset below to embed the widget without configuring your own
                contracts first. Proof checks run against real Sepolia transaction history, so any
                wallet that has actually transacted with the selected contract will verify.
              </p>
            </div>

            <Notice title="Why a separate testnet example?">
              The default{" "}
              <Link href={REVIEW_WIDGET_HOST_EXAMPLE_PATH} className="text-primary hover:underline">
                host example
              </Link>{" "}
              uses mock wallets to explain the wallet handoff. This page uses real, well-known
              Sepolia router contracts so you can test the full proof-check flow end to end against a
              live network.
            </Notice>

            <Card>
              <CardHeader>
                <CardTitle>Protocol presets</CardTitle>
                <CardDescription>
                  Each preset points the widget at a real router contract deployed on Sepolia. The
                  contract address is what the widget uses to prove a wallet is a genuine user.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {presets.map((preset) => {
                    const isActive = preset.id === selectedPreset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPresetId(preset.id)}
                        aria-pressed={isActive}
                        className={`rounded-[24px] border p-4 text-left transition hover:border-primary/30 hover:bg-accent ${
                          isActive ? "border-primary bg-accent" : "bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral">{preset.protocol}</Badge>
                          {isActive ? (
                            <Badge variant="success" dot>
                              Active
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm font-medium text-foreground">{preset.label}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{preset.description}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="rounded-[28px] border bg-gradient-to-br from-ink to-slate-900 p-6 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="max-w-xl space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200">
                        <Globe className="size-3.5" />
                        {selectedPreset.values.appName}
                      </div>
                      <h2 className="text-3xl font-semibold tracking-tight">
                        {selectedPreset.protocol} on Sepolia
                      </h2>
                      <p className="text-sm leading-7 text-slate-300">
                        The host page embeds the widget for the {selectedPreset.label}. In a real
                        integration this would be the contract your users transact with directly.
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Network</p>
                      <p className="mt-2 font-mono">Sepolia · {SEPOLIA_CHAIN_ID}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base">Selected configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 size-4 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">Contract address</p>
                          <a
                            href={`${SEPOLIA_EXPLORER}/${selectedPreset.values.contractAddress}`}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all font-mono text-primary hover:underline"
                          >
                            {selectedPreset.values.contractAddress}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Globe className="mt-0.5 size-4 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">App domain (did:web)</p>
                          <p className="break-all font-mono">
                            {baseArtifacts.subjectDid ?? selectedPreset.values.appUrl}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Link2 className="mt-0.5 size-4 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">Widget route</p>
                          <p className="font-mono break-all">{REVIEW_WIDGET_EMBED_PATH}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base">Pass a wallet (optional)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <p className="leading-6">
                        Paste a Sepolia wallet that has transacted with the selected contract to
                        watch the proof check pass. Leave it empty to let the widget resolve the
                        wallet on its own.
                      </p>
                      <input
                        type="text"
                        inputMode="text"
                        spellCheck={false}
                        value={walletInput}
                        placeholder="0x…"
                        onChange={(event) => {
                          setWalletInput(event.target.value)
                          setUseWalletParam(event.target.value.trim().length > 0)
                        }}
                        className="w-full rounded-xl border bg-white px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
                      />
                      <label className="flex items-center gap-2 text-foreground">
                        <input
                          type="checkbox"
                          checked={useWalletParam}
                          onChange={(event) => setUseWalletParam(event.target.checked)}
                          className="size-4 rounded border"
                        />
                        Pass wallet to the iframe
                      </label>
                      <div className="flex items-start gap-3 pt-1">
                        <Wallet className="mt-0.5 size-4 text-primary" />
                        <p className="break-all font-mono">
                          {useWalletParam && trimmedWallet
                            ? trimmedWallet
                            : "No wallet passed to iframe"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Embed markup</CardTitle>
                <CardDescription>
                  The host page just updates the iframe `src` with the current Sepolia config and
                  optional wallet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <CodeBlock label="Current iframe snippet" code={exampleSnippet} language="html" />
                <CodeBlock
                  label="Dynamic wallet injection"
                  code={`const iframe = document.getElementById("omatrust-widget");
const url = new URL(iframe.src);
url.searchParams.set("wallet", userWalletAddress);
iframe.src = url.toString();`}
                  language="js"
                />
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="success" dot>
                Embedded widget
              </Badge>
              <a href={iframeUrl} target="_blank" rel="noreferrer">
                <Button type="button" variant="outline" size="sm">
                  Open iframe target
                  <ExternalLink className="size-4" />
                </Button>
              </a>
            </div>

            <div className="rounded-[32px] border bg-white p-4 shadow-panel">
              <iframe
                key={iframeUrl}
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

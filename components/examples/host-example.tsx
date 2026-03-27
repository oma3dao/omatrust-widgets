"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { ExternalLink, Gamepad2, Link2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CodeBlock } from "@/components/ui/code-block"
import {
  DEFAULT_PUBLIC_ORIGIN,
  REVIEW_WIDGET_CREATE_PATH,
  REVIEW_WIDGET_EMBED_PATH,
  REVIEW_WIDGET_HOST_EXAMPLE_PATH,
  createWidgetArtifacts,
} from "@/lib/widget-config"
import type { BuilderFormValues } from "@/lib/validation"

const matchingWallet = "0x1111111111111111111111111111111111111111"
const mismatchWallet = "0x2222222222222222222222222222222222222222"

const sampleValues: BuilderFormValues = {
  gameUrl: "play.acmequest.com",
  gameName: "Acme Quest",
  iconUrl: "",
  slug: "",
  contractAddress: "0x1111111111111111111111111111111111111111",
  chainId: 8453,
}

const navItems = [
  { href: REVIEW_WIDGET_CREATE_PATH, label: "Widget Builder", external: false },
  { href: REVIEW_WIDGET_HOST_EXAMPLE_PATH, label: "Host Example", external: false },
  { href: "https://registry.omatrust.org", label: "Registry", external: true },
  { href: "https://docs.omatrust.org", label: "Docs", external: true },
]

export function HostExample() {
  const [selectedWallet, setSelectedWallet] = React.useState<string | null>(matchingWallet)
  const [useWalletParam, setUseWalletParam] = React.useState(true)
  const [baseUrl, setBaseUrl] = React.useState(DEFAULT_PUBLIC_ORIGIN)

  React.useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const baseArtifacts = React.useMemo(
    () => createWidgetArtifacts(sampleValues, { baseUrl }),
    [baseUrl]
  )
  const iframeUrl = React.useMemo(() => {
    const url = new URL(baseArtifacts.widgetUrl)

    if (!useWalletParam) {
      url.searchParams.delete("wallet")
      return url.toString()
    }

    if (selectedWallet) {
      url.searchParams.set("wallet", selectedWallet)
    } else {
      url.searchParams.delete("wallet")
    }

    return url.toString()
  }, [baseArtifacts.widgetUrl, selectedWallet, useWalletParam])

  const exampleSnippet = `<iframe
  id="omatrust-widget"
  src="${iframeUrl}"
  width="400"
  height="640"
  style="border:0; width:100%; max-width:400px; background:transparent;"
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
                  Wallet handoff demo
                </Badge>
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-foreground">
                See how a game site can embed the review widget and pass the current player wallet into the iframe.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                This example intentionally keeps the host wallet logic simple. In production, replace the mock wallet state with your preferred wallet library or your existing site session.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Mock game shell</CardTitle>
                <CardDescription>
                  The host site decides whether it passes a wallet to the iframe. The widget then uses that wallet for proof checking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-[28px] border bg-gradient-to-br from-ink to-slate-900 p-6 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="max-w-xl space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200">
                        <Gamepad2 className="size-3.5" />
                        Acme Quest
                      </div>
                      <h2 className="text-3xl font-semibold tracking-tight">
                        The host page already knows who the player is.
                      </h2>
                      <p className="text-sm leading-7 text-slate-300">
                        In a real game site, this wallet would likely come from the game’s own auth or wallet connection flow. The embed just receives the current player wallet as a query param.
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Current host route</p>
                      <p className="mt-2 font-mono">/play/acme-quest</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUseWalletParam(true)
                      setSelectedWallet(matchingWallet)
                    }}
                    className="rounded-[24px] border bg-white p-4 text-left transition hover:border-primary/30 hover:bg-accent"
                  >
                    <p className="text-sm font-medium text-foreground">Matching wallet</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Pass the same wallet the widget will sign with.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUseWalletParam(true)
                      setSelectedWallet(mismatchWallet)
                    }}
                    className="rounded-[24px] border bg-white p-4 text-left transition hover:border-primary/30 hover:bg-accent"
                  >
                    <p className="text-sm font-medium text-foreground">Mismatch wallet</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Demonstrates why signer and proof wallet must match.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUseWalletParam(false)
                      setSelectedWallet(null)
                    }}
                    className="rounded-[24px] border bg-white p-4 text-left transition hover:border-primary/30 hover:bg-accent"
                  >
                    <p className="text-sm font-medium text-foreground">No wallet param</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Lets the widget handle wallet resolution on its own.
                    </p>
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base">Host-side wallet state</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-start gap-3">
                        <Wallet className="mt-0.5 size-4 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">Player wallet</p>
                          <p className="break-all font-mono">
                            {useWalletParam && selectedWallet ? selectedWallet : "No wallet passed to iframe"}
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
                      <CardTitle className="text-base">Implementation note</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm leading-7 text-muted-foreground">
                      This page uses mock wallet state to keep the demo lightweight. If you want a production-like example, the next step would be swapping this state for the same wallet library already used on the host product.
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Embed markup</CardTitle>
                <CardDescription>
                  The host page just updates the iframe `src` with the current wallet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <CodeBlock label="Current iframe snippet" code={exampleSnippet} language="html" />
                <CodeBlock
                  label="Dynamic wallet injection"
                  code={`const iframe = document.getElementById("omatrust-widget");
const url = new URL(iframe.src);
url.searchParams.set("wallet", playerWalletAddress);
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
                className="h-[680px] w-full rounded-[24px]"
                style={{ border: 0 }}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

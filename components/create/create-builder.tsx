"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ExternalLink, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Notice } from "@/components/ui/notice"
import { CodeBlock } from "@/components/ui/code-block"
import { builderFormSchema, type BuilderFormValues } from "@/lib/validation"
import {
  DEFAULT_PUBLIC_ORIGIN,
  REVIEW_WIDGET_CREATE_PATH,
  REVIEW_WIDGET_HOST_EXAMPLE_PATH,
  createWidgetArtifacts,
  type WidgetQueryConfig,
  type SigningMode,
} from "@/lib/widget-config"

const emptyValues: BuilderFormValues = {
  appUrl: "",
  appName: "",
  iconUrl: "",
  contractAddress: "",
  chainId: 0,
  explorerApiUrl: "",
}

type FormErrors = Partial<Record<keyof BuilderFormValues, string>>

const navItems = [
  { href: REVIEW_WIDGET_CREATE_PATH, label: "Widget Builder", external: false },
  { href: REVIEW_WIDGET_HOST_EXAMPLE_PATH, label: "Host Example", external: false },
  { href: "https://reputation.omatrust.org", label: "Reputation", external: true },
  { href: "https://registry.omatrust.org", label: "Registry", external: true },
  { href: "https://docs.omatrust.org", label: "Docs", external: true },
]

const emptyArtifacts: WidgetQueryConfig = {
  appUrl: "",
  domain: null,
  subjectDid: null,
  contractAddress: "",
  chainId: 0,
  queryString: "",
  widgetUrl: "",
  snippets: { iframe: "", extra: "" },
}

export function CreateBuilder() {
  const [values, setValues] = React.useState<BuilderFormValues>(emptyValues)
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [hasGenerated, setHasGenerated] = React.useState(false)
  const [validatedValues, setValidatedValues] = React.useState<BuilderFormValues | null>(null)
  const [signingMode, setSigningMode] = React.useState<SigningMode>("basic")

  // Recompute snippets whenever the signing mode tab changes
  const artifacts = React.useMemo<WidgetQueryConfig>(() => {
    if (!validatedValues) return emptyArtifacts
    return createWidgetArtifacts(validatedValues, {
      baseUrl: typeof window !== "undefined" ? window.location.origin : DEFAULT_PUBLIC_ORIGIN,
      signingMode,
    })
  }, [validatedValues, signingMode])

  function updateValue<Key extends keyof BuilderFormValues>(
    key: Key,
    value: BuilderFormValues[Key]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = builderFormSchema.safeParse(values)

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setErrors({
        appUrl: fieldErrors.appUrl?.[0],
        appName: fieldErrors.appName?.[0],
        iconUrl: fieldErrors.iconUrl?.[0],
        contractAddress: fieldErrors.contractAddress?.[0],
        chainId: fieldErrors.chainId?.[0],
        explorerApiUrl: fieldErrors.explorerApiUrl?.[0],
      })
      return
    }

    setErrors({})
    setValidatedValues(parsed.data)
    setHasGenerated(true)
  }

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
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <section className="space-y-5 animate-fade-in-up">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="neutral">Widget Builder</Badge>
              </div>
              <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-foreground">
                Generate an OMATrust user review widget
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                This form outputs an iframe URL you can embed in your web3 app's front end. EVM only for now — support for other VMs is coming soon.
              </p>
            </div>

            <Notice title="Binding notice">
              For your reviews to be fully verifiable, you will need to complete a binding attestation
              linking your domain to your contract address.
            </Notice>

            <Card>
              <CardHeader>
                <CardTitle>Widget setup</CardTitle>
                <CardDescription>
                  Fill out the form, click Generate, and copy the snippet into your site.
                  For the contract address, enter the main contract that your users transact with directly.  This is how the widget proves someone is a real user of your app. 
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-6" onSubmit={handleGenerate}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Input
                        label="App URL or domain"
                        placeholder="exampleapp.com"
                        required
                        value={values.appUrl}
                        onChange={(event) => updateValue("appUrl", event.target.value)}
                        error={errors.appUrl}
                      />
                    </div>
                    <Input
                      label="Contract address"
                      placeholder="0x..."
                      required
                      value={values.contractAddress}
                      onChange={(event) => updateValue("contractAddress", event.target.value)}
                      error={errors.contractAddress}
                    />
                    <Input
                      label="Chain ID"
                      placeholder="1"
                      required
                      value={values.chainId ? String(values.chainId) : ""}
                      onChange={(event) => updateValue("chainId", Number(event.target.value))}
                      error={errors.chainId}
                    />
                    <Input
                      label="App name"
                      placeholder="Example App"
                      value={values.appName}
                      onChange={(event) => updateValue("appName", event.target.value)}
                      error={errors.appName}
                    />
                    <Input
                      label="App icon URL"
                      placeholder="https://example.com/icon.png"
                      value={values.iconUrl}
                      onChange={(event) => updateValue("iconUrl", event.target.value)}
                      error={errors.iconUrl}
                    />
                    <Input
                      label="Explorer API URL"
                      placeholder="https://explorer.examplechain.com/api"
                      value={values.explorerApiUrl ?? ""}
                      onChange={(event) => updateValue("explorerApiUrl", event.target.value)}
                      hint="Optional. Full Etherscan-compatible API URL including /api path."
                      error={errors.explorerApiUrl}
                    />
                    </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit">
                      <Sparkles className="size-4" />
                      Generate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setValues(emptyValues)
                        setErrors({})
                        setValidatedValues(null)
                        setHasGenerated(false)
                      }}
                    >
                      Clear Form
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {hasGenerated ? (
              <>
                <Card className="relative overflow-hidden">
                  <CardHeader>
                    <CardTitle>Embed snippets</CardTitle>
                    <CardDescription>
                      Choose the signing mode that matches your app, then copy the snippets.{" "}
                      <a
                        href="https://docs.omatrust.org/widgets/overview#signing-modes"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Which mode should I use?
                      </a>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex border-b">
                      <button
                        type="button"
                        onClick={() => setSigningMode("basic")}
                        className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
                          signingMode === "basic"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Basic mode
                      </button>
                      <button
                        type="button"
                        onClick={() => setSigningMode("integrated")}
                        className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
                          signingMode === "integrated"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Integrated mode
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {signingMode === "basic"
                        ? "For apps where users connect standard crypto wallets (MetaMask, WalletConnect, Safe). Paste the snippet — no SDK needed."
                        : "For apps with social login, custodial, or embedded wallets. Requires the @oma3/omatrust SDK."}
                    </p>

                    {artifacts.snippets.installCmd ? (
                      <CodeBlock label="Step 1: Install the SDK" code={artifacts.snippets.installCmd} language="bash" />
                    ) : null}
                    <CodeBlock
                      label={signingMode === "basic"
                        ? "Step 1: Paste into your HTML where you want the widget to appear"
                        : "Step 2: Paste the iframe into your HTML where you want the widget to appear"}
                      code={artifacts.snippets.iframe}
                      language="html"
                    />
                    <CodeBlock
                      label={signingMode === "basic"
                        ? "Step 2 (optional): Add to your JavaScript to pass the connected wallet for proof checking"
                        : "Step 3: Add to your app's JavaScript — connects the widget to your wallet"}
                      code={artifacts.snippets.extra}
                      language={signingMode === "basic" ? "html" : "ts"}
                    />
                    <p className="text-xs text-muted-foreground">
                      For a working reference implementation, see the{" "}
                      <a
                        href="https://github.com/oma3dao/rep-attestation-frontend/blob/main/src/components/review-widget-modal.tsx"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        reputation frontend source
                      </a>.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a href={artifacts.widgetUrl} target="_blank" rel="noreferrer">
                        <Button type="button" variant="outline">
                          Preview widget
                          <ExternalLink className="size-4" />
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  )
}

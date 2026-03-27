"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ExternalLink, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Notice } from "@/components/ui/notice"
import { CodeBlock } from "@/components/ui/code-block"
import { EmbedPreview } from "@/components/create/embed-preview"
import { builderFormSchema, type BuilderFormValues } from "@/lib/validation"
import {
  DEFAULT_PUBLIC_ORIGIN,
  REVIEW_WIDGET_CREATE_PATH,
  REVIEW_WIDGET_HOST_EXAMPLE_PATH,
  createWidgetArtifacts,
  type WidgetQueryConfig,
} from "@/lib/widget-config"

const defaultValues: BuilderFormValues = {
  gameUrl: "play.acmequest.com",
  gameName: "Acme Quest",
  iconUrl: "",
  slug: "",
  contractAddress: "0x1111111111111111111111111111111111111111",
  chainId: 8453,
}

type FormErrors = Partial<Record<keyof BuilderFormValues, string>>

const navItems = [
  { href: REVIEW_WIDGET_CREATE_PATH, label: "Widget Builder", external: false },
  { href: REVIEW_WIDGET_HOST_EXAMPLE_PATH, label: "Host Example", external: false },
  { href: "https://reputation.omatrust.org", label: "Reputation", external: true },
  { href: "https://registry.omatrust.org", label: "Registry", external: true },
  { href: "https://docs.omatrust.org", label: "Docs", external: true },
]

export function CreateBuilder() {
  const [values, setValues] = React.useState<BuilderFormValues>(defaultValues)
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [artifacts, setArtifacts] = React.useState<WidgetQueryConfig>(() =>
    createWidgetArtifacts(defaultValues, { baseUrl: DEFAULT_PUBLIC_ORIGIN })
  )

  React.useEffect(() => {
    setArtifacts(createWidgetArtifacts(values, { baseUrl: window.location.origin }))
  }, [])

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
        gameUrl: fieldErrors.gameUrl?.[0],
        gameName: fieldErrors.gameName?.[0],
        iconUrl: fieldErrors.iconUrl?.[0],
        slug: fieldErrors.slug?.[0],
        contractAddress: fieldErrors.contractAddress?.[0],
        chainId: fieldErrors.chainId?.[0],
      })
      return
    }

    setErrors({})
    setArtifacts(createWidgetArtifacts(parsed.data, { baseUrl: window.location.origin }))
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

              <a href="https://registry.omatrust.org" target="_blank" rel="noreferrer">
                <Button type="button" variant="outline" size="sm" className="rounded-md px-4">
                  Register app
                  <ExternalLink className="size-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <section className="space-y-5 animate-fade-in-up">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="neutral">Builder</Badge>
                <Badge variant="accent" dot>
                  MVP build
                </Badge>
              </div>
              <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-foreground">
                Generate the hosted OMATrust review widget for a game or virtual world.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Enter the game domain, one contract, and one chain for MVP. The widget constructs the
                `did:web` subject automatically and outputs an iframe URL plus copy-paste embed snippets.
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
                  Keep this simple: fill out the widget inputs, generate the embed, then copy the snippet into the game site.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-6" onSubmit={handleGenerate}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Input
                        label="Game URL or domain"
                        placeholder="mygame.com"
                        value={values.gameUrl}
                        onChange={(event) => updateValue("gameUrl", event.target.value)}
                        hint="The widget will derive the did:web subject automatically."
                        error={errors.gameUrl}
                      />
                    </div>
                    <Input
                      label="Game name"
                      placeholder="Acme Quest"
                      value={values.gameName}
                      onChange={(event) => updateValue("gameName", event.target.value)}
                      hint="Optional display name for the widget."
                      error={errors.gameName}
                    />
                    <Input
                      label="Game icon URL"
                      placeholder="https://example.com/icon.png"
                      value={values.iconUrl}
                      onChange={(event) => updateValue("iconUrl", event.target.value)}
                      hint="Optional."
                      error={errors.iconUrl}
                    />
                    <Input
                      label="Contract address"
                      placeholder="0x..."
                      value={values.contractAddress}
                      onChange={(event) => updateValue("contractAddress", event.target.value)}
                      error={errors.contractAddress}
                    />
                    <Select
                      label="Chain ID"
                      value={String(values.chainId)}
                      onChange={(event) => updateValue("chainId", Number(event.target.value))}
                      error={errors.chainId}
                    >
                      <option value="8453">8453 · Base</option>
                      <option value="1">1 · Ethereum</option>
                      <option value="137">137 · Polygon</option>
                      <option value="10">10 · Optimism</option>
                      <option value="42161">42161 · Arbitrum</option>
                      <option value="66238">66238 · OMAchain Testnet</option>
                    </Select>
                    <Input
                      label="Slug"
                      placeholder="acme-quest"
                      value={values.slug}
                      onChange={(event) => updateValue("slug", event.target.value)}
                      hint="Optional."
                      error={errors.slug}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit">
                      <Sparkles className="size-4" />
                      Generate embed
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setValues(defaultValues)
                        setErrors({})
                        setArtifacts(
                          createWidgetArtifacts(defaultValues, {
                            baseUrl: window.location.origin,
                          })
                        )
                      }}
                    >
                      Reset sample
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <CardTitle>Generated output</CardTitle>
                <CardDescription>
                  The widget config is URL-based for MVP, so there is no server-side persistence layer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <CodeBlock label="Widget URL" code={artifacts.widgetUrl} language="url" />
                <CodeBlock label="Iframe snippet" code={artifacts.iframeSnippet} language="html" />
                <CodeBlock label="Optional wallet injection snippet" code={artifacts.jsSnippet} language="js" />
                <Notice title="Runtime wallet passthrough">
                  Most integrations should leave the wallet out of the generated URL and set it dynamically at runtime from the host site when a player is already connected.
                </Notice>
                <div className="flex flex-wrap gap-3">
                  <Link href={REVIEW_WIDGET_HOST_EXAMPLE_PATH}>
                    <Button type="button" variant="outline">
                      Open host example
                    </Button>
                  </Link>
                  <a href={artifacts.widgetUrl} target="_blank" rel="noreferrer">
                    <Button type="button" variant="ghost">
                      Open widget target
                      <ExternalLink className="size-4" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Widget preview</CardTitle>
                <CardDescription>
                  Preview the embedded review experience here, or open it in a separate tab.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmbedPreview config={artifacts} widgetUrl={artifacts.widgetUrl} />
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}

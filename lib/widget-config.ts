import { buildDidWeb, normalizeDomain } from "@oma3/omatrust/identity"
import { builderFormSchema, type BuilderFormValues } from "@/lib/validation"

export type WidgetConfig = {
  gameUrl: string
  domain: string | null
  subjectDid: string | null
  gameName?: string
  iconUrl?: string
  slug?: string
  contractAddress: string
  chainId: number
  wallet?: string
}

export type WidgetQueryConfig = WidgetConfig & {
  queryString: string
  iframeSnippet: string
  jsSnippet: string
  widgetUrl: string
}

export const REVIEW_WIDGET_CREATE_PATH = "/widgets/reviews/create"
export const REVIEW_WIDGET_EMBED_PATH = "/widgets/reviews/embed"
export const REVIEW_WIDGET_HOST_EXAMPLE_PATH = "/widgets/reviews/examples/host"
export const REVIEW_WIDGET_NAMESPACE_PATH = "/widgets/reviews"
export const DEFAULT_PUBLIC_ORIGIN = "https://reputation.omatrust.org"

export function getBaseUrl(baseUrl?: string) {
  if (baseUrl) {
    return baseUrl
  }

  return DEFAULT_PUBLIC_ORIGIN
}

export function coerceDomain(input: string) {
  const trimmed = input.trim()

  if (!trimmed) {
    return null
  }

  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    return normalizeDomain(url.hostname)
  } catch {
    try {
      return normalizeDomain(trimmed)
    } catch {
      return null
    }
  }
}

export function deriveSubjectDid(input: string) {
  const domain = coerceDomain(input)
  if (!domain) {
    return null
  }

  try {
    return buildDidWeb(domain)
  } catch {
    return null
  }
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function normalizeBuilderValues(values: BuilderFormValues): WidgetConfig {
  const parsed = builderFormSchema.parse(values)
  const domain = coerceDomain(parsed.gameUrl)
  const subjectDid = deriveSubjectDid(parsed.gameUrl)
  const generatedSlug = parsed.slug || (parsed.gameName ? slugify(parsed.gameName) : "")

  return {
    gameUrl: parsed.gameUrl.trim(),
    domain,
    subjectDid,
    gameName: parsed.gameName || undefined,
    iconUrl: parsed.iconUrl || undefined,
    slug: generatedSlug || undefined,
    contractAddress: parsed.contractAddress,
    chainId: parsed.chainId,
  }
}

export function buildWidgetQuery(config: WidgetConfig) {
  const params = new URLSearchParams({
    url: config.gameUrl,
    contract: config.contractAddress,
    chainId: String(config.chainId),
  })

  if (config.gameName) params.set("name", config.gameName)
  if (config.iconUrl) params.set("icon", config.iconUrl)
  if (config.wallet) params.set("wallet", config.wallet)
  if (config.slug) params.set("slug", config.slug)

  return params
}

export function createWidgetArtifacts(
  values: BuilderFormValues,
  options?: { baseUrl?: string }
): WidgetQueryConfig {
  const config = normalizeBuilderValues(values)
  const params = buildWidgetQuery(config)
  const queryString = params.toString()
  const widgetUrl = `${getBaseUrl(options?.baseUrl)}${REVIEW_WIDGET_EMBED_PATH}?${queryString}`
  const iframeSnippet = `<iframe
  id="omatrust-widget"
  src="${widgetUrl}"
  width="400"
  height="640"
  style="border:0; width:100%; max-width:400px; background:transparent;"
  loading="lazy"
  title="OMATrust Review Widget"
></iframe>`
  const jsSnippet = `const iframe = document.getElementById("omatrust-widget");
const url = new URL(iframe.src);
url.searchParams.set("wallet", userWalletAddress);
iframe.src = url.toString();`

  return {
    ...config,
    queryString,
    widgetUrl,
    iframeSnippet,
    jsSnippet,
  }
}

export function parseWidgetConfigFromSearch(searchParams: URLSearchParams): WidgetConfig | null {
  const gameUrl = searchParams.get("url")
  const contractAddress = searchParams.get("contract")
  const chainIdValue = searchParams.get("chainId")

  if (!gameUrl || !contractAddress || !chainIdValue) {
    return null
  }

  const chainId = Number(chainIdValue)
  if (!Number.isInteger(chainId) || chainId <= 0) {
    return null
  }

  return {
    gameUrl,
    domain: coerceDomain(gameUrl),
    subjectDid: deriveSubjectDid(gameUrl),
    gameName: searchParams.get("name") || undefined,
    iconUrl: searchParams.get("icon") || undefined,
    slug: searchParams.get("slug") || undefined,
    contractAddress,
    chainId,
    wallet: searchParams.get("wallet") || undefined,
  }
}

import { buildDidWeb, normalizeDomain } from "@oma3/omatrust/identity"
import { builderFormSchema, type BuilderFormValues } from "@/lib/validation"

export type WidgetConfig = {
  appUrl: string
  domain: string | null
  subjectDid: string | null
  appName?: string
  iconUrl?: string
  contractAddress: string
  chainId: number
  rpcUrl?: string
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

  let hostname: string
  try {
    const url = new URL(candidate)
    hostname = url.hostname
  } catch {
    hostname = trimmed
  }

  // Strip www. prefix before normalizing — www.example.com and example.com
  // should produce the same did:web. This is a local workaround until the
  // SDK's normalizeDomain handles this (see omatrust-sdk issue).
  hostname = hostname.replace(/^www\./i, "")

  try {
    return normalizeDomain(hostname)
  } catch {
    return null
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

export function normalizeBuilderValues(values: BuilderFormValues): WidgetConfig {
  const parsed = builderFormSchema.parse(values)
  const domain = coerceDomain(parsed.appUrl)
  const subjectDid = deriveSubjectDid(parsed.appUrl)

  return {
    appUrl: parsed.appUrl.trim(),
    domain,
    subjectDid,
    appName: parsed.appName || undefined,
    iconUrl: parsed.iconUrl || undefined,
    contractAddress: parsed.contractAddress,
    chainId: parsed.chainId,
    rpcUrl: parsed.rpcUrl || undefined,
  }
}

export function buildWidgetQuery(config: WidgetConfig) {
  const params = new URLSearchParams({
    url: config.appUrl,
    contract: config.contractAddress,
    chainId: String(config.chainId),
  })

  if (config.appName) params.set("name", config.appName)
  if (config.iconUrl) params.set("icon", config.iconUrl)
  if (config.wallet) params.set("wallet", config.wallet)
  if (config.rpcUrl) params.set("rpc", config.rpcUrl)

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
  const appUrl = searchParams.get("url")
  const contractAddress = searchParams.get("contract")
  const chainIdValue = searchParams.get("chainId")

  if (!appUrl || !contractAddress || !chainIdValue) {
    return null
  }

  const chainId = Number(chainIdValue)
  if (!Number.isInteger(chainId) || chainId <= 0) {
    return null
  }

  return {
    appUrl,
    domain: coerceDomain(appUrl),
    subjectDid: deriveSubjectDid(appUrl),
    appName: searchParams.get("name") || undefined,
    iconUrl: searchParams.get("icon") || undefined,
    contractAddress,
    chainId,
    rpcUrl: searchParams.get("rpc") || undefined,
    wallet: searchParams.get("wallet") || undefined,
  }
}

import { ShieldAlert } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Notice } from "@/components/ui/notice"
import { ReviewWidget } from "@/components/embed/review-widget"
import { parseWidgetConfigFromSearch, REVIEW_WIDGET_EMBED_PATH } from "@/lib/widget-config"

type SearchParamValue = string | string[] | undefined

function toSearchParams(input: Record<string, SearchParamValue>) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item)
      }
      continue
    }

    if (typeof value === "string") {
      searchParams.set(key, value)
    }
  }

  return searchParams
}

export async function EmbedPageShell({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchParamValue>>
}) {
  const resolvedSearchParams = await searchParams
  const config = parseWidgetConfigFromSearch(toSearchParams(resolvedSearchParams))

  if (!config) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <CardTitle>Widget config missing</CardTitle>
                <CardDescription>
                  <code>{REVIEW_WIDGET_EMBED_PATH}</code> expects <code>url</code>, <code>contract</code>, and <code>chainId</code> query params.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Notice title="Expected shape">
              Example: <code>{REVIEW_WIDGET_EMBED_PATH}?url=mygame.com&amp;contract=0x...&amp;chainId=8453</code>
            </Notice>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-transparent p-3 sm:p-6">
      <ReviewWidget config={config} />
    </main>
  )
}

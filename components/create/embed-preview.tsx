"use client"

import { ExternalLink } from "lucide-react"
import type { WidgetConfig } from "@/lib/widget-config"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ReviewWidget } from "@/components/embed/review-widget"
import { Button } from "@/components/ui/button"

type EmbedPreviewProps = {
  config: WidgetConfig
  widgetUrl: string
}

export function EmbedPreview({ config, widgetUrl }: EmbedPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="accent" dot>
            Hosted iframe
          </Badge>
          <Badge variant="success" dot>
            Preview
          </Badge>
        </div>
        <a href={widgetUrl} target="_blank" rel="noreferrer">
          <Button type="button" variant="outline" size="sm">
            Open preview
            <ExternalLink className="size-4" />
          </Button>
        </a>
      </div>

      <div className="relative overflow-hidden rounded-[28px] border bg-[hsl(var(--card)/0.7)] p-4 shadow-panel">
        <div className="surface-grid absolute inset-0 opacity-60" />
        <div className="surface-noise absolute inset-0" />
        <div className="relative flex items-center justify-center py-4">
          <ReviewWidget config={config} previewMode />
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Subject</p>
            <p className="mt-1 font-medium text-foreground break-all">
              {config.subjectDid ?? "Waiting for valid domain"}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Chain</p>
            <p className="mt-1 font-medium text-foreground">{config.chainId}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Wallet</p>
            <p className="mt-1 font-medium text-foreground">
              {config.wallet ? "Prefilled" : "Connect in widget"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

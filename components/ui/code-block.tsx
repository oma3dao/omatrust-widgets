import * as React from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CodeBlockProps = {
  label: string
  code: string
  language?: string
  className?: string
}

export function CodeBlock({
  label,
  code,
  language,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {language ? (
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {language}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-[24px] border bg-ink px-4 py-4 text-sm text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}

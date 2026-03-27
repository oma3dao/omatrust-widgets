import * as React from "react"
import { Info, AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

type NoticeProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: "info" | "warning" | "success"
  title?: string
}

const toneMap = {
  info: {
    wrapper: "bg-accent/70 border-primary/15",
    icon: Info,
    iconClass: "text-primary",
  },
  warning: {
    wrapper: "bg-amber-50 border-amber-200",
    icon: AlertTriangle,
    iconClass: "text-amber-600",
  },
  success: {
    wrapper: "bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
  },
}

export function Notice({
  className,
  tone = "info",
  title,
  children,
  ...props
}: NoticeProps) {
  const toneConfig = toneMap[tone]
  const Icon = toneConfig.icon

  return (
    <div
      className={cn(
        "flex gap-3 rounded-3xl border px-4 py-4 text-sm text-foreground",
        toneConfig.wrapper,
        className
      )}
      {...props}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", toneConfig.iconClass)} />
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}

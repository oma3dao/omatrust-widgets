import * as React from "react"
import { cn } from "@/lib/utils"

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const textareaId = id ?? React.useId()

    return (
      <label className="flex flex-col gap-2" htmlFor={textareaId}>
        {label ? (
          <span className="text-sm font-medium text-foreground">{label}</span>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "min-h-[124px] rounded-3xl border bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition",
            "placeholder:text-muted-foreground focus:border-primary/45 focus:ring-2 focus:ring-primary/20",
            error && "border-danger/50 focus:border-danger focus:ring-danger/15",
            className
          )}
          {...props}
        />
        {error ? (
          <span className="text-xs text-danger">{error}</span>
        ) : hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </label>
    )
  }
)

Textarea.displayName = "Textarea"

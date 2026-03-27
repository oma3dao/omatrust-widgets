import * as React from "react"
import { cn } from "@/lib/utils"

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id ?? React.useId()

    return (
      <label className="flex flex-col gap-2" htmlFor={inputId}>
        {label ? (
          <span className="text-sm font-medium text-foreground">{label}</span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 rounded-2xl border bg-white px-4 text-sm text-foreground shadow-sm outline-none transition",
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

Input.displayName = "Input"

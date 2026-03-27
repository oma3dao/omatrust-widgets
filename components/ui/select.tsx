import * as React from "react"
import { cn } from "@/lib/utils"

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  error?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, error, id, children, ...props }, ref) => {
    const selectId = id ?? React.useId()

    return (
      <label className="flex flex-col gap-2" htmlFor={selectId}>
        {label ? (
          <span className="text-sm font-medium text-foreground">{label}</span>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "h-11 rounded-2xl border bg-white px-4 text-sm text-foreground shadow-sm outline-none transition",
            "focus:border-primary/45 focus:ring-2 focus:ring-primary/20",
            error && "border-danger/50 focus:border-danger focus:ring-danger/15",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <span className="text-xs text-danger">{error}</span>
        ) : hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </label>
    )
  }
)

Select.displayName = "Select"

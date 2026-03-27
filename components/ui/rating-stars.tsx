import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

type RatingStarsProps = {
  value: number
  onChange?: (value: number) => void
  size?: "sm" | "md"
  readOnly?: boolean
}

export function RatingStars({
  value,
  onChange,
  size = "md",
  readOnly = false,
}: RatingStarsProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value
        const iconSize = size === "sm" ? "size-4" : "size-5"

        if (readOnly) {
          return (
            <Star
              key={star}
              className={cn(
                iconSize,
                active ? "fill-primary text-primary" : "text-border"
              )}
            />
          )
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className="rounded-full p-1 transition hover:bg-accent"
            aria-label={`Rate ${star} out of 5`}
          >
            <Star
              className={cn(
                iconSize,
                active ? "fill-primary text-primary" : "text-border"
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

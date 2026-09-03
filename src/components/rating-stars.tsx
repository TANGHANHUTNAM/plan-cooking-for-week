import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Show the favorite level with stars instead of a number — easy to scan at a glance. */
export function RatingStars({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`Mức yêu thích ${value} trên 5 sao`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            "size-3",
            i <= value
              ? "fill-warm text-warm"
              : "fill-transparent text-muted-foreground/30"
          )}
        />
      ))}
    </span>
  );
}

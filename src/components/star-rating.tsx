"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} sao`}
          onClick={() => onChange(value === i ? i - 1 : i)}
          className="grid size-9 place-items-center rounded-full transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            className={cn(
              "size-6 transition-colors",
              i <= value
                ? "fill-amber-400 text-amber-500"
                : "text-muted-foreground/40"
            )}
          />
        </button>
      ))}
      <span className="ml-1 w-8 text-sm tabular-nums text-muted-foreground">
        {value > 0 ? `${value}/5` : "—"}
      </span>
    </div>
  );
}

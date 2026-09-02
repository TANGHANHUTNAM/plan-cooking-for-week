"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS = [
  "Chưa chấm",
  "Ít khi nấu",
  "Bình thường",
  "Hay nấu",
  "Rất thích",
  "Món tủ",
];

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
          aria-label={`Chấm ${i} sao`}
          aria-pressed={i <= value}
          onClick={() => onChange(value === i ? i - 1 : i)}
          className="grid size-11 place-items-center rounded-md outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:size-9"
        >
          <Star
            className={cn(
              "size-6 transition-colors",
              i <= value
                ? "fill-warm text-warm"
                : "fill-transparent text-muted-foreground/35"
            )}
          />
        </button>
      ))}
      <span aria-live="polite" className="ml-2 text-xs text-muted-foreground">
        {LABELS[value] ?? LABELS[0]}
      </span>
    </div>
  );
}

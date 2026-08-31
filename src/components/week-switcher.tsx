import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysISO, todayISO, weekRangeLabel, weekStartISO } from "@/lib/week";
import { cn } from "@/lib/utils";

export function WeekSwitcher({
  weekStart,
  basePath,
  className,
}: {
  weekStart: string;
  basePath: string;
  className?: string;
}) {
  const currentWeek = weekStartISO(todayISO());
  const isCurrent = weekStart === currentWeek;

  return (
    <div
      className={cn("mb-4 flex items-center justify-between gap-2", className)}
    >
      <Link
        href={`${basePath}?w=${addDaysISO(weekStart, -7)}`}
        aria-label="Tuần trước"
        className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-5" />
      </Link>

      <div className="text-center leading-tight">
        <p className="font-semibold tabular-nums">
          {weekRangeLabel(weekStart)}
        </p>
        {isCurrent ? (
          <p className="text-xs font-medium text-primary">Tuần này</p>
        ) : (
          <Link
            href={basePath}
            className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Về tuần này
          </Link>
        )}
      </div>

      <Link
        href={`${basePath}?w=${addDaysISO(weekStart, 7)}`}
        aria-label="Tuần sau"
        className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight className="size-5" />
      </Link>
    </div>
  );
}

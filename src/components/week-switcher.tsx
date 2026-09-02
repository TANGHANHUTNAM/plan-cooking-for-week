import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysISO, todayISO, weekRangeLabel, weekStartISO } from "@/lib/week";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";

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
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <ButtonGroup className="h-11 lg:h-10">
        <Button
          variant="outline"
          size="icon-lg"
          asChild
          className="size-11 lg:size-10"
        >
          <Link
            href={`${basePath}?w=${addDaysISO(weekStart, -7)}`}
            aria-label="Xem tuần trước"
          >
            <ChevronLeft className="size-4.5" />
          </Link>
        </Button>
        <ButtonGroupText className="min-w-[10.5rem] justify-center bg-card px-4 text-sm font-semibold tabular-nums">
          {weekRangeLabel(weekStart)}
        </ButtonGroupText>
        <Button
          variant="outline"
          size="icon-lg"
          asChild
          className="size-11 lg:size-10"
        >
          <Link
            href={`${basePath}?w=${addDaysISO(weekStart, 7)}`}
            aria-label="Xem tuần sau"
          >
            <ChevronRight className="size-4.5" />
          </Link>
        </Button>
      </ButtonGroup>

      {isCurrent ? (
        <Badge variant="secondary" className="h-6 px-2.5 text-xs">
          Tuần này
        </Badge>
      ) : (
        <Button
          variant="ghost"
          size="lg"
          asChild
          className="h-11 text-xs lg:h-8"
        >
          <Link href={basePath}>Về tuần này</Link>
        </Button>
      )}
    </div>
  );
}

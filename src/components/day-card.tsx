import type { MealDTO, MemberDTO } from "@/lib/dto";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MealCard, PeriodChip } from "@/components/meal-card";

/** Placeholder for an unscheduled meal — keeps each day column tall enough for both meals. */
function MissingMeal({ period }: { period: "LUNCH" | "DINNER" }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border border-dashed p-3",
        period === "LUNCH"
          ? "border-warm/40 bg-warm-surface/30"
          : "border-cool/40 bg-cool-surface/30"
      )}
    >
      <PeriodChip period={period} />
      <p className="text-[13px] text-muted-foreground">Chưa lên lịch bữa này</p>
    </div>
  );
}

/**
 * One day in the weekly calendar: the card header shows the weekday and date,
 * while the body always includes lunch and dinner so grid columns have equal height.
 * Each meal has its own surface to prevent confusion between the two.
 */
export function DayCard({
  weekdayLabel,
  dayNumber,
  isToday,
  lunch,
  dinner,
  members,
}: {
  weekdayLabel: string;
  dayNumber: string;
  isToday: boolean;
  lunch?: MealDTO;
  dinner?: MealDTO;
  members: MemberDTO[];
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "h-full",
        isToday && "ring-2 ring-primary/70 ring-offset-2 ring-offset-background"
      )}
      aria-current={isToday ? "date" : undefined}
    >
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-[13px] font-semibold",
              isToday ? "text-primary" : "text-muted-foreground"
            )}
          >
            {weekdayLabel}
          </span>
          <span
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums",
              isToday ? "bg-primary text-primary-foreground" : "text-foreground"
            )}
          >
            {dayNumber}
          </span>
        </div>
      </CardHeader>

      {/* Split the card body in half: every day's lunch and dinner cells start at the same height. */}
      <CardContent className="grid flex-1 grid-rows-2 gap-2.5">
        {lunch ? (
          <MealCard meal={lunch} members={members} variant="compact" />
        ) : (
          <MissingMeal period="LUNCH" />
        )}
        {dinner ? (
          <MealCard meal={dinner} members={members} variant="compact" />
        ) : (
          <MissingMeal period="DINNER" />
        )}
      </CardContent>
    </Card>
  );
}

import type { FoodDTO, MealDTO, MemberDTO } from "@/lib/dto";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MealCard, PeriodChip } from "@/components/meal-card";

/** Ô trống cho bữa chưa được lên lịch — giữ cột ngày đủ hai bữa. */
function MissingMeal({ period }: { period: "LUNCH" | "DINNER" }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-dashed border-border p-3">
      <PeriodChip period={period} />
      <p className="text-xs text-muted-foreground">Chưa lên lịch bữa này</p>
    </div>
  );
}

/**
 * Một ngày trong lịch tuần: đầu thẻ là thứ và ngày, thân thẻ luôn có đủ
 * bữa trưa và bữa tối nên các cột trong lưới cao bằng nhau.
 * Mỗi bữa nằm trong một ô nền riêng để không đọc nhầm sang bữa kia.
 */
export function DayCard({
  weekdayLabel,
  dayNumber,
  isToday,
  lunch,
  dinner,
  foods,
  members,
}: {
  weekdayLabel: string;
  dayNumber: string;
  isToday: boolean;
  lunch?: MealDTO;
  dinner?: MealDTO;
  foods: FoodDTO[];
  members: MemberDTO[];
}) {
  return (
    <Card
      size="sm"
      className={cn("h-full", isToday && "ring-2 ring-primary/70")}
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

      {/* chia đôi thân thẻ: ô trưa và ô tối của mọi ngày bắt đầu cùng một độ cao */}
      <CardContent className="grid flex-1 grid-rows-2 gap-2.5">
        {lunch ? (
          <MealCard
            meal={lunch}
            foods={foods}
            members={members}
            variant="compact"
          />
        ) : (
          <MissingMeal period="LUNCH" />
        )}
        {dinner ? (
          <MealCard
            meal={dinner}
            foods={foods}
            members={members}
            variant="compact"
          />
        ) : (
          <MissingMeal period="DINNER" />
        )}
      </CardContent>
    </Card>
  );
}

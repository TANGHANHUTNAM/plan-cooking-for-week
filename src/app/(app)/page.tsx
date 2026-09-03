import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CookingPot } from "lucide-react";
import { getSession } from "@/lib/session";
import { getMembers, getWeekPlan } from "@/lib/queries";
import { mapMeal, mapMember } from "@/lib/dto";
import { formatDayFull, todayISO, weekStartISO } from "@/lib/week";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { MealCard, PeriodChip } from "@/components/meal-card";
import { GenerateWeekButton } from "@/components/generate-week-button";

/** Placeholder for an unscheduled meal — keeps the lunch/dinner columns balanced. */
function MissingMealCard({
  period,
  weekStart,
}: {
  period: "LUNCH" | "DINNER";
  weekStart: string;
}) {
  return (
    <Card className="h-full border border-dashed bg-transparent ring-0">
      <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
        <PeriodChip period={period} size="full" />
        <p className="text-sm font-medium">
          Chưa có bữa {period === "LUNCH" ? "trưa" : "tối"} trong thực đơn
        </p>
        <GenerateWeekButton
          weekStart={weekStart}
          hasPlan
          variant="outline"
          label="Random lại tuần"
          className="h-11 lg:h-9"
        />
      </CardContent>
    </Card>
  );
}

export default async function TodayPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const today = todayISO();
  const weekStart = weekStartISO(today);
  const [plan, members] = await Promise.all([
    getWeekPlan(weekStart),
    getMembers(),
  ]);
  const memberDTOs = members.map(mapMember);

  const weekMeals = plan?.meals ?? [];
  const todayMeals = weekMeals
    .filter((m) => m.date.toISOString().slice(0, 10) === today)
    .map(mapMeal);
  const lunch = todayMeals.find((m) => m.period === "LUNCH");
  const dinner = todayMeals.find((m) => m.period === "DINNER");
  const hasPlan = weekMeals.length > 0;
  const cookedCount = weekMeals.filter((m) => m.cookedAt !== null).length;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title={formatDayFull(today)}
        description="Bữa trưa và bữa tối của cả nhà hôm nay."
        actions={
          <Button variant="outline" size="lg" asChild className="h-11 lg:h-10">
            <Link href="/week">
              <CalendarDays />
              Xem cả tuần
            </Link>
          </Button>
        }
      />

      {!hasPlan ? (
        <EmptyState
          icon={<CookingPot />}
          title="Tuần này chưa có thực đơn"
          description="Random một thực đơn cho cả tuần từ các món đã lưu, rồi chỉnh lại bữa nào bạn muốn."
        >
          <GenerateWeekButton
            weekStart={weekStart}
            hasPlan={false}
            label="Tạo thực đơn tuần này"
            className="h-11 px-6 text-sm font-semibold"
          />
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <Card size="sm" className="border-l-4 border-l-primary/60">
            <CardContent className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="w-full min-w-[12rem] sm:w-80">
                <p className="text-sm font-medium">
                  Tuần này đã nấu{" "}
                  <span className="tabular-nums">
                    {cookedCount}/{weekMeals.length}
                  </span>{" "}
                  bữa
                </p>
                <Progress
                  value={
                    weekMeals.length
                      ? (cookedCount / weekMeals.length) * 100
                      : 0
                  }
                  aria-label="Tiến độ nấu ăn trong tuần"
                  className="mt-2 h-1.5"
                />
              </div>
              <Button variant="ghost" size="lg" asChild className="h-11 lg:h-9">
                <Link href="/shopping">Xem đồ cần mua</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid auto-rows-fr items-stretch gap-5 md:grid-cols-2">
            {lunch ? (
              <MealCard meal={lunch} members={memberDTOs} variant="full" />
            ) : (
              <MissingMealCard period="LUNCH" weekStart={weekStart} />
            )}
            {dinner ? (
              <MealCard meal={dinner} members={memberDTOs} variant="full" />
            ) : (
              <MissingMealCard period="DINNER" weekStart={weekStart} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CookingPot } from "lucide-react";
import { getSession } from "@/lib/session";
import { getAllFoods, getMembers, getWeekPlan } from "@/lib/queries";
import { mapFood, mapMeal, mapMember } from "@/lib/dto";
import { formatDayFull, todayISO, weekStartISO } from "@/lib/week";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { MealCard } from "@/components/meal-card";
import { GenerateWeekButton } from "@/components/generate-week-button";

export default async function TodayPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const today = todayISO();
  const weekStart = weekStartISO(today);
  const [plan, foods, members] = await Promise.all([
    getWeekPlan(weekStart),
    getAllFoods(),
    getMembers(),
  ]);
  const foodDTOs = foods.map(mapFood);
  const memberDTOs = members.map(mapMember);

  const todayMeals = (plan?.meals ?? [])
    .filter((m) => m.date.toISOString().slice(0, 10) === today)
    .map(mapMeal);
  const lunch = todayMeals.find((m) => m.period === "LUNCH");
  const dinner = todayMeals.find((m) => m.period === "DINNER");
  const hasPlan = (plan?.meals.length ?? 0) > 0;

  return (
    <div className="w-full lg:max-w-4xl">
      <PageHeader
        eyebrow="Hôm nay"
        title={formatDayFull(today)}
        action={
          <Link
            href="/week"
            className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <CalendarDays className="size-3.5" />
            Cả tuần
          </Link>
        }
      />

      {!hasPlan ? (
        <EmptyState
          icon={<CookingPot className="size-7" />}
          title="Tuần này chưa có thực đơn"
          description="Random một thực đơn thông minh từ các món bạn đã lưu."
          className="lg:max-w-xl"
        >
          <GenerateWeekButton
            weekStart={weekStart}
            hasPlan={false}
            label="Tạo thực đơn tuần này"
            className="h-11 px-6 text-base font-semibold"
          />
        </EmptyState>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {lunch ? (
            <MealCard
              meal={lunch}
              foods={foodDTOs}
              members={memberDTOs}
              variant="full"
            />
          ) : null}
          {dinner ? (
            <MealCard
              meal={dinner}
              foods={foodDTOs}
              members={memberDTOs}
              variant="full"
            />
          ) : null}
          {!lunch && !dinner ? (
            <EmptyState
              icon={<CookingPot className="size-7" />}
              title="Hôm nay chưa có bữa nào"
              description="Mở lịch tuần để xem hoặc random lại thực đơn."
              className="md:col-span-2 lg:max-w-xl"
            >
              <GenerateWeekButton
                weekStart={weekStart}
                hasPlan={hasPlan}
                label="Random lại tuần"
              />
            </EmptyState>
          ) : null}
        </div>
      )}
    </div>
  );
}

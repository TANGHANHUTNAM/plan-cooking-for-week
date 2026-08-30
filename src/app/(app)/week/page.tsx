import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getSession } from "@/lib/session";
import { getAllFoods, getMembers, getWeekPlan } from "@/lib/queries";
import { mapFood, mapMeal, mapMember } from "@/lib/dto";
import type { MealDTO } from "@/lib/dto";
import {
  DAY_LABELS,
  formatDM,
  normalizeWeekParam,
  todayISO,
  weekDaysISO,
} from "@/lib/week";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { MealCard } from "@/components/meal-card";
import { WeekSwitcher } from "@/components/week-switcher";
import { GenerateWeekButton } from "@/components/generate-week-button";
import { CopyLastWeekButton } from "@/components/copy-last-week-button";

export const metadata: Metadata = { title: "Lịch tuần" };

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { w } = await searchParams;
  const weekStart = normalizeWeekParam(w);
  const today = todayISO();

  const [plan, foods, members] = await Promise.all([
    getWeekPlan(weekStart),
    getAllFoods(),
    getMembers(),
  ]);
  const foodDTOs = foods.map(mapFood);
  const memberDTOs = members.map(mapMember);
  const hasPlan = (plan?.meals.length ?? 0) > 0;

  const mealsByDay = new Map<string, { LUNCH?: MealDTO; DINNER?: MealDTO }>();
  for (const meal of plan?.meals ?? []) {
    const dto = mapMeal(meal);
    const entry = mealsByDay.get(dto.dateISO) ?? {};
    entry[dto.period] = dto;
    mealsByDay.set(dto.dateISO, entry);
  }

  return (
    <div className="w-full 2xl:max-w-[1700px]">
      <PageHeader eyebrow="Thực đơn" title="Lịch tuần" />

      <div className="md:mb-5 md:flex md:items-center md:justify-between md:gap-6">
        <WeekSwitcher
          weekStart={weekStart}
          basePath="/week"
          className="md:mb-0 md:w-72"
        />
        <div className="mb-5 flex gap-2 md:mb-0">
          <GenerateWeekButton
            weekStart={weekStart}
            hasPlan={hasPlan}
            className="h-10 flex-1 font-semibold md:flex-none md:px-5"
          />
          <CopyLastWeekButton
            weekStart={weekStart}
            hasPlan={hasPlan}
            className="h-10 flex-1 font-semibold md:flex-none md:px-5"
          />
        </div>
      </div>

      {!hasPlan ? (
        <EmptyState
          icon={<CalendarDays className="size-7" />}
          title="Tuần này chưa có thực đơn"
          description="Random mới hoàn toàn, hoặc copy từ tuần trước rồi chỉnh vài món."
          className="md:max-w-xl"
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 md:gap-4 2xl:grid-cols-7 2xl:gap-3">
          {weekDaysISO(weekStart).map((dayISO, i) => {
            const dayMeals = mealsByDay.get(dayISO);
            const isToday = dayISO === today;
            return (
              <section key={dayISO} className="min-w-0">
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h2 className="font-bold">{DAY_LABELS[i]}</h2>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatDM(dayISO)}
                  </span>
                  {isToday ? (
                    <Badge className="rounded-full px-2 py-0 text-[10.5px]">
                      Hôm nay
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  {dayMeals?.LUNCH ? (
                    <MealCard
                      meal={dayMeals.LUNCH}
                      foods={foodDTOs}
                      members={memberDTOs}
                      variant="compact"
                    />
                  ) : null}
                  {dayMeals?.DINNER ? (
                    <MealCard
                      meal={dayMeals.DINNER}
                      foods={foodDTOs}
                      members={memberDTOs}
                      variant="compact"
                    />
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

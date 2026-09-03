import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getSession } from "@/lib/session";
import { getMembers, getWeekPlan } from "@/lib/queries";
import { mapMeal, mapMember } from "@/lib/dto";
import type { MealDTO } from "@/lib/dto";
import {
  DAY_LABELS,
  normalizeWeekParam,
  todayISO,
  weekDaysISO,
} from "@/lib/week";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DayCard } from "@/components/day-card";
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

  const [plan, members] = await Promise.all([
    getWeekPlan(weekStart),
    getMembers(),
  ]);
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
    <div className="mx-auto w-full max-w-[104rem]">
      <PageHeader
        title="Lịch tuần"
        description="Bảy ngày, mỗi ngày một bữa trưa và một bữa tối. Bấm mũi tên đổi món bất kỳ."
      />

      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <WeekSwitcher weekStart={weekStart} basePath="/week" />
        <div className="flex flex-1 gap-2 sm:flex-none">
          <GenerateWeekButton
            weekStart={weekStart}
            hasPlan={hasPlan}
            className="h-11 flex-1 text-sm font-semibold sm:flex-none sm:px-5 lg:h-11"
          />
          <CopyLastWeekButton
            weekStart={weekStart}
            hasPlan={hasPlan}
            className="h-11 flex-1 text-sm font-semibold sm:flex-none sm:px-5 lg:h-11"
          />
        </div>
      </div>

      {!hasPlan ? (
        <EmptyState
          icon={<CalendarDays />}
          title="Tuần này chưa có thực đơn"
          description="Random một thực đơn mới, hoặc copy tuần trước rồi chỉnh vài món cho khác đi."
        >
          <GenerateWeekButton
            weekStart={weekStart}
            hasPlan={false}
            label="Random thực đơn"
            className="h-11 px-6 text-sm font-semibold"
          />
          <CopyLastWeekButton
            weekStart={weekStart}
            hasPlan={false}
            className="h-11 px-6 text-sm font-semibold"
          />
        </EmptyState>
      ) : (
        <div className="grid auto-rows-fr items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-7">
          {weekDaysISO(weekStart).map((dayISO, i) => {
            const dayMeals = mealsByDay.get(dayISO);
            return (
              <DayCard
                key={dayISO}
                weekdayLabel={DAY_LABELS[i]}
                dayNumber={dayISO.slice(8, 10)}
                isToday={dayISO === today}
                lunch={dayMeals?.LUNCH}
                dinner={dayMeals?.DINNER}
                members={memberDTOs}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

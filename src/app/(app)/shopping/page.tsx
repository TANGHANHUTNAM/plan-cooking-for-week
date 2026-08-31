import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getWeekPlan, type WeekPlan } from "@/lib/queries";
import type { ShoppingMeal } from "@/lib/shopping";
import {
  addDaysISO,
  dateToISO,
  normalizeWeekParam,
  todayISO,
  weekStartISO,
} from "@/lib/week";
import { PageHeader } from "@/components/page-header";
import { WeekSwitcher } from "@/components/week-switcher";
import { ShoppingScreen } from "@/components/shopping-screen";

export const metadata: Metadata = { title: "Đi chợ" };

function toShoppingMeals(plan: WeekPlan | null): ShoppingMeal[] {
  return (plan?.meals ?? []).map((meal) => ({
    dateISO: dateToISO(meal.date),
    period: meal.period,
    note: meal.note,
    dishes: meal.items.map((item) => ({
      name: item.food.name,
      ingredients: item.food.ingredients.map((i) => i.name),
    })),
  }));
}

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { w } = await searchParams;
  const weekStart = normalizeWeekParam(w);
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const isCurrentWeek = weekStart === weekStartISO(today);
  const tomorrowWeek = weekStartISO(tomorrow);

  // "Tối nay + trưa mai": Chủ nhật thì trưa mai nằm ở tuần sau -> tải thêm tuần đó
  const [plan, nextWeekPlan] = await Promise.all([
    getWeekPlan(weekStart),
    isCurrentWeek && tomorrowWeek !== weekStart
      ? getWeekPlan(tomorrowWeek)
      : Promise.resolve(null),
  ]);

  const meals = [...toShoppingMeals(plan), ...toShoppingMeals(nextWeekPlan)];

  return (
    <div className="w-full lg:max-w-4xl">
      <PageHeader eyebrow="Cần mua gì" title="Đi chợ" />
      <WeekSwitcher
        weekStart={weekStart}
        basePath="/shopping"
        className="md:max-w-sm"
      />
      <ShoppingScreen
        meals={meals}
        weekStart={weekStart}
        today={today}
        tomorrow={tomorrow}
        isCurrentWeek={isCurrentWeek}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getShoppingState, getWeekPlan, type WeekPlan } from "@/lib/queries";
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
    // main dishes first, side dishes second — match the meal-card order
    dishes: meal.items
      .map((item) => ({
        name: item.food.name,
        position: item.position,
        ingredients: item.food.ingredients.map((i) => i.name),
      }))
      .sort((a, b) =>
        a.position === b.position ? 0 : a.position === "MAIN" ? -1 : 1
      ),
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
  const weekEnd = addDaysISO(weekStart, 6);

  // "Tonight + tomorrow lunch": on Sunday, tomorrow lunch is in the next week -> load that week too
  const extraEnd =
    isCurrentWeek && tomorrowWeek !== weekStart ? tomorrow : weekEnd;
  const [plan, nextWeekPlan, shoppingState] = await Promise.all([
    getWeekPlan(weekStart),
    isCurrentWeek && tomorrowWeek !== weekStart
      ? getWeekPlan(tomorrowWeek)
      : Promise.resolve(null),
    getShoppingState(weekStart, extraEnd),
  ]);

  const meals = [...toShoppingMeals(plan), ...toShoppingMeals(nextWeekPlan)];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Đi chợ"
        description="Nguyên liệu gom sẵn theo bữa. Tick từng món khi đã mua."
        actions={<WeekSwitcher weekStart={weekStart} basePath="/shopping" />}
        className="flex-col sm:flex-row"
      />
      <ShoppingScreen
        key={weekStart}
        meals={meals}
        weekStart={weekStart}
        today={today}
        tomorrow={tomorrow}
        isCurrentWeek={isCurrentWeek}
        checkedIngredientKeys={shoppingState.ingredientKeys}
        extras={shoppingState.extras}
      />
    </div>
  );
}

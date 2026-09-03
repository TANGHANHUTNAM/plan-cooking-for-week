// Aggregations behind the Thống kê page.
// Pure functions over plain rows, so every number on the page can be unit-tested
// without a database. The page passes the result straight to the chart components.

import { normalizeIngredientKey } from "@/lib/shopping";
import { dateToISO, formatDM, weekdayIndex, weekRangeLabel } from "@/lib/week";

export interface AnalyticsFood {
  name: string;
  type: "MAIN" | "SIDE";
  cookingMethod: string;
  favoriteScore: number;
  ingredients: { name: string }[];
  statistic: { totalCooked: number; lastCookedAt: Date | null } | null;
}

export interface AnalyticsMeal {
  date: Date;
  period: "LUNCH" | "DINNER";
  cookedAt: Date | null;
  note: string | null;
  weekStart: Date;
  items: { position: "MAIN" | "SIDE"; food: { cookingMethod: string } }[];
  absences: { userId: string }[];
}

export interface AnalyticsMember {
  id: string;
  name: string;
}

/** One bar in a chart: a label the reader recognizes plus the number it encodes. */
export interface Slice {
  label: string;
  value: number;
}

const byVietnameseName = (a: string, b: string) =>
  a.localeCompare(b, "vi", { sensitivity: "base" });

/** Biggest first; ties keep a stable Vietnamese-collated order. */
function sortSlices(slices: Slice[]): Slice[] {
  return slices.sort(
    (a, b) => b.value - a.value || byVietnameseName(a.label, b.label)
  );
}

function tally<T>(rows: T[], key: (row: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = key(row);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return counts;
}

const cookedTimes = (food: AnalyticsFood) => food.statistic?.totalCooked ?? 0;

export interface AnalyticsSummary {
  foods: number;
  mains: number;
  sides: number;
  plannedMeals: number;
  cookedMeals: number;
  /** Share of planned meals already marked cooked, 0–100. */
  cookedRate: number;
  weeks: number;
  neverCooked: number;
  cookedTimes: number;
  distinctIngredients: number;
  mealsWithNote: number;
}

export function summarize(
  foods: AnalyticsFood[],
  meals: AnalyticsMeal[]
): AnalyticsSummary {
  const cookedMeals = meals.filter((meal) => meal.cookedAt !== null).length;
  const ingredientKeys = new Set(
    foods.flatMap((food) =>
      food.ingredients
        .map((ingredient) => normalizeIngredientKey(ingredient.name))
        .filter((key) => key.length > 0)
    )
  );

  return {
    foods: foods.length,
    mains: foods.filter((food) => food.type === "MAIN").length,
    sides: foods.filter((food) => food.type === "SIDE").length,
    plannedMeals: meals.length,
    cookedMeals,
    cookedRate: meals.length
      ? Math.round((cookedMeals / meals.length) * 100)
      : 0,
    weeks: new Set(meals.map((meal) => dateToISO(meal.weekStart))).size,
    neverCooked: foods.filter((food) => cookedTimes(food) === 0).length,
    cookedTimes: foods.reduce((total, food) => total + cookedTimes(food), 0),
    distinctIngredients: ingredientKeys.size,
    mealsWithNote: meals.filter((meal) => meal.note).length,
  };
}

/** How the saved dishes split across cooking methods — magnitude, biggest first. */
export function methodDistribution(foods: AnalyticsFood[]): Slice[] {
  return sortSlices(
    [...tally(foods, (food) => food.cookingMethod)].map(([label, value]) => ({
      label,
      value,
    }))
  );
}

/** Every star bucket 0–5 is present, so the axis shows the whole scale. */
export function ratingDistribution(foods: AnalyticsFood[]): Slice[] {
  const counts = tally(foods, (food) => String(food.favoriteScore));
  return Array.from({ length: 6 }, (_, stars) => ({
    label: `${stars}★`,
    value: counts.get(String(stars)) ?? 0,
  }));
}

/** Dishes the family actually cooks most often (dishes never cooked are left out). */
export function topCookedFoods(foods: AnalyticsFood[], limit = 8): Slice[] {
  return sortSlices(
    foods
      .filter((food) => cookedTimes(food) > 0)
      .map((food) => ({ label: food.name, value: cookedTimes(food) }))
  ).slice(0, limit);
}

/**
 * Ingredients that appear in the most dishes — the shopping basket's backbone.
 * Keys are normalized the same way the shopping list ticks them, so "Tỏi" and
 * "tỏi" count once; the first spelling seen is displayed.
 */
export function topIngredients(foods: AnalyticsFood[], limit = 8): Slice[] {
  const counts = new Map<string, { label: string; value: number }>();
  for (const food of foods) {
    // one dish counts once per ingredient even if it lists it twice
    const seen = new Set<string>();
    for (const ingredient of food.ingredients) {
      const key = normalizeIngredientKey(ingredient.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const entry = counts.get(key);
      if (entry) entry.value += 1;
      else counts.set(key, { label: ingredient.name.trim(), value: 1 });
    }
  }
  return sortSlices([...counts.values()]).slice(0, limit);
}

export interface HeatCell {
  dayIndex: number;
  period: "LUNCH" | "DINNER";
  planned: number;
  cooked: number;
}

export interface CookingHeatmap {
  cells: HeatCell[];
  /** Highest cooked count in the grid — the top of the colour ramp. */
  max: number;
}

/** Cooked meals per weekday × meal, the grid the calendar is shaped like. */
export function cookingHeatmap(meals: AnalyticsMeal[]): CookingHeatmap {
  const cells: HeatCell[] = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    for (const period of ["LUNCH", "DINNER"] as const) {
      const slot = meals.filter(
        (meal) =>
          weekdayIndex(dateToISO(meal.date)) === dayIndex &&
          meal.period === period
      );
      cells.push({
        dayIndex,
        period,
        planned: slot.length,
        cooked: slot.filter((meal) => meal.cookedAt !== null).length,
      });
    }
  }
  return {
    cells,
    max: cells.reduce((max, cell) => Math.max(max, cell.cooked), 0),
  };
}

export interface WeekProgress {
  weekStartISO: string;
  label: string;
  /** Just the Monday ("31/08") — the axis tick, where the full range will not fit. */
  shortLabel: string;
  cooked: number;
  /** Planned but not cooked — the two stack to the week's planned total. */
  remaining: number;
}

/** Cooked vs still-planned per week, oldest first, capped to the recent weeks. */
export function weeklyProgress(
  meals: AnalyticsMeal[],
  limit = 8
): WeekProgress[] {
  const weeks = new Map<string, { cooked: number; total: number }>();
  for (const meal of meals) {
    const key = dateToISO(meal.weekStart);
    const entry = weeks.get(key) ?? { cooked: 0, total: 0 };
    entry.total += 1;
    if (meal.cookedAt) entry.cooked += 1;
    weeks.set(key, entry);
  }
  return [...weeks.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-limit)
    .map(([weekStartISO, { cooked, total }]) => ({
      weekStartISO,
      label: weekRangeLabel(weekStartISO),
      shortLabel: formatDM(weekStartISO),
      cooked,
      remaining: total - cooked,
    }));
}

/** Skipped meals per member — everyone is listed, including the never-absent. */
export function absenceByMember(
  meals: AnalyticsMeal[],
  members: AnalyticsMember[]
): Slice[] {
  const counts = tally(
    meals.flatMap((meal) => meal.absences),
    (absence) => absence.userId
  );
  return sortSlices(
    members.map((member) => ({
      label: member.name,
      value: counts.get(member.id) ?? 0,
    }))
  );
}

/** Which cooking methods the planned menus actually lean on. */
export function plannedMethodMix(meals: AnalyticsMeal[]): Slice[] {
  return sortSlices(
    [
      ...tally(
        meals.flatMap((meal) => meal.items),
        (item) => item.food.cookingMethod
      ),
    ].map(([label, value]) => ({ label, value }))
  );
}

export interface StaleFood {
  name: string;
  type: "MAIN" | "SIDE";
  favoriteScore: number;
  /** Days since the dish was last cooked; null means it has never been cooked. */
  days: number | null;
}

const DAY_MS = 86_400_000;

/**
 * Dishes worth putting back on the menu: never cooked first (highest rated first,
 * they were saved for a reason), then whatever has waited longest.
 */
export function staleFoods(
  foods: AnalyticsFood[],
  now: Date,
  limit = 6
): StaleFood[] {
  const rows = foods.map((food) => ({
    name: food.name,
    type: food.type,
    favoriteScore: food.favoriteScore,
    days:
      cookedTimes(food) > 0 && food.statistic?.lastCookedAt
        ? Math.max(
            0,
            Math.floor(
              (now.getTime() - food.statistic.lastCookedAt.getTime()) / DAY_MS
            )
          )
        : null,
  }));

  const never = rows
    .filter((row) => row.days === null)
    .sort(
      (a, b) =>
        b.favoriteScore - a.favoriteScore || byVietnameseName(a.name, b.name)
    );
  const waited = rows
    .filter((row) => row.days !== null)
    .sort(
      (a, b) =>
        (b.days ?? 0) - (a.days ?? 0) || byVietnameseName(a.name, b.name)
    );

  return [...never, ...waited].slice(0, limit);
}

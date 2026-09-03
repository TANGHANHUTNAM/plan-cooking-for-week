// Serializing and reading week-plan snapshots.
// Pure helpers so the stored shape can be tested away from Prisma — the `data` column
// of plan_snapshots only ever holds what serializePlanSnapshot() produced.

import { APP_TZ, dateToISO } from "@/lib/week";

/** Bump when the stored shape changes; older rows are still read best-effort. */
export const PLAN_SNAPSHOT_VERSION = 1;

/** How many snapshots to keep per week — older ones are pruned after each save. */
export const PLAN_SNAPSHOT_KEEP = 12;

/** Why the plan was replaced — the label of one history entry. */
export type PlanSnapshotReason = "RANDOM_WEEK" | "COPY_LAST_WEEK" | "RESTORE";

const REASON_LABELS: Record<PlanSnapshotReason, string> = {
  RANDOM_WEEK: "Trước khi random tuần",
  COPY_LAST_WEEK: "Trước khi copy tuần trước",
  RESTORE: "Trước khi khôi phục",
};

export function snapshotReasonLabel(reason: PlanSnapshotReason): string {
  return REASON_LABELS[reason] ?? "Bản lưu tự động";
}

// Object types (not interfaces) so the payload is assignable to Prisma's Json input.
export type SnapshotDish = {
  foodId: string;
  /** Name at snapshot time — history stays readable after a food is renamed or deleted. */
  name: string;
  position: "MAIN" | "SIDE";
};

export type SnapshotMeal = {
  dateISO: string;
  period: "LUNCH" | "DINNER";
  cookedAtISO: string | null;
  note: string | null;
  absentUserIds: string[];
  dishes: SnapshotDish[];
};

export type PlanSnapshotData = {
  version: number;
  meals: SnapshotMeal[];
};

/** The meal rows a snapshot is built from — matches the Prisma select in savePlanSnapshot. */
export interface SnapshotSourceMeal {
  date: Date;
  period: "LUNCH" | "DINNER";
  cookedAt: Date | null;
  note: string | null;
  absences: { userId: string }[];
  items: {
    foodId: string;
    position: "MAIN" | "SIDE";
    food: { name: string };
  }[];
}

/** Freeze the current plan of a week into the JSON stored in plan_snapshots.data. */
export function serializePlanSnapshot(
  meals: SnapshotSourceMeal[]
): PlanSnapshotData {
  return {
    version: PLAN_SNAPSHOT_VERSION,
    meals: meals.map((meal) => ({
      dateISO: dateToISO(meal.date),
      period: meal.period,
      cookedAtISO: meal.cookedAt ? meal.cookedAt.toISOString() : null,
      note: meal.note,
      absentUserIds: meal.absences.map((a) => a.userId),
      dishes: meal.items.map((item) => ({
        foodId: item.foodId,
        name: item.food.name,
        position: item.position,
      })),
    })),
  };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDish(value: unknown): SnapshotDish | null {
  if (!isRecord(value)) return null;
  const { foodId, name, position } = value;
  if (typeof foodId !== "string" || !foodId) return null;
  if (position !== "MAIN" && position !== "SIDE") return null;
  return {
    foodId,
    name: typeof name === "string" ? name : "Món đã xóa",
    position,
  };
}

function parseMeal(value: unknown): SnapshotMeal | null {
  if (!isRecord(value)) return null;
  const { dateISO, period, cookedAtISO, note, absentUserIds, dishes } = value;
  if (typeof dateISO !== "string" || !ISO_DATE_RE.test(dateISO)) return null;
  if (period !== "LUNCH" && period !== "DINNER") return null;
  return {
    dateISO,
    period,
    cookedAtISO: typeof cookedAtISO === "string" ? cookedAtISO : null,
    note: typeof note === "string" ? note : null,
    absentUserIds: Array.isArray(absentUserIds)
      ? absentUserIds.filter((id): id is string => typeof id === "string")
      : [],
    dishes: Array.isArray(dishes)
      ? dishes.map(parseDish).filter((d): d is SnapshotDish => d !== null)
      : [],
  };
}

/**
 * Read back a snapshot payload. The column is untyped JSON, so anything unreadable is
 * dropped instead of crashing the history screen; null means nothing usable was found.
 */
export function parsePlanSnapshotData(value: unknown): PlanSnapshotData | null {
  if (!isRecord(value)) return null;
  const rawMeals = value.meals;
  if (!Array.isArray(rawMeals)) return null;
  const meals = rawMeals
    .map(parseMeal)
    .filter((m): m is SnapshotMeal => m !== null);
  if (meals.length === 0) return null;
  return {
    version: typeof value.version === "number" ? value.version : 0,
    meals: sortSnapshotMeals(meals),
  };
}

/** Chronological order, lunch before dinner — the same order the calendar renders. */
export function sortSnapshotMeals(meals: SnapshotMeal[]): SnapshotMeal[] {
  const periodRank = { LUNCH: 0, DINNER: 1 } as const;
  return [...meals].sort(
    (a, b) =>
      a.dateISO.localeCompare(b.dateISO) ||
      periodRank[a.period] - periodRank[b.period]
  );
}

export interface SnapshotDay {
  dateISO: string;
  meals: SnapshotMeal[];
}

/** Group a snapshot by day for the history list (one block per day, like the calendar). */
export function groupSnapshotByDay(meals: SnapshotMeal[]): SnapshotDay[] {
  const days: SnapshotDay[] = [];
  for (const meal of sortSnapshotMeals(meals)) {
    const last = days[days.length - 1];
    if (last && last.dateISO === meal.dateISO) last.meals.push(meal);
    else days.push({ dateISO: meal.dateISO, meals: [meal] });
  }
  return days;
}

const snapshotTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: APP_TZ,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** "31/08 20:15" in Vietnam time — when the snapshot was taken. */
export function formatSnapshotTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = snapshotTimeFormat.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")} ${get("hour")}:${get("minute")}`;
}

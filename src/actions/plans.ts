"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { SwapFoodDTO } from "@/lib/dto";
import {
  groupSnapshotByDay,
  parsePlanSnapshotData,
  PLAN_SNAPSHOT_KEEP,
  serializePlanSnapshot,
  type PlanSnapshotData,
  type PlanSnapshotReason,
  type SnapshotDay,
} from "@/lib/plan-history";
import { getSession, type SessionPayload } from "@/lib/session";
import {
  generateWeekAssignments,
  pickFood,
  suggestFoods,
  type CandidateFood,
} from "@/lib/random-engine";
import {
  addDaysISO,
  dateToISO,
  isoToDate,
  normalizeWeekParam,
} from "@/lib/week";

export interface PlanActionResult {
  error?: string;
}

/** A write that replaces a whole week — the snapshot it saved backs the "Hoàn tác" toast. */
export interface PlanWriteResult extends PlanActionResult {
  snapshotId?: string;
}

async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");
  return session;
}

async function loadCandidates(): Promise<CandidateFood[]> {
  const foods = await prisma.food.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      favoriteScore: true,
      statistic: { select: { totalCooked: true, lastCookedAt: true } },
    },
  });
  return foods.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    favoriteScore: f.favoriteScore,
    totalCooked: f.statistic?.totalCooked ?? 0,
    lastCookedAt: f.statistic?.lastCookedAt ?? null,
  }));
}

/**
 * Freeze the current plan of a week. Read outside the destructive transaction to keep it
 * short — the remote DB is slow — and returns null when the week has nothing to lose.
 */
async function collectPlanSnapshot(
  weekStart: string
): Promise<{ mealCount: number; data: PlanSnapshotData } | null> {
  const meals = await prisma.meal.findMany({
    where: { mealPlan: { weekStart: isoToDate(weekStart) } },
    orderBy: [{ date: "asc" }, { period: "asc" }],
    select: {
      date: true,
      period: true,
      cookedAt: true,
      note: true,
      absences: { select: { userId: true } },
      items: {
        select: {
          foodId: true,
          position: true,
          food: { select: { name: true } },
        },
      },
    },
  });
  if (meals.length === 0) return null;
  return { mealCount: meals.length, data: serializePlanSnapshot(meals) };
}

/** Keep only the newest entries per week — this is an undo history, not an archive. */
async function prunePlanSnapshots(weekStart: string): Promise<void> {
  try {
    const stale = await prisma.planSnapshot.findMany({
      where: { weekStart: isoToDate(weekStart) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: PLAN_SNAPSHOT_KEEP,
      select: { id: true },
    });
    if (stale.length === 0) return;
    await prisma.planSnapshot.deleteMany({
      where: { id: { in: stale.map((row) => row.id) } },
    });
  } catch {
    // housekeeping only — a failed prune must not fail the write that just succeeded
  }
}

/** The plan snapshot row written inside a destructive transaction. */
function snapshotCreateData(
  weekStart: string,
  reason: PlanSnapshotReason,
  snapshot: { mealCount: number; data: PlanSnapshotData }
) {
  return {
    weekStart: isoToDate(weekStart),
    reason,
    mealCount: snapshot.mealCount,
    data: snapshot.data as Prisma.InputJsonValue,
  };
}

/** The manual swap picker gets only the fields it renders, and only on demand. */
export async function loadSwapFoods(): Promise<{
  error?: string;
  foods?: SwapFoodDTO[];
}> {
  await requireSession();
  try {
    const foods = await prisma.food.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        cookingMethod: true,
        favoriteScore: true,
        statistic: { select: { totalCooked: true } },
      },
    });
    return {
      foods: foods.map((food) => ({
        id: food.id,
        name: food.name,
        type: food.type,
        cookingMethod: food.cookingMethod,
        favoriteScore: food.favoriteScore,
        totalCooked: food.statistic?.totalCooked ?? 0,
      })),
    };
  } catch {
    return {
      error: "Không tải được danh sách món — kiểm tra mạng rồi thử lại nhé",
    };
  }
}

/** Randomize the entire week (overwrites the existing plan, saving it to history first). */
export async function generateWeek(
  weekStart: string
): Promise<PlanWriteResult> {
  await requireSession();
  const ws = normalizeWeekParam(weekStart);

  const all = await loadCandidates();
  const mains = all.filter((f) => f.type === "MAIN");
  const sides = all.filter((f) => f.type === "SIDE");
  if (mains.length === 0) {
    return { error: "Cần ít nhất 1 món chính để random thực đơn" };
  }

  const assignments = generateWeekAssignments(mains, sides, {
    now: new Date(),
  });
  // the plan about to be replaced, so a mis-tapped random can be undone
  const previous = await collectPlanSnapshot(ws);

  let snapshotId: string | null = null;
  try {
    // minimize round trips — the remote Supabase DB can exceed the transaction timeout
    snapshotId = await prisma.$transaction(
      async (tx) => {
        const saved = previous
          ? await tx.planSnapshot.create({
              data: snapshotCreateData(ws, "RANDOM_WEEK", previous),
              select: { id: true },
            })
          : null;
        const plan = await tx.mealPlan.upsert({
          where: { weekStart: isoToDate(ws) }, // shared household plan, unique per week
          update: {},
          create: { weekStart: isoToDate(ws) },
        });
        await tx.meal.deleteMany({ where: { mealPlanId: plan.id } });

        const meals = await tx.meal.createManyAndReturn({
          data: assignments.map((a) => ({
            mealPlanId: plan.id,
            date: isoToDate(addDaysISO(ws, a.dayIndex)),
            period: a.period,
          })),
          select: { id: true, date: true, period: true },
        });
        const mealIdByKey = new Map(
          meals.map((m) => [`${dateToISO(m.date)}|${m.period}`, m.id])
        );

        await tx.mealItem.createMany({
          data: assignments.flatMap((a) => {
            const mealId = mealIdByKey.get(
              `${addDaysISO(ws, a.dayIndex)}|${a.period}`
            );
            if (!mealId) return [];
            const rows: {
              mealId: string;
              foodId: string;
              position: "MAIN" | "SIDE";
            }[] = [{ mealId, foodId: a.mainId, position: "MAIN" }];
            if (a.sideId) {
              rows.push({ mealId, foodId: a.sideId, position: "SIDE" });
            }
            return rows;
          }),
        });
        return saved?.id ?? null;
      },
      { timeout: 20000 }
    );
  } catch {
    return { error: "Không lưu được thực đơn — kiểm tra mạng rồi thử lại nhé" };
  }

  await prunePlanSnapshots(ws);
  revalidatePath("/", "layout");
  return snapshotId ? { snapshotId } : {};
}

/** Copy the previous week's entire plan to this week (reset cooked state, save history first). */
export async function copyLastWeek(
  weekStart: string
): Promise<PlanWriteResult> {
  await requireSession();
  const ws = normalizeWeekParam(weekStart);
  const prevWs = addDaysISO(ws, -7);

  const prevPlan = await prisma.mealPlan.findUnique({
    where: { weekStart: isoToDate(prevWs) },
    include: { meals: { include: { items: true } } },
  });
  if (!prevPlan || prevPlan.meals.length === 0) {
    return { error: "Tuần trước chưa có thực đơn để copy" };
  }

  const previous = await collectPlanSnapshot(ws);

  let snapshotId: string | null = null;
  try {
    snapshotId = await prisma.$transaction(
      async (tx) => {
        const saved = previous
          ? await tx.planSnapshot.create({
              data: snapshotCreateData(ws, "COPY_LAST_WEEK", previous),
              select: { id: true },
            })
          : null;
        const plan = await tx.mealPlan.upsert({
          where: { weekStart: isoToDate(ws) },
          update: {},
          create: { weekStart: isoToDate(ws) },
        });
        await tx.meal.deleteMany({ where: { mealPlanId: plan.id } });

        const shiftISO = (d: Date) => addDaysISO(dateToISO(d), 7);
        const meals = await tx.meal.createManyAndReturn({
          data: prevPlan.meals.map((m) => ({
            mealPlanId: plan.id,
            date: isoToDate(shiftISO(m.date)),
            period: m.period,
          })),
          select: { id: true, date: true, period: true },
        });
        const mealIdByKey = new Map(
          meals.map((m) => [`${dateToISO(m.date)}|${m.period}`, m.id])
        );

        await tx.mealItem.createMany({
          data: prevPlan.meals.flatMap((m) => {
            const mealId = mealIdByKey.get(`${shiftISO(m.date)}|${m.period}`);
            if (!mealId) return [];
            return m.items.map((it) => ({
              mealId,
              foodId: it.foodId,
              position: it.position,
            }));
          }),
        });
        return saved?.id ?? null;
      },
      { timeout: 20000 }
    );
  } catch {
    return { error: "Không copy được — kiểm tra mạng rồi thử lại nhé" };
  }

  await prunePlanSnapshots(ws);
  revalidatePath("/", "layout");
  return snapshotId ? { snapshotId } : {};
}

export interface PlanSnapshotDTO {
  id: string;
  createdAtISO: string;
  reason: PlanSnapshotReason;
  mealCount: number;
  /** Meals grouped by day, in calendar order — what the history sheet renders. */
  days: SnapshotDay[];
}

/** Saved versions of one week's plan, newest first. */
export async function loadPlanHistory(
  weekStart: string
): Promise<{ error?: string; snapshots?: PlanSnapshotDTO[] }> {
  await requireSession();
  const ws = normalizeWeekParam(weekStart);

  try {
    const rows = await prisma.planSnapshot.findMany({
      where: { weekStart: isoToDate(ws) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PLAN_SNAPSHOT_KEEP,
      select: {
        id: true,
        createdAt: true,
        reason: true,
        mealCount: true,
        data: true,
      },
    });
    return {
      snapshots: rows.flatMap((row) => {
        const data = parsePlanSnapshotData(row.data);
        if (!data) return []; // unreadable row: hide it rather than break the list
        return [
          {
            id: row.id,
            createdAtISO: row.createdAt.toISOString(),
            reason: row.reason,
            mealCount: row.mealCount,
            days: groupSnapshotByDay(data.meals),
          },
        ];
      }),
    };
  } catch {
    return {
      error: "Không tải được lịch sử thực đơn — kiểm tra mạng rồi thử lại nhé",
    };
  }
}

export interface RestorePlanResult extends PlanActionResult {
  restoredMeals?: number;
  /** Dishes dropped because their food was deleted after the snapshot was taken. */
  skippedDishes?: number;
}

/** Put a saved version back, replacing the week's current plan (itself saved to history first). */
export async function restorePlanSnapshot(
  snapshotId: string
): Promise<RestorePlanResult> {
  await requireSession();

  const row = await prisma.planSnapshot.findUnique({
    where: { id: snapshotId },
    select: { weekStart: true, data: true },
  });
  if (!row) return { error: "Bản lưu này không còn nữa" };
  const data = parsePlanSnapshotData(row.data);
  if (!data) return { error: "Bản lưu bị lỗi nên không khôi phục được" };
  const ws = dateToISO(row.weekStart); // always restores into its own week

  // foods and members may have been deleted since the snapshot — drop what no longer exists
  const foodIds = [
    ...new Set(data.meals.flatMap((m) => m.dishes.map((d) => d.foodId))),
  ];
  const userIds = [...new Set(data.meals.flatMap((m) => m.absentUserIds))];
  const [foods, users] = await Promise.all([
    foodIds.length
      ? prisma.food.findMany({
          where: { id: { in: foodIds } },
          select: { id: true },
        })
      : [],
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true },
        })
      : [],
  ]);
  const liveFoodIds = new Set(foods.map((f) => f.id));
  const liveUserIds = new Set(users.map((u) => u.id));

  const meals = data.meals.map((meal) => ({
    ...meal,
    dishes: meal.dishes.filter((d) => liveFoodIds.has(d.foodId)),
    absentUserIds: meal.absentUserIds.filter((id) => liveUserIds.has(id)),
  }));
  const countDishes = (list: { dishes: unknown[] }[]) =>
    list.reduce((total, meal) => total + meal.dishes.length, 0);
  const skippedDishes = countDishes(data.meals) - countDishes(meals);

  const previous = await collectPlanSnapshot(ws);

  try {
    await prisma.$transaction(
      async (tx) => {
        if (previous) {
          await tx.planSnapshot.create({
            data: snapshotCreateData(ws, "RESTORE", previous),
          });
        }
        const plan = await tx.mealPlan.upsert({
          where: { weekStart: isoToDate(ws) },
          update: {},
          create: { weekStart: isoToDate(ws) },
        });
        await tx.meal.deleteMany({ where: { mealPlanId: plan.id } });

        const created = await tx.meal.createManyAndReturn({
          data: meals.map((m) => ({
            mealPlanId: plan.id,
            date: isoToDate(m.dateISO),
            period: m.period,
            // cooked state comes back as it was: FoodStatistic is never decremented when a
            // plan is wiped, so restoring the meals keeps the totals consistent
            cookedAt: m.cookedAtISO ? new Date(m.cookedAtISO) : null,
            note: m.note,
          })),
          select: { id: true, date: true, period: true },
        });
        const mealIdByKey = new Map(
          created.map((m) => [`${dateToISO(m.date)}|${m.period}`, m.id])
        );

        await tx.mealItem.createMany({
          data: meals.flatMap((m) => {
            const mealId = mealIdByKey.get(`${m.dateISO}|${m.period}`);
            if (!mealId) return [];
            return m.dishes.map((d) => ({
              mealId,
              foodId: d.foodId,
              position: d.position,
            }));
          }),
        });
        await tx.mealAbsence.createMany({
          data: meals.flatMap((m) => {
            const mealId = mealIdByKey.get(`${m.dateISO}|${m.period}`);
            if (!mealId) return [];
            return m.absentUserIds.map((userId) => ({ mealId, userId }));
          }),
        });
      },
      { timeout: 20000 }
    );
  } catch {
    return { error: "Không khôi phục được — kiểm tra mạng rồi thử lại nhé" };
  }

  await prunePlanSnapshots(ws);
  revalidatePath("/", "layout");
  return { restoredMeals: meals.length, skippedDishes };
}

/** Context for one meal item: foods used this week and foods on the same day (excluding itself). */
async function loadItemContext(mealItemId: string) {
  const item = await prisma.mealItem.findUnique({
    where: { id: mealItemId },
    include: {
      meal: {
        include: {
          mealPlan: { include: { meals: { include: { items: true } } } },
        },
      },
    },
  });
  if (!item) return null;
  const used = new Set<string>();
  const sameDay = new Set<string>();
  const itemDate = dateToISO(item.meal.date);
  for (const meal of item.meal.mealPlan.meals) {
    const isSameDay = dateToISO(meal.date) === itemDate;
    for (const it of meal.items) {
      if (it.id === item.id) continue;
      used.add(it.foodId);
      if (isSameDay) sameDay.add(it.foodId);
    }
  }
  return { item, used, sameDay };
}

/** Replace one food with a smart random choice. */
export async function swapItemRandom(
  mealItemId: string
): Promise<PlanActionResult> {
  await requireSession();
  const ctx = await loadItemContext(mealItemId);
  if (!ctx) return { error: "Không tìm thấy món trong lịch" };

  const pool = (await loadCandidates()).filter(
    (f) => f.type === ctx.item.position
  );
  // absolute exclusions: the current food and foods on the same day (even when the pool must be relaxed)
  const avoid = new Set(ctx.sameDay);
  avoid.add(ctx.item.foodId);

  const picked = pickFood(pool, {
    usedIds: ctx.used,
    avoidIds: avoid,
    now: new Date(),
  });
  if (!picked) {
    return { error: "Không còn món khác phù hợp để đổi — thêm món mới nhé" };
  }

  await prisma.mealItem.update({
    where: { id: mealItemId },
    data: { foodId: picked.id },
  });
  revalidatePath("/", "layout");
  return {};
}

/** Manually choose a food for one meal position. */
export async function setItemFood(
  mealItemId: string,
  foodId: string
): Promise<PlanActionResult> {
  await requireSession();
  const [item, food] = await Promise.all([
    prisma.mealItem.findUnique({ where: { id: mealItemId } }),
    prisma.food.findUnique({ where: { id: foodId } }),
  ]);
  if (!item || !food) return { error: "Không tìm thấy món" };
  if (food.type !== item.position) {
    return { error: "Món không đúng loại (chính/phụ) cho vị trí này" };
  }

  await prisma.mealItem.update({
    where: { id: mealItemId },
    data: { foodId },
  });
  revalidatePath("/", "layout");
  return {};
}

export interface SuggestionDTO {
  id: string;
  name: string;
  cookingMethod: string;
  favoriteScore: number;
  totalCooked: number;
}

/** Top 5 suggestions by score (fixed rng for stability); when the pool is exhausted, relax constraints but still avoid foods from the same day. */
async function topSuggestionDTOs(
  pool: CandidateFood[],
  used: ReadonlySet<string>,
  sameDay: ReadonlySet<string>,
  excludeFoodId?: string
): Promise<SuggestionDTO[]> {
  const now = new Date();
  const strict = new Set(used);
  if (excludeFoodId) strict.add(excludeFoodId);
  let top = suggestFoods(pool, { usedIds: strict, now, rng: () => 0.5 });
  if (top.length === 0) {
    const relaxed = new Set(sameDay);
    if (excludeFoodId) relaxed.add(excludeFoodId);
    top = suggestFoods(pool, { usedIds: relaxed, now, rng: () => 0.5 });
  }
  const order = top.map((f) => f.id);
  if (order.length === 0) return [];

  const foods = await prisma.food.findMany({
    where: { id: { in: order } },
    select: {
      id: true,
      name: true,
      cookingMethod: true,
      favoriteScore: true,
      statistic: { select: { totalCooked: true } },
    },
  });
  foods.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return foods.map((f) => ({
    id: f.id,
    name: f.name,
    cookingMethod: f.cookingMethod,
    favoriteScore: f.favoriteScore,
    totalCooked: f.statistic?.totalCooked ?? 0,
  }));
}

/** Top 5 suggestions for one position (the "Suggested matches" section in the swap sheet). */
export async function suggestForItem(
  mealItemId: string
): Promise<{ error?: string; suggestions?: SuggestionDTO[] }> {
  await requireSession();
  const ctx = await loadItemContext(mealItemId);
  if (!ctx) return { error: "Không tìm thấy món trong lịch" };

  const pool = (await loadCandidates()).filter(
    (f) => f.type === ctx.item.position
  );
  return {
    suggestions: await topSuggestionDTOs(
      pool,
      ctx.used,
      ctx.sameDay,
      ctx.item.foodId
    ),
  };
}

/** Context for one meal: its own foods, foods used this week, and foods on the same day. */
async function loadSlotContext(mealId: string) {
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    include: {
      items: true,
      mealPlan: { include: { meals: { include: { items: true } } } },
    },
  });
  if (!meal) return null;
  const used = new Set<string>();
  const sameDay = new Set<string>();
  const mealDate = dateToISO(meal.date);
  for (const m of meal.mealPlan.meals) {
    const isSameDay = dateToISO(m.date) === mealDate;
    for (const it of m.items) {
      used.add(it.foodId);
      if (isSameDay) sameDay.add(it.foodId);
    }
  }
  return { meal, used, sameDay };
}

/** Remove the side dish from a meal — every meal must keep its main dish. */
export async function removeSideDish(
  mealItemId: string
): Promise<PlanActionResult> {
  await requireSession();
  const item = await prisma.mealItem.findUnique({
    where: { id: mealItemId },
    select: { id: true, position: true },
  });
  if (!item) return { error: "Không tìm thấy món trong lịch" };
  if (item.position !== "SIDE") {
    return { error: "Bữa nào cũng cần món chính — chỉ bỏ được món phụ" };
  }
  await prisma.mealItem.delete({ where: { id: item.id } });
  revalidatePath("/", "layout");
  return {};
}

type MealItemPosition = "MAIN" | "SIDE";

function isMealItemPosition(value: unknown): value is MealItemPosition {
  return value === "MAIN" || value === "SIDE";
}

function mealItemPositionLabel(position: MealItemPosition): string {
  return position === "MAIN" ? "món chính" : "món phụ";
}

/** Add a food to an empty position — pass foodId for manual selection, otherwise choose smartly at random. */
export async function addMealItem(
  mealId: string,
  position: MealItemPosition,
  foodId?: string
): Promise<PlanActionResult> {
  await requireSession();
  if (!isMealItemPosition(position)) {
    return { error: "Vị trí món không hợp lệ" };
  }

  const ctx = await loadSlotContext(mealId);
  if (!ctx) return { error: "Không tìm thấy bữa ăn" };
  const positionLabel = mealItemPositionLabel(position);
  if (ctx.meal.items.some((it) => it.position === position)) {
    return { error: `Bữa này đã có ${positionLabel} rồi` };
  }

  let pickedId = foodId;
  if (pickedId) {
    const food = await prisma.food.findUnique({ where: { id: pickedId } });
    if (!food) return { error: "Không tìm thấy món" };
    if (food.type !== position) {
      return { error: `Món này không phải ${positionLabel}` };
    }
  } else {
    const pool = (await loadCandidates()).filter((f) => f.type === position);
    const picked = pickFood(pool, {
      usedIds: ctx.used,
      avoidIds: ctx.sameDay,
      now: new Date(),
    });
    if (!picked) {
      return {
        error: `Chưa có ${positionLabel} nào phù hợp — thêm món ở tab Món ăn nhé`,
      };
    }
    pickedId = picked.id;
  }

  try {
    await prisma.mealItem.create({
      data: { mealId, foodId: pickedId, position },
    });
  } catch {
    return { error: `Bữa này đã có ${positionLabel} rồi` };
  }
  revalidatePath("/", "layout");
  return {};
}

/** Compatibility wrapper for existing side-dish add flows. */
export async function addSideDish(
  mealId: string,
  foodId?: string
): Promise<PlanActionResult> {
  return addMealItem(mealId, "SIDE", foodId);
}

/** Top 5 suggestions for an empty position in a meal. */
export async function suggestForMeal(
  mealId: string,
  position: MealItemPosition
): Promise<{ error?: string; suggestions?: SuggestionDTO[] }> {
  await requireSession();
  if (!isMealItemPosition(position)) {
    return { error: "Vị trí món không hợp lệ" };
  }

  const ctx = await loadSlotContext(mealId);
  if (!ctx) return { error: "Không tìm thấy bữa ăn" };
  const pool = (await loadCandidates()).filter((f) => f.type === position);
  return { suggestions: await topSuggestionDTOs(pool, ctx.used, ctx.sameDay) };
}

/** Compatibility wrapper for the existing side-dish suggestion flow. */
export async function suggestSideForMeal(
  mealId: string
): Promise<{ error?: string; suggestions?: SuggestionDTO[] }> {
  return suggestForMeal(mealId, "SIDE");
}

// A "use server" file may export only async functions — keep this constant here,
// the UI (meal-card) uses the matching maxLength=300
const MEAL_NOTE_MAX = 300;

/** Save a note for a meal (e.g. missing fish sauce) — an empty string clears the note. */
export async function setMealNote(
  mealId: string,
  note: string
): Promise<PlanActionResult> {
  await requireSession();
  const trimmed = note.trim();
  if (trimmed.length > MEAL_NOTE_MAX) {
    return { error: `Ghi chú tối đa ${MEAL_NOTE_MAX} ký tự` };
  }
  try {
    await prisma.meal.update({
      where: { id: mealId },
      data: { note: trimmed || null },
    });
  } catch {
    return { error: "Không tìm thấy bữa ăn" };
  }
  revalidatePath("/", "layout");
  return {};
}

/** Toggle whether a member skips a meal (a row means the member is absent). */
export async function toggleMealAbsence(
  mealId: string,
  userId: string
): Promise<PlanActionResult> {
  await requireSession();

  const [meal, user] = await Promise.all([
    prisma.meal.findUnique({ where: { id: mealId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);
  if (!meal || !user) return { error: "Không tìm thấy bữa ăn hoặc thành viên" };

  const existing = await prisma.mealAbsence.findUnique({
    where: { mealId_userId: { mealId, userId } },
  });
  if (existing) {
    await prisma.mealAbsence.delete({ where: { id: existing.id } });
  } else {
    await prisma.mealAbsence.create({ data: { mealId, userId } });
  }

  revalidatePath("/", "layout");
  return {};
}

/** When "cooked" is pressed, record statistics for both foods in the meal. */
export async function markCooked(mealId: string): Promise<PlanActionResult> {
  await requireSession();
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    include: { items: true },
  });
  if (!meal) return { error: "Không tìm thấy bữa ăn" };
  if (meal.cookedAt) return {};

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.meal.update({ where: { id: mealId }, data: { cookedAt: now } });
    for (const it of meal.items) {
      await tx.foodStatistic.upsert({
        where: { foodId: it.foodId },
        update: { totalCooked: { increment: 1 }, lastCookedAt: now },
        create: { foodId: it.foodId, totalCooked: 1, lastCookedAt: now },
      });
    }
  });

  revalidatePath("/", "layout");
  return {};
}

/** Undo "cooked": decrement statistics and recalculate the most recent cook time. */
export async function undoCooked(mealId: string): Promise<PlanActionResult> {
  await requireSession();
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    include: { items: true },
  });
  if (!meal) return { error: "Không tìm thấy bữa ăn" };
  if (!meal.cookedAt) return {};

  await prisma.$transaction(async (tx) => {
    await tx.meal.update({ where: { id: mealId }, data: { cookedAt: null } });
    for (const it of meal.items) {
      await tx.foodStatistic.updateMany({
        where: { foodId: it.foodId, totalCooked: { gt: 0 } },
        data: { totalCooked: { decrement: 1 } },
      });
      const latestOther = await tx.meal.findFirst({
        where: {
          id: { not: mealId },
          cookedAt: { not: null },
          items: { some: { foodId: it.foodId } },
        },
        orderBy: { cookedAt: "desc" },
        select: { cookedAt: true },
      });
      await tx.foodStatistic.updateMany({
        where: { foodId: it.foodId },
        data: { lastCookedAt: latestOther?.cookedAt ?? null },
      });
    }
  });

  revalidatePath("/", "layout");
  return {};
}

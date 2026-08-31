"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionPayload } from "@/lib/session";
import {
  generateWeekAssignments,
  pickFood,
  suggestFoods,
  type CandidateFood,
} from "@/lib/random-engine";
import { addDaysISO, dateToISO, isoToDate, normalizeWeekParam } from "@/lib/week";

export interface PlanActionResult {
  error?: string;
}

async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Chưa đăng nhập");
  return session;
}

async function loadCandidates(): Promise<CandidateFood[]> {
  const foods = await prisma.food.findMany({ include: { statistic: true } });
  return foods.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    favoriteScore: f.favoriteScore,
    totalCooked: f.statistic?.totalCooked ?? 0,
    lastCookedAt: f.statistic?.lastCookedAt ?? null,
  }));
}

/** Random toàn bộ tuần (ghi đè thực đơn hiện có của tuần đó). */
export async function generateWeek(weekStart: string): Promise<PlanActionResult> {
  await requireSession();
  const ws = normalizeWeekParam(weekStart);

  const all = await loadCandidates();
  const mains = all.filter((f) => f.type === "MAIN");
  const sides = all.filter((f) => f.type === "SIDE");
  if (mains.length === 0) {
    return { error: "Cần ít nhất 1 món chính để random thực đơn" };
  }

  const assignments = generateWeekAssignments(mains, sides, { now: new Date() });

  try {
    // gom thành ít round-trip nhất có thể — DB ở xa (Supabase) dễ vượt timeout transaction
    await prisma.$transaction(
      async (tx) => {
        const plan = await tx.mealPlan.upsert({
          where: { weekStart: isoToDate(ws) }, // thực đơn chung cả nhà, unique theo tuần
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
      },
      { timeout: 20000 }
    );
  } catch {
    return { error: "Không lưu được thực đơn — kiểm tra mạng rồi thử lại nhé" };
  }

  revalidatePath("/", "layout");
  return {};
}

/** Copy nguyên thực đơn tuần trước sang tuần này (reset trạng thái đã nấu). */
export async function copyLastWeek(weekStart: string): Promise<PlanActionResult> {
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

  try {
    await prisma.$transaction(
      async (tx) => {
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
      },
      { timeout: 20000 }
    );
  } catch {
    return { error: "Không copy được — kiểm tra mạng rồi thử lại nhé" };
  }

  revalidatePath("/", "layout");
  return {};
}

/** Bối cảnh 1 meal item: món đã dùng trong tuần và món cùng ngày (trừ chính nó). */
async function loadItemContext(mealItemId: string) {
  const item = await prisma.mealItem.findUnique({
    where: { id: mealItemId },
    include: {
      meal: { include: { mealPlan: { include: { meals: { include: { items: true } } } } } },
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

/** Đổi 1 món bằng random thông minh. */
export async function swapItemRandom(
  mealItemId: string
): Promise<PlanActionResult> {
  await requireSession();
  const ctx = await loadItemContext(mealItemId);
  if (!ctx) return { error: "Không tìm thấy món trong lịch" };

  const pool = (await loadCandidates()).filter(
    (f) => f.type === ctx.item.position
  );
  // tránh tuyệt đối: món hiện tại + món cùng ngày (kể cả khi pool cạn phải nới lỏng)
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

/** Chọn món thủ công cho 1 vị trí trong bữa. */
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

/** Top 5 gợi ý theo điểm (rng cố định cho ổn định); pool cạn thì nới lỏng chỉ tránh món cùng ngày. */
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
    include: { statistic: true },
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

/** Top 5 gợi ý phù hợp cho 1 vị trí (mục "Gợi ý phù hợp" trong sheet đổi món). */
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

/** Bối cảnh 1 bữa: món của chính bữa đó, món đã dùng trong tuần và món cùng ngày. */
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

/** Bỏ món phụ khỏi một bữa — bữa nào cũng phải còn món chính. */
export async function removeSideDish(mealItemId: string): Promise<PlanActionResult> {
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

/** Thêm món phụ vào bữa đang trống — có foodId thì chọn tay, không thì random thông minh. */
export async function addSideDish(
  mealId: string,
  foodId?: string
): Promise<PlanActionResult> {
  await requireSession();
  const ctx = await loadSlotContext(mealId);
  if (!ctx) return { error: "Không tìm thấy bữa ăn" };
  if (ctx.meal.items.some((it) => it.position === "SIDE")) {
    return { error: "Bữa này đã có món phụ rồi" };
  }

  let pickedId = foodId;
  if (pickedId) {
    const food = await prisma.food.findUnique({ where: { id: pickedId } });
    if (!food) return { error: "Không tìm thấy món" };
    if (food.type !== "SIDE") return { error: "Món này không phải món phụ" };
  } else {
    const pool = (await loadCandidates()).filter((f) => f.type === "SIDE");
    const picked = pickFood(pool, {
      usedIds: ctx.used,
      avoidIds: ctx.sameDay,
      now: new Date(),
    });
    if (!picked) {
      return { error: "Chưa có món phụ nào phù hợp — thêm món ở tab Món ăn nhé" };
    }
    pickedId = picked.id;
  }

  try {
    await prisma.mealItem.create({
      data: { mealId, foodId: pickedId, position: "SIDE" },
    });
  } catch {
    return { error: "Bữa này đã có món phụ rồi" };
  }
  revalidatePath("/", "layout");
  return {};
}

/** Top 5 món phụ gợi ý cho một bữa đang trống món phụ. */
export async function suggestSideForMeal(
  mealId: string
): Promise<{ error?: string; suggestions?: SuggestionDTO[] }> {
  await requireSession();
  const ctx = await loadSlotContext(mealId);
  if (!ctx) return { error: "Không tìm thấy bữa ăn" };
  const pool = (await loadCandidates()).filter((f) => f.type === "SIDE");
  return { suggestions: await topSuggestionDTOs(pool, ctx.used, ctx.sameDay) };
}

// file "use server" chỉ được export async function — hằng này ở lại đây,
// UI (meal-card) dùng maxLength=300 khớp tay
const MEAL_NOTE_MAX = 300;

/** Lưu ghi chú cho một bữa (vd: thiếu nước mắm) — chuỗi rỗng = xóa ghi chú. */
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

/** Bật/tắt "không ăn" của một thành viên cho một bữa (có dòng = không ăn). */
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

/** Bấm "Đã nấu": ghi nhận thống kê cho cả 2 món trong bữa. */
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

/** Hoàn tác "Đã nấu": trừ thống kê và tính lại lần nấu gần nhất. */
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

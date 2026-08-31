// Bộ chọn món "thông minh" — hàm thuần, không gọi DB, để test được.
// Điểm = 2.0*yêu thích + 1.5*hay ăn (log) + 1.5*lâu chưa ăn + 1.0*ngẫu nhiên,
// sau đó weighted-random trong top 5 để kết quả mỗi lần một khác nhưng vẫn hợp lý.

export type FoodPosition = "MAIN" | "SIDE";

export interface CandidateFood {
  id: string;
  name: string;
  type: FoodPosition;
  favoriteScore: number; // 0..5
  totalCooked: number;
  lastCookedAt: Date | null;
}

export interface PickContext {
  /** id các món đã dùng trong tuần đang xét (quy tắc: không lặp trong tuần) */
  usedIds: ReadonlySet<string>;
  /** món phải tránh tuyệt đối kể cả khi nới lỏng (vd: đã có trong cùng ngày) */
  avoidIds?: ReadonlySet<string>;
  /** số lần mỗi món đã xuất hiện trong tuần — khi nới lỏng sẽ ưu tiên món lặp ít nhất */
  usedCounts?: ReadonlyMap<string, number>;
  now: Date;
  /** để test: thay Math.random */
  rng?: () => number;
}

const W_FAVORITE = 2.0;
const W_FREQUENCY = 1.5;
const W_STALENESS = 1.5;
const W_RANDOM = 1.0;
const STALE_CAP_DAYS = 30;
const TOP_N = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export function scoreFood(
  food: CandidateFood,
  maxCooked: number,
  now: Date,
  rng: () => number
): number {
  const favorite = food.favoriteScore / 5;

  const frequency =
    maxCooked > 0
      ? Math.log(1 + food.totalCooked) / Math.log(1 + maxCooked)
      : 0;

  let staleness = 1; // chưa nấu bao giờ = "lâu nhất"
  if (food.lastCookedAt) {
    const days = Math.max(
      0,
      (now.getTime() - food.lastCookedAt.getTime()) / DAY_MS
    );
    staleness = Math.min(days, STALE_CAP_DAYS) / STALE_CAP_DAYS;
  }

  return (
    W_FAVORITE * favorite +
    W_FREQUENCY * frequency +
    W_STALENESS * staleness +
    W_RANDOM * rng()
  );
}

/** Top `count` món điểm cao nhất (không random-hóa) — dùng cho mục "Gợi ý phù hợp". */
export function suggestFoods(
  pool: CandidateFood[],
  ctx: PickContext,
  count = TOP_N
): CandidateFood[] {
  const rng = ctx.rng ?? Math.random;
  const candidates = pool.filter((f) => !ctx.usedIds.has(f.id));
  const maxCooked = Math.max(0, ...candidates.map((f) => f.totalCooked));
  return candidates
    .map((f) => ({ f, s: scoreFood(f, maxCooked, ctx.now, rng) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map((x) => x.f);
}

/**
 * Chọn 1 món: chấm điểm cả pool (trừ món đã dùng trong tuần), lấy top 5,
 * rồi weighted-random theo điểm trong top đó.
 * Pool cạn (mọi món đều đã dùng) -> nới lỏng: cho phép lặp, ưu tiên món ít lặp.
 */
export function pickFood(
  pool: CandidateFood[],
  ctx: PickContext
): CandidateFood | null {
  if (pool.length === 0) return null;
  const rng = ctx.rng ?? Math.random;

  let candidates = pool.filter(
    (f) => !ctx.usedIds.has(f.id) && !ctx.avoidIds?.has(f.id)
  );
  if (candidates.length === 0) {
    // nới lỏng khi cạn món: cho phép lặp trong tuần nhưng vẫn tránh avoidIds
    // (cùng ngày) và ưu tiên các món có số lần lặp thấp nhất
    let relaxed = pool.filter((f) => !ctx.avoidIds?.has(f.id));
    if (relaxed.length === 0) relaxed = [...pool];
    if (ctx.usedCounts) {
      const counts = ctx.usedCounts;
      const min = Math.min(...relaxed.map((f) => counts.get(f.id) ?? 0));
      relaxed = relaxed.filter((f) => (counts.get(f.id) ?? 0) === min);
    }
    candidates = relaxed;
  }

  const maxCooked = Math.max(0, ...candidates.map((f) => f.totalCooked));
  const scored = candidates
    .map((f) => ({ f, s: scoreFood(f, maxCooked, ctx.now, rng) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, TOP_N);

  const total = scored.reduce((sum, x) => sum + x.s, 0);
  if (total <= 0) return scored[0].f;

  let roll = rng() * total;
  for (const x of scored) {
    roll -= x.s;
    if (roll <= 0) return x.f;
  }
  return scored[scored.length - 1].f;
}

export interface WeekAssignment {
  dayIndex: number; // 0..6 (T2..CN)
  period: "LUNCH" | "DINNER";
  mainId: string;
  /** null = bữa không có món phụ (vd: chưa lưu món phụ nào) */
  sideId: string | null;
}

/**
 * Random cả tuần: 7 ngày x 2 bữa, mỗi bữa 1 món chính (+ 1 món phụ nếu có pool).
 * Không lặp món trong tuần chừng nào pool còn đủ; cạn thì pickFood tự nới lỏng.
 */
export function generateWeekAssignments(
  mains: CandidateFood[],
  sides: CandidateFood[],
  opts: { now: Date; rng?: () => number }
): WeekAssignment[] {
  if (mains.length === 0) return [];
  const used = new Set<string>();
  const counts = new Map<string, number>();
  const out: WeekAssignment[] = [];

  const take = (food: CandidateFood, dayUsed: Set<string>) => {
    used.add(food.id);
    dayUsed.add(food.id);
    counts.set(food.id, (counts.get(food.id) ?? 0) + 1);
  };

  for (let day = 0; day < 7; day++) {
    const dayUsed = new Set<string>();
    for (const period of ["LUNCH", "DINNER"] as const) {
      const ctx = {
        usedIds: used,
        avoidIds: dayUsed,
        usedCounts: counts,
        now: opts.now,
        rng: opts.rng,
      };
      const main = pickFood(mains, ctx);
      if (!main) continue;
      take(main, dayUsed);
      const side = sides.length > 0 ? pickFood(sides, ctx) : null;
      if (side) take(side, dayUsed);
      out.push({
        dayIndex: day,
        period,
        mainId: main.id,
        sideId: side?.id ?? null,
      });
    }
  }
  return out;
}

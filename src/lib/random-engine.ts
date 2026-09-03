// "Smart" food selector — pure, database-free, and testable.
// Score = 2.0*favorites + 1.5*frequency (log) + 1.5*staleness + 1.0*randomness,
// then weighted-random within the top 5 so each result varies while staying sensible.

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
  /** IDs of foods used in the week under consideration (rule: no repeats within the week). */
  usedIds: ReadonlySet<string>;
  /** Foods to avoid absolutely even when relaxing constraints (e.g. foods already used that day). */
  avoidIds?: ReadonlySet<string>;
  /** Number of times each food appeared this week — when relaxing constraints, prefer least-repeated foods. */
  usedCounts?: ReadonlyMap<string, number>;
  now: Date;
  /** For tests: replace Math.random. */
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

  let staleness = 1; // never cooked = "most stale"
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

/** Top `count` foods by score (without randomization) — used for "Suggested matches". */
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
 * Choose one food: score the whole pool (excluding foods already used this week), take the top 5,
 * then weighted-random by score within that group.
 * If the pool is exhausted (all foods already used), relax the rule and prefer least-repeated foods.
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
    // relax constraints when the pool is exhausted: allow repeats within the week but still avoid avoidIds
    // (same day) and prefer foods with the fewest repeats
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
  dayIndex: number; // 0..6 (Mon..Sun)
  period: "LUNCH" | "DINNER";
  mainId: string;
  /** null = meal has no side dish (e.g. no side foods saved yet). */
  sideId: string | null;
}

/**
 * Randomize the whole week: 7 days × 2 meals, each with 1 main dish (+ 1 side if a pool exists).
 * Do not repeat foods within the week while the pool has enough options; when exhausted, pickFood relaxes the rule.
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

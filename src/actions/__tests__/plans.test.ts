import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  foodFindMany: vi.fn(),
  mealCount: vi.fn(),
  mealFindMany: vi.fn(),
  transaction: vi.fn(),
  snapshotFindMany: vi.fn(),
  txExecuteRaw: vi.fn(),
  txMealCount: vi.fn(),
  txMealDeleteMany: vi.fn(),
  txMealCreateManyAndReturn: vi.fn(),
  txMealItemCreateMany: vi.fn(),
  txMealPlanUpsert: vi.fn(),
  txSnapshotCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    food: { findMany: mocks.foodFindMany },
    meal: { count: mocks.mealCount, findMany: mocks.mealFindMany },
    planSnapshot: { findMany: mocks.snapshotFindMany },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { generateWeek, loadSwapFoods } from "../plans";

describe("loadSwapFoods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      sub: "self",
      email: "self@example.com",
      name: "Self",
      iat: 1,
    });
  });

  it("requires a session before loading the picker", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(loadSwapFoods()).rejects.toThrow("Chưa đăng nhập");
    expect(mocks.foodFindMany).not.toHaveBeenCalled();
  });

  it("returns only the fields used by the manual picker", async () => {
    mocks.foodFindMany.mockResolvedValue([
      {
        id: "food-1",
        name: "Cá kho",
        type: "MAIN",
        cookingMethod: "Kho",
        favoriteScore: 5,
        statistic: { totalCooked: 3 },
      },
    ]);

    await expect(loadSwapFoods()).resolves.toEqual({
      foods: [
        {
          id: "food-1",
          name: "Cá kho",
          type: "MAIN",
          cookingMethod: "Kho",
          favoriteScore: 5,
          totalCooked: 3,
        },
      ],
    });
    expect(mocks.foodFindMany).toHaveBeenCalledWith({
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
  });

  it("reports a picker query failure instead of treating it as empty", async () => {
    mocks.foodFindMany.mockRejectedValue(new Error("database unavailable"));

    await expect(loadSwapFoods()).resolves.toEqual({
      error: "Không tải được danh sách món — kiểm tra mạng rồi thử lại nhé",
    });
  });
});

// Wednesday 2026-03-11 10:00 in Vietnam — the current week starts Monday 2026-03-09.
const NOW = new Date("2026-03-11T03:00:00.000Z");
const CURRENT_WEEK = "2026-03-09";

function txClient() {
  return {
    $executeRaw: mocks.txExecuteRaw,
    meal: {
      count: mocks.txMealCount,
      deleteMany: mocks.txMealDeleteMany,
      createManyAndReturn: mocks.txMealCreateManyAndReturn,
    },
    mealItem: { createMany: mocks.txMealItemCreateMany },
    mealPlan: { upsert: mocks.txMealPlanUpsert },
    planSnapshot: { create: mocks.txSnapshotCreate },
  };
}

describe("generateWeek week guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    mocks.getSession.mockResolvedValue({
      sub: "self",
      email: "self@example.com",
      name: "Self",
      iat: 1,
    });
    mocks.foodFindMany.mockResolvedValue([
      {
        id: "main-1",
        name: "Thịt kho",
        type: "MAIN",
        favoriteScore: 5,
        statistic: { totalCooked: 3, lastCookedAt: null },
      },
    ]);
    mocks.mealFindMany.mockResolvedValue([]); // no snapshot to take
    mocks.snapshotFindMany.mockResolvedValue([]); // nothing to prune
    mocks.transaction.mockImplementation(
      async (run: (tx: ReturnType<typeof txClient>) => Promise<unknown>) =>
        run(txClient())
    );
    mocks.txExecuteRaw.mockResolvedValue(1);
    mocks.txMealPlanUpsert.mockResolvedValue({ id: "plan-1" });
    mocks.txMealDeleteMany.mockResolvedValue({ count: 0 });
    mocks.txMealCreateManyAndReturn.mockImplementation(
      async ({ data }: { data: { date: Date; period: string }[] }) =>
        data.map((row, i) => ({ id: `meal-${i}`, ...row }))
    );
    mocks.txMealItemCreateMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("randomizes the current week while it is still empty", async () => {
    mocks.mealCount.mockResolvedValue(0);
    mocks.txMealCount.mockResolvedValue(0);

    await expect(generateWeek(CURRENT_WEEK)).resolves.toEqual({});
    expect(mocks.txMealCreateManyAndReturn).toHaveBeenCalledOnce();
  });

  it("refuses the current week once it already has a plan", async () => {
    mocks.mealCount.mockResolvedValue(14);

    await expect(generateWeek(CURRENT_WEEK)).resolves.toEqual({
      error: "Tuần này đã có thực đơn — chỉ random được cho tuần mới",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("refuses a week that already ended", async () => {
    mocks.mealCount.mockResolvedValue(0);

    await expect(generateWeek("2026-03-02")).resolves.toEqual({
      error: "Không random được thực đơn cho tuần đã qua",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("loses the race safely: a competing plan created after the pre-check blocks the write", async () => {
    mocks.mealCount.mockResolvedValue(0); // pre-check sees an empty current week
    mocks.txMealCount.mockResolvedValue(14); // the competing request committed first

    await expect(generateWeek(CURRENT_WEEK)).resolves.toEqual({
      error: "Tuần này đã có thực đơn — chỉ random được cho tuần mới",
    });
    // the plan that won the race must survive untouched
    expect(mocks.txMealDeleteMany).not.toHaveBeenCalled();
    expect(mocks.txMealCreateManyAndReturn).not.toHaveBeenCalled();
    expect(mocks.txSnapshotCreate).not.toHaveBeenCalled();
  });

  it("holds a week-scoped lock before re-checking inside the transaction", async () => {
    mocks.mealCount.mockResolvedValue(0);
    mocks.txMealCount.mockResolvedValue(0);

    await generateWeek(CURRENT_WEEK);

    expect(mocks.txExecuteRaw).toHaveBeenCalledOnce();
    const [strings, ...values] = mocks.txExecuteRaw.mock.calls[0];
    expect(String(strings.join("?"))).toContain("pg_advisory_xact_lock");
    expect(values).toContain(CURRENT_WEEK);
    expect(mocks.txExecuteRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.txMealCount.mock.invocationCallOrder[0]
    );
    expect(mocks.txMealCount.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.txMealDeleteMany.mock.invocationCallOrder[0]
    );
  });
});

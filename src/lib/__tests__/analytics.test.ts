import { describe, expect, it } from "vitest";
import {
  absenceByMember,
  cookingHeatmap,
  methodDistribution,
  plannedMethodMix,
  ratingDistribution,
  staleFoods,
  summarize,
  topCookedFoods,
  topIngredients,
  weeklyProgress,
  type AnalyticsFood,
  type AnalyticsMeal,
} from "../analytics";

function food(
  name: string,
  overrides: Partial<AnalyticsFood> = {}
): AnalyticsFood {
  return {
    name,
    type: "MAIN",
    cookingMethod: "Kho",
    favoriteScore: 4,
    ingredients: [],
    statistic: null,
    ...overrides,
  };
}

const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function meal(
  dateISO: string,
  period: "LUNCH" | "DINNER",
  overrides: Partial<AnalyticsMeal> = {}
): AnalyticsMeal {
  return {
    date: date(dateISO),
    period,
    cookedAt: null,
    note: null,
    weekStart: date("2026-08-31"),
    items: [{ position: "MAIN", food: { cookingMethod: "Kho" } }],
    absences: [],
    ...overrides,
  };
}

describe("summarize", () => {
  it("đếm món, bữa và tỉ lệ đã nấu", () => {
    const summary = summarize(
      [
        food("Cá kho", { statistic: { totalCooked: 2, lastCookedAt: null } }),
        food("Canh chua", { type: "SIDE" }),
      ],
      [
        meal("2026-08-31", "LUNCH", { cookedAt: new Date() }),
        meal("2026-08-31", "DINNER"),
        meal("2026-09-01", "LUNCH", { note: "Thiếu nước mắm" }),
      ]
    );

    expect(summary.foods).toBe(2);
    expect(summary.mains).toBe(1);
    expect(summary.sides).toBe(1);
    expect(summary.plannedMeals).toBe(3);
    expect(summary.cookedMeals).toBe(1);
    expect(summary.cookedRate).toBe(33);
    expect(summary.weeks).toBe(1);
    expect(summary.neverCooked).toBe(1);
    expect(summary.cookedTimes).toBe(2);
    expect(summary.mealsWithNote).toBe(1);
  });

  it("gộp nguyên liệu trùng tên bất kể hoa thường", () => {
    const summary = summarize(
      [
        food("Cá kho", { ingredients: [{ name: "Tỏi" }, { name: "Cá" }] }),
        food("Gà kho", { ingredients: [{ name: " tỏi " }] }),
      ],
      []
    );

    expect(summary.distinctIngredients).toBe(2);
  });

  it("không chia cho 0 khi chưa có bữa nào", () => {
    expect(summarize([], []).cookedRate).toBe(0);
  });
});

describe("methodDistribution", () => {
  it("xếp cách chế biến nhiều món nhất lên trước", () => {
    const slices = methodDistribution([
      food("A", { cookingMethod: "Xào" }),
      food("B", { cookingMethod: "Kho" }),
      food("C", { cookingMethod: "Xào" }),
    ]);

    expect(slices).toEqual([
      { label: "Xào", value: 2 },
      { label: "Kho", value: 1 },
    ]);
  });
});

describe("ratingDistribution", () => {
  it("luôn trả đủ 6 mức sao kể cả mức chưa có món", () => {
    const slices = ratingDistribution([
      food("A", { favoriteScore: 5 }),
      food("B", { favoriteScore: 5 }),
    ]);

    expect(slices).toHaveLength(6);
    expect(slices.map((s) => s.label)).toEqual([
      "0★",
      "1★",
      "2★",
      "3★",
      "4★",
      "5★",
    ]);
    expect(slices[5]).toEqual({ label: "5★", value: 2 });
    expect(slices[0].value).toBe(0);
  });
});

describe("topCookedFoods", () => {
  it("bỏ qua món chưa nấu lần nào và cắt theo giới hạn", () => {
    const slices = topCookedFoods(
      [
        food("Cá kho", { statistic: { totalCooked: 3, lastCookedAt: null } }),
        food("Gà nướng", { statistic: { totalCooked: 1, lastCookedAt: null } }),
        food("Chưa nấu"),
      ],
      2
    );

    expect(slices).toEqual([
      { label: "Cá kho", value: 3 },
      { label: "Gà nướng", value: 1 },
    ]);
  });
});

describe("topIngredients", () => {
  it("đếm số món dùng nguyên liệu, mỗi món chỉ tính một lần", () => {
    const slices = topIngredients([
      food("A", { ingredients: [{ name: "Tỏi" }, { name: "tỏi" }] }),
      food("B", { ingredients: [{ name: "TỎI" }, { name: "Ớt" }] }),
    ]);

    expect(slices).toEqual([
      { label: "Tỏi", value: 2 },
      { label: "Ớt", value: 1 },
    ]);
  });
});

describe("cookingHeatmap", () => {
  it("trả đủ lưới 7 ngày × 2 buổi và đếm bữa đã nấu", () => {
    // 31/08/2026 là thứ 2 -> dayIndex 0
    const heatmap = cookingHeatmap([
      meal("2026-08-31", "LUNCH", { cookedAt: new Date() }),
      meal("2026-08-31", "LUNCH", { cookedAt: new Date() }),
      meal("2026-08-31", "DINNER"),
    ]);

    expect(heatmap.cells).toHaveLength(14);
    expect(heatmap.max).toBe(2);
    const mondayLunch = heatmap.cells.find(
      (cell) => cell.dayIndex === 0 && cell.period === "LUNCH"
    );
    expect(mondayLunch).toEqual({
      dayIndex: 0,
      period: "LUNCH",
      planned: 2,
      cooked: 2,
    });
    const mondayDinner = heatmap.cells.find(
      (cell) => cell.dayIndex === 0 && cell.period === "DINNER"
    );
    expect(mondayDinner?.cooked).toBe(0);
  });
});

describe("weeklyProgress", () => {
  it("tách đã nấu và còn lại theo từng tuần, tuần cũ trước", () => {
    const weeks = weeklyProgress([
      meal("2026-08-31", "LUNCH", { cookedAt: new Date() }),
      meal("2026-08-31", "DINNER"),
      meal("2026-09-07", "LUNCH", { weekStart: date("2026-09-07") }),
    ]);

    expect(weeks).toEqual([
      {
        weekStartISO: "2026-08-31",
        label: "31/08 – 06/09",
        shortLabel: "31/08",
        cooked: 1,
        remaining: 1,
      },
      {
        weekStartISO: "2026-09-07",
        label: "07/09 – 13/09",
        shortLabel: "07/09",
        cooked: 0,
        remaining: 1,
      },
    ]);
  });

  it("chỉ giữ các tuần gần nhất", () => {
    const meals = ["2026-08-17", "2026-08-24", "2026-08-31"].map((iso) =>
      meal(iso, "LUNCH", { weekStart: date(iso) })
    );

    expect(weeklyProgress(meals, 2).map((w) => w.weekStartISO)).toEqual([
      "2026-08-24",
      "2026-08-31",
    ]);
  });
});

describe("absenceByMember", () => {
  it("liệt kê cả thành viên chưa vắng bữa nào", () => {
    const slices = absenceByMember(
      [
        meal("2026-08-31", "LUNCH", { absences: [{ userId: "u1" }] }),
        meal("2026-08-31", "DINNER", { absences: [{ userId: "u1" }] }),
      ],
      [
        { id: "u1", name: "Nam" },
        { id: "u2", name: "Khang" },
      ]
    );

    expect(slices).toEqual([
      { label: "Nam", value: 2 },
      { label: "Khang", value: 0 },
    ]);
  });
});

describe("plannedMethodMix", () => {
  it("đếm cách chế biến trong các bữa đã lên lịch", () => {
    const slices = plannedMethodMix([
      meal("2026-08-31", "LUNCH", {
        items: [
          { position: "MAIN", food: { cookingMethod: "Kho" } },
          { position: "SIDE", food: { cookingMethod: "Canh" } },
        ],
      }),
      meal("2026-08-31", "DINNER", {
        items: [{ position: "MAIN", food: { cookingMethod: "Canh" } }],
      }),
    ]);

    expect(slices).toEqual([
      { label: "Canh", value: 2 },
      { label: "Kho", value: 1 },
    ]);
  });
});

describe("staleFoods", () => {
  it("xếp món chưa nấu lần nào lên trước, rồi tới món đợi lâu nhất", () => {
    const now = new Date("2026-09-03T00:00:00.000Z");
    const rows = staleFoods(
      [
        food("Nấu hôm qua", {
          statistic: {
            totalCooked: 1,
            lastCookedAt: new Date("2026-09-02T00:00:00.000Z"),
          },
        }),
        food("Nấu tháng trước", {
          statistic: {
            totalCooked: 1,
            lastCookedAt: new Date("2026-08-04T00:00:00.000Z"),
          },
        }),
        food("Chưa nấu 3 sao", { favoriteScore: 3 }),
        food("Chưa nấu 5 sao", { favoriteScore: 5 }),
      ],
      now
    );

    expect(rows.map((row) => [row.name, row.days])).toEqual([
      ["Chưa nấu 5 sao", null],
      ["Chưa nấu 3 sao", null],
      ["Nấu tháng trước", 30],
      ["Nấu hôm qua", 1],
    ]);
  });
});

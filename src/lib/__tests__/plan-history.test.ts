import { describe, expect, it } from "vitest";
import {
  formatSnapshotTime,
  groupSnapshotByDay,
  parsePlanSnapshotData,
  PLAN_SNAPSHOT_VERSION,
  serializePlanSnapshot,
  snapshotReasonLabel,
  sortSnapshotMeals,
  type SnapshotMeal,
  type SnapshotSourceMeal,
} from "../plan-history";

function sourceMeal(
  dateISO: string,
  period: "LUNCH" | "DINNER",
  overrides: Partial<SnapshotSourceMeal> = {}
): SnapshotSourceMeal {
  return {
    date: new Date(`${dateISO}T00:00:00.000Z`),
    period,
    cookedAt: null,
    note: null,
    absences: [],
    items: [
      { foodId: "food-1", position: "MAIN", food: { name: "Cá kho" } },
      { foodId: "food-2", position: "SIDE", food: { name: "Rau muống xào" } },
    ],
    ...overrides,
  };
}

function snapshotMeal(
  dateISO: string,
  period: "LUNCH" | "DINNER"
): SnapshotMeal {
  return {
    dateISO,
    period,
    cookedAtISO: null,
    note: null,
    absentUserIds: [],
    dishes: [{ foodId: "food-1", name: "Cá kho", position: "MAIN" }],
  };
}

describe("serializePlanSnapshot", () => {
  it("lưu đủ món, ghi chú, trạng thái đã nấu và người vắng", () => {
    const data = serializePlanSnapshot([
      sourceMeal("2026-09-03", "DINNER", {
        cookedAt: new Date("2026-09-03T11:30:00.000Z"),
        note: "Thiếu nước mắm",
        absences: [{ userId: "user-1" }],
      }),
    ]);

    expect(data.version).toBe(PLAN_SNAPSHOT_VERSION);
    expect(data.meals).toEqual([
      {
        dateISO: "2026-09-03",
        period: "DINNER",
        cookedAtISO: "2026-09-03T11:30:00.000Z",
        note: "Thiếu nước mắm",
        absentUserIds: ["user-1"],
        dishes: [
          { foodId: "food-1", name: "Cá kho", position: "MAIN" },
          { foodId: "food-2", name: "Rau muống xào", position: "SIDE" },
        ],
      },
    ]);
  });

  it("giữ tên món tại thời điểm lưu để lịch sử vẫn đọc được sau khi đổi tên", () => {
    const data = serializePlanSnapshot([
      sourceMeal("2026-09-03", "LUNCH", {
        items: [
          { foodId: "food-9", position: "MAIN", food: { name: "Canh chua" } },
        ],
      }),
    ]);

    expect(data.meals[0].dishes[0]).toEqual({
      foodId: "food-9",
      name: "Canh chua",
      position: "MAIN",
    });
  });
});

describe("parsePlanSnapshotData", () => {
  it("đọc lại đúng dữ liệu vừa lưu", () => {
    const data = serializePlanSnapshot([
      sourceMeal("2026-09-03", "LUNCH"),
      sourceMeal("2026-09-04", "DINNER"),
    ]);

    expect(parsePlanSnapshotData(data)).toEqual(data);
  });

  it("bỏ qua bữa và món hỏng thay vì làm vỡ màn hình lịch sử", () => {
    const parsed = parsePlanSnapshotData({
      version: 1,
      meals: [
        { dateISO: "hôm qua", period: "LUNCH", dishes: [] },
        { dateISO: "2026-09-03", period: "BRUNCH", dishes: [] },
        {
          dateISO: "2026-09-03",
          period: "DINNER",
          dishes: [
            { foodId: "food-1", name: "Cá kho", position: "MAIN" },
            { foodId: "food-2", position: "SIDE" },
            { name: "Món không id", position: "SIDE" },
            "rác",
          ],
        },
      ],
    });

    expect(parsed?.meals).toHaveLength(1);
    expect(parsed?.meals[0].dishes).toEqual([
      { foodId: "food-1", name: "Cá kho", position: "MAIN" },
      { foodId: "food-2", name: "Món đã xóa", position: "SIDE" },
    ]);
  });

  it("trả về null khi dữ liệu không dùng được", () => {
    expect(parsePlanSnapshotData(null)).toBeNull();
    expect(parsePlanSnapshotData("{}")).toBeNull();
    expect(parsePlanSnapshotData({ meals: [] })).toBeNull();
    expect(parsePlanSnapshotData({ meals: "không phải mảng" })).toBeNull();
  });
});

describe("sortSnapshotMeals", () => {
  it("xếp theo ngày, bữa trưa trước bữa tối", () => {
    const sorted = sortSnapshotMeals([
      snapshotMeal("2026-09-04", "LUNCH"),
      snapshotMeal("2026-09-03", "DINNER"),
      snapshotMeal("2026-09-03", "LUNCH"),
    ]);

    expect(sorted.map((m) => `${m.dateISO}|${m.period}`)).toEqual([
      "2026-09-03|LUNCH",
      "2026-09-03|DINNER",
      "2026-09-04|LUNCH",
    ]);
  });
});

describe("groupSnapshotByDay", () => {
  it("gom các bữa của cùng một ngày thành một khối", () => {
    const days = groupSnapshotByDay([
      snapshotMeal("2026-09-04", "DINNER"),
      snapshotMeal("2026-09-03", "DINNER"),
      snapshotMeal("2026-09-03", "LUNCH"),
    ]);

    expect(days.map((d) => d.dateISO)).toEqual(["2026-09-03", "2026-09-04"]);
    expect(days[0].meals.map((m) => m.period)).toEqual(["LUNCH", "DINNER"]);
    expect(days[1].meals).toHaveLength(1);
  });
});

describe("snapshotReasonLabel", () => {
  it("mô tả vì sao thực đơn cũ bị thay", () => {
    expect(snapshotReasonLabel("RANDOM_WEEK")).toBe("Trước khi random tuần");
    expect(snapshotReasonLabel("COPY_LAST_WEEK")).toBe(
      "Trước khi copy tuần trước"
    );
    expect(snapshotReasonLabel("RESTORE")).toBe("Trước khi khôi phục");
  });
});

describe("formatSnapshotTime", () => {
  it("hiển thị theo giờ Việt Nam", () => {
    // 2026-09-03T17:15Z = 00:15 ngày 04/09 giờ Việt Nam
    expect(formatSnapshotTime("2026-09-03T17:15:00.000Z")).toBe("04/09 00:15");
  });

  it("không vỡ khi thời điểm không hợp lệ", () => {
    expect(formatSnapshotTime("không phải ngày")).toBe("");
  });
});

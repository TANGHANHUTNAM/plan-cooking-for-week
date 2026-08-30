import { describe, expect, it } from "vitest";
import {
  generateWeekAssignments,
  pickFood,
  scoreFood,
  suggestFoods,
  type CandidateFood,
} from "../random-engine";

const NOW = new Date("2026-08-30T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function food(partial: Partial<CandidateFood> & { id: string }): CandidateFood {
  return {
    name: partial.id,
    type: "MAIN",
    favoriteScore: 0,
    totalCooked: 0,
    lastCookedAt: null,
    ...partial,
  };
}

function pool(n: number, type: "MAIN" | "SIDE"): CandidateFood[] {
  return Array.from({ length: n }, (_, i) => food({ id: `${type}-${i}`, type }));
}

describe("scoreFood", () => {
  it("món yêu thích 5 sao được cộng đủ 2.0 điểm", () => {
    const zeroRng = () => 0;
    const base = scoreFood(food({ id: "a" }), 10, NOW, zeroRng);
    const fav = scoreFood(food({ id: "b", favoriteScore: 5 }), 10, NOW, zeroRng);
    expect(fav - base).toBeCloseTo(2.0, 5);
  });

  it("món chưa nấu bao giờ được coi là 'lâu chưa ăn' tối đa", () => {
    const zeroRng = () => 0;
    const never = scoreFood(food({ id: "a" }), 0, NOW, zeroRng);
    const justCooked = scoreFood(
      food({ id: "b", lastCookedAt: NOW }),
      0,
      NOW,
      zeroRng
    );
    expect(never - justCooked).toBeCloseTo(1.5, 5);
  });

  it("staleness bị chặn trần ở 30 ngày", () => {
    const zeroRng = () => 0;
    const d31 = scoreFood(
      food({ id: "a", lastCookedAt: new Date(NOW.getTime() - 31 * DAY_MS) }),
      0,
      NOW,
      zeroRng
    );
    const d300 = scoreFood(
      food({ id: "b", lastCookedAt: new Date(NOW.getTime() - 300 * DAY_MS) }),
      0,
      NOW,
      zeroRng
    );
    expect(d31).toBeCloseTo(d300, 5);
  });
});

describe("pickFood", () => {
  it("không bao giờ chọn món đã dùng khi pool còn món", () => {
    const foods = pool(5, "MAIN");
    const used = new Set(["MAIN-0", "MAIN-1"]);
    for (let i = 0; i < 50; i++) {
      const picked = pickFood(foods, { usedIds: used, now: NOW });
      expect(picked).not.toBeNull();
      expect(used.has(picked!.id)).toBe(false);
    }
  });

  it("pool cạn thì nới lỏng thay vì trả null", () => {
    const foods = pool(2, "MAIN");
    const used = new Set(["MAIN-0", "MAIN-1"]);
    const picked = pickFood(foods, { usedIds: used, now: NOW });
    expect(picked).not.toBeNull();
  });

  it("pool rỗng trả null", () => {
    expect(pickFood([], { usedIds: new Set(), now: NOW })).toBeNull();
  });
});

describe("generateWeekAssignments", () => {
  it("tạo đủ 14 bữa, mỗi bữa 1 chính + 1 phụ", () => {
    const out = generateWeekAssignments(pool(14, "MAIN"), pool(14, "SIDE"), {
      now: NOW,
    });
    expect(out).toHaveLength(14);
    for (const a of out) {
      expect(a.mainId.startsWith("MAIN-")).toBe(true);
      expect(a.sideId?.startsWith("SIDE-")).toBe(true);
    }
  });

  it("không lặp món trong tuần khi pool đủ lớn", () => {
    const out = generateWeekAssignments(pool(20, "MAIN"), pool(20, "SIDE"), {
      now: NOW,
    });
    const ids = out.flatMap((a) => [a.mainId, a.sideId]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("pool nhỏ vẫn lấp đủ 14 bữa (cho phép lặp)", () => {
    const out = generateWeekAssignments(pool(3, "MAIN"), pool(2, "SIDE"), {
      now: NOW,
    });
    expect(out).toHaveLength(14);
  });

  it("pool nhỏ: không lặp cùng món trong cùng một ngày", () => {
    for (let run = 0; run < 20; run++) {
      const out = generateWeekAssignments(pool(2, "MAIN"), pool(2, "SIDE"), {
        now: NOW,
      });
      for (let day = 0; day < 7; day++) {
        const dayMeals = out.filter((a) => a.dayIndex === day);
        expect(dayMeals).toHaveLength(2);
        expect(dayMeals[0].mainId).not.toBe(dayMeals[1].mainId);
        expect(dayMeals[0].sideId).not.toBe(dayMeals[1].sideId);
      }
    }
  });

  it("pool nhỏ: số lần lặp phân bố đều (7 món chính -> mỗi món đúng 2 lần)", () => {
    const out = generateWeekAssignments(pool(7, "MAIN"), pool(7, "SIDE"), {
      now: NOW,
    });
    const mainCounts = new Map<string, number>();
    for (const a of out) {
      mainCounts.set(a.mainId, (mainCounts.get(a.mainId) ?? 0) + 1);
    }
    expect([...mainCounts.values()].every((c) => c === 2)).toBe(true);
  });

  it("không có món chính nào thì trả mảng rỗng", () => {
    expect(generateWeekAssignments([], pool(5, "SIDE"), { now: NOW })).toEqual([]);
  });

  it("không có món phụ nào vẫn tạo đủ 14 bữa chỉ có món chính", () => {
    const out = generateWeekAssignments(pool(14, "MAIN"), [], { now: NOW });
    expect(out).toHaveLength(14);
    expect(out.every((a) => a.sideId === null)).toBe(true);
  });
});

describe("suggestFoods", () => {
  it("ưu tiên món điểm cao và loại món đã dùng", () => {
    const foods = [
      food({ id: "fav", favoriteScore: 5, totalCooked: 20 }),
      food({ id: "used", favoriteScore: 5, totalCooked: 30 }),
      food({ id: "plain" }),
    ];
    const out = suggestFoods(foods, {
      usedIds: new Set(["used"]),
      now: NOW,
      rng: () => 0.5,
    });
    expect(out.map((f) => f.id)).not.toContain("used");
    expect(out[0].id).toBe("fav");
  });
});

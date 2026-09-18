import { describe, expect, it } from "vitest";
import { buildFoodChestReel, foodChestLabel, toSpinFood } from "../food-chest";
import type { CandidateFood } from "../random-engine";

function food(id: string, favoriteScore = 0): CandidateFood {
  return {
    id,
    name: id,
    type: "MAIN",
    cookingMethod: "Kho",
    favoriteScore,
    totalCooked: 2,
    lastCookedAt: null,
  };
}

describe("food chest helpers", () => {
  it("maps star ratings to presentational labels only", () => {
    expect(foodChestLabel(5)).toBe("Món tủ");
    expect(foodChestLabel(3)).toBe("Hợp gu");
    expect(foodChestLabel(0)).toBe("Đổi vị");
  });

  it("keeps the server-selected dish at the center of a seven-card reel", () => {
    const selected = food("selected", 5);
    const reel = buildFoodChestReel(
      [selected, food("one"), food("two"), food("three")],
      selected,
      () => 0
    );

    expect(reel).toHaveLength(7);
    expect(reel[Math.floor(reel.length / 2)].id).toBe("selected");
  });

  it("returns only the fields rendered by the chest", () => {
    expect(toSpinFood(food("dish", 4))).toEqual({
      id: "dish",
      name: "dish",
      cookingMethod: "Kho",
      favoriteScore: 4,
      totalCooked: 2,
    });
  });
});

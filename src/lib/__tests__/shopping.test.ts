import { describe, expect, it } from "vitest";
import {
  aggregateIngredients,
  normalizeIngredientKey,
  type ShoppingMeal,
} from "../shopping";

function meal(
  dateISO: string,
  dishName: string,
  ingredients: string[]
): ShoppingMeal {
  return {
    dateISO,
    period: "DINNER",
    dishes: [{ name: dishName, position: "MAIN", ingredients }],
  };
}

describe("normalizeIngredientKey", () => {
  it("ổn định khoảng trắng, Unicode và hoa thường", () => {
    expect(normalizeIngredientKey("  TỎI  ")).toBe("tỏi");
    expect(normalizeIngredientKey("TỎI")).toBe("tỏi");
  });
});

describe("aggregateIngredients", () => {
  it("gộp các nguyên liệu trùng khóa để dùng chung trạng thái tick", () => {
    const entries = aggregateIngredients([
      meal("2026-09-03", "Gà kho", ["Tỏi"]),
      meal("2026-09-04", "Rau xào", ["  tỏi ", "Dầu ăn"]),
    ]);

    expect(entries).toEqual([
      { name: "Dầu ăn", dishes: ["Rau xào"], count: 1 },
      { name: "Tỏi", dishes: ["Gà kho", "Rau xào"], count: 2 },
    ]);
  });
});

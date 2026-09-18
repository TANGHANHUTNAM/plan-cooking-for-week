import type { SpinFoodDTO, FoodChestLabel } from "@/lib/dto";
import type { CandidateFood } from "@/lib/random-engine";

export const FOOD_CHEST_REEL_SIZE = 7;

export function foodChestLabel(favoriteScore: number): FoodChestLabel {
  if (favoriteScore >= 4) return "Món tủ";
  if (favoriteScore >= 2) return "Hợp gu";
  return "Đổi vị";
}

export function toSpinFood(food: CandidateFood): SpinFoodDTO {
  return {
    id: food.id,
    name: food.name,
    cookingMethod: food.cookingMethod ?? "Món ăn",
    favoriteScore: food.favoriteScore,
    totalCooked: food.totalCooked,
  };
}

/** Build the visual reel on the server so the final card is never client-selected. */
export function buildFoodChestReel(
  pool: CandidateFood[],
  selected: CandidateFood,
  rng: () => number = Math.random
): CandidateFood[] {
  const others = pool.filter((food) => food.id !== selected.id);

  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [others[i], others[j]] = [others[j], others[i]];
  }

  const reel = Array.from({ length: FOOD_CHEST_REEL_SIZE }, (_, index) => {
    if (index === Math.floor(FOOD_CHEST_REEL_SIZE / 2)) return selected;
    return others[index % Math.max(1, others.length)] ?? selected;
  });

  return reel;
}

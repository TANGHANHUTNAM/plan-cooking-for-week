import { describe, expect, it } from "vitest";
import {
  buildChestTrack,
  CHEST_FULL_CHARGE_SPIN_MS,
  CHEST_SPIN_MS,
  chestSpinDuration,
  chestTravelProgress,
} from "@/lib/food-chest-motion";
import type { FoodSpinResultDTO, SpinFoodDTO } from "@/lib/dto";

const selected: SpinFoodDTO = {
  id: "selected",
  name: "Canh chua",
  cookingMethod: "Nấu",
  favoriteScore: 4,
  totalCooked: 2,
};
const result: FoodSpinResultDTO = {
  selected,
  label: "Món tủ",
  reel: Array.from({ length: 7 }, (_, i) => ({
    ...selected,
    id: `visual-${i}`,
  })),
};

describe("chest presentation motion", () => {
  it("lands on the server result after multiple cycles without mutating the reel", () => {
    const original = structuredClone(result);
    const track = buildChestTrack(result);
    expect(track.selectedIndex - track.startIndex).toBeGreaterThan(7);
    expect(track.cards[track.selectedIndex]).toEqual(selected);
    expect(track.cards.length - track.selectedIndex).toBeGreaterThan(3);
    expect(result).toEqual(original);
  });

  it("scales travel cycles with the longer full-charge duration", () => {
    const normal = buildChestTrack(result, 4);
    const fullCharge = buildChestTrack(result, 10);
    expect(normal.selectedIndex - normal.startIndex).toBe(28);
    expect(fullCharge.selectedIndex - fullCharge.startIndex).toBe(70);
    expect(fullCharge.cards[fullCharge.selectedIndex]).toEqual(selected);
  });

  it("handles one-dish and missing presentation pools", () => {
    for (const reel of [[], [selected]]) {
      const track = buildChestTrack({ ...result, reel });
      expect(track.cards.every(Boolean)).toBe(true);
      expect(track.cards[track.selectedIndex]).toEqual(selected);
    }
  });

  it("moves forward with progressively smaller distances and stops exactly at the target", () => {
    const positions = Array.from({ length: 101 }, (_, i) =>
      chestTravelProgress((i * CHEST_SPIN_MS) / 100, CHEST_SPIN_MS)
    );
    expect(positions[0]).toBe(0);
    expect(positions.at(-1)).toBe(1);
    const distances = positions
      .slice(1)
      .map((position, i) => position - positions[i]);
    distances.forEach((distance, i) => {
      expect(distance).toBeGreaterThanOrEqual(0);
      if (i) expect(distance).toBeLessThanOrEqual(distances[i - 1]);
    });
    expect(chestTravelProgress(-100, CHEST_SPIN_MS)).toBe(0);
    expect(chestTravelProgress(CHEST_SPIN_MS + 1000, CHEST_SPIN_MS)).toBe(1);
  });

  it("maps charge linearly to a longer spin while clamping charge", () => {
    expect(chestSpinDuration(0)).toBe(CHEST_SPIN_MS);
    expect(chestSpinDuration(0.5)).toBe(9750);
    expect(chestSpinDuration(1)).toBe(CHEST_FULL_CHARGE_SPIN_MS);
    expect(chestSpinDuration(-1)).toBe(CHEST_SPIN_MS);
    expect(chestSpinDuration(2)).toBe(CHEST_FULL_CHARGE_SPIN_MS);
  });
});

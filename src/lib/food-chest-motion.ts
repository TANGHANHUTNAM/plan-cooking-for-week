import type { FoodSpinResultDTO } from "@/lib/dto";

export const CHEST_SPIN_MS = 7800;
export const CHEST_SETTLE_MS = 420;

/** Repeat presentation cards only. The server-selected dish owns the final slot. */
export function buildChestTrack(result: FoodSpinResultDTO) {
  const reel = result.reel.length ? result.reel : [result.selected];
  const startIndex = Math.floor(reel.length / 2);
  const selectedIndex = reel.length * 4 + startIndex;
  const cards = Array.from({ length: reel.length * 5 }, (_, index) =>
    index === selectedIndex ? result.selected : reel[index % reel.length]
  );
  return { cards, startIndex, selectedIndex };
}

/** Continuous deceleration, with no overshoot or frame-rate-dependent movement. */
export function chestTravelProgress(elapsedMs: number, durationMs: number) {
  const t = Math.max(0, Math.min(1, elapsedMs / durationMs));
  return 1 - (1 - t) ** 3;
}

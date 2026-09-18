import type { FoodSpinResultDTO } from "@/lib/dto";

export const CHEST_SPIN_MS = 5500;
export const CHEST_FULL_CHARGE_SPIN_MS = 14000;
export const CHEST_SETTLE_MS = 420;

export function chestSpinDuration(charge: number): number {
  const normalized = Math.max(0, Math.min(1, charge));
  return (
    CHEST_SPIN_MS + (CHEST_FULL_CHARGE_SPIN_MS - CHEST_SPIN_MS) * normalized
  );
}

/** Repeat presentation cards only. The server-selected dish owns the final slot. */
export function buildChestTrack(result: FoodSpinResultDTO, cycles = 4) {
  const reel = result.reel.length ? result.reel : [result.selected];
  const repeatCycles = Math.max(1, Math.floor(cycles));
  const startIndex = Math.floor(reel.length / 2);
  const selectedIndex = reel.length * repeatCycles + startIndex;
  const cards = Array.from(
    { length: reel.length * (repeatCycles + 1) },
    (_, index) =>
      index === selectedIndex ? result.selected : reel[index % reel.length]
  );
  return { cards, startIndex, selectedIndex };
}

/** Continuous deceleration, with no overshoot or frame-rate-dependent movement. */
export function chestTravelProgress(elapsedMs: number, durationMs: number) {
  const t = Math.max(0, Math.min(1, elapsedMs / durationMs));
  return 1 - (1 - t) ** 3;
}

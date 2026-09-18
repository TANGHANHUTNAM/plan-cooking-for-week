"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { FoodSpinResultDTO, SpinFoodDTO } from "@/lib/dto";
import { foodChestLabel } from "@/lib/food-chest";
import {
  buildChestTrack,
  CHEST_SPIN_MS,
  chestTravelProgress,
} from "@/lib/food-chest-motion";
import { FoodChestArtwork } from "@/components/food-chest-artwork";

export function chestAccent(score: number) {
  return score >= 4 ? "#dfb65d" : score >= 2 ? "#8ed1ba" : "#b1a3d9";
}

export function FoodChestReel({
  result,
  previewFoods,
  spinning,
  spinDuration = CHEST_SPIN_MS,
  onTick,
  onComplete,
}: {
  result: FoodSpinResultDTO | null;
  previewFoods: SpinFoodDTO[];
  spinning: boolean;
  spinDuration?: number;
  onTick: () => void;
  onComplete: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [previewCards, setPreviewCards] = useState<SpinFoodDTO[]>([]);
  const travelCycles = Math.max(
    4,
    Math.round((spinDuration / CHEST_SPIN_MS) * 4)
  );
  const track = useMemo(
    () => (result ? buildChestTrack(result, travelCycles) : null),
    [result, travelCycles]
  );
  const placeholderCards = useMemo(
    () => Array.from({ length: 7 }, () => null),
    []
  );

  useEffect(() => {
    if (result) return;

    const frame = requestAnimationFrame(() => {
      const shuffled = [...previewFoods];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [
          shuffled[swapIndex],
          shuffled[index],
        ];
      }
      setPreviewCards(shuffled.slice(0, 7));
    });

    return () => cancelAnimationFrame(frame);
  }, [previewFoods, result]);

  const cards =
    track?.cards ?? (previewCards.length ? previewCards : placeholderCards);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const rail = trackRef.current;
    const first = rail?.firstElementChild as HTMLElement | null;
    if (!viewport || !rail || !first) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = track?.startIndex ?? Math.floor((cards.length || 7) / 2);
    const end = track?.selectedIndex ?? start;
    let position = spinning ? start : end;
    let stride = 0;
    let width = 0;
    let frame = 0;
    let origin: number | null = null;
    let lastTick = start;
    let lastTickAt = -Infinity;
    let finished = false;

    const paint = () => {
      rail.style.transform = `translate3d(${-position * stride - width / 2}px, 0, 0)`;
    };
    const measure = () => {
      width = first.offsetWidth;
      stride = width + parseFloat(getComputedStyle(rail).columnGap);
      paint();
    };
    const complete = () => {
      if (finished) return;
      finished = true;
      position = end;
      paint();
      onComplete();
    };
    const animate = (now: number) => {
      if (origin === null) origin = now;
      const elapsed = now - origin;
      position =
        start + (end - start) * chestTravelProgress(elapsed, spinDuration);
      paint();
      const passing = Math.round(position);
      if (passing !== lastTick && now - lastTickAt > 45) {
        lastTick = passing;
        lastTickAt = now;
        onTick();
      }
      if (elapsed >= spinDuration || media.matches) complete();
      else frame = requestAnimationFrame(animate);
    };
    const motionChanged = () => {
      if (spinning && media.matches) {
        cancelAnimationFrame(frame);
        complete();
      }
    };

    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(viewport);
    if (spinning)
      frame = requestAnimationFrame(media.matches ? complete : animate);
    media.addEventListener("change", motionChanged);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      media.removeEventListener("change", motionChanged);
    };
  }, [cards.length, onComplete, onTick, spinDuration, spinning, track]);

  return (
    <div
      ref={viewportRef}
      className="food-chest-reel-viewport"
      aria-hidden="true"
      data-spinning={spinning}
    >
      <div className="food-chest-marker">
        <span />
        <span />
      </div>
      <div ref={trackRef} className="food-chest-track">
        {(cards.length ? cards : Array.from({ length: 7 }, () => null)).map(
          (food, index) => (
            <div
              key={`${food?.id ?? "placeholder"}-${index}`}
              className="food-chest-reel-card"
              data-winner={
                !!result && !spinning && index === track?.selectedIndex
              }
              style={
                {
                  "--dish-accent": chestAccent(food?.favoriteScore ?? 0),
                } as CSSProperties
              }
            >
              <span className="food-chest-card-label">
                {food ? foodChestLabel(food.favoriteScore) : "Ẩn món"}
              </span>
              <FoodChestArtwork
                name={food?.name ?? ""}
                method={food?.cookingMethod ?? ""}
              />
              <div className="food-chest-card-caption">
                <p>{food?.name ?? "Món ngon đang chờ"}</p>
                <span>{food?.cookingMethod ?? "Mở hòm để khám phá"}</span>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

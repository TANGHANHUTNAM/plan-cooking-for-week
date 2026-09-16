"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { FoodChestLabel } from "@/lib/dto";

export type FoodChestCue = "click" | "tick" | "open" | "reward";

const SOUND_PREFERENCE_KEY = "pf:food-chest:sound-enabled";
const SOUND_PREFERENCE_EVENT = "pf-food-chest-sound-change";
const SOUND_SOURCES: Record<FoodChestCue, string> = {
  click: "/sounds/new-sounds/ui-press.mp3",
  tick: "/sounds/new-sounds/tick.wav",
  open: "/sounds/new-sounds/opening.wav",
  reward: "/sounds/new-sounds/reveal.wav",
};

const REWARD_SOURCES: Record<FoodChestLabel, string> = {
  "Món tủ": "/sounds/new-sounds/reveal-mythical.wav",
  "Hợp gu": "/sounds/new-sounds/reveal-legendary.wav",
  "Đổi vị": "/sounds/new-sounds/reveal-ancient.wav",
};

const SOUND_VOLUMES: Record<FoodChestCue, number> = {
  click: 0.55,
  tick: 0.28,
  open: 0.65,
  reward: 0.7,
};

function soundPreferenceSnapshot(): boolean {
  try {
    return window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== "0";
  } catch {
    return true;
  }
}

function subscribeToSoundPreference(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener(SOUND_PREFERENCE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SOUND_PREFERENCE_EVENT, onChange);
  };
}

/** Local, opt-out SFX for the chest flow. Audio failures never block the meal action. */
export function useFoodChestAudio() {
  const enabled = useSyncExternalStore(
    subscribeToSoundPreference,
    soundPreferenceSnapshot,
    () => true
  );
  const players = useRef<Record<string, HTMLAudioElement>>({});
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const playerFor = useCallback((key: string, source: string) => {
    const existing = players.current[key];
    if (existing) return existing;

    const audio = new Audio(source);
    audio.preload = "auto";
    players.current[key] = audio;
    return audio;
  }, []);

  const playSource = useCallback(
    (key: string, source: string, volume: number) => {
      if (!enabledRef.current || typeof window === "undefined") return;
      const audio = playerFor(key, source);
      audio.currentTime = 0;
      audio.volume = volume;
      void audio.play().catch(() => {
        // A browser may reject playback; the visual flow remains usable.
      });
    },
    [playerFor]
  );

  const play = useCallback(
    (cue: FoodChestCue) => {
      playSource(cue, SOUND_SOURCES[cue], SOUND_VOLUMES[cue]);
    },
    [playSource]
  );

  const playReward = useCallback(
    (label: FoodChestLabel) => {
      playSource(`reward:${label}`, REWARD_SOURCES[label], 0.72);
    },
    [playSource]
  );

  const prepareReward = useCallback(
    (label: FoodChestLabel) => {
      if (!enabledRef.current || typeof window === "undefined") return;
      playerFor(`reward:${label}`, REWARD_SOURCES[label]).load();
    },
    [playerFor]
  );

  const stopAll = useCallback(() => {
    for (const audio of Object.values(players.current)) {
      if (!audio) continue;
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  useEffect(() => {
    if (!enabled) stopAll();
  }, [enabled, stopAll]);

  useEffect(() => {
    // Warm short cues before the first marker crossing; result audio loads during the spin.
    for (const cue of ["click", "tick", "open"] as const) {
      playerFor(cue, SOUND_SOURCES[cue]);
    }
  }, [playerFor]);

  const toggle = useCallback(() => {
    const next = !enabled;
    try {
      window.localStorage.setItem(SOUND_PREFERENCE_KEY, next ? "1" : "0");
    } catch {
      // The button still works for this session when storage is unavailable.
    }
    window.dispatchEvent(new Event(SOUND_PREFERENCE_EVENT));
    if (!next) stopAll();
  }, [enabled, stopAll]);

  return { enabled, play, playReward, prepareReward, stopAll, toggle };
}

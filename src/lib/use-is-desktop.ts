"use client";

import { useSyncExternalStore } from "react";

// matches Tailwind's `lg` breakpoint, where the sidebar replaces the bottom nav
const QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** true for a desktop-sized viewport; false during SSR. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}

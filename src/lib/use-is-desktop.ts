"use client";

import { useSyncExternalStore } from "react";

// khớp breakpoint `lg` của Tailwind — nơi sidebar thay bottom nav
const QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** true khi viewport cỡ desktop; false trong lúc SSR. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}

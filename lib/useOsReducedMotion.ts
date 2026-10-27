"use client";
import { useSyncExternalStore } from "react";

const RM = "(prefers-reduced-motion: reduce)";

const subscribe = (cb: () => void) => {
  const m = window.matchMedia?.(RM);
  m?.addEventListener("change", cb);
  return () => m?.removeEventListener("change", cb);
};
const snapshot = () => !!window.matchMedia?.(RM).matches;

/** The OS "reduce motion" setting. Starts false on the server so hydration matches the static HTML. */
export function useOsReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

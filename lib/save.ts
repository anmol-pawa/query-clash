"use client";
/**
 * Progress lives in localStorage (per browser). Everything is wrapped in
 * try/catch so private windows and blocked storage just mean "no saves".
 */
import { useSyncExternalStore } from "react";
import type { Dialect } from "./dialect/lint";
import { Dex, migrateDex } from "@/game/engine/querydex";
import { EMPTY_DAILY, type DailyState } from "./daily";
import type { LeitnerState, TopicStats } from "./leitner";
import type { MockResult } from "./mock";

export interface Settings {
  volume: number;
  music: boolean;
  reducedMotion: boolean;
  zen: boolean; // no round timer
}

export interface SaveData {
  version: 1;
  dialect: Dialect;
  xp: number;
  stars: Record<number, number>; // chapter → best stars
  cleared: string[]; // mission ids won at least once
  codex: string[]; // unlocked codex ids
  quizzes: string[]; // codex ids whose quiz was answered correctly
  arenaBest: number;
  settings: Settings;
  seenIntro: boolean;
  dex: Dex; // captured bosses (Querydex)
  interview: string[]; // DBMS Interview question ids answered correctly at least once
  leitner: LeitnerState; // spaced-repetition box and due day per fixed interview question
  topicStats: TopicStats; // right / wrong answers per interview topic (weak-topic report)
  mockResults: MockResult[]; // scorecards of the last mock interviews, newest first
  daily: DailyState; // daily challenge streak
}

const KEY = "query-clash-save-v1";

const DEFAULT: SaveData = {
  version: 1,
  dialect: "postgres",
  xp: 0,
  stars: {},
  cleared: [],
  codex: ["select", "where", "null"],
  quizzes: [],
  arenaBest: 0,
  settings: { volume: 0.6, music: true, reducedMotion: false, zen: false },
  seenIntro: false,
  dex: {},
  interview: [],
  leitner: {},
  topicStats: {},
  mockResults: [],
  daily: EMPTY_DAILY,
};

let cache: SaveData | null = null;
const listeners = new Set<() => void>();

function load(): SaveData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const merged: SaveData = { ...DEFAULT, ...parsed, settings: { ...DEFAULT.settings, ...(parsed.settings ?? {}) } };
    cache = { ...merged, dex: migrateDex(parsed.dex, merged.stars) };
  } catch {
    cache = { ...DEFAULT };
  }
  return cache!;
}

export function getSave(): SaveData {
  return typeof window === "undefined" ? DEFAULT : load();
}

export function updateSave(fn: (s: SaveData) => SaveData) {
  cache = fn(load());
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

export function resetSave() {
  updateSave(() => ({ ...DEFAULT }));
}

export function useSave(): SaveData {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => load(),
    () => DEFAULT,
  );
}

export function unlockedChapters(s: SaveData): number {
  // chapter n+1 unlocks when chapter n has at least one star
  let n = 1;
  while (s.stars[n]) n++;
  return Math.min(n, 12);
}

export const level = (xp: number) => Math.floor(Math.sqrt(xp / 120)) + 1;

/**
 * The Querydex: a box of the chapter bosses you have captured. Beating a
 * campaign boss captures it (once); later wins only bump its win count and
 * best stars. Everything here is pure so it can be tested without storage.
 */
import { CHAPTERS } from "@/content/chapters";
import type { BossId, Chapter } from "@/content/types";
import { BOSS_TYPE, Matchup, SqlType, TYPE_CHART } from "./types";
import { bossLevel } from "./hud";

export interface DexRecord {
  /** Day of the first capture (YYYY-MM-DD), or "" for saves made before the Querydex. */
  caught: string;
  /** Campaign wins against this boss. */
  wins: number;
}

export type Dex = Partial<Record<BossId, DexRecord>>;

/** Record a campaign win against `boss` on `day`. Returns a new dex. */
export function capture(dex: Dex, boss: BossId, day: string): Dex {
  const prev = dex[boss];
  return { ...dex, [boss]: { caught: prev?.caught ?? day, wins: (prev?.wins ?? 0) + 1 } };
}

/** Saves from before the Querydex: every chapter with stars counts as captured (date unknown). */
export function migrateDex(dex: Dex | undefined, stars: Record<number, number>): Dex {
  const out: Dex = { ...(dex ?? {}) };
  for (const c of CHAPTERS) if (stars[c.n] && !out[c.boss]) out[c.boss] = { caught: "", wins: 1 };
  return out;
}

export const isCaught = (dex: Dex, boss: BossId) => !!dex[boss];

export const caughtCount = (dex: Dex) => CHAPTERS.filter((c) => dex[c.boss]).length;

/** Local calendar day as YYYY-MM-DD. */
export function dayOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export interface DexStats {
  no: string;
  chapter: Chapter;
  type: SqlType;
  level: number;
  hp: number;
  rounds: number;
  weak: Matchup[];
  resist: Matchup[];
}

/** A boss's Querydex card: the same numbers the campaign battle uses. */
export function dexStats(boss: BossId): DexStats {
  const chapter = CHAPTERS.find((c) => c.boss === boss);
  if (!chapter) throw new Error(`no chapter for boss ${boss}`);
  const type = BOSS_TYPE[boss];
  return {
    no: String(chapter.n).padStart(3, "0"),
    chapter,
    type,
    level: bossLevel(chapter.n),
    hp: 100 * chapter.missions.length,
    rounds: chapter.missions.length,
    weak: TYPE_CHART[type].weak,
    resist: TYPE_CHART[type].resist,
  };
}

/** The starter evolves after capturing the boss of each of these chapters. */
export const EVOLVE_AFTER: readonly number[] = [3, 7];

/**
 * The starter's evolution stage (0 = BYTEBAT, 1 = KILOBAT, …): one step per
 * milestone chapter whose boss is in the dex, capped at the last form drawn.
 */
export function starterStage(dex: Dex, forms: number): number {
  const reached = EVOLVE_AFTER.filter((n) => {
    const c = CHAPTERS.find((ch) => ch.n === n);
    return !!c && !!dex[c.boss];
  }).length;
  return Math.max(0, Math.min(reached, forms - 1));
}

/**
 * The stage a capture just evolved the starter into, or null if it didn't
 * (for the victory screen's evolution scene).
 */
export function evolvedBy(before: Dex, after: Dex, forms: number): number | null {
  const a = starterStage(before, forms);
  const b = starterStage(after, forms);
  return b > a ? b : null;
}

/**
 * The stage that capturing `boss` for the first time evolved the starter
 * into, read back from the dex after the capture (null if this boss has been
 * beaten before, or came from a migrated save, or its capture evolved nothing).
 */
export function evolvedByCapture(dex: Dex, boss: BossId, forms: number): number | null {
  const rec = dex[boss];
  if (!rec || rec.wins !== 1 || !rec.caught) return null;
  const before: Dex = { ...dex };
  delete before[boss];
  return evolvedBy(before, dex, forms);
}

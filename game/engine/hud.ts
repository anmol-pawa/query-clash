/**
 * Pure helpers for the handheld-style HP boxes on the battle stage: bar
 * colour bands, creature levels and progress toward the next level.
 */

/** HP bar colour band: green above half, yellow above a fifth, red below. */
export type HpTone = "high" | "mid" | "low";

export function hpTone(hp: number, maxHp: number): HpTone {
  const pct = maxHp > 0 ? hp / maxHp : 0;
  if (pct > 0.5) return "high";
  if (pct > 0.2) return "mid";
  return "low";
}

/** XP needed to reach `lvl` (matches `level()` in lib/save: L = ⌊√(xp/120)⌋ + 1). */
export const xpForLevel = (lvl: number) => 120 * (Math.max(1, lvl) - 1) ** 2;

export const levelFor = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 120)) + 1;

/** Fraction (0–1) of the way from the current level to the next. */
export function xpProgress(xp: number): number {
  const lvl = levelFor(xp);
  const lo = xpForLevel(lvl);
  const hi = xpForLevel(lvl + 1);
  return Math.min(1, Math.max(0, (xp - lo) / (hi - lo)));
}

/** A chapter boss's level: chapter 1 is Lv 5, each chapter adds 5. */
export const bossLevel = (chapter: number) => 5 * Math.max(1, chapter);

/** Endless Arena foes keep climbing: one level per wave on top of the boss's own. */
export const arenaFoeLevel = (chapter: number, wave: number) => bossLevel(chapter) + Math.max(0, wave - 1);

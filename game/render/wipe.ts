/**
 * Battle-start transition, as a pure timeline: two encounter flashes, dark
 * bands that sweep shut from alternating edges, a short hold, then the
 * screen opens again as a diagonal block dissolve (top-left first). The
 * component in `components/battle/BattleWipe.tsx` draws one `wipeFrame` per
 * animation frame; everything here is plain numbers so it can be tested.
 */

export const WIPE = {
  flashEnd: 240,
  bandsStart: 240,
  bandStagger: 22,
  bandDur: 230,
  bands: 8,
  revealStart: 780,
  revealSpread: 380,
  blockDur: 200,
  /** Shrink steps per block, so the dissolve stays chunky and pixel-like. */
  blockSteps: 4,
} as const;

/** Total length in ms; after this the overlay is gone. */
export const WIPE_MS = WIPE.revealStart + WIPE.revealSpread + WIPE.blockDur;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const outCubic = (x: number) => 1 - (1 - x) ** 3;

/** White flash opacity: two quick blinks over the first 240 ms. */
export function flashAlpha(t: number): number {
  if (t < 0 || t >= WIPE.flashEnd) return 0;
  return Math.floor(t / 60) % 2 === 0 ? 0.85 : 0;
}

/** How far band `i` has closed (0 open … 1 covering its row), before the reveal. */
export function bandCover(t: number, i: number): number {
  return outCubic(clamp01((t - WIPE.bandsStart - i * WIPE.bandStagger) / WIPE.bandDur));
}

/** Bands sweep in from the left on even rows and from the right on odd ones. */
export const bandFromLeft = (i: number) => i % 2 === 0;

/**
 * Size of the dark block at grid cell (col, row) as a fraction of a full
 * cell (1 covers it, 0 is gone). Before the reveal every block is full;
 * blocks then shrink in quantised steps along the top-left → bottom-right
 * diagonal.
 */
export function blockScale(t: number, col: number, row: number, cols: number, rows: number): number {
  const diag = cols + rows - 2;
  const delay = diag > 0 ? ((col + row) / diag) * WIPE.revealSpread : 0;
  const p = clamp01((t - WIPE.revealStart - delay) / WIPE.blockDur);
  return 1 - Math.ceil(p * WIPE.blockSteps) / WIPE.blockSteps;
}

/** Grid that covers a w×h viewport with square cells about `w/10` wide (at least 40 px). */
export function wipeGrid(w: number, h: number): { size: number; cols: number; rows: number } {
  const size = Math.max(40, Math.ceil(Math.max(w, h) / 12));
  return { size, cols: Math.ceil(w / size), rows: Math.ceil(h / size) };
}

export type WipePhase = "flash" | "bands" | "hold" | "reveal" | "done";

export function wipePhase(t: number): WipePhase {
  if (t < WIPE.flashEnd) return "flash";
  if (t < WIPE.bandsStart + (WIPE.bands - 1) * WIPE.bandStagger + WIPE.bandDur) return "bands";
  if (t < WIPE.revealStart) return "hold";
  if (t < WIPE_MS) return "reveal";
  return "done";
}

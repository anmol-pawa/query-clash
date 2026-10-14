import { describe, expect, it } from "vitest";
import { WIPE, WIPE_MS, bandCover, bandFromLeft, blockScale, flashAlpha, wipeGrid, wipePhase } from "@/game/render/wipe";

describe("battle-start wipe", () => {
  it("flashes twice, then stops flashing", () => {
    const on = [0, 30, 120, 150].map(flashAlpha);
    const off = [70, 190, 240, 500, -1].map(flashAlpha);
    expect(on.every((a) => a > 0)).toBe(true);
    expect(off.every((a) => a === 0)).toBe(true);
  });

  it("closes every band before the reveal, staggered top to bottom", () => {
    for (let i = 0; i < WIPE.bands; i++) {
      expect(bandCover(WIPE.bandsStart - 1, i)).toBe(0);
      expect(bandCover(WIPE.revealStart, i)).toBe(1);
    }
    const mid = WIPE.bandsStart + 100;
    expect(bandCover(mid, 0)).toBeGreaterThan(bandCover(mid, 4));
    expect(bandFromLeft(0)).toBe(true);
    expect(bandFromLeft(1)).toBe(false);
  });

  it("keeps the screen covered until the reveal, then dissolves diagonally", () => {
    const { cols, rows } = wipeGrid(390, 844);
    expect(blockScale(WIPE.revealStart, 0, 0, cols, rows)).toBe(1);
    expect(blockScale(WIPE.revealStart - 1, cols - 1, rows - 1, cols, rows)).toBe(1);
    const t = WIPE.revealStart + WIPE.revealSpread / 2;
    expect(blockScale(t, 0, 0, cols, rows)).toBe(0);
    expect(blockScale(t, cols - 1, rows - 1, cols, rows)).toBe(1);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) expect(blockScale(WIPE_MS, c, r, cols, rows)).toBe(0);
  });

  it("shrinks blocks in whole pixel steps", () => {
    const seen = new Set<number>();
    for (let t = WIPE.revealStart; t <= WIPE.revealStart + WIPE.blockDur; t += 5) seen.add(blockScale(t, 0, 0, 4, 4));
    expect([...seen].sort()).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it("covers the viewport with square cells", () => {
    for (const [w, h] of [[390, 844], [1280, 900], [320, 568]]) {
      const g = wipeGrid(w, h);
      expect(g.cols * g.size).toBeGreaterThanOrEqual(w);
      expect(g.rows * g.size).toBeGreaterThanOrEqual(h);
      expect(g.size).toBeGreaterThanOrEqual(40);
    }
  });

  it("runs flash → bands → hold → reveal → done in about 1.4 s", () => {
    expect([0, 300, 740, 900, WIPE_MS].map(wipePhase)).toEqual(["flash", "bands", "hold", "reveal", "done"]);
    expect(WIPE_MS).toBeLessThan(1600);
  });
});

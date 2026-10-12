import { describe, expect, it } from "vitest";
import { arenaFoeLevel, bossLevel, hpTone, levelFor, xpForLevel, xpProgress } from "@/game/engine/hud";
import { level } from "@/lib/save";

describe("HP box helpers", () => {
  it("bands HP into green / yellow / red", () => {
    expect(hpTone(100, 100)).toBe("high");
    expect(hpTone(51, 100)).toBe("high");
    expect(hpTone(50, 100)).toBe("mid");
    expect(hpTone(21, 100)).toBe("mid");
    expect(hpTone(20, 100)).toBe("low");
    expect(hpTone(0, 100)).toBe("low");
    expect(hpTone(5, 0)).toBe("low");
  });

  it("levels agree with the save's level formula", () => {
    for (const xp of [0, 1, 119, 120, 479, 480, 1080, 5000, 123456]) expect(levelFor(xp)).toBe(level(xp));
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(120);
    expect(xpForLevel(3)).toBe(480);
    for (let l = 1; l < 30; l++) expect(levelFor(xpForLevel(l))).toBe(l);
  });

  it("XP progress runs 0 → 1 within a level", () => {
    expect(xpProgress(0)).toBe(0);
    expect(xpProgress(60)).toBeCloseTo(0.5);
    expect(xpProgress(120)).toBe(0); // just reached Lv 2
    expect(xpProgress(300)).toBeCloseTo(0.5); // halfway from 120 to 480
    for (let xp = 0; xp < 5000; xp += 37) {
      const p = xpProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });

  it("bosses get tougher each chapter and each arena wave", () => {
    expect(bossLevel(1)).toBe(5);
    expect(bossLevel(10)).toBe(50);
    for (let c = 1; c < 10; c++) expect(bossLevel(c + 1)).toBeGreaterThan(bossLevel(c));
    expect(arenaFoeLevel(3, 1)).toBe(bossLevel(3));
    expect(arenaFoeLevel(3, 4)).toBe(bossLevel(3) + 3);
  });
});

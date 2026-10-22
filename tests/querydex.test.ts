import { describe, expect, it } from "vitest";
import { CHAPTERS } from "@/content/chapters";
import { BOSS_TYPE, TYPE_CHART } from "@/game/engine/types";
import { bossLevel } from "@/game/engine/hud";
import { EVOLVE_AFTER, capture, caughtCount, dayOf, dexStats, evolvedBy, isCaught, migrateDex, starterStage, type Dex } from "@/game/engine/querydex";
import { bossSprite } from "@/game/sprites/roster";

describe("Querydex", () => {
  it("captures a boss on the first win and keeps the first date after", () => {
    let dex = capture({}, "nulloth", "2026-10-13");
    expect(dex.nulloth).toEqual({ caught: "2026-10-13", wins: 1 });
    dex = capture(dex, "nulloth", "2026-10-20");
    expect(dex.nulloth).toEqual({ caught: "2026-10-13", wins: 2 });
    expect(isCaught(dex, "nulloth")).toBe(true);
    expect(isCaught(dex, "hydra")).toBe(false);
    expect(caughtCount(dex)).toBe(1);
  });

  it("does not mutate the old dex", () => {
    const before = {};
    capture(before, "aggregon", "2026-10-13");
    expect(before).toEqual({});
  });

  it("migrates saves from before the Querydex from chapter stars", () => {
    const dex = migrateDex(undefined, { 1: 3, 2: 1 });
    expect(dex).toEqual({ nulloth: { caught: "", wins: 1 }, joinmaster: { caught: "", wins: 1 } });
    // existing records win over the migration
    expect(migrateDex({ nulloth: { caught: "2026-10-01", wins: 4 } }, { 1: 2 }).nulloth).toEqual({ caught: "2026-10-01", wins: 4 });
    expect(migrateDex(undefined, {})).toEqual({});
  });

  it("formats the local day", () => {
    expect(dayOf(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("has a card for every boss with the battle's own numbers", () => {
    for (const c of CHAPTERS) {
      const st = dexStats(c.boss);
      expect(st.no).toBe(String(c.n).padStart(3, "0"));
      expect(st.level).toBe(bossLevel(c.n));
      expect(st.hp).toBe(100 * c.missions.length);
      expect(st.type).toBe(BOSS_TYPE[c.boss]);
      expect(st.weak).toEqual(TYPE_CHART[st.type].weak);
      expect(st.weak.some((m) => m.type === st.type)).toBe(true);
      expect(bossSprite(c.boss).anims.idle.length).toBeGreaterThanOrEqual(2);
    }
    expect(caughtCount(Object.fromEntries(CHAPTERS.map((c) => [c.boss, { caught: "", wins: 1 }])))).toBe(12);
  });
});

describe("starter evolution", () => {
  const boss = (n: number) => CHAPTERS.find((c) => c.n === n)!.boss;
  const win = (dex: Dex, ...ns: number[]) => ns.reduce((d, n) => capture(d, boss(n), "2026-10-13"), dex);

  it("evolves after chapters 3 and 7", () => {
    expect(EVOLVE_AFTER).toEqual([3, 7]);
    expect(starterStage({}, 3)).toBe(0);
    expect(starterStage(win({}, 1, 2), 3)).toBe(0);
    expect(starterStage(win({}, 1, 2, 3), 3)).toBe(1);
    expect(starterStage(win({}, 1, 2, 3, 4, 5, 6), 3)).toBe(1);
    expect(starterStage(win({}, 1, 2, 3, 4, 5, 6, 7), 3)).toBe(2);
  });

  it("caps the stage at the last form that exists", () => {
    const all = win({}, ...CHAPTERS.map((c) => c.n));
    expect(starterStage(all, 2)).toBe(1);
    expect(starterStage(all, 1)).toBe(0);
  });

  it("reports the stage a capture evolved into, once", () => {
    const before = win({}, 1, 2);
    const after = win(before, 3);
    expect(evolvedBy(before, after, 3)).toBe(1);
    expect(evolvedBy(after, win(after, 3), 3)).toBeNull();
    expect(evolvedBy(after, win(after, 4), 3)).toBeNull();
    expect(evolvedBy(win(after, 4, 5, 6), win(after, 4, 5, 6, 7), 3)).toBe(2);
    // a migrated save that already had chapter 3 doesn't replay the evolution
    const migrated = migrateDex(undefined, { 1: 3, 2: 2, 3: 1 });
    expect(evolvedBy(migrated, capture(migrated, boss(3), "2026-10-13"), 3)).toBeNull();
  });
});

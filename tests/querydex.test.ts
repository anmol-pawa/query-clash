import { describe, expect, it } from "vitest";
import { CHAPTERS } from "@/content/chapters";
import { BOSS_TYPE, TYPE_CHART } from "@/game/engine/types";
import { bossLevel } from "@/game/engine/hud";
import { capture, caughtCount, dayOf, dexStats, isCaught, migrateDex } from "@/game/engine/querydex";
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
    expect(caughtCount(Object.fromEntries(CHAPTERS.map((c) => [c.boss, { caught: "", wins: 1 }])))).toBe(10);
  });
});

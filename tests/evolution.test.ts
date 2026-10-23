import { describe, expect, it } from "vitest";
import { CHAPTERS } from "@/content/chapters";
import { capture, evolvedByCapture, migrateDex, type Dex } from "@/game/engine/querydex";
import { evolutionTimeline } from "@/game/sprites/evolution";
import { STARTER_LINE, starterSprite, starterStageOf } from "@/game/sprites/roster";

const boss = (n: number) => CHAPTERS.find((c) => c.n === n)!.boss;
const win = (dex: Dex, ...ns: number[]) => ns.reduce((d, n) => capture(d, boss(n), "2026-10-13"), dex);
const white = (f: readonly string[]) => {
  const px = f.join("").replace(/\./g, "");
  return [...px].filter((c) => c === "w").length / px.length;
};

describe("starter stage of a save", () => {
  it("is BYTEBAT until chapter 3's boss is captured, then KILOBAT", () => {
    expect(starterSprite("front", starterStageOf({})).name).toBe("BYTEBAT");
    expect(starterSprite("back", starterStageOf(win({}, 1, 2))).id).toBe("bytebat-back");
    expect(starterSprite("front", starterStageOf(win({}, 1, 2, 3))).name).toBe("KILOBAT");
    expect(starterSprite("back", starterStageOf(win({}, 1, 2, 3))).id).toBe("kilobat-back");
  });
  it("becomes GIGAVERN once chapter 7's boss is captured too", () => {
    expect(starterSprite("front", starterStageOf(win({}, 1, 2, 3, 4, 5, 6))).name).toBe("KILOBAT");
    expect(starterSprite("front", starterStageOf(win({}, 1, 2, 3, 4, 5, 6, 7))).name).toBe("GIGAVERN");
    expect(starterSprite("back", starterStageOf(win({}, 3, 7))).id).toBe("gigavern-back");
  });
  it("never points past the last drawn form", () => {
    expect(STARTER_LINE).toHaveLength(3);
    expect(starterStageOf(win({}, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10))).toBe(STARTER_LINE.length - 1);
  });
});

describe("evolution timeline KILOBAT → GIGAVERN", () => {
  const steps = evolutionTimeline(starterSprite("front", 1), starterSprite("front", 2));
  it("morphs KILOBAT's silhouette into GIGAVERN's and ends on GIGAVERN in colour", () => {
    expect(steps[0].def.id).toBe("kilobat");
    const morph = steps.filter((s) => s.beat === "morph");
    morph.forEach((s, i) => expect(s.def.id).toBe(i % 2 ? "gigavern" : "kilobat"));
    const last = steps[steps.length - 1];
    expect(last.def.id).toBe("gigavern");
    expect(white(last.frame)).toBeLessThan(0.1);
  });
});

describe("evolution timeline BYTEBAT → KILOBAT", () => {
  const from = starterSprite("front", 0);
  const to = starterSprite("front", 1);
  const steps = evolutionTimeline(from, to);

  it("starts on the old form in colour and ends on the new form in colour", () => {
    expect(steps[0].def.id).toBe("bytebat");
    expect(steps[0].beat).toBe("before");
    expect(white(steps[0].frame)).toBeLessThan(0.1);
    const last = steps[steps.length - 1];
    expect(last.def.id).toBe("kilobat");
    expect(last.frame).toBe(to.anims.evolve[0]);
    expect(white(last.frame)).toBeLessThan(0.1);
  });

  it("runs its beats in order: before → glow → morph → reveal", () => {
    const order = ["before", "glow", "morph", "reveal"];
    const seen = steps.map((s) => order.indexOf(s.beat));
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    expect(new Set(steps.map((s) => s.beat)).size).toBe(4);
  });

  it("morphs between two white silhouettes, alternating forms and speeding up", () => {
    const morph = steps.filter((s) => s.beat === "morph");
    expect(morph.length).toBeGreaterThanOrEqual(8);
    morph.forEach((s, i) => {
      expect(s.def.id).toBe(i % 2 ? "kilobat" : "bytebat");
      expect(white(s.frame)).toBeGreaterThan(0.75);
    });
    expect(morph[morph.length - 1].ms).toBeLessThan(morph[0].ms);
    for (let i = 2; i < morph.length; i++) expect(morph[i].ms).toBeLessThanOrEqual(morph[i - 2].ms);
  });

  it("lasts a few seconds", () => {
    const total = steps.reduce((a, s) => a + s.ms, 0);
    expect(total).toBeGreaterThan(3000);
    expect(total).toBeLessThan(9000);
  });

  it("rejects forms without an evolve animation or of different sizes", () => {
    const boss = { ...from, id: "x", anims: { idle: from.anims.idle } };
    expect(() => evolutionTimeline(boss, to)).toThrow(/evolve/);
    expect(() => evolutionTimeline(from, { ...to, w: 32 })).toThrow(/size/);
  });
});

describe("evolvedByCapture (the victory card's evolution, read back from the saved dex)", () => {
  const forms = STARTER_LINE.length;
  it("reports KILOBAT right after chapter 3's boss is first captured", () => {
    expect(evolvedByCapture(win({}, 1, 2, 3), boss(3), forms)).toBe(1);
  });
  it("is null before the capture is recorded, on a re-win, and for other chapters", () => {
    expect(evolvedByCapture(win({}, 1, 2), boss(3), forms)).toBeNull();
    expect(evolvedByCapture(win({}, 1, 2, 3, 3), boss(3), forms)).toBeNull();
    expect(evolvedByCapture(win({}, 1, 2, 3), boss(2), forms)).toBeNull();
    expect(evolvedByCapture(win({}, 1, 2, 3, 4), boss(4), forms)).toBeNull();
  });
  it("reports GIGAVERN right after chapter 7's boss is first captured, and nothing on chapters between", () => {
    expect(evolvedByCapture(win({}, 1, 2, 3, 4, 5, 6, 7), boss(7), forms)).toBe(2);
    expect(evolvedByCapture(win({}, 1, 2, 3, 4, 5, 6), boss(6), forms)).toBeNull();
    expect(evolvedByCapture(win({}, 1, 2, 3, 4, 5, 6, 7, 7), boss(7), forms)).toBeNull();
    expect(evolvedByCapture(win({}, 1, 2, 3, 4, 5, 6, 7, 8), boss(8), forms)).toBeNull();
  });
  it("never replays for a capture migrated from an old save", () => {
    const migrated = migrateDex({}, { 1: 3, 2: 2, 3: 1 });
    expect(evolvedByCapture(migrated, boss(3), forms)).toBeNull();
  });
});

describe("evolution sparkles", () => {
  it("are absent before the glow and stay deterministic and near the sprite", async () => {
    const { evolutionSparkles } = await import("@/game/sprites/evolution");
    expect(evolutionSparkles("before", 3, 64, 64)).toEqual([]);
    for (const beat of ["glow", "morph", "reveal"] as const) {
      const a = evolutionSparkles(beat, 5, 64, 64);
      expect(a.length).toBeGreaterThanOrEqual(4);
      expect(evolutionSparkles(beat, 5, 64, 64)).toEqual(a);
      for (const s of a) {
        expect(s.x).toBeGreaterThan(-40);
        expect(s.x).toBeLessThan(104);
      }
    }
  });
});

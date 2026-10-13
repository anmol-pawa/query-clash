import { describe, expect, it } from "vitest";
import { SPRITES } from "@/game/sprites";
import { BOSS_SPRITE, BOSS_STYLE, STARTER, STARTER_LINE, bossSprite, starterSprite } from "@/game/sprites/roster";
import { CHAPTERS } from "@/content/chapters";
import { bounds, frameToRGBA, mirror, overlay, shift, validateSprite, type SpriteDef } from "@/game/sprites/pixel";

describe("sprite library", () => {
  it("has unique ids", () => {
    expect(new Set(SPRITES.map((s) => s.id)).size).toBe(SPRITES.length);
  });

  for (const s of SPRITES) {
    describe(s.id, () => {
      it("is rectangular, uses only palette keys and has a 2–4 frame idle", () => {
        expect(validateSprite(s)).toEqual([]);
      });
      it("is at least 64×64 and not empty", () => {
        expect(s.w).toBeGreaterThanOrEqual(64);
        expect(s.h).toBeGreaterThanOrEqual(64);
        for (const frames of Object.values(s.anims)) for (const f of frames) expect(bounds(f)).not.toBeNull();
      });
      it("uses a limited palette", () => {
        expect(Object.keys(s.palette).length).toBeLessThanOrEqual(24);
      });
      it("has attack, hurt and faint animations, and faint ends lower or sparser", () => {
        for (const a of ["attack", "hurt", "faint"]) expect(s.anims[a]?.length ?? 0).toBeGreaterThan(0);
        const opaque = (f: readonly string[]) => f.join("").replace(/\./g, "").length;
        const first = s.anims.faint[0];
        const last = s.anims.faint[s.anims.faint.length - 1];
        expect(bounds(last)!.y > bounds(first)!.y || opaque(last) < opaque(first)).toBe(true);
      });
      it("idle frames actually differ (it animates)", () => {
        expect(new Set(s.anims.idle.map((f) => f.join("\n"))).size).toBeGreaterThan(1);
      });
    });
  }
});

describe("creature roster", () => {
  it("BYTEBAT has a back sprite and bosses are 96×96", () => {
    const ids = SPRITES.map((s) => s.id);
    expect(ids).toContain("bytebat-back");
    for (const id of ["nulloth", "joinmaster", "aggregon", "frostnest", "rowreaper", "transactor", "schemaforge", "galeframe", "recursa", "opticore"]) {
      const boss = SPRITES.find((s) => s.id === id);
      expect(boss, id).toBeDefined();
      expect([boss!.w, boss!.h]).toEqual([96, 96]);
    }
  });
});

describe("sprite lookup", () => {
  it("every chapter boss has its own 96×96 sprite", () => {
    const ids = CHAPTERS.map((c) => bossSprite(c.boss).id);
    expect(new Set(ids).size).toBe(CHAPTERS.length);
    for (const c of CHAPTERS) expect([bossSprite(c.boss).w, bossSprite(c.boss).h], c.boss).toEqual([96, 96]);
  });
  it("maps the bosses whose sprite is renamed", () => {
    expect(BOSS_SPRITE.subzero).toBe("frostnest");
    expect(bossSprite("windwraith").name).toBe("GALEFRAME");
    expect(Object.keys(BOSS_SPRITE)).toHaveLength(10);
  });
  it("the starter is BYTEBAT with front and back sprites", () => {
    expect(STARTER).toEqual({ front: "bytebat", back: "bytebat-back" });
    expect(starterSprite("front").name).toBe("BYTEBAT");
    expect(starterSprite("back").anims.idle.length).toBeGreaterThan(1);
  });
  it("the starter evolves BYTEBAT → KILOBAT → GIGAVERN, each form 64×64 with a back sprite, clamped past the last form", () => {
    expect(STARTER_LINE[0]).toBe(STARTER);
    expect(STARTER_LINE.map((_, i) => starterSprite("front", i).name)).toEqual(["BYTEBAT", "KILOBAT", "GIGAVERN"]);
    for (let i = 0; i < STARTER_LINE.length; i++) {
      for (const side of ["front", "back"] as const) expect([starterSprite(side, i).w, starterSprite(side, i).h]).toEqual([64, 64]);
      expect(starterSprite("back", i).id).toBe(`${starterSprite("front", i).id}-back`);
    }
    expect(starterSprite("front", 99).id).toBe(STARTER_LINE[STARTER_LINE.length - 1].front);
    expect(starterSprite("front", -1).id).toBe("bytebat");
  });
  it("every boss keeps a distinct counter-attack style for the battle stage", () => {
    const styles = CHAPTERS.map((c) => BOSS_STYLE[c.boss].style);
    expect(new Set(styles).size).toBe(CHAPTERS.length);
    expect(BOSS_STYLE.hydra.style).toBe("breath");
  });
  it("every battle sprite has the animations the stage plays", () => {
    const starters = STARTER_LINE.flatMap((_, i) => [starterSprite("back", i), starterSprite("front", i)]);
    for (const def of [...CHAPTERS.map((c) => bossSprite(c.boss)), ...starters])
      for (const anim of ["idle", "attack", "hurt", "faint"]) expect(def.anims[anim], `${def.id}.${anim}`).toBeDefined();
  });
});

describe.each([0, 1, 2])("starter stage %i evolve", (stage) => {
  const evolve = starterSprite("front", stage).anims.evolve ?? [];
  const white = (f: readonly string[]) => {
    const px = f.join("").replace(/\./g, "");
    return [...px].filter((c) => c === "w").length / px.length;
  };
  it("has 6+ frames that start in colour and fade to a white silhouette", () => {
    expect(evolve.length).toBeGreaterThanOrEqual(6);
    expect(white(evolve[0])).toBeLessThan(0.1);
    expect(white(evolve[1])).toBeGreaterThan(white(evolve[0]));
    expect(white(evolve[3])).toBeGreaterThan(0.75);
  });
  it("the silhouette morphs (changes shape) between frames", () => {
    const sizes = evolve.slice(3).map((f) => f.join("").replace(/\./g, "").length);
    expect(new Set(sizes).size).toBeGreaterThan(2);
  });
});

describe("pixel helpers", () => {
  const tiny: SpriteDef = { id: "t", name: "T", w: 3, h: 2, palette: { a: "#ff0000", b: "#00ff80" }, anims: { idle: [["a.b", "..a"], ["b.a", "a.."]] } };

  it("validates good and bad sprites", () => {
    expect(validateSprite(tiny)).toEqual([]);
    const bad: SpriteDef = { ...tiny, palette: { a: "red", ".": "#000000" }, anims: { idle: [["a.bz", "a"]] } };
    const errs = validateSprite(bad);
    expect(errs.some((e) => e.includes("not #rrggbb"))).toBe(true);
    expect(errs.some((e) => e.includes('must not define "."'))).toBe(true);
    expect(errs.some((e) => e.includes("4 cols, want 3"))).toBe(true);
    expect(errs.some((e) => e.includes('"z" not in palette'))).toBe(true);
    expect(errs.some((e) => e.includes("idle has 1 frames"))).toBe(true);
  });

  it("converts a frame to RGBA with transparency", () => {
    const px = frameToRGBA(tiny, tiny.anims.idle[0]);
    expect([...px.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect(px[7]).toBe(0); // "." is transparent
    expect([...px.slice(8, 12)]).toEqual([0, 255, 128, 255]);
    const white = frameToRGBA(tiny, tiny.anims.idle[0], () => [255, 255, 255]);
    expect([...white.slice(8, 12)]).toEqual([255, 255, 255, 255]);
  });

  it("mirrors, shifts, overlays and measures frames", () => {
    expect(mirror(["ab.", "..a"])).toEqual([".ba", "a.."]);
    expect(shift(["ab.", "..a"], 1, 1)).toEqual(["...", ".ab"]);
    expect(shift(["ab.", "..a"], -1, 0)).toEqual(["b..", ".a."]);
    expect(overlay(["aaa", "aaa"], ["b.", ".b"], 1, 0)).toEqual(["aba", "aab"]);
    expect(bounds(["...", ".a.", "..a"])).toEqual({ x: 1, y: 1, w: 2, h: 2 });
    expect(bounds(["..", ".."])).toBeNull();
  });
});

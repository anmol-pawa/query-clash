import { describe, expect, it } from "vitest";
import { SPRITES } from "@/game/sprites";
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
      it("idle frames actually differ (it animates)", () => {
        expect(new Set(s.anims.idle.map((f) => f.join("\n"))).size).toBeGreaterThan(1);
      });
    });
  }
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

import { describe, expect, it } from "vitest";
import { FX_KINDS, fxFrames, fxRamp, fxSprite } from "@/game/sprites/effects";
import { bounds, validateSprite } from "@/game/sprites/pixel";

const count = (frame: readonly string[], ch: string) => frame.join("").split(ch).length - 1;

describe("pixel move effects", () => {
  it("every effect is a valid 4-frame sprite in any colour", () => {
    for (const kind of FX_KINDS)
      for (const color of [0x60a5fa, 0xf97316, 0x000000, 0xffffff]) {
        const def = fxSprite(kind, color);
        expect(validateSprite(def), `${kind}`).toEqual([]);
        expect(def.anims.idle).toHaveLength(4);
      }
  });

  it("caches one sprite per kind and colour", () => {
    expect(fxSprite("orb", 0x60a5fa)).toBe(fxSprite("orb", 0x60a5fa));
    expect(fxSprite("orb", 0x60a5fa).id).toBe("fx-orb-60a5fa");
    expect(fxSprite("orb", 0xf97316).id).not.toBe(fxSprite("orb", 0x60a5fa).id);
  });

  it("ramp runs from a dark outline through the spell colour to white", () => {
    const r = fxRamp(0x60a5fa);
    expect(r["3"]).toBe("#60a5fa");
    expect(r["6"]).toBe("#ffffff");
    const lum = (h: string) => {
      const n = parseInt(h.slice(1), 16);
      return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11;
    };
    const ls = (["1", "2", "3", "4", "5", "6"] as const).map((k) => lum(r[k]));
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeGreaterThan(ls[i - 1]);
  });

  it("shapes are outlined and shaded (outline, base or light and a white core)", () => {
    for (const kind of ["orb", "spark", "slash", "ring", "link", "meteor", "brick", "lance", "dome", "minion"] as const)
      fxFrames(kind).forEach((f, i) => {
        expect(count(f, "1"), `${kind}[${i}] outline`).toBeGreaterThan(0);
        expect(count(f, "4") + count(f, "5") + count(f, "6"), `${kind}[${i}] shading`).toBeGreaterThan(0);
      });
    expect(count(fxFrames("orb")[0], "6")).toBeGreaterThan(0);
  });

  it("the shock ring expands frame by frame", () => {
    const w = fxFrames("ring").map((f) => bounds(f)!.w);
    for (let i = 1; i < w.length; i++) expect(w[i]).toBeGreaterThan(w[i - 1]);
  });

  it("the impact spark bursts out then breaks up", () => {
    const [a, b, , d] = fxFrames("spark");
    expect(bounds(b)!.w).toBeGreaterThan(bounds(a)!.w);
    const filled = (f: readonly string[]) => f.join("").replace(/\./g, "").length;
    expect(filled(d)).toBeLessThan(filled(b));
  });

  it("beam sections tile along x with a white core in the middle row", () => {
    for (const f of fxFrames("beam")) {
      expect(f[7]).toMatch(/^6+$/);
      expect(f[0]).toMatch(/^\.+$/);
    }
  });

  it("the meteor's rock sits at the front (lower right) and its tail trails up-left", () => {
    for (const f of fxFrames("meteor")) {
      const b = bounds(f)!;
      expect(b.x + b.w).toBeGreaterThan(26);
      expect(b.y).toBeLessThan(6);
      expect(f[21][21]).not.toBe(".");
      expect(f[3][28]).toBe(".");
    }
  });

  it("the lance points right: the head narrows to a tip and the shaft is pale", () => {
    for (const f of fxFrames("lance")) {
      const height = (x: number) => f.filter((r) => r[x] !== ".").length;
      expect(height(33)).toBeGreaterThan(height(42));
      expect(f[7].slice(10, 28)).toMatch(/^6+$/);
    }
  });

  it("the brick's glint sweeps across and leaves on the last frame", () => {
    const whites = fxFrames("brick").map((f) => count(f, "6"));
    expect(whites[1]).toBeGreaterThan(0);
    expect(whites[3]).toBe(0);
  });

  it("the summoned imp has two eyes and its wings flap", () => {
    const fs = fxFrames("minion");
    for (const f of fs) expect(count(f, "6")).toBeGreaterThanOrEqual(2);
    expect(fs[0].join("")).not.toBe(fs[2].join(""));
  });

  it("the shield dome is a hollow hex: rim lit, centre left clear", () => {
    for (const f of fxFrames("dome")) {
      expect(f[23][23]).toBe(".");
      expect(bounds(f)!.w).toBeGreaterThan(40);
    }
  });
});

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
    for (const kind of ["orb", "spark", "slash", "ring", "link", "meteor", "brick", "lance", "dome", "minion", "gear", "gust", "shard"] as const)
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

describe("pixel effects for portals, join frame, surge and vortex", () => {
  it("are outlined and shaded on every frame", () => {
    for (const kind of ["portal", "grid", "wave", "vortex"] as const)
      fxFrames(kind).forEach((f, i) => {
        expect(count(f, "1"), `${kind}[${i}] outline`).toBeGreaterThan(0);
        expect(count(f, "4") + count(f, "5") + count(f, "6"), `${kind}[${i}] shading`).toBeGreaterThan(0);
      });
  });

  it("the portal is a tall oval whose swirl turns from frame to frame", () => {
    const fs = fxFrames("portal");
    for (const f of fs) {
      const b = bounds(f)!;
      expect(b.h).toBeGreaterThan(b.w * 1.8);
      expect(f[23][11]).toBe("6"); // bright eye in the middle
    }
    expect(fs[0].join("")).not.toBe(fs[1].join(""));
  });

  it("the join frame is a hollow 2×2 grid with a glint that moves round it", () => {
    const fs = fxFrames("grid");
    for (const f of fs) {
      expect(f[12][10]).toBe("."); // top-left cell is see-through
      expect(f[36][30]).toBe("."); // bottom-right cell too
      expect(f[12][19]).not.toBe("."); // the vertical divider
      expect(f[23][10]).not.toBe("."); // the horizontal divider
    }
    expect(new Set(fs.map((f) => f.join(""))).size).toBe(4);
  });

  it("the wave swells from the back (left) to a curling crest with a dark tube under it", () => {
    for (const f of fxFrames("wave")) {
      const top = (x: number) => f.findIndex((r) => r[x] !== ".");
      expect(top(8)).toBeGreaterThan(top(28)); // rises toward the crest
      expect(f.join("")).toMatch(/2/);
      expect(count(f, "6")).toBeGreaterThan(5); // foam on the lip
    }
  });

  it("the vortex has a white eye and its arms turn across the loop", () => {
    const fs = fxFrames("vortex");
    for (const f of fs) expect(f[23][23]).toBe("6");
    expect(new Set(fs.map((f) => f.join(""))).size).toBe(4);
  });

  it("the gear is a toothed cog with a see-through hub that turns across the loop", () => {
    const fs = fxFrames("gear");
    for (const f of fs) {
      expect(f[16][16]).toBe("."); // hub hole
      expect(f[16][20]).not.toBe("."); // solid face around it
      // teeth: walking round at the tooth radius alternates between solid and gap
      let changes = 0;
      let prev = "";
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const cur = f[Math.round(15.5 + Math.sin(a) * 13.5)][Math.round(15.5 + Math.cos(a) * 13.5)] === "." ? "." : "#";
        if (prev && cur !== prev) changes++;
        prev = cur;
      }
      expect(changes).toBeGreaterThanOrEqual(12);
    }
    expect(new Set(fs.map((f) => f.join(""))).size).toBe(4);
  });

  it("the wind blade is a crescent, thick in the middle and pointed at the tips, with a white leading edge", () => {
    for (const f of fxFrames("gust")) {
      const solid = (y: number) => [...f[y].slice(12)].filter((ch) => ch !== "." && ch !== "1").length; // blade only, not the streaks
      expect(solid(16)).toBeGreaterThanOrEqual(5);
      expect(solid(3)).toBeLessThan(solid(16));
      expect(solid(28)).toBeLessThan(solid(16));
      expect(f[16].slice(16)).toMatch(/6/); // the leading (right) edge is white-hot
    }
  });

  it("the ice shard points right, pale on top and shadowed underneath", () => {
    for (const f of fxFrames("shard")) {
      const b = bounds(f)!;
      expect(b.w).toBeGreaterThan(b.h * 1.8);
      const col = (x: number) => f.map((r) => r[x]).filter((ch) => ch !== ".").length;
      expect(col(20)).toBeLessThan(col(8)); // narrows to the tip
      expect(f.slice(0, 5).join("")).toMatch(/5/);
      expect(f.slice(7).join("")).toMatch(/2/);
    }
  });
});

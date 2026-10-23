import { describe, expect, it } from "vitest";
import { CHAPTERS } from "@/content/chapters";
import { BIOMES } from "@/game/render/overworld";
import { BOSS_ORDER, SCENES, SCENE_H, SCENE_W, bossScene, paintScene } from "@/game/render/scenery";

describe("battle scenery", () => {
  it("has a scene for every biome, and every boss fights in its own chapter's scene", () => {
    expect(SCENES).toHaveLength(BIOMES.length);
    expect(BOSS_ORDER).toHaveLength(CHAPTERS.length);
    CHAPTERS.forEach((c, i) => expect(bossScene(c.boss)).toBe(i));
    expect(bossScene(undefined)).toBe(0);
  });

  it("paints every pixel opaque and deterministically, with distinct scenes", () => {
    const seen = new Set<string>();
    for (let i = 0; i < SCENES.length; i++) {
      const a = paintScene(i);
      expect(a).toHaveLength(SCENE_W * SCENE_H * 4);
      for (let p = 3; p < a.length; p += 4) expect(a[p]).toBe(255);
      expect(paintScene(i)).toEqual(a);
      seen.add(Array.from(a.slice(0, 20000)).join());
    }
    expect(seen.size).toBe(SCENES.length);
  });
});

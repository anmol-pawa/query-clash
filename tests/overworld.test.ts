import { describe, expect, it } from "vitest";
import { CHAPTERS } from "@/content/chapters";
import { BIOMES, MAP_H, MAP_NODES, MAP_W, biomeAt, isRiver, nodePx, onPlatform, paintOverworld, roadMask } from "@/game/render/overworld";

const at = (px: Uint8ClampedArray, x: number, y: number) => Array.from(px.slice((y * MAP_W + x) * 4, (y * MAP_W + x) * 4 + 4));

describe("campaign overworld", () => {
  it("has a node and a biome for every chapter, inside the map", () => {
    expect(MAP_NODES).toHaveLength(CHAPTERS.length);
    expect(BIOMES).toHaveLength(CHAPTERS.length);
    for (let i = 0; i < MAP_NODES.length; i++) {
      const [x, y] = nodePx(i);
      expect(x).toBeGreaterThan(8);
      expect(x).toBeLessThan(MAP_W - 8);
      expect(y).toBeGreaterThan(4);
      expect(y).toBeLessThan(MAP_H - 4);
      // each node stands in its own chapter's biome, on its own platform
      expect(biomeAt(x, y)).toBe(i);
      expect(onPlatform(x, y)).toBe(i);
    }
  });

  it("paints every pixel opaque, deterministically", () => {
    const a = paintOverworld(3);
    expect(a).toHaveLength(MAP_W * MAP_H * 4);
    for (let i = 3; i < a.length; i += 4) expect(a[i]).toBe(255);
    expect(paintOverworld(3)).toEqual(a);
  });

  it("joins the nodes in chapter order with one connected road", () => {
    const road = roadMask();
    const [sx, sy] = nodePx(0);
    const seen = new Set([sy * MAP_W + sx]);
    const queue = [[sx, sy]];
    while (queue.length) {
      const [x, y] = queue.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const k = ny * MAP_W + nx;
        if (nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H && road[k] && !seen.has(k)) {
          seen.add(k);
          queue.push([nx, ny]);
        }
      }
    }
    for (let i = 0; i < MAP_NODES.length; i++) {
      const [x, y] = nodePx(i);
      expect(seen.has(y * MAP_W + x)).toBe(true);
    }
  });

  it("keeps the river off every platform and bridges it where the road crosses", () => {
    const road = roadMask();
    let bridged = 0;
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < MAP_W; x++) {
        if (!isRiver(x, y)) continue;
        expect(onPlatform(x, y)).toBe(-1);
        if (road[y * MAP_W + x]) bridged++;
      }
    expect(bridged).toBeGreaterThan(0);
  });

  it("fogs exactly the chapters still locked", () => {
    const open = paintOverworld(10);
    const fogged = paintOverworld(4);
    for (let i = 0; i < MAP_NODES.length; i++) {
      const [x, y] = nodePx(i);
      const p = at(fogged, x, y - 1);
      const q = at(open, x, y - 1);
      if (i < 4) expect(p).toEqual(q);
      else expect(p[0] + p[1] + p[2]).toBeLessThan(q[0] + q[1] + q[2]);
    }
  });
});

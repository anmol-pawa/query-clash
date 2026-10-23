/**
 * The campaign overworld: a small pixel map (MAP_W × MAP_H) painted into an
 * RGBA buffer, then shown scaled up with nearest-neighbour filtering.
 *
 * Each chapter owns a biome (meadow, forest, mesa, snow, graveyard, stone
 * plaza, volcanic, highland, swamp, crystal) around its node; a dirt road
 * winds through the nodes in order, crosses the river on a plank bridge, and
 * every node sits on a stone platform. Biomes past the last unlocked chapter
 * are fogged. Pure and deterministic, so it is tested without a DOM.
 */

export const MAP_W = 200;
export const MAP_H = 120;

/** Node positions as percentages of the map box (shared with the HTML buttons). */
export const MAP_NODES: readonly (readonly [number, number])[] = [
  [8, 78],
  [22, 58],
  [14, 32],
  [32, 18],
  [46, 40],
  [40, 70],
  [60, 80],
  [70, 54],
  [62, 26],
  [86, 22],
  [92, 52],
  [82, 80],
];

/** A node's centre in map pixels. */
export const nodePx = (i: number): [number, number] => [Math.round((MAP_NODES[i][0] / 100) * MAP_W), Math.round((MAP_NODES[i][1] / 100) * MAP_H)];

export type RGB = [number, number, number];
export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export type DecorKind = "tree" | "pine" | "rock" | "tomb" | "crystal" | "spire";

export interface Biome {
  name: string;
  /** Ground ramp: dark, mid, light. */
  ground: [string, string, string];
  /** Speck colour (flowers, snow glints, lava flecks…). */
  speck: string;
  decor: { kind: DecorKind; colors: [string, string, string] }[];
}

/** One biome per chapter, in chapter order. */
export const BIOMES: readonly Biome[] = [
  { name: "meadow", ground: ["#3f7a3a", "#58a24a", "#7cc25c"], speck: "#f5e66a", decor: [{ kind: "tree", colors: ["#2c6a33", "#3f8f3f", "#6cc05a"] }] },
  { name: "forest", ground: ["#2f6a3a", "#44894a", "#63a85a"], speck: "#e879a9", decor: [{ kind: "pine", colors: ["#1f5234", "#2e7445", "#4c9a5a"] }, { kind: "tree", colors: ["#245c30", "#357c3c", "#58a64e"] }] },
  { name: "mesa", ground: ["#b98a4a", "#d4a95e", "#e8c47a"], speck: "#a0703a", decor: [{ kind: "rock", colors: ["#8c5a32", "#b27a44", "#d8a266"] }, { kind: "spire", colors: ["#94603a", "#bb8250", "#e0ae72"] }] },
  { name: "snow", ground: ["#9fb4cf", "#c9d8ea", "#eef4fb"], speck: "#ffffff", decor: [{ kind: "pine", colors: ["#2e5a66", "#e4eef8", "#ffffff"] }, { kind: "rock", colors: ["#6a7d99", "#8ea2bd", "#c3d2e6"] }] },
  { name: "graveyard", ground: ["#2f3b3a", "#44544c", "#5c6e5e"], speck: "#9ad1c4", decor: [{ kind: "tomb", colors: ["#5f6676", "#8a91a3", "#b8bfcf"] }, { kind: "tree", colors: ["#2a2d36", "#3d4150", "#565b6e"] }] },
  { name: "plaza", ground: ["#5a5c6e", "#737689", "#9195a8"], speck: "#b9bccc", decor: [{ kind: "rock", colors: ["#45475a", "#62657c", "#8a8ea6"] }, { kind: "spire", colors: ["#3e6b5e", "#4f8d78", "#7cc5a8"] }] },
  { name: "volcanic", ground: ["#3a2422", "#55302a", "#6e3e30"], speck: "#f97316", decor: [{ kind: "rock", colors: ["#241614", "#3d2622", "#5c3a30"] }, { kind: "spire", colors: ["#2e1c1a", "#4a2c26", "#f59e0b"] }] },
  { name: "highland", ground: ["#5e9a4a", "#7cbc5a", "#a4d673"], speck: "#ffffff", decor: [{ kind: "tree", colors: ["#3f8a3e", "#5fb04f", "#92d870"] }, { kind: "rock", colors: ["#6f7c86", "#93a2ab", "#c2ced4"] }] },
  { name: "swamp", ground: ["#2c4a3c", "#3c6150", "#4f7a62"], speck: "#a3e635", decor: [{ kind: "tree", colors: ["#1e3a33", "#2c5446", "#41725c"] }, { kind: "pine", colors: ["#213c30", "#30553f", "#4a7656"] }] },
  { name: "crystal", ground: ["#3a2c5e", "#4c3a7a", "#634c9a"], speck: "#67e8f9", decor: [{ kind: "crystal", colors: ["#3b82c4", "#67c8f0", "#d6f6ff"] }, { kind: "crystal", colors: ["#8b4fc4", "#b77df0", "#f0d6ff"] }] },
  { name: "grove", ground: ["#2a4a2a", "#3f6a36", "#5a8c46"], speck: "#d9f99d", decor: [{ kind: "tree", colors: ["#24471f", "#3a7a2c", "#6fb04a"] }, { kind: "pine", colors: ["#1c3a22", "#2c5c34", "#4a8a48"] }] },
  { name: "marsh", ground: ["#1f3d44", "#2f5a5c", "#427a74"], speck: "#5eead4", decor: [{ kind: "pine", colors: ["#173a3a", "#25605a", "#3f8c7c"] }, { kind: "rock", colors: ["#4b6068", "#6f8a90", "#a3bcc0"] }] },
];

// decoration stamps: o outline, a dark, b mid, c light, t trunk, u trunk light
export const STAMPS: Record<DecorKind, readonly string[]> = {
  tree: ["..oooo..", ".obccbo.", "obcccbbo", "obccbbao", "obbbbaao", "oabbaaao", ".oaaaao.", "..ootoo.", "...otuo.", "...oooo."],
  pine: ["...oo...", "..obco..", "..obao..", ".obcbao.", ".obbaao.", "obcbbaao", "obbbaaao", "oooooooo", "...otuo.", "...oooo."],
  rock: ["..ooo..", ".obcbo.", "obccbao", "obbbaao", ".ooooo."],
  tomb: [".ooo.", "obcbo", "obabo", "ocaao", "obbao", "obbao", "ooooo"],
  crystal: ["..o...", ".oco..", ".ocbo.", "ocbboo", "ocbbao", "obbaao", ".obao.", "..oo.."],
  spire: ["..oo..", ".obco.", ".obbo.", ".obao.", "obcbao", "obbbao", "oooooo"],
};

const OUTLINE = hex("#141522");
const TRUNK: [RGB, RGB] = [hex("#4a2f1e"), hex("#6e4a2c")];
const DIRT: [RGB, RGB, RGB] = [hex("#6b4f32"), hex("#8a6a44"), hex("#a88558")];
const PLANK: [RGB, RGB] = [hex("#5a3a22"), hex("#9a6a3c")];
const WATER: [RGB, RGB, RGB] = [hex("#2a5a9a"), hex("#3b7bc4"), hex("#a8dcf4")];
const STONE: [RGB, RGB, RGB] = [hex("#4a4e66"), hex("#7a809c"), hex("#b4bad2")];
const FOG = hex("#0e1024");

/** Deterministic hash → [0, 1). */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1) with cells of `cell` pixels. */
function noise(x: number, y: number, cell: number, seed: number): number {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = x / cell - gx;
  const fy = y / cell - gy;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = hash2(gx, gy, seed);
  const b = hash2(gx + 1, gy, seed);
  const c = hash2(gx, gy + 1, seed);
  const d = hash2(gx + 1, gy + 1, seed);
  const u = s(fx);
  const v = s(fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** The river's centre column at row y: it runs down between chapters 5 and 9, then bends west under chapter 7's road. */
export function riverX(y: number): number {
  const t = Math.max(0, Math.min(1, (y - 60) / 30));
  return 109 - Math.round(9 * t * t * (3 - 2 * t) - Math.sin(y / 4.3));
}
const RIVER_HALF = 4;

/** Which chapter's biome owns a pixel (0-based): nearest node, with a wobbly border. */
export function biomeAt(x: number, y: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < MAP_NODES.length; i++) {
    const [nx, ny] = nodePx(i);
    const d = Math.hypot(x - nx, (y - ny) * 1.15) + (noise(x, y, 6, 11 + i) - 0.5) * 14;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Road pixels: a 3-pixel-wide stepped line from each node to the next. */
export function roadMask(): Uint8Array {
  const m = new Uint8Array(MAP_W * MAP_H);
  const plot = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && py >= 0 && px < MAP_W && py < MAP_H) m[py * MAP_W + px] = 1;
      }
  };
  for (let i = 0; i + 1 < MAP_NODES.length; i++) {
    let [x0, y0] = nodePx(i);
    const [x1, y1] = nodePx(i + 1);
    // Bresenham, so the road steps in whole pixels
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      plot(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  return m;
}

/** Is (x, y) inside a node's stone platform (an ellipse under the creature)? */
export function onPlatform(x: number, y: number): number {
  for (let i = 0; i < MAP_NODES.length; i++) {
    const [nx, ny] = nodePx(i);
    const ex = (x - nx) / 9;
    const ey = (y - ny) / 4.5;
    if (ex * ex + ey * ey <= 1) return i;
  }
  return -1;
}

export const isRiver = (x: number, y: number) => Math.abs(x - riverX(y)) <= RIVER_HALF;

/**
 * Paint the overworld. `unlocked` is the highest unlocked chapter (1–12);
 * biomes of later chapters are fogged.
 */
export function paintOverworld(unlocked: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(MAP_W * MAP_H * 4);
  const road = roadMask();
  const biome = new Uint8Array(MAP_W * MAP_H);
  const set = (x: number, y: number, c: RGB) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    const o = (y * MAP_W + x) * 4;
    px[o] = c[0];
    px[o + 1] = c[1];
    px[o + 2] = c[2];
    px[o + 3] = 255;
  };
  const isRoad = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && road[y * MAP_W + x] === 1;

  // 1. ground, river, road and bridge
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      const b = biomeAt(x, y);
      biome[y * MAP_W + x] = b;
      const g = BIOMES[b].ground.map(hex) as [RGB, RGB, RGB];
      const n = noise(x, y, 9, 3) + (hash2(x, y, 7) - 0.5) * 0.18;
      let c: RGB = n < 0.36 ? g[0] : n > 0.68 ? g[2] : g[1];
      if (hash2(x, y, 5) < 0.012) c = hex(BIOMES[b].speck);
      if (isRiver(x, y)) {
        const edge = Math.abs(x - riverX(y)) === RIVER_HALF;
        c = edge ? WATER[0] : hash2(x, y, 9) < 0.05 || (y + Math.floor(x / 3)) % 11 === 0 ? WATER[2] : WATER[1];
      }
      if (isRoad(x, y)) {
        if (isRiver(x, y)) c = x % 3 === 0 ? PLANK[0] : PLANK[1];
        else c = !isRoad(x, y + 1) || !isRoad(x + 1, y) ? DIRT[0] : hash2(x, y, 13) < 0.12 ? DIRT[2] : DIRT[1];
      }
      set(x, y, c);
    }
  // bridge rails: an outline where the road meets water above and below
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) if (isRiver(x, y) && !isRoad(x, y) && (isRoad(x, y - 1) || isRoad(x, y + 1))) set(x, y, OUTLINE);

  // 2. decorations, one candidate per 9×9 cell, kept off roads, water and nodes
  const blocked = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
    if (isRiver(x, y) || Math.abs(x - riverX(y)) <= RIVER_HALF + 1) return true;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (isRoad(x + dx, y + dy)) return true;
    for (let i = 0; i < MAP_NODES.length; i++) {
      const [nx, ny] = nodePx(i);
      if (Math.abs(x - nx) < 14 && y > ny - 22 && y < ny + 9) return true;
    }
    return false;
  };
  const CELL = 9;
  for (let cy = 0; cy * CELL < MAP_H + CELL; cy++)
    for (let cx = 0; cx * CELL < MAP_W; cx++) {
      if (hash2(cx, cy, 21) < 0.35) continue;
      const bx = cx * CELL + Math.floor(hash2(cx, cy, 22) * CELL);
      const by = cy * CELL + Math.floor(hash2(cx, cy, 23) * CELL); // the stamp's base row
      if (by >= MAP_H + 2) continue;
      const b = biome[Math.min(MAP_H - 1, by) * MAP_W + Math.min(MAP_W - 1, bx)];
      const opts = BIOMES[b].decor;
      const d = opts[Math.floor(hash2(cx, cy, 24) * opts.length)];
      const rows = STAMPS[d.kind];
      const w = rows[0].length;
      const h = rows.length;
      const x0 = bx - (w >> 1);
      const y0 = by - h + 1;
      let ok = true;
      for (let y = 0; y < h && ok; y++) for (let x = 0; x < w && ok; x++) if (rows[y][x] !== "." && y0 + y >= 0 && blocked(x0 + x, y0 + y)) ok = false;
      if (!ok) continue;
      const pal: Record<string, RGB> = { o: OUTLINE, a: hex(d.colors[0]), b: hex(d.colors[1]), c: hex(d.colors[2]), t: TRUNK[0], u: TRUNK[1] };
      // a one-row shadow to the lower right of the base
      for (let x = 1; x < w; x++) {
        const sx = x0 + x;
        const sy = by + 1;
        if (sx < MAP_W && sy < MAP_H && sy >= 0 && rows[h - 1][x - 1] !== "." && !isRoad(sx, sy) && !isRiver(sx, sy)) {
          const g = hex(BIOMES[biome[sy * MAP_W + sx]].ground[0]);
          set(sx, sy, [g[0] * 0.7, g[1] * 0.7, g[2] * 0.7]);
        }
      }
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const ch = rows[y][x];
          if (ch !== ".") set(x0 + x, y0 + y, pal[ch]);
        }
    }

  // 3. stone platforms under the nodes: outline, shaded rim, lit top
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      const i = onPlatform(x, y);
      if (i < 0) continue;
      const [nx, ny] = nodePx(i);
      const inner = ((x - nx) / 8) ** 2 + ((y - ny) / 3.5) ** 2 <= 1;
      const top = ((x - nx) / 7) ** 2 + ((y - ny + 1) / 2.5) ** 2 <= 1;
      set(x, y, !inner ? OUTLINE : top ? (hash2(x, y, 31) < 0.15 ? STONE[2] : STONE[1]) : STONE[0]);
    }

  // 4. fog over the chapters still locked: darken and dither
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      if (biome[y * MAP_W + x] + 1 <= unlocked) continue;
      const o = (y * MAP_W + x) * 4;
      const k = (x + y) % 2 === 0 ? 0.62 : 0.52;
      for (let c = 0; c < 3; c++) px[o + c] = px[o + c] * (1 - k) + FOG[c] * k;
    }
  return px;
}

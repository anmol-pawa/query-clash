/**
 * Battle backdrops: one illustrated pixel scene per chapter biome (sky bands,
 * a sun or moon, clouds or stars, two ridge silhouettes, a speckled ground
 * with props along the horizon), painted into a low-res RGBA buffer that the
 * stage shows scaled up with nearest-neighbour filtering. Pure and
 * deterministic, so it is tested without a DOM.
 */
import type { BossId } from "@/content/types";
import { BIOMES, STAMPS, hash2, hex, type RGB } from "./overworld";

/** 320 columns fill the 1280-wide stage at 4×; 150 extra on each side cover the wide, short desktop stage and camera shake. */
export const SCENE_PAD = 150;
export const SCENE_W = 320 + SCENE_PAD * 2;
export const SCENE_H = 180;
/** Horizon row, matching the stage's HORIZON (440 / 4). */
export const SCENE_HORIZON = 110;

type Ridge = "hills" | "peaks" | "dunes" | "spikes";

interface Scene {
  sky: [string, string, string];
  /** Sun / moon colour, or null for none. */
  orb: string | null;
  orbAt: [number, number];
  /** "cloud" puffs, "star" points, or nothing. */
  sprinkle: "cloud" | "star" | "ash" | "none";
  far: string;
  near: string;
  ridge: Ridge;
}

/** One scene per biome, in chapter order (same order as BIOMES). */
export const SCENES: readonly Scene[] = [
  { sky: ["#5aa6e8", "#8cc8f0", "#c8ecf8"], orb: "#fff4b0", orbAt: [250, 26], sprinkle: "cloud", far: "#7fb4c8", near: "#4f9a64", ridge: "hills" },
  { sky: ["#3f7fb0", "#78b4c8", "#b4dcd0"], orb: "#f0f8c8", orbAt: [70, 30], sprinkle: "cloud", far: "#3f7a6a", near: "#2a5c48", ridge: "spikes" },
  { sky: ["#e8895a", "#f4b878", "#f8dca0"], orb: "#fff0c0", orbAt: [220, 44], sprinkle: "cloud", far: "#c0705a", near: "#a45a3c", ridge: "peaks" },
  { sky: ["#8aa8d0", "#b8cee6", "#e4eef8"], orb: "#ffffff", orbAt: [260, 30], sprinkle: "cloud", far: "#9ab4d4", near: "#c4d4ea", ridge: "peaks" },
  { sky: ["#141a2c", "#2a3450", "#4a5a74"], orb: "#d8e4f0", orbAt: [80, 28], sprinkle: "star", far: "#2a3448", near: "#1c2434", ridge: "spikes" },
  { sky: ["#4a5a8c", "#7a88b4", "#b4bcd8"], orb: "#fff6d8", orbAt: [240, 30], sprinkle: "cloud", far: "#5c6890", near: "#454c6c", ridge: "peaks" },
  { sky: ["#2a1218", "#6a2a20", "#c0501c"], orb: "#ff9a3c", orbAt: [160, 62], sprinkle: "ash", far: "#4a2220", near: "#2e1614", ridge: "peaks" },
  { sky: ["#6ab0f0", "#a4d4f8", "#e4f4fc"], orb: "#fffbd0", orbAt: [60, 32], sprinkle: "cloud", far: "#8cb8cc", near: "#6a9a7c", ridge: "peaks" },
  { sky: ["#2c4a44", "#4c7260", "#8ca884"], orb: "#d8f0a0", orbAt: [240, 40], sprinkle: "ash", far: "#2c4a3c", near: "#1e3830", ridge: "hills" },
  { sky: ["#1c1440", "#3c2c78", "#7a58b8"], orb: "#c8f4ff", orbAt: [90, 34], sprinkle: "star", far: "#4c3a8a", near: "#32266a", ridge: "spikes" },
  { sky: ["#6a9c60", "#a4cc7c", "#e0eca0"], orb: "#fffbc0", orbAt: [250, 36], sprinkle: "cloud", far: "#4c8050", near: "#2c5a34", ridge: "hills" },
  { sky: ["#1c3c4c", "#2c6068", "#5c9c94"], orb: "#a8f4e4", orbAt: [70, 34], sprinkle: "star", far: "#244c54", near: "#183a40", ridge: "dunes" },
];

/** Each boss fights in its chapter's biome (BossId order is chapter order). */
export const BOSS_ORDER: readonly BossId[] = ["nulloth", "joinmaster", "aggregon", "subzero", "reaper", "transactor", "schemaforge", "windwraith", "hydra", "optimizer", "arborix", "hydrax"];
export const bossScene = (boss: BossId | undefined): number => (boss ? Math.max(0, BOSS_ORDER.indexOf(boss)) : 0);

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function ridgeHeight(kind: Ridge, x: number, seed: number, amp: number): number {
  const s = seed * 17;
  switch (kind) {
    case "hills":
      return amp * (0.55 + 0.3 * Math.sin(x / 23 + s) + 0.15 * Math.sin(x / 9 + s * 2));
    case "dunes":
      return amp * (0.45 + 0.35 * Math.sin(x / 37 + s) * Math.sin(x / 91 + s));
    case "peaks": {
      const t = (x / 46 + s) % 1;
      return amp * (0.3 + 0.7 * (1 - Math.abs(t * 2 - 1)) * (0.7 + 0.3 * hash2(Math.floor(x / 46 + s), 3, seed)));
    }
    case "spikes": {
      const t = (x / 12 + s) % 1;
      return amp * (0.35 + 0.4 * hash2(Math.floor(x / 12 + s), 5, seed) + 0.25 * (1 - Math.abs(t * 2 - 1)));
    }
  }
}

/** Paint scene `index` into a SCENE_W × SCENE_H opaque RGBA buffer. */
export function paintScene(index: number): Uint8ClampedArray {
  const sc = SCENES[index % SCENES.length];
  const bi = BIOMES[index % BIOMES.length];
  const out = new Uint8ClampedArray(SCENE_W * SCENE_H * 4);
  const sky = sc.sky.map(hex) as [RGB, RGB, RGB];
  const far = hex(sc.far);
  const near = hex(sc.near);
  const ground = bi.ground.map(hex) as [RGB, RGB, RGB];
  const dark: RGB = [12, 10, 24];
  const put = (x: number, y: number, c: RGB) => {
    if (x < 0 || y < 0 || x >= SCENE_W || y >= SCENE_H) return;
    const i = (y * SCENE_W + x) * 4;
    out[i] = c[0];
    out[i + 1] = c[1];
    out[i + 2] = c[2];
    out[i + 3] = 255;
  };

  for (let y = 0; y < SCENE_H; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      if (y < SCENE_HORIZON) {
        // sky: 3-colour gradient quantised to 10 bands, ordered-dithered between them
        const t = (y / SCENE_HORIZON) * 2;
        const pos = t < 1 ? t : t - 1;
        const a = t < 1 ? sky[0] : sky[1];
        const b = t < 1 ? sky[1] : sky[2];
        const q = pos * 5;
        const step = Math.floor(q) + (q - Math.floor(q) > BAYER[(y & 3) * 4 + (x & 3)] / 16 ? 1 : 0);
        put(x, y, mix(a, b, Math.min(1, step / 5)));
      } else {
        // ground: perspective-banded ramp, darker toward the viewer, with speckles
        const d = (y - SCENE_HORIZON) / (SCENE_H - SCENE_HORIZON);
        const band = Math.floor(d * 9);
        let c = d < 0.2 ? ground[2] : d < 0.62 ? ground[1] : ground[0];
        if (band % 2 === 1 && d < 0.8) c = mix(c, ground[d < 0.4 ? 1 : 0], 0.35);
        if (hash2(x, y, index + 1) < 0.025) c = hex(bi.speck);
        else if (hash2(x >> 1, y, index + 9) < 0.07) c = mix(c, dark, 0.22);
        put(x, y, mix(c, dark, 0.12 + 0.14 * d));
      }
    }
  }

  // sky dressing: orb with a soft halo, clouds / stars / drifting ash
  if (sc.orb) {
    const o = hex(sc.orb);
    const [ox, oy] = [sc.orbAt[0] + SCENE_PAD, sc.orbAt[1]];
    for (let y = oy - 22; y <= oy + 22; y++)
      for (let x = ox - 22; x <= ox + 22; x++) {
        const r = Math.hypot(x - ox, y - oy);
        if (r <= 10) put(x, y, r > 8.5 ? mix(o, sky[1], 0.35) : o);
        else if (r <= 18 && (x + y) % 2 === 0) put(x, y, mix(sky[1], o, 0.35));
      }
  }
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(hash2(i, 1, index) * SCENE_W);
    const y = Math.floor(hash2(i, 2, index) * (SCENE_HORIZON - 14));
    if (sc.sprinkle === "star") put(x, y, hash2(i, 3, index) < 0.2 ? [255, 255, 255] : mix(sky[2], [255, 255, 255], 0.7));
    else if (sc.sprinkle === "ash") put(x, Math.floor(y * 0.9 + 6), mix(sky[2], dark, 0.5));
    else if (sc.sprinkle === "cloud" && i < 9) {
      const w = 14 + Math.floor(hash2(i, 4, index) * 18);
      const cy = 10 + Math.floor(hash2(i, 5, index) * 52);
      const cloud = mix(sky[2], [255, 255, 255], 0.85);
      const shade = mix(sky[2], [255, 255, 255], 0.45);
      for (let dx = 0; dx < w; dx++) {
        const h = Math.max(1, Math.round(3 * Math.sin((dx / w) * Math.PI)) + 1);
        for (let dy = 0; dy < h; dy++) put(x + dx, cy - dy, dy === 0 ? shade : cloud);
      }
    }
  }

  // two ridge silhouettes: a hazy far band and a darker near band
  for (let x = 0; x < SCENE_W; x++) {
    const hFar = Math.round(ridgeHeight(sc.ridge, x, index + 1, 46));
    for (let y = SCENE_HORIZON - hFar; y < SCENE_HORIZON; y++) put(x, y, y === SCENE_HORIZON - hFar ? mix(far, sky[2], 0.35) : mix(far, sky[2], 0.25 - Math.min(0.2, (y - (SCENE_HORIZON - hFar)) / 220)));
    const hNear = Math.round(ridgeHeight(sc.ridge, x + 31, index + 7, 24));
    for (let y = SCENE_HORIZON - hNear; y < SCENE_HORIZON; y++) put(x, y, y === SCENE_HORIZON - hNear ? mix(near, sky[2], 0.18) : near);
  }

  // props standing along the horizon, from the biome's decor stamps
  for (let i = 0; i < 30; i++) {
    const opt = bi.decor[i % bi.decor.length];
    const stamp = STAMPS[opt.kind];
    const x = Math.floor(hash2(i, 11, index) * (SCENE_W - 10));
    const y = SCENE_HORIZON + 2 + Math.floor(hash2(i, 12, index) * 8);
    const cols: Record<string, RGB> = { o: [20, 21, 34], a: hex(opt.colors[0]), b: hex(opt.colors[1]), c: hex(opt.colors[2]), t: [74, 47, 30], u: [110, 74, 44] };
    stamp.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) if (row[rx] !== ".") put(x + rx, y - stamp.length + 1 + ry, mix(cols[row[rx]], dark, 0.1));
    });
  }
  return out;
}

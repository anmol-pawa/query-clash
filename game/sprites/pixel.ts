/**
 * Pixel sprites as data. A sprite is a palette (one character → one colour)
 * plus frames, where each frame is a list of equal-length row strings. `.` is
 * always transparent. Animations are named lists of frames, e.g.
 *
 *   { idle: [frameA, frameB], attack: [frameC] }
 *
 * This module is renderer-agnostic (no DOM, no Pixi) so it can be unit tested
 * in Node; `texture.ts` turns frames into nearest-neighbour Pixi textures.
 */

export type Frame = readonly string[];

export interface SpriteDef {
  id: string;
  name: string;
  /** Width and height of every frame, in pixels. */
  w: number;
  h: number;
  /** One printable character → "#rrggbb". `.` is reserved for transparent. */
  palette: Readonly<Record<string, string>>;
  /** Named animations. Every sprite has at least `idle` (2–4 frames). */
  anims: Readonly<Record<string, readonly Frame[]>>;
  /** Frames per second per animation (default 4). */
  fps?: Readonly<Record<string, number>>;
}

export const TRANSPARENT = ".";

/** Problems with a sprite definition; empty when it is valid. */
export function validateSprite(def: SpriteDef): string[] {
  const errs: string[] = [];
  for (const [k, v] of Object.entries(def.palette)) {
    if ([...k].length !== 1) errs.push(`palette key "${k}" must be one character`);
    if (k === TRANSPARENT) errs.push(`palette must not define "${TRANSPARENT}"`);
    if (!/^#[0-9a-f]{6}$/i.test(v)) errs.push(`palette "${k}" = "${v}" is not #rrggbb`);
  }
  if (!def.anims.idle) errs.push("missing idle animation");
  else if (def.anims.idle.length < 2 || def.anims.idle.length > 4) errs.push(`idle has ${def.anims.idle.length} frames (want 2–4)`);
  for (const [name, frames] of Object.entries(def.anims)) {
    if (frames.length === 0) errs.push(`${name}: no frames`);
    frames.forEach((f, fi) => {
      if (f.length !== def.h) errs.push(`${name}[${fi}]: ${f.length} rows, want ${def.h}`);
      f.forEach((row, y) => {
        if (row.length !== def.w) errs.push(`${name}[${fi}] row ${y}: ${row.length} cols, want ${def.w}`);
        for (const ch of row) if (ch !== TRANSPARENT && !(ch in def.palette)) errs.push(`${name}[${fi}] row ${y}: "${ch}" not in palette`);
      });
    });
  }
  return errs;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** RGBA pixels (w*h*4) for one frame, ready for `new ImageData(...)`. */
export function frameToRGBA(def: SpriteDef, frame: Frame, recolor?: (rgb: [number, number, number]) => [number, number, number]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(def.w * def.h * 4);
  const lut = new Map<string, [number, number, number]>();
  for (const [k, v] of Object.entries(def.palette)) lut.set(k, recolor ? recolor(hexToRgb(v)) : hexToRgb(v));
  for (let y = 0; y < def.h; y++) {
    const row = frame[y];
    for (let x = 0; x < def.w; x++) {
      const rgb = lut.get(row[x]);
      if (!rgb) continue;
      const i = (y * def.w + x) * 4;
      out[i] = rgb[0];
      out[i + 1] = rgb[1];
      out[i + 2] = rgb[2];
      out[i + 3] = 255;
    }
  }
  return out;
}

/** Solid white silhouette (used for hurt flashes and the evolve morph). */
export const WHITE = (): [number, number, number] => [255, 255, 255];

/** Mirror a frame horizontally (e.g. to face the other way). */
export function mirror(frame: Frame): string[] {
  return frame.map((r) => [...r].reverse().join(""));
}

/** Move a frame's pixels by (dx, dy), filling the gap with transparency. */
export function shift(frame: Frame, dx: number, dy: number): string[] {
  const h = frame.length;
  const w = frame[0]?.length ?? 0;
  const blank = TRANSPARENT.repeat(w);
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    const src = frame[y - dy];
    if (src === undefined) {
      rows.push(blank);
      continue;
    }
    let r = "";
    for (let x = 0; x < w; x++) r += src[x - dx] ?? TRANSPARENT;
    rows.push(r);
  }
  return rows;
}

/** Draw `top` over `base` (top's transparent pixels let base show through). */
export function overlay(base: Frame, top: Frame, ox = 0, oy = 0): string[] {
  return base.map((row, y) => {
    const t = top[y - oy];
    if (t === undefined) return row;
    let r = "";
    for (let x = 0; x < row.length; x++) {
      const c = t[x - ox];
      r += c !== undefined && c !== TRANSPARENT ? c : row[x];
    }
    return r;
  });
}

/** Opaque-pixel bounding box of a frame, or null if it is empty. */
export function bounds(frame: Frame): { x: number; y: number; w: number; h: number } | null {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -1,
    y1 = -1;
  frame.forEach((row, y) => {
    for (let x = 0; x < row.length; x++)
      if (row[x] !== TRANSPARENT) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  });
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

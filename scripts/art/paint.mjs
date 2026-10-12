// A tiny pixel painter for authoring sprites. Art scripts in this folder use
// it to lay down shaded shapes, then run `emit()` to write the result as
// palette + row strings into game/sprites/creatures/*.ts. The generated rows
// are committed and can be hand-tweaked; the script is how they were made.
import { writeFileSync } from "node:fs";

const T = ".";
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => (v + 0.5) / 16));

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/** Default light: from the upper left, towards the viewer. */
const LIGHT = (() => {
  const l = [-0.55, -0.7, 0.55];
  const n = Math.hypot(...l);
  return l.map((v) => v / n);
})();

export class Layer {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = Array.from({ length: h }, () => Array(w).fill(T));
  }
  get(x, y) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? T : this.px[y][x];
  }
  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y][x] = c;
  }
  /** Pick a ramp entry (dark → light) for brightness v at (x, y), with a narrow dither band. */
  shade(ramp, v, x, y) {
    const t = clamp(v) * (ramp.length - 1);
    const base = Math.floor(t);
    const frac = clamp((t - base - 0.32) / 0.36);
    return ramp[Math.min(ramp.length - 1, frac > BAYER[y & 3][x & 3] ? base + 1 : base)];
  }
  /** Sphere-shaded ellipse. `bias` brightens (+) or darkens (−) the whole shape. */
  ellipse(cx, cy, rx, ry, ramp, { bias = 0, light = LIGHT } = {}) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        const nz = Math.sqrt(1 - d);
        const lit = nx * light[0] + ny * light[1] + nz * light[2];
        this.set(x, y, this.shade(ramp, 0.5 * lit + 0.42 + bias, x, y));
      }
    return this;
  }
  /** Fill a polygon; `fill` is a ramp + brightness function or a single colour. */
  poly(pts, ramp, value = () => 0.5) {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        if (!inside(pts, x + 0.5, y + 0.5)) continue;
        this.set(x, y, typeof ramp === "string" ? ramp : this.shade(ramp, value(x, y), x, y));
      }
    return this;
  }
  /** 1-px line (Bresenham). */
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
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
    return this;
  }
  /** Recolour only pixels that are already painted (for markings clipped to a shape). */
  clip(fn) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.px[y][x] !== T) fn(x, y, this.px[y][x]);
    return this;
  }
  /** Put a 1-px outline around everything painted on this layer. */
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (this.px[y][x] === T && [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)].some((n) => n !== T && n !== c)) add.push([x, y]);
    for (const [x, y] of add) this.px[y][x] = c;
    return this;
  }
  /** Draw another layer on top of this one. */
  draw(top, ox = 0, oy = 0) {
    for (let y = 0; y < top.h; y++) for (let x = 0; x < top.w; x++) if (top.px[y][x] !== T) this.set(x + ox, y + oy, top.px[y][x]);
    return this;
  }
  /** Mirror the left half onto the right half (for symmetric front views). */
  mirrorX() {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w / 2; x++) this.px[y][this.w - 1 - x] = this.px[y][x];
    return this;
  }
  rows() {
    return this.px.map((r) => r.join(""));
  }
}

function inside(pts, x, y) {
  let r = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
}

/** Write a sprite module. `anims` maps names to arrays of Layers. */
export function emit(file, { id, name, w, h, palette, anims, fps, comment }) {
  const body = Object.entries(anims)
    .map(([k, frames]) => `    ${k}: [\n${frames.map((f) => `      [\n${f.rows().map((r) => `        ${JSON.stringify(r)},`).join("\n")}\n      ],`).join("\n")}\n    ],`)
    .join("\n");
  const src = `// Generated by scripts/art/${id}.mjs, then committed. Edit freely.
import type { SpriteDef } from "../pixel";

/** ${comment} */
export const ${id.toUpperCase()}: SpriteDef = {
  id: ${JSON.stringify(id)},
  name: ${JSON.stringify(name)},
  w: ${w},
  h: ${h},
  palette: ${JSON.stringify(palette, null, 2).replace(/\n/g, "\n  ")},
  fps: ${JSON.stringify(fps ?? {})},
  anims: {
${body}
  },
};
`;
  writeFileSync(file, src);
}

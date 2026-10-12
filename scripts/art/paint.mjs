// A tiny pixel painter for authoring sprites. Art scripts in this folder use
// it to lay down shaded shapes, then run `emit()` to write the result as
// palette + row strings into game/sprites/creatures/*.ts. The generated rows
// are committed and can be hand-tweaked; the script is how they were made.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

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
    return this;
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
export function emit(file, { id, name, w, h, palette, anims, fps, comment, script }) {
  const body = Object.entries(anims)
    .map(([k, frames]) => `    ${k}: [\n${frames.map((f) => `      [\n${f.rows().map((r) => `        ${JSON.stringify(r)},`).join("\n")}\n      ],`).join("\n")}\n    ],`)
    .join("\n");
  const src = `// Generated by scripts/art/${script ?? id}.mjs, then committed. Edit freely.
import type { SpriteDef } from "../pixel";

/** ${comment} */
export const ${id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}: SpriteDef = {
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
  previewSheet(id, palette, anims);
}

/**
 * Write a PNG contact sheet (every frame of every anim, one row per anim) for
 * quick review while authoring. Only runs when ART_PREVIEW=<dir> is set.
 */
export function previewSheet(id, palette, anims, scale = 3) {
  const dir = process.env.ART_PREVIEW;
  if (!dir) return;
  const rowsOf = Object.values(anims);
  const fw = rowsOf[0][0].w;
  const fh = rowsOf[0][0].h;
  const cols = Math.max(...rowsOf.map((r) => r.length));
  const W = cols * (fw + 2) * scale;
  const H = rowsOf.length * (fh + 2) * scale;
  const px = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) px.set(((Math.floor(i / W / 8 / scale) + Math.floor((i % W) / 8 / scale)) & 1 ? [0x9f, 0xd3, 0xa8] : [0x8c, 0xc4, 0x96]), i * 3);
  const rgb = Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, [1, 3, 5].map((o) => parseInt(v.slice(o, o + 2), 16))]));
  rowsOf.forEach((frames, ai) =>
    frames.forEach((f, fi) => {
      for (let y = 0; y < fh; y++)
        for (let x = 0; x < fw; x++) {
          const c = f.px[y][x];
          if (c === T) continue;
          for (let sy = 0; sy < scale; sy++)
            for (let sx = 0; sx < scale; sx++) {
              const X = (fi * (fw + 2) + 1 + x) * scale + sx;
              const Y = (ai * (fh + 2) + 1 + y) * scale + sy;
              px.set(rgb[c], (Y * W + X) * 3);
            }
        }
    }),
  );
  writePng(`${dir}/${id}.png`, W, H, px);
}

function writePng(file, w, h, rgb) {
  const crcT = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b) => {
    let c = 0xffffffff;
    for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}

/** Faint helper: shift a frame down by `dy` and knock out pixels in an ordered-dither pattern, `amount` 0 … 1. */
export function dissolve(layer, amount, dy = 0) {
  const out = new Layer(layer.w, layer.h).draw(layer, 0, dy);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) if (BAYER[y & 3][x & 3] < amount) out.px[y][x] = T;
  return out;
}

/** A ring outline (1 px, or `t` px thick) on an ellipse. */
export function ring(layer, cx, cy, rx, ry, c, t = 1) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      const r = Math.min(rx, ry);
      if (d <= 1 && d >= 1 - t / r) layer.set(x, y, c);
    }
  return layer;
}

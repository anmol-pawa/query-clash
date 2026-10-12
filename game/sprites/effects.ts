/**
 * Pixel-art move effects: a projectile orb, an impact spark, a sword slash, a
 * shock ring and a beam section. Each is drawn procedurally into character
 * grids using a six-step colour ramp, so one shape serves every spell colour:
 *
 *   1 outline · 2 shadow · 3 base · 4 light · 5 pale · 6 white-hot core
 *
 * `fxSprite(kind, color)` turns a shape into a normal `SpriteDef` (4-frame
 * `idle`) with the ramp built from the spell colour, so it renders through the
 * same nearest-neighbour texture path as the creatures.
 */
import type { Frame, SpriteDef } from "./pixel";
import { TRANSPARENT } from "./pixel";

export type FxKind = "orb" | "spark" | "slash" | "ring" | "beam";
export const FX_KINDS: readonly FxKind[] = ["orb", "spark", "slash", "ring", "beam"];

type Grid = string[][];

const blank = (w: number, h: number): Grid => Array.from({ length: h }, () => Array<string>(w).fill(TRANSPARENT));
const rows = (g: Grid): Frame => g.map((r) => r.join(""));
const put = (g: Grid, x: number, y: number, c: string) => {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (yi >= 0 && yi < g.length && xi >= 0 && xi < g[0].length) g[yi][xi] = c;
};

/** Ring every filled shape with outline pixels (4-neighbourhood). */
function outline(g: Grid): Grid {
  const out = g.map((r) => [...r]);
  for (let y = 0; y < g.length; y++)
    for (let x = 0; x < g[0].length; x++) {
      if (g[y][x] !== TRANSPARENT) continue;
      const n = [g[y - 1]?.[x], g[y + 1]?.[x], g[y][x - 1], g[y][x + 1]];
      if (n.some((c) => c !== undefined && c !== TRANSPARENT && c !== "1")) out[y][x] = "1";
    }
  return out;
}

/** A round data orb with a highlight that circles it, plus two orbiting motes. */
function orbFrame(f: number): Frame {
  const g = blank(16, 16);
  const cx = 7.5;
  const cy = 7.5;
  const la = -Math.PI * 0.75 + f * (Math.PI / 2); // light direction turns each frame
  const lx = Math.cos(la);
  const ly = Math.sin(la);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d > 5.2) continue;
      const lit = (dx * lx + dy * ly) / 5.2; // -1 (dark side) … 1 (lit side)
      let c = d < 1.8 ? "6" : d < 3 ? "5" : lit > 0.35 ? "4" : lit < -0.45 ? "2" : "3";
      if (d >= 1.8 && lit > 0.55 && d < 4.4) c = "5";
      g[y][x] = c;
    }
  for (let m = 0; m < 2; m++) {
    const a = f * (Math.PI / 4) + m * Math.PI;
    put(g, cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, m ? "5" : "6");
  }
  return rows(outline(g));
}

/** Impact starburst: a hot core, eight rays that grow, then break into chips. */
function sparkFrame(f: number): Frame {
  const g = blank(32, 32);
  const c = 15.5;
  const len = [6, 12, 14, 15][f];
  const start = [0, 2, 7, 11][f];
  for (let r = 0; r < 8; r++) {
    const a = (r / 8) * Math.PI * 2 + (f % 2 ? Math.PI / 8 : 0);
    const long = r % 2 === 0;
    const L = long ? len : len * 0.6;
    for (let t = start; t <= L; t += 0.5) {
      if (f === 3 && Math.floor(t) % 3 === 1) continue; // broken up into chips
      const u = t / Math.max(1, L);
      const shade = u < 0.35 ? "6" : u < 0.7 ? "5" : "4";
      put(g, c + Math.cos(a) * t, c + Math.sin(a) * t, shade);
      if (long && f < 3 && u < (f === 2 ? 0.8 : 0.5)) put(g, c + Math.cos(a) * t + Math.sin(a), c + Math.sin(a) * t - Math.cos(a), "4");
    }
  }
  const core = [3, 4.5, 2.5, 0][f];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const d = Math.abs(x - c) + Math.abs(y - c); // diamond core
      if (d < core) g[y][x] = d < core * 0.5 ? "6" : "5";
      else if (d < core + 1.5 && core > 0) g[y][x] = "3";
    }
  return rows(outline(g));
}

/** A crescent sword-swipe that sweeps across, then thins out as it trails off. */
function slashFrame(f: number): Frame {
  const g = blank(32, 32);
  const cx = 12;
  const cy = 18;
  const R = 13.5;
  const a0 = -Math.PI * 0.85;
  const span = Math.PI * 1.15;
  const head = [0.45, 0.85, 1, 1][f]; // fraction of the arc swept so far
  const tail = [0, 0.05, 0.4, 0.75][f]; // fraction already faded
  const thick = [3.5, 4.5, 4, 2.5][f];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      let a = Math.atan2(dy, dx) - a0;
      while (a < 0) a += Math.PI * 2;
      const u = a / span;
      if (u < tail || u > head) continue;
      // taper: thin at both ends, widest just behind the leading edge
      const w = thick * Math.sin(Math.min(1, (u - tail) / Math.max(0.01, head - tail)) * Math.PI * 0.95 + 0.1);
      const inner = R - w;
      if (r > R || r < inner) continue;
      const k = (R - r) / Math.max(0.5, w); // 0 at the outer edge, 1 inner
      g[y][x] = k < 0.3 ? "6" : k < 0.55 ? "5" : k < 0.8 ? "4" : "3";
    }
  return rows(outline(g));
}

/** An expanding shock ring that thins and breaks into dashes. */
function ringFrame(f: number): Frame {
  const g = blank(32, 32);
  const c = 15.5;
  const R = [4, 8, 11.5, 14.5][f];
  const w = [3, 3, 2.2, 1.4][f];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const dx = x - c;
      const dy = y - c;
      const r = Math.hypot(dx, dy);
      if (r > R || r < R - w) continue;
      if (f >= 2) {
        const seg = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 16);
        if (seg % (f === 3 ? 2 : 4) === 1) continue;
      }
      const k = (R - r) / w;
      g[y][x] = k < 0.4 ? "6" : k < 0.75 ? "5" : "4";
    }
  return rows(outline(g));
}

/**
 * One tileable 8×16 section of a beam (repeats along x). Bands run from the
 * outline to a white-hot core; the width pulses and bright motes drift along.
 */
function beamFrame(f: number): Frame {
  const g = blank(8, 16);
  const half = [5, 6, 5, 4][f];
  for (let x = 0; x < 8; x++) {
    const wobble = (x + f * 2) % 8 < 4 ? 0 : 1; // a rippling edge that tiles
    const h = half - (wobble && f % 2 ? 1 : 0);
    for (let y = 0; y < 16; y++) {
      const d = Math.abs(y - 7.5);
      if (d > h + 0.5) continue;
      const k = d / (h + 0.5);
      g[y][x] = d > h - 0.5 ? "1" : k < 0.3 ? "6" : k < 0.55 ? "5" : k < 0.8 ? "4" : "3";
    }
  }
  const mx = (f * 2 + 1) % 8; // a mote travelling along the outer band
  put(g, mx, 7.5 - half + 1.5, "6");
  put(g, (mx + 4) % 8, 7.5 + half - 1.5, "5");
  return rows(g);
}

const SHAPES: Record<FxKind, { w: number; h: number; frame: (f: number) => Frame; fps: number }> = {
  orb: { w: 16, h: 16, frame: orbFrame, fps: 12 },
  spark: { w: 32, h: 32, frame: sparkFrame, fps: 16 },
  slash: { w: 32, h: 32, frame: slashFrame, fps: 16 },
  ring: { w: 32, h: 32, frame: ringFrame, fps: 12 },
  beam: { w: 8, h: 16, frame: beamFrame, fps: 14 },
};

const frameCache = new Map<FxKind, Frame[]>();
export function fxFrames(kind: FxKind): Frame[] {
  let f = frameCache.get(kind);
  if (!f) {
    f = [0, 1, 2, 3].map(SHAPES[kind].frame);
    frameCache.set(kind, f);
  }
  return f;
}

const hex = (n: number) => "#" + Math.round(n).toString(16).padStart(6, "0");
function mix(a: number, b: number, t: number): string {
  const ch = (n: number, s: number) => (n >> s) & 255;
  const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return hex((m(16) << 16) | (m(8) << 8) | m(0));
}

/** The six-step ramp for a spell colour: outline, shadow, base, light, pale, white. */
export function fxRamp(color: number): Record<"1" | "2" | "3" | "4" | "5" | "6", string> {
  return {
    "1": mix(color, 0x0b0718, 0.78),
    "2": mix(color, 0x0b0718, 0.4),
    "3": hex(color),
    "4": mix(color, 0xffffff, 0.35),
    "5": mix(color, 0xffffff, 0.7),
    "6": "#ffffff",
  };
}

const defCache = new Map<string, SpriteDef>();
/** A coloured effect sprite. Its `id` includes the colour so textures cache per colour. */
export function fxSprite(kind: FxKind, color: number): SpriteDef {
  const id = `fx-${kind}-${hex(color).slice(1)}`;
  let def = defCache.get(id);
  if (!def) {
    const s = SHAPES[kind];
    def = { id, name: kind.toUpperCase(), w: s.w, h: s.h, palette: fxRamp(color), anims: { idle: fxFrames(kind) }, fps: { idle: s.fps } };
    defCache.set(id, def);
  }
  return def;
}

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

export type FxKind = "orb" | "spark" | "slash" | "ring" | "beam" | "link" | "meteor" | "brick" | "lance" | "dome" | "minion";
export const FX_KINDS: readonly FxKind[] = ["orb", "spark", "slash", "ring", "beam", "link", "meteor", "brick", "lance", "dome", "minion"];

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

/** A chain link (oval ring, lit on top) with a glint that runs round it. */
function linkFrame(f: number): Frame {
  const g = blank(16, 12);
  const cx = 7.5;
  const cy = 5.5;
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 16; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const out = Math.hypot(dx / 6.6, dy / 4.6);
      const inn = Math.hypot(dx / 3.6, dy / 1.7);
      if (out > 1 || inn < 1) continue;
      g[y][x] = dy < -1.5 ? (out > 0.8 ? "4" : "5") : dy > 1.5 ? "2" : "3";
    }
  const a = -Math.PI * 0.8 + f * (Math.PI / 2);
  const gx = cx + Math.cos(a) * 5.2;
  const gy = cy + Math.sin(a) * 3.4;
  put(g, gx, gy, "6");
  put(g, gx + 1, gy, "5");
  return rows(outline(g));
}

/** A data meteor: a cracked, glowing rock with a flickering flame tail behind it (up-left). */
function meteorFrame(f: number): Frame {
  const g = blank(32, 32);
  const hx = 21;
  const hy = 21;
  const r = 6.5;
  const L = 19;
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const dx = x - hx;
      const dy = y - hy;
      const t = -(dx + dy) / Math.SQRT2; // distance back along the tail
      const s = (dx - dy) / Math.SQRT2; // across the tail
      if (t < 0 || t > L) continue;
      const w = (t < r ? r + 0.5 : (r + 0.5) * (1 - (t - r) / (L - r)) ** 1.4) * (1 + 0.25 * Math.sin(t * 1.1 + f * 1.7)) + (Math.abs(s) % 3 < 1 ? 0.4 : 0); // tongues of flame
      const k = Math.abs(s) / Math.max(0.5, w);
      if (k > 1) continue;
      g[y][x] = k < 0.35 ? (t < L * 0.45 ? "6" : "5") : k < 0.7 ? (t < L * 0.6 ? "5" : "4") : t < L * 0.5 ? "4" : "3";
    }
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const dx = x - hx;
      const dy = y - hy;
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      const lit = -(dx + dy) / (r * Math.SQRT2); // lit by its own flame
      let c = lit > 0.45 ? "4" : lit < -0.35 ? "1" : lit < 0.05 ? "2" : "3";
      if ((x * 7 + y * 3) % 11 === 0 && d < r - 1.5) c = lit > 0 ? "6" : "5"; // glowing cracks
      g[y][x] = c;
    }
  for (let e = 0; e < 3; e++) {
    const t = ((f * 5 + e * 7) % 12) + L - 4; // embers peeling off the tail
    const s = (e - 1) * 4 + (f % 2 ? 1 : -1);
    put(g, hx - (t + s) / Math.SQRT2, hy - (t - s) / Math.SQRT2, e === 1 ? "6" : "5");
  }
  return rows(outline(g));
}

/** A data block: a bevelled table brick with a header row and cell lines, a glint sweeping across. */
function brickFrame(f: number): Frame {
  const g = blank(24, 14);
  const glint = [-6, 5, 16, 40][f];
  for (let y = 1; y <= 12; y++)
    for (let x = 1; x <= 22; x++) {
      let c = "3";
      if (y <= 3) c = "4"; // header row
      if (y === 6 || y === 9 || x === 8 || x === 15) c = "2"; // cell lines
      if (y === 1) c = "5";
      if (x === 1 && y > 1) c = "4";
      if (y >= 11 || x === 22) c = "2";
      const d = x - (y - 1) - glint;
      if (c !== "2" && d >= 0 && d < 3) c = d === 1 ? "6" : "5";
      g[y][x] = c;
    }
  return rows(outline(g));
}

/** A spear of light pointing right: a pale shaft, crossguard and a faceted head with a moving glint. */
function lanceFrame(f: number): Frame {
  const g = blank(48, 16);
  for (let x = 4; x <= 31; x++) {
    g[7][x] = "6";
    g[8][x] = x < 10 ? "4" : "5";
  }
  for (let y = 3; y <= 12; y++) {
    g[y][29] = "3";
    g[y][30] = y < 7 ? "4" : "2";
  }
  for (let x = 31; x <= 45; x++) {
    const h = ((45 - x) / 14) * 5.5;
    for (let y = 0; y < 16; y++) {
      const dy = y - 7.5;
      if (Math.abs(dy) > h + 0.5) continue;
      g[y][x] = Math.abs(dy) < 1 ? "5" : dy < 0 ? "4" : "2";
    }
  }
  const gx = 32 + f * 3;
  put(g, gx, 7, "6");
  put(g, gx + 1, 6, "6");
  put(g, gx + 1, 8, "5");
  for (let m = 0; m < 3; m++) put(g, ((f * 3 + m * 5) % 9) + 0, 6 + m * 2 - (f % 2), m === 1 ? "6" : "5"); // trailing motes
  return rows(outline(g));
}

/** A hexagonal force field: a bright rim and honeycomb struts, a shimmer band sweeping down it. */
function domeFrame(f: number): Frame {
  const g = blank(48, 48);
  const c = 23.5;
  const R = 21.5;
  const H = (Math.sqrt(3) / 2) * R;
  const band = [-18, -6, 6, 18][f];
  for (let y = 0; y < 48; y++)
    for (let x = 0; x < 48; x++) {
      const dx = x - c;
      const dy = y - c;
      const h = Math.max(Math.abs(dy) / H, ((Math.sqrt(3) / 2) * Math.abs(dx) + 0.5 * Math.abs(dy)) / H);
      if (h > 1) continue;
      const shine = Math.abs(dy - band) < 3;
      if (h > 1 - 2.6 / H) g[y][x] = shine ? "6" : dy < 0 ? "5" : "4";
      else if (Math.abs(h - 0.52) < 0.035) g[y][x] = shine ? "5" : "3";
      else if (h > 0.52) {
        const ang = Math.atan2(dy, dx);
        const off = Math.abs(((ang + Math.PI * 2) % (Math.PI / 3)) - Math.PI / 6); // 0 halfway between vertices
        if (Math.abs(off - Math.PI / 6) * Math.hypot(dx, dy) < 0.7) g[y][x] = shine ? "5" : "3"; // spokes to the vertices
      }
    }
  return rows(outline(g));
}

/** A tiny data imp summoned in a swarm: a faceted diamond body, big eyes and flapping wings. */
function minionFrame(f: number): Frame {
  const g = blank(20, 16);
  const cx = 10;
  const cy = 8;
  const bob = f === 1 ? -1 : f === 3 ? 1 : 0;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 20; x++) {
      const dx = x - cx;
      const dy = y - cy - bob;
      if (Math.abs(dx) + Math.abs(dy) > 4.5) continue;
      g[y][x] = dx + dy < -2 ? "4" : dx + dy > 2 ? "2" : "3";
    }
  put(g, cx, cy - 4 + bob, "5");
  const lift = [-1, 0, 1, 0][f];
  for (let i = 1; i <= 4; i++) {
    const top = cy + bob - 1 + lift * i - (4 - i) * 0.5;
    for (let j = 0; j <= 4 - i; j++) {
      const col = j === 0 ? "4" : "3";
      put(g, cx - 4 - i, top + j, col);
      put(g, cx + 4 + i, top + j, col);
    }
  }
  for (const ex of [cx - 2, cx + 1]) {
    put(g, ex, cy - 1 + bob, "6");
    put(g, ex, cy + bob, "1");
  }
  put(g, cx, cy + 6 + bob, f % 2 ? "6" : "5"); // spark tail
  return rows(outline(g));
}

const SHAPES: Record<FxKind, { w: number; h: number; frame: (f: number) => Frame; fps: number }> = {
  orb: { w: 16, h: 16, frame: orbFrame, fps: 12 },
  spark: { w: 32, h: 32, frame: sparkFrame, fps: 16 },
  slash: { w: 32, h: 32, frame: slashFrame, fps: 16 },
  ring: { w: 32, h: 32, frame: ringFrame, fps: 12 },
  beam: { w: 8, h: 16, frame: beamFrame, fps: 14 },
  link: { w: 16, h: 12, frame: linkFrame, fps: 10 },
  meteor: { w: 32, h: 32, frame: meteorFrame, fps: 14 },
  brick: { w: 24, h: 14, frame: brickFrame, fps: 12 },
  lance: { w: 48, h: 16, frame: lanceFrame, fps: 14 },
  dome: { w: 48, h: 48, frame: domeFrame, fps: 10 },
  minion: { w: 20, h: 16, frame: minionFrame, fps: 12 },
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

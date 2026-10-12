// AGGREGON, boss of chapter 3, The Compressor: a golem of stacked stone
// blocks that squeezes many rows into one. A Σ core glows in its chest and its
// blocks drift apart when it breathes, then slam together when it attacks.
// Run: node scripts/art/aggregon.mjs
import { Layer, emit, dissolve } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#1a0f14", // outline
  a: "#5a2a1a", // block ramp (terracotta), dark → light
  b: "#99472a",
  c: "#d27a3c",
  d: "#f3b36b",
  e: "#ffe0a8",
  s: "#3a3550", // dark stone for the joints
  t: "#5d5878",
  p: "#3b0f5c", // Σ core ramp
  q: "#7b2fd0",
  r: "#c48bff",
  w: "#f6ecff",
  y: "#ffe45c", // eye
  x: "#ff4f6d", // hurt eye
};
const BLOCK = ["a", "b", "c", "d", "e"];
const CORE = ["p", "q", "r", "w"];
const STONE = ["s", "t"];

/** A 2.5D block: front face at (x, y) of size w×h, with a lit top and a shaded right side of depth d. */
function block(x, y, w, h, d = 4, { ramp = BLOCK, bias = 0, chip = 0 } = {}) {
  const L = new Layer(W, H);
  x = Math.round(x);
  y = Math.round(y);
  // top face
  L.poly(
    [
      [x, y],
      [x + d, y - d],
      [x + w + d, y - d],
      [x + w, y],
    ],
    ramp,
    () => 0.92 + bias,
  );
  // right side
  L.poly(
    [
      [x + w, y],
      [x + w + d, y - d],
      [x + w + d, y + h - d],
      [x + w, y + h],
    ],
    ramp,
    (px, py) => 0.22 + bias - (py - y) / (h * 6),
  );
  // front face: lit from the upper left
  L.poly(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    ramp,
    (px, py) => 0.66 + bias - (px - x) / (w * 4) - (py - y) / (h * 3),
  );
  // edge highlight and a chipped corner
  L.line(x, y, x + w - 1, y, ramp[ramp.length - 1]);
  L.line(x, y, x, y + h - 1, ramp[ramp.length - 2]);
  if (chip) L.poly([[x + w - chip, y + h], [x + w, y + h - chip], [x + w, y + h]], ".");
  // a crack across the front
  L.line(x + 2, y + Math.floor(h * 0.6), x + Math.floor(w * 0.4), y + Math.floor(h * 0.45), ramp[0]);
  L.outline("k");
  return L;
}

/** A pulsing aura ring around the core when it is bright. */
function ring0(L, x, y, core) {
  if (core < 0.55) return;
  for (let a = 0; a < Math.PI * 2; a += 0.09) L.set(x + Math.cos(a) * 9, y + Math.sin(a) * 8, core > 0.85 ? "r" : "q");
}

/**
 * pose.gap: how far the blocks drift apart (−1 squeezed … 2 loose); pose.bob: height;
 * pose.arms: 0 down … 1 raised overhead; pose.face: "normal" | "angry" | "hurt" | "faint";
 * pose.core: 0 … 1 brightness of the Σ core; pose.tilt: sideways shear of the stack.
 */
function frame({ gap = 0, bob = 0, arms = 0, face = "normal", core = 0.5, tilt = 0 }) {
  const out = new Layer(W, H);
  const cx = 48;
  const g = gap;
  const sh = (y) => Math.round(tilt * (70 - y) / 30);

  // legs: two thick blocks on stone feet
  for (const s of [-1, 1]) {
    out.draw(block(cx + s * 11 - 8 + (s > 0 ? 2 : 0), 74 + bob * 0.3, 14, 15, 4, { bias: -0.08 }));
  }

  // torso: three rows of blocks, stacked back to front
  const ty = 34 + bob;
  const rows = [
    // [x offset, y offset, w, h]
    [[-26, 0, 17, 13], [-9, 0, 18, 13], [9, 0, 17, 13]],
    [[-24, 13, 15, 12], [-9, 13, 18, 12], [9, 13, 15, 12]],
    [[-20, 25, 20, 12], [0, 25, 20, 12]],
  ];
  rows.forEach((row, ri) =>
    row.forEach(([ox, oy, w, h], bi) => {
      const spread = g * (bi - (row.length - 1) / 2) * 1.6;
      out.draw(block(cx + ox + spread + sh(ty + oy), ty + oy + g * ri * 1.4, w, h, 4, { chip: (ri + bi) % 3 === 1 ? 3 : 0, bias: [0.04, -0.07, 0.0, -0.12][(ri * 2 + bi) % 4] }));
    }),
  );

  // Σ core in the centre block
  const core0 = new Layer(W, H);
  const kx = cx + sh(ty + 13);
  const ky = ty + 19 + g * 1.4;
  core0.ellipse(kx, ky, 7, 6, CORE, { bias: core * 0.25 - 0.2 });
  core0.outline("k");
  const sc = core > 0.7 ? "w" : "y";
  ring0(core0, kx, ky, core);
  // the Σ glyph
  core0.line(kx - 3, ky - 3, kx + 3, ky - 3, sc);
  core0.line(kx - 3, ky - 3, kx, ky, sc);
  core0.line(kx, ky, kx - 3, ky + 3, sc);
  core0.line(kx - 3, ky + 3, kx + 3, ky + 3, sc);
  if (core > 0.7)
    for (const [dx, dy] of [
      [-10, 0],
      [10, 0],
      [0, -9],
      [0, 9],
      [-8, -7],
      [8, 7],
    ])
      core0.set(kx + dx, ky + dy, "r");
  out.draw(core0);

  // arms: stone joints, then a column of blocks ending in a heavy fist block
  for (const s of [-1, 1]) {
    const sx = cx + s * 30 + sh(ty);
    const A = new Layer(W, H);
    // shoulder joint
    A.ellipse(sx, ty + 4, 6, 6, STONE);
    A.outline("k");
    out.draw(A);
    const up = arms;
    for (let i = 0; i < 2; i++) {
      const bx = sx - 5 + s * (2 + i * 2) * (1 - up) + s * up * 3;
      const by = ty + 6 + (i * 10 + g * (i + 1)) * (1 - up) - up * (14 + i * 10);
      out.draw(block(bx, by, 10, 9, 3, { bias: s > 0 ? -0.2 : -0.12 }));
    }
    const fx = sx - 9 + s * 6 * (1 - up) + s * up * 4;
    const fy = ty + 26 + g * 3 - up * 52;
    out.draw(block(fx, fy, 17, 14, 4, { bias: s > 0 ? -0.1 : 0.02, chip: 3 }));
    if (up > 0.5) {
      // dust shaking off the raised fists
      out.set(fx - 3, fy + 4, "d");
      out.set(fx + 20, fy - 2, "d");
      out.set(fx + 9, fy - 9, "e");
    }
  }

  // head: one block with a visor slit and a little crown of pebbles
  const hx = cx - 9 + sh(20) * 1.2;
  const hy = 17 + bob - g * 2 + (face === "faint" ? 5 : 0);
  for (const dx of [2, 8, 14]) {
    const P = new Layer(W, H);
    P.ellipse(hx + dx + 2, hy - 6 + (dx === 8 ? -2 : 0), 2.6, 2.4, STONE);
    P.outline("k");
    out.draw(P);
  }
  out.draw(block(hx, hy, 18, 15, 4, { bias: 0.06 }));
  const ey = hy + 6;
  for (let dx = 2; dx <= 15; dx++) out.set(hx + dx, ey, "k");
  for (let dx = 2; dx <= 15; dx++) out.set(hx + dx, ey + 1, "k");
  if (face === "hurt") {
    for (const ex of [hx + 5, hx + 12]) {
      out.line(ex - 2, ey - 1, ex + 2, ey + 2, "x");
      out.line(ex - 2, ey + 2, ex + 2, ey - 1, "x");
    }
  } else if (face !== "faint") {
    const c = face === "angry" ? "w" : "y";
    for (const ex of [hx + 5, hx + 12]) {
      out.line(ex - 2, ey, ex + 1, ey, c);
      out.line(ex - 1, ey + 1, ex + 2, ey + 1, "y");
    }
    if (face === "angry") {
      out.line(hx + 2, ey - 3, hx + 7, ey - 1, "k");
      out.line(hx + 15, ey - 3, hx + 10, ey - 1, "k");
    }
  }
  // grim mouth seam
  out.line(hx + 6, hy + 11, hx + 12, hy + 11, "a");
  return out;
}

const hurt = frame({ gap: 1.5, bob: 2, face: "hurt", core: 0.2, tilt: 2 });
const down = frame({ gap: 1, bob: 6, face: "faint", core: 0, tilt: -2 });

/** Faint: the stack slumps, then the blocks crumble away. */
function crumble(f, amount, dy) {
  return dissolve(f, amount, dy);
}
emit(new URL("../../game/sprites/creatures/aggregon.ts", import.meta.url), {
  id: "aggregon",
  name: "AGGREGON",
  script: "aggregon",
  w: W,
  h: H,
  palette,
  comment: "Chapter 3 boss: a golem of stacked blocks with a Σ core that compresses rows. Front view, 96×96.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ gap: 0, core: 0.4 }), frame({ gap: 0.6, bob: -1, core: 0.6 }), frame({ gap: 1.2, bob: -1, core: 0.9 }), frame({ gap: 0.6, core: 0.6 })],
    attack: [frame({ gap: 1.5, bob: -1, arms: 0.5, face: "angry", core: 0.8 }), frame({ gap: 1.8, bob: -2, arms: 1, face: "angry", core: 1 }), frame({ gap: -1, bob: 3, arms: 0, face: "angry", core: 1 })],
    hurt: [hurt, frame({ gap: 0.8, bob: 1, face: "hurt", core: 0.3, tilt: 1 })],
    faint: [down, crumble(down, 0.3, 3), crumble(down, 0.6, 6), crumble(down, 0.85, 9)],
  },
});

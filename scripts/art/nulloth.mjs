// NULLOTH, boss of chapter 1: a hooded void-ghost that feeds on missing values.
// Its eyes are empty-set rings (∅) and NULL bits drift around it.
// Run: node scripts/art/nulloth.mjs
import { Layer, emit } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#0c1420", // outline
  d: "#1f5f66", // shroud ramp, dark → light
  c: "#2f9a98",
  b: "#5eead4",
  a: "#c6fff3",
  v: "#07070f", // void ramp (inside the hood), dark → light
  u: "#1b1638",
  t: "#3a2a6b",
  y: "#fff3a3", // eye glow
  o: "#ffc94a",
  r: "#ff5d8f", // mouth glow
  m: "#8a1f4a",
  n: "#9aa7c7", // floating NULL bits
  w: "#ffffff",
};
const SHROUD = ["d", "c", "b", "a"];
const VOID = ["v", "u", "t"];

/**
 * pose.bob: float height; pose.sway: tail tip offset; pose.arms: −1 lowered … 1 raised;
 * pose.mouth: 0 shut … 1 wide; pose.face: "normal" | "hurt" | "faint"; pose.bits: orbit phase.
 */
function frame({ bob = 0, sway = 0, arms = 0, mouth = 0, face = "normal", bits = 0, lean = 0 }) {
  const out = new Layer(W, H);
  const cx = 48 + lean;
  const cy = 34 + bob;

  // wispy arms behind the shroud
  for (const s of [-1, 1]) {
    const L = new Layer(W, H);
    const X = (x) => cx + s * x;
    const hand = cy + 18 - arms * 20;
    L.poly(
      [
        [X(14), cy + 2],
        [X(30), hand - 4],
        [X(40), hand - 9 + (s > 0 ? 2 : 0)],
        [X(36), hand],
        [X(41), hand + 4],
        [X(33), hand + 5],
        [X(36), hand + 10],
        [X(26), hand + 6],
        [X(15), cy + 14],
      ],
      SHROUD,
      (x, y) => 0.75 - (s > 0 ? 0.3 : 0) - (y - (hand - 9)) / 60 - Math.abs(x - cx) / 200,
    );
    // claw tips glow when the arms are raised
    if (arms > 0.5) {
      L.set(X(40), hand - 9 + (s > 0 ? 2 : 0), "y");
      L.set(X(41), hand + 4, "y");
      L.set(X(36), hand + 10, "o");
    }
    L.outline("k");
    out.draw(L);
  }

  // shroud: a hooded head flowing into a tattered tail
  const body = new Layer(W, H);
  const left = [];
  const right = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const y = cy + 10 + t * 44;
    const half = 24 - t * 13 + Math.sin(t * 7 + bits * 0.8) * 2.2;
    const off = sway * t * t;
    left.push([cx - half + off, y]);
    right.push([cx + half + off, y]);
  }
  // ragged hem: alternating long and short points
  const end = left[left.length - 1][1];
  const hemL = left[left.length - 1][0];
  const hemR = right[right.length - 1][0];
  const hem = [];
  const N = 5;
  for (let i = 0; i <= N; i++) {
    const x = hemL + ((hemR - hemL) * i) / N;
    hem.push([x, end + (i % 2 === 0 ? 8 : 1) + (i === 2 ? 4 : 0)]);
  }
  body.poly(
    [...left, ...hem, ...[...right].reverse()],
    SHROUD,
    (x, y) => 0.95 - (y - cy) / 70 - (x - cx) / 60,
  );
  body.ellipse(cx, cy, 24, 22, SHROUD);
  // hood peak, swept back to the right
  body.poly(
    [
      [cx - 8, cy - 18],
      [cx + 6, cy - 31],
      [cx + 12, cy - 16],
    ],
    SHROUD,
    (x, y) => 0.95 - (y - (cy - 31)) / 40 - (x - cx) / 40,
  );
  // tattered fold lines down the tail
  body.outline("k");
  for (const [x0, x1] of [
    [-6, -4],
    [5, 7],
    [14, 10],
  ]) {
    const off = sway * 0.6;
    body.line(cx + x0, cy + 20, cx + x1 + off, cy + 46, "d");
  }
  out.draw(body);

  // hood opening: the void
  const hood = new Layer(W, H);
  hood.ellipse(cx - 1, cy + 2, 16, 14, VOID, { bias: -0.25, light: [0.55, 0.7, 0.45] });
  out.draw(hood);
  // rim of the hood, a highlight along the upper left
  for (let a = Math.PI * 0.95; a < Math.PI * 1.6; a += 0.04) out.set(cx - 1 + Math.cos(a) * 17, cy + 2 + Math.sin(a) * 15, "a");

  // eyes: glowing empty-set rings, slashed
  for (const s of [-1, 1]) {
    const ex = cx - 1 + s * 7;
    const ey = cy - 1;
    if (face === "hurt") {
      // squeezed shut: > <
      const p = -s;
      out.line(ex - 3 * p, ey - 3, ex + 3 * p, ey, "y");
      out.line(ex - 3 * p, ey + 3, ex + 3 * p, ey, "y");
      continue;
    }
    if (face === "faint") {
      out.line(ex - 3, ey, ex + 3, ey, "t");
      continue;
    }
    for (let a = 0; a < Math.PI * 2; a += 0.05) out.set(ex + Math.cos(a) * 3.4, ey + Math.sin(a) * 3.8, "y");
    out.set(ex, ey, "o");
    out.line(ex - 4, ey + 4, ex + 4, ey - 4, "w");
    // glow halo
    for (const [dx, dy] of [
      [-5, 0],
      [5, 0],
      [0, -5],
      [0, 5],
    ])
      if (hood.get(ex + dx, ey + dy) !== ".") out.set(ex + dx, ey + dy, "t");
  }

  // jagged mouth
  if (face !== "faint") {
    const my = cy + 8;
    const open = Math.round(mouth * 4);
    const pts = [];
    for (let x = -6; x <= 6; x++) pts.push([cx - 1 + x, my + (x % 2 === 0 ? 0 : 1)]);
    for (const [x, y] of pts) {
      out.set(x, y, "r");
      for (let k = 1; k <= open; k++) out.set(x, y + k, k === open ? "r" : "m");
    }
    if (open > 0)
      for (let x = -6; x <= 6; x += 3) {
        out.set(cx - 1 + x, my + 1, "w");
      }
  }

  // drifting NULL bits (little 0-shaped tiles) around the ghost
  const orbit = new Layer(W, H);
  for (let i = 0; i < 4; i++) {
    const a = bits * 0.9 + i * (Math.PI / 2) + 0.4;
    const bx = Math.round(cx + Math.cos(a) * 40);
    const by = Math.round(cy + 16 + Math.sin(a) * 14);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) if (y === 0 || y === 4 || x === 0 || x === 3) orbit.set(bx + x, by + y, Math.sin(a) > 0 ? "n" : "t");
  }
  orbit.outline("k");
  // bits in front of the body only when on the near side of the orbit
  out.draw(orbit);
  return out;
}

/** Dissolve: knock out pixels in a dither pattern, `amount` 0 … 1. */
function dissolve(layer, amount, dy = 0) {
  const out = new Layer(W, H).draw(layer, 0, dy);
  const B = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((B[y & 3][x & 3] + 0.5) / 16 < amount) out.px[y][x] = ".";
  return out;
}

const hurt = frame({ bob: 2, sway: 6, arms: -0.6, face: "hurt", lean: 3 });
const down = frame({ bob: 6, sway: 2, arms: -1, face: "faint" });
emit(new URL("../../game/sprites/creatures/nulloth.ts", import.meta.url), {
  id: "nulloth",
  name: "NULLOTH",
  w: W,
  h: H,
  palette,
  comment: "Chapter 1 boss: a hooded void-ghost with ∅ eyes and drifting NULL bits. Front view, 96×96.",
  fps: { idle: 5, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ bob: 0, sway: -3, bits: 0 }), frame({ bob: -1, sway: 0, bits: 1 }), frame({ bob: -2, sway: 3, bits: 2 }), frame({ bob: -1, sway: 0, bits: 3 })],
    attack: [frame({ bob: -2, sway: -4, arms: 0.6, mouth: 0.5, bits: 0 }), frame({ bob: -4, sway: -6, arms: 1, mouth: 1, bits: 1, lean: -2 }), frame({ bob: -1, sway: 0, arms: 0.3, mouth: 0.25, bits: 2 })],
    hurt: [hurt, frame({ bob: 1, sway: 3, arms: -0.3, face: "hurt", lean: 1 })],
    faint: [down, dissolve(down, 0.3, 3), dissolve(down, 0.6, 6), dissolve(down, 0.85, 9)],
  },
});

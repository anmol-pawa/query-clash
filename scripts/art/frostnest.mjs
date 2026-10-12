// FROSTNEST, boss of chapter 4 (The Nested Frost): an ice wraith whose chest
// holds a crystal nested inside a crystal inside a crystal, like a subquery.
// A crown of icicles, a frost-cloak that trails to a point and icicle claws.
// Run: node scripts/art/frostnest.mjs
import { Layer, emit, dissolve } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#0b1026", // outline
  a: "#1d2f6b", // ice ramp, dark → light
  b: "#3a6fc4",
  c: "#7fb8f0",
  d: "#c4e8ff",
  e: "#f4fbff",
  m: "#241a4a", // cloak ramp, dark → light
  n: "#40306e",
  o: "#6a55a6",
  p: "#9c8ad6",
  g: "#5ef2ff", // core / eye glow
  h: "#b8fbff",
  r: "#ff6fa8", // hurt eyes
  v: "#05060f", // face shadow
};
const ICE = ["a", "b", "c", "d", "e"];
const CLOAK = ["m", "n", "o", "p"];

/** A diamond-shaped crystal, shaded as two facets. */
function crystal(L, x, y, rx, ry, bias = 0) {
  L.poly(
    [
      [x, y - ry],
      [x + rx, y],
      [x, y + ry],
      [x - rx, y],
    ],
    ICE,
    (px, py) => 0.7 + bias - (px - x) / (rx * 2.2) - (py - y) / (ry * 4),
  );
  return L;
}

/**
 * pose.bob: float height; pose.sway: cloak-tip offset; pose.arms: −1 lowered … 1 raised;
 * pose.face: "normal" | "angry" | "hurt" | "faint"; pose.core: 0 … 1 glow; pose.snow: flake phase;
 * pose.lean: x offset of the upper body.
 */
function frame({ bob = 0, sway = 0, arms = 0, face = "normal", core = 0.5, snow = 0, lean = 0 }) {
  const out = new Layer(W, H);
  const cx = 48 + lean;
  const cy = 30 + bob;

  // icicle claws behind the cloak
  for (const s of [-1, 1]) {
    const L = new Layer(W, H);
    const X = (x) => cx + s * x;
    const hy = cy + 30 - arms * 26;
    L.poly(
      [
        [X(10), cy + 8],
        [X(29), hy - 9],
        [X(36), hy + 1],
        [X(26), hy + 3],
        [X(14), cy + 26],
      ],
      CLOAK,
      (x, y) => 0.7 - (s > 0 ? 0.25 : 0) - (y - cy) / 90,
    );
    // three icicle talons
    for (let i = 0; i < 3; i++) {
      const bx = X(30 + i * 2);
      const by = hy - 4 + i * 2;
      const tx = X(36 + i * 3 + arms * 2);
      const ty = by + 11 - arms * 16 + i * 2;
      L.poly(
        [
          [bx - 2, by],
          [bx + 2, by],
          [tx, ty],
        ],
        ICE,
        () => 0.8 - i * 0.12 - (s > 0 ? 0.15 : 0),
      );
    }
    L.outline("k");
    out.draw(L);
  }

  // cloak: a hooded mantle that trails into a long frost tail
  const body = new Layer(W, H);
  const left = [];
  const right = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const y = cy + 4 + t * 54;
    const half = 22 * (1 - t) ** 0.8 + 1 + Math.sin(t * 9 + snow) * 1.5 * t;
    const off = sway * t * t;
    left.push([cx - half + off, y]);
    right.push([cx + half + off, y]);
  }
  body.poly([...left, ...[...right].reverse()], CLOAK, (x, y) => 0.9 - (y - cy) / 80 - (x - cx) / 50);
  body.ellipse(cx, cy, 19, 17, CLOAK, { bias: 0.05 });
  body.outline("k");
  // frost hem: icy spikes along the cloak edge
  for (let i = 2; i <= 10; i += 2) {
    const [lx, ly] = left[i];
    const [rx, ry] = right[i];
    body.line(lx + 1, ly, lx + 4, ly + 3, "c");
    body.line(rx - 1, ry, rx - 4, ry + 3, "b");
  }
  out.draw(body);

  // ice shoulder shards
  const pads = new Layer(W, H);
  for (const s of [-1, 1]) {
    crystal(pads, cx + s * 17, cy + 9, 5, 7, s > 0 ? -0.2 : 0.05);
    crystal(pads, cx + s * 22, cy + 13, 3, 5, s > 0 ? -0.25 : 0);
  }
  pads.outline("k");
  out.draw(pads);

  // face: a shadowed hollow under the crown with two slit eyes
  const face0 = new Layer(W, H);
  face0.ellipse(cx, cy + 1, 12, 10, ["v", "m"], { bias: -0.2 });
  out.draw(face0);
  for (const s of [-1, 1]) {
    const ex = cx + s * 5;
    const ey = cy + 1;
    if (face === "hurt") {
      out.line(ex - 2, ey - 2, ex + 2, ey + 2, "r");
      out.line(ex - 2, ey + 2, ex + 2, ey - 2, "r");
    } else if (face === "faint") {
      out.line(ex - 2, ey + 1, ex + 2, ey + 1, "n");
    } else {
      // slanted, glowing slits
      out.line(ex - 3 * s, ey + 1, ex + 2 * s, ey - 1, face === "angry" ? "h" : "g");
      out.line(ex - 3 * s, ey + 2, ex + 2 * s, ey, "g");
      if (face === "angry") out.set(ex, ey + 4, "h");
    }
  }
  // frozen breath
  if (face === "angry")
    for (let i = 0; i < 4; i++) out.set(cx - 2 + i, cy + 8 + (i & 1), "d");

  // crown of icicles above the hood
  const crown = new Layer(W, H);
  const spikes = [
    [-16, 9],
    [-10, 15],
    [-4, 20],
    [3, 24],
    [10, 17],
    [16, 10],
  ];
  for (const [dx, hgt] of spikes)
    crown.poly(
      [
        [cx + dx - 3.5, cy - 11],
        [cx + dx + 3.5, cy - 11],
        [cx + dx + 0.5, cy - 11 - hgt],
      ],
      ICE,
      (x, y) => 0.95 - (x - cx - dx + 3) / 9 - (y - cy + 11) / -60,
    );
  crown.outline("k");
  out.draw(crown);

  // nested crystal core: crystal ⊂ crystal ⊂ crystal
  const nest = new Layer(W, H);
  const ky = cy + 24;
  crystal(nest, cx, ky, 10, 13, -0.1);
  nest.outline("k");
  crystal(nest, cx, ky, 6, 8, 0.1);
  for (const [x, y] of [
    [cx, ky - 8],
    [cx + 6, ky],
    [cx, ky + 8],
    [cx - 6, ky],
  ])
    nest.set(x, y, "a");
  const inner = new Layer(W, H);
  inner.poly(
    [
      [cx, ky - 4],
      [cx + 3, ky],
      [cx, ky + 4],
      [cx - 3, ky],
    ],
    core > 0.7 ? "h" : "g",
  );
  inner.set(cx - 1, ky - 1, "e");
  nest.draw(inner);
  if (core > 0.6)
    for (const [dx, dy] of [
      [-13, 0],
      [13, 0],
      [0, -16],
      [0, 16],
    ])
      nest.set(cx + dx, ky + dy, core > 0.85 ? "h" : "g");
  out.draw(nest);

  // drifting snowflakes (little plus shapes)
  for (let i = 0; i < 5; i++) {
    const a = snow * 0.7 + i * 1.3;
    const fx = Math.round(cx + Math.cos(a) * (32 + (i % 2) * 6));
    const fy = Math.round(cy + 14 + Math.sin(a * 1.3) * 22 + i * 3);
    const c = i % 2 ? "e" : "d";
    out.set(fx, fy, c);
    out.set(fx - 1, fy, "c");
    out.set(fx + 1, fy, "c");
    out.set(fx, fy - 1, "c");
    out.set(fx, fy + 1, "c");
  }
  return out;
}

const hurt = frame({ bob: 2, sway: 7, arms: -0.6, face: "hurt", core: 0.2, lean: 3, snow: 1 });
const down = frame({ bob: 8, sway: 2, arms: -1, face: "faint", core: 0, snow: 2 });
emit(new URL("../../game/sprites/creatures/frostnest.ts", import.meta.url), {
  id: "frostnest",
  name: "FROSTNEST",
  script: "frostnest",
  w: W,
  h: H,
  palette,
  comment: "Chapter 4 boss: an ice wraith with nested crystals in its chest (a subquery). Front view, 96×96.",
  fps: { idle: 5, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ bob: 0, sway: -3, snow: 0, core: 0.5 }), frame({ bob: -1, sway: 0, snow: 1, core: 0.65 }), frame({ bob: -2, sway: 3, snow: 2, core: 0.9 }), frame({ bob: -1, sway: 0, snow: 3, core: 0.65 })],
    attack: [frame({ bob: -2, sway: -4, arms: 0.5, face: "angry", core: 0.8, snow: 0 }), frame({ bob: -4, sway: -6, arms: 1, face: "angry", core: 1, snow: 1, lean: -2 }), frame({ bob: 0, sway: 2, arms: 0.2, face: "angry", core: 0.9, snow: 2, lean: 2 })],
    hurt: [hurt, frame({ bob: 1, sway: 3, arms: -0.3, face: "hurt", core: 0.3, lean: 1, snow: 2 })],
    faint: [down, dissolve(down, 0.3, 3), dissolve(down, 0.6, 6), dissolve(down, 0.85, 9)],
  },
});

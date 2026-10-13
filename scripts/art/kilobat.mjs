// KILOBAT, BYTEBAT's first evolution: a taller, leaner data-bat with swept
// ears, scalloped circuit wings, a bit-collar and a cable tail ending in a plug.
// Run: node scripts/art/kilobat.mjs
import { Layer, emit, halo, scaleLayer, sparkle, whiten } from "./paint.mjs";

const W = 64;
const H = 64;
const palette = {
  k: "#170c2b", // outline
  d: "#33206e", // body ramp, dark → light
  c: "#5a3bb4",
  b: "#8a66e2",
  a: "#c7b0fb",
  h: "#0f3347", // wing membrane ramp
  g: "#18607a",
  f: "#2a9fae",
  e: "#76e4da",
  o: "#d2fff7", // circuit glow
  n: "#9a6a2a", // gold ramp (collar, claws, plug)
  j: "#e0a845",
  i: "#ffe08a",
  l: "#fff3d6", // chest fur
  m: "#8e1f4a", // mouth
  r: "#ff86ae", // inner ear / cheek
  y: "#ffcf3a", // iris
  w: "#ffffff",
};
const BODY = ["d", "c", "b", "a"];
const WING = ["h", "g", "f", "e"];
const GOLD = ["n", "j", "i"];
const CHEST = ["j", "i", "l"];

/** The wing on side s (−1 left, +1 right) as its own outlined layer. */
function wingLayer(s, cy, { wing, bob, spread, back = false }) {
  const L = new Layer(W, H);
  const X = (x) => 32 + s * x;
  const tip = 6 + wing + bob;
  const sp = spread;
  const pts = [
    [X(9), cy - 6],
    [X(16 + sp * 0.5), tip + 6],
    [X(30 + sp), tip],
    [X(29 + sp), tip + 5],
    [X(26 + sp), tip + 11],
    [X(30 + sp), cy + 3 + wing * 0.4],
    [X(25 + sp * 0.8), cy + wing * 0.3],
    [X(24 + sp * 0.6), cy + 9 + wing * 0.3],
    [X(20 + sp * 0.4), cy + 4 + wing * 0.2],
    [X(16 + sp * 0.2), cy + 11 + wing * 0.15],
    [X(12), cy + 6],
    [X(9), cy + 4],
  ];
  const lit = back ? 0.9 : 1.0;
  L.poly(pts, WING, (x, y) => lit - (y - tip) / 48 - (s > 0 ? 0.18 : 0) - Math.abs(x - 32) / 170);
  // arm bone to the wrist, then three finger bones to the scallop points
  const wx = X(16 + sp * 0.5);
  const wy = tip + 6;
  L.line(X(10), cy - 5, wx, wy, "h");
  L.line(wx, wy, X(29 + sp), tip + 1, "h");
  L.line(wx, wy, X(29 + sp), cy + 2 + wing * 0.4, "h");
  L.line(wx, wy, X(24 + sp * 0.6), cy + 9 + wing * 0.3, "h");
  L.line(wx, wy, X(16 + sp * 0.2), cy + 11 + wing * 0.15, "h");
  if (!back) {
    // circuit traces with glowing nodes between the bones
    L.line(X(13), cy - 1, X(20 + sp * 0.6), tip + 13, "o");
    L.line(X(20 + sp * 0.6), tip + 13, X(23 + sp * 0.8), tip + 13, "o");
    L.set(X(23 + sp * 0.8), tip + 13, "w");
    L.line(X(14), cy + 3, X(20 + sp * 0.4), cy + 2 + wing * 0.2, "o");
    L.set(X(20 + sp * 0.4), cy + 2 + wing * 0.2, "w");
  }
  L.outline("k");
  // gold thumb claw at the wrist
  L.set(wx, wy - 1, "j");
  L.set(wx, wy - 2, "i");
  L.set(wx - s, wy - 1, "n");
  L.set(wx, wy - 3, "k");
  return L;
}

/** The cable tail curling out to the right, ending in a two-pronged gold plug. */
function tailLayer(cy, sway = 0) {
  const L = new Layer(W, H);
  const pts = [
    [36, cy + 15],
    [42, cy + 19],
    [47, cy + 19 + sway * 0.5],
    [51, cy + 16 + sway],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    L.line(x0, y0, x1, y1, "c");
    L.line(x0, y0 + 1, x1, y1 + 1, "d");
  }
  const [px, py] = pts[pts.length - 1];
  L.poly(
    [
      [px - 1, py - 2],
      [px + 4, py - 3],
      [px + 4, py + 2],
      [px - 1, py + 2],
    ],
    GOLD,
    (x, y) => 0.95 - (y - py + 3) / 6,
  );
  L.outline("k");
  // prongs
  L.set(px + 5, py - 2, "i");
  L.set(px + 6, py - 2, "k");
  L.set(px + 5, py + 1, "j");
  L.set(px + 6, py + 1, "k");
  return L;
}

/**
 * pose.wing: wingtip offset (−6 up … +8 down); pose.bob: body drop in px;
 * pose.mouth: open mouth; pose.spread: wings pushed outwards; pose.sway: tail.
 */
function frame({ wing = 0, bob = 0, mouth = false, spread = 0, face = "normal", sway = 0 }) {
  const out = new Layer(W, H);
  const cy = 36 + bob;

  out.draw(tailLayer(cy, sway));
  for (const s of [-1, 1]) out.draw(wingLayer(s, cy, { wing, bob, spread }));

  // long swept ears with a gold notch near the tip
  const ears = new Layer(W, H);
  for (const s of [-1, 1]) {
    const X = (x) => 32 + s * x;
    ears.poly(
      [
        [X(4), cy - 15],
        [X(15), cy - 33],
        [X(12), cy - 12],
      ],
      BODY,
      (x, y) => 0.8 - (s > 0 ? 0.25 : 0) - (y - (cy - 33)) / 60,
    );
    ears.poly(
      [
        [X(6.5), cy - 15],
        [X(13), cy - 28],
        [X(10.5), cy - 13],
      ],
      "r",
    );
  }
  ears.outline("k");
  for (const s of [-1, 1]) {
    const X = (x) => 32 + s * x;
    ears.set(X(13), cy - 27, "j");
    ears.set(X(12), cy - 26, "j");
  }
  out.draw(ears);

  // lean body, round head on top, a fur ruff between them, clawed feet
  const body = new Layer(W, H);
  body.ellipse(32, cy + 8, 10, 11, BODY, { bias: -0.05 });
  body.ellipse(27, cy + 19, 3, 2, BODY, { bias: -0.2 });
  body.ellipse(37, cy + 19, 3, 2, BODY, { bias: -0.3 });
  body.ellipse(32, cy - 9, 12, 9.5, BODY);
  // swept crest of fur on the head
  body.poly(
    [
      [28, cy - 16],
      [31, cy - 23],
      [33, cy - 16],
    ],
    BODY,
    () => 0.75,
  );
  body.poly(
    [
      [31, cy - 16],
      [37, cy - 21],
      [36, cy - 15],
    ],
    BODY,
    () => 0.5,
  );
  // ruff: jagged fur sticking out at the neck
  for (const s of [-1, 1]) {
    const X = (x) => 32 + s * x;
    body.poly(
      [
        [X(7), cy - 3],
        [X(13), cy - 1],
        [X(9), cy + 2],
        [X(12), cy + 4],
        [X(7), cy + 4],
      ],
      BODY,
      () => (s < 0 ? 0.6 : 0.35),
    );
  }
  body.outline("k");
  out.draw(body);
  // toe claws
  for (const x of [25, 27, 29, 35, 37, 39]) out.set(x, cy + 21, "i");

  // chest fur with a gold bit-collar above it
  const chest = new Layer(W, H);
  chest.ellipse(32, cy + 9, 6.5, 8, CHEST, { bias: 0.15 });
  out.draw(chest);
  for (let x = 25; x <= 39; x++) {
    out.set(x, cy - 1, "k");
    out.set(x, cy, x < 30 ? "i" : "j");
    out.set(x, cy + 1, "n");
    out.set(x, cy + 2, "k");
  }
  [1, 0, 1, 1, 0, 1, 0, 0].forEach((b, i) => out.set(28 + i, cy, b ? "o" : out.get(28 + i, cy)));
  // chest fur chevrons
  out.line(30, cy + 7, 32, cy + 9, "j");
  out.line(32, cy + 9, 34, cy + 7, "j");
  out.line(30, cy + 11, 32, cy + 13, "j");
  out.line(32, cy + 13, 34, cy + 11, "j");

  // eyes: almond-shaped, slanted, a keener look than BYTEBAT's
  const ey = cy - 9;
  for (const [ex, s] of [
    [27, -1],
    [37, 1],
  ]) {
    if (face !== "normal") {
      if (face === "hurt") {
        const a = -s;
        out.line(ex - 2 * a, ey - 2, ex + 2 * a, ey, "k");
        out.line(ex - 2 * a, ey + 2, ex + 2 * a, ey, "k");
      } else {
        out.line(ex - 2, ey - 2, ex + 2, ey + 2, "k");
        out.line(ex - 2, ey + 2, ex + 2, ey - 2, "k");
      }
      out.set(ex + s * 3, ey + 4, "r");
      continue;
    }
    const e = new Layer(W, H);
    e.ellipse(ex, ey, 3.6, 3.8, ["w", "w"]);
    e.outline("k");
    out.draw(e);
    // a heavy brow slanting down to the centre
    out.line(ex - 4 * s, ey - 6, ex + 3 * s, ey - 4, "k");
    const ix = ex - s;
    for (let y = ey - 1; y <= ey + 2; y++) for (let x = ix - 1; x <= ix + 1; x++) out.set(x, y, "y");
    out.set(ix, ey, "k");
    out.set(ix, ey + 1, "k");
    out.set(ix - s, ey + 1, "k");
    out.set(ix + 1, ey - 1, "w");
    out.set(ex + s * 4, ey + 4, "r");
    out.set(ex + s * 3, ey + 4, "r");
  }

  // muzzle: a fanged grin, or a roar
  const my = cy - 4;
  if (mouth) {
    for (let x = 29; x <= 35; x++) out.set(x, my, "k");
    for (let x = 30; x <= 34; x++) for (let y = my + 1; y <= my + 3; y++) out.set(x, y, "m");
    for (let x = 30; x <= 34; x++) out.set(x, my + 4, "k");
    out.set(29, my + 1, "k");
    out.set(35, my + 1, "k");
    out.set(30, my + 1, "w");
    out.set(30, my + 2, "w");
    out.set(34, my + 1, "w");
    out.set(34, my + 2, "w");
    out.set(32, my + 3, "r");
  } else {
    out.line(29, my, 31, my + 1, "k");
    out.line(32, my, 32, my, "k");
    out.line(33, my + 1, 35, my, "k");
    out.set(30, my + 2, "w");
    out.set(34, my + 2, "w");
  }
  out.set(32, my - 2, "m"); // nose
  return out;
}

/** Back view: wings spread wide, a circuit spine, the collar's clasp and the plug tail. */
function backFrame({ wing = 0, bob = 0, spread = 0, sway = 0 }) {
  const out = new Layer(W, H);
  const cy = 37 + bob;
  for (const s of [-1, 1]) out.draw(wingLayer(s, cy, { wing, bob, spread, back: true }));
  const ears = new Layer(W, H);
  for (const s of [-1, 1]) {
    const X = (x) => 32 + s * x;
    ears.poly(
      [
        [X(3), cy - 15],
        [X(15), cy - 34],
        [X(12), cy - 12],
      ],
      BODY,
      (x, y) => 0.65 - (s > 0 ? 0.25 : 0) - (y - (cy - 34)) / 70,
    );
  }
  ears.outline("k");
  out.draw(ears);

  const body = new Layer(W, H);
  body.ellipse(32, cy + 8, 11, 12, BODY, { bias: -0.08 });
  body.ellipse(32, cy - 9, 12, 10, BODY, { bias: -0.05 });
  body.ellipse(27, cy + 20, 3, 2, BODY, { bias: -0.35 });
  body.ellipse(37, cy + 20, 3, 2, BODY, { bias: -0.4 });
  body.poly(
    [
      [28, cy - 17],
      [31, cy - 24],
      [34, cy - 17],
    ],
    BODY,
    () => 0.6,
  );
  for (const s of [-1, 1]) {
    const X = (x) => 32 + s * x;
    body.poly(
      [
        [X(8), cy - 3],
        [X(14), cy - 1],
        [X(10), cy + 2],
        [X(13), cy + 4],
        [X(8), cy + 4],
      ],
      BODY,
      () => (s < 0 ? 0.5 : 0.25),
    );
  }
  body.outline("k");
  out.draw(body);
  // collar from behind with its clasp
  for (let x = 24; x <= 40; x++) {
    out.set(x, cy - 1, "k");
    out.set(x, cy, x < 30 ? "i" : "j");
    out.set(x, cy + 1, "n");
    out.set(x, cy + 2, "k");
  }
  for (let y = cy - 2; y <= cy + 3; y++) for (let x = 31; x <= 33; x++) out.set(x, y, y === cy - 2 || y === cy + 3 || x !== 32 ? "k" : "i");
  // circuit spine branching to the shoulders
  out.line(32, cy + 4, 32, cy + 15, "e");
  out.line(32, cy + 7, 26, cy + 11, "e");
  out.line(32, cy + 7, 38, cy + 11, "f");
  out.line(32, cy - 4, 32, cy - 14, "f");
  for (const [x, y] of [
    [32, cy + 15],
    [26, cy + 11],
    [38, cy + 11],
    [32, cy - 14],
  ])
    out.set(x, y, "o");
  out.set(32, cy + 7, "w");
  // the plug tail hangs down past the feet and kinks to the left
  const tail = new Layer(W, H);
  const tx = 32;
  const ty = cy + 19;
  tail.line(tx, ty, tx - 3 - sway, ty + 3, "c");
  tail.line(tx + 1, ty, tx - 2 - sway, ty + 3, "d");
  const px = tx - 7 - sway;
  const py = ty + 4;
  tail.poly(
    [
      [px, py - 2],
      [px + 5, py - 2],
      [px + 5, py + 2],
      [px, py + 2],
    ],
    GOLD,
    (x, y) => 0.95 - (y - py + 2) / 6,
  );
  tail.outline("k");
  tail.set(px - 1, py - 1, "i");
  tail.set(px - 2, py - 1, "k");
  tail.set(px - 1, py + 1, "j");
  tail.set(px - 2, py + 1, "k");
  out.draw(tail);
  return out;
}

function sink(layer, dy) {
  return new Layer(W, H).draw(layer, 0, dy);
}

/** Evolve: the same gather → white silhouette → pulse → flash as BYTEBAT's, for the next form. */
function evolveFrames() {
  const base = frame({ wing: -4 });
  const tall = frame({ wing: -6, spread: 1 });
  const folded = frame({ wing: 8, bob: 2 });
  const sil = (l) => halo(whiten(l, 1, "w"), "e");
  const grow = (l, sx, sy) => scaleLayer(l, sx, sy, 32, 60);
  const sparks = (l, pts) => {
    for (const [x, y, r] of pts) sparkle(l, x, y, r, "e", "w");
    return l;
  };
  return [
    sparks(new Layer(W, H).draw(base), [[6, 52, 2], [57, 8, 2]]),
    sparks(halo(whiten(base, 0.35, "w"), "e"), [[5, 44, 2], [58, 50, 2], [22, 3, 1]]),
    sparks(halo(whiten(base, 0.7, "w"), "e"), [[4, 54, 1], [60, 56, 2], [44, 2, 2]]),
    sil(base),
    sil(grow(folded, 0.86, 0.86)),
    sil(grow(tall, 1.02, 1.05)),
    sil(grow(folded, 0.8, 0.8)),
    sparks(sil(grow(tall, 1.02, 1.05)), [[4, 56, 3], [59, 57, 3], [11, 62, 1], [53, 62, 1]]),
  ];
}

emit(new URL("../../game/sprites/creatures/kilobat.ts", import.meta.url), {
  id: "kilobat",
  name: "KILOBAT",
  w: W,
  h: H,
  palette,
  comment: "BYTEBAT's first evolution: a lean data-bat with swept ears, scalloped circuit wings, a bit-collar and a plug tail. Front view, 64×64.",
  fps: { idle: 6, attack: 8, hurt: 8, faint: 6, evolve: 6 },
  anims: {
    idle: [frame({ wing: -4 }), frame({ wing: 0, bob: 1, sway: 1 }), frame({ wing: 5, bob: 2, sway: 2 }), frame({ wing: 0, bob: 1, sway: 1 })],
    attack: [frame({ wing: -6, spread: 1, mouth: true }), frame({ wing: 7, spread: 1, bob: 1, mouth: true, sway: 2 }), frame({ wing: 0, bob: 1 })],
    hurt: [frame({ wing: 4, bob: 2, face: "hurt", sway: 2 }), frame({ wing: 2, bob: 1, face: "hurt", sway: 1 })],
    faint: [frame({ wing: 6, bob: 2, face: "faint" }), sink(frame({ wing: 8, bob: 2, face: "faint" }), 6), sink(frame({ wing: 8, bob: 2, face: "faint" }), 14), sink(frame({ wing: 8, bob: 2, face: "faint" }), 24)],
    evolve: evolveFrames(),
  },
});

emit(new URL("../../game/sprites/creatures/kilobat-back.ts", import.meta.url), {
  id: "kilobat-back",
  name: "KILOBAT (back)",
  w: W,
  h: H,
  palette,
  script: "kilobat",
  comment: "KILOBAT from behind, for the player's side of the battle. 64×64.",
  fps: { idle: 6, attack: 8, hurt: 8, faint: 6 },
  anims: {
    idle: [backFrame({ wing: -4 }), backFrame({ wing: 0, bob: 1, sway: 1 }), backFrame({ wing: 5, bob: 2, sway: 2 }), backFrame({ wing: 0, bob: 1, sway: 1 })],
    attack: [backFrame({ wing: -6, spread: 1, bob: -2 }), backFrame({ wing: 6, spread: 1, bob: -3 }), backFrame({ wing: 0, bob: 0 })],
    hurt: [backFrame({ wing: 5, bob: 2, sway: 2 }), backFrame({ wing: 3, bob: 1, sway: 1 })],
    faint: [backFrame({ wing: 7, bob: 2 }), sink(backFrame({ wing: 8, bob: 2 }), 6), sink(backFrame({ wing: 8, bob: 2 }), 14), sink(backFrame({ wing: 8, bob: 2 }), 24)],
  },
});

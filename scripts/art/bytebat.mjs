// BYTEBAT, the player's starter: a round data-bat with circuit-lined wings.
// Run: node scripts/art/bytebat.mjs
import { Layer, emit, halo, scaleLayer, sparkle, whiten } from "./paint.mjs";

const W = 64;
const H = 64;
const palette = {
  k: "#1b1030", // outline
  d: "#3f2a7c", // body ramp, dark → light
  c: "#6a48c2",
  b: "#9c78ec",
  a: "#d6c2ff",
  h: "#123c52", // wing membrane ramp
  g: "#1e6f86",
  f: "#35b3b8",
  e: "#86ecdf",
  o: "#d2fff7", // circuit glow
  j: "#d9ad6a", // belly ramp
  i: "#f4dcaa",
  l: "#fff6e0",
  m: "#9c2652", // mouth
  r: "#ff8fb4", // inner ear / cheek
  y: "#ffd447", // iris
  w: "#ffffff",
};
const BODY = ["d", "c", "b", "a"];
const WING = ["h", "g", "f", "e"];
const BELLY = ["j", "i", "l"];

/**
 * pose.wing: tip height offset (−8 up … +8 down); pose.bob: body drop in px;
 * pose.mouth: open mouth; pose.spread: wings pushed outwards.
 */
function frame({ wing = 0, bob = 0, mouth = false, spread = 0, face = "normal" }) {
  const out = new Layer(W, H);
  const cy = 37 + bob;

  // wings (behind the body), one per side
  for (const s of [-1, 1]) {
    const L = new Layer(W, H);
    const X = (x) => 32 + s * x;
    const tipY = 15 + wing + bob;
    const pts = [
      [X(12), cy - 6],
      [X(22 + spread), tipY + 2],
      [X(29 + spread), tipY],
      [X(30 + spread), tipY + 8 + wing * 0.3],
      [X(26 + spread), cy + 4 + wing * 0.4],
      [X(22 + spread * 0.7), cy + 1 + wing * 0.3],
      [X(19 + spread * 0.4), cy + 8 + wing * 0.2],
      [X(15), cy + 4],
      [X(12), cy + 6],
    ];
    // lit from the upper left: the left wing is brighter
    L.poly(pts, WING, (x, y) => 1.0 - (y - tipY) / 45 - (s > 0 ? 0.15 : 0) - Math.abs(x - 32) / 160);
    // finger bones
    const bone = s > 0 ? "h" : "g";
    L.line(X(13), cy - 4, X(29 + spread), tipY + 1, bone);
    L.line(X(17), cy - 2, X(26 + spread), cy + 3 + wing * 0.4, bone);
    L.line(X(15), cy, X(21 + spread * 0.7), cy + 1 + wing * 0.3, bone);
    // circuit traces with node dots
    L.line(X(18), cy - 4 + (wing > 0 ? 1 : 0), X(24 + spread), tipY + 6, "o");
    L.set(X(24 + spread), tipY + 6, "w");
    L.set(X(21), cy + 1, "o");
    L.set(X(22 + spread * 0.5), cy - 2, "o");
    L.outline("k");
    out.draw(L);
  }

  // ears
  const ears = new Layer(W, H);
  for (const s of [-1, 1]) {
    const X = (x) => 32 + s * x;
    ears.poly(
      [
        [X(6), cy - 10],
        [X(13), cy - 27],
        [X(15), cy - 8],
      ],
      BODY,
      (x, y) => 0.75 - (s > 0 ? 0.25 : 0) - (y - (cy - 27)) / 60,
    );
    ears.poly(
      [
        [X(9), cy - 12],
        [X(12.5), cy - 23],
        [X(13), cy - 11],
      ],
      "r",
    );
  }
  ears.outline("k");
  out.draw(ears);

  // round body
  const body = new Layer(W, H);
  body.ellipse(32, cy, 15, 14, BODY);
  // little feet
  body.ellipse(26, cy + 14, 3, 2, BODY, { bias: -0.15 });
  body.ellipse(38, cy + 14, 3, 2, BODY, { bias: -0.25 });
  // tuft of fur on top
  body.poly(
    [
      [29, cy - 13],
      [32, cy - 18],
      [33, cy - 13],
    ],
    BODY,
    () => 0.7,
  );
  body.poly(
    [
      [32, cy - 13],
      [36, cy - 16],
      [35, cy - 12],
    ],
    BODY,
    () => 0.5,
  );
  body.outline("k");
  out.draw(body);

  // belly patch with a byte stripe
  const belly = new Layer(W, H);
  belly.ellipse(32, cy + 6, 9, 7, BELLY, { bias: 0.15 });
  out.draw(belly);
  const bits = [1, 0, 1, 1, 0, 0, 1, 0];
  bits.forEach((b, i) => out.set(28 + i, cy + 9, b ? "j" : "i"));

  // eyes
  for (const [ex, s] of [
    [26, -1],
    [38, 1],
  ]) {
    if (face !== "normal") {
      // squeezed shut (hurt: > <) or knocked out (faint: x x)
      if (face === "hurt") {
        const a = -s;
        out.line(ex - 2 * a, cy - 5, ex + 2 * a, cy - 3, "k");
        out.line(ex - 2 * a, cy - 1, ex + 2 * a, cy - 3, "k");
      } else {
        out.line(ex - 2, cy - 5, ex + 2, cy - 1, "k");
        out.line(ex - 2, cy - 1, ex + 2, cy - 5, "k");
      }
      out.set(ex + s * 3, cy + 3, "r");
      out.set(ex + s * 2, cy + 3, "r");
      continue;
    }
    const e = new Layer(W, H);
    e.ellipse(ex, cy - 3, 4, 4.6, ["w", "w"]);
    e.outline("k");
    out.draw(e);
    // iris looks slightly inwards, towards the foe; dark pupil inside
    const ix = ex - s;
    for (let y = cy - 5; y <= cy; y++) for (let x = ix - 1; x <= ix + 1; x++) out.set(x, y, y === cy - 5 ? "j" : "y");
    for (let y = cy - 4; y <= cy - 1; y++) for (let x = ix - 1 + (s > 0 ? 0 : 1); x <= ix + (s > 0 ? 0 : 1); x++) out.set(x, y, "k");
    out.set(ix - 1, cy - 4, "w");
    out.set(ix + 1, cy - 1, "w");
    // cheek blush
    out.set(ex + s * 3, cy + 3, "r");
    out.set(ex + s * 2, cy + 3, "r");
  }

  // mouth + fangs
  if (mouth) {
    for (let x = 29; x <= 35; x++) out.set(x, cy + 3, "k");
    for (let x = 30; x <= 34; x++) for (let y = cy + 4; y <= cy + 6; y++) out.set(x, y, "m");
    for (let x = 30; x <= 34; x++) out.set(x, cy + 7, "k");
    out.set(29, cy + 4, "k");
    out.set(35, cy + 4, "k");
    out.set(30, cy + 4, "w");
    out.set(34, cy + 4, "w");
  } else {
    out.line(30, cy + 3, 31, cy + 4, "k");
    out.line(32, cy + 3, 32, cy + 3, "k");
    out.line(33, cy + 4, 34, cy + 3, "k");
    out.set(31, cy + 5, "w");
    out.set(33, cy + 5, "w");
  }
  return out;
}

/** Back view (the player's side of the battle): wings spread, circuit lines down the back. */
function backFrame({ wing = 0, bob = 0, spread = 0 }) {
  const out = new Layer(W, H);
  const cy = 38 + bob;
  for (const s of [-1, 1]) {
    const L = new Layer(W, H);
    const X = (x) => 32 + s * x;
    const tipY = 13 + wing + bob;
    const pts = [
      [X(10), cy - 8],
      [X(21 + spread), tipY + 2],
      [X(30 + spread), tipY],
      [X(31 + spread), tipY + 9 + wing * 0.3],
      [X(27 + spread), cy + 3 + wing * 0.4],
      [X(23 + spread * 0.7), cy + wing * 0.3],
      [X(20 + spread * 0.4), cy + 7 + wing * 0.2],
      [X(14), cy + 3],
      [X(10), cy + 5],
    ];
    // the back of the membrane is darker; the left side still catches the light
    L.poly(pts, WING, (x, y) => 0.8 - (y - tipY) / 45 - (s > 0 ? 0.2 : 0) - Math.abs(x - 32) / 140);
    const bone = "h";
    L.line(X(11), cy - 6, X(30 + spread), tipY + 1, bone);
    L.line(X(15), cy - 3, X(27 + spread), cy + 2 + wing * 0.4, bone);
    L.line(X(13), cy - 1, X(22 + spread * 0.7), cy + wing * 0.3, bone);
    L.line(X(12), cy - 7, X(21 + spread), tipY + 3, s < 0 ? "g" : "h");
    L.outline("k");
    out.draw(L);
  }
  // ears, seen from behind (no pink)
  const ears = new Layer(W, H);
  for (const s of [-1, 1]) {
    const X = (x) => 32 + s * x;
    ears.poly(
      [
        [X(5), cy - 11],
        [X(12), cy - 28],
        [X(15), cy - 9],
      ],
      BODY,
      (x, y) => 0.6 - (s > 0 ? 0.25 : 0) - (y - (cy - 28)) / 70,
    );
  }
  ears.outline("k");
  out.draw(ears);

  const body = new Layer(W, H);
  body.ellipse(32, cy, 16, 15, BODY, { bias: -0.05 });
  body.ellipse(26, cy + 15, 3, 2, BODY, { bias: -0.3 });
  body.ellipse(38, cy + 15, 3, 2, BODY, { bias: -0.35 });
  // tuft on top, and a little tail tuft at the bottom
  body.poly(
    [
      [28, cy - 14],
      [31, cy - 19],
      [33, cy - 14],
    ],
    BODY,
    () => 0.65,
  );
  body.poly(
    [
      [30, cy + 11],
      [32, cy + 17],
      [35, cy + 11],
    ],
    BODY,
    () => 0.25,
  );
  body.outline("k");
  out.draw(body);
  // circuit trace down the spine, branching to the shoulders
  out.line(32, cy - 11, 32, cy + 6, "e");
  out.line(32, cy - 5, 26, cy - 1, "e");
  out.line(32, cy - 5, 38, cy - 1, "f");
  out.line(32, cy + 2, 28, cy + 6, "e");
  out.line(32, cy + 2, 36, cy + 6, "f");
  for (const [x, y] of [
    [32, cy - 11],
    [26, cy - 1],
    [38, cy - 1],
    [28, cy + 6],
    [36, cy + 6],
  ])
    out.set(x, y, "o");
  out.set(32, cy - 5, "w");
  return out;
}

/** Sink a frame into the ground (for faint), clipping at the bottom edge. */
function sink(layer, dy) {
  return new Layer(W, H).draw(layer, 0, dy);
}

/**
 * Evolve: light gathers, the colours dither away into a white silhouette, and
 * the silhouette pulses between BYTEBAT's shape and a taller "next form"
 * (anchored at the feet) before a final flash.
 */
function evolveFrames() {
  const base = frame({ wing: -6 });
  const tall = frame({ wing: -8, spread: 1 });
  const folded = frame({ wing: 8, bob: 2 });
  const sil = (l) => halo(whiten(l, 1, "w"), "e");
  // the canvas is tight (wingtips touch the edges), so the morph flickers between a
  // folded, smaller silhouette and a slightly taller one, anchored at the feet
  const grow = (l, sx, sy) => scaleLayer(l, sx, sy, 32, 60);
  const sparks = (l, pts) => {
    for (const [x, y, r] of pts) sparkle(l, x, y, r, "e", "w");
    return l;
  };
  return [
    sparks(new Layer(W, H).draw(base), [[8, 50, 2], [56, 6, 2]]),
    sparks(halo(whiten(base, 0.35, "w"), "e"), [[5, 42, 2], [58, 50, 2], [22, 4, 1]]),
    sparks(halo(whiten(base, 0.7, "w"), "e"), [[4, 52, 1], [60, 56, 2], [44, 3, 2]]),
    sil(base),
    sil(grow(folded, 0.84, 0.84)),
    sil(grow(tall, 1.03, 1.07)),
    sil(grow(folded, 0.78, 0.78)),
    sparks(sil(grow(tall, 1.03, 1.07)), [[4, 54, 3], [59, 55, 3], [11, 61, 1], [53, 61, 1]]),
  ];
}

emit(new URL("../../game/sprites/creatures/bytebat.ts", import.meta.url), {
  id: "bytebat",
  name: "BYTEBAT",
  w: W,
  h: H,
  palette,
  comment: "The starter: a round data-bat with circuit-traced wings. Front view, 64×64.",
  fps: { idle: 6, attack: 8, hurt: 8, faint: 6, evolve: 6 },
  anims: {
    idle: [frame({ wing: -6 }), frame({ wing: 0, bob: 1 }), frame({ wing: 6, bob: 2 }), frame({ wing: 0, bob: 1 })],
    attack: [frame({ wing: -8, spread: 1, mouth: true }), frame({ wing: 8, spread: 2, bob: 1, mouth: true }), frame({ wing: 0, bob: 1 })],
    hurt: [frame({ wing: 4, bob: 2, face: "hurt" }), frame({ wing: 2, bob: 1, face: "hurt" })],
    faint: [frame({ wing: 6, bob: 2, face: "faint" }), sink(frame({ wing: 8, bob: 2, face: "faint" }), 6), sink(frame({ wing: 8, bob: 2, face: "faint" }), 14), sink(frame({ wing: 8, bob: 2, face: "faint" }), 24)],
    evolve: evolveFrames(),
  },
});

emit(new URL("../../game/sprites/creatures/bytebat-back.ts", import.meta.url), {
  id: "bytebat-back",
  name: "BYTEBAT (back)",
  w: W,
  h: H,
  palette,
  script: "bytebat",
  comment: "BYTEBAT from behind, for the player's side of the battle. 64×64.",
  fps: { idle: 6, attack: 8, hurt: 8, faint: 6 },
  anims: {
    idle: [backFrame({ wing: -5 }), backFrame({ wing: 0, bob: 1 }), backFrame({ wing: 5, bob: 2 }), backFrame({ wing: 0, bob: 1 })],
    attack: [backFrame({ wing: -8, spread: 1, bob: -2 }), backFrame({ wing: 7, spread: 2, bob: -3 }), backFrame({ wing: 0, bob: 0 })],
    hurt: [backFrame({ wing: 5, bob: 2 }), backFrame({ wing: 3, bob: 1 })],
    faint: [backFrame({ wing: 7, bob: 2 }), sink(backFrame({ wing: 8, bob: 2 }), 6), sink(backFrame({ wing: 8, bob: 2 }), 14), sink(backFrame({ wing: 8, bob: 2 }), 24)],
  },
});

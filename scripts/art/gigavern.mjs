// GIGAVERN, BYTEBAT's final form: a regal data-wyvern with gold-banded horns,
// huge four-scalloped wings with glowing circuit veins, gold pauldrons, an
// armoured chest carrying a glowing database-cylinder core, and a banded
// cable tail ending in a three-pronged plug.
// Run: node scripts/art/gigavern.mjs
import { Layer, emit, halo, scaleLayer, sparkle, whiten } from "./paint.mjs";

const W = 64;
const H = 64;
const palette = {
  k: "#110720", // outline
  d: "#25124f", // body ramp, dark → light
  c: "#432790",
  b: "#6e4bd0",
  a: "#ab90f4",
  h: "#2b0b35", // wing membrane ramp (dusk magenta)
  g: "#5c1a63",
  f: "#9b2f88",
  e: "#df67b8",
  o: "#8ff3ff", // circuit / core glow
  p: "#1b9cc0", // core shade
  n: "#8a5a1f", // gold ramp (horns, pauldrons, plug)
  j: "#d99a37",
  i: "#ffd977",
  l: "#fff1d2", // chest plate highlight
  m: "#7d1640", // mouth
  r: "#ff7fa8", // inner ear / tongue
  y: "#7ff8ff", // iris (glowing)
  w: "#ffffff",
};
const BODY = ["d", "c", "b", "a"];
const WING = ["h", "g", "f", "e"];
const GOLD = ["n", "j", "i"];
const PLATE = ["b", "a", "l"];

/** One huge wing on side s (−1 left, +1 right) as its own outlined layer. */
function wingLayer(s, cy, { wing, bob, spread, back = false }) {
  const L = new Layer(W, H);
  const X = (x) => 32 + s * x;
  const tip = 5 + wing + bob;
  const sp = spread;
  const wx = X(17 + sp * 0.5);
  const wy = tip + 5;
  const pts = [
    [X(10), cy - 8],
    [wx, wy],
    [X(31 + sp), tip],
    [X(30 + sp), tip + 6],
    [X(27 + sp), tip + 12],
    [X(31 + sp), cy + 1 + wing * 0.4],
    [X(27 + sp * 0.8), cy - 1 + wing * 0.35],
    [X(27 + sp * 0.7), cy + 8 + wing * 0.3],
    [X(23 + sp * 0.5), cy + 4 + wing * 0.25],
    [X(21 + sp * 0.4), cy + 13 + wing * 0.2],
    [X(17 + sp * 0.2), cy + 8 + wing * 0.15],
    [X(14), cy + 12],
    [X(11), cy + 6],
  ];
  const lit = back ? 0.92 : 1.02;
  L.poly(pts, WING, (x, y) => lit - (y - tip) / 50 - (s > 0 ? 0.18 : 0) - Math.abs(x - 32) / 190);
  // arm bone to the wrist, then four finger bones to the scallop points
  L.line(X(11), cy - 7, wx, wy, "h");
  L.line(wx, wy, X(31 + sp), tip + 1, "h");
  L.line(wx, wy, X(30 + sp), cy + wing * 0.4, "h");
  L.line(wx, wy, X(27 + sp * 0.7), cy + 8 + wing * 0.3, "h");
  L.line(wx, wy, X(21 + sp * 0.4), cy + 12 + wing * 0.2, "h");
  L.line(wx, wy, X(14), cy + 11, "h");
  if (!back) {
    // glowing circuit veins with nodes between the bones
    L.line(X(13), cy - 2, X(19 + sp * 0.5), tip + 15, "o");
    L.line(X(19 + sp * 0.5), tip + 15, X(25 + sp * 0.8), tip + 15, "o");
    L.set(X(25 + sp * 0.8), tip + 15, "w");
    L.line(X(15), cy + 4, X(22 + sp * 0.5), cy + 2 + wing * 0.25, "o");
    L.set(X(22 + sp * 0.5), cy + 2 + wing * 0.25, "w");
  } else {
    L.line(X(14), cy - 1, X(20 + sp * 0.5), tip + 14, "f");
  }
  L.outline("k");
  // gold wrist horn
  L.set(wx, wy - 1, "j");
  L.set(wx, wy - 2, "i");
  L.set(wx - s, wy - 1, "n");
  L.set(wx + s, wy - 2, "i");
  L.set(wx + s, wy - 3, "k");
  L.set(wx, wy - 3, "k");
  return L;
}

/** The banded cable tail sweeping right, ending in a three-pronged gold plug. */
function tailLayer(cy, sway = 0) {
  const L = new Layer(W, H);
  const pts = [
    [38, cy + 15],
    [44, cy + 20],
    [50, cy + 20 + sway * 0.5],
    [54, cy + 16 + sway],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    L.line(x0, y0 - 1, x1, y1 - 1, "b");
    L.line(x0, y0, x1, y1, "c");
    L.line(x0, y0 + 1, x1, y1 + 1, "d");
  }
  // gold bands along the cable
  for (const [x, y] of [pts[1], [47, cy + 20 + sway * 0.25]]) for (let dy = -1; dy <= 1; dy++) L.set(x, y + dy, dy < 0 ? "i" : "j");
  const [px, py] = pts[pts.length - 1];
  L.poly(
    [
      [px - 1, py - 3],
      [px + 4, py - 3],
      [px + 5, py - 1],
      [px + 5, py + 2],
      [px - 1, py + 2],
    ],
    GOLD,
    (x, y) => 0.95 - (y - py + 3) / 6,
  );
  L.outline("k");
  // prongs
  for (const [dy, c] of [
    [-2, "i"],
    [0, "j"],
    [2, "j"],
  ]) {
    L.set(px + 6, py + dy, c);
    L.set(px + 7, py + dy, "k");
  }
  return L;
}

/** Gold-banded horns sweeping up and out from the head. */
function hornLayer(cy, tilt = 0) {
  const L = new Layer(W, H);
  for (const s of [-1, 1]) {
    const X = (x) => 32 + s * x;
    L.poly(
      [
        [X(5), cy - 15],
        [X(9), cy - 25],
        [X(15 + tilt), cy - 34 + tilt],
        [X(12), cy - 23],
        [X(10), cy - 14],
      ],
      GOLD,
      (x, y) => 0.95 - (s > 0 ? 0.25 : 0) - (y - (cy - 34)) / 40,
    );
  }
  L.outline("k");
  // dark bands across each horn
  for (const s of [-1, 1]) {
    const X = (x) => 32 + s * x;
    L.line(X(7), cy - 19, X(10), cy - 18, "n");
    L.line(X(9), cy - 24, X(11), cy - 23, "n");
  }
  return L;
}

/**
 * pose.wing: wingtip offset (−3 up … +8 down); pose.bob: body drop in px;
 * pose.mouth: open roar; pose.spread: wings pushed outwards; pose.sway: tail;
 * pose.glow: the core flares brighter.
 */
function frame({ wing = 0, bob = 0, mouth = false, spread = 0, face = "normal", sway = 0, glow = false }) {
  const out = new Layer(W, H);
  const cy = 38 + bob;

  out.draw(tailLayer(cy, sway));
  for (const s of [-1, 1]) out.draw(wingLayer(s, cy, { wing, bob, spread }));
  out.draw(hornLayer(cy, mouth ? 1 : 0));

  // short swept ears under the horns
  const ears = new Layer(W, H);
  for (const s of [-1, 1]) {
    const X = (x) => 32 + s * x;
    ears.poly(
      [
        [X(9), cy - 13],
        [X(17), cy - 21],
        [X(13), cy - 9],
      ],
      BODY,
      (x, y) => 0.75 - (s > 0 ? 0.25 : 0) - (y - (cy - 21)) / 50,
    );
    ears.poly(
      [
        [X(10.5), cy - 12],
        [X(15.5), cy - 18],
        [X(12.5), cy - 10],
      ],
      "r",
    );
  }
  ears.outline("k");
  out.draw(ears);

  // broad body, a wedge head with a snout, strong legs
  const body = new Layer(W, H);
  body.ellipse(32, cy + 7, 12, 12, BODY, { bias: -0.05 });
  body.ellipse(25, cy + 18, 4, 3, BODY, { bias: -0.2 });
  body.ellipse(39, cy + 18, 4, 3, BODY, { bias: -0.32 });
  body.ellipse(32, cy - 10, 11, 8.5, BODY);
  body.ellipse(32, cy - 4, 6, 4, BODY, { bias: 0.05 }); // snout
  // a three-spike crest between the horns
  for (const [x0, x1, top, v] of [
    [29, 32, cy - 24, 0.78],
    [31, 34, cy - 26, 0.62],
    [33, 36, cy - 23, 0.45],
  ])
    body.poly(
      [
        [x0, cy - 17],
        [(x0 + x1) / 2 + 0.5, top],
        [x1, cy - 17],
      ],
      BODY,
      () => v,
    );
  body.outline("k");
  out.draw(body);
  // gold talons
  for (const x of [22, 24, 26, 28, 36, 38, 40, 42]) out.set(x, cy + 21, x % 4 ? "j" : "i");

  // gold pauldrons on the shoulders
  const pads = new Layer(W, H);
  pads.ellipse(21, cy + 1, 4.5, 3.5, GOLD, { bias: 0.08 });
  pads.ellipse(43, cy + 1, 4.5, 3.5, GOLD, { bias: -0.12 });
  pads.outline("k");
  out.draw(pads);
  out.set(20, cy, "w");

  // armoured chest plate carrying the glowing database-cylinder core
  const plate = new Layer(W, H);
  plate.poly(
    [
      [25, cy + 2],
      [39, cy + 2],
      [37, cy + 15],
      [32, cy + 18],
      [27, cy + 15],
    ],
    PLATE,
    (x, y) => 1.05 - (x - 25) / 30 - (y - cy) / 50,
  );
  plate.outline("j");
  plate.outline("k");
  out.draw(plate);
  const core = new Layer(W, H);
  core.poly(
    [
      [29, cy + 6],
      [35, cy + 6],
      [35, cy + 12],
      [29, cy + 12],
    ],
    glow ? ["p", "o", "w"] : ["p", "o"],
    (x) => 0.9 - (x - 29) / 9,
  );
  core.outline("k");
  out.draw(core);
  // cylinder rims: a lit top ellipse and two disk bands
  for (let x = 30; x <= 34; x++) out.set(x, cy + 5, glow ? "w" : "o");
  for (const y of [cy + 8, cy + 10]) for (let x = 29; x <= 35; x++) out.set(x, y, "p");
  out.set(30, cy + 7, "w");
  if (glow) for (const [x, y] of [[32, cy + 3], [27, cy + 9], [37, cy + 9], [32, cy + 15]]) out.set(x, y, "o");

  // eyes: narrow, fierce, glowing
  const ey = cy - 11;
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
      continue;
    }
    const e = new Layer(W, H);
    e.ellipse(ex, ey, 3.2, 2.6, ["y", "y"]);
    e.outline("k");
    out.draw(e);
    // a heavy, angled brow ridge
    out.line(ex + 4 * s, ey - 4, ex - 3 * s, ey - 1, "k");
    out.line(ex + 4 * s, ey - 5, ex - 2 * s, ey - 2, "a");
    out.line(ex + 2 * s, ey - 3, ex - 2 * s, ey - 1, "k");
    // slit pupil and glint
    out.set(ex - s, ey - 1, "k");
    out.set(ex - s, ey, "k");
    out.set(ex - s, ey + 1, "k");
    out.set(ex - 2 * s, ey - 1, "w");
  }

  // snout: nostrils, and fangs or a roar
  out.set(30, cy - 6, "k");
  out.set(34, cy - 6, "k");
  const my = cy - 3;
  if (mouth) {
    for (let x = 28; x <= 36; x++) out.set(x, my, "k");
    for (let x = 29; x <= 35; x++) for (let y = my + 1; y <= my + 3; y++) out.set(x, y, "m");
    for (let x = 29; x <= 35; x++) out.set(x, my + 4, "k");
    out.set(28, my + 1, "k");
    out.set(36, my + 1, "k");
    for (const x of [29, 35]) {
      out.set(x, my + 1, "w");
      out.set(x, my + 2, "w");
    }
    for (const x of [31, 33]) out.set(x, my + 3, "w");
    out.set(32, my + 2, "r");
  } else {
    out.line(28, my, 31, my + 1, "k");
    out.line(32, my + 1, 32, my + 1, "k");
    out.line(33, my + 1, 36, my, "k");
    out.set(29, my + 2, "w");
    out.set(35, my + 2, "w");
  }
  return out;
}

/** Back view: wings spread wide, horns, a circuit spine with dorsal plates and the plug tail. */
function backFrame({ wing = 0, bob = 0, spread = 0, sway = 0 }) {
  const out = new Layer(W, H);
  const cy = 38 + bob;
  for (const s of [-1, 1]) out.draw(wingLayer(s, cy, { wing, bob, spread, back: true }));
  out.draw(hornLayer(cy));
  const ears = new Layer(W, H);
  for (const s of [-1, 1]) {
    const X = (x) => 32 + s * x;
    ears.poly(
      [
        [X(8), cy - 13],
        [X(17), cy - 21],
        [X(13), cy - 9],
      ],
      BODY,
      (x, y) => 0.6 - (s > 0 ? 0.25 : 0) - (y - (cy - 21)) / 60,
    );
  }
  ears.outline("k");
  out.draw(ears);

  const body = new Layer(W, H);
  body.ellipse(32, cy + 7, 13, 12, BODY, { bias: -0.1 });
  body.ellipse(32, cy - 10, 11, 9, BODY, { bias: -0.05 });
  body.ellipse(25, cy + 19, 4, 2.5, BODY, { bias: -0.35 });
  body.ellipse(39, cy + 19, 4, 2.5, BODY, { bias: -0.4 });
  body.outline("k");
  out.draw(body);
  // pauldrons from behind
  const pads = new Layer(W, H);
  pads.ellipse(20, cy + 1, 4.5, 3.5, GOLD, { bias: 0 });
  pads.ellipse(44, cy + 1, 4.5, 3.5, GOLD, { bias: -0.2 });
  pads.outline("k");
  out.draw(pads);
  // dorsal plates down the spine, with a glowing circuit between them
  out.line(32, cy - 17, 32, cy + 16, "p");
  for (const y of [cy - 15, cy - 9, cy - 3, cy + 3, cy + 9]) {
    const plate = new Layer(W, H);
    plate.poly(
      [
        [29.5, y],
        [32.5, y - 3],
        [35.5, y],
        [32.5, y + 2],
      ],
      GOLD,
      () => 0.6,
    );
    plate.outline("k");
    out.draw(plate);
  }
  out.line(32, cy + 4, 26, cy + 10, "o");
  out.line(32, cy + 4, 38, cy + 10, "p");
  for (const [x, y] of [
    [26, cy + 10],
    [38, cy + 10],
    [32, cy + 15],
  ])
    out.set(x, y, "o");
  // the plug tail hangs down past the feet and kinks to the left
  const tail = new Layer(W, H);
  const tx = 32;
  const ty = cy + 18;
  tail.line(tx, ty, tx - 3 - sway, ty + 3, "c");
  tail.line(tx + 1, ty, tx - 2 - sway, ty + 3, "d");
  const px = tx - 8 - sway;
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
  for (const [dy, c] of [
    [-1, "i"],
    [1, "j"],
  ]) {
    tail.set(px - 1, py + dy, c);
    tail.set(px - 2, py + dy, "k");
  }
  out.draw(tail);
  return out;
}

function sink(layer, dy) {
  return new Layer(W, H).draw(layer, 0, dy);
}

/** Evolve: gather → white silhouette → pulse → flash, the same beats as the earlier forms. */
function evolveFrames() {
  const base = frame({ wing: -2 });
  const tall = frame({ wing: -3, spread: 1, glow: true });
  const folded = frame({ wing: 8, bob: 2 });
  const sil = (l) => halo(whiten(l, 1, "w"), "o");
  const grow = (l, sx, sy) => scaleLayer(l, sx, sy, 32, 60);
  const sparks = (l, pts) => {
    for (const [x, y, r] of pts) sparkle(l, x, y, r, "o", "w");
    return l;
  };
  return [
    sparks(new Layer(W, H).draw(base), [[5, 54, 2], [58, 6, 2]]),
    sparks(halo(whiten(base, 0.35, "w"), "o"), [[4, 46, 2], [59, 52, 2], [22, 2, 1]]),
    sparks(halo(whiten(base, 0.7, "w"), "o"), [[3, 56, 1], [60, 58, 2], [44, 1, 2]]),
    sil(base),
    sil(grow(folded, 0.86, 0.86)),
    sil(grow(tall, 1.0, 1.03)),
    sil(grow(folded, 0.8, 0.8)),
    sparks(sil(grow(tall, 1.0, 1.03)), [[3, 58, 3], [60, 59, 3], [10, 62, 1], [54, 62, 1]]),
  ];
}

emit(new URL("../../game/sprites/creatures/gigavern.ts", import.meta.url), {
  id: "gigavern",
  name: "GIGAVERN",
  w: W,
  h: H,
  palette,
  comment:
    "BYTEBAT's final form: a data-wyvern with gold-banded horns, huge circuit-veined wings, gold pauldrons, a glowing database-cylinder core and a three-pronged plug tail. Front view, 64×64.",
  fps: { idle: 6, attack: 8, hurt: 8, faint: 6, evolve: 6 },
  anims: {
    idle: [frame({ wing: -2 }), frame({ wing: 1, bob: 1, sway: 1 }), frame({ wing: 5, bob: 2, sway: 2, glow: true }), frame({ wing: 1, bob: 1, sway: 1 })],
    attack: [frame({ wing: -3, spread: 1, mouth: true, glow: true }), frame({ wing: 7, spread: 1, bob: 1, mouth: true, sway: 2, glow: true }), frame({ wing: 1, bob: 1 })],
    hurt: [frame({ wing: 4, bob: 2, face: "hurt", sway: 2 }), frame({ wing: 2, bob: 1, face: "hurt", sway: 1 })],
    faint: [frame({ wing: 6, bob: 2, face: "faint" }), sink(frame({ wing: 8, bob: 2, face: "faint" }), 6), sink(frame({ wing: 8, bob: 2, face: "faint" }), 14), sink(frame({ wing: 8, bob: 2, face: "faint" }), 24)],
    evolve: evolveFrames(),
  },
});

emit(new URL("../../game/sprites/creatures/gigavern-back.ts", import.meta.url), {
  id: "gigavern-back",
  name: "GIGAVERN (back)",
  w: W,
  h: H,
  palette,
  script: "gigavern",
  comment: "GIGAVERN from behind, for the player's side of the battle. 64×64.",
  fps: { idle: 6, attack: 8, hurt: 8, faint: 6 },
  anims: {
    idle: [backFrame({ wing: -2 }), backFrame({ wing: 1, bob: 1, sway: 1 }), backFrame({ wing: 5, bob: 2, sway: 2 }), backFrame({ wing: 1, bob: 1, sway: 1 })],
    attack: [backFrame({ wing: -3, spread: 1, bob: -2 }), backFrame({ wing: 6, spread: 1, bob: -3 }), backFrame({ wing: 0, bob: 0 })],
    hurt: [backFrame({ wing: 5, bob: 2, sway: 2 }), backFrame({ wing: 3, bob: 1, sway: 1 })],
    faint: [backFrame({ wing: 7, bob: 2 }), sink(backFrame({ wing: 8, bob: 2 }), 6), sink(backFrame({ wing: 8, bob: 2 }), 14), sink(backFrame({ wing: 8, bob: 2 }), 24)],
  },
});

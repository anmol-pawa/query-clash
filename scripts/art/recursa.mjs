// RECURSA, boss of chapter 9 (The Recursion Hydra, "It Calls Itself"): a coiled
// sea-serpent hydra with three heads, where each outer neck sprouts a smaller
// head, and that one a smaller one still: the anchor plus recursive members of
// a WITH RECURSIVE query. A gold base-case gem sits on its coils.
// Run: node scripts/art/recursa.mjs
import { Layer, emit, dissolve } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#0c1a14", // outline
  a: "#173d2e", // scale ramp, dark → light
  b: "#2a6b45",
  c: "#4c9e57",
  d: "#8fcf6a",
  e: "#d4f29a",
  p: "#8a6a4a", // belly ramp, dark → light
  q: "#c9a877",
  u: "#f0dcae",
  f: "#5a2d6e", // fin ramp, dark → light
  i: "#9a52b5",
  j: "#d38ef0",
  g: "#ffcc3d", // eyes / base gem
  h: "#fff3b0",
  m: "#2a0b16", // mouth
  n: "#e8546a", // tongue
  w: "#ffffff", // fangs
  x: "#ff4f6a", // hurt eyes
};
const SCALE = ["a", "b", "c", "d", "e"];
const BELLY = ["p", "q", "u"];
const FIN = ["f", "i", "j"];

/** Neck: a chain of shaded discs along a quadratic curve, thick at the base. */
function neck(L, [x0, y0], [x1, y1], [x2, y2], r0, r1, bias = 0) {
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * x1 + t * t * x2;
    const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * y1 + t * t * y2;
    const r = r0 + (r1 - r0) * t;
    L.ellipse(x, y, r, r, SCALE, { bias: bias - 0.05 });
  }
  return L;
}

/**
 * A serpent head at (x, y) looking towards side s (−1 left, 1 right), scaled by k.
 * mouth: 0 shut … 1 wide open; face: "normal" | "angry" | "hurt" | "faint".
 */
function head(x, y, s, k, mouth, face, bias = 0) {
  const L = new Layer(W, H);
  // fin crest behind the skull
  L.poly(
    [
      [x - s * 6 * k, y - 2 * k],
      [x - s * 13 * k, y - 10 * k],
      [x - s * 9 * k, y - 3 * k],
      [x - s * 12 * k, y + 2 * k],
      [x - s * 4 * k, y + 3 * k],
    ],
    FIN,
    () => 0.6 + bias,
  );
  // lower jaw drops open
  const jy = y + 3 * k + mouth * 5 * k;
  L.ellipse(x + s * 6 * k, jy, 7 * k, 2.5 * k + 0.5, BELLY, { bias });
  // skull and snout
  L.ellipse(x, y, 8 * k, 6.5 * k, SCALE, { bias: bias + 0.05 });
  L.ellipse(x + s * 7 * k, y + 1 * k, 7 * k, 4 * k, SCALE, {
    bias: bias + 0.08,
  });
  L.outline("k");
  // mouth interior
  if (mouth > 0.2) {
    for (let t = 0; t <= 1; t += 0.1) {
      const mx = x + s * (2 + t * 11) * k;
      L.line(mx, y + 4 * k, mx, jy - 1, "m");
    }
    L.line(x + s * 4 * k, jy - 1, x + s * 10 * k, jy - 2, "n");
    for (const f of [5, 10])
      L.set(x + s * f * k, y + 4 * k, "w").set(x + s * f * k, y + 5 * k, "w");
  }
  // nostril and brow ridge
  L.set(x + s * 12 * k, y - 0.5 * k, "a");
  L.line(
    x - 1 * k,
    y - 4 * k,
    x + s * 6 * k,
    y - 3 * k - (face === "angry" ? -1 : 1),
    "a",
  );
  // eye
  const ex = x + s * 2 * k;
  const ey = y - 1 * k;
  if (face === "hurt") {
    L.line(ex - 1, ey - 1, ex + 1, ey + 1, "x");
    L.line(ex - 1, ey + 1, ex + 1, ey - 1, "x");
  } else if (face === "faint") {
    L.line(ex - 1, ey, ex + 1, ey, "a");
  } else {
    L.set(ex, ey, face === "angry" ? "h" : "g");
    if (k > 0.7) L.set(ex + s, ey, "g").set(ex, ey + 1, "m");
  }
  return L;
}

/**
 * pose.bob: body breath; pose.sway: −1 … 1 heads weave; pose.strike: 0 … 1 heads lunge down;
 * pose.mouth: 0 … 1; pose.face; pose.gem: 0 … 1 glow; pose.lean: x offset of the heads.
 */
function frame({
  bob = 0,
  sway = 0,
  strike = 0,
  mouth = 0.1,
  face = "normal",
  gem = 0.5,
  lean = 0,
}) {
  const out = new Layer(W, H);
  const cx = 48;
  const by = 74 + bob;

  // tail curling up behind on the right
  const tail = new Layer(W, H);
  neck(
    tail,
    [cx + 16, by + 4],
    [cx + 42, by + 6],
    [cx + 38, by - 16 + sway * 2],
    7,
    2,
    -0.1,
  );
  tail.poly(
    [
      [cx + 37, by - 16 + sway * 2],
      [cx + 44, by - 26 + sway * 2],
      [cx + 41, by - 14 + sway * 2],
    ],
    FIN,
    () => 0.5,
  );
  tail.outline("k");
  out.draw(tail);

  // heads and necks: [base, control, end, size, side]
  const t = strike;
  const H0 = [
    {
      s: -1,
      end: [cx - 20 + sway * 3 + lean - t * 2, 33 - bob + t * 10],
      ctrl: [cx - 24, 62],
      k: 0.85,
      r0: 7,
      r1: 4.5,
      kid: true,
    },
    {
      s: 1,
      end: [cx + 20 + sway * 3 + lean + t * 2, 33 - bob + t * 10],
      ctrl: [cx + 24, 62],
      k: 0.85,
      r0: 7,
      r1: 4.5,
      kid: true,
    },
    {
      s: sway >= 0 ? 1 : -1,
      end: [cx - 3 + sway * 4 + lean, 18 - bob + t * 14],
      ctrl: [cx + 6, 46],
      k: 1,
      r0: 8,
      r1: 5.5,
      kid: false,
    },
  ];
  for (const hd of H0) {
    const base = [cx + hd.s * (hd.kid ? 10 : 0), by - 10];
    const L = new Layer(W, H);
    neck(L, base, hd.ctrl, hd.end, hd.r0, hd.r1, hd.kid ? -0.05 : 0.05);
    L.outline("k");
    // belly plates down the front of the neck
    L.clip((x, y) => {
      const nearFront =
        Math.abs(x - (hd.end[0] + base[0]) / 2 - (hd.kid ? 0 : 0)) < 2.5 &&
        y > hd.end[1] + 6;
      if (nearFront && L.px[y][x] !== "k") L.px[y][x] = y % 3 === 0 ? "p" : "q";
    });
    out.draw(L);
    // the recursive kid: a smaller neck and head budding off this neck, and its own bud
    if (hd.kid) {
      const s = hd.s;
      const root = [hd.end[0] + s * 1, hd.end[1] + 14];
      const kidEnd = [root[0] + s * 10, root[1] - 4 + sway * 2 + t * 4];
      const K = new Layer(W, H);
      neck(K, root, [root[0] + s * 8, root[1] + 4], kidEnd, 4, 3, -0.08);
      K.outline("k");
      out.draw(K);
      out.draw(head(kidEnd[0], kidEnd[1], s, 0.5, mouth * 0.8, face, -0.05));
      const gRoot = [kidEnd[0] + s * 1, kidEnd[1] + 5];
      const gEnd = [gRoot[0] + s * 5, gRoot[1] + 2 - sway];
      const G = new Layer(W, H);
      neck(G, gRoot, [gRoot[0] + s * 4, gRoot[1] + 4], gEnd, 2.5, 1.8, -0.1);
      G.outline("k");
      out.draw(G);
      out.draw(head(gEnd[0], gEnd[1], s, 0.3, 0, face, -0.1));
    }
    out.draw(
      head(
        hd.end[0],
        hd.end[1],
        hd.s,
        hd.k,
        mouth,
        face,
        hd.kid ? -0.02 : 0.05,
      ),
    );
  }

  // coiled body: stacked loops with a cream belly band
  const body = new Layer(W, H);
  body.ellipse(cx, by + 6, 26, 10, SCALE, { bias: -0.1 });
  body.ellipse(cx - 2, by - 2, 21, 9, SCALE, { bias: 0 });
  body.ellipse(cx + 1, by - 9, 14, 7, SCALE, { bias: 0.08 });
  body.outline("k");
  // scale crescents
  body.clip((x, y, c) => {
    if (
      c !== "k" &&
      (x + (y % 4 < 2 ? 0 : 2)) % 4 === 0 &&
      y % 2 === 0 &&
      c !== "a"
    )
      body.px[y][x] = SCALE[Math.max(0, SCALE.indexOf(c) - 1)];
  });
  // belly band where loops meet
  for (const [y0, hw] of [
    [by + 1, 22],
    [by - 6, 16],
  ])
    for (let x = cx - hw; x <= cx + hw; x++) {
      const yy = y0 + Math.round(((x - cx) / hw) ** 2 * 2);
      body.set(x, yy, (x & 3) === 0 ? "p" : "q");
      body.set(x, yy + 1, "p");
    }
  out.draw(body);

  // base-case gem on the coils
  const gemL = new Layer(W, H);
  gemL.poly(
    [
      [cx, by - 15],
      [cx + 4, by - 11],
      [cx, by - 7],
      [cx - 4, by - 11],
    ],
    gem > 0.75 ? "h" : "g",
  );
  gemL.set(cx - 1, by - 12, "h");
  gemL.outline("k");
  if (gem > 0.6)
    for (const [dx, dy] of [
      [-7, -11],
      [7, -11],
      [0, -19],
    ])
      gemL.set(cx + dx, by + dy, "h");
  out.draw(gemL);
  return out;
}

const hurt = frame({
  bob: 2,
  sway: 1,
  face: "hurt",
  mouth: 0.6,
  gem: 0.2,
  lean: 3,
});
const down = frame({
  bob: 6,
  sway: 0,
  strike: 1.3,
  face: "faint",
  mouth: 0.3,
  gem: 0,
});
emit(new URL("../../game/sprites/creatures/recursa.ts", import.meta.url), {
  id: "recursa",
  name: "RECURSA",
  script: "recursa",
  w: W,
  h: H,
  palette,
  comment:
    "Chapter 9 boss: a coiled hydra whose necks sprout ever-smaller heads (recursive CTEs). Front view, 96×96.",
  fps: { idle: 5, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [
      frame({ bob: 0, sway: -1, gem: 0.5 }),
      frame({ bob: -1, sway: -0.3, gem: 0.65 }),
      frame({ bob: -1, sway: 1, gem: 0.9 }),
      frame({ bob: 0, sway: 0.3, gem: 0.65 }),
    ],
    attack: [
      frame({
        bob: -2,
        sway: -1,
        strike: -0.4,
        mouth: 0.6,
        face: "angry",
        gem: 0.8,
      }),
      frame({
        bob: -3,
        sway: 0,
        strike: -0.6,
        mouth: 1,
        face: "angry",
        gem: 1,
      }),
      frame({
        bob: 1,
        sway: 0.5,
        strike: 1,
        mouth: 1,
        face: "angry",
        gem: 0.9,
        lean: -2,
      }),
    ],
    hurt: [
      hurt,
      frame({ bob: 1, sway: 0.5, face: "hurt", mouth: 0.3, gem: 0.3, lean: 1 }),
    ],
    faint: [
      down,
      dissolve(down, 0.3, 3),
      dissolve(down, 0.6, 6),
      dissolve(down, 0.85, 9),
    ],
  },
});

// BYTEBAT, the player's starter: a round data-bat with circuit-lined wings.
// Run: node scripts/art/bytebat.mjs
import { Layer, emit } from "./paint.mjs";

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
function frame({ wing = 0, bob = 0, mouth = false, spread = 0 }) {
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

emit(new URL("../../game/sprites/creatures/bytebat.ts", import.meta.url), {
  id: "bytebat",
  name: "BYTEBAT",
  w: W,
  h: H,
  palette,
  comment: "The starter: a round data-bat with circuit-traced wings. Front view, 64×64.",
  fps: { idle: 6, attack: 8 },
  anims: {
    idle: [frame({ wing: -6 }), frame({ wing: 0, bob: 1 }), frame({ wing: 6, bob: 2 }), frame({ wing: 0, bob: 1 })],
    attack: [frame({ wing: -8, spread: 1, mouth: true }), frame({ wing: 8, spread: 2, bob: 1, mouth: true }), frame({ wing: 0, bob: 1 })],
  },
});

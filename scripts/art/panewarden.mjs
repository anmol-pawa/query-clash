// PANEWARDEN, boss of chapter 13 (Window Functions Mastery): a stone sentinel
// with a gothic window set into its chest. A gold frame slides across a row of
// ledger tiles at its feet; the tiles inside the frame glow, the rest stay dark:
// a window frame moving over rows. The pane glints and the frame slides in idle.
// Run: node scripts/art/panewarden.mjs
import { Layer, emit, dissolve } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#0b1020", // outline
  a: "#232b3d", // stone ramp, dark → light
  b: "#3b4764",
  c: "#5b6b8f",
  d: "#8a9cc2",
  e: "#c3d1ee",
  s: "#0e5a6e", // glass ramp, dark → light
  t: "#1fa3b5",
  u: "#5fe0e0",
  v: "#d4fdfd",
  o: "#6b4a12", // gold ramp, dark → light
  p: "#b9831f",
  q: "#f2c744",
  r: "#fff0a0",
  y: "#7cf5ff", // eyes
  z: "#ffffff",
  x: "#ff4f6a", // hurt eyes
};
const STONE = ["a", "b", "c", "d", "e"];
const GLASS = ["s", "t", "u", "v"];

/** A shaded block lit from the upper left. */
function block(L, x0, y0, x1, y1, ramp, bias = 0) {
  L.poly(
    [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
    ramp,
    (x, y) => 0.62 + bias - ((x - x0) / (x1 - x0)) * 0.3 - ((y - y0) / (y1 - y0)) * 0.12,
  );
  return L;
}

/**
 * pose.bob: body breath; slide: 0 … 2 where the gold frame sits over the tiles;
 * glow: 0 … 1 pane brightness; arms: −1 (down) … 1 (raised); face; open: visor open.
 */
function frame({ bob = 0, slide = 0, glow = 0.5, arms = 0, face = "normal", lean = 0 }) {
  const out = new Layer(W, H);
  const cx = 48 + lean;
  const top = 30 + bob;

  // legs: two stone pillars
  const legs = new Layer(W, H);
  block(legs, cx - 16, top + 36, cx - 5, 83, STONE, -0.1);
  block(legs, cx + 5, top + 36, cx + 16, 83, STONE, -0.18);
  legs.outline("k");
  out.draw(legs);

  // arms behind the torso: raised arms lift the fists above the shoulders
  const raise = arms * 14;
  for (const s of [-1, 1]) {
    const A = new Layer(W, H);
    const sx = cx + s * 25;
    A.ellipse(sx, top + 9, 9, 8, STONE, { bias: -0.05 }); // shoulder
    const ex = sx + s * (5 + arms * 3);
    const ey = top + 28 - raise;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      A.ellipse(sx + (ex - sx) * t, top + 12 + (ey - top - 12) * t, 6, 6, STONE, { bias: -0.05 });
    }
    A.ellipse(ex, ey + 5, 7, 6, STONE, { bias: 0.02 }); // fist
    A.line(ex - 3, ey + 7, ex + 3, ey + 7, "a");
    A.outline("k");
    out.draw(A);
  }

  // torso
  const body = new Layer(W, H);
  body.ellipse(cx, top + 21, 22, 19, STONE, { bias: 0 });
  body.outline("k");
  // chiselled seams
  for (const sy of [top + 33, top + 38]) body.line(cx - 15, sy, cx - 11, sy, "a").line(cx + 11, sy, cx + 15, sy, "a");
  out.draw(body);

  // head: a squat helm with three stone spikes and a glowing visor slit
  const head = new Layer(W, H);
  head.poly([[cx - 8, top - 4], [cx - 6, top - 14], [cx - 3, top - 5]], STONE, () => 0.6);
  head.poly([[cx - 3, top - 5], [cx, top - 17], [cx + 3, top - 5]], STONE, () => 0.7);
  head.poly([[cx + 3, top - 5], [cx + 6, top - 14], [cx + 8, top - 4]], STONE, () => 0.45);
  head.ellipse(cx, top + 2, 12, 9, STONE, { bias: 0.08 });
  head.outline("k");
  head.poly([[cx - 8, top], [cx + 8, top], [cx + 7, top + 4], [cx - 7, top + 4]], "a");
  const ey = top + 2;
  if (face === "hurt") {
    for (const ex of [cx - 4, cx + 4]) head.line(ex - 1, ey - 1, ex + 1, ey + 1, "x").line(ex - 1, ey + 1, ex + 1, ey - 1, "x");
  } else if (face === "faint") {
    head.line(cx - 6, ey, cx - 2, ey, "b").line(cx + 2, ey, cx + 6, ey, "b");
  } else {
    const c = face === "angry" ? "z" : "y";
    for (const ex of [cx - 5, cx + 3]) head.line(ex, ey, ex + 2, ey, c).line(ex, ey + 1, ex + 2, ey + 1, "u");
  }
  out.draw(head);

  // chest window: pointed arch with a glass pane, mullions and a glint
  const win = new Layer(W, H);
  const wx0 = cx - 11;
  const wx1 = cx + 11;
  const wy0 = top + 14;
  const wy1 = top + 38;
  win.poly(
    [[wx0, wy1], [wx0, wy0 + 8], [cx - 6, wy0 + 2], [cx, wy0 - 2], [cx + 6, wy0 + 2], [wx1, wy0 + 8], [wx1, wy1]],
    GLASS,
    (x, y) => 0.28 + glow * 0.5 + (1 - (y - wy0) / (wy1 - wy0)) * 0.18,
  );
  win.outline("k");
  // mullions
  win.line(cx, wy0 - 1, cx, wy1, "s");
  win.line(wx0 + 1, wy0 + 14, wx1 - 1, wy0 + 14, "s");
  // glint: a diagonal stripe that travels with the glow
  const gx = wx0 + 3 + Math.round(glow * 12);
  for (let i = 0; i < 9; i++) win.set(gx + i / 2 + 0, wy0 + 6 + i, glow > 0.7 ? "v" : "u");
  // gold sill and arch trim
  win.line(wx0 - 1, wy1 + 1, wx1 + 1, wy1 + 1, "q").line(wx0 - 1, wy1 + 2, wx1 + 1, wy1 + 2, "o");
  out.draw(win);

  // ledger tiles in front: five stone tiles, the ones inside the gold frame light up
  const tiles = new Layer(W, H);
  const tx = (i) => 9 + i * 15.5;
  const fx0 = tx(slide) - 2;
  const fx1 = tx(slide + 2) + 13;
  for (let i = 0; i < 5; i++) {
    const lit = tx(i) + 6 > fx0 && tx(i) + 6 < fx1;
    const dy = lit ? -1 : 0;
    block(tiles, tx(i), 85 + dy, tx(i) + 12, 93 + dy, lit ? GLASS : STONE, lit ? 0.02 + glow * 0.2 : -0.12);
    tiles.line(tx(i) + 2, 88 + dy, tx(i) + 9, 88 + dy, lit ? "s" : "a");
    tiles.line(tx(i) + 2, 90 + dy, tx(i) + 6, 90 + dy, lit ? "s" : "a");
  }
  tiles.outline("k");
  out.draw(tiles);
  // the sliding frame: gold brackets with a thin top rail
  const fr = new Layer(W, H);
  const fy0 = 82;
  const fy1 = 95;
  fr.line(fx0, fy0, fx1, fy0, "q").line(fx0, fy0 + 1, fx1, fy0 + 1, "p");
  for (const x of [fx0, fx1]) for (let y = fy0; y <= fy1; y++) fr.set(x, y, "q").set(x + (x === fx0 ? 1 : -1), y, "p");
  fr.set(fx0, fy0, "r").set(fx1, fy0, "r");
  fr.outline("k");
  out.draw(fr);
  return out;
}

const down = frame({ bob: 7, slide: 1, glow: 0, arms: -1, face: "faint", lean: 0 });
emit(new URL("../../game/sprites/creatures/panewarden.ts", import.meta.url), {
  id: "panewarden",
  name: "PANEWARDEN",
  script: "panewarden",
  w: W,
  h: H,
  palette,
  comment:
    "Chapter 13 boss: a stone sentinel with a window in its chest and a gold frame sliding over ledger tiles (window functions). Front view, 96×96.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [
      frame({ bob: 0, slide: 0, glow: 0.4 }),
      frame({ bob: -1, slide: 0.7, glow: 0.6 }),
      frame({ bob: -1, slide: 1.6, glow: 0.9 }),
      frame({ bob: 0, slide: 1, glow: 0.6 }),
    ],
    attack: [
      frame({ bob: -1, slide: 0, glow: 0.8, arms: 0.6, face: "angry" }),
      frame({ bob: -3, slide: 1, glow: 1, arms: 1, face: "angry" }),
      frame({ bob: 2, slide: 2, glow: 1, arms: -0.6, face: "angry", lean: -2 }),
    ],
    hurt: [
      frame({ bob: 2, slide: 1, glow: 0.1, face: "hurt", lean: 3 }),
      frame({ bob: 1, slide: 1.4, glow: 0.3, face: "hurt", lean: 1 }),
    ],
    faint: [down, dissolve(down, 0.3, 3), dissolve(down, 0.6, 6), dissolve(down, 0.85, 9)],
  },
});

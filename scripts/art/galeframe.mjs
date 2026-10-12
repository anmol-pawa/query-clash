// GALEFRAME, boss of chapter 8 (The Windwraith, "Dancer of Frames"): a wind
// spirit whose body is a spinning funnel of air. A pale dancer's mask floats in
// its hood, two long ribbon-arms trail behind it, and a sliding window of three
// glass panes circles it, the lit pane stepping along like OVER (… ROWS 1 PRECEDING).
// Run: node scripts/art/galeframe.mjs
import { Layer, emit, dissolve } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#0a1f24", // outline
  a: "#145a5c", // wind ramp, dark → light
  b: "#22908a",
  c: "#4fc7b0",
  d: "#9ef0d2",
  e: "#e8fff6",
  m: "#d9d2c3", // mask ramp, dark → light
  n: "#f4efe4",
  o: "#a79e8c",
  r: "#3b2a5e", // ribbon ramp, dark → light
  s: "#6b4fa6",
  t: "#a383e0",
  g: "#ffd65e", // eyes / lit pane
  h: "#fff5c2",
  x: "#ff5f7a", // hurt eyes
  v: "#071417", // eye hollows
};
const WIND = ["a", "b", "c", "d", "e"];
const MASK = ["o", "m", "n"];
const RIB = ["r", "s", "t"];

/**
 * pose.bob: float height; pose.spin: swirl phase; pose.arms: −1 lowered … 1 flung up;
 * pose.face: "normal" | "angry" | "hurt" | "faint"; pose.pane: which window pane is lit;
 * pose.lean: x offset of the upper body; pose.tilt: funnel tip x offset.
 */
function frame({
  bob = 0,
  spin = 0,
  arms = 0,
  face = "normal",
  pane = 0,
  lean = 0,
  tilt = 0,
}) {
  const out = new Layer(W, H);
  const cx = 48 + lean;
  const cy = 28 + bob;

  // window panes that pass behind the body (back half of the orbit)
  const panes = [];
  for (let i = 0; i < 3; i++) {
    const a = spin * 0.5 + i * 2.09 + 2.4;
    panes.push({
      i,
      x: cx + Math.cos(a) * 38,
      y: cy + 30 + Math.sin(a) * 9,
      front: Math.sin(a) > 0,
    });
  }
  const drawPane = (p) => {
    const L = new Layer(W, H);
    const lit = p.i === pane % 3;
    const x0 = Math.round(p.x) - 4;
    const y0 = Math.round(p.y) - 4;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++)
        L.set(
          x0 + x,
          y0 + y,
          lit ? (x + y < 5 ? "h" : "g") : x + y < 5 ? "d" : "c",
        );
    for (let k = 0; k < 8; k++) {
      L.set(x0 + 3, y0 + k, lit ? "o" : "b");
      L.set(x0 + k, y0 + 3, lit ? "o" : "b");
    }
    L.outline("k");
    out.draw(L);
  };
  for (const p of panes) if (!p.front) drawPane(p);

  // ribbon arms: long streamers flowing from the shoulders
  for (const s of [-1, 1]) {
    const L = new Layer(W, H);
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const x = cx + s * (12 + t * 32);
      const y =
        cy +
        10 -
        arms * t * 30 +
        Math.sin(t * 5 + spin * 1.6 + (s > 0 ? 1 : 0)) * 5 * t +
        (1 - arms) * t * 8;
      pts.push([x, y, 3.2 - t * 2]);
    }
    const top = pts.map(([x, y, w]) => [x, y - w]);
    const bot = pts.map(([x, y, w]) => [x, y + w]).reverse();
    L.poly(
      [...top, ...bot],
      RIB,
      (x) =>
        0.75 -
        (s > 0 ? 0.25 : 0) -
        Math.abs(x - cx) / 120 +
        (Math.sin(x / 3) > 0.6 ? 0.2 : 0),
    );
    // wind-claw tip
    const [tx, ty] = pts[14];
    for (let k = -1; k <= 1; k++)
      L.line(tx, ty, tx + s * 5, ty + k * 4 - arms * 2, "d");
    L.outline("k");
    out.draw(L);
  }

  // the funnel body: wide under the hood, narrowing to a dancing tip
  const body = new Layer(W, H);
  const left = [];
  const right = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const y = cy + 6 + t * 56;
    const half = 21 * (1 - t) ** 1.3 + 1.5;
    const off = tilt * t * t + Math.sin(t * 6 + spin) * 2 * t;
    left.push([cx - half + off, y]);
    right.push([cx + half + off, y]);
  }
  body.poly([...left, ...[...right].reverse()], WIND, (x, y) => {
    const t = (y - cy - 6) / 56;
    const half = 21 * (1 - t) ** 1.3 + 1.5;
    const u = (x - cx - tilt * t * t) / half; // −1 … 1 across the funnel
    const band = Math.sin(y * 0.55 - u * 2.2 + spin * 2.4); // diagonal swirl stripes
    return (
      0.62 -
      u * 0.28 +
      (band > 0.55 ? 0.22 : band < -0.7 ? -0.18 : 0) -
      t * 0.15
    );
  });
  body.ellipse(cx, cy, 18, 15, WIND, { bias: 0.02 });
  body.outline("k");
  // gust streaks curling round the funnel
  for (let i = 0; i < 4; i++) {
    const y = cy + 18 + i * 10;
    const t = (y - cy - 6) / 56;
    const half = 21 * (1 - t) ** 1.3 + 1.5;
    const ph = ((spin * 3 + i * 2) % 6) - 3;
    body.line(
      cx - half + 2 + tilt * t * t + ph,
      y,
      cx + half * 0.3 + tilt * t * t + ph,
      y - 3,
      "e",
    );
  }
  out.draw(body);

  // hood rim: a curl of brighter wind over the mask
  const hood = new Layer(W, H);
  hood.ellipse(cx, cy - 6, 15, 9, WIND, { bias: 0.15 });
  hood.clip((x, y) => {
    if (y > cy - 6 + Math.abs(x - cx) * 0.25) hood.px[y][x] = ".";
  });
  for (const s of [-1, 1]) {
    hood.poly(
      [
        [cx + s * 10, cy - 12],
        [cx + s * 18, cy - 24 + (spin % 2)],
        [cx + s * 14, cy - 9],
      ],
      WIND,
      () => (s > 0 ? 0.6 : 0.85),
    );
  }
  hood.outline("k");
  out.draw(hood);

  // the dancer's mask
  const mask = new Layer(W, H);
  mask.ellipse(cx, cy + 2, 10, 11, MASK, { bias: 0.1 });
  mask.outline("k");
  out.draw(mask);
  // forehead gem
  out
    .set(cx, cy - 7, "g")
    .set(cx - 1, cy - 6, "g")
    .set(cx + 1, cy - 6, "g")
    .set(cx, cy - 5, "g")
    .set(cx, cy - 6, "h");
  for (const s of [-1, 1]) {
    const ex = cx + s * 4;
    const ey = cy;
    if (face === "hurt") {
      out.line(ex - 2, ey - 2, ex + 2, ey + 2, "x");
      out.line(ex - 2, ey + 2, ex + 2, ey - 2, "x");
    } else if (face === "faint") {
      out.line(ex - 2, ey + 1, ex + 2, ey + 1, "o");
    } else {
      // almond eye hollows with a glowing pupil
      out.line(ex - 2, ey, ex + 2, ey, "v");
      out.line(ex - 1, ey - 1, ex + 1, ey - 1, "v");
      out.line(ex - 1, ey + 1, ex + 1, ey + 1, "v");
      out.set(ex, ey, face === "angry" ? "h" : "g");
      if (face === "angry")
        out.line(ex - 3 * s, ey - 4, ex + 2 * s, ey - 2, "k");
    }
    // painted cheek marks
    out.line(ex + s * 1, ey + 4, ex + s * 2, ey + 7, "s");
  }
  // mouth
  if (face === "angry") {
    out.line(cx - 2, cy + 8, cx + 2, cy + 8, "v");
    out.line(cx - 1, cy + 9, cx + 1, cy + 9, "v");
  } else out.line(cx - 1, cy + 8, cx + 1, cy + 8, "o");

  for (const p of panes) if (p.front) drawPane(p);

  // loose leaves riding the gust
  for (let i = 0; i < 4; i++) {
    const a = spin * 0.9 + i * 1.6;
    const lx = Math.round(cx + Math.cos(a) * (26 + i * 3));
    const ly = Math.round(cy + 20 + Math.sin(a * 1.2) * 18 + i * 4);
    out.set(lx, ly, "t");
    out.set(lx + 1, ly, "s");
    out.set(lx, ly + 1, "r");
  }
  return out;
}

const hurt = frame({
  bob: 2,
  spin: 1,
  arms: -0.6,
  face: "hurt",
  lean: 3,
  tilt: 8,
  pane: 0,
});
const down = frame({
  bob: 10,
  spin: 0.5,
  arms: -1,
  face: "faint",
  tilt: -4,
  pane: 3,
});
emit(new URL("../../game/sprites/creatures/galeframe.ts", import.meta.url), {
  id: "galeframe",
  name: "GALEFRAME",
  script: "galeframe",
  w: W,
  h: H,
  palette,
  comment:
    "Chapter 8 boss: a wind spirit with a dancer's mask and a sliding window of glass panes (window functions). Front view, 96×96.",
  fps: { idle: 6, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [
      frame({ bob: 0, spin: 0, pane: 0, tilt: -3 }),
      frame({ bob: -1, spin: 1, pane: 1, tilt: 0 }),
      frame({ bob: -2, spin: 2, pane: 2, tilt: 3 }),
      frame({ bob: -1, spin: 3, pane: 0, tilt: 0 }),
    ],
    attack: [
      frame({ bob: -2, spin: 0, arms: 0.5, face: "angry", pane: 1, tilt: -5 }),
      frame({
        bob: -4,
        spin: 1.5,
        arms: 1,
        face: "angry",
        pane: 2,
        lean: -2,
        tilt: -8,
      }),
      frame({
        bob: 0,
        spin: 3,
        arms: 0.1,
        face: "angry",
        pane: 0,
        lean: 3,
        tilt: 6,
      }),
    ],
    hurt: [
      hurt,
      frame({
        bob: 1,
        spin: 2,
        arms: -0.3,
        face: "hurt",
        lean: 1,
        tilt: 4,
        pane: 1,
      }),
    ],
    faint: [
      down,
      dissolve(down, 0.3, 3),
      dissolve(down, 0.6, 6),
      dissolve(down, 0.85, 9),
    ],
  },
});

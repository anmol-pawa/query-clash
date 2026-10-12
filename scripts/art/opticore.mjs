// OPTICORE, boss of chapter 10 (The Optimizer, "Eye of the Planner"): a great
// floating eye held in an armoured iris-shutter ring. Below it hangs its query
// plan, a tree of glowing nodes (a join over two scans) on cables, and cost
// lenses orbit it. The eye roves as it weighs plans, then fixes and fires.
// Run: node scripts/art/opticore.mjs
import { Layer, emit, dissolve, ring } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#120b1c", // outline
  a: "#3a2a4a", // armour ramp, dark → light
  b: "#5e4a72",
  c: "#8d79a3",
  d: "#c2b4d1",
  w: "#b9b6c9", // eyeball ramp, dark → light
  y: "#e3e1ee",
  z: "#ffffff",
  r: "#7a1430", // iris ramp, dark → light
  s: "#c4304a",
  t: "#ff7a5c",
  v: "#0a0510", // pupil
  g: "#ffb83d", // brass / node glow
  h: "#fff0a8",
  o: "#a0621c",
  l: "#3ff0e0", // lens / plan glow
  m: "#b8fff7",
  q: "#8a1426", // veins
};
const ARMOR = ["a", "b", "c", "d"];
const EYE = ["w", "y", "z"];
const IRIS = ["r", "s", "t"];
const BRASS = ["o", "g", "h"];

/**
 * pose.bob: float height; pose.look: [dx, dy] pupil offset; pose.open: 0 … 1 shutter opening;
 * pose.glow: 0 … 1 plan/lens glow; pose.orbit: lens phase; pose.face: "normal" | "angry" | "hurt" | "faint";
 * pose.swing: plan-tree sway.
 */
function frame({
  bob = 0,
  look = [0, 0],
  open = 0.6,
  glow = 0.5,
  orbit = 0,
  face = "normal",
  swing = 0,
}) {
  const out = new Layer(W, H);
  const cx = 48;
  const cy = 33 + bob;

  // plan tree hanging below: root → two children → four leaves on cables
  const plan = new Layer(W, H);
  const root = [cx + swing, cy + 34];
  const kids = [-1, 1].map((s) => [cx + s * 13 + swing * 1.6, cy + 46]);
  const leaves = kids.flatMap(([x, y], i) =>
    [-1, 1].map((s) => [
      x + s * 6 + swing * 0.6 * (i ? 1 : -1),
      y + 11 + (s > 0 ? 1 : 0),
    ]),
  );
  const cable = face === "faint" ? "a" : glow > 0.7 ? "m" : "l";
  plan.line(cx, cy + 22, root[0], root[1], cable);
  for (const k of kids) plan.line(root[0], root[1], k[0], k[1], cable);
  leaves.forEach((lf, i) =>
    plan.line(kids[i >> 1][0], kids[i >> 1][1], lf[0], lf[1], cable),
  );
  plan.outline("k");
  const P = new Layer(W, H);
  const lit = (i) => face !== "faint" && glow > i * 0.18;
  P.ellipse(root[0], root[1], 4, 4, lit(1) ? BRASS : ARMOR, { bias: 0.05 });
  kids.forEach((k, i) =>
    P.ellipse(k[0], k[1], 3, 3, lit(2 + i) ? BRASS : ARMOR, { bias: 0.05 }),
  );
  leaves.forEach((lf, i) =>
    P.ellipse(lf[0], lf[1], 2, 2, lit(2 + (i >> 1)) ? ["l", "m"] : ARMOR),
  );
  P.outline("k");
  plan.draw(P);
  // ⋈ on the root node
  if (face !== "faint")
    plan
      .set(root[0] - 1, root[1] - 1, "k")
      .set(root[0] + 1, root[1] - 1, "k")
      .set(root[0], root[1], "k")
      .set(root[0] - 1, root[1] + 1, "k")
      .set(root[0] + 1, root[1] + 1, "k");
  out.draw(plan);

  // orbiting cost lenses (the back half of the orbit passes behind the ring)
  const lens = (front) => {
    for (let i = 0; i < 3; i++) {
      const a = orbit * 0.8 + i * 2.09;
      if (Math.sin(a) > 0 !== front) continue;
      const lx = cx + Math.cos(a) * 38;
      const ly = cy + 4 + Math.sin(a) * 12;
      const L = new Layer(W, H);
      L.ellipse(
        lx,
        ly,
        3.5,
        3.5,
        glow > 0.7 ? ["l", "m", "z"] : ["b", "l", "m"],
        { bias: 0.1 },
      );
      L.outline("k");
      out.draw(L);
    }
  };
  lens(false);

  // armour ring with four fins (N, E, S, W) and smaller diagonal spikes
  const arm = new Layer(W, H);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const big = i % 2 === 0;
    const len = big ? 30 + open * 3 : 25 + open * 2;
    const wdt = big ? 0.22 : 0.15;
    const p = (r, da) => [cx + Math.cos(a + da) * r, cy + Math.sin(a + da) * r];
    arm.poly(
      [p(18, -wdt * 1.6), p(len, 0), p(18, wdt * 1.6)],
      ARMOR,
      (x, y) =>
        0.75 - ((x - cx) * 0.55 + (y - cy) * 0.7) / 40 - (big ? 0 : 0.1),
    );
  }
  arm.ellipse(cx, cy, 22, 22, ARMOR, { bias: 0.02 });
  arm.outline("k");
  // brass rim with rivets
  ring(arm, cx, cy, 20, 20, "o", 2);
  ring(arm, cx, cy, 19, 19, "g");
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6 + 0.26;
    arm.set(cx + Math.cos(a) * 21.5, cy + Math.sin(a) * 21.5, "h");
  }
  out.draw(arm);

  // the eyeball
  const eyeR = 16;
  const eye = new Layer(W, H);
  if (face === "faint") {
    // shutter closed: armoured lids
    eye.ellipse(cx, cy, eyeR, eyeR, ARMOR, { bias: -0.05 });
    eye.line(cx - eyeR + 2, cy, cx + eyeR - 2, cy, "k");
  } else {
    eye.ellipse(cx, cy, eyeR, eyeR, EYE, {
      bias: face === "hurt" ? -0.1 : 0.05,
    });
    // veins creeping in from the rim
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + 0.4;
      const r0 = eyeR - 1;
      eye.line(
        cx + Math.cos(a) * r0,
        cy + Math.sin(a) * r0,
        cx + Math.cos(a + 0.12) * (r0 - 4),
        cy + Math.sin(a + 0.12) * (r0 - 4),
        "q",
      );
    }
    const ix = cx + look[0];
    const iy = cy + look[1];
    const ir = face === "angry" ? 9 : 8;
    eye.ellipse(ix, iy, ir, ir, IRIS, { bias: face === "angry" ? 0.15 : 0 });
    ring(eye, ix, iy, ir, ir, "r");
    // iris spokes
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + orbit * 0.3;
      eye.set(
        ix + Math.cos(a) * (ir - 2.5),
        iy + Math.sin(a) * (ir - 2.5),
        "t",
      );
    }
    if (face === "hurt") {
      eye.line(ix - 3, iy - 3, ix + 3, iy + 3, "v");
      eye.line(ix - 3, iy + 3, ix + 3, iy - 3, "v");
    } else {
      const pr = face === "angry" ? 2 : 3.5;
      eye.ellipse(ix, iy, pr, face === "angry" ? 5 : pr, ["v"]);
      eye
        .set(ix - 4, iy - 4, "z")
        .set(ix - 3, iy - 4, "z")
        .set(ix - 4, iy - 3, "z");
    }
    // shutter lids closing in from top and bottom
    const lid = (1 - open) * eyeR * 0.9 + (face === "angry" ? 4 : 0);
    eye.clip((x, y) => {
      const dy = y + 0.5 - cy;
      if (dy < -eyeR + lid || dy > eyeR - lid * 0.7)
        eye.px[y][x] = dy < 0 ? (y + 1 - cy < -eyeR + lid ? "b" : "k") : "a";
    });
    for (let x = cx - eyeR; x <= cx + eyeR; x++) {
      const yt = Math.round(cy - eyeR + lid);
      const yb = Math.round(cy + eyeR - lid * 0.7);
      if (eye.get(x, yt) !== ".") eye.set(x, yt, "k");
      if (eye.get(x, yb) !== ".") eye.set(x, yb, "k");
    }
  }
  out.draw(eye);

  lens(true);

  // charge beam sparkle in the pupil when firing
  if (face === "angry" && glow > 0.9)
    for (const [dx, dy] of [
      [0, -7],
      [0, 7],
      [-7, 0],
      [7, 0],
    ])
      out.set(cx + look[0] + dx, cy + look[1] + dy, "h");
  return out;
}

const hurt = frame({
  bob: 2,
  look: [3, 2],
  open: 0.5,
  glow: 0.2,
  orbit: 1,
  face: "hurt",
  swing: 4,
});
const down = frame({
  bob: 8,
  open: 0,
  glow: 0,
  orbit: 2,
  face: "faint",
  swing: -1,
});
emit(new URL("../../game/sprites/creatures/opticore.ts", import.meta.url), {
  id: "opticore",
  name: "OPTICORE",
  script: "opticore",
  w: W,
  h: H,
  palette,
  comment:
    "Chapter 10 boss: a floating eye in an armoured ring, with its query plan tree hanging beneath. Front view, 96×96.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [
      frame({ look: [-4, 0], glow: 0.4, orbit: 0, swing: -2 }),
      frame({ bob: -1, look: [0, -3], glow: 0.6, orbit: 1, swing: 0 }),
      frame({ bob: -2, look: [4, 0], glow: 0.8, orbit: 2, swing: 2 }),
      frame({
        bob: -1,
        look: [0, 2],
        open: 0.4,
        glow: 0.6,
        orbit: 3,
        swing: 0,
      }),
    ],
    attack: [
      frame({
        bob: -2,
        look: [0, 0],
        open: 0.8,
        glow: 0.8,
        orbit: 0,
        face: "angry",
        swing: -1,
      }),
      frame({
        bob: -3,
        look: [0, 1],
        open: 1,
        glow: 1,
        orbit: 1,
        face: "angry",
        swing: 0,
      }),
      frame({
        bob: 1,
        look: [-1, 3],
        open: 1,
        glow: 0.95,
        orbit: 2,
        face: "angry",
        swing: 3,
      }),
    ],
    hurt: [
      hurt,
      frame({
        bob: 1,
        look: [2, 1],
        open: 0.3,
        glow: 0.3,
        orbit: 2,
        face: "hurt",
        swing: 2,
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

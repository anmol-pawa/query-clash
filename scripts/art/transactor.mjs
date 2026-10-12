// TRANSACTOR, boss of chapter 6 (The Transactor, Clockwork Knight of ACID):
// a wind-up armoured knight. A brass gear turns in its chest, a wind-up key
// spins on its back, its shield is a clock face (commit time) and it swings
// a long sword.
// Run: node scripts/art/transactor.mjs
import { Layer, emit, dissolve, ring } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#0d0e14", // outline
  i: "#2b3140", // steel ramp, dark → light
  j: "#4d5870",
  l: "#8593ad",
  m: "#cfd9ea",
  g: "#6a3f10", // brass ramp, dark → light
  h: "#b0721c",
  y: "#e7b440",
  z: "#fff0a8",
  c: "#f3ead2", // clock face
  d: "#c9bb98",
  p: "#5c0f1e", // plume ramp, dark → light
  q: "#a3233a",
  s: "#e04a5a",
  e: "#46f0ff", // visor glow
  f: "#d2fcff",
  v: "#07080d", // visor dark
  x: "#ff5a3c", // angry / hurt visor
};
const STEEL = ["i", "j", "l", "m"];
const BRASS = ["g", "h", "y", "z"];
const PLUME = ["p", "q", "s"];

const rot = (x, y, ox, oy, a) => [ox + (x - ox) * Math.cos(a) - (y - oy) * Math.sin(a), oy + (x - ox) * Math.sin(a) + (y - oy) * Math.cos(a)];

/** A brass cog with `teeth` teeth, turned by `phase` radians. */
function gear(L, cx, cy, r, teeth, phase) {
  for (let y = Math.floor(cy - r - 3); y <= cy + r + 3; y++)
    for (let x = Math.floor(cx - r - 3); x <= cx + r + 3; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx) + phase;
      const tooth = ((((a * teeth) / (2 * Math.PI)) % 1) + 1) % 1 < 0.5;
      if (d > (tooth ? r + 2 : r) || d < 2) continue;
      L.set(x, y, L.shade(BRASS, 0.62 - dx / (2.4 * r) - dy / (3 * r) + (d < r - 2.5 && d > r - 4 ? -0.2 : 0), x, y));
    }
  return L;
}

/**
 * pose.bob: body height; pose.gear: chest gear / key phase; pose.sword: blade angle (0 = up);
 * pose.hand: [dx, dy] sword-hand offset; pose.shield: [dx, dy] shield offset;
 * pose.face: "normal" | "angry" | "hurt" | "faint"; pose.plume: plume sway; pose.lean: torso x offset.
 */
function frame({ bob = 0, gear: gp = 0, sword = 0.25, hand = [0, 0], shield = [0, 0], face = "normal", plume = 0, lean = 0 }) {
  const out = new Layer(W, H);
  const cx = 48 + lean;
  const cy = 6 + bob;

  // wind-up key on the back, peeking over the left shoulder
  const key = new Layer(W, H);
  key.line(cx - 4, cy + 22, cx - 20, cy + 8, "h").line(cx - 3, cy + 22, cx - 19, cy + 8, "g");
  const kw = Math.abs(Math.cos(gp * 2.5)) * 3.5 + 1;
  key.ellipse(cx - 24, cy + 6 - kw, 3, kw, BRASS, { bias: 0.05 });
  key.ellipse(cx - 18, cy + 2 - kw * 0.6, 3, kw, BRASS, { bias: -0.1 });
  key.ellipse(cx - 20, cy + 7, 2, 2, BRASS);
  key.outline("k");
  out.draw(key);

  // legs: steel greaves with brass knees, standing on the ground (they don't bob)
  const legs = new Layer(W, H);
  for (const s of [-1, 1]) {
    const X = (x) => 48 + s * x;
    legs.poly(
      [
        [X(4), cy + 50],
        [X(14), cy + 50],
        [X(13), 72],
        [X(5), 72],
      ],
      STEEL,
      (x) => 0.6 - (x - 48) / 50,
    );
    legs.poly(
      [
        [X(5), 74],
        [X(13), 74],
        [X(14), 88],
        [X(4), 88],
      ],
      STEEL,
      (x, y) => 0.75 - (x - 48) / 50 - (y - 74) / 40,
    );
    legs.poly(
      [
        [X(3), 87],
        [X(16), 87],
        [X(18), 93],
        [X(2), 93],
      ],
      STEEL,
      () => (s > 0 ? 0.35 : 0.55),
    );
    legs.ellipse(X(9), 73, 5, 4, BRASS);
  }
  legs.outline("k");
  out.draw(legs);

  // torso: breastplate, faulds and brass belt
  const torso = new Layer(W, H);
  torso.poly(
    [
      [cx - 19, cy + 22],
      [cx + 19, cy + 22],
      [cx + 13, cy + 46],
      [cx - 13, cy + 46],
    ],
    STEEL,
    (x, y) => 0.8 - (x - cx) / 34 - (y - cy - 22) / 70,
  );
  torso.poly(
    [
      [cx - 14, cy + 47],
      [cx + 14, cy + 47],
      [cx + 16, cy + 56],
      [cx - 16, cy + 56],
    ],
    STEEL,
    (x) => 0.5 - (x - cx) / 40,
  );
  torso.outline("k");
  torso.line(cx - 13, cy + 46, cx + 13, cy + 46, "h").line(cx - 13, cy + 47, cx + 13, cy + 47, "g");
  torso.set(cx, cy + 46, "z").set(cx, cy + 47, "y");
  // fauld plates
  for (const fx of [-8, 0, 8]) torso.line(cx + fx, cy + 49, cx + fx * 1.15, cy + 55, "i");
  out.draw(torso);

  // chest gear behind a round window
  const chest = new Layer(W, H);
  chest.ellipse(cx, cy + 32, 10, 10, ["v"]);
  gear(chest, cx, cy + 32, 6.5, 8, gp);
  chest.set(cx, cy + 32, "z");
  ring(chest, cx, cy + 32, 10.5, 10.5, "j");
  out.draw(chest);

  // helmet with a visor slit and a plume
  const helm = new Layer(W, H);
  const hx = cx;
  const hy = cy + 12;
  const pl = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pl.push([hx + t * 16 + plume * t * t, hy - 10 - Math.sin(t * Math.PI) * 10 + t * 14]);
  }
  helm.poly([...pl, ...[...pl].reverse().map(([x, y], i) => [x - 2, y + 8 - (i / 8) * 6])], PLUME, (x, y) => 0.8 - (y - hy + 18) / 14);
  helm.ellipse(hx, hy, 11, 12, STEEL, { bias: 0.05 });
  helm.poly(
    [
      [hx - 11, hy + 2],
      [hx + 11, hy + 2],
      [hx + 9, hy + 12],
      [hx - 9, hy + 12],
    ],
    STEEL,
    (x) => 0.6 - (x - hx) / 26,
  );
  helm.outline("k");
  // crest ridge
  helm.line(hx - 1, hy - 11, hx - 1, hy + 1, "m").line(hx, hy - 11, hx, hy + 1, "j");
  // visor slit
  helm.line(hx - 8, hy + 3, hx + 8, hy + 3, "v").line(hx - 8, hy + 4, hx + 8, hy + 4, "v");
  const glow = face === "angry" || face === "hurt" ? "x" : "e";
  if (face === "faint") helm.line(hx - 6, hy + 4, hx + 6, hy + 4, "i");
  else if (face === "hurt") {
    helm.line(hx - 6, hy + 3, hx - 3, hy + 4, glow).line(hx + 3, hy + 4, hx + 6, hy + 3, glow);
  } else {
    helm.line(hx - 6, hy + 3, hx - 3, hy + 3, glow).line(hx + 3, hy + 3, hx + 6, hy + 3, glow);
    helm.set(hx - 5, hy + 3, "f").set(hx + 5, hy + 3, "f");
  }
  // breathing holes
  for (const dx of [-3, 0, 3]) helm.set(hx + dx, hy + 8, "i");
  out.draw(helm);

  // pauldrons
  const pads = new Layer(W, H);
  for (const s of [-1, 1])
    pads.ellipse(cx + s * 20, cy + 23, 8, 6, BRASS, {
      bias: s > 0 ? -0.1 : 0.05,
    });
  pads.outline("k");
  for (const s of [-1, 1]) pads.line(cx + s * 14, cy + 25, cx + s * 26, cy + 25, "g");
  out.draw(pads);

  // right arm and sword
  const sx = cx + 27 + hand[0];
  const sy = cy + 42 + hand[1];
  const arm = new Layer(W, H);
  arm.poly(
    [
      [cx + 16, cy + 26],
      [cx + 24, cy + 25],
      [sx + 3, sy - 2],
      [sx - 4, sy],
    ],
    STEEL,
    () => 0.4,
  );
  arm.ellipse(sx, sy, 4, 4, STEEL, { bias: -0.05 });
  arm.outline("k");
  const blade = new Layer(W, H);
  const R = (x, y) => rot(sx + x, sy + y, sx, sy, sword);
  blade.poly([R(-2, -4), R(2, -4), R(2, -34), R(0, -38), R(-2, -34)], STEEL, (x, y) => {
    const [lx] = rot(x, y, sx, sy, -sword);
    return lx < sx ? 0.95 : 0.5;
  });
  // crossguard and pommel
  blade.poly([R(-7, -3), R(7, -3), R(7, -6), R(-7, -6)], BRASS, () => 0.6);
  const [px, py] = R(0, 5);
  blade.ellipse(px, py, 2, 2, BRASS);
  blade.outline("k");
  const [f1x, f1y] = R(0, -8);
  const [f2x, f2y] = R(0, -32);
  blade.line(f1x, f1y, f2x, f2y, "j");
  out.draw(blade);
  out.draw(arm);

  // left arm and clock-face shield
  const shx = cx - 27 + shield[0];
  const shy = cy + 44 + shield[1];
  const sh = new Layer(W, H);
  sh.poly(
    [
      [cx - 24, cy + 25],
      [cx - 16, cy + 26],
      [shx + 4, shy - 2],
      [shx - 3, shy - 4],
    ],
    STEEL,
    () => 0.7,
  );
  sh.ellipse(shx, shy, 13, 13, BRASS, { bias: 0.05 });
  sh.ellipse(shx, shy, 10, 10, ["d", "c", "c"], { bias: 0.1 });
  sh.outline("k");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    sh.set(shx + Math.cos(a) * 8.5, shy + Math.sin(a) * 8.5, i % 3 === 0 ? "k" : "d");
  }
  // clock hands tick with the gear
  const ha = gp * 0.5 - Math.PI / 2;
  const ma = gp * 3 - Math.PI / 2;
  sh.line(shx, shy, shx + Math.cos(ha) * 4, shy + Math.sin(ha) * 4, "k");
  sh.line(shx, shy, shx + Math.cos(ma) * 7, shy + Math.sin(ma) * 7, "q");
  sh.set(shx, shy, "g");
  out.draw(sh);
  return out;
}

const hurt = frame({
  bob: 2,
  gear: 0.2,
  sword: 0.7,
  hand: [2, 2],
  shield: [-3, 2],
  face: "hurt",
  plume: 4,
  lean: 2,
});
const down = frame({
  bob: 7,
  gear: 0,
  sword: 1.6,
  hand: [3, 6],
  shield: [0, 6],
  face: "faint",
  plume: 5,
});
emit(new URL("../../game/sprites/creatures/transactor.ts", import.meta.url), {
  id: "transactor",
  name: "TRANSACTOR",
  script: "transactor",
  w: W,
  h: H,
  palette,
  comment: "Chapter 6 boss: a clockwork knight with a turning chest gear, wind-up key, clock shield and sword. Front view, 96×96.",
  fps: { idle: 5, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ gear: 0, plume: 0 }), frame({ gear: 0.2, plume: 1, bob: 1 }), frame({ gear: 0.4, plume: 2 }), frame({ gear: 0.6, plume: 1, bob: -1 })],
    attack: [
      frame({
        gear: 0.8,
        sword: -0.5,
        hand: [-2, -12],
        shield: [3, -2],
        face: "angry",
        plume: -2,
        bob: -1,
      }),
      frame({
        gear: 1.2,
        sword: -1.1,
        hand: [-6, -20],
        shield: [4, -3],
        face: "angry",
        plume: -4,
        bob: -2,
        lean: -1,
      }),
      frame({
        gear: 1.6,
        sword: 2.1,
        hand: [-8, 4],
        shield: [5, 1],
        face: "angry",
        plume: 4,
        bob: 2,
        lean: -3,
      }),
    ],
    hurt: [
      hurt,
      frame({
        bob: 1,
        gear: 0.3,
        sword: 0.5,
        hand: [1, 1],
        shield: [-2, 1],
        face: "hurt",
        plume: 2,
        lean: 1,
      }),
    ],
    faint: [down, dissolve(down, 0.3, 3), dissolve(down, 0.6, 6), dissolve(down, 0.85, 9)],
  },
});

// JOINMASTER, boss of chapter 2: an iron golem bound in chains, Warden of
// Foreign Keys. A key-shaped lock glows on its chest and its arms are chains
// ending in shackled fists that link rows together.
// Run: node scripts/art/joinmaster.mjs
import { Layer, emit, dissolve, ring } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#11131c", // outline
  i: "#2c3346", // iron ramp, dark → light
  j: "#4a5670",
  l: "#7887a6",
  m: "#b9c6de",
  s: "#3b2a1e", // stone/rust ramp for the legs and plates
  t: "#6b4a2e",
  u: "#a2743f",
  g: "#7a4d12", // chain gold ramp
  h: "#c98a1d",
  y: "#f4c84a",
  z: "#fff1b0",
  e: "#46f0ff", // eye / key glow
  f: "#c8fbff",
  v: "#0a0d16", // visor dark
  r: "#ff4f6d", // hurt eyes
};
const IRON = ["i", "j", "l", "m"];
const RUST = ["s", "t", "u"];
const GOLD = ["g", "h", "y", "z"];

/** A chain of alternating links from (x0, y0) to (x1, y1). */
function chain(L, x0, y0, x1, y1) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.round(len / 5));
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * (i / n);
    const y = y0 + (y1 - y0) * (i / n);
    if (i % 2 === 0) {
      // face-on link: a shaded ring
      const C = new Layer(W, H);
      C.ellipse(x, y, 3.4, 3.4, GOLD, { bias: 0.1 });
      C.ellipse(x, y, 1.3, 1.3, ["k"]);
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (C.px[yy][xx] === "k") C.px[yy][xx] = ".";
      L.draw(C);
    } else {
      // edge-on link: a short bar along the chain
      L.line(x - ux * 3, y - uy * 3, x + ux * 3, y + uy * 3, "h");
      L.line(x - ux * 3 + 1, y - uy * 3, x + ux * 3 + 1, y + uy * 3, "g");
      L.set(x - ux, y - uy, "z");
    }
  }
  return L;
}

/** A shackled fist at (x, y). */
function fist(L, x, y, s) {
  L.ellipse(x, y, 8, 7.5, IRON, { bias: 0.05 });
  // knuckles and fingers, with the thumb folded across
  for (let k = -1; k <= 1; k++) L.ellipse(x + k * 4 - s, y + 3, 2.4, 2.2, IRON, { bias: 0.25 });
  for (let k = -1; k <= 0; k++) L.line(x + k * 4 - s + 2, y + 2, x + k * 4 - s + 2, y + 6, "i");
  L.poly(
    [
      [x - 6 * s, y - 1],
      [x + 1 * s, y + 1],
      [x + 1 * s, y + 3],
      [x - 6 * s, y + 2],
    ],
    IRON,
    () => 0.85,
  );
  L.line(x - 6 * s, y + 3, x + 1 * s, y + 3, "i");
  // cuff band
  for (let dx = -8; dx <= 8; dx++) {
    L.set(x + dx, y - 4, Math.abs(dx) < 7 ? "h" : "g");
    L.set(x + dx, y - 3, "g");
  }
  L.set(x - 4, y - 4, "z");
}

/**
 * pose.bob: body height; pose.arm: −1 hanging … 1 raised (right arm swings for the attack);
 * pose.face: "normal" | "angry" | "hurt" | "faint"; pose.glow: 0 … 1 chest key brightness;
 * pose.lean: x offset of the upper body; pose.swing: chain sway.
 */
function frame({ bob = 0, arm = -1, face = "normal", glow = 0.5, lean = 0, swing = 0 }) {
  const out = new Layer(W, H);
  const cx = 48 + lean;
  const cy = 52 + bob;

  // legs: rusted stone pillars
  const legs = new Layer(W, H);
  for (const s of [-1, 1]) {
    const lx = 48 + s * 13;
    legs.poly(
      [
        [lx - 8, cy + 14],
        [lx + 8, cy + 14],
        [lx + 10, 90],
        [lx - 10, 90],
      ],
      RUST,
      (x, y) => 0.8 - (x - lx + 10) / 26 - (y - cy) / 120,
    );
    legs.poly(
      [
        [lx - 11, 86],
        [lx + 11, 86],
        [lx + 12, 91],
        [lx - 12, 91],
      ],
      IRON,
      (x) => 0.7 - (x - lx) / 30,
    );
  }
  legs.outline("k");
  out.draw(legs);

  // left arm (viewer's left): chain hanging to a fist, swaying a little
  const armL = new Layer(W, H);
  const lfx = cx - 32 + swing;
  const lfy = cy + 26;
  chain(armL, cx - 26, cy - 6, lfx, lfy - 8);
  fist(armL, lfx, lfy, 1);
  armL.outline("k");

  // right arm: raised for the attack, hanging at rest
  const armR = new Layer(W, H);
  const a = (arm + 1) / 2; // 0 … 1
  const rfx = cx + 32 - swing + a * 4;
  const rfy = cy + 26 - a * 56;
  chain(armR, cx + 26, cy - 6, rfx, rfy + (a > 0.5 ? 8 : -8));
  fist(armR, rfx, rfy, -1);
  if (a > 0.5) {
    // crackle around the raised fist
    for (const [dx, dy] of [
      [-11, -2],
      [10, -6],
      [-6, -11],
      [7, 9],
    ])
      armR.set(rfx + dx, rfy + dy, "e");
  }
  armR.outline("k");

  // torso: a barrel of riveted iron
  const body = new Layer(W, H);
  body.ellipse(cx, cy, 25, 21, IRON);
  // shoulder pauldrons
  for (const s of [-1, 1]) body.ellipse(cx + s * 24, cy - 10, 10, 9, IRON, { bias: s < 0 ? 0.1 : -0.05 });
  // belt of rusted plates
  body.poly(
    [
      [cx - 23, cy + 8],
      [cx + 23, cy + 8],
      [cx + 20, cy + 16],
      [cx - 20, cy + 16],
    ],
    RUST,
    (x) => 0.85 - (x - cx + 23) / 60,
  );
  body.outline("k");
  // rivets around the chest plate
  for (let t = 0; t < Math.PI * 2; t += Math.PI / 6) {
    const x = cx + Math.cos(t) * 17;
    const y = cy - 2 + Math.sin(t) * 12;
    if (y < cy + 8) {
      body.set(x, y, "m");
      body.set(x + 1, y + 1, "i");
    }
  }
  // seam lines
  body.line(cx - 20, cy + 8, cx + 20, cy + 8, "k");
  for (const s of [-1, 1]) body.line(cx + s * 16, cy - 18, cx + s * 22, cy - 6, "i");

  // chest lock: a keyhole badge with a glowing key
  const lock = new Layer(W, H);
  lock.ellipse(cx, cy - 2, 9, 8, GOLD, { bias: 0.05 });
  lock.outline("k");
  const kc = glow > 0.7 ? "f" : "e";
  ring(lock, cx - 3, cy - 2, 2.6, 2.6, kc);
  lock.line(cx - 1, cy - 2, cx + 5, cy - 2, kc);
  lock.set(cx + 3, cy - 1, kc);
  lock.set(cx + 5, cy - 1, kc);
  lock.set(cx + 5, cy, kc);
  if (glow > 0.7)
    for (const [dx, dy] of [
      [-10, -2],
      [10, -2],
      [0, -10],
      [0, 7],
    ])
      lock.set(cx + dx, cy - 2 + dy, "e");

  // bandolier chain across the torso
  const band = new Layer(W, H);
  chain(band, cx - 20, cy - 14, cx + 18, cy + 8);
  band.outline("k");

  // head: a squat helm with a visor slit
  const head = new Layer(W, H);
  const hx = cx + lean * 0.5;
  const hy = cy - 27 + (face === "faint" ? 4 : 0);
  head.ellipse(hx, hy, 13, 11, IRON, { bias: 0.08 });
  // crest of chain-link horns
  for (const s of [-1, 1])
    head.poly(
      [
        [hx + s * 8, hy - 6],
        [hx + s * 17, hy - 16],
        [hx + s * 13, hy - 4],
      ],
      GOLD,
      (x, y) => 0.9 - (y - hy + 16) / 20 - (s > 0 ? 0.25 : 0),
    );
  head.outline("k");
  // visor
  for (let dx = -9; dx <= 9; dx++) {
    head.set(hx + dx, hy, "v");
    head.set(hx + dx, hy + 1, "v");
    if (Math.abs(dx) < 8) head.set(hx + dx, hy + 2, "v");
  }
  // eyes
  for (const s of [-1, 1]) {
    const ex = hx + s * 5;
    const ey = hy + 1;
    if (face === "hurt") {
      head.line(ex - 2, ey - 1, ex + 2, ey + 1, "r");
      head.line(ex - 2, ey + 1, ex + 2, ey - 1, "r");
    } else if (face === "faint") {
      head.line(ex - 2, ey + 1, ex + 2, ey + 1, "i");
    } else {
      const c = face === "angry" ? "f" : "e";
      head.line(ex - 2, ey, ex + 2, ey, c);
      head.line(ex - 2, ey + 1, ex + 2, ey + 1, "e");
      if (face === "angry") head.line(ex - 3 * s, ey - 2, ex + 2 * s, ey - 1, "k");
    }
  }
  // jaw grille
  for (let dx = -6; dx <= 6; dx += 3) head.line(hx + dx, hy + 5, hx + dx, hy + 8, "i");

  out.draw(armL);
  out.draw(body);
  out.draw(band);
  out.draw(lock);
  out.draw(head);
  out.draw(armR);
  return out;
}

const hurt = frame({ bob: 2, lean: 3, face: "hurt", glow: 0.2, swing: 3 });
const down = frame({ bob: 6, lean: 1, face: "faint", glow: 0, swing: -2 });
emit(new URL("../../game/sprites/creatures/joinmaster.ts", import.meta.url), {
  id: "joinmaster",
  name: "JOINMASTER",
  script: "joinmaster",
  w: W,
  h: H,
  palette,
  comment: "Chapter 2 boss: an iron chain golem with a foreign-key lock on its chest. Front view, 96×96.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ bob: 0, glow: 0.5, swing: 0 }), frame({ bob: 1, glow: 0.6, swing: 1 }), frame({ bob: 1, glow: 0.8, swing: 2 }), frame({ bob: 0, glow: 0.6, swing: 1 })],
    attack: [frame({ bob: 1, arm: 0, face: "angry", glow: 0.8, lean: -1 }), frame({ bob: -2, arm: 1, face: "angry", glow: 1, lean: -2 }), frame({ bob: 2, arm: -0.6, face: "angry", glow: 0.9, lean: 3, swing: -3 })],
    hurt: [hurt, frame({ bob: 1, lean: 1, face: "hurt", glow: 0.3, swing: 1 })],
    faint: [down, dissolve(down, 0.3, 3), dissolve(down, 0.6, 6), dissolve(down, 0.85, 9)],
  },
});

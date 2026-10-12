// ROWREAPER, boss of chapter 5 (The DML Reaper, Harvester of Rows): a hooded
// skull-faced reaper in a tattered robe. It swings a long scythe and the
// table rows it has harvested float around it like lost souls.
// Run: node scripts/art/rowreaper.mjs
import { Layer, emit, dissolve } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#0c0a10", // outline
  m: "#1c1f2a", // robe ramp, dark → light
  n: "#2f3446",
  o: "#4b5368",
  p: "#76809a",
  v: "#050407", // hood shadow
  a: "#7c7262", // bone ramp, dark → light
  b: "#bdb29a",
  c: "#ece4cc",
  s: "#3d4552", // scythe steel ramp, dark → light
  t: "#7e8a9c",
  u: "#c6d2e0",
  w: "#ffffff",
  d: "#4a2e1c", // haft wood ramp
  e: "#7a4f2c",
  g: "#7dff9a", // soul / eye glow
  h: "#d6ffe0",
  r: "#ff3b4f", // angry / hurt eyes
};
const ROBE = ["m", "n", "o", "p"];
const BONE = ["a", "b", "c"];
const STEEL = ["s", "t", "u", "w"];

const rot = (x, y, ox, oy, a) => [ox + (x - ox) * Math.cos(a) - (y - oy) * Math.sin(a), oy + (x - ox) * Math.sin(a) + (y - oy) * Math.cos(a)];

/** The scythe, held at (hx, hy), tilted by `ang` radians (0 = upright, blade sweeping left over the head). */
function scythe(hx, hy, ang) {
  const L = new Layer(W, H);
  const len = 52;
  const R = (x, y) => rot(hx + x, hy + y, hx, hy, ang);
  // haft: two-tone wood, 3 px wide
  for (let i = -1; i <= 1; i++) {
    const [x0, y0] = R(i, 16);
    const [x1, y1] = R(i, -len);
    L.line(x0, y0, x1, y1, i < 1 ? "e" : "d");
  }
  // blade: a crescent from the top of the haft sweeping left
  const outer = [];
  const inner = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    outer.push(R(2 - 34 * t, -len - 2 - 7 * Math.sin(Math.PI * t * 0.9) + 12 * t * t));
    inner.push(R(2 - 34 * t, -len + 6 - 4 * Math.sin(Math.PI * t * 0.9) + 12 * t * t - 6 * t));
  }
  L.poly([...outer, ...inner.reverse()], STEEL, (x, y) => {
    const [, ty] = rot(x, y, hx, hy, -ang);
    return 0.95 - (ty - (hy - len - 6)) / 14;
  });
  // collar where the blade meets the haft
  const [cx0, cy0] = R(0, -len + 2);
  L.ellipse(cx0, cy0, 2.6, 2.6, STEEL, { bias: -0.1 });
  L.outline("k");
  // a glinting edge
  for (let i = 3; i < 12; i++) {
    const [x, y] = outer[i];
    if (i % 3 === 0) L.set(x, y + 1, "w");
  }
  return L;
}

/** A floating table row: a little glowing bar split into cells. */
function row(L, x, y, faded) {
  const c = faded ? "a" : "g";
  for (let i = 0; i < 11; i++) {
    L.set(x + i, y - 1, "k");
    L.set(x + i, y + 3, "k");
    for (let j = 0; j < 3; j++) L.set(x + i, y + j, i % 4 === 0 ? "k" : j === 0 && !faded ? "h" : c);
  }
  L.set(x - 1, y, "k")
    .set(x - 1, y + 1, "k")
    .set(x - 1, y + 2, "k");
  L.set(x + 11, y, "k")
    .set(x + 11, y + 1, "k")
    .set(x + 11, y + 2, "k");
}

/**
 * pose.bob: float height; pose.sway: hem offset; pose.scythe: haft angle; pose.reach: right hand
 * x offset; pose.face: "normal" | "angry" | "hurt" | "faint"; pose.souls: orbit phase (null = none);
 * pose.lean: x offset of the hood.
 */
function frame({ bob = 0, sway = 0, scythe: sAng = 0, reach = 0, face = "normal", souls = 0, lean = 0 }) {
  const out = new Layer(W, H);
  const cx = 44 + lean;
  const cy = 34 + bob;

  // harvested rows orbiting behind
  if (souls !== null)
    for (let i = 0; i < 3; i++) {
      const a = souls + i * 2.1;
      const z = Math.sin(a);
      if (z > 0) continue;
      row(out, Math.round(cx - 5 + Math.cos(a) * 34), Math.round(cy + 26 + i * 6 + z * 4), true);
    }

  // robe: hooded bell that ends in tattered points
  const robe = new Layer(W, H);
  const left = [];
  const right = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const y = cy + 6 + t * 50;
    const half = 13 + 15 * t ** 0.9;
    const off = sway * t * t;
    left.push([cx - half + off, y]);
    right.push([cx + half + off, y]);
  }
  const hem = [];
  const [hl] = left[10];
  const [hr, hy] = right[10];
  for (let i = 0; i <= 8; i++) {
    const x = hr - ((hr - hl) * i) / 8;
    hem.push([x, hy + (i % 2 === 0 ? 4 + ((i * 7 + Math.round(sway)) % 5) : -3)]);
  }
  robe.poly([...left, ...[...hem].reverse(), ...[...right].reverse()], ROBE, (x, y) => 0.85 - (y - cy) / 110 - (x - cx) / 40);
  // hood
  robe.ellipse(cx, cy, 15, 16, ROBE, { bias: 0.08 });
  robe.poly(
    [
      [cx - 6, cy - 14],
      [cx + 4, cy - 26],
      [cx + 8, cy - 12],
    ],
    ROBE,
    () => 0.7,
  );
  robe.outline("k");
  // robe folds
  for (const fx of [-9, -2, 6]) robe.line(cx + fx, cy + 20, cx + fx * 1.6 + sway * 0.5, cy + 52, "m");
  out.draw(robe);

  // hood opening and skull
  const hole = new Layer(W, H);
  hole.ellipse(cx + 1, cy + 2, 10, 11, ["v"]);
  out.draw(hole);
  const skull = new Layer(W, H);
  const sx = cx + 1;
  const sy = cy + 2;
  skull.ellipse(sx, sy, 7.5, 7, BONE, { bias: face === "faint" ? -0.25 : 0 });
  skull.poly(
    [
      [sx - 4, sy + 4],
      [sx + 4, sy + 4],
      [sx + 3, sy + 9],
      [sx - 3, sy + 9],
    ],
    BONE,
    () => 0.55,
  );
  // jaw and teeth
  for (let i = -2; i <= 2; i++) skull.set(sx + i, sy + 6, i % 2 === 0 ? "k" : "c");
  skull.line(sx - 3, sy + 9, sx + 3, sy + 9, "a");
  // eye sockets
  for (const s of [-1, 1]) {
    const ex = sx + s * 3;
    const ey = sy;
    skull.ellipse(ex, ey, 2.2, 2.4, ["k"]);
    if (face === "hurt") {
      skull
        .set(ex - 1, ey - 1, "r")
        .set(ex + 1, ey + 1, "r")
        .set(ex + 1, ey - 1, "r")
        .set(ex - 1, ey + 1, "r");
    } else if (face !== "faint") {
      const glow = face === "angry" ? "r" : "g";
      skull.set(ex, ey, glow).set(ex, ey + 1, glow);
      skull.set(ex - s, ey, face === "angry" ? "r" : "h");
    }
  }
  // nose
  skull.set(sx, sy + 3, "a").set(sx - 1, sy + 3, "k");
  out.draw(skull);

  // left sleeve with a bony hand beckoning
  const arms = new Layer(W, H);
  arms.poly(
    [
      [cx - 10, cy + 12],
      [cx - 25, cy + 30],
      [cx - 22, cy + 36],
      [cx - 6, cy + 24],
    ],
    ROBE,
    () => 0.6,
  );
  // right sleeve towards the scythe hand
  const hx = cx + 24 + reach;
  const hyy = cy + 34;
  arms.poly(
    [
      [cx + 9, cy + 12],
      [hx - 2, hyy - 5],
      [hx - 2, hyy + 3],
      [cx + 6, cy + 26],
    ],
    ROBE,
    () => 0.45,
  );
  arms.outline("k");
  // finger bones on the left hand
  for (let i = 0; i < 3; i++) arms.line(cx - 24 + i * 2, cy + 36, cx - 26 + i * 2, cy + 40, "b");
  out.draw(arms);

  // scythe in front, gripped by the right hand
  out.draw(scythe(hx, hyy, sAng));
  const grip = new Layer(W, H);
  grip.ellipse(hx, hyy, 3, 3, BONE);
  grip.outline("k");
  out.draw(grip);

  // rows orbiting in front
  if (souls !== null)
    for (let i = 0; i < 3; i++) {
      const a = souls + i * 2.1;
      const z = Math.sin(a);
      if (z <= 0) continue;
      row(out, Math.round(cx - 5 + Math.cos(a) * 34), Math.round(cy + 26 + i * 6 + z * 4), false);
    }
  return out;
}

const hurt = frame({
  bob: 3,
  sway: 6,
  scythe: 0.25,
  reach: -2,
  face: "hurt",
  souls: 1.0,
  lean: 3,
});
const down = frame({
  bob: 10,
  sway: 2,
  scythe: 0.5,
  reach: -3,
  face: "faint",
  souls: null,
});
emit(new URL("../../game/sprites/creatures/rowreaper.ts", import.meta.url), {
  id: "rowreaper",
  name: "ROWREAPER",
  script: "rowreaper",
  w: W,
  h: H,
  palette,
  comment: "Chapter 5 boss: a hooded skull reaper with a scythe, harvesting table rows. Front view, 96×96.",
  fps: { idle: 5, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ bob: 0, sway: -2, souls: 0 }), frame({ bob: -1, sway: 0, souls: 0.5 }), frame({ bob: -2, sway: 2, souls: 1.0 }), frame({ bob: -1, sway: 0, souls: 1.5 })],
    attack: [
      frame({
        bob: -2,
        sway: -3,
        scythe: 0.3,
        reach: 3,
        face: "angry",
        souls: 2,
      }),
      frame({
        bob: -3,
        sway: -4,
        scythe: 0.42,
        reach: 3,
        face: "angry",
        souls: 2.4,
        lean: 2,
      }),
      frame({
        bob: 1,
        sway: 5,
        scythe: -1.25,
        reach: -4,
        face: "angry",
        souls: 2.8,
        lean: -3,
      }),
    ],
    hurt: [
      hurt,
      frame({
        bob: 1,
        sway: 3,
        scythe: 0.1,
        face: "hurt",
        souls: 1.2,
        lean: 1,
      }),
    ],
    faint: [down, dissolve(down, 0.3, 3), dissolve(down, 0.6, 6), dissolve(down, 0.85, 9)],
  },
});

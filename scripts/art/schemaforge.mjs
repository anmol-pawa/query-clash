// SCHEMAFORGE, boss of chapter 7 (Smith of Structures): a hulking forge
// giant of cracked stone with lava in its seams, a beard of flame and a huge
// smithing hammer. Its leather apron glows with the table schema it is
// forging (two tables joined by a key).
// Run: node scripts/art/schemaforge.mjs
import { Layer, emit, dissolve } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#120a08", // outline
  a: "#2e2422", // stone ramp, dark → light
  b: "#4f403a",
  c: "#7a6558",
  d: "#a8927e",
  i: "#2a2d36", // iron ramp, dark → light
  j: "#555b6a",
  l: "#9aa2b4",
  r: "#9c1d0e", // fire ramp, dark → light
  o: "#e8590f",
  y: "#ffb52e",
  w: "#fff3b8",
  e: "#3d2414", // leather ramp, dark → light
  f: "#6b4123",
  g: "#94612f",
  u: "#58e6ff", // schema glow
  n: "#1d6f8c",
  x: "#ffffff", // hurt eyes
};
const STONE = ["a", "b", "c", "d"];
const IRON = ["i", "j", "l"];
const FIRE = ["r", "o", "y", "w"];
const LEATHER = ["e", "f", "g"];

const rot = (x, y, ox, oy, a) => [ox + (x - ox) * Math.cos(a) - (y - oy) * Math.sin(a), oy + (x - ox) * Math.sin(a) + (y - oy) * Math.cos(a)];

/** A jagged lava seam: a zig-zag line with a bright core. */
function seam(L, pts, hot) {
  for (let i = 1; i < pts.length; i++) {
    L.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], hot ? "y" : "o");
    L.set(pts[i][0], pts[i][1], "r");
  }
}

/** The smithing hammer, gripped at (hx, hy) and tilted by `ang` (0 = head up). */
function hammer(hx, hy, ang) {
  const L = new Layer(W, H);
  const R = (x, y) => rot(hx + x, hy + y, hx, hy, ang);
  L.poly([R(-2, 10), R(2, 10), R(2, -26), R(-2, -26)], LEATHER, (x, y) => {
    const [lx] = rot(x, y, hx, hy, -ang);
    return lx < hx ? 0.9 : 0.35;
  });
  L.poly([R(-10, -24), R(10, -24), R(10, -37), R(-10, -37)], IRON, (x, y) => {
    const [lx, ly] = rot(x, y, hx, hy, -ang);
    return 0.85 - (lx - hx + 10) / 28 - (ly - hy + 37) / 40;
  });
  L.outline("k");
  // glowing hot face on the striking end and iron bands
  for (let t = -36; t <= -25; t++) {
    const [x, y] = R(9, t);
    L.set(x, y, t % 3 ? "o" : "y");
  }
  for (const bx of [-5, 5]) {
    const [x0, y0] = R(bx, -36);
    const [x1, y1] = R(bx, -25);
    L.line(x0, y0, x1, y1, "i");
  }
  return L;
}

/**
 * pose.bob: body height; pose.flame: beard flicker phase; pose.hammer: angle; pose.hand: [dx, dy];
 * pose.fist: [dx, dy] left fist offset; pose.face: "normal" | "angry" | "hurt" | "faint";
 * pose.heat: 0 … 1 lava glow; pose.sparks: draw impact sparks; pose.lean: upper-body x offset.
 */
function frame({ bob = 0, flame = 0, hammer: hAng = -0.05, hand = [0, 0], fist = [0, 0], face = "normal", heat = 0.5, sparks = false, lean = 0 }) {
  const out = new Layer(W, H);
  const cx = 46 + lean;
  const cy = bob;
  const hot = heat > 0.6;

  // stumpy legs (planted)
  const legs = new Layer(W, H);
  for (const s of [-1, 1]) {
    legs.ellipse(46 + s * 13, 78, 10, 10, STONE, { bias: s > 0 ? -0.1 : 0 });
    legs.poly(
      [
        [46 + s * 4, 86],
        [46 + s * 23, 86],
        [46 + s * 25, 94],
        [46 + s * 2, 94],
      ],
      IRON,
      () => (s > 0 ? 0.3 : 0.6),
    );
  }
  legs.outline("k");
  out.draw(legs);

  // massive torso
  const body = new Layer(W, H);
  body.ellipse(cx, cy + 50, 27, 25, STONE, { bias: 0.04 });
  body.outline("k");
  seam(
    body,
    [
      [cx - 22, cy + 42],
      [cx - 17, cy + 46],
      [cx - 19, cy + 52],
      [cx - 14, cy + 57],
    ],
    hot,
  );
  seam(
    body,
    [
      [cx + 20, cy + 38],
      [cx + 16, cy + 44],
      [cx + 21, cy + 48],
    ],
    hot,
  );
  out.draw(body);

  // leather apron with the glowing schema: two tables linked by a key
  const apron = new Layer(W, H);
  apron.poly(
    [
      [cx - 14, cy + 46],
      [cx + 14, cy + 46],
      [cx + 17, cy + 76],
      [cx - 17, cy + 76],
    ],
    LEATHER,
    (x, y) => 0.75 - (x - cx) / 40 - (y - cy - 46) / 80,
  );
  apron.outline("k");
  const sc = heat > 0.85 ? "w" : "u";
  for (const [tx, ty] of [
    [cx - 11, cy + 51],
    [cx + 2, cy + 60],
  ]) {
    for (let x = tx; x <= tx + 9; x++) {
      apron.set(x, ty, sc);
      apron.set(x, ty + 9, "u");
      apron.set(x, ty + 3, "n");
    }
    for (let y = ty; y <= ty + 9; y++) {
      apron.set(tx, y, "u");
      apron.set(tx + 9, y, "u");
    }
    apron
      .set(tx + 2, ty + 5, "n")
      .set(tx + 3, ty + 5, "n")
      .set(tx + 2, ty + 7, "n")
      .set(tx + 3, ty + 7, "n");
  }
  apron.line(cx - 1, cy + 56, cx + 2, cy + 63, sc);
  out.draw(apron);

  // boulder shoulders
  const sh = new Layer(W, H);
  for (const s of [-1, 1])
    sh.ellipse(cx + s * 23, cy + 32, 12, 10, STONE, {
      bias: s > 0 ? -0.05 : 0.1,
    });
  sh.outline("k");
  seam(
    sh,
    [
      [cx - 28, cy + 30],
      [cx - 24, cy + 33],
      [cx - 26, cy + 37],
    ],
    hot,
  );
  out.draw(sh);

  // head sunk between the shoulders, with a horned iron helm
  const head = new Layer(W, H);
  const hx = cx;
  const hy = cy + 26;
  for (const s of [-1, 1])
    head.poly(
      [
        [hx + s * 7, hy - 6],
        [hx + s * 13, hy - 2],
        [hx + s * 20, hy - 14],
        [hx + s * 18, hy - 17],
      ],
      ["d", "w"],
      () => 0.3,
    );
  head.ellipse(hx, hy, 11, 10, STONE, { bias: 0.1 });
  head.poly(
    [
      [hx - 12, hy - 1],
      [hx - 10, hy - 9],
      [hx + 10, hy - 9],
      [hx + 12, hy - 1],
    ],
    IRON,
    (x) => 0.8 - (x - hx) / 24,
  );
  head.outline("k");
  head.line(hx - 11, hy - 1, hx + 11, hy - 1, "i");
  // eyes under the brow
  for (const s of [-1, 1]) {
    const ex = hx + s * 4;
    const ey = hy + 2;
    if (face === "hurt") head.line(ex - 2, ey - 1, ex + 2, ey + 1, "x").line(ex - 2, ey + 1, ex + 2, ey - 1, "x");
    else if (face === "faint") head.line(ex - 2, ey, ex + 2, ey, "a");
    else {
      head.line(ex - 2, ey, ex + 2, ey, face === "angry" ? "w" : "y");
      head.set(ex - s * 2, ey - 1, "k");
    }
  }
  out.draw(head);

  // beard of flame, flickering
  const beard = new Layer(W, H);
  if (face !== "faint") {
    const tips = 5;
    const pts = [[hx - 9, hy + 5]];
    for (let i = 0; i <= tips * 2; i++) {
      const t = i / (tips * 2);
      const x = hx - 9 + t * 18;
      const len = i % 2 === 0 ? 9 + Math.sin(flame * 2 + i) * 3 + (1 - Math.abs(t - 0.5) * 2) * 5 : 4;
      pts.push([x, hy + 5 + len]);
    }
    pts.push([hx + 9, hy + 5]);
    beard.poly(pts, FIRE, (x, y) => 1.05 - (y - hy - 5) / 14 - Math.abs(x - hx) / 30 + (hot ? 0.15 : 0));
    beard.outline("r");
  } else {
    for (let i = -6; i <= 6; i += 3) beard.set(hx + i, hy + 8, "a");
  }
  // mouth glow in the beard
  if (face === "angry") beard.line(hx - 3, hy + 7, hx + 3, hy + 7, "w");
  out.draw(beard);

  // left arm and fist
  const lfx = cx - 30 + fist[0];
  const lfy = cy + 58 + fist[1];
  const la = new Layer(W, H);
  la.poly(
    [
      [cx - 30, cy + 34],
      [cx - 20, cy + 38],
      [lfx + 6, lfy - 4],
      [lfx - 6, lfy - 4],
    ],
    STONE,
    () => 0.62,
  );
  la.ellipse(lfx, lfy, 8, 7, STONE, { bias: 0.08 });
  la.outline("k");
  for (let i = -1; i <= 1; i++) la.line(lfx + i * 3, lfy + 2, lfx + i * 3, lfy + 5, "b");
  out.draw(la);

  // right arm with the hammer
  const rhx = cx + 30 + hand[0];
  const rhy = cy + 54 + hand[1];
  const ra = new Layer(W, H);
  ra.poly(
    [
      [cx + 20, cy + 36],
      [cx + 31, cy + 33],
      [rhx + 6, rhy - 2],
      [rhx - 6, rhy],
    ],
    STONE,
    () => 0.35,
  );
  ra.ellipse(rhx, rhy, 7, 6, STONE, { bias: -0.05 });
  ra.outline("k");
  const hm = hammer(rhx, rhy, hAng);
  if (hAng < -1.5) {
    // slam: the hammer comes down in front of the body
    out.draw(ra);
    out.draw(hm);
  } else {
    out.draw(hm);
    out.draw(ra);
  }

  // impact sparks
  if (sparks) {
    const [ix, iy] = rot(rhx, rhy - 37, rhx, rhy, hAng);
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i / 8) * Math.PI;
      const r0 = 4;
      const r1 = 9 + (i % 3) * 3;
      out.line(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0 * 0.6, ix + Math.cos(a) * r1, iy + Math.sin(a) * r1 * 0.6, i % 2 ? "y" : "w");
    }
  }
  return out;
}

const hurt = frame({
  bob: 2,
  flame: 1,
  hammer: 0.45,
  hand: [2, 3],
  fist: [-2, 2],
  face: "hurt",
  heat: 0.3,
  lean: 2,
});
const down = frame({
  bob: 6,
  hammer: 1.2,
  hand: [2, 6],
  fist: [0, 6],
  face: "faint",
  heat: 0,
});
emit(new URL("../../game/sprites/creatures/schemaforge.ts", import.meta.url), {
  id: "schemaforge",
  name: "SCHEMAFORGE",
  script: "schemaforge",
  w: W,
  h: H,
  palette,
  comment: "Chapter 7 boss: a stone forge giant with a flame beard, a smithing hammer and a schema glowing on its apron. Front view, 96×96.",
  fps: { idle: 5, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ flame: 0, heat: 0.4 }), frame({ flame: 1, heat: 0.6, bob: -1 }), frame({ flame: 2, heat: 0.9, bob: -1 }), frame({ flame: 3, heat: 0.6 })],
    attack: [
      frame({
        flame: 4,
        hammer: -0.5,
        hand: [-6, -8],
        fist: [2, -4],
        face: "angry",
        heat: 0.8,
        bob: -1,
        lean: 1,
      }),
      frame({
        flame: 5,
        hammer: -1.1,
        hand: [-10, -20],
        fist: [3, -6],
        face: "angry",
        heat: 1,
        bob: -2,
        lean: 2,
      }),
      frame({
        flame: 6,
        hammer: -2.6,
        hand: [-16, 2],
        fist: [2, 4],
        face: "angry",
        heat: 1,
        sparks: true,
        bob: 2,
        lean: -1,
      }),
    ],
    hurt: [
      hurt,
      frame({
        bob: 1,
        flame: 2,
        hammer: 0.1,
        hand: [0, 1],
        fist: [-1, 1],
        face: "hurt",
        heat: 0.4,
        lean: 1,
      }),
    ],
    faint: [down, dissolve(down, 0.3, 3), dissolve(down, 0.6, 6), dissolve(down, 0.85, 9)],
  },
});

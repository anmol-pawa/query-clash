// ARBORIX, boss of chapter 11 (indexing): a mossy bark golem that carries a
// B+ tree for a crown. The root node sits on top, branch nodes below it and a
// row of leaf nodes chained side to side. Its keys glow as it scans, and the
// whole crown flares when it attacks.
// Run: node scripts/art/arborix.mjs
import { Layer, emit, dissolve } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#140f12", // outline
  a: "#3b2418", // bark ramp, dark → light
  b: "#5f3d26",
  c: "#8a5c38",
  d: "#b98650",
  m: "#1f4a2a", // moss ramp, dark → light
  n: "#3a7a38",
  p: "#7cc05a",
  o: "#7a4a14", // brass ramp, dark → light
  g: "#d49a2a",
  h: "#ffe08a",
  i: "#14424a", // key glow ramp, dim → bright
  j: "#2aa8b4",
  l: "#7ff6ee",
  y: "#ffe35c", // eyes
  e: "#ff9a2e",
  r: "#a3212e", // mouth
  w: "#ffffff",
};
const BARK = ["a", "b", "c", "d"];
const BRASS = ["o", "g", "h"];

/** A tree node: brass box with `cells` key slots. `lit` is how many slots glow (−1 = all), `dim` turns the glow off. */
function node(L, x, y, cells, lit, dim) {
  const w = cells * 5 + 1;
  const h = 9;
  const box = new Layer(W, H);
  box.poly(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    BRASS,
    (px, py) => 0.78 - (py - y) / 14 - (px - x) / (w * 3),
  );
  for (let c = 0; c < cells; c++) {
    const sx = x + 1 + c * 5;
    const on = !dim && (lit === -1 || c === lit);
    for (let yy = y + 2; yy <= y + h - 2; yy++) for (let xx = sx; xx < sx + 4; xx++) box.set(xx, yy, on ? (yy === y + 2 || xx === sx ? "j" : "l") : "i");
    if (on) box.set(sx + 1, y + 3, "w");
  }
  for (let c = 1; c < cells; c++) for (let yy = y; yy <= y + h; yy++) box.set(x + c * 5, yy, "k");
  box.outline("k");
  L.draw(box);
}

/**
 * pose.bob: body float/bounce; pose.crown: crown height offset; pose.scan: which leaf key is lit (idle);
 * pose.arms: −1 lowered … 1 raised; pose.flare: 1 = every key lit; pose.face: "normal" | "angry" | "hurt" | "faint";
 * pose.lean: x shift; pose.sag: how far the legs have buckled (faint).
 */
function frame({ bob = 0, crown = 0, scan = 0, arms = 0, flare = 0, face = "normal", lean = 0, sag = 0 }) {
  const out = new Layer(W, H);
  const cx = 48 + lean;
  const dim = face === "faint";
  const cy = crown + bob;

  // roots / legs
  for (const s of [-1, 1]) {
    const L = new Layer(W, H);
    const X = (x) => cx + s * x;
    const top = 72 + bob;
    const foot = 88 + sag;
    L.poly(
      [
        [X(3), top],
        [X(15), top],
        [X(16), foot - 4],
        [X(21), foot],
        [X(17), foot + 3],
        [X(11), foot + 1],
        [X(5), foot + 3],
        [X(2), foot - 3],
      ],
      BARK,
      (x, y) => 0.7 - (y - top) / 40 - (s > 0 ? 0.18 : 0) - Math.abs(x - cx) / 90,
    );
    L.clip((x, y) => {
      if (((x + y) & 3) === 0 && y > foot - 6) L.set(x, y, "m");
    });
    L.outline("k");
    out.draw(L);
  }

  // arms: bark branches reaching up to the crown's outer leaves
  for (const s of [-1, 1]) {
    const L = new Layer(W, H);
    const X = (x) => cx + s * x;
    const shoulderY = 48 + bob;
    const handX = 29 + arms * 3;
    const handY = 38 + cy - 3 - arms * 6 + (arms < 0 ? -arms * 20 : 0);
    const pts = [
      [X(12), shoulderY - 3],
      [X(handX - 1) , handY + 3],
      [X(handX + 4), handY - 1],
      [X(handX + 5), handY + 5],
      [X(handX + 1), handY + 9],
      [X(17), shoulderY + 9],
    ];
    L.poly(pts, BARK, (x, y) => 0.72 - (s > 0 ? 0.2 : 0) - (y - handY) / 50);
    // moss patch on the upper arm
    L.clip((x, y) => {
      if (Math.hypot(x - X(17), y - (shoulderY + 1)) < 3.6 && ((x + y) & 1) === 0) L.set(x, y, "n");
    });
    L.outline("k");
    out.draw(L);
  }

  // trunk body
  const body = new Layer(W, H);
  const top = 38 + bob;
  const bot = 78 + bob;
  const half = (y) => 14 + 4 * Math.sin(((y - top) / (bot - top)) * Math.PI * 0.85 + 0.2);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const y = top + ((bot - top) * i) / 8;
    pts.push([cx - half(y), y]);
  }
  for (let i = 8; i >= 0; i--) {
    const y = top + ((bot - top) * i) / 8;
    pts.push([cx + half(y), y]);
  }
  body.poly(pts, BARK, (x, y) => 0.8 - (x - cx) / 55 - (y - top) / 90 + Math.sin(x * 1.7) * 0.05);
  // bark grain
  body.clip((x, y) => {
    if ((x * 7 + Math.floor(y / 3) * 5) % 11 === 0 && y > top + 12) body.set(x, y, "a");
  });
  // moss cap across the top of the trunk
  body.clip((x, y) => {
    const edge = top + 5 + Math.sin(x * 0.9) * 2 + Math.cos(x * 0.4) * 1.5;
    if (y < edge) body.set(x, y, (x + y) % 5 === 0 ? "p" : (x * 3 + y) % 4 === 0 ? "m" : "n");
  });
  // brass plaque on the belly with an index-slot key
  const plaque = new Layer(W, H);
  plaque.poly(
    [
      [cx - 7, 62 + bob],
      [cx + 7, 62 + bob],
      [cx + 7, 71 + bob],
      [cx - 7, 71 + bob],
    ],
    BRASS,
    (x, y) => 0.8 - (y - 62 - bob) / 14,
  );
  for (let xx = cx - 5; xx <= cx + 5; xx++) plaque.set(xx, 66 + bob, dim ? "i" : xx % 3 === 0 ? "l" : "j");
  plaque.outline("k");
  body.draw(plaque);
  body.outline("k");
  out.draw(body);

  // face
  const ey = 46 + bob;
  if (face === "faint") {
    for (const s of [-1, 1]) {
      out.line(cx + s * 7 - 2, ey + 1, cx + s * 7 + 2, ey + 1, "k");
      out.line(cx + s * 7 - 2, ey + 2, cx + s * 7 + 2, ey + 2, "a");
    }
  } else if (face === "hurt") {
    for (const s of [-1, 1]) {
      out.line(cx + s * 7 - 2, ey - 1, cx + s * 7 + 2, ey + 3, "w");
      out.line(cx + s * 7 + 2, ey - 1, cx + s * 7 - 2, ey + 3, "w");
    }
  } else {
    for (const s of [-1, 1]) {
      const ex = cx + s * 7;
      for (let yy = ey - 1; yy <= ey + 2; yy++) for (let xx = ex - 2; xx <= ex + 2; xx++) out.set(xx, yy, "k");
      for (let yy = ey; yy <= ey + 1; yy++) for (let xx = ex - 1; xx <= ex + 1; xx++) out.set(xx, yy, yy === ey ? "y" : "e");
      if (face === "angry") {
        out.line(ex - 3 * s * -1 * -1, ey - 3 + (s < 0 ? 0 : 0), ex + 3 * s, ey - 1 + (s > 0 ? 0 : 0), "k");
      }
    }
    if (face === "angry") out.line(cx - 4, ey - 3, cx + 4, ey - 3, "a");
  }
  // mouth
  const my = 55 + bob;
  if (face === "angry") {
    for (let xx = cx - 6; xx <= cx + 6; xx++) for (let yy = my; yy <= my + 3; yy++) out.set(xx, yy, yy === my ? "k" : "r");
    for (let xx = cx - 5; xx <= cx + 5; xx += 2) out.set(xx, my + 1, "w");
    for (let xx = cx - 4; xx <= cx + 4; xx += 2) out.set(xx, my + 3, "w");
  } else if (face === "faint") {
    out.line(cx - 4, my + 1, cx + 4, my + 1, "k");
  } else {
    out.line(cx - 5, my, cx + 5, my, "k");
    out.line(cx - 4, my + 1, cx + 4, my + 1, "a");
    out.set(cx - 5, my - 1, "k");
    out.set(cx + 5, my - 1, "k");
  }

  // crown: a B+ tree, root → branches → chained leaves
  const crownL = new Layer(W, H);
  const rootY = 3 + cy;
  const midY = 15 + cy;
  const leafY = 27 + cy;
  const leaves = [20, 34, 48, 62].map((x) => x + lean);
  const mids = [cx - 21, cx + 9];
  const lines = new Layer(W, H);
  lines.line(cx, rootY + 10, mids[0] + 5, midY, "k");
  lines.line(cx, rootY + 10, mids[1] + 5, midY, "k");
  lines.line(mids[0] + 3, midY + 10, leaves[0] + 5, leafY, "k");
  lines.line(mids[0] + 8, midY + 10, leaves[1] + 5, leafY, "k");
  lines.line(mids[1] + 3, midY + 10, leaves[2] + 5, leafY, "k");
  lines.line(mids[1] + 8, midY + 10, leaves[3] + 5, leafY, "k");
  crownL.draw(lines);
  // sibling pointers between leaves
  for (let i = 0; i < 3; i++) {
    const a = leaves[i] + 11;
    const b = leaves[i + 1];
    for (let xx = a; xx <= b; xx++) crownL.set(xx, leafY + 4, "k");
    crownL.set(b - 1, leafY + 3, "k");
    crownL.set(b - 1, leafY + 5, "k");
  }
  const lit = flare > 0.5 ? -1 : scan;
  node(crownL, cx - 8, rootY, 3, flare > 0.5 ? -1 : scan === 1 ? 1 : -2, dim);
  mids.forEach((x, i) => node(crownL, x, midY, 2, flare > 0.5 ? -1 : scan === i + 2 ? 0 : -2, dim));
  leaves.forEach((x, i) => node(crownL, x, leafY, 2, lit === -1 ? -1 : scan === 4 + i ? i % 2 : -2, dim));
  // a few leaves of moss on the nodes
  for (const [x, y] of [
    [cx - 8, rootY - 1],
    [cx - 6, rootY - 2],
    [leaves[0], leafY - 1],
    [leaves[3] + 9, leafY - 1],
    [mids[1] + 8, midY - 1],
  ])
    for (const [dx, dy, c] of [[0, 0, "p"], [1, 0, "n"], [0, -1, "n"]]) crownL.set(x + dx, y + dy, c);
  out.draw(crownL);

  // flare sparkles
  if (flare > 0.5 && !dim)
    for (const [x, y] of [
      [cx - 14, rootY - 1],
      [cx + 14, rootY + 1],
      [10, leafY - 3],
      [86, leafY - 2],
    ]) {
      out.set(x, y, "w");
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) out.set(x + dx, y + dy, "l");
    }
  return out;
}

const down = frame({ bob: 5, crown: 8, face: "faint", arms: -1, sag: 3 });
emit(new URL("../../game/sprites/creatures/arborix.ts", import.meta.url), {
  id: "arborix",
  name: "ARBORIX",
  w: W,
  h: H,
  palette,
  comment: "Chapter 11 boss: a mossy bark golem crowned with a B+ tree whose keys glow as it scans. Front view, 96×96.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ bob: 0, crown: 0, scan: 0 }), frame({ bob: -1, crown: -1, scan: 1 }), frame({ bob: -1, crown: -1, scan: 2 }), frame({ bob: 0, crown: 0, scan: 5 })],
    attack: [frame({ bob: 1, crown: 1, arms: -0.2, face: "angry", scan: 4 }), frame({ bob: -2, crown: -3, arms: 1, face: "angry", flare: 1, lean: 2 }), frame({ bob: 0, crown: -1, arms: 0.4, face: "angry", flare: 1, lean: -1 })],
    hurt: [frame({ bob: 2, crown: 2, face: "hurt", lean: 3, arms: -0.4, scan: 7 }), frame({ bob: 1, crown: 1, face: "hurt", lean: 1, arms: -0.2, scan: 6 })],
    faint: [down, dissolve(down, 0.3, 2), dissolve(down, 0.6, 5), dissolve(down, 0.85, 8)],
  },
});

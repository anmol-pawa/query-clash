// OVEROWL, boss of chapter 13 (window functions): "The Over-Owl, Warden of
// Frames". A broad indigo owl whose belly is a ledger of ranked rows; a gold
// window frame (the OVER clause) slides down three of them each idle frame.
// Attack: wings spread, the frame flares and the eyes narrow.
// Run: ART_PREVIEW=/tmp/ow node scripts/art/overowl.mjs
import { Layer, emit, dissolve } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#0f0c1c", // outline
  a: "#1f1b45", // plumage ramp, dark → light
  b: "#38327a",
  c: "#5a52b0",
  d: "#8f87dc",
  s: "#6e4e2e", // belly ramp
  t: "#a8794a",
  u: "#d9aa72",
  v: "#f6dcae",
  g: "#8a5a12", // gold ramp (frame, talons)
  h: "#e0a82a",
  i: "#ffe27a",
  e: "#ff9a2e", // iris
  y: "#ffd23f",
  o: "#e8742a", // beak
  p: "#a8441c",
  w: "#ffffff",
  m: "#58e0ff", // frame glow
};
const FEATHER = ["a", "b", "c", "d"];
const BELLY = ["s", "t", "u", "v"];

function eye(L, x, y, face) {
  // facial disc ring
  const d = new Layer(W, H);
  d.ellipse(x, y, 9, 9, ["b", "c", "d", "d"], { bias: 0.08 });
  d.outline("k");
  L.draw(d);
  if (face === "hurt" || face === "faint") {
    const c = face === "hurt" ? "w" : "k";
    L.line(x - 4, y - 4, x + 4, y + 4, c);
    L.line(x + 4, y - 4, x - 4, y + 4, c);
    return;
  }
  const squint = face === "angry";
  for (let yy = -6; yy <= 6; yy++)
    for (let xx = -6; xx <= 6; xx++) {
      if (xx * xx + yy * yy > 38) continue;
      if (squint && yy < -1 - Math.abs(xx) * 0.0 && yy < -2) continue;
      L.set(x + xx, y + yy, "w");
    }
  for (let yy = -4; yy <= 4; yy++)
    for (let xx = -4; xx <= 4; xx++) if (xx * xx + yy * yy <= 17 && !(squint && yy < -2)) L.set(x + xx, y + yy, yy < 0 ? "y" : "e");
  for (let yy = -2; yy <= 2; yy++) for (let xx = -1; xx <= 1; xx++) if (!(squint && yy < -2)) L.set(x + xx, y + yy, "k");
  L.set(x - 2, y - 3, "w");
  if (squint) L.line(x - 7, y - 5, x + 7, y - 2 + (x < 48 ? 3 : -3) * 0, "k");
}

/**
 * pose.bob: body bounce; pose.win: which belly row the window frame starts at (0..3);
 * pose.spread: 0 folded wings … 1 fully spread; pose.face; pose.sag: faint sink; pose.flare: glow frame.
 */
function frame({ bob = 0, win = 0, spread = 0, face = "normal", lean = 0, sag = 0, flare = false }) {
  const out = new Layer(W, H);
  const cx = 48 + lean;
  const by = 56 + bob + sag;

  // perch ledge
  const ledge = new Layer(W, H);
  ledge.poly([[14, 88], [82, 88], [86, 94], [10, 94]], ["s", "t", "t", "u"], (x) => 0.3 + (x % 7) * 0.03);
  ledge.outline("k");
  out.draw(ledge);

  // wings (behind body)
  const wings = new Layer(W, H);
  for (const d of [-1, 1]) {
    const wx = cx + d * (24 + spread * 7);
    const wy = by - spread * 6;
    const reach = 22 + spread * 10;
    wings.ellipse(wx, wy + 2, 9 + spread * 4, reach, FEATHER, { bias: d < 0 ? 0 : -0.1 });
    if (spread > 0.4) {
      // splayed primary feathers
      for (let f = 0; f < 4; f++) {
        const fx = cx + d * (34 + f * 3);
        wings.poly([[wx, wy - 8 + f * 5], [fx + d * 2, by - 28 + f * 11], [fx - d * 3, by - 22 + f * 11 + 8]], FEATHER, () => 0.3 + f * 0.1);
      }
    } else {
      // folded feather scallops
      for (let f = 0; f < 5; f++) for (let k = -1; k <= 1; k++) wings.set(wx + k * 3, wy - 14 + f * 7 + Math.abs(k), "a");
    }
  }
  wings.outline("k");
  out.draw(wings);

  // body
  const body = new Layer(W, H);
  body.ellipse(cx, by, 25, 31, FEATHER, { bias: 0.02 });
  // belly ledger
  body.ellipse(cx, by + 6, 15, 22, BELLY, { bias: 0.0 });
  body.clip((x, y, c) => {
    if ("stuv".includes(c) && (y - (by - 14)) % 7 === 0) body.set(x, y, "s");
  });
  body.outline("k");
  out.draw(body);

  // window frame (OVER clause): three rows highlighted, sliding down with `win`
  const fy = by - 14 + win * 7 - 1;
  const fx0 = cx - 17;
  const fx1 = cx + 17;
  const f = new Layer(W, H);
  for (let x = fx0; x <= fx1; x++) {
    f.set(x, fy, "i");
    f.set(x, fy + 1, "h");
    f.set(x, fy + 21, "h");
    f.set(x, fy + 22, "g");
  }
  for (let y = fy; y <= fy + 22; y++) {
    for (const x of [fx0, fx1]) {
      f.set(x, y, "i");
      f.set(x + (x === fx0 ? 1 : -1), y, "h");
    }
  }
  // corner brackets
  for (const [bx, byy] of [[fx0, fy], [fx1, fy], [fx0, fy + 22], [fx1, fy + 22]]) {
    f.set(bx, byy, "w");
  }
  out.draw(f);
  if (flare) {
    for (let x = fx0 - 2; x <= fx1 + 2; x += 2) {
      out.set(x, fy - 2, "m");
      out.set(x, fy + 24, "m");
    }
    for (let y = fy; y <= fy + 22; y += 2) {
      out.set(fx0 - 2, y, "m");
      out.set(fx1 + 2, y, "m");
    }
  }

  // head
  const head = new Layer(W, H);
  const hy = 26 + bob + sag;
  head.ellipse(cx, hy, 23, 17, FEATHER, { bias: 0.08 });
  // ear tufts
  for (const d of [-1, 1]) head.poly([[cx + d * 14, hy - 10], [cx + d * 22, hy - 24], [cx + d * 22, hy - 4]], FEATHER, () => 0.35);
  head.outline("k");
  out.draw(head);
  eye(out, cx - 11, hy + 1, face);
  eye(out, cx + 11, hy + 1, face);
  // beak
  const beak = new Layer(W, H);
  beak.poly([[cx - 4, hy + 3], [cx + 4, hy + 3], [cx, hy + 13]], ["p", "o", "o"], (x) => 0.6 - Math.abs(x - cx) * 0.05);
  beak.outline("k");
  out.draw(beak);

  // talons on the ledge
  for (const d of [-1, 1]) {
    for (let t = 0; t < 3; t++) {
      const tx = cx + d * 13 + (t - 1) * 4;
      out.line(tx, 86, tx + (t - 1) * 1, 90, "k");
      out.set(tx, 87, "i");
      out.set(tx, 88, "h");
    }
  }
  if (flare && face !== "faint") {
    for (const [x, y] of [[8, 20], [88, 24], [14, 60], [84, 56]]) {
      out.set(x, y, "w");
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) out.set(x + dx, y + dy, "m");
    }
  }
  return out;
}

const down = frame({ bob: 4, sag: 8, face: "faint" });
emit(new URL("../../game/sprites/creatures/overowl.ts", import.meta.url), {
  id: "overowl",
  name: "OVEROWL",
  w: W,
  h: H,
  palette,
  comment: "Chapter 13 boss: the Over-Owl, whose gold window frame slides down its ledger belly. Front view, 96×96.",
  script: "overowl",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ win: 0 }), frame({ win: 1, bob: -1 }), frame({ win: 2, bob: -1 }), frame({ win: 1, bob: 0 })],
    attack: [frame({ face: "angry", spread: 0.4, bob: 1, win: 1, flare: true }), frame({ face: "angry", spread: 1, bob: -3, win: 2, flare: true }), frame({ face: "angry", spread: 0.7, bob: -1, win: 0, flare: true })],
    hurt: [frame({ face: "hurt", bob: 2, lean: 3, win: 1 }), frame({ face: "hurt", bob: 1, lean: 1, win: 1 })],
    faint: [down, dissolve(down, 0.3, 2), dissolve(down, 0.6, 5), dissolve(down, 0.85, 8)],
  },
});

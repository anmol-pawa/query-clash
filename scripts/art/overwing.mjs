// OVERWING, boss of chapter 13 (window functions): a stone-feathered owl whose
// belly is a ledger of rows. A gold window frame (the OVER() clause) slides
// down the rows in idle, and in the attack the wings spread and the frame
// flares open to show every row it covers.
// Run: node scripts/art/overwing.mjs
import { Layer, emit, dissolve } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#0e1220", // outline
  a: "#1d2a4a", // feather ramp, dark → light
  b: "#33497a",
  c: "#5876b0",
  d: "#93aedd",
  p: "#5a4a3a", // belly ramp, dark → light
  q: "#8a7258",
  r: "#c4a97c",
  s: "#efe0b8",
  y: "#ffd84a", // eyes / frame gold
  o: "#e8901c",
  g: "#a8691a", // frame shadow
  n: "#2fd0e8", // glass
  m: "#a6f2ff",
  w: "#ffffff",
  e: "#3a2412", // beak / talons
  f: "#f0a830",
};
const FEATHER = ["a", "b", "c", "d"];
const BELLY = ["p", "q", "r", "s"];

function wing(L, cx, by, d, spread, flap) {
  const w = new Layer(W, H);
  const out = 10 + spread * 14;
  const tipY = by + 6 + (1 - spread) * 14 - flap;
  const x0 = cx + d * 17;
  w.poly(
    [[x0, by - 18], [cx + d * (17 + out), by - 6 - spread * 12 - flap], [cx + d * (19 + out), tipY], [cx + d * (14 + out * 0.5), by + 26], [x0 - d * 2, by + 20]],
    FEATHER,
    (x, y) => 0.25 + 0.5 * ((d < 0 ? x : W - x) / W) + ((y * 3 + x) % 9 === 0 ? 0.18 : 0),
  );
  // feather bars
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    w.line(x0 + d * 3, by - 8 + i * 6, cx + d * (14 + out * (0.55 + t * 0.4)), by + 2 + i * 6 + (1 - spread) * 4 - flap * 0.5, "b");
  }
  w.outline("k");
  L.draw(w);
}

function eye(L, x, y, face) {
  if (face === "hurt" || face === "faint") {
    const c = face === "hurt" ? "w" : "k";
    L.line(x - 3, y - 3, x + 3, y + 3, c);
    L.line(x + 3, y - 3, x - 3, y + 3, c);
    return;
  }
  L.ellipse(x, y, 5, 5, ["o", "y", "y", "w"], { bias: 0.1 });
  const px = face === "angry" ? 0 : 0;
  for (let yy = -2; yy <= 2; yy++) for (let xx = -1; xx <= 1; xx++) L.set(x + px + xx, y + yy + 0, "k");
  L.set(x - 1, y - 2, "w");
}

/**
 * bob: body bounce, win: which row the frame starts on (0..2), spread: wing spread 0..1, flap: wing tip lift,
 * face: normal | angry | hurt | faint, lean: x shift, sag: faint drop, flare: attack frame expansion.
 */
function frame({ bob = 0, win = 0, spread = 0.2, flap = 0, face = "normal", lean = 0, sag = 0, flare = 0 }) {
  const out = new Layer(W, H);
  const cx = 48 + lean;
  const by = 54 + bob + sag;

  // talons and perch shadow
  const feet = new Layer(W, H);
  for (const d of [-1, 1]) {
    const fx = cx + d * 9;
    feet.poly([[fx - 4, by + 26], [fx + 4, by + 26], [fx + 5, by + 32 - sag * 0], [fx - 5, by + 32]], "f");
    for (const t of [-3, 0, 3]) feet.line(fx + t, by + 32, fx + t + (t === 0 ? 0 : t > 0 ? 2 : -2), by + 35, "e");
  }
  feet.outline("k");
  out.draw(feet);

  wing(out, cx, by, -1, spread, flap);
  wing(out, cx, by, 1, spread, flap);

  // body
  const body = new Layer(W, H);
  body.ellipse(cx, by + 2, 23, 27, FEATHER, { bias: 0.02 });
  body.clip((x, y) => {
    if (y > by - 6 && (x * 2 + y) % 8 === 0) body.set(x, y, "b");
    if (y < by - 2 && (x + y * 2) % 11 === 0) body.set(x, y, "d");
  });
  body.outline("k");
  out.draw(body);

  // belly ledger: five rows
  const rowH = 7;
  const top = by - 6;
  const belly = new Layer(W, H);
  belly.ellipse(cx, by + 8, 15, 21, BELLY, { bias: 0.02 });
  for (let i = 1; i < 5; i++) belly.line(cx - 15, top + i * rowH - 1, cx + 15, top + i * rowH - 1, "p");
  belly.clip((x, y) => {
    if (belly.get(x, y) === "." || (x + y) % 5 !== 0) return;
    belly.set(x, y, "q");
  });
  belly.outline("k");
  out.draw(belly);

  // the window frame sliding over the rows
  const rows = 2 + (flare > 0 ? 1 : 0);
  const fy = top + win * rowH - 2 - flare * 2;
  const fx0 = cx - 16 - flare * 2;
  const fx1 = cx + 16 + flare * 2;
  const fh = rows * rowH + 3 + flare * 4;
  for (let y = fy; y < fy + fh; y++)
    for (let x = fx0; x <= fx1; x++) {
      if (out.get(x, y) === ".") continue;
      const edge = y === fy || y === fy + fh - 1 || x === fx0 || x === fx1;
      if (edge) out.set(x, y, y === fy || x === fx0 ? "y" : "g");
      else out.set(x, y, (x + y) % 4 === 0 ? "m" : out.get(x, y) === "." ? "n" : (x * 3 + y) % 7 === 0 ? "m" : "n");
    }
  // corner studs
  for (const [x, y] of [[fx0, fy], [fx1, fy], [fx0, fy + fh - 1], [fx1, fy + fh - 1]]) out.set(x, y, "w");
  // keep row lines visible through the glass
  for (let i = 1; i < 5; i++) {
    const ly = top + i * rowH - 1;
    if (ly > fy && ly < fy + fh - 1) for (let x = fx0 + 1; x < fx1; x++) if (out.get(x, ly) !== ".") out.set(x, ly, "c");
  }

  // head
  const hy = by - 33 + (face === "faint" ? 4 : 0);
  const head = new Layer(W, H);
  for (const d of [-1, 1]) head.poly([[cx + d * 6, hy - 10], [cx + d * 17, hy - 20 + (face === "angry" ? 4 : 0)], [cx + d * 15, hy - 3]], FEATHER, () => 0.35);
  head.ellipse(cx, hy, 19, 15, FEATHER, { bias: 0.08 });
  // facial discs
  for (const d of [-1, 1]) head.ellipse(cx + d * 9, hy + 1, 8, 8, BELLY, { bias: 0.1 });
  head.outline("k");
  out.draw(head);
  eye(out, cx - 9, hy + 1, face);
  eye(out, cx + 9, hy + 1, face);
  if (face === "angry") for (const d of [-1, 1]) out.line(cx + d * 3, hy - 6, cx + d * 14, hy - 2 + 1, "k");
  // beak
  const beak = new Layer(W, H);
  beak.poly([[cx - 3, hy + 5], [cx + 3, hy + 5], [cx, hy + 12 + (face === "angry" ? 1 : 0)]], ["e", "o", "f"], (x, y) => (y - hy) / 14);
  beak.outline("k");
  out.draw(beak);

  // sparkle off the frame on the attack
  if (flare > 0 && face !== "faint")
    for (const [x, y] of [[fx0 - 4, fy - 3], [fx1 + 4, fy + fh + 2], [cx, fy - 6]]) {
      out.set(x, y, "w");
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) out.set(x + dx, y + dy, "m");
    }
  return out;
}

const down = frame({ bob: 2, face: "faint", sag: 6, spread: 0, win: 1 });
emit(new URL("../../game/sprites/creatures/overwing.ts", import.meta.url), {
  id: "overwing",
  name: "OVERWING",
  w: W,
  h: H,
  palette,
  comment: "Chapter 13 boss: the window-function owl, a ledger belly with a sliding gold frame. Front view, 96×96.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ win: 0 }), frame({ bob: -1, win: 1, flap: 1 }), frame({ bob: -1, win: 2, flap: 1 }), frame({ bob: 0, win: 1 })],
    attack: [frame({ bob: 1, face: "angry", win: 1, spread: 0.5 }), frame({ bob: -3, face: "angry", win: 0, spread: 1, flare: 1, flap: 3 }), frame({ bob: 0, face: "angry", win: 1, spread: 0.7, flare: 1, lean: 1 })],
    hurt: [frame({ bob: 2, face: "hurt", lean: 3, win: 1 }), frame({ bob: 1, face: "hurt", lean: 1, win: 1 })],
    faint: [down, dissolve(down, 0.3, 2), dissolve(down, 0.6, 5), dissolve(down, 0.85, 8)],
  },
});

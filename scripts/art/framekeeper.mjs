// FRAMEKEEPER, boss of chapter 13 (window functions): a stone window-golem whose
// glass pane shows rows of data. A glowing frame bracket slides up and down the
// rows (the window frame); on attack the bracket flares outward and the fists rise.
// Run: node scripts/art/framekeeper.mjs
import { Layer, emit, dissolve } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#0f1219", // outline
  a: "#272c3a", // stone ramp, dark → light
  b: "#454d63",
  c: "#6e7893",
  d: "#a3adc6",
  g: "#0d3a46", // glass ramp, dark → light
  h: "#14677a",
  i: "#2aa0b0",
  j: "#7de3e0",
  y: "#ffd84a", // data bars / frame glow
  o: "#ff9a2e",
  e: "#fff3a8", // eyes
  r: "#e24a4a",
  w: "#ffffff",
};
const STONE = ["a", "b", "c", "d"];
const GLASS = ["g", "h", "i", "j"];

/** pose: bob (body y), row (0-4 row the frame sits on), flare (0-1 frame expansion), arms (0 down … 1 raised), face, lean, sag */
function frame({ bob = 0, row = 1, flare = 0, arms = 0, face = "normal", lean = 0, sag = 0 }) {
  const out = new Layer(W, H);
  const cx = 48 + lean;
  const top = 26 + bob + sag;

  // pillars (legs)
  for (const d of [-1, 1]) {
    const l = new Layer(W, H);
    l.ellipse(cx + d * 14, 86 + sag * 0.3, 9, 8, STONE, { bias: d < 0 ? 0.05 : -0.05 });
    l.poly([[cx + d * 14 - 8, 76 + bob], [cx + d * 14 + 8, 76 + bob], [cx + d * 14 + 9, 88], [cx + d * 14 - 9, 88]], STONE, (x) => (d < 0 ? 0.62 : 0.4) - Math.abs(x - (cx + d * 14)) * 0.01);
    l.outline("k");
    out.draw(l);
  }

  // arms: stone blocks hanging at the sides, raised when attacking
  for (const d of [-1, 1]) {
    const ay = 56 + bob + sag * 0.7 - arms * 22;
    const ax = cx + d * (34 + arms * 2);
    const l = new Layer(W, H);
    // shoulder link to the body
    l.poly([[cx + d * 24, top + 22], [ax - d * 3, ay - 4], [ax - d * 3, ay + 6], [cx + d * 24, top + 32]], STONE, () => 0.35);
    l.ellipse(ax, ay + 2, 8, 9, STONE, { bias: d < 0 ? 0.05 : -0.08 });
    // knuckle notches
    for (const kx of [-3, 0, 3]) l.set(ax + kx, ay + 8, "a");
    l.outline("k");
    out.draw(l);
  }

  // body: arched window frame
  const body = new Layer(W, H);
  body.poly([[cx - 27, top + 20], [cx - 27, 80 + bob], [cx + 27, 80 + bob], [cx + 27, top + 20]], STONE, (x, y) => 0.55 - (x - cx) * 0.012 - (y - top) * 0.004);
  body.ellipse(cx, top + 20, 27, 20, STONE, { bias: 0.05 });
  // chiselled seams
  body.clip((x, y) => {
    if ((x + y * 3) % 11 === 0 && y > top + 6) body.set(x, y, "a");
    if ((x * 3 + y) % 13 === 0 && y < top + 30) body.set(x, y, "c");
  });
  body.outline("k");
  out.draw(body);

  // keystone with a ring on top of the arch
  const ks = new Layer(W, H);
  ks.poly([[cx - 5, top - 1], [cx + 5, top - 1], [cx + 3, top + 7], [cx - 3, top + 7]], STONE, () => 0.8);
  ks.outline("k");
  out.draw(ks);

  // glass pane
  const px0 = cx - 21;
  const px1 = cx + 21;
  const py0 = top + 17;
  const py1 = 74 + bob;
  const pane = new Layer(W, H);
  pane.poly([[px0, py0 + 3], [px0 + 3, py0], [px1 - 3, py0], [px1, py0 + 3], [px1, py1], [px0, py1]], GLASS, (x, y) => 0.25 + (y - py0) * 0.006 + (x - px0) * 0.004);
  pane.outline("k");
  out.draw(pane);

  // data rows: five bars of different lengths, evenly spaced in the pane
  const rows = 5;
  const rh = Math.floor((py1 - py0 - 6) / rows);
  const lens = [34, 24, 38, 28, 20];
  for (let r = 0; r < rows; r++) {
    const y = py0 + 4 + r * rh;
    const on = r === row;
    for (let yy = 0; yy < rh - 2; yy++) for (let xx = 0; xx < lens[r]; xx++) out.set(px0 + 4 + xx, y + yy, yy === 0 ? "e" : on ? "y" : r % 2 ? "i" : "j");
    // little cell ticks
    for (let xx = 8; xx < lens[r]; xx += 8) for (let yy = 0; yy < rh - 2; yy++) out.set(px0 + 4 + xx, y + yy, "g");
  }

  // the sliding frame bracket, 1 row tall (3 when flared)
  if (face !== "faint") {
    const fy = py0 + 2 + row * rh;
    const grow = Math.round(flare * 4);
    const fx0 = px0 + 1 - grow;
    const fx1 = px1 - 1 + grow;
    const fy0 = fy - grow;
    const fy1 = fy + rh + grow;
    const col = flare > 0.5 ? "w" : "o";
    for (let x = fx0; x <= fx1; x++) {
      out.set(x, fy0, col);
      out.set(x, fy1, col);
    }
    for (let y = fy0; y <= fy1; y++) {
      out.set(fx0, y, col);
      out.set(fx1, y, col);
    }
    // corner studs
    for (const [x, y] of [[fx0, fy0], [fx1, fy0], [fx0, fy1], [fx1, fy1]]) {
      out.set(x, y, "y");
      out.set(x + (x === fx0 ? -1 : 1), y, "y");
    }
  }

  // eyes in the arch, above the pane
  const ey = top + 12;
  for (const d of [-1, 1]) {
    const ex = cx + d * 8;
    if (face === "hurt") {
      out.line(ex - 2, ey - 2, ex + 2, ey + 2, "w");
      out.line(ex + 2, ey - 2, ex - 2, ey + 2, "w");
    } else if (face === "faint") {
      out.line(ex - 2, ey, ex + 2, ey, "k");
    } else {
      for (let yy = -1; yy <= 1; yy++) for (let xx = -3; xx <= 3; xx++) out.set(ex + xx, ey + yy, yy < 0 ? "e" : "y");
      out.set(ex, ey + 1, "k");
      if (face === "angry") out.line(ex - d * 4, ey - 4, ex + d * 3, ey - 2, "k");
    }
  }
  if (face === "angry") for (const [x, y] of [[cx - 38, 30], [cx + 38, 30], [cx, 14]]) {
    out.set(x, y, "w");
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) out.set(x + dx, y + dy, "y");
  }
  return out;
}

const down = frame({ bob: 2, face: "faint", sag: 14, row: 4 });
emit(new URL("../../game/sprites/creatures/framekeeper.ts", import.meta.url), {
  id: "framekeeper",
  name: "FRAMEKEEPER",
  w: W,
  h: H,
  palette,
  comment: "Chapter 13 boss: a stone window-golem whose glass pane shows data rows and a sliding frame bracket (window functions). Front view, 96×96.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ row: 0 }), frame({ bob: -1, row: 1 }), frame({ bob: -1, row: 2 }), frame({ bob: 0, row: 3 })],
    attack: [frame({ bob: 1, face: "angry", row: 2, arms: 0.4, flare: 0.3 }), frame({ bob: -2, face: "angry", row: 2, arms: 1, flare: 1, lean: 1 }), frame({ bob: 0, face: "angry", row: 3, arms: 0.6, flare: 0.6, lean: -1 })],
    hurt: [frame({ bob: 2, face: "hurt", lean: 3, row: 2 }), frame({ bob: 1, face: "hurt", lean: 1, row: 2 })],
    faint: [down, dissolve(down, 0.3, 2), dissolve(down, 0.6, 5), dissolve(down, 0.85, 8)],
  },
});

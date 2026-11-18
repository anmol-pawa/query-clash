// PANEWARDEN, boss of chapter 13 (Window functions mastery): a great owl-sage
// who keeps a glass pane (a window frame) in front of its belly. The pane
// slides along rows of data cells, lighting the rows inside the frame.
// Run: node scripts/art/panewarden.mjs   (ART_PREVIEW=<dir> writes a contact sheet)
import { Layer, emit, dissolve, ring } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#0c0d1a", // outline
  a: "#232552", // plumage ramp, dark → light
  b: "#3d4590",
  c: "#6573d0",
  d: "#a5b2f5",
  f: "#5a3d22", // belly / talon ramp
  g: "#9c6a38",
  h: "#e0b46a",
  i: "#fff0c8",
  e: "#ffc83a", // eye amber
  j: "#fff6b0",
  v: "#14102a", // pupil
  r: "#ff5a4a", // angry eye
  s: "#0c4a5a", // pane ramp, dark → light
  t: "#19a6bd",
  u: "#5ce8f5",
  y: "#d8fdff",
  p: "#a8ff9a", // highlighted row
};
const PLUME = ["a", "b", "c", "d"];
const BELLY = ["f", "g", "h", "i"];
const PANE = ["s", "t", "u", "y"];

/**
 * pose.bob: body height; pose.slide: pane offset (-1 … 1); pose.wing: wing spread (0 … 1);
 * pose.face: "normal" | "angry" | "hurt" | "faint"; pose.lean: x offset; pose.pane: [dx, dy] pane push.
 */
function frame({ bob = 0, slide = 0, wing = 0.3, face = "normal", lean = 0, pane = [0, 0], tilt = 0 }) {
  const out = new Layer(W, H);
  const cx = 48 + lean;
  const cy = 58 + bob;

  // talons planted on the ground (they never bob)
  const feet = new Layer(W, H);
  for (const s of [-1, 1]) {
    feet.ellipse(48 + s * 11, 90, 7, 3.5, BELLY, { bias: -0.05 });
    for (const t of [-3, 0, 3]) feet.line(48 + s * 11 + t * 1.4, 91, 48 + s * 11 + t * 2, 94, "h");
  }
  feet.outline("k");
  out.draw(feet);

  // wings, folded in or flung wide
  for (const s of [-1, 1]) {
    const w = new Layer(W, H);
    const spread = wing * 16;
    const wx = cx + s * (23 + spread * 0.6);
    w.poly(
      [
        [cx + s * 15, cy - 20],
        [wx + s * 7, cy - 14 - spread * 0.5],
        [wx + s * (9 + spread * 0.5), cy + 12 + spread * 0.3],
        [wx + s * 3, cy + 26],
        [cx + s * 14, cy + 22],
      ],
      PLUME,
      (x, y) => 0.7 - Math.abs(x - cx) / 70 - (y - cy + 20) / 90,
    );
    // flight-feather tips
    for (let i = 0; i < 4; i++) w.line(wx + s * (2 + i * 2.2), cy + 6 + i * 4, wx + s * (4 + i * 2.2 + spread * 0.3), cy + 20 + i * 2, "a");
    w.outline("k");
    out.draw(w);
  }

  // body
  const body = new Layer(W, H);
  body.ellipse(cx, cy, 23, 29, PLUME, { bias: 0.02 });
  body.ellipse(cx, cy + 6, 15, 21, BELLY, { bias: -0.08 });
  // feather scallops on the belly
  body.clip((x, y, c) => {
    if (BELLY.includes(c) && ((x + (Math.floor((y - cy) / 5) & 1) * 3) % 6 === 0) && (y - cy) % 5 === 0) body.set(x, y, "f");
  });
  body.outline("k");
  out.draw(body);

  // head with ear tufts
  const hx = cx;
  const hy = cy - 28;
  const head = new Layer(W, H);
  for (const s of [-1, 1])
    head.poly(
      [
        [hx + s * 7, hy - 8],
        [hx + s * 16 + tilt * s, hy - 24],
        [hx + s * 15, hy - 4],
      ],
      PLUME,
      () => (s > 0 ? 0.35 : 0.75),
    );
  head.ellipse(hx, hy, 19, 15, PLUME, { bias: 0.05 });
  head.outline("k");
  // facial discs
  const discs = new Layer(W, H);
  for (const s of [-1, 1]) discs.ellipse(hx + s * 8.5, hy + 1, 8.5, 9, BELLY, { bias: 0.15 });
  discs.outline("k");
  head.draw(discs);
  // eyes
  const glow = face === "angry" || face === "hurt" ? "r" : "e";
  for (const s of [-1, 1]) {
    const ex = hx + s * 8.5;
    const ey = hy + 1;
    if (face === "faint") {
      head.line(ex - 3, ey - 2, ex + 3, ey + 2, "k").line(ex - 3, ey + 2, ex + 3, ey - 2, "k");
    } else if (face === "hurt") {
      head.line(ex - 3, ey - 2, ex + 2, ey, "k").line(ex - 3, ey + 2, ex + 2, ey, "k");
    } else {
      head.ellipse(ex, ey, 5, 5, ["k", glow, glow, "j"], { bias: 0.1 });
      ring(head, ex, ey, 5, 5, "k");
      head.set(ex - s, ey, "v").set(ex - s, ey + 1, "v").set(ex - s, ey - 1, "v");
      if (face === "angry") head.line(ex - 5, ey - 5 + (s > 0 ? 0 : 0), ex + 5, ey - 3, "k");
    }
  }
  // beak
  head.poly(
    [
      [hx - 3, hy + 6],
      [hx + 3, hy + 6],
      [hx, hy + 13],
    ],
    BELLY,
    () => 0.8,
  );
  head.line(hx - 3, hy + 6, hx, hy + 13, "k").line(hx + 3, hy + 6, hx, hy + 13, "k");
  out.draw(head);

  // the pane: a glass frame over the belly with row cells inside
  const px = cx + pane[0];
  const py = cy + 4 + pane[1];
  const fr = new Layer(W, H);
  const fw = 21;
  const fh = 24;
  fr.poly([[px - fw, py - fh], [px + fw, py - fh], [px + fw, py + fh], [px - fw, py + fh]], PANE, (x, y) => 0.35 - (y - py) / 90 + (x - px) / 120);
  // hollow interior (dark glass)
  const inner = new Layer(W, H);
  inner.poly([[px - fw + 3, py - fh + 3], [px + fw - 3, py - fh + 3], [px + fw - 3, py + fh - 3], [px - fw + 3, py + fh - 3]], "v");
  fr.draw(inner);
  fr.outline("k");
  // rows of data cells
  const rowsY = [-17, -9, -1, 7, 15];
  const winY = py + Math.round(slide * 8) - 1; // the sliding window's top
  rowsY.forEach((ry, i) => {
    const yy = py + ry - 3;
    const inWin = yy + 3 > winY - 2 && yy < winY + 18;
    const col = inWin ? "p" : "b";
    fr.line(px - fw + 5, yy + 2, px - fw + 12, yy + 2, inWin ? "p" : "c");
    fr.line(px - fw + 15, yy + 2, px + fw - 6, yy + 2, col);
    fr.line(px - fw + 15, yy + 3, px + fw - 6 - (i % 3) * 4, yy + 3, inWin ? "p" : "a");
  });
  // bright bracket marking the window frame (ROWS BETWEEN ... AND ...)
  fr.line(px - fw + 2, winY - 2, px + fw - 2, winY - 2, "y").line(px - fw + 2, winY + 18, px + fw - 2, winY + 18, "y");
  fr.line(px - fw + 2, winY - 2, px - fw + 2, winY + 1, "y").line(px + fw - 2, winY - 2, px + fw - 2, winY + 1, "y");
  fr.line(px - fw + 2, winY + 18, px - fw + 2, winY + 15, "y").line(px + fw - 2, winY + 18, px + fw - 2, winY + 15, "y");
  // glass glint
  fr.line(px + fw - 7, py - fh + 5, px + fw - 4, py - fh + 8, "y");
  out.draw(fr);
  return out;
}

const hurt = frame({ bob: 2, slide: 0, wing: 0.7, face: "hurt", lean: 3, pane: [2, 1], tilt: 3 });
const down = frame({ bob: 11, slide: 0, wing: 0, face: "faint", pane: [0, 8], tilt: -3 });

emit(new URL("../../game/sprites/creatures/panewarden.ts", import.meta.url), {
  id: "panewarden",
  name: "PANEWARDEN",
  script: "panewarden",
  w: W,
  h: H,
  palette,
  comment: "Chapter 13 boss: a great owl-sage whose glass pane slides over rows of data, lighting the rows inside the window frame. Front view, 96×96.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ slide: -1, bob: 0 }), frame({ slide: -0.3, bob: 1 }), frame({ slide: 0.5, bob: 0, wing: 0.35 }), frame({ slide: 1, bob: -1, wing: 0.25 })],
    attack: [
      frame({ slide: -1, wing: 0.9, bob: -2, face: "angry", pane: [0, -2] }),
      frame({ slide: 0, wing: 1, bob: -4, face: "angry", pane: [0, -6], tilt: 2 }),
      frame({ slide: 1, wing: 0.2, bob: 3, face: "angry", lean: -3, pane: [-10, 4] }),
    ],
    hurt: [hurt, frame({ bob: 1, wing: 0.5, face: "hurt", lean: 1, pane: [1, 0] })],
    faint: [down, dissolve(down, 0.3, 3), dissolve(down, 0.6, 6), dissolve(down, 0.85, 9)],
  },
});

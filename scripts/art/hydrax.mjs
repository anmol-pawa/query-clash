// HYDRAX, boss of chapter 12 (SQL anti-patterns): the N+1 hydra. One big head
// (the first query) and a ring of smaller heads (the N queries it spawns), all
// snapping from a coiled, scaly body. In idle the small heads strike in turn;
// in the attack every head lunges at once.
// Run: node scripts/art/hydrax.mjs
import { Layer, emit, dissolve } from "./paint.mjs";

const W = 96;
const H = 96;
const palette = {
  k: "#120d16", // outline
  a: "#2a1a3e", // scale ramp, dark → light
  b: "#4a2f6e",
  c: "#7a4fa8",
  d: "#b48ad8",
  s: "#3a4a1c", // belly ramp, dark → light
  t: "#6f8a2c",
  u: "#b8d055",
  v: "#eef2a8",
  y: "#ffe35c", // eyes
  e: "#ff9a2e",
  r: "#a3212e", // mouth
  q: "#ff6a7a",
  w: "#ffffff",
  g: "#58e0a0", // venom glint
};
const SCALE = ["a", "b", "c", "d"];
const BELLY = ["s", "t", "u", "v"];

/** Stamp shaded ellipses along a quadratic curve to make a rounded neck. */
function neck(L, [x0, y0], [cx, cy], [x1, y1], r0, r1, bias = 0) {
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    const r = r0 + (r1 - r0) * t;
    L.ellipse(x, y, r, r, SCALE, { bias });
  }
}

/** A head at (x, y) looking forward: skull, snout, eyes, jaw. `s` is the size scale. */
function head(L, x, y, s, face, mouth) {
  const h = new Layer(W, H);
  h.ellipse(x, y, 8 * s, 7 * s, SCALE, { bias: 0.05 });
  // horns / frill
  for (const d of [-1, 1]) h.poly([[x + d * 5 * s, y - 5 * s], [x + d * 9 * s, y - 11 * s], [x + d * 8 * s, y - 3 * s]], "b");
  // snout
  h.ellipse(x, y + 4 * s, 6 * s, 4.5 * s, BELLY, { bias: -0.05 });
  // nostrils
  h.set(x - 2 * s, y + 3 * s, "s");
  h.set(x + 2 * s, y + 3 * s, "s");
  if (mouth > 0) {
    const m = Math.max(2, Math.round(mouth * s));
    for (let yy = 0; yy < m; yy++) for (let xx = -4; xx <= 4; xx++) h.set(x + xx * s, y + 7 * s + yy, yy === 0 ? "k" : "r");
    for (let xx = -3; xx <= 3; xx += 2) h.set(x + xx * s, y + 7 * s + 1, "w");
    for (let xx = -2; xx <= 2; xx += 2) h.set(x + xx * s, y + 7 * s + m - 1, "w");
    for (let xx = -1; xx <= 1; xx++) h.set(x + xx * s, y + 7 * s + Math.floor(m / 2), "q");
  } else {
    h.line(x - 4 * s, y + 7 * s, x + 4 * s, y + 7 * s, "k");
  }
  h.outline("k");
  L.draw(h);
  // eyes (drawn after the outline so they stay crisp)
  for (const d of [-1, 1]) {
    const ex = x + d * 4 * s;
    const ey = y - 1 * s;
    const sz = s > 1 ? 2 : 1;
    if (face === "hurt" || face === "faint") {
      L.line(ex - sz, ey - sz, ex + sz, ey + sz, face === "hurt" ? "w" : "k");
      L.line(ex + sz, ey - sz, ex - sz, ey + sz, face === "hurt" ? "w" : "k");
    } else {
      for (let yy = -sz; yy <= sz; yy++) for (let xx = -sz; xx <= sz; xx++) L.set(ex + xx, ey + yy, yy < 0 ? "y" : "e");
      L.set(ex, ey + (face === "angry" ? 0 : 1), "k");
      if (face === "angry") L.line(ex - d * (sz + 1), ey - sz - 2, ex + d * (sz + 1), ey - sz, "k");
    }
  }
}

/**
 * pose.bob: body bounce; pose.strike: index of the small head that is striking (idle), pose.all: lunge amount for every head;
 * pose.face: "normal" | "angry" | "hurt" | "faint"; pose.lean: x shift; pose.sag: how far the heads have dropped (faint).
 */
function frame({ bob = 0, strike = -1, all = 0, face = "normal", lean = 0, sag = 0 }) {
  const out = new Layer(W, H);
  const cx = 48 + lean;
  const by = 70 + bob;

  // small heads on curving necks: [base x, base y, ctrl, head pos]
  const smalls = [
    { bx: cx - 14, hx: cx - 34, hy: 40, cx: cx - 36, cy: 62 },
    { bx: cx + 14, hx: cx + 34, hy: 40, cx: cx + 36, cy: 62 },
    { bx: cx - 8, hx: cx - 20, hy: 22, cx: cx - 24, cy: 50 },
    { bx: cx + 8, hx: cx + 20, hy: 22, cx: cx + 24, cy: 50 },
  ];
  const place = (i) => {
    const sm = smalls[i];
    const on = strike === i || all > 0;
    const up = on ? (all > 0 ? all * 6 : 4) : 0;
    const hx = sm.hx + (i % 2 ? -1 : 1) * (on ? -up * 0.4 : 0);
    const hy = sm.hy + sag + (on ? up : 0) + (i % 2 ? 1 : -1) * (bob > 0 ? 1 : 0);
    return { hx, hy, on };
  };
  // back necks first (the upper pair), then the outer pair, then the main one
  for (const i of [2, 3, 0, 1]) {
    const sm = smalls[i];
    const { hx, hy, on } = place(i);
    const n = new Layer(W, H);
    neck(n, [sm.bx, by - 4], [sm.cx, sm.cy + sag * 0.6], [hx, hy + 5], 4.6, 3.6, i % 2 ? -0.1 : 0.05);
    n.outline("k");
    out.draw(n);
    head(out, hx, hy, 0.9, face === "faint" ? "faint" : face, on ? (face === "faint" ? 0 : 5) : face === "angry" ? 4 : 0);
  }

  // coiled body
  const body = new Layer(W, H);
  body.ellipse(cx, by + 6, 30, 17, SCALE, { bias: 0.02 });
  body.clip((x, y) => {
    if ((x + y * 2) % 7 === 0 && y > by - 4) body.set(x, y, "a");
    if ((x * 2 + y) % 9 === 0 && y < by + 6) body.set(x, y, "c");
  });
  // belly plate
  body.ellipse(cx, by + 12, 13, 8, BELLY, { bias: -0.05 });
  for (let yy = by + 6; yy <= by + 18; yy += 3) for (let xx = cx - 9; xx <= cx + 9; xx++) if (body.get(xx, yy) !== ".") body.set(xx, yy, "s");
  body.outline("k");
  out.draw(body);

  // main neck and the big head, the first query
  const nk = new Layer(W, H);
  neck(nk, [cx, by - 2], [cx + 2, by - 22], [cx, 30 + bob + sag], 9, 7, 0.05);
  nk.outline("k");
  out.draw(nk);
  const lunge = all * 5;
  head(out, cx, 26 + bob + sag + lunge, 1.5, face, face === "angry" || all > 0 ? 5 : 0);

  // a drop of venom or a flare when attacking
  if (all > 0.5 && face !== "faint")
    for (const [x, y] of [[cx - 40, 30], [cx + 40, 30], [cx - 4, 8], [cx + 6, 12]]) {
      out.set(x, y, "w");
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) out.set(x + dx, y + dy, "g");
    }
  return out;
}

const down = frame({ bob: 2, face: "faint", sag: 16 });
emit(new URL("../../game/sprites/creatures/hydrax.ts", import.meta.url), {
  id: "hydrax",
  name: "HYDRAX",
  w: W,
  h: H,
  palette,
  comment: "Chapter 12 boss: the N+1 hydra, one big head and four small ones that strike in turn. Front view, 96×96.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 6 },
  anims: {
    idle: [frame({ strike: 0 }), frame({ bob: -1, strike: 2 }), frame({ bob: -1, strike: 3 }), frame({ bob: 0, strike: 1 })],
    attack: [frame({ bob: 1, face: "angry", all: 0.2 }), frame({ bob: -2, face: "angry", all: 1, lean: 1 }), frame({ bob: 0, face: "angry", all: 0.6, lean: -1 })],
    hurt: [frame({ bob: 2, face: "hurt", lean: 3 }), frame({ bob: 1, face: "hurt", lean: 1 })],
    faint: [down, dissolve(down, 0.3, 2), dissolve(down, 0.6, 5), dissolve(down, 0.85, 8)],
  },
});

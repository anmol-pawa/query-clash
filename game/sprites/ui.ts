/**
 * Small UI sprites for the victory/defeat card: a rating star (lit and
 * unlit) and a stone platform for the result scene. Same palette + grid
 * format as the creatures, so they render nearest-neighbour everywhere.
 */
import { Frame, SpriteDef } from "./pixel";

// prettier-ignore
const STAR: Frame = [
  "......k......",
  ".....kgk.....",
  ".....khk.....",
  "....kghgk....",
  "kkkkkghgkkkkk",
  "khhhhhgggggdk",
  ".kgghggggddk.",
  "..kgggggddk..",
  "...kgggddk...",
  "..kggdkdddk..",
  "..kgdk.kddk..",
  ".kgdk...kddk.",
  ".kkk.....kkk.",
];

/** The lit star's twinkle: a white glint on the upper ray. */
const STAR_GLINT: Frame = STAR.map((row, y) => (y === 2 ? ".....kwk....." : y === 3 ? "....kgwgk...." : row));

/** A lit rating star (gold, outlined, with a twinkle). */
export const STAR_LIT: SpriteDef = {
  id: "ui-star",
  name: "Star",
  w: 13,
  h: 13,
  palette: { k: "#0e0f1a", w: "#ffffff", h: "#fff2b0", g: "#f2b632", d: "#a8701a" },
  anims: { idle: [STAR, STAR, STAR_GLINT] },
  fps: { idle: 3 },
};

/** An unlit rating star: the same shape in dark slate, holding still. */
export const STAR_DIM: SpriteDef = {
  id: "ui-star-dim",
  name: "Empty star",
  w: 13,
  h: 13,
  palette: { k: "#0e0f1a", h: "#4a5078", g: "#353a5c", d: "#262a45" },
  anims: { idle: [STAR, STAR] },
};

/**
 * A stone platform: an outlined ellipse with a lit top, a shaded rim and a
 * few specks. Generated from the ellipse equation so any size stays round.
 */
export function platformFrame(w: number, h: number): Frame {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const inside = (x: number, y: number) => ((x - cx) / (w / 2)) ** 2 + ((y - cy) / (h / 2)) ** 2 <= 1;
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) row += ".";
      else if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) row += "k";
      else if (y > cy + h * 0.15) row += "d"; // rim in shade
      else if (y < cy - h * 0.15 && Math.abs(x - cx) < w * 0.3) row += "h"; // lit top
      else row += (x * 7 + y * 13) % 11 === 0 ? "d" : "s";
    }
    rows.push(row);
  }
  return rows;
}

const PLATFORM = platformFrame(48, 10);

/** The stone platform under each creature in the result scene. */
export const PLATFORM_STONE: SpriteDef = {
  id: "ui-platform",
  name: "Stone platform",
  w: 48,
  h: 10,
  palette: { k: "#0e0f1a", h: "#c4c8d8", s: "#8e94ad", d: "#5d627d" },
  anims: { idle: [PLATFORM, PLATFORM] },
};

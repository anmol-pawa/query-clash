import type { Frame, SpriteDef } from "./pixel";

/** One step of the evolution scene: which form's frame to draw, for how long. */
export interface EvolutionStep {
  def: SpriteDef;
  frame: Frame;
  ms: number;
  /** Which beat of the scene this step belongs to (drives the caption and sound). */
  beat: "before" | "glow" | "morph" | "reveal";
}

/**
 * The victory-card evolution scene, as a frame timeline:
 * 1. the old form idles,
 * 2. its `evolve` frames fade it to a white silhouette,
 * 3. the two white silhouettes swap faster and faster (the morph),
 * 4. the new form's `evolve` frames play backwards, white back to colour.
 * Both forms must be the same size and have an `evolve` animation.
 */
export function evolutionTimeline(from: SpriteDef, to: SpriteDef): EvolutionStep[] {
  const a = from.anims.evolve;
  const b = to.anims.evolve;
  if (!a?.length || !b?.length) throw new Error(`${from.id} → ${to.id}: both forms need an evolve animation`);
  if (from.w !== to.w || from.h !== to.h) throw new Error(`${from.id} → ${to.id}: forms differ in size`);
  const steps: EvolutionStep[] = [];
  const idle = from.anims.idle;
  for (let i = 0; i < 6; i++) steps.push({ def: from, frame: idle[i % idle.length], ms: 220, beat: "before" });
  for (const f of a) steps.push({ def: from, frame: f, ms: 180, beat: "glow" });
  const swaps = 12;
  for (let i = 0; i < swaps; i++) {
    const ms = Math.round(300 - (240 * i) / (swaps - 1)); // 300 ms → 60 ms
    steps.push({ def: from, frame: a[a.length - 1], ms, beat: "morph" });
    steps.push({ def: to, frame: b[b.length - 1], ms, beat: "morph" });
  }
  for (let i = b.length - 1; i >= 0; i--) steps.push({ def: to, frame: b[i], ms: i === 0 ? 400 : 160, beat: "reveal" });
  return steps;
}

/** A sparkle pixel-star centre in sprite pixels, with its arm length (1 = plus sign, 2 = long arms). */
export interface Sparkle {
  x: number;
  y: number;
  arm: 1 | 2;
}

/**
 * Sparkles orbiting the creature during the evolution scene. Pure and
 * deterministic in (beat, tick, size): "before" has none, "glow" and "morph"
 * circle the sprite faster as the morph speeds up, "reveal" bursts outwards.
 */
export function evolutionSparkles(beat: EvolutionStep["beat"], tick: number, w: number, h: number): Sparkle[] {
  if (beat === "before") return [];
  const cx = w / 2;
  const cy = h * 0.5;
  const out: Sparkle[] = [];
  const n = beat === "glow" ? 4 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + tick * (beat === "morph" ? 0.5 : 0.25);
    const r = beat === "reveal" ? w * (0.3 + 0.08 * tick) : w * (0.42 + 0.05 * Math.sin(tick * 0.7 + i));
    out.push({ x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r * 0.8), arm: (i + tick) % 2 === 0 ? 2 : 1 });
  }
  return out;
}

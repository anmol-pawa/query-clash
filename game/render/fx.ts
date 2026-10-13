import { Container, Graphics, Sprite, Text, TilingSprite } from "pixi.js";
import { FxKind, fxSprite } from "@/game/sprites/effects";
import { animTextures } from "@/game/sprites/texture";
import type { Particles } from "./particles";
import { softDot } from "./textures";
import { Tweener, ease } from "./tween";

export interface Pt {
  x: number;
  y: number;
}

export interface FxContext {
  tw: Tweener;
  fx: Particles;
  layer: Container; // additive effects layer
  top: Container; // normal-blend overlay (text, solid shapes)
  pix: Container; // normal-blend pixel-art effects (under the text)
  camera: Camera;
  reduced: boolean;
  /** Display font family (resolved next/font name). */
  font: string;
}

/** Screen shake, zoom punch, hit-stop and flash. */
export class Camera {
  shakeAmt = 0;
  private shakeDecay = 8;
  timeScale = 1;
  private stopUntil = 0;
  now = 0;
  zoom = 1;
  focus: Pt = { x: 640, y: 360 };

  constructor(
    private view: Container,
    private flashRect: Graphics,
    private reduced: () => boolean,
  ) {}

  shake(amount: number, decay = 8) {
    if (this.reduced()) amount *= 0.2;
    this.shakeAmt = Math.max(this.shakeAmt, amount);
    this.shakeDecay = decay;
  }

  hitStop(sec: number) {
    if (this.reduced()) return;
    this.stopUntil = Math.max(this.stopUntil, this.now + sec);
  }

  flash(alpha = 0.6, color = 0xffffff) {
    if (this.reduced()) alpha *= 0.25;
    this.flashRect.tint = color;
    this.flashRect.alpha = Math.max(this.flashRect.alpha, alpha);
  }

  punch(at: Pt, amount = 0.06) {
    if (this.reduced()) return;
    this.focus = at;
    this.zoom = 1 + amount;
  }

  /** Returns the scaled dt for gameplay animation. */
  update(realDt: number): number {
    this.now += realDt;
    const frozen = this.now < this.stopUntil;
    this.shakeAmt *= Math.exp(-this.shakeDecay * realDt);
    const sx = (Math.random() - 0.5) * 2 * this.shakeAmt;
    const sy = (Math.random() - 0.5) * 2 * this.shakeAmt;
    this.zoom += (1 - this.zoom) * Math.min(1, realDt * 7);
    const z = this.zoom;
    this.view.pivot.set(this.focus.x, this.focus.y);
    this.view.position.set(this.focus.x + sx, this.focus.y + sy);
    this.view.scale.set(z);
    this.flashRect.alpha *= Math.exp(-9 * realDt);
    return frozen ? 0 : realDt * this.timeScale;
  }
}

export function glowSprite(color: number, size: number, alpha = 1): Sprite {
  const s = new Sprite(softDot());
  s.anchor.set(0.5);
  s.tint = color;
  s.alpha = alpha;
  s.scale.set(size / 32);
  s.blendMode = "add";
  return s;
}

/** Pixel size for an effect, kept whole so the art stays crisp. */
const px = (n: number) => Math.max(2, Math.round(n));

/** A frame-animated pixel effect sprite, centred, on the pixel layer. */
export function fxSpriteOf(c: FxContext, kind: FxKind, color: number, at: Pt, scale: number, parent: Container = c.pix): Sprite {
  const s = new Sprite(animTextures(fxSprite(kind, color), "idle")[0]);
  s.anchor.set(0.5);
  s.scale.set(px(scale));
  s.roundPixels = true;
  s.position.set(at.x, at.y);
  parent.addChild(s);
  return s;
}

/** Step a sprite through its effect frames: once over `dur`, or looping at the effect's fps. */
export function setFxFrame(s: Sprite, kind: FxKind, color: number, k: number) {
  const t = animTextures(fxSprite(kind, color), "idle");
  s.texture = t[Math.min(t.length - 1, Math.floor(k * t.length))];
}
export function loopFrame(s: Sprite, kind: FxKind, color: number, time: number) {
  const def = fxSprite(kind, color);
  const t = animTextures(def, "idle");
  s.texture = t[Math.floor(time * (def.fps?.idle ?? 12)) % t.length];
}

/** One-shot pixel effect (impact spark, shock ring, slash) that plays its frames over `dur`. */
export async function playFx(c: FxContext, kind: FxKind, at: Pt, o: { color: number; scale: number; dur?: number; rotation?: number; flipX?: boolean; squash?: number }) {
  const s = fxSpriteOf(c, kind, o.color, at, o.scale);
  s.rotation = o.rotation ?? 0;
  if (o.flipX) s.scale.x *= -1;
  if (o.squash) s.scale.y *= o.squash;
  await c.tw.run(o.dur ?? 0.3, (k) => setFxFrame(s, kind, o.color, k));
  s.destroy();
}

/** Pixel impact starburst. */
export function impactSpark(c: FxContext, at: Pt, color: number, scale = 4) {
  return playFx(c, "spark", { x: at.x + (Math.random() - 0.5) * 30, y: at.y + (Math.random() - 0.5) * 30 }, { color, scale, dur: 0.26, rotation: Math.random() < 0.5 ? 0 : Math.PI / 8 });
}

/** A pixel data orb that flies along an arc, leaving a trail. Resolves on impact. */
export async function projectile(c: FxContext, from: Pt, to: Pt, o: { color: number; size?: number; dur?: number; arc?: number; trail?: boolean; spark?: boolean }): Promise<void> {
  const size = o.size ?? 26;
  const orb = fxSpriteOf(c, "orb", o.color, from, size / 6);
  const halo = glowSprite(o.color, size * 2.4, 0.45);
  halo.position.set(from.x, from.y);
  c.layer.addChild(halo);
  const arc = o.arc ?? -80;
  let time = 0;
  let last = 0;
  await c.tw.run(
    o.dur ?? 0.38,
    (k) => {
      time += Math.max(0, k - last) * (o.dur ?? 0.38);
      last = k;
      const x = from.x + (to.x - from.x) * k;
      const y = from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * arc;
      orb.position.set(Math.round(x), Math.round(y));
      halo.position.set(x, y);
      loopFrame(orb, "orb", o.color, time);
      if (o.trail !== false && Math.random() < 0.7 * c.fx.scale) {
        c.fx.emit({ x, y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, size: size * 0.6, life: 0.3, color: o.color, spark: o.spark });
      }
    },
    ease.inQuad,
  );
  orb.destroy();
  halo.destroy();
}

/** A pixel beam: a tiled, rippling energy section from `from` to `to`, a muzzle orb and an impact spark. */
export async function beam(c: FxContext, from: Pt, to: Pt, o: { color: number; width?: number; dur?: number; jitter?: number }) {
  const scale = px((o.width ?? 18) / 5);
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  const def = fxSprite("beam", o.color);
  const tex = animTextures(def, "idle");
  const b = new TilingSprite({ texture: tex[0], width: Math.ceil(len / scale), height: def.h });
  b.anchor.set(0, 0.5);
  b.scale.set(scale);
  b.rotation = Math.atan2(to.y - from.y, to.x - from.x);
  b.position.set(from.x, from.y);
  c.pix.addChild(b);
  const glow = new Graphics();
  c.layer.addChild(glow);
  const muzzle = fxSpriteOf(c, "orb", o.color, from, scale * 1.5);
  const tip = fxSpriteOf(c, "spark", o.color, to, scale * 1.4);
  const dur = o.dur ?? 0.45;
  await c.tw.run(dur, (k) => {
    const life = k < 0.15 ? k / 0.15 : k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    const f = Math.floor(k * dur * 14);
    b.texture = tex[f % tex.length];
    b.tilePosition.x = -f * 2; // energy flows toward the target
    b.scale.y = scale * Math.max(0.15, life) + (o.jitter ? (Math.random() - 0.5) * o.jitter * 0.4 : 0);
    muzzle.texture = animTextures(fxSprite("orb", o.color), "idle")[f % 4];
    tip.texture = animTextures(fxSprite("spark", o.color), "idle")[f % 3];
    muzzle.alpha = tip.alpha = life;
    glow.clear();
    glow.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ width: def.h * scale * 1.6 * life, color: o.color, alpha: 0.18 * life, cap: "round" });
    if (Math.random() < 0.5 * c.fx.scale) c.fx.emit({ x: to.x, y: to.y, vx: (Math.random() - 0.5) * 400, vy: (Math.random() - 0.5) * 400, life: 0.3, size: 10, color: o.color, spark: true });
  });
  b.destroy();
  glow.destroy();
  muzzle.destroy();
  tip.destroy();
}

/** Expanding pixel shock ring (squash flattens it onto the ground). */
export async function ring(c: FxContext, at: Pt, o: { color: number; radius?: number; dur?: number; width?: number; squash?: number }) {
  const R = o.radius ?? 140;
  await playFx(c, "ring", at, { color: o.color, scale: Math.min(6, (R * 2) / 29), dur: o.dur ?? 0.4, squash: o.squash });
}

/** A pixel lightning bolt striking from `from` down to `to`, re-forking as it flickers out. */
export function lightning(c: FxContext, from: Pt, to: Pt, color: number, width = 5) {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  const s = fxSpriteOf(c, "bolt", color, to, 2);
  s.anchor.set(0.5, 1); // the tip lands on the target
  const sy = px(len / 64);
  s.scale.set(Math.min(px(width * 0.9), sy + 1), sy); // whole-pixel steps; a heavier bolt is wider
  s.rotation = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2;
  const glow = glowSprite(color, width * 30, 0.45);
  glow.position.set(to.x, to.y);
  c.layer.addChild(glow);
  let time = Math.random();
  return c.tw
    .run(0.3, (k) => {
      time += 1 / 60;
      loopFrame(s, "bolt", color, time);
      s.alpha = k < 0.6 ? 1 : (1 - k) / 0.4;
      glow.alpha = 0.45 * (1 - k);
    })
    .then(() => {
      s.destroy();
      glow.destroy();
    });
}

/** A pixel sword-swipe crescent, rotated by `angle`. */
export async function slash(c: FxContext, at: Pt, o: { color: number; angle?: number; size?: number; dur?: number }) {
  const R = o.size ?? 130;
  await playFx(c, "slash", { x: at.x - 8, y: at.y }, { color: o.color, scale: Math.min(6, (R * 2) / 27), dur: o.dur ?? 0.26, rotation: (o.angle ?? -0.6) + 0.6 });
}

/** Floating damage / status text. */
export function popText(c: FxContext, at: Pt, text: string, o: { color: number; size?: number; crit?: boolean; rise?: number }) {
  const t = new Text({
    text,
    style: {
      fontFamily: `${c.font}, system-ui, sans-serif`,
      fontSize: o.size ?? 54,
      fontWeight: "700",
      fill: o.color,
      stroke: { color: 0x0b0718, width: 8 },
      dropShadow: { color: o.color, blur: 16, distance: 0, alpha: 0.9 },
      letterSpacing: 2,
    },
  });
  t.anchor.set(0.5);
  t.position.set(at.x, at.y);
  t.scale.set(0.2);
  c.top.addChild(t);
  const rise = o.rise ?? 90;
  (async () => {
    await c.tw.to(t.scale, { x: o.crit ? 1.5 : 1.2, y: o.crit ? 1.5 : 1.2 }, 0.16, ease.outBack);
    await c.tw.to(t.scale, { x: 1, y: 1 }, 0.12);
    await c.tw.to(t, { y: at.y - rise, alpha: 0 }, 0.9, ease.inCubic);
    t.destroy();
  })();
}

export function banner(c: FxContext, at: Pt, text: string, color: number) {
  return popText(c, at, text, { color, size: 30, rise: 40 });
}

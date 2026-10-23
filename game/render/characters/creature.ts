import { Graphics } from "pixi.js";
import type { SpriteDef } from "@/game/sprites/pixel";
import { PixelSprite } from "@/game/sprites/texture";
import { ease } from "../tween";
import type { BossAttackStyle } from "./bosses";
import { Character, RigContext } from "./rig";


/**
 * A pixel-art creature standing on an elliptical platform. The sprite already
 * faces the right way (front sprite for the foe, back sprite for the player),
 * so `dir` only steers lunges and knockback; the art is never mirrored.
 */
export class Creature extends Character {
  readonly sprite: PixelSprite;
  readonly platform = new Graphics();
  private dir: 1 | -1;

  constructor(
    ctx: RigContext,
    readonly def: SpriteDef,
    scale: number,
    readonly color: number,
    dir: 1 | -1,
    readonly style?: BossAttackStyle,
  ) {
    super(ctx);
    this.dir = dir;
    this.sprite = new PixelSprite(def, scale);
    const w = def.w * scale;
    const h = def.h * scale;
    this.centerY = -h * 0.45;
    this.castY = -h * 0.55;
    this.castX = w * 0.18;
    this.drawPlatform(w * 0.62, w * 0.13);
    this.shadow.clear().ellipse(0, -2, w * 0.3, w * 0.06).fill({ color: 0x000000, alpha: 0.35 });
    this.root.addChildAt(this.platform, 0);
    this.body.addChild(this.sprite);
  }

  /** Stone disc with a grassy rim: lit top face, darker lip, chunky pixel steps. */
  private drawPlatform(rx: number, ry: number) {
    const g = this.platform;
    const step = Math.max(4, Math.round(rx / 40));
    g.ellipse(0, ry * 0.55, rx, ry * 1.05).fill({ color: 0x2a2140 });
    g.ellipse(0, ry * 0.3, rx, ry).fill({ color: 0x4a3f63 });
    g.ellipse(0, 0, rx, ry).fill({ color: 0x5f8f4a });
    g.ellipse(0, -ry * 0.08, rx * 0.92, ry * 0.82).fill({ color: 0x7fb35a });
    g.ellipse(-rx * 0.18, -ry * 0.22, rx * 0.55, ry * 0.42).fill({ color: 0x9ccc6c });
    // grass tufts along the front lip
    for (let x = -rx * 0.85; x < rx * 0.85; x += step * 5) {
      const y = ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)) - step;
      g.rect(Math.round(x), Math.round(y), step, step * 2).fill({ color: 0x3f6b33 });
      g.rect(Math.round(x + step), Math.round(y - step), step, step * 2).fill({ color: 0x5f8f4a });
    }
  }

  hasStyle(): this is Creature & { style: BossAttackStyle } {
    return this.style !== undefined;
  }

  /** Spell fizzles: a half-hearted attack pose and a puff of grey smoke. */
  async fizzle() {
    const { tw, fx } = this.ctx;
    this.sprite.play("attack");
    const o = this.castPoint();
    for (let i = 0; i < 18 * fx.scale; i++) fx.emit({ x: o.x, y: o.y, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 80, size: 18, sizeEnd: 40, life: 0.9, color: 0x6b7280, alpha: 0.5 });
    await tw.wait(0.4);
  }

  override get facing(): 1 | -1 {
    return this.dir;
  }

  override flip() {
    this.dir = -this.dir as 1 | -1;
  }

  override update(dt: number) {
    super.update(dt);
    this.sprite.update(dt);
  }

  protected idle(t: number) {
    // the sprite animates itself; add a gentle breathing bob for the charge state
    this.sprite.y = this.charging ? Math.round(Math.sin(t * 18) * 2) : 0;
  }

  /** The attack pose plays while a spell leaves the creature. */
  override async castMotion() {
    this.sprite.play("attack");
    await this.lunge(28);
  }

  override async windup() {
    const anim = this.sprite.play("attack");
    await Promise.race([anim, this.ctx.tw.wait(0.45)]);
  }

  override async hit(power = 1) {
    const { tw } = this.ctx;
    this.sprite.play("hurt");
    this.sprite.flashAmount = 1;
    tw.to(this.sprite, { flashAmount: 0 }, 0.25);
    const back = -26 * power * this.dir;
    await tw.to(this.body, { x: back }, 0.08, ease.outCubic);
    await tw.to(this.body, { x: 0 }, 0.4, ease.outElastic);
  }

  override async ko() {
    const { tw, fx } = this.ctx;
    this.alive = false;
    const c = this.hitPoint();
    for (let i = 0; i < 3; i++) fx.burst(c.x + (Math.random() - 0.5) * 100, c.y + (Math.random() - 0.5) * 120, { count: 20, color: this.color, speed: 300, life: 1 });
    const faint = this.sprite.play("faint", false, true);
    // white flash, then sink into the platform with a stepped (pixel) blink and dust puffs
    this.sprite.flashAmount = 1;
    tw.to(this.sprite, { flashAmount: 0 }, 0.3);
    for (let i = 0; i < 10 * fx.scale; i++) fx.emit({ x: c.x + (Math.random() - 0.5) * 120, y: c.y + this.sprite.height * 0.4, vx: (Math.random() - 0.5) * 120, vy: -10 - Math.random() * 30, size: 10, sizeEnd: 28, life: 0.8, color: 0xb8aa8c, alpha: 0.5 });
    const sink = tw.to(this.body, { y: 40 }, 0.9, ease.inCubic);
    for (const a of [0.3, 1, 0.3, 1, 0.3]) {
      this.body.alpha = a;
      await tw.wait(0.08);
    }
    await sink;
    await faint;
    await tw.to(this.body, { alpha: 0 }, 0.3);
  }
}

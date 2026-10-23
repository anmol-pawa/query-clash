/**
 * BattleStage — the PixiJS arena. Owns the renderer, the parallax background,
 * the two fighters, the effects layers and the camera, and exposes a small
 * promise-based API the React battle screen drives:
 *
 *   await stage.attack("left", "blade", color, 142, true, false)
 *   await stage.counter(12)
 */
import { Application, Container, Graphics, Sprite } from "pixi.js";
import type { BossId } from "@/content/types";
import type { AttackKind } from "@/lib/dialect/concepts";
import { bossAttack, performAttack } from "./attacks";
import { BOSS_STYLE, bossSprite, starterSprite } from "@/game/sprites/roster";
import { Creature } from "./characters/creature";
import type { RigContext } from "./characters/rig";
import { Camera, FxContext, impactSpark, popText, ring } from "./fx";
import { Particles } from "./particles";
import { BIOMES } from "./overworld";
import { SCENES, SCENE_PAD, bossScene } from "./scenery";
import { sceneTex, vignetteTex } from "./textures";
import { Tweener, ease } from "./tween";

export const W = 1280;
export const H = 720;
const HORIZON = 440;
/** GBA layout: the foe stands top-right near the horizon, the player's creature bottom-left, seen from behind. */
const FOE = { x: 905, y: 400, scale: 3 };
const PLAYER = { x: 330, y: 680, scale: 5 };

export type Side = "left" | "right";

export interface StageOptions {
  boss?: BossId;
  versus?: boolean;
  /** The player's starter evolution stage (campaign and arena; versus is always stage 0). */
  starter?: number;
  accent: number;
  reducedMotion: boolean;
  font: string;
}

export class BattleStage {
  private app = new Application();
  private fit = new Container();
  private camera = new Container();
  private bg = new Container();
  private fighters = new Container();
  private fxLayer = new Container();
  private top = new Container();
  private pix = new Container();
  private flashRect = new Graphics();
  private vignette!: Sprite;
  private tw = new Tweener();
  private fx = new Particles();
  private cam!: Camera;
  private fxc!: FxContext;
  private rig!: RigContext;
  left!: Creature;
  right!: Creature;
  private t = 0;
  private destroyed = false;
  private opts: StageOptions;

  private constructor(opts: StageOptions) {
    this.opts = opts;
  }

  static async create(host: HTMLElement, opts: StageOptions): Promise<BattleStage> {
    const s = new BattleStage(opts);
    await s.app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: false, // pixel art: crisp edges, and cheaper fill on mobile GPUs
      autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      preference: "webgl",
    });
    host.appendChild(s.app.canvas);
    s.app.canvas.style.width = "100%";
    s.app.canvas.style.height = "100%";
    s.app.canvas.style.display = "block";
    s.build();
    s.app.renderer.on("resize", () => s.layout());
    s.layout();
    s.app.ticker.add((tk) => s.frame(Math.min(0.05, tk.deltaMS / 1000)));
    return s;
  }

  private build() {
    const { reducedMotion } = this.opts;
    this.fx.scale = reducedMotion ? 0.35 : 1;

    // background: the boss's biome painted as a low-res pixel scene, scaled 4× with nearest-neighbour
    const scene = bossScene(this.opts.versus ? undefined : this.opts.boss);
    const bounds = new Graphics();
    bounds.rect(-1300, -600, W + 2600, HORIZON + 600).fill({ color: SCENES[scene].sky[0] });
    bounds.rect(-1300, HORIZON, W + 2600, H - HORIZON + 600).fill({ color: BIOMES[scene].ground[0] });
    const backdrop = new Sprite(sceneTex(scene));
    backdrop.scale.set(4);
    backdrop.x = -SCENE_PAD * 4;
    this.bg.addChild(bounds, backdrop);


    this.rig = { tw: this.tw, fx: this.fx, reduced: reducedMotion, space: this.camera };

    const starterBack = starterSprite("back", this.opts.versus ? 0 : this.opts.starter);
    this.left = new Creature(this.rig, starterBack, PLAYER.scale, 0x5eead4, 1);
    this.left.root.position.set(PLAYER.x, PLAYER.y);
    this.left.homeX = PLAYER.x;
    if (this.opts.versus || !this.opts.boss) {
      this.right = new Creature(this.rig, starterSprite("front"), FOE.scale + 1, 0xf9a8d4, -1);
    } else {
      const { style, color } = BOSS_STYLE[this.opts.boss];
      this.right = new Creature(this.rig, bossSprite(this.opts.boss), FOE.scale, color, -1, style);
    }
    this.right.root.position.set(FOE.x, FOE.y);
    this.right.homeX = FOE.x;
    this.fighters.addChild(this.left.root, this.right.root);

    this.fxLayer.blendMode = "add";
    this.camera.addChild(this.bg, this.fighters, this.fx.container, this.fxLayer, this.pix, this.top);

    this.flashRect.rect(0, 0, 16, 16).fill({ color: 0xffffff });
    this.flashRect.alpha = 0;
    this.vignette = new Sprite(vignetteTex());
    this.fit.addChild(this.camera);
    this.app.stage.addChild(this.fit, this.vignette, this.flashRect);

    this.cam = new Camera(this.camera, this.flashRect, () => this.opts.reducedMotion);
    this.fxc = { tw: this.tw, fx: this.fx, layer: this.fxLayer, top: this.top, pix: this.pix, camera: this.cam, reduced: reducedMotion, font: this.opts.font };

    // entrance: both creatures slide in on their platforms from opposite edges
    this.left.root.x = PLAYER.x - 900;
    this.right.root.x = FOE.x + 900;
    this.tw.to(this.left.root, { x: PLAYER.x }, 0.9, ease.outCubic);
    this.tw.to(this.right.root, { x: FOE.x }, 0.9, ease.outCubic);
  }

  /**
   * Keep the fighting band (x 110–1170, y 100–700) fully visible at any aspect
   * ratio; the background is drawn much wider than 1280×720 so there is never
   * a letterbox.
   */
  private layout() {
    const { width, height } = this.app.screen;
    const s = Math.min(height / 600, width / 1060);
    this.fit.scale.set(s);
    this.fit.position.set(width / 2 - 640 * s, height / 2 - 400 * s);
    this.vignette.width = width;
    this.vignette.height = height;
    this.flashRect.width = width;
    this.flashRect.height = height;
  }

  private frame(realDt: number) {
    if (this.destroyed) return;
    const dt = this.cam.update(realDt);
    this.t += realDt;
    this.tw.update(dt);
    this.fx.update(dt);
    this.left.update(dt);
    this.right.update(dt);
  }

  /* --------------------------------------------------------------- API */

  private pair(side: Side): [Creature, Creature] {
    return side === "left" ? [this.left, this.right] : [this.right, this.left];
  }

  setCharging(side: Side, on: boolean) {
    this.pair(side)[0].charging = on;
  }

  /** A successful spell. Resolves when the animation has finished. */
  async attack(side: Side, kind: AttackKind, color: number, damage: number, crit: boolean, finisher: boolean, onHit?: () => void) {
    const [caster, target] = this.pair(side);
    caster.charging = false;
    if (finisher) {
      this.cam.flash(0.35, color);
      this.tw.to(this.cam, { timeScale: 0.55 }, 0.2);
    }
    await performAttack(this.fxc, kind, caster, target, color, (i, n) => {
      this.impact(target, color, damage, crit, i, n, finisher);
      if (i === n - 1) onHit?.();
    });
    this.tw.to(this.cam, { timeScale: 1 }, 0.3);
    await this.tw.wait(0.35);
  }

  private impact(target: Creature, color: number, damage: number, crit: boolean, i: number, n: number, finisher: boolean) {
    const last = i === n - 1;
    const p = target.hitPoint();
    target.hit(last ? (crit || finisher ? 1.6 : 1.1) : 0.5);
    impactSpark(this.fxc, p, color, last && (crit || finisher) ? 6 : last ? 5 : 3);
    this.cam.shake(last ? (crit || finisher ? 22 : 12) : 5);
    this.cam.hitStop(last ? (crit || finisher ? 0.14 : 0.07) : 0.03);
    if (last) {
      this.cam.flash(crit ? 0.45 : 0.22, crit ? 0xffffff : color);
      this.cam.punch(p, crit || finisher ? 0.08 : 0.04);
      popText(this.fxc, { x: p.x, y: p.y - 110 }, `-${damage}`, { color: crit ? 0xfde047 : 0xffffff, size: crit ? 72 : 58, crit });
      if (crit) popText(this.fxc, { x: p.x, y: p.y - 190 }, "CRITICAL", { color: 0xfde047, size: 30, rise: 50 });
    }
  }

  /** The opponent strikes back (wrong answer / timeout). */
  async counter(side: Side, damage: number, onHit?: () => void) {
    const [attacker, target] = this.pair(side);
    const onImpact = (i: number, n: number) => {
      const last = i === n - 1;
      const p = target.hitPoint();
      target.hit(last ? 1.2 : 0.5);
      impactSpark(this.fxc, p, attacker.color, last ? 5 : 3);
      this.cam.shake(last ? 14 : 5);
      this.cam.hitStop(last ? 0.08 : 0.02);
      if (last) {
        onHit?.();
        this.cam.flash(0.25, 0xef4444);
        popText(this.fxc, { x: p.x, y: p.y - 120 }, `-${damage}`, { color: 0xf87171, size: 56 });
      }
    };
    if (attacker.hasStyle()) await bossAttack(this.fxc, attacker, target, onImpact);
    else await performAttack(this.fxc, "bolt", attacker, target, attacker.color, onImpact);
    await this.tw.wait(0.3);
  }

  async fizzle(side: Side) {
    const caster = this.pair(side)[0];
    caster.charging = false;
    await caster.fizzle();
    const p = caster.castPoint();
    popText(this.fxc, { x: p.x, y: p.y - 40 }, "MISS", { color: 0x94a3b8, size: 34, rise: 50 });
  }

  /** Small "blocked" feedback when a query is invalid before execution. */
  shieldPing(side: Side, color: number) {
    const p = this.pair(side)[0].hitPoint();
    ring(this.fxc, p, { color, radius: 120 });
  }

  async ko(side: Side) {
    const c = side === "left" ? this.left : this.right;
    this.cam.flash(0.6, 0xffffff);
    this.cam.shake(18, 3);
    this.tw.to(this.cam, { timeScale: 0.4 }, 0.1);
    await c.ko();
    this.tw.to(this.cam, { timeScale: 1 }, 0.4);
  }

  async victory(side: Side) {
    const c = side === "left" ? this.left : this.right;
    await c.victory();
  }

  setReducedMotion(on: boolean) {
    this.opts.reducedMotion = on;
    this.fx.scale = on ? 0.35 : 1;
  }

  destroy() {
    this.destroyed = true;
    this.tw.dispose();
    this.fx.clear();
    this.app.destroy({ removeView: true }, { children: true });
  }
}

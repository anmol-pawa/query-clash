import { Container, Sprite, Texture } from "pixi.js";
import { Frame, SpriteDef, WHITE, frameToRGBA } from "./pixel";

/** Draw one frame onto a fresh canvas at 1 px per pixel. */
export function frameCanvas(def: SpriteDef, frame: Frame, white = false): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = def.w;
  c.height = def.h;
  const data = frameToRGBA(def, frame, white ? WHITE : undefined);
  c.getContext("2d")!.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, def.w, def.h), 0, 0);
  return c;
}

const cache = new Map<string, Texture[]>();

/** Nearest-neighbour textures for one animation (cached per sprite). */
export function animTextures(def: SpriteDef, anim: string, white = false): Texture[] {
  const key = `${def.id}/${anim}/${white ? "w" : "c"}`;
  let t = cache.get(key);
  if (!t) {
    const frames = def.anims[anim] ?? def.anims.idle;
    t = frames.map((f) => {
      const tex = Texture.from(frameCanvas(def, f, white));
      tex.source.scaleMode = "nearest";
      return tex;
    });
    cache.set(key, t);
  }
  return t;
}

/**
 * A pixel creature on the Pixi stage. `scale` is the integer pixel size; the
 * anchor sits at the bottom centre so `position` is where its feet touch the
 * platform. `flash()` overlays a white silhouette for hurt / evolve effects.
 */
export class PixelSprite extends Container {
  readonly sprite: Sprite;
  private flashSprite: Sprite;
  private anim = "idle";
  private frame = 0;
  private acc = 0;
  private loop = true;
  private hold = false;
  private onDone?: () => void;

  constructor(
    readonly def: SpriteDef,
    scale = 3,
  ) {
    super();
    const t = animTextures(def, "idle");
    this.sprite = new Sprite(t[0]);
    this.flashSprite = new Sprite(animTextures(def, "idle", true)[0]);
    for (const s of [this.sprite, this.flashSprite]) {
      s.anchor.set(0.5, 1);
      s.scale.set(scale);
      s.roundPixels = true;
    }
    this.flashSprite.alpha = 0;
    this.addChild(this.sprite, this.flashSprite);
  }

  get flashAmount() {
    return this.flashSprite.alpha;
  }
  /** 0 = normal colours, 1 = solid white silhouette. */
  set flashAmount(v: number) {
    this.flashSprite.alpha = v;
  }

  /**
   * Switch animation. Non-looping animations resolve when they finish and
   * return to idle, unless `hold` keeps their last frame (e.g. a faint).
   */
  play(anim: string, loop = anim === "idle", hold = false): Promise<void> {
    this.onDone?.();
    this.anim = this.def.anims[anim] ? anim : "idle";
    this.frame = 0;
    this.acc = 0;
    this.loop = loop;
    this.hold = hold;
    this.apply();
    return new Promise((res) => (this.onDone = loop ? undefined : res));
  }

  update(dt: number) {
    const frames = this.def.anims[this.anim];
    const fps = this.def.fps?.[this.anim] ?? 4;
    this.acc += dt;
    while (this.acc >= 1 / fps) {
      this.acc -= 1 / fps;
      if (this.frame + 1 < frames.length) this.frame++;
      else if (this.loop) this.frame = 0;
      else if (this.hold) {
        this.acc = 0;
        const done = this.onDone;
        this.onDone = undefined;
        done?.();
        break;
      } else {
        const done = this.onDone;
        this.onDone = undefined;
        this.anim = "idle";
        this.frame = 0;
        this.loop = true;
        done?.();
      }
    }
    this.apply();
  }

  private apply() {
    this.sprite.texture = animTextures(this.def, this.anim)[this.frame];
    this.flashSprite.texture = animTextures(this.def, this.anim, true)[this.frame];
  }
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Button, NavLink } from "@/components/ui/kit";
import { SPRITES } from "@/game/sprites";
import type { SpriteDef } from "@/game/sprites/pixel";
import { frameCanvas } from "@/game/sprites/texture";
import { FX_KINDS, fxSprite } from "@/game/sprites/effects";
import { BIOMES } from "@/game/render/overworld";
import { SCENE_H, SCENE_W, SCENES, paintScene } from "@/game/render/scenery";

const FX_COLORS = [0x60a5fa, 0xf97316, 0x4ade80, 0xe879f9];

/** One biome's battle backdrop, painted at 3× (nearest-neighbour). */
function SceneCanvas({ index }: { index: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.putImageData(new ImageData(paintScene(index) as Uint8ClampedArray<ArrayBuffer>, SCENE_W, SCENE_H), 0, 0);
  }, [index]);
  return <canvas ref={ref} width={SCENE_W} height={SCENE_H} className="w-full max-w-[640px] rounded-lg" style={{ imageRendering: "pixelated" }} data-testid={`scene-${index}`} />;
}

/** Plays one animation on a 2D canvas at an integer scale (nearest-neighbour). */
function AnimCanvas({
  def,
  anim,
  scale,
}: {
  def: SpriteDef;
  anim: string;
  scale: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const frames = def.anims[anim].map((f) => frameCanvas(def, f));
    const fps = def.fps?.[anim] ?? 4;
    const g = ref.current!.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    let i = 0;
    const draw = () => {
      g.clearRect(0, 0, def.w * scale, def.h * scale);
      g.drawImage(frames[i], 0, 0, def.w * scale, def.h * scale);
      i = (i + 1) % frames.length;
    };
    draw();
    const id = setInterval(draw, 1000 / fps);
    return () => clearInterval(id);
  }, [def, anim, scale]);
  return (
    <canvas
      ref={ref}
      width={def.w * scale}
      height={def.h * scale}
      className="max-w-full [image-rendering:pixelated]"
      data-testid={`anim-${def.id}-${anim}-${scale}`}
    />
  );
}

/** Browsers allow ~16 live WebGL contexts, so a preview only exists while it is on screen. */
function LazyPixiPreview({ def }: { def: SpriteDef }) {
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined")
      return setSeen(true);
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), {
      rootMargin: "200px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={box} className="min-h-[280px]">
      {seen && <PixiPreview def={def} />}
    </div>
  );
}

/** Live Pixi preview through PixelSprite, the same path the battle stage uses. */
function PixiPreview({ def }: { def: SpriteDef }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ play: (anim: string) => void; hurt: () => void } | null>(
    null,
  );
  useEffect(() => {
    let dead = false;
    let cleanup = () => {};
    (async () => {
      const { Application } = await import("pixi.js");
      const { PixelSprite } = await import("@/game/sprites/texture");
      const app = new Application();
      await app.init({
        width: 320,
        height: 240,
        background: 0x9fd3a8,
        antialias: false,
        preference: "webgl",
      });
      if (dead) return app.destroy(true);
      host.current!.appendChild(app.canvas);
      app.canvas.style.width = "100%";
      app.canvas.style.maxWidth = "320px";
      app.canvas.style.imageRendering = "pixelated";
      const s = new PixelSprite(
        def,
        Math.max(1, Math.min(3, Math.floor(210 / def.h))),
      );
      s.position.set(160, 220);
      app.stage.addChild(s);
      let flash = 0;
      app.ticker.add((tk) => {
        const dt = tk.deltaMS / 1000;
        s.update(dt);
        flash = Math.max(0, flash - dt * 3);
        s.flashAmount = flash > 0 ? (Math.floor(flash * 12) % 2 ? 1 : 0) : 0;
        s.x = 160 + (flash > 0 ? Math.sin(flash * 40) * 4 : 0);
      });
      api.current = {
        play: (anim) => void s.play(anim),
        hurt: () => (flash = 1),
      };
      cleanup = () => app.destroy(true, { children: true });
    })().catch((e) => console.error(e));
    return () => {
      dead = true;
      cleanup();
    };
  }, [def]);
  return (
    <div className="flex flex-col gap-2">
      <div
        ref={host}
        className="overflow-hidden rounded-lg border border-white/10"
        data-testid={`pixi-${def.id}`}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => api.current?.play("attack")}>
          Attack
        </Button>
        <Button size="sm" onClick={() => api.current?.hurt()}>
          Hurt
        </Button>
        {def.anims.evolve && (
          <Button size="sm" onClick={() => api.current?.play("evolve")}>
            Evolve
          </Button>
        )}
      </div>
    </div>
  );
}

/** Dev page for reviewing pixel art: every sprite, every animation, at 1×/2×/4×. */
export default function SpriteViewer() {
  const [bg, setBg] = useState("#9fd3a8");
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-center gap-4">
        <NavLink href="/">← Menu</NavLink>
        <h1 className="font-display text-xl font-bold tracking-[0.25em]">
          SPRITES
        </h1>
        <span className="text-xs text-white/40">
          {SPRITES.length} sprite(s)
        </span>
        <div className="ml-auto flex gap-1">
          {["#9fd3a8", "#f8f4e8", "#1b1030"].map((c) => (
            <button
              key={c}
              aria-label={`background ${c}`}
              onClick={() => setBg(c)}
              className="h-8 w-8 rounded border border-white/20 pointer-coarse:h-11 pointer-coarse:w-11"
              style={{ background: c }}
            />
          ))}
        </div>
      </header>
      <section
        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        data-testid="fx-effects"
      >
        <h2 className="font-display text-lg font-bold tracking-widest">
          MOVE EFFECTS
        </h2>
        <span className="font-mono text-xs text-white/50">
          4 frames each · ramp: outline · shadow · base · light · pale · white,
          built from the spell colour
        </span>
        {FX_KINDS.map((kind) => (
          <div key={kind} className="flex flex-col gap-1">
            <span className="font-mono text-xs uppercase text-white/60">
              {kind}
            </span>
            <div
              className="flex flex-wrap items-end gap-3 rounded-lg p-2"
              style={{ background: bg }}
            >
              {FX_COLORS.map((c) => (
                <AnimCanvas
                  key={c}
                  def={fxSprite(kind, c)}
                  anim="idle"
                  scale={kind === "beam" ? 4 : 3}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4" data-testid="scenes">
        <h2 className="font-display text-lg font-bold tracking-widest">BATTLE SCENES</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {SCENES.map((_, i) => (
            <figure key={i} className="flex flex-col gap-1">
              <SceneCanvas index={i} />
              <figcaption className="font-mono text-xs uppercase text-white/60">
                {i + 1} · {BIOMES[i].name}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
      {SPRITES.map((def) => (
        <section
          key={def.id}
          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          data-testid={`sprite-${def.id}`}
        >
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display text-lg font-bold tracking-widest">
              {def.name}
            </h2>
            <span className="font-mono text-xs text-white/50">
              {def.w}×{def.h} · {Object.keys(def.palette).length} colours ·{" "}
              {Object.entries(def.anims)
                .map(([k, f]) => `${k} ${f.length}f`)
                .join(" · ")}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(def.palette).map(([k, c]) => (
              <span
                key={k}
                title={`${k} ${c}`}
                className="flex h-7 w-7 items-center justify-center rounded font-mono text-[10px] text-white mix-blend-normal [text-shadow:0_0_2px_#000]"
                style={{ background: c }}
              >
                {k}
              </span>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-4">
              {Object.keys(def.anims).map((anim) => (
                <div key={anim} className="flex flex-col gap-1">
                  <span className="font-mono text-xs uppercase text-white/60">
                    {anim}
                  </span>
                  <div
                    className="flex flex-wrap items-end gap-3 rounded-lg p-2"
                    style={{ background: bg }}
                  >
                    {[1, 2, 4].map((s) => (
                      <AnimCanvas key={s} def={def} anim={anim} scale={s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <LazyPixiPreview def={def} />
          </div>
        </section>
      ))}
    </main>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Button, NavLink } from "@/components/ui/kit";
import { SPRITES } from "@/game/sprites";
import type { SpriteDef } from "@/game/sprites/pixel";
import { frameCanvas } from "@/game/sprites/texture";

/** Plays one animation on a 2D canvas at an integer scale (nearest-neighbour). */
function AnimCanvas({ def, anim, scale }: { def: SpriteDef; anim: string; scale: number }) {
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
  return <canvas ref={ref} width={def.w * scale} height={def.h * scale} className="max-w-full [image-rendering:pixelated]" data-testid={`anim-${def.id}-${anim}-${scale}`} />;
}

/** Live Pixi preview through PixelSprite, the same path the battle stage uses. */
function PixiPreview({ def }: { def: SpriteDef }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ attack: () => void; hurt: () => void } | null>(null);
  useEffect(() => {
    let dead = false;
    let cleanup = () => {};
    (async () => {
      const { Application } = await import("pixi.js");
      const { PixelSprite } = await import("@/game/sprites/texture");
      const app = new Application();
      await app.init({ width: 320, height: 240, background: 0x9fd3a8, antialias: false, preference: "webgl" });
      if (dead) return app.destroy(true);
      host.current!.appendChild(app.canvas);
      app.canvas.style.width = "100%";
      app.canvas.style.maxWidth = "320px";
      app.canvas.style.imageRendering = "pixelated";
      const s = new PixelSprite(def, 3);
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
      api.current = { attack: () => void s.play("attack"), hurt: () => (flash = 1) };
      cleanup = () => app.destroy(true, { children: true });
    })().catch((e) => console.error(e));
    return () => {
      dead = true;
      cleanup();
    };
  }, [def]);
  return (
    <div className="flex flex-col gap-2">
      <div ref={host} className="overflow-hidden rounded-lg border border-white/10" data-testid={`pixi-${def.id}`} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => api.current?.attack()}>
          Attack
        </Button>
        <Button size="sm" onClick={() => api.current?.hurt()}>
          Hurt
        </Button>
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
        <h1 className="font-display text-xl font-bold tracking-[0.25em]">SPRITES</h1>
        <span className="text-xs text-white/40">{SPRITES.length} sprite(s)</span>
        <div className="ml-auto flex gap-1">
          {["#9fd3a8", "#f8f4e8", "#1b1030"].map((c) => (
            <button key={c} aria-label={`background ${c}`} onClick={() => setBg(c)} className="h-8 w-8 rounded border border-white/20 pointer-coarse:h-11 pointer-coarse:w-11" style={{ background: c }} />
          ))}
        </div>
      </header>
      {SPRITES.map((def) => (
        <section key={def.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4" data-testid={`sprite-${def.id}`}>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display text-lg font-bold tracking-widest">{def.name}</h2>
            <span className="font-mono text-xs text-white/50">
              {def.w}×{def.h} · {Object.keys(def.palette).length} colours · {Object.entries(def.anims).map(([k, f]) => `${k} ${f.length}f`).join(" · ")}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(def.palette).map(([k, c]) => (
              <span key={k} title={`${k} ${c}`} className="flex h-7 w-7 items-center justify-center rounded font-mono text-[10px] text-white mix-blend-normal [text-shadow:0_0_2px_#000]" style={{ background: c }}>
                {k}
              </span>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-4">
              {Object.keys(def.anims).map((anim) => (
                <div key={anim} className="flex flex-col gap-1">
                  <span className="font-mono text-xs uppercase text-white/60">{anim}</span>
                  <div className="flex flex-wrap items-end gap-3 rounded-lg p-2" style={{ background: bg }}>
                    {[1, 2, 4].map((s) => (
                      <AnimCanvas key={s} def={def} anim={anim} scale={s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <PixiPreview def={def} />
          </div>
        </section>
      ))}
    </main>
  );
}

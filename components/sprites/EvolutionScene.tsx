"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { sfx } from "@/game/audio/synth";
import { evolutionTimeline } from "@/game/sprites/evolution";
import { frameToRGBA } from "@/game/sprites/pixel";
import type { SpriteDef } from "@/game/sprites/pixel";

/**
 * "BYTEBAT is evolving…": plays the evolution timeline once on a 2D
 * canvas (nearest-neighbour), then idles in the new form. Reduced motion
 * skips straight to the result.
 */
export function EvolutionScene({ from, to, scale = 2, reducedMotion }: { from: SpriteDef; to: SpriteDef; scale?: number; reducedMotion?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const steps = useMemo(() => evolutionTimeline(from, to), [from, to]);
  const [done, setDone] = useState(!!reducedMotion);

  useEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    const tmp = document.createElement("canvas");
    tmp.width = from.w;
    tmp.height = from.h;
    const draw = (def: SpriteDef, frame: readonly string[]) => {
      tmp.getContext("2d")!.putImageData(new ImageData(frameToRGBA(def, frame) as Uint8ClampedArray<ArrayBuffer>, def.w, def.h), 0, 0);
      g.clearRect(0, 0, from.w * scale, from.h * scale);
      g.drawImage(tmp, 0, 0, from.w * scale, from.h * scale);
    };
    let timer: ReturnType<typeof setTimeout>;
    const idle = (i: number) => {
      const frames = to.anims.idle;
      draw(to, frames[i % frames.length]);
      timer = setTimeout(() => idle(i + 1), 1000 / (to.fps?.idle ?? 4));
    };
    if (reducedMotion) {
      idle(0);
      return () => clearTimeout(timer);
    }
    const play = (i: number) => {
      if (i >= steps.length) {
        setDone(true);
        sfx.evolved();
        idle(0);
        return;
      }
      const st = steps[i];
      if (st.beat === "glow" && steps[i - 1]?.beat === "before") sfx.evolving();
      draw(st.def, st.frame);
      timer = setTimeout(() => play(i + 1), st.ms);
    };
    play(0);
    return () => clearTimeout(timer);
  }, [steps, from, to, scale, reducedMotion]);

  return (
    <div className="mx-auto mt-4 flex max-w-sm flex-col items-center gap-2 rounded-lg border border-sky-300/30 bg-sky-300/[0.06] p-3" data-testid="evolution" data-done={done}>
      <span className={`dex-screen flex items-end justify-center overflow-hidden ${done ? "" : "evolve-glow"}`}>
        <canvas ref={ref} width={from.w * scale} height={from.h * scale} role="img" aria-label={done ? to.name : from.name} className="[image-rendering:pixelated]" />
      </span>
      <p className="text-sm text-white/80" aria-live="polite">
        {done ? (
          <>
            <b className="text-sky-300">{from.name}</b> evolved into <b className="text-amber-300">{to.name}</b>!
          </>
        ) : (
          <>
            <b className="text-sky-300">{from.name}</b> is evolving…
          </>
        )}
      </p>
    </div>
  );
}

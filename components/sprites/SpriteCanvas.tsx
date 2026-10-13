"use client";
import { useEffect, useRef } from "react";
import { SpriteDef, frameToRGBA, hexToRgb } from "@/game/sprites/pixel";

/**
 * Plays one sprite animation on a 2D canvas at an integer scale
 * (nearest-neighbour), without Pixi. `silhouette` paints every pixel one
 * colour, for creatures you have not met yet.
 */
export function SpriteCanvas({ def, anim = "idle", scale, silhouette, className = "", label }: { def: SpriteDef; anim?: string; scale: number; silhouette?: string; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const recolor = silhouette ? () => hexToRgb(silhouette) : undefined;
    const frames = (def.anims[anim] ?? def.anims.idle).map((f) => {
      const c = document.createElement("canvas");
      c.width = def.w;
      c.height = def.h;
      c.getContext("2d")!.putImageData(new ImageData(frameToRGBA(def, f, recolor) as Uint8ClampedArray<ArrayBuffer>, def.w, def.h), 0, 0);
      return c;
    });
    const g = ref.current!.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    let i = 0;
    const draw = () => {
      g.clearRect(0, 0, def.w * scale, def.h * scale);
      g.drawImage(frames[i], 0, 0, def.w * scale, def.h * scale);
      i = (i + 1) % frames.length;
    };
    draw();
    // a silhouette holds still: only met creatures move
    if (silhouette || frames.length < 2) return;
    const id = setInterval(draw, 1000 / (def.fps?.[anim] ?? 4));
    return () => clearInterval(id);
  }, [def, anim, scale, silhouette]);
  return <canvas ref={ref} width={def.w * scale} height={def.h * scale} role="img" aria-label={label ?? def.name} className={`max-w-full [image-rendering:pixelated] ${className}`} />;
}

"use client";
import { useEffect, useRef } from "react";
import { MAP_H, MAP_W, paintOverworld } from "@/game/render/overworld";

/** The campaign's pixel overworld, painted once per unlock level and scaled up nearest-neighbour. */
export function OverworldMap({ unlocked, className = "" }: { unlocked: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.putImageData(new ImageData(paintOverworld(unlocked) as Uint8ClampedArray<ArrayBuffer>, MAP_W, MAP_H), 0, 0);
  }, [unlocked]);
  return <canvas ref={ref} width={MAP_W} height={MAP_H} aria-hidden className={`[image-rendering:pixelated] ${className}`} />;
}

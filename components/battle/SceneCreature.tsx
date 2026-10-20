"use client";
import type { CSSProperties } from "react";
import { SpriteCanvas } from "@/components/sprites/SpriteCanvas";
import type { SpriteDef } from "@/game/sprites/pixel";
import { PLATFORM_STONE } from "@/game/sprites/ui";

/** A creature on its stone platform: standing and animated, or knocked over as a dark still. */
export function SceneCreature({ def, pose, flip }: { def: SpriteDef; pose: "stand" | "fainted"; flip: boolean }) {
  const fainted = pose === "fainted";
  return (
    <div className="flex min-w-0 flex-col items-center" data-pose={pose}>
      {/* drawn at 1×, shown at 1× on phones and an exact 2× from sm up */}
      <div className={`flex h-24 items-end justify-center sm:h-48 ${fainted ? "opacity-70" : ""}`} style={{ transform: fainted ? `translateY(18%) rotate(${flip ? -90 : 90}deg) scale(0.8)` : flip ? "scaleX(-1)" : undefined }}>
        <SpriteCanvas def={def} scale={1} silhouette={fainted ? "#3d4466" : undefined} label={`${def.name}${fainted ? " (fainted)" : ""}`} className="w-[var(--w)] sm:w-[calc(var(--w)*2)]" style={{ "--w": `${def.w}px` } as CSSProperties} />
      </div>
      <span className="-mt-2 sm:-mt-4">
        <SpriteCanvas def={PLATFORM_STONE} scale={1} label="" className="block w-24 sm:w-48" />
      </span>
    </div>
  );
}

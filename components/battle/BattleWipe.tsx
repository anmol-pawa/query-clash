"use client";
import { useEffect, useRef, useState } from "react";
import { WIPE, WIPE_MS, bandCover, bandFromLeft, blockScale, flashAlpha, wipeGrid } from "@/game/render/wipe";

const DARK = "#0e0f1a";
const EDGE = "#2b2d4a";

/**
 * Battle-start screen wipe: encounter flashes, bands sweeping shut, then a
 * diagonal block dissolve that reveals the battle. Plays once on mount
 * (remount it with a `key` to replay), never blocks input, and renders
 * nothing under reduced motion.
 */
export function BattleWipe({ reducedMotion, accent = "#5eead4" }: { reducedMotion: boolean; accent?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);
  const skip = reducedMotion || (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (skip) return;
    const c = ref.current!;
    const g = c.getContext("2d")!;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.ceil(w * dpr);
    c.height = Math.ceil(h * dpr);
    g.scale(dpr, dpr);
    const grid = wipeGrid(w, h);
    const bandH = Math.ceil(h / WIPE.bands);
    const t0 = performance.now();
    let raf = 0;

    const draw = () => {
      const t = performance.now() - t0;
      g.clearRect(0, 0, w, h);
      if (t < WIPE.revealStart) {
        for (let i = 0; i < WIPE.bands; i++) {
          const bw = Math.round(bandCover(t, i) * w);
          if (!bw) continue;
          const x = bandFromLeft(i) ? 0 : w - bw;
          const y = i * bandH;
          g.fillStyle = DARK;
          g.fillRect(x, y, bw, bandH);
          // pixel trim: a lit inner row and an accent leading edge
          g.fillStyle = EDGE;
          g.fillRect(x, y + bandH - 4, bw, 4);
          if (bw < w) {
            g.fillStyle = accent;
            g.fillRect(bandFromLeft(i) ? bw - 6 : x, y, 6, bandH);
          }
        }
      } else {
        g.fillStyle = DARK;
        for (let r = 0; r < grid.rows; r++) {
          for (let col = 0; col < grid.cols; col++) {
            const s = blockScale(t, col, r, grid.cols, grid.rows);
            if (!s) continue;
            const side = Math.ceil(grid.size * s);
            const off = Math.floor((grid.size - side) / 2);
            g.fillRect(col * grid.size + off, r * grid.size + off, side, side);
          }
        }
      }
      const f = flashAlpha(t);
      if (f) {
        g.fillStyle = `rgba(255,255,255,${f})`;
        g.fillRect(0, 0, w, h);
      }
      if (t < WIPE_MS) raf = requestAnimationFrame(draw);
      else setDone(true);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [skip, accent]);

  if (skip || done) return null;
  return <canvas ref={ref} aria-hidden data-testid="battle-wipe" className="pointer-events-none fixed inset-0 z-[70] h-full w-full" style={{ imageRendering: "pixelated" }} />;
}

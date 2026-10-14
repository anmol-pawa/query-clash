"use client";
import { sfx } from "@/game/audio/synth";

/** SQL characters that are buried two keyboard pages deep on iOS/Android. */
const KEYS = ["*", ",", "(", ")", "=", "'", "<", ">", "<>", "_", ".", ";", "%"];

/** Touch-only row of one-tap symbols; inserts at the editor cursor. */
export function SymbolBar({ onInsert }: { onInsert: (s: string) => void }) {
  return (
    <div className="hidden gap-1.5 overflow-x-auto pb-1 scroll-thin pointer-coarse:flex" aria-label="Insert symbol">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => {
            sfx.click();
            onInsert(k === "," ? ", " : k);
          }}
          className="px-key min-w-10 shrink-0 px-2.5 py-2 font-mono text-base font-bold text-white/90"
        >
          {k}
        </button>
      ))}
    </div>
  );
}

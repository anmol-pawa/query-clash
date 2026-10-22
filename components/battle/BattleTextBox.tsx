"use client";
import { useEffect, useState } from "react";
import { typed, typeDuration } from "@/game/engine/battleText";

/** A batch of lines to type out; a new `id` replaces whatever was showing. */
export interface BattleMessage {
  id: number;
  lines: string[];
  /** `performance.now()` when the message was posted; typing starts then. */
  at: number;
}

const HOLD_MS = 650;

/**
 * The handheld-console text box under the battle stage. It types each line of
 * the current message out, holds it briefly, then moves to the next; the last
 * line stays until a new message arrives. Tapping finishes the line being typed
 * or skips to the next one.
 */
export function BattleTextBox({ message, instant = false, className = "" }: { message: BattleMessage | null; instant?: boolean; className?: string }) {
  const [pos, setPos] = useState({ id: -1, idx: 0, start: 0 });
  const [now, setNow] = useState(0);
  const lines = message?.lines ?? [];
  const cur = message && pos.id === message.id ? pos : { id: message?.id ?? -1, idx: 0, start: message?.at ?? 0 };
  const line = lines[cur.idx] ?? "";
  const elapsed = instant ? Infinity : now - cur.start;
  const done = elapsed >= typeDuration(line);
  const more = cur.idx < lines.length - 1;

  // a new message starts again from its first line (see `cur`); drive the typewriter, then auto-advance to the next line
  useEffect(() => {
    if (!message || (done && !more)) return;
    const id = setInterval(() => setNow(performance.now()), 30);
    return () => clearInterval(id);
  }, [message, done, more]);

  useEffect(() => {
    if (!done || !more) return;
    const next = { id: cur.id, idx: cur.idx + 1 };
    const id = setTimeout(() => setPos({ ...next, start: performance.now() }), instant ? HOLD_MS * 1.5 : HOLD_MS);
    return () => clearTimeout(id);
  }, [done, more, instant, cur.id, cur.idx]);

  const advance = () => {
    if (!message) return;
    const t = performance.now();
    if (!done) setPos({ ...cur, start: t - typeDuration(line) });
    else if (more) setPos({ ...cur, idx: cur.idx + 1, start: t });
    setNow(t);
  };

  return (
    <>
    {/* screen readers get the whole message at once; the typewriter below is visual only */}
    <p className="sr-only" role="status" aria-live="polite" data-testid="battle-live">
      {lines.join(" ")}
    </p>
    <button
      type="button"
      onClick={advance}
      data-testid="battle-text"
      aria-label="Next line"
      className={`relative block w-full select-none border-[3px] border-[#2a2c3a] bg-[#2f3a64] p-[3px] text-left font-mono ${className}`}
      style={{ borderRadius: 6, boxShadow: "0 3px 0 rgba(0,0,0,0.45)" }}
    >
      <div className="relative min-h-[44px] rounded-[3px] border-2 border-[#d8a840] bg-[#f6f2d8] px-3 py-1.5 sm:min-h-[48px]" style={{ boxShadow: "inset 0 0 0 2px #fffdf0, inset 0 -3px 0 2px #d8d0a8" }}>
        {/* the full line reserves the space so the box doesn't jump while typing */}
        <span className="invisible block pr-4 text-[13px] font-bold leading-snug sm:text-[15px]" aria-hidden>
          {line || " "}
        </span>
        <span className="absolute inset-x-3 top-1.5 block pr-4 text-[13px] font-bold leading-snug text-[#2a2c3a] sm:text-[15px]" data-line={line}>
          {typed(line, elapsed)}
        </span>
        {done && more && <span className="absolute bottom-1 right-2 animate-bounce text-[10px] leading-none text-[#e05030]">▼</span>}
      </div>
    </button>
    </>
  );
}

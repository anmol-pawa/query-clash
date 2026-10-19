"use client";
import { useEffect, useRef, useState } from "react";
import { StageHandle, StageView } from "@/components/battle/StageView";
import { SpriteCanvas } from "@/components/sprites/SpriteCanvas";
import { Button, NavLink } from "@/components/ui/kit";
import { CHAPTERS } from "@/content/chapters";
import { sfx } from "@/game/audio/synth";
import { bossSprite } from "@/game/sprites/roster";
import { ATTACKS, AttackKind } from "@/lib/dialect/concepts";
import { useSave } from "@/lib/save";
import { pixelFamily } from "../fonts";

const SPELL_SOURCE: Record<AttackKind, string> = {
  bolt: "WHERE / basic SELECT",
  chain: "JOIN",
  slam: "GROUP BY, aggregates",
  surge: "INSERT / UPDATE / DELETE",
  shield: "COMMIT / ROLLBACK / SAVEPOINT",
  forge: "CREATE / ALTER / constraints",
  mirror: "Subqueries, EXISTS",
  fusion: "UNION / INTERSECT / EXCEPT",
  haste: "CREATE INDEX / EXPLAIN",
  summon: "WITH (CTEs), recursion",
  blade: "Window functions (OVER)",
  storm: "MERGE / ON CONFLICT",
  vortex: "PIVOT / FILTER",
  lance: "JSON functions",
};

/** Meet the bosses and preview every spell's animation. */
export default function BestiaryPage() {
  const save = useSave();
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const stage = useRef<StageHandle>(null);
  const ch = CHAPTERS[idx];

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", ch.color);
  }, [ch.color]);

  async function play(fn: () => Promise<void> | undefined) {
    if (busy) return;
    sfx.unlock();
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NavLink href="/">← Menu</NavLink>
        <h1 className="px-shadow font-display text-2xl tracking-[0.2em]">BESTIARY</h1>
        <span className="font-display text-xs text-white/45">Every boss, every spell</span>
      </header>
      <div role="tablist" aria-label="Bosses" className="px-tray flex gap-1.5 overflow-x-auto p-2 scroll-thin" data-testid="boss-tabs">
        {CHAPTERS.map((c, i) => (
          <button
            key={c.boss}
            role="tab"
            aria-selected={i === idx}
            onClick={() => {
              sfx.click();
              setIdx(i);
            }}
            className="px-tab flex shrink-0 items-center gap-1.5 py-1 pr-2.5 pl-1.5 text-xs uppercase tracking-wide"
            style={{ "--tab": c.color } as React.CSSProperties}
          >
            <SpriteCanvas def={bossSprite(c.boss)} scale={1} className="h-8 w-8" label="" />
            <span className="opacity-60">{String(i + 1).padStart(2, "0")}</span>
            {c.bossName}
          </button>
        ))}
      </div>
      <div className="px-window relative h-[46vh] min-h-[280px] overflow-hidden p-[5px]">
        <div className="relative h-full w-full overflow-hidden rounded-[2px]">
          <StageView key={ch.boss} ref={stage} boss={ch.boss} accent={ch.color} reducedMotion={save.settings.reducedMotion} font={pixelFamily} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="px-window p-4">
          <div className="px-box-title text-xs text-white/60">Your spells · tap to preview</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Object.values(ATTACKS).map((a) => {
              const hex = "#" + a.color.toString(16).padStart(6, "0");
              return (
                <button
                  key={a.kind}
                  data-attack={a.kind}
                  disabled={busy}
                  onClick={() => play(() => stage.current?.stage()?.attack("left", a.kind, a.color, 80 + a.tier * 30, a.tier >= 4, false))}
                  className="px-card px-2.5 pt-3 pb-2 text-left disabled:opacity-50"
                  style={{ "--card": hex } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="font-display text-xs tracking-wider" style={{ color: hex }}>
                      {a.name}
                    </div>
                    <span className="font-display text-[10px] whitespace-nowrap text-white/40">T{a.tier}</span>
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-white/55">{SPELL_SOURCE[a.kind]}</div>
                </button>
              );
            })}
          </div>
        </section>
        <aside className="px-window flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="dex-screen grid h-[72px] w-[72px] shrink-0 place-items-center">
              <SpriteCanvas key={ch.boss} def={bossSprite(ch.boss)} scale={1} className="h-16 w-16" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-xs text-white/45">No.{String(idx + 1).padStart(3, "0")}</div>
              <div className="px-shadow font-display text-lg tracking-wide" style={{ color: ch.color }}>
                {ch.bossName}
              </div>
              <div className="font-display text-[11px] tracking-[0.12em] text-white/50 uppercase">{ch.bossTitle}</div>
            </div>
          </div>
          <div className="px-box p-3 text-sm leading-relaxed text-white/70" style={{ "--tone": ch.color } as React.CSSProperties}>
            {ch.intro}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ch.topics.slice(0, 4).map((t) => (
              <span key={t} className="px-tag text-[10px]" style={{ "--tone": ch.color } as React.CSSProperties}>
                {t}
              </span>
            ))}
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button variant="primary" size="sm" disabled={busy} onClick={() => play(() => stage.current?.stage()?.counter("right", 12))}>
              Boss attack
            </Button>
            <Button size="sm" disabled={busy} onClick={() => play(() => stage.current?.stage()?.attack("left", "vortex", 0xfde047, 999, true, true))}>
              Finisher
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}

"use client";
import { useState } from "react";
import { TypeTag } from "@/components/battle/HpBox";
import { SpriteCanvas } from "@/components/sprites/SpriteCanvas";
import { LinkButton, NavLink } from "@/components/ui/kit";
import { CHAPTERS } from "@/content/chapters";
import type { BossId } from "@/content/types";
import { sfx } from "@/game/audio/synth";
import { levelFor, xpProgress } from "@/game/engine/hud";
import { EVOLVE_AFTER, caughtCount, dexStats } from "@/game/engine/querydex";
import { STARTER_LINE, bossSprite, starterSprite, starterStageOf } from "@/game/sprites/roster";
import { useSave } from "@/lib/save";

const SILHOUETTE = "#1c1f2e";

/** The Querydex: your starter plus a box of every boss you have captured. */
export default function QuerydexPage() {
  const save = useSave();
  const [sel, setSel] = useState<BossId>(CHAPTERS[0].boss);
  const stage = starterStageOf(save.dex);
  const starter = starterSprite("front", stage);
  // the next milestone, if a later form is drawn
  const nextAt = stage + 1 < STARTER_LINE.length ? CHAPTERS.find((c) => c.n === EVOLVE_AFTER[stage]) : undefined;
  const lvl = levelFor(save.xp);
  const caught = save.dex[sel];
  const st = dexStats(sel);
  const def = bossSprite(sel);

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-center gap-4">
        <NavLink href="/">← Menu</NavLink>
        <h1 className="font-display text-xl font-bold tracking-[0.25em]">QUERYDEX</h1>
        <span className="text-xs text-white/40" data-testid="dex-count">
          Captured {caughtCount(save.dex)}/{CHAPTERS.length}
        </span>
      </header>

      {/* party */}
      <section className="dex-frame flex items-center gap-4 p-3" data-testid="dex-party" data-stage={stage}>
        <div className="dex-screen flex h-[88px] w-[88px] shrink-0 items-end justify-center">
          <SpriteCanvas def={starter} scale={1} className="h-[80px] w-[80px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">Party · starter</div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold tracking-wider">{starter.name}</span>
            <span className="font-mono text-sm text-white/70">Lv{lvl}</span>
          </div>
          <div className="mt-1 h-2 max-w-[220px] overflow-hidden rounded-sm border border-black/40 bg-black/40">
            <div className="h-full bg-sky-400" style={{ width: `${Math.round(xpProgress(save.xp) * 100)}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-white/50">{save.xp} XP · learns every spell your SQL can cast</div>
          <div className="mt-0.5 text-[11px] text-sky-300/80" data-testid="dex-evolve">
            {stage > 0 && <>Evolved from {starterSprite("front", stage - 1).name}. </>}
            {nextAt ? <>Evolves after capturing {bossSprite(nextAt.boss).name} (chapter {nextAt.n}).</> : stage > 0 ? null : <>Evolves at chapter milestones.</>}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-[1fr_340px]">
        {/* box */}
        <section className="dex-frame p-3" data-testid="dex-box">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">Box 1 · chapter bosses</span>
            <span className="hidden font-mono text-[10px] text-white/40 sm:inline">beat a boss to capture it</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {CHAPTERS.map((c) => {
              const got = !!save.dex[c.boss];
              const active = c.boss === sel;
              return (
                <button
                  key={c.boss}
                  data-boss={c.boss}
                  data-caught={got}
                  aria-pressed={active}
                  aria-label={got ? bossSprite(c.boss).name : `No. ${String(c.n).padStart(3, "0")} unknown`}
                  onClick={() => {
                    sfx.click();
                    setSel(c.boss);
                    // on phones the entry sits below the box
                    if (window.matchMedia("(max-width: 767px)").matches) document.querySelector("[data-testid=dex-entry]")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`dex-slot flex flex-col items-center gap-1 p-1.5 ${active ? "dex-slot-active" : ""}`}
                >
                  <span className="dex-screen flex aspect-square w-full items-end justify-center overflow-hidden">
                    <SpriteCanvas def={bossSprite(c.boss)} scale={1} silhouette={got ? undefined : SILHOUETTE} className="w-full" />
                  </span>
                  <span className="w-full truncate text-center font-mono text-[10px] text-white/70">
                    {String(c.n).padStart(3, "0")} {got ? bossSprite(c.boss).name : "???"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* entry */}
        <aside className="dex-frame flex flex-col gap-3 p-3" data-testid="dex-entry">
          <div className="dex-screen flex h-[200px] items-end justify-center">
            <SpriteCanvas key={sel + String(!!caught)} def={def} scale={2} silhouette={caught ? undefined : SILHOUETTE} className="h-[192px] w-[192px]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-white/50">No.{st.no}</span>
            <span className="font-display text-lg font-bold tracking-wider" data-testid="dex-name">
              {caught ? def.name : "???"}
            </span>
            {caught && <TypeTag type={st.type} className="ml-auto !text-[10px] !leading-[14px]" />}
          </div>
          {caught ? (
            <>
              <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                {st.chapter.bossTitle} · Ch.{st.chapter.n} {st.chapter.title}
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Lv", st.level],
                  ["HP", st.hp],
                  ["Wins", caught.wins],
                ].map(([k, v]) => (
                  <div key={k} className="rounded border border-white/10 bg-black/25 py-1.5">
                    <dt className="text-[10px] uppercase tracking-widest text-white/40">{k}</dt>
                    <dd className="font-mono text-base font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="text-sm text-amber-300" aria-label={`best ${save.stars[st.chapter.n] ?? 0} stars`}>
                {[1, 2, 3].map((i) => (i <= (save.stars[st.chapter.n] ?? 0) ? "★" : "☆")).join("")}
                <span className="ml-2 text-[11px] text-white/45">{caught.caught ? `caught ${caught.caught}` : "caught before the Querydex"}</span>
              </div>
              <Matchups label="Weak to" list={st.weak} />
              <Matchups label="Resists" list={st.resist} />
            </>
          ) : (
            <>
              <p className="text-sm text-white/55">Not captured yet. Defeat the boss of chapter {st.chapter.n} ({st.chapter.title}) to register it.</p>
              <LinkButton href={`/battle/${st.chapter.n}`} variant="primary" size="sm">
                Battle chapter {st.chapter.n} →
              </LinkButton>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

function Matchups({ label, list }: { label: string; list: ReturnType<typeof dexStats>["weak"] }) {
  if (!list.length) return null;
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">{label}</div>
      <ul className="mt-1 flex flex-col gap-1">
        {list.map((m) => (
          <li key={m.type} className="flex items-start gap-2 text-[12px] leading-snug text-white/65">
            <TypeTag type={m.type} className="mt-[2px]" />
            <span>{m.why}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

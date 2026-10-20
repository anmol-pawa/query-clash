"use client";
import { useEffect, useMemo, useState } from "react";
import { DIFFICULTY_COLOR, DIFFICULTY_FILTERS, DIFFICULTY_LABEL, DifficultyFilter, KIND_LABEL, kindCounts, overallProgress, topicRows } from "@/components/menu/interviewList";
import { SpriteCanvas } from "@/components/sprites/SpriteCanvas";
import { Button, NavLink } from "@/components/ui/kit";
import { GENERATORS, QUESTIONS, TOPICS } from "@/content/interview";
import type { TopicId } from "@/content/interview/types";
import { sfx } from "@/game/audio/synth";
import { bossSprite } from "@/game/sprites/roster";
import { useSave } from "@/lib/save";

const ACCENT = "#60a5fa";
const SILHOUETTE = "#2a2f4f";
const tone = (c: string) => ({ "--tone": c }) as React.CSSProperties;

export default function InterviewPage() {
  const save = useSave();
  const [diff, setDiff] = useState<DifficultyFilter>("all");
  const [sel, setSel] = useState<TopicId>("basics");

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", ACCENT);
  }, []);

  const rows = useMemo(() => topicRows(TOPICS, QUESTIONS, GENERATORS, save.interview, diff), [save.interview, diff]);
  const overall = useMemo(() => overallProgress(QUESTIONS, save.interview), [save.interview]);
  const row = rows.find((r) => r.topic.id === sel)!;
  const kinds = kindCounts(QUESTIONS, sel);
  const asked = QUESTIONS.find((q) => q.topic === sel && q.askedAt)?.askedAt;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <NavLink href="/">← Menu</NavLink>
        <h1 className="px-shadow font-display text-2xl tracking-[0.2em]">DBMS INTERVIEW</h1>
        <span className="px-tag text-[11px]" style={tone(ACCENT)} data-testid="interview-count">
          {overall.got}/{overall.total} solved
        </span>
      </header>
      <p className="mt-2 max-w-2xl text-sm text-white/60">Pick a topic and battle its guardian. A right answer is your attack; a wrong one lets the foe strike, and you get the explanation.</p>

      <div role="tablist" aria-label="Difficulty" className="px-tray mt-4 flex gap-1.5 overflow-x-auto p-2 scroll-thin">
        {DIFFICULTY_FILTERS.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={diff === d}
            onClick={() => {
              sfx.click();
              setDiff(d);
            }}
            className="px-tab shrink-0 px-2 py-1 text-xs uppercase tracking-wide pointer-coarse:py-2"
            style={{ "--tab": DIFFICULTY_COLOR[d] } as React.CSSProperties}
          >
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <ul className="grid gap-2.5 sm:grid-cols-2" data-testid="topic-list">
          {rows.map((r, i) => {
            const on = r.topic.id === sel;
            const pct = r.total ? Math.round((r.solved / r.total) * 100) : 0;
            return (
              <li key={r.topic.id}>
                <button
                  data-topic={r.topic.id}
                  aria-pressed={on}
                  onClick={() => {
                    sfx.click();
                    setSel(r.topic.id);
                    // on phones the panel sits under the list: bring it into view
                    if (window.matchMedia("(max-width: 1023px)").matches) document.querySelector('[data-testid="topic-panel"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`px-row flex w-full items-center gap-3 py-2.5 pr-3 pl-4 text-left ${on ? "px-row-open" : ""} ${r.playable ? "" : "px-row-locked"}`}
                  style={{ "--card": r.topic.color } as React.CSSProperties}
                >
                  <span className="dex-screen flex h-12 w-12 shrink-0 items-end justify-center overflow-hidden">
                    <SpriteCanvas def={bossSprite(r.topic.foe)} scale={1} silhouette={r.playable ? undefined : SILHOUETTE} className="w-full" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[11px] tracking-[0.15em] uppercase" style={{ color: r.playable ? r.topic.color : "#8b90b8" }}>
                      Topic {i + 1}
                    </span>
                    <span className="block truncate font-display text-sm text-white">{r.topic.title}</span>
                    {r.playable ? (
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-2 flex-1 overflow-hidden rounded-[2px] border-2 border-[#0e0f1a] bg-[#090a14]">
                          <span className="block h-full" style={{ width: `${pct}%`, background: r.topic.color }} />
                        </span>
                        <span className="font-mono text-[11px] text-white/60">
                          {r.solved}/{r.total}
                          {r.generators > 0 && " +∞"}
                        </span>
                      </span>
                    ) : (
                      <span className="px-tag mt-1 text-[10px]" style={tone("#8b90b8")}>
                        Coming soon
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <aside className="px-window self-start p-4" data-testid="topic-panel" data-topic={sel} style={{ "--accent": row.topic.color } as React.CSSProperties}>
          <div className="dex-screen flex h-[150px] items-end justify-center overflow-hidden">
            <SpriteCanvas def={bossSprite(row.topic.foe)} scale={1} silhouette={row.playable ? undefined : SILHOUETTE} className="h-[128px] w-[128px]" label={bossSprite(row.topic.foe).name} />
          </div>
          <div className="mt-3 font-display text-[11px] tracking-[0.15em] uppercase" style={{ color: row.topic.color }}>
            Guardian · {row.playable ? bossSprite(row.topic.foe).name : "?????"}
          </div>
          <h2 className="font-display text-lg">{row.topic.title}</h2>
          <div className="px-box mt-2 p-2.5 text-sm text-white/75" style={tone(row.topic.color)}>
            {row.topic.blurb}
          </div>
          {row.playable ? (
            <>
              <ul className="mt-3 space-y-1 text-xs text-white/70">
                {Object.entries(kinds).map(([k, n]) => (
                  <li key={k} className="flex justify-between gap-2 border-b border-dotted border-white/15 pb-0.5">
                    <span>{KIND_LABEL[k as keyof typeof KIND_LABEL]}</span>
                    <span className="font-mono">{n}</span>
                  </li>
                ))}
                {row.generators > 0 && (
                  <li className="flex justify-between gap-2 border-b border-dotted border-white/15 pb-0.5">
                    <span>Generated problems</span>
                    <span className="font-mono">∞</span>
                  </li>
                )}
              </ul>
              {asked && <p className="mt-2 text-[11px] text-white/45">▸ {asked}</p>}
              <Button variant="primary" size="lg" disabled className="mt-4 w-full" title="Interview battles arrive with the next update">
                Battle: coming next update
              </Button>
            </>
          ) : (
            <p className="mt-3 text-xs text-white/50">This topic&apos;s questions are still being written.</p>
          )}
        </aside>
      </div>
    </main>
  );
}

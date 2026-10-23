"use client";
import { useEffect, useMemo, useState } from "react";
import { CATEGORY_COLOR, CodexCategory, categoryProgress, codexCategories, entryState, filterCodex, lockedTitle } from "@/components/menu/codexList";
import { CodeBlock, NavLink } from "@/components/ui/kit";
import { CODEX } from "@/content/codex";
import type { CodexEntry } from "@/content/types";
import { sfx } from "@/game/audio/synth";
import { updateSave, useSave } from "@/lib/save";

const CATS = codexCategories(CODEX);
const ALL_COLOR = "#a78bfa";
const tabColor = (c: string) => CATEGORY_COLOR[c as CodexCategory] ?? ALL_COLOR;
const tone = (c: string) => ({ "--tone": c }) as React.CSSProperties;

export default function CodexPage() {
  const save = useSave();
  const [cat, setCat] = useState<string>("All");
  const [q, setQ] = useState("");
  const [study, setStudy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", ALL_COLOR);
    // Deep link from an interview explanation: /codex?entry=<id> opens that entry in study mode.
    const entry = new URLSearchParams(window.location.search).get("entry");
    if (entry && CODEX.some((e) => e.id === entry)) {
      requestAnimationFrame(() => {
        setStudy(true);
        setOpen(entry);
        requestAnimationFrame(() => document.querySelector(`[data-entry="${entry}"]`)?.scrollIntoView({ block: "center" }));
      });
    }
  }, []);

  const list = useMemo(() => filterCodex(CODEX, cat, q), [cat, q]);
  const progress = useMemo(() => categoryProgress(CODEX, save.codex), [save.codex]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <NavLink href="/">← Menu</NavLink>
        <h1 className="px-shadow font-display text-2xl tracking-[0.2em]">CODEX</h1>
        <span className="px-tag text-[11px]" style={tone(ALL_COLOR)} data-testid="codex-count">
          {save.codex.length}/{CODEX.length} unlocked
        </span>
        <span className="px-tag text-[11px]" style={tone("#fde047")}>
          ★ {save.quizzes.length} mastered
        </span>
        <button
          aria-pressed={study}
          onClick={() => {
            sfx.click();
            setStudy(!study);
          }}
          className="px-tab ml-auto px-2.5 py-1.5 text-xs uppercase tracking-wide pointer-coarse:py-2.5"
          style={{ "--tab": "#38bdf8" } as React.CSSProperties}
        >
          {study ? "■" : "□"} Study mode
        </button>
      </header>

      <div className="px-tray mt-4 flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Categories" className="flex gap-1.5 overflow-x-auto pb-1 scroll-thin sm:flex-wrap sm:pb-0">
          {CATS.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={cat === c}
              onClick={() => {
                sfx.click();
                setCat(c);
              }}
              className="px-tab shrink-0 px-2 py-1 text-xs uppercase tracking-wide pointer-coarse:py-2"
              style={{ "--tab": tabColor(c) } as React.CSSProperties}
            >
              {c} <span className="opacity-60">{progress[c].got}/{progress[c].total}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 sm:ml-auto">
          <span className="font-display text-xs text-white/50">FIND</span>
          {/* 16px text so iOS does not zoom in on focus */}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full min-w-0 rounded-[3px] border-2 border-[#0e0f1a] bg-[#090a14] px-2 py-1 text-base shadow-[inset_0_0_0_2px_#2a2f4f] outline-none focus:shadow-[inset_0_0_0_2px_var(--accent)] sm:w-48 sm:text-sm"
          />
        </label>
      </div>

      {list.length === 0 && (
        <div className="px-box mt-4 p-4 text-sm" style={tone("#8b90b8")}>
          <div className="px-box-title text-sm">No entries</div>
          <p className="mt-1 text-white/65">Nothing in {cat === "All" ? "the Codex" : cat} matches “{q}”.</p>
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2" data-testid="codex-list">
        {list.map((e) => {
          const state = entryState(e.id, save, study);
          const locked = state === "locked";
          const isOpen = open === e.id && !locked;
          return (
            <div key={e.id} data-entry={e.id} className={`px-row overflow-hidden ${locked ? "px-row-locked" : ""} ${isOpen ? "px-row-open md:col-span-2" : ""}`} style={{ "--card": CATEGORY_COLOR[e.category] } as React.CSSProperties}>
              <button
                aria-expanded={isOpen}
                className="flex w-full items-start gap-2 py-3 pr-3 pl-4 text-left"
                onClick={() => {
                  if (locked) return sfx.error();
                  sfx.click();
                  setOpen(isOpen ? null : e.id);
                }}
              >
                <span className="px-row-cursor font-display text-base leading-6">▸</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-display text-[11px] tracking-[0.15em] uppercase" style={{ color: locked ? "#8b90b8" : CATEGORY_COLOR[e.category] }}>
                      {e.category}
                    </span>
                    {state === "mastered" && (
                      <span className="px-tag text-[10px]" style={tone("#fde047")}>
                        ★ Mastered
                      </span>
                    )}
                    {state === "study" && (
                      <span className="px-tag text-[10px]" style={tone("#38bdf8")}>
                        Study
                      </span>
                    )}
                    {locked && (
                      <span className="px-tag text-[10px]" style={tone("#8b90b8")}>
                        🔒 Locked
                      </span>
                    )}
                  </div>
                  <div className={`mt-1 font-display text-base tracking-wide ${locked ? "text-white/35" : ""}`}>{locked ? lockedTitle(e.title) : e.title}</div>
                  {!isOpen && <p className="mt-1 line-clamp-2 text-sm text-white/60">{locked ? "Win battles to unlock this entry, or turn on study mode." : e.definition}</p>}
                </div>
                <span className="font-display text-sm text-white/40">{locked ? "" : isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && <EntryBody e={e} />}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function EntryBody({ e }: { e: CodexEntry }) {
  const save = useSave();
  const [pick, setPick] = useState<number | null>(null);
  const mastered = save.quizzes.includes(e.id);
  return (
    <div className="border-t-2 border-[#0e0f1a]">
      <div className="space-y-3 p-4">
        <p className="text-sm leading-relaxed text-white/80">{e.definition}</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <CodeBlock code={e.syntax.postgres} label="PostgreSQL" color="#60a5fa" />
          <CodeBlock code={e.syntax.oracle} label="Oracle" color="#f87171" />
        </div>
        {e.dialectNotes && (
          <div className="px-box p-3 text-sm text-white/75" style={tone("#38bdf8")}>
            <div className="px-box-title text-xs">Oracle vs PostgreSQL</div>
            <p className="mt-1">{e.dialectNotes}</p>
          </div>
        )}
        <div className="px-box p-3 text-sm leading-relaxed text-white/75" style={tone("#4ade80")}>
          <div className="px-box-title text-xs">In the enterprise</div>
          <p className="mt-1">{e.enterprise}</p>
        </div>
        <div className="px-box p-3 text-sm" style={tone("#fb7185")}>
          <div className="px-box-title text-xs">Pitfalls</div>
          <ul className="mt-1.5 space-y-1 text-white/70">
            {e.pitfalls.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-display text-rose-300">!</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        {e.quiz && (
          <div className="px-box p-3" style={tone("#fbbf24")}>
            <div className="px-box-title text-xs">Quick quiz {mastered && "· ★ mastered"}</div>
            <div className="mt-1.5 text-sm font-semibold">{e.quiz.q}</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {e.quiz.options.map((o, i) => {
                const chosen = pick === i;
                const right = i === e.quiz!.answer;
                const color = pick === null ? undefined : right ? "#4ade80" : chosen ? "#fb7185" : undefined;
                return (
                  <button
                    key={i}
                    disabled={pick !== null}
                    onClick={() => {
                      setPick(i);
                      if (right) {
                        sfx.unlockCodex();
                        if (!mastered) updateSave((s) => ({ ...s, quizzes: [...s.quizzes, e.id], xp: s.xp + 40 }));
                      } else sfx.error();
                    }}
                    className={`px-choice flex items-center gap-2 px-2 py-2 text-left text-sm pointer-coarse:py-3 ${pick !== null && !right && !chosen ? "opacity-45" : ""}`}
                    style={color ? tone(color) : undefined}
                  >
                    <span className="px-key grid h-6 w-6 shrink-0 place-items-center font-display text-xs" style={color ? { background: color, color: "#0e0f1a" } : undefined}>
                      {"ABCD"[i]}
                    </span>
                    <span>{o}</span>
                  </button>
                );
              })}
            </div>
            {pick !== null && (
              <p className="mt-2 text-sm text-white/70">
                <span className={`font-display ${pick === e.quiz.answer ? "text-emerald-300" : "text-rose-300"}`}>{pick === e.quiz.answer ? "✓ Correct! " : "✗ Not quite. "}</span>
                {e.quiz.why}
                {pick !== e.quiz.answer && (
                  <button className="px-btn ml-2 px-2 py-0.5 text-xs" onClick={() => setPick(null)}>
                    RETRY
                  </button>
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

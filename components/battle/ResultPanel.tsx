"use client";
import { motion } from "motion/react";
import { useDeferredValue, useMemo, useRef } from "react";
import type { ResultSet, RunResult } from "@/lib/db/engine";
import { DialectError, NeedColumns } from "@/lib/dialect/errors";
import { Dialect, lintOracle } from "@/lib/dialect/lint";
import { transpileOracle } from "@/lib/dialect/oracle";
import { sfx } from "@/game/audio/synth";
import { Button, CodeBlock } from "../ui/kit";
import { ResultGrid } from "./ResultGrid";
import { ResultTab, resultTabs, stepTab } from "./tabs";

export type { ResultTab };

export interface Feedback {
  run?: RunResult;
  reason?: string;
  correct?: boolean;
  preview?: boolean;
}

export function ResultPanel({
  tab,
  setTab,
  feedback,
  expected,
  scouted,
  onScout,
  scoutCost,
  canScout,
  dialect,
  sql,
  plan,
  planLabel,
  hideTarget,
}: {
  tab: ResultTab;
  setTab: (t: ResultTab) => void;
  feedback: Feedback | null;
  expected: ResultSet | null | undefined;
  scouted: boolean;
  onScout?: () => void;
  scoutCost: number;
  canScout: boolean;
  dialect: Dialect;
  sql: string;
  plan?: string;
  planLabel?: string;
  hideTarget?: boolean;
}) {
  const tabs = resultTabs({ hideTarget, tutorAlert: !!feedback && (feedback.run?.ok === false || feedback.correct === false) });
  const strip = useRef<HTMLDivElement>(null);
  const pick = (id: ResultTab) => {
    sfx.click();
    setTab(id);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={strip}
        className="mb-3 flex gap-1 overflow-x-auto pb-1 scroll-thin"
        role="tablist"
        aria-label="Result window"
        onKeyDown={(e) => {
          // D-pad: left/right walks the tabs and wraps, like a handheld menu
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const next = stepTab(tabs, tab, e.key === "ArrowRight" ? 1 : -1);
          pick(next);
          strip.current?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            data-tab={t.id}
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => pick(t.id)}
            className="px-tab relative shrink-0 px-2 py-1.5 text-xs uppercase tracking-wide sm:px-2.5"
          >
            {t.label}
            {t.alert && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 border-2 border-[#0e0f1a] bg-rose-400" aria-label="needs attention" />}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto scroll-thin">
        {/* switch instantly like a handheld menu; an exit animation could strand the old tab on fast D-pad input */}
        <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}>
          {tab === "result" && <ResultTabView feedback={feedback} />}
          {tab === "target" && <TargetView expected={expected} scouted={scouted} onScout={onScout} cost={scoutCost} canScout={canScout} />}
          {tab === "tutor" && <TutorView feedback={feedback} dialect={dialect} />}
          {tab === "lens" && <LensView dialect={dialect} sql={sql} />}
          {tab === "plan" && <PlanView plan={plan} label={planLabel} dialect={dialect} />}
        </motion.div>
      </div>
    </div>
  );
}

/** --tone for the pixel message boxes and tags. */
const TONE = {
  err: { "--tone": "#fb7185" },
  warn: { "--tone": "#fbbf24" },
  ok: { "--tone": "#4ade80" },
  info: { "--tone": "#38bdf8" },
  oracle: { "--tone": "#f87171" },
  muted: { "--tone": "#8b90b8" },
} as Record<string, React.CSSProperties>;

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-32 items-center justify-center px-6 text-center text-sm text-white/35">
      <p>{children}</p>
    </div>
  );
}

function ResultTabView({ feedback }: { feedback: Feedback | null }) {
  if (!feedback?.run) return <Empty>Cast a spell (Ctrl/⌘+Enter) or preview it (Ctrl/⌘+Shift+Enter) to see the output.</Empty>;
  const r = feedback.run;
  if (!r.ok)
    return (
      <div className="px-box p-3 text-sm" style={TONE.err}>
        <div className="px-box-title text-sm">{r.error.title}</div>
        <div className="mt-1 font-mono text-xs text-rose-200/80">{r.error.oracle ?? r.error.message}</div>
      </div>
    );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] text-white/45">
        <span className="font-mono">
          {r.command} · {r.statements} statement{r.statements === 1 ? "" : "s"} · {r.ms.toFixed(0)} ms
        </span>
        {feedback.preview && <span className="px-tag text-[11px]">preview</span>}
        {feedback.correct === true && <span className="px-tag text-[11px]" style={TONE.ok}>match</span>}
        {feedback.correct === false && <span className="px-tag text-[11px]" style={TONE.err}>no match</span>}
      </div>
      {r.result ? <ResultGrid result={r.result} /> : <Empty>Statement executed — no rows returned.</Empty>}
    </div>
  );
}

function TargetView({ expected, scouted, onScout, cost, canScout }: { expected: ResultSet | null | undefined; scouted: boolean; onScout?: () => void; cost: number; canScout: boolean }) {
  if (!scouted)
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="text-3xl">🔮</div>
        <p className="max-w-xs text-sm text-white/55">Scout the boss&apos;s weakness: reveal the exact result your spell must produce.</p>
        <Button variant="primary" size="sm" onClick={onScout} disabled={!canScout}>
          Scout target · {cost} focus
        </Button>
      </div>
    );
  if (expected === undefined) return <Empty>Scouting…</Empty>;
  if (expected === null) return <Empty>This round is judged on the database state, not a result set.</Empty>;
  return <ResultGrid result={expected} max={12} accent="#fbbf24" />;
}

function TutorView({ feedback, dialect }: { feedback: Feedback | null; dialect: Dialect }) {
  if (!feedback) return <Empty>The tutor explains errors and wrong answers here, including the Oracle error you&apos;d see in production.</Empty>;
  const r = feedback.run;
  return (
    <div className="flex flex-col gap-3 text-sm">
      {r && !r.ok && (
        <>
          <div className="px-box p-3" style={TONE.err}>
            <div className="px-box-title text-xs">{r.error.title}</div>
            <p className="mt-1.5 leading-relaxed text-white/80">{r.error.explain}</p>
          </div>
          {dialect === "oracle" && r.error.oracle && (
            <div className="px-box p-3 font-mono text-xs" style={TONE.oracle}>
              <div className="px-box-title mb-1 text-[11px]">Oracle would say</div>
              <div className="text-red-200">{r.error.oracle}</div>
            </div>
          )}
          {/* lint errors (ORA-/PLS-) were raised before the query reached PostgreSQL */}
          {!/^(ORA|PLS)-/.test(r.error.code ?? "") && (
          <div className="px-box p-3 font-mono text-xs" style={TONE.muted}>
            <div className="px-box-title mb-1 text-[11px]">{dialect === "oracle" ? "Emulator (PostgreSQL) message" : "PostgreSQL message"}</div>
            <div className="text-white/70">
              {r.error.code ? `[${r.error.code}] ` : ""}
              {r.error.message}
            </div>
          </div>
          )}
          {r.error.mismatch.length > 0 && (
            <div className="px-box p-3" style={TONE.warn}>
              <div className="px-box-title text-xs">Wrong dialect?</div>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-white/80">
                {r.error.mismatch.map((m) => (
                  <li key={m.found}>
                    <code className="text-amber-200">{m.found}</code> — {m.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {r?.ok && feedback.correct === false && (
        <div className="px-box p-3" style={TONE.warn}>
          <div className="px-box-title text-xs">Valid SQL — wrong answer</div>
          <p className="mt-1.5 leading-relaxed text-white/80">{feedback.reason}</p>
          <p className="mt-2 text-xs text-white/50">Tip: open the Target tab to scout the expected result, or buy a hint.</p>
        </div>
      )}
      {r?.ok && feedback.correct !== false && <Empty>{feedback.correct ? "Direct hit! Nothing to fix." : "No problems detected."}</Empty>}
      {r?.notes && r.notes.length > 0 && (
        <div className="px-box p-3" style={TONE.info}>
          <div className="px-box-title text-xs">Dialect notes</div>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-white/70">
            {r.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LensView({ dialect, sql }: { dialect: Dialect; sql: string }) {
  const deferred = useDeferredValue(sql);
  const out = useMemo(() => {
    if (dialect !== "oracle") return null;
    if (!deferred.trim()) return { sql: "", notes: [] as string[], error: "" };
    try {
      const notes = lintOracle(deferred);
      const r = transpileOracle(deferred);
      return { sql: r.sql, notes: [...notes, ...r.notes], error: "" };
    } catch (e) {
      if (e instanceof NeedColumns) return { sql: "", notes: [], error: "This query needs table metadata to translate (PIVOT / SELECT * with CONNECT BY). Cast or preview it to see the full translation in the Tutor tab." };
      if (e instanceof DialectError) return { sql: "", notes: [], error: `${e.message} — ${e.hint}` };
      return { sql: "", notes: [], error: String(e) };
    }
  }, [dialect, deferred]);

  if (dialect !== "oracle")
    return (
      <Empty>
        The Translation Lens shows how Oracle SQL maps to PostgreSQL. Switch the dialect to <b className="mx-1 text-red-300">Oracle</b> to use it.
      </Empty>
    );
  if (!out || (!out.sql && !out.error)) return <Empty>Start typing Oracle SQL — the PostgreSQL translation appears here live.</Empty>;
  return (
    <div className="flex flex-col gap-2">
      {out.error ? <div className="px-box p-3 text-xs text-rose-200" style={TONE.err}>{out.error}</div> : <CodeBlock code={out.sql} label="Runs on the engine as PostgreSQL" color="#60a5fa" />}
      {out.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-white/65">
          {out.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      <p className="text-[10px] uppercase tracking-widest text-white/30">Oracle is emulated: your SQL is validated against Oracle rules, then translated.</p>
    </div>
  );
}

function PlanView({ plan, label, dialect }: { plan?: string; label?: string; dialect: Dialect }) {
  if (!plan) return <Empty>After a successful SELECT, the planner&apos;s execution plan appears here. Cheaper plans deal bonus damage.</Empty>;
  return (
    <div className="flex flex-col gap-2">
      {label && <div className="px-box-title text-xs" style={{ "--tone": "var(--accent)" } as React.CSSProperties}>{label}</div>}
      <CodeBlock code={plan} label={dialect === "oracle" ? "Plan (PostgreSQL planner; Oracle: EXPLAIN PLAN + DBMS_XPLAN)" : "EXPLAIN"} />
    </div>
  );
}

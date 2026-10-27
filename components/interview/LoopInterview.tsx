"use client";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL } from "@/components/menu/interviewList";
import { Button, LinkButton } from "@/components/ui/kit";
import { QUESTIONS, TOPICS } from "@/content/interview";
import { SCHEMA_DRILLS } from "@/content/interview/schemaScenarios";
import type { Response } from "@/content/interview/types";
import { sfx } from "@/game/audio/synth";
import { answerText, grade, scrambleSteps } from "@/game/engine/interview";
import { mergeSolved } from "@/game/engine/interviewBattle";
import { sqlClient, useDbStatus } from "@/lib/db/client";
import type { SchemaGrade } from "@/lib/dbms/schemaDesign";
import { dayNumber, recordAnswer, tally } from "@/lib/leitner";
import { LOOP_MINUTES, LOOP_SECONDS, type LoopScorecard, type Round, type RoundOutcome, addLoopResult, loopScorecard, toLoopResult } from "@/lib/loop";
import { clock } from "@/lib/mock";

import { updateSave } from "@/lib/save";
import { AnswerPanel } from "./AnswerPanel";
import { CodexLinks } from "./CodexLinks";
import { PlanBlock } from "./PlanBlock";
import { PromptTables } from "./PromptTables";

const spoken = (s: number) => `${Math.floor(s / 60)} minute${Math.floor(s / 60) === 1 ? "" : "s"} ${s % 60} seconds`;

const ACCENT = "#fb7185";
const RIGHT = "#4ade80";
const WRONG = "#f87171";
const FIXED_IDS = new Set(QUESTIONS.map((q) => q.id));
const tone = (c: string) => ({ "--tone": c }) as CSSProperties;
const topicTitle = (id: string) => TOPICS.find((t) => t.id === id)?.title ?? id;
const ROUND_LABEL = { sql: "SQL coding", schema: "Schema design", explain: "Read the plan", theory: "Theory & design" } as const;

/**
 * The mock loop: five rounds in interview order (SQL, schema, EXPLAIN, two
 * theory questions) on a 45-minute clock. No going back; the scorecard at the
 * end ranks the weak spots.
 */
export function LoopInterview({ rounds, seed, onExit, onRetry }: { rounds: Round[]; seed: number; onExit: () => void; onRetry: () => void }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [index, setIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const [card, setCard] = useState<LoopScorecard | null>(null);
  const [left, setLeft] = useState(LOOP_SECONDS);
  const startedAt = useRef(0);
  const finished = useRef(false);
  const outcomes = useRef<(RoundOutcome | null)[]>([]);
  const [shown, setShown] = useState<(RoundOutcome | null)[]>([]);
  const schemaGrade = useRef<SchemaGrade | null>(null);
  const round = rounds[index];
  const steps = useMemo(() => (round && round.kind !== "schema" && round.question.kind === "order" ? scrambleSteps(round.question.steps, seed + index) : []), [round, seed, index]);

  function finish(timedOut: boolean) {
    if (finished.current) return;
    finished.current = true;
    const seconds = Math.min(LOOP_SECONDS, Math.round((Date.now() - startedAt.current) / 1000));
    const c = loopScorecard(rounds, outcomes.current, seconds, timedOut);
    const today = dayNumber();
    updateSave((x) => {
      let { leitner, topicStats } = x;
      const solved: string[] = [];
      rounds.forEach((r, i) => {
        const o = outcomes.current[i];
        if (!o || r.kind === "schema" || o.kind === "schema") return;
        const ok = grade(r.question, o);
        topicStats = tally(topicStats, r.question.topic, ok);
        if (FIXED_IDS.has(r.question.id)) {
          leitner = recordAnswer(leitner, r.question.id, ok, today);
          if (ok) solved.push(r.question.id);
        }
      });
      return { ...x, xp: x.xp + Math.round(c.points), leitner, topicStats, interview: mergeSolved(x.interview, solved, FIXED_IDS), loopResults: addLoopResult(x.loopResults ?? [], toLoopResult(c, today)) };
    });
    setShown(outcomes.current);
    setCard(c);
    setPhase("done");
    window.scrollTo(0, 0);
  }

  // the clock is computed from the start time, so a throttled tab can't cheat it
  useEffect(() => {
    if (phase !== "run") return;
    const tick = () => {
      const l = LOOP_SECONDS - Math.floor((Date.now() - startedAt.current) / 1000);
      setLeft(Math.max(0, l));
      if (l <= 0) finish(true);
    };
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => sqlClient().warmupWhenIdle(), []);

  function advance(o: RoundOutcome | null) {
    outcomes.current = [...outcomes.current, o];
    schemaGrade.current = null;
    if (index + 1 >= rounds.length) finish(false);
    else {
      setIndex(index + 1);
      setLocked(false);
      window.scrollTo(0, 0);
    }
  }

  function answer(r: Response) {
    if (locked) return;
    sfx.click();
    setLocked(true);
    setTimeout(() => advance(r), 220);
  }

  if (phase === "intro") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6" data-testid="loop-intro">
        <h1 className="px-shadow font-display text-2xl tracking-[0.2em]">MOCK LOOP</h1>
        <section className="px-window mt-4 p-4" style={{ "--accent": ACCENT } as CSSProperties}>
          <p className="text-sm text-white/75">A full on-site, compressed: five rounds in order, {LOOP_MINUTES} minutes, scored out of 100.</p>
          <ol className="mt-3 space-y-1.5 text-sm text-white/80">
            {rounds.map((r, i) => (
              <li key={i}>
                {i + 1}. {ROUND_LABEL[r.kind]}
              </li>
            ))}
          </ol>
          <ul className="mt-3 space-y-1.5 text-sm text-white/70">
            <li>▸ SQL 30, schema 25, plan 15, theory 15 + 15 points.</li>
            <li>▸ No feedback until the scorecard, and no going back.</li>
            <li>▸ Skip a round and it scores zero.</li>
          </ul>
          <div className="mt-4 flex gap-2">
            <Button
              variant="primary"
              size="lg"
              className="tracking-[0.15em]"
              data-testid="loop-begin"
              onClick={() => {
                sfx.unlock();
                startedAt.current = Date.now();
                setPhase("run");
              }}
            >
              ▶ Begin
            </Button>
            <Button onClick={onExit}>Back</Button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === "done" && card) return <Result rounds={rounds} outcomes={shown} card={card} onExit={onExit} onRetry={onRetry} />;

  const urgent = left <= 300;
  // announced only when the minute mark changes, never every second
  const warn = [600, 300, 60].find((m) => left <= m && left > m - 5) ?? 0;
  return (
    <main className="mx-auto max-w-3xl px-4 py-4 pb-28">
      <header className="flex items-center gap-2">
        <span className="font-display text-sm tracking-[0.15em]">MOCK LOOP</span>
        <span className="px-tag ml-auto text-[11px]" style={tone(ACCENT)} data-testid="loop-count">
          Round {index + 1}/{rounds.length}
        </span>
        <span className="px-tag text-[11px] tabular-nums" style={tone(urgent ? WRONG : "#60a5fa")} data-testid="loop-clock" role="timer">
          <span aria-hidden>⏱ {clock(left)}</span>
          <span className="sr-only">{spoken(left)} left</span>
        </span>
      </header>
      <p className="sr-only" role="status" aria-live="polite" data-testid="loop-live">
        {`Round ${index + 1} of ${rounds.length}, ${round ? ROUND_LABEL[round.kind] : ""}.${warn ? ` ${spoken(warn)} left.` : ""}`}
      </p>
      <div className="mt-2 h-2 border-2 border-[#0e0f1a] bg-white/10" aria-hidden>
        <div className="h-full" style={{ width: `${(100 * index) / rounds.length}%`, background: ACCENT }} />
      </div>
      {round && (
        <section className="px-window mt-3 p-4" data-testid="loop-round" data-kind={round.kind}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-tag text-[10px]" style={tone(ACCENT)}>
              {ROUND_LABEL[round.kind]}
            </span>
            {round.kind !== "schema" && (
              <span className="px-tag text-[10px]" style={tone(DIFFICULTY_COLOR[round.question.difficulty])}>
                {DIFFICULTY_LABEL[round.question.difficulty]}
              </span>
            )}
          </div>
          {round.kind === "schema" ? (
            <SchemaRound key={round.schemaId} id={round.schemaId} onGrade={(g) => (schemaGrade.current = g)} />
          ) : (
            <>
              <h2 className="mt-2 text-base leading-relaxed text-white sm:text-lg" data-testid="question-prompt">
                {round.question.prompt}
              </h2>
              {round.question.tables && <PromptTables tables={round.question.tables} />}
              {round.question.plan && <PlanBlock plan={round.question.plan} />}
              <div className="mt-3">
                <AnswerPanel key={`${index}-${round.question.id}`} q={round.question} initialSteps={steps} locked={locked} picked={null} onAnswer={answer} />
              </div>
            </>
          )}
        </section>
      )}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 border-t border-white/10 bg-[#0e0f1a]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button onClick={() => finish(false)} data-testid="loop-end">
          End now
        </Button>
        {round?.kind === "schema" ? (
          <Button
            variant="primary"
            onClick={() => {
              const g = schemaGrade.current;
              advance(g && !g.error ? { kind: "schema", passed: g.passed, total: g.total } : null);
            }}
            data-testid="loop-submit"
          >
            Submit design ▸
          </Button>
        ) : (
          <Button onClick={() => !locked && advance(null)} data-testid="loop-skip" disabled={locked}>
            Skip ▸
          </Button>
        )}
      </div>
    </main>
  );
}

/** The schema round: write the DDL and check it as often as you like; the last check is what scores. */
function SchemaRound({ id, onGrade }: { id: string; onGrade: (g: SchemaGrade | null) => void }) {
  const status = useDbStatus();
  const drill = SCHEMA_DRILLS.find((d) => d.id === id)!;
  const [sql, setSql] = useState(drill.starter);
  const [g, setG] = useState<SchemaGrade | null>(null);
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    const r = await sqlClient().gradeSchema(id, sql);
    setG(r);
    onGrade(r);
    setBusy(false);
  };
  return (
    <div data-testid="loop-schema">
      <p className="mt-2 text-sm text-white/85">{drill.brief}</p>
      <textarea
        aria-label="CREATE TABLE script"
        data-testid="loop-schema-editor"
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={12}
        className="mt-3 block w-full rounded border border-white/15 bg-black/40 p-3 font-mono text-[16px] leading-snug text-white/90 outline-none focus:border-white/40"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={check} disabled={busy || status !== "ready"} data-testid="loop-schema-check">
          {busy ? "Checking…" : status === "ready" ? "Check design" : "Booting database…"}
        </Button>
        {g && (
          <span className="text-sm text-white/70" data-testid="loop-schema-score">
            {g.error ? "SQL error: fix it and check again" : `${g.passed}/${g.total} checks passed`}
          </span>
        )}
      </div>
    </div>
  );
}

function Result({ rounds, outcomes, card, onExit, onRetry }: { rounds: Round[]; outcomes: (RoundOutcome | null)[]; card: LoopScorecard; onExit: () => void; onRetry: () => void }) {
  const color = card.pct >= 75 ? RIGHT : card.pct >= 40 ? "#facc15" : WRONG;
  const topics = Object.entries(card.perTopic).sort(([, a], [, b]) => a!.points / a!.max - b!.points / b!.max);
  const heading = useRef<HTMLHeadingElement>(null);
  // move focus to the scorecard so screen readers announce the result
  useEffect(() => heading.current?.focus(), []);
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-12" data-testid="loop-result" aria-live="polite">
      <h1 ref={heading} tabIndex={-1} className="px-shadow font-display text-2xl tracking-[0.2em] outline-none">
        LOOP SCORECARD
      </h1>
      <section className="px-window mt-4 flex items-center gap-4 p-4" style={{ "--accent": color } as CSSProperties}>
        <div className="grid h-20 w-20 shrink-0 place-items-center border-4 border-[#0e0f1a] font-display text-5xl" style={{ background: color, color: "#0e0f1a" }} data-testid="loop-grade">
          {card.grade}
        </div>
        <div>
          <div className="font-display text-lg tracking-[0.1em]" data-testid="loop-verdict">
            {card.verdict}
          </div>
          <div className="text-sm text-white/75" data-testid="loop-score">
            {card.points}/100 points
          </div>
          <div className="text-xs text-white/50">
            {card.timedOut ? "Time ran out" : `Finished in ${clock(card.seconds)}`} of {LOOP_MINUTES}:00
          </div>
        </div>
      </section>
      <section className="px-window mt-3 p-4">
        <div className="font-display text-[11px] tracking-[0.15em] text-white/60 uppercase">Rounds</div>
        <ul className="mt-2 space-y-2" data-testid="loop-rounds">
          {card.rounds.map((s, i) => (
            <li key={i} className="text-xs">
              <div className="flex justify-between gap-2">
                <span>
                  {i + 1}. {ROUND_LABEL[s.kind]}
                </span>
                <span className="font-mono text-white/70">
                  {s.points}/{s.max}
                </span>
              </div>
              <div className="mt-0.5 h-2 border-2 border-[#0e0f1a] bg-white/10">
                <div className="h-full" style={{ width: `${100 * (s.fraction ?? 0)}%`, background: s.fraction === 1 ? RIGHT : !s.fraction ? WRONG : "#facc15" }} />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="px-window mt-3 p-4">
        <div className="font-display text-[11px] tracking-[0.15em] text-white/60 uppercase">By topic (weakest first)</div>
        <ul className="mt-2 space-y-1 text-xs" data-testid="loop-topics">
          {topics.map(([id, t]) => (
            <li key={id} className="flex justify-between gap-2">
              <span>{topicTitle(id)}</span>
              <span className="font-mono text-white/70">
                {t!.points}/{t!.max}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="px-window mt-3 p-4" data-testid="loop-weak">
        <div className="font-display text-[11px] tracking-[0.15em] text-white/60 uppercase">Weak spots to review</div>
        {card.weakSpots.length ? (
          <ul className="mt-2 space-y-1.5 text-sm">
            {card.weakSpots.map((w) => (
              <li key={w.ref} className="flex gap-2">
                <span className="text-amber-300">▸</span>
                <span>
                  <span className="text-white/85">{w.title}</span>
                  <span className="block text-xs text-white/50">{ROUND_LABEL[w.kind]} · {topicTitle(w.topic)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-emerald-300">Full marks. Nothing to review.</p>
        )}
        {card.weakSpots.some((w) => w.kind === "schema") && (
          <LinkButton href="/interview/schema" variant="ghost" size="md" className="mt-3">
            🛠 Practise in the Schema forge
          </LinkButton>
        )}
      </section>
      <section className="mt-3 space-y-2" data-testid="loop-review">
        {rounds.map((r, i) => {
          const f = card.rounds[i].fraction;
          const c = f === 1 ? RIGHT : f === null || f === 0 ? WRONG : "#facc15";
          return (
            <details key={i} className="px-box p-3" style={tone(c)}>
              <summary className="cursor-pointer text-sm">
                <span className="font-display mr-2" style={{ color: c }}>
                  {f === 1 ? "✓" : f === null ? "–" : "✗"}
                </span>
                <span className="text-white/50">{ROUND_LABEL[r.kind]}:</span> {card.rounds[i].title}
              </summary>
              {r.kind === "schema" ? (
                <p className="mt-2 text-sm text-white/75">
                  {outcomes[i] && outcomes[i]!.kind === "schema" ? `${outcomes[i]!.passed}/${outcomes[i]!.total} checks passed.` : "No valid design was checked."} Practise it in the Schema forge.
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-white/85">
                    <span className="font-display text-xs text-emerald-300">ANSWER ▸ </span>
                    {answerText(r.question)}
                  </p>
                  {!outcomes[i] && <p className="text-xs text-white/50">You skipped this one.</p>}
                  <p className="mt-1 text-sm leading-relaxed text-white/75">{r.question.explanation}</p>
                  <CodexLinks q={r.question} />
                </>
              )}
            </details>
          );
        })}
      </section>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={onRetry} data-testid="loop-retry">
          ↻ New loop
        </Button>
        <Button onClick={onExit}>Back to topics</Button>
      </div>
    </main>
  );
}

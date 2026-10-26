"use client";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL, KIND_LABEL } from "@/components/menu/interviewList";
import { Button } from "@/components/ui/kit";
import { CodexLinks } from "./CodexLinks";
import { QUESTIONS, TOPICS } from "@/content/interview";
import type { Question, Response } from "@/content/interview/types";
import { sfx } from "@/game/audio/synth";
import { answerText, grade, scrambleSteps } from "@/game/engine/interview";
import { mergeSolved } from "@/game/engine/interviewBattle";
import { dayNumber, recordAnswer, tally } from "@/lib/leitner";
import { MOCK_MINUTES, MOCK_SECONDS, type Scorecard, addResult, clock, scorecard, toResult } from "@/lib/mock";
import { updateSave } from "@/lib/save";
import { AnswerPanel } from "./AnswerPanel";
import { PrecedenceGraph } from "./PrecedenceGraph";
import { PromptTables } from "./PromptTables";
import { PlanBlock } from "./PlanBlock";

const ACCENT = "#f59e0b";
const RIGHT = "#4ade80";
const WRONG = "#f87171";
const FIXED_IDS = new Set(QUESTIONS.map((q) => q.id));
const tone = (c: string) => ({ "--tone": c }) as CSSProperties;
const topicTitle = (id: string) => TOPICS.find((t) => t.id === id)?.title ?? id;

/**
 * A timed mock interview: the deck is asked one question at a time with no
 * feedback, then a scorecard shows the grade, a per-topic breakdown and every
 * question with its answer and explanation.
 */
export function MockInterview({ deck, seed, onExit, onRetry }: { deck: Question[]; seed: number; onExit: () => void; onRetry: () => void }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<(Response | null)[]>([]);
  const [picked, setPicked] = useState<Response | null>(null);
  const [card, setCard] = useState<Scorecard | null>(null);
  const [left, setLeft] = useState(MOCK_SECONDS);
  const startedAt = useRef(0);
  const finished = useRef(false);
  const responsesRef = useRef<(Response | null)[]>([]);
  const q = deck[index];
  const steps = useMemo(() => (q?.kind === "order" ? scrambleSteps(q.steps, seed + index) : []), [q, seed, index]);

  function finish(timedOut: boolean) {
    if (finished.current) return;
    finished.current = true;
    const seconds = Math.min(MOCK_SECONDS, Math.round((Date.now() - startedAt.current) / 1000));
    const c = scorecard(deck, responsesRef.current, seconds, timedOut);
    const today = dayNumber();
    updateSave((x) => {
      let { leitner, topicStats } = x;
      const solved: string[] = [];
      deck.forEach((d, i) => {
        const r = responsesRef.current[i];
        if (!r) return;
        const ok = grade(d, r);
        topicStats = tally(topicStats, d.topic, ok);
        if (FIXED_IDS.has(d.id)) {
          leitner = recordAnswer(leitner, d.id, ok, today);
          if (ok) solved.push(d.id);
        }
      });
      return { ...x, xp: x.xp + 10 * c.right, leitner, topicStats, interview: mergeSolved(x.interview, solved, FIXED_IDS), mockResults: addResult(x.mockResults, toResult(c, today)) };
    });
    setCard(c);
    setPhase("done");
    window.scrollTo(0, 0);
  }

  // the clock: computed from the start time, so a throttled tab can't cheat it
  useEffect(() => {
    if (phase !== "run") return;
    const tick = () => {
      const l = MOCK_SECONDS - Math.floor((Date.now() - startedAt.current) / 1000);
      setLeft(Math.max(0, l));
      if (l <= 0) finish(true);
    };
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function advance(r: Response | null) {
    responsesRef.current = [...responsesRef.current, r];
    setResponses(responsesRef.current);
    if (index + 1 >= deck.length) finish(false);
    else {
      setIndex(index + 1);
      setPicked(null);
      window.scrollTo(0, 0);
    }
  }

  function answer(r: Response) {
    if (picked) return;
    sfx.click();
    setPicked(r);
    setTimeout(() => advance(r), 220);
  }

  if (phase === "intro") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6" data-testid="mock-intro">
        <h1 className="px-shadow font-display text-2xl tracking-[0.2em]">MOCK INTERVIEW</h1>
        <section className="px-window mt-4 p-4" style={{ "--accent": ACCENT } as CSSProperties}>
          <ul className="space-y-1.5 text-sm text-white/80">
            <li>▸ {deck.length} questions mixed across the DBMS topics.</li>
            <li>▸ {MOCK_MINUTES} minutes on the clock. Unanswered questions count as wrong.</li>
            <li>▸ No right-or-wrong feedback while you answer: you see everything at the end.</li>
            <li>▸ You can skip a question, but you can&apos;t come back to it.</li>
          </ul>
          <div className="mt-4 flex gap-2">
            <Button
              variant="primary"
              size="lg"
              className="tracking-[0.15em]"
              data-testid="mock-begin"
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

  if (phase === "done" && card) return <Result deck={deck} responses={responses} card={card} onExit={onExit} onRetry={onRetry} />;

  const urgent = left <= 60;
  return (
    <main className="mx-auto max-w-3xl px-4 py-4 pb-28">
      <header className="flex items-center gap-2">
        <span className="font-display text-sm tracking-[0.15em]">MOCK INTERVIEW</span>
        <span className="px-tag ml-auto text-[11px]" style={tone(ACCENT)} data-testid="mock-count">
          Q {index + 1}/{deck.length}
        </span>
        <span className="px-tag text-[11px] tabular-nums" style={tone(urgent ? WRONG : "#60a5fa")} data-testid="mock-clock" role="timer">
          ⏱ {clock(left)}
        </span>
      </header>
      <div className="mt-2 h-2 border-2 border-[#0e0f1a] bg-white/10" aria-hidden>
        <div className="h-full" style={{ width: `${(100 * index) / deck.length}%`, background: ACCENT }} />
      </div>
      {q && (
        <section className="px-window mt-3 p-4" data-testid="question" data-question-id={q.id} data-kind={q.kind}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-tag text-[10px]" style={tone(DIFFICULTY_COLOR[q.difficulty])}>
              {DIFFICULTY_LABEL[q.difficulty]}
            </span>
            <span className="px-tag text-[10px]" style={tone(ACCENT)}>
              {KIND_LABEL[q.kind]}
            </span>
          </div>
          <h2 className="mt-2 text-base leading-relaxed text-white sm:text-lg" data-testid="question-prompt">
            {q.prompt}
          </h2>
          {q.tables && <PromptTables tables={q.tables} />}
          {q.plan && <PlanBlock plan={q.plan} />}
          {q.graph && <PrecedenceGraph graph={q.graph} />}
          <div className="mt-3">
            <AnswerPanel key={`${index}-${q.id}`} q={q} initialSteps={steps} locked={!!picked} picked={null} onAnswer={answer} />
          </div>
        </section>
      )}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 border-t border-white/10 bg-[#0e0f1a]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button onClick={() => finish(false)} data-testid="mock-end">
          End now
        </Button>
        <Button onClick={() => !picked && advance(null)} data-testid="mock-skip" disabled={!!picked}>
          Skip ▸
        </Button>
      </div>
    </main>
  );
}

function Result({ deck, responses, card, onExit, onRetry }: { deck: Question[]; responses: (Response | null)[]; card: Scorecard; onExit: () => void; onRetry: () => void }) {
  const color = card.pct >= 75 ? RIGHT : card.pct >= 40 ? "#facc15" : WRONG;
  const topics = Object.entries(card.perTopic).sort(([, a], [, b]) => a!.right / a!.total - b!.right / b!.total);
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-12" data-testid="mock-result">
      <h1 className="px-shadow font-display text-2xl tracking-[0.2em]">SCORECARD</h1>
      <section className="px-window mt-4 flex items-center gap-4 p-4" style={{ "--accent": color } as CSSProperties}>
        <div className="grid h-20 w-20 shrink-0 place-items-center border-4 border-[#0e0f1a] font-display text-5xl" style={{ background: color, color: "#0e0f1a" }} data-testid="mock-grade">
          {card.grade}
        </div>
        <div>
          <div className="font-display text-lg tracking-[0.1em]" data-testid="mock-verdict">
            {card.verdict}
          </div>
          <div className="text-sm text-white/75" data-testid="mock-score">
            {card.right}/{card.total} right · {card.pct}%
          </div>
          <div className="text-xs text-white/50">
            {card.timedOut ? "Time ran out" : `Finished in ${clock(card.seconds)}`} of {MOCK_MINUTES}:00
          </div>
        </div>
      </section>
      <section className="px-window mt-3 p-4">
        <div className="font-display text-[11px] tracking-[0.15em] text-white/60 uppercase">By topic (weakest first)</div>
        <ul className="mt-2 space-y-2" data-testid="mock-topics">
          {topics.map(([id, t]) => (
            <li key={id} className="text-xs">
              <div className="flex justify-between gap-2">
                <span>{topicTitle(id)}</span>
                <span className="font-mono text-white/70">
                  {t!.right}/{t!.total}
                </span>
              </div>
              <div className="mt-0.5 h-2 border-2 border-[#0e0f1a] bg-white/10">
                <div className="h-full" style={{ width: `${(100 * t!.right) / t!.total}%`, background: t!.right === t!.total ? RIGHT : t!.right === 0 ? WRONG : "#facc15" }} />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-3 space-y-2" data-testid="mock-review">
        {deck.map((q, i) => {
          const ok = card.results[i];
          const mark = ok ? "✓" : ok === false ? "✗" : "–";
          const r = responses[i];
          return (
            <details key={q.id} className="px-box p-3" style={tone(ok ? RIGHT : ok === false ? WRONG : "#94a3b8")}>
              <summary className="cursor-pointer text-sm">
                <span className="font-display mr-2" style={{ color: ok ? RIGHT : ok === false ? WRONG : "#94a3b8" }}>
                  {mark}
                </span>
                <span className="text-white/50">{i + 1}.</span> {q.prompt}
              </summary>
              <p className="mt-2 text-sm text-white/85">
                <span className="font-display text-xs text-emerald-300">ANSWER ▸ </span>
                {answerText(q)}
              </p>
              {!r && <p className="text-xs text-white/50">You skipped this one.</p>}
              <p className="mt-1 text-sm leading-relaxed text-white/75">{q.explanation}</p>
              <CodexLinks q={q} />
            </details>
          );
        })}
      </section>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={onRetry} data-testid="mock-retry">
          ↻ New mock
        </Button>
        <Button onClick={onExit}>Back to topics</Button>
      </div>
    </main>
  );
}

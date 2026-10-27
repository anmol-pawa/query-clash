"use client";
import { useEffect, useMemo, useState } from "react";
import { DIFFICULTY_COLOR, DIFFICULTY_FILTERS, DIFFICULTY_LABEL, DifficultyFilter, KIND_LABEL, kindCounts, overallProgress, topicRows } from "@/components/menu/interviewList";
import { SpriteCanvas } from "@/components/sprites/SpriteCanvas";
import { Button, LinkButton, NavLink } from "@/components/ui/kit";
import { GENERATORS, QUESTIONS, TOPICS } from "@/content/interview";
import type { Question, Topic, TopicId } from "@/content/interview/types";
import { LoopInterview } from "@/components/interview/LoopInterview";
import { MockInterview } from "@/components/interview/MockInterview";
import { InterviewBattle } from "@/components/interview/InterviewBattle";
import { buildDeck } from "@/game/engine/interview";
import { DECK_SIZE } from "@/game/engine/interviewBattle";
import { sfx } from "@/game/audio/synth";
import { bossSprite } from "@/game/sprites/roster";
import { SCHEMA_DRILLS } from "@/content/interview/schemaScenarios";
import { LOOP_MINUTES, buildLoop, reviewWeakSpots, weakDrill, type Round } from "@/lib/loop";
import { buildMock, clock, MOCK_MINUTES, MOCK_SIZE } from "@/lib/mock";
import { MAX_BOX, boxCounts, buildDrill, dayNumber, dueCount, weakTopics } from "@/lib/leitner";
import { DAILY_SIZE, buildDaily, dailySeed, liveStreak, recordDailyWin, wonToday } from "@/lib/daily";
import { updateSave, useSave } from "@/lib/save";

const ACCENT = "#60a5fa";
const SILHOUETTE = "#2a2f4f";
/** The guardian and title shared by every daily drill battle. */
const DRILL_TOPIC: Topic = { id: "basics", foe: "optimizer", title: "Daily Drill", blurb: "Ten mixed questions, due reviews first.", color: "#f59e0b" };
const WEAK_TOPIC: Topic = { id: "basics", foe: "optimizer", title: "Weak-spot Drill", blurb: "Your missed loop rounds, plus more from the same topics.", color: "#fb7185" };
const DAILY_TOPIC: Topic = { id: "basics", foe: "reaper", title: "Daily Challenge", blurb: "Five questions, the same for everyone today.", color: "#f43f5e" };
const FIXED_IDS = new Set(QUESTIONS.map((q) => q.id));
const tone = (c: string) => ({ "--tone": c }) as React.CSSProperties;

export default function InterviewPage() {
  const save = useSave();
  const [diff, setDiff] = useState<DifficultyFilter>("all");
  const [sel, setSel] = useState<TopicId>("basics");
  const [battle, setBattle] = useState<{ topic: TopicId | "drill" | "daily" | "weak"; seed: number; deck: Question[] } | null>(null);

  const startBattle = (topic: TopicId) => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const deck = buildDeck(QUESTIONS, GENERATORS, { topic, seed, size: DECK_SIZE, difficulties: diff === "all" ? undefined : [diff] });
    if (!deck.length) return;
    setBattle({ topic, seed, deck });
    window.scrollTo(0, 0);
  };

  const [mock, setMock] = useState<{ seed: number; deck: Question[] } | null>(null);
  const startMock = () => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    setMock({ seed, deck: buildMock(QUESTIONS, GENERATORS, seed) });
    window.scrollTo(0, 0);
  };

  const [loop, setLoop] = useState<{ seed: number; rounds: Round[] } | null>(null);
  const startLoop = () => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    setLoop({ seed, rounds: buildLoop(QUESTIONS, SCHEMA_DRILLS, seed) });
    window.scrollTo(0, 0);
  };

  const startDrill = () => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const deck = buildDrill(QUESTIONS, GENERATORS, save.leitner, save.topicStats, dayNumber(), seed);
    setBattle({ topic: "drill", seed, deck });
    window.scrollTo(0, 0);
  };

  const startWeakDrill = () => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const deck = weakDrill(QUESTIONS, GENERATORS, reviewWeakSpots(save.loopResults[0]), seed);
    if (!deck.length) return;
    setBattle({ topic: "weak", seed, deck });
    window.scrollTo(0, 0);
  };

  const startDaily = () => {
    const day = dayNumber();
    setBattle({ topic: "daily", seed: dailySeed(day), deck: buildDaily(QUESTIONS, GENERATORS, day) });
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", ACCENT);
  }, []);

  const rows = useMemo(() => topicRows(TOPICS, QUESTIONS, GENERATORS, save.interview, diff), [save.interview, diff]);
  const overall = useMemo(() => overallProgress(QUESTIONS, save.interview), [save.interview]);
  const today = dayNumber();
  const due = useMemo(() => dueCount(save.leitner, FIXED_IDS, today), [save.leitner, today]);
  const boxes = useMemo(() => boxCounts(save.leitner, FIXED_IDS), [save.leitner]);
  const weak = useMemo(() => weakTopics(save.topicStats).slice(0, 3), [save.topicStats]);
  const row = rows.find((r) => r.topic.id === sel)!;
  const kinds = kindCounts(QUESTIONS, sel);
  const asked = QUESTIONS.find((q) => q.topic === sel && q.askedAt)?.askedAt;

  if (mock) return <MockInterview key={mock.seed} deck={mock.deck} seed={mock.seed} onExit={() => setMock(null)} onRetry={startMock} />;

  if (loop) return <LoopInterview key={loop.seed} rounds={loop.rounds} seed={loop.seed} onExit={() => setLoop(null)} onRetry={startLoop} />;

  if (battle) {
    const topic = battle.topic === "drill" ? DRILL_TOPIC : battle.topic === "weak" ? WEAK_TOPIC : battle.topic === "daily" ? DAILY_TOPIC : TOPICS.find((t) => t.id === battle.topic)!;
    return (
      <InterviewBattle
        key={battle.seed}
        topic={topic}
        deck={battle.deck}
        seed={battle.seed}
        onExit={() => {
          setBattle(null);
          document.documentElement.style.setProperty("--accent", ACCENT);
        }}
        onVictory={battle.topic === "daily" ? () => updateSave((x) => ({ ...x, daily: recordDailyWin(x.daily, dayNumber()) })) : undefined}
        onRematch={() => (battle.topic === "drill" ? startDrill() : battle.topic === "weak" ? startWeakDrill() : battle.topic === "daily" ? startDaily() : startBattle(battle.topic))}
      />
    );
  }

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

      <section className="px-window mt-4 p-4" data-testid="daily-panel" style={{ "--accent": DAILY_TOPIC.color } as React.CSSProperties}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[11px] tracking-[0.15em] uppercase" style={{ color: DAILY_TOPIC.color }}>
              Daily challenge
            </div>
            <p className="mt-1 text-sm text-white/70">
              {DAILY_SIZE} questions from {DAILY_SIZE} topics, the same for everyone today. Win to keep your streak.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-white/70" data-testid="daily-stats">
              <span data-testid="daily-streak">🔥 {liveStreak(save.daily, today)}-day streak</span>
              <span>best {save.daily.best}</span>
              <span>{save.daily.total} won</span>
              <span style={{ color: wonToday(save.daily, today) ? "#4ade80" : "#facc15" }}>{wonToday(save.daily, today) ? "✔ done today" : "not done today"}</span>
            </div>
          </div>
          <div data-testid="start-daily">
            <Button variant="primary" size="lg" className="tracking-[0.15em]" onClick={startDaily}>
              {wonToday(save.daily, today) ? "▶ Play again" : "▶ Play daily"}
            </Button>
          </div>
        </div>
      </section>

      <section className="px-window mt-4 p-4" data-testid="drill-panel" style={{ "--accent": DRILL_TOPIC.color } as React.CSSProperties}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[11px] tracking-[0.15em] uppercase" style={{ color: DRILL_TOPIC.color }}>
              Daily interview drill
            </div>
            <p className="mt-1 text-sm text-white/70">
              10 mixed questions: reviews that are due first, then new ones. <span data-testid="drill-due">{due} due today.</span>
            </p>
            <div className="mt-2 flex items-end gap-1.5" aria-label="Leitner boxes" data-testid="leitner-boxes">
              {boxes.map((n, i) => (
                <span key={i} className="text-center font-mono text-[10px] text-white/60">
                  <span className="mx-auto block w-6 border-2 border-[#0e0f1a]" style={{ height: 4 + Math.min(n, 40), background: DRILL_TOPIC.color, opacity: 0.4 + 0.12 * (i + 1) }} />
                  {i + 1}:{n}
                </span>
              ))}
              <span className="pb-0.5 pl-1 text-[10px] text-white/40">box 1–{MAX_BOX}</span>
            </div>
          </div>
          <div data-testid="start-drill">
            <Button variant="primary" size="lg" className="tracking-[0.15em]" onClick={startDrill}>
              ▶ Start drill
            </Button>
          </div>
        </div>
        <div className="mt-3 border-t border-dotted border-white/15 pt-2 text-xs text-white/70" data-testid="weak-report">
          {weak.length ? (
            <>
              <span className="font-display text-[10px] tracking-[0.15em] uppercase text-white/50">Weakest topics</span>
              <ul className="mt-1 space-y-0.5">
                {weak.map((w) => (
                  <li key={w.topic} className="flex justify-between gap-2">
                    <span>{TOPICS.find((t) => t.id === w.topic)?.title}</span>
                    <span className="font-mono" style={{ color: w.accuracy < 0.5 ? "#f87171" : w.accuracy < 0.75 ? "#facc15" : "#4ade80" }}>
                      {Math.round(w.accuracy * 100)}% · {w.right + w.wrong} answers
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <span>Answer a few questions in a topic and your weak spots show up here.</span>
          )}
        </div>
      </section>

      <section className="px-window mt-3 p-4" data-testid="mock-panel" style={{ "--accent": "#f59e0b" } as React.CSSProperties}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[11px] tracking-[0.15em] uppercase text-amber-400">Mock interview</div>
            <p className="mt-1 text-sm text-white/70">
              {MOCK_SIZE} questions across the topics, {MOCK_MINUTES} minutes, no feedback until the scorecard.
            </p>
            {save.mockResults.length > 0 && (
              <p className="mt-1 text-xs text-white/55" data-testid="mock-history">
                Last: {save.mockResults[0].grade} · {save.mockResults[0].pct}% in {clock(save.mockResults[0].seconds)}
                {save.mockResults.length > 1 && ` · best ${Math.max(...save.mockResults.map((r) => r.pct))}%`}
              </p>
            )}
          </div>
          <Button variant="gold" size="lg" className="tracking-[0.15em]" data-testid="start-mock" onClick={startMock}>
            ▶ Start mock
          </Button>
        </div>
      </section>

      <section className="px-window mt-3 p-4" data-testid="loop-panel" style={{ "--accent": "#fb7185" } as React.CSSProperties}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[11px] tracking-[0.15em] uppercase" style={{ color: "#fb7185" }}>
              Mock loop
            </div>
            <p className="mt-1 text-sm text-white/70">
              A compressed on-site: SQL, schema design, an EXPLAIN plan and two system-design questions in {LOOP_MINUTES} minutes, scored out of 100.
            </p>
            {save.loopResults.length > 0 && (
              <p className="mt-1 text-xs text-white/55" data-testid="loop-history">
                Last: {save.loopResults[0].grade} · {save.loopResults[0].points}/100
                {save.loopResults.length > 1 && ` · best ${Math.max(...save.loopResults.map((r) => r.points))}`}
              </p>
            )}
          </div>
          <Button variant="gold" size="lg" className="tracking-[0.15em]" data-testid="start-loop" onClick={startLoop}>
            ▶ Start loop
          </Button>
        </div>
        {save.loopResults[0]?.review && (
          <details className="mt-3" data-testid="loop-replay">
            <summary className="cursor-pointer text-xs uppercase tracking-wide text-white/70">Review last scorecard</summary>
            <ul className="mt-2 space-y-1 text-sm" aria-live="polite">
              {save.loopResults[0].review.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-display" style={{ color: r.fraction === 1 ? "#34d399" : r.fraction ? "#facc15" : "#f87171" }}>
                    {r.fraction === 1 ? "✓" : r.fraction === null ? "–" : "✗"}
                  </span>
                  <span className="min-w-0 flex-1 text-white/80">{r.title}</span>
                  <span className="font-mono text-xs text-white/55">{Math.round(r.max * (r.fraction ?? 0) * 10) / 10}/{r.max}</span>
                </li>
              ))}
            </ul>
            {reviewWeakSpots(save.loopResults[0]).length > 0 && (
              <Button variant="ghost" size="md" className="mt-3" data-testid="retry-weak" onClick={startWeakDrill}>
                ↻ Retry weak spots
              </Button>
            )}
          </details>
        )}
      </section>

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
              {sel === "er" && (
                <LinkButton href="/interview/schema" variant="ghost" size="md" className="mt-3 w-full">
                  🛠 Schema forge
                </LinkButton>
              )}
              {sel === "storage" && (
                <LinkButton href="/interview/btree" variant="ghost" size="md" className="mt-3 w-full">
                  🌲 B+ tree lab
                </LinkButton>
              )}
              {asked && <p className="mt-2 text-[11px] text-white/45">▸ {asked}</p>}
              <Button variant="primary" size="lg" className="mt-4 w-full tracking-[0.15em]" onClick={() => startBattle(sel)}>
                ⚔ Battle {bossSprite(row.topic.foe).name}
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

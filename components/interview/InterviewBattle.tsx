"use client";
import { motion } from "motion/react";
import { type CSSProperties, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { pixelFamily } from "@/app/fonts";
import { BattleTextBox, type BattleMessage } from "@/components/battle/BattleTextBox";
import { BattleWipe } from "@/components/battle/BattleWipe";
import { HpBox } from "@/components/battle/HpBox";
import { SceneCreature } from "@/components/battle/SceneCreature";
import { StageHandle, StageView } from "@/components/battle/StageView";
import { WIN_TONE, LOSS_TONE, starRow } from "@/components/battle/endCard";
import { DIFFICULTY_COLOR, DIFFICULTY_LABEL, KIND_LABEL } from "@/components/menu/interviewList";
import { SpriteCanvas } from "@/components/sprites/SpriteCanvas";
import { Button, Modal } from "@/components/ui/kit";
import { CodexLinks } from "./CodexLinks";
import { QUESTIONS, TOPICS } from "@/content/interview";
import type { Question, Response, Topic } from "@/content/interview/types";
import { setMusic, setVolume, sfx, startMusic, stopMusic } from "@/game/audio/synth";
import { introLines, faintLine } from "@/game/engine/battleText";
import { xpProgress } from "@/game/engine/hud";
import { answerText, grade, scrambleSteps } from "@/game/engine/interview";
import { CRIT_STREAK, type InterviewStats, KIND_ATTACK, answerLines, askLine, currentQuestion, holdLine, initialInterview, interviewReducer, interviewReport, interviewStars, interviewXp, mergeSolved } from "@/game/engine/interviewBattle";
import { bossSprite, starterSprite, starterStageOf } from "@/game/sprites/roster";
import { STAR_DIM, STAR_LIT } from "@/game/sprites/ui";
import { ATTACKS } from "@/lib/dialect/concepts";
import { dayNumber, recordAnswer, tally } from "@/lib/leitner";
import { level, updateSave, useSave } from "@/lib/save";
import { PrecedenceGraph } from "./PrecedenceGraph";
import { PromptTables } from "./PromptTables";
import { AnswerPanel } from "./AnswerPanel";

const FIXED_IDS = new Set(QUESTIONS.map((q) => q.id));
const tone = (c: string) => ({ "--tone": c }) as CSSProperties;

/**
 * A DBMS Interview battle against a topic's guardian. It reuses the campaign's
 * stage, HP boxes, text box and screen wipe; the editor is replaced by an
 * answer panel for the current question. A right answer is the player's
 * attack, a wrong one the guardian's, and every answer shows its explanation.
 */
export function InterviewBattle({ topic, deck, seed, onExit, onRematch, onVictory }: { topic: Topic; deck: Question[]; seed: number; onExit: () => void; onRematch: () => void; onVictory?: () => void }) {
  const save = useSave();
  const starter = useMemo(() => starterStageOf(save.dex), [save.dex]);
  const playerName = starterSprite("front", starter).name;
  const foeDef = bossSprite(topic.foe);
  const [s, dispatch] = useReducer(interviewReducer, undefined, () => initialInterview(deck, playerName, foeDef.name));
  const [stageReady, setStageReady] = useState(false);
  const [picked, setPicked] = useState<Response | null>(null);
  const [endReady, setEndReady] = useState(false);
  const [message, setMessage] = useState<BattleMessage | null>(null);
  const msgId = useRef(0);
  const say = (lines: string[]) => setMessage({ id: ++msgId.current, lines, at: performance.now() });
  const stage = useRef<StageHandle>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const explainBox = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const st = () => stage.current?.stage() ?? null;
  const q = currentQuestion(s);
  const steps = useMemo(() => (q?.kind === "order" ? scrambleSteps(q.steps, seed + s.index) : []), [q, seed, s.index]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", topic.color);
  }, [topic.color]);

  useEffect(() => {
    setVolume(save.settings.volume);
    setMusic(save.settings.music);
  }, [save.settings.volume, save.settings.music]);

  useEffect(() => () => stopMusic(), []);

  // a finished battle pays out once: XP for the answers and stars
  const recorded = useRef(false);
  const victoryCb = useRef(onVictory);
  useEffect(() => {
    victoryCb.current = onVictory;
  });
  useEffect(() => {
    if ((s.phase === "victory" || s.phase === "defeat") && !recorded.current) {
      recorded.current = true;
      updateSave((x) => ({ ...x, xp: x.xp + interviewXp(s) }));
      if (s.phase === "victory") victoryCb.current?.();
    }
  }, [s]);

  function fight() {
    sfx.unlock();
    startMusic(96, 108);
    dispatch({ type: "start" });
    say([...introLines("campaign", foeDef.name, playerName), askLine(s)]);
  }

  async function answer(r: Response) {
    if (!q || s.phase !== "ask" || busy.current) return;
    busy.current = true;
    const correct = grade(q, r);
    setPicked(r);
    updateSave((x) => ({
      ...x,
      topicStats: tally(x.topicStats, q.topic, correct),
      leitner: FIXED_IDS.has(q.id) ? recordAnswer(x.leitner, q.id, correct, dayNumber()) : x.leitner,
    }));
    const action = { type: "answer", correct } as const;
    const next = interviewReducer(s, action);
    dispatch(action);
    const last = next.last!;
    const attack = ATTACKS[KIND_ATTACK[q.kind]];
    say(answerLines(next, attack.name));
    // phones: bring the arena into view for the hit
    if (window.innerWidth < 1024) {
      (document.activeElement as HTMLElement | null)?.blur();
      const box = stageBox.current?.getBoundingClientRect();
      if (box && (box.top < 0 || box.bottom > window.innerHeight)) stageBox.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (correct) {
      if (FIXED_IDS.has(q.id)) updateSave((x) => ({ ...x, interview: mergeSolved(x.interview, [q.id], FIXED_IDS) }));
      const ko = s.foe.hp - last.damage <= 0;
      st()?.setCharging("left", true);
      sfx.charge();
      await new Promise((res) => setTimeout(res, 350));
      sfx.cast(attack.kind);
      await st()?.attack("left", attack.kind, attack.color, last.damage, last.crit, ko, () => {
        sfx.hit(last.crit || ko);
        dispatch({ type: "land" });
      });
      if (!st()) dispatch({ type: "land" });
      if (ko) {
        stopMusic();
        say([faintLine(foeDef.name)]);
        await st()?.ko("right");
        sfx.victory();
        void st()?.victory("left");
      }
    } else {
      sfx.miss();
      await st()?.fizzle("left");
      const faint = s.player.hp - last.damage <= 0;
      await st()?.counter("right", last.damage, () => {
        sfx.hurt();
        dispatch({ type: "land" });
      });
      if (!st()) dispatch({ type: "land" });
      if (faint) {
        stopMusic();
        sfx.defeat();
        say([faintLine(playerName)]);
        await st()?.ko("left");
        await st()?.victory("right");
      }
    }
    busy.current = false;
    setTimeout(() => explainBox.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  function next() {
    if (s.phase !== "explain") return;
    const after = interviewReducer(s, { type: "next" });
    dispatch({ type: "next" });
    setPicked(null);
    if (after.phase === "ask") say([askLine(after)]);
    else {
      if (after.phase === "defeat" && after.player.hp > 0 && after.foe.hp > 0) {
        stopMusic();
        sfx.defeat();
        say([holdLine(foeDef.name)]);
      }
      setEndReady(true);
    }
  }

  const done = s.phase === "victory" || s.phase === "defeat";
  const locked = s.phase !== "ask";

  return (
    <div className="flex min-h-dvh flex-col pb-24 lg:pb-6" data-testid="interview-battle">
      <BattleWipe reducedMotion={save.settings.reducedMotion} accent={topic.color} />
      <header className="flex items-center gap-2 border-b border-white/5 bg-black/30 px-4 py-2 backdrop-blur sm:gap-3">
        <button onClick={onExit} className="shrink-0 text-sm text-white/50 hover:text-white">
          ← Topics
        </button>
        <div className="hidden font-display text-sm font-bold tracking-[0.3em] text-white/80 sm:block">
          DBMS<span className="text-[var(--accent)]"> INTERVIEW</span>
        </div>
        <div className="hidden truncate text-xs text-white/40 sm:block">{topic.title}</div>
        <div className="ml-auto flex items-center gap-2">
          {s.streak > 1 && (
            <span className="px-tag text-[11px]" style={tone("#facc15")} data-testid="streak">
              {s.streak}× STREAK
            </span>
          )}
          <span className="px-tag text-[11px]" style={tone(topic.color)} data-testid="question-count">
            Q {Math.min(s.index + 1, s.deck.length)}/{s.deck.length}
          </span>
          <button
            onClick={() => updateSave((x) => ({ ...x, settings: { ...x.settings, music: !x.settings.music } }))}
            className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-white/60 hover:text-white"
            title="Toggle music"
          >
            {save.settings.music ? "♫" : "♫̸"}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        {/* stage */}
        <div ref={stageBox} className="relative mx-3 mt-3 h-[34vh] min-h-[220px] scroll-mt-2 overflow-hidden rounded-2xl border border-white/10 lg:h-[40vh] lg:min-h-[280px]">
          <HpBox side="foe" name={s.foe.name} level={5 + 5 * Math.max(0, deckLevel(topic))} hp={s.foe.hp} maxHp={s.foe.maxHp} className="absolute left-2 top-2 z-10 sm:left-3 sm:top-3" />
          <HpBox side="player" name={playerName} level={level(save.xp)} hp={s.player.hp} maxHp={s.player.maxHp} xp={xpProgress(save.xp)} className="absolute bottom-2 right-2 z-10 sm:bottom-3 sm:right-3" />
          <StageView ref={stage} boss={topic.foe} starter={starter} accent={topic.color} reducedMotion={save.settings.reducedMotion} font={pixelFamily} onReady={() => setStageReady(true)} />
          {!stageReady && <div className="absolute inset-0 flex items-center justify-center bg-[#07050f]/60 font-display text-xs tracking-[0.4em] text-white/50">SUMMONING ARENA…</div>}
        </div>
        <div className="px-3 pt-2">
          <BattleTextBox message={message} instant={save.settings.reducedMotion} />
        </div>

        {/* question */}
        {q && (
          <section className="px-window mx-3 mt-3 p-4" data-testid="question" data-question-id={q.id} data-kind={q.kind}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-tag text-[10px]" style={tone(DIFFICULTY_COLOR[q.difficulty])}>
                {DIFFICULTY_LABEL[q.difficulty]}
              </span>
              <span className="px-tag text-[10px]" style={tone(topic.color)}>
                {KIND_LABEL[q.kind]}
              </span>
              {q.tags.slice(0, 3).map((t) => (
                <span key={t} className="text-[11px] text-white/40">
                  #{t}
                </span>
              ))}
            </div>
            <h2 className="mt-2 text-base leading-relaxed text-white sm:text-lg" data-testid="question-prompt">
              {q.prompt}
            </h2>
            {q.tables && <PromptTables tables={q.tables} />}
            {q.graph && <PrecedenceGraph graph={q.graph} />}
            <div className="mt-3">
              <AnswerPanel key={`${s.index}-${q.id}`} q={q} initialSteps={steps} locked={locked} picked={picked} onAnswer={answer} />
            </div>

            {s.phase === "explain" && s.last && (
              <div ref={explainBox} className="px-box mt-3 scroll-mb-28 p-3" style={tone(s.last.correct ? "#4ade80" : "#f87171")} data-testid="explanation" data-correct={s.last.correct}>
                <div className="px-box-title text-[11px]">{s.last.correct ? "✓ Correct" : "✗ Not quite"}</div>
                {!s.last.correct && (
                  <p className="mt-1 text-sm text-white/85">
                    <span className="font-display text-xs text-emerald-300">ANSWER ▸ </span>
                    {answerText(q)}
                  </p>
                )}
                <p className="mt-1 text-sm leading-relaxed text-white/75">{q.explanation}</p>
                {q.explainGraph && <PrecedenceGraph graph={q.explainGraph} />}
                <CodexLinks q={q} />
                {q.askedAt && <p className="mt-1.5 text-[11px] text-white/45">▸ {q.askedAt}</p>}
                <div className="mt-2 hidden justify-end lg:flex">
                  <Button variant="primary" onClick={next} className="px-cursor tracking-[0.15em]">
                    {nextLabel(s)}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* phones/tablets: NEXT stays under the thumb */}
      {s.phase === "explain" && (
        <div className="px-window fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 !rounded-none px-3 pt-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] lg:hidden" data-testid="next-bar">
          <span className={`font-display text-sm ${s.last?.correct ? "text-emerald-300" : "text-rose-300"}`}>{s.last?.correct ? "✓ RIGHT" : "✗ WRONG"}</span>
          <Button variant="primary" onClick={next} className="px-cursor ml-auto flex-1 py-3 tracking-[0.15em]">
            {nextLabel(s)}
          </Button>
        </div>
      )}

      <Modal open={s.phase === "intro"}>
        <div className="text-center" data-testid="interview-intro">
          <div className="dex-screen mx-auto flex h-[150px] max-w-xs items-end justify-center overflow-hidden">
            <SpriteCanvas def={foeDef} scale={1} className="h-[128px] w-[128px]" label={foeDef.name} />
          </div>
          <div className="mt-3 font-display text-[11px] uppercase tracking-[0.2em]" style={{ color: topic.color }}>
            Guardian of {topic.title}
          </div>
          <h2 className="font-display text-2xl tracking-[0.15em]">{foeDef.name}</h2>
          <div className="px-box mx-auto mt-3 max-w-sm p-2.5 text-left text-sm text-white/75" style={tone(topic.color)}>
            {s.deck.length} questions. Answer right to attack; a wrong answer lets {foeDef.name} strike, and you get the explanation. {CRIT_STREAK} right in a row and your hits crit.
          </div>
          <Button variant="primary" size="lg" className="mt-4" onClick={fight} disabled={!stageReady}>
            {stageReady ? "⚔ FIGHT" : "Summoning…"}
          </Button>
        </div>
      </Modal>

      <Modal open={done && endReady}>
        <InterviewEnd won={s.phase === "victory"} stars={interviewStars(s)} topic={topic} xp={interviewXp(s)} stats={s.stats} player={starterSprite("front", starter)} foe={foeDef} reducedMotion={save.settings.reducedMotion} onRematch={onRematch} onExit={onExit} />
      </Modal>
    </div>
  );
}

const nextLabel = (s: ReturnType<typeof initialInterview>) => (s.foe.hp <= 0 || s.player.hp <= 0 || s.index + 1 >= s.deck.length ? "FINISH ▸" : "NEXT QUESTION ▸");

/** The guardian's level steps up with the topic's place in the curriculum. */
const deckLevel = (topic: Topic) => TOPICS.findIndex((t) => t.id === topic.id);

function InterviewEnd({ won, stars, topic, xp, stats, player, foe, reducedMotion, onRematch, onExit }: { won: boolean; stars: number; topic: Topic; xp: number; stats: InterviewStats; player: ReturnType<typeof starterSprite>; foe: ReturnType<typeof bossSprite>; reducedMotion: boolean; onRematch: () => void; onExit: () => void }) {
  const bannerTone = won ? WIN_TONE : LOSS_TONE;
  return (
    <div className="text-center" data-testid="end-card" style={tone(bannerTone)}>
      <div className="px-box px-3 py-3">
        <div className="font-display text-3xl font-black tracking-[0.18em] sm:text-4xl" style={{ color: bannerTone, textShadow: "3px 3px 0 #0e0f1a" }} data-testid="end-banner">
          {won ? "VICTORY" : "DEFEATED"}
        </div>
        <div className="mt-1 font-display text-[11px] uppercase tracking-[0.2em] text-white/55">
          Interview · {topic.title}
        </div>
      </div>
      <div className="dex-screen relative mt-3 flex items-end justify-around gap-2 px-2 pb-2 pt-4" data-testid="end-scene">
        <SceneCreature def={player} pose={won ? "stand" : "fainted"} flip={false} />
        <SceneCreature def={foe} pose={won ? "fainted" : "stand"} flip />
      </div>
      {won && (
        <div className="mt-3 flex justify-center gap-3" role="img" aria-label={`${stars} of 3 stars`} data-testid="end-stars">
          {starRow(stars).map((lit, i) => (
            <motion.span key={i} initial={reducedMotion ? false : { scale: 0, y: -12 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.25, ease: "backOut", duration: 0.3 }} className="inline-flex">
              <SpriteCanvas def={lit ? STAR_LIT : STAR_DIM} scale={3} label={lit ? "star" : "no star"} />
            </motion.span>
          ))}
        </div>
      )}
      <div className="px-box relative mx-auto mt-3 max-w-sm px-3 py-2.5 pr-6 text-left text-sm leading-relaxed text-white/80" style={tone("#c9cdea")}>
        {won ? `${foe.name} is beaten! You earned ${xp} XP.` : `Read the explanations, then try again: every round reshuffles the questions. You earned ${xp} XP.`}
        <span className="absolute bottom-1 right-2 animate-[px-blink_0.8s_steps(1)_infinite] font-display text-xs text-white/70">▼</span>
      </div>
      <div className="px-box mx-auto mt-3 max-w-sm px-3 py-2 text-left" data-testid="end-report">
        <div className="px-box-title text-[11px]">Battle report</div>
        <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
          {interviewReport(stats).map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-1 text-xs">
                <dt className="uppercase tracking-wider text-white/55">{k}</dt>
                <span aria-hidden className="mb-1 flex-1 border-b-2 border-dotted border-white/15" />
                <dd className="font-display text-base text-white">{v}</dd>
              </div>
            ))}
        </dl>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={onRematch}>
          Rematch
        </Button>
        <Button onClick={onExit}>Topics</Button>
      </div>
    </div>
  );
}

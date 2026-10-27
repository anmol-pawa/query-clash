/**
 * The mock "loop": a 45-minute FAANG-style session of five rounds - one SQL
 * coding mission, one schema-design mission, one EXPLAIN reading and two
 * theory / system-design questions - scored out of 100 with a per-topic card
 * and a weak-spot review list. Everything here is pure; the screen is separate.
 */
import { grade } from "@/game/engine/interview";
import type { Question, Response, SqlQuestion, TopicId } from "@/content/interview/types";
import { gradeFor } from "@/lib/mock";
import { rng, shuffled } from "@/lib/rng";

export const LOOP_MINUTES = 45;
export const LOOP_SECONDS = LOOP_MINUTES * 60;
/** Saved loop scorecards kept in the save file. */
export const LOOP_HISTORY = 10;
/** The newest loops that also keep their per-round answers for replay. */
export const LOOP_REPLAY = 5;

export type RoundKind = "sql" | "schema" | "explain" | "theory";

/** Points per round (the two theory rounds are 15 each); they sum to 100. */
export const ROUND_POINTS: Record<RoundKind, number> = { sql: 30, schema: 25, explain: 15, theory: 15 };

/** Theory rounds draw from the system-design flavoured topics. */
export const THEORY_TOPICS: readonly TopicId[] = ["transactions", "concurrency", "storage", "distributed", "query"];

export type Round =
  | { kind: "sql"; question: SqlQuestion }
  | { kind: "schema"; schemaId: string; title: string }
  | { kind: "explain"; question: Question }
  | { kind: "theory"; question: Question };

export interface LoopSchemaOption {
  id: string;
  title: string;
}

/** The five rounds in interview order. Deterministic per seed. */
export function buildLoop(questions: readonly Question[], schemas: readonly LoopSchemaOption[], seed: number): Round[] {
  const r = rng(seed);
  const sql = questions.filter((q): q is SqlQuestion => q.kind === "sql" && q.difficulty >= 2);
  const explain = questions.filter((q) => q.plan && q.kind !== "sql");
  const explainIds = new Set(explain.map((q) => q.id));
  const theory = questions.filter((q) => q.kind !== "sql" && !explainIds.has(q.id) && !q.plan && THEORY_TOPICS.includes(q.topic) && q.difficulty >= 2);
  const sqlQ = shuffled(r, sql)[0];
  const schema = shuffled(r, schemas)[0];
  const explainQ = shuffled(r, explain)[0];
  // two theory questions from different topics
  const first = shuffled(r, theory)[0];
  const second = shuffled(r, theory.filter((q) => q.topic !== first.topic))[0];
  return [
    { kind: "sql", question: sqlQ },
    { kind: "schema", schemaId: schema.id, title: schema.title },
    { kind: "explain", question: explainQ },
    { kind: "theory", question: first },
    { kind: "theory", question: second },
  ];
}

/** What the player did in a round: a question response, or a schema grade (checks passed / total). */
export type RoundOutcome = Response | { kind: "schema"; passed: number; total: number };

export interface RoundScore {
  kind: RoundKind;
  topic: TopicId;
  title: string;
  /** Question id, or the schema scenario id. */
  ref: string;
  /** 0..1, or null when the round was never attempted. */
  fraction: number | null;
  points: number;
  max: number;
}

export interface WeakSpot {
  kind: RoundKind;
  topic: TopicId;
  title: string;
  /** Question id to re-drill, or the schema scenario id. */
  ref: string;
}

export interface LoopScorecard {
  points: number;
  pct: number;
  grade: string;
  verdict: string;
  seconds: number;
  timedOut: boolean;
  rounds: RoundScore[];
  /** Points earned and available by topic. */
  perTopic: Partial<Record<TopicId, { points: number; max: number }>>;
  /** Rounds that were not full marks, worst first. */
  weakSpots: WeakSpot[];
}

const roundTopic = (round: Round): TopicId => (round.kind === "schema" ? "er" : round.question.topic);
const roundTitle = (round: Round): string => (round.kind === "schema" ? round.title : round.question.prompt.split(/(?<=[.?!])\s/)[0].slice(0, 90));
const roundRef = (round: Round): string => (round.kind === "schema" ? round.schemaId : round.question.id);

function fractionOf(round: Round, outcome: RoundOutcome | null | undefined): number | null {
  if (!outcome) return null;
  if (round.kind === "schema") {
    if (outcome.kind !== "schema") return null;
    return outcome.total ? outcome.passed / outcome.total : 0;
  }
  if (outcome.kind === "schema") return null;
  return grade(round.question, outcome) ? 1 : 0;
}

/** Score a finished (or timed-out) loop. A missing outcome scores zero. */
export function loopScorecard(rounds: readonly Round[], outcomes: readonly (RoundOutcome | null | undefined)[], seconds: number, timedOut: boolean): LoopScorecard {
  const scores: RoundScore[] = rounds.map((round, i) => {
    const fraction = fractionOf(round, outcomes[i]);
    const max = ROUND_POINTS[round.kind];
    return { kind: round.kind, topic: roundTopic(round), title: roundTitle(round), ref: roundRef(round), fraction, points: Math.round(max * (fraction ?? 0) * 10) / 10, max };
  });
  const points = Math.round(scores.reduce((s, x) => s + x.points, 0));
  const maxTotal = scores.reduce((s, x) => s + x.max, 0);
  const pct = maxTotal ? Math.round((100 * points) / maxTotal) : 0;
  const g = gradeFor(pct);
  const perTopic: LoopScorecard["perTopic"] = {};
  for (const s of scores) {
    const t = perTopic[s.topic] ?? { points: 0, max: 0 };
    perTopic[s.topic] = { points: Math.round((t.points + s.points) * 10) / 10, max: t.max + s.max };
  }
  const weakSpots = rounds
    .map((round, i) => ({ round, score: scores[i] }))
    .filter(({ score }) => (score.fraction ?? 0) < 1)
    .sort((a, b) => (a.score.fraction ?? 0) - (b.score.fraction ?? 0) || b.score.max - a.score.max)
    .map(({ round }): WeakSpot => ({ kind: round.kind, topic: roundTopic(round), title: roundTitle(round), ref: roundRef(round) }));
  return { points, pct, grade: g.grade, verdict: g.verdict, seconds, timedOut, rounds: scores, perTopic, weakSpots };
}

/** What the save file keeps of a loop scorecard. */
export interface LoopResult {
  day: number;
  points: number;
  pct: number;
  grade: string;
  seconds: number;
  weakTopics: TopicId[];
  /** Per-round answers, kept for the newest LOOP_REPLAY loops only. */
  rounds?: RoundScore[];
}

export const toLoopResult = (c: LoopScorecard, day: number): LoopResult => ({
  day,
  points: c.points,
  pct: c.pct,
  grade: c.grade,
  seconds: c.seconds,
  weakTopics: [...new Set(c.weakSpots.map((w) => w.topic))],
  rounds: c.rounds,
});

/** Newest first, capped. */
export const addLoopResult = (history: readonly LoopResult[], r: LoopResult): LoopResult[] =>
  [r, ...history].slice(0, LOOP_HISTORY).map((x, i) => (i < LOOP_REPLAY || !x.rounds ? x : { ...x, rounds: undefined }));

/** Rounds of a saved loop that were not full marks, worst first. Schema rounds are included (ref = scenario id). */
export const weakRounds = (r: LoopResult): RoundScore[] =>
  (r.rounds ?? []).filter((x) => (x.fraction ?? 0) < 1).sort((a, b) => (a.fraction ?? 0) - (b.fraction ?? 0) || b.max - a.max);

/**
 * A retry drill from a saved loop: the questions it got wrong first (worst
 * first), then more questions from the same weak topics, never repeating one.
 * Schema rounds have no question, so their topic is not used for filling.
 */
export function retryDeck(questions: readonly Question[], r: LoopResult, seed: number, size = 8): Question[] {
  const weak = weakRounds(r);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const deck: Question[] = [];
  const seen = new Set<string>();
  for (const w of weak) {
    const q = w.kind === "schema" ? undefined : byId.get(w.ref);
    if (q && !seen.has(q.id)) {
      deck.push(q);
      seen.add(q.id);
    }
  }
  const topics = new Set(weak.filter((w) => w.kind !== "schema").map((w) => w.topic));
  const extra = shuffled(rng(seed), questions.filter((q) => topics.has(q.topic) && !seen.has(q.id)));
  return [...deck, ...extra].slice(0, size);
}

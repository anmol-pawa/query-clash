/**
 * Spaced repetition for the DBMS Interview: a Leitner system with five boxes.
 * A right answer moves a question up one box (reviewed less often); a wrong
 * answer sends it back to box 1. Days are whole UTC days since the epoch, so
 * everything here is pure and testable.
 */
import type { Generator, Question, TopicId } from "@/content/interview/types";
import { rng, shuffled } from "@/lib/rng";

export const MAX_BOX = 5;
/** Days until the next review after landing in box 1..5. */
export const BOX_DAYS: readonly number[] = [0, 1, 3, 7, 21];

export interface LeitnerCard {
  box: number; // 1..MAX_BOX
  due: number; // day number
}
export type LeitnerState = Record<string, LeitnerCard>;
export interface TopicTally {
  right: number;
  wrong: number;
}
export type TopicStats = Partial<Record<TopicId, TopicTally>>;

export const dayNumber = (d: Date = new Date()) => Math.floor(d.getTime() / 86_400_000);

/** The card after one answer on `today`. */
export function review(card: LeitnerCard | undefined, correct: boolean, today: number): LeitnerCard {
  const box = correct ? Math.min(MAX_BOX, (card?.box ?? 1) + 1) : 1;
  return { box, due: today + BOX_DAYS[box - 1] };
}

/** Record an answer in the Leitner state (returns a new object). */
export function recordAnswer(state: LeitnerState, id: string, correct: boolean, today: number): LeitnerState {
  return { ...state, [id]: review(state[id], correct, today) };
}

export function tally(stats: TopicStats, topic: TopicId, correct: boolean): TopicStats {
  const t = stats[topic] ?? { right: 0, wrong: 0 };
  return { ...stats, [topic]: { right: t.right + (correct ? 1 : 0), wrong: t.wrong + (correct ? 0 : 1) } };
}

export const isDue = (card: LeitnerCard | undefined, today: number) => !!card && card.due <= today;

/** Questions to review today: seen and due. */
export function dueCount(state: LeitnerState, valid: ReadonlySet<string>, today: number): number {
  return Object.entries(state).filter(([id, c]) => valid.has(id) && isDue(c, today)).length;
}

export const DRILL_SIZE = 10;

/**
 * The daily drill: due cards first (lowest box, then most overdue), then unseen
 * questions in a seeded shuffle, then cards not yet due. When fixed questions
 * run short, fresh generated problems from the weakest topics fill the rest.
 * No more than `perTopic` fixed questions come from one topic, so drills mix.
 */
export function buildDrill(questions: readonly Question[], generators: readonly Generator[], state: LeitnerState, stats: TopicStats, today: number, seed: number, size = DRILL_SIZE, perTopic = 4): Question[] {
  const r = rng(seed);
  const due = questions.filter((q) => isDue(state[q.id], today)).sort((a, b) => state[a.id].box - state[b.id].box || state[a.id].due - state[b.id].due);
  const fresh = shuffled(r, questions.filter((q) => !state[q.id]));
  const later = shuffled(r, questions.filter((q) => state[q.id] && !isDue(state[q.id], today)));
  const used: Partial<Record<TopicId, number>> = {};
  const out: Question[] = [];
  for (const q of [...due, ...fresh, ...later]) {
    if (out.length >= size) break;
    if ((used[q.topic] ?? 0) >= perTopic) continue;
    used[q.topic] = (used[q.topic] ?? 0) + 1;
    out.push(q);
  }
  // not enough fixed questions under the cap: top up from the weakest topics' generators
  if (out.length < size) {
    const order = weakTopics(stats).map((w) => w.topic);
    const gens = shuffled(r, generators).sort((a, b) => order.indexOf(a.topic) - order.indexOf(b.topic));
    for (const g of gens) {
      if (out.length >= size) break;
      out.push(g.generate(Math.floor(r() * 2 ** 31)));
    }
  }
  return shuffled(r, out);
}

export interface WeakTopic {
  topic: TopicId;
  right: number;
  wrong: number;
  /** Share of answers that were right, 0..1. */
  accuracy: number;
}

/** Topics with at least `minAnswers` answers, weakest accuracy first (ties: more wrong answers first). */
export function weakTopics(stats: TopicStats, minAnswers = 3): WeakTopic[] {
  return (Object.entries(stats) as [TopicId, TopicTally][])
    .filter(([, t]) => t.right + t.wrong >= minAnswers)
    .map(([topic, t]) => ({ topic, right: t.right, wrong: t.wrong, accuracy: t.right / (t.right + t.wrong) }))
    .sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong);
}

/** How many cards sit in each box 1..MAX_BOX, for the box chart. */
export function boxCounts(state: LeitnerState, valid: ReadonlySet<string>): number[] {
  const out = new Array<number>(MAX_BOX).fill(0);
  for (const [id, c] of Object.entries(state)) if (valid.has(id)) out[c.box - 1]++;
  return out;
}

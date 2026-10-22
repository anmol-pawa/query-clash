/**
 * The mock interview: 20 questions mixed across topics, a time limit, no
 * feedback until the end, then a scorecard. Everything here is pure; the screen
 * lives in `components/interview/MockInterview.tsx`.
 */
import { grade } from "@/game/engine/interview";
import type { Generator, Question, Response, TopicId } from "@/content/interview/types";
import { rng, shuffled } from "@/lib/rng";

export const MOCK_SIZE = 20;
export const MOCK_MINUTES = 30;
export const MOCK_SECONDS = MOCK_MINUTES * 60;
/** Saved scorecards kept in the save file. */
export const MOCK_HISTORY = 10;

/**
 * Pick `size` questions spread evenly over the topics that can be asked without
 * feedback (SQL-writing questions are left out: submitting one tells you at once
 * whether it was right). Topics with a remainder are chosen by the seed. Each
 * topic draws from its fixed questions plus one generated problem per generator.
 */
export function buildMock(questions: readonly Question[], generators: readonly Generator[], seed: number, size = MOCK_SIZE): Question[] {
  const r = rng(seed);
  const askable = questions.filter((q) => q.kind !== "sql");
  const topics = [...new Set(askable.map((q) => q.topic))];
  const order = shuffled(r, topics);
  const pools = new Map<TopicId, Question[]>();
  for (const t of order) {
    const gen = generators.filter((g) => g.topic === t).map((g) => g.generate(Math.floor(r() * 2 ** 31)));
    pools.set(t, shuffled(r, [...askable.filter((q) => q.topic === t), ...gen]));
  }
  const out: Question[] = [];
  const seen = new Set<string>();
  // round-robin over the shuffled topics until the deck is full or every pool is empty
  for (let round = 0; out.length < size; round++) {
    let added = false;
    for (const t of order) {
      if (out.length >= size) break;
      const q = pools.get(t)!.filter((x) => !seen.has(x.id))[0];
      if (!q) continue;
      seen.add(q.id);
      out.push(q);
      added = true;
    }
    if (!added) break;
  }
  return shuffled(r, out);
}

export interface TopicScore {
  right: number;
  total: number;
}

export interface Scorecard {
  right: number;
  total: number;
  /** Whole percent, 0..100. */
  pct: number;
  grade: string;
  verdict: string;
  seconds: number;
  timedOut: boolean;
  perTopic: Partial<Record<TopicId, TopicScore>>;
  /** Per question: right, wrong, or null when it was skipped / never reached. */
  results: (boolean | null)[];
}

export const GRADES: { min: number; grade: string; verdict: string }[] = [
  { min: 90, grade: "A", verdict: "Strong hire" },
  { min: 75, grade: "B", verdict: "Hire" },
  { min: 60, grade: "C", verdict: "Borderline" },
  { min: 40, grade: "D", verdict: "Needs practice" },
  { min: 0, grade: "F", verdict: "Not yet" },
];

export const gradeFor = (pct: number) => GRADES.find((g) => pct >= g.min)!;

/** Score a finished (or timed-out) run. A missing response counts as wrong. */
export function scorecard(deck: readonly Question[], responses: readonly (Response | null | undefined)[], seconds: number, timedOut: boolean): Scorecard {
  const perTopic: Scorecard["perTopic"] = {};
  const results = deck.map((q, i) => {
    const r = responses[i];
    const ok = r ? grade(q, r) : null;
    const t = perTopic[q.topic] ?? { right: 0, total: 0 };
    perTopic[q.topic] = { right: t.right + (ok ? 1 : 0), total: t.total + 1 };
    return ok;
  });
  const right = results.filter(Boolean).length;
  const pct = deck.length ? Math.round((100 * right) / deck.length) : 0;
  const g = gradeFor(pct);
  return { right, total: deck.length, pct, grade: g.grade, verdict: g.verdict, seconds, timedOut, perTopic, results };
}

/** What the save file keeps of a scorecard. */
export interface MockResult {
  day: number;
  right: number;
  total: number;
  pct: number;
  grade: string;
  seconds: number;
  perTopic: Partial<Record<TopicId, TopicScore>>;
}

export const toResult = (c: Scorecard, day: number): MockResult => ({ day, right: c.right, total: c.total, pct: c.pct, grade: c.grade, seconds: c.seconds, perTopic: c.perTopic });

/** Newest first, capped. */
export const addResult = (history: readonly MockResult[], r: MockResult): MockResult[] => [r, ...history].slice(0, MOCK_HISTORY);

export const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;

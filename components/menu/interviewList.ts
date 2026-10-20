import type { Difficulty, Generator, Question, Topic, TopicId } from "@/content/interview/types";

/** Difficulty filter tabs: "all" or one level. */
export type DifficultyFilter = "all" | Difficulty;
export const DIFFICULTY_FILTERS: readonly DifficultyFilter[] = ["all", 1, 2, 3];
export const DIFFICULTY_LABEL: Record<DifficultyFilter, string> = { all: "All", 1: "★ Warm-up", 2: "★★ Standard", 3: "★★★ Tough" };
export const DIFFICULTY_COLOR: Record<DifficultyFilter, string> = { all: "#c9cdea", 1: "#4ade80", 2: "#facc15", 3: "#f87171" };

export interface TopicRow {
  topic: Topic;
  /** Fixed questions matching the filter. */
  total: number;
  /** Of those, answered correctly at least once. */
  solved: number;
  /** Generators matching the filter (endless fresh problems). */
  generators: number;
  /** Something to battle with this filter. */
  playable: boolean;
}

const keep = (f: DifficultyFilter, d: Difficulty) => f === "all" || f === d;

/** One picker row per topic, in curriculum order, with progress under the difficulty filter. */
export function topicRows(topics: readonly Topic[], questions: readonly Question[], generators: readonly Generator[], solved: readonly string[], f: DifficultyFilter): TopicRow[] {
  const done = new Set(solved);
  return topics.map((topic) => {
    const qs = questions.filter((q) => q.topic === topic.id && keep(f, q.difficulty));
    const gens = generators.filter((g) => g.topic === topic.id && keep(f, g.difficulty)).length;
    return { topic, total: qs.length, solved: qs.filter((q) => done.has(q.id)).length, generators: gens, playable: qs.length + gens > 0 };
  });
}

/** Overall progress across every fixed question (ignores the filter). */
export function overallProgress(questions: readonly Question[], solved: readonly string[]): { got: number; total: number } {
  const done = new Set(solved);
  return { got: questions.filter((q) => done.has(q.id)).length, total: questions.length };
}

/** Count of fixed questions per kind in a topic, for the topic panel. */
export function kindCounts(questions: readonly Question[], topic: TopicId): Partial<Record<Question["kind"], number>> {
  const out: Partial<Record<Question["kind"], number>> = {};
  for (const q of questions) if (q.topic === topic) out[q.kind] = (out[q.kind] ?? 0) + 1;
  return out;
}

export const KIND_LABEL: Record<Question["kind"], string> = {
  mcq: "Multiple choice",
  multi: "Multi-select",
  truefalse: "True / false",
  order: "Order the steps",
  numeric: "Numeric",
  short: "Short answer",
};

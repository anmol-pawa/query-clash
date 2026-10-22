import type { Difficulty, Generator, Question, Response, TopicId } from "@/content/interview/types";
import { rng, shuffled } from "@/lib/rng";

/** Lower-case, turn dashes and punctuation into spaces and collapse whitespace, so "Isolation." matches "isolation". */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9+*/<>=.\s]/g, " ")
    .replace(/(^|\s)\.+|\.+(\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True iff the response answers the question correctly. A response of the wrong kind is wrong. */
export function grade(q: Question, r: Response): boolean {
  switch (q.kind) {
    case "mcq":
      return r.kind === "mcq" && r.choice === q.answer;
    case "multi": {
      if (r.kind !== "multi") return false;
      const got = new Set(r.choices);
      return got.size === q.answers.length && q.answers.every((i) => got.has(i));
    }
    case "truefalse":
      return r.kind === "truefalse" && r.value === q.answer;
    case "order":
      return r.kind === "order" && r.steps.length === q.steps.length && r.steps.every((s, i) => s === q.steps[i]);
    case "numeric":
      return r.kind === "numeric" && Number.isFinite(r.value) && Math.abs(r.value - q.answer) <= (q.tolerance ?? 0) + 1e-9;
    case "short": {
      if (r.kind !== "short") return false;
      const t = normalizeText(r.text);
      return t !== "" && q.accept.some((a) => normalizeText(a) === t);
    }
    case "sql":
      return r.kind === "sql" && r.correct;
  }
}

/** The response that `grade` accepts, for tests, hints and the "show answer" reveal. */
export function correctResponse(q: Question): Response {
  switch (q.kind) {
    case "mcq":
      return { kind: "mcq", choice: q.answer };
    case "multi":
      return { kind: "multi", choices: [...q.answers] };
    case "truefalse":
      return { kind: "truefalse", value: q.answer };
    case "order":
      return { kind: "order", steps: [...q.steps] };
    case "numeric":
      return { kind: "numeric", value: q.answer };
    case "short":
      return { kind: "short", text: q.accept[0] };
    case "sql":
      return { kind: "sql", correct: true };
  }
}

/** The answer as one line of text, for the explanation box. */
export function answerText(q: Question): string {
  switch (q.kind) {
    case "mcq":
      return q.choices[q.answer];
    case "multi":
      return q.answers.map((i) => q.choices[i]).join(", ");
    case "truefalse":
      return q.answer ? "True" : "False";
    case "order":
      return q.steps.map((s, i) => `${i + 1}. ${s}`).join("  ");
    case "numeric":
      return q.unit ? `${q.answer} ${q.unit}` : String(q.answer);
    case "short":
      return q.accept[0];
    case "sql":
      return q.solution;
  }
}

/** The order steps as first shown: a seeded shuffle that is never already solved. */
export function scrambleSteps(steps: readonly string[], seed: number): string[] {
  if (steps.length < 2) return [...steps];
  const r = rng(seed);
  for (let tries = 0; tries < 8; tries++) {
    const s = shuffled(r, steps);
    if (s.some((x, i) => x !== steps[i])) return s;
  }
  return [...steps.slice(1), steps[0]];
}

export interface DeckOptions {
  topic: TopicId;
  seed: number;
  size: number;
  /** Keep only these difficulties (default: all). */
  difficulties?: readonly Difficulty[];
}

/**
 * A battle's questions: the topic's fixed questions and generator instances, filtered by difficulty,
 * shuffled by seed and trimmed to `size`. Each generator contributes at most one instance per deck.
 */
export function buildDeck(questions: readonly Question[], generators: readonly Generator[], o: DeckOptions): Question[] {
  const keep = (d: Difficulty) => !o.difficulties || o.difficulties.includes(d);
  const r = rng(o.seed);
  const fixed = questions.filter((q) => q.topic === o.topic && keep(q.difficulty));
  const made = generators.filter((g) => g.topic === o.topic && keep(g.difficulty)).map((g) => g.generate(Math.floor(r() * 2 ** 31)));
  return shuffled(r, [...fixed, ...made]).slice(0, o.size);
}

/** Swap step `i` with its neighbour above (-1) or below (+1); out-of-range moves change nothing. */
export function moveStep<T>(steps: readonly T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  const out = steps.slice();
  if (i < 0 || i >= out.length || j < 0 || j >= out.length) return out;
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

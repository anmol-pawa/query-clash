import type { BossId } from "@/content/types";
import type { Relation } from "@/lib/dbms/algebra";

/** DBMS Interview mode: the question model. Every question is graded by `grade` in `game/engine/interview.ts`. */

export type TopicId =
  | "basics"
  | "er"
  | "normalization"
  | "transactions"
  | "concurrency"
  | "storage"
  | "query"
  | "distributed"
  | "sql";

/** 1 = warm-up, 2 = standard interview, 3 = tough / follow-up. */
export type Difficulty = 1 | 2 | 3;

interface QuestionBase {
  id: string;
  topic: TopicId;
  prompt: string;
  /** Shown after every answer, right or wrong. */
  explanation: string;
  difficulty: Difficulty;
  tags: string[];
  /** Where this tends to come up, e.g. "Common in product-company screens". */
  askedAt?: string;
  /** Small named relations shown under the prompt (relational-algebra problems). */
  tables?: Relation[];
  /** A precedence graph drawn under the prompt (the question is about the graph itself). */
  graph?: PrecedenceGraphSpec;
  /** A precedence graph drawn in the explanation (the solution's graph, hidden until the player answers). */
  explainGraph?: PrecedenceGraphSpec;
}

/** Transactions as nodes, Ti → Tj edges; `cycle` (first node repeated last) is highlighted. */
export interface PrecedenceGraphSpec {
  nodes: number[];
  edges: [number, number][];
  cycle?: number[] | null;
  /** The panel title (default "Precedence graph"), e.g. "Wait-for graph". */
  title?: string;
}

export interface McqQuestion extends QuestionBase {
  kind: "mcq";
  choices: string[];
  /** Index into `choices`. */
  answer: number;
}

export interface MultiQuestion extends QuestionBase {
  kind: "multi";
  choices: string[];
  /** Every correct index; the player must pick exactly these. */
  answers: number[];
}

export interface TrueFalseQuestion extends QuestionBase {
  kind: "truefalse";
  answer: boolean;
}

export interface OrderQuestion extends QuestionBase {
  kind: "order";
  /** The steps in the correct order; shown shuffled. */
  steps: string[];
}

export interface NumericQuestion extends QuestionBase {
  kind: "numeric";
  answer: number;
  /** Absolute tolerance (default 0: exact). */
  tolerance?: number;
  unit?: string;
}

export interface ShortQuestion extends QuestionBase {
  kind: "short";
  /** Accepted answers, compared after normalising case, spaces and punctuation. */
  accept: string[];
}

/** Write the query: graded by running it on PGlite against the mission with this id (see `sqlbank.ts`). */
export interface SqlQuestion extends QuestionBase {
  kind: "sql";
  missionId: string;
  /** The reference query in PostgreSQL syntax, shown after the answer. */
  solution: string;
}

export type Question = McqQuestion | MultiQuestion | TrueFalseQuestion | OrderQuestion | NumericQuestion | ShortQuestion | SqlQuestion;
export type QuestionKind = Question["kind"];

/** A seeded problem generator: the same seed always builds the same, solver-answered question. */
export interface Generator {
  id: string;
  topic: TopicId;
  difficulty: Difficulty;
  tags: string[];
  askedAt?: string;
  generate(seed: number): Question;
}

export type Response =
  | { kind: "mcq"; choice: number }
  | { kind: "multi"; choices: number[] }
  | { kind: "truefalse"; value: boolean }
  /** The steps as the player arranged them. */
  | { kind: "order"; steps: string[] }
  | { kind: "numeric"; value: number }
  | { kind: "short"; text: string }
  /** The verdict from running the player's query on the database. */
  | { kind: "sql"; correct: boolean };

export interface Topic {
  id: TopicId;
  title: string;
  blurb: string;
  color: string;
  /** The boss creature that guards this topic in battle. */
  foe: BossId;
}

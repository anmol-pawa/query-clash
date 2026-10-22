/**
 * The DBMS Interview battle as a pure reducer with no rendering code.
 *
 *   intro → ask → (answer: right = your attack, wrong = the foe's) → explain → ask … → victory | defeat
 *
 * A right answer hits the guardian for damage scaled by difficulty and the
 * answer streak; a wrong one lets it strike back. The battle ends when either
 * side faints, or when the deck runs out with the guardian still standing.
 */
import type { Difficulty, Question, QuestionKind } from "@/content/interview/types";
import type { AttackKind } from "@/lib/dialect/concepts";

export type InterviewPhase = "intro" | "ask" | "anim" | "explain" | "victory" | "defeat";

export interface InterviewSide {
  name: string;
  hp: number;
  maxHp: number;
}

export interface InterviewStats {
  hits: number;
  misses: number;
  crits: number;
  damageDealt: number;
  damageTaken: number;
  /** Longest run of right answers, minus one (matches `bestCombo` in the campaign report). */
  bestCombo: number;
  hints: number;
}

export interface InterviewState {
  phase: InterviewPhase;
  deck: Question[];
  index: number;
  player: InterviewSide;
  foe: InterviewSide;
  /** Right answers in a row, including the latest. */
  streak: number;
  /** The latest answer, for the explanation box. */
  last?: { correct: boolean; damage: number; crit: boolean };
  /** Question ids answered right this battle. */
  solved: string[];
  stats: InterviewStats;
}

export type InterviewAction =
  | { type: "start" }
  | { type: "answer"; correct: boolean }
  /** The attack animation landed: apply the damage worked out by `answer`. */
  | { type: "land" }
  | { type: "next" };

/** Questions per battle. */
export const DECK_SIZE = 8;
export const PLAYER_HP = 100;
const BASE: Record<Difficulty, number> = { 1: 90, 2: 110, 3: 130 };
/** A streak of this many right answers makes the next ones crits. */
export const CRIT_STREAK = 3;

/** The guardian has enough HP that about three quarters of the deck must be answered right. */
export const foeHpFor = (deckSize: number) => Math.max(100, Math.round(deckSize * 0.75) * 100);

/** Damage of a right answer: base by difficulty, +10% per streak step (up to +40%), ×1.5 on a crit. */
export function hitDamage(d: Difficulty, streak: number): { damage: number; crit: boolean } {
  const crit = streak >= CRIT_STREAK;
  const combo = 1 + 0.1 * Math.min(Math.max(0, streak - 1), 4);
  return { damage: Math.round(BASE[d] * combo * (crit ? 1.5 : 1)), crit };
}

/** The guardian's counter after a wrong answer: harder questions forgive less. */
export const counterDamageFor = (d: Difficulty) => 18 + 4 * d;

/** Each question type has its own move. */
export const KIND_ATTACK: Record<QuestionKind, AttackKind> = {
  mcq: "bolt",
  multi: "chain",
  truefalse: "slam",
  order: "summon",
  numeric: "haste",
  short: "blade",
  sql: "mirror",
};

export function initialInterview(deck: Question[], player: string, foe: string): InterviewState {
  const foeHp = foeHpFor(deck.length);
  return {
    phase: "intro",
    deck,
    index: 0,
    player: { name: player, hp: PLAYER_HP, maxHp: PLAYER_HP },
    foe: { name: foe, hp: foeHp, maxHp: foeHp },
    streak: 0,
    solved: [],
    stats: { hits: 0, misses: 0, crits: 0, damageDealt: 0, damageTaken: 0, bestCombo: 0, hints: 0 },
  };
}

export const currentQuestion = (s: InterviewState): Question | undefined => s.deck[s.index];

export function interviewReducer(s: InterviewState, a: InterviewAction): InterviewState {
  switch (a.type) {
    case "start":
      return s.phase === "intro" ? { ...s, phase: "ask" } : s;
    case "answer": {
      const q = currentQuestion(s);
      if (s.phase !== "ask" || !q) return s;
      if (a.correct) {
        const streak = s.streak + 1;
        const hit = hitDamage(q.difficulty, streak);
        return { ...s, phase: "anim", streak, last: { correct: true, ...hit }, solved: s.solved.includes(q.id) ? s.solved : [...s.solved, q.id] };
      }
      return { ...s, phase: "anim", streak: 0, last: { correct: false, damage: counterDamageFor(q.difficulty), crit: false } };
    }
    case "land": {
      if (s.phase !== "anim" || !s.last) return s;
      const { correct, damage, crit } = s.last;
      if (correct) {
        const hp = Math.max(0, s.foe.hp - damage);
        return {
          ...s,
          phase: "explain",
          foe: { ...s.foe, hp },
          stats: { ...s.stats, hits: s.stats.hits + 1, crits: s.stats.crits + (crit ? 1 : 0), damageDealt: s.stats.damageDealt + damage, bestCombo: Math.max(s.stats.bestCombo, s.streak - 1) },
        };
      }
      const hp = Math.max(0, s.player.hp - damage);
      return { ...s, phase: "explain", player: { ...s.player, hp }, stats: { ...s.stats, misses: s.stats.misses + 1, damageTaken: s.stats.damageTaken + damage } };
    }
    case "next": {
      if (s.phase !== "explain") return s;
      if (s.foe.hp <= 0) return { ...s, phase: "victory" };
      if (s.player.hp <= 0) return { ...s, phase: "defeat" };
      // out of questions with the guardian still standing: it holds its ground
      if (s.index + 1 >= s.deck.length) return { ...s, phase: "defeat" };
      return { ...s, phase: "ask", index: s.index + 1, last: undefined };
    }
  }
}

/** Stars for a win: 3 with no more than one miss, 2 with HP above a third, else 1. */
export function interviewStars(s: InterviewState): 0 | 1 | 2 | 3 {
  if (s.phase !== "victory") return 0;
  if (s.stats.misses <= 1) return 3;
  if (s.player.hp / s.player.maxHp > 1 / 3) return 2;
  return 1;
}

/** XP for the battle: 15 per right answer, plus 40 per star on a win. */
export const interviewXp = (s: InterviewState) => s.stats.hits * 15 + interviewStars(s) * 40;

/* ---------------------------------------------------------- text box lines */

export function askLine(s: InterviewState): string {
  return `Question ${s.index + 1} of ${s.deck.length}. What will ${s.player.name} answer?`;
}

/** Lines after an answer, before the explanation. */
export function answerLines(s: InterviewState, attack: string): string[] {
  if (!s.last) return [];
  if (s.last.correct) {
    const lines = ["Correct!", `${s.player.name} used ${attack.toUpperCase()}!`];
    if (s.last.crit) lines.push("A critical hit!");
    if (s.streak > 1) lines.push(`${s.streak} in a row!`);
    lines.push(`${s.foe.name} took ${s.last.damage} damage!`);
    return lines;
  }
  return ["Not quite!", `${s.foe.name} strikes back!`, `${s.player.name} took ${s.last.damage} damage!`];
}

/** The closing line when the deck runs out with the guardian still up. */
export const holdLine = (foe: string) => `${foe} held its ground! The questions ran out.`;

/** The save's solved list plus this battle's right answers; generated questions (not in `fixed`) are not stored. */
export function mergeSolved(saved: readonly string[], solved: readonly string[], fixed: ReadonlySet<string>): string[] {
  const add = solved.filter((id) => fixed.has(id) && !saved.includes(id));
  return add.length ? [...saved, ...add] : [...saved];
}

/** The end card's battle report, in reading order. */
export function interviewReport(s: InterviewStats): [string, number][] {
  return [
    ["Right", s.hits],
    ["Wrong", s.misses],
    ["Crits", s.crits],
    ["Damage", s.damageDealt],
    ["Best streak", s.hits ? s.bestCombo + 1 : 0],
  ];
}

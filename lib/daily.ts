/**
 * The daily challenge: the same five interview questions for everyone on a
 * given UTC day, and a streak of consecutive days won. Pure and testable; days
 * are whole UTC days since the epoch (see `dayNumber` in leitner.ts).
 */
import type { Generator, Question, TopicId } from "@/content/interview/types";
import { rng, shuffled } from "@/lib/rng";

export const DAILY_SIZE = 5;

export interface DailyState {
  /** Last day the challenge was won (-1 = never). */
  last: number;
  /** Consecutive days won, ending at `last`. */
  streak: number;
  best: number;
  /** Total days won. */
  total: number;
}

export const EMPTY_DAILY: DailyState = { last: -1, streak: 0, best: 0, total: 0 };

/** Seed shared by every player on a day. */
export const dailySeed = (day: number) => (Math.imul(day + 1, 2654435761) ^ 0x9e3779b9) >>> 0;

/**
 * Five questions from five different topics, picked by the day's seed. One
 * slot is a generated problem when the chosen topic has a generator, so
 * computed questions show up too.
 */
export function buildDaily(questions: readonly Question[], generators: readonly Generator[], day: number, size = DAILY_SIZE): Question[] {
  const r = rng(dailySeed(day));
  const topics = [...new Set(questions.map((q) => q.topic))].sort();
  const picked = shuffled(r, topics).slice(0, size);
  const genSlot = Math.floor(r() * picked.length);
  const out = picked.map((topic: TopicId, i) => {
    const gen = generators.filter((g) => g.topic === topic);
    if (i === genSlot && gen.length) return gen[Math.floor(r() * gen.length)].generate(Math.floor(r() * 2 ** 31));
    const pool = questions.filter((q) => q.topic === topic);
    return pool[Math.floor(r() * pool.length)];
  });
  return shuffled(r, out);
}

export const wonToday = (d: DailyState, today: number) => d.last === today;

/** The streak to show on `today`: still alive if the last win was today or yesterday. */
export const liveStreak = (d: DailyState, today: number) => (d.last >= today - 1 ? d.streak : 0);

/** Record a win on `today` (returns a new object; a second win on the same day changes nothing). */
export function recordDailyWin(d: DailyState, today: number): DailyState {
  if (d.last === today) return d;
  const streak = d.last === today - 1 ? d.streak + 1 : 1;
  return { last: today, streak, best: Math.max(d.best, streak), total: d.total + 1 };
}

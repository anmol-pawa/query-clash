import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { DAILY_SIZE, EMPTY_DAILY, buildDaily, dailySeed, liveStreak, recordDailyWin, wonToday } from "@/lib/daily";

const T = 20_000;

describe("daily challenge deck", () => {
  it("is the same for the same day and differs between days", () => {
    const ids = (d: number) => buildDaily(QUESTIONS, GENERATORS, d).map((q) => q.prompt);
    expect(ids(T)).toEqual(ids(T));
    const days = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(ids(T + i))));
    expect(days.size).toBeGreaterThan(8);
    expect(dailySeed(T)).not.toBe(dailySeed(T + 1));
  });
  it("has five questions from five different topics", () => {
    for (let d = T; d < T + 40; d++) {
      const deck = buildDaily(QUESTIONS, GENERATORS, d);
      expect(deck).toHaveLength(DAILY_SIZE);
      expect(new Set(deck.map((q) => q.topic)).size).toBe(DAILY_SIZE);
    }
  });
});

describe("daily streak", () => {
  it("counts consecutive days, resets after a gap and ignores a repeat win", () => {
    let d = recordDailyWin(EMPTY_DAILY, T);
    expect(d).toEqual({ last: T, streak: 1, best: 1, total: 1 });
    expect(recordDailyWin(d, T)).toBe(d);
    d = recordDailyWin(d, T + 1);
    d = recordDailyWin(d, T + 2);
    expect(d.streak).toBe(3);
    d = recordDailyWin(d, T + 5);
    expect(d).toEqual({ last: T + 5, streak: 1, best: 3, total: 4 });
  });
  it("shows a live streak until a day is missed", () => {
    const d = recordDailyWin(recordDailyWin(EMPTY_DAILY, T), T + 1);
    expect(liveStreak(d, T + 1)).toBe(2);
    expect(liveStreak(d, T + 2)).toBe(2); // yesterday's win: still alive, win today to extend
    expect(liveStreak(d, T + 3)).toBe(0);
    expect(wonToday(d, T + 1)).toBe(true);
    expect(wonToday(d, T + 2)).toBe(false);
    expect(liveStreak(EMPTY_DAILY, T)).toBe(0);
  });
});

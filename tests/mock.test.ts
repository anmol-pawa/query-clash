import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { correctResponse } from "@/game/engine/interview";
import { MOCK_HISTORY, MOCK_SIZE, addResult, buildMock, clock, gradeFor, scorecard, toResult } from "@/lib/mock";

describe("buildMock", () => {
  it("builds 20 distinct questions with no SQL-writing ones", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const deck = buildMock(QUESTIONS, GENERATORS, seed);
      expect(deck).toHaveLength(MOCK_SIZE);
      expect(new Set(deck.map((q) => q.id)).size).toBe(MOCK_SIZE);
      expect(deck.every((q) => q.kind !== "sql")).toBe(true);
    }
  });
  it("is deterministic per seed and differs between seeds", () => {
    const ids = (s: number) => buildMock(QUESTIONS, GENERATORS, s).map((q) => q.id).join();
    expect(ids(7)).toBe(ids(7));
    expect(ids(7)).not.toBe(ids(8));
  });
  it("spreads evenly over topics (2 or 3 each across 8 topics)", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const counts = new Map<string, number>();
      for (const q of buildMock(QUESTIONS, GENERATORS, seed)) counts.set(q.topic, (counts.get(q.topic) ?? 0) + 1);
      expect(counts.size).toBe(8);
      for (const n of counts.values()) expect([2, 3]).toContain(n);
    }
  });
  it("gives a smaller deck when asked, and runs dry gracefully", () => {
    expect(buildMock(QUESTIONS, GENERATORS, 3, 5)).toHaveLength(5);
    expect(buildMock(QUESTIONS.slice(0, 3), [], 3)).toHaveLength(3);
  });
});

describe("scorecard", () => {
  const deck = buildMock(QUESTIONS, GENERATORS, 11);
  it("all right is 100% grade A, with every topic full marks", () => {
    const c = scorecard(deck, deck.map(correctResponse), 600, false);
    expect(c).toMatchObject({ right: 20, total: 20, pct: 100, grade: "A", verdict: "Strong hire", seconds: 600 });
    for (const t of Object.values(c.perTopic)) expect(t!.right).toBe(t!.total);
    expect(Object.values(c.perTopic).reduce((a, t) => a + t!.total, 0)).toBe(20);
  });
  it("skipped questions count as wrong and show as null", () => {
    const c = scorecard(deck, deck.map((q, i) => (i < 10 ? correctResponse(q) : null)), 1800, true);
    expect(c.right).toBe(10);
    expect(c.pct).toBe(50);
    expect(c.grade).toBe("D");
    expect(c.timedOut).toBe(true);
    expect(c.results.slice(10).every((x) => x === null)).toBe(true);
  });
  it("a wrong response of the wrong kind is wrong, not skipped", () => {
    const c = scorecard(deck.slice(0, 1), [{ kind: "sql", correct: false }], 5, false);
    expect(c.results).toEqual([false]);
    expect(c.pct).toBe(0);
    expect(c.grade).toBe("F");
  });
  it("grade boundaries", () => {
    expect([90, 89, 75, 74, 60, 59, 40, 39, 0].map((p) => gradeFor(p).grade)).toEqual(["A", "B", "B", "C", "C", "D", "D", "F", "F"]);
  });
  it("history keeps the newest ten", () => {
    let h: ReturnType<typeof addResult> = [];
    for (let i = 0; i < 14; i++) h = addResult(h, toResult(scorecard(deck, [], i, false), i));
    expect(h).toHaveLength(MOCK_HISTORY);
    expect(h[0].day).toBe(13);
  });
  it("formats the clock", () => {
    expect([clock(0), clock(65), clock(1800), clock(-4)]).toEqual(["0:00", "1:05", "30:00", "0:00"]);
  });
});

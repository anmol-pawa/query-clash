import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { SCHEMA_DRILLS } from "@/content/interview/schemaScenarios";
import { correctResponse } from "@/game/engine/interview";
import { GENERATORS } from "@/content/interview";
import { LOOP_HISTORY, LOOP_REVIEW_KEPT, WEAK_DRILL_SIZE, reviewWeakSpots, weakDrill, LOOP_MINUTES, ROUND_POINTS, THEORY_TOPICS, addLoopResult, buildLoop, loopScorecard, toLoopResult, type RoundOutcome } from "@/lib/loop";

const schemas = SCHEMA_DRILLS.map((d) => ({ id: d.id, title: d.title }));

describe("buildLoop", () => {
  it("builds the five rounds in interview order", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const loop = buildLoop(QUESTIONS, schemas, seed);
      expect(loop.map((r) => r.kind)).toEqual(["sql", "schema", "explain", "theory", "theory"]);
      const ids = loop.map((r) => (r.kind === "schema" ? r.schemaId : r.question.id));
      expect(new Set(ids).size).toBe(5);
    }
  });
  it("draws each round from the right pool", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const [sql, schema, explain, t1, t2] = buildLoop(QUESTIONS, schemas, seed);
      if (sql.kind !== "sql" || explain.kind !== "explain" || t1.kind !== "theory" || t2.kind !== "theory" || schema.kind !== "schema") throw new Error("shape");
      expect(sql.question.kind).toBe("sql");
      expect(explain.question.plan).toBeTruthy();
      expect(SCHEMA_DRILLS.some((d) => d.id === schema.schemaId)).toBe(true);
      for (const t of [t1, t2]) {
        expect(t.question.kind).not.toBe("sql");
        expect(t.question.plan).toBeUndefined();
        expect(THEORY_TOPICS).toContain(t.question.topic);
      }
      expect(t1.question.topic).not.toBe(t2.question.topic);
    }
  });
  it("is deterministic per seed and varies between seeds", () => {
    const sig = (s: number) => buildLoop(QUESTIONS, schemas, s).map((r) => (r.kind === "schema" ? r.schemaId : r.question.id)).join();
    expect(sig(5)).toBe(sig(5));
    const sigs = new Set(Array.from({ length: 20 }, (_, i) => sig(i + 1)));
    expect(sigs.size).toBeGreaterThan(10);
  });
});

describe("loopScorecard", () => {
  const loop = buildLoop(QUESTIONS, schemas, 11);
  const perfect = (): RoundOutcome[] => loop.map((r) => (r.kind === "schema" ? { kind: "schema", passed: 8, total: 8 } : r.kind === "sql" ? { kind: "sql", correct: true } : correctResponse(r.question)));

  it("round points sum to 100", () => {
    expect(ROUND_POINTS.sql + ROUND_POINTS.schema + ROUND_POINTS.explain + 2 * ROUND_POINTS.theory).toBe(100);
    expect(LOOP_MINUTES).toBe(45);
  });
  it("gives 100 points, an A and no weak spots for a perfect loop", () => {
    const c = loopScorecard(loop, perfect(), 1800, false);
    expect(c.points).toBe(100);
    expect(c.pct).toBe(100);
    expect(c.grade).toBe("A");
    expect(c.weakSpots).toEqual([]);
  });
  it("scores nothing for an empty loop and lists every round as weak", () => {
    const c = loopScorecard(loop, [], LOOP_MINUTES * 60, true);
    expect(c.points).toBe(0);
    expect(c.grade).toBe("F");
    expect(c.timedOut).toBe(true);
    expect(c.weakSpots).toHaveLength(5);
  });
  it("gives partial schema credit and ranks weak spots worst first", () => {
    const o = perfect();
    o[1] = { kind: "schema", passed: 6, total: 8 }; // 75% of 25 = 18.75, shown 18.8
    o[0] = { kind: "sql", correct: false }; // lose 30
    const c = loopScorecard(loop, o, 2000, false);
    expect(c.rounds[1].points).toBe(18.8);
    expect(c.points).toBe(Math.round(18.8 + 15 + 15 + 15));
    expect(c.weakSpots.map((w) => w.kind)).toEqual(["sql", "schema"]);
    expect(c.perTopic.sql).toEqual({ points: 0, max: 30 });
    expect(c.perTopic.er?.max).toBe(25);
  });
  it("counts a wrong theory answer as 15 points", () => {
    const o = perfect();
    const r = loop[3];
    if (r.kind !== "theory") throw new Error("shape");
    o[3] = r.question.kind === "truefalse" ? { kind: "truefalse", value: !r.question.answer } : { kind: "short", text: "zzz-wrong" };
    const c = loopScorecard(loop, o, 100, false);
    expect(c.rounds[3].points).toBe(0);
    expect(c.points).toBe(85);
    expect(c.weakSpots).toHaveLength(1);
  });
});

describe("loop history", () => {
  it("keeps the newest results, capped, with the weak topics", () => {
    const loop = buildLoop(QUESTIONS, schemas, 3);
    const c = loopScorecard(loop, [], 10, false);
    const res = toLoopResult(c, 20000);
    expect(res.weakTopics.length).toBeGreaterThan(0);
    let h = [] as ReturnType<typeof addLoopResult>;
    for (let i = 0; i < LOOP_HISTORY + 3; i++) h = addLoopResult(h, { ...res, day: i });
    expect(h).toHaveLength(LOOP_HISTORY);
    expect(h[0].day).toBe(LOOP_HISTORY + 2);
  });
});

describe("loop replay and weak-spot drill", () => {
  const rounds = buildLoop(QUESTIONS, schemas, 7);
  const outcomes: RoundOutcome[] = rounds.map((r, i) => (r.kind === "schema" ? { kind: "schema", passed: 1, total: 4 } : i === 2 ? correctResponse(r.question) : { kind: "short", text: "zzz" }));
  const card = loopScorecard(rounds, outcomes, 600, false);
  const result = toLoopResult(card, 100, rounds);

  it("keeps a per-round review and ranks the weak spots worst first", () => {
    expect(result.review).toHaveLength(5);
    expect(result.review!.map((r) => r.kind)).toEqual(["sql", "schema", "explain", "theory", "theory"]);
    const weak = reviewWeakSpots(result);
    expect(weak.map((w) => w.ref)).toEqual(card.weakSpots.map((w) => w.ref));
    expect(weak.some((w) => w.kind === "explain")).toBe(false);
  });
  it("only the newest loops keep their review", () => {
    let h: ReturnType<typeof addLoopResult> = [];
    for (let i = 0; i < LOOP_REVIEW_KEPT + 3; i++) h = addLoopResult(h, toLoopResult(card, i, rounds));
    expect(h.filter((x) => x.review)).toHaveLength(LOOP_REVIEW_KEPT);
    expect(h[0].review).toBeTruthy();
    expect(h[LOOP_REVIEW_KEPT].review).toBeUndefined();
  });
  it("builds a drill with the missed questions first and filler from the same topics", () => {
    const weak = reviewWeakSpots(result);
    const deck = weakDrill(QUESTIONS, GENERATORS, weak, 3);
    expect(deck.length).toBeGreaterThan(0);
    expect(deck.length).toBeLessThanOrEqual(WEAK_DRILL_SIZE);
    expect(new Set(deck.map((q) => q.id)).size).toBe(deck.length);
    const topics = new Set(weak.map((w) => w.topic));
    for (const w of weak.filter((x) => x.kind !== "schema")) expect(deck.some((q) => q.id === w.ref)).toBe(true);
    for (const q of deck) expect(topics.has(q.topic)).toBe(true);
    expect(weakDrill(QUESTIONS, GENERATORS, weak, 3).map((q) => q.id)).toEqual(deck.map((q) => q.id));
  });
});

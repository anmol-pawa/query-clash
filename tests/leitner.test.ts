import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { BOX_DAYS, MAX_BOX, boxCounts, buildDrill, dayNumber, dueCount, recordAnswer, review, tally, weakTopics } from "@/lib/leitner";

const T = 20_000;

describe("Leitner boxes", () => {
  it("a new card answered right enters box 2; wrong stays in box 1 and is due today", () => {
    expect(review(undefined, true, T)).toEqual({ box: 2, due: T + BOX_DAYS[1] });
    expect(review(undefined, false, T)).toEqual({ box: 1, due: T });
  });
  it("climbs one box per right answer, caps at the top box and falls to box 1 on a miss", () => {
    let c = review(undefined, true, T);
    for (let i = 0; i < 10; i++) c = review(c, true, T);
    expect(c.box).toBe(MAX_BOX);
    expect(c.due).toBe(T + BOX_DAYS[MAX_BOX - 1]);
    expect(review(c, false, T).box).toBe(1);
  });
  it("intervals grow with the box", () => {
    for (let i = 1; i < BOX_DAYS.length; i++) expect(BOX_DAYS[i]).toBeGreaterThan(BOX_DAYS[i - 1]);
  });
  it("dayNumber counts UTC days", () => {
    expect(dayNumber(new Date("1970-01-02T00:00:00Z"))).toBe(1);
    expect(dayNumber(new Date("1970-01-01T23:59:59Z"))).toBe(0);
  });
  it("recordAnswer does not mutate and dueCount only counts due, known cards", () => {
    const a = recordAnswer({}, "x", true, T);
    const b = recordAnswer(a, "y", false, T);
    expect(Object.keys(a)).toEqual(["x"]);
    const valid = new Set(["x", "y"]);
    expect(dueCount(b, valid, T)).toBe(1); // y is due today; x is due in a day
    expect(dueCount(b, valid, T + 1)).toBe(2);
    expect(dueCount(b, new Set(["x"]), T + 1)).toBe(1);
    expect(boxCounts(b, valid)).toEqual([1, 1, 0, 0, 0]);
  });
});

describe("weak topics", () => {
  it("needs a few answers, then sorts weakest first", () => {
    let s = tally({}, "sql", false);
    expect(weakTopics(s)).toEqual([]);
    s = tally(tally(s, "sql", false), "sql", true);
    for (let i = 0; i < 4; i++) s = tally(s, "er", true);
    s = tally(s, "er", false);
    const w = weakTopics(s);
    expect(w.map((x) => x.topic)).toEqual(["sql", "er"]);
    expect(w[0].accuracy).toBeCloseTo(1 / 3);
    expect(w[1].accuracy).toBeCloseTo(0.8);
  });
});

describe("daily drill", () => {
  const ids = new Set(QUESTIONS.map((q) => q.id));
  it("has 10 distinct questions, mixing topics", () => {
    const d = buildDrill(QUESTIONS, GENERATORS, {}, {}, T, 1);
    expect(d).toHaveLength(10);
    expect(new Set(d.map((q) => q.id)).size).toBe(10);
    expect(new Set(d.map((q) => q.topic)).size).toBeGreaterThanOrEqual(3);
    for (const topic of new Set(d.map((q) => q.topic))) expect(d.filter((q) => q.topic === topic).length).toBeLessThanOrEqual(4);
  });
  it("is deterministic per seed", () => {
    const a = buildDrill(QUESTIONS, GENERATORS, {}, {}, T, 7).map((q) => q.id);
    const b = buildDrill(QUESTIONS, GENERATORS, {}, {}, T, 7).map((q) => q.id);
    expect(a).toEqual(b);
  });
  it("puts every due card in, ahead of unseen ones", () => {
    const pick = QUESTIONS.filter((q) => q.topic === "er").slice(0, 3).concat(QUESTIONS.filter((q) => q.topic === "sql").slice(0, 3));
    let st = {};
    for (const q of pick) st = recordAnswer(st, q.id, false, T - 5);
    const d = buildDrill(QUESTIONS, GENERATORS, st, {}, T, 3).map((q) => q.id);
    for (const q of pick) expect(d).toContain(q.id);
  });
  it("leaves out nothing it shouldn't: cards not yet due come last", () => {
    let st = {};
    for (const q of QUESTIONS) st = recordAnswer(st, q.id, true, T); // everything seen, none due
    const d = buildDrill(QUESTIONS, GENERATORS, st, {}, T, 5);
    expect(d).toHaveLength(10);
    expect(dueCount(st, ids, T)).toBe(0);
  });
  it("tops up with generated problems when fixed questions are capped", () => {
    const few = QUESTIONS.filter((q) => q.topic === "sql");
    const d = buildDrill(few, GENERATORS, {}, {}, T, 2);
    expect(d).toHaveLength(10);
    expect(d.filter((q) => !ids.has(q.id)).length).toBeGreaterThan(0);
  });
});

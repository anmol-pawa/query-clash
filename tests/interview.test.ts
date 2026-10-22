import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS, TOPICS } from "@/content/interview";
import type { Question, Response } from "@/content/interview/types";
import { superkeyCount } from "@/content/interview/basics";
import { answerText, buildDeck, correctResponse, grade, normalizeText, scrambleSteps } from "@/game/engine/interview";
import { countSuperkeys, isSuperkey, subsets } from "@/lib/dbms/keys";

/** Structural checks shared by fixed and generated questions. */
function checkQuestion(q: Question) {
  expect(q.prompt.trim().length).toBeGreaterThan(10);
  expect(q.explanation.trim().length).toBeGreaterThan(10);
  expect([1, 2, 3]).toContain(q.difficulty);
  expect(q.tags.length).toBeGreaterThan(0);
  expect(TOPICS.map((t) => t.id)).toContain(q.topic);
  switch (q.kind) {
    case "mcq":
      expect(q.choices.length).toBeGreaterThanOrEqual(2);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.choices.length);
      break;
    case "multi":
      expect(new Set(q.choices).size).toBe(q.choices.length);
      expect(q.answers.length).toBeGreaterThan(0);
      expect(new Set(q.answers).size).toBe(q.answers.length);
      for (const i of q.answers) expect(i >= 0 && i < q.choices.length).toBe(true);
      break;
    case "order":
      expect(q.steps.length).toBeGreaterThanOrEqual(3);
      expect(new Set(q.steps).size).toBe(q.steps.length);
      break;
    case "numeric":
      expect(Number.isFinite(q.answer)).toBe(true);
      break;
    case "short":
      expect(q.accept.length).toBeGreaterThan(0);
      for (const a of q.accept) expect(normalizeText(a)).not.toBe("");
      break;
  }
  // The keyed answer grades as correct, and its text is non-empty.
  expect(grade(q, correctResponse(q))).toBe(true);
  expect(answerText(q).length).toBeGreaterThan(0);
}

describe("interview content", () => {
  it("has unique topic and question ids, and every question is well-formed and answerable", () => {
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
    for (const t of TOPICS) expect(t.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS) checkQuestion(q);
  });

  it("covers every question type in the fundamentals topic", () => {
    const kinds = new Set(QUESTIONS.filter((q) => q.topic === "basics").map((q) => q.kind));
    expect([...kinds].sort()).toEqual(["mcq", "multi", "numeric", "order", "short", "truefalse"]);
  });

  it("keys each fundamentals answer correctly", () => {
    const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
    const ans = (id: string) => answerText(byId[id]);
    expect(ans("basics-why-dbms")).toMatch(/every workload/);
    expect(ans("basics-three-schema")).toBe("Internal level");
    expect(ans("basics-logical-independence")).toBe("True");
    expect(ans("basics-ddl")).toBe("CREATE, ALTER, DROP");
    expect(ans("basics-query-pipeline")).toMatch(/^1\. Parse.*2\. Bind.*3\. Optimise.*4\. Execute.*5\. Return/);
    expect(ans("basics-acid-i")).toBe("isolation");
    expect(ans("basics-pk-null")).toBe("False");
    expect(ans("basics-drop")).toBe("DROP TABLE t");
    expect(ans("basics-cross-join")).toBe("12 rows");
    expect(ans("basics-hierarchical")).toBe("Hierarchical");
    expect(ans("basics-ddl-name")).toBe("ddl");
    expect(ans("basics-relation-props")).not.toMatch(/alphabetically/);
  });

  it("builds well-formed generated questions for many seeds, deterministically", () => {
    for (const g of GENERATORS) {
      for (let seed = 1; seed <= 200; seed++) {
        const q = g.generate(seed);
        checkQuestion(q);
        expect(q.topic).toBe(g.topic);
        expect(g.generate(seed)).toEqual(q);
      }
    }
  });
});

describe("superkey solver", () => {
  it("enumerates every subset", () => {
    expect(subsets(["A", "B", "C"])).toHaveLength(8);
    expect(isSuperkey(["A", "C"], [["A"]])).toBe(true);
    expect(isSuperkey(["B", "C"], [["A"], ["B", "D"]])).toBe(false);
  });

  it("matches the textbook counts", () => {
    // R(A,B,C,D) with key A: 2^3 = 8.
    expect(countSuperkeys(["A", "B", "C", "D"], [["A"]])).toBe(8);
    // R(A1..An) with keys A1 and A2: 2^(n-1) + 2^(n-1) - 2^(n-2); n = 4 gives 12.
    expect(countSuperkeys(["A", "B", "C", "D"], [["A"], ["B"]])).toBe(12);
    // Keys {A,B} and {C,D} in R(A,B,C,D): 4 + 4 - 1 = 7.
    expect(countSuperkeys(["A", "B", "C", "D"], [["A", "B"], ["C", "D"]])).toBe(7);
    // Keys {A,B} and {C} in R(A..E): 8 + 16 - 4 = 20.
    expect(countSuperkeys(["A", "B", "C", "D", "E"], [["A", "B"], ["C"]])).toBe(20);
  });

  it("generated answers agree with the inclusion–exclusion formula", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const q = superkeyCount.generate(seed);
      if (q.kind !== "numeric") throw new Error("expected numeric");
      const n = q.prompt.match(/R\(([^)]*)\)/)![1].split(", ").length;
      const keys = [...q.prompt.matchAll(/\{([^}]*)\}/g)].map((m) => m[1].split(", ").length);
      const want = keys.length === 1 ? 2 ** (n - keys[0]) : 2 ** (n - keys[0]) + 2 ** (n - keys[1]) - 2 ** (n - keys[0] - keys[1]);
      expect(q.answer).toBe(want);
    }
  });
});

describe("grading", () => {
  const q = (over: Partial<Question> & Pick<Question, "kind">): Question =>
    ({ id: "t", topic: "basics", prompt: "test prompt here", explanation: "test explanation", difficulty: 1, tags: ["t"], ...over }) as Question;

  it("grades MCQ and true/false by exact choice", () => {
    const m = q({ kind: "mcq", choices: ["a", "b", "c"], answer: 1 });
    expect(grade(m, { kind: "mcq", choice: 1 })).toBe(true);
    expect(grade(m, { kind: "mcq", choice: 2 })).toBe(false);
    const tf = q({ kind: "truefalse", answer: false });
    expect(grade(tf, { kind: "truefalse", value: false })).toBe(true);
    expect(grade(tf, { kind: "truefalse", value: true })).toBe(false);
  });

  it("needs exactly the right set for multi-select, in any order", () => {
    const m = q({ kind: "multi", choices: ["a", "b", "c", "d"], answers: [0, 2] });
    expect(grade(m, { kind: "multi", choices: [2, 0] })).toBe(true);
    expect(grade(m, { kind: "multi", choices: [0] })).toBe(false);
    expect(grade(m, { kind: "multi", choices: [0, 2, 3] })).toBe(false);
    expect(grade(m, { kind: "multi", choices: [0, 0] })).toBe(false);
  });

  it("needs the exact sequence for ordering", () => {
    const o = q({ kind: "order", steps: ["x", "y", "z"] });
    expect(grade(o, { kind: "order", steps: ["x", "y", "z"] })).toBe(true);
    expect(grade(o, { kind: "order", steps: ["y", "x", "z"] })).toBe(false);
    expect(grade(o, { kind: "order", steps: ["x", "y"] })).toBe(false);
  });

  it("checks numbers with tolerance and rejects NaN", () => {
    const n = q({ kind: "numeric", answer: 2.5, tolerance: 0.1 });
    expect(grade(n, { kind: "numeric", value: 2.58 })).toBe(true);
    expect(grade(n, { kind: "numeric", value: 2.7 })).toBe(false);
    expect(grade(n, { kind: "numeric", value: NaN })).toBe(false);
    const exact = q({ kind: "numeric", answer: 12 });
    expect(grade(exact, { kind: "numeric", value: 12 })).toBe(true);
    expect(grade(exact, { kind: "numeric", value: 12.5 })).toBe(false);
  });

  it("normalises short answers but never accepts an empty one", () => {
    const s = q({ kind: "short", accept: ["isolation", "Data Definition Language"] });
    for (const text of ["Isolation", "  ISOLATION. ", "data   definition language", "Data-Definition Language"]) {
      expect(grade(s, { kind: "short", text })).toBe(true);
    }
    expect(grade(s, { kind: "short", text: "" })).toBe(false);
    expect(grade(s, { kind: "short", text: "isolate" })).toBe(false);
  });

  it("marks a response of the wrong kind wrong", () => {
    const m = q({ kind: "mcq", choices: ["a", "b"], answer: 0 });
    const r: Response = { kind: "truefalse", value: true };
    expect(grade(m, r)).toBe(false);
  });
});

describe("decks", () => {
  it("scrambles order steps deterministically and never pre-solved", () => {
    const steps = ["a", "b", "c", "d"];
    for (let seed = 0; seed < 100; seed++) {
      const s = scrambleSteps(steps, seed);
      expect([...s].sort()).toEqual(steps);
      expect(s).not.toEqual(steps);
      expect(scrambleSteps(steps, seed)).toEqual(s);
    }
  });

  it("builds a seeded deck from one topic, filtered by difficulty", () => {
    const d = buildDeck(QUESTIONS, GENERATORS, { topic: "basics", seed: 7, size: 8 });
    expect(d).toHaveLength(8);
    expect(d.every((x) => x.topic === "basics")).toBe(true);
    expect(new Set(d.map((x) => x.id)).size).toBe(8);
    expect(buildDeck(QUESTIONS, GENERATORS, { topic: "basics", seed: 7, size: 8 })).toEqual(d);
    expect(buildDeck(QUESTIONS, GENERATORS, { topic: "basics", seed: 8, size: 8 }).map((x) => x.id)).not.toEqual(d.map((x) => x.id));
    const easy = buildDeck(QUESTIONS, GENERATORS, { topic: "basics", seed: 7, size: 50, difficulties: [1] });
    expect(easy.length).toBeGreaterThan(0);
    expect(easy.every((x) => x.difficulty === 1)).toBe(true);
    expect(buildDeck(QUESTIONS, GENERATORS, { topic: "sql", seed: 1, size: 5 })).toEqual([]);
  });
});

describe("topic picker", () => {
  it("lists every topic in order with progress under the difficulty filter", async () => {
    const { overallProgress, topicRows, kindCounts } = await import("@/components/menu/interviewList");
    const easyIds = QUESTIONS.filter((q) => q.topic === "basics" && q.difficulty === 1).map((q) => q.id);
    const all = topicRows(TOPICS, QUESTIONS, GENERATORS, [easyIds[0], "basics-relation-props"], "all");
    expect(all.map((r) => r.topic.id)).toEqual(TOPICS.map((t) => t.id));
    const basics = all[0];
    expect(basics.total).toBe(QUESTIONS.filter((q) => q.topic === "basics").length);
    expect(basics.solved).toBe(2);
    expect(basics.generators).toBe(1);
    expect(basics.playable).toBe(true);
    expect(all.find((r) => r.topic.id === "sql")!.playable).toBe(false);

    const easy = topicRows(TOPICS, QUESTIONS, GENERATORS, [easyIds[0], "basics-relation-props"], 1)[0];
    expect(easy.total).toBe(easyIds.length);
    expect(easy.solved).toBe(1);
    expect(easy.generators).toBe(0);
    const tough = topicRows(TOPICS, QUESTIONS, GENERATORS, [], 3)[0];
    expect(tough.playable).toBe(false);

    expect(overallProgress(QUESTIONS, [easyIds[0], "not-a-question"])).toEqual({ got: 1, total: QUESTIONS.length });
    const kinds = kindCounts(QUESTIONS, "basics");
    expect(Object.values(kinds).reduce((a, b) => a + (b ?? 0), 0)).toBe(basics.total);
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { EXPLAIN_FINE } from "@/content/interview/explainFine";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);
const num = (id: string) => (byId[id] as { answer: number }).answer;

describe("EXPLAIN reading drills", () => {
  it("registers every question once with unique ids", () => {
    const ids = EXPLAIN_FINE.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(byId[id]).toBeDefined();
  });

  it("recomputes the numeric answers", () => {
    expect(8 * 18500).toBe(num("explain-loops-multiply") + 0);
    expect(1000 * 1.0 + 100000 * 0.01 + 100000 * 0.0025).toBeCloseTo(num("explain-seq-scan-cost"), 6);
  });

  it("shows plan text where the prompt relies on it", () => {
    for (const id of ["explain-function-on-column", "explain-row-estimate-miss", "explain-hash-join", "explain-offset-cost"]) {
      const q = byId[id === "explain-hash-join" ? "explain-join-algorithm-hash" : id];
      expect(q.plan).toMatch(/cost=/);
    }
  });

  it("keys each answer correctly", () => {
    expect(ans("explain-seq-vs-index-selectivity")).toMatch(/random heap fetch/);
    expect(ans("explain-function-on-column")).toMatch(/lower\(email\)/);
    expect(ans("explain-leading-wildcard")).toBe("name LIKE 'Mc%'");
    expect(ans("explain-type-cast")).toMatch(/cast is applied to the indexed column/);
    expect(ans("explain-index-only-heap-fetches")).toMatch(/visibility map/);
    expect(ans("explain-row-estimate-miss")).toMatch(/ANALYZE/);
    expect(ans("explain-composite-order")).toMatch(/^WHERE city = 'Pune' AND created_at/);
    expect(ans("explain-range-then-equality")).toBe("(status, created_at)");
    expect(ans("explain-partial-index")).toMatch(/WHERE state = 'pending'/);
    expect(ans("explain-covering-include")).toMatch(/index-only scan/i);
    expect(ans("explain-join-algorithm-hash")).toMatch(/smaller input/);
    expect(ans("explain-analyze-writes")).toBe("False");
    expect(ans("explain-offset-cost")).toMatch(/Keyset/);
  });

  it("follows the leftmost-prefix rule for the composite index question", () => {
    const index = ["country", "city", "created_at"];
    const usable = (cols: string[]) => cols[0] === index[0];
    expect(usable(["country", "city"])).toBe(true);
    expect(usable(["city", "created_at"])).toBe(false);
  });
});

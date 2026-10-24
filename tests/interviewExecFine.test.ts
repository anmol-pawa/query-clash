import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

/** Total passes (run building + merges) and page I/Os of an external merge sort. */
function externalSort(pages: number, buffers: number) {
  let runs = Math.ceil(pages / buffers);
  const initialRuns = runs;
  let passes = 1;
  while (runs > 1) {
    runs = Math.ceil(runs / (buffers - 1));
    passes++;
  }
  return { initialRuns, passes, io: 2 * pages * passes };
}

/** Rows produced by an equi-join of two key multisets. */
function joinSize(r: number[], s: number[]): number {
  let n = 0;
  for (const a of r) for (const b of s) if (a === b) n++;
  return n;
}

describe("query execution fine-print questions", () => {
  it("recomputes external sort runs and I/O", () => {
    const sort = externalSort(1000, 10);
    expect(byId["execfine-initial-runs"]).toMatchObject({ answer: sort.initialRuns });
    expect(sort.passes).toBe(4);
    expect(byId["execfine-sort-io"]).toMatchObject({ answer: sort.io });
  });

  it("counts merge join rows with duplicates", () => {
    expect(byId["execfine-merge-dups"]).toMatchObject({ answer: joinSize([1, 2, 2, 3], [2, 2, 2, 4]) });
  });

  it("keys each answer correctly", () => {
    expect(ans("execfine-hash-equality")).toBe("False");
    expect(ans("execfine-blocking-operator")).toMatch(/in-memory sort/);
    expect(ans("execfine-interesting-order")).toBe("True");
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

type V = number | null;

/** Three-valued x <> y: undefined stands for UNKNOWN. */
const neq = (x: number, y: V): boolean | undefined => (y === null ? undefined : x !== y);
/** x NOT IN list = AND of x <> y over the list. */
function notIn(x: number, list: V[]): boolean | undefined {
  let unknown = false;
  for (const y of list) {
    const r = neq(x, y);
    if (r === false) return false;
    if (r === undefined) unknown = true;
  }
  return unknown ? undefined : true;
}

describe("NULL and set-operation fine-print questions", () => {
  it("simulates NOT IN with a NULL in the subquery", () => {
    const rows = [1, 2, 3].filter((x) => notIn(x, [1, null]) === true);
    expect(byId["nullfine-not-in"]).toMatchObject({ answer: rows.length });
  });

  it("recomputes COUNT(DISTINCT) ignoring NULLs", () => {
    const col: V[] = [5, null, 5, 7, null];
    const distinct = new Set(col.filter((v) => v !== null)).size;
    expect(byId["nullfine-count"]).toMatchObject({ answer: distinct });
  });

  it("recomputes UNION and UNION ALL sizes", () => {
    const q1 = [1, 2, 2, 3];
    const q2 = [2, 3, 3, 4];
    expect(byId["nullfine-union-all"]).toMatchObject({ answer: q1.length + q2.length });
    expect(byId["nullfine-union"]).toMatchObject({ answer: new Set([...q1, ...q2]).size });
  });

  it("keys each answer correctly", () => {
    expect(ans("nullfine-null-eq-null")).toBe("False");
    expect(ans("nullfine-intersect-nulls")).toMatch(/One row containing NULL/);
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("subquery and set-operation fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("subfine-scalar-two-rows")).toBe("False");
    expect(ans("subfine-empty-aggregates")).toBe("One row: 0 and NULL");
  });

  it("recomputes the numeric answers", () => {
    // NOT IN with a NULL in the list: x <> 1 AND x <> NULL is never TRUE.
    const list: (number | null)[] = [1, null];
    const notIn = [1, 2, 3].filter((x) => list.every((y) => (y === null ? null : x !== y) === true));
    expect(byId["subfine-not-in-null"]).toMatchObject({ answer: notIn.length });
    expect(byId["subfine-union-distinct"]).toMatchObject({ answer: new Set([1, 1, 2, 2, 3]).size });
    // EXCEPT ALL: multiset subtraction.
    const a = [1, 1, 2];
    const b = [1];
    const rest = [...a];
    for (const y of b) rest.splice(rest.indexOf(y), 1);
    expect(byId["subfine-except-all"]).toMatchObject({ answer: rest.length });
    const rows = [[1, 1], [1, 2], [1, 1], [2, 1]];
    expect(byId["subfine-distinct-pairs"]).toMatchObject({ answer: new Set(rows.map((r) => r.join(","))).size });
  });
});

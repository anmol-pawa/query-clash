import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

type Pair = [string, string];

/** R ÷ S: the A values in R paired with every B value in S. */
function divide(r: Pair[], s: string[]): string[] {
  const as = [...new Set(r.map(([a]) => a))];
  return as.filter((a) => s.every((b) => r.some(([ra, rb]) => ra === a && rb === b)));
}

describe("relational algebra fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("algfine-difference-order")).toBe("False");
    expect(ans("algfine-selection-commute")).toBe("True");
    expect(ans("algfine-fk-side")).toBe("A dept_id column in Employee referencing Department");
  });

  it("recomputes the numeric answers", () => {
    const r: Pair[] = [["1", "x"], ["1", "y"], ["2", "x"], ["2", "z"], ["3", "x"]];
    expect(new Set(r.map(([a]) => a)).size).toBe(3);
    expect(byId["algfine-project-dups"]).toMatchObject({ answer: 3 });
    const div = divide([["a", "x"], ["a", "y"], ["b", "x"], ["c", "y"]], ["x", "y"]);
    expect(div).toEqual(["a"]);
    expect(byId["algfine-division"]).toMatchObject({ answer: div.length });
    expect(byId["algfine-product-size"]).toMatchObject({ answer: 3 * 4 });
  });

  it("shows set difference is not commutative", () => {
    const diff = (a: number[], b: number[]) => a.filter((x) => !b.includes(x));
    expect(diff([1, 2], [2, 3])).toEqual([1]);
    expect(diff([2, 3], [1, 2])).toEqual([3]);
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

describe("query optimizer fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("optfine-covering")).toBe("True");
    expect(ans("optfine-pushdown")).toBe("True");
    expect(ans("optfine-like-leading")).toBe("name LIKE 'Smi%'");
  });

  it("recomputes the numeric answers", () => {
    expect(byId["optfine-selectivity"]).toMatchObject({ answer: 10000 / 50 });
    expect(byId["optfine-left-deep"]).toMatchObject({ answer: factorial(4) });
    expect(byId["optfine-index-nlj"]).toMatchObject({ answer: 10 + 100 * 3 });
  });

  it("shows selection pushdown preserves an inner join result", () => {
    const r = [1, 2, 3, 4, 5];
    const s = [2, 3, 5, 7];
    const join = (a: number[], b: number[]) => a.filter((x) => b.includes(x));
    const p = (x: number) => x > 2;
    expect(join(r, s).filter(p)).toEqual(join(r.filter(p), s));
  });
});

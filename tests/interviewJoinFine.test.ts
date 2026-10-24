import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

const matches = (a: number[], b: number[]) => a.flatMap((x) => b.filter((y) => y === x).map(() => x));

describe("join fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("joinfine-null-keys")).toBe("False");
  });

  it("recomputes the numeric answers", () => {
    const A = [1, 1, 2, 3];
    const B = [1, 2, 2, 4];
    const inner = matches(A, B).length;
    const unmatchedA = A.filter((x) => !B.includes(x)).length;
    const unmatchedB = B.filter((y) => !A.includes(y)).length;
    expect(byId["joinfine-full-outer"]).toMatchObject({ answer: inner + unmatchedA + unmatchedB });
    expect(byId["joinfine-anti-join"]).toMatchObject({ answer: unmatchedA });
    const ids = [1, 2, 3, 4];
    const pairs = ids.flatMap((a) => ids.filter((b) => a < b));
    expect(byId["joinfine-self-join-pairs"]).toMatchObject({ answer: pairs.length });
    const orders = [3, 1, 0];
    expect(byId["joinfine-exists-vs-join"]).toMatchObject({ answer: orders.filter((n) => n > 0).length });
    expect(byId["joinfine-fk-join-size"]).toMatchObject({ answer: 12 });
  });
});

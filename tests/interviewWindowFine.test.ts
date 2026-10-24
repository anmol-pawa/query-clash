import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("window and aggregate fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("winfine-running-frame")).toBe("RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW");
    expect(ans("winfine-where-having")).toBe("True");
    expect(ans("winfine-row-number-ties")).toBe("True");
  });

  it("recomputes the numeric answers", () => {
    const salaries = [100, 100, 90, 80];
    const distinctDesc = [...new Set(salaries)].sort((a, b) => b - a);
    expect(byId["winfine-dense-rank"]).toMatchObject({ answer: distinctDesc.indexOf(80) + 1 });
    const col = [10, 20, null, 30].filter((v): v is number => v !== null);
    expect(byId["winfine-avg-null"]).toMatchObject({ answer: col.reduce((a, b) => a + b, 0) / col.length });
    expect(byId["winfine-group-rows"]).toMatchObject({ answer: Math.min(8, 3 * 2) });
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("basics fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("basfine-unique-null")).toBe("True");
    expect(ans("basfine-physical-independence")).toBe("Physical data independence");
    expect(ans("basfine-duplicate-rows")).toBe("True");
  });

  it("recomputes the numeric answers", () => {
    expect(byId["basfine-cells"]).toMatchObject({ answer: (3 + 1) * (5 - 2) });
    const values: (number | null)[] = [1, 1, 2, null];
    const distinct = new Set(values.filter((v) => v !== null)).size;
    expect(byId["basfine-count-distinct"]).toMatchObject({ answer: distinct });
    const a = new Set([1, 2, 3]);
    const b = new Set([2, 3, 4, 5]);
    expect(byId["basfine-intersect"]).toMatchObject({ answer: [...a].filter((x) => b.has(x)).length });
  });
});

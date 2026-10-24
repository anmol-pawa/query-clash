import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("constraint fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("constraint-check-null")).toBe("True");
    expect(ans("constraint-unique-nulls")).toBe("True");
    expect(ans("constraint-fk-target")).toBe("Columns that have a PRIMARY KEY or UNIQUE constraint");
    expect(ans("constraint-deferred")).toBe("True");
  });

  it("counts cascaded deletes and cross joins", () => {
    const children = 3;
    const grandPerChild = 2;
    expect(1 + children + children * grandPerChild).toBe(10);
    expect(byId["constraint-cascade-count"]).toMatchObject({ answer: 10 });
    expect(7 * 0).toBe(0);
    expect(byId["constraint-cross-empty"]).toMatchObject({ answer: 0 });
  });
});

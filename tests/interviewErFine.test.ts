import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("ER fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("erfine-multivalued")).toBe("True");
    expect(ans("erfine-total-participation")).toBe("Add dept_id to Employee as a NOT NULL foreign key");
    expect(ans("erfine-one-to-many-table")).toBe("False");
  });

  it("recomputes the numeric answers", () => {
    const strong = 3;
    const manyToMany = 1;
    expect(byId["erfine-table-count"]).toMatchObject({ answer: strong + manyToMany });
    const attrs = ["A", "B", "C"];
    let superkeys = 0;
    for (let mask = 0; mask < 1 << attrs.length; mask++) if (mask & 1) superkeys++;
    expect(byId["erfine-superkeys"]).toMatchObject({ answer: superkeys });
    expect(byId["erfine-relationship-bound"]).toMatchObject({ answer: 4 * 5 });
  });
});

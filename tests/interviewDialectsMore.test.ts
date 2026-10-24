import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("Oracle vs PostgreSQL dialect questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("dialect-oracle-empty-string")).toBe("True");
    expect(ans("dialect-ddl-rollback")).toBe("True");
    expect(ans("dialect-row-limit")).toBe("FETCH FIRST 5 ROWS ONLY");
    expect(ans("dialect-sequence-next")).toBe("nextval('order_seq')");
    expect(ans("dialect-null-order")).toBe("True");
    expect(ans("dialect-minus-except")).toBe("False");
  });

  it("sorts NULL as the largest value", () => {
    const rows = [3, null, 1, 2];
    const asc = [...rows].sort((a, b) => (a === null ? 1 : b === null ? -1 : a - b));
    expect(asc).toEqual([1, 2, 3, null]);
  });
});

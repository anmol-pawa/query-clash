import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("query semantics questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("query-not-in-null")).toBe("True");
    expect(ans("query-count-column-nulls")).toBe("7");
    expect(ans("query-union-vs-all")).toBe("5");
    expect(ans("query-left-join-where")).toBe("True");
    expect(ans("query-left-join-count")).toBe("7");
    expect(ans("query-where-vs-having")).toBe("HAVING");
  });

  it("recomputes COUNT(c) over 10 rows with 3 NULLs", () => {
    const col = [1, 2, null, 4, null, 6, 7, null, 9, 10];
    expect(col.filter((v) => v !== null).length).toBe(7);
  });

  it("recomputes the UNION size", () => {
    const r = [1, 2, 3];
    const s = [2, 3, 4, 5];
    expect(new Set([...r, ...s]).size).toBe(5);
    expect(r.length + s.length).toBe(7);
  });

  it("recomputes the LEFT JOIN row count", () => {
    const matches = [2, 2, 2, 0];
    expect(matches.reduce((n, m) => n + Math.max(m, 1), 0)).toBe(7);
  });
});

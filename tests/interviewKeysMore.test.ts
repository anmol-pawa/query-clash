import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("keys and relational fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("basics-superkey-count")).toBe("4");
    expect(ans("basics-fk-null")).toBe("True");
    expect(ans("er-natural-join-no-common")).toBe("True");
    expect(ans("er-union-min-size")).toBe("4");
    expect(ans("er-weak-entity-key")).toMatch(/owner entity's key plus/);
    expect(ans("er-mn-table-count")).toBe("3");
  });

  it("recomputes the superkey count by enumeration", () => {
    const attrs = ["A", "B", "C"];
    let count = 0;
    for (let m = 1; m < 8; m++) if (m & 1) count++; // bit 0 = A, the only candidate key
    expect(count).toBe(4);
    expect(attrs.length).toBe(3);
  });

  it("recomputes the minimum union size", () => {
    const s = [1, 2, 3, 4];
    const r = [1, 2, 3];
    expect(new Set([...r, ...s]).size).toBe(4);
  });
});

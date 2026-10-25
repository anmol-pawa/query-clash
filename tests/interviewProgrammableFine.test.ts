import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("Programmable-database fine-print questions", () => {
  it("recomputes trigger firings: per-row plus per-statement", () => {
    const rows = 5;
    expect(byId["progfine-trigger-count"]).toMatchObject({ answer: rows + 1 });
  });

  it("recomputes unread cursor rows from the fetch position", () => {
    const total = 10;
    let pos = 0;
    for (const n of [3, 4]) pos = Math.min(total, pos + n);
    expect(byId["progfine-cursor"]).toMatchObject({ answer: total - pos });
  });

  it("keys each answer correctly", () => {
    expect(ans("progfine-matview")).toBe("False");
    expect(ans("progfine-updatable-view")).toBe("True");
    expect(ans("progfine-function-commit")).toBe("False");
    expect(ans("progfine-check-option")).toMatch(/rejected/);
  });
});

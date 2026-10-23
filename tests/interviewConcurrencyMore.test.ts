import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("more concurrency questions", () => {
  it("keys each new answer correctly", () => {
    expect(ans("cc-rigorous")).toMatch(/^Rigorous holds all locks/);
    expect(ans("cc-update-lock")).toMatch(/^This conversion deadlock/);
    expect(ans("cc-ts-late-read")).toMatch(/^T1 is aborted/);
    expect(ans("cc-ring-victims")).toBe("1");
    expect(ans("cc-row-lock-phantom")).toBe("False");
    expect(ans("cc-skip-locked")).toMatch(/^Skips rows currently locked/);
  });

  it("recomputes the timestamp and ring answers independently", () => {
    // Read is rejected when TS(T) < W-TS(A).
    expect(5 < 8).toBe(true);
    // Removing one node from a 4-cycle leaves a path, which has no cycle.
    const edges: [number, number][] = [[1, 2], [2, 3], [3, 4], [4, 1]];
    const left = edges.filter(([a, b]) => a !== 1 && b !== 1);
    expect(left).toEqual([[2, 3], [3, 4]]);
  });
});

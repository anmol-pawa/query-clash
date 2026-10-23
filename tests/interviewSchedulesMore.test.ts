import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("schedule and locking questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("cc-interleavings")).toBe("10");
    expect(ans("cc-serial-count")).toBe("120");
    expect(ans("cc-rigorous-2pl")).toMatch(/shared as well as exclusive/);
    expect(ans("cc-upgrade-deadlock")).toMatch(/^Deadlock/);
    expect(ans("cc-recoverable-order")).toMatch(/T1 must commit before T2/);
    expect(ans("cc-view-blind-write")).toBe("True");
  });

  it("recomputes the counts by brute force", () => {
    const interleavings = (m: number, n: number): number => (m === 0 || n === 0 ? 1 : interleavings(m - 1, n) + interleavings(m, n - 1));
    expect(interleavings(3, 2)).toBe(10);
    const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
    expect(fact(5)).toBe(120);
  });
});

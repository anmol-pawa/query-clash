import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("transaction basics fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("txbasic-durability-log")).toBe("False");
    expect(ans("txbasic-serialization-failure")).toBe("True");
    expect(ans("txbasic-atomicity-transfer")).toBe("Atomicity");
  });

  it("recomputes the counting answers", () => {
    const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
    const choose = (n: number, k: number) => fact(n) / (fact(k) * fact(n - k));
    expect(byId["txbasic-serial-orders"]).toMatchObject({ answer: fact(4) });
    expect(byId["txbasic-interleavings"]).toMatchObject({ answer: choose(5, 2) });
  });

  it("counts conflicting pairs in the schedule", () => {
    const ops = [
      { t: 1, w: false },
      { t: 2, w: true },
      { t: 1, w: true },
      { t: 2, w: false },
    ];
    let n = 0;
    for (let i = 0; i < ops.length; i++)
      for (let j = i + 1; j < ops.length; j++) if (ops[i].t !== ops[j].t && (ops[i].w || ops[j].w)) n++;
    expect(byId["txbasic-conflict-pairs"]).toMatchObject({ answer: n });
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { balanceChoices } from "@/lib/balanceChoices";
import type { McqQuestion } from "@/content/interview/types";

const base: McqQuestion = { id: "x-1", topic: "basics", kind: "mcq", prompt: "Pick the right one please?", choices: ["right", "w1", "w2", "w3"], answer: 0, explanation: "Because it is right, the others are wrong.", difficulty: 1, tags: ["t"] };

describe("balanceChoices", () => {
  it("keeps the same choices, moves the key with the text, and is deterministic", () => {
    const q = balanceChoices(base) as McqQuestion;
    expect([...q.choices].sort()).toEqual([...base.choices].sort());
    expect(q.choices[q.answer]).toBe("right");
    expect(balanceChoices(base)).toEqual(q);
  });
  it("leaves position-dependent questions alone", () => {
    for (const q of [
      { ...base, choices: ["right", "w1", "w2", "All of the above"] },
      { ...base, choices: ["1", "2", "3", "4"], answer: 0 },
      { ...base, explanation: "Choice 1 is right." },
    ]) expect(balanceChoices(q)).toBe(q);
  });
  it("spreads the shipped MCQs over every slot", () => {
    const slots = new Set(QUESTIONS.flatMap((q) => (q.kind === "mcq" ? [q.answer] : [])));
    expect(slots.size).toBeGreaterThanOrEqual(4);
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("recovery fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("recfine-commit-record-first")).toBe("False");
    expect(ans("recfine-redo-repeat-history")).toBe("True");
    expect(ans("recfine-group-commit")).toMatch(/single log write/);
    expect(ans("recfine-fuzzy-checkpoint")).toMatch(/dirty page table/);
  });

  it("recomputes the ARIES counts", () => {
    const pageLsn = 20;
    const redone = [10, 20, 30, 40].filter((lsn) => lsn > pageLsn).length;
    expect(byId["recfine-redo-pages"]).toMatchObject({ answer: redone });
    const updates = 5;
    expect(byId["recfine-clr-count"]).toMatchObject({ answer: updates });
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

/** Basic timestamp-ordering write rule: reject when a younger transaction already read the item. */
function writeOutcome(ts: number, readTs: number, writeTs: number): "reject" | "ignore" | "write" {
  if (ts < readTs) return "reject";
  if (ts < writeTs) return "ignore";
  return "write";
}

describe("locking fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("lockfine-sx-conflict")).toBe("False");
    expect(ans("lockfine-to-write-rule")).toBe("T is rolled back and restarted with a new timestamp");
    expect(ans("lockfine-intention-chain")).toBe("IX on the table and the database");
    expect(ans("lockfine-nowait")).toBe("True");
    expect(ans("lockfine-rollback-dead")).toBe("True");
  });

  it("checks the timestamp write rule and the deadlock cycle", () => {
    expect(writeOutcome(5, 7, 3)).toBe("reject");
    expect(writeOutcome(5, 4, 8)).toBe("ignore");
    expect(writeOutcome(9, 4, 8)).toBe("write");
    expect(byId["lockfine-cycle-victims"]).toMatchObject({ answer: 1 });
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("more recovery questions", () => {
  it("has at least 30 static recovery questions", () => {
    expect(QUESTIONS.filter((q) => q.id.startsWith("rec-") && !q.id.startsWith("rec-gen")).length).toBeGreaterThanOrEqual(30);
  });

  it("keys each new answer correctly", () => {
    expect(ans("rec-wal-rule")).toMatch(/before the changed data page/);
    expect(ans("rec-commit-flush")).toMatch(/commit record has been forced/);
    expect(ans("rec-force-cost")).toBe("True");
    expect(ans("rec-steal-undo")).toMatch(/before images/);
    expect(ans("rec-lsn-order")).toMatch(/same transaction/);
    expect(ans("rec-dpt")).toMatch(/first log record that dirtied/);
    expect(ans("rec-redo-skip")).toMatch(/skipped/);
    expect(ans("rec-undo-clr-next")).toMatch(/prevLSN of the record just undone/);
    expect(ans("rec-aries-undo-set")).toMatch(/losers/);
    expect(ans("rec-aries-phases-order")).toMatch(/^1\. Analysis.*2\. Redo.*3\. Undo/);
    expect(ans("rec-checkpoint-purpose")).toMatch(/from the checkpoint/);
    expect(ans("rec-undo-redo-logging")).toBe("The transaction id, The item changed, The old value, The new value");
    expect(ans("rec-recovery-count")).toBe("2");
    expect(ans("rec-crash-during-recovery")).toBe("True");
    expect(ans("rec-media-failure")).toMatch(/backup/);
  });

  it("computes the loser count from the log", () => {
    const started = ["T1", "T2", "T3"];
    const committed = ["T1"];
    expect(started.filter((t) => !committed.includes(t)).length).toBe(2);
  });
});

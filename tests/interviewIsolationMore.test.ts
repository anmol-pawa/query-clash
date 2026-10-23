import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("isolation and recovery questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("tx-iso-rc-anomalies")).toBe("Non-repeatable reads");
    expect(ans("tx-iso-serializable-phantoms")).toBe("True");
    expect(ans("tx-iso-level-count")).toBe("3");
    expect(ans("rec-undo-needed-count")).toBe("2");
    expect(ans("rec-log-before-page")).toMatch(/flushed up to at least LSN 500/);
    expect(ans("rec-force-commit-flush")).toBe("False");
  });

  it("recomputes the loser count from the log", () => {
    const log = ["T1 c", "T2 b", "T2 u", "T3 b", "T3 u", "T3 c", "T4 b", "T4 u"];
    const started = new Set(log.map((l) => l.split(" ")[0]));
    const committed = new Set(log.filter((l) => l.endsWith(" c")).map((l) => l.split(" ")[0]));
    expect([...started].filter((t) => !committed.has(t)).length).toBe(2);
  });
});

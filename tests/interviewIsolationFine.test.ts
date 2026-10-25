import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

/** Final X when every transaction reads the initial value, then they write in the given order. */
function stalePlay(x0: number, deltas: number[]): number {
  return deltas.reduce((_, d) => x0 + d, x0);
}

describe("isolation-level fine-print questions", () => {
  it("keys the lowest level that prevents dirty reads", () => {
    expect(ans("isofine-dirty-read-level")).toBe("READ COMMITTED");
  });

  it("keys the PostgreSQL and Oracle level facts", () => {
    expect(ans("isofine-pg-read-uncommitted")).toBe("False");
    expect(ans("isofine-pg-rr-phantoms")).toBe("True");
    expect(ans("isofine-oracle-read-uncommitted")).toBe("False");
    expect(ans("isofine-oracle-serializable")).toBe("Write skew");
  });

  it("computes the lost update", () => {
    const serial = 100 + 10 + 20;
    const final = stalePlay(100, [10, 20]);
    expect(final).toBe(120);
    expect(byId["isofine-lost-update"]).toMatchObject({ answer: serial - final });
  });
});

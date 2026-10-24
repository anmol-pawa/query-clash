import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("SQL fundamentals fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("sqlfine-truncate-oracle")).toBe("False");
    expect(ans("sqlfine-plain-view")).toBe("False");
    expect(ans("sqlfine-no-order-by")).toBe("False");
  });

  it("recomputes the numeric answers", () => {
    const ids = Array.from({ length: 10 }, (_, i) => i + 1);
    expect(byId["sqlfine-limit-offset"]).toMatchObject({ answer: ids.slice(4, 4 + 3)[0] });
    const coalesce = (...xs: (number | null)[]) => xs.find((x) => x !== null) ?? null;
    expect(byId["sqlfine-coalesce"]).toMatchObject({ answer: coalesce(null, null, 7, 9) });
  });

  it("orders the logical evaluation steps", () => {
    const q = byId["sqlfine-logical-order"];
    expect(q.kind === "order" && q.steps).toEqual(["FROM", "WHERE", "GROUP BY", "HAVING", "SELECT", "ORDER BY"]);
  });
});

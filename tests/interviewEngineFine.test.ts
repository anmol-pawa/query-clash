import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("engine internals fine-print questions", () => {
  it("keys the PostgreSQL facts", () => {
    expect(ans("engfine-toast")).toBe("TOAST moves large values out of line into a side table");
    expect(ans("engfine-xid-wraparound")).toBe("VACUUM freezes old tuples so they are visible to every snapshot");
    expect(ans("engfine-hot-update")).toBe("True");
  });

  it("keys the Oracle facts", () => {
    expect(ans("engfine-snapshot-too-old")).toBe("The undo needed to rebuild the query's snapshot was overwritten");
    expect(ans("engfine-undo-redo")).toBe("Redo repeats changes (roll-forward); undo reverses them and serves consistent reads");
  });

  it("computes the page count", () => {
    const perPage = Math.floor(8192 / 100);
    expect(perPage).toBe(81);
    expect(byId["engfine-page-count"]).toMatchObject({ answer: Math.ceil(1_000_000 / perPage) });
  });
});

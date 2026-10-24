import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("indexing fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("idxfine-leaf-chain")).toBe("True");
    expect(ans("idxfine-secondary-dense")).toBe("True");
    expect(ans("idxfine-why-wide")).toBe(
      "Wide nodes sized to a disk page keep the tree shallow, so a lookup reads few pages",
    );
  });

  it("recomputes the numeric answers", () => {
    expect(byId["idxfine-leaf-count"]).toMatchObject({ answer: 100 ** 2 });
    expect(byId["idxfine-min-children"]).toMatchObject({ answer: Math.ceil(5 / 2) });
    const bucket0 = [16, 24, 32, 40, 45].filter((k) => k % 8 === 16 % 8).length;
    expect(byId["idxfine-hash-collide"]).toMatchObject({ answer: bucket0 });
  });
});

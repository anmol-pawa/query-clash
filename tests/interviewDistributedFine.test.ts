import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

/** Vector clocks: A precedes B when every entry is <=, and at least one is <. */
function compare(a: number[], b: number[]): "before" | "after" | "concurrent" | "equal" {
  const le = a.every((x, i) => x <= b[i]);
  const ge = a.every((x, i) => x >= b[i]);
  if (le && ge) return "equal";
  if (le) return "before";
  if (ge) return "after";
  return "concurrent";
}

describe("distributed fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("dstfine-rw-overlap")).toBe("False");
    expect(ans("dstfine-hot-range")).toBe("True");
    expect(ans("dstfine-vector-clock")).toBe("They are concurrent");
  });

  it("recomputes the numeric answers", () => {
    const [n, w, r] = [5, 2, 2];
    expect(r + w > n).toBe(false);
    const participants = 4;
    expect(byId["dstfine-2pc-messages"]).toMatchObject({ answer: 4 * participants });
    expect(byId["dstfine-ch-remove"]).toMatchObject({ answer: 1000 / 4 });
    expect(compare([2, 1], [1, 2])).toBe("concurrent");
    expect(byId["dstfine-lamport"]).toMatchObject({ answer: Math.max(4, 7) + 1 });
  });
});

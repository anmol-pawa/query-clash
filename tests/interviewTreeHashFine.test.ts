import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

/** Splits an overfull leaf, giving the extra key to the left leaf. */
function splitLeaf(keys: number[]): [number[], number[]] {
  const sorted = [...keys].sort((a, b) => a - b);
  const left = Math.ceil(sorted.length / 2);
  return [sorted.slice(0, left), sorted.slice(left)];
}

describe("B+ tree and hashing fine-print questions", () => {
  it("recomputes occupancy and capacity", () => {
    const n = 4;
    expect(byId["treefine-leaf-min"]).toMatchObject({ answer: Math.ceil((n - 1) / 2) });
    expect(byId["treefine-capacity"]).toMatchObject({ answer: 100 * 100 * 100 });
    expect(byId["treefine-extendible-directory"]).toMatchObject({ answer: 2 ** 3 });
  });

  it("simulates the leaf split", () => {
    const [left, right] = splitLeaf([10, 20, 30, 25]);
    expect(left).toEqual([10, 20]);
    expect(right).toEqual([25, 30]);
    expect(byId["treefine-leaf-split"]).toMatchObject({ answer: left.length });
  });

  it("keys each answer correctly", () => {
    expect(ans("treefine-hash-range")).toBe("False");
    expect(ans("treefine-leaf-links")).toMatch(/walks the leaves/);
  });
});

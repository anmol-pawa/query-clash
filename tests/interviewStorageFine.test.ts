import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("storage fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("storage-blocking-factor")).toBe("32");
    expect(ans("storage-heap-blocks")).toBe("313");
    expect(ans("storage-sparse-entries")).toBe("313");
    expect(ans("storage-extendible-directory")).toBe("8");
    expect(ans("storage-one-clustered")).toBe("True");
    expect(ans("storage-composite-prefix")).toBe("False");
  });

  it("recomputes the block arithmetic", () => {
    const bf = Math.floor(4096 / 128);
    expect(bf).toBe(32);
    expect(Math.ceil(10000 / bf)).toBe(313);
    expect(2 ** 3).toBe(8);
  });

  it("shows a composite (a, b) index cannot seek on b alone", () => {
    const idx = [[1, 5], [1, 9], [2, 5], [3, 1], [3, 5]].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const hits = idx.map((e, i) => (e[1] === 5 ? i : -1)).filter((i) => i >= 0);
    // matches are not contiguous, so no single range covers exactly them
    expect(hits[hits.length - 1] - hits[0] + 1).toBeGreaterThan(hits.length);
  });
});

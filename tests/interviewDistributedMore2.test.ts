import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("more distributed questions", () => {
  it("keys each new answer correctly", () => {
    expect(ans("dst-min-read-quorum")).toBe("4");
    expect(ans("dst-2pc-uncertain-abort")).toBe("False");
    expect(ans("dst-consistent-hash-add")).toBe("About 1/10 of the keys");
    expect(ans("dst-mod-reshard-4to5")).toBe("80 %");
    expect(ans("dst-cp-partition")).toMatch(/^Availability/);
    expect(ans("dst-async-loss")).toBe("True");
  });

  it("recomputes the quorum and resharding answers independently", () => {
    const N = 5, W = 2;
    let r = 1;
    while (r + W <= N) r++;
    expect(r).toBe(4);
    let moved = 0;
    for (let h = 0; h < 20; h++) if (h % 4 !== h % 5) moved++;
    expect((moved / 20) * 100).toBe(80);
  });

  it("has unique ids", () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("cost-estimate questions", () => {
  it("keys each new answer correctly", () => {
    expect(ans("sto-bplus-levels")).toBe("3");
    expect(ans("qry-bnl-cost")).toBe("4100");
    expect(ans("qry-bnl-swap")).toBe("4400");
    expect(ans("qry-xsort-1000p")).toBe("3");
    expect(ans("qry-grace-hash-cost")).toBe("1500");
    expect(ans("sto-hash-index-range")).toBe("False");
  });

  it("recomputes the costs independently", () => {
    const bnl = (outer: number, inner: number, B: number) => outer + Math.ceil(outer / (B - 2)) * inner;
    expect(bnl(100, 400, 12)).toBe(4100);
    expect(bnl(400, 100, 12)).toBe(4400);
    let runs = Math.ceil(1000 / 11), passes = 1;
    while (runs > 1) { runs = Math.ceil(runs / 10); passes++; }
    expect(passes).toBe(3);
    let nodes = 1_000_000 / 100, levels = 1;
    while (nodes > 1) { nodes /= 100; levels++; }
    expect(levels).toBe(3);
    expect(3 * (100 + 400)).toBe(1500);
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";
import { candidateKeys, losslessBinary, minimalCover, normalForm, parseFds, primeAttributes } from "@/lib/dbms/fd";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("more normalization questions", () => {
  it("keys each new answer", () => {
    expect(ans("nf-chain-form")).toBe("2NF");
    expect(ans("nf-key-count-three")).toBe("3 keys");
    expect(ans("nf-all-prime")).toBe("True");
    expect(ans("nf-cover-size")).toBe("2 FDs");
    expect(ans("nf-lossy-split")).toMatch(/^No: the shared attribute B/);
    expect(ans("nf-3nf-not-bcnf-form")).toBe("3NF but not BCNF");
  });

  it("recomputes each answer with the FD solvers", () => {
    expect(normalForm(["A", "B", "C", "D"], parseFds("A->B, B->C, C->D")).form).toBe("2NF");
    expect(candidateKeys(["A", "B", "C", "D"], parseFds("AB->C, C->D, D->A")).map((k) => k.join("")).sort()).toEqual(["AB", "BC", "BD"]);
    expect(minimalCover(parseFds("A->BC, B->C, A->B, AB->C")).length).toBe(2);
    expect(losslessBinary(["A", "B"], ["B", "C"], parseFds("A->B"))).toBe(false);
    const f = parseFds("AB->C, C->B");
    expect(primeAttributes(["A", "B", "C"], f)).toEqual(["A", "B", "C"]);
    expect(normalForm(["A", "B", "C"], f).form).toBe("3NF");
  });
});

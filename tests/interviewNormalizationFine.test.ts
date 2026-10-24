import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";
import { bcnfDecompose, candidateKeys, closure, lostDependencies, losslessBinary, normalForm, parseFds } from "@/lib/dbms/fd";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("normalization fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("nffine-closure-size")).toBe("5");
    expect(ans("nffine-two-attrs")).toBe("True");
    expect(ans("nffine-bcnf-preserve")).toBe("False");
    expect(ans("nffine-lossless-shared-key")).toBe("True");
    expect(ans("nffine-cyclic-keys")).toBe("3");
    expect(ans("nffine-partial-form")).toBe("1NF");
  });

  it("recomputes each answer with the FD solvers", () => {
    const abcde = ["A", "B", "C", "D", "E"];
    const size = closure(["A", "C"], parseFds("A->B, BC->D, D->E")).length;
    expect(size).toBe(5);
    expect(byId["nffine-closure-size"]).toMatchObject({ answer: size });
    expect(abcde).toHaveLength(size);

    // Every FD set over two attributes leaves the relation in BCNF.
    for (const f of ["A->B", "B->A", "A->B, B->A", ""]) {
      expect(normalForm(["A", "B"], parseFds(f)).form).toBe("BCNF");
    }

    const f = parseFds("AB->C, C->B");
    const { parts } = bcnfDecompose(["A", "B", "C"], f);
    expect(lostDependencies(parts, f).length).toBeGreaterThan(0);

    expect(losslessBinary(["A", "B"], ["A", "C"], parseFds("A->B"))).toBe(true);

    const keys = candidateKeys(["A", "B", "C"], parseFds("A->B, B->C, C->A"));
    expect(keys).toHaveLength(3);
    expect(byId["nffine-cyclic-keys"]).toMatchObject({ answer: keys.length });

    const nf = normalForm(["A", "B", "C", "D"], parseFds("AB->C, B->D")).form;
    expect(nf).toBe("1NF");
    expect(ans("nffine-partial-form")).toBe(nf);
  });
});

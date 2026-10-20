import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { bcnfDecompGen, decompText, randomSchema, synth3nfGen } from "@/content/interview/normalization";
import { answerText, correctResponse, grade } from "@/game/engine/interview";
import {
  attrs,
  bcnfDecompose,
  bcnfViolation,
  candidateKeys,
  closure,
  equivalent,
  fdsText,
  losslessChase,
  minimalCover,
  normalForm,
  parseFds,
  partNormalForm,
  projectFds,
  synthesize3nf,
  type Fd,
} from "@/lib/dbms/fd";
import { subsets } from "@/lib/dbms/keys";
import { rng } from "@/lib/rng";

const F = parseFds;
const A = attrs;

/** Sub-schema normal forms straight from the definitions, over every X ⊆ Ri and the closure under all of F. */
function inBcnf(part: string[], fds: Fd[]): boolean {
  return subsets(part).every((x) => {
    const inside = closure(x, fds).filter((a) => part.includes(a));
    return inside.every((a) => x.includes(a)) || part.every((a) => inside.includes(a));
  });
}
function in3nf(part: string[], fds: Fd[]): boolean {
  const prime = new Set(candidateKeys(part, fds).flat());
  return subsets(part).every((x) => {
    const inside = closure(x, fds).filter((a) => part.includes(a));
    return part.every((a) => inside.includes(a)) || inside.every((a) => x.includes(a) || prime.has(a));
  });
}
const preserving = (parts: string[][], fds: Fd[]) => equivalent(parts.flatMap((p) => projectFds(p, fds)), fds);
const keyOf = (parts: string[][]) => parts.map((p) => p.join("")).sort().join("|");
const parseDecomp = (s: string) => [...s.matchAll(/R\d\((\w+)\)/g)].map((m) => A(m[1]));

describe("decomposition algorithms on textbook examples", () => {
  it("splits R(A, B, C), A → B, B → C on B → C", () => {
    const { parts, steps } = bcnfDecompose(A("ABC"), F("A->B, B->C"));
    expect(keyOf(parts)).toBe("AB|BC");
    expect(steps).toHaveLength(1);
    expect(fdsText([steps[0].fd])).toBe("B → C");
  });

  it("dept_advisor: 3NF keeps it whole, BCNF splits it and loses s_ID, dept_name → i_ID (Silberschatz)", () => {
    const rel = ["dept_name", "i_ID", "s_ID"];
    const fds: Fd[] = [
      { lhs: ["i_ID"], rhs: ["dept_name"] },
      { lhs: ["dept_name", "s_ID"], rhs: ["i_ID"] },
    ];
    expect(normalForm(rel, fds).form).toBe("3NF");
    expect(synthesize3nf(rel, fds).parts).toEqual([rel]);
    const b = bcnfDecompose(rel, fds).parts;
    expect(keyOf(b)).toBe(keyOf([["dept_name", "i_ID"], ["i_ID", "s_ID"]]));
    expect(losslessChase(rel, b, fds)).toBe(true);
    expect(preserving(b, fds)).toBe(false);
  });

  it("cust_banker_branch: 3NF synthesis drops the contained (employee_id, branch_name) relation (Silberschatz)", () => {
    // C = customer_id, E = employee_id, B = branch_name, T = type.
    const fds = F("CE->BT, E->B, CB->E");
    expect(fdsText(minimalCover(fds))).toBe("E → B, CE → T, BC → E");
    const s = synthesize3nf(A("BCET"), fds);
    expect(keyOf(s.parts)).toBe("BCE|CET");
    expect(s.addedKey).toBeUndefined();
  });

  it("adds a key relation when no FD relation holds one", () => {
    // A → B, C → D: key AC appears in no FD relation.
    const s = synthesize3nf(A("ABCD"), F("A->B, C->D"));
    expect(s.addedKey).toEqual(["A", "C"]);
    expect(keyOf(s.parts)).toBe("AB|AC|CD");
    expect(keyOf(bcnfDecompose(A("ABCD"), F("A->B, C->D")).parts)).toBe(keyOf(s.parts));
  });

  it("keeps attributes in no FD via the key relation", () => {
    const s = synthesize3nf(A("ABC"), F("A->B"));
    expect(keyOf(s.parts)).toBe("AB|AC");
    expect(keyOf(synthesize3nf(A("AB"), []).parts)).toBe("AB");
  });
});

describe("decomposition algorithms on random schemas", () => {
  it("BCNF is lossless with every part in BCNF; 3NF synthesis is lossless, preserving, every part in 3NF", () => {
    let lostSome = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const { rel, fds } = randomSchema(rng(seed), 3 + (seed % 4));
      expect(bcnfViolation(rel, fds) === null).toBe(normalForm(rel, fds).form === "BCNF");

      const b = bcnfDecompose(rel, fds).parts;
      expect(losslessChase(rel, b, fds)).toBe(true);
      for (const p of b) {
        expect(inBcnf(p, fds)).toBe(true);
        expect(partNormalForm(p, fds)).toBe("BCNF");
      }
      if (!preserving(b, fds)) lostSome++;

      const t = synthesize3nf(rel, fds).parts;
      expect(losslessChase(rel, t, fds)).toBe(true);
      expect(preserving(t, fds)).toBe(true);
      for (const p of t) expect(in3nf(p, fds)).toBe(true);
      // No part inside another, and together they cover R.
      for (const p of t) for (const q of t) if (p !== q) expect(p.every((a) => q.includes(a))).toBe(false);
      expect([...new Set(t.flat())].sort()).toEqual(rel);
      // The sub-schema classifier agrees with the definitions.
      for (const p of subsets(rel).filter((s) => s.length >= 2)) {
        expect(partNormalForm(p, fds) === "BCNF").toBe(inBcnf(p, fds));
        expect(["3NF", "BCNF"].includes(partNormalForm(p, fds))).toBe(in3nf(p, fds));
      }
    }
    // BCNF does lose dependencies sometimes, which is the point of 3NF.
    expect(lostSome).toBeGreaterThan(10);
  });
});

describe("decomposition content", () => {
  const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  it("keys the fixed answers with the solvers", () => {
    expect(answerText(byId["nf-bcnf-step"])).toBe("R1(B, C) and R2(A, B)");
    expect(keyOf(bcnfDecompose(A("ABC"), F("A->B, B->C")).parts)).toBe("AB|BC");
    expect(answerText(byId["nf-bcnf-always-lossless"])).toBe("True");
    expect(answerText(byId["nf-dept-advisor"])).toMatch(/already in 3NF/);
  });

  it("generated decompose-this problems have exactly one right option, checked independently", () => {
    const positions = [0, 0, 0, 0];
    for (let seed = 1; seed <= 200; seed++) {
      for (const [g, goal] of [
        [bcnfDecompGen, "bcnf"],
        [synth3nfGen, "3nf"],
      ] as const) {
        const q = g.generate(seed);
        expect(g.generate(seed)).toEqual(q);
        expect(q.id).toBe(`${g.id}-${seed}`);
        if (q.kind !== "mcq") throw new Error("expected mcq");
        expect(grade(q, correctResponse(q))).toBe(true);
        const m = q.prompt.match(/^R\(([^)]*)\) with F = \{ (.*?) \}/)!;
        const rel = A(m[1]);
        const fds = F(m[2]);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices.map((c) => keyOf(parseDecomp(c)))).size).toBe(4);
        const ok = q.choices.map((c) => {
          const parts = parseDecomp(c);
          if (!losslessChase(rel, parts, fds)) return false;
          return goal === "bcnf" ? parts.every((p) => inBcnf(p, fds)) : preserving(parts, fds) && parts.every((p) => in3nf(p, fds));
        });
        expect(ok.filter(Boolean)).toHaveLength(1);
        expect(ok[q.answer]).toBe(true);
        const right = goal === "bcnf" ? bcnfDecompose(rel, fds).parts : synthesize3nf(rel, fds).parts;
        expect(q.choices[q.answer]).toBe(decompText(right));
        expect(q.explanation).toMatch(/Wrong options: [A-D]: /);
        positions[q.answer]++;
      }
    }
    for (const n of positions) expect(n).toBeGreaterThan(60);
  });
});

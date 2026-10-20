import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { closureGen, highestNfGen, keyCountGen, losslessGen, preservationGen, randomSchema } from "@/content/interview/normalization";
import { answerText, buildDeck, correctResponse, grade } from "@/game/engine/interview";
import {
  attrs,
  candidateKeys,
  closure,
  equivalent,
  fdsText,
  implies,
  lostDependencies,
  losslessBinary,
  losslessChase,
  minimalCover,
  normalForm,
  parseFds,
  primeAttributes,
  projectFds,
  type Fd,
  type NormalForm,
} from "@/lib/dbms/fd";
import { subsets } from "@/lib/dbms/keys";
import { rng } from "@/lib/rng";

const F = parseFds;
const A = attrs;

describe("FD solvers on textbook examples", () => {
  it("computes (AG)⁺ for the Silberschatz example", () => {
    const fds = F("A->B, A->C, CG->H, CG->I, B->H");
    expect(closure(A("AG"), fds)).toEqual(A("ABCGHI"));
    expect(closure(A("A"), fds)).toEqual(A("ABCH"));
    expect(candidateKeys(A("ABCGHI"), fds)).toEqual([A("AG")]);
    expect(implies(fds, F("AG->I")[0])).toBe(true);
    expect(implies(fds, F("A->G")[0])).toBe(false);
  });

  it("finds the canonical cover of { A → BC, B → C, A → B, AB → C }", () => {
    const fds = F("A->BC, B->C, A->B, AB->C");
    const cover = minimalCover(fds);
    expect(fdsText(cover)).toBe("A → B, B → C");
    expect(equivalent(cover, fds)).toBe(true);
  });

  it("gives an equivalent, minimal cover when several exist (A → BC, B → AC, C → AB)", () => {
    const fds = F("A->BC, B->AC, C->AB");
    const cover = minimalCover(fds);
    expect(equivalent(cover, fds)).toBe(true);
    // Minimal covers need not be unique or even the same size here (A → B, B → C, C → A is one); none of its FDs may be redundant.
    const single = cover.flatMap((f) => f.rhs.map((a) => ({ lhs: f.lhs, rhs: [a] })));
    single.forEach((f, i) => expect(implies(single.filter((_, j) => j !== i), f)).toBe(false));
  });

  it("finds the four keys of the A → B → C → D → A cycle", () => {
    expect(candidateKeys(A("ABCDE"), F("A->B, B->C, C->D, D->A"))).toEqual([A("AE"), A("BE"), A("CE"), A("DE")]);
    expect(primeAttributes(A("ABCDE"), F("A->B, B->C, C->D, D->A"))).toEqual(A("ABCDE"));
  });

  it("classifies the classic normal-form examples", () => {
    const empProj: Fd[] = [
      { lhs: ["ssn"], rhs: ["ename"] },
      { lhs: ["pnumber"], rhs: ["pname", "plocation"] },
      { lhs: ["pnumber", "ssn"], rhs: ["hours"] },
    ];
    const ep = ["ssn", "pnumber", "hours", "ename", "pname", "plocation"];
    expect(normalForm(ep, empProj).form).toBe("1NF");
    expect(candidateKeys(ep, empProj)).toEqual([["pnumber", "ssn"]]);
    expect(normalForm(A("ABCD"), F("AB->C, C->D")).form).toBe("2NF");
    const r = normalForm(A("ABC"), F("AB->C, C->B"));
    expect(r.form).toBe("3NF");
    expect(r.keys).toEqual([A("AB"), A("AC")]);
    expect(normalForm(A("ABC"), F("A->BC")).form).toBe("BCNF");
    expect(normalForm(A("AB"), F("A->B, B->A")).form).toBe("BCNF");
    // No FDs at all: the key is every attribute and the relation is in BCNF.
    expect(normalForm(A("ABC"), []).form).toBe("BCNF");
  });

  it("tests lossless joins: binary rule and chase on the Elmasri EMP_PROJ decompositions", () => {
    expect(losslessBinary(A("AB"), A("AC"), F("A->B"))).toBe(true);
    expect(losslessBinary(A("AB"), A("BC"), F("A->B"))).toBe(false);
    const fds: Fd[] = [
      { lhs: ["ssn"], rhs: ["ename"] },
      { lhs: ["pnumber"], rhs: ["pname", "plocation"] },
      { lhs: ["pnumber", "ssn"], rhs: ["hours"] },
    ];
    const r = ["ssn", "ename", "pnumber", "pname", "plocation", "hours"];
    expect(losslessChase(r, [["ename", "plocation"], ["ssn", "pnumber", "hours", "pname", "plocation"]], fds)).toBe(false);
    expect(losslessChase(r, [["ssn", "ename"], ["pnumber", "pname", "plocation"], ["ssn", "pnumber", "hours"]], fds)).toBe(true);
  });

  it("detects the dependency AB → C lost by the BCNF split of (A, B, C)", () => {
    const fds = F("AB->C, C->B");
    expect(lostDependencies([A("AC"), A("BC")], fds).map((f) => fdsText([f]))).toEqual(["AB → C"]);
    expect(losslessBinary(A("AC"), A("BC"), fds)).toBe(true);
    // A → B and B → C both survive in (A, B), (B, C); A → C follows by chaining through them.
    expect(lostDependencies([A("AB"), A("BC")], F("A->B, B->C, A->C"))).toEqual([]);
  });

  it("projects FDs onto a sub-schema", () => {
    expect(fdsText(projectFds(A("ACD"), F("A->B, B->C, C->D")))).toBe("A → C, C → D");
  });
});

/** Normal forms straight from their F⁺ definitions, by enumerating every X ⊆ R. */
function nfByDefinition(rel: string[], fds: Fd[]): NormalForm {
  const keys = candidateKeys(rel, fds);
  const prime = new Set(keys.flat());
  const xs = subsets(rel);
  const nonTrivial = (x: string[]) => closure(x, fds).filter((a) => !x.includes(a));
  const superkey = (x: string[]) => closure(x, fds).length === rel.length;
  const twoNf = keys.every((k) => subsets(k).filter((s) => s.length < k.length).every((s) => nonTrivial(s).every((a) => prime.has(a))));
  if (!twoNf) return "1NF";
  if (!xs.every((x) => superkey(x) || nonTrivial(x).every((a) => prime.has(a)))) return "2NF";
  if (!xs.every((x) => superkey(x) || nonTrivial(x).length === 0)) return "3NF";
  return "BCNF";
}

describe("FD solvers cross-checked on random schemas", () => {
  it("keys, normal forms, lossless and preservation agree with independent definitions", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const r = rng(seed);
      const { rel, fds } = randomSchema(r, 3 + (seed % 4));
      const keys = candidateKeys(rel, fds);
      // Keys are minimal superkeys, and every superkey contains one.
      for (const k of keys) {
        expect(closure(k, fds)).toEqual(rel);
        for (const a of k) expect(closure(k.filter((x) => x !== a), fds).length).toBeLessThan(rel.length);
      }
      for (const s of subsets(rel)) if (closure(s, fds).length === rel.length) expect(keys.some((k) => k.every((a) => s.includes(a)))).toBe(true);

      expect(normalForm(rel, fds).form).toBe(nfByDefinition(rel, fds));

      const cover = minimalCover(fds);
      expect(equivalent(cover, fds)).toBe(true);
      const single = cover.flatMap((f) => f.rhs.map((a) => ({ lhs: f.lhs, rhs: [a] })));
      for (const f of single) {
        expect(implies(single.filter((g) => g !== f), f)).toBe(false);
        for (const b of f.lhs) if (f.lhs.length > 1) expect(implies(fds, { lhs: f.lhs.filter((x) => x !== b), rhs: f.rhs })).toBe(false);
      }

      const cut = 1 + (seed % (rel.length - 1));
      const parts = [rel.slice(0, cut + 1), rel.slice(cut)];
      expect(losslessChase(rel, parts, fds)).toBe(losslessBinary(parts[0], parts[1], fds));
      const projected = parts.flatMap((p) => projectFds(p, fds));
      expect(lostDependencies(parts, fds).length === 0).toBe(equivalent(projected, fds));
    }
  });
});

describe("normalization content", () => {
  const nf = QUESTIONS.filter((q) => q.topic === "normalization");
  const byId = Object.fromEntries(nf.map((q) => [q.id, q]));
  const ans = (id: string) => answerText(byId[id]);

  it("covers every question type with a spread of difficulties", () => {
    expect(nf.length).toBeGreaterThanOrEqual(20);
    expect([...new Set(nf.map((q) => q.kind))].sort()).toEqual(["mcq", "multi", "numeric", "order", "short", "truefalse"]);
    expect([...new Set(nf.map((q) => q.difficulty))].sort()).toEqual([1, 2, 3]);
    expect(GENERATORS.filter((g) => g.topic === "normalization")).toHaveLength(5);
  });

  it("keys each fixed answer correctly", () => {
    expect(ans("nf-fd-meaning")).toMatch(/agree on X also agree on Y/);
    expect(ans("nf-trivial")).toBe("trivial");
    expect(ans("nf-armstrong")).toBe("Reflexivity, Augmentation, Transitivity");
    expect(ans("nf-armstrong-sound-complete")).toBe("True");
    expect(ans("nf-closure-steps")).toMatch(/^1\. Set result = X.*2\. Find.*3\. Add.*4\. Repeat.*5\. Return/);
    expect(ans("nf-prime")).toBe("prime");
    expect(ans("nf-anomalies")).toBe("Update anomaly, Insertion anomaly, Deletion anomaly");
    expect(ans("nf-1nf")).toMatch(/atomic/);
    expect(ans("nf-bcnf-def")).toBe("X is a superkey");
    expect(ans("nf-bcnf-implies-3nf")).toBe("True");
    expect(ans("nf-nf-order")).toMatch(/^1\. 1NF.*2\. 2NF.*3\. 3NF.*4\. BCNF.*5\. 4NF.*6\. 5NF/);
    expect(ans("nf-4nf")).toBe("4NF");
    expect(ans("nf-5nf")).toBe("join");
    expect(ans("nf-lossless-test")).toMatch(/R1 ∩ R2 → R1 or R1 ∩ R2 → R2/);
    expect(ans("nf-3nf-guarantee")).toBe("True");
    expect(ans("nf-3nf-synthesis")).toMatch(/^1\. Compute a minimal cover.*2\. Make one relation.*3\. If no relation.*4\. Remove/);
    expect(ans("nf-denormalize")).toMatch(/faster/);
  });

  it("keys the computed fixed answers with the solvers", () => {
    expect(ans("nf-closure-ag")).toBe(closure(A("AG"), F("A->B, A->C, CG->H, CG->I, B->H")).join(""));
    expect(ans("nf-key-count-cycle")).toBe(`${candidateKeys(A("ABCDE"), F("A->B, B->C, C->D, D->A")).length} keys`);
    expect(ans("nf-minimal-cover")).toBe(`{ ${fdsText(minimalCover(F("A->BC, B->C, A->B, AB->C")))} }`);
    const empProj: Fd[] = [
      { lhs: ["ssn"], rhs: ["ename"] },
      { lhs: ["pnumber"], rhs: ["pname", "plocation"] },
    ];
    expect(ans("nf-2nf")).toBe(normalForm(["ssn", "pnumber", "hours", "ename", "pname", "plocation"], [...empProj, { lhs: ["pnumber", "ssn"], rhs: ["hours"] }]).form);
    expect(ans("nf-3nf-transitive")).toBe(normalForm(A("ABCD"), F("AB->C, C->D")).form);
    expect(ans("nf-3nf-not-bcnf")).toBe(normalForm(A("ABC"), F("AB->C, C->B")).form);
    expect(ans("nf-two-attrs-bcnf")).toBe("True");
    for (const fds of ["A->B", "B->A", "A->B, B->A", ""]) expect(normalForm(A("AB"), F(fds)).form).toBe("BCNF");
    expect(ans("nf-lossless-example")).toBe(losslessBinary(A("AB"), A("BC"), F("A->B")) ? "True" : "False");
    expect(lostDependencies([A("AC"), A("BC")], F("AB->C, C->B")).map((f) => fdsText([f]))).toEqual([ans("nf-bcnf-not-preserving").replace("The dependency ", "")]);
  });

  it("generated problems are well-formed, deterministic and answered by the solvers from their prompts", () => {
    const schema = (prompt: string) => {
      const m = prompt.match(/^R\(([^)]*)\) with F = \{ (.*?) \}/)!;
      return { rel: A(m[1]), fds: F(m[2]) };
    };
    const tally = { nf: new Map<string, number>(), lossless: 0, preserve: 0, multiKey: 0 };
    for (let seed = 1; seed <= 200; seed++) {
      for (const g of [closureGen, keyCountGen, highestNfGen, losslessGen, preservationGen]) {
        const q = g.generate(seed);
        expect(g.generate(seed)).toEqual(q);
        expect(q.id).toBe(`${g.id}-${seed}`);
        expect(grade(q, correctResponse(q))).toBe(true);
        expect(q.explanation.length).toBeGreaterThan(20);
      }
      const c = closureGen.generate(seed);
      if (c.kind !== "multi") throw new Error("expected multi");
      const s1 = schema(c.prompt);
      const x = A(c.prompt.match(/\((\w+)\)⁺\?/)![1]);
      expect(c.answers.map((i) => c.choices[i])).toEqual(closure(x, s1.fds));
      expect(c.answers.length).toBeGreaterThan(x.length);
      expect(c.answers.length).toBeLessThan(c.choices.length);

      const k = keyCountGen.generate(seed);
      if (k.kind !== "numeric") throw new Error("expected numeric");
      const s2 = schema(k.prompt);
      expect(k.answer).toBe(candidateKeys(s2.rel, s2.fds).length);
      if (k.answer > 1) tally.multiKey++;

      const h = highestNfGen.generate(seed);
      if (h.kind !== "mcq") throw new Error("expected mcq");
      const s3 = schema(h.prompt);
      expect(h.choices[h.answer]).toBe(nfByDefinition(s3.rel, s3.fds));
      tally.nf.set(h.choices[h.answer], (tally.nf.get(h.choices[h.answer]) ?? 0) + 1);

      const l = losslessGen.generate(seed);
      if (l.kind !== "truefalse") throw new Error("expected truefalse");
      const s4 = schema(l.prompt);
      const lp = [...l.prompt.matchAll(/R[12]\(([^)]*)\)/g)].map((m) => A(m[1]));
      expect(lp.flat().sort()).toEqual(expect.arrayContaining(s4.rel));
      expect(l.answer).toBe(losslessChase(s4.rel, lp, s4.fds));
      if (l.answer) tally.lossless++;

      const p = preservationGen.generate(seed);
      if (p.kind !== "truefalse") throw new Error("expected truefalse");
      const s5 = schema(p.prompt);
      const pp = [...p.prompt.matchAll(/R[12]\(([^)]*)\)/g)].map((m) => A(m[1]));
      expect(p.answer).toBe(equivalent(pp.flatMap((part) => projectFds(part, s5.fds)), s5.fds));
      if (p.answer) tally.preserve++;
    }
    // The generators aim for a spread of answers, not always the same one.
    for (const form of ["1NF", "2NF", "3NF", "BCNF"]) expect(tally.nf.get(form) ?? 0).toBeGreaterThan(30);
    expect(tally.lossless).toBeGreaterThan(70);
    expect(tally.lossless).toBeLessThan(130);
    expect(tally.preserve).toBeGreaterThan(70);
    expect(tally.preserve).toBeLessThan(130);
    expect(tally.multiKey).toBeGreaterThan(70);
  });

  it("builds full decks for the topic", () => {
    const deck = buildDeck(QUESTIONS, GENERATORS, { topic: "normalization", seed: 5, size: 8 });
    expect(deck).toHaveLength(8);
    expect(deck.every((q) => q.topic === "normalization")).toBe(true);
  });
});

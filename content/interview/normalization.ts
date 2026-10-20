import type { Generator, Question } from "./types";
import {
  candidateKeys,
  closure,
  fdsText,
  lostDependencies,
  losslessBinary,
  NORMAL_FORMS,
  normalForm,
  setText,
  type Fd,
  type NormalForm,
} from "@/lib/dbms/fd";
import { randInt, rng, shuffled } from "@/lib/rng";

/** Functional dependencies and normalization: closures, keys, minimal covers, 1NF–BCNF, 4NF/5NF, lossless join and dependency preservation. */
export const NORMALIZATION: Question[] = [
  {
    id: "nf-fd-meaning",
    topic: "normalization",
    kind: "mcq",
    prompt: "What does the functional dependency X → Y on a relation R mean?",
    choices: [
      "Every value of Y appears with exactly one value of X",
      "Any two tuples that agree on X also agree on Y",
      "X is a foreign key referencing Y",
      "X and Y never contain NULLs",
    ],
    answer: 1,
    explanation: "X → Y says X determines Y: whenever two tuples of R have the same X values, they have the same Y values. It constrains every legal instance of R, not just the current one.",
    difficulty: 1,
    tags: ["functional dependency"],
  },
  {
    id: "nf-trivial",
    topic: "normalization",
    kind: "short",
    prompt: "An FD X → Y where Y ⊆ X (for example AB → A) holds on every relation. It is called a ___ dependency.",
    accept: ["trivial"],
    explanation: "A trivial FD holds in every instance because Y is already part of X. Normal-form definitions only look at non-trivial FDs.",
    difficulty: 1,
    tags: ["functional dependency"],
  },
  {
    id: "nf-armstrong",
    topic: "normalization",
    kind: "multi",
    prompt: "Which of these are Armstrong's three axioms (the others are derived rules)?",
    choices: ["Reflexivity", "Augmentation", "Transitivity", "Union", "Decomposition", "Pseudotransitivity"],
    answers: [0, 1, 2],
    explanation:
      "Armstrong's axioms are reflexivity (Y ⊆ X ⇒ X → Y), augmentation (X → Y ⇒ XZ → YZ) and transitivity (X → Y, Y → Z ⇒ X → Z). Union, decomposition and pseudotransitivity follow from them.",
    difficulty: 1,
    tags: ["armstrong's axioms"],
    askedAt: "A common warm-up before closure questions.",
  },
  {
    id: "nf-armstrong-sound-complete",
    topic: "normalization",
    kind: "truefalse",
    prompt: "Armstrong's axioms are sound and complete: they derive only FDs in F⁺, and every FD in F⁺.",
    answer: true,
    explanation: "True. Soundness means they never derive a false FD; completeness means repeated use of them derives all of F⁺.",
    difficulty: 2,
    tags: ["armstrong's axioms"],
  },
  {
    id: "nf-closure-ag",
    topic: "normalization",
    kind: "mcq",
    prompt: "R(A, B, C, G, H, I) with F = { A → B, A → C, CG → H, CG → I, B → H }. What is (AG)⁺?",
    choices: ["AG", "ABCG", "ABCGH", "ABCGHI"],
    answer: 3,
    explanation: "Start with AG. A → B and A → C add B and C (ABCG). CG → H and CG → I add H and I (ABCGHI). (AG)⁺ is all of R, so AG is a superkey; neither A⁺ nor G⁺ is, so AG is a candidate key.",
    difficulty: 2,
    tags: ["attribute closure"],
    askedAt: "The textbook closure example; often asked on a whiteboard.",
  },
  {
    id: "nf-closure-steps",
    topic: "normalization",
    kind: "order",
    prompt: "Put the steps of the attribute-closure algorithm for X⁺ in order.",
    steps: [
      "Set result = X",
      "Find an FD Y → Z with Y ⊆ result",
      "Add Z to result",
      "Repeat until no FD adds a new attribute",
      "Return result as X⁺",
    ],
    explanation: "Closure is a fixed-point loop: keep firing FDs whose left side is already in the result. X is a superkey exactly when X⁺ is every attribute of R.",
    difficulty: 1,
    tags: ["attribute closure"],
  },
  {
    id: "nf-key-count-cycle",
    topic: "normalization",
    kind: "numeric",
    prompt: "R(A, B, C, D, E) with F = { A → B, B → C, C → D, D → A }. How many candidate keys does R have?",
    answer: 4,
    unit: "keys",
    explanation: "E appears on no right side, so it is in every key, but E⁺ = E. A, B, C and D form a cycle, so each of them plus E reaches everything: AE, BE, CE and DE. That is 4 candidate keys.",
    difficulty: 2,
    tags: ["candidate keys"],
    askedAt: "Cycle-of-FDs key counting is a favourite in GATE-style tests.",
  },
  {
    id: "nf-prime",
    topic: "normalization",
    kind: "short",
    prompt: "An attribute that belongs to at least one candidate key is called a ___ attribute.",
    accept: ["prime", "key"],
    explanation: "Prime (key) attributes are members of some candidate key. 2NF and 3NF only restrict FDs whose right side is non-prime.",
    difficulty: 1,
    tags: ["candidate keys", "3nf"],
  },
  {
    id: "nf-minimal-cover",
    topic: "normalization",
    kind: "mcq",
    prompt: "What is the canonical (minimal) cover of F = { A → BC, B → C, A → B, AB → C }?",
    choices: ["{ A → BC, B → C }", "{ A → B, B → C }", "{ A → B, AB → C }", "{ A → C, B → C }"],
    answer: 1,
    explanation:
      "AB → C has extraneous A (B → C already gives it), leaving B → C twice. A → BC loses C since A → B and B → C imply A → C. What remains is { A → B, B → C }, equivalent to F with nothing extraneous.",
    difficulty: 3,
    tags: ["minimal cover"],
    askedAt: "Canonical cover is the standard tough FD question.",
  },
  {
    id: "nf-anomalies",
    topic: "normalization",
    kind: "multi",
    prompt: "Which anomalies does normalization aim to remove from a badly designed table like Emp_Dept(emp, dept, dept_head)?",
    choices: ["Update anomaly", "Insertion anomaly", "Deletion anomaly", "Deadlock", "Phantom read"],
    answers: [0, 1, 2],
    explanation:
      "Redundancy causes update anomalies (change a dept head in many rows), insertion anomalies (no department without an employee) and deletion anomalies (deleting the last employee loses the department). Deadlocks and phantoms are concurrency problems.",
    difficulty: 1,
    tags: ["anomalies"],
    askedAt: "Usually the opening question about normalization.",
  },
  {
    id: "nf-1nf",
    topic: "normalization",
    kind: "mcq",
    prompt: "A table is in 1NF when…",
    choices: [
      "Every attribute holds a single atomic value (no repeating groups or lists)",
      "It has a single-column primary key",
      "It has no transitive dependencies",
      "Every determinant is a candidate key",
    ],
    answer: 0,
    explanation: "1NF only asks for atomic domains: a phones column holding '555-1, 555-2' breaks it. The fix is a separate row (or table) per value.",
    difficulty: 1,
    tags: ["1nf"],
  },
  {
    id: "nf-2nf",
    topic: "normalization",
    kind: "mcq",
    prompt: "EmpProj(ssn, pnumber, hours, ename, pname, plocation) has key (ssn, pnumber), with ssn → ename and pnumber → pname, plocation. What is its highest normal form?",
    choices: ["1NF", "2NF", "3NF", "BCNF"],
    answer: 0,
    explanation: "ename depends on ssn alone and pname, plocation on pnumber alone: non-prime attributes depend on part of the key (partial dependencies), so it fails 2NF. Split it into (ssn, ename), (pnumber, pname, plocation) and (ssn, pnumber, hours).",
    difficulty: 2,
    tags: ["2nf", "partial dependency"],
    askedAt: "The textbook 2NF example.",
  },
  {
    id: "nf-3nf-transitive",
    topic: "normalization",
    kind: "mcq",
    prompt: "R(A, B, C, D) with F = { AB → C, C → D }. What is the highest normal form of R?",
    choices: ["1NF", "2NF", "3NF", "BCNF"],
    answer: 1,
    explanation: "The only key is AB. Neither A nor B alone determines anything, so there is no partial dependency (2NF holds). But AB → C → D makes D transitively dependent on the key through the non-key C, so R is not in 3NF.",
    difficulty: 2,
    tags: ["3nf", "transitive dependency"],
  },
  {
    id: "nf-3nf-not-bcnf",
    topic: "normalization",
    kind: "mcq",
    prompt: "R(A, B, C) with F = { AB → C, C → B }. What is the highest normal form of R?",
    choices: ["1NF", "2NF", "3NF", "BCNF"],
    answer: 2,
    explanation: "The candidate keys are AB and AC, so every attribute is prime. C → B has a non-superkey left side, which BCNF forbids, but 3NF allows it because B is prime. So R is in 3NF, not BCNF.",
    difficulty: 3,
    tags: ["3nf", "bcnf"],
    askedAt: "The classic '3NF but not BCNF' follow-up.",
  },
  {
    id: "nf-bcnf-def",
    topic: "normalization",
    kind: "mcq",
    prompt: "A relation is in BCNF when, for every non-trivial FD X → Y that holds on it…",
    choices: ["X is a superkey", "Y is a prime attribute", "X is a single attribute", "Y is part of the primary key"],
    answer: 0,
    explanation: "BCNF: every determinant is a superkey. 3NF relaxes this by also allowing X → Y when every attribute of Y − X is prime.",
    difficulty: 1,
    tags: ["bcnf"],
  },
  {
    id: "nf-bcnf-implies-3nf",
    topic: "normalization",
    kind: "truefalse",
    prompt: "Every relation in BCNF is also in 3NF.",
    answer: true,
    explanation: "True. BCNF's condition (X is a superkey) is one of 3NF's two allowed cases, so BCNF is strictly stronger.",
    difficulty: 1,
    tags: ["bcnf", "3nf"],
  },
  {
    id: "nf-two-attrs-bcnf",
    topic: "normalization",
    kind: "truefalse",
    prompt: "Any relation with exactly two attributes is in BCNF.",
    answer: true,
    explanation: "True. With R(A, B) the only possible non-trivial FDs are A → B and B → A, and either one makes its left side a key of R.",
    difficulty: 2,
    tags: ["bcnf"],
  },
  {
    id: "nf-nf-order",
    topic: "normalization",
    kind: "order",
    prompt: "Order these normal forms from weakest to strongest.",
    steps: ["1NF", "2NF", "3NF", "BCNF", "4NF", "5NF"],
    explanation: "Each form includes all the ones before it: 2NF removes partial dependencies, 3NF transitive ones, BCNF all non-key determinants, 4NF non-trivial multivalued dependencies and 5NF non-trivial join dependencies.",
    difficulty: 1,
    tags: ["normal forms"],
  },
  {
    id: "nf-4nf",
    topic: "normalization",
    kind: "mcq",
    prompt: "Teaches(course, teacher, book): each course has a set of teachers and a set of books, chosen independently. Which normal form does storing every combination break?",
    choices: ["2NF", "3NF", "BCNF", "4NF"],
    answer: 3,
    explanation: "There are no non-trivial FDs (the key is all three attributes), so it is in BCNF. But course ↠ teacher and course ↠ book are multivalued dependencies on a non-superkey, which 4NF forbids. Split into (course, teacher) and (course, book).",
    difficulty: 3,
    tags: ["4nf", "multivalued dependency"],
  },
  {
    id: "nf-5nf",
    topic: "normalization",
    kind: "short",
    prompt: "5NF (project-join normal form) deals with ___ dependencies that are not implied by candidate keys.",
    accept: ["join"],
    explanation: "5NF says every non-trivial join dependency is implied by the candidate keys: the table cannot be split into three or more projections that rejoin losslessly unless the keys force it.",
    difficulty: 3,
    tags: ["5nf", "join dependency"],
  },
  {
    id: "nf-lossless-test",
    topic: "normalization",
    kind: "mcq",
    prompt: "When is decomposing R into R1 and R2 lossless?",
    choices: [
      "When R1 ∩ R2 → R1 or R1 ∩ R2 → R2 is in F⁺",
      "When R1 and R2 have no attributes in common",
      "When every FD of F holds on R1 or on R2",
      "When R1 and R2 have the same number of attributes",
    ],
    answer: 0,
    explanation: "The shared attributes must be a superkey of one side. Then joining R1 and R2 back gives exactly R, with no spurious tuples. The third choice describes dependency preservation, a different property.",
    difficulty: 2,
    tags: ["lossless join"],
    askedAt: "Asked whenever decomposition comes up.",
  },
  {
    id: "nf-lossless-example",
    topic: "normalization",
    kind: "truefalse",
    prompt: "R(A, B, C) with F = { A → B }. Decomposing into R1(A, B) and R2(B, C) is lossless.",
    answer: false,
    explanation: "False. The shared attribute is B, and B⁺ = B is not a key of either side, so the join can create spurious tuples. R1(A, B) and R2(A, C) would be lossless, since A → AB.",
    difficulty: 2,
    tags: ["lossless join"],
  },
  {
    id: "nf-bcnf-not-preserving",
    topic: "normalization",
    kind: "mcq",
    prompt: "R(A, B, C) with F = { AB → C, C → B } is decomposed into BCNF as R1(A, C) and R2(B, C). What is lost?",
    choices: ["Nothing", "The lossless-join property", "The dependency AB → C", "The dependency C → B"],
    answer: 2,
    explanation: "The decomposition is lossless (R1 ∩ R2 = C and C → B), but no part holds A, B and C together, so AB → C can only be checked by joining. BCNF cannot always preserve dependencies.",
    difficulty: 3,
    tags: ["bcnf", "dependency preservation"],
    askedAt: "The textbook argument for when to settle for 3NF.",
  },
  {
    id: "nf-3nf-guarantee",
    topic: "normalization",
    kind: "truefalse",
    prompt: "Every relation has a 3NF decomposition that is both lossless and dependency-preserving.",
    answer: true,
    explanation: "True. The 3NF synthesis algorithm (one table per FD of a minimal cover, plus a table holding a candidate key) always achieves both. BCNF guarantees lossless join but not dependency preservation.",
    difficulty: 2,
    tags: ["3nf", "dependency preservation", "lossless join"],
  },
  {
    id: "nf-3nf-synthesis",
    topic: "normalization",
    kind: "order",
    prompt: "Order the steps of the 3NF synthesis algorithm.",
    steps: [
      "Compute a minimal cover of F",
      "Make one relation for each left side X, holding X and everything it determines",
      "If no relation contains a candidate key, add one that does",
      "Remove any relation whose attributes are contained in another",
    ],
    explanation: "Per-FD relations preserve every dependency, and the candidate-key relation makes the join lossless. Dropping redundant subset relations keeps it tidy without losing either property.",
    difficulty: 3,
    tags: ["3nf", "decomposition"],
  },
  {
    id: "nf-denormalize",
    topic: "normalization",
    kind: "mcq",
    prompt: "Why would a team deliberately denormalize a schema?",
    choices: [
      "To make reads faster by avoiding joins, at the cost of redundancy",
      "To remove update anomalies",
      "To save storage space",
      "To guarantee lossless joins",
    ],
    answer: 0,
    explanation: "Denormalization trades redundancy (and the work of keeping copies consistent) for fewer joins on hot read paths, as in reporting tables, caches and many NoSQL designs.",
    difficulty: 1,
    tags: ["denormalization"],
    askedAt: "Common in system-design rounds.",
  },
];

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export const relText = (rel: readonly string[]): string => `R(${rel.join(", ")})`;
const schemaText = (rel: readonly string[], fds: readonly Fd[]) => `${relText(rel)} with F = { ${fdsText(fds)} }`;

/** A random schema: n attributes and 3–5 FDs with 1–2 attributes on the left and one on the right. */
export function randomSchema(r: () => number, n: number): { rel: string[]; fds: Fd[] } {
  const rel = LETTERS.slice(0, n);
  const fds: Fd[] = [];
  const count = randInt(r, 3, 5);
  for (let tries = 0; fds.length < count && tries < 50; tries++) {
    const lhs = shuffled(r, rel).slice(0, r() < 0.55 ? 1 : 2).sort();
    const rest = rel.filter((a) => !lhs.includes(a));
    const rhs = [rest[randInt(r, 0, rest.length - 1)]];
    if (fds.some((f) => f.lhs.join("") === lhs.join("") && f.rhs[0] === rhs[0])) continue;
    fds.push({ lhs, rhs });
  }
  // Merge FDs with the same left side, as a textbook would write them.
  const merged: Fd[] = [];
  for (const f of fds) {
    const m = merged.find((g) => g.lhs.join("") === f.lhs.join(""));
    if (m) m.rhs = [...m.rhs, ...f.rhs].sort();
    else merged.push({ lhs: f.lhs, rhs: f.rhs });
  }
  return { rel, fds: merged };
}

/** Draw schemas from `seed` until `ok` accepts one (the last draw is used if none does). */
function drawUntil<T>(seed: number, make: (r: () => number) => T, ok: (x: T) => boolean): T {
  const r = rng(seed);
  let x = make(r);
  for (let i = 0; i < 300 && !ok(x); i++) x = make(r);
  return x;
}

/** "Which attributes are in X⁺?", answered by `closure`. */
export const closureGen: Generator = {
  id: "nf-gen-closure",
  topic: "normalization",
  difficulty: 1,
  tags: ["attribute closure"],
  generate(seed) {
    const { rel, fds, x } = drawUntil(
      seed,
      (r) => {
        const s = randomSchema(r, randInt(r, 5, 6));
        return { ...s, x: shuffled(r, s.rel).slice(0, r() < 0.6 ? 1 : 2).sort() };
      },
      // Something must follow from X, but not everything.
      (s) => {
        const c = closure(s.x, s.fds).length;
        return c > s.x.length && c < s.rel.length;
      },
    );
    const c = closure(x, fds);
    return {
      id: `nf-gen-closure-${seed}`,
      topic: "normalization",
      kind: "multi",
      prompt: `${schemaText(rel, fds)}. Which attributes are in (${setText(x)})⁺?`,
      choices: rel,
      answers: c.map((a) => rel.indexOf(a)),
      explanation: `Start from ${setText(x)} (X ⊆ X⁺ always) and keep firing FDs whose left side is already in: (${setText(x)})⁺ = ${setText(c)}. ${rel.filter((a) => !c.includes(a)).join(", ")} can never be reached.`,
      difficulty: 1,
      tags: closureGen.tags,
    };
  },
};

/** "How many candidate keys?", answered by `candidateKeys`. */
export const keyCountGen: Generator = {
  id: "nf-gen-keys",
  topic: "normalization",
  difficulty: 2,
  tags: ["candidate keys"],
  askedAt: "Finding all candidate keys is the most-asked FD problem.",
  generate(seed) {
    // Aim for one key on even seeds and several on odd ones, so the answer is not always 1.
    const want = seed % 2 === 0 ? 1 : 2;
    const { rel, fds } = drawUntil(seed, (r) => randomSchema(r, randInt(r, 4, 6)), (s) => (candidateKeys(s.rel, s.fds).length >= 2) === (want === 2));
    const keys = candidateKeys(rel, fds);
    const always = rel.filter((a) => !fds.some((f) => f.rhs.includes(a)));
    return {
      id: `nf-gen-keys-${seed}`,
      topic: "normalization",
      kind: "numeric",
      prompt: `${schemaText(rel, fds)}. How many candidate keys does R have?`,
      answer: keys.length,
      unit: keys.length === 1 ? "key" : "keys",
      explanation:
        (always.length ? `${always.join(", ")} appear${always.length === 1 ? "s" : ""} on no right side, so ${always.length === 1 ? "it is" : "they are"} in every key. ` : "") +
        `Growing sets until their closure is all of R, and keeping only the minimal ones, gives ${keys.map(setText).join(", ")}: ${keys.length}.`,
      difficulty: 2,
      tags: keyCountGen.tags,
      askedAt: keyCountGen.askedAt,
    };
  },
};

/** "What is the highest normal form?", answered by `normalForm`; the seed picks which form to aim for. */
export const highestNfGen: Generator = {
  id: "nf-gen-highest",
  topic: "normalization",
  difficulty: 3,
  tags: ["normal forms", "2nf", "3nf", "bcnf"],
  askedAt: "\"Which normal form is this in?\" is a staple of every DBMS round.",
  generate(seed) {
    const target: NormalForm = NORMAL_FORMS[seed % 4];
    const { rel, fds } = drawUntil(seed, (r) => randomSchema(r, randInt(r, 3, 5)), (s) => normalForm(s.rel, s.fds).form === target);
    const rep = normalForm(rel, fds);
    const keyLine = `Candidate keys: ${rep.keys.map(setText).join(", ")} (prime: ${rep.prime.join(", ")}).`;
    const why = rep.violation ? `It fails ${NORMAL_FORMS[NORMAL_FORMS.indexOf(rep.form) + 1]}: in ${setText(rep.violation.fd.lhs)} → ${setText(rep.violation.fd.rhs)}, ${rep.violation.reason}.` : "Every FD has a superkey on its left side, so R is in BCNF.";
    return {
      id: `nf-gen-highest-${seed}`,
      topic: "normalization",
      kind: "mcq",
      prompt: `${schemaText(rel, fds)}. Assuming atomic values, what is the highest normal form of R?`,
      choices: [...NORMAL_FORMS],
      answer: NORMAL_FORMS.indexOf(rep.form),
      explanation: `${keyLine} ${why}`,
      difficulty: 3,
      tags: highestNfGen.tags,
      askedAt: highestNfGen.askedAt,
    };
  },
};

/** A random split of `rel` into two overlapping parts that together cover it. */
function randomSplit(r: () => number, rel: readonly string[]): [string[], string[]] {
  const order = shuffled(r, rel);
  const cut = randInt(r, 2, rel.length - 1);
  const common = randInt(r, 1, Math.min(2, cut - 1));
  return [order.slice(0, cut).sort(), order.slice(cut - common).sort()];
}

/** "Is this decomposition lossless?", answered by the binary test; the seed picks the answer to aim for. */
export const losslessGen: Generator = {
  id: "nf-gen-lossless",
  topic: "normalization",
  difficulty: 3,
  tags: ["lossless join", "decomposition"],
  generate(seed) {
    const want = seed % 2 === 0;
    const { rel, fds, parts } = drawUntil(
      seed,
      (r) => {
        const s = randomSchema(r, randInt(r, 4, 5));
        return { ...s, parts: randomSplit(r, s.rel) };
      },
      (s) => losslessBinary(s.parts[0], s.parts[1], s.fds) === want,
    );
    const [r1, r2] = parts;
    const common = r1.filter((a) => r2.includes(a));
    const c = closure(common, fds);
    const ok = losslessBinary(r1, r2, fds);
    const side = r1.every((a) => c.includes(a)) ? "R1" : "R2";
    return {
      id: `nf-gen-lossless-${seed}`,
      topic: "normalization",
      kind: "truefalse",
      prompt: `${schemaText(rel, fds)}. Decomposing R into R1(${r1.join(", ")}) and R2(${r2.join(", ")}) is lossless.`,
      answer: ok,
      explanation:
        `R1 ∩ R2 = ${setText(common)} and (${setText(common)})⁺ = ${setText(c)}. ` +
        (ok ? `That covers all of ${side}, so the shared attributes are a superkey of ${side} and the join is lossless.` : "That covers neither R1 nor R2, so joining them back can produce spurious tuples: lossy."),
      difficulty: 3,
      tags: losslessGen.tags,
    };
  },
};

/** "Does this decomposition preserve every FD?", answered by `lostDependencies`; the seed picks the answer to aim for. */
export const preservationGen: Generator = {
  id: "nf-gen-preserve",
  topic: "normalization",
  difficulty: 3,
  tags: ["dependency preservation", "decomposition"],
  generate(seed) {
    const want = seed % 2 === 0;
    const { rel, fds, parts } = drawUntil(
      seed,
      (r) => {
        const s = randomSchema(r, randInt(r, 4, 5));
        return { ...s, parts: randomSplit(r, s.rel) };
      },
      (s) => (lostDependencies(s.parts, s.fds).length === 0) === want,
    );
    const lost = lostDependencies(parts, fds);
    return {
      id: `nf-gen-preserve-${seed}`,
      topic: "normalization",
      kind: "truefalse",
      prompt: `${schemaText(rel, fds)}. Decomposing R into R1(${parts[0].join(", ")}) and R2(${parts[1].join(", ")}) preserves every dependency.`,
      answer: lost.length === 0,
      explanation: lost.length
        ? `${fdsText(lost)} cannot be checked inside R1 or R2, even using FDs that do hold there, so it is lost and would need a join to enforce.`
        : "Every FD can be derived from FDs that hold within R1 or R2 alone (each one fits in a part, or follows by chaining through them), so the decomposition is dependency-preserving.",
      difficulty: 3,
      tags: preservationGen.tags,
    };
  },
};

export const NORMALIZATION_GENERATORS: Generator[] = [closureGen, keyCountGen, highestNfGen, losslessGen, preservationGen];

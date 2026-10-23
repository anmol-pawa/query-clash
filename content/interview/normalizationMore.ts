import type { Question } from "./types";

/** More functional-dependency questions: superkey counting and which inference rules are valid. Part of the "normalization" topic. */
export const NORMALIZATION_MORE: Question[] = [
  {
    id: "nf-superkey-count",
    topic: "normalization",
    kind: "numeric",
    prompt: "R(A, B, C) has a single candidate key, A. How many superkeys does R have?",
    answer: 4,
    explanation: "A superkey is any attribute set that contains a key. Every superkey must include A, and B and C are each free to be in or out: 2 × 2 = 4 (A, AB, AC, ABC).",
    difficulty: 1,
    tags: ["superkey", "candidate key", "counting"],
  },
  {
    id: "nf-augmentation",
    topic: "normalization",
    kind: "truefalse",
    prompt: "If A → B holds on R(A, B, C, D), then AC → BC also holds.",
    answer: true,
    explanation: "This is Armstrong's augmentation axiom: adding the same attributes to both sides of a valid FD gives another valid FD.",
    difficulty: 1,
    tags: ["armstrong", "augmentation"],
  },
  {
    id: "nf-invalid-inference",
    topic: "normalization",
    kind: "mcq",
    prompt: "Which of these inferences about functional dependencies is NOT valid?",
    choices: ["A → B and A → C imply A → BC", "A → B and BC → D imply AC → D", "AB → C implies A → C", "A → BC implies A → B"],
    answer: 2,
    explanation: "Dropping an attribute from a left-hand side is not allowed: if C depends on A and B together, it need not depend on A alone. The others are the union rule, pseudotransitivity and decomposition, all derived from Armstrong's axioms.",
    difficulty: 2,
    tags: ["armstrong", "inference rules"],
  },
  {
    id: "nf-fd-is-mvd",
    topic: "normalization",
    kind: "truefalse",
    prompt: "Every functional dependency X → Y is also a multivalued dependency X →→ Y.",
    answer: true,
    explanation: "If each X value determines a single Y value, then swapping Y values between tuples that agree on X changes nothing, so the MVD condition holds trivially. The converse is false, which is why 4NF is stricter than BCNF.",
    difficulty: 3,
    tags: ["mvd", "4nf"],
  },
];

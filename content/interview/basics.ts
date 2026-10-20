import type { Generator, Question } from "./types";
import { countSuperkeys } from "@/lib/dbms/keys";
import { randInt, rng, shuffled } from "@/lib/rng";

const ATTRS = ["A", "B", "C", "D", "E", "F"];

/** DBMS fundamentals: why a DBMS, the three-schema architecture, SQL sublanguages, relations and keys. */
export const BASICS: Question[] = [
  {
    id: "basics-why-dbms",
    topic: "basics",
    kind: "mcq",
    prompt: "Which of these is NOT an advantage of a DBMS over plain files?",
    choices: [
      "Less data redundancy and inconsistency",
      "Controlled concurrent access by many users",
      "Data independence from the storage layout",
      "Faster access than a flat file for every workload",
    ],
    answer: 3,
    explanation:
      "A DBMS adds parsing, locking and logging overhead, so a single program scanning one flat file can be faster. Its real wins are less redundancy, safe concurrency, recovery, security and data independence.",
    difficulty: 1,
    tags: ["dbms", "file system"],
    askedAt: "A classic opener in campus placement interviews.",
  },
  {
    id: "basics-three-schema",
    topic: "basics",
    kind: "mcq",
    prompt: "In the three-schema architecture, which level describes how data is physically stored (files, indexes, blocks)?",
    choices: ["External level", "Conceptual level", "Internal level", "View level"],
    answer: 2,
    explanation:
      "The internal (physical) level describes storage structures. The conceptual level describes the whole logical schema, and the external (view) level describes what each user group sees.",
    difficulty: 1,
    tags: ["architecture", "schema"],
    askedAt: "Common in service-company and GATE-style rounds.",
  },
  {
    id: "basics-logical-independence",
    topic: "basics",
    kind: "truefalse",
    prompt: "Logical data independence is harder to achieve than physical data independence.",
    answer: true,
    explanation:
      "True. Changing the conceptual schema (adding or splitting tables) can break the views and programs built on it, while physical changes (a new index, a new file layout) are hidden behind the conceptual schema.",
    difficulty: 2,
    tags: ["architecture", "data independence"],
  },
  {
    id: "basics-ddl",
    topic: "basics",
    kind: "multi",
    prompt: "Select every DDL (data definition) command.",
    choices: ["CREATE", "INSERT", "ALTER", "GRANT", "DROP"],
    answers: [0, 2, 4],
    explanation:
      "CREATE, ALTER and DROP define or change schema objects, so they are DDL. INSERT changes rows (DML) and GRANT manages privileges (DCL).",
    difficulty: 1,
    tags: ["sql", "ddl", "dml"],
    askedAt: "Asked in almost every fresher SQL screen.",
  },
  {
    id: "basics-query-pipeline",
    topic: "basics",
    kind: "order",
    prompt: "Put the stages a SQL query goes through inside the database in order.",
    steps: [
      "Parse: check the syntax and build a parse tree",
      "Bind: resolve tables and columns against the catalog",
      "Optimise: pick the cheapest execution plan",
      "Execute: run the plan's operators",
      "Return the result rows to the client",
    ],
    explanation:
      "The parser checks syntax, the binder (semantic analysis) resolves names and types, the optimiser chooses a plan from the candidates, and the executor runs it and streams rows back.",
    difficulty: 2,
    tags: ["query processing"],
    askedAt: "Common in product-company backend interviews.",
  },
  {
    id: "basics-acid-i",
    topic: "basics",
    kind: "short",
    prompt: "In ACID, what does the I stand for?",
    accept: ["isolation"],
    explanation:
      "Isolation: concurrent transactions behave as if they ran one after another. A is atomicity, C consistency and D durability.",
    difficulty: 1,
    tags: ["acid", "transactions"],
  },
  {
    id: "basics-pk-null",
    topic: "basics",
    kind: "truefalse",
    prompt: "A primary key column may hold NULL as long as only one row has it.",
    answer: false,
    explanation:
      "False. Entity integrity says no part of a primary key may be NULL. A UNIQUE constraint, unlike a primary key, does allow NULLs.",
    difficulty: 1,
    tags: ["keys", "integrity"],
    askedAt: "A favourite quick-fire question in SQL screens.",
  },
  {
    id: "basics-drop",
    topic: "basics",
    kind: "mcq",
    prompt: "Which statement removes the table's rows AND its definition from the schema?",
    choices: ["DELETE FROM t", "TRUNCATE TABLE t", "DROP TABLE t", "UPDATE t SET ... = NULL"],
    answer: 2,
    explanation:
      "DROP removes the table itself. DELETE removes rows one by one (and can take a WHERE); TRUNCATE empties the table quickly but keeps its definition.",
    difficulty: 1,
    tags: ["sql", "ddl"],
    askedAt: "The DELETE vs TRUNCATE vs DROP question comes up constantly.",
  },
  {
    id: "basics-cross-join",
    topic: "basics",
    kind: "numeric",
    prompt: "Table A has 4 rows and table B has 3 rows. How many rows does A CROSS JOIN B return?",
    answer: 12,
    unit: "rows",
    explanation: "A Cartesian product pairs every row of A with every row of B: 4 × 3 = 12 rows.",
    difficulty: 1,
    tags: ["relational algebra", "joins"],
  },
  {
    id: "basics-hierarchical",
    topic: "basics",
    kind: "mcq",
    prompt: "Which data model stores records as a tree where each child has exactly one parent?",
    choices: ["Relational", "Hierarchical", "Network", "Object-oriented"],
    answer: 1,
    explanation:
      "The hierarchical model (e.g. IBM IMS) is a tree. The network model allows a record many parents (a graph), and the relational model uses tables.",
    difficulty: 1,
    tags: ["data models"],
  },
  {
    id: "basics-ddl-name",
    topic: "basics",
    kind: "short",
    prompt: "Which SQL sublanguage (give its abbreviation) is used to define tables, indexes and other schema objects?",
    accept: ["ddl", "data definition language"],
    explanation: "DDL, the Data Definition Language: CREATE, ALTER, DROP. DML changes data, DCL grants privileges and TCL controls transactions.",
    difficulty: 1,
    tags: ["sql", "ddl"],
  },
  {
    id: "basics-relation-props",
    topic: "basics",
    kind: "multi",
    prompt: "Which of these are properties of a relation in the relational model?",
    choices: [
      "The order of tuples does not matter",
      "Every attribute value is atomic",
      "No two tuples are identical",
      "Columns must be sorted alphabetically",
    ],
    answers: [0, 1, 2],
    explanation:
      "A relation is a set of tuples: unordered and without duplicates, with atomic values (1NF). Column order carries no meaning, and nothing requires sorting them.",
    difficulty: 2,
    tags: ["relational model"],
  },
];

/** "How many superkeys?" for a random relation with one or two disjoint candidate keys, answered by brute-force enumeration. */
export const superkeyCount: Generator = {
  id: "basics-gen-superkeys",
  topic: "basics",
  difficulty: 2,
  tags: ["keys", "superkey"],
  askedAt: "A GATE favourite, and a common warm-up before normalisation questions.",
  generate(seed) {
    const r = rng(seed);
    const n = randInt(r, 3, 6);
    const attrs = ATTRS.slice(0, n);
    const pool = shuffled(r, attrs);
    const two = n >= 4 && r() < 0.5;
    const k1 = randInt(r, 1, two ? 1 : 2);
    const keys = [pool.slice(0, k1).sort()];
    if (two) keys.push(pool.slice(k1, k1 + randInt(r, 1, 2)).sort());
    const keyText = keys.map((k) => `{${k.join(", ")}}`).join(" and ");
    return {
      id: `basics-gen-superkeys-${seed}`,
      topic: "basics",
      kind: "numeric",
      prompt: `R(${attrs.join(", ")}) has ${keys.length === 1 ? "exactly one candidate key" : "exactly two candidate keys"}: ${keyText}. How many superkeys does R have?`,
      answer: countSuperkeys(attrs, keys),
      unit: "superkeys",
      explanation:
        keys.length === 1
          ? `A superkey is any superset of the key. The other ${n - keys[0].length} attributes can each be in or out: 2^${n - keys[0].length}.`
          : `Count supersets of each key and subtract the overlap (inclusion–exclusion): 2^${n - keys[0].length} + 2^${n - keys[1].length} − 2^${n - keys[0].length - keys[1].length}.`,
      difficulty: 2,
      tags: ["keys", "superkey"],
      askedAt: superkeyCount.askedAt,
    };
  },
};

export const BASICS_GENERATORS: Generator[] = [superkeyCount];

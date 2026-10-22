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

/** More fundamentals: keys and integrity, SQL sublanguages, data models, views and sequences of everyday DBMS ideas. */
export const BASICS_MORE: Question[] = [
  {
    id: "basics-fk-null",
    topic: "basics",
    kind: "truefalse",
    prompt: "A foreign key column may contain NULL.",
    answer: true,
    explanation:
      "True. Referential integrity requires every non-NULL foreign key value to match a referenced key, but a NULL means \"no reference\" and is allowed unless the column is also declared NOT NULL.",
    difficulty: 1,
    tags: ["keys", "integrity"],
    askedAt: "A common follow-up to \"what is a foreign key?\".",
  },
  {
    id: "basics-candidate-keys",
    topic: "basics",
    kind: "mcq",
    prompt: "A table has candidate keys {id} and {email}. You pick {id} as the PRIMARY KEY. What is {email} now called?",
    choices: ["A foreign key", "An alternate key", "A superkey only", "A composite key"],
    answer: 1,
    explanation:
      "Every candidate key that is not chosen as the primary key is an alternate key. It is still a minimal superkey and should be enforced with UNIQUE (and usually NOT NULL).",
    difficulty: 1,
    tags: ["keys"],
  },
  {
    id: "basics-superkey-def",
    topic: "basics",
    kind: "mcq",
    prompt: "Which statement defines a superkey of a relation?",
    choices: [
      "Any attribute set that uniquely identifies every tuple",
      "A minimal attribute set that uniquely identifies every tuple",
      "An attribute that references another table",
      "An attribute that is never NULL",
    ],
    answer: 0,
    explanation:
      "A superkey is any set of attributes that determines the whole tuple, minimal or not. A candidate key is a minimal superkey.",
    difficulty: 1,
    tags: ["keys", "superkey"],
    askedAt: "Asked to check you know superkey vs candidate key.",
  },
  {
    id: "basics-dml-list",
    topic: "basics",
    kind: "multi",
    prompt: "Select every DML (data manipulation) command.",
    choices: ["SELECT", "UPDATE", "TRUNCATE", "DELETE", "COMMIT"],
    answers: [0, 1, 3],
    explanation:
      "SELECT (in most textbooks), INSERT, UPDATE and DELETE work on rows, so they are DML. TRUNCATE is DDL in Oracle and most textbooks (Oracle cannot roll it back), and COMMIT belongs to TCL.",
    difficulty: 2,
    tags: ["sql", "dml"],
    askedAt: "The \"is TRUNCATE DDL or DML?\" trap is a favourite.",
  },
  {
    id: "basics-tcl-name",
    topic: "basics",
    kind: "short",
    prompt: "Which SQL sublanguage (give its abbreviation) contains COMMIT, ROLLBACK and SAVEPOINT?",
    accept: ["tcl", "transaction control language"],
    explanation: "TCL, the Transaction Control Language, ends or partly undoes a transaction. GRANT and REVOKE are DCL.",
    difficulty: 1,
    tags: ["sql", "tcl"],
  },
  {
    id: "basics-dcl",
    topic: "basics",
    kind: "mcq",
    prompt: "Which pair of commands belongs to DCL (data control language)?",
    choices: ["GRANT and REVOKE", "COMMIT and ROLLBACK", "CREATE and DROP", "INSERT and DELETE"],
    answer: 0,
    explanation: "GRANT and REVOKE manage privileges. COMMIT and ROLLBACK are TCL, CREATE and DROP are DDL, INSERT and DELETE are DML.",
    difficulty: 1,
    tags: ["sql", "dcl"],
  },
  {
    id: "basics-delete-truncate",
    topic: "basics",
    kind: "multi",
    prompt: "Which statements about DELETE and TRUNCATE are generally true?",
    choices: [
      "DELETE can use a WHERE clause; TRUNCATE removes every row",
      "TRUNCATE is usually faster because it does not log each row",
      "DELETE removes the table definition too",
      "Both always fire row-level triggers",
    ],
    answers: [0, 1],
    explanation:
      "DELETE is a row-by-row DML statement that accepts WHERE and fires row triggers. TRUNCATE empties the table in one operation with minimal logging and no WHERE. Neither removes the table definition (that is DROP).",
    difficulty: 2,
    tags: ["sql", "ddl", "dml"],
    askedAt: "One of the most repeated fresher questions.",
  },
  {
    id: "basics-data-independence-physical",
    topic: "basics",
    kind: "mcq",
    prompt: "Adding a new index to a table without changing any application query is an example of which kind of independence?",
    choices: ["Physical data independence", "Logical data independence", "Referential independence", "Transaction independence"],
    answer: 0,
    explanation:
      "The internal (storage) level changed but the conceptual schema and every application still work. That is physical data independence.",
    difficulty: 1,
    tags: ["architecture", "data independence"],
  },
  {
    id: "basics-view",
    topic: "basics",
    kind: "mcq",
    prompt: "What is a (non-materialized) view?",
    choices: [
      "A stored query that is run each time the view is read",
      "A physical copy of the query result refreshed nightly",
      "A read-only index on one column",
      "A temporary table that disappears at commit",
    ],
    answer: 0,
    explanation:
      "A plain view stores only its defining query, which is expanded into the outer query at execution time. A materialized view stores the result and must be refreshed.",
    difficulty: 1,
    tags: ["views", "architecture"],
    askedAt: "\"View vs materialized view\" is a classic.",
  },
  {
    id: "basics-null-compare",
    topic: "basics",
    kind: "mcq",
    prompt: "What does `SELECT * FROM t WHERE col = NULL` return?",
    choices: ["No rows, because the comparison is UNKNOWN", "Every row where col is NULL", "Every row", "A syntax error"],
    answer: 0,
    explanation:
      "Any comparison with NULL yields UNKNOWN, and WHERE keeps only rows where the condition is TRUE. Use `col IS NULL` to find NULLs.",
    difficulty: 1,
    tags: ["null", "three-valued logic", "sql"],
    askedAt: "Asked in nearly every SQL screen.",
  },
  {
    id: "basics-degree-cardinality",
    topic: "basics",
    kind: "numeric",
    prompt: "A relation has 5 attributes and 120 tuples. What is its degree?",
    answer: 5,
    unit: "attributes",
    explanation: "The degree (arity) is the number of attributes (5). The cardinality is the number of tuples (120).",
    difficulty: 1,
    tags: ["relational model", "terminology"],
  },
  {
    id: "basics-union-count",
    topic: "basics",
    kind: "mcq",
    prompt: "R has 6 tuples and S has 4 tuples, and no tuple appears in both. How many tuples are in R ∪ S?",
    choices: ["10", "24", "6", "4"],
    answer: 0,
    explanation: "A set union of two disjoint relations simply has 6 + 4 = 10 tuples. (Overlapping tuples would count once.)",
    difficulty: 1,
    tags: ["relational algebra", "set operations"],
  },
  {
    id: "basics-union-compatible",
    topic: "basics",
    kind: "truefalse",
    prompt: "R ∪ S is defined only when R and S have the same number of attributes with compatible domains.",
    answer: true,
    explanation:
      "Union, intersection and difference require union-compatible relations: same degree and matching attribute domains in the same positions.",
    difficulty: 2,
    tags: ["relational algebra", "set operations"],
  },
  {
    id: "basics-having-where",
    topic: "basics",
    kind: "mcq",
    prompt: "Which clause filters groups after GROUP BY has run?",
    choices: ["HAVING", "WHERE", "ORDER BY", "DISTINCT"],
    answer: 0,
    explanation:
      "WHERE filters rows before grouping and cannot use aggregates. HAVING filters whole groups using aggregates such as COUNT(*) > 1.",
    difficulty: 1,
    tags: ["sql", "group by"],
    askedAt: "\"WHERE vs HAVING\" is asked in almost every SQL round.",
  },
  {
    id: "basics-sql-order",
    topic: "basics",
    kind: "order",
    prompt: "Put the clauses of a SELECT in the order the database logically evaluates them.",
    steps: ["FROM (and JOIN)", "WHERE", "GROUP BY", "HAVING", "SELECT", "ORDER BY"],
    explanation:
      "Logically: FROM builds the row set, WHERE filters rows, GROUP BY groups them, HAVING filters groups, SELECT computes the output columns (and aliases), then ORDER BY sorts. This is why an alias from SELECT cannot be used in WHERE.",
    difficulty: 2,
    tags: ["sql", "query processing"],
    askedAt: "Common in product-company SQL rounds.",
  },
  {
    id: "basics-distinct-null",
    topic: "basics",
    kind: "numeric",
    prompt: "Column x holds the values 1, 1, NULL, NULL, 2. How many rows does SELECT DISTINCT x return?",
    answer: 3,
    unit: "rows",
    explanation: "DISTINCT treats NULLs as equal to each other, so the result is 1, 2 and one NULL: 3 rows.",
    difficulty: 2,
    tags: ["null", "sql"],
  },
  {
    id: "basics-count-null",
    topic: "basics",
    kind: "numeric",
    prompt: "Column x holds the values 1, 1, NULL, NULL, 2. What does SELECT COUNT(x) return?",
    answer: 3,
    explanation: "COUNT(x) skips NULLs, so it counts 1, 1 and 2: three values. COUNT(*) would return 5 and COUNT(DISTINCT x) would return 2.",
    difficulty: 2,
    tags: ["null", "aggregates", "sql"],
    askedAt: "COUNT(*) vs COUNT(col) comes up constantly.",
  },
  {
    id: "basics-dbms-components",
    topic: "basics",
    kind: "multi",
    prompt: "Which of these are components of a typical DBMS?",
    choices: ["Query optimiser", "Transaction manager", "Buffer manager", "Web browser"],
    answers: [0, 1, 2],
    explanation:
      "A DBMS contains a parser and optimiser, an execution engine, a buffer manager, a transaction/lock manager and a recovery (log) manager. A web browser is a client, not part of the DBMS.",
    difficulty: 2,
    tags: ["architecture", "dbms"],
  },
  {
    id: "basics-relational-model-author",
    topic: "basics",
    kind: "short",
    prompt: "Which researcher proposed the relational model in 1970? (surname only)",
    accept: ["codd", "e f codd", "edgar codd", "edgar f codd"],
    explanation: "Edgar F. Codd of IBM published \"A Relational Model of Data for Large Shared Data Banks\" in 1970. He later formulated twelve rules (0–12) for what makes a DBMS relational.",
    difficulty: 1,
    tags: ["data models", "history"],
  },
  {
    id: "basics-oltp-olap",
    topic: "basics",
    kind: "mcq",
    prompt: "Which workload is typical for OLAP rather than OLTP?",
    choices: [
      "Aggregating a year of sales by region and product",
      "Debiting one bank account",
      "Inserting one order line",
      "Looking up one user by primary key",
    ],
    answer: 0,
    explanation:
      "OLAP runs long read-mostly scans and aggregates over large history (column stores and warehouses fit well). OLTP is many short transactions touching a few rows each.",
    difficulty: 2,
    tags: ["oltp", "olap", "data warehouse"],
    askedAt: "Asked in data-engineering and backend interviews.",
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

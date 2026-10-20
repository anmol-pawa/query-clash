import type { Generator, PrecedenceGraphSpec, Question } from "./types";
import {
  blindWrites,
  conflicts,
  conflictSerialOrders,
  findCycle,
  isConflictSerializable,
  opText,
  parseSchedule,
  precedenceGraph,
  recoverability,
  scheduleTable,
  topologicalOrders,
  transactions,
  viewSerialOrders,
  type Op,
  type Recoverability,
  type Schedule,
} from "@/lib/dbms/schedule";
import {
  ANOMALIES,
  ANOMALY_NAMES,
  anomalies,
  historyTable,
  ISOLATION_LEVELS,
  LOWEST_LEVEL,
  type Anomaly,
  type History,
  type IsoOp,
} from "@/lib/dbms/isolation";
import { randInt, rng, shuffled } from "@/lib/rng";

/** The schedule's precedence graph, ready to draw, with any cycle marked. */
export function graphOf(s: Schedule): PrecedenceGraphSpec {
  const nodes = transactions(s);
  const edges = precedenceGraph(s);
  return { nodes, edges, cycle: findCycle(nodes, edges) };
}

/** Silberschatz's schedule 3 (conflict-equivalent to T1, T2) and schedule 4 (not conflict serializable). */
export const SCHEDULE_3 = parseSchedule("R1(A) W1(A) R2(A) W2(A) R1(B) W1(B) R2(B) W2(B)");
export const SCHEDULE_4 = parseSchedule("R1(A) R2(A) W2(A) R2(B) W1(A) R1(B) W1(B) W2(B)");
/** View serializable (as T1, T2, T3) but not conflict serializable: T2 and T3 write Q blindly. */
export const BLIND_WRITES = parseSchedule("R1(Q) W2(Q) W1(Q) W3(Q)");
/** T2 reads A from T1 and commits first: if T1 then aborts, T2's committed work rests on a value that never existed. */
export const NONRECOVERABLE = parseSchedule("R1(A) W1(A) R2(A) C2 R1(B) C1");
/** T1 aborts after T2 and T3 read its write: both must roll back too. */
export const CASCADE = parseSchedule("R1(A) R1(B) W1(A) R2(A) W2(A) R3(A) A1");

/** Transactions: ACID, schedules, conflict and view serializability, recoverability and isolation anomalies. */
export const TRANSACTIONS: Question[] = [
  {
    id: "tx-atomicity",
    topic: "transactions",
    kind: "mcq",
    prompt: "A transfer debits one account, then the server crashes before it credits the other. Which ACID property guarantees the debit is undone?",
    choices: ["Atomicity", "Consistency", "Isolation", "Durability"],
    answer: 0,
    explanation:
      "Atomicity: a transaction happens completely or not at all. The recovery manager uses the log to undo the partial debit when the system restarts.",
    difficulty: 1,
    tags: ["acid", "atomicity"],
    askedAt: "The opening question of most DBMS interviews.",
  },
  {
    id: "tx-durability",
    topic: "transactions",
    kind: "short",
    prompt: "Once COMMIT returns, the transaction's changes survive any later crash. Which ACID property is this?",
    accept: ["durability", "durable"],
    explanation:
      "Durability. The DBMS forces the transaction's log records to stable storage before acknowledging the commit (write-ahead logging), so redo can rebuild the changes after a crash.",
    difficulty: 1,
    tags: ["acid", "durability"],
  },
  {
    id: "tx-isolation-component",
    topic: "transactions",
    kind: "mcq",
    prompt: "Which part of the DBMS is chiefly responsible for isolation?",
    choices: ["The recovery manager", "The concurrency-control manager", "The query optimizer", "The application programmer"],
    answer: 1,
    explanation:
      "The concurrency-control manager (locks, timestamps or MVCC) makes concurrent transactions behave as if they ran one at a time. The recovery manager handles atomicity and durability, and consistency is mostly the job of the programmer and the integrity constraints.",
    difficulty: 2,
    tags: ["acid", "isolation"],
  },
  {
    id: "tx-states",
    topic: "transactions",
    kind: "order",
    prompt: "Order the states a transaction passes through on its way to a successful commit.",
    steps: ["Active", "Partially committed", "Committed"],
    explanation:
      "A transaction is active while it runs, partially committed after its last statement (its changes may still be only in memory), and committed once the commit log record is safely on disk. A failure along the way sends it to failed and then aborted.",
    difficulty: 1,
    tags: ["transaction states"],
  },
  {
    id: "tx-conflicting-pairs",
    topic: "transactions",
    kind: "multi",
    prompt: "Select every pair of operations that conflict.",
    choices: ["R1(A) and W2(A)", "W1(A) and W2(A)", "R1(A) and R2(A)", "W1(A) and W2(B)", "W1(A) and R1(A)"],
    answers: [0, 1],
    explanation:
      "Two operations conflict when they belong to different transactions, access the same item, and at least one is a write. Two reads never conflict, different items never conflict, and a transaction never conflicts with itself.",
    difficulty: 1,
    tags: ["schedules", "conflicts"],
    askedAt: "The base definition behind every serializability question.",
  },
  {
    id: "tx-serial-count",
    topic: "transactions",
    kind: "numeric",
    prompt: "How many different serial schedules are there for 4 transactions?",
    answer: 24,
    unit: "schedules",
    explanation: "A serial schedule runs the transactions one after another, so there is one per ordering: 4! = 24.",
    difficulty: 1,
    tags: ["schedules", "serial schedule"],
  },
  {
    id: "tx-precedence-graph",
    topic: "transactions",
    kind: "short",
    prompt: "To test a schedule for conflict serializability you draw a ___ graph (an edge Ti → Tj for each conflict where Ti acts first) and check it for cycles.",
    accept: ["precedence", "precedence graph", "serialization", "serializability"],
    explanation:
      "The precedence (serialization) graph has a node per transaction and an edge Ti → Tj whenever an operation of Ti conflicts with a later operation of Tj. The schedule is conflict serializable exactly when the graph is acyclic, and any topological order is an equivalent serial order.",
    difficulty: 1,
    tags: ["conflict serializability", "precedence graph"],
  },
  {
    id: "tx-schedule3",
    topic: "transactions",
    kind: "mcq",
    prompt: "Which serial schedule is this schedule conflict-equivalent to?",
    tables: [scheduleTable(SCHEDULE_3)],
    explainGraph: graphOf(SCHEDULE_3),
    choices: ["T1 then T2", "T2 then T1", "Both", "Neither: it is not conflict serializable"],
    answer: 0,
    explanation:
      "Every conflict goes from T1 to T2 (W1(A) before R2(A) and W2(A), W1(B) before R2(B) and W2(B), and so on), so the precedence graph is just T1 → T2. Swapping T2's A operations past T1's B operations gives the serial schedule T1, T2.",
    difficulty: 2,
    tags: ["conflict serializability", "precedence graph"],
    askedAt: "Textbook (Silberschatz) schedule; a GATE favourite.",
  },
  {
    id: "tx-schedule4",
    topic: "transactions",
    kind: "truefalse",
    prompt: "This schedule is conflict serializable.",
    tables: [scheduleTable(SCHEDULE_4)],
    explainGraph: graphOf(SCHEDULE_4),
    answer: false,
    explanation:
      "R1(A) comes before W2(A), giving T1 → T2, and W2(A) comes before W1(A), giving T2 → T1. The precedence graph has the cycle T1 → T2 → T1, so no serial order is conflict-equivalent. (It is the lost-update interleaving: T2's write of A is overwritten.)",
    difficulty: 2,
    tags: ["conflict serializability", "precedence graph"],
  },
  {
    id: "tx-cs-implies-vs",
    topic: "transactions",
    kind: "truefalse",
    prompt: "Every conflict-serializable schedule is also view serializable.",
    answer: true,
    explanation:
      "True. Conflict equivalence preserves who reads from whom and the final writes, so conflict-equivalent schedules are view-equivalent. The converse fails: some view-serializable schedules are not conflict serializable.",
    difficulty: 2,
    tags: ["view serializability", "conflict serializability"],
  },
  {
    id: "tx-blind-writes",
    topic: "transactions",
    kind: "mcq",
    prompt: "This schedule is view serializable but not conflict serializable. What makes that possible?",
    tables: [scheduleTable(BLIND_WRITES)],
    choices: ["Blind writes (writes without a prior read)", "A transaction that aborts", "Reads of uncommitted data", "Two transactions that never conflict"],
    answer: 0,
    explanation:
      "W2(Q) and W3(Q) are blind writes. The precedence graph has T1 → T2 and T2 → T1, but in both this schedule and the serial T1, T2, T3, T1 reads the initial Q and T3 writes the final Q, so they are view-equivalent. Without blind writes, view and conflict serializability coincide.",
    difficulty: 3,
    tags: ["view serializability", "blind write"],
    askedAt: "The standard follow-up to \"conflict vs view serializability\".",
  },
  {
    id: "tx-vs-np",
    topic: "transactions",
    kind: "truefalse",
    prompt: "Testing whether a schedule is view serializable is NP-complete, which is why real systems enforce conflict serializability instead.",
    answer: true,
    explanation:
      "True. The precedence-graph test for conflict serializability runs in polynomial time, while the view-serializability test is NP-complete. Protocols like two-phase locking guarantee conflict serializability by construction.",
    difficulty: 3,
    tags: ["view serializability"],
  },
  {
    id: "tx-recoverable-def",
    topic: "transactions",
    kind: "mcq",
    prompt: "A schedule is recoverable when…",
    choices: [
      "every transaction commits before the next one starts",
      "whenever Tj reads a value written by Ti, Ti commits before Tj commits",
      "no transaction reads a value written by an uncommitted transaction",
      "its precedence graph is acyclic",
    ],
    answer: 1,
    explanation:
      "Recoverable: a reader commits only after every transaction it read from has committed, so an abort never has to undo committed work. Reading only committed values is the stronger cascadeless property, and an acyclic precedence graph is about serializability, not recovery.",
    difficulty: 2,
    tags: ["recoverability"],
    askedAt: "Asked together with cascadeless and strict schedules.",
  },
  {
    id: "tx-nonrecoverable",
    topic: "transactions",
    kind: "truefalse",
    prompt: "This schedule is recoverable.",
    tables: [scheduleTable(NONRECOVERABLE)],
    answer: false,
    explanation:
      "T2 reads A after T1 wrote it, then commits before T1 does. If T1 aborted after C2, T2 would have committed a value that never officially existed, and a committed transaction cannot be rolled back.",
    difficulty: 2,
    tags: ["recoverability"],
  },
  {
    id: "tx-cascade",
    topic: "transactions",
    kind: "multi",
    prompt: "T1 aborts at the last step. Select every other transaction that must also be rolled back.",
    tables: [scheduleTable(CASCADE)],
    choices: ["T2", "T3", "Neither"],
    answers: [0, 1],
    explanation:
      "T2 read A from T1, and T3 read A from T2, so both depend on T1's undone write: a cascading rollback. Cascadeless schedules prevent this by letting transactions read only committed data. (The schedule is still recoverable, since neither T2 nor T3 has committed.)",
    difficulty: 2,
    tags: ["recoverability", "cascading rollback"],
  },
  {
    id: "tx-class-order",
    topic: "transactions",
    kind: "order",
    prompt: "Order these schedule classes from the smallest (most restrictive) to the largest. Each is contained in the next.",
    steps: ["Serial", "Strict", "Cascadeless", "Recoverable"],
    explanation:
      "Serial ⊂ strict ⊂ cascadeless ⊂ recoverable. Strict forbids reading or overwriting uncommitted writes, cascadeless forbids only reading them, and recoverable only orders the commits. Strict 2PL produces strict schedules, which makes undo a simple restore of the before-image.",
    difficulty: 3,
    tags: ["recoverability", "strict schedule"],
  },
  {
    id: "tx-dirty-read",
    topic: "transactions",
    kind: "mcq",
    prompt: "T1 updates a price to 0 by mistake. T2 reads 0 and then T1 rolls back. What did T2 experience?",
    choices: ["A dirty read", "A non-repeatable read", "A phantom read", "A lost update"],
    answer: 0,
    explanation: "A dirty read: T2 read data written by a transaction that had not committed (and never did). Every isolation level above READ UNCOMMITTED prevents it.",
    difficulty: 1,
    tags: ["isolation", "anomalies"],
    askedAt: "Asked in almost every backend interview.",
  },
  {
    id: "tx-lost-update",
    topic: "transactions",
    kind: "mcq",
    prompt: "T1 and T2 both read a balance of 100. T1 writes 100 + 10, then T2 writes 100 + 20 and both commit. The final balance is 120. What went wrong?",
    choices: ["A dirty read", "A lost update", "A phantom read", "A deadlock"],
    answer: 1,
    explanation:
      "A lost update: T2 overwrote T1's write using a stale read, so T1's +10 vanished. Fix it with an atomic UPDATE … SET balance = balance + 20, SELECT … FOR UPDATE, an optimistic version check, or a stricter isolation level.",
    difficulty: 2,
    tags: ["isolation", "anomalies", "lost update"],
  },
  {
    id: "tx-read-committed",
    topic: "transactions",
    kind: "multi",
    prompt: "Under the ANSI SQL definition of READ COMMITTED, which anomalies can still occur?",
    choices: ["Dirty read", "Non-repeatable read", "Phantom read"],
    answers: [1, 2],
    explanation:
      "READ COMMITTED only blocks dirty reads. Reading the same row twice can return different committed values (non-repeatable read), and re-running a range query can return new rows (phantom). REPEATABLE READ adds the second guarantee and SERIALIZABLE all three.",
    difficulty: 2,
    tags: ["isolation", "isolation levels", "anomalies"],
    askedAt: "Expect the full isolation-level table in backend interviews.",
  },
  {
    id: "tx-phantom",
    topic: "transactions",
    kind: "short",
    prompt: "In the ANSI SQL standard, REPEATABLE READ still allows one anomaly: a range query run twice returns a new row. What is it called?",
    accept: ["phantom", "phantom read", "phantoms"],
    explanation:
      "A phantom read. Row locks protect the rows already read but not the gap where a new row can be inserted. Predicate or next-key (gap) locks, or SERIALIZABLE, prevent it.",
    difficulty: 2,
    tags: ["isolation", "anomalies", "phantom"],
  },
  {
    id: "tx-levels-order",
    topic: "transactions",
    kind: "order",
    prompt: "Order the ANSI SQL isolation levels from weakest to strongest.",
    steps: ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"],
    explanation:
      "Each level blocks one more anomaly: READ COMMITTED stops dirty reads, REPEATABLE READ stops non-repeatable reads, and SERIALIZABLE stops phantoms (and every other anomaly).",
    difficulty: 1,
    tags: ["isolation levels"],
  },
  {
    id: "tx-default-level",
    topic: "transactions",
    kind: "mcq",
    prompt: "What is the default isolation level in both PostgreSQL and Oracle?",
    choices: ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"],
    answer: 1,
    explanation: "READ COMMITTED: each statement sees the data committed before it began. (MySQL's InnoDB is the odd one out, defaulting to REPEATABLE READ.)",
    difficulty: 1,
    tags: ["isolation levels", "postgresql", "oracle"],
  },
  {
    id: "tx-write-skew",
    topic: "transactions",
    kind: "mcq",
    prompt:
      "A rule says at least one doctor must be on call. Alice and Bob are both on call. Each runs a transaction that checks \"someone else is on call\" and then takes themselves off call. Both commit, and nobody is on call. Which anomaly is this, and which level prevents it?",
    choices: [
      "Lost update, prevented by READ COMMITTED",
      "Write skew, allowed by snapshot isolation and prevented by SERIALIZABLE",
      "Dirty read, prevented by READ COMMITTED",
      "Phantom read, prevented by REPEATABLE READ in the ANSI standard",
    ],
    answer: 1,
    explanation:
      "Write skew: two transactions read an overlapping set, then update different rows, so neither overwrites the other but together they break the invariant. Snapshot isolation (PostgreSQL's REPEATABLE READ, Oracle's SERIALIZABLE) allows it. PostgreSQL's SERIALIZABLE (SSI) detects it and aborts one transaction; elsewhere use SELECT … FOR UPDATE or a constraint.",
    difficulty: 3,
    tags: ["isolation", "anomalies", "write skew", "snapshot isolation"],
    askedAt: "A senior-level follow-up after the isolation-level table.",
  },
  {
    id: "tx-pg-read-uncommitted",
    topic: "transactions",
    kind: "truefalse",
    prompt: "In PostgreSQL, SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED lets a transaction see other transactions' uncommitted changes.",
    answer: false,
    explanation:
      "False. PostgreSQL accepts READ UNCOMMITTED but runs it as READ COMMITTED, because MVCC never needs to expose uncommitted rows. Oracle offers only READ COMMITTED and SERIALIZABLE (plus read-only transactions).",
    difficulty: 3,
    tags: ["isolation levels", "postgresql", "oracle", "mvcc"],
  },
];

const ITEMS = ["A", "B", "C"];

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

interface ScheduleShape {
  txs: number;
  items: number;
  /** Reads and writes per transaction. */
  ops: [number, number];
  /** Chance that a write is blind (no earlier read of the item by the same transaction). */
  blind?: number;
  /** Add a commit (or, with `abort`, sometimes an abort) at the end of each transaction. */
  ends?: boolean;
  abort?: number;
}

/** A random schedule: each transaction reads then (usually) writes its items, and the transactions are interleaved at random. */
export function randomSchedule(r: () => number, shape: ScheduleShape): Schedule {
  const items = ITEMS.slice(0, shape.items);
  const perTx = Array.from({ length: shape.txs }, (_, t) => {
    const tx = t + 1;
    const ops: Op[] = [];
    const n = randInt(r, shape.ops[0], shape.ops[1]);
    while (ops.length < n) {
      const item = items[randInt(r, 0, items.length - 1)];
      const read = ops.some((o) => o.kind === "R" && o.item === item);
      const kind = !read && r() >= (shape.blind ?? 0) ? "R" : "W";
      // Each transaction reads and writes an item at most once.
      if (!ops.some((o) => o.kind === kind && o.item === item)) ops.push({ tx, kind, item });
      else if (ops.length >= 2 * items.length) break;
    }
    if (shape.ends) ops.push({ tx, kind: r() < (shape.abort ?? 0) ? "A" : "C" });
    return ops;
  });
  const out: Schedule = [];
  while (perTx.some((q) => q.length)) {
    const live = perTx.filter((q) => q.length);
    out.push(live[randInt(r, 0, live.length - 1)].shift()!);
  }
  return out;
}

function drawSchedule(seed: number, shape: ScheduleShape, ok: (s: Schedule) => boolean): Schedule {
  const r = rng(seed);
  let s = randomSchedule(r, shape);
  for (let i = 0; i < 500 && !ok(s); i++) s = randomSchedule(r, shape);
  return s;
}

export const orderText = (order: readonly number[]): string => order.map((t) => `T${t}`).join(" → ");

/** Each precedence edge with the first conflict that causes it, e.g. "W1(A) before R2(A) gives T1 → T2". */
export function edgeReasons(s: Schedule): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { i, j } of conflicts(s)) {
    const k = `${s[i].tx},${s[j].tx}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(`${opText(s[i])} before ${opText(s[j])} gives T${s[i].tx} → T${s[j].tx}`);
  }
  return out;
}

function graphExplanation(s: Schedule): string {
  const edges = precedenceGraph(s);
  if (!edges.length) return "No two operations conflict, so the precedence graph has no edges";
  return `${edgeReasons(s).join("; ")}`;
}

function cycleText(s: Schedule): string {
  const c = findCycle(transactions(s), precedenceGraph(s));
  return c ? c.map((t) => `T${t}`).join(" → ") : "";
}

const PERMS_3 = [
  [1, 2, 3],
  [1, 3, 2],
  [2, 1, 3],
  [2, 3, 1],
  [3, 1, 2],
  [3, 2, 1],
];
const NONE_CS = "None: the precedence graph has a cycle";

/** "Which serial orders is this schedule conflict-equivalent to?", answered by the precedence graph's topological orders. */
export const serialOrdersGen: Generator = {
  id: "tx-gen-serial-orders",
  topic: "transactions",
  difficulty: 3,
  tags: ["conflict serializability", "precedence graph"],
  askedAt: "\"Find the equivalent serial schedule\" is a GATE and placement-test staple.",
  generate(seed) {
    const want = seed % 3 !== 0;
    const s = drawSchedule(seed, { txs: 3, items: 2, ops: [2, 3] }, (x) => isConflictSerializable(x) === want && precedenceGraph(x).length >= 2);
    const orders = conflictSerialOrders(s).map(orderText);
    const choices = [...PERMS_3.map(orderText), NONE_CS];
    const answers = orders.length ? orders.map((o) => choices.indexOf(o)) : [choices.length - 1];
    return {
      id: `tx-gen-serial-orders-${seed}`,
      topic: "transactions",
      kind: "multi",
      prompt: "Select every serial order this schedule is conflict-equivalent to.",
      tables: [scheduleTable(s)],
      explainGraph: graphOf(s),
      choices,
      answers,
      explanation: orders.length
        ? `${graphExplanation(s)}. The graph is acyclic, and each topological order is an equivalent serial schedule: ${orders.join(", ")}.`
        : `${graphExplanation(s)}. That makes the cycle ${cycleText(s)}, so the schedule is not conflict serializable.`,
      difficulty: 3,
      tags: serialOrdersGen.tags,
      askedAt: serialOrdersGen.askedAt,
    };
  },
};

/** "How many edges does the precedence graph have?", counted by `precedenceGraph`. */
export const edgeCountGen: Generator = {
  id: "tx-gen-edges",
  topic: "transactions",
  difficulty: 2,
  tags: ["precedence graph", "conflicts"],
  generate(seed) {
    const s = drawSchedule(seed, { txs: 3, items: 2, ops: [2, 3] }, (x) => precedenceGraph(x).length >= 1);
    const edges = precedenceGraph(s);
    return {
      id: `tx-gen-edges-${seed}`,
      topic: "transactions",
      kind: "numeric",
      prompt: "How many edges does this schedule's precedence graph have? (Count each Ti → Tj once, however many conflicts cause it.)",
      tables: [scheduleTable(s)],
      explainGraph: graphOf(s),
      answer: edges.length,
      unit: "edges",
      explanation: `${graphExplanation(s)}. That is ${plural(edges.length, "distinct edge")}: ${edges.map(([a, b]) => `T${a} → T${b}`).join(", ")}.`,
      difficulty: 2,
      tags: edgeCountGen.tags,
    };
  },
};

/** "This schedule is conflict serializable": true or false, balanced by the seed. */
export const conflictTfGen: Generator = {
  id: "tx-gen-conflict-tf",
  topic: "transactions",
  difficulty: 2,
  tags: ["conflict serializability"],
  generate(seed) {
    const want = seed % 2 === 0;
    const s = drawSchedule(seed, { txs: randInt(rng(seed), 2, 3), items: 2, ops: [2, 3] }, (x) => isConflictSerializable(x) === want && precedenceGraph(x).length >= 1);
    const cs = isConflictSerializable(s);
    return {
      id: `tx-gen-conflict-tf-${seed}`,
      topic: "transactions",
      kind: "truefalse",
      prompt: "This schedule is conflict serializable.",
      tables: [scheduleTable(s)],
      explainGraph: graphOf(s),
      answer: cs,
      explanation: cs
        ? `${graphExplanation(s)}. The precedence graph has no cycle, so the schedule is conflict-equivalent to ${orderText(conflictSerialOrders(s)[0])}.`
        : `${graphExplanation(s)}. The cycle ${cycleText(s)} means no serial order is conflict-equivalent.`,
      difficulty: 2,
      tags: conflictTfGen.tags,
    };
  },
};

export const RECOVERABILITY_CHOICES: Record<Recoverability, string> = {
  strict: "Strict",
  cascadeless: "Cascadeless but not strict",
  recoverable: "Recoverable but not cascadeless",
  nonrecoverable: "Not recoverable",
};
const LEVELS: Recoverability[] = ["strict", "cascadeless", "recoverable", "nonrecoverable"];

/** "Which is the strongest class this schedule belongs to?", classified by `recoverability`; the seed picks the class. */
export const recoverabilityGen: Generator = {
  id: "tx-gen-recoverability",
  topic: "transactions",
  difficulty: 3,
  tags: ["recoverability", "cascading rollback", "strict schedule"],
  askedAt: "Recoverable / cascadeless / strict classification is a GATE regular.",
  generate(seed) {
    const want = LEVELS[seed % 4];
    const s = drawSchedule(seed, { txs: 2, items: 2, ops: [2, 3], ends: true, abort: 0.15 }, (x) => recoverability(x).level === want && x.some((o) => o.kind === "R" && o.tx === 2));
    const { level, reason } = recoverability(s);
    const why: Record<Recoverability, string> = {
      strict: "No transaction reads or overwrites an item until the transaction that last wrote it has committed or aborted, so the schedule is strict (and so also cascadeless and recoverable).",
      cascadeless: `Every read sees only committed data, so it is cascadeless, but ${reason}, so it is not strict.`,
      recoverable: `${reason}, so an abort could cascade, but every reader commits after the transaction it read from, so it is recoverable.`,
      nonrecoverable: `${reason}: if the writer then aborted, a committed transaction would rest on a value that never existed.`,
    };
    return {
      id: `tx-gen-recoverability-${seed}`,
      topic: "transactions",
      kind: "mcq",
      prompt: "What is the strongest property this schedule has?",
      tables: [scheduleTable(s)],
      choices: LEVELS.map((l) => RECOVERABILITY_CHOICES[l]),
      answer: LEVELS.indexOf(level),
      explanation: why[level],
      difficulty: 3,
      tags: recoverabilityGen.tags,
      askedAt: recoverabilityGen.askedAt,
    };
  },
};

/** "Not conflict serializable — is it view serializable?", answered by trying every serial order; balanced by the seed. */
export const viewTfGen: Generator = {
  id: "tx-gen-view-tf",
  topic: "transactions",
  difficulty: 3,
  tags: ["view serializability", "blind write"],
  generate(seed) {
    const want = seed % 2 === 0;
    const s = drawSchedule(
      seed,
      { txs: 3, items: 2, ops: [1, 3], blind: 0.6 },
      (x) => !isConflictSerializable(x) && (viewSerialOrders(x).length > 0) === want && blindWrites(x).length > 0,
    );
    const orders = viewSerialOrders(s);
    const blind = blindWrites(s).map((i) => opText(s[i]));
    return {
      id: `tx-gen-view-tf-${seed}`,
      topic: "transactions",
      kind: "truefalse",
      prompt: "This schedule is not conflict serializable, but it is view serializable.",
      tables: [scheduleTable(s)],
      explainGraph: graphOf(s),
      answer: orders.length > 0,
      explanation: orders.length
        ? `True. The cycle ${cycleText(s)} rules out conflict serializability, but the serial order ${orderText(orders[0])} has every read reading from the same writer and the same final write of each item, so they are view-equivalent. The blind writes (${blind.join(", ")}) make the difference.`
        : `False. Trying all six serial orders, none keeps every read's source and every item's final writer the same (the cycle is ${cycleText(s)}). Blind writes (${blind.join(", ")}) alone do not guarantee view serializability.`,
      difficulty: 3,
      tags: viewTfGen.tags,
    };
  },
};

const PAIRS: [string, string][] = [
  ["A", "B"],
  ["X", "Y"],
  ["P", "Q"],
];
const PREDICATES = ["P", "Q", "S"];

/** Merge per-transaction op lists into one interleaving, following `order` (a list of transaction numbers, one per step). */
function interleave(order: readonly number[], perTx: Record<number, IsoOp[]>): History {
  const queues = Object.fromEntries(Object.entries(perTx).map(([t, ops]) => [t, [...ops]]));
  return order.map((t) => queues[t].shift()!);
}

const op = (tx: number, kind: IsoOp["kind"], target?: string): IsoOp => (target ? { tx, kind, target } : { tx, kind });

/** A two-transaction interleaving showing exactly the given anomaly, varied by the seed (items, which transaction leads, commit timing). */
export function anomalyHistory(anomaly: Anomaly, seed: number): History {
  const r = rng(seed);
  const [x, y] = PAIRS[randInt(r, 0, PAIRS.length - 1)];
  const flip = r() < 0.5;
  // a is the transaction the anomaly happens to (it reads), b the one that interferes.
  const a = flip ? 2 : 1;
  const b = flip ? 1 : 2;
  const pick = <T,>(xs: T[]): T => xs[randInt(r, 0, xs.length - 1)];
  switch (anomaly) {
    case "dirty-read": {
      const bEnd = r() < 0.6 ? "A" : "C";
      const tail = r() < 0.5;
      const perTx = { [b]: [op(b, "R", x), op(b, "W", x), op(b, bEnd)], [a]: [op(a, "R", x), ...(tail ? [op(a, "W", y)] : []), op(a, "C")] };
      // b reads and writes x, then a reads x before b ends.
      const order = [b, b, a, ...(tail ? [a] : []), ...(r() < 0.5 ? [b, a] : [a, b])];
      return interleave(order, perTx);
    }
    case "non-repeatable-read": {
      const bReads = r() < 0.5;
      const perTx = { [a]: [op(a, "R", x), op(a, "R", x), op(a, "C")], [b]: [...(bReads ? [op(b, "R", x)] : []), op(b, "W", x), op(b, "C")] };
      const start = bReads ? pick([[a, b], [b, a]]) : [a];
      return interleave([...start, b, b, a, a], perTx);
    }
    case "phantom": {
      const pred = pick(PREDICATES);
      const bQueries = r() < 0.5;
      const perTx = { [a]: [op(a, "S", pred), op(a, "S", pred), op(a, "C")], [b]: [...(bQueries ? [op(b, "S", pred)] : []), op(b, "I", pred), op(b, "C")] };
      const start = bQueries ? pick([[a, b], [b, a]]) : [a];
      return interleave([...start, b, b, a, a], perTx);
    }
    case "lost-update": {
      const perTx = { [a]: [op(a, "R", x), op(a, "W", x), op(a, "C")], [b]: [op(b, "R", x), op(b, "W", x), op(b, "C")] };
      // Both read, b writes (and may commit) first, then a writes over it from its stale read.
      const reads = pick([[a, b], [b, a]]);
      const mid = pick([[b, a], [b, b, a]]);
      const rest = mid.length === 3 ? [a] : r() < 0.5 ? [a, b] : [b, a];
      return interleave([...reads, ...mid, ...rest], perTx);
    }
    case "write-skew": {
      const bothRead = r() < 0.5;
      // a reads x (and maybe y) then writes y; b reads y (and maybe x) then writes x.
      const perTx = {
        [a]: [op(a, "R", x), ...(bothRead ? [op(a, "R", y)] : []), op(a, "W", y), op(a, "C")],
        [b]: [...(bothRead ? [op(b, "R", x)] : []), op(b, "R", y), op(b, "W", x), op(b, "C")],
      };
      const n = bothRead ? 2 : 1;
      const reads = r() < 0.5 ? [...Array(n).fill(a), ...Array(n).fill(b)] : [a, b, ...(n === 2 ? [a, b] : [])];
      const writes = pick([[a, b, a, b], [a, a, b, b], [b, a, b, a], [b, a, a, b]]);
      return interleave([...reads, ...writes], perTx);
    }
  }
}

const anomalyChoice = (an: Anomaly, level: string) => `${ANOMALY_NAMES[an]} · prevented from ${level}`;

/** "Which anomaly does this interleaving show, and which lowest level prevents it?", classified by `anomalies`; the seed picks the anomaly. */
export const anomalyGen: Generator = {
  id: "tx-gen-anomaly",
  topic: "transactions",
  difficulty: 2,
  tags: ["isolation levels", "anomalies"],
  askedAt: "Isolation anomalies per level are asked in nearly every backend interview.",
  generate(seed) {
    const want = ANOMALIES[seed % ANOMALIES.length];
    const h = anomalyHistory(want, seed);
    const [{ anomaly, reason }] = anomalies(h);
    const level = LOWEST_LEVEL[anomaly];
    const r = rng(seed * 7 + 3);
    const wrongLevel = shuffled(r, ISOLATION_LEVELS.filter((l) => l !== level && l !== "READ UNCOMMITTED"))[0];
    const others = shuffled(r, ANOMALIES.filter((x) => x !== anomaly)).slice(0, 2);
    const right = anomalyChoice(anomaly, level);
    const choices = shuffled(r, [right, anomalyChoice(anomaly, wrongLevel), ...others.map((o) => anomalyChoice(o, LOWEST_LEVEL[o]))]);
    const notes: Record<Anomaly, string> = {
      "dirty-read": "READ COMMITTED only ever shows committed data, so the read could not see the uncommitted write.",
      "non-repeatable-read": "REPEATABLE READ keeps a read item stable for the whole transaction (a held read lock, or one snapshot in PostgreSQL and Oracle-style MVCC).",
      phantom: "The SQL standard only rules out phantoms at SERIALIZABLE (predicate or range locks). PostgreSQL's snapshot-based REPEATABLE READ happens to prevent them too.",
      "lost-update": "From REPEATABLE READ up, the read-then-write cannot slip through: the read lock blocks the other writer, or PostgreSQL aborts the second updater with a serialization error.",
      "write-skew": "The two transactions write different items, so snapshot isolation (PostgreSQL's REPEATABLE READ, Oracle's SERIALIZABLE) lets both commit. Only true SERIALIZABLE (PostgreSQL's SSI, or strict 2PL with predicate locks) catches it.",
    };
    return {
      id: `tx-gen-anomaly-${seed}`,
      topic: "transactions",
      kind: "mcq",
      prompt:
        "Which anomaly does this interleaving show, and what is the lowest isolation level that prevents it? (read/write act on one item; select(P) returns every row matching predicate P, insert(P) adds a matching row.)",
      tables: [historyTable(h)],
      choices,
      answer: choices.indexOf(right),
      explanation: `${ANOMALY_NAMES[anomaly]}: ${reason}. ${notes[anomaly]}`,
      difficulty: 2,
      tags: anomalyGen.tags,
      askedAt: anomalyGen.askedAt,
    };
  },
};

/** "How many serial schedules match this precedence graph?", counted by `topologicalOrders` (0 when it has a cycle). */
export const graphOrdersGen: Generator = {
  id: "tx-gen-graph-orders",
  topic: "transactions",
  difficulty: 2,
  tags: ["precedence graph", "conflict serializability"],
  generate(seed) {
    const r = rng(seed);
    const cyclic = seed % 4 === 0;
    const n = randInt(r, 3, 4);
    const nodes = Array.from({ length: n }, (_, i) => i + 1);
    const all = nodes.flatMap((a) => nodes.filter((b) => b !== a).map((b) => [a, b] as [number, number]));
    let edges: [number, number][] = [];
    for (let i = 0; i < 500; i++) {
      edges = all.filter(() => r() < 0.3).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      if (edges.length >= 2 && (findCycle(nodes, edges) !== null) === cyclic) break;
    }
    const orders = topologicalOrders(nodes, edges);
    const cycle = findCycle(nodes, edges);
    return {
      id: `tx-gen-graph-orders-${seed}`,
      topic: "transactions",
      kind: "numeric",
      prompt: "A schedule has this precedence graph. How many serial schedules is it conflict-equivalent to? (0 if none.)",
      graph: { nodes, edges },
      answer: orders.length,
      unit: "serial schedules",
      explanation: cycle
        ? `The graph has the cycle ${cycle.map((t) => `T${t}`).join(" → ")}, so the schedule is not conflict serializable: 0.`
        : `The graph is acyclic, and each topological order is a conflict-equivalent serial schedule: ${orders.map(orderText).join(", ")}. That is ${plural(orders.length, "order")}.`,
      explainGraph: { nodes, edges, cycle },
      difficulty: 2,
      tags: graphOrdersGen.tags,
    };
  },
};

export const TRANSACTIONS_GENERATORS: Generator[] = [serialOrdersGen, edgeCountGen, conflictTfGen, recoverabilityGen, viewTfGen, anomalyGen, graphOrdersGen];


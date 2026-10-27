import type { Generator, Question } from "./types";
import {
  LOCKING_NAMES,
  lockStepText,
  lockTable,
  lockingClass,
  nodesOnCycles,
  prevention,
  timestampOrdering,
  waitForGraph,
  type LockStep,
  type LockTableRow,
  type LockingClass,
  type Prevention,
  type PreventionOutcome,
} from "@/lib/dbms/locking";
import { findCycle, opText, scheduleTable } from "@/lib/dbms/schedule";
import { randInt, rng, shuffled } from "@/lib/rng";
import { randomSchedule } from "./transactions";

/** Concurrency control: lock compatibility, the 2PL family, deadlocks and their prevention, timestamp ordering and validation. */
export const CONCURRENCY: Question[] = [
  {
    id: "cc-shared-shared",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "Two transactions can hold a shared (S) lock on the same item at the same time.",
    answer: true,
    explanation: "S locks are compatible with each other, so any number of readers can share an item. An X lock is compatible with nothing: a writer needs the item to itself.",
    difficulty: 1,
    tags: ["locks", "compatibility"],
  },
  {
    id: "cc-ix-compat",
    topic: "concurrency",
    kind: "multi",
    prompt: "T1 holds an IX (intention-exclusive) lock on table R. Which lock modes can T2 be granted on R at the same time?",
    choices: ["IS", "IX", "S", "SIX", "X"],
    answers: [0, 1],
    explanation:
      "IX says \"I will X-lock some rows below\". Other intention locks (IS, IX) only promise row-level locks, which are checked row by row, so they are compatible. S, SIX and X lock the whole table and would clash with T1's row writes.",
    difficulty: 2,
    tags: ["multiple granularity", "intention locks"],
  },
  {
    id: "cc-compat-count",
    topic: "concurrency",
    kind: "numeric",
    prompt: "The multiple-granularity compatibility matrix has 5 × 5 = 25 entries for the modes IS, IX, S, SIX and X. How many of them are \"compatible\"?",
    answer: 9,
    unit: "entries",
    explanation:
      "IS is compatible with IS, IX, S and SIX (4); IX with IS and IX (2); S with IS and S (2); SIX only with IS (1); X with nothing (0). 4 + 2 + 2 + 1 = 9, and the matrix is symmetric.",
    difficulty: 3,
    tags: ["multiple granularity", "compatibility"],
  },
  {
    id: "cc-2pl-phases",
    topic: "concurrency",
    kind: "order",
    prompt: "Put a transaction's life under two-phase locking in order.",
    steps: ["Growing phase: acquire locks, release none", "Lock point: the last lock is acquired", "Shrinking phase: release locks, acquire none"],
    explanation: "2PL splits every transaction into a growing phase and a shrinking phase. The lock point, where the last lock is granted, separates them.",
    difficulty: 1,
    tags: ["2pl"],
    askedAt: "\"Explain two-phase locking\" is a standard DBMS viva and interview question.",
  },
  {
    id: "cc-2pl-guarantee",
    topic: "concurrency",
    kind: "mcq",
    prompt: "What does basic two-phase locking guarantee on its own?",
    choices: ["Conflict-serializable schedules", "Freedom from deadlock", "Cascadeless schedules", "Freedom from starvation"],
    answer: 0,
    explanation:
      "Every 2PL schedule is conflict serializable. It can still deadlock (two transactions each waiting for the other's lock), and it can cascade rollbacks, because a transaction may release an X lock before it commits.",
    difficulty: 2,
    tags: ["2pl", "serializability"],
  },
  {
    id: "cc-2pl-order",
    topic: "concurrency",
    kind: "mcq",
    prompt: "A schedule produced by 2PL is conflict-equivalent to the serial schedule that orders the transactions by their…",
    choices: ["Lock points", "Start times", "First reads", "First unlocks"],
    answer: 0,
    explanation:
      "Order the transactions by lock point. If Ti → Tj in the precedence graph, Tj had to wait for a lock Ti released, which happens after Ti's lock point. (Under rigorous 2PL that is simply the commit order.)",
    difficulty: 3,
    tags: ["2pl", "lock point"],
  },
  {
    id: "cc-lock-point",
    topic: "concurrency",
    kind: "short",
    prompt: "Under 2PL, what is the moment a transaction acquires its final lock called?",
    accept: ["lock point", "the lock point", "lockpoint"],
    explanation: "The lock point. It ends the growing phase, and lock points give the equivalent serial order.",
    difficulty: 2,
    tags: ["2pl", "lock point"],
  },
  {
    id: "cc-2pl-deadlock",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "Two-phase locking prevents deadlocks.",
    answer: false,
    explanation:
      "It does not. T1 locks A and T2 locks B (both still growing), then T1 requests B and T2 requests A: each waits for the other forever. Deadlocks need detection, timeouts or a prevention scheme.",
    difficulty: 1,
    tags: ["2pl", "deadlock"],
    askedAt: "A classic follow-up after \"what is 2PL?\".",
  },
  {
    id: "cc-strict-why",
    topic: "concurrency",
    kind: "mcq",
    prompt: "Why do most lock-based systems use strict 2PL rather than basic 2PL?",
    choices: [
      "No one can read or overwrite uncommitted data, so there are no cascading rollbacks",
      "It prevents deadlocks",
      "It allows more concurrency than basic 2PL",
      "It removes the need for a recovery log",
    ],
    answer: 0,
    explanation:
      "Strict 2PL holds every X lock until commit or abort, so schedules are strict (hence cascadeless and recoverable). It costs some concurrency and still allows deadlocks.",
    difficulty: 2,
    tags: ["strict 2pl", "cascading rollback"],
  },
  {
    id: "cc-conversion",
    topic: "concurrency",
    kind: "mcq",
    prompt: "2PL with lock conversions: when may a transaction upgrade S → X, and when may it downgrade X → S?",
    choices: [
      "Upgrade only in the growing phase, downgrade only in the shrinking phase",
      "Upgrade only in the shrinking phase, downgrade only in the growing phase",
      "Either conversion in either phase",
      "2PL does not allow conversions",
    ],
    answer: 0,
    explanation: "An upgrade acquires more (an exclusive lock), so it belongs to the growing phase. A downgrade gives up rights, so it counts as a release and belongs to the shrinking phase.",
    difficulty: 2,
    tags: ["2pl", "lock conversion"],
  },
  {
    id: "cc-conservative",
    topic: "concurrency",
    kind: "mcq",
    prompt: "Which locking variant can never deadlock?",
    choices: ["Conservative (static) 2PL: lock every item before the first step", "Strict 2PL", "Rigorous 2PL", "Basic 2PL with lock upgrades"],
    answer: 0,
    explanation:
      "Conservative 2PL takes all its locks atomically up front and waits holding nothing, so hold-and-wait never happens. The price: the read and write sets must be known in advance, and items are locked longer.",
    difficulty: 3,
    tags: ["2pl", "deadlock prevention"],
  },
  {
    id: "cc-wait-for",
    topic: "concurrency",
    kind: "short",
    prompt: "Deadlock detection periodically looks for a cycle in which graph?",
    accept: ["wait-for graph", "wait for graph", "waitfor graph", "wait-for", "wfg"],
    explanation: "The wait-for graph: an edge Ti → Tj means Ti waits for a lock Tj holds. A cycle is a deadlock; the DBMS breaks it by rolling back a victim.",
    difficulty: 1,
    tags: ["deadlock", "wait-for graph"],
  },
  {
    id: "cc-coffman",
    topic: "concurrency",
    kind: "multi",
    prompt: "Which conditions must all hold for a deadlock between lock-holding transactions?",
    choices: ["Mutual exclusion", "Hold and wait", "No preemption", "Circular wait", "Starvation", "Cascading rollback"],
    answers: [0, 1, 2, 3],
    explanation:
      "The four Coffman conditions. Prevention schemes break one: conservative 2PL breaks hold and wait, wound-wait adds preemption, and lock ordering breaks circular wait. Starvation and cascading rollback are different problems.",
    difficulty: 2,
    tags: ["deadlock"],
  },
  {
    id: "cc-victim",
    topic: "concurrency",
    kind: "mcq",
    prompt: "A deadlock is detected. Which victim does a DBMS typically roll back?",
    choices: [
      "A transaction on the cycle whose rollback costs least, counting how often it was already picked",
      "Always the oldest transaction on the cycle",
      "Every transaction on the cycle",
      "A random transaction that is not on the cycle",
    ],
    answer: 0,
    explanation:
      "Rolling back one transaction on the cycle breaks it. Systems pick the cheapest one (least work done, fewest locks, most left to do) and count previous rollbacks so the same transaction does not starve.",
    difficulty: 2,
    tags: ["deadlock", "victim selection"],
  },
  {
    id: "cc-wait-die",
    topic: "concurrency",
    kind: "mcq",
    prompt: "Under wait-die, an older transaction requests a lock held by a younger one. What happens?",
    choices: ["The older transaction waits", "The older transaction is rolled back", "The younger transaction is rolled back", "The lock is shared between them"],
    answer: 0,
    explanation: "Wait-die is non-preemptive: an older requester waits, a younger requester dies (rolls back). Waits only ever go from old to young, so no cycle can form.",
    difficulty: 2,
    tags: ["deadlock prevention", "wait-die"],
    askedAt: "Wait-die vs wound-wait is a favourite GATE and interview comparison.",
  },
  {
    id: "cc-wound-wait-preemptive",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "Wound-wait is the preemptive scheme: an older transaction can force a younger lock holder to roll back.",
    answer: true,
    explanation: "Under wound-wait an older requester wounds (rolls back) the younger holder, and a younger requester waits. Waits only go from young to old, so there is no cycle.",
    difficulty: 2,
    tags: ["deadlock prevention", "wound-wait"],
  },
  {
    id: "cc-original-ts",
    topic: "concurrency",
    kind: "mcq",
    prompt: "Why does a transaction rolled back by wait-die or wound-wait restart with its original timestamp?",
    choices: [
      "So it grows older over time, eventually wins every conflict, and cannot starve",
      "Because new timestamps would break serializability",
      "So the log records stay in timestamp order",
      "It doesn't: it always gets a fresh timestamp",
    ],
    answer: 0,
    explanation:
      "Keeping its timestamp means the restarted transaction eventually becomes the oldest in the system, and the oldest transaction is never rolled back by either scheme.",
    difficulty: 3,
    tags: ["deadlock prevention", "starvation"],
  },
  {
    id: "cc-timeout",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "With lock timeouts, a transaction that waits too long is rolled back even if it was not actually deadlocked.",
    answer: true,
    explanation: "Timeouts are simple and need no graph, but they guess: a long wait behind a slow transaction looks the same as a deadlock, and too short a timeout wastes work.",
    difficulty: 1,
    tags: ["deadlock", "timeout"],
  },
  {
    id: "cc-granularity-order",
    topic: "concurrency",
    kind: "order",
    prompt: "Under multiple-granularity locking, T updates one row of table R in database D. Put its lock requests in order.",
    steps: ["IX on database D", "IX on table R", "IX on the page holding the row", "X on the row"],
    explanation:
      "Locks are acquired root to leaf: before X-locking a node, T must hold IX (or SIX) on every ancestor. They are released leaf to root.",
    difficulty: 3,
    tags: ["multiple granularity", "intention locks"],
  },
  {
    id: "cc-six",
    topic: "concurrency",
    kind: "mcq",
    prompt: "A transaction reads every row of a table and updates a few of them. Which locking plan fits best?",
    choices: ["SIX on the table, then X on the rows it updates", "X on the whole table", "IS on the table, then X on the rows it updates", "S on the table, then X on the rows it updates"],
    answer: 0,
    explanation:
      "SIX = S + IX: the S part covers reading every row without row locks, and the IX part allows X locks on the rows it changes. IS cannot cover row X locks, S alone does not allow them, and X on the table blocks every reader.",
    difficulty: 3,
    tags: ["multiple granularity", "six"],
  },
  {
    id: "cc-escalation",
    topic: "concurrency",
    kind: "mcq",
    prompt: "A transaction holds thousands of row locks on one table. What does lock escalation do?",
    choices: [
      "Replaces them with one table lock, saving lock-manager memory at the cost of concurrency",
      "Upgrades each row lock from S to X",
      "Moves the locks to a faster lock manager",
      "Rolls the transaction back to free its locks",
    ],
    answer: 0,
    explanation: "Fine-grained locks give concurrency but cost memory and time. Past a threshold, systems such as SQL Server and DB2 trade them for one coarse lock.",
    difficulty: 2,
    tags: ["multiple granularity", "lock escalation"],
  },
  {
    id: "cc-to-read",
    topic: "concurrency",
    kind: "mcq",
    prompt: "Basic timestamp ordering: T (TS = 10) wants to read Q, and W-TS(Q) = 15. What happens?",
    choices: ["T is rolled back and restarts with a new timestamp", "The read runs and R-TS(Q) becomes 10", "T waits until the writer commits", "The read is skipped and T continues"],
    answer: 0,
    explanation:
      "A younger transaction (TS 15) already overwrote Q, so the value T should see is gone: TS(T) < W-TS(Q) means reject and roll back. Under timestamp ordering a restart gets a new timestamp.",
    difficulty: 2,
    tags: ["timestamp ordering"],
  },
  {
    id: "cc-thomas",
    topic: "concurrency",
    kind: "mcq",
    prompt: "Thomas' write rule: T writes Q with TS(T) < W-TS(Q), but TS(T) ≥ R-TS(Q). What happens?",
    choices: ["The obsolete write is ignored and T continues", "T is rolled back", "T waits for the younger writer to commit", "The write runs and W-TS(Q) becomes TS(T)"],
    answer: 0,
    explanation:
      "A younger transaction already wrote Q and nobody younger read T's value, so in timestamp order T's write would be overwritten unseen anyway. Basic timestamp ordering would roll T back.",
    difficulty: 3,
    tags: ["timestamp ordering", "thomas write rule"],
  },
  {
    id: "cc-thomas-view",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "With Thomas' write rule, timestamp ordering can produce schedules that are view serializable but not conflict serializable.",
    answer: true,
    explanation: "Ignoring obsolete writes allows blind-write schedules such as R1(Q) W2(Q) W1(Q) with TS(T1) < TS(T2): the conflicts form a cycle (R1 → W2 → W1), yet once T1's obsolete write is dropped the result is view-equivalent to the serial order T1, T2.",
    difficulty: 3,
    tags: ["timestamp ordering", "thomas write rule", "view serializability"],
  },
  {
    id: "cc-to-deadlock",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "The timestamp-ordering protocol is deadlock-free.",
    answer: true,
    explanation: "Transactions never wait: an operation either runs or its transaction is rolled back. The flip side is possible starvation of long transactions that keep restarting.",
    difficulty: 2,
    tags: ["timestamp ordering", "deadlock"],
  },
  {
    id: "cc-validation",
    topic: "concurrency",
    kind: "order",
    prompt: "Put the phases of optimistic (validation-based) concurrency control in order.",
    steps: ["Read phase: run on private copies of the data", "Validation phase: check for conflicts with overlapping transactions", "Write phase: apply the changes to the database"],
    explanation: "Optimistic control assumes conflicts are rare: work freely, validate at the end (rolling back on a conflict), then write. It suits read-mostly workloads.",
    difficulty: 2,
    tags: ["optimistic concurrency", "validation"],
  },
  {
    id: "cc-tree-protocol",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "The tree (graph-based) locking protocol is not two-phase, yet it guarantees conflict serializability and freedom from deadlock.",
    answer: true,
    explanation:
      "In the tree protocol a transaction may unlock early and later lock a child of a node it still holds. Schedules are conflict serializable and deadlock-free, though not necessarily recoverable or cascadeless.",
    difficulty: 3,
    tags: ["tree protocol", "graph-based locking"],
  },
];

const ITEMS = ["A", "B", "C", "D"];

/** One transaction's lock steps built to land in the given class: each item is S-locked and read, or X-locked and written (maybe read first). */
export function lockedTransaction(cls: LockingClass, seed: number): LockStep[] {
  const r = rng(seed);
  const n = randInt(r, 2, 3);
  const items = shuffled(r, ITEMS).slice(0, n);
  // At least one shared and one exclusive item, so every class can be told apart.
  const usage = items.map((_, i) => (i === 0 ? "r" : i === 1 ? (r() < 0.5 ? "rw" : "w") : (["r", "rw", "w"] as const)[randInt(r, 0, 2)]));
  const order = shuffled(r, items.map((_, i) => i));
  const steps: LockStep[] = [];
  const lockAndUse = (i: number) => {
    const item = items[i];
    if (usage[i] === "r") steps.push({ kind: "S", item }, { kind: "R", item });
    else steps.push({ kind: "X", item }, ...(usage[i] === "rw" ? [{ kind: "R" as const, item }] : []), { kind: "W", item });
  };
  const sItems = items.filter((_, i) => usage[i] === "r");
  const xItems = items.filter((_, i) => usage[i] !== "r");
  let early: string[];
  if (cls === "not-2pl") {
    // Release the first item before locking the next one.
    lockAndUse(order[0]);
    steps.push({ kind: "U", item: items[order[0]] });
    order.slice(1).forEach(lockAndUse);
    early = [items[order[0]]];
  } else {
    order.forEach(lockAndUse);
    early =
      cls === "rigorous" ? [] : cls === "strict" ? shuffled(r, sItems).slice(0, randInt(r, 1, sItems.length)) : [...shuffled(r, xItems).slice(0, 1), ...sItems.filter(() => r() < 0.5)];
    for (const item of shuffled(r, early)) steps.push({ kind: "U", item });
  }
  steps.push({ kind: "C" });
  for (const item of shuffled(
    r,
    items.filter((x) => !early.includes(x)),
  ))
    steps.push({ kind: "U", item });
  return steps;
}

const CLASSES: LockingClass[] = ["not-2pl", "2pl", "strict", "rigorous"];

/** "Which is the strongest locking protocol this transaction follows?", classified by `lockingClass`; the seed picks the class. */
export const lockingClassGen: Generator = {
  id: "cc-gen-2pl-class",
  topic: "concurrency",
  difficulty: 2,
  tags: ["2pl", "strict 2pl", "rigorous 2pl"],
  askedAt: "\"Is this transaction two-phase? strict?\" is a common written-test question.",
  generate(seed) {
    const steps = lockedTransaction(CLASSES[seed % 4], seed);
    const { cls, reason } = lockingClass(steps);
    const choices = CLASSES.map((c) => LOCKING_NAMES[c]);
    return {
      id: `cc-gen-2pl-class-${seed}`,
      topic: "concurrency",
      kind: "mcq",
      prompt: "Which is the strongest locking protocol this transaction follows? (Locks still held at the end are released at commit.)",
      tables: [{ name: "Transaction", columns: ["t", "T1"], rows: steps.map((s, i) => [i + 1, lockStepText(s)]) }],
      choices,
      answer: CLASSES.indexOf(cls),
      explanation: `${LOCKING_NAMES[cls]}: ${reason}. 2PL needs no lock after the first unlock, strict 2PL also holds every X lock until commit, and rigorous 2PL holds every lock until commit.`,
      difficulty: 2,
      tags: lockingClassGen.tags,
      askedAt: lockingClassGen.askedAt,
    };
  },
};

/** A random lock table over T1–T4: every waiter's request clashes with every holder of its item, and each transaction waits at most once. */
export function randomLockTable(r: () => number): LockTableRow[] {
  const txs = [1, 2, 3, 4];
  const items = ITEMS.slice(0, randInt(r, 3, 4));
  const waiting = new Set<number>();
  return items.map((item) => {
    const shared = r() < 0.4;
    const holders = shared
      ? shuffled(r, txs)
          .slice(0, randInt(r, 1, 2))
          .sort((a, b) => a - b)
          .map((tx) => ({ tx, mode: "S" as const }))
      : [{ tx: txs[randInt(r, 0, 3)], mode: "X" as const }];
    const free = txs.filter((t) => !waiting.has(t) && !holders.some((h) => h.tx === t));
    if (!free.length || r() < 0.2) return { item, holders };
    const tx = free[randInt(r, 0, free.length - 1)];
    waiting.add(tx);
    return { item, holders, waiter: { tx, mode: shared || r() < 0.5 ? "X" : "S" } };
  });
}

const NO_DEADLOCK = "No deadlock";

/** "Which transactions are deadlocked?", answered by the cycles of `waitForGraph`; a third of seeds have no deadlock. */
export const deadlockGen: Generator = {
  id: "cc-gen-deadlock",
  topic: "concurrency",
  difficulty: 3,
  tags: ["deadlock", "wait-for graph"],
  askedAt: "Drawing the wait-for graph from a lock table comes up in OS and DBMS rounds alike.",
  generate(seed) {
    const r = rng(seed);
    const want = seed % 3 !== 0;
    const nodes = [1, 2, 3, 4];
    let table = randomLockTable(r);
    for (let i = 0; i < 500; i++) {
      const e = waitForGraph(table);
      if (e.length >= 2 && nodesOnCycles(nodes, e).length > 0 === want) break;
      table = randomLockTable(r);
    }
    const edges = waitForGraph(table);
    const dead = nodesOnCycles(nodes, edges);
    const choices = [...nodes.map((t) => `T${t}`), NO_DEADLOCK];
    const why = table
      .filter((row) => row.waiter)
      .map((row) => `T${row.waiter!.tx} wants ${row.waiter!.mode} on ${row.item}, held by ${row.holders.map((h) => `T${h.tx} (${h.mode})`).join(" and ")}`)
      .join("; ");
    const blocked = nodes.filter((t) => !dead.includes(t) && edges.some(([a]) => a === t));
    return {
      id: `cc-gen-deadlock-${seed}`,
      topic: "concurrency",
      kind: "multi",
      prompt: "From this lock table, select every deadlocked transaction (those on a cycle of the wait-for graph), or \"No deadlock\".",
      tables: [lockTable(table)],
      choices,
      answers: dead.length ? dead.map((t) => t - 1) : [choices.length - 1],
      explanation: `${why}. Each wait gives an edge waiter → holder. ${
        dead.length
          ? `The cycle through ${dead.map((t) => `T${t}`).join(", ")} is a deadlock: rolling back one of them breaks it.${blocked.length ? ` ${blocked.map((t) => `T${t}`).join(", ")} ${blocked.length === 1 ? "is" : "are"} blocked behind the cycle but not on it.` : ""}`
          : "The graph has no cycle, so every waiter will eventually get its lock."
      }`,
      explainGraph: { nodes, edges, cycle: findCycle(nodes, edges), title: "Wait-for graph" },
      difficulty: 3,
      tags: deadlockGen.tags,
      askedAt: deadlockGen.askedAt,
    };
  },
};

export function preventionChoice(o: PreventionOutcome | "both", req: number, holder: number): string {
  switch (o) {
    case "requester-waits":
      return `T${req} waits for T${holder}`;
    case "requester-dies":
      return `T${req} is rolled back`;
    case "holder-wounded":
      return `T${holder} is rolled back and T${req} gets the lock`;
    case "both":
      return `Both T${req} and T${holder} are rolled back`;
  }
}

/** "Under wait-die / wound-wait, what happens to this lock request?", answered by `prevention`; the seed covers each scheme × age case. */
export const preventionGen: Generator = {
  id: "cc-gen-prevention",
  topic: "concurrency",
  difficulty: 2,
  tags: ["deadlock prevention", "wait-die", "wound-wait"],
  generate(seed) {
    const r = rng(seed);
    const scheme: Prevention = seed % 2 === 0 ? "wait-die" : "wound-wait";
    const older = Math.floor(seed / 2) % 2 === 0;
    const [req, holder] = shuffled(r, [1, 2, 3, 4]).slice(0, 2);
    const a = randInt(r, 2, 12) * 5;
    const b = a + randInt(r, 1, 6) * 5;
    const [reqTs, holderTs] = older ? [a, b] : [b, a];
    const out = prevention(scheme, reqTs, holderTs);
    const outcomes: (PreventionOutcome | "both")[] = ["requester-waits", "requester-dies", "holder-wounded", "both"];
    const choices = outcomes.map((o) => preventionChoice(o, req, holder));
    const rule =
      scheme === "wait-die"
        ? "Wait-die (non-preemptive): an older requester waits, a younger requester dies."
        : "Wound-wait (preemptive): an older requester wounds the holder, a younger requester waits.";
    return {
      id: `cc-gen-prevention-${seed}`,
      topic: "concurrency",
      kind: "mcq",
      prompt: `Deadlock prevention with ${scheme}. T${req} (timestamp ${reqTs}) requests an X lock on A, which T${holder} (timestamp ${holderTs}) holds. What happens?`,
      choices,
      answer: outcomes.indexOf(out),
      explanation: `A smaller timestamp is older, so T${req} is the ${older ? "older" : "younger"} one. ${rule} So: ${preventionChoice(out, req, holder)}. A rolled-back transaction restarts with its original timestamp.`,
      difficulty: 2,
      tags: preventionGen.tags,
    };
  },
};

const NONE_REJECTED = "None: every operation runs";

/** "Which operation is the first one rejected under timestamp ordering?", run by `timestampOrdering`; every third seed uses Thomas' write rule. */
export const tsOrderingGen: Generator = {
  id: "cc-gen-ts-ordering",
  topic: "concurrency",
  difficulty: 3,
  tags: ["timestamp ordering", "thomas write rule"],
  askedAt: "Tracing R-TS and W-TS through a schedule is a GATE favourite.",
  generate(seed) {
    const r = rng(seed);
    const thomas = seed % 3 === 2;
    const wantReject = seed % 4 !== 3;
    const tsValues = shuffled(r, [10, 20, 30]);
    const ts = { 1: tsValues[0], 2: tsValues[1], 3: tsValues[2] };
    let s = randomSchedule(r, { txs: 3, items: 2, ops: [2, 3], blind: thomas ? 0.4 : 0.15 });
    for (let i = 0; i < 500; i++) {
      const run = timestampOrdering(s, ts, thomas);
      const ignored = run.steps.some((x) => x.ignored);
      if ((run.rejected !== null) === wantReject && (!thomas || ignored || i > 300)) break;
      s = randomSchedule(r, { txs: 3, items: 2, ops: [2, 3], blind: thomas ? 0.4 : 0.15 });
    }
    const { steps, rejected } = timestampOrdering(s, ts, thomas);
    const pool = s.map((_, i) => i).filter((i) => i !== rejected);
    const picks = [...(rejected !== null ? [rejected] : []), ...shuffled(r, pool).slice(0, rejected !== null ? 3 : 4)].sort((a, b) => a - b);
    const choices = [...picks.map((i) => `${opText(s[i])} (step ${i + 1})`), NONE_REJECTED];
    return {
      id: `cc-gen-ts-ordering-${seed}`,
      topic: "concurrency",
      kind: "mcq",
      prompt: `Timestamp ordering${thomas ? " with Thomas' write rule" : ""}: TS(T1) = ${ts[1]}, TS(T2) = ${ts[2]}, TS(T3) = ${ts[3]}, and every R-TS and W-TS starts at 0. Which operation is the first to be rejected?`,
      tables: [scheduleTable(s)],
      choices,
      answer: rejected !== null ? picks.indexOf(rejected) : choices.length - 1,
      explanation: `${steps.map((x) => x.note).join("; ")}.${rejected === null ? " Every operation ran." : ""}`,
      difficulty: 3,
      tags: tsOrderingGen.tags,
      askedAt: tsOrderingGen.askedAt,
    };
  },
};

export const CONCURRENCY_GENERATORS: Generator[] = [lockingClassGen, deadlockGen, preventionGen, tsOrderingGen];

import type { Generator, Question } from "./types";
import { MVCC_MORE } from "./mvccMore";
import type { Relation } from "@/lib/dbms/algebra";
import {
  firstCommitterWins,
  selectResults,
  visibilityStory,
  visibleVersion,
  type Clog,
  type Level,
  type Op,
  type RowVersion,
  type SiTx,
  type Snapshot,
  type XidState,
} from "@/lib/dbms/mvcc";
import { randInt, rng, shuffled } from "@/lib/rng";

/** MVCC: row versions, snapshots, PostgreSQL vs Oracle, snapshot isolation. Part of the "concurrency" topic. */
export const MVCC: Question[] = [
  {
    id: "mvcc-idea",
    topic: "concurrency",
    kind: "mcq",
    prompt: "What is the main promise of multiversion concurrency control (MVCC)?",
    choices: [
      "Readers do not block writers and writers do not block readers",
      "Two transactions can never write the same row",
      "Transactions never need to be rolled back",
      "Deadlocks are impossible",
    ],
    answer: 0,
    explanation:
      "Every write creates a new version (or keeps the old one in undo), so a reader can keep using the version that was current for its snapshot instead of waiting for a lock. Writers still conflict with each other on the same row, aborts still happen, and deadlocks between writers are still possible.",
    difficulty: 1,
    tags: ["mvcc", "snapshots"],
    askedAt: "\"How does MVCC work?\" is a standard question for backend and database roles.",
  },
  {
    id: "mvcc-writers",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "With MVCC, two transactions can update the same row at the same time without either waiting.",
    answer: false,
    explanation:
      "MVCC removes read–write blocking, not write–write conflicts. The second writer waits for the first to finish (a row lock); then it proceeds under READ COMMITTED, or fails with a serialization error under snapshot isolation.",
    difficulty: 1,
    tags: ["mvcc", "locks"],
  },
  {
    id: "mvcc-pg-update",
    topic: "concurrency",
    kind: "mcq",
    prompt: "In PostgreSQL, what does an UPDATE of one row physically do?",
    choices: [
      "Writes a new row version and stamps the old version's xmax with the updater's transaction id",
      "Overwrites the row in place and copies the old value to an undo segment",
      "Deletes the row and re-inserts it into a different table",
      "Locks the row and changes it only when the transaction commits",
    ],
    answer: 0,
    explanation:
      "PostgreSQL never overwrites a tuple. The UPDATE inserts a new version (xmin = the updater) and sets xmax on the old one, so concurrent snapshots can still see the old version. Oracle is the one that updates in place and keeps old values in undo.",
    difficulty: 2,
    tags: ["postgresql", "xmin", "xmax"],
    askedAt: "A favourite PostgreSQL internals question.",
  },
  {
    id: "mvcc-xmin-xmax",
    topic: "concurrency",
    kind: "mcq",
    prompt: "A PostgreSQL row version shows xmin = 500 and xmax = 0. What does that say?",
    choices: [
      "Transaction 500 created it and nobody has updated or deleted it",
      "Transaction 500 deleted it",
      "It was created before transaction 500 and is invisible to it",
      "Transaction 500 is still holding a lock on it",
    ],
    answer: 0,
    explanation:
      "xmin is the creating transaction and xmax the one that updated or deleted it (0 means none yet). Whether a query sees the version still depends on whether 500 committed before its snapshot.",
    difficulty: 1,
    tags: ["postgresql", "xmin", "xmax"],
  },
  {
    id: "mvcc-visible-rule",
    topic: "concurrency",
    kind: "order",
    prompt: "Put the steps of a PostgreSQL UPDATE under MVCC in order.",
    steps: [
      "Find the row version visible to the statement's snapshot",
      "Wait if another transaction holds the row's lock, then re-check it",
      "Set the old version's xmax to your transaction id",
      "Insert a new version with xmin set to your transaction id",
      "On commit, mark your transaction committed so later snapshots see the new version",
    ],
    explanation:
      "The old version stays in the heap with xmax set, the new one has xmin = you. Nobody else sees the new version until you commit and their snapshot is taken after that. If you abort, the new version is simply never visible and the old one's xmax is ignored.",
    difficulty: 2,
    tags: ["postgresql", "update", "visibility"],
  },
  {
    id: "mvcc-vacuum",
    topic: "concurrency",
    kind: "mcq",
    prompt: "Why does PostgreSQL need VACUUM?",
    choices: [
      "Updates and deletes leave dead row versions behind, and VACUUM reclaims those no snapshot can still see",
      "It rebuilds indexes after every commit",
      "It writes the write-ahead log to disk",
      "It releases the locks of crashed transactions",
    ],
    answer: 0,
    explanation:
      "Old versions are kept for running snapshots. Once no transaction can see them they are dead space (bloat) that VACUUM (usually autovacuum) makes reusable. The cost of PostgreSQL's append-style MVCC.",
    difficulty: 1,
    tags: ["postgresql", "vacuum", "bloat"],
  },
  {
    id: "mvcc-vacuum-name",
    topic: "concurrency",
    kind: "short",
    prompt: "Which PostgreSQL command (one word) reclaims the space of dead row versions?",
    accept: ["vacuum", "VACUUM", "autovacuum"],
    explanation: "VACUUM (run automatically by autovacuum) marks dead tuples' space reusable; VACUUM FULL rewrites the table to give space back to the operating system.",
    difficulty: 1,
    tags: ["postgresql", "vacuum"],
  },
  {
    id: "mvcc-long-tx",
    topic: "concurrency",
    kind: "mcq",
    prompt: "A transaction stays open for days in PostgreSQL while other sessions update the table heavily. What goes wrong?",
    choices: [
      "VACUUM cannot remove row versions its snapshot might still need, so the table bloats",
      "Every other write fails with a deadlock error",
      "The write-ahead log stops being written",
      "Its snapshot is refreshed to the newest data after each hour",
    ],
    answer: 0,
    explanation:
      "The old transaction's snapshot pins the oldest version it could see, so dead tuples newer than that cannot be cleaned up. \"Idle in transaction\" sessions are a classic cause of bloat and slow queries.",
    difficulty: 2,
    tags: ["postgresql", "vacuum", "snapshots"],
    askedAt: "Operational follow-up in backend and SRE interviews.",
  },
  {
    id: "mvcc-versions-count",
    topic: "concurrency",
    kind: "numeric",
    prompt:
      "A row is inserted, then updated three times and finally deleted, each in its own committed transaction. VACUUM has not run and pruning is ignored. How many physical row versions does PostgreSQL hold for it?",
    answer: 4,
    explanation: "The insert creates version 1 and each of the three updates creates another: 4 versions. The delete only stamps xmax on the last one. All four are dead once no snapshot needs them.",
    difficulty: 2,
    tags: ["postgresql", "row versions"],
  },
  {
    id: "mvcc-rr-snapshot",
    topic: "concurrency",
    kind: "mcq",
    prompt: "In PostgreSQL, when does a REPEATABLE READ transaction take its snapshot?",
    choices: [
      "At its first query or data-modifying statement, not at BEGIN",
      "At BEGIN",
      "Before each statement",
      "At COMMIT",
    ],
    answer: 0,
    explanation:
      "BEGIN only opens the transaction. The snapshot is taken by the first statement and used for the rest of the transaction, so changes committed between BEGIN and that first statement are seen. READ COMMITTED takes a new snapshot for every statement.",
    difficulty: 2,
    tags: ["postgresql", "isolation", "snapshots"],
  },
  {
    id: "mvcc-oracle-undo",
    topic: "concurrency",
    kind: "mcq",
    prompt: "How does Oracle give a query a consistent view while other transactions update the data?",
    choices: [
      "It updates blocks in place and rebuilds older versions from undo data, as of the query's SCN",
      "It stores every version as a new row in the table, like PostgreSQL",
      "It locks every row the query reads until the query ends",
      "It copies the whole table when the query starts",
    ],
    answer: 0,
    explanation:
      "Oracle updates in place and writes before-images to undo. A reader that meets a block changed after its SCN (system change number) applies undo to get back to its snapshot. Readers never take row locks and writers do not wait for them.",
    difficulty: 2,
    tags: ["oracle", "undo", "read consistency"],
    askedAt: "Oracle DBA and PL/SQL interviews ask this against PostgreSQL's design.",
  },
  {
    id: "mvcc-ora1555",
    topic: "concurrency",
    kind: "mcq",
    prompt: "An Oracle report fails with ORA-01555: snapshot too old. What happened?",
    choices: [
      "The undo it needed to rebuild its consistent view had been overwritten",
      "Another session held an exclusive lock on the table",
      "The table was dropped during the query",
      "The query used up its temporary tablespace",
    ],
    answer: 0,
    explanation:
      "A long query needs undo old enough to reconstruct data as of its start. If busy transactions have reused that undo space (too small an undo tablespace or retention), Oracle cannot build the old version and aborts the query.",
    difficulty: 3,
    tags: ["oracle", "undo", "ora-01555"],
  },
  {
    id: "mvcc-oracle-rc",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "In Oracle's default READ COMMITTED mode, a single query sees the data as of the moment that query started, even if rows are committed while it runs.",
    answer: true,
    explanation: "Oracle gives statement-level read consistency: the query's SCN is fixed at its start. Two statements in the same transaction can still see different data.",
    difficulty: 2,
    tags: ["oracle", "read consistency"],
  },
  {
    id: "mvcc-fcw",
    topic: "concurrency",
    kind: "mcq",
    prompt: "Two snapshot-isolation transactions both update the same row, overlapping in time. What does the first-committer-wins rule say?",
    choices: [
      "The first to commit succeeds and the other must abort (and can be retried)",
      "The first to start succeeds",
      "Both succeed and the last write wins",
      "Both abort",
    ],
    answer: 0,
    explanation:
      "Snapshot isolation prevents lost updates by aborting the later committer whose write set overlaps a concurrent committed one. PostgreSQL reports \"could not serialize access due to concurrent update\" (SQLSTATE 40001) and the application retries.",
    difficulty: 2,
    tags: ["snapshot isolation", "first-committer-wins"],
  },
  {
    id: "mvcc-oracle-serializable",
    topic: "concurrency",
    kind: "mcq",
    prompt: "What is Oracle's SERIALIZABLE isolation level actually based on, and what error signals a conflict?",
    choices: [
      "Snapshot isolation; ORA-08177 \"can't serialize access for this transaction\"",
      "Strict two-phase locking; ORA-00060 deadlock detected",
      "Timestamp ordering; ORA-01555 snapshot too old",
      "Optimistic validation of read sets; ORA-00054 resource busy",
    ],
    answer: 0,
    explanation:
      "Oracle's SERIALIZABLE is snapshot isolation, so write skew is still possible; a lost-update-style conflict raises ORA-08177. Oracle has no READ UNCOMMITTED and no true serializable mode for read-write dependencies.",
    difficulty: 3,
    tags: ["oracle", "snapshot isolation", "serializable"],
  },
  {
    id: "mvcc-ssi",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "PostgreSQL's SERIALIZABLE level works by taking read locks that block writers until commit, like strict 2PL.",
    answer: false,
    explanation:
      "PostgreSQL uses Serializable Snapshot Isolation (SSI): snapshot isolation plus tracking of read–write dependencies with non-blocking predicate (SIREAD) locks. If a dangerous cycle of dependencies appears, one transaction is aborted with a serialization failure. Readers still never block writers.",
    difficulty: 3,
    tags: ["postgresql", "ssi", "serializable"],
    askedAt: "Senior-level follow-up after write skew.",
  },
  {
    id: "mvcc-pg-rr-anomalies",
    topic: "concurrency",
    kind: "multi",
    prompt: "Which anomaly can still happen under PostgreSQL REPEATABLE READ (snapshot isolation)?",
    choices: ["Dirty read", "Non-repeatable read", "Phantom read", "Lost update", "Write skew"],
    answers: [4],
    explanation:
      "The snapshot hides uncommitted data, keeps rereads stable and (unlike the SQL standard's minimum) hides phantoms, and the first-committer-wins check turns a lost update into a serialization error. Only write skew, where the transactions write different rows after reading overlapping data, gets through.",
    difficulty: 3,
    tags: ["postgresql", "snapshot isolation", "write skew"],
  },
  {
    id: "mvcc-for-update",
    topic: "concurrency",
    kind: "mcq",
    prompt: "A PostgreSQL READ COMMITTED transaction reads a balance, computes in application code and writes it back. How do you stop a concurrent transaction from losing that update?",
    choices: [
      "SELECT … FOR UPDATE on the row, so the second transaction waits for the first",
      "Run VACUUM before the transaction",
      "Add an index on the balance column",
      "Nothing: MVCC prevents lost updates at READ COMMITTED",
    ],
    answer: 0,
    explanation:
      "At READ COMMITTED both transactions can read the old balance and the second write overwrites the first. FOR UPDATE takes a row lock so the second reader waits and then sees the committed value. Alternatives: an atomic UPDATE (balance = balance + x), a version column checked in the WHERE clause, or REPEATABLE READ with retries.",
    difficulty: 2,
    tags: ["lost update", "select for update", "locks"],
    askedAt: "A common \"design a transfer\" follow-up.",
  },
  {
    id: "mvcc-wraparound",
    topic: "concurrency",
    kind: "mcq",
    prompt: "PostgreSQL transaction ids are 32 bits and wrap around. How does it keep very old committed rows visible?",
    choices: [
      "Vacuum \"freezes\" old row versions so they count as visible to every snapshot",
      "It rewrites xmin to 0 on every commit",
      "It restarts the server before the counter overflows",
      "Old rows are copied to a new table",
    ],
    answer: 0,
    explanation:
      "Comparisons of xids are circular, so a row older than about two billion transactions would appear to be in the future. (Auto)vacuum freezes old tuples to mark them visible forever. If freezing falls too far behind, PostgreSQL stops accepting writes to protect the data.",
    difficulty: 3,
    tags: ["postgresql", "xid wraparound", "vacuum"],
  },
  ...MVCC_MORE,
];

const STATE_LABEL: Record<XidState, string> = { committed: "committed", aborted: "aborted", running: "still running" };
const setText = (xs: number[]) => `{${xs.join(", ")}}`;

export interface VisibleCase {
  versions: RowVersion[];
  snap: Snapshot;
  clog: Clog;
  you: number;
  /** The reader's own update created the last version. */
  self: boolean;
}

type Stage = "C" | "P" | "L" | "A";

/**
 * A plausible version chain, oldest first. Writers move through: committed before the snapshot (C), running at the snapshot (P),
 * started after it (L), and the last one may have aborted (A). The chain may end with a delete, or with the reader's own update.
 */
export function randomVisibleCase(r: () => number): VisibleCase {
  const selfEnd = r() < 0.2;
  const deleteEnd = !selfEnd && r() < 0.25;
  const writers = selfEnd ? randInt(r, 1, 3) : randInt(r, deleteEnd ? 1 : 2, 4);
  const events = writers + (deleteEnd ? 1 : 0);
  const kinds: Stage[] = [];
  let stage = r() < 0.85 ? 0 : randInt(r, 1, 2);
  for (let i = 0; i < events; i++) {
    if (!selfEnd && i > 0 && stage < 2 && r() < 0.45) stage += 1;
    kinds.push(selfEnd ? "C" : (["C", "P", "L"] as const)[stage]);
  }
  if (!selfEnd && r() < 0.2) kinds[events - 1] = "A";

  let id = randInt(r, 4, 9) * 10;
  const ids = kinds.map(() => (id += randInt(r, 1, 3)));
  const pre = ids.filter((_, i) => kinds[i] === "C" || kinds[i] === "P");
  const firstL = ids.find((_, i) => kinds[i] === "L");
  const snapMax = firstL ? Math.max(Math.max(...pre, ids[0] - 1) + 1, firstL - randInt(r, 0, 1)) : id + 1 + randInt(r, 0, 2);
  const you = Math.max(snapMax, id) + randInt(r, 1, 3);

  const clog: Clog = {};
  const xip = ids.filter((_, i) => kinds[i] === "P");
  kinds.forEach((k, i) => {
    clog[ids[i]] =
      k === "C" ? "committed" : k === "A" ? "aborted" : k === "P" ? (r() < 0.5 ? "committed" : "running") : (["committed", "running", "aborted"] as const)[randInt(r, 0, 2)];
  });
  if (r() < 0.4 && ids[0] - 1 > 0) xip.push(ids[0] - 1);

  const creators = deleteEnd ? ids.slice(0, -1) : ids.slice();
  if (selfEnd) {
    creators.push(you);
    clog[you] = "running";
  }
  const deleter = deleteEnd ? ids[ids.length - 1] : 0;
  let value = randInt(r, 4, 9) * 10;
  const versions: RowVersion[] = creators.map((xmin, i) => ({
    xmin,
    xmax: i + 1 < creators.length ? creators[i + 1] : deleter,
    value: (value += randInt(r, 1, 3) * 5),
  }));
  return { versions, snap: { xmax: snapMax, xip: xip.sort((a, b) => a - b) }, clog, you, self: selfEnd };
}

/** The two tables a player sees: the row's physical versions and the transaction states. */
export function visibleTables(c: VisibleCase): Relation[] {
  const xids = [...new Set(c.versions.flatMap((v) => [v.xmin, v.xmax].filter((x) => x !== 0)))].sort((a, b) => a - b);
  return [
    { name: "Row versions", columns: ["Version", "xmin", "xmax", "salary"], rows: c.versions.map((v, i) => [`v${i + 1}`, v.xmin, v.xmax, v.value]) },
    {
      name: "Transactions",
      columns: ["xid", "state now"],
      rows: xids.map((x) => [x, x === c.you ? "you (running)" : STATE_LABEL[c.clog[x]]]),
    },
  ];
}

const NO_ROW = "No row is returned";

/** "Which salary does the SELECT return?", answered by `visibleVersion`. */
export const mvccVisibleGen: Generator = {
  id: "mvcc-gen-visible",
  topic: "concurrency",
  difficulty: 3,
  tags: ["mvcc", "visibility", "xmin", "xmax", "postgresql"],
  askedAt: "PostgreSQL tuple-visibility tracing comes up in storage-engine and DBA interviews.",
  generate(seed) {
    const r = rng(seed);
    const c = randomVisibleCase(r);
    const seen = visibleVersion(c.versions, c.snap, c.clog, c.self ? c.you : undefined);
    const right = seen ? `${seen.value}` : NO_ROW;
    const choices = shuffled(r, [...c.versions.map((v) => `${v.value}`), NO_ROW]);
    const who = c.self ? ` The transaction is xid ${c.you} (you) and has already run the UPDATE that created the last version.` : "";
    return {
      id: `mvcc-gen-visible-${seed}`,
      topic: "concurrency",
      kind: "mcq",
      prompt: `A PostgreSQL query's snapshot has xmax = ${c.snap.xmax} and xip = ${setText(c.snap.xip)}: transactions with an id ≥ ${c.snap.xmax}, or in xip, did not commit before it was taken, and "state now" is where they ended up since.${who} Which salary does SELECT salary return for this row?`,
      tables: visibleTables(c),
      choices,
      answer: choices.indexOf(right),
      explanation: `${visibilityStory(c.versions, c.snap, c.clog, c.self ? c.you : undefined)} ${seen ? `The query sees ${seen.value}.` : "No version qualifies, so no row is returned."} A transaction counts for a snapshot only if it committed before the snapshot was taken, whatever its state now.`,
      difficulty: 3,
      tags: mvccVisibleGen.tags,
      askedAt: mvccVisibleGen.askedAt,
    };
  },
};

const STMT = { begin: "BEGIN", select: "SELECT balance", commit: "COMMIT", rollback: "ROLLBACK" } as const;
const opText = (o: Op) => (o.kind === "update" ? `UPDATE balance = ${o.value}` : STMT[o.kind]);

/** T1's BEGIN, a first and a second SELECT, and some writers in the gaps. */
export function randomReadOps(r: () => number): { ops: Op[]; initial: number } {
  const initial = randInt(r, 4, 9) * 10;
  let value = initial;
  const writer = (tx: number, outcome: "commit" | "rollback" | "open"): Op[] => {
    value += randInt(r, 1, 4) * 10;
    return [{ tx, kind: "update", value }, ...(outcome === "open" ? [] : [{ tx, kind: outcome } as Op])];
  };
  const zone = (tx: number, last: boolean): Op[] => {
    const roll = r();
    if (roll < 0.25) return [];
    const outcome = roll < 0.75 ? "commit" : roll < 0.9 || !last ? "rollback" : "open";
    return writer(tx, outcome);
  };
  const ops: Op[] = [{ tx: 1, kind: "begin" }, ...zone(2, false), { tx: 1, kind: "select" }, ...zone(3, false), ...zone(4, true), { tx: 1, kind: "select" }];
  return { ops, initial };
}

/** "What does T1's second SELECT return at READ COMMITTED / REPEATABLE READ?", answered by `selectResults`. */
export const mvccReadGen: Generator = {
  id: "mvcc-gen-read",
  topic: "concurrency",
  difficulty: 2,
  tags: ["mvcc", "snapshots", "read committed", "repeatable read"],
  askedAt: "A standard isolation-level trace in backend interviews.",
  generate(seed) {
    const r = rng(seed);
    const { ops, initial } = randomReadOps(r);
    const level: Level = seed % 2 === 0 ? "READ COMMITTED" : "REPEATABLE READ";
    const res = selectResults(ops, initial, level);
    const answer = res[res.length - 1].value;
    const other = selectResults(ops, initial, level === "READ COMMITTED" ? "REPEATABLE READ" : "READ COMMITTED");
    const first = res[0].value;
    const table: Relation = {
      name: "History",
      columns: ["Step", "Transaction", "Statement"],
      rows: ops.map((o, i) => [i + 1, `T${o.tx}`, opText(o)]),
    };
    const writes = ops.filter((o) => o.kind === "update").length;
    return {
      id: `mvcc-gen-read-${seed}`,
      topic: "concurrency",
      kind: "numeric",
      prompt: `PostgreSQL, one row with balance = ${initial}. T1 runs at ${level}; the other transactions use the default. What does T1's second SELECT balance return?`,
      tables: [table],
      answer,
      explanation:
        level === "READ COMMITTED"
          ? `READ COMMITTED takes a new snapshot for every statement, so the second SELECT sees everything committed before it: ${answer}. (Its first SELECT returned ${first}.) Uncommitted and rolled-back updates are never seen.`
          : `REPEATABLE READ takes its snapshot at T1's first statement, step ${res[0].step + 1}, not at BEGIN. Commits before that step are in the snapshot (the first SELECT returned ${first}) and later commits are not, so the second SELECT returns ${answer}.${writes && answer !== other[other.length - 1].value ? ` At READ COMMITTED it would have returned ${other[other.length - 1].value}.` : ""}`,
      difficulty: 2,
      tags: mvccReadGen.tags,
      askedAt: mvccReadGen.askedAt,
    };
  },
};

const ITEMS = ["X", "Y", "Z"];

/** Three transactions with start/commit times and write sets for first-committer-wins. */
export function randomSiTxs(r: () => number): SiTx[] {
  for (;;) {
    const times = shuffled(r, [1, 2, 3, 4, 5, 6]);
    const txs: SiTx[] = [1, 2, 3].map((id, i) => {
      const [a, b] = [times[2 * i], times[2 * i + 1]].sort((x, y) => x - y);
      const writes = shuffled(r, ITEMS).slice(0, randInt(r, 1, 2)).sort();
      return { id, start: a, commit: b, writes };
    });
    // Skip boring cases where nobody overlaps at all.
    if (txs.some((t) => txs.some((u) => u.id !== t.id && u.start < t.commit && t.start < u.commit))) return txs;
  }
}

/** "Which transactions abort under snapshot isolation (first-committer-wins)?", answered by `firstCommitterWins`. */
export const siAbortGen: Generator = {
  id: "mvcc-gen-si-abort",
  topic: "concurrency",
  difficulty: 2,
  tags: ["snapshot isolation", "first-committer-wins", "write sets"],
  askedAt: "Snapshot-isolation conflict questions show up in GATE-style and advanced database courses.",
  generate(seed) {
    const txs = randomSiTxs(rng(seed));
    const { aborted, why } = firstCommitterWins(txs);
    const choices = ["T1", "T2", "T3", "None"];
    const table: Relation = {
      name: "Transactions",
      columns: ["Txn", "Start", "Commit", "Writes"],
      rows: txs.map((t) => [`T${t.id}`, t.start, t.commit, t.writes.join(", ")]),
    };
    const story = [...txs]
      .sort((a, b) => a.commit - b.commit)
      .map((t) => (why.has(t.id) ? `T${t.id} overlaps T${why.get(t.id)}, which committed first and wrote the same item: T${t.id} aborts.` : `T${t.id} commits.`))
      .join(" ");
    return {
      id: `mvcc-gen-si-abort-${seed}`,
      topic: "concurrency",
      kind: "multi",
      prompt: "Each transaction below runs under snapshot isolation with the first-committer-wins rule and tries to commit at its Commit time. Select every transaction that is aborted, or \"None\". (Reads are ignored.)",
      tables: [table],
      choices,
      answers: aborted.length ? aborted.map((t) => t - 1) : [3],
      explanation: `In commit order: ${story} Two transactions conflict only if their lifetimes overlap and their write sets share an item; an aborted transaction's writes never block anyone.`,
      difficulty: 2,
      tags: siAbortGen.tags,
      askedAt: siAbortGen.askedAt,
    };
  },
};

export const MVCC_GENERATORS: Generator[] = [mvccVisibleGen, mvccReadGen, siAbortGen];

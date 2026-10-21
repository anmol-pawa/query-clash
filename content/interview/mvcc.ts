import type { Generator, Question } from "./types";
import type { Relation } from "@/lib/dbms/algebra";
import { firstCommitterWins, snapshotText, tupleVisible, visibilityReason, type Snapshot, type SiTx, type Tuple } from "@/lib/dbms/mvcc";
import { randInt, rng, shuffled } from "@/lib/rng";

/** MVCC and snapshot isolation: PostgreSQL xmin/xmax visibility, Oracle read consistency, first-committer-wins. Part of the "concurrency" topic. */
export const MVCC: Question[] = [
  {
    id: "mvcc-idea",
    topic: "concurrency",
    kind: "mcq",
    prompt: "What is the main benefit of multiversion concurrency control (MVCC) over plain locking?",
    choices: [
      "Readers do not block writers and writers do not block readers",
      "It makes deadlocks impossible",
      "It needs no extra storage",
      "It lets transactions skip the commit step",
    ],
    answer: 0,
    explanation:
      "Writers create new versions instead of overwriting, and a reader works from the version that was current when its snapshot was taken, so no read lock is needed. Writers still block each other on the same row (and deadlocks are still possible); the price is storing old versions and cleaning them up.",
    difficulty: 1,
    tags: ["mvcc", "readers and writers"],
    askedAt: "\"How does PostgreSQL let reads and writes run together?\" is a common backend interview question.",
  },
  {
    id: "mvcc-pg-update",
    topic: "concurrency",
    kind: "mcq",
    prompt: "In PostgreSQL, what does an UPDATE of one row do to the table's storage?",
    choices: [
      "Sets xmax of the old version to its transaction id and inserts a new version whose xmin is that id",
      "Overwrites the old version in place and saves the old bytes in an undo segment",
      "Deletes the old version immediately and inserts a new one",
      "Appends the change to a separate delta table that is merged at commit",
    ],
    answer: 0,
    explanation:
      "PostgreSQL never updates in place: the old tuple stays in the heap with xmax = the updater's xid, and a new tuple with xmin = that xid is added. Older snapshots keep seeing the old version until VACUUM removes it. Oracle and InnoDB do the opposite: they overwrite in place and keep the old image in undo.",
    difficulty: 2,
    tags: ["postgresql", "xmin", "xmax"],
    askedAt: "Often asked as \"why does PostgreSQL need VACUUM?\".",
  },
  {
    id: "mvcc-pg-delete",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "In PostgreSQL, DELETE removes the row's bytes from the table page straight away.",
    answer: false,
    explanation:
      "DELETE only sets the tuple's xmax. Transactions whose snapshots predate the delete must still see the row, so the bytes stay as a dead tuple until VACUUM finds that no snapshot can see it any more.",
    difficulty: 2,
    tags: ["postgresql", "vacuum", "xmax"],
  },
  {
    id: "mvcc-vacuum",
    topic: "concurrency",
    kind: "mcq",
    prompt: "When may VACUUM reclaim a dead tuple version?",
    choices: [
      "When no running snapshot can still see that version",
      "As soon as the transaction that updated it commits",
      "Only when the table is dropped",
      "When its xmin is smaller than its xmax",
    ],
    answer: 0,
    explanation:
      "A version is removable once its deleter committed and every snapshot still in use is newer than that deleter, i.e. the deleter's xid is older than the oldest running snapshot's xmin.",
    difficulty: 2,
    tags: ["vacuum", "dead tuples"],
  },
  {
    id: "mvcc-vacuum-long-tx",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "A transaction left open for hours in PostgreSQL can stop VACUUM from removing dead tuples, even in tables it never touches.",
    answer: true,
    explanation:
      "VACUUM can only remove versions that no snapshot can see. An old open transaction (especially \"idle in transaction\" under REPEATABLE READ) holds back the oldest snapshot's xmin for the whole database, so dead tuples pile up and tables bloat.",
    difficulty: 3,
    tags: ["vacuum", "bloat", "postgresql"],
    askedAt: "A classic production-incident question for senior backend roles.",
  },
  {
    id: "mvcc-snapshot-visible",
    topic: "concurrency",
    kind: "multi",
    prompt:
      "A PostgreSQL snapshot is 100:104:100,102 (xmin:xmax:xip) and no transaction aborted. Select every transaction id whose changes this snapshot sees.",
    choices: ["99", "100", "101", "102", "103", "104"],
    answers: [0, 2, 4],
    explanation:
      "Ids below xmax that were not in progress (not in xip) had committed: 99, 101 and 103. 100 and 102 were running when the snapshot was taken, and 104 is not below xmax, so it started later: all three are invisible, even if they commit afterwards.",
    difficulty: 2,
    tags: ["snapshot", "xip", "visibility"],
  },
  {
    id: "mvcc-visible-count",
    topic: "concurrency",
    kind: "numeric",
    prompt: "A snapshot is 20:25:21,23 and transaction 24 aborted. How many of the transaction ids 19, 20, 21, 22, 23, 24, 25 and 26 are visible to it?",
    answer: 3,
    explanation:
      "Visible: 19 and 20 (committed, below xmin or not running) and 22. Invisible: 21 and 23 (in xip), 24 (aborted) and 25, 26 (≥ xmax, started later).",
    difficulty: 2,
    tags: ["snapshot", "visibility"],
  },
  {
    id: "mvcc-snapshot-timing",
    topic: "concurrency",
    kind: "mcq",
    prompt:
      "Another session commits a new row between two SELECTs in your transaction. In PostgreSQL, which isolation level lets the second SELECT see the new row?",
    choices: [
      "READ COMMITTED only",
      "REPEATABLE READ only",
      "READ COMMITTED and REPEATABLE READ",
      "None of them: a commit is never visible inside a running transaction",
    ],
    answer: 0,
    explanation:
      "READ COMMITTED takes a fresh snapshot for every statement, so the second SELECT sees the commit. REPEATABLE READ (and SERIALIZABLE) take one snapshot at the first statement and keep it until the transaction ends.",
    difficulty: 2,
    tags: ["read committed", "repeatable read", "snapshot"],
    askedAt: "Asked as \"what is the difference between READ COMMITTED and REPEATABLE READ in PostgreSQL?\".",
  },
  {
    id: "mvcc-oracle-read",
    topic: "concurrency",
    kind: "mcq",
    prompt: "How does Oracle give a query a consistent view of the data while other sessions are changing it?",
    choices: [
      "It records the SCN when the query starts and rebuilds older block images from undo wherever a block is newer",
      "It takes shared locks on every row the query reads",
      "It copies the whole table when the query starts",
      "It makes writers wait until the query finishes",
    ],
    answer: 0,
    explanation:
      "Read consistency in Oracle: the query is pinned to the system change number (SCN) at its start. If a block has changes with a higher SCN, Oracle applies undo records to a copy of the block to get its image as of that SCN. Readers take no row locks.",
    difficulty: 2,
    tags: ["oracle", "scn", "undo", "read consistency"],
    askedAt: "Oracle DBA interviews ask for \"read consistency\" by name.",
  },
  {
    id: "mvcc-ora-1555",
    topic: "concurrency",
    kind: "mcq",
    prompt: "What causes Oracle's ORA-01555 \"snapshot too old\" error?",
    choices: [
      "The undo a long-running query needs has been overwritten by newer changes",
      "Two transactions updated the same row at the same time",
      "The query's SCN is higher than the database's current SCN",
      "The table was locked exclusively during the query",
    ],
    answer: 0,
    explanation:
      "Old row images live in undo segments, which are reused. If the query runs so long that the undo for its SCN is gone, Oracle cannot rebuild the consistent image and fails the query. Fixes: a bigger undo retention, shorter queries or less commit-heavy batches.",
    difficulty: 3,
    tags: ["oracle", "undo", "ora-01555"],
  },
  {
    id: "mvcc-where-old",
    topic: "concurrency",
    kind: "mcq",
    prompt: "Where does each system keep the old versions of updated rows?",
    choices: [
      "PostgreSQL: in the table itself (needs VACUUM). Oracle: in undo segments",
      "PostgreSQL: in undo segments. Oracle: in the table itself",
      "Both: in the write-ahead log only",
      "Both: in a separate history table that users query",
    ],
    answer: 0,
    explanation:
      "PostgreSQL stores every version in the heap, so updates cause bloat that VACUUM cleans. Oracle (like MySQL InnoDB) overwrites the row and keeps the previous image in undo, which readers use to rebuild old versions. The undo approach avoids table bloat but risks \"snapshot too old\".",
    difficulty: 2,
    tags: ["postgresql", "oracle", "undo", "heap"],
  },
  {
    id: "mvcc-fcw",
    topic: "concurrency",
    kind: "mcq",
    prompt:
      "Two snapshot-isolation transactions start at the same time, and both update the same row. T1 commits first. What happens to T2?",
    choices: [
      "T2 is aborted (first committer wins) and must be retried",
      "T2 commits too, and T1's update is lost",
      "T2 reads T1's value and continues normally",
      "Both are aborted",
    ],
    answer: 0,
    explanation:
      "Snapshot isolation forbids two concurrent transactions from writing the same item. The first to commit wins; the other aborts (PostgreSQL REPEATABLE READ: \"could not serialize access due to concurrent update\", SQLSTATE 40001; Oracle SERIALIZABLE: ORA-08177). The application must retry. This is how SI prevents lost updates.",
    difficulty: 2,
    tags: ["snapshot isolation", "first committer wins", "lost update"],
  },
  {
    id: "mvcc-si-serializable",
    topic: "concurrency",
    kind: "mcq",
    prompt: "How does PostgreSQL's SERIALIZABLE level go beyond snapshot isolation?",
    choices: [
      "It tracks read-write dependencies between transactions (SSI) and aborts one when it finds a dangerous cycle",
      "It takes an exclusive lock on every table it reads",
      "It runs one transaction at a time",
      "It turns the snapshot off and reads the latest data",
    ],
    answer: 0,
    explanation:
      "Serializable Snapshot Isolation keeps snapshot reads, adds predicate (SIREAD) locks that never block, and detects the \"two consecutive rw-antidependencies\" pattern behind write skew. It then aborts a transaction with a serialization failure (40001), so the app must retry.",
    difficulty: 3,
    tags: ["ssi", "serializable", "postgresql", "write skew"],
  },
  {
    id: "mvcc-oracle-serializable",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "Oracle's SERIALIZABLE isolation level guarantees true serializability, so write skew cannot happen.",
    answer: false,
    explanation:
      "Oracle's SERIALIZABLE is snapshot isolation: it prevents dirty reads, non-repeatable reads, phantoms and lost updates (ORA-08177), but two transactions that read overlapping data and write different rows can still produce write skew.",
    difficulty: 3,
    tags: ["oracle", "serializable", "snapshot isolation", "write skew"],
  },
  {
    id: "mvcc-xid-wrap",
    topic: "concurrency",
    kind: "mcq",
    prompt: "PostgreSQL transaction ids are 32-bit and compared circularly. How does it keep very old rows visible forever?",
    choices: [
      "VACUUM freezes old tuples so their xmin no longer matters",
      "It restarts the id counter at 0 every midnight",
      "It stores 64-bit ids in every tuple header",
      "It deletes rows older than two billion transactions",
    ],
    answer: 0,
    explanation:
      "Ids are only compared within a window of about 2 billion. VACUUM \"freezes\" old committed tuples (marking them as visible to everyone), so wrapping the counter cannot make an old row look like it was created in the future. If freezing falls behind, PostgreSQL stops accepting writes to protect the data.",
    difficulty: 3,
    tags: ["xid wraparound", "freeze", "postgresql"],
  },
  {
    id: "mvcc-update-steps",
    topic: "concurrency",
    kind: "order",
    prompt: "Put the main steps of a PostgreSQL UPDATE of one row, followed by COMMIT, in order.",
    steps: [
      "Find the row version visible to the statement's snapshot",
      "Wait if a concurrent transaction is updating the same row; fail or re-check if it committed",
      "Set the old version's xmax to your transaction id",
      "Insert a new version with xmin equal to your transaction id",
      "On COMMIT, record your transaction id as committed (the old version is now dead for new snapshots)",
    ],
    explanation:
      "Visibility decides which version you update; the row lock then serializes writers; the old version is stamped with your xid as xmax and the new one as xmin. Nothing becomes visible to others until the commit record marks your xid committed.",
    difficulty: 3,
    tags: ["postgresql", "update", "xmin", "xmax"],
  },
  {
    id: "mvcc-tradeoff",
    topic: "concurrency",
    kind: "mcq",
    prompt: "Which is a real cost of MVCC compared with lock-based concurrency control?",
    choices: [
      "Old versions need space and periodic cleanup (VACUUM or undo management)",
      "Readers must wait for writers to commit",
      "Dirty reads become possible",
      "Transactions can no longer be rolled back",
    ],
    answer: 0,
    explanation:
      "MVCC trades storage and maintenance for concurrency: dead tuples (bloat) or undo that must be sized, plus visibility checks on every row read. Readers never wait for writers, dirty reads are not possible, and rollback is cheap because the aborted versions are simply ignored.",
    difficulty: 1,
    tags: ["mvcc", "trade-offs"],
  },
];

// ─── Generated problems ─────────────────────────────────────────────────────────────────────────────

const tupleTable = (rows: Tuple[], valueName: string, name: string): Relation => ({
  name,
  columns: [valueName, "xmin", "xmax"],
  rows: rows.map((t) => [t.label, t.xmin, t.xmax]),
});

const abortedText = (aborted: number[]) => (aborted.length ? `Transaction${aborted.length > 1 ? "s" : ""} ${aborted.join(", ")} aborted.` : "No transaction aborted.");

const NONE_VISIBLE = "No version is visible";

/** "Which balance does this snapshot see?", answered by `tupleVisible` on a version chain of one row. */
export const mvccVersionGen: Generator = {
  id: "mvcc-gen-version",
  topic: "concurrency",
  difficulty: 2,
  tags: ["mvcc", "snapshot", "xmin", "xmax", "visibility"],
  askedAt: "\"Which row version does this transaction see?\" is the standard PostgreSQL MVCC exercise.",
  generate(seed) {
    const r = rng(seed);
    const creators = randInt(r, 2, 4);
    const deletes = seed % 3 === 0;
    const writers = creators + (deletes ? 1 : 0);
    const xs: number[] = [];
    let x = randInt(r, 100, 900);
    for (let i = 0; i < writers; i++) xs.push((x += randInt(r, 1, 3)));
    // Visible writers first, then the ones still running at the snapshot, then the ones that started after it.
    const visible = randInt(r, 0, writers);
    const active = randInt(r, 0, writers - visible);
    const abortLast = writers - visible > 0 && r() < 0.25;
    const aborted = abortLast ? [xs[writers - 1]] : [];
    const settled = writers - (abortLast ? 1 : 0);
    const lastBefore = visible + active > 0 ? xs[visible + active - 1] : xs[0] - 1;
    const firstLater = visible + active < settled ? xs[visible + active] : null;
    const xmax = firstLater === null ? Math.max(...xs) + randInt(r, 1, 2) : lastBefore + 1 + randInt(r, 0, firstLater - lastBefore - 1);
    const running = xs.slice(visible, visible + active);
    // A bystander transaction that was running too.
    const spare: number[] = [];
    for (let c = xs[0] - 3; c < xmax; c++) if (c > 0 && !xs.includes(c)) spare.push(c);
    if (spare.length && r() < 0.6) running.push(spare[randInt(r, 0, spare.length - 1)]);
    running.sort((a, b) => a - b);
    const snap: Snapshot = { xmin: running.length ? running[0] : xmax, xmax, active: running };

    const values: number[] = [];
    let v = randInt(r, 5, 40) * 10;
    for (let i = 0; i < creators; i++) {
      values.push(v);
      v += randInt(r, 1, 9) * 10 * (r() < 0.3 ? -1 : 1);
      while (values.includes(v) || v <= 0) v += 10;
    }
    const versions: Tuple[] = values.map((value, i) => ({ label: value, xmin: xs[i], xmax: i + 1 < writers ? xs[i + 1] : 0 }));
    const flags = versions.map((t) => tupleVisible(t, snap, aborted));
    const seen = versions.find((_, i) => flags[i]);
    const right = seen ? String(seen.label) : NONE_VISIBLE;
    const choices = shuffled(r, [...values.map(String), NONE_VISIBLE]);

    const why = versions.map((t, i) => `balance ${t.label}: ${flags[i] ? "visible" : "invisible"} (${visibilityReason(t, snap, aborted)})`).join("; ");
    return {
      id: `mvcc-gen-version-${seed}`,
      topic: "concurrency",
      kind: "mcq",
      prompt: `These are the stored versions of one row of accounts. A query runs with snapshot ${snapshotText(snap)} (xmin:xmax:xip). ${abortedText(aborted)} Which balance does it see?`,
      tables: [tupleTable(versions, "balance", "accounts")],
      choices,
      answer: choices.indexOf(right),
      explanation: `A version is visible if its xmin is visible to the snapshot and its xmax is zero or not visible. A transaction id is visible only if it is below xmax ${snap.xmax}, not in xip and not aborted. ${why}. ${seen ? `So the query sees ${seen.label}.` : "So the query sees no version of this row."}`,
      difficulty: 2,
      tags: mvccVersionGen.tags,
      askedAt: mvccVersionGen.askedAt,
    };
  },
};

/** "How many rows does count(*) return?" over a table of tuple versions, answered by `tupleVisible`. */
export const mvccCountGen: Generator = {
  id: "mvcc-gen-count",
  topic: "concurrency",
  difficulty: 3,
  tags: ["mvcc", "snapshot", "visibility", "count"],
  generate(seed) {
    const r = rng(seed);
    const base = randInt(r, 100, 900);
    const xids = Array.from({ length: 8 }, (_, i) => base + i);
    const xmaxSnap = base + randInt(r, 4, 6);
    const pool = xids.filter((id) => id > base && id < xmaxSnap);
    const active = shuffled(r, pool).slice(0, randInt(r, 1, 2)).sort((a, b) => a - b);
    const aborted = r() < 0.7 ? [xids.filter((id) => !active.includes(id))[randInt(r, 0, 5)]] : [];
    const snap: Snapshot = { xmin: active[0], xmax: xmaxSnap, active };
    const tuples: Tuple[] = [];
    for (let i = 0; i < 7; i++) {
      const xmin = xids[randInt(r, 0, 6)];
      const later = xids.filter((id) => id > xmin);
      tuples.push({ label: `t${i + 1}`, xmin, xmax: r() < 0.45 ? later[randInt(r, 0, later.length - 1)] : 0 });
    }
    const flags = tuples.map((t) => tupleVisible(t, snap, aborted));
    const count = flags.filter(Boolean).length;
    const list = (on: boolean) => tuples.filter((_, i) => flags[i] === on).map((t) => t.label).join(", ") || "none";
    return {
      id: `mvcc-gen-count-${seed}`,
      topic: "concurrency",
      kind: "numeric",
      prompt: `A table holds these tuple versions. A transaction takes snapshot ${snapshotText(snap)} (xmin:xmax:xip). ${abortedText(aborted)} How many rows does SELECT count(*) return for it?`,
      tables: [tupleTable(tuples, "tuple", "heap")],
      answer: count,
      explanation: `Transaction ids visible to the snapshot: below ${snap.xmax}, not in {${active.join(", ")}}${aborted.length ? `, not aborted (${aborted[0]})` : ""}. Visible versions: ${list(true)}. Invisible: ${list(false)}. Each invisible one has an invisible creator, or a deleter whose delete the snapshot sees. Answer: ${count}.`,
      difficulty: 3,
      tags: mvccCountGen.tags,
    };
  },
};

const SI_ITEMS = ["X", "Y", "Z"];
const SI_NONE = "None";

function randomSiTxs(r: () => number, count: number): SiTx[] {
  const slots = shuffled(r, Array.from({ length: count * 2 }, (_, i) => i + 1));
  return Array.from({ length: count }, (_, i) => {
    const [a, b] = [slots[2 * i], slots[2 * i + 1]].sort((p, q) => p - q);
    const writes = shuffled(r, SI_ITEMS).slice(0, randInt(r, 1, 2)).sort();
    return { id: i + 1, start: a, commit: b, writes };
  });
}

export function randomSiCase(seed: number): SiTx[] {
  const r = rng(seed);
  const count = randInt(r, 3, 4);
  let txs = randomSiTxs(r, count);
  // Four seeds in five have a conflict to find; the fifth is a "None" case (write skew and disjoint writes pass).
  const wantNone = seed % 5 === 0;
  for (let i = 0; i < 200 && (firstCommitterWins(txs).aborted.length === 0) !== wantNone; i++) txs = randomSiTxs(r, count);
  return txs;
}

/** "Which transactions does first-committer-wins abort?", answered by `firstCommitterWins`. */
export const siAbortGen: Generator = {
  id: "mvcc-gen-si",
  topic: "concurrency",
  difficulty: 3,
  tags: ["snapshot isolation", "first committer wins", "write conflict"],
  askedAt: "Snapshot-isolation conflict exercises appear in database-systems exams and senior interviews.",
  generate(seed) {
    const txs = randomSiCase(seed);
    const out = firstCommitterWins(txs);
    const choices = [...txs.map((t) => `T${t.id}`), SI_NONE];
    const lines = [...txs]
      .sort((a, b) => a.commit - b.commit)
      .map((t) => {
        const lost = out.reasons[t.id];
        return lost
          ? `T${t.id} (time ${t.start}–${t.commit}) aborts: T${lost.winner} committed inside its lifetime and also wrote ${lost.items.join(", ")}`
          : `T${t.id} (time ${t.start}–${t.commit}) commits: no transaction that committed during its lifetime wrote ${t.writes.join(", ")}`;
      });
    return {
      id: `mvcc-gen-si-${seed}`,
      topic: "concurrency",
      kind: "multi",
      prompt: "These transactions run under snapshot isolation with first-committer-wins; each one tries to commit at its commit time. Select every transaction that is aborted, or \"None\".",
      tables: [
        {
          name: "Transactions",
          columns: ["Tx", "Start", "Commit", "Writes"],
          rows: txs.map((t) => [`T${t.id}`, t.start, t.commit, t.writes.join(", ")]),
        },
      ],
      choices,
      answers: out.aborted.length ? out.aborted.map((id) => id - 1).sort((a, b) => a - b) : [choices.length - 1],
      explanation: `Check each transaction at its commit time, in commit order. Two transactions are concurrent if one commits after the other started; a transaction that aborted never counts as committed. ${lines.join("; ")}.`,
      difficulty: 3,
      tags: siAbortGen.tags,
      askedAt: siAbortGen.askedAt,
    };
  },
};

export const MVCC_GENERATORS: Generator[] = [mvccVersionGen, mvccCountGen, siAbortGen];


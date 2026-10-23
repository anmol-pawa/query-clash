import type { Generator, Question } from "./types";
import { RECOVERY_MORE } from "./recoveryMore";
import {
  ariesAnalysis,
  ariesTables,
  logTable,
  logText,
  logTransactions,
  planText,
  recoveredValues,
  recoveryPlan,
  type AriesRec,
  type LogRec,
  type LogScheme,
  type RecoveryPlan,
} from "@/lib/dbms/recovery";
import { randInt, rng, shuffled } from "@/lib/rng";

/** Recovery: WAL, steal/force, undo/redo and deferred logging, checkpoints and ARIES. Part of the "concurrency" topic. */
export const RECOVERY: Question[] = [
  {
    id: "rec-wal",
    topic: "concurrency",
    kind: "mcq",
    prompt: "What does the write-ahead logging (WAL) rule require?",
    choices: [
      "A page's log records reach stable storage before the page itself is written to disk",
      "Every data page is written to disk before its transaction commits",
      "The log is written only at checkpoints",
      "Log records are written after the data page, so they describe what is on disk",
    ],
    answer: 0,
    explanation:
      "WAL: before a modified page goes to disk, the log records describing the change (with the old value) must be on stable storage, so the change can be undone. Before a commit is acknowledged, all its log records, including <T commit>, must be flushed too.",
    difficulty: 1,
    tags: ["wal", "logging"],
    askedAt: "\"What is write-ahead logging?\" is a staple of backend interviews.",
  },
  {
    id: "rec-steal-force",
    topic: "concurrency",
    kind: "mcq",
    prompt: "A buffer manager uses STEAL (uncommitted pages may be written to disk) and NO-FORCE (committed pages need not be written at commit). What must recovery be able to do?",
    choices: ["Both undo and redo", "Only undo", "Only redo", "Neither undo nor redo"],
    answer: 0,
    explanation:
      "STEAL means uncommitted changes can be on disk at a crash, so recovery needs UNDO. NO-FORCE means committed changes may be missing from disk, so it needs REDO. Steal/no-force is what real systems (and ARIES) use, because it gives the buffer manager the most freedom.",
    difficulty: 2,
    tags: ["steal", "force", "buffer management"],
  },
  {
    id: "rec-noforce-nosteal",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "With NO-STEAL and FORCE, a crash never needs undo or redo, which is why most real systems choose this policy.",
    answer: false,
    explanation:
      "The first half is right: no-steal keeps uncommitted data off disk (no undo) and force puts committed data on disk at commit (no redo). But real systems avoid it: force means a random write per commit, and no-steal pins every page a long transaction touched in memory. They use steal/no-force with a log.",
    difficulty: 2,
    tags: ["steal", "force"],
  },
  {
    id: "rec-deferred",
    topic: "concurrency",
    kind: "mcq",
    prompt: "Under deferred database modification, a transaction's writes reach the database only after it commits. What does its log record for an update need to hold?",
    choices: ["Only the new value", "Only the old value", "Both the old and the new value", "No value: only the item name"],
    answer: 0,
    explanation:
      "Nothing uncommitted is ever in the database, so there is nothing to undo: recovery only redoes committed transactions, which needs the new value. Immediate modification (writes go out before commit) needs the old value too, to undo.",
    difficulty: 2,
    tags: ["deferred modification", "redo"],
  },
  {
    id: "rec-immediate-c",
    topic: "concurrency",
    kind: "numeric",
    prompt:
      "Immediate-modification log at the crash: <T0 start> <T0, A, 1000, 950> <T0, B, 2000, 2050> <T0 commit> <T1 start> <T1, C, 700, 600>. What is C after recovery?",
    answer: 700,
    explanation: "T0 committed, so it is redone (A = 950, B = 2050). T1 has no commit record, so it is undone: C gets its old value back, 700. (Silberschatz's T0/T1 transfer example.)",
    difficulty: 2,
    tags: ["undo", "redo", "logging"],
    askedAt: "The A/B/C bank-transfer log is the textbook recovery example.",
  },
  {
    id: "rec-immediate-a",
    topic: "concurrency",
    kind: "numeric",
    prompt: "Same log as the T0/T1 example: <T0 start> <T0, A, 1000, 950> <T0, B, 2000, 2050> <T0 commit> <T1 start> <T1, C, 700, 600>. What is A after recovery?",
    answer: 950,
    explanation: "T0's <commit> is in the log, so redo writes its new values: A = 950, B = 2050. Redo is idempotent: writing 950 again is harmless if it was already on disk.",
    difficulty: 1,
    tags: ["redo", "logging"],
  },
  {
    id: "rec-idempotent",
    topic: "concurrency",
    kind: "short",
    prompt: "Redo and undo must give the same result whether they run once or many times (recovery itself can crash). What is this property called?",
    accept: ["idempotent", "idempotence", "idempotency"],
    explanation: "They are idempotent. Writing a logged value (rather than adding a delta) makes this easy; ARIES also uses pageLSN to skip changes already on the page.",
    difficulty: 2,
    tags: ["redo", "undo"],
  },
  {
    id: "rec-checkpoint",
    topic: "concurrency",
    kind: "mcq",
    prompt: "What is a checkpoint for?",
    choices: [
      "It bounds how much of the log recovery must scan: transactions that committed before it need no redo",
      "It commits every active transaction",
      "It deletes the log, since the data is now on disk",
      "It stops new transactions until the database is backed up",
    ],
    answer: 0,
    explanation:
      "A checkpoint flushes the log and dirty pages and writes <checkpoint L> listing the active transactions. At recovery only transactions in L or started after it matter: anything that committed earlier is already on disk.",
    difficulty: 1,
    tags: ["checkpoint"],
  },
  {
    id: "rec-undo-order",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "The undo pass scans the log backwards, while the redo pass scans it forwards.",
    answer: true,
    explanation: "Undo restores old values newest-first, so an item written twice ends at its oldest value. Redo applies new values oldest-first, so the newest write wins.",
    difficulty: 1,
    tags: ["undo", "redo"],
  },
  {
    id: "rec-aries-phases",
    topic: "concurrency",
    kind: "order",
    prompt: "Put ARIES restart recovery in order.",
    steps: [
      "Analysis: from the last checkpoint, rebuild the transaction and dirty page tables",
      "Redo: from the smallest recLSN, repeat history (losers' updates too)",
      "Undo: roll back the loser transactions, writing CLRs",
    ],
    explanation: "Analysis works out what was going on, redo puts the database back exactly as it was at the crash, and undo then rolls back every transaction that never committed.",
    difficulty: 2,
    tags: ["aries"],
    askedAt: "\"Walk me through ARIES\" comes up in database-engine and storage team interviews.",
  },
  {
    id: "rec-repeat-history",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "ARIES's redo pass redoes only the updates of committed transactions.",
    answer: false,
    explanation: "ARIES repeats history: it redoes every logged update whose effect might be missing, losers included, then undoes the losers. This keeps redo simple and allows page-level and logical undo.",
    difficulty: 3,
    tags: ["aries", "redo"],
  },
  {
    id: "rec-pagelsn",
    topic: "concurrency",
    kind: "mcq",
    prompt: "During ARIES redo, an update record with LSN 120 touches page P, which is in the dirty page table with recLSN 100. On disk, P's pageLSN is 130. What happens?",
    choices: ["Skip it: the page already contains this update", "Redo it, since 120 ≥ recLSN", "Undo it", "Abort recovery: the log is corrupt"],
    answer: 0,
    explanation: "pageLSN is the LSN of the latest update applied to the page. 130 ≥ 120 means this change is already on the page, so it is skipped. Redo happens only if the page is dirty, LSN ≥ recLSN and pageLSN < LSN.",
    difficulty: 3,
    tags: ["aries", "pagelsn"],
  },
  {
    id: "rec-clr",
    topic: "concurrency",
    kind: "mcq",
    prompt: "What is a compensation log record (CLR) in ARIES?",
    choices: [
      "A redo-only record written when an update is undone, pointing (UndoNextLSN) to the next record to undo",
      "A record that compensates for a lost commit record",
      "A checkpoint record listing dirty pages",
      "A record written when a page is flushed to disk",
    ],
    answer: 0,
    explanation:
      "Each undo writes a CLR describing the undo. CLRs are never undone themselves, and their UndoNextLSN lets a crash during recovery skip straight past the work already undone, so the undo work is bounded.",
    difficulty: 3,
    tags: ["aries", "clr"],
  },
  {
    id: "rec-aries-structures",
    topic: "concurrency",
    kind: "multi",
    prompt: "Which of these does ARIES keep track of?",
    choices: ["An LSN on every log record", "A pageLSN on every data page", "A dirty page table with recLSNs", "A transaction table with each lastLSN", "A full copy of every page at each checkpoint"],
    answers: [0, 1, 2, 3],
    explanation: "LSNs order the log, pageLSN says which updates a page holds, the dirty page table says where redo must start, and the transaction table says what to undo. Checkpoints are fuzzy: they write the two tables, not page copies.",
    difficulty: 2,
    tags: ["aries"],
  },
  {
    id: "rec-fuzzy",
    topic: "concurrency",
    kind: "truefalse",
    prompt: "An ARIES (fuzzy) checkpoint does not stop transactions or force dirty pages to disk.",
    answer: true,
    explanation: "It writes begin_checkpoint, then an end_checkpoint record holding the transaction table and dirty page table, while transactions keep running. The recLSNs in the dirty page table tell redo how far back to go.",
    difficulty: 2,
    tags: ["aries", "checkpoint"],
  },
  {
    id: "rec-shadow",
    topic: "concurrency",
    kind: "mcq",
    prompt: "Shadow paging gives atomicity without a log by…",
    choices: [
      "Writing changes to new page copies and switching one page-table pointer at commit",
      "Writing every change twice, to two disks",
      "Keeping every transaction's changes in memory until a checkpoint",
      "Locking the whole database during each transaction",
    ],
    answer: 0,
    explanation: "Changed pages go to fresh locations; the current page table points at them while the shadow table still points at the old ones. Commit atomically swaps the root pointer. It fragments data and makes concurrency hard, so logs won (SQLite's old rollback journal and LMDB-style copy-on-write trees are cousins).",
    difficulty: 2,
    tags: ["shadow paging"],
  },
  ...RECOVERY_MORE,
];

const ITEMS = ["A", "B", "C", "D"];

/** A crash log under strict 2PL (no transaction writes an item another uncommitted one wrote), with an optional checkpoint. */
export function randomLog(r: () => number, opts: { txs: number; checkpoint: boolean }): LogRec[] {
  const values: Record<string, number> = Object.fromEntries(ITEMS.map((x) => [x, randInt(r, 2, 20) * 50]));
  const plan = Array.from({ length: opts.txs }, (_, i) => ({ tx: i + 1, left: randInt(r, 1, 2), commit: r() < 0.6, started: false, done: false }));
  const locks = new Map<string, number>();
  const log: LogRec[] = [];
  const cpAfter = opts.checkpoint ? randInt(r, 3, 6) : -1;
  for (let guard = 0; guard < 200 && plan.some((p) => !p.done); guard++) {
    if (log.length === cpAfter && !log.some((x) => x.kind === "checkpoint")) {
      const active = plan.filter((p) => p.started && !(p.done && p.commit)).map((p) => p.tx);
      log.push({ kind: "checkpoint", active });
    }
    const open = plan.filter((p) => !p.done);
    const p = open[randInt(r, 0, open.length - 1)];
    if (!p.started) {
      p.started = true;
      log.push({ kind: "start", tx: p.tx });
    } else if (p.left > 0) {
      const free = ITEMS.filter((x) => (locks.get(x) ?? p.tx) === p.tx);
      if (!free.length) continue;
      const item = free[randInt(r, 0, free.length - 1)];
      locks.set(item, p.tx);
      const old = values[item];
      values[item] = Math.max(50, old + (r() < 0.5 ? -1 : 1) * randInt(r, 1, 6) * 50);
      if (values[item] === old) values[item] = old + 50;
      log.push({ kind: "update", tx: p.tx, item, old, new: values[item] });
      p.left--;
    } else {
      p.done = true;
      if (p.commit) {
        log.push({ kind: "commit", tx: p.tx });
        for (const [x, t] of locks) if (t === p.tx) locks.delete(x);
      }
    }
  }
  if (opts.checkpoint && !log.some((x) => x.kind === "checkpoint")) log.push({ kind: "checkpoint", active: plan.filter((p) => p.started && !(p.done && p.commit)).map((p) => p.tx) });
  return log;
}

/** A log with something to redo, something incomplete and, if it has a checkpoint, a transaction the checkpoint lets recovery skip. */
function interestingLog(r: () => number, checkpoint: boolean): LogRec[] {
  let log = randomLog(r, { txs: 4, checkpoint });
  for (let i = 0; i < 500; i++) {
    const p = recoveryPlan(log, "undo-redo");
    if (p.redo.length && p.undo.length && (!checkpoint || p.skipped.length) && logTransactions(log).length === 4) break;
    log = randomLog(r, { txs: 4, checkpoint });
  }
  return log;
}

const SCHEME_NAMES: Record<LogScheme, string> = { "undo-redo": "immediate modification (undo/redo log)", "redo-only": "deferred modification (redo-only log)" };

function planExplanation(log: LogRec[], scheme: LogScheme, p: RecoveryPlan): string {
  const ts = (xs: number[]) => xs.map((t) => `T${t}`).join(", ");
  const cp = log.find((x) => x.kind === "checkpoint");
  const parts = [
    cp
      ? `Only transactions in the checkpoint list {${ts(cp.kind === "checkpoint" ? cp.active : [])}} or started after it matter${p.skipped.length ? `; ${ts(p.skipped)} committed before the checkpoint, so ${p.skipped.length === 1 ? "its" : "their"} writes are already on disk` : ""}.`
      : "With no checkpoint, recovery scans the whole log.",
    p.redo.length ? `${ts(p.redo)} ${p.redo.length === 1 ? "has" : "have"} a <commit>: redo.` : "No relevant transaction committed: nothing to redo.",
  ];
  if (scheme === "undo-redo") parts.push(p.undo.length ? `${ts(p.undo)} never committed: undo, restoring old values.` : "Every relevant transaction committed: nothing to undo.");
  else parts.push(`${ts(p.discarded)} never committed, and under deferred modification ${p.discarded.length === 1 ? "its" : "their"} writes never reached the database: nothing to undo, just ignore ${p.discarded.length === 1 ? "it" : "them"}.`);
  return parts.join(" ");
}

/** "What does recovery do after this crash?", answered by `recoveryPlan`; even seeds use an undo/redo log, odd ones a redo-only log; three in four have a checkpoint. */
export const recoveryPlanGen: Generator = {
  id: "rec-gen-plan",
  topic: "concurrency",
  difficulty: 2,
  tags: ["recovery", "undo", "redo", "checkpoint"],
  askedAt: "\"Which transactions are redone and which undone?\" is a GATE and university-exam staple.",
  generate(seed) {
    const r = rng(seed);
    const scheme: LogScheme = seed % 2 === 0 ? "undo-redo" : "redo-only";
    const log = interestingLog(r, Math.floor(seed / 2) % 4 !== 3);
    const p = recoveryPlan(log, scheme);
    const txs = logTransactions(log);
    const committed = txs.filter((t) => log.some((x) => x.kind === "commit" && x.tx === t));
    const incomplete = txs.filter((t) => !committed.includes(t));
    const afterCp = (() => {
      const c = log.findIndex((x) => x.kind === "checkpoint");
      return c < 0 ? txs : txs.filter((t) => log.slice(c).some((x) => x.kind === "start" && x.tx === t));
    })();
    const right = planText(p);
    const slips = [
      planText({ redo: committed, undo: p.undo }),
      planText({ redo: p.redo, undo: scheme === "undo-redo" ? [] : incomplete }),
      planText({ redo: p.redo.filter((t) => afterCp.includes(t)), undo: p.undo }),
      planText({ redo: incomplete, undo: p.redo }),
      planText({ redo: committed, undo: scheme === "undo-redo" ? [] : incomplete }),
    ];
    const pool = [...new Set(slips)].filter((c) => c !== right);
    for (let i = 0; pool.length < 3 && i < 200; i++) {
      const redo = txs.filter(() => r() < 0.5);
      const c = planText({ redo, undo: txs.filter((t) => !redo.includes(t) && r() < 0.5) });
      if (c !== right && !pool.includes(c)) pool.push(c);
    }
    const choices = shuffled(r, [right, ...pool.slice(0, 3)]);
    return {
      id: `rec-gen-plan-${seed}`,
      topic: "concurrency",
      kind: "mcq",
      prompt: `The system crashes after the last record of this ${SCHEME_NAMES[scheme]}. What does recovery do?`,
      tables: [logTable(log, scheme)],
      choices,
      answer: choices.indexOf(right),
      explanation: planExplanation(log, scheme, p),
      difficulty: 2,
      tags: recoveryPlanGen.tags,
      askedAt: recoveryPlanGen.askedAt,
    };
  },
};

/** "What is X after recovery?" on an undo/redo log, answered by `recoveredValues`; half the seeds ask about an item an undone transaction wrote. */
export const recoveredValueGen: Generator = {
  id: "rec-gen-value",
  topic: "concurrency",
  difficulty: 3,
  tags: ["recovery", "undo", "redo"],
  generate(seed) {
    const r = rng(seed);
    const log = interestingLog(r, seed % 3 !== 0);
    const { redo, undo } = recoveryPlan(log, "undo-redo");
    const values = recoveredValues(log);
    const undoneItems = new Set(log.flatMap((x) => (x.kind === "update" && undo.includes(x.tx) ? [x.item] : [])));
    const keys = Object.keys(values).sort();
    const wantUndone = seed % 2 === 0;
    const pool = keys.filter((k) => undoneItems.has(k) === wantUndone);
    const from = pool.length ? pool : keys;
    const item = from[randInt(r, 0, from.length - 1)];
    const ups = log.filter((x): x is Extract<LogRec, { kind: "update" }> => x.kind === "update" && x.item === item);
    const story = ups
      .map((u) => `${logText(u)}: T${u.tx} ${redo.includes(u.tx) ? "is redone" : undo.includes(u.tx) ? "is undone" : "committed before the checkpoint (skipped)"}`)
      .join("; ");
    return {
      id: `rec-gen-value-${seed}`,
      topic: "concurrency",
      kind: "numeric",
      prompt: `The system crashes after the last record of this undo/redo log. Recovery undoes (backwards), then redoes (forwards). What is ${item} after recovery?`,
      tables: [logTable(log)],
      answer: values[item],
      explanation: `${story}. ${undoneItems.has(item) ? `Undo restores ${item}'s value from before the uncommitted write` : `Redo leaves ${item} at the last committed new value`}: ${values[item]}. The database holds exactly the committed transactions' work.`,
      difficulty: 3,
      tags: recoveredValueGen.tags,
    };
  },
};

const PAGES = ["P1", "P2", "P3", "P4", "P5"];

export interface AriesCase {
  log: AriesRec[];
  /** Ground truth from the simulation that wrote the log (pages it really left dirty, transactions it never committed). */
  truth: { redoLSN: number; losers: number[] };
}

/** An ARIES log with one fuzzy checkpoint, simulating page flushes before it so the checkpoint's DPT is consistent. */
export function randomAriesLog(r: () => number): AriesCase {
  for (;;) {
    const log: AriesRec[] = [];
    const tx = new Map<number, { last: number; committed: boolean; ended: boolean }>();
    const dirty = new Map<string, number>();
    let lsn = 0;
    const n = randInt(r, 10, 13);
    const cpAt = randInt(r, 4, 6);
    for (let i = 0; i < n; i++) {
      lsn += 10;
      if (i === cpAt) {
        for (const [t, e] of tx)
          if (e.committed && !e.ended) {
            e.ended = true;
            log.push({ lsn, kind: "end", tx: t });
            lsn += 10;
          }
        const att = [...tx].filter(([, e]) => !e.ended).map(([t, e]) => [t, e.last] as [number, number]);
        log.push({ lsn, kind: "checkpoint", att, dpt: [...dirty].sort((a, b) => a[1] - b[1]) });
        continue;
      }
      const live = [1, 2, 3, 4].filter((t) => !tx.get(t)?.committed);
      const committedOpen = [...tx].filter(([, e]) => e.committed && !e.ended).map(([t]) => t);
      const canCommit = live.filter((t) => tx.has(t));
      const roll = r();
      if (roll < 0.12 && committedOpen.length) {
        const t = committedOpen[randInt(r, 0, committedOpen.length - 1)];
        tx.get(t)!.ended = true;
        log.push({ lsn, kind: "end", tx: t });
      } else if (roll < 0.3 && canCommit.length && r() < 0.8) {
        const t = canCommit[randInt(r, 0, canCommit.length - 1)];
        const e = tx.get(t)!;
        e.committed = true;
        e.last = lsn;
        log.push({ lsn, kind: "commit", tx: t });
      } else if (live.length) {
        const t = live[randInt(r, 0, live.length - 1)];
        const page = PAGES[randInt(r, 0, PAGES.length - 1)];
        tx.set(t, { last: lsn, committed: false, ended: false });
        if (!dirty.has(page)) dirty.set(page, lsn);
        log.push({ lsn, kind: "update", tx: t, page });
      } else continue;
      // The buffer manager flushes a dirty page now and then (before the checkpoint only, so the DPT stays exact).
      if (i < cpAt && dirty.size && r() < 0.5) dirty.delete([...dirty.keys()][randInt(r, 0, dirty.size - 1)]);
    }
    const cp = log.find((x) => x.kind === "checkpoint");
    if (!cp || cp.kind !== "checkpoint" || !cp.att.length || !cp.dpt.length || !dirty.size) continue;
    const losers = [...tx].filter(([, e]) => !e.committed).map(([t]) => t).sort((a, b) => a - b);
    return { log, truth: { redoLSN: Math.min(...dirty.values()), losers } };
  }
}

function ariesExplanation(log: AriesRec[]): string {
  const cpIdx = log.findIndex((x) => x.kind === "checkpoint");
  const a = ariesAnalysis(log);
  const added = log
    .slice(cpIdx + 1)
    .filter((x): x is Extract<AriesRec, { kind: "update" }> => x.kind === "update" && a.dpt.get(x.page) === x.lsn)
    .map((x) => `${x.page} (recLSN ${x.lsn})`);
  const dpt = [...a.dpt].sort((x, y) => x[1] - y[1]).map(([p, l]) => `${p} ${l}`).join(", ");
  const losers = a.losers.map((t) => `T${t}`).join(", ") || "none";
  return `Analysis starts from the checkpoint's tables and scans forward. ${added.length ? `New dirty pages: ${added.join(", ")}.` : "No new page gets dirty after the checkpoint."} Final dirty page table: ${dpt}, so redo starts at the smallest recLSN, ${a.redoLSN}. A transaction leaves the table at its end record; those left without a commit are the losers: ${losers}.`;
}

/** "Where does the ARIES redo pass start?", answered by `ariesAnalysis`. */
export const ariesRedoGen: Generator = {
  id: "rec-gen-aries-redo",
  topic: "concurrency",
  difficulty: 3,
  tags: ["aries", "dirty page table", "recLSN"],
  askedAt: "ARIES analysis-pass tracing shows up in advanced DBMS courses and storage-engine interviews.",
  generate(seed) {
    const { log } = randomAriesLog(rng(seed));
    return {
      id: `rec-gen-aries-redo-${seed}`,
      topic: "concurrency",
      kind: "numeric",
      prompt: "ARIES restart after a crash at the end of this log. After the analysis pass, at which LSN does the redo pass start?",
      tables: ariesTables(log),
      answer: ariesAnalysis(log).redoLSN!,
      explanation: ariesExplanation(log),
      difficulty: 3,
      tags: ariesRedoGen.tags,
      askedAt: ariesRedoGen.askedAt,
    };
  },
};

const NO_LOSERS = "None";

/** "Which transactions does the ARIES undo pass roll back?", answered by `ariesAnalysis`. */
export const ariesLosersGen: Generator = {
  id: "rec-gen-aries-losers",
  topic: "concurrency",
  difficulty: 3,
  tags: ["aries", "transaction table", "undo"],
  generate(seed) {
    const { log } = randomAriesLog(rng(seed));
    const { losers } = ariesAnalysis(log);
    const choices = ["T1", "T2", "T3", "T4", NO_LOSERS];
    return {
      id: `rec-gen-aries-losers-${seed}`,
      topic: "concurrency",
      kind: "multi",
      prompt: "ARIES restart after a crash at the end of this log. Select every loser transaction (rolled back by the undo pass), or \"None\".",
      tables: ariesTables(log),
      choices,
      answers: losers.length ? losers.map((t) => t - 1) : [choices.length - 1],
      explanation: ariesExplanation(log),
      difficulty: 3,
      tags: ariesLosersGen.tags,
    };
  },
};

export const RECOVERY_GENERATORS: Generator[] = [recoveryPlanGen, recoveredValueGen, ariesRedoGen, ariesLosersGen];

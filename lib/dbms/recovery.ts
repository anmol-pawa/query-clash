import type { Relation } from "./algebra";

/** Log-based recovery: undo/redo and redo-only logs with checkpoints, and the ARIES analysis pass. */

export type LogRec =
  | { kind: "start"; tx: number }
  /** Immediate modification logs old and new values; a deferred (redo-only) log only needs `new`. */
  | { kind: "update"; tx: number; item: string; old: number; new: number }
  | { kind: "commit"; tx: number }
  /** A checkpoint listing the transactions active when it was taken. */
  | { kind: "checkpoint"; active: number[] };

/** Immediate modification (undo/redo) or deferred modification (redo only). */
export type LogScheme = "undo-redo" | "redo-only";

export function logText(r: LogRec, scheme: LogScheme = "undo-redo"): string {
  switch (r.kind) {
    case "start":
      return `<T${r.tx} start>`;
    case "update":
      return scheme === "undo-redo" ? `<T${r.tx}, ${r.item}, ${r.old}, ${r.new}>` : `<T${r.tx}, ${r.item}, ${r.new}>`;
    case "commit":
      return `<T${r.tx} commit>`;
    case "checkpoint":
      return `<checkpoint {${r.active.map((t) => `T${t}`).join(", ")}}>`;
  }
}

/** Parse records in `logText` form (undo/redo style), one per line or separated by spaces between `>` and `<`. */
export function parseLog(text: string): LogRec[] {
  return (text.match(/<[^>]*>/g) ?? []).map((raw) => {
    const s = raw.slice(1, -1).trim();
    let m = /^T(\d+) (start|commit)$/.exec(s);
    if (m) return { kind: m[2] as "start" | "commit", tx: Number(m[1]) };
    m = /^T(\d+), (\w+), (-?\d+), (-?\d+)$/.exec(s);
    if (m) return { kind: "update", tx: Number(m[1]), item: m[2], old: Number(m[3]), new: Number(m[4]) };
    m = /^checkpoint \{(.*)\}$/.exec(s);
    if (m) return { kind: "checkpoint", active: m[1].trim() ? m[1].split(",").map((x) => Number(x.trim().slice(1))) : [] };
    throw new Error(`bad log record ${raw}`);
  });
}

export function logTable(log: LogRec[], scheme: LogScheme = "undo-redo", name = "Log"): Relation {
  return { name, columns: ["#", "Log record"], rows: log.map((r, i) => [i + 1, logText(r, scheme)]) };
}

export interface RecoveryPlan {
  /** Committed transactions whose updates are redone. */
  redo: number[];
  /** Incomplete transactions whose updates are undone (none under redo-only). */
  undo: number[];
  /** Committed before the last checkpoint: already on disk, skipped. */
  skipped: number[];
  /** Incomplete under redo-only: their writes never reached the database, so nothing is done. */
  discarded: number[];
}

const sortNums = (xs: Iterable<number>) => [...new Set(xs)].sort((a, b) => a - b);

export function logTransactions(log: LogRec[]): number[] {
  return sortNums(log.flatMap((r) => (r.kind === "checkpoint" ? r.active : [r.tx])));
}

/**
 * Which transactions recovery redoes and undoes after a crash at the end of the log (Silberschatz's checkpoint rule):
 * only transactions active at the last checkpoint or started after it matter; of those, committed ones are redone and
 * incomplete ones undone (or, with deferred modification, simply discarded).
 */
export function recoveryPlan(log: LogRec[], scheme: LogScheme): RecoveryPlan {
  const c = log.map((r) => r.kind).lastIndexOf("checkpoint");
  const txs = logTransactions(log);
  const cp = c >= 0 ? (log[c] as Extract<LogRec, { kind: "checkpoint" }>) : null;
  const relevant = cp ? sortNums([...cp.active, ...log.slice(c + 1).flatMap((r) => (r.kind === "start" ? [r.tx] : []))]) : txs;
  const committed = new Set(log.flatMap((r) => (r.kind === "commit" ? [r.tx] : [])));
  const incomplete = relevant.filter((t) => !committed.has(t));
  return {
    redo: relevant.filter((t) => committed.has(t)),
    undo: scheme === "undo-redo" ? incomplete : [],
    skipped: txs.filter((t) => !relevant.includes(t)),
    discarded: scheme === "redo-only" ? incomplete : [],
  };
}

/**
 * The values recovery writes, item by item (undo/redo log): an undo pass backwards restoring old values of the undo
 * list, then a redo pass forwards applying new values of the redo list. Items recovery doesn't touch are absent.
 */
export function recoveredValues(log: LogRec[]): Record<string, number> {
  const { redo, undo } = recoveryPlan(log, "undo-redo");
  const out: Record<string, number> = {};
  for (let i = log.length - 1; i >= 0; i--) {
    const r = log[i];
    if (r.kind === "update" && undo.includes(r.tx)) out[r.item] = r.old;
  }
  for (const r of log) if (r.kind === "update" && redo.includes(r.tx)) out[r.item] = r.new;
  return out;
}

/** The plan as a one-line choice, e.g. "Redo T1, T3 · Undo T2". */
export function planText(p: { redo: number[]; undo: number[] }): string {
  const list = (xs: number[]) => (xs.length ? xs.map((t) => `T${t}`).join(", ") : "none");
  return `Redo ${list(p.redo)} · Undo ${list(p.undo)}`;
}

// ---------------------------------------------------------------- ARIES

export type AriesRec =
  | { lsn: number; kind: "update"; tx: number; page: string }
  | { lsn: number; kind: "commit" | "end"; tx: number }
  /** A fuzzy checkpoint: the transaction table (tx → lastLSN) and dirty page table (page → recLSN). */
  | { lsn: number; kind: "checkpoint"; att: [number, number][]; dpt: [string, number][] };

export function ariesText(r: AriesRec): string {
  switch (r.kind) {
    case "update":
      return `T${r.tx} updates ${r.page}`;
    case "commit":
      return `T${r.tx} commit`;
    case "end":
      return `T${r.tx} end`;
    case "checkpoint":
      return "checkpoint (see its tables)";
  }
}

export interface AriesAnalysis {
  /** Transaction table after analysis: tx → [lastLSN, committed]. */
  att: Map<number, { lastLSN: number; committed: boolean }>;
  /** Dirty page table after analysis: page → recLSN. */
  dpt: Map<string, number>;
  /** Where the redo pass starts: the smallest recLSN (null if no page is dirty). */
  redoLSN: number | null;
  /** Transactions still active and uncommitted at the crash: the undo pass rolls them back. */
  losers: number[];
}

/** ARIES analysis from the last checkpoint to the end of the log. */
export function ariesAnalysis(log: AriesRec[]): AriesAnalysis {
  const c = log.map((r) => r.kind).lastIndexOf("checkpoint");
  const att = new Map<number, { lastLSN: number; committed: boolean }>();
  const dpt = new Map<string, number>();
  if (c >= 0) {
    const cp = log[c] as Extract<AriesRec, { kind: "checkpoint" }>;
    for (const [tx, lastLSN] of cp.att) att.set(tx, { lastLSN, committed: false });
    for (const [page, rec] of cp.dpt) dpt.set(page, rec);
  }
  for (const r of log.slice(c + 1)) {
    if (r.kind === "checkpoint") continue;
    if (r.kind === "end") {
      att.delete(r.tx);
      continue;
    }
    const e = att.get(r.tx) ?? { lastLSN: r.lsn, committed: false };
    e.lastLSN = r.lsn;
    if (r.kind === "commit") e.committed = true;
    att.set(r.tx, e);
    if (r.kind === "update" && !dpt.has(r.page)) dpt.set(r.page, r.lsn);
  }
  const recs = [...dpt.values()];
  return {
    att,
    dpt,
    redoLSN: recs.length ? Math.min(...recs) : null,
    losers: sortNums([...att].filter(([, e]) => !e.committed).map(([t]) => t)),
  };
}

export function ariesTables(log: AriesRec[]): Relation[] {
  const cp = log.find((r) => r.kind === "checkpoint") as Extract<AriesRec, { kind: "checkpoint" }> | undefined;
  const out: Relation[] = [{ name: "Log", columns: ["LSN", "Record"], rows: log.map((r) => [r.lsn, ariesText(r)]) }];
  if (cp) {
    out.push({ name: `Checkpoint ${cp.lsn}: transaction table`, columns: ["Tx", "lastLSN"], rows: cp.att.map(([t, l]) => [`T${t}`, l]) });
    out.push({ name: `Checkpoint ${cp.lsn}: dirty page table`, columns: ["Page", "recLSN"], rows: cp.dpt.map(([p, l]) => [p, l]) });
  }
  return out;
}

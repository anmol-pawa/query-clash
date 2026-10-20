/**
 * Isolation anomalies for DBMS Interview problems: find which anomalies a two-transaction interleaving shows, and the lowest
 * isolation level that rules each one out. The patterns follow Berenson et al., "A Critique of ANSI SQL Isolation Levels" (1995).
 */

import type { Relation } from "@/lib/dbms/algebra";

/** R/W = read/write an item, S = read every row matching a predicate, I = insert a row matching it, C = commit, A = abort. */
export type IsoOpKind = "R" | "W" | "S" | "I" | "C" | "A";

export interface IsoOp {
  tx: number;
  kind: IsoOpKind;
  /** The item (R, W) or predicate (S, I). */
  target?: string;
}

export type History = IsoOp[];

export type Anomaly = "dirty-read" | "non-repeatable-read" | "phantom" | "lost-update" | "write-skew";
export const ANOMALIES: Anomaly[] = ["dirty-read", "non-repeatable-read", "phantom", "lost-update", "write-skew"];

export type IsolationLevel = "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE";
export const ISOLATION_LEVELS: IsolationLevel[] = ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"];

export const ANOMALY_NAMES: Record<Anomaly, string> = {
  "dirty-read": "Dirty read",
  "non-repeatable-read": "Non-repeatable read",
  phantom: "Phantom read",
  "lost-update": "Lost update",
  "write-skew": "Write skew",
};

/**
 * The lowest standard level that prevents each anomaly. Dirty reads, non-repeatable reads and phantoms come from the SQL standard's
 * table; lost update is ruled out from REPEATABLE READ up, and write skew (allowed by snapshot isolation) only by SERIALIZABLE.
 */
export const LOWEST_LEVEL: Record<Anomaly, IsolationLevel> = {
  "dirty-read": "READ COMMITTED",
  "non-repeatable-read": "REPEATABLE READ",
  phantom: "SERIALIZABLE",
  "lost-update": "REPEATABLE READ",
  "write-skew": "SERIALIZABLE",
};

/** Parse "R1(A) W2(A) S1(P) I2(P) C1 A2". */
export function parseHistory(text: string): History {
  return text
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((tok) => {
      const m = /^([RWSICA])(\d+)(?:\((\w+)\))?$/i.exec(tok);
      if (!m) throw new Error(`Bad history step "${tok}"`);
      const kind = m[1].toUpperCase() as IsoOpKind;
      const needs = kind !== "C" && kind !== "A";
      if (needs !== !!m[3]) throw new Error(`Bad history step "${tok}"`);
      return needs ? { tx: Number(m[2]), kind, target: m[3] } : { tx: Number(m[2]), kind };
    });
}

export function historyText(h: History): string {
  return h.map((o) => (o.target ? `${o.kind}${o.tx}(${o.target})` : `${o.kind}${o.tx}`)).join(" ");
}

/** Position of the transaction's commit or abort (`kind` narrows it), or Infinity when it never ends. */
function endOf(h: History, tx: number, kind?: "C" | "A"): number {
  const i = h.findIndex((o) => o.tx === tx && (kind ? o.kind === kind : o.kind === "C" || o.kind === "A"));
  return i === -1 ? Infinity : i;
}

const committed = (h: History, tx: number) => endOf(h, tx, "C") !== Infinity;

/** Every pair of positions i < j with h[i] and h[j] matching the two predicates. */
function pairs(h: History, a: (o: IsoOp) => boolean, b: (o: IsoOp, first: IsoOp) => boolean): [number, number][] {
  const out: [number, number][] = [];
  h.forEach((x, i) => {
    if (!a(x)) return;
    for (let j = i + 1; j < h.length; j++) if (b(h[j], x)) out.push([i, j]);
  });
  return out;
}

/** Dirty read (A1/P1): Tj reads an item Ti wrote before Ti commits or aborts. */
function dirtyRead(h: History): string | null {
  for (const [i, j] of pairs(h, (o) => o.kind === "W", (o, w) => o.kind === "R" && o.target === w.target && o.tx !== w.tx))
    if (j < endOf(h, h[i].tx)) return `T${h[j].tx} reads ${h[i].target} after T${h[i].tx} wrote it but before T${h[i].tx} ${endOf(h, h[i].tx, "A") !== Infinity ? "aborts" : "commits"}`;
  return null;
}

/** Non-repeatable read (A2): Ti reads x, Tj writes x and commits, then Ti reads x again. */
function nonRepeatable(h: History): string | null {
  for (const [i, k] of pairs(h, (o) => o.kind === "R", (o, r) => o.kind === "R" && o.tx === r.tx && o.target === r.target))
    for (let j = i + 1; j < k; j++) {
      const w = h[j];
      if (w.kind === "W" && w.target === h[i].target && w.tx !== h[i].tx && endOf(h, w.tx, "C") < k)
        return `T${h[i].tx} reads ${w.target} twice, and T${w.tx} changes it and commits in between`;
    }
  return null;
}

/** Phantom (A3): Ti reads the rows matching P, Tj inserts a matching row and commits, then Ti reads P again. */
function phantom(h: History): string | null {
  for (const [i, k] of pairs(h, (o) => o.kind === "S", (o, r) => o.kind === "S" && o.tx === r.tx && o.target === r.target))
    for (let j = i + 1; j < k; j++) {
      const w = h[j];
      if (w.kind === "I" && w.target === h[i].target && w.tx !== h[i].tx && endOf(h, w.tx, "C") < k)
        return `T${h[i].tx} runs the same query on ${w.target} twice, and T${w.tx} inserts a matching row and commits in between`;
    }
  return null;
}

/** Lost update (P4): Ti reads x, Tj writes x, then Ti writes x and commits, wiping out Tj's update. */
function lostUpdate(h: History): string | null {
  for (const [i, j] of pairs(h, (o) => o.kind === "R", (o, r) => o.kind === "W" && o.target === r.target && o.tx !== r.tx))
    for (let k = j + 1; k < h.length; k++) {
      const w = h[k];
      if (w.kind === "W" && w.tx === h[i].tx && w.target === h[i].target && committed(h, w.tx) && committed(h, h[j].tx))
        return `T${h[i].tx} read ${w.target} before T${h[j].tx} wrote it, then wrote ${w.target} from its stale read, so T${h[j].tx}'s update is lost`;
    }
  return null;
}

/**
 * Write skew (A5B): Ti reads x and Tj reads y, then Ti writes y and Tj writes x (x ≠ y), each write after the other's read, and both
 * commit. Each update is fine on its own snapshot, but together they can break a constraint that spans x and y.
 */
function writeSkew(h: History): string | null {
  const reads = h.map((o, i) => [o, i] as const).filter(([o]) => o.kind === "R");
  for (const [ra, ia] of reads)
    for (const [rb, ib] of reads) {
      if (ra.tx === rb.tx || ra.target === rb.target) continue;
      // Ti = ra.tx reads x = ra.target; Tj = rb.tx reads y = rb.target; Ti writes y after Tj's read, Tj writes x after Ti's read.
      const wi = h.findIndex((o, k) => k > ib && o.tx === ra.tx && o.kind === "W" && o.target === rb.target);
      const wj = h.findIndex((o, k) => k > ia && o.tx === rb.tx && o.kind === "W" && o.target === ra.target);
      const crossWrite = h.some((o) => (o.kind === "W" && o.tx === ra.tx && o.target === ra.target) || (o.kind === "W" && o.tx === rb.tx && o.target === rb.target));
      // Neither transaction may commit before the other's read (then they were not concurrent).
      const concurrent = endOf(h, ra.tx) > ib && endOf(h, rb.tx) > ia;
      if (wi !== -1 && wj !== -1 && !crossWrite && concurrent && committed(h, ra.tx) && committed(h, rb.tx))
        return `T${ra.tx} reads ${ra.target} and writes ${rb.target} while T${rb.tx} reads ${rb.target} and writes ${ra.target}; both commit, each having checked a value the other was changing`;
    }
  return null;
}

const DETECTORS: Record<Anomaly, (h: History) => string | null> = {
  "dirty-read": dirtyRead,
  "non-repeatable-read": nonRepeatable,
  phantom,
  "lost-update": lostUpdate,
  "write-skew": writeSkew,
};

/** Every anomaly the history shows, with a one-line reason each. */
export function anomalies(h: History): { anomaly: Anomaly; reason: string }[] {
  return ANOMALIES.flatMap((a) => {
    const reason = DETECTORS[a](h);
    return reason ? [{ anomaly: a, reason }] : [];
  });
}

/** The history as the textbook column table, one column per transaction. */
export function historyTable(h: History, name = "Interleaving"): Relation {
  const txs = [...new Set(h.map((o) => o.tx))].sort((a, b) => a - b);
  const cell = (o: IsoOp): string => {
    switch (o.kind) {
      case "R":
        return `read(${o.target})`;
      case "W":
        return `write(${o.target})`;
      case "S":
        return `select(${o.target})`;
      case "I":
        return `insert(${o.target})`;
      case "C":
        return "commit";
      case "A":
        return "abort";
    }
  };
  return { name, columns: ["t", ...txs.map((t) => `T${t}`)], rows: h.map((o, i) => [i + 1, ...txs.map((t) => (t === o.tx ? cell(o) : ""))]) };
}

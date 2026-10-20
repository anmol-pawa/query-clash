/** Transaction schedule solvers for DBMS Interview problems: conflicts, precedence graphs, conflict and view serializability, and recoverability. */

import type { Relation } from "@/lib/dbms/algebra";

export type OpKind = "R" | "W" | "C" | "A";

export interface Op {
  tx: number;
  kind: OpKind;
  /** The data item, for reads and writes. */
  item?: string;
}

export type Schedule = Op[];

/** Parse "R1(A) W2(A) C1 A2" (also "r1(A); w2(A); c1"). C = commit, A = abort. */
export function parseSchedule(text: string): Schedule {
  const ops: Schedule = [];
  for (const tok of text.split(/[\s,;]+/).filter(Boolean)) {
    const m = /^([RWCA])(\d+)(?:\((\w+)\))?$/i.exec(tok);
    if (!m) throw new Error(`Bad schedule step "${tok}"`);
    const kind = m[1].toUpperCase() as OpKind;
    const rw = kind === "R" || kind === "W";
    if (rw !== !!m[3]) throw new Error(`Bad schedule step "${tok}"`);
    ops.push(rw ? { tx: Number(m[2]), kind, item: m[3] } : { tx: Number(m[2]), kind });
  }
  return ops;
}

export function opText(op: Op): string {
  return op.item ? `${op.kind}${op.tx}(${op.item})` : `${op.kind}${op.tx}`;
}

export function scheduleText(s: Schedule): string {
  return s.map(opText).join(" ");
}

/** The transactions in the schedule, ascending. */
export function transactions(s: Schedule): number[] {
  return [...new Set(s.map((o) => o.tx))].sort((a, b) => a - b);
}

/** The schedule in the textbook column layout: one column per transaction, one row per step. */
export function scheduleTable(s: Schedule, name = "Schedule"): Relation {
  const txs = transactions(s);
  return {
    name,
    columns: ["t", ...txs.map((t) => `T${t}`)],
    rows: s.map((op, i) => [i + 1, ...txs.map((t) => (t === op.tx ? (op.item ? `${op.kind}(${op.item})` : op.kind === "C" ? "commit" : "abort") : ""))]),
  };
}

export interface Conflict {
  /** Positions in the schedule, i < j. */
  i: number;
  j: number;
}

/** Two operations conflict when they belong to different transactions, touch the same item and at least one is a write. */
export function conflicts(s: Schedule): Conflict[] {
  const out: Conflict[] = [];
  for (let i = 0; i < s.length; i++)
    for (let j = i + 1; j < s.length; j++) {
      const a = s[i];
      const b = s[j];
      if (a.item && a.item === b.item && a.tx !== b.tx && (a.kind === "W" || b.kind === "W")) out.push({ i, j });
    }
  return out;
}

export type Edge = [number, number];

/** The precedence graph: Ti → Tj when an operation of Ti conflicts with a later operation of Tj. Sorted, without duplicates. */
export function precedenceGraph(s: Schedule): Edge[] {
  const set = new Set(conflicts(s).map(({ i, j }) => `${s[i].tx},${s[j].tx}`));
  return [...set].map((k) => k.split(",").map(Number) as Edge).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** Every topological order of the nodes, in lexicographic order. Empty when the graph has a cycle. */
export function topologicalOrders(nodes: readonly number[], edges: readonly Edge[]): number[][] {
  const out: number[][] = [];
  const sorted = [...nodes].sort((a, b) => a - b);
  const walk = (done: number[]) => {
    if (done.length === sorted.length) return void out.push(done);
    for (const n of sorted)
      if (!done.includes(n) && edges.every(([a, b]) => b !== n || done.includes(a))) walk([...done, n]);
  };
  walk([]);
  return out;
}

/** A cycle in the graph (first node repeated at the end), or null. */
export function findCycle(nodes: readonly number[], edges: readonly Edge[]): number[] | null {
  const state = new Map<number, number>();
  const path: number[] = [];
  const visit = (n: number): number[] | null => {
    state.set(n, 1);
    path.push(n);
    for (const [a, b] of edges) {
      if (a !== n) continue;
      if (state.get(b) === 1) return [...path.slice(path.indexOf(b)), b];
      if (!state.has(b)) {
        const c = visit(b);
        if (c) return c;
      }
    }
    path.pop();
    state.set(n, 2);
    return null;
  };
  for (const n of [...nodes].sort((a, b) => a - b)) {
    if (state.has(n)) continue;
    const c = visit(n);
    if (c) return c;
  }
  return null;
}

/** The serial orders the schedule is conflict-equivalent to (empty when it is not conflict serializable). */
export function conflictSerialOrders(s: Schedule): number[][] {
  return topologicalOrders(transactions(s), precedenceGraph(s));
}

export function isConflictSerializable(s: Schedule): boolean {
  return findCycle(transactions(s), precedenceGraph(s)) === null;
}

/** The serial schedule running the transactions' operations one transaction at a time, in `order`. */
export function serialSchedule(s: Schedule, order: readonly number[]): Schedule {
  return order.flatMap((t) => s.filter((o) => o.tx === t));
}

/** Transactions aborted somewhere in the schedule. */
function aborted(s: Schedule): Set<number> {
  return new Set(s.filter((o) => o.kind === "A").map((o) => o.tx));
}

/**
 * For each read, the transaction it reads from (0 = the initial value): the last earlier write of the item by a transaction that
 * has not aborted by the time of the read. A transaction's own earlier write counts too.
 */
export function readsFrom(s: Schedule): { read: number; from: number }[] {
  const out: { read: number; from: number }[] = [];
  s.forEach((op, i) => {
    if (op.kind !== "R") return;
    let from = 0;
    for (let k = i - 1; k >= 0; k--) {
      const w = s[k];
      if (w.kind !== "W" || w.item !== op.item) continue;
      const abortAt = s.findIndex((o, x) => x < i && o.tx === w.tx && o.kind === "A");
      if (abortAt === -1) {
        from = w.tx;
        break;
      }
    }
    out.push({ read: i, from });
  });
  return out;
}

/** Final writer of each item (0 = never written), ignoring aborted transactions. */
function finalWrites(s: Schedule): Map<string, number> {
  const ab = aborted(s);
  const out = new Map<string, number>();
  for (const o of s) if (o.item && !out.has(o.item)) out.set(o.item, 0);
  for (const o of s) if (o.kind === "W" && !ab.has(o.tx)) out.set(o.item!, o.tx);
  return out;
}

/** The view of a schedule: who each read reads from (keyed by transaction and its k-th read) and the final writer of each item. */
function view(s: Schedule): string {
  const nth = new Map<number, number>();
  const reads = readsFrom(s).map(({ read, from }) => {
    const t = s[read].tx;
    const k = (nth.get(t) ?? 0) + 1;
    nth.set(t, k);
    return `${t}.${k}<${from}`;
  });
  return JSON.stringify([reads.sort(), [...finalWrites(s)].sort()]);
}

/** Two schedules over the same operations are view-equivalent when every read reads from the same writer and every item has the same final writer. */
export function viewEquivalent(a: Schedule, b: Schedule): boolean {
  return view(a) === view(b);
}

function permutations(xs: readonly number[]): number[][] {
  if (xs.length <= 1) return [xs.slice()];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/** The serial orders the schedule is view-equivalent to, by trying every order (fine for the few transactions in a problem). */
export function viewSerialOrders(s: Schedule): number[][] {
  return permutations(transactions(s)).filter((order) => viewEquivalent(s, serialSchedule(s, order)));
}

export function isViewSerializable(s: Schedule): boolean {
  return viewSerialOrders(s).length > 0;
}

/** Writes that do not follow a read of the same item by the same transaction. */
export function blindWrites(s: Schedule): number[] {
  return s.flatMap((o, i) => (o.kind === "W" && !s.slice(0, i).some((p) => p.tx === o.tx && p.kind === "R" && p.item === o.item) ? [i] : []));
}

export type Recoverability = "strict" | "cascadeless" | "recoverable" | "nonrecoverable";

/** Position of the transaction's commit or abort, or -1 when it has neither. */
function endOf(s: Schedule, tx: number, kind?: "C" | "A"): number {
  return s.findIndex((o) => o.tx === tx && (kind ? o.kind === kind : o.kind === "C" || o.kind === "A"));
}

export interface RecoverabilityReport {
  level: Recoverability;
  /** Why the schedule misses the next level up, e.g. "T2 reads A from T1 and commits before T1 commits". */
  reason?: string;
}

/**
 * Classify a schedule: strict ⊂ cascadeless (avoids cascading aborts) ⊂ recoverable.
 * Recoverable: if Tj reads from Ti and Tj commits, Ti commits before Tj does.
 * Cascadeless: Tj only reads values written by transactions that have already committed.
 * Strict: no transaction reads or writes an item written by another uncommitted (not yet committed or aborted) transaction.
 */
export function recoverability(s: Schedule): RecoverabilityReport {
  const rf = readsFrom(s).filter(({ read, from }) => from !== 0 && from !== s[read].tx);
  for (const { read, from } of rf) {
    const t = s[read].tx;
    const tc = endOf(s, t, "C");
    if (tc === -1) continue;
    const fc = endOf(s, from, "C");
    if (fc === -1 || fc > tc)
      return { level: "nonrecoverable", reason: `T${t} reads ${s[read].item} from T${from} and commits before T${from} ${fc === -1 ? "has committed" : "commits"}` };
  }
  for (const { read, from } of rf) {
    const fc = endOf(s, from, "C");
    if (fc === -1 || fc > read) return { level: "recoverable", reason: `T${s[read].tx} reads ${s[read].item} from T${from} before T${from} commits` };
  }
  for (let i = 0; i < s.length; i++) {
    const w = s[i];
    if (w.kind !== "W") continue;
    const end = endOf(s, w.tx);
    for (let j = i + 1; j < s.length && (end === -1 || j < end); j++) {
      const o = s[j];
      if (o.item === w.item && o.tx !== w.tx) return { level: "cascadeless", reason: `T${o.tx} ${o.kind === "W" ? "overwrites" : "reads"} ${o.item} before T${w.tx}, which wrote it, ends` };
    }
  }
  return { level: "strict" };
}

/** Concurrency-control solvers for DBMS Interview problems: lock compatibility, two-phase locking classes, wait-for graphs, deadlock prevention and timestamp ordering. */

import type { Relation } from "@/lib/dbms/algebra";
import { opText, type Schedule } from "@/lib/dbms/schedule";

export type LockMode = "IS" | "IX" | "S" | "SIX" | "X";
export const LOCK_MODES: LockMode[] = ["IS", "IX", "S", "SIX", "X"];

/** The multiple-granularity compatibility matrix (Silberschatz fig. 18.17); its S/X corner is the plain shared/exclusive matrix. */
const COMPAT_ROWS: Record<LockMode, LockMode[]> = {
  IS: ["IS", "IX", "S", "SIX"],
  IX: ["IS", "IX"],
  S: ["IS", "S"],
  SIX: ["IS"],
  X: [],
};

export function compatible(held: LockMode, requested: LockMode): boolean {
  return COMPAT_ROWS[held].includes(requested);
}

/* ---------- Locked transactions and the 2PL family ---------- */

/** One step of a transaction under locking: lock-S, lock-X, unlock, read, write or commit. */
export type LockStepKind = "S" | "X" | "U" | "R" | "W" | "C";
export interface LockStep {
  kind: LockStepKind;
  item?: string;
}

/** Parse "S(A) R(A) X(B) W(B) U(A) C U(B)" (one transaction's steps). */
export function parseLockSteps(text: string): LockStep[] {
  return text
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((tok) => {
      const m = /^([SXURWC])(?:\((\w+)\))?$/i.exec(tok);
      const kind = m?.[1].toUpperCase() as LockStepKind | undefined;
      if (!m || !kind || (kind === "C") === !!m[2]) throw new Error(`Bad lock step "${tok}"`);
      return kind === "C" ? { kind } : { kind, item: m[2] };
    });
}

const STEP_WORD: Record<LockStepKind, string> = { S: "lock-S", X: "lock-X", U: "unlock", R: "read", W: "write", C: "commit" };

export function lockStepText(s: LockStep): string {
  return s.item ? `${STEP_WORD[s.kind]}(${s.item})` : STEP_WORD[s.kind];
}

/** Every read is covered by a held lock and every write by a held X lock; unlocks release held locks; at most one commit, at the end of the data steps. */
export function wellFormed(steps: readonly LockStep[]): boolean {
  const held = new Map<string, "S" | "X">();
  let committed = false;
  for (const s of steps) {
    if (s.kind === "C") {
      if (committed) return false;
      committed = true;
    } else if (s.kind === "S" || s.kind === "X") {
      if (committed || held.get(s.item!) === s.kind || held.get(s.item!) === "X") return false;
      held.set(s.item!, s.kind);
    } else if (s.kind === "U") {
      if (!held.delete(s.item!)) return false;
    } else {
      if (committed) return false;
      const mode = held.get(s.item!);
      if (!mode || (s.kind === "W" && mode !== "X")) return false;
    }
  }
  return committed;
}

export type LockingClass = "not-2pl" | "2pl" | "strict" | "rigorous";

export const LOCKING_NAMES: Record<LockingClass, string> = {
  "not-2pl": "Not two-phase",
  "2pl": "Basic 2PL only",
  strict: "Strict 2PL (not rigorous)",
  rigorous: "Rigorous 2PL",
};

/**
 * The strongest protocol a transaction's steps follow, with the reason it misses the next one.
 * 2PL: no lock after the first unlock. Strict: also every X lock is held until commit.
 * Rigorous: every lock is held until commit. Locks still held at the end are released at commit.
 */
export function lockingClass(steps: readonly LockStep[]): { cls: LockingClass; reason: string } {
  const firstUnlock = steps.findIndex((s) => s.kind === "U");
  if (firstUnlock >= 0) {
    const late = steps.findIndex((s, i) => i > firstUnlock && (s.kind === "S" || s.kind === "X"));
    if (late >= 0)
      return { cls: "not-2pl", reason: `${lockStepText(steps[late])} comes after ${lockStepText(steps[firstUnlock])}, so a lock is acquired in the shrinking phase` };
  }
  const commit = steps.findIndex((s) => s.kind === "C");
  const modeAt = (i: number) => {
    // The mode held on the item just before unlock i: the last lock request on it.
    for (let k = i - 1; k >= 0; k--) if ((steps[k].kind === "S" || steps[k].kind === "X") && steps[k].item === steps[i].item) return steps[k].kind;
    return null;
  };
  const early = steps.flatMap((s, i) => (s.kind === "U" && i < commit ? [i] : []));
  const earlyX = early.find((i) => modeAt(i) === "X");
  if (earlyX !== undefined)
    return { cls: "2pl", reason: `it is two-phase, but ${lockStepText(steps[earlyX])} releases an X lock before commit, so others could read its uncommitted write` };
  if (early.length)
    return { cls: "strict", reason: `every X lock is held until commit, but ${lockStepText(steps[early[0]])} releases a shared lock before commit` };
  return { cls: "rigorous", reason: "no lock is released before commit" };
}

/* ---------- Wait-for graphs and deadlock ---------- */

export interface LockTableRow {
  item: string;
  holders: { tx: number; mode: "S" | "X" }[];
  /** A transaction blocked on this item, if any. */
  waiter?: { tx: number; mode: "S" | "X" };
}

export type Edge = [number, number];

/** Ti → Tj when Ti waits for a lock that Tj holds in an incompatible mode. Sorted, without duplicates. */
export function waitForGraph(table: readonly LockTableRow[]): Edge[] {
  const set = new Set<string>();
  for (const row of table)
    if (row.waiter)
      for (const h of row.holders) if (h.tx !== row.waiter.tx && !compatible(h.mode, row.waiter.mode)) set.add(`${row.waiter.tx},${h.tx}`);
  return [...set].map((k) => k.split(",").map(Number) as Edge).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** The nodes that lie on some cycle (the deadlocked transactions), ascending. */
export function nodesOnCycles(nodes: readonly number[], edges: readonly Edge[]): number[] {
  const reach = (from: number): Set<number> => {
    const seen = new Set<number>();
    const stack = edges.filter(([a]) => a === from).map(([, b]) => b);
    while (stack.length) {
      const n = stack.pop()!;
      if (seen.has(n)) continue;
      seen.add(n);
      for (const [a, b] of edges) if (a === n) stack.push(b);
    }
    return seen;
  };
  return nodes.filter((n) => reach(n).has(n)).sort((a, b) => a - b);
}

export function lockTable(table: readonly LockTableRow[]): Relation {
  return {
    name: "Lock table",
    columns: ["item", "held by", "waiting"],
    rows: table.map((r) => [r.item, r.holders.map((h) => `T${h.tx}:${h.mode}`).join(" "), r.waiter ? `T${r.waiter.tx}:${r.waiter.mode}` : "—"]),
  };
}

/* ---------- Deadlock prevention ---------- */

export type Prevention = "wait-die" | "wound-wait";
export type PreventionOutcome = "requester-waits" | "requester-dies" | "holder-wounded";

/**
 * A smaller timestamp is older. Wait-die (non-preemptive): an older requester waits, a younger one dies.
 * Wound-wait (preemptive): an older requester wounds (rolls back) the holder, a younger one waits.
 */
export function prevention(scheme: Prevention, requesterTs: number, holderTs: number): PreventionOutcome {
  const older = requesterTs < holderTs;
  if (scheme === "wait-die") return older ? "requester-waits" : "requester-dies";
  return older ? "holder-wounded" : "requester-waits";
}

/* ---------- Timestamp ordering ---------- */

export interface TsStep {
  /** Index into the schedule. */
  at: number;
  ok: boolean;
  /** Thomas' write rule skipped an obsolete write. */
  ignored?: boolean;
  note: string;
}

/**
 * Run the basic timestamp-ordering protocol (Silberschatz 18.5) over the reads and writes, stopping at the first
 * rejected operation (its transaction rolls back). With `thomas`, an obsolete write (TS < W-TS, but not < R-TS) is ignored.
 */
export function timestampOrdering(s: Schedule, ts: Record<number, number>, thomas = false): { steps: TsStep[]; rejected: number | null } {
  const rts = new Map<string, number>();
  const wts = new Map<string, number>();
  const steps: TsStep[] = [];
  for (let at = 0; at < s.length; at++) {
    const op = s[at];
    if (!op.item) continue;
    const t = ts[op.tx];
    const r = rts.get(op.item) ?? 0;
    const w = wts.get(op.item) ?? 0;
    const name = opText(op);
    if (op.kind === "R") {
      if (t < w) {
        steps.push({ at, ok: false, note: `${name}: TS(T${op.tx}) = ${t} < W-TS(${op.item}) = ${w}, so the value it needs is already overwritten. Rejected: T${op.tx} rolls back` });
        return { steps, rejected: at };
      }
      rts.set(op.item, Math.max(r, t));
      steps.push({ at, ok: true, note: `${name} runs, R-TS(${op.item}) = ${Math.max(r, t)}` });
    } else {
      if (t < r) {
        steps.push({ at, ok: false, note: `${name}: TS(T${op.tx}) = ${t} < R-TS(${op.item}) = ${r}, a younger transaction already read the old value. Rejected: T${op.tx} rolls back` });
        return { steps, rejected: at };
      }
      if (t < w) {
        if (thomas) {
          steps.push({ at, ok: true, ignored: true, note: `${name}: TS(T${op.tx}) = ${t} < W-TS(${op.item}) = ${w}, an obsolete write, so Thomas' rule ignores it` });
          continue;
        }
        steps.push({ at, ok: false, note: `${name}: TS(T${op.tx}) = ${t} < W-TS(${op.item}) = ${w}, it would overwrite a younger write. Rejected: T${op.tx} rolls back` });
        return { steps, rejected: at };
      }
      wts.set(op.item, t);
      steps.push({ at, ok: true, note: `${name} runs, W-TS(${op.item}) = ${t}` });
    }
  }
  return { steps, rejected: null };
}

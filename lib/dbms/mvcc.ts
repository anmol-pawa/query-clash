/** Multiversion concurrency control: PostgreSQL-style tuple visibility and snapshot isolation's first-committer-wins rule. */

/** A PostgreSQL snapshot, written `xmin:xmax:xip`. */
export interface Snapshot {
  /** The lowest transaction id still in progress when the snapshot was taken (xmax if none). */
  xmin: number;
  /** The first id not yet assigned: every id >= xmax started after the snapshot. */
  xmax: number;
  /** Ids that were in progress at that moment. */
  active: number[];
}

/** One stored version of a row. `xmax` 0 means no transaction has deleted or updated it. */
export interface Tuple {
  label: string | number;
  xmin: number;
  xmax: number;
}

export const snapshotText = (s: Snapshot) => `${s.xmin}:${s.xmax}:${s.active.join(",")}`;

/** Did transaction `x` commit before the snapshot was taken, so its effects are visible to it? */
export function xidVisible(x: number, snap: Snapshot, aborted: readonly number[]): boolean {
  if (aborted.includes(x)) return false;
  if (x >= snap.xmax) return false;
  return !snap.active.includes(x);
}

/** A version is visible when its creator is visible and its deleter (if any) is not. */
export function tupleVisible(t: Tuple, snap: Snapshot, aborted: readonly number[]): boolean {
  if (!xidVisible(t.xmin, snap, aborted)) return false;
  return t.xmax === 0 || !xidVisible(t.xmax, snap, aborted);
}

/** Why a version is or isn't visible, in one clause. */
export function visibilityReason(t: Tuple, snap: Snapshot, aborted: readonly number[]): string {
  const why = (x: number) =>
    aborted.includes(x) ? "aborted" : x >= snap.xmax ? `${x} ≥ xmax ${snap.xmax}, started after the snapshot` : snap.active.includes(x) ? "in progress at the snapshot" : "committed before the snapshot";
  if (!xidVisible(t.xmin, snap, aborted)) return `creator ${t.xmin} is not visible (${why(t.xmin)})`;
  if (t.xmax === 0) return `creator ${t.xmin} is visible (${why(t.xmin)}) and nobody deleted it`;
  if (!xidVisible(t.xmax, snap, aborted)) return `creator ${t.xmin} is visible and the deleter ${t.xmax} is not (${why(t.xmax)}), so the delete does not count`;
  return `creator ${t.xmin} is visible but the deleter ${t.xmax} is too (${why(t.xmax)}), so the version is dead to this snapshot`;
}

/** A transaction under snapshot isolation. Times are distinct positions on one clock. */
export interface SiTx {
  id: number;
  start: number;
  commit: number;
  writes: string[];
}

export interface SiOutcome {
  /** Transactions aborted by first-committer-wins, in commit order. */
  aborted: number[];
  /** For each aborted transaction: who it lost to and on which items. */
  reasons: Record<number, { winner: number; items: string[] }>;
}

/**
 * First-committer-wins: at its commit time a transaction aborts if a concurrent transaction (one that committed
 * after this one started, before it tried to commit) has already committed a write to an item it also wrote.
 */
export function firstCommitterWins(txs: SiTx[]): SiOutcome {
  const committed: SiTx[] = [];
  const aborted: number[] = [];
  const reasons: SiOutcome["reasons"] = {};
  for (const t of [...txs].sort((a, b) => a.commit - b.commit)) {
    let lost: { winner: number; items: string[] } | null = null;
    for (const w of committed) {
      if (w.commit < t.start) continue;
      const items = t.writes.filter((x) => w.writes.includes(x));
      if (items.length) {
        lost = { winner: w.id, items };
        break;
      }
    }
    if (lost) {
      aborted.push(t.id);
      reasons[t.id] = lost;
    } else committed.push(t);
  }
  return { aborted, reasons };
}

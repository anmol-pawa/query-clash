/** Multiversion concurrency control: PostgreSQL-style tuple visibility, statement vs transaction snapshots, and first-committer-wins. */

export type XidState = "committed" | "aborted" | "running";

/** One physical row version (a PostgreSQL heap tuple): created by `xmin`, ended (updated or deleted) by `xmax`, 0 if still live. */
export interface RowVersion {
  xmin: number;
  xmax: number;
  value: number;
}

/** A snapshot: transactions with an id >= `xmax` started after it; those in `xip` were still running when it was taken. */
export interface Snapshot {
  xmax: number;
  xip: number[];
}

export type Clog = Record<number, XidState>;

/** Did `xid` commit before the snapshot was taken (so its changes are part of the snapshot)? */
export function committedBefore(xid: number, snap: Snapshot, clog: Clog): boolean {
  return clog[xid] === "committed" && xid < snap.xmax && !snap.xip.includes(xid);
}

/** Why `xid` does or does not count for the snapshot, in a few words. */
export function xidVerdict(xid: number, snap: Snapshot, clog: Clog, self?: number): string {
  if (xid === self) return `xid ${xid} is you`;
  if (clog[xid] === "aborted") return `xid ${xid} aborted`;
  if (xid >= snap.xmax) return `xid ${xid} started after the snapshot (${xid} ≥ ${snap.xmax})`;
  if (snap.xip.includes(xid)) return `xid ${xid} was still running when the snapshot was taken`;
  if (clog[xid] === "running") return `xid ${xid} has not committed`;
  return `xid ${xid} committed before the snapshot`;
}

/** PostgreSQL's MVCC rule: the creator must count (committed before the snapshot, or you) and the ender must not. */
export function isVisible(v: RowVersion, snap: Snapshot, clog: Clog, self?: number): boolean {
  const counts = (xid: number) => xid === self || committedBefore(xid, snap, clog);
  if (!counts(v.xmin)) return false;
  return v.xmax === 0 || !counts(v.xmax);
}

/** The one version a query sees (a valid version chain has at most one), or null when no row is visible. */
export function visibleVersion(versions: RowVersion[], snap: Snapshot, clog: Clog, self?: number): RowVersion | null {
  return versions.find((v) => isVisible(v, snap, clog, self)) ?? null;
}

/** One line per version saying why it is or is not visible. */
export function visibilityStory(versions: RowVersion[], snap: Snapshot, clog: Clog, self?: number): string {
  return versions
    .map((v, i) => {
      const name = `v${i + 1}`;
      const made = xidVerdict(v.xmin, snap, clog, self);
      if (!(v.xmin === self || committedBefore(v.xmin, snap, clog))) return `${name}: not visible, its creator does not count (${made}).`;
      if (v.xmax === 0) return `${name}: visible, ${made} and it was never updated or deleted (xmax 0).`;
      const ended = v.xmax === self || committedBefore(v.xmax, snap, clog);
      const by = xidVerdict(v.xmax, snap, clog, self);
      return ended
        ? `${name}: not visible, ${made} but it was already replaced or deleted (${by}).`
        : `${name}: visible, ${made} and its xmax does not count (${by}), so the snapshot still sees it.`;
    })
    .join(" ");
}

export type Level = "READ COMMITTED" | "REPEATABLE READ";

export interface Op {
  tx: number;
  kind: "begin" | "select" | "update" | "commit" | "rollback";
  /** The value an update writes. */
  value?: number;
}

/**
 * What each SELECT returns for one item that starts at `initial`. READ COMMITTED takes a fresh snapshot for every
 * statement; REPEATABLE READ takes one at the transaction's first statement (not at BEGIN). A transaction always
 * sees its own writes; other transactions' writes count once they have committed before the snapshot.
 */
export function selectResults(ops: Op[], initial: number, level: Level): { step: number; tx: number; value: number }[] {
  const committedAt = (point: number): number => {
    let value = initial;
    const pending = new Map<number, number>();
    for (let j = 0; j < point; j++) {
      const o = ops[j];
      if (o.kind === "update") pending.set(o.tx, o.value!);
      else if (o.kind === "rollback") pending.delete(o.tx);
      else if (o.kind === "commit" && pending.has(o.tx)) {
        value = pending.get(o.tx)!;
        pending.delete(o.tx);
      }
    }
    return value;
  };
  const out: { step: number; tx: number; value: number }[] = [];
  ops.forEach((o, i) => {
    if (o.kind !== "select") return;
    const first = ops.findIndex((x) => x.tx === o.tx && x.kind !== "begin");
    const point = level === "READ COMMITTED" ? i : first;
    const own = ops.slice(0, i).filter((x) => x.tx === o.tx && x.kind === "update").pop();
    const ownLive = own && !ops.slice(0, i).some((x) => x.tx === o.tx && x.kind === "rollback");
    out.push({ step: i, tx: o.tx, value: ownLive ? own!.value! : committedAt(point) });
  });
  return out;
}

/** A transaction for the first-committer-wins rule. */
export interface SiTx {
  id: number;
  start: number;
  commit: number;
  writes: string[];
}

/** Under snapshot isolation a transaction that overlaps an earlier-committed one writing a common item must abort. Returns the ids that abort. */
export function firstCommitterWins(txs: SiTx[]): { aborted: number[]; why: Map<number, number> } {
  const committed: SiTx[] = [];
  const why = new Map<number, number>();
  for (const t of [...txs].sort((a, b) => a.commit - b.commit)) {
    const clash = committed.find((c) => c.commit > t.start && c.writes.some((w) => t.writes.includes(w)));
    if (clash) why.set(t.id, clash.id);
    else committed.push(t);
  }
  return { aborted: [...why.keys()].sort((a, b) => a - b), why };
}

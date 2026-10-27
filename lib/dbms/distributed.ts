/** Distributed-database helpers for DBMS Interview: quorums, shard placement, consistent hashing and two-phase commit. */

/** A read sees the latest acknowledged write whenever the read and write quorums must overlap: R + W > N. */
export function quorumsOverlap(n: number, r: number, w: number): boolean {
  return r + w > n;
}

/** Two writes can never both succeed on disjoint replica sets when W > N/2. */
export function writesConflictSafe(n: number, w: number): boolean {
  return 2 * w > n;
}

/** Replicas that may be down while writes (or reads) still reach a quorum of size q. */
export function failuresTolerated(n: number, q: number): number {
  return n - q;
}

/** Majority quorum size for n replicas. */
export function majority(n: number): number {
  return Math.floor(n / 2) + 1;
}

/** Shard chosen by hash(key) mod shards (the hash is the integer key itself). */
export function modShard(key: number, shards: number): number {
  return ((key % shards) + shards) % shards;
}

/** Keys that live on a different shard after the shard count changes, under mod placement. */
export function movedByMod(keys: number[], from: number, to: number): number {
  return keys.filter((k) => modShard(k, from) !== modShard(k, to)).length;
}

/** Range partitioning: the shard whose upper bound is the first one >= key (bounds ascending; the last shard takes the rest). */
export function rangeShard(key: number, bounds: number[]): number {
  const i = bounds.findIndex((b) => key <= b);
  return i === -1 ? bounds.length : i;
}

/** Consistent hashing on a ring of `ringSize` positions: a key belongs to the first node at or after its position, wrapping around. */
export function ringOwner(position: number, nodes: Record<string, number>, ringSize: number): string {
  const entries = Object.entries(nodes).sort((a, b) => a[1] - b[1]);
  const p = ((position % ringSize) + ringSize) % ringSize;
  const hit = entries.find(([, at]) => at >= p);
  return (hit ?? entries[0])[0];
}

export type Vote = "yes" | "no";
export type TwoPcOutcome = "commit" | "abort" | "blocked";

/**
 * Two-phase commit. The coordinator commits only if every participant votes yes.
 * If it crashes before sending the decision, a participant that voted yes is prepared and cannot decide alone (it does not know whether the others voted yes or no): it blocks, even if some other participant voted no.
 * Only when every vote was no does everyone abort unilaterally, since a no voter aborts at once.
 */
export function twoPhaseCommit(votes: Vote[], coordinatorCrashesBeforeDecision: boolean): TwoPcOutcome {
  const allYes = votes.every((v) => v === "yes");
  if (!coordinatorCrashesBeforeDecision) return allYes ? "commit" : "abort";
  return votes.some((v) => v === "yes") ? "blocked" : "abort";
}

/** Messages in a failure-free 2PC round with n participants: prepare, vote, decision, ack. */
export function twoPcMessages(n: number): number {
  return 4 * n;
}

/** Query processing cost model (Silberschatz, Korth & Sudarshan ch. 15-16): block transfers for join algorithms, size estimates, join orders. */

export interface Rel {
  /** Number of tuples. */
  n: number;
  /** Number of blocks. */
  b: number;
}

const ceilDiv = (a: number, b: number) => Math.ceil(a / b);

/** Blocks needed for `tuples` tuples at `perBlock` tuples per block. */
export const blocksFor = (tuples: number, perBlock: number): number => ceilDiv(tuples, perBlock);

/** Tuple-at-a-time nested loop, r outer: n_r * b_s + b_r transfers (n_r + b_r seeks). */
export const nestedLoopTransfers = (r: Rel, s: Rel): number => r.n * s.b + r.b;
export const nestedLoopSeeks = (r: Rel): number => r.n + r.b;

/** Block nested loop, r outer, M buffer blocks (M - 2 for the outer, 1 for the inner, 1 for output). */
export const blockNestedTransfers = (r: Rel, s: Rel, m: number): number => ceilDiv(r.b, m - 2) * s.b + r.b;
export const blockNestedSeeks = (r: Rel, m: number): number => 2 * ceilDiv(r.b, m - 2);

/** Best case for block nested loop: one relation fits in memory, so each relation is read once. */
export const blockNestedBest = (r: Rel, s: Rel): number => r.b + s.b;

/** Number of merge passes of an external sort of `blocks` blocks with M buffer blocks. */
export function sortPasses(blocks: number, m: number): number {
  let runs = ceilDiv(blocks, m);
  let passes = 0;
  while (runs > 1) {
    runs = ceilDiv(runs, m - 1);
    passes++;
  }
  return passes;
}

/** External merge sort transfers (the final write is not counted): b * (2 * passes + 1). */
export const sortTransfers = (blocks: number, m: number): number => blocks * (2 * sortPasses(blocks, m) + 1);

/** Merge join of inputs that are already sorted: each block is read once. */
export const mergeJoinSorted = (r: Rel, s: Rel): number => r.b + s.b;

/** Merge join that must sort both inputs first. */
export const mergeJoinUnsorted = (r: Rel, s: Rel, m: number): number => sortTransfers(r.b, m) + sortTransfers(s.b, m) + r.b + s.b;

/** Partitions for a hash join whose build input is `build`: ceil(b_build / M). */
export const hashPartitions = (build: Rel, m: number): number => ceilDiv(build.b, m);

/** Hash join without recursive partitioning: 3 (b_r + b_s) + 4 n_h. Valid when n_h <= M - 1. */
export const hashJoinTransfers = (r: Rel, s: Rel, build: Rel, m: number): number => 3 * (r.b + s.b) + 4 * hashPartitions(build, m);
export const hashNeedsRecursion = (build: Rel, m: number): boolean => hashPartitions(build, m) > m - 1;

/** Result size of an equality predicate on a column with `distinct` values (uniform): n / V. */
export const equalitySize = (n: number, distinct: number): number => Math.ceil(n / distinct);

/** Estimated size of r ⋈ s on column A, where A is not a key of either: n_r * n_s / max(V(A,r), V(A,s)). */
export const joinSize = (nr: number, ns: number, vr: number, vs: number): number => Math.ceil((nr * ns) / Math.max(vr, vs));

const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));

/** Left-deep join orders of n relations: n!. */
export const leftDeepOrders = (n: number): number => fact(n);
/** All join trees (any shape, order-sensitive): (2(n-1))! / (n-1)!. */
export const allJoinTrees = (n: number): number => fact(2 * (n - 1)) / fact(n - 1);

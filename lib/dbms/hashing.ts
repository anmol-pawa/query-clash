/**
 * Hash file organisations. Keys are non-negative integers and h(k) = k, so the "hash value" is the key itself and
 * the bits used are its low-order bits (k mod 2^d) — the convention of most worked examples.
 */

/** Static hashing: B primary buckets, h(k) = k mod B, overflow chains of capacity-sized pages. */
export function staticBuckets(buckets: number, keys: readonly number[]): number[][] {
  const out: number[][] = Array.from({ length: buckets }, () => []);
  for (const k of keys) if (!out[k % buckets].includes(k)) out[k % buckets].push(k);
  return out;
}

/** Overflow pages needed in total: a bucket of m keys with page capacity c chains ceil(m/c) − 1 extra pages. */
export function overflowPages(buckets: readonly number[][], cap: number): number {
  return buckets.reduce((s, b) => s + Math.max(0, Math.ceil(b.length / cap) - 1), 0);
}

export interface ExtBucket {
  depth: number;
  keys: number[];
}

export interface ExtendibleHash {
  cap: number;
  globalDepth: number;
  /** directory[i] is the bucket for the hash prefix whose low `globalDepth` bits equal i. */
  directory: ExtBucket[];
}

export const newExtendible = (cap: number): ExtendibleHash => {
  const b: ExtBucket = { depth: 0, keys: [] };
  return { cap, globalDepth: 0, directory: [b] };
};

const MAX_DEPTH = 20;

/** Insert in place; a full bucket splits (doubling the directory first when its local depth equals the global one). */
export function extInsert(h: ExtendibleHash, key: number): void {
  for (const b of new Set(h.directory)) if (b.keys.includes(key)) return;
  for (;;) {
    const bucket = h.directory[key & ((1 << h.globalDepth) - 1)];
    if (bucket.keys.length < h.cap || h.globalDepth >= MAX_DEPTH) {
      bucket.keys.push(key);
      return;
    }
    if (bucket.depth === h.globalDepth) {
      h.directory = h.directory.concat(h.directory);
      h.globalDepth++;
    }
    bucket.depth++;
    const sibling: ExtBucket = { depth: bucket.depth, keys: [] };
    const bit = 1 << (bucket.depth - 1);
    const all = bucket.keys;
    bucket.keys = all.filter((k) => !(k & bit));
    sibling.keys = all.filter((k) => k & bit);
    h.directory = h.directory.map((b, i) => (b === bucket && i & bit ? sibling : b));
  }
}

export function extBuild(cap: number, keys: readonly number[]): ExtendibleHash {
  const h = newExtendible(cap);
  for (const k of keys) extInsert(h, k);
  return h;
}

export const extBuckets = (h: ExtendibleHash): ExtBucket[] => [...new Set(h.directory)];

/** The directory as text, one entry per line item: "00 → [4, 8] (local depth 2)". */
export function showDirectory(h: ExtendibleHash): string {
  return h.directory
    .map((b, i) => `${h.globalDepth === 0 ? "-" : i.toString(2).padStart(h.globalDepth, "0")} → [${b.keys.join(", ")}] (local depth ${b.depth})`)
    .join("; ");
}

export interface LinearHash {
  cap: number;
  /** Buckets at level 0. */
  initial: number;
  level: number;
  /** Next bucket to split. */
  next: number;
  /** Each bucket's keys, including keys that sit on its overflow chain. */
  buckets: number[][];
}

export const newLinear = (initial: number, cap: number): LinearHash => ({
  cap,
  initial,
  level: 0,
  next: 0,
  buckets: Array.from({ length: initial }, () => []),
});

/** Bucket address for a key: h_level, or h_level+1 for buckets already split in this round. */
export function linearAddress(h: LinearHash, key: number): number {
  const base = h.initial * 2 ** h.level;
  const a = key % base;
  return a < h.next ? key % (base * 2) : a;
}

/** Insert in place. Any insertion that overflows its bucket splits the bucket at `next` (not necessarily the full one). */
export function linInsert(h: LinearHash, key: number): void {
  if (h.buckets.some((b) => b.includes(key))) return;
  const target = h.buckets[linearAddress(h, key)];
  target.push(key);
  if (target.length <= h.cap) return;
  const base = h.initial * 2 ** h.level;
  const old = h.buckets[h.next];
  h.buckets[h.next] = old.filter((k) => k % (base * 2) === h.next);
  h.buckets.push(old.filter((k) => k % (base * 2) !== h.next));
  h.next++;
  if (h.next === base) {
    h.level++;
    h.next = 0;
  }
}

export function linBuild(initial: number, cap: number, keys: readonly number[]): LinearHash {
  const h = newLinear(initial, cap);
  for (const k of keys) linInsert(h, k);
  return h;
}

export const showLinear = (h: LinearHash): string => h.buckets.map((b, i) => `${i}: [${b.join(", ")}]`).join("; ");

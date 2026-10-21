/**
 * B+ tree insertion in Silberschatz's convention: order n = the most pointers a node holds, so a node holds up to
 * n−1 keys. A leaf that reaches n keys splits ceil(n/2) | rest and copies the right half's first key up; an internal
 * node that reaches n keys (n+1 children) splits around its middle key, which moves up.
 */
export interface BNode {
  leaf: boolean;
  keys: number[];
  children: BNode[];
}

export interface BTree {
  order: number;
  root: BNode;
}

export const newTree = (order: number): BTree => ({ order, root: { leaf: true, keys: [], children: [] } });

interface Split {
  key: number;
  right: BNode;
}

function insertInto(node: BNode, key: number, n: number): Split | null {
  if (node.leaf) {
    if (node.keys.includes(key)) return null;
    node.keys.push(key);
    node.keys.sort((a, b) => a - b);
    if (node.keys.length < n) return null;
    const cut = Math.ceil(n / 2);
    const right: BNode = { leaf: true, keys: node.keys.slice(cut), children: [] };
    node.keys = node.keys.slice(0, cut);
    return { key: right.keys[0], right };
  }
  let i = 0;
  while (i < node.keys.length && key >= node.keys[i]) i++;
  const s = insertInto(node.children[i], key, n);
  if (!s) return null;
  node.keys.splice(i, 0, s.key);
  node.children.splice(i + 1, 0, s.right);
  if (node.keys.length < n) return null;
  const leftChildren = Math.ceil((n + 1) / 2);
  const up = node.keys[leftChildren - 1];
  const right: BNode = { leaf: false, keys: node.keys.slice(leftChildren), children: node.children.slice(leftChildren) };
  node.keys = node.keys.slice(0, leftChildren - 1);
  node.children = node.children.slice(0, leftChildren);
  return { key: up, right };
}

/** Insert in place (duplicates are ignored). */
export function insert(t: BTree, key: number): void {
  const s = insertInto(t.root, key, t.order);
  if (s) t.root = { leaf: false, keys: [s.key], children: [t.root, s.right] };
}

export function build(order: number, keys: readonly number[]): BTree {
  const t = newTree(order);
  for (const k of keys) insert(t, k);
  return t;
}

/** The nodes of each level, root first. */
export function levels(t: BTree): BNode[][] {
  const out: BNode[][] = [];
  let cur = [t.root];
  while (cur.length) {
    out.push(cur);
    cur = cur.flatMap((x) => x.children);
  }
  return out;
}

/** Number of levels (a single leaf is 1). */
export const height = (t: BTree): number => levels(t).length;

export const leaves = (t: BTree): BNode[] => levels(t)[levels(t).length - 1];

/** Nodes read by an exact-match lookup: one per level. */
export const lookupReads = height;

/** "[7 | 12]" per node, nodes of a level separated by spaces. */
export const showLevel = (nodes: BNode[]): string => nodes.map((x) => `[${x.keys.join(" | ")}]`).join("  ");

/** Silberschatz's bound: ceil(log_{ceil(n/2)}(K)) levels at most for K search-key values (integer arithmetic). */
export function maxLevels(order: number, keyCount: number): number {
  const f = Math.ceil(order / 2);
  let h = 0;
  let reach = 1;
  while (reach < keyCount) {
    reach *= f;
    h++;
  }
  return Math.max(h, 1);
}

/** Pointers that fit in a block: the largest n with (n−1)·key + n·pointer ≤ block. */
export function fanout(block: number, keyBytes: number, ptrBytes: number): number {
  return Math.floor((block - ptrBytes) / (keyBytes + ptrBytes)) + 1;
}

/** Fewest levels a tree of order n can have for K keys when every node is full. */
export function minLevels(order: number, keyCount: number): number {
  let h = 1;
  let cap = order - 1;
  while (cap < keyCount) {
    cap *= order;
    h++;
  }
  return h;
}

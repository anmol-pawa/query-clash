import { describe, expect, it } from "vitest";
import { build, fanout, height, insert, leaves, levels, maxLevels, minLevels, newTree, showLevel, type BNode } from "@/lib/dbms/btree";
import { rng, shuffled } from "@/lib/rng";

const shape = (keys: number[], n = 4) => levels(build(n, keys)).map(showLevel);

describe("B+ tree insertion (order 4)", () => {
  it("keeps a single leaf until it overflows, then splits 2 | 2 and copies the key up", () => {
    expect(shape([5, 1, 3])).toEqual(["[1 | 3 | 5]"]);
    expect(shape([5, 1, 3, 7])).toEqual(["[5]", "[1 | 3]  [5 | 7]"]);
  });
  it("splits internal nodes and grows the tree", () => {
    expect(shape([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toEqual(["[7]", "[3 | 5]  [9]", "[1 | 2]  [3 | 4]  [5 | 6]  [7 | 8]  [9 | 10]"]);
  });
  it("ignores duplicates", () => {
    const t = build(4, [1, 2, 3]);
    insert(t, 2);
    expect(t.root.keys).toEqual([1, 2, 3]);
  });
  it("splits an odd order the way ceil(n/2) says (order 3: 2 | 1 leaves)", () => {
    expect(shape([1, 2, 3], 3)).toEqual(["[3]", "[1 | 2]  [3]"]);
  });
});

function check(node: BNode, n: number, isRoot: boolean, depth: number, depths: Set<number>) {
  expect(node.keys.length).toBeLessThanOrEqual(n - 1);
  expect([...node.keys].sort((a, b) => a - b)).toEqual(node.keys);
  if (node.leaf) {
    depths.add(depth);
    if (!isRoot) expect(node.keys.length).toBeGreaterThanOrEqual(Math.ceil((n - 1) / 2));
    return;
  }
  expect(node.children.length).toBe(node.keys.length + 1);
  if (isRoot) expect(node.children.length).toBeGreaterThanOrEqual(2);
  else expect(node.children.length).toBeGreaterThanOrEqual(Math.ceil(n / 2));
  node.children.forEach((c, i) => {
    const lo = i > 0 ? node.keys[i - 1] : -Infinity;
    const hi = i < node.keys.length ? node.keys[i] : Infinity;
    const all = (x: BNode): number[] => (x.leaf ? x.keys : x.children.flatMap(all));
    for (const k of all(c)) {
      expect(k).toBeGreaterThanOrEqual(lo);
      expect(k).toBeLessThan(hi);
    }
    check(c, n, false, depth + 1, depths);
  });
}

describe("B+ tree invariants", () => {
  it("holds for random insertions at every order", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const r = rng(seed);
      const n = 3 + (seed % 5);
      const keys = shuffled(r, Array.from({ length: 5 + (seed % 40) }, (_, i) => i + 1));
      const t = newTree(n);
      for (const k of keys) insert(t, k);
      const depths = new Set<number>();
      check(t.root, n, true, 1, depths);
      expect(depths.size).toBe(1);
      expect(leaves(t).flatMap((l) => l.keys)).toEqual([...keys].sort((a, b) => a - b));
      expect(height(t)).toBeLessThanOrEqual(maxLevels(n, keys.length));
      expect(height(t)).toBeGreaterThanOrEqual(minLevels(n, keys.length));
    }
  });
});

describe("height and fan-out formulas", () => {
  it("matches the textbook examples", () => {
    expect(fanout(4096, 12, 8)).toBe(205); // (204)·12 + 205·8 = 4088 ≤ 4096
    expect(maxLevels(4, 10)).toBe(4); // ceil(log2 10)
    expect(maxLevels(100, 1_000_000)).toBe(4); // ceil(log50 1e6) = ceil(3.53)
    expect(minLevels(4, 3)).toBe(1);
    expect(minLevels(4, 4)).toBe(2);
  });
});

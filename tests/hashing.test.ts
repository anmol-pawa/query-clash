import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { extendibleGen, linearGen, staticOverflowGen } from "@/content/interview/storage";
import { answerText } from "@/game/engine/interview";
import { rng, randInt, shuffled } from "@/lib/rng";
import { extBuckets, extBuild, linBuild, linearAddress, overflowPages, staticBuckets } from "@/lib/dbms/hashing";

describe("extendible hashing", () => {
  it("doubles the directory only when local depth equals global depth", () => {
    const h = extBuild(2, [4, 8, 12]);
    expect(h.globalDepth).toBe(3);
    expect(extBuckets(h).length).toBe(4);
    const full = extBuckets(h).filter((b) => b.keys.length);
    expect(full.map((b) => b.keys.slice().sort((a, b) => a - b))).toEqual(expect.arrayContaining([[8], [4, 12]]));
    const small = extBuild(2, [1, 2, 3]);
    expect(small.globalDepth).toBe(1);
    expect(small.directory.map((b) => b.keys)).toEqual([[2], [1, 3]]);
  });

  it("keeps every key findable, within capacity, with consistent depths (400 random files)", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const r = rng(seed);
      const cap = randInt(r, 1, 4);
      const keys = shuffled(r, Array.from({ length: 200 }, (_, i) => i)).slice(0, randInt(r, 1, 60));
      const h = extBuild(cap, keys);
      expect(h.directory.length).toBe(2 ** h.globalDepth);
      for (const k of keys) expect(h.directory[k & (h.directory.length - 1)].keys).toContain(k);
      const total = extBuckets(h).reduce((s, b) => s + b.keys.length, 0);
      expect(total).toBe(keys.length);
      for (const b of extBuckets(h)) {
        expect(b.keys.length).toBeLessThanOrEqual(cap);
        expect(b.depth).toBeLessThanOrEqual(h.globalDepth);
        const pointers = h.directory.filter((x) => x === b).length;
        expect(pointers).toBe(2 ** (h.globalDepth - b.depth));
        for (const k of b.keys) expect(k & ((1 << b.depth) - 1)).toBe(h.directory.indexOf(b) & ((1 << b.depth) - 1));
      }
    }
  });
});

describe("linear hashing", () => {
  it("splits the bucket at the pointer, not the overflowing one", () => {
    const h = linBuild(4, 2, [4, 8, 12]);
    expect(h.buckets).toEqual([[8], [], [], [], [4, 12]]);
    expect(h.next).toBe(1);
    expect(h.level).toBe(0);
    expect(linearAddress(h, 12)).toBe(4);
    const wrap = linBuild(2, 1, [2, 4, 6, 1, 3]);
    expect(wrap.level).toBeGreaterThanOrEqual(1);
  });

  it("addresses every key correctly (400 random files)", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const r = rng(seed);
      const initial = randInt(r, 1, 5);
      const keys = shuffled(r, Array.from({ length: 150 }, (_, i) => i)).slice(0, randInt(r, 1, 50));
      const h = linBuild(initial, randInt(r, 1, 4), keys);
      expect(h.buckets.length).toBe(initial * 2 ** h.level + h.next);
      for (const k of keys) expect(h.buckets[linearAddress(h, k)]).toContain(k);
      expect(h.buckets.reduce((s, b) => s + b.length, 0)).toBe(keys.length);
    }
  });
});

describe("static hashing", () => {
  it("counts overflow pages", () => {
    const b = staticBuckets(5, [0, 5, 10, 15, 20, 25, 30, 35, 1]);
    expect(b[0].length).toBe(8);
    expect(overflowPages(b, 3)).toBe(2);
  });
});

const keysOf = (q: { tables?: { rows: (string | number)[][] }[] }) => q.tables![0].rows.map((r) => Number(r[1]));

describe("hashing content", () => {
  it("registers generators and keys the fixed answers", () => {
    for (const g of [extendibleGen, linearGen, staticOverflowGen]) expect(GENERATORS).toContain(g);
    const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
    expect(answerText(byId["sto-hash-range"])).toBe("False");
    expect(answerText(byId["sto-ext-double"])).toMatch(/^When the bucket's local depth equals/);
    expect(answerText(byId["sto-lin-nodir"])).toMatch(/^It splits buckets one at a time/);
    const ptr = byId["sto-ext-pointers"];
    expect(ptr.kind === "numeric" && ptr.answer).toBe(2 ** (4 - 2));
    const addr = byId["sto-lin-addr"];
    expect(addr.kind === "numeric" && addr.answer).toBe(14 % 8);
    const load = byId["sto-hash-load"];
    expect(load.kind === "numeric" && load.answer).toBe(Math.ceil(8 / 3) - 1);
  });

  it("generators are deterministic and answered from the keys the player sees", () => {
    const tally = { depth: 0, buckets: 0, next: 0, count: 0, deep: 0, over: new Set<number>() };
    for (let seed = 1; seed <= 300; seed++) {
      for (const g of [extendibleGen, linearGen, staticOverflowGen]) expect(g.generate(seed)).toEqual(g.generate(seed));

      const e = extendibleGen.generate(seed);
      if (e.kind !== "numeric") throw new Error("numeric");
      const cap = Number(/holds (\d) keys/.exec(e.prompt)![1]);
      const h = extBuild(cap, keysOf(e));
      if (e.prompt.includes("global depth?")) {
        expect(e.answer).toBe(h.globalDepth);
        tally.depth++;
      } else {
        expect(e.answer).toBe(extBuckets(h).length);
        tally.buckets++;
      }
      if (h.globalDepth >= 3) tally.deep++;

      const l = linearGen.generate(seed);
      if (l.kind !== "numeric") throw new Error("numeric");
      const m = /starts with (\d) empty buckets.*A page holds (\d) keys/.exec(l.prompt)!;
      const lh = linBuild(Number(m[1]), Number(m[2]), keysOf(l));
      if (l.prompt.includes("split pointer at the end")) {
        expect(l.answer).toBe(lh.next);
        tally.next++;
      } else {
        expect(l.answer).toBe(lh.buckets.length);
        tally.count++;
      }

      const s = staticOverflowGen.generate(seed);
      if (s.kind !== "numeric") throw new Error("numeric");
      const sm = /has (\d) primary buckets.*holds (\d) keys/.exec(s.prompt)!;
      const keys = keysOf(s);
      let over = 0;
      for (let b = 0; b < Number(sm[1]); b++) {
        const n = keys.filter((k) => k % Number(sm[1]) === b).length;
        over += Math.max(0, Math.ceil(n / Number(sm[2])) - 1);
      }
      expect(s.answer).toBe(over);
      tally.over.add(over);
    }
    expect(tally.depth).toBeGreaterThan(100);
    expect(tally.buckets).toBeGreaterThan(100);
    expect(tally.next).toBeGreaterThan(100);
    expect(tally.count).toBeGreaterThan(100);
    expect(tally.deep).toBeGreaterThan(30);
    expect(tally.over.size).toBeGreaterThan(3);
  });
});

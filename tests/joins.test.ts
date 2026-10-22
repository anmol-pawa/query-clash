import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { joinCostGen, joinOrderGen, outerChoiceGen, selectivityGen } from "@/content/interview/query";
import { answerText } from "@/game/engine/interview";
import {
  allJoinTrees,
  blockNestedBest,
  blockNestedTransfers,
  hashJoinTransfers,
  hashPartitions,
  joinSize,
  leftDeepOrders,
  mergeJoinSorted,
  nestedLoopSeeks,
  nestedLoopTransfers,
  sortPasses,
  sortTransfers,
} from "@/lib/dbms/joins";

// Silberschatz, Korth & Sudarshan: customer 10,000 tuples / 400 blocks, depositor 5,000 tuples / 100 blocks.
const customer = { n: 10000, b: 400 };
const depositor = { n: 5000, b: 100 };

describe("join cost model", () => {
  it("matches the textbook customer/depositor example", () => {
    expect(nestedLoopTransfers(depositor, customer)).toBe(2_000_100);
    expect(nestedLoopSeeks(depositor)).toBe(5100);
    expect(nestedLoopTransfers(customer, depositor)).toBe(1_000_400);
    expect(blockNestedTransfers(depositor, customer, 3)).toBe(40_100);
    expect(blockNestedTransfers(customer, depositor, 3)).toBe(40_400);
    expect(blockNestedBest(depositor, customer)).toBe(500);
    expect(mergeJoinSorted(depositor, customer)).toBe(500);
    // 20 memory blocks, depositor as the build input: five partitions, 3 (100 + 400) + 4 * 5 = 1520.
    expect(hashPartitions(depositor, 20)).toBe(5);
    expect(hashJoinTransfers(depositor, customer, depositor, 20)).toBe(1520);
  });

  it("sorts like external merge sort", () => {
    expect(sortPasses(1000, 1000)).toBe(0);
    expect(sortPasses(1000, 11)).toBe(2); // 91 runs, then 10-way merges: 91 -> 10 -> 1
    expect(sortTransfers(1000, 1000)).toBe(1000);
    expect(sortTransfers(1000, 11)).toBe(5000);
  });

  it("estimates sizes and join orders", () => {
    expect(joinSize(5000, 10000, 2500, 10000)).toBe(5000);
    expect(leftDeepOrders(5)).toBe(120);
    expect(allJoinTrees(5)).toBe(1680);
    expect(allJoinTrees(3)).toBe(12);
  });
});

const qry = QUESTIONS.filter((q) => q.id.startsWith("qry-"));
const byId = Object.fromEntries(qry.map((q) => [q.id, q]));

describe("query processing content", () => {
  it("covers every difficulty and the generators are registered", () => {
    expect(qry.length).toBeGreaterThanOrEqual(20);
    expect(qry.every((q) => q.topic === "query")).toBe(true);
    expect([...new Set(qry.map((q) => q.difficulty))].sort()).toEqual([1, 2, 3]);
    expect(new Set(qry.map((q) => q.kind)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(qry.map((q) => q.id)).size).toBe(qry.length);
    for (const g of [joinCostGen, outerChoiceGen, selectivityGen, joinOrderGen]) expect(GENERATORS).toContain(g);
  });

  it("keys the fixed answers", () => {
    expect(answerText(byId["qry-nested-loop"])).toBe("Once per tuple of r");
    expect(answerText(byId["qry-bnl-outer"])).toMatch(/^The smaller one/);
    expect(answerText(byId["qry-hash-eq"])).toBe("False");
    expect(answerText(byId["qry-oracle-plan"])).toMatch(/^EXPLAIN PLAN FOR/);
    const sel = byId["qry-selectivity"];
    expect(sel.kind === "numeric" && sel.answer).toBe(400);
    const ord = byId["qry-join-order-count"];
    expect(ord.kind === "numeric" && ord.answer).toBe(120);
    const mj = byId["qry-which-join"];
    expect(mj.kind === "multi" && mj.answers).toEqual([0, 1]);
  });
});

type Row = (string | number)[];
const rowsOf = (q: { tables?: { rows: Row[] }[] }) => q.tables![0].rows;

describe("query processing generators", () => {
  it("are deterministic and answered from the table the player sees", () => {
    const tally = { nl: 0, bnl: 0, bnlM: 0, hash: 0, merge: 0, sort: 0, outerPos: new Set<number>(), joinQ: 0, selQ: 0, treeQ: 0, leftQ: 0 };
    for (let seed = 1; seed <= 300; seed++) {
      for (const g of [joinCostGen, outerChoiceGen, selectivityGen, joinOrderGen]) expect(g.generate(seed)).toEqual(g.generate(seed));

      const c = joinCostGen.generate(seed);
      if (c.kind !== "numeric") throw new Error("expected numeric");
      const [r, s] = rowsOf(c).map((x) => ({ n: Number(x[1]), b: Number(x[3]) }));
      expect(r.b).toBeGreaterThan(s.b);
      if (c.prompt.startsWith("How many block transfers does a tuple-at-a-time")) {
        expect(c.answer).toBe(r.n * s.b + r.b);
        tally.nl++;
      } else if (c.prompt.includes("worst case")) {
        expect(c.answer).toBe(r.b * s.b + r.b);
        tally.bnl++;
      } else if (c.prompt.startsWith("A block nested-loop")) {
        const m = Number(/has (\d+) buffer blocks/.exec(c.prompt)![1]);
        expect(c.answer).toBe(Math.ceil(s.b / (m - 2)) * r.b + s.b);
        tally.bnlM++;
      } else if (c.prompt.startsWith("Hash join")) {
        const m = Number(/with (\d+) memory blocks/.exec(c.prompt)![1]);
        expect(c.answer).toBe(3 * (r.b + s.b) + 4 * Math.ceil(s.b / m));
        expect(Math.ceil(s.b / m)).toBeLessThanOrEqual(m - 1);
        tally.hash++;
      } else if (c.prompt.startsWith("Both relations are already sorted")) {
        expect(c.answer).toBe(r.b + s.b);
        tally.merge++;
      } else {
        const m = Number(/with (\d+) buffer blocks/.exec(c.prompt)![1]);
        expect(c.answer).toBe(sortTransfers(r.b, m) + sortTransfers(s.b, m) + r.b + s.b);
        tally.sort++;
      }

      const o = outerChoiceGen.generate(seed);
      if (o.kind !== "mcq") throw new Error("expected mcq");
      const [a, b] = rowsOf(o).map((x) => ({ n: Number(x[1]), b: Number(x[3]) }));
      const block = o.prompt.includes("block nested-loop");
      const cost = (x: typeof a, y: typeof b) => (block ? x.b * y.b + x.b : x.n * y.b + x.b);
      const want = cost(a, b) === cost(b, a) ? 2 : cost(a, b) < cost(b, a) ? 0 : 1;
      expect(o.answer).toBe(want);
      expect(new Set(o.choices).size).toBe(4);
      tally.outerPos.add(o.answer);

      const q = selectivityGen.generate(seed);
      if (q.kind !== "numeric") throw new Error("expected numeric");
      const rows = rowsOf(q);
      if (rows.length === 2) {
        expect(q.answer).toBe(Math.ceil((Number(rows[0][1]) * Number(rows[1][1])) / Math.max(Number(rows[0][2]), Number(rows[1][2]))));
        tally.joinQ++;
      } else {
        expect(q.answer).toBe(Math.ceil(Number(rows[0][1]) / Number(rows[0][2])));
        tally.selQ++;
      }

      const j = joinOrderGen.generate(seed);
      if (j.kind !== "mcq") throw new Error("expected mcq");
      const n = Number(/joins (\d) relations/.exec(j.prompt)![1]);
      const trees = j.prompt.includes("join trees");
      expect(j.choices[j.answer]).toBe((trees ? allJoinTrees(n) : leftDeepOrders(n)).toLocaleString("en-US"));
      expect(new Set(j.choices).size).toBe(4);
      if (trees) tally.treeQ++;
      else tally.leftQ++;
    }
    for (const k of ["nl", "bnl", "bnlM", "hash", "merge", "sort"] as const) expect(tally[k]).toBeGreaterThan(30);
    expect(tally.outerPos.has(0) && tally.outerPos.has(1)).toBe(true);
    expect(tally.joinQ).toBeGreaterThan(100);
    expect(tally.selQ).toBeGreaterThan(100);
    expect(tally.treeQ).toBeGreaterThan(100);
    expect(tally.leftQ).toBeGreaterThan(100);
  });
});

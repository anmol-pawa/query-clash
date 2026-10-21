import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { btreeCountGen, btreeHeightGen, btreeRootGen } from "@/content/interview/storage";
import { answerText } from "@/game/engine/interview";
import { build, fanout, height, leaves, maxLevels, minLevels } from "@/lib/dbms/btree";

const sto = QUESTIONS.filter((q) => q.id.startsWith("sto-"));
const byId = Object.fromEntries(sto.map((q) => [q.id, q]));

describe("storage content", () => {
  it("covers every difficulty and the generators are registered", () => {
    expect(sto.length).toBeGreaterThanOrEqual(15);
    expect(sto.every((q) => q.topic === "storage")).toBe(true);
    expect([...new Set(sto.map((q) => q.difficulty))].sort()).toEqual([1, 2, 3]);
    expect(new Set(sto.map((q) => q.kind)).size).toBeGreaterThanOrEqual(4);
    for (const g of [btreeCountGen, btreeRootGen, btreeHeightGen]) expect(GENERATORS).toContain(g);
  });

  it("keys the fixed answers", () => {
    expect(answerText(byId["sto-btree-vs-bplus"])).toMatch(/^Only in the leaves/);
    expect(answerText(byId["sto-split-copy"])).toMatch(/^The smallest key of the new right leaf is copied up/);
    expect(answerText(byId["sto-root-split"])).toBe("When the root splits");
    expect(answerText(byId["sto-hash-eq"])).toBe("False");
    expect(answerText(byId["sto-low-card"])).toMatch(/^Scan the whole table/);
    const fan = byId["sto-fanout"];
    expect(fan.kind === "numeric" && fan.answer).toBe(fanout(4096, 12, 8));
    const fill = byId["sto-min-fill"];
    expect(fill.kind === "numeric" && fill.answer).toBe(Math.ceil((10 - 1) / 2));
    const comp = byId["sto-composite-order"];
    expect(comp.kind === "multi" && comp.answers).toEqual([0, 1, 3]);
  });
});

const keysOf = (q: { tables?: { rows: (string | number)[][] }[] }) => q.tables![0].rows.map((r) => Number(r[1]));
const orderOf = (prompt: string) => Number(/n = (\d)/.exec(prompt)![1]);

describe("storage generators", () => {
  it("are deterministic and answered from the keys the player sees", () => {
    const tally = { leaves: 0, levels: 0, rootPositions: new Set<number>(), tall: 0, maxQ: 0, minQ: 0 };
    for (let seed = 1; seed <= 300; seed++) {
      for (const g of [btreeCountGen, btreeRootGen, btreeHeightGen]) expect(g.generate(seed)).toEqual(g.generate(seed));

      const c = btreeCountGen.generate(seed);
      if (c.kind !== "numeric") throw new Error("expected numeric");
      const t = build(orderOf(c.prompt), keysOf(c));
      expect(c.answer).toBe(c.prompt.includes("leaf nodes") ? leaves(t).length : height(t));
      if (c.prompt.includes("leaf nodes")) tally.leaves++;
      else tally.levels++;
      if (height(t) >= 3) tally.tall++;

      const q = btreeRootGen.generate(seed);
      if (q.kind !== "mcq") throw new Error("expected mcq");
      const rt = build(orderOf(q.prompt), keysOf(q));
      expect(q.choices[q.answer]).toBe(rt.root.keys.join(", "));
      expect(new Set(q.choices).size).toBe(4);
      tally.rootPositions.add(q.answer);

      const h = btreeHeightGen.generate(seed);
      if (h.kind !== "numeric") throw new Error("expected numeric");
      const m = /Blocks are (\d+) bytes, a key takes (\d+) bytes and a pointer (\d+) bytes/.exec(h.prompt)!;
      const records = Number(/has ([\d,]+) distinct/.exec(h.prompt)![1].replace(/,/g, ""));
      const n = fanout(Number(m[1]), Number(m[2]), Number(m[3]));
      expect((n - 1) * Number(m[2]) + n * Number(m[3])).toBeLessThanOrEqual(Number(m[1]));
      expect((n) * Number(m[2]) + (n + 1) * Number(m[3])).toBeGreaterThan(Number(m[1]));
      if (h.prompt.includes("At most")) {
        expect(h.answer).toBe(maxLevels(n, records));
        tally.maxQ++;
      } else {
        expect(h.answer).toBe(minLevels(n, records));
        tally.minQ++;
      }
      expect(h.answer).toBeGreaterThanOrEqual(1);
    }
    expect(tally.leaves).toBeGreaterThan(100);
    expect(tally.levels).toBeGreaterThan(100);
    expect(tally.tall).toBeGreaterThan(30);
    expect(tally.rootPositions.size).toBe(4);
    expect(tally.maxQ).toBeGreaterThan(100);
    expect(tally.minQ).toBeGreaterThan(100);
  });
});

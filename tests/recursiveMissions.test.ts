import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { RECURSIVE_MISSIONS, RECURSIVE_NAIVE } from "@/content/chapters/part4";
import { CODEX } from "@/content/codex";
import { compareResults, evaluate, expectedFor, resetDatabase } from "@/lib/db/engine";
import { lintOracle } from "@/lib/dialect/lint";

let db: PGlite;
beforeAll(async () => {
  db = await PGlite.create();
  await resetDatabase(db);
});

const mission = (id: string) => RECURSIVE_MISSIONS.find((m) => m.id === id)!;
const cells = (r: { rows: unknown[][] } | null, ...cols: number[]) => r!.rows.map((x) => cols.map((c) => String(x[c])).join("|"));

describe("chapter 14 recursive-CTE missions", () => {
  it("has unique ids, valid codex references and a naive query for every mission", () => {
    expect(RECURSIVE_MISSIONS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(RECURSIVE_MISSIONS.map((m) => m.id)).size).toBe(RECURSIVE_MISSIONS.length);
    for (const m of RECURSIVE_MISSIONS) {
      for (const c of m.codex) expect(CODEX.some((e) => e.id === c), c).toBe(true);
      expect(RECURSIVE_NAIVE[m.id], m.id).toBeTruthy();
      expect(m.setup, m.id).toBeTruthy();
    }
    for (const id of ["bom-rollup", "recursive-cycle-guard", "recursive-series", "transitive-closure"]) expect(CODEX.some((e) => e.id === id), id).toBe(true);
  });

  for (const m of RECURSIVE_MISSIONS) {
    it(`${m.id}: both dialects agree, hidden data is survived and the naive query fails`, async () => {
      expect(() => lintOracle(m.solution.oracle)).not.toThrow();
      expect(m.solution.oracle).not.toMatch(/RECURSIVE/i);
      const pg = await expectedFor(db, m, "postgres");
      const ora = await expectedFor(db, m, "oracle");
      expect(pg?.rows.length ?? 0).toBeGreaterThan(0);
      expect(compareResults(pg, ora, !!m.ordered)).toEqual({ ok: true });
      expect(m.hints.length).toBeGreaterThanOrEqual(3);
      expect((await evaluate(db, m, m.solution.postgres, "postgres")).correct).toBe(true);
      expect((await evaluate(db, m, m.solution.oracle, "oracle")).correct).toBe(true);
      expect((await evaluate(db, m, RECURSIVE_NAIVE[m.id], "postgres")).correct, "naive must fail").toBe(false);
    });
  }

  it("hidden-data missions: the naive query passes the visible data and fails only the hidden case", async () => {
    for (const id of ["c14-bom", "c14-reach", "c14-calendar", "c14-closure", "c14-loop-finder"]) {
      const m = mission(id);
      expect(m.hidden, id).toBeTruthy();
      expect((await evaluate(db, { ...m, id: `${id}#vis`, hidden: undefined }, RECURSIVE_NAIVE[id], "postgres")).correct, `${id} visible`).toBe(true);
      const v = await evaluate(db, m, RECURSIVE_NAIVE[id], "postgres");
      expect(v.correct, `${id} hidden`).toBe(false);
      expect(v.hidden, id).toBeDefined();
    }
  });

  it("bill of materials: bolts = 4 (frame) + 2 wheels x 1 hub x 6 = 16, plus 4 from the hidden seat", async () => {
    const m = mission("c14-bom");
    expect(cells(await expectedFor(db, m, "postgres"), 0, 1)).toEqual(["BOLT|16", "RIM|2", "SPOKE|64", "TUBE|3"]);
    const h = await expectedFor(db, { ...m, id: "c14-bom#h", setup: `${m.setup}\n${m.hidden}` }, "postgres");
    expect(cells(h, 0, 1)).toContain("BOLT|20");
  });

  it("reachability from 1 is {2,3,4,5} despite the 5 -> 2 loop; the hidden chain adds 8 and 9", async () => {
    const m = mission("c14-reach");
    expect(cells(await expectedFor(db, m, "postgres"), 0)).toEqual(["2", "3", "4", "5"]);
    const h = await expectedFor(db, { ...m, id: "c14-reach#h", setup: `${m.setup}\n${m.hidden}` }, "postgres");
    expect(cells(h, 0)).toEqual(["2", "3", "4", "5", "8", "9"]);
  });

  it("shortest paths match a JS Dijkstra over the same roads", async () => {
    const edges: [string, string, number][] = [["A", "B", 4], ["A", "C", 2], ["C", "B", 1], ["B", "D", 5], ["C", "D", 10], ["D", "E", 3], ["E", "A", 1]];
    const dist: Record<string, number> = { A: 0 };
    const done = new Set<string>();
    for (;;) {
      const open = Object.keys(dist).filter((k) => !done.has(k)).sort((a, b) => dist[a] - dist[b])[0];
      if (!open) break;
      done.add(open);
      for (const [s, d, w] of edges) if (s === open && (dist[d] === undefined || dist[open] + w < dist[d])) dist[d] = dist[open] + w;
    }
    const want = Object.keys(dist).filter((k) => k !== "A").sort().map((k) => `${k}|${dist[k]}`);
    expect(cells(await expectedFor(db, mission("c14-shortest"), "postgres"), 0, 1)).toEqual(want);
    expect(want).toEqual(["B|3", "C|2", "D|8", "E|11"]);
  });

  it("calendar has all ten days with zero-count quiet days", async () => {
    const r = await expectedFor(db, mission("c14-calendar"), "postgres");
    expect(r!.rows.length).toBe(10);
    expect(r!.rows.map((x) => Number(x[1]))).toEqual([2, 1, 0, 3, 0, 0, 1, 0, 0, 1]);
  });

  it("transitive closure has 8 pairs, and the hidden diamond does not add duplicates", async () => {
    const m = mission("c14-closure");
    const r = await expectedFor(db, m, "postgres");
    expect(r!.rows.length).toBe(8);
    const h = await expectedFor(db, { ...m, id: "c14-closure#h", setup: `${m.setup}\n${m.hidden}` }, "postgres");
    expect(new Set(cells(h, 0, 1)).size).toBe(h!.rows.length);
    expect(cells(h, 0, 1)).toContain("DB|PROG");
  });

  it("loop finder lists 5, 6, 7 only (8 reports into the loop; the chain 2-4 is clean); hidden adds the 4-loop", async () => {
    const m = mission("c14-loop-finder");
    expect(cells(await expectedFor(db, m, "postgres"), 0)).toEqual(["5", "6", "7"]);
    const h = await expectedFor(db, { ...m, id: "c14-loop#h", setup: `${m.setup}\n${m.hidden}` }, "postgres");
    expect(cells(h, 0)).toEqual(["5", "6", "7", "11", "12", "13", "14"]);
  });
});

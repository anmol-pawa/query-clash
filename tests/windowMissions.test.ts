import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { WINDOW_MISSIONS, WINDOW_NAIVE } from "@/content/chapters/part4";
import { CODEX } from "@/content/codex";
import { compareResults, evaluate, expectedFor, resetDatabase } from "@/lib/db/engine";
import { lintOracle } from "@/lib/dialect/lint";

let db: PGlite;
beforeAll(async () => {
  db = await PGlite.create();
  await resetDatabase(db);
});

const mission = (id: string) => WINDOW_MISSIONS.find((m) => m.id === id)!;
const rows = async (sql: string) => (await db.query<Record<string, string | number>>(sql)).rows;

describe("chapter 13 window-function missions", () => {
  it("has unique ids, valid codex references and a naive query for every mission", () => {
    expect(WINDOW_MISSIONS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(WINDOW_MISSIONS.map((m) => m.id)).size).toBe(WINDOW_MISSIONS.length);
    for (const m of WINDOW_MISSIONS) {
      for (const c of m.codex) expect(CODEX.some((e) => e.id === c), c).toBe(true);
      expect(WINDOW_NAIVE[m.id], m.id).toBeTruthy();
    }
    for (const id of ["window-frames", "last-value-trap", "ntile-cume-dist"]) expect(CODEX.some((e) => e.id === id), id).toBe(true);
  });

  for (const m of WINDOW_MISSIONS) {
    it(`${m.id}: both dialects agree, hidden data is survived and the naive query fails`, async () => {
      expect(() => lintOracle(m.solution.oracle)).not.toThrow();
      const pg = await expectedFor(db, m, "postgres");
      const ora = await expectedFor(db, m, "oracle");
      expect(pg?.rows.length ?? 0).toBeGreaterThan(0);
      expect(compareResults(pg, ora, !!m.ordered)).toEqual({ ok: true });
      expect(m.hints.length).toBeGreaterThanOrEqual(3);
      expect((await evaluate(db, m, m.solution.postgres, "postgres")).correct).toBe(true);
      expect((await evaluate(db, m, m.solution.oracle, "oracle")).correct).toBe(true);
      expect((await evaluate(db, m, WINDOW_NAIVE[m.id], "postgres")).correct, "naive must fail").toBe(false);
    });
  }

  it("hidden-data missions: the naive query passes the visible data and fails only the hidden case", async () => {
    for (const id of ["c13-running-rows", "c13-top-two-ties"]) {
      const m = mission(id);
      expect(m.hidden, id).toBeTruthy();
      expect((await evaluate(db, { ...m, hidden: undefined }, WINDOW_NAIVE[id], "postgres")).correct, `${id} visible`).toBe(true);
      const v = await evaluate(db, m, WINDOW_NAIVE[id], "postgres");
      expect(v.correct, `${id} hidden`).toBe(false);
      expect(v.hidden, id).toBeDefined();
    }
  });

  it("running balance equals a hand-rolled JS fold", async () => {
    const got = (await expectedFor(db, mission("c13-running-rows"), "postgres"))!.rows;
    const src = await rows("SELECT account_id, txn_id, amount FROM transactions WHERE account_id <= 3 ORDER BY account_id, txn_date, txn_id");
    let acc = -1, sum = 0;
    src.forEach((r, i) => {
      if (Number(r.account_id) !== acc) { acc = Number(r.account_id); sum = 0; }
      sum += Number(r.amount);
      expect(Number(got[i][3])).toBeCloseTo(sum, 2);
    });
    expect(got.length).toBe(src.length);
  });

  it("LAST_VALUE with the widened frame equals the department maximum", async () => {
    const got = (await expectedFor(db, mission("c13-last-value"), "postgres"))!.rows;
    const max = await rows("SELECT dept_id, MAX(salary) m FROM employees GROUP BY dept_id");
    for (const r of got) expect(Number(r[3])).toBe(Number(max.find((x) => Number(x.dept_id) === Number(r[1]))!.m));
  });

  it("30-day RANGE sum matches a JS window over day numbers", async () => {
    const got = (await expectedFor(db, mission("c13-range-days"), "postgres"))!.rows;
    const src = await rows("SELECT account_id, txn_id, amount, (txn_date - DATE '2024-01-01') AS d FROM transactions WHERE account_id <= 3 ORDER BY account_id, txn_date, txn_id");
    src.forEach((r, i) => {
      const exp = src.filter((o) => o.account_id === r.account_id && Number(o.d) <= Number(r.d) && Number(o.d) >= Number(r.d) - 29).reduce((s, o) => s + Number(o.amount), 0);
      expect(Number(got[i][2])).toBeCloseTo(exp, 2);
    });
  });

  it("NTILE bucket sizes for 26 employees are 7/7/6/6 (extras go to the first buckets)", async () => {
    const got = (await expectedFor(db, mission("c13-ntile"), "postgres"))!;
    expect(got.rows.length).toBe(26);
    expect([1, 2, 3, 4].map((q) => got.rows.filter((x) => Number(x[2]) === q).length)).toEqual([7, 7, 6, 6]);
  });

  it("PERCENT_RANK / CUME_DIST: ties share a value, the lowest is 0 and the highest is 1", async () => {
    const got = (await expectedFor(db, mission("c13-cume-dist"), "postgres"))!.rows;
    expect(Number(got[0][2])).toBe(0);
    expect(Number(got[got.length - 1][3])).toBe(1);
    const tied = got.filter((r) => Number(r[1]) === 128000);
    expect(tied.length).toBe(2);
    expect(tied[0][2]).toEqual(tied[1][2]);
    expect(tied[0][3]).toEqual(tied[1][3]);
  });

  it("LAG default: the first transaction of every account has gap 0", async () => {
    const got = (await expectedFor(db, mission("c13-lag-default"), "postgres"))!.rows;
    const firsts = new Set<number>();
    for (const r of got) if (!firsts.has(Number(r[1]))) { firsts.add(Number(r[1])); expect(Number(r[2])).toBe(0); }
    expect(firsts.size).toBeGreaterThan(5);
  });

  it("top two with ties: the employee without a department is excluded, the hidden tie adds a row", async () => {
    const m = mission("c13-top-two-ties");
    const base = (await expectedFor(db, m, "postgres"))!;
    const hidden = (await expectedFor(db, { ...m, id: "c13-top#h", setup: m.hidden }, "postgres"))!;
    expect(hidden.rows.length).toBe(base.rows.length + 1);
    const nullDept = await rows("SELECT COUNT(*)::int n FROM employees WHERE dept_id IS NULL");
    expect(Number(nullDept[0].n)).toBe(1);
    expect(base.rows.every((r) => r[0] !== null)).toBe(true);
  });
});

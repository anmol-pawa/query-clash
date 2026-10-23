import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { SQL_MISSIONS } from "@/content/interview/sql";
import type { SqlQuestion } from "@/content/interview/types";
import { compareResults, evaluate, expectedFor, resetDatabase } from "@/lib/db/engine";
import { lintOracle } from "@/lib/dialect/lint";
import { correctResponse, grade } from "@/game/engine/interview";

let db: PGlite;
beforeAll(async () => {
  db = await PGlite.create();
  await resetDatabase(db);
});

const sqlQs = QUESTIONS.filter((q): q is SqlQuestion => q.kind === "sql");

describe("interview SQL bank", () => {
  it("has a question per mission and unique ids", () => {
    expect(sqlQs.length).toBe(SQL_MISSIONS.length);
    expect(new Set(sqlQs.map((q) => q.id)).size).toBe(sqlQs.length);
    for (const q of sqlQs) expect(SQL_MISSIONS.some((m) => m.id === q.missionId), q.id).toBe(true);
  });

  for (const m of SQL_MISSIONS) {
    it(`${m.id}: both dialects agree and return rows`, async () => {
      expect(() => lintOracle(m.solution.oracle)).not.toThrow();
      const pg = await expectedFor(db, m, "postgres");
      const ora = await expectedFor(db, m, "oracle");
      expect(pg?.rows.length ?? 0, "reference result is empty").toBeGreaterThan(0);
      expect(compareResults(pg, ora, !!m.ordered)).toEqual({ ok: true });
      expect(m.hints.length).toBe(3);
    });
    it(`${m.id}: the reference passes and a wrong query fails`, async () => {
      expect((await evaluate(db, m, m.solution.postgres, "postgres")).correct).toBe(true);
      expect((await evaluate(db, m, "SELECT 1 AS x", "postgres")).correct).toBe(false);
    });
  }

  it("known answers on the arena data", async () => {
    const get = async (id: string) => (await expectedFor(db, SQL_MISSIONS.find((m) => m.id === id)!, "postgres"))!.rows;
    const dist = await db.query<{ s: string }>("SELECT salary::text AS s FROM employees GROUP BY salary ORDER BY salary DESC");
    expect(String((await get("iq-nth-salary"))[0][0])).toBe(String(Number(dist.rows[2].s)));
    expect(String((await get("iq-second-highest-no-window"))[0][0])).toBe(String(Number(dist.rows[1].s)));
    const orders = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM orders");
    const pivot = (await get("iq-pivot-status"))[0].reduce<number>((a, b) => a + Number(b), 0);
    expect(pivot).toBe(orders.rows[0].n);
  });

  it("known answers for the extended bank", async () => {
    const get = async (id: string) => (await expectedFor(db, SQL_MISSIONS.find((m) => m.id === id)!, "postgres"))!.rows;
    const n = async (sql: string) => Number((await db.query<{ n: number }>(sql)).rows[0].n);
    // org tree levels cover every employee exactly once
    const levels = (await get("iq-org-depth")).reduce((a, r) => a + Number(r[1]), 0);
    expect(levels).toBe(await n("SELECT COUNT(*)::int AS n FROM employees"));
    // headcount includes the empty department and sums to the employees that have a department
    const hc = await get("iq-dept-headcount");
    expect(hc.some((r) => Number(r[1]) === 0)).toBe(true);
    expect(hc.reduce((a, r) => a + Number(r[1]), 0)).toBe(await n("SELECT COUNT(*)::int AS n FROM employees WHERE dept_id IS NOT NULL"));
    // payroll shares add up to 100 (within rounding)
    expect(Math.abs((await get("iq-payroll-share")).reduce((a, r) => a + Number(r[1]), 0) - 100)).toBeLessThan(0.5);
    // median agrees with a hand computation on the sorted salaries
    const sal = (await db.query<{ s: string }>("SELECT salary::text AS s FROM employees ORDER BY salary")).rows.map((r) => Number(r.s));
    const mid = sal.length % 2 ? sal[(sal.length - 1) / 2] : (sal[sal.length / 2 - 1] + sal[sal.length / 2]) / 2;
    expect(Number((await get("iq-median-salary"))[0][0])).toBeCloseTo(mid, 2);
    // unsold products and idle accounts match NOT IN over non-null keys
    expect((await get("iq-unsold-products")).length).toBe(await n("SELECT COUNT(*)::int AS n FROM products WHERE product_id NOT IN (SELECT product_id FROM order_items WHERE product_id IS NOT NULL)"));
    expect((await get("iq-idle-accounts")).length).toBe(await n("SELECT COUNT(*)::int AS n FROM accounts WHERE account_id NOT IN (SELECT account_id FROM transactions WHERE account_id IS NOT NULL)"));
    // total revenue by category equals revenue of order lines whose product has a category
    const cat = (await get("iq-category-revenue")).reduce((a, r) => a + Number(r[1]), 0);
    const tot = Number((await db.query<{ t: string }>("SELECT SUM(oi.quantity * oi.unit_price)::text AS t FROM order_items oi JOIN products p ON p.product_id = oi.product_id WHERE p.category_id IS NOT NULL")).rows[0].t);
    expect(cat).toBeCloseTo(tot, 2);
  });

  it("grade accepts only a correct sql verdict", () => {
    const q = sqlQs[0];
    expect(grade(q, correctResponse(q))).toBe(true);
    expect(grade(q, { kind: "sql", correct: false })).toBe(false);
    expect(grade(q, { kind: "mcq", choice: 0 })).toBe(false);
  });
});

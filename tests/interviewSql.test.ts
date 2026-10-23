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

describe("interview SQL bank, D5 additions", () => {
  it("has at least 38 missions", () => {
    expect(SQL_MISSIONS.length).toBeGreaterThanOrEqual(38);
  });

  it("known answers recomputed independently", async () => {
    const get = async (id: string) => (await expectedFor(db, SQL_MISSIONS.find((m) => m.id === id)!, "postgres"))!.rows;
    const q = async (sql: string) => (await db.query<Record<string, string | number>>(sql)).rows;
    // managers with >= 2 reports
    const mgr = await q("SELECT manager_id AS id, COUNT(*)::int AS n FROM employees WHERE manager_id IS NOT NULL GROUP BY manager_id HAVING COUNT(*) >= 2");
    expect((await get("iq-managers-reports")).length).toBe(mgr.length);
    // order status shares add up to 100 (within rounding)
    expect(Math.abs((await get("iq-status-share")).reduce((a, r) => a + Number(r[1]), 0) - 100)).toBeLessThan(0.5);
    // second orders: one per customer with >= 2 orders
    const multi = await q("SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) >= 2");
    expect((await get("iq-second-order")).length).toBe(multi.length);
    expect((await get("iq-customer-lifespan")).length).toBe(multi.length);
    // big orders and popular products
    const big = await q("SELECT order_id FROM (SELECT order_id, COUNT(*) c FROM order_items GROUP BY order_id) t WHERE c >= 3");
    expect((await get("iq-big-orders")).length).toBe(big.length);
    for (const r of await get("iq-popular-products")) {
      const c = await q(`SELECT COUNT(DISTINCT o.customer_id)::int AS n FROM order_items oi JOIN orders o USING (order_id) WHERE oi.product_id = ${Number(r[0])}`);
      expect(Number(c[0].n)).toBe(Number(r[1]));
      expect(Number(r[1])).toBeGreaterThanOrEqual(3);
    }
    // at most two products per category, and the first row of each category is its best seller
    const top = await get("iq-top2-per-category");
    const per = new Map<number, number>();
    for (const r of top) per.set(Number(r[0]), (per.get(Number(r[0])) ?? 0) + 1);
    expect(Math.max(...per.values())).toBeLessThanOrEqual(2);
    const best = await q("SELECT MAX(rev)::text AS m FROM (SELECT p.category_id, p.product_id, SUM(oi.quantity * oi.unit_price) AS rev FROM order_items oi JOIN products p USING (product_id) WHERE p.category_id IS NOT NULL GROUP BY 1, 2) t");
    expect(Math.max(...top.map((r) => Number(r[2])))).toBeCloseTo(Number(best[0].m), 2);
    // above-average budgets
    const avg = await q("SELECT dept_name FROM departments WHERE budget > (SELECT AVG(budget) FROM departments)");
    expect((await get("iq-dept-above-budget-avg")).length).toBe(avg.length);
  });
});

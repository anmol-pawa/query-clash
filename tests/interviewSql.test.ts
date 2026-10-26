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

describe("hidden test cases", () => {
  const withHidden = SQL_MISSIONS.filter((m) => m.hidden);

  it("covers the classic edge-case questions", () => {
    expect(withHidden.map((m) => m.id)).toEqual(
      expect.arrayContaining(["iq-nth-salary", "iq-second-highest-no-window", "iq-top-per-dept", "iq-running-total", "iq-latest-order"]),
    );
  });

  for (const m of withHidden) {
    it(`${m.id}: the reference passes the hidden data in both dialects`, async () => {
      expect((await evaluate(db, m, m.solution.postgres, "postgres")).correct).toBe(true);
      expect((await evaluate(db, m, m.solution.oracle, "oracle")).correct).toBe(true);
    });
  }

  it("a naive query passes the visible data but fails the hidden case", async () => {
    const naives = (await import("@/content/interview/sql")).SQL_NAIVE;
    expect(Object.keys(naives).length).toBeGreaterThanOrEqual(5);
    for (const [id, sql] of Object.entries(naives)) {
      const m = SQL_MISSIONS.find((x) => x.id === id)!;
      const without = { ...m, hidden: undefined };
      expect((await evaluate(db, without, sql, "postgres")).correct, `${id} naive should pass visible`).toBe(true);
      const v = await evaluate(db, m, sql, "postgres");
      expect(v.correct, `${id} naive should fail hidden`).toBe(false);
      expect(v.hidden, id).toBeDefined();
      expect(v.reason).toMatch(/hidden test case/);
    }
  });
});

describe("F2 missions", () => {
  beforeAll(async () => {
    await resetDatabase(db);
  });
  const get = async (id: string) => (await expectedFor(db, SQL_MISSIONS.find((m) => m.id === id)!, "postgres"))!.rows;
  const rows = async (sql: string) => (await db.query<Record<string, string | number>>(sql)).rows;

  it("management chain climbs 116 -> 112 -> 110 -> 101 -> 100", async () => {
    expect((await get("iq-management-chain")).map((r) => [Number(r[0]), Number(r[2])])).toEqual([[116, 1], [112, 2], [110, 3], [101, 4], [100, 5]]);
  });

  it("txn bursts match a hand-rolled JS sessionizer", async () => {
    const t = await rows("SELECT account_id, txn_id, to_char(txn_date, 'YYYY-MM-DD') AS d FROM transactions ORDER BY account_id, txn_date, txn_id");
    const expected: (string | number)[][] = [];
    let prev: { acc: number; ms: number } | null = null;
    for (const r of t) {
      const acc = Number(r.account_id);
      const ms = Date.parse(`${r.d}T00:00:00Z`);
      const start = !prev || prev.acc !== acc || (ms - prev.ms) / 86400000 > 30;
      if (start) expected.push([acc, expected.filter((e) => e[0] === acc).length + 1, 0, String(r.d)]);
      expected[expected.length - 1][2] = Number(expected[expected.length - 1][2]) + 1;
      prev = { acc, ms };
    }
    const got = (await get("iq-txn-bursts")).map((r) => [Number(r[0]), Number(r[1]), Number(r[2]), String(r[3]).slice(0, 10)]);
    expect(got).toEqual(expected);
  });

  it("latest two orders agrees with an independent ranking", async () => {
    const all = await rows("SELECT customer_id, order_id FROM orders ORDER BY customer_id, order_date DESC, order_id DESC");
    const seen = new Map<number, number>();
    const expected: number[][] = [];
    for (const r of all) {
      const c = Number(r.customer_id);
      const n = seen.get(c) ?? 0;
      if (n < 2) expected.push([c, Number(r.order_id)]);
      seen.set(c, n + 1);
    }
    expect((await get("iq-latest-two-orders-lateral")).map((r) => [Number(r[0]), Number(r[1])])).toEqual(expected);
  });
});

describe("F2 boundary", () => {
  beforeAll(async () => {
    await resetDatabase(db);
  });
  it("the visible data has a gap of exactly 30 days that must stay inside one burst", async () => {
    const r = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM (SELECT txn_date - LAG(txn_date) OVER (PARTITION BY account_id ORDER BY txn_date, txn_id) AS g FROM transactions) t WHERE g = 30");
    expect(r.rows[0].n).toBeGreaterThan(0);
    const q = await expectedFor(db, SQL_MISSIONS.find((m) => m.id === "iq-txn-bursts")!, "postgres");
    expect(q!.rows.filter((x) => Number(x[0]) === 13).length).toBe(4); // Jan 8 | Apr 13 + May 10 | Aug 2 | Oct 6 + Nov 5 (30 days apart)
  });
});

describe("F2b answers", () => {
  const rows = async (sql: string) => (await db.query<Record<string, unknown>>(sql)).rows;
  const get = async (id: string) => (await expectedFor(db, SQL_MISSIONS.find((m) => m.id === id)!, "postgres"))!.rows;
  beforeAll(async () => {
    await resetDatabase(db);
  });

  it("NOT IN with a NULL manager returns nothing, NOT EXISTS returns the leaf employees", async () => {
    expect(await rows("SELECT emp_id FROM employees WHERE emp_id NOT IN (SELECT manager_id FROM employees)")).toHaveLength(0);
    const mgrs = new Set((await rows("SELECT manager_id FROM employees WHERE manager_id IS NOT NULL")).map((r) => Number(r.manager_id)));
    const all = (await rows("SELECT emp_id FROM employees ORDER BY emp_id")).map((r) => Number(r.emp_id));
    expect((await get("iq-non-managers-not-exists")).map((r) => Number(r[0]))).toEqual(all.filter((e) => !mgrs.has(e)));
  });

  it("month series is gap-free and covers every order", async () => {
    const res = (await get("iq-monthly-orders-zero-fill")).map((r) => [String(r[0]), Number(r[1])]);
    const dates = (await rows("SELECT to_char(order_date, 'YYYY-MM') AS ym FROM orders")).map((r) => String(r.ym));
    const sorted = [...dates].sort();
    const [lo, hi] = [sorted[0], sorted[sorted.length - 1]];
    const expected: [string, number][] = [];
    let [y, mo] = lo.split("-").map(Number);
    for (;;) {
      const ym = `${y}-${String(mo).padStart(2, "0")}`;
      expected.push([ym, dates.filter((d) => d === ym).length]);
      if (ym === hi) break;
      mo++;
      if (mo > 12) {
        mo = 1;
        y++;
      }
    }
    expect(res).toEqual(expected);
  });

  it("median per department matches a JS median", async () => {
    const sal = await rows("SELECT dept_id, salary::float8 AS s FROM employees WHERE dept_id IS NOT NULL ORDER BY dept_id, salary");
    const by = new Map<number, number[]>();
    for (const r of sal) by.set(Number(r.dept_id), [...(by.get(Number(r.dept_id)) ?? []), Number(r.s)]);
    const expected = [...by].sort((a, b) => a[0] - b[0]).map(([d, v]) => [d, v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2]);
    expect((await get("iq-median-salary-dept")).map((r) => [Number(r[0]), Number(r[1])])).toEqual(expected);
    expect(expected.some(([d]) => (by.get(d as number)!.length % 2) === 0)).toBe(true);
  });

  it("retention agrees with a JS set computation", async () => {
    const o = await rows("SELECT DISTINCT customer_id, to_char(order_date, 'YYYY-MM') AS ym FROM orders");
    const key = (c: unknown, ym: string) => `${c}|${ym}`;
    const present = new Set(o.map((r) => key(r.customer_id, String(r.ym))));
    const prevYm = (ym: string) => {
      const [y, m] = ym.split("-").map(Number);
      return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
    };
    const months = [...new Set(o.map((r) => String(r.ym)))].sort();
    const expected = months.map((ym) => {
      const cs = o.filter((r) => r.ym === ym).map((r) => r.customer_id);
      return [ym, cs.length, cs.filter((c) => present.has(key(c, prevYm(ym)))).length];
    });
    expect((await get("iq-monthly-retention")).map((r) => [String(r[0]), Number(r[1]), Number(r[2])])).toEqual(expected);
    expect(expected.some((e) => Number(e[2]) > 0)).toBe(true);
  });
});

describe("F2c answers", () => {
  const get = async (id: string) => (await expectedFor(db, SQL_MISSIONS.find((m) => m.id === id)!, "postgres"))!.rows;
  beforeAll(async () => {
    await resetDatabase(db);
  });

  it("BOM explosion multiplies quantities down every path (2 wheels x 32 spokes, bolts from two assemblies)", async () => {
    const got = (await get("iq-bom-explosion")).map((r) => [String(r[0]), Number(r[1])]);
    // BIKE = 1 FRAME(4 TUBE, 6 BOLT) + 2 WHEEL(1 RIM, 32 SPOKE, 1 TIRE) + 1 HANDLEBAR(2 GRIP, 2 BOLT); SCOOTER rows excluded
    expect(got).toEqual([["BOLT", 8], ["GRIP", 2], ["RIM", 2], ["SPOKE", 64], ["TIRE", 2], ["TUBE", 4]]);
  });

  it("funnel matches a JS recount and never increases", async () => {
    const c = (await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM customers")).rows[0].n;
    const per = (await db.query<{ o: number; d: number }>("SELECT COUNT(o.order_id)::int AS o, COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END)::int AS d FROM customers c LEFT JOIN orders o USING (customer_id) GROUP BY c.customer_id")).rows;
    const expected = [c, per.filter((r) => r.o >= 1).length, per.filter((r) => r.d >= 1).length, per.filter((r) => r.d >= 2).length];
    const got = (await get("iq-customer-funnel"))[0].map(Number);
    expect(got).toEqual(expected);
    expect(got[0]).toBeGreaterThan(got[1]); // customers who never order exist, so starting from orders would undercount
    expect(got[1] >= got[2] && got[2] >= got[3]).toBe(true);
  });

  it("fragile shipments per hub match a JS aggregation of the JSON", async () => {
    const all = (await db.query<{ details: { hub: string; weight_kg: number; fragile: boolean } }>("SELECT details FROM shipments")).rows;
    const by = new Map<string, [number, number]>();
    for (const { details: d } of all) if (d.fragile) by.set(d.hub, [(by.get(d.hub)?.[0] ?? 0) + 1, (by.get(d.hub)?.[1] ?? 0) + d.weight_kg]);
    const expected = [...by].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([h, [n, kg]]) => [h, n, Math.round(kg * 10) / 10]);
    const got = (await get("iq-json-fragile-by-hub")).map((r) => [String(r[0]), Number(r[1]), Math.round(Number(r[2]) * 10) / 10]);
    expect(got).toEqual(expected);
    expect(expected.length).toBeGreaterThan(1);
  });
});

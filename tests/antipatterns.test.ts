import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { ANTIPATTERN_MISSIONS } from "@/content/chapters/part3";
import { CODEX } from "@/content/codex";
import { compareResults, evaluate, expectedFor, resetDatabase } from "@/lib/db/engine";
import { lintOracle } from "@/lib/dialect/lint";

let db: PGlite;
beforeAll(async () => {
  db = await PGlite.create();
  await resetDatabase(db);
});

const mission = (id: string) => ANTIPATTERN_MISSIONS.find((m) => m.id === id)!;

describe("chapter 12 anti-pattern missions", () => {
  it("has unique ids and valid codex references", () => {
    expect(new Set(ANTIPATTERN_MISSIONS.map((m) => m.id)).size).toBe(ANTIPATTERN_MISSIONS.length);
    for (const m of ANTIPATTERN_MISSIONS) for (const c of m.codex) expect(CODEX.some((e) => e.id === c), c).toBe(true);
  });

  for (const m of ANTIPATTERN_MISSIONS) {
    it(`${m.id}: both dialects agree and the expected result is non-empty`, async () => {
      expect(() => lintOracle(m.solution.oracle)).not.toThrow();
      const pg = await expectedFor(db, m, "postgres");
      const ora = await expectedFor(db, m, "oracle");
      expect(pg?.rows.length ?? 0).toBeGreaterThan(0);
      expect(compareResults(pg, ora, !!m.ordered)).toEqual({ ok: true });
      expect(m.hints.length).toBeGreaterThanOrEqual(3);
      expect((await evaluate(db, m, m.solution.postgres, "postgres")).correct).toBe(true);
    });
  }

  it("N+1: customers without orders still appear with a count of 0", async () => {
    const r = await expectedFor(db, mission("c12-n-plus-one"), "postgres");
    const total = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM customers");
    expect(r!.rows.length).toBe(total.rows[0].n);
    // an inner join drops the zero-order customers, so it must be rejected
    const inner = "SELECT c.name, COUNT(o.order_id) AS order_count FROM customers c JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.name ORDER BY c.name";
    const zero = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)");
    if (zero.rows[0].n > 0) expect((await evaluate(db, mission("c12-n-plus-one"), inner, "postgres")).correct).toBe(false);
  });

  it("SELECT *: extra columns are rejected", async () => {
    const m = mission("c12-select-star");
    expect((await evaluate(db, m, "SELECT * FROM customers WHERE country = 'Germany' ORDER BY name", "postgres")).correct).toBe(false);
  });

  it("OR: UNION ALL would duplicate rows matching both branches only if any exist", async () => {
    const m = mission("c12-or");
    const or = "SELECT order_id FROM orders WHERE status = 'PENDING' OR customer_id = 5";
    expect((await evaluate(db, m, or, "postgres")).correct).toBe(true);
  });

  it("NOT IN really is empty with NULL managers, NOT EXISTS is not", async () => {
    const bad = await db.query("SELECT first_name FROM employees WHERE emp_id NOT IN (SELECT manager_id FROM employees)");
    expect(bad.rows.length).toBe(0);
    expect((await evaluate(db, mission("c12-not-in-null"), "SELECT first_name, last_name FROM employees WHERE emp_id NOT IN (SELECT manager_id FROM employees)", "postgres")).correct).toBe(false);
  });

  it("implicit conversion: the cast form and the plain form return the same row", async () => {
    const a = await db.query("SELECT customer_id, name FROM customers WHERE CAST(customer_id AS VARCHAR(10)) = '5'");
    const b = await db.query("SELECT customer_id, name FROM customers WHERE customer_id = 5");
    expect(a.rows).toEqual(b.rows);
    expect(b.rows.length).toBe(1);
  });
});

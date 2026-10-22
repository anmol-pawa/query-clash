import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { INDEXING_MISSIONS } from "@/content/chapters/part3";
import { CODEX } from "@/content/codex";
import { compareResults, evaluate, expectedFor, resetDatabase } from "@/lib/db/engine";
import { lintOracle } from "@/lib/dialect/lint";

let db: PGlite;
beforeAll(async () => {
  db = await PGlite.create();
  await resetDatabase(db);
});

describe("chapter 11 indexing missions", () => {
  it("has unique ids and valid codex references", () => {
    expect(new Set(INDEXING_MISSIONS.map((m) => m.id)).size).toBe(INDEXING_MISSIONS.length);
    for (const m of INDEXING_MISSIONS) for (const c of m.codex) expect(CODEX.some((e) => e.id === c), c).toBe(true);
  });

  for (const m of INDEXING_MISSIONS) {
    it(`${m.id}: both dialects agree and the check is non-empty`, async () => {
      expect(() => lintOracle(m.solution.oracle)).not.toThrow();
      const pg = await expectedFor(db, m, "postgres");
      const ora = await expectedFor(db, m, "oracle");
      expect(pg?.rows.length ?? 0).toBeGreaterThan(0);
      expect(compareResults(pg, ora, !!m.ordered)).toEqual({ ok: true });
      expect(m.hints.length).toBeGreaterThanOrEqual(3);
    });
  }

  it("the index checks really count the index (no index scores 0)", async () => {
    for (const m of INDEXING_MISSIONS.filter((x) => !x.setup)) {
      const v = await evaluate(db, m, "SELECT 1", "postgres");
      expect(v.correct, m.id).toBe(false);
    }
  });

  it("a wrong column order is rejected, the right one accepted", async () => {
    const m = INDEXING_MISSIONS[0];
    expect((await evaluate(db, m, "CREATE INDEX idx_orders_cust_date ON orders (order_date, customer_id)", "postgres")).correct).toBe(false);
    expect((await evaluate(db, m, "CREATE INDEX idx_orders_cust_date ON orders (customer_id, order_date)", "oracle")).correct).toBe(true);
  });

  it("dropping the wrong index in the redundancy mission fails", async () => {
    const m = INDEXING_MISSIONS.find((x) => x.id === "c11-redundant")!;
    expect((await evaluate(db, m, "DROP INDEX idx_orders_cust_date", "postgres")).correct).toBe(false);
    expect((await evaluate(db, m, "DROP INDEX idx_orders_cust", "oracle")).correct).toBe(true);
  });
});

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

  it("grade accepts only a correct sql verdict", () => {
    const q = sqlQs[0];
    expect(grade(q, correctResponse(q))).toBe(true);
    expect(grade(q, { kind: "sql", correct: false })).toBe(false);
    expect(grade(q, { kind: "mcq", choice: 0 })).toBe(false);
  });
});

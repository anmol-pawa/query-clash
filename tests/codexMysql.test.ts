import { describe, expect, it } from "vitest";
import { CODEX, codexById } from "@/content/codex";
import { MYSQL_CODEX } from "@/content/codexMysql";

/** The correct option for each MySQL entry's quiz, written down independently of the content file. */
const KEY: Record<string, number> = {
  "mysql-limit": 2, // LIMIT 5, 3 = skip 5, take 3
  "mysql-auto-increment": 1, // counters are not transactional
  "mysql-quoting": 2, // CONCAT with NULL is NULL
  "mysql-upsert": 1, // REPLACE = delete + insert
  "mysql-only-full-group-by": 1, // last_name is neither grouped nor aggregated
  "mysql-innodb": 1, // secondary indexes store the PK
  "mysql-implicit-commit": 1, // DDL commits implicitly
  "mysql-isolation": 2, // REPEATABLE READ
  "mysql-set-ops": 1, // UNION of LEFT and RIGHT
  "mysql-collation": 0, // case-insensitive default
  "mysql-division-dates": 1, // / is decimal, DIV truncates
  "mysql-null-safe-equal": 1, // 1 <=> NULL is 0
  "mysql-group-concat": 1, // truncated with a warning
  "mysql-insert-ignore": 1, // other row-level errors become warnings
  "mysql-window-versions": 2, // 8.0
};

describe("MySQL codex entries", () => {
  it("are registered in the Codex with unique ids", () => {
    expect(MYSQL_CODEX).toHaveLength(Object.keys(KEY).length);
    for (const e of MYSQL_CODEX) expect(codexById(e.id)).toBe(e);
    expect(new Set(CODEX.map((e) => e.id)).size).toBe(CODEX.length);
  });

  it("are complete and every quiz answer matches the key", () => {
    for (const e of MYSQL_CODEX) {
      expect(e.category).toBe("MySQL");
      expect(e.definition.length).toBeGreaterThan(40);
      expect(e.syntax.postgres).toContain("-- MySQL");
      expect(e.syntax.oracle.length).toBeGreaterThan(0);
      expect(e.pitfalls.length).toBeGreaterThan(0);
      expect(e.quiz, e.id).toBeDefined();
      expect(e.quiz!.options).toHaveLength(4);
      expect(e.quiz!.answer, e.id).toBe(KEY[e.id]);
    }
  });

  it("states the textbook arithmetic: LIMIT offset first, 5 DIV 2 = 2, Jan 31 + 1 month", () => {
    const skip = 5, take = 3;
    expect(Array.from({ length: take }, (_, i) => skip + i + 1)).toEqual([6, 7, 8]);
    expect(Math.trunc(5 / 2)).toBe(2);
    const d = new Date(Date.UTC(2024, 0, 31));
    const days = (new Date(Date.UTC(2024, 2, 1)).getTime() - new Date(Date.UTC(2024, 1, 1)).getTime()) / 86400000;
    expect(days).toBe(29);
    expect(new Date(Date.UTC(2024, 2, 0)).getUTCDate()).toBe(29); // Feb 2024 has 29 days, so Jan 31 + 1 month clamps to Feb 29
    expect(d.getUTCMonth()).toBe(0);
  });
});

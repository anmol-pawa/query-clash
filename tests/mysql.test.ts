import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { compareResults, resetDatabase, runScript } from "@/lib/db/engine";
import { transpileMysql } from "@/lib/dialect/mysql";

let db: PGlite;
beforeAll(async () => {
  db = await PGlite.create();
  await resetDatabase(db);
});

describe("transpileMysql text", () => {
  const t = (s: string) => transpileMysql(s).sql;
  it("backticks and double-quoted strings", () => {
    expect(t("SELECT `emp_id` FROM `employees` WHERE last_name = \"King\"")).toBe(`SELECT "emp_id" FROM "employees" WHERE last_name = 'King'`);
  });
  it("leaves single-quoted strings and comments alone", () => {
    expect(t("SELECT 'a`b\"c' -- `x`\n, 1")).toContain("'a`b\"c'");
  });
  it("drops # comments", () => {
    expect(t("SELECT 1 # why\n, 2")).toBe("SELECT 1\n, 2");
  });
  it("LIMIT offset, count", () => {
    expect(t("SELECT 1 LIMIT 5, 10")).toBe("SELECT 1 LIMIT 10 OFFSET 5");
  });
  it("<=>", () => {
    expect(t("SELECT a <=> b")).toBe("SELECT a IS NOT DISTINCT FROM b");
  });
  it("reports notes", () => {
    expect(transpileMysql("SELECT IFNULL(a, 1) FROM `t`").notes.length).toBe(2);
  });
});

/** Each MySQL query must return exactly what the hand-written PostgreSQL does. */
const PAIRS: [string, string, string, boolean?][] = [
  ["ifnull", "SELECT emp_id, IFNULL(commission_pct, 0) AS c FROM employees", "SELECT emp_id, COALESCE(commission_pct, 0) AS c FROM employees"],
  ["backticks", "SELECT `emp_id`, `last_name` FROM `employees`", "SELECT emp_id, last_name FROM employees"],
  ["double-quoted string", `SELECT emp_id FROM employees WHERE last_name = "King"`, "SELECT emp_id FROM employees WHERE last_name = 'King'"],
  [
    "if()",
    "SELECT emp_id, IF(salary > 5000, 'high', 'low') AS band FROM employees",
    "SELECT emp_id, CASE WHEN salary > 5000 THEN 'high' ELSE 'low' END AS band FROM employees",
  ],
  [
    "nested if()",
    "SELECT emp_id, IF(salary > 9000, 'A', IF(salary > 5000, 'B', 'C')) AS g FROM employees",
    "SELECT emp_id, CASE WHEN salary > 9000 THEN 'A' WHEN salary > 5000 THEN 'B' ELSE 'C' END AS g FROM employees",
  ],
  ["limit offset,count", "SELECT emp_id FROM employees ORDER BY emp_id LIMIT 3, 4", "SELECT emp_id FROM employees ORDER BY emp_id LIMIT 4 OFFSET 3", true],
  [
    "group_concat",
    "SELECT dept_id, GROUP_CONCAT(last_name ORDER BY last_name SEPARATOR '; ') AS names FROM employees GROUP BY dept_id",
    "SELECT dept_id, string_agg(last_name::text, '; ' ORDER BY last_name) AS names FROM employees GROUP BY dept_id",
  ],
  [
    "group_concat distinct default separator",
    "SELECT GROUP_CONCAT(DISTINCT country) AS c FROM (SELECT country FROM customers ORDER BY country) x",
    "SELECT string_agg(DISTINCT country::text, ',') AS c FROM (SELECT country FROM customers ORDER BY country) x",
  ],
  [
    "null-safe equals",
    "SELECT e.emp_id FROM employees e JOIN employees m ON e.manager_id <=> m.manager_id WHERE e.emp_id < 3",
    "SELECT e.emp_id FROM employees e JOIN employees m ON e.manager_id IS NOT DISTINCT FROM m.manager_id WHERE e.emp_id < 3",
  ],
  ["curdate", "SELECT CURDATE() = CURRENT_DATE AS same", "SELECT CURRENT_DATE = CURRENT_DATE AS same"],
];

describe("transpileMysql runs on PGlite", () => {
  for (const [name, my, pg, ordered] of PAIRS) {
    it(name, async () => {
      const a = await runScript(db, transpileMysql(my).sql, "postgres");
      const b = await runScript(db, pg, "postgres");
      expect(a.ok, JSON.stringify(a)).toBe(true);
      expect(b.ok).toBe(true);
      if (a.ok && b.ok && a.result && b.result) {
        expect(compareResults(a.result, b.result, ordered ?? false).ok).toBe(true);
      }
    });
  }
});

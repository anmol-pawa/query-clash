import type { CodexEntry } from "./types";

/**
 * MySQL differences: a third dialect note set. These entries are not tied to
 * missions (the game runs PostgreSQL and Oracle), so they are read through the
 * Codex's study mode. In each entry the "postgres" syntax box also carries the
 * MySQL form, headed by a comment, and the "oracle" box carries Oracle's form.
 */
export const MYSQL_CODEX: CodexEntry[] = [
  {
    id: "mysql-limit",
    title: "LIMIT, OFFSET and the comma form",
    category: "MySQL",
    definition:
      "MySQL pages results with LIMIT. It accepts LIMIT n OFFSET m and the older LIMIT m, n, where the offset comes FIRST. PostgreSQL has LIMIT/OFFSET too; Oracle uses FETCH FIRST n ROWS ONLY (12c+) or ROWNUM before that.",
    syntax: {
      postgres: "-- MySQL (both forms return rows 21-30)\nSELECT * FROM orders ORDER BY order_id LIMIT 10 OFFSET 20;\nSELECT * FROM orders ORDER BY order_id LIMIT 20, 10;\n\n-- PostgreSQL\nSELECT * FROM orders ORDER BY order_id LIMIT 10 OFFSET 20;",
      oracle: "-- Oracle 12c+\nSELECT * FROM orders ORDER BY order_id\nOFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;",
    },
    enterprise:
      "Deep OFFSET pages get slower the further you go, because the server still reads and discards every skipped row. Large listings use keyset pagination (WHERE order_id > :last ORDER BY order_id LIMIT 10) in all three databases.",
    pitfalls: ["LIMIT 20, 10 means skip 20, take 10; it is easy to read it backwards.", "Without a unique ORDER BY the pages can overlap or skip rows."],
    quiz: {
      q: "In MySQL, which rows does LIMIT 5, 3 return (in sorted order)?",
      options: ["Rows 1-5", "Rows 5-7", "Rows 6-8", "Rows 3-7"],
      answer: 2,
      why: "The comma form is LIMIT offset, count: skip 5 rows, then return 3, so rows 6, 7 and 8.",
    },
  },
  {
    id: "mysql-auto-increment",
    title: "AUTO_INCREMENT vs identity and sequences",
    category: "MySQL",
    definition:
      "MySQL numbers rows with an AUTO_INCREMENT column attribute. PostgreSQL uses GENERATED ... AS IDENTITY (or serial) backed by a sequence; Oracle 12c+ has identity columns and older code uses a sequence plus a trigger.",
    syntax: {
      postgres: "-- MySQL\nCREATE TABLE t (id INT AUTO_INCREMENT PRIMARY KEY, v TEXT);\nSELECT LAST_INSERT_ID();\n\n-- PostgreSQL\nCREATE TABLE t (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, v TEXT);\nINSERT INTO t (v) VALUES ('x') RETURNING id;",
      oracle: "-- Oracle 12c+\nCREATE TABLE t (id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, v VARCHAR2(50));\nINSERT INTO t (v) VALUES ('x') RETURNING id INTO :new_id;",
    },
    enterprise:
      "Auto-generated keys are never gap-free: rolled-back inserts, failed statements and cache preallocation all burn numbers. Do not use them as invoice numbers that must be consecutive.",
    pitfalls: ["LAST_INSERT_ID() is per connection, so another session cannot disturb it.", "Inserting an explicit larger id moves the counter past it."],
    quiz: {
      q: "An INSERT into an AUTO_INCREMENT table is rolled back. What happens to the number it used?",
      options: ["It is reused by the next insert", "It is lost, leaving a gap", "The table is renumbered", "It is reserved for a retry"],
      answer: 1,
      why: "Counters are not transactional. The number is consumed even when the transaction rolls back, so gaps appear.",
    },
  },
  {
    id: "mysql-quoting",
    title: "Quoting, || and CONCAT in MySQL",
    category: "MySQL",
    definition:
      "MySQL quotes identifiers with backticks (`order`), not double quotes: by default a double-quoted token is a string. The || operator means logical OR unless the PIPES_AS_CONCAT mode is on, so concatenate with CONCAT(). CONCAT returns NULL if any argument is NULL; CONCAT_WS skips NULL arguments.",
    syntax: {
      postgres: "-- MySQL\nSELECT CONCAT(first_name, ' ', last_name) AS name FROM `employees`;\nSELECT CONCAT_WS(' ', first_name, middle_name, last_name) FROM employees;\n\n-- PostgreSQL\nSELECT first_name || ' ' || last_name AS name FROM \"employees\";",
      oracle: "-- Oracle\nSELECT first_name || ' ' || last_name AS name FROM employees;",
    },
    enterprise:
      "SQL written for PostgreSQL or Oracle moves to MySQL with a few predictable edits: identifier quotes, || and string literals. Setting sql_mode to ANSI makes MySQL follow the standard, but most MySQL code assumes the defaults.",
    pitfalls: ["'a' || 'b' in MySQL is a boolean OR of two strings, not 'ab'.", "CONCAT('a', NULL) is NULL in MySQL; Oracle's || treats NULL as an empty string."],
    quiz: {
      q: "What does SELECT CONCAT('a', NULL, 'b') return in MySQL?",
      options: ["ab", "a b", "NULL", "An error"],
      answer: 2,
      why: "CONCAT returns NULL when any argument is NULL. CONCAT_WS would skip the NULL instead.",
    },
  },
  {
    id: "mysql-upsert",
    title: "Upsert: ON DUPLICATE KEY UPDATE",
    category: "MySQL",
    definition:
      "To insert-or-update in one statement MySQL uses INSERT ... ON DUPLICATE KEY UPDATE, which fires when the new row would violate a PRIMARY KEY or UNIQUE index. PostgreSQL uses ON CONFLICT (cols) DO UPDATE and Oracle uses MERGE. MySQL's REPLACE INTO is different: it deletes the old row and inserts a new one.",
    syntax: {
      postgres: "-- MySQL\nINSERT INTO stock (sku, qty) VALUES ('A1', 5)\nON DUPLICATE KEY UPDATE qty = qty + VALUES(qty);\n\n-- PostgreSQL\nINSERT INTO stock (sku, qty) VALUES ('A1', 5)\nON CONFLICT (sku) DO UPDATE SET qty = stock.qty + EXCLUDED.qty;",
      oracle: "-- Oracle\nMERGE INTO stock s\nUSING (SELECT 'A1' sku, 5 qty FROM dual) n ON (s.sku = n.sku)\nWHEN MATCHED THEN UPDATE SET s.qty = s.qty + n.qty\nWHEN NOT MATCHED THEN INSERT (sku, qty) VALUES (n.sku, n.qty);",
    },
    enterprise:
      "Upserts make idempotent loads and counters safe under concurrency, because the check and the write are one atomic statement instead of SELECT-then-INSERT.",
    pitfalls: ["REPLACE INTO removes the old row, so columns you did not list reset to defaults and ON DELETE CASCADE can fire.", "ON DUPLICATE KEY UPDATE reacts to ANY unique index, not only the primary key."],
    quiz: {
      q: "Why is REPLACE INTO riskier than INSERT ... ON DUPLICATE KEY UPDATE?",
      options: ["It is slower to parse", "It deletes the existing row and inserts a new one", "It ignores the new values", "It only works on views"],
      answer: 1,
      why: "REPLACE is delete plus insert, so unlisted columns return to defaults and delete triggers and cascades can run.",
    },
  },
  {
    id: "mysql-only-full-group-by",
    title: "ONLY_FULL_GROUP_BY",
    category: "MySQL",
    definition:
      "Since MySQL 5.7.5 the ONLY_FULL_GROUP_BY mode is on by default: every selected column must be in GROUP BY, be inside an aggregate, or be functionally dependent on the grouped key. Older MySQL (and servers with the mode off) silently picked an arbitrary row's value. ANY_VALUE() states that you accept any value.",
    syntax: {
      postgres: "-- MySQL\nSELECT dept_id, ANY_VALUE(job_title), COUNT(*)\nFROM employees GROUP BY dept_id;\n\n-- PostgreSQL (same rule, always enforced; no ANY_VALUE before 16)\nSELECT dept_id, COUNT(*) FROM employees GROUP BY dept_id;",
      oracle: "-- Oracle enforces it too (ORA-00979)\nSELECT dept_id, COUNT(*) FROM employees GROUP BY dept_id;",
    },
    enterprise:
      "Legacy MySQL applications sometimes depend on the permissive behaviour and break on upgrade. The fix is to correct the query, not to turn the mode off.",
    pitfalls: ["With the mode off, non-grouped columns return values from an unpredictable row.", "Grouping by the primary key lets you select that table's other columns, since they depend on it."],
    quiz: {
      q: "With ONLY_FULL_GROUP_BY on, which query is rejected?",
      options: ["SELECT dept_id, COUNT(*) ... GROUP BY dept_id", "SELECT dept_id, last_name ... GROUP BY dept_id", "SELECT COUNT(*) FROM employees", "SELECT dept_id ... GROUP BY dept_id"],
      answer: 1,
      why: "last_name is neither grouped nor aggregated, and dept_id does not determine it.",
    },
  },
  {
    id: "mysql-innodb",
    title: "InnoDB: clustered primary key",
    category: "MySQL",
    definition:
      "InnoDB, MySQL's default engine, is transactional with row-level locks and MVCC. It stores the table itself as a B+ tree ordered by the primary key (a clustered index); every secondary index entry holds the primary-key value, not a physical row address. MyISAM, the old default, has no transactions.",
    syntax: {
      postgres: "-- MySQL\nCREATE TABLE orders (\n  order_id BIGINT PRIMARY KEY,\n  customer_id INT,\n  KEY idx_cust (customer_id)\n) ENGINE=InnoDB;\n\n-- PostgreSQL stores a heap; indexes point to row locations (ctid)\nCREATE TABLE orders (order_id BIGINT PRIMARY KEY, customer_id INT);\nCREATE INDEX idx_cust ON orders (customer_id);",
      oracle: "-- Oracle's equivalent of a clustered table is an index-organized table\nCREATE TABLE orders (order_id NUMBER PRIMARY KEY, customer_id NUMBER)\nORGANIZATION INDEX;",
    },
    enterprise:
      "Because secondary indexes carry the primary key, a wide or random primary key (a UUID v4) bloats every index and fragments inserts. Short, monotonically increasing keys keep InnoDB tables compact.",
    pitfalls: ["A lookup through a secondary index needs a second descent into the clustered index unless the index covers the query.", "Changing a primary key value moves the whole row."],
    quiz: {
      q: "What does an InnoDB secondary index entry store to find the full row?",
      options: ["A physical page address", "The primary-key value", "A row timestamp", "A hash of the row"],
      answer: 1,
      why: "Secondary entries store the primary key, which is then looked up in the clustered index.",
    },
  },
  {
    id: "mysql-implicit-commit",
    title: "DDL and implicit commit",
    category: "MySQL",
    definition:
      "In MySQL most DDL statements (CREATE, ALTER, DROP, TRUNCATE) end the current transaction with an implicit commit and cannot be rolled back. Oracle behaves the same way. PostgreSQL DDL is transactional: you can roll back a CREATE or ALTER.",
    syntax: {
      postgres: "-- MySQL: the ALTER commits the INSERT first\nSTART TRANSACTION;\nINSERT INTO t VALUES (1);\nALTER TABLE t ADD COLUMN c INT;\nROLLBACK;  -- too late, row 1 stays\n\n-- PostgreSQL: all of it rolls back\nBEGIN;\nINSERT INTO t VALUES (1);\nALTER TABLE t ADD COLUMN c INT;\nROLLBACK;",
      oracle: "-- Oracle: DDL also commits implicitly\nINSERT INTO t VALUES (1);\nALTER TABLE t ADD c NUMBER;\nROLLBACK;  -- row 1 stays",
    },
    enterprise:
      "Schema migrations in PostgreSQL can be wrapped in one transaction so a failure leaves nothing half-applied. On MySQL and Oracle a failed migration needs hand-written recovery steps.",
    pitfalls: ["TRUNCATE is DDL, so unlike DELETE it cannot be rolled back in MySQL or Oracle.", "A migration script that fails midway on MySQL leaves the earlier steps applied."],
    quiz: {
      q: "In MySQL, you START TRANSACTION, INSERT a row, run ALTER TABLE, then ROLLBACK. Is the row still there?",
      options: ["No, ROLLBACK undoes everything", "Yes, ALTER committed it first", "Only if the ALTER failed", "The ALTER is rejected"],
      answer: 1,
      why: "DDL causes an implicit commit, which makes the INSERT permanent before the ROLLBACK runs.",
    },
  },
  {
    id: "mysql-isolation",
    title: "Default isolation: REPEATABLE READ",
    category: "MySQL",
    definition:
      "InnoDB's default isolation level is REPEATABLE READ, where plain SELECTs read one snapshot taken at the first read. PostgreSQL and Oracle default to READ COMMITTED. InnoDB also takes next-key (row plus gap) locks on locking reads, which blocks inserts into the scanned range and prevents phantoms.",
    syntax: {
      postgres: "-- MySQL\nSELECT @@transaction_isolation;   -- REPEATABLE-READ\nSET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;\n\n-- PostgreSQL\nSHOW transaction_isolation;       -- read committed\nBEGIN ISOLATION LEVEL REPEATABLE READ;",
      oracle: "-- Oracle\nALTER SESSION SET ISOLATION_LEVEL = SERIALIZABLE;  -- default is READ COMMITTED",
    },
    enterprise:
      "Gap locks make MySQL range updates and SELECT ... FOR UPDATE block unrelated inserts, a frequent source of deadlocks. Many shops switch to READ COMMITTED to reduce locking.",
    pitfalls: ["Within one REPEATABLE READ transaction a plain SELECT does not see rows committed later by others, but UPDATE and locking reads do.", "Code tested on PostgreSQL's READ COMMITTED can behave differently on MySQL."],
    quiz: {
      q: "What is the default isolation level of MySQL InnoDB?",
      options: ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"],
      answer: 2,
      why: "InnoDB defaults to REPEATABLE READ; PostgreSQL and Oracle default to READ COMMITTED.",
    },
  },
  {
    id: "mysql-set-ops",
    title: "FULL OUTER JOIN and set operations",
    category: "MySQL",
    definition:
      "MySQL has no FULL OUTER JOIN. Emulate it by UNIONing a LEFT JOIN with the right-only rows. INTERSECT and EXCEPT arrived in MySQL 8.0.31; older versions use joins or EXISTS. CTEs and window functions need MySQL 8.0 or later.",
    syntax: {
      postgres: "-- MySQL: emulate FULL OUTER JOIN\nSELECT * FROM a LEFT JOIN b ON a.id = b.id\nUNION\nSELECT * FROM a RIGHT JOIN b ON a.id = b.id;\n\n-- PostgreSQL\nSELECT * FROM a FULL OUTER JOIN b ON a.id = b.id;",
      oracle: "-- Oracle\nSELECT * FROM a FULL OUTER JOIN b ON a.id = b.id;",
    },
    enterprise:
      "When porting reports, check the target MySQL version first: a 5.7 server has no window functions or CTEs at all, which changes how much SQL has to be rewritten.",
    pitfalls: ["UNION removes duplicates, so genuinely duplicate rows vanish from the emulation; UNION ALL with a WHERE a.id IS NULL on the right half avoids that.", "Oracle calls EXCEPT by the name MINUS."],
    quiz: {
      q: "How do you get a FULL OUTER JOIN result in MySQL?",
      options: ["Use FULL JOIN", "UNION a LEFT JOIN and a RIGHT JOIN", "Use CROSS JOIN", "Enable ANSI mode"],
      answer: 1,
      why: "MySQL lacks FULL OUTER JOIN, so the left and right outer joins are combined with UNION.",
    },
  },
  {
    id: "mysql-collation",
    title: "Case-insensitive comparisons and empty strings",
    category: "MySQL",
    definition:
      "MySQL's default collations (such as utf8mb4_0900_ai_ci) are case- and accent-insensitive, so 'abc' = 'ABC' is true and a UNIQUE index treats them as duplicates. PostgreSQL and Oracle compare case-sensitively by default. Oracle also treats the empty string '' as NULL; MySQL and PostgreSQL do not.",
    syntax: {
      postgres: "-- MySQL\nSELECT 'abc' = 'ABC';                    -- 1\nSELECT 'abc' = 'ABC' COLLATE utf8mb4_bin;  -- 0\n\n-- PostgreSQL\nSELECT 'abc' = 'ABC';                    -- false\nSELECT lower('abc') = lower('ABC');      -- true",
      oracle: "-- Oracle\nSELECT CASE WHEN 'abc' = 'ABC' THEN 1 ELSE 0 END FROM dual;  -- 0\nSELECT CASE WHEN '' IS NULL THEN 'null' ELSE 'empty' END FROM dual;  -- null",
    },
    enterprise:
      "Login names and emails that must be unique 'ignoring case' come for free on MySQL but need lower(email) indexes or citext on PostgreSQL. Migrating data between the engines can produce duplicate-key errors for exactly this reason.",
    pitfalls: ["A case-insensitive collation can stop an index being used for a case-sensitive search if you force another collation on the column.", "Oracle: WHERE col = '' never matches anything, because the literal is NULL."],
    quiz: {
      q: "With MySQL's default collation, what does SELECT 'abc' = 'ABC' return?",
      options: ["1 (true)", "0 (false)", "NULL", "An error"],
      answer: 0,
      why: "The default collation is case-insensitive, so the comparison is true.",
    },
  },
  {
    id: "mysql-division-dates",
    title: "Division and date arithmetic",
    category: "MySQL",
    definition:
      "In MySQL, / always gives a decimal (5 / 2 = 2.5000) and DIV is integer division (5 DIV 2 = 2). PostgreSQL divides integers as integers (5 / 2 = 2); Oracle returns 2.5. For dates, MySQL adds intervals with DATE_ADD(d, INTERVAL n DAY) and counts days between dates with DATEDIFF(a, b).",
    syntax: {
      postgres: "-- MySQL\nSELECT 5 / 2, 5 DIV 2;                     -- 2.5000, 2\nSELECT DATE_ADD('2024-01-31', INTERVAL 1 MONTH);  -- 2024-02-29\nSELECT DATEDIFF('2024-03-01', '2024-02-01');      -- 29\n\n-- PostgreSQL\nSELECT 5 / 2, 5.0 / 2;                    -- 2, 2.5\nSELECT DATE '2024-01-31' + INTERVAL '1 month';\nSELECT DATE '2024-03-01' - DATE '2024-02-01';  -- 29",
      oracle: "-- Oracle\nSELECT 5 / 2 FROM dual;                    -- 2.5\nSELECT ADD_MONTHS(DATE '2024-01-31', 1) FROM dual;\nSELECT DATE '2024-03-01' - DATE '2024-02-01' FROM dual;  -- 29",
    },
    enterprise:
      "Integer-division surprises silently change reports when SQL moves between engines (average-per-user figures come out as whole numbers on PostgreSQL). Always cast one side when you mean decimals.",
    pitfalls: ["Adding one month to a month-end clamps to the last valid day in all three engines (Jan 31 + 1 month = Feb 29 in 2024).", "MySQL DATEDIFF ignores the time part and takes the later date first."],
    quiz: {
      q: "What do 5 / 2 and 5 DIV 2 return in MySQL?",
      options: ["2 and 2", "2.5000 and 2", "2.5000 and 2.5000", "2 and 3"],
      answer: 1,
      why: "/ is decimal division; DIV truncates to an integer.",
    },
  },
  {
    id: "mysql-null-safe-equal",
    title: "NULL-safe equality: <=>",
    category: "MySQL",
    definition:
      "In every SQL engine NULL = NULL is unknown, not true. MySQL adds the NULL-safe operator <=>, which returns 1 when both sides are equal or both NULL. PostgreSQL spells it IS NOT DISTINCT FROM; Oracle has no operator, so people write (a = b OR (a IS NULL AND b IS NULL)) or use DECODE(a, b, 1, 0).",
    syntax: {
      postgres: "-- MySQL\nSELECT NULL = NULL, NULL <=> NULL, 1 <=> NULL;   -- NULL, 1, 0\n\n-- PostgreSQL\nSELECT NULL IS NOT DISTINCT FROM NULL;          -- true",
      oracle: "-- Oracle\nSELECT DECODE(NULL, NULL, 1, 0) FROM dual;     -- 1 (DECODE treats two NULLs as equal)",
    },
    enterprise:
      "Joining or diffing two tables on nullable columns silently drops the NULL rows with plain =. Change-detection queries use the NULL-safe form so that NULL to NULL counts as unchanged.",
    pitfalls: ["<=> never returns NULL, unlike =.", "An index may not be used for a NULL-safe comparison in every engine; check the plan."],
    quiz: {
      q: "In MySQL, what does SELECT 1 <=> NULL return?",
      options: ["1", "0", "NULL", "An error"],
      answer: 1,
      why: "<=> is NULL-safe: one side is NULL and the other is not, so the answer is false (0), never NULL.",
    },
  },
  {
    id: "mysql-group-concat",
    title: "GROUP_CONCAT vs STRING_AGG vs LISTAGG",
    category: "MySQL",
    definition:
      "Joining the values of a group into one string is GROUP_CONCAT in MySQL, STRING_AGG in PostgreSQL and LISTAGG in Oracle. MySQL truncates the result at group_concat_max_len (1024 bytes by default) without an error, only a warning.",
    syntax: {
      postgres: "-- MySQL\nSELECT dept_id, GROUP_CONCAT(name ORDER BY name SEPARATOR ', ') FROM employees GROUP BY dept_id;\n\n-- PostgreSQL\nSELECT dept_id, STRING_AGG(name, ', ' ORDER BY name) FROM employees GROUP BY dept_id;",
      oracle: "-- Oracle\nSELECT dept_id, LISTAGG(name, ', ') WITHIN GROUP (ORDER BY name) FROM employees GROUP BY dept_id;",
    },
    enterprise:
      "A silently truncated list is a classic reporting bug: the string looks fine but the last names are missing. Raise group_concat_max_len or aggregate in the application when lists can be long. Oracle's LISTAGG raises ORA-01489 instead when the result exceeds 4000 bytes.",
    pitfalls: ["The default separator in MySQL is a comma with no space.", "NULL values are skipped by all three aggregates."],
    quiz: {
      q: "A MySQL GROUP_CONCAT result is longer than group_concat_max_len. What happens by default?",
      options: ["An error is raised", "The result is cut off with a warning", "NULL is returned", "The limit grows automatically"],
      answer: 1,
      why: "MySQL truncates the string and only raises a warning, so the data loss is easy to miss.",
    },
  },
  {
    id: "mysql-insert-ignore",
    title: "INSERT IGNORE and ON CONFLICT",
    category: "MySQL",
    definition:
      "INSERT IGNORE skips rows that would violate a unique key, but it also downgrades other errors (such as a value too long or a bad type) to warnings and stores a coerced value. PostgreSQL's INSERT ... ON CONFLICT DO NOTHING ignores only unique conflicts. Oracle uses MERGE, or the IGNORE_ROW_ON_DUPKEY_INDEX hint.",
    syntax: {
      postgres: "-- MySQL\nINSERT IGNORE INTO tags (name) VALUES ('sql');\n\n-- PostgreSQL\nINSERT INTO tags (name) VALUES ('sql') ON CONFLICT (name) DO NOTHING;",
      oracle: "-- Oracle\nMERGE INTO tags t USING (SELECT 'sql' AS name FROM dual) s ON (t.name = s.name)\nWHEN NOT MATCHED THEN INSERT (name) VALUES (s.name);",
    },
    enterprise:
      "Idempotent loaders use these forms so a retried batch does not fail on rows already inserted. Prefer the narrow form (ON CONFLICT or ON DUPLICATE KEY UPDATE) so real data errors are not swallowed.",
    pitfalls: ["INSERT IGNORE can hide truncation of strings and out-of-range numbers.", "Ignored rows still consume AUTO_INCREMENT values in InnoDB."],
    quiz: {
      q: "Besides duplicate keys, what else does MySQL's INSERT IGNORE turn into a warning?",
      options: ["Nothing, only duplicates", "Other row-level errors such as a too-long string", "Syntax errors", "Permission errors"],
      answer: 1,
      why: "IGNORE downgrades many data errors to warnings and stores an adjusted value, which is why it is riskier than ON CONFLICT DO NOTHING.",
    },
  },
  {
    id: "mysql-window-versions",
    title: "Window functions and CTEs need MySQL 8",
    category: "MySQL",
    definition:
      "MySQL added window functions (ROW_NUMBER, RANK, LAG, SUM() OVER) and CTEs, including WITH RECURSIVE, in version 8.0. In 5.7 and earlier they do not exist and people used user variables or self joins. PostgreSQL has had both for years and Oracle has had analytic functions since 8i.",
    syntax: {
      postgres: "-- MySQL 8.0+\nSELECT name, salary, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS r FROM employees;\n\n-- PostgreSQL (identical)\nSELECT name, salary, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS r FROM employees;",
      oracle: "-- Oracle (identical)\nSELECT name, salary, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS r FROM employees;",
    },
    enterprise:
      "Check the server version before porting top-N-per-group queries. On MySQL 5.7 the same result needs a correlated subquery or a self join, which is slower and easier to get wrong.",
    pitfalls: ["MariaDB added window functions in 10.2, on a different version line from MySQL.", "MySQL has no QUALIFY clause; filter a window result in an outer query."],
    quiz: {
      q: "Which MySQL version first supports window functions such as RANK() OVER (...)?",
      options: ["5.5", "5.7", "8.0", "They are not supported"],
      answer: 2,
      why: "Window functions and CTEs arrived together in MySQL 8.0.",
    },
  },
];

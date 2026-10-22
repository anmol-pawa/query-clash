import type { Chapter, Mission } from "../types";

const same = (sql: string) => ({ postgres: sql, oracle: sql });

/**
 * Chapter 11, "The Index Vault" (indexing deep-dive).
 * Checks read the PostgreSQL catalog, so a correct index passes in either dialect.
 */
export const INDEXING_MISSIONS: Mission[] = [
  {
    id: "c11-composite",
    title: "Two-Key Lock",
    taunt: "Customer, then date. Two columns, one lookup. Can you order them correctly?",
    task: "The orders page always filters by customer and sorts by date. Create a composite index `idx_orders_cust_date` on `orders (customer_id, order_date)`.",
    check: "SELECT COUNT(*) AS matching_indexes FROM pg_indexes WHERE tablename = 'orders' AND indexdef LIKE '%(customer_id, order_date)%'",
    solution: same("CREATE INDEX idx_orders_cust_date ON orders (customer_id, order_date)"),
    hints: [
      "A composite index is sorted by its first column, then by the second within each first value.",
      "Equality columns go first, range or sort columns after: WHERE customer_id = ? ORDER BY order_date.",
      "CREATE INDEX idx_orders_cust_date ON orders (customer_id, order_date)",
    ],
    codex: ["indexes", "composite-index"],
    tables: ["orders"],
  },
  {
    id: "c11-expression",
    title: "Case Closed",
    taunt: "WHERE UPPER(email) = … skips your plain index. Every. Single. Time.",
    task: "Support teams look customers up with `WHERE UPPER(email) = 'SOME@MAIL.COM'`. Create an index `idx_cust_email_upper` on `customers` that this predicate can use.",
    check: "SELECT COUNT(*) AS matching_indexes FROM pg_indexes WHERE tablename = 'customers' AND indexdef ILIKE '%upper(%email%'",
    solution: same("CREATE INDEX idx_cust_email_upper ON customers (UPPER(email))"),
    hints: [
      "An index stores the values it was built on. If the query computes UPPER(email), the index must store UPPER(email).",
      "That is an expression index (PostgreSQL) or function-based index (Oracle): put the expression in the column list.",
      "CREATE INDEX idx_cust_email_upper ON customers (UPPER(email))",
    ],
    codex: ["indexes", "expression-index"],
    tables: ["customers"],
  },
  {
    id: "c11-sorted",
    title: "Sorted Vault",
    taunt: "Newest first, per status. Sort a million rows on every request?",
    task: "A dashboard lists the newest orders of each `status`. Create `idx_orders_status_date` on `orders (status, order_date DESC)` so the rows come out already sorted.",
    check: "SELECT COUNT(*) AS matching_indexes FROM pg_indexes WHERE tablename = 'orders' AND indexdef LIKE '%(status, order_date DESC)%'",
    solution: same("CREATE INDEX idx_orders_status_date ON orders (status, order_date DESC)"),
    hints: [
      "A B-tree can be scanned forwards or backwards, but a mixed ASC/DESC sort needs the index to be declared that way.",
      "Give each column its own direction inside the parentheses.",
      "CREATE INDEX idx_orders_status_date ON orders (status, order_date DESC)",
    ],
    codex: ["indexes", "composite-index"],
    tables: ["orders"],
  },
  {
    id: "c11-covering",
    title: "Cover Charge",
    taunt: "Fetch the table row for every match? What a waste of a perfectly good index.",
    task: "The report `SELECT order_id FROM orders WHERE customer_id = ? AND status = ?` should be answered from the index alone. Create `idx_orders_cover` on `orders (customer_id, status, order_id)`.",
    check: "SELECT COUNT(*) AS matching_indexes FROM pg_indexes WHERE tablename = 'orders' AND indexdef LIKE '%(customer_id, status, order_id)%'",
    solution: same("CREATE INDEX idx_orders_cover ON orders (customer_id, status, order_id)"),
    hints: [
      "A covering index holds every column the query needs, so the table (heap) is never touched: an index-only scan.",
      "Filter columns first, then the selected column. PostgreSQL can also use INCLUDE (order_id) to store it without sorting on it.",
      "CREATE INDEX idx_orders_cover ON orders (customer_id, status, order_id)",
    ],
    codex: ["indexes", "covering-index"],
    tables: ["orders"],
  },
  {
    id: "c11-redundant",
    title: "Purge the Duplicates",
    taunt: "I planted a redundant index. Every INSERT now pays for it twice. Delicious.",
    kind: "defense",
    setup:
      "CREATE INDEX idx_orders_cust ON orders (customer_id);\nCREATE INDEX idx_orders_cust_date ON orders (customer_id, order_date);",
    task: "`idx_orders_cust` on `(customer_id)` is a prefix of `idx_orders_cust_date` on `(customer_id, order_date)`, so it is redundant and only slows writes. Drop the redundant index and keep the composite one.",
    check: "SELECT indexname FROM pg_indexes WHERE tablename = 'orders' AND indexname LIKE 'idx_orders%' ORDER BY indexname",
    ordered: true,
    solution: same("DROP INDEX idx_orders_cust"),
    hints: [
      "An index on (a, b) already serves every lookup that an index on (a) alone would.",
      "Keep the wider index and drop the narrower prefix: DROP INDEX name.",
      "DROP INDEX idx_orders_cust",
    ],
    codex: ["indexes", "composite-index"],
    tables: ["orders"],
  },
];

/**
 * Chapter 12 material, "SQL anti-patterns". Not yet in `CHAPTERS`: the boss and its wiring come in C1d.
 * Each answer is compared by result with the canonical rewrite, so both dialects agree.
 */
export const ANTIPATTERN_MISSIONS: Mission[] = [
  {
    id: "c12-n-plus-one",
    title: "One Query, Not N+1",
    taunt: "I fire one query for the list, then one more per customer. Thousands of round trips. Beautiful.",
    task: "The app loads every customer, then runs `SELECT COUNT(*) FROM orders WHERE customer_id = ?` once per row (N+1 queries). Replace it with a single query returning `name` and `order_count` for every customer, including customers with no orders, sorted by `name`.",
    solution: same("SELECT c.name, COUNT(o.order_id) AS order_count FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.name ORDER BY c.name"),
    ordered: true,
    hints: [
      "N+1 means one query for the parent rows and one per row for the children. Let the database do the loop: join once.",
      "LEFT JOIN keeps customers without orders; COUNT(o.order_id) counts only real orders, so those get 0.",
      "SELECT c.name, COUNT(o.order_id) AS order_count FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.name ORDER BY c.name",
    ],
    codex: ["n-plus-one", "outer-join"],
    tables: ["customers", "orders"],
  },
  {
    id: "c12-select-star",
    title: "Star Power Drain",
    taunt: "SELECT * drags every column over the wire and ruins every covering index. Why choose?",
    task: "The customer list page only shows each customer's name and where they live, but the code runs `SELECT * FROM customers`. Return just `name` and a column `location` formatted like `Berlin, Germany` (`city`, a comma and space, `country`) for customers in `country = 'Germany'`, sorted by `name`.",
    solution: same("SELECT name, city || ', ' || country AS location FROM customers WHERE country = 'Germany' ORDER BY name"),
    ordered: true,
    hints: [
      "Name the columns you need. Less data crosses the network, and a covering index becomes possible.",
      "Also, SELECT * breaks silently when someone adds or reorders columns.",
      "SELECT name, city || ', ' || country AS location FROM customers WHERE country = 'Germany' ORDER BY name",
    ],
    codex: ["select-star"],
    tables: ["customers"],
  },
  {
    id: "c12-or",
    title: "Either-Or Trap",
    taunt: "WHERE a OR b across two different indexes? The planner gives up and scans it all.",
    task: "`SELECT order_id FROM orders WHERE status = 'PENDING' OR customer_id = 5` can force a full scan. Rewrite it as two index-friendly queries combined with `UNION`, returning `order_id`.",
    solution: same("SELECT order_id FROM orders WHERE status = 'PENDING' UNION SELECT order_id FROM orders WHERE customer_id = 5"),
    hints: [
      "Each branch of an OR may need a different index. Splitting the query lets each branch use its own.",
      "UNION removes rows that match both conditions, so the result equals the OR version. UNION ALL would keep duplicates.",
      "SELECT order_id FROM orders WHERE status = 'PENDING' UNION SELECT order_id FROM orders WHERE customer_id = 5",
    ],
    codex: ["set-operators", "indexes"],
    tables: ["orders"],
  },
  {
    id: "c12-implicit-conversion",
    title: "Silent Cast",
    taunt: "I wrapped your key in a CAST. Now no index can match it. Mwahaha.",
    task: "A query filters `WHERE CAST(customer_id AS VARCHAR(10)) = '5'`. Rewrite it so the column is compared as a number without a cast: return `customer_id` and `name` of the customer with id 5.",
    solution: same("SELECT customer_id, name FROM customers WHERE customer_id = 5"),
    hints: [
      "Casting the column, or comparing mismatched types so the database converts the column, makes the predicate non-sargable.",
      "Convert the constant, never the column: compare customer_id with the number 5.",
      "SELECT customer_id, name FROM customers WHERE customer_id = 5",
    ],
    codex: ["implicit-conversion", "sargable"],
    tables: ["customers"],
  },
  {
    id: "c12-not-in-null",
    title: "The NULL Poison",
    taunt: "NOT IN with one NULL in the list matches nothing. Nothing! Did you test that?",
    task: "`SELECT first_name FROM employees WHERE emp_id NOT IN (SELECT manager_id FROM employees)` returns no rows, because `manager_id` contains NULL. Return `first_name` and `last_name` of employees who manage nobody, using `NOT EXISTS`, sorted by `last_name`, `first_name`.",
    solution: same("SELECT e.first_name, e.last_name FROM employees e WHERE NOT EXISTS (SELECT 1 FROM employees m WHERE m.manager_id = e.emp_id) ORDER BY e.last_name, e.first_name"),
    ordered: true,
    hints: [
      "x NOT IN (…, NULL) is never true: comparing with NULL gives UNKNOWN, and a WHERE keeps only TRUE.",
      "NOT EXISTS tests whether a matching row exists and is not confused by NULLs.",
      "SELECT e.first_name, e.last_name FROM employees e WHERE NOT EXISTS (SELECT 1 FROM employees m WHERE m.manager_id = e.emp_id) ORDER BY e.last_name, e.first_name",
    ],
    codex: ["not-in-null", "null"],
    tables: ["employees"],
  },
];

export const CHAPTERS_11: Chapter[] = [
  {
    n: 11,
    boss: "arborix",
    bossName: "ARBORIX",
    bossTitle: "Warden of the Index Vault",
    title: "The Index Vault",
    topics: ["Composite indexes", "Expression indexes", "Sort order", "Covering indexes", "Redundant indexes"],
    intro:
      "Deep under the planner's eye grows a bark golem crowned with a B+ tree. ARBORIX guards every lookup in the vault, and it punishes careless keys: wrong column order, computed predicates, indexes that cost writes and buy nothing. Build the right index for each query.",
    defeat: "ARBORIX's keys flicker out one by one. Every lookup now takes three page reads. You have mastered the index.",
    color: "#84cc16",
    missions: INDEXING_MISSIONS,
  },
];

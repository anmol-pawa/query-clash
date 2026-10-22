import type { Mission } from "../types";

const same = (sql: string) => ({ postgres: sql, oracle: sql });

/**
 * Chapter 11, "The Index Vault" (indexing deep-dive). The missions are written and tested here;
 * the boss, map node and chapter metadata arrive with the boss art (ROADMAP C1b).
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

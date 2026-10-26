import type { Question } from "./types";

/** Plan text shown under the prompts below (PostgreSQL EXPLAIN / EXPLAIN ANALYZE output, trimmed). */
export const PLAN_FUNCTION_ON_COLUMN = `EXPLAIN SELECT * FROM users WHERE lower(email) = 'ada@example.com';

 Seq Scan on users  (cost=0.00..21450.00 rows=5000 width=96)
   Filter: (lower((email)::text) = 'ada@example.com'::text)`;

export const PLAN_ROWS_REMOVED = `EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42 AND status = 'shipped';

 Index Scan using orders_customer_idx on orders  (cost=0.43..8.45 rows=1 width=64) (actual time=0.9..212.4 rows=12 loops=1)
   Index Cond: (customer_id = 42)
   Filter: (status = 'shipped'::text)
   Rows Removed by Filter: 499988
 Execution Time: 212.6 ms`;

export const PLAN_NESTED_LOOP = `EXPLAIN ANALYZE SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.placed_on = DATE '2026-01-15';

 Nested Loop  (cost=0.85..412.10 rows=95 width=40) (actual time=0.05..14.2 rows=1000 loops=1)
   ->  Index Scan using orders_placed_idx on orders o  (cost=0.43..120.00 rows=95 width=16) (actual time=0.03..1.9 rows=1000 loops=1)
         Index Cond: (placed_on = '2026-01-15'::date)
   ->  Index Scan using customers_pkey on customers c  (cost=0.42..3.07 rows=1 width=32) (actual time=0.010..0.011 rows=1 loops=1000)
         Index Cond: (id = o.customer_id)
 Execution Time: 14.5 ms`;

export const PLAN_ESTIMATE_MISS = `EXPLAIN ANALYZE SELECT * FROM events e JOIN accounts a ON a.id = e.account_id WHERE e.country = 'IN' AND e.device = 'ios_in_app';

 Nested Loop  (cost=0.85..52.30 rows=1 width=120) (actual time=0.1..9120.5 rows=48210 loops=1)
   ->  Seq Scan on events e  (cost=0.00..41.00 rows=1 width=72) (actual time=0.0..310.2 rows=48210 loops=1)
         Filter: ((country = 'IN'::text) AND (device = 'ios_in_app'::text))
   ->  Index Scan using accounts_pkey on accounts a  (cost=0.42..8.44 rows=1 width=48) (actual time=0.18..0.18 rows=1 loops=48210)
         Index Cond: (id = e.account_id)
 Execution Time: 9121.9 ms`;

export const PLAN_HEAP_FETCHES = `EXPLAIN ANALYZE SELECT count(*) FROM payments WHERE paid_at > now() - interval '1 day';

 Aggregate  (cost=4210.10..4210.11 rows=1 width=8) (actual time=88.2..88.2 rows=1 loops=1)
   ->  Index Only Scan using payments_paid_at_idx on payments  (cost=0.43..3960.10 rows=100000 width=0) (actual time=0.04..70.1 rows=99872 loops=1)
         Index Cond: (paid_at > (now() - '1 day'::interval))
         Heap Fetches: 99872
 Execution Time: 88.4 ms`;

export const PLAN_BITMAP = `EXPLAIN SELECT * FROM tickets WHERE assignee_id = 7 AND priority = 'high';

 Bitmap Heap Scan on tickets  (cost=310.20..2840.00 rows=1800 width=88)
   Recheck Cond: ((assignee_id = 7) AND (priority = 'high'::text))
   ->  BitmapAnd  (cost=310.20..310.20 rows=1800 width=0)
         ->  Bitmap Index Scan on tickets_assignee_idx  (cost=0.00..120.00 rows=24000 width=0)
               Index Cond: (assignee_id = 7)
         ->  Bitmap Index Scan on tickets_priority_idx  (cost=0.00..185.00 rows=60000 width=0)
               Index Cond: (priority = 'high'::text)`;

export const PLAN_HASH_SPILL = `EXPLAIN ANALYZE SELECT * FROM big_a a JOIN big_b b ON a.k = b.k;

 Hash Join  (cost=95000.00..310000.00 rows=5000000 width=120) (actual time=2100..9800 rows=5000000 loops=1)
   Hash Cond: (a.k = b.k)
   ->  Seq Scan on big_a a  (cost=0.00..60000.00 rows=5000000 width=60) (actual time=0.0..900 rows=5000000 loops=1)
   ->  Hash  (cost=48000.00..48000.00 rows=3000000 width=60) (actual time=2050..2050 rows=3000000 loops=1)
         Buckets: 131072  Batches: 32  Memory Usage: 3900kB
         ->  Seq Scan on big_b b  (cost=0.00..48000.00 rows=3000000 width=60) (actual time=0.0..700 rows=3000000 loops=1)
 Execution Time: 9950 ms`;

export const PLAN_SORT_DISK = `EXPLAIN ANALYZE SELECT * FROM logs ORDER BY created_at;

 Sort  (cost=150000.00..155000.00 rows=2000000 width=100) (actual time=4100..5200 rows=2000000 loops=1)
   Sort Key: created_at
   Sort Method: external merge  Disk: 214000kB
   ->  Seq Scan on logs  (cost=0.00..42000.00 rows=2000000 width=100) (actual time=0.0..600 rows=2000000 loops=1)
 Execution Time: 5400 ms`;

export const PLAN_LEADING_WILDCARD = `EXPLAIN SELECT * FROM products WHERE name LIKE '%phone';

 Seq Scan on products  (cost=0.00..1850.00 rows=90 width=80)
   Filter: (name ~~ '%phone'::text)`;

export const PLAN_LOW_SELECTIVITY = `EXPLAIN ANALYZE SELECT * FROM accounts WHERE status = 'active';

 Seq Scan on accounts  (cost=0.00..18500.00 rows=920000 width=64) (actual time=0.0..160 rows=921300 loops=1)
   Filter: (status = 'active'::text)
   Rows Removed by Filter: 78700
 Execution Time: 190 ms`;

export const PLAN_DATE_CAST = `EXPLAIN SELECT * FROM sessions WHERE created_at::date = '2026-01-15';

 Seq Scan on sessions  (cost=0.00..90500.00 rows=50000 width=72)
   Filter: ((created_at)::date = '2026-01-15'::date)`;

export const PLAN_PARTIAL = `CREATE INDEX jobs_pending_idx ON jobs (run_at) WHERE status = 'pending';

EXPLAIN SELECT * FROM jobs WHERE status = 'done' ORDER BY run_at LIMIT 10;

 Limit  (cost=21000.00..21000.03 rows=10 width=60)
   ->  Sort  (cost=21000.00..22500.00 rows=600000 width=60)
         Sort Key: run_at
         ->  Seq Scan on jobs  (cost=0.00..14000.00 rows=600000 width=60)
               Filter: (status = 'done'::text)`;

export const PLAN_COMPOSITE = `-- existing index: CREATE INDEX orders_status_created_idx ON orders (status, created_at);

EXPLAIN SELECT * FROM orders WHERE created_at > now() - interval '1 hour';

 Seq Scan on orders  (cost=0.00..52000.00 rows=2000 width=64)
   Filter: (created_at > (now() - '01:00:00'::interval))`;

export const PLAN_SCAN_ROWS = `EXPLAIN ANALYZE SELECT * FROM audit WHERE actor = 'svc-batch';

 Seq Scan on audit  (cost=0.00..30000.00 rows=1000 width=90) (actual time=0.0..250 rows=1000 loops=1)
   Filter: (actor = 'svc-batch'::text)
   Rows Removed by Filter: 999000
 Execution Time: 251 ms`;

export const EXPLAIN_PLANS: Question[] = [
  {
    id: "explain-function-on-column",
    topic: "query",
    kind: "mcq",
    prompt: "There is a B-tree index on users(email), yet this plan is a Seq Scan. Why is the index ignored, and what fixes it?",
    plan: PLAN_FUNCTION_ON_COLUMN,
    choices: [
      "The table is too small; nothing needs fixing",
      "lower(email) is not the indexed expression. Create an expression index ON users (lower(email)), or store emails already lower-cased and compare directly",
      "B-tree indexes cannot be used for equality",
      "Run VACUUM FULL so the planner trusts the index",
    ],
    answer: 1,
    explanation: "An index on email orders rows by email, not by lower(email), so a predicate that wraps the column in a function is not searchable through it (it is not sargable). An expression index on lower(email) matches the predicate exactly. The same applies to arithmetic on the column (price * 2 = 10) and to casts.",
    difficulty: 2,
    tags: ["EXPLAIN", "sargable", "expression index"],
    askedAt: "Very common in performance-debugging rounds",
  },
  {
    id: "explain-rows-removed",
    topic: "query",
    kind: "mcq",
    prompt: "This query is slow although it uses an index. What does the plan tell you?",
    plan: PLAN_ROWS_REMOVED,
    choices: [
      "The index is too wide",
      "The index finds all 500,000 rows of customer 42, then the status filter throws almost all of them away. A composite index on (customer_id, status) would fetch only the 12 matches",
      "The planner misestimated the join order",
      "The query needs a larger work_mem",
    ],
    answer: 1,
    explanation: "Only customer_id appears under Index Cond; status is a Filter applied after fetching heap rows. 'Rows Removed by Filter: 499988' next to rows=12 means 99.998% of the work was wasted. Putting both equality columns in the index moves status into the Index Cond. (The estimate rows=1 is also far off, hinting at stale or missing statistics.)",
    difficulty: 2,
    tags: ["EXPLAIN", "composite index", "rows removed by filter"],
    askedAt: "Common in backend performance rounds",
  },
  {
    id: "explain-loops-total-rows",
    topic: "query",
    kind: "numeric",
    prompt: "In this plan, how many rows in total did the inner Index Scan on customers produce across the whole query? (EXPLAIN ANALYZE reports rows and time per loop.)",
    plan: PLAN_NESTED_LOOP,
    answer: 1000,
    unit: "rows",
    explanation: "The inner node shows rows=1 loops=1000. 'actual rows' and 'actual time' are averages per execution, so the total is rows x loops = 1 x 1000 = 1,000 rows, and about 0.011 ms x 1000 = 11 ms of the 14.2 ms in the join. A nested loop with an indexed inner side is fast while the outer side is small.",
    difficulty: 2,
    tags: ["EXPLAIN ANALYZE", "loops", "nested loop"],
  },
  {
    id: "explain-estimate-miss",
    topic: "query",
    kind: "mcq",
    prompt: "The planner expected 1 row from events but got 48,210, and the query took 9 seconds. What is the most likely root cause and fix?",
    plan: PLAN_ESTIMATE_MISS,
    choices: [
      "The accounts primary key is missing",
      "The planner assumes country and device are independent and multiplies their selectivities, so it under-estimates and picks a nested loop. Fix with ANALYZE and extended statistics (CREATE STATISTICS ... (dependencies) ON country, device)",
      "Nested loops are always slower than hash joins",
      "EXPLAIN ANALYZE itself slowed the query",
    ],
    answer: 1,
    explanation: "A row estimate of 1 versus an actual 48,210 (loops=48210 on the inner side) is the classic sign of a cardinality miss: the nested loop is great for 1 outer row and terrible for 48,210 index probes. Correlated columns break the independence assumption; extended statistics, fresh ANALYZE or a better-targeted histogram let the planner choose a hash join.",
    difficulty: 3,
    tags: ["EXPLAIN ANALYZE", "statistics", "cardinality estimate"],
    askedAt: "Senior backend and data-engineering loops",
  },
  {
    id: "explain-heap-fetches",
    topic: "query",
    kind: "mcq",
    prompt: "An Index Only Scan should avoid reading the table, but this plan shows Heap Fetches equal to the row count. What is going on?",
    plan: PLAN_HEAP_FETCHES,
    choices: [
      "The index is not covering the query",
      "The visibility map is out of date (heavy recent writes, autovacuum behind), so PostgreSQL must visit the heap to check each row's visibility. VACUUM the table",
      "count(*) always needs the table",
      "The index is corrupted",
    ],
    answer: 1,
    explanation: "Index entries do not carry MVCC visibility. An index-only scan skips the heap only for pages marked all-visible in the visibility map; otherwise it fetches the heap tuple. Heap Fetches near the row count means almost no pages were all-visible, typically because the table is changing quickly or has not been vacuumed.",
    difficulty: 3,
    tags: ["EXPLAIN ANALYZE", "index only scan", "visibility map", "MVCC"],
    askedAt: "Common in PostgreSQL-specific interviews",
  },
  {
    id: "explain-bitmap-and",
    topic: "query",
    kind: "mcq",
    prompt: "Why did the planner use a Bitmap Heap Scan with a BitmapAnd rather than a plain Index Scan?",
    plan: PLAN_BITMAP,
    choices: [
      "It combines two single-column indexes by intersecting their page bitmaps, then reads each matching heap page once, which suits a moderately selective result (about 1,800 rows)",
      "Bitmap scans are used only for text columns",
      "The tickets table has no primary key",
      "Bitmap scans are always faster than index scans",
    ],
    answer: 0,
    explanation: "Each condition alone matches many rows (24,000 and 60,000), but together about 1,800. PostgreSQL builds a bitmap per index, ANDs them, and visits the heap pages in physical order, avoiding random single-row jumps. The Recheck Cond is needed when a bitmap becomes lossy (page-level). A composite index on (assignee_id, priority) would usually beat this.",
    difficulty: 2,
    tags: ["EXPLAIN", "bitmap scan", "index"],
  },
  {
    id: "explain-hash-spill",
    topic: "query",
    kind: "mcq",
    prompt: "What does 'Batches: 32' on the Hash node tell you?",
    plan: PLAN_HASH_SPILL,
    choices: [
      "The join ran on 32 parallel workers",
      "The hash table did not fit in work_mem, so both inputs were split into 32 partitions spilled to temporary files and joined batch by batch",
      "The hash function was applied 32 times per row",
      "32 indexes were used",
    ],
    answer: 1,
    explanation: "A hash join that fits in memory shows Batches: 1. More than one batch means a Grace-style partitioned hash join: extra disk writes and reads. Raising work_mem (carefully: it is per node per query), filtering earlier, or selecting fewer columns shrinks the hash table.",
    difficulty: 3,
    tags: ["EXPLAIN ANALYZE", "hash join", "work_mem"],
  },
  {
    id: "explain-sort-disk",
    topic: "query",
    kind: "mcq",
    prompt: "What does 'Sort Method: external merge  Disk: 214000kB' mean, and what are two ways to avoid it?",
    plan: PLAN_SORT_DISK,
    choices: [
      "The sort ran in memory using quicksort; nothing to avoid",
      "The sort exceeded work_mem and spilled sorted runs to disk. Raise work_mem, or provide an index on created_at so rows arrive pre-sorted",
      "The disk is full",
      "ORDER BY is not allowed on timestamps",
    ],
    answer: 1,
    explanation: "'quicksort Memory: ...' is the in-memory case. 'external merge Disk' is an external merge sort: sorted runs are written to temporary files and merged. An index on the sort key lets an Index Scan return rows already ordered (and combined with LIMIT it avoids sorting everything).",
    difficulty: 2,
    tags: ["EXPLAIN ANALYZE", "sort", "work_mem"],
  },
  {
    id: "explain-leading-wildcard",
    topic: "query",
    kind: "mcq",
    prompt: "products(name) has a B-tree index, but LIKE '%phone' does a Seq Scan. Which index would let this search use an index?",
    plan: PLAN_LEADING_WILDCARD,
    choices: [
      "A bigger B-tree",
      "A trigram index: CREATE EXTENSION pg_trgm; CREATE INDEX ON products USING gin (name gin_trgm_ops)",
      "A hash index on name",
      "No index can ever help a LIKE query",
    ],
    answer: 1,
    explanation: "A B-tree is sorted by prefix, so only LIKE 'phone%' (a prefix) is a range scan. A leading wildcard has no known starting key. A GIN trigram index breaks strings into 3-character pieces, supporting substring and ILIKE searches. For genuine word search use full-text search (tsvector).",
    difficulty: 2,
    tags: ["EXPLAIN", "LIKE", "pg_trgm"],
  },
  {
    id: "explain-low-selectivity",
    topic: "query",
    kind: "truefalse",
    prompt: "An index exists on accounts(status), and about 92% of rows are 'active'. Seeing a Seq Scan in this plan means the planner made a mistake.",
    plan: PLAN_LOW_SELECTIVITY,
    answer: false,
    explanation: "Reading 92% of the table through an index means one random heap access per row plus the index pages, which costs far more than one sequential pass. The planner is right. Indexes pay off for selective predicates (roughly under 5-10%), or when the index can answer the query alone.",
    difficulty: 1,
    tags: ["EXPLAIN", "selectivity", "seq scan"],
  },
  {
    id: "explain-date-cast",
    topic: "query",
    kind: "mcq",
    prompt: "sessions(created_at) is indexed but the plan shows a Seq Scan. Which rewrite lets the index be used?",
    plan: PLAN_DATE_CAST,
    choices: [
      "WHERE created_at >= '2026-01-15' AND created_at < '2026-01-16'",
      "WHERE created_at::text LIKE '2026-01-15%'",
      "WHERE date_trunc('day', created_at) = '2026-01-15'",
      "WHERE to_char(created_at, 'YYYY-MM-DD') = '2026-01-15'",
    ],
    answer: 0,
    explanation: "A half-open range on the bare column is sargable: the B-tree can seek to the start and stop at the end. The other three apply a function or cast to the column, so they hit the same problem as the original. The half-open range also avoids missing rows on the last instant of the day.",
    difficulty: 2,
    tags: ["EXPLAIN", "sargable", "date range"],
    askedAt: "Common in SQL performance questions",
  },
  {
    id: "explain-partial-index",
    topic: "query",
    kind: "mcq",
    prompt: "A partial index on jobs(run_at) WHERE status = 'pending' exists, yet this query does not use it. Why?",
    plan: PLAN_PARTIAL,
    choices: [
      "Partial indexes cannot be used with ORDER BY",
      "The query asks for status = 'done' rows, which the partial index does not contain; the planner can only use a partial index when the query's WHERE implies the index predicate",
      "LIMIT disables all indexes",
      "The index must be rebuilt after creation",
    ],
    answer: 1,
    explanation: "A partial index stores only rows matching its predicate. Using it for status = 'done' would miss rows, so it is invalid for this query. Partial indexes shine for queue-style tables: small, hot and cheap to maintain, serving 'pending' lookups while 'done' rows are ignored.",
    difficulty: 2,
    tags: ["EXPLAIN", "partial index"],
  },
  {
    id: "explain-composite-order",
    topic: "query",
    kind: "mcq",
    prompt: "An index exists on orders(status, created_at), yet filtering by created_at alone does a Seq Scan. What is the rule at work, and how do you fix it?",
    plan: PLAN_COMPOSITE,
    choices: [
      "Composite indexes work only with equality on all columns",
      "The leftmost-prefix rule: the index is sorted by status first, so created_at alone has no contiguous range. Add an index on (created_at), or reorder if the query mix allows",
      "created_at must be an integer for indexing",
      "Seq Scans are always chosen when ORDER BY is missing",
    ],
    answer: 1,
    explanation: "A composite B-tree is sorted by its first column, then the second within each first-column value. A range on created_at alone would have to be searched separately inside every status group. Put equality columns first and the range column last, and make the order match the queries you actually run.",
    difficulty: 2,
    tags: ["EXPLAIN", "composite index", "leftmost prefix"],
    askedAt: "Asked in almost every indexing discussion",
  },
  {
    id: "explain-seq-scan-total-rows",
    topic: "query",
    kind: "numeric",
    prompt: "How many rows did this Seq Scan read in total? (Rows returned plus rows removed by the filter.)",
    plan: PLAN_SCAN_ROWS,
    answer: 1000000,
    unit: "rows",
    explanation: "A Seq Scan examines every row of the table. 1,000 rows passed the filter and 999,000 were removed: 1,000 + 999,000 = 1,000,000 rows read. Only 0.1% of the table was wanted, so an index on actor would turn this 250 ms scan into a handful of page reads.",
    difficulty: 1,
    tags: ["EXPLAIN ANALYZE", "seq scan", "selectivity"],
  },
  {
    id: "explain-analyze-writes",
    topic: "query",
    kind: "mcq",
    prompt: "You want the real runtime of a slow UPDATE in production. What is the safe way to use EXPLAIN ANALYZE?",
    choices: [
      "EXPLAIN ANALYZE only estimates, so it is always safe",
      "Wrap it: BEGIN; EXPLAIN (ANALYZE, BUFFERS) UPDATE ...; ROLLBACK; because ANALYZE really executes the statement",
      "Add LIMIT 0",
      "Run it on the primary during peak hours; plans are cheap",
    ],
    answer: 1,
    explanation: "Plain EXPLAIN only plans. EXPLAIN ANALYZE executes the statement and reports actual numbers, so an UPDATE or DELETE really changes data (and takes locks). Run it inside a transaction you roll back, ideally on a replica or staging copy. BUFFERS adds page hit and read counts, which usually matter more than time alone.",
    difficulty: 2,
    tags: ["EXPLAIN ANALYZE", "operations", "safety"],
  },
];

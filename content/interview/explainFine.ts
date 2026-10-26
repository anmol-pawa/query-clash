import type { Question } from "./types";

/** Reading EXPLAIN / EXPLAIN ANALYZE output: scan and join choice, estimate misses, ignored indexes. Part of the "query" topic. */
export const EXPLAIN_FINE: Question[] = [
  {
    id: "explain-seq-vs-index-selectivity",
    topic: "query",
    kind: "mcq",
    prompt: "orders has 1,000,000 rows and an index on status. Only 3 distinct statuses exist, and 'shipped' covers about 60% of rows. The plan below is for WHERE status = 'shipped'. Is the planner wrong to ignore the index?",
    plan: `Seq Scan on orders  (cost=0.00..24846.00 rows=600000 width=48)
  Filter: (status = 'shipped'::text)`,
    choices: [
      "Yes: an index should always beat a sequential scan",
      "No: reading 60% of the table through an index means a random heap fetch per row, which costs more than one sequential pass",
      "Yes: the planner needs ANALYZE to notice the index",
      "No: indexes cannot be used on text columns",
    ],
    answer: 1,
    explanation: "Index scans pay random I/O for every matching row. When a predicate matches a large fraction of the table (roughly above 5-10% on a spinning-disk cost model), reading every page in order is cheaper, so the planner is right. Low-selectivity columns need a partial index (for the rare values) or a different access pattern.",
    difficulty: 2,
    tags: ["EXPLAIN", "selectivity", "Seq Scan"],
    askedAt: "Classic 'why is my index not used' question",
  },
  {
    id: "explain-function-on-column",
    topic: "query",
    kind: "mcq",
    prompt: "users has a B-tree index on email. This query is slow and the plan scans the whole table. Why?",
    plan: `SELECT * FROM users WHERE lower(email) = 'ada@example.com';

Seq Scan on users  (cost=0.00..2310.00 rows=50 width=72)
  Filter: (lower(email) = 'ada@example.com'::text)`,
    choices: [
      "lower() makes the query non-deterministic",
      "The index stores email values, not lower(email), so the predicate cannot use it; create an index on lower(email)",
      "B-tree indexes cannot be used for equality",
      "LIMIT is missing",
    ],
    answer: 1,
    explanation: "A predicate is only sargable when the indexed expression appears bare. Wrapping the column in a function hides it from the plain index. Fix it with an expression index (CREATE INDEX ON users (lower(email))) or store a normalised column. Oracle uses a function-based index for the same job.",
    difficulty: 2,
    tags: ["EXPLAIN", "sargable", "expression index"],
    askedAt: "Very common in backend and DBA screens",
  },
  {
    id: "explain-leading-wildcard",
    topic: "query",
    kind: "mcq",
    prompt: "name has a normal B-tree index. For which predicate can the planner use it for a range scan (assume a C/binary collation)?",
    choices: ["name LIKE '%son'", "name LIKE 'Mc%'", "name LIKE '%son%'", "lower(name) LIKE 'mc%'"],
    answer: 1,
    explanation: "A B-tree is sorted by the leading characters, so a fixed prefix ('Mc%') becomes the range 'Mc' <= name < 'Md'. A leading wildcard has no prefix to seek on, and lower(name) hides the column. Suffix and substring searches need a trigram (GIN/GiST pg_trgm) index or full-text search. In PostgreSQL, non-C collations also need the text_pattern_ops operator class for LIKE prefixes.",
    difficulty: 2,
    tags: ["EXPLAIN", "LIKE", "sargable"],
  },
  {
    id: "explain-type-cast",
    topic: "query",
    kind: "mcq",
    prompt: "phone is a TEXT column with an index. The application sends the literal as a number. What is the probable cause of this plan?",
    plan: `SELECT * FROM contacts WHERE phone::bigint = 5551234;

Seq Scan on contacts  (cost=0.00..1893.00 rows=1 width=60)
  Filter: ((phone)::bigint = 5551234)`,
    choices: [
      "The cast is applied to the indexed column, so the index on phone cannot be used",
      "bigint comparisons are always sequential",
      "The planner statistics are empty",
      "Numbers cannot be stored in indexes",
    ],
    answer: 0,
    explanation: "Casting the column (instead of the constant) is the same as wrapping it in a function. Compare like with like: WHERE phone = '5551234'. In Oracle an implicit conversion on the column side (for example a VARCHAR2 column compared to a number) silently disables the index the same way.",
    difficulty: 3,
    tags: ["EXPLAIN", "implicit cast", "sargable"],
  },
  {
    id: "explain-index-only-heap-fetches",
    topic: "query",
    kind: "mcq",
    prompt: "An index on (customer_id, total) exists. This is the plan for SELECT total FROM orders WHERE customer_id = 7. Why is Heap Fetches not zero?",
    plan: `Index Only Scan using orders_cust_total on orders
    (cost=0.42..8.44 rows=12 width=8) (actual time=0.031..0.210 rows=12 loops=1)
  Index Cond: (customer_id = 7)
  Heap Fetches: 12`,
    choices: [
      "The index does not contain the total column",
      "The visibility map has not marked those heap pages all-visible (VACUUM has not run recently), so each row must be checked in the heap",
      "Index Only Scan always reads the heap",
      "There are 12 duplicate rows",
    ],
    answer: 1,
    explanation: "An index-only scan avoids the table only for pages the visibility map marks all-visible, because MVCC visibility is stored in the heap tuples. After heavy updates, Heap Fetches stays high until VACUUM updates the map. The covering index itself is fine.",
    difficulty: 3,
    tags: ["EXPLAIN ANALYZE", "index only scan", "visibility map"],
    askedAt: "PostgreSQL deep-dive follow-up",
  },
  {
    id: "explain-bitmap-scan",
    topic: "query",
    kind: "mcq",
    prompt: "Why does PostgreSQL choose a Bitmap Heap Scan here instead of a plain Index Scan?",
    plan: `Bitmap Heap Scan on events  (cost=312.15..9021.40 rows=25000 width=64)
  Recheck Cond: (kind = 'click'::text)
  ->  Bitmap Index Scan on events_kind_idx  (cost=0.00..305.90 rows=25000 width=0)
        Index Cond: (kind = 'click'::text)`,
    choices: [
      "The query returns exactly one row",
      "A medium number of rows match: the bitmap collects matching row locations, sorts them by heap page, and reads each page once in physical order",
      "Bitmap scans are used only for boolean columns",
      "The table has no primary key",
    ],
    answer: 1,
    explanation: "With a moderate fraction of rows (too many for random Index Scan fetches, too few for a Seq Scan) the bitmap turns random heap access into ordered page reads. Recheck Cond is needed when the bitmap becomes lossy (page-level) and for MVCC rechecks. Bitmaps can also be combined with BitmapAnd / BitmapOr to use several indexes.",
    difficulty: 2,
    tags: ["EXPLAIN", "bitmap scan"],
  },
  {
    id: "explain-row-estimate-miss",
    topic: "query",
    kind: "mcq",
    prompt: "EXPLAIN ANALYZE shows this. What is the most likely first fix?",
    plan: `Nested Loop  (cost=0.42..310.50 rows=3 width=96)
             (actual time=0.05..4821.77 rows=148212 loops=1)
  ->  Index Scan using customers_city_idx on customers
        (cost=0.42..8.45 rows=1 width=40) (actual time=0.02..9.8 rows=18500 loops=1)
        Index Cond: (city = 'Pune')
  ->  Index Scan using orders_cust_idx on orders
        (cost=0.42..8.20 rows=3 width=56) (actual time=0.01..0.22 rows=8 loops=18500)`,
    choices: [
      "Add LIMIT to the query",
      "Run ANALYZE (refresh statistics, perhaps raise the statistics target) because the planner expected 1 customer and found 18,500, so it picked a nested loop for what should be a hash join",
      "Drop the index on customers.city",
      "Turn off MVCC",
    ],
    answer: 1,
    explanation: "A row estimate that is off by orders of magnitude (rows=1 vs actual 18,500) cascades: the planner thinks the outer side is tiny, so nested loop looks cheap, but it runs the inner scan 18,500 times (loops=18500). Stale or too coarse statistics are the usual cause; correlated columns need CREATE STATISTICS (extended stats).",
    difficulty: 3,
    tags: ["EXPLAIN ANALYZE", "statistics", "nested loop"],
    askedAt: "Performance-diagnosis rounds",
  },
  {
    id: "explain-loops-multiply",
    topic: "query",
    kind: "numeric",
    prompt: "In EXPLAIN ANALYZE, an inner node shows 'actual time=0.01..0.22 rows=8 loops=18500'. About how many rows did this node return in total across the whole query?",
    answer: 148000,
    tolerance: 0,
    explanation: "rows and actual time are per-loop averages, so the total is rows x loops = 8 x 18,500 = 148,000. Likewise total time is about 0.22 ms x 18,500, roughly 4 seconds. Forgetting to multiply by loops is the most common misreading of a nested-loop plan.",
    difficulty: 2,
    tags: ["EXPLAIN ANALYZE", "loops"],
  },
  {
    id: "explain-seq-scan-cost",
    topic: "query",
    kind: "numeric",
    prompt: "PostgreSQL default costs: seq_page_cost = 1.0, cpu_tuple_cost = 0.01, cpu_operator_cost = 0.0025. A table has 1,000 pages and 100,000 rows. What total cost does the planner print for a Seq Scan with one filter condition (WHERE x > 5)?",
    answer: 2250,
    tolerance: 0,
    explanation: "Cost = pages x seq_page_cost + rows x cpu_tuple_cost + rows x cpu_operator_cost per filter = 1000 + 1000 + 250 = 2250. Without the filter it would be 2000. This is exactly how the 'cost=0.00..2250.00' end figure is built.",
    difficulty: 3,
    tags: ["EXPLAIN", "cost model"],
  },
  {
    id: "explain-composite-order",
    topic: "query",
    kind: "mcq",
    prompt: "An index exists on (country, city, created_at). For which query can it NOT seek efficiently on the first column?",
    choices: [
      "WHERE country = 'IN' AND city = 'Pune'",
      "WHERE country = 'IN' AND created_at > '2026-01-01'",
      "WHERE city = 'Pune' AND created_at > '2026-01-01'",
      "WHERE country = 'IN'",
    ],
    answer: 2,
    explanation: "A composite B-tree is sorted by country, then city, then created_at, so it can seek only on a leftmost prefix. Skipping country means matches are scattered across the index (PostgreSQL may still scan it fully; Oracle has skip scan for low-cardinality leading columns). The second option uses the prefix country, then filters created_at inside that range.",
    difficulty: 2,
    tags: ["composite index", "leftmost prefix"],
  },
  {
    id: "explain-range-then-equality",
    topic: "query",
    kind: "mcq",
    prompt: "Queries are WHERE status = 'open' AND created_at > now() - interval '7 days' ORDER BY created_at. Which index is best?",
    choices: ["(created_at, status)", "(status, created_at)", "(status) and (created_at) separately", "(created_at) only"],
    answer: 1,
    explanation: "Put equality columns first, then the range or sort column. (status, created_at) seeks to 'open', then scans the last seven days in created_at order, so no separate sort is needed. With (created_at, status) the equality can only filter inside the range scan.",
    difficulty: 2,
    tags: ["composite index", "ORDER BY"],
    askedAt: "Index-design question in system design rounds",
  },
  {
    id: "explain-partial-index",
    topic: "query",
    kind: "mcq",
    prompt: "jobs has 50 million rows but only about 2,000 have state = 'pending'; the worker polls for those constantly. What is the leanest index?",
    choices: [
      "CREATE INDEX ON jobs (state)",
      "CREATE INDEX ON jobs (created_at) WHERE state = 'pending'",
      "CREATE INDEX ON jobs (id, state, created_at)",
      "No index: a Seq Scan is fine",
    ],
    answer: 1,
    explanation: "A partial index contains only rows matching its WHERE clause, so it holds about 2,000 entries instead of 50 million, stays hot in memory, and is cheap to maintain because most updates do not touch it. The query must repeat state = 'pending' so the planner can prove the index applies.",
    difficulty: 2,
    tags: ["partial index", "job queue"],
  },
  {
    id: "explain-covering-include",
    topic: "query",
    kind: "mcq",
    prompt: "SELECT email FROM users WHERE tenant_id = 5. What does CREATE INDEX ON users (tenant_id) INCLUDE (email) buy you?",
    choices: [
      "A unique constraint on email",
      "An index-only scan: email is stored in the index leaves but is not part of the search key, so the heap is not touched",
      "A faster INSERT",
      "Sorting by email",
    ],
    answer: 1,
    explanation: "INCLUDE (PostgreSQL 11+, SQL Server) adds payload columns to the leaf pages without making them part of the key or the sort order, which keeps internal pages small. The price is a larger index and more write work. It does not make email unique or sorted.",
    difficulty: 2,
    tags: ["covering index", "INCLUDE"],
  },
  {
    id: "explain-join-algorithm-hash",
    topic: "query",
    kind: "mcq",
    prompt: "What is this plan doing, and which table should the Hash node ideally hold?",
    plan: `Hash Join  (cost=1540.00..6210.00 rows=100000 width=80)
  Hash Cond: (o.customer_id = c.id)
  ->  Seq Scan on orders o  (cost=0.00..3600.00 rows=100000 width=48)
  ->  Hash  (cost=900.00..900.00 rows=5000 width=36)
        ->  Seq Scan on customers c  (cost=0.00..900.00 rows=5000 width=36)`,
    choices: [
      "It builds an in-memory hash table from the smaller input (customers) and probes it once per orders row",
      "It sorts both tables and merges them",
      "It loops over customers and runs an index lookup in orders for each one",
      "It builds the hash table from orders, the larger input",
    ],
    answer: 0,
    explanation: "Hash Join: the node under Hash is the build side (should be the smaller input so it fits in work_mem), the other child is the probe side, streamed row by row. It handles equality joins only, needs no index or sort order, and spills to disk in batches if the build side exceeds work_mem.",
    difficulty: 2,
    tags: ["EXPLAIN", "hash join"],
  },
  {
    id: "explain-merge-join-sorted",
    topic: "query",
    kind: "mcq",
    prompt: "When does the planner favour a Merge Join over a Hash Join?",
    choices: [
      "Never; hash join always wins",
      "When both inputs are already sorted on the join key (for example from index scans), or the join is a non-equality range, or the result must stay ordered",
      "Only when one table has one row",
      "Only for self joins",
    ],
    answer: 1,
    explanation: "Merge join walks two sorted inputs in step, so it is cheap when sort order comes free from an index or when an ORDER BY on the join key can reuse it. If a sort is required first, its O(n log n) cost usually favours hashing for equality joins. Nested loop remains the choice for a tiny outer side with an indexed inner lookup.",
    difficulty: 3,
    tags: ["EXPLAIN", "merge join"],
  },
  {
    id: "explain-sort-spill",
    topic: "query",
    kind: "mcq",
    prompt: "What does this line from EXPLAIN ANALYZE tell you, and what are the options?",
    plan: `Sort  (cost=191340.2..193840.2 rows=1000000 width=64) (actual time=1420..1895 rows=1000000 loops=1)
  Sort Key: created_at
  Sort Method: external merge  Disk: 76104kB`,
    choices: [
      "The sort did not fit in work_mem and spilled to disk; raise work_mem or add an index on created_at so the sort is avoided",
      "The disk is failing",
      "The sort used an index",
      "The query is returning the wrong order",
    ],
    answer: 0,
    explanation: "'external merge Disk:' means an external merge sort with temporary files. 'quicksort Memory:' would mean it fit in memory. Fixes: increase work_mem for this query or session (it is per sort node, per connection, so do not raise it globally without care), add an index that already provides the order, or add LIMIT so a top-N heapsort suffices.",
    difficulty: 2,
    tags: ["EXPLAIN ANALYZE", "sort", "work_mem"],
  },
  {
    id: "explain-analyze-writes",
    topic: "query",
    kind: "truefalse",
    prompt: "Running EXPLAIN ANALYZE UPDATE accounts SET balance = 0 only shows the plan and leaves the data unchanged.",
    answer: false,
    explanation: "EXPLAIN ANALYZE executes the statement for real to collect timings, so the UPDATE is applied. To measure a write safely, wrap it: BEGIN; EXPLAIN ANALYZE UPDATE ...; ROLLBACK;. Plain EXPLAIN (without ANALYZE) is the one that does not run anything.",
    difficulty: 1,
    tags: ["EXPLAIN ANALYZE", "safety"],
  },
  {
    id: "explain-offset-cost",
    topic: "query",
    kind: "mcq",
    prompt: "SELECT * FROM posts ORDER BY id LIMIT 20 OFFSET 400000 uses an index scan on id and is slower than the same query with OFFSET 0. Why?",
    plan: `Limit  (cost=13402.10..13404.45 rows=20 width=120) (actual time=118..118 rows=20 loops=1)
  ->  Index Scan using posts_pkey on posts
        (cost=0.43..58812.43 rows=500000 width=120) (actual time=0.03..104 rows=400020 loops=1)`,
    choices: [
      "The index is corrupted",
      "The scan node still produced 400,020 rows; OFFSET reads and discards them. Keyset pagination (WHERE id > :last ORDER BY id LIMIT 20) seeks straight to the page",
      "LIMIT disables the index",
      "OFFSET is not allowed on indexed columns",
    ],
    answer: 1,
    explanation: "Look at the child node's actual rows: 400,020. The database has to walk past every skipped row, so cost grows linearly with the offset. Keyset (seek) pagination uses the index to jump to the last-seen key and reads only the page.",
    difficulty: 2,
    tags: ["EXPLAIN ANALYZE", "pagination"],
  },
];

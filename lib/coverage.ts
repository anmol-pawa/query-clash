/**
 * Interview coverage matrix: typical SDE / data-engineer / DBA interview topics against the content that covers
 * them. Pure data plus a counter; `tests/coverage.test.ts` checks every reference and regenerates docs/COVERAGE.md.
 */

export type CoverageArea =
  | "SQL coding"
  | "Schema design"
  | "Indexing and plans"
  | "Transactions and locking"
  | "Scale and distribution"
  | "Data engineering"
  | "DBA operations";

export interface CoverageRow {
  id: string;
  area: CoverageArea;
  topic: string;
  /** Mission ids (content/chapters) that practise it. */
  missions: string[];
  /** Codex entry ids that teach it. */
  codex: string[];
  /** Question tags (matched case-insensitively, whole tag) that count towards it. */
  tags: string[];
  /** Extra question ids that count even without a matching tag. */
  questionIds?: string[];
  /** Interactive tools / generators (route or lib name) that cover it. */
  tools?: string[];
  /** Fewest questions this topic must have; the test fails below it. */
  minQuestions: number;
  /** Known weakness, with the ROADMAP box that closes it. */
  gap?: string;
}

export interface CoverageCounts {
  questions: number;
  missions: number;
  codex: number;
}

export function countQuestions(row: CoverageRow, questions: { id: string; tags: string[] }[]): number {
  const tags = new Set(row.tags.map((t) => t.toLowerCase()));
  const ids = new Set(row.questionIds ?? []);
  return questions.filter((q) => ids.has(q.id) || q.tags.some((t) => tags.has(t.toLowerCase()))).length;
}

export const COVERAGE: CoverageRow[] = [
  // SQL coding
  { id: "sql-filter-sort", area: "SQL coding", topic: "Filtering, sorting, NULL logic, LIKE/IN/BETWEEN", missions: ["c1-roll-call", "c1-the-void", "c1-pattern-hunt"], codex: ["where", "null", "predicates"], tags: ["NULL", "three-valued logic", "LIKE"], minQuestions: 10 },
  { id: "sql-joins", area: "SQL coding", topic: "Joins: inner, outer, self, anti-join", missions: ["c2-inner", "c2-left", "c2-self", "c2-anti"], codex: ["inner-join", "outer-join", "self-join", "anti-join"], tags: ["joins", "join", "outer join", "self join", "anti-join"], minQuestions: 15 },
  { id: "sql-aggregates", area: "SQL coding", topic: "GROUP BY, HAVING, conditional aggregation, duplicates", missions: ["c3-having", "c3-bands", "c3-null-aggregates"], codex: ["group-by", "having", "case"], tags: ["group by", "having", "aggregates", "duplicates", "conditional aggregation"], minQuestions: 20 },
  { id: "sql-subqueries", area: "SQL coding", topic: "Subqueries, EXISTS, NOT IN trap, correlated, LATERAL", missions: ["c4-correlated", "c4-exists", "c4-not-exists", "c12-not-in-null"], codex: ["correlated-subquery", "exists", "not-in-null"], tags: ["subquery", "subqueries", "correlated subquery", "NOT IN", "EXISTS", "NOT EXISTS", "LATERAL"], minQuestions: 8 },
  { id: "sql-windows", area: "SQL coding", topic: "Window functions: ranking, running totals, LAG/LEAD, top-N per group", missions: ["c8-row-number", "c8-rank", "c8-running", "c8-lag", "c8-top2"], codex: ["window-functions", "ranking", "running-totals", "lag-lead", "top-n-per-group"], tags: ["window functions", "top-N per group", "running total", "LAG", "DENSE_RANK", "ROW_NUMBER"], minQuestions: 20 },
  { id: "sql-recursive", area: "SQL coding", topic: "Recursive CTEs, hierarchies, Oracle CONNECT BY", missions: ["c9-org", "c9-chain", "c9-path", "c9-calendar"], codex: ["cte", "recursive-cte", "connect-by", "row-generators"], tags: ["recursive CTE", "hierarchy", "bill of materials", "tree traversal"], minQuestions: 5 },
  { id: "sql-patterns", area: "SQL coding", topic: "Interview patterns: gaps and islands, sessionization, funnel, retention, dedupe, pivot", missions: ["c8-top2", "c10-pivot", "c3-bands"], codex: ["pivot", "top-n-per-group"], tags: ["gaps and islands", "sessionization", "funnel", "retention", "cohort", "pivot", "duplicates"], minQuestions: 10, gap: "Few dedicated missions for sessionization, funnels, cohorts and interval overlap; closed by K2a-K2e." },
  { id: "sql-dml", area: "SQL coding", topic: "INSERT/UPDATE/DELETE, MERGE and upsert", missions: ["c5-insert", "c5-raise", "c5-purge", "c5-upsert"], codex: ["insert", "update", "delete", "merge"], tags: ["upsert", "MERGE", "ON CONFLICT", "bulk insert", "bulk delete"], minQuestions: 4 },
  { id: "sql-pagination", area: "SQL coding", topic: "Pagination and top-N: OFFSET vs keyset", missions: ["c1-pecking-order"], codex: ["top-n", "order-by"], tags: ["pagination", "keyset", "OFFSET", "LIMIT"], minQuestions: 6 },
  { id: "sql-json", area: "SQL coding", topic: "JSON/JSONB in SQL and indexing it", missions: ["c10-json"], codex: ["json"], tags: ["JSON", "JSONB", "JSON_VALUE", "semi-structured"], questionIds: ["pg-jsonb-gin"], minQuestions: 3, gap: "Only one mission; JSON_TABLE and jsonpath are not exercised (I2d)." },
  { id: "sql-dialects", area: "SQL coding", topic: "Oracle vs PostgreSQL dialect differences", missions: ["c2-full", "c9-org", "c5-upsert"], codex: ["dual", "null-functions", "connect-by", "plsql"], tags: ["Oracle"], minQuestions: 20 },
  // Schema design
  { id: "schema-keys", area: "Schema design", topic: "Keys, constraints and integrity", missions: ["c7-create", "c7-reviews", "c5-purge"], codex: ["constraints", "create-table"], tags: ["keys", "foreign key", "constraints", "superkey", "candidate keys", "UNIQUE", "CHECK", "integrity"], minQuestions: 25 },
  { id: "schema-normalization", area: "Schema design", topic: "Normal forms, FDs, decomposition, denormalization", missions: ["c7-alter"], codex: ["normalization"], tags: ["3nf", "bcnf", "normal forms", "functional dependency", "decomposition", "denormalization", "lossless join"], minQuestions: 25, tools: ["/interview/schema", "lib/dbms/fd.ts"] },
  { id: "schema-er", area: "Schema design", topic: "ER modelling and mapping to tables", missions: ["c7-reviews"], codex: ["create-table"], tags: ["er", "er mapping", "cardinality", "weak entity", "isa", "many-to-many"], minQuestions: 20, tools: ["lib/dbms/er.ts"] },
  { id: "schema-scenarios", area: "Schema design", topic: "Design-a-schema scenarios (URL shortener, e-commerce, bookings, feed)", missions: [], codex: [], tags: ["schema design", "e-commerce", "bookings", "URL shortener", "Twitter"], minQuestions: 12, tools: ["lib/dbms/schemaDesign.ts"], gap: "Three scenarios graded by tests; seven more are planned in L1." },
  { id: "schema-warehouse", area: "Schema design", topic: "Dimensional modelling: star schema, grain, SCD", missions: [], codex: ["views", "materialized-views"], tags: ["star schema", "snowflake", "SCD", "data warehouse", "OLAP"], minQuestions: 4, gap: "Questions only; no mission or codex entry on dimensional modelling yet (I2b)." },
  { id: "schema-views-ddl", area: "Schema design", topic: "DDL, views, identity, migrations", missions: ["c7-alter", "c7-identity", "c7-view", "c7-ctas"], codex: ["alter-table", "identity", "views", "ctas"], tags: ["ddl", "views", "migrations", "expand/contract", "sequences", "UUID"], minQuestions: 8 },
  // Indexing and plans
  { id: "idx-btree", area: "Indexing and plans", topic: "B+ tree, clustered/secondary, hash indexes", missions: ["c10-index"], codex: ["indexes"], tags: ["b+ tree", "b-tree", "index", "clustered", "secondary index", "hash index", "extendible hashing", "linear hashing"], minQuestions: 30, tools: ["/interview/btree", "lib/dbms/btree.ts", "lib/dbms/hashing.ts"] },
  { id: "idx-design", area: "Indexing and plans", topic: "Composite, covering, expression, partial indexes; sargability", missions: ["c10-sargable", "c11-composite", "c11-expression", "c11-covering", "c11-redundant", "c12-implicit-conversion"], codex: ["composite-index", "expression-index", "covering-index", "sargable"], tags: ["composite index", "leftmost prefix", "covering index", "index-only scan", "expression index", "partial index", "sargable"], minQuestions: 14 },
  { id: "plan-reading", area: "Indexing and plans", topic: "Reading EXPLAIN / EXPLAIN ANALYZE", missions: ["c10-index"], codex: ["explain"], tags: ["EXPLAIN", "EXPLAIN ANALYZE", "seq scan", "cardinality estimate", "rows removed by filter"], minQuestions: 15, gap: "No mission grades a plan yet; closed by J3 (EXPLAIN chapter)." },
  { id: "plan-joins-cost", area: "Indexing and plans", topic: "Join algorithms, cost formulas, join order, statistics", missions: [], codex: ["explain"], tags: ["hash join", "merge join", "block nested loop", "nested loop", "join ordering", "selectivity", "statistics", "cost"], minQuestions: 25, tools: ["lib/dbms/joins.ts"] },
  { id: "plan-antipatterns", area: "Indexing and plans", topic: "Query anti-patterns: N+1, SELECT *, OR, implicit casts", missions: ["c12-n-plus-one", "c12-select-star", "c12-or", "c12-implicit-conversion"], codex: ["n-plus-one", "select-star", "implicit-conversion"], tags: ["N+1", "ORM", "round trips", "sargable"], minQuestions: 3 },
  // Transactions and locking
  { id: "tx-acid", area: "Transactions and locking", topic: "ACID, commit/rollback, savepoints", missions: ["c6-transfer", "c6-undo", "c6-savepoint", "c6-surgical"], codex: ["transactions", "savepoint"], tags: ["acid", "atomicity", "durability", "consistency", "savepoint", "transactions"], minQuestions: 15 },
  { id: "tx-isolation", area: "Transactions and locking", topic: "Isolation levels and anomalies (dirty, lost update, write skew, phantom)", missions: ["c6-isolation"], codex: ["isolation", "mysql-isolation"], tags: ["isolation", "isolation levels", "anomalies", "lost update", "write skew", "phantom", "snapshot isolation"], minQuestions: 25 },
  { id: "tx-locking", area: "Transactions and locking", topic: "Locks, 2PL, deadlocks, SELECT FOR UPDATE, optimistic locking", missions: ["c6-lock"], codex: ["locking"], tags: ["locking", "2pl", "deadlock", "SELECT FOR UPDATE", "optimistic locking", "pessimistic locking", "SKIP LOCKED", "intention locks"], minQuestions: 25, tools: ["lib/dbms/locking.ts"] },
  { id: "tx-schedules", area: "Transactions and locking", topic: "Serializability, recoverability, precedence graphs", missions: [], codex: ["transactions"], tags: ["conflict serializability", "view serializability", "precedence graph", "recoverability", "schedules", "serial"], minQuestions: 15, tools: ["lib/dbms/schedule.ts"] },
  { id: "tx-mvcc", area: "Transactions and locking", topic: "MVCC, undo, vacuum (PostgreSQL vs Oracle vs InnoDB)", missions: ["c6-isolation"], codex: ["isolation", "mysql-innodb"], tags: ["MVCC", "undo", "vacuum", "xmin", "xmax", "read consistency", "bloat"], minQuestions: 20, tools: ["lib/dbms/mvcc.ts"] },
  { id: "tx-recovery", area: "Transactions and locking", topic: "WAL, ARIES, checkpoints, crash recovery", missions: [], codex: [], tags: ["aries", "wal", "redo", "checkpoint", "logging", "steal", "force"], minQuestions: 25, tools: ["lib/dbms/recovery.ts"], gap: "Theory and generators only; no codex entry or mission (acceptable: not a SQL-coding topic)." },
  { id: "tx-app", area: "Transactions and locking", topic: "App-level correctness: idempotency, retries, races, job queues", missions: [], codex: [], tags: ["idempotency key", "retry", "race condition", "oversell", "job queue", "serialization failure", "check-then-act", "double booking"], minQuestions: 8 },
  // Scale and distribution
  { id: "scale-replication", area: "Scale and distribution", topic: "Replication, lag, failover, read-your-writes", missions: [], codex: [], tags: ["replication", "replication lag", "failover", "read replicas", "read-your-writes", "synchronous", "asynchronous"], minQuestions: 10 },
  { id: "scale-sharding", area: "Scale and distribution", topic: "Sharding, partition keys, consistent hashing, hot shards", missions: [], codex: ["partitioning"], tags: ["sharding", "partitioning", "consistent hashing", "hot shard", "hot partition", "resharding", "partition key", "cross-shard"], minQuestions: 15, tools: ["lib/dbms/distributed.ts"] },
  { id: "scale-consensus", area: "Scale and distribution", topic: "CAP/PACELC, quorums, consensus, 2PC, sagas", missions: [], codex: [], tags: ["CAP", "PACELC", "quorum", "Raft", "Paxos", "2PC", "saga", "consensus", "linearizability"], minQuestions: 20 },
  { id: "scale-caching", area: "Scale and distribution", topic: "Caching: cache-aside, stampede, invalidation, Redis", missions: [], codex: [], tags: ["caching", "cache-aside", "cache stampede", "write-through", "TTL", "Redis", "thundering herd"], minQuestions: 8 },
  { id: "scale-nosql", area: "Scale and distribution", topic: "NoSQL and store choice (key-value, document, wide-column, LSM)", missions: [], codex: [], tags: ["NoSQL", "DynamoDB", "Cassandra", "LSM tree", "document store", "store choice", "SSTable", "key-value"], minQuestions: 10 },
  { id: "scale-capacity", area: "Scale and distribution", topic: "Capacity estimation: QPS, rows, bytes, index size", missions: [], codex: [], tags: ["capacity", "capacity estimation", "QPS", "sizing", "storage per row", "index size"], minQuestions: 6, gap: "Questions only; solver-backed case studies come with L2." },
  // Data engineering
  { id: "de-analytics-sql", area: "Data engineering", topic: "Analytics SQL: cohorts, funnels, rolling windows, date series", missions: ["c8-running", "c8-share", "c9-calendar", "c10-pivot"], codex: ["window-functions", "pivot", "row-generators"], tags: ["cohort", "funnel", "retention", "moving average", "date series", "generate_series", "window frame", "date bucketing"], minQuestions: 8 },
  { id: "de-pipelines", area: "Data engineering", topic: "Pipelines: CDC, outbox, dual writes, exactly-once, backfills", missions: [], codex: [], tags: ["CDC", "outbox", "dual write", "exactly-once", "at-least-once", "backfill"], minQuestions: 5 },
  { id: "de-modelling", area: "Data engineering", topic: "Warehouse modelling: star schema, SCD, grain", missions: [], codex: ["materialized-views"], tags: ["star schema", "SCD", "data warehouse", "grain"], minQuestions: 3, gap: "Questions only; a dimensional-modelling mission and codex entry are still to do (I2b)." },
  // DBA operations
  { id: "dba-backup", area: "DBA operations", topic: "Backup, PITR, WAL archiving, RPO/RTO", missions: [], codex: [], tags: ["backup", "PITR", "WAL archiving", "RTO", "RPO", "pg_dump", "restore testing"], minQuestions: 5 },
  { id: "dba-maintenance", area: "DBA operations", topic: "Vacuum, bloat, statistics, monitoring slow queries", missions: [], codex: [], tags: ["vacuum", "autovacuum", "bloat", "pg_stat_statements", "slow queries", "monitoring", "ANALYZE"], minQuestions: 15 },
  { id: "dba-ddl-safety", area: "DBA operations", topic: "Zero-downtime DDL, lock queues, long transactions", missions: ["c7-alter"], codex: ["alter-table"], tags: ["migrations", "CREATE INDEX CONCURRENTLY", "lock queue", "NOT NULL", "long transaction", "long transactions", "idle in transaction"], minQuestions: 5 },
  { id: "dba-security", area: "DBA operations", topic: "Roles, privileges, row-level security", missions: [], codex: [], tags: ["row-level security", "security", "WITH CHECK OPTION"], minQuestions: 2, gap: "One RLS question; GRANT/REVOKE and role design are not covered (I2c)." },
  { id: "dba-programmable", area: "DBA operations", topic: "Triggers, functions, procedures, PL/pgSQL, PL/SQL", missions: [], codex: ["plsql"], tags: ["triggers", "stored procedures", "functions", "cursors", "audit"], minQuestions: 4, gap: "Closed by K4 (PL/pgSQL and PL/SQL)." },
  { id: "dba-pooling", area: "DBA operations", topic: "Connection pooling and sessions", missions: [], codex: [], tools: ["pooler questions only"], tags: ["connection pool", "connection pooling", "PgBouncer", "session state"], minQuestions: 2 },
];

/** Markdown for docs/COVERAGE.md, generated so counts never drift from the content. */
export function renderCoverageMd(rows: CoverageRow[], questions: { id: string; tags: string[] }[]): string {
  const out: string[] = [
    "# Interview coverage matrix",
    "",
    "Typical SDE, data-engineer and DBA interview topics against what Query Clash teaches. Generated from `lib/coverage.ts` by `tests/coverage.test.ts` (`UPDATE_COVERAGE=1 npx vitest run tests/coverage.test.ts` regenerates it), so the counts always match the content. Question counts use the tags listed in each row.",
    "",
    "Columns: **Q** = questions (min required), **M** = missions, **Codex** = codex entries, **Tools** = interactive solvers or generators, **Gap** = known weakness and the roadmap box that closes it.",
    "",
  ];
  const areas = [...new Set(rows.map((r) => r.area))];
  for (const area of areas) {
    out.push(`## ${area}`, "", "| Topic | Q | M | Codex | Tools | Gap |", "| --- | --- | --- | --- | --- | --- |");
    for (const r of rows.filter((x) => x.area === area)) {
      out.push(`| ${r.topic} | ${countQuestions(r, questions)} (≥${r.minQuestions}) | ${r.missions.length} | ${r.codex.length} | ${(r.tools ?? []).join(", ") || "-"} | ${r.gap ?? "-"} |`);
    }
    out.push("");
  }
  const gaps = rows.filter((r) => r.gap);
  out.push("## Open gaps", "", ...gaps.map((r) => `- **${r.topic}** (${r.area}): ${r.gap}`), "");
  return out.join("\n");
}

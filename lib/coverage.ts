import type { CodexEntry, Mission } from "@/content/types";
import type { Question } from "@/content/interview/types";

/**
 * Interview-coverage matrix: typical SDE / data-engineer / DBA interview topics against the content that trains them.
 * A row matches content by regex over lower-cased text, so adding content that mentions a topic raises its count.
 * `tests/coverage.test.ts` enforces the minimums; `docs/COVERAGE.md` shows the current numbers.
 */
export interface CoverageRow {
  id: string;
  area: string;
  topic: string;
  /** Matched against question tags + prompt, mission id + title + task, and codex id + title. */
  re: RegExp;
  /** Minimum interview questions that must match. */
  minQuestions: number;
  /** Minimum missions + codex entries that must match (hands-on content). 0 for pure theory rows. */
  minHandsOn: number;
}

export const COVERAGE_ROWS: CoverageRow[] = [
  { id: "sql-joins", area: "SQL coding", topic: "Joins (inner, outer, self, anti, semi)", re: /\bjoin|anti-join|semi-join/, minQuestions: 8, minHandsOn: 5 },
  { id: "sql-aggregation", area: "SQL coding", topic: "Aggregation, GROUP BY, HAVING, conditional aggregates", re: /aggregat|group by|having|group-by/, minQuestions: 8, minHandsOn: 5 },
  { id: "sql-subqueries", area: "SQL coding", topic: "Subqueries, EXISTS, correlated, NOT IN with NULL", re: /subquer|exists|not in|not-in|correlated|lateral/, minQuestions: 6, minHandsOn: 5 },
  { id: "sql-windows", area: "SQL coding", topic: "Window functions, ranking, running totals, top-N per group", re: /window|row_number|dense_rank|\blag\b|running total|top-n|ranking/, minQuestions: 10, minHandsOn: 5 },
  { id: "sql-cte", area: "SQL coding", topic: "CTEs and recursive queries, hierarchies", re: /\bcte\b|recursive|hierarch|connect by|connect-by/, minQuestions: 5, minHandsOn: 4 },
  { id: "sql-null", area: "SQL coding", topic: "NULL semantics and three-valued logic", re: /\bnull\b/, minQuestions: 10, minHandsOn: 3 },
  { id: "sql-sets", area: "SQL coding", topic: "Set operations (UNION, INTERSECT, EXCEPT)", re: /union|intersect|except|set operat|set-operat/, minQuestions: 5, minHandsOn: 3 },
  { id: "sql-dml", area: "SQL coding", topic: "DML: INSERT/UPDATE/DELETE, upsert, MERGE, RETURNING", re: /upsert|\bmerge\b|insert|returning|on conflict/, minQuestions: 4, minHandsOn: 4 },
  { id: "sql-dedupe-gaps", area: "SQL coding", topic: "Dedupe, gaps and islands, pagination, pivoting", re: /duplicat|distinct|gaps and islands|pagination|keyset|pivot|offset/, minQuestions: 6, minHandsOn: 3 },
  { id: "sql-dates-strings", area: "SQL coding", topic: "Dates, strings, JSON functions", re: /\bdates?\b|date_trunc|interval|extract|substr|string|json|\blike\b/, minQuestions: 3, minHandsOn: 3 },
  { id: "design-er", area: "Schema design", topic: "ER modelling and mapping to tables", re: /\ber\b|entity|cardinality|weak entity|relationship set/, minQuestions: 10, minHandsOn: 0 },
  { id: "design-normalization", area: "Schema design", topic: "Functional dependencies, normal forms, decomposition", re: /normaliz|\bbcnf|\b3nf|\b2nf|\b1nf|functional dependenc|decomposition|attribute closure/, minQuestions: 15, minHandsOn: 1 },
  { id: "design-keys-constraints", area: "Schema design", topic: "Keys, foreign keys, constraints, identity/UUID", re: /primary key|foreign key|candidate key|superkey|constraint|identity|uuid|\bkeys\b/, minQuestions: 15, minHandsOn: 3 },
  { id: "design-scenarios", area: "Schema design", topic: "Design scenarios (multi-tenancy, soft delete, hot rows, leaderboards)", re: /schema design|multi-tenan|soft delete|hot row|leaderboard|sharded counter|denormaliz/, minQuestions: 10, minHandsOn: 0 },
  { id: "design-migrations", area: "Schema design", topic: "Online migrations, backfills, zero-downtime DDL", re: /migration|backfill|concurrently|alter table|\bddl\b/, minQuestions: 4, minHandsOn: 2 },
  { id: "index-btree", area: "Indexing", topic: "B+ tree structure, fan-out, height, splits", re: /b\+ ?tree|b-tree|fan-?out|page split|occupancy/, minQuestions: 8, minHandsOn: 0 },
  { id: "index-design", area: "Indexing", topic: "Composite, covering, partial, expression indexes; leftmost prefix", re: /composite|covering|partial index|expression index|leftmost|index-only|index only|redundant/, minQuestions: 8, minHandsOn: 4 },
  { id: "index-hash-other", area: "Indexing", topic: "Hash, LSM, Bloom filters, clustered vs secondary", re: /hash index|extendible|linear hashing|lsm|bloom|clustered|secondary index/, minQuestions: 8, minHandsOn: 0 },
  { id: "plans-explain", area: "Query plans", topic: "Reading EXPLAIN / EXPLAIN ANALYZE, scans, estimates vs actuals", re: /explain|seq scan|index scan|query plan/, minQuestions: 8, minHandsOn: 1 },
  { id: "plans-joins-cost", area: "Query plans", topic: "Join algorithms and cost (nested loop, hash, merge)", re: /nested.loop|hash join|hash-join|merge join|sort-merge|block.nested|join order|left-deep/, minQuestions: 8, minHandsOn: 0 },
  { id: "plans-optimizer", area: "Query plans", topic: "Statistics, selectivity, sargability, anti-patterns", re: /statistic|selectivity|sargab|optimizer|histogram|n\+1|select \*|select-star|implicit/, minQuestions: 8, minHandsOn: 4 },
  { id: "tx-acid", area: "Transactions", topic: "ACID, commit/rollback, savepoints", re: /\bacid\b|atomicity|durability|savepoint|commit|rollback/, minQuestions: 8, minHandsOn: 3 },
  { id: "tx-isolation", area: "Transactions", topic: "Isolation levels and anomalies (dirty, non-repeatable, phantom, write skew)", re: /isolation|anomal|phantom|write skew|write-skew|lost update|dirty read|serializab/, minQuestions: 20, minHandsOn: 1 },
  { id: "tx-locking", area: "Transactions", topic: "Locking: 2PL, deadlocks, FOR UPDATE, NOWAIT, optimistic vs pessimistic", re: /\block|2pl|deadlock|for update|nowait|skip locked|optimistic|pessimistic/, minQuestions: 20, minHandsOn: 1 },
  { id: "tx-mvcc", area: "Transactions", topic: "MVCC, snapshots, vacuum/bloat, undo (PostgreSQL vs Oracle)", re: /mvcc|snapshot|vacuum|bloat|\bundo\b|xmin|read consistency|ora-01555/, minQuestions: 20, minHandsOn: 0 },
  { id: "tx-recovery", area: "Transactions", topic: "WAL, ARIES, checkpoints, crash and point-in-time recovery", re: /\bwal\b|aries|checkpoint|\bredo\b|recovery|pitr|backup/, minQuestions: 20, minHandsOn: 0 },
  { id: "scale-replication", area: "Scale and distribution", topic: "Replication, lag, failover, read-your-writes", re: /replication|replica|failover|read-your-writes|\blag\b|leader/, minQuestions: 8, minHandsOn: 0 },
  { id: "scale-sharding", area: "Scale and distribution", topic: "Sharding, partitioning, consistent hashing, resharding", re: /shard|partition|consistent.hash|resharding/, minQuestions: 10, minHandsOn: 1 },
  { id: "scale-consistency", area: "Scale and distribution", topic: "CAP/PACELC, quorums, consensus, clocks", re: /\bcap\b|pacelc|quorum|raft|consensus|vector clock|lamport|consistency model/, minQuestions: 10, minHandsOn: 0 },
  { id: "scale-distributed-tx", area: "Scale and distribution", topic: "2PC, sagas, idempotency, outbox/CDC, dual writes", re: /2pc|two-phase|saga|idempoten|outbox|\bcdc\b|dual write|at-least-once/, minQuestions: 6, minHandsOn: 0 },
  { id: "scale-caching", area: "Scale and distribution", topic: "Caching: cache-aside, write-through/behind, stampede, TTL", re: /cach|stampede|\bttl\b|redis/, minQuestions: 5, minHandsOn: 0 },
  { id: "scale-nosql", area: "Scale and distribution", topic: "NoSQL and store choice (document, key-value, wide-column)", re: /nosql|dynamodb|document store|store choice|key-value|wide-column|sstable|cassandra|mongo/, minQuestions: 5, minHandsOn: 0 },
  { id: "scale-capacity", area: "Scale and distribution", topic: "Capacity estimation and back-of-envelope sizing", re: /capacity|back-of-envelope|estimation/, minQuestions: 4, minHandsOn: 0 },
  { id: "ops-maintenance", area: "Operations", topic: "Vacuum/autovacuum, connection limits, pooling, long transactions", re: /vacuum|autovacuum|pool|long transaction|connection|bloat/, minQuestions: 8, minHandsOn: 0 },
];

export interface CoverageCounts {
  questions: number;
  missions: number;
  codex: number;
}

const qText = (q: Question): string => `${q.tags.join(" ")} ${q.prompt}`.toLowerCase();
const mText = (m: Mission): string => `${m.id} ${m.title} ${m.task}`.toLowerCase();
const cText = (c: CodexEntry): string => `${c.id} ${c.title}`.toLowerCase();

export function coverageFor(row: CoverageRow, questions: Question[], missions: Mission[], codex: CodexEntry[]): CoverageCounts {
  return {
    questions: questions.filter((q) => row.re.test(qText(q))).length,
    missions: missions.filter((m) => row.re.test(mText(m))).length,
    codex: codex.filter((c) => row.re.test(cText(c))).length,
  };
}

export function coverageMatrix(questions: Question[], missions: Mission[], codex: CodexEntry[]): { row: CoverageRow; counts: CoverageCounts }[] {
  return COVERAGE_ROWS.map((row) => ({ row, counts: coverageFor(row, questions, missions, codex) }));
}

/** Rows below their minimums, as human-readable lines. */
export function coverageHoles(matrix: { row: CoverageRow; counts: CoverageCounts }[]): string[] {
  const holes: string[] = [];
  for (const { row, counts } of matrix) {
    if (counts.questions < row.minQuestions) holes.push(`${row.id}: ${counts.questions}/${row.minQuestions} questions`);
    if (counts.missions + counts.codex < row.minHandsOn) holes.push(`${row.id}: ${counts.missions + counts.codex}/${row.minHandsOn} missions+codex`);
  }
  return holes;
}

export function coverageMarkdown(matrix: { row: CoverageRow; counts: CoverageCounts }[]): string {
  const lines = ["| Area | Topic | Questions | Missions | Codex |", "|---|---|---:|---:|---:|"];
  for (const { row, counts } of matrix) lines.push(`| ${row.area} | ${row.topic} | ${counts.questions} | ${counts.missions} | ${counts.codex} |`);
  return lines.join("\n");
}

import type { Question } from "@/content/interview/types";
import type { Mission } from "@/content/types";

/** One interview topic and how to recognise the content that covers it. Patterns are matched case-insensitively. */
export interface CoverageRow {
  group: string;
  topic: string;
  /** Matches a question's tags and id. */
  questions: RegExp;
  /** Matches a mission's id, title and task text (only for topics a SQL mission can exercise). */
  missions?: RegExp;
  /** Minimum questions the matrix must find (the test fails below this). */
  minQuestions: number;
  minMissions?: number;
}

export const COVERAGE_ROWS: CoverageRow[] = [
  { group: "SQL coding", topic: "Joins (inner, outer, self, anti)", questions: /\bjoins?\b|anti-join|outer join|self join/, missions: /c2-|join/, minQuestions: 10, minMissions: 4 },
  { group: "SQL coding", topic: "Aggregation, GROUP BY, HAVING", questions: /aggregat|group by|having|counting/, missions: /c3-|group by|having/, minQuestions: 10, minMissions: 4 },
  { group: "SQL coding", topic: "Subqueries, EXISTS, correlated", questions: /subquer|exists|correlated|anti-join|not in/, missions: /c4-|subquer|exists/, minQuestions: 8, minMissions: 4 },
  { group: "SQL coding", topic: "Window functions, top-N per group, running totals", questions: /window|^lag$|dense_rank|running total|top-n/, missions: /c8-|window|rank|top2/, minQuestions: 15, minMissions: 5 },
  { group: "SQL coding", topic: "Recursive CTEs and hierarchies", questions: /recursive cte|hierarchy/, missions: /c9-|recursive|cte/, minQuestions: 8, minMissions: 4 },
  { group: "SQL coding", topic: "NULL logic and set operations", questions: /\bnull\b|three-valued|set operations|union|intersect/, missions: /null|c1-the-void|union/, minQuestions: 15, minMissions: 2 },
  { group: "SQL coding", topic: "Pagination, ordering and ties", questions: /pagination|keyset|offset|order by|ties|limit/, missions: /c1-pecking|limit|fetch first/, minQuestions: 8, minMissions: 1 },
  { group: "SQL coding", topic: "DML: INSERT, UPDATE, DELETE, upsert, MERGE", questions: /upsert|merge|dml|soft delete|batching/, missions: /c5-/, minQuestions: 4, minMissions: 5 },
  { group: "SQL coding", topic: "Gaps and islands, conditional aggregation, percentiles", questions: /gaps and islands|conditional aggregation|percentile|percent of total/, minQuestions: 4 },
  { group: "Schema design", topic: "ER modelling and ER-to-tables mapping", questions: /(^| )er( |$)|er mapping|weak entity|cardinality|participation|isa|recursive relationship/, minQuestions: 15 },
  { group: "Schema design", topic: "Functional dependencies, keys, normal forms", questions: /3nf|bcnf|1nf|2nf|4nf|5nf|normal forms|functional dependency|candidate key|attribute closure|minimal cover|lossless/, minQuestions: 25 },
  { group: "Schema design", topic: "Constraints and keys (PK, FK, UNIQUE, CHECK)", questions: /constraints|foreign key|unique|superkey|keys\b|integrity/, missions: /c7-|constraint|create/, minQuestions: 20, minMissions: 4 },
  { group: "Schema design", topic: "Denormalization, star/snowflake, multi-tenancy, scenarios", questions: /denormalization|snowflake|multi-tenancy|schema design|olap|oltp/, minQuestions: 12 },
  { group: "Indexing", topic: "B+ tree structure, height, splits", questions: /b\+ tree|b-tree|fan-?out|page split|height/, minQuestions: 12 },
  { group: "Indexing", topic: "Composite, covering, partial, expression indexes", questions: /composite index|covering|leftmost prefix|partial index|expression index|index-only|sargable|secondary index/, missions: /c11-|c10-index|c10-sargable/, minQuestions: 15, minMissions: 5 },
  { group: "Indexing", topic: "Hash indexes, extendible and linear hashing", questions: /hash index|extendible|linear hashing|static hashing/, minQuestions: 6 },
  { group: "Indexing", topic: "LSM trees, Bloom filters, SSTables", questions: /lsm|bloom|sstable|compaction/, minQuestions: 4 },
  { group: "Query plans and tuning", topic: "Reading EXPLAIN / EXPLAIN ANALYZE", questions: /explain/, missions: /c10-final|c12-|index/, minQuestions: 10, minMissions: 2 },
  { group: "Query plans and tuning", topic: "Join algorithms, join order, optimizer statistics", questions: /hash join|merge join|nested loop|join ordering|left-deep|selectivity|statistics|optimizer|cost/, minQuestions: 25 },
  { group: "Query plans and tuning", topic: "Anti-patterns (N+1, SELECT *, OR, implicit casts, NOT IN)", questions: /n\+1|sargable|implicit|anti-?pattern|select \*/, missions: /c12-/, minQuestions: 4, minMissions: 5 },
  { group: "Transactions", topic: "ACID and transaction basics", questions: /acid|atomicity|durability|consistency|savepoint|autocommit|transaction states/, missions: /c6-/, minQuestions: 15, minMissions: 4 },
  { group: "Transactions", topic: "Isolation levels and anomalies", questions: /isolation|dirty read|phantom|lost update|write skew|snapshot isolation/, missions: /c6-isolation/, minQuestions: 25, minMissions: 1 },
  { group: "Transactions", topic: "Locking, deadlocks, 2PL, optimistic vs pessimistic", questions: /locking|deadlock|2pl|lock|nowait|optimistic|pessimistic/, missions: /c6-lock/, minQuestions: 30, minMissions: 1 },
  { group: "Transactions", topic: "MVCC, vacuum, bloat, undo and snapshots", questions: /mvcc|vacuum|bloat|xmin|snapshot|undo|read consistency/, minQuestions: 25 },
  { group: "Transactions", topic: "Schedules, serializability, precedence graphs", questions: /schedules?|serializ|precedence|view serializability|recoverab|cascad/, minQuestions: 15 },
  { group: "Transactions", topic: "Recovery: WAL, checkpoints, ARIES, PITR", questions: /wal|aries|checkpoint|redo|logging|pitr|steal|backup/, minQuestions: 25 },
  { group: "Transactions", topic: "Application-level: retries, idempotency, hot rows", questions: /retry|idempotency|race condition|hot row|contention|long transaction|dual write|at-least-once/, minQuestions: 8 },
  { group: "Scale and systems", topic: "Replication and replication lag", questions: /replication|failover|read-your-writes/, minQuestions: 8 },
  { group: "Scale and systems", topic: "Sharding, partitioning, consistent hashing", questions: /sharding|partitioning|consistent hashing|consistent-hashing/, minQuestions: 12 },
  { group: "Scale and systems", topic: "Caching (cache-aside, stampede, TTL, Redis)", questions: /caching|cache|redis|ttl/, minQuestions: 6 },
  { group: "Scale and systems", topic: "CAP, PACELC, quorums, consensus, 2PC, sagas", questions: /(^| )cap( |$)|pacelc|quorum|raft|2pc|saga|leader election|consistency models/, minQuestions: 20 },
  { group: "Scale and systems", topic: "NoSQL and picking a store", questions: /nosql|dynamodb|document store|store choice|sql vs nosql/, minQuestions: 6 },
  { group: "Scale and systems", topic: "Migrations and operations", questions: /migrations|create index concurrently|backfill|autovacuum|cdc|capacity/, minQuestions: 6 },
  { group: "Storage engine", topic: "Pages, buffer pool, file organisation, external sort", questions: /buffer pool|lru|pages|blocking factor|clustered|external sort|iot|file system|blocks/, minQuestions: 15 },
];

export interface CoverageResult {
  row: CoverageRow;
  questions: Question[];
  missions: Mission[];
}

const matches = (re: RegExp, q: Question) => q.tags.some((t) => re.test(t.toLowerCase()));

export function computeCoverage(questions: Question[], missions: Mission[]): CoverageResult[] {
  return COVERAGE_ROWS.map((row) => ({
    row,
    questions: questions.filter((q) => matches(row.questions, q)),
    missions: row.missions ? missions.filter((m) => row.missions!.test(`${m.id} ${m.title} ${m.task}`.toLowerCase())) : [],
  }));
}

export function coverageMarkdown(results: CoverageResult[], total: { questions: number; missions: number }): string {
  const out: string[] = [
    "# Interview coverage matrix",
    "",
    "Generated by `tests/coverage.test.ts` (run with `UPDATE_COVERAGE=1 npx vitest run tests/coverage.test.ts` to refresh). Each row is a topic that real SDE / data-engineer / DBA loops ask about; the counts are the authored questions (matched on tags only) and SQL missions (matched on id, title and task text) that cover it. A question can count under several rows. The test fails if any row drops below its minimum, so a hole cannot reopen silently.",
    "",
    `Totals: ${total.questions} authored questions (plus seeded generators) and ${total.missions} SQL missions.`,
    "",
  ];
  let group = "";
  for (const r of results) {
    if (r.row.group !== group) {
      group = r.row.group;
      out.push("", `## ${group}`, "", "| Topic | Questions | Min | Missions | Example question ids |", "| --- | ---: | ---: | ---: | --- |");
    }
    const ex = r.questions.slice(0, 3).map((q) => `\`${q.id}\``).join(", ");
    out.push(`| ${r.row.topic} | ${r.questions.length} | ${r.row.minQuestions} | ${r.row.missions ? r.missions.length : "n/a"} | ${ex} |`);
  }
  out.push("");
  return out.join("\n");
}

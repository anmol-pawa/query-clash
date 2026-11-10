# Interview coverage matrix

Typical SDE, data-engineer and DBA interview topics against the content that trains them, counted from the code by `lib/coverage.ts`
(each row is a regex over question tags and prompts, mission ids, titles and tasks, and codex ids and titles). `tests/coverage.test.ts`
fails when any row drops below its minimum and when the table below is out of date, so regenerate it by pasting the failing diff's
expected table. Numbers are matches, not a quality score; a hit can be a passing mention. Treat low **Missions** counts as the real signal.

| Area | Topic | Questions | Missions | Codex |
|---|---|---:|---:|---:|
| SQL coding | Joins (inner, outer, self, anti, semi) | 65 | 2 | 6 |
| SQL coding | Aggregation, GROUP BY, HAVING, conditional aggregates | 32 | 2 | 4 |
| SQL coding | Subqueries, EXISTS, correlated, NOT IN with NULL | 25 | 5 | 5 |
| SQL coding | Window functions, ranking, running totals, top-N per group | 28 | 4 | 6 |
| SQL coding | CTEs and recursive queries, hierarchies | 7 | 2 | 3 |
| SQL coding | NULL semantics and three-valued logic | 39 | 9 | 3 |
| SQL coding | Set operations (UNION, INTERSECT, EXCEPT) | 15 | 1 | 2 |
| SQL coding | DML: INSERT/UPDATE/DELETE, upsert, MERGE, RETURNING | 33 | 7 | 4 |
| SQL coding | Dedupe, gaps and islands, pagination, pivoting | 31 | 3 | 4 |
| SQL coding | Dates, strings, JSON functions | 26 | 5 | 6 |
| Schema design | ER modelling and mapping to tables | 28 | 1 | 2 |
| Schema design | Functional dependencies, normal forms, decomposition | 35 | 0 | 1 |
| Schema design | Keys, foreign keys, constraints, identity/UUID | 60 | 3 | 4 |
| Schema design | Design scenarios (multi-tenancy, soft delete, hot rows, leaderboards) | 25 | 0 | 0 |
| Schema design | Online migrations, backfills, zero-downtime DDL | 14 | 0 | 2 |
| Indexing | B+ tree structure, fan-out, height, splits | 32 | 0 | 0 |
| Indexing | Composite, covering, partial, expression indexes; leftmost prefix | 15 | 3 | 2 |
| Indexing | Hash, LSM, Bloom filters, clustered vs secondary | 29 | 0 | 1 |
| Query plans | Reading EXPLAIN / EXPLAIN ANALYZE, scans, estimates vs actuals | 22 | 0 | 1 |
| Query plans | Join algorithms and cost (nested loop, hash, merge) | 25 | 0 | 0 |
| Query plans | Statistics, selectivity, sargability, anti-patterns | 27 | 4 | 5 |
| Transactions | ACID, commit/rollback, savepoints | 77 | 5 | 3 |
| Transactions | Isolation levels and anomalies (dirty, non-repeatable, phantom, write skew) | 52 | 1 | 2 |
| Transactions | Locking: 2PL, deadlocks, FOR UPDATE, NOWAIT, optimistic vs pessimistic | 53 | 2 | 1 |
| Transactions | MVCC, snapshots, vacuum/bloat, undo (PostgreSQL vs Oracle) | 60 | 5 | 0 |
| Transactions | WAL, ARIES, checkpoints, crash and point-in-time recovery | 48 | 1 | 0 |
| Scale and distribution | Replication, lag, failover, read-your-writes | 26 | 1 | 1 |
| Scale and distribution | Sharding, partitioning, consistent hashing, resharding | 28 | 0 | 1 |
| Scale and distribution | CAP/PACELC, quorums, consensus, clocks | 22 | 0 | 0 |
| Scale and distribution | 2PC, sagas, idempotency, outbox/CDC, dual writes | 20 | 0 | 0 |
| Scale and distribution | Caching: cache-aside, write-through/behind, stampede, TTL | 13 | 0 | 0 |
| Scale and distribution | NoSQL and store choice (document, key-value, wide-column) | 16 | 0 | 0 |
| Scale and distribution | Capacity estimation and back-of-envelope sizing | 9 | 0 | 0 |
| Operations | Vacuum/autovacuum, connection limits, pooling, long transactions | 24 | 0 | 0 |

## Reading the matrix

- **Questions** are DBMS Interview mode bank questions (authored banks only; seeded generator questions are not counted).
- **Missions** are SQL campaign rounds run on PGlite (PostgreSQL) with an Oracle-form reference; **Codex** is the reference entries.
- Theory-heavy rows (B+ trees, recovery, replication, CAP, caching, capacity) have no missions by design: PGlite is a single in-browser
  instance, so replication, sharding and crash recovery are trained through questions and the numeric/ordering solvers in `lib/dbms`.

## Holes the matrix shows, and where they are filled

| Hole | Why it matters | Plan |
|---|---|---|
| Recursive CTE / hierarchy has 2 missions | Org-chart and graph-traversal questions are a staple of SQL rounds | ROADMAP J2 (chapter 14) |
| Reading and fixing `EXPLAIN` plans has no mission | Query-tuning rounds ask candidates to fix a slow query from its plan | ROADMAP J3 (chapter 15, plan-based grading) |
| Window functions: only 4 missions | Frames, `LAST_VALUE` trap, `NTILE`, `LEAD`/`LAG` defaults come up constantly | ROADMAP J1 (chapter 13) |
| Set operations had 1 chapter mission | `INTERSECT`/`EXCEPT` and `UNION` vs `UNION ALL` are common warm-ups | Filled by I2b: interview missions `iq-set-intersect-signups` and `iq-set-except-never-sold` (hidden NULL/duplicate data, naive queries tested). The matrix counts chapter missions only, so these show up in the Questions column |
| Functional dependencies / normalization has no mission | Pure theory; trained by the FD closure, key and decomposition solvers (`lib/dbms/fd.ts`, `keys.ts`) in interview mode | none needed |
| Replication, sharding, consensus, caching, capacity | Distributed design rounds; cannot be run on one PGlite instance | covered by question banks; revisit in the K practice modes |

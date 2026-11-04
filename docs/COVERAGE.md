# Interview coverage matrix

Typical SDE, data-engineer and DBA interview topics against what Query Clash teaches. Generated from `lib/coverage.ts` by `tests/coverage.test.ts` (`UPDATE_COVERAGE=1 npx vitest run tests/coverage.test.ts` regenerates it), so the counts always match the content. Question counts use the tags listed in each row.

Columns: **Q** = questions (min required), **M** = missions, **Codex** = codex entries, **Tools** = interactive solvers or generators, **Gap** = known weakness and the roadmap box that closes it.

## SQL coding

| Topic | Q | M | Codex | Tools | Gap |
| --- | --- | --- | --- | --- | --- |
| Filtering, sorting, NULL logic, LIKE/IN/BETWEEN | 29 (≥10) | 3 | 3 | - | - |
| Joins: inner, outer, self, anti-join | 30 (≥15) | 4 | 4 | - | - |
| GROUP BY, HAVING, conditional aggregation, duplicates | 34 (≥20) | 3 | 3 | - | - |
| Subqueries, EXISTS, NOT IN trap, correlated, LATERAL | 13 (≥8) | 4 | 3 | - | - |
| Window functions: ranking, running totals, LAG/LEAD, top-N per group | 23 (≥20) | 5 | 5 | - | - |
| Recursive CTEs, hierarchies, Oracle CONNECT BY | 5 (≥5) | 4 | 4 | - | - |
| Interview patterns: gaps and islands, sessionization, funnel, retention, dedupe, pivot | 13 (≥10) | 3 | 2 | - | Few dedicated missions for sessionization, funnels, cohorts and interval overlap; closed by K2a-K2e. |
| INSERT/UPDATE/DELETE, MERGE and upsert | 5 (≥4) | 4 | 4 | - | - |
| Pagination and top-N: OFFSET vs keyset | 7 (≥6) | 1 | 2 | - | - |
| JSON/JSONB in SQL and indexing it | 3 (≥3) | 1 | 1 | - | Only one mission; JSON_TABLE and jsonpath are not exercised (I2d). |
| Oracle vs PostgreSQL dialect differences | 26 (≥20) | 3 | 4 | - | - |

## Schema design

| Topic | Q | M | Codex | Tools | Gap |
| --- | --- | --- | --- | --- | --- |
| Keys, constraints and integrity | 33 (≥25) | 3 | 2 | - | - |
| Normal forms, FDs, decomposition, denormalization | 29 (≥25) | 1 | 1 | /interview/schema, lib/dbms/fd.ts | - |
| ER modelling and mapping to tables | 28 (≥20) | 1 | 1 | lib/dbms/er.ts | - |
| Design-a-schema scenarios (URL shortener, e-commerce, bookings, feed) | 16 (≥12) | 0 | 0 | lib/dbms/schemaDesign.ts | Three scenarios graded by tests; seven more are planned in L1. |
| Dimensional modelling: star schema, grain, SCD | 6 (≥4) | 0 | 2 | - | Questions only; no mission or codex entry on dimensional modelling yet (I2b). |
| DDL, views, identity, migrations | 16 (≥8) | 4 | 4 | - | - |

## Indexing and plans

| Topic | Q | M | Codex | Tools | Gap |
| --- | --- | --- | --- | --- | --- |
| B+ tree, clustered/secondary, hash indexes | 51 (≥30) | 1 | 1 | /interview/btree, lib/dbms/btree.ts, lib/dbms/hashing.ts | - |
| Composite, covering, expression, partial indexes; sargability | 14 (≥14) | 6 | 4 | - | - |
| Reading EXPLAIN / EXPLAIN ANALYZE | 21 (≥15) | 1 | 1 | - | No mission grades a plan yet; closed by J3 (EXPLAIN chapter). |
| Join algorithms, cost formulas, join order, statistics | 32 (≥25) | 0 | 1 | lib/dbms/joins.ts | - |
| Query anti-patterns: N+1, SELECT *, OR, implicit casts | 7 (≥3) | 4 | 3 | - | - |

## Transactions and locking

| Topic | Q | M | Codex | Tools | Gap |
| --- | --- | --- | --- | --- | --- |
| ACID, commit/rollback, savepoints | 25 (≥15) | 4 | 2 | - | - |
| Isolation levels and anomalies (dirty, lost update, write skew, phantom) | 34 (≥25) | 1 | 2 | - | - |
| Locks, 2PL, deadlocks, SELECT FOR UPDATE, optimistic locking | 35 (≥25) | 1 | 1 | lib/dbms/locking.ts | - |
| Serializability, recoverability, precedence graphs | 22 (≥15) | 0 | 1 | lib/dbms/schedule.ts | - |
| MVCC, undo, vacuum (PostgreSQL vs Oracle vs InnoDB) | 39 (≥20) | 1 | 2 | lib/dbms/mvcc.ts | - |
| WAL, ARIES, checkpoints, crash recovery | 42 (≥25) | 0 | 0 | lib/dbms/recovery.ts | Theory and generators only; no codex entry or mission (acceptable: not a SQL-coding topic). |
| App-level correctness: idempotency, retries, races, job queues | 11 (≥8) | 0 | 0 | - | - |

## Scale and distribution

| Topic | Q | M | Codex | Tools | Gap |
| --- | --- | --- | --- | --- | --- |
| Replication, lag, failover, read-your-writes | 14 (≥10) | 0 | 0 | - | - |
| Sharding, partition keys, consistent hashing, hot shards | 19 (≥15) | 0 | 1 | lib/dbms/distributed.ts | - |
| CAP/PACELC, quorums, consensus, 2PC, sagas | 26 (≥20) | 0 | 0 | - | - |
| Caching: cache-aside, stampede, invalidation, Redis | 11 (≥8) | 0 | 0 | - | - |
| NoSQL and store choice (key-value, document, wide-column, LSM) | 16 (≥10) | 0 | 0 | - | - |
| Capacity estimation: QPS, rows, bytes, index size | 9 (≥6) | 0 | 0 | - | Questions only; solver-backed case studies come with L2. |

## Data engineering

| Topic | Q | M | Codex | Tools | Gap |
| --- | --- | --- | --- | --- | --- |
| Analytics SQL: cohorts, funnels, rolling windows, date series | 9 (≥8) | 4 | 3 | - | - |
| Pipelines: CDC, outbox, dual writes, exactly-once, backfills | 5 (≥5) | 0 | 0 | - | - |
| Warehouse modelling: star schema, SCD, grain | 3 (≥3) | 0 | 1 | - | Questions only; a dimensional-modelling mission and codex entry are still to do (I2b). |

## DBA operations

| Topic | Q | M | Codex | Tools | Gap |
| --- | --- | --- | --- | --- | --- |
| Backup, PITR, WAL archiving, RPO/RTO | 5 (≥5) | 0 | 0 | - | - |
| Vacuum, bloat, statistics, monitoring slow queries | 18 (≥15) | 0 | 0 | - | - |
| Zero-downtime DDL, lock queues, long transactions | 8 (≥5) | 1 | 1 | - | - |
| Roles, privileges, row-level security | 4 (≥2) | 0 | 0 | - | One RLS question; GRANT/REVOKE and role design are not covered (I2c). |
| Triggers, functions, procedures, PL/pgSQL, PL/SQL | 4 (≥4) | 0 | 1 | - | Closed by K4 (PL/pgSQL and PL/SQL). |
| Connection pooling and sessions | 2 (≥2) | 0 | 0 | pooler questions only | - |

## Open gaps

- **Interview patterns: gaps and islands, sessionization, funnel, retention, dedupe, pivot** (SQL coding): Few dedicated missions for sessionization, funnels, cohorts and interval overlap; closed by K2a-K2e.
- **JSON/JSONB in SQL and indexing it** (SQL coding): Only one mission; JSON_TABLE and jsonpath are not exercised (I2d).
- **Design-a-schema scenarios (URL shortener, e-commerce, bookings, feed)** (Schema design): Three scenarios graded by tests; seven more are planned in L1.
- **Dimensional modelling: star schema, grain, SCD** (Schema design): Questions only; no mission or codex entry on dimensional modelling yet (I2b).
- **Reading EXPLAIN / EXPLAIN ANALYZE** (Indexing and plans): No mission grades a plan yet; closed by J3 (EXPLAIN chapter).
- **WAL, ARIES, checkpoints, crash recovery** (Transactions and locking): Theory and generators only; no codex entry or mission (acceptable: not a SQL-coding topic).
- **Capacity estimation: QPS, rows, bytes, index size** (Scale and distribution): Questions only; solver-backed case studies come with L2.
- **Warehouse modelling: star schema, SCD, grain** (Data engineering): Questions only; a dimensional-modelling mission and codex entry are still to do (I2b).
- **Roles, privileges, row-level security** (DBA operations): One RLS question; GRANT/REVOKE and role design are not covered (I2c).
- **Triggers, functions, procedures, PL/pgSQL, PL/SQL** (DBA operations): Closed by K4 (PL/pgSQL and PL/SQL).

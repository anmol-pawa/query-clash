# Coverage matrix: SDE, data-engineer and DBA database interview topics

Each row maps a typical interview topic to the campaign missions (chapters 1-12), the codex entries and a few of the authored interview questions that cover it. `tests/coverage.test.ts` checks that every id named in backticks exists and that each topic names at least two example questions, so the matrix cannot drift from the code. Topics with no mission (pure theory, system design) are covered by questions and codex only; the "Gap" column says what is still thin.

| Topic | Missions | Codex | Example questions | Gap |
| --- | --- | --- | --- | --- |
| Joins and anti-joins | `c2-inner`, `c2-left`, `c2-three-way`, `c2-self`, `c2-anti`, `c2-full` | `inner-join`, `outer-join`, `self-join`, `anti-join` | `basics-outer-join`, `joinfine-exists-vs-join`, `qry-which-join` | none |
| Aggregation and GROUP BY | `c3-headcount`, `c3-having`, `c3-bands`, `c3-null-aggregates` | `aggregates`, `group-by`, `having` | `basics-where-having`, `basics-null-avg`, `query-count-column-nulls` | none |
| Subqueries | `c4-correlated`, `c4-exists`, `c4-not-exists`, `c4-inline-view` | `correlated-subquery`, `exists`, `not-in-null` | `subfine-not-in-null`, `subfine-scalar-two-rows`, `joinfine-exists-vs-join` | LATERAL has only two questions |
| NULL and three-valued logic | `c1-the-void`, `c12-not-in-null`, `c3-null-aggregates` | `null`, `null-functions` | `basics-null-compare`, `basics-null-count`, `basics-not-in-null` | none |
| Window functions | `c8-row-number`, `c8-rank`, `c8-running`, `c8-lag`, `c8-top2`, `c8-share` | `window-functions`, `ranking`, `running-totals`, `lag-lead`, `top-n-per-group` | `winfine-dense-rank`, `winfine-running-frame`, `winfine-row-number-ties` | ROWS/RANGE/GROUPS and NTILE missions are chapter 13 (J1) |
| Recursive CTEs and hierarchies | `c9-cte`, `c9-org`, `c9-chain`, `c9-path`, `c9-teams`, `c9-calendar` | `cte`, `recursive-cte`, `connect-by`, `row-generators` | `recfine-working-table`, `recfine-union-cycle`, `recfine-cycle-clause`, `recfine-connect-by-direction`, `er-recursive` | cycle-guard and shortest-path missions are chapter 14 (J2) |
| DML, upsert and MERGE | `c5-insert`, `c5-raise`, `c5-open-accounts`, `c5-loyalty`, `c5-purge`, `c5-upsert` | `insert`, `update`, `delete`, `merge` | `sqlfine-limit-offset`, `apptx-oversell-fix`, `ops-add-not-null` | bulk-load (COPY) questions are single |
| Pagination | `c1-pecking-order` | `top-n`, `mysql-limit` | `scale-offset-cost`, `scale-keyset-query`, `dialect-row-limit` | none |
| Schema design | `c7-create`, `c7-alter`, `c7-reviews`, `c7-identity`, `c7-view`, `c7-ctas` | `create-table`, `constraints`, `identity`, `views` | `schema-soft-delete-unique`, `schema-soft-delete-tradeoff`, `schema-audit-table`, `nf-denormalize` | none |
| Normalization and keys | none (theory) | `normalization` | `nf-prime`, `nf-minimal-cover`, `nf-3nf-transitive`, `nf-3nf-not-bcnf` | generators cover closure, keys and decomposition |
| ER modelling | none (theory) | `normalization` | `er-weak-entity`, `er-discriminator`, `er-weak-pk`, `er-recursive` | none |
| Indexing | `c10-index`, `c11-composite`, `c11-expression`, `c11-sorted`, `c11-covering`, `c11-redundant` | `indexes`, `composite-index`, `expression-index`, `covering-index`, `sargable` | `sto-btree-vs-bplus`, `sto-range`, `sto-all-leaves-same-depth`, `sto-split-copy` | none |
| Query plans and tuning | `c10-sargable`, `c12-n-plus-one`, `c12-select-star`, `c12-or`, `c12-implicit-conversion` | `explain`, `sargable`, `n-plus-one`, `select-star`, `implicit-conversion` | `qry-hash-eq`, `qry-hash-phases`, `qry-hash-build`, `qry-merge-cost` | plan-graded missions are chapter 15 (J3) |
| Transactions and ACID | `c6-transfer`, `c6-undo`, `c6-savepoint`, `c6-surgical` | `transactions`, `savepoint` | `basics-acid-i`, `tx-atomicity`, `tx-durability`, `tx-isolation-component` | none |
| Isolation levels and anomalies | `c6-isolation` | `isolation`, `mysql-isolation` | `tx-lost-update`, `tx-read-committed`, `tx-phantom`, `tx-levels-order` | none |
| Locking and deadlocks | `c6-lock` | `locking` | `cc-2pl-phases`, `cc-2pl-guarantee`, `cc-2pl-order`, `cc-lock-point`, `apptx-skip-locked` | none |
| MVCC and vacuum | none (theory) | `mysql-innodb` | `tx-pg-read-uncommitted`, `rec-idempotent` | the MVCC bank has 40+ questions; no mission can show a bloated table yet |
| Recovery and WAL | none (theory) | none | `rec-wal`, `rec-checkpoint`, `rec-aries-phases`, `rec-repeat-history` | no codex entry for WAL or ARIES (covered in questions only) |
| Replication | none (theory) | none | `dst-sync-async`, `dst-read-your-writes`, `dst-shard-vs-replica`, `dst-read-scale` | no mission or codex entry |
| Sharding and partitioning | none (theory) | `partitioning` | `dst-hot-shard`, `dst-mod-reshard`, `dst-consistent-hash`, `dst-shard-vs-replica` | none |
| Caching | none (theory) | none | `cache-aside-read`, `cache-invalidate-delete`, `cache-stampede`, `cache-stampede-fixes` | no codex entry |
| NoSQL and store choice | none (theory) | none | `store-sql-vs-nosql`, `store-families`, `store-document-fit`, `store-btree-vs-lsm` | none |
| Distributed transactions and consensus | none (theory) | none | `dst-cap`, `dst-cap-c`, `dst-pacelc` | none |
| Migrations and operations | none (theory) | none | `ops-expand-contract`, `ops-add-not-null`, `ops-index-concurrently`, `ops-concurrently-failure` | none |
| Application-level concurrency | none (theory) | none | `apptx-oversell-fix`, `apptx-skip-locked`, `txbasic-serialization-failure`, `mvcc-rr-error-code` | none |
| JSON in SQL | `c10-json` | `json` | `sql-json-fragile-by-hub`, `jsonfine-pg-arrow-text`, `jsonfine-jsonb-gin`, `jsonfine-oracle-value-vs-query` | none |
| Capacity estimation | none (theory) | none | `sto-capacity`, `scale-counter-slots`, `apptx-pool-math`, `store-wcu` | none |

## Holes found and filled

- **Recursive CTEs and hierarchies** had three authored questions (all SQL missions), none about how the recursion works, termination or cycle guards. `content/interview/recursiveFine.ts` adds nine: the working-table rule, a traced row count, a row generator, `UNION` vs `UNION ALL` on a cycle, a runaway cycle (PostgreSQL loops, Oracle ORA-32044), the `CYCLE` clause, the single-self-reference rule, `CONNECT BY PRIOR` direction and date-series generators in both dialects.
- **JSON in SQL** had one question. `content/interview/jsonFine.ts` adds three: `->>` returns text so it needs a cast, a GIN index for jsonb containment, and Oracle `JSON_QUERY` vs `JSON_VALUE`.

## Holes still open

- Replication, caching, recovery and distributed topics have questions but no codex entries. Codex additions are queued under the post-game and quality sections of ROADMAP.md.
- Chapters 13-15 (window mastery, recursive CTEs, plan-graded tuning) add missions to the rows marked above.

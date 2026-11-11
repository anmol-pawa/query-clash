# Version facts used in Query Clash

Every version-specific claim in the game is listed here with a stamp. Re-check on each freshness pass; sources are the official release notes.

**As of November 2026**

| Fact | Engine | Source |
|---|---|---|
| PostgreSQL 18 was released 2025-09-25; the latest 18.x minor found was 18.4 (May 2026). | PostgreSQL | postgresql.org release notes |
| PostgreSQL 18 headline items: asynchronous I/O subsystem, `uuidv7()`, virtual generated columns, `RETURNING OLD/NEW`, temporal constraints, planner statistics kept across `pg_upgrade`. | PostgreSQL 18 | postgresql.org/docs/18/release-18.html |
| `MERGE` arrived in PostgreSQL 15; `MERGE ... RETURNING`, `WHEN NOT MATCHED BY SOURCE` and `JSON_TABLE` arrived in 17. | PostgreSQL 15/17 | release notes |
| PostgreSQL 19 was in beta (beta 4 scheduled 2026-09-24); no GA date is relied on here. | PostgreSQL 19 | postgresql.org |
| The Oracle 23ai feature set (BOOLEAN, `IF [NOT] EXISTS`, `SELECT` without `FROM`, multi-row `VALUES`, JSON relational duality) became available on-premises as Oracle AI Database 26ai (release update 23.26.1, January 2026, Linux x86-64). | Oracle | Oracle database blog |
| Oracle `EXCEPT` and `INTERSECT ALL` need 21c or later; `MINUS` works everywhere. | Oracle | Oracle SQL reference (check the release) |

Game runs queries on PGlite (PostgreSQL in WASM); Oracle mode is an emulated translation, never real Oracle.

import { BASICS, BASICS_GENERATORS } from "./basics";
import { CONCURRENCY, CONCURRENCY_GENERATORS } from "./concurrency";
import { CONCURRENCY_MORE } from "./concurrencyMore";
import { DISTRIBUTED, DISTRIBUTED_GENERATORS } from "./distributed";
import { DISTRIBUTED_MORE } from "./distributedMore";
import { DISTRIBUTED_MORE_2 } from "./distributedMore2";
import { COSTS_MORE } from "./costsMore";
import { SCHEDULES_MORE } from "./schedulesMore";
import { ISOLATION_MORE } from "./isolationMore";
import { KEYS_MORE } from "./keysMore";
import { QUERY_SEMANTICS_MORE } from "./querySemanticsMore";
import { STORAGE_FINE } from "./storageFine";
import { DIALECTS_MORE } from "./dialectsMore";
import { CONSTRAINTS_MORE } from "./constraintsMore";
import { LOCKING_FINE } from "./lockingFine";
import { ALGEBRA_FINE } from "./algebraFine";
import { TX_FINE } from "./txFine";
import { OPTIMIZER_FINE } from "./optimizerFine";
import { INDEX_FINE } from "./indexFine";
import { NORMALIZATION_FINE } from "./normalizationFine";
import { ER, ER_GENERATORS } from "./er";
import { ER_MORE } from "./erMore";
import { MVCC_FINE } from "./mvccFine";
import { DISTRIBUTED_FINE } from "./distributedFine";
import { BASICS_FINE } from "./basicsFine";
import { ER_FINE } from "./erFine";
import { WINDOW_FINE } from "./windowFine";
import { JOIN_FINE } from "./joinFine";
import { SUBQUERY_FINE } from "./subqueryFine";
import { SQL_FINE } from "./sqlFine";
import { TX_BASICS_FINE } from "./txBasicsFine";
import { RECOVERY_FINE } from "./recoveryFine";
import { BUFFER_FINE } from "./bufferFine";
import { EXEC_FINE } from "./execFine";
import { SCHED_FINE } from "./schedFine";
import { ISOLATION_FINE } from "./isolationFine";
import { ENGINE_FINE } from "./engineFine";
import { TREE_HASH_FINE } from "./treeHashFine";
import { NULL_SET_FINE } from "./nullSetFine";
import { PROGRAMMABLE_FINE } from "./programmableFine";
import { SCHEMA_DESIGN_FINE } from "./schemaDesignFine";
import { MVCC, MVCC_GENERATORS } from "./mvcc";
import { MVCC_MORE } from "./mvccMore";
import { QUERY, QUERY_GENERATORS } from "./query";
import { QUERY_MORE } from "./queryMore";
import { RECOVERY, RECOVERY_GENERATORS } from "./recovery";
import { RECOVERY_MORE } from "./recoveryMore";
import { SQL } from "./sql";
import { STORAGE, STORAGE_GENERATORS } from "./storage";
import { STORAGE_MORE } from "./storageMore";
import { NORMALIZATION, NORMALIZATION_GENERATORS } from "./normalization";
import { NORMALIZATION_MORE } from "./normalizationMore";
import { TRANSACTIONS, TRANSACTIONS_GENERATORS } from "./transactions";
import { TRANSACTIONS_MORE } from "./transactionsMore";
import type { Generator, Question, Topic, TopicId } from "./types";

export type * from "./types";
export { SQL_MISSIONS } from "./sql";

/** The interview curriculum, in study order. Topics without questions yet show as "coming soon". */
export const TOPICS: Topic[] = [
  { id: "basics", foe: "nulloth", title: "DBMS Fundamentals", blurb: "Why a DBMS, schema levels, SQL sublanguages, relations and keys.", color: "#60a5fa" },
  { id: "er", foe: "joinmaster", title: "ER & Relational Model", blurb: "Entities, cardinality, ER→tables, keys and relational algebra.", color: "#34d399" },
  { id: "normalization", foe: "schemaforge", title: "Normalization", blurb: "Functional dependencies, closures, keys and 1NF–BCNF.", color: "#a78bfa" },
  { id: "transactions", foe: "transactor", title: "Transactions", blurb: "ACID, schedules, serializability and isolation anomalies.", color: "#f472b6" },
  { id: "concurrency", foe: "reaper", title: "Concurrency & Recovery", blurb: "2PL, deadlocks, timestamps, MVCC, WAL and ARIES.", color: "#fb923c" },
  { id: "storage", foe: "aggregon", title: "Storage & Indexing", blurb: "B+ trees, hashing, clustered and covering indexes.", color: "#facc15" },
  { id: "query", foe: "optimizer", title: "Query Processing", blurb: "Join algorithms, I/O cost, selectivity and EXPLAIN plans.", color: "#22d3ee" },
  { id: "distributed", foe: "hydra", title: "Distributed & NoSQL", blurb: "CAP, replication, sharding, 2PC and NoSQL stores.", color: "#f87171" },
  { id: "sql", foe: "subzero", title: "Interview SQL", blurb: "Nth highest salary, gaps and islands, top-N per group…", color: "#4ade80" },
];

export const QUESTIONS: Question[] = [...BASICS, ...ER, ...ER_MORE, ...NORMALIZATION, ...NORMALIZATION_MORE, ...TRANSACTIONS, ...TRANSACTIONS_MORE, ...CONCURRENCY, ...CONCURRENCY_MORE, ...RECOVERY, ...RECOVERY_MORE, ...MVCC, ...MVCC_MORE, ...STORAGE, ...STORAGE_MORE, ...QUERY, ...QUERY_MORE, ...DISTRIBUTED, ...DISTRIBUTED_MORE, ...DISTRIBUTED_MORE_2, ...COSTS_MORE, ...SCHEDULES_MORE, ...ISOLATION_MORE, ...KEYS_MORE, ...QUERY_SEMANTICS_MORE, ...STORAGE_FINE, ...DIALECTS_MORE, ...CONSTRAINTS_MORE, ...LOCKING_FINE, ...ALGEBRA_FINE, ...TX_FINE, ...NORMALIZATION_FINE, ...OPTIMIZER_FINE, ...INDEX_FINE, ...MVCC_FINE, ...DISTRIBUTED_FINE, ...BASICS_FINE, ...ER_FINE, ...WINDOW_FINE, ...JOIN_FINE, ...SUBQUERY_FINE, ...SQL_FINE, ...TX_BASICS_FINE, ...RECOVERY_FINE, ...BUFFER_FINE, ...EXEC_FINE, ...SCHED_FINE, ...ISOLATION_FINE, ...ENGINE_FINE, ...TREE_HASH_FINE, ...NULL_SET_FINE, ...PROGRAMMABLE_FINE, ...SCHEMA_DESIGN_FINE, ...SQL];
export const GENERATORS: Generator[] = [...BASICS_GENERATORS, ...ER_GENERATORS, ...NORMALIZATION_GENERATORS, ...TRANSACTIONS_GENERATORS, ...CONCURRENCY_GENERATORS, ...RECOVERY_GENERATORS, ...MVCC_GENERATORS, ...STORAGE_GENERATORS, ...QUERY_GENERATORS, ...DISTRIBUTED_GENERATORS];
export type { TopicId };

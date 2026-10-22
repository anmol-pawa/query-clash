import { BASICS, BASICS_GENERATORS } from "./basics";
import { CONCURRENCY, CONCURRENCY_GENERATORS } from "./concurrency";
import { DISTRIBUTED, DISTRIBUTED_GENERATORS } from "./distributed";
import { ER, ER_GENERATORS } from "./er";
import { ER_MORE } from "./erMore";
import { MVCC, MVCC_GENERATORS } from "./mvcc";
import { QUERY, QUERY_GENERATORS } from "./query";
import { QUERY_MORE } from "./queryMore";
import { RECOVERY, RECOVERY_GENERATORS } from "./recovery";
import { SQL } from "./sql";
import { STORAGE, STORAGE_GENERATORS } from "./storage";
import { NORMALIZATION, NORMALIZATION_GENERATORS } from "./normalization";
import { TRANSACTIONS, TRANSACTIONS_GENERATORS } from "./transactions";
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

export const QUESTIONS: Question[] = [...BASICS, ...ER, ...ER_MORE, ...NORMALIZATION, ...TRANSACTIONS, ...CONCURRENCY, ...RECOVERY, ...MVCC, ...STORAGE, ...QUERY, ...QUERY_MORE, ...DISTRIBUTED, ...SQL];
export const GENERATORS: Generator[] = [...BASICS_GENERATORS, ...ER_GENERATORS, ...NORMALIZATION_GENERATORS, ...TRANSACTIONS_GENERATORS, ...CONCURRENCY_GENERATORS, ...RECOVERY_GENERATORS, ...MVCC_GENERATORS, ...STORAGE_GENERATORS, ...QUERY_GENERATORS, ...DISTRIBUTED_GENERATORS];
export type { TopicId };

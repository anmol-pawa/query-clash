import type { Question } from "./types";

/** Interview tags that have a Codex entry worth reading next. Every id must exist in `CODEX` (see tests/codexLinks.test.ts). */
export const TAG_TO_CODEX: Record<string, string> = {
  "window functions": "window-functions",
  "group by": "group-by",
  aggregates: "aggregates",
  having: "having",
  null: "null",
  isolation: "isolation",
  "isolation levels": "isolation",
  anomalies: "isolation",
  phantom: "isolation",
  index: "indexes",
  "hash index": "indexes",
  clustered: "indexes",
  explain: "explain",
  subquery: "scalar-subquery",
  "self join": "self-join",
  "anti-join": "anti-join",
  join: "inner-join",
  joins: "inner-join",
  "outer join": "outer-join",
  "full join": "full-join",
  ddl: "create-table",
  constraints: "constraints",
  integrity: "constraints",
  normalization: "normalization",
  acid: "transactions",
  locks: "locking",
  deadlock: "locking",
  cte: "cte",
  recursive: "recursive-cte",
  pivot: "pivot",
  json: "json",
  merge: "merge",
  views: "views",
  "materialized views": "materialized-views",
  partitioning: "partitioning",
};

/** Codex entry ids related to a question (at most two, in tag order, no duplicates). */
export function relatedCodex(q: Pick<Question, "tags">): string[] {
  const out: string[] = [];
  for (const t of q.tags) {
    const id = TAG_TO_CODEX[t.toLowerCase()];
    if (id && !out.includes(id)) out.push(id);
    if (out.length === 2) break;
  }
  return out;
}

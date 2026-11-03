import type { Question } from "./types";

/** JSON in SQL: PostgreSQL operators and indexing, Oracle JSON functions. */
export const JSON_FINE: Question[] = [
  {
    id: "jsonfine-pg-arrow-text",
    topic: "query",
    kind: "mcq",
    prompt: "PostgreSQL: orders.data is jsonb with {\"qty\": 12}. You want rows where qty is greater than 9. Which predicate compares numbers?",
    choices: [
      "(data ->> 'qty')::int > 9",
      "data ->> 'qty' > 9",
      "data -> 'qty' > '9'",
      "data @> 'qty > 9'",
    ],
    answer: 0,
    explanation: "->> returns text, so the value must be cast before a numeric comparison (comparing text with the integer 9 is an error, and comparing text with text would put '12' before '9'). -> returns jsonb, which does not compare with a plain number or string literal, and @> is containment, not an expression language. Cast the extracted text, or compare jsonb to jsonb: (data -> 'qty') > '9'::jsonb.",
    difficulty: 2,
    tags: ["JSON", "JSONB", "PostgreSQL", "semi-structured"],
    askedAt: "Querying semi-structured columns in SQL screens",
  },
  {
    id: "jsonfine-jsonb-gin",
    topic: "query",
    kind: "mcq",
    prompt: "PostgreSQL: you filter a jsonb column with WHERE data @> '{\"status\": \"open\"}' on a large table. Which index helps?",
    choices: [
      "A GIN index on the jsonb column",
      "A B-tree index on the jsonb column, used for any containment test",
      "No index can help: jsonb is stored as opaque text",
      "A hash index on the column's text form",
    ],
    answer: 0,
    explanation: "jsonb is a decomposed binary form, and a GIN index on it supports containment (@>) and key-existence (?) operators. A plain B-tree on the whole column only supports equality and ordering of whole values, not containment. If you always filter one key, a B-tree expression index on (data ->> 'status') is smaller and faster. The json type (text copy) has no such operators or GIN support.",
    difficulty: 3,
    tags: ["JSON", "JSONB", "PostgreSQL", "index"],
    askedAt: "Indexing a document-style column",
  },
  {
    id: "jsonfine-oracle-value-vs-query",
    topic: "query",
    kind: "mcq",
    prompt: "Oracle: a JSON document has a field \"tags\" holding an array. Which function returns that array as JSON text, rather than a single scalar?",
    choices: [
      "JSON_QUERY",
      "JSON_VALUE",
      "JSON_EXISTS",
      "JSON_SCALAR",
    ],
    answer: 0,
    explanation: "JSON_VALUE extracts a single scalar (string, number, boolean) and returns NULL by default when the path points at an object or array. JSON_QUERY returns an object or array (use WITH WRAPPER to wrap several matches in an array). JSON_EXISTS only tests whether a path matches, and JSON_TABLE turns a document into relational rows. Recent Oracle releases also have a native JSON type; check the version before relying on it.",
    difficulty: 2,
    tags: ["JSON", "Oracle", "JSON_VALUE", "semi-structured"],
    askedAt: "Oracle JSON follow-up in DBA and data-engineer rounds",
  },
];

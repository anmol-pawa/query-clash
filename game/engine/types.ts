/**
 * SQL concept types and the type chart. Every attack has the type of the
 * concept that powers it, and every boss has the type of the topic it guards.
 * A boss is weak to the concepts that tame its topic (always including its
 * own: mastering the chapter is how you win) and resists concepts that can't
 * do its job. Each matchup carries a one-line reason, so the chart teaches.
 */
import type { BossId } from "@/content/types";
import type { AttackKind } from "@/lib/dialect/concepts";

export type SqlType = "filter" | "join" | "aggregate" | "subquery" | "write" | "txn" | "schema" | "window" | "recursive" | "index";

export const SQL_TYPES: SqlType[] = ["filter", "join", "aggregate", "subquery", "write", "txn", "schema", "window", "recursive", "index"];

export const TYPE_INFO: Record<SqlType, { name: string; color: string }> = {
  filter: { name: "FILTER", color: "#2fb8a8" },
  join: { name: "JOIN", color: "#d89a18" },
  aggregate: { name: "AGGREG", color: "#e0682a" },
  subquery: { name: "SUBQRY", color: "#8a6ae0" },
  write: { name: "WRITE", color: "#3a7ee0" },
  txn: { name: "TXN", color: "#28a070" },
  schema: { name: "SCHEMA", color: "#a8742a" },
  window: { name: "WINDOW", color: "#2a9ad0" },
  recursive: { name: "RECURS", color: "#4aa83a" },
  index: { name: "INDEX", color: "#c03a6a" },
};

/** The type of each attack (the concept that picked it). */
export const ATTACK_TYPE: Record<AttackKind, SqlType> = {
  bolt: "filter",
  chain: "join",
  fusion: "join",
  slam: "aggregate",
  vortex: "aggregate",
  mirror: "subquery",
  surge: "write",
  storm: "write",
  shield: "txn",
  forge: "schema",
  lance: "schema",
  blade: "window",
  summon: "recursive",
  haste: "index",
};

/** The type of each boss: the topic its chapter teaches. */
export const BOSS_TYPE: Record<BossId, SqlType> = {
  nulloth: "filter",
  joinmaster: "join",
  aggregon: "aggregate",
  subzero: "subquery",
  reaper: "write",
  transactor: "txn",
  schemaforge: "schema",
  windwraith: "window",
  hydra: "recursive",
  optimizer: "index",
};

export interface Matchup {
  type: SqlType;
  why: string;
}

/** Per defending type: what it is weak to and what it resists. */
export const TYPE_CHART: Record<SqlType, { weak: Matchup[]; resist: Matchup[] }> = {
  filter: {
    weak: [{ type: "filter", why: "WHERE … IS NULL / IS NOT NULL pins the void down." }],
    resist: [{ type: "join", why: "NULL keys never match, so joins pass straight through it." }],
  },
  join: {
    weak: [
      { type: "join", why: "Matching the right keys in ON untangles its links." },
      { type: "subquery", why: "EXISTS is a semi-join: it never multiplies rows." },
    ],
    resist: [{ type: "filter", why: "A lone WHERE can't reach a second table." }],
  },
  aggregate: {
    weak: [
      { type: "aggregate", why: "GROUP BY and HAVING answer it at its own game." },
      { type: "window", why: "Window functions aggregate without collapsing the rows." },
    ],
    resist: [{ type: "filter", why: "WHERE runs before grouping; only HAVING can filter groups." }],
  },
  subquery: {
    weak: [
      { type: "subquery", why: "Correlating inner and outer queries thaws its nesting." },
      { type: "recursive", why: "A WITH clause names its nested queries and flattens them." },
    ],
    resist: [{ type: "window", why: "A window result can't be filtered in WHERE without a subquery around it." }],
  },
  write: {
    weak: [
      { type: "write", why: "A precise UPDATE … WHERE outwrites a careless one." },
      { type: "txn", why: "ROLLBACK undoes everything it harvested." },
    ],
    resist: [{ type: "filter", why: "A SELECT only reads: it can't stop a write." }],
  },
  txn: {
    weak: [
      { type: "txn", why: "COMMIT, ROLLBACK and SAVEPOINT command its clockwork." },
      { type: "schema", why: "Constraints guard the C in ACID: no commit can break them." },
    ],
    resist: [{ type: "write", why: "A write on its own is just one step inside its transaction." }],
  },
  schema: {
    weak: [
      { type: "schema", why: "CREATE and ALTER reshape whatever it forges." },
      { type: "txn", why: "In PostgreSQL DDL is transactional: a bad ALTER rolls back." },
    ],
    resist: [{ type: "filter", why: "Queries read a table's shape; they can't change it." }],
  },
  window: {
    weak: [{ type: "window", why: "PARTITION BY … ORDER BY follows every step of its dance." }],
    resist: [{ type: "aggregate", why: "GROUP BY collapses rows, so it can't keep each row next to its total." }],
  },
  recursive: {
    weak: [{ type: "recursive", why: "An anchor plus a recursive step reaches every head." }],
    resist: [{ type: "join", why: "A fixed number of self-joins can't reach unbounded depth." }],
  },
  index: {
    weak: [{ type: "index", why: "EXPLAIN and the right index read its plan." }],
    resist: [{ type: "write", why: "Every write must also update every index on the table." }],
  },
};

export const SUPER = 1.5;
export const RESISTED = 0.5;

export type Effect = "super" | "resisted" | "normal";

export interface Effectiveness {
  effect: Effect;
  mult: number;
  why?: string;
}

/** How well an attack type lands on a defending type (no type: neutral). */
export function effectiveness(attack: SqlType, defender?: SqlType): Effectiveness {
  if (!defender) return { effect: "normal", mult: 1 };
  const row = TYPE_CHART[defender];
  const w = row.weak.find((m) => m.type === attack);
  if (w) return { effect: "super", mult: SUPER, why: w.why };
  const r = row.resist.find((m) => m.type === attack);
  if (r) return { effect: "resisted", mult: RESISTED, why: r.why };
  return { effect: "normal", mult: 1 };
}

/** The battle-text line for an effect, if any. */
export function effectLine(e: Effect): string | undefined {
  if (e === "super") return "It's super effective!";
  if (e === "resisted") return "It's not very effective…";
  return undefined;
}

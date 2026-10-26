/**
 * Rule-based grader for "design the schema" drills. The player's CREATE TABLE
 * script runs in a throwaway schema on PGlite, the catalog is read back, and a
 * list of structural checks (tables, keys, foreign keys, junction tables,
 * indexes) is evaluated against it. Names are matched through alias lists so
 * `follows`, `follow` and `user_follows` all count.
 */
import type { PGlite } from "@electric-sql/pglite";

export interface TableInfo {
  name: string;
  columns: { name: string; notNull: boolean }[];
  pk: string[];
  /** Unique constraints and unique indexes (PK excluded), by column list. */
  uniques: string[][];
  fks: { columns: string[]; refTable: string; refColumns: string[] }[];
  /** Every index (PK, unique and exclusion-backed included) with its column order. */
  indexes: { columns: string[]; unique: boolean; partial: boolean }[];
  exclusions: number;
  checks: number;
}
export interface SchemaInfo {
  tables: TableInfo[];
}

export type Check =
  | { kind: "table"; label: string; names: string[] }
  | { kind: "pk"; label: string; table: string }
  | { kind: "fk"; label: string; from: string; to: string }
  /** Composite key over the two foreign keys (PK or unique), so a pair cannot repeat. */
  | { kind: "junction"; label: string; table: string; refs: [string, string] }
  /** A unique constraint/index whose columns are exactly one of the alias lists. */
  | { kind: "unique"; label: string; table: string; columns: string[][] }
  /** An index whose leading column is one of `leading` (PK and unique indexes count). */
  | { kind: "index"; label: string; table: string; leading: string[] }
  | { kind: "exclusion"; label: string; table: string }
  /** Columns that must be NOT NULL: one alias group per column (any alias in the group counts). */
  | { kind: "notNull"; label: string; table: string; columns: string[][] };

export interface SchemaSpec {
  id: string;
  /** Logical table key -> accepted names. */
  tables: Record<string, string[]>;
  checks: Check[];
}

export interface CheckResult {
  label: string;
  ok: boolean;
  /** Why it failed; absent when it passed. */
  detail?: string;
}
export interface SchemaGrade {
  ok: boolean;
  error?: string;
  results: CheckResult[];
  passed: number;
  total: number;
}

let counter = 0;

/** Run `ddl` in a scratch schema and read the catalog back. Throws on SQL errors. */
export async function introspect(db: PGlite, ddl: string): Promise<SchemaInfo> {
  const schema = `sd_${Date.now().toString(36)}_${counter++}`;
  await db.exec(`CREATE SCHEMA ${schema}`);
  try {
    await db.exec(`SET search_path TO ${schema}, public`);
    // Only the player's tables should be visible: shadow nothing from public.
    await db.exec(ddl);
    const tables = await db.query<{ oid: number; relname: string }>(
      `SELECT c.oid::int AS oid, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = $1 AND c.relkind IN ('r','p') ORDER BY c.relname`,
      [schema],
    );
    const oidName = new Map(tables.rows.map((t) => [t.oid, t.relname]));
    const out: TableInfo[] = [];
    for (const t of tables.rows) {
      const cols = await db.query<{ attnum: number; attname: string; attnotnull: boolean }>(
        `SELECT attnum::int, attname, attnotnull FROM pg_attribute
         WHERE attrelid = $1 AND attnum > 0 AND NOT attisdropped ORDER BY attnum`,
        [t.oid],
      );
      const byNum = new Map(cols.rows.map((c) => [c.attnum, c.attname]));
      const names = (nums: number[] | null) => (nums ?? []).map((n) => byNum.get(n) ?? "?");
      const cons = await db.query<{ contype: string; conkey: number[] | null; confrelid: number; confkey: number[] | null }>(
        `SELECT contype, conkey::int[] AS conkey, confrelid::int AS confrelid, confkey::int[] AS confkey
         FROM pg_constraint WHERE conrelid = $1`,
        [t.oid],
      );
      const idx = await db.query<{ cols: number[]; indisunique: boolean; indisprimary: boolean; partial: boolean }>(
        `SELECT indkey::int2[]::int[] AS cols, indisunique, indisprimary, indpred IS NOT NULL AS partial
         FROM pg_index WHERE indrelid = $1`,
        [t.oid],
      );
      const pk = cons.rows.find((c) => c.contype === "p");
      const refCols = async (relid: number, nums: number[] | null) => {
        const r = await db.query<{ attnum: number; attname: string }>(
          `SELECT attnum::int, attname FROM pg_attribute WHERE attrelid = $1`,
          [relid],
        );
        const m = new Map(r.rows.map((x) => [x.attnum, x.attname]));
        return (nums ?? []).map((n) => m.get(n) ?? "?");
      };
      const fks: TableInfo["fks"] = [];
      for (const c of cons.rows.filter((x) => x.contype === "f")) {
        fks.push({
          columns: names(c.conkey),
          refTable: oidName.get(c.confrelid) ?? "?",
          refColumns: await refCols(c.confrelid, c.confkey),
        });
      }
      out.push({
        name: t.relname,
        columns: cols.rows.map((c) => ({ name: c.attname, notNull: c.attnotnull })),
        pk: pk ? names(pk.conkey) : [],
        uniques: idx.rows.filter((i) => i.indisunique && !i.indisprimary && !i.partial).map((i) => names(i.cols)),
        fks,
        indexes: idx.rows.map((i) => ({ columns: names(i.cols), unique: i.indisunique, partial: i.partial })),
        exclusions: cons.rows.filter((c) => c.contype === "x").length,
        checks: cons.rows.filter((c) => c.contype === "c").length,
      });
    }
    return { tables: out };
  } finally {
    await db.exec(`RESET search_path`);
    await db.exec(`DROP SCHEMA ${schema} CASCADE`);
  }
}

const norm = (s: string) => s.toLowerCase();
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Evaluate every check of `spec` against an introspected schema. */
export function checkSchema(info: SchemaInfo, spec: SchemaSpec): SchemaGrade {
  const find = (key: string): TableInfo | undefined => {
    const names = (spec.tables[key] ?? [key]).map(norm);
    return info.tables.find((t) => names.includes(norm(t.name)));
  };
  const results: CheckResult[] = spec.checks.map((c): CheckResult => {
    const fail = (detail: string): CheckResult => ({ label: c.label, ok: false, detail });
    const pass: CheckResult = { label: c.label, ok: true };
    if (c.kind === "table") {
      return info.tables.some((t) => c.names.map(norm).includes(norm(t.name)))
        ? pass
        : fail(`No table named ${c.names.join(" / ")}.`);
    }
    const t = find(c.kind === "fk" ? c.from : c.table);
    if (!t) return fail(`Table "${c.kind === "fk" ? c.from : c.table}" is missing.`);
    switch (c.kind) {
      case "pk":
        return t.pk.length ? pass : fail(`${t.name} has no PRIMARY KEY.`);
      case "fk": {
        const to = find(c.to);
        if (!to) return fail(`Table "${c.to}" is missing.`);
        return t.fks.some((f) => f.refTable === to.name)
          ? pass
          : fail(`${t.name} has no FOREIGN KEY to ${to.name}.`);
      }
      case "junction": {
        const [a, b] = c.refs.map((r) => find(r));
        if (!a || !b) return fail("A referenced table is missing.");
        const fa = t.fks.find((f) => f.refTable === a.name);
        const fb = t.fks.find((f) => f.refTable === b.name && f !== fa);
        if (!fa || !fb) return fail(`${t.name} needs a foreign key to both ${a.name} and ${b.name}.`);
        const cols = [...fa.columns, ...fb.columns];
        const keyed = [t.pk, ...t.uniques].some((k) => k.length > 0 && sameSet(k, cols));
        return keyed ? pass : fail(`${t.name}'s key must be exactly (${cols.join(", ")}) so a pair cannot repeat.`);
      }
      case "unique": {
        const keys = [t.pk, ...t.uniques];
        return keys.some((k) => c.columns.some((alias) => sameSet(k.map(norm), alias.map(norm))))
          ? pass
          : fail(`${t.name} needs a UNIQUE constraint on ${c.columns.map((a) => `(${a.join(", ")})`).join(" or ")}.`);
      }
      case "index": {
        const lead = c.leading.map(norm);
        return t.indexes.some((i) => !i.partial && lead.includes(norm(i.columns[0] ?? "")))
          ? pass
          : fail(`${t.name} has no index led by ${c.leading.join(" / ")}, so that lookup scans the table.`);
      }
      case "exclusion":
        return t.exclusions > 0 ? pass : fail(`${t.name} has no EXCLUDE constraint.`);
      case "notNull": {
        const missing = c.columns.filter((group) => {
          const found = t.columns.find((x) => group.map(norm).includes(norm(x.name)));
          return !found || (!found.notNull && !t.pk.map(norm).includes(norm(found.name)));
        });
        return missing.length
          ? fail(`${t.name}.${missing.map((g) => g[0]).join(", ")} should be NOT NULL.`)
          : pass;
      }
    }
  });
  const passed = results.filter((r) => r.ok).length;
  return { ok: passed === results.length, results, passed, total: results.length };
}

/** Run the player's script and grade it. SQL errors come back as `error`. */
export async function gradeSchema(db: PGlite, ddl: string, spec: SchemaSpec): Promise<SchemaGrade> {
  try {
    return checkSchema(await introspect(db, ddl), spec);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), results: [], passed: 0, total: spec.checks.length };
  }
}

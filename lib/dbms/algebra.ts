/** A tiny relational-algebra evaluator for DBMS Interview problems. Relations are sets: every operator drops duplicate tuples. */

export type Value = string | number;

export interface Relation {
  name?: string;
  columns: string[];
  rows: Value[][];
}

const keyOf = (row: readonly Value[]) => JSON.stringify(row);

/** Remove duplicate tuples, keeping first occurrences in order. */
export function distinct(r: Relation): Relation {
  const seen = new Set<string>();
  return { columns: r.columns, rows: r.rows.filter((row) => !seen.has(keyOf(row)) && !!seen.add(keyOf(row))) };
}

function col(r: Relation, c: string): number {
  const i = r.columns.indexOf(c);
  if (i < 0) throw new Error(`no column ${c} in (${r.columns.join(", ")})`);
  return i;
}

/** σ: keep the tuples that satisfy `pred`, given the tuple as a column → value map. */
export function select(r: Relation, pred: (t: Record<string, Value>) => boolean): Relation {
  const rows = r.rows.filter((row) => pred(Object.fromEntries(r.columns.map((c, i) => [c, row[i]]))));
  return distinct({ columns: r.columns, rows });
}

/** π: keep only `cols` (in that order), removing duplicates. */
export function project(r: Relation, cols: string[]): Relation {
  const idx = cols.map((c) => col(r, c));
  return distinct({ columns: cols, rows: r.rows.map((row) => idx.map((i) => row[i])) });
}

/** ×: every pairing of tuples. Columns must not clash. */
export function product(r: Relation, s: Relation): Relation {
  for (const c of s.columns) if (r.columns.includes(c)) throw new Error(`column ${c} clashes; rename first`);
  return distinct({ columns: [...r.columns, ...s.columns], rows: r.rows.flatMap((a) => s.rows.map((b) => [...a, ...b])) });
}

/** ⋈: natural join on every shared column name (a product when none are shared). */
export function naturalJoin(r: Relation, s: Relation): Relation {
  const shared = r.columns.filter((c) => s.columns.includes(c));
  const extra = s.columns.filter((c) => !shared.includes(c));
  const rows: Value[][] = [];
  for (const a of r.rows) {
    for (const b of s.rows) {
      if (shared.every((c) => a[col(r, c)] === b[col(s, c)])) rows.push([...a, ...extra.map((c) => b[col(s, c)])]);
    }
  }
  return distinct({ columns: [...r.columns, ...extra], rows });
}

/**
 * ÷: r(X ∪ Y) ÷ s(Y) is every X-value paired in r with *all* of s's tuples.
 * With an empty s every X-value of r qualifies (the "for all" is vacuously true).
 */
export function divide(r: Relation, s: Relation): Relation {
  const y = s.columns;
  const x = r.columns.filter((c) => !y.includes(c));
  const have = new Set(project(r, [...x, ...y]).rows.map(keyOf));
  const candidates = project(r, x);
  const need = project(s, y).rows;
  return { columns: x, rows: candidates.rows.filter((xv) => need.every((yv) => have.has(keyOf([...xv, ...yv])))) };
}

/** ∪ and −: the relations must be union-compatible (same columns). */
export function union(r: Relation, s: Relation): Relation {
  if (keyOf(r.columns) !== keyOf(s.columns)) throw new Error("not union-compatible");
  return distinct({ columns: r.columns, rows: [...r.rows, ...s.rows] });
}

export function difference(r: Relation, s: Relation): Relation {
  if (keyOf(r.columns) !== keyOf(s.columns)) throw new Error("not union-compatible");
  const out = new Set(s.rows.map(keyOf));
  return distinct({ columns: r.columns, rows: r.rows.filter((row) => !out.has(keyOf(row))) });
}

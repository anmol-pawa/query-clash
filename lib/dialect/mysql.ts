/**
 * MySQL -> PostgreSQL translation for the sandbox. Like the Oracle transpiler
 * it is a token-level rewrite of the most common MySQL-isms, so the same
 * PGlite engine can run them. It never throws: anything it does not know is
 * passed through and PostgreSQL reports the error.
 */
import { Tok, isPunct, isWord, matchParen, render, splitArgs, splitStatements, toks, tokenize, trimPre } from "../sql/tokenize";

export interface MysqlResult {
  sql: string;
  statements: string[];
  notes: string[];
}

/**
 * Character-level pass: `ident` -> "ident", "text" -> 'text' (MySQL's default
 * string quote), # line comments dropped. Single-quoted strings and
 * -- and slash-star comments are copied as they are.
 */
export function normaliseQuotes(sql: string, notes: Set<string>): string {
  let out = "";
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    if (c === "'") {
      let j = i + 1;
      while (j < n && !(sql[j] === "'" && sql[j + 1] !== "'")) j += sql[j] === "'" ? 2 : sql[j] === "\\" ? 2 : 1;
      out += sql.slice(i, j + 1);
      i = j + 1;
    } else if (c === "-" && sql[i + 1] === "-") {
      const e = sql.indexOf("\n", i);
      const stop = e === -1 ? n : e;
      out += sql.slice(i, stop);
      i = stop;
    } else if (c === "#") {
      const e = sql.indexOf("\n", i);
      i = e === -1 ? n : e;
    } else if (c === "/" && sql[i + 1] === "*") {
      const e = sql.indexOf("*/", i + 2);
      const stop = e === -1 ? n : e + 2;
      out += sql.slice(i, stop);
      i = stop;
    } else if (c === "`") {
      const e = sql.indexOf("`", i + 1);
      const stop = e === -1 ? n : e;
      out += `"${sql.slice(i + 1, stop).replace(/"/g, '""')}"`;
      i = stop + 1;
      notes.add("Backticks quote identifiers in MySQL; PostgreSQL and Oracle use double quotes.");
    } else if (c === '"') {
      const e = sql.indexOf('"', i + 1);
      const stop = e === -1 ? n : e;
      out += `'${sql.slice(i + 1, stop).replace(/'/g, "''")}'`;
      i = stop + 1;
      notes.add('MySQL accepts "double quotes" as string literals (unless ANSI_QUOTES is set); standard SQL reserves them for identifiers.');
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

const FN_RENAMES: Record<string, string> = {
  IFNULL: "COALESCE",
  CURDATE: "CURRENT_DATE",
  CHAR_LENGTH: "LENGTH",
  SUBSTR: "SUBSTRING",
};

function rewriteTokens(ts: Tok[], notes: Set<string>): Tok[] {
  const t = ts.slice();

  // <=>  (tokenised as "<=" ">")
  for (let i = 0; i < t.length - 1; i++) {
    if (t[i].v === "<=" && t[i + 1].v === ">" && t[i + 1].pre === "") {
      t.splice(i, 2, ...toks("IS NOT DISTINCT FROM", t[i].pre));
      notes.add("<=> is MySQL's NULL-safe equality; the standard spelling is IS NOT DISTINCT FROM.");
    }
  }

  // simple function renames
  for (let i = 0; i < t.length - 1; i++) {
    const r = t[i].t === "word" && isPunct(t[i + 1], "(") ? FN_RENAMES[t[i].u] : undefined;
    if (!r) continue;
    if (t[i].u === "CURDATE") {
      // CURDATE() -> CURRENT_DATE (no parentheses)
      const close = matchParen(t, i + 1);
      if (close === i + 2) t.splice(i, 3, { ...t[i], v: r, u: r });
    } else {
      t[i] = { ...t[i], v: r, u: r };
    }
    if (t[i].u === "COALESCE") notes.add("IFNULL(a, b) is COALESCE(a, b) in PostgreSQL, and NVL(a, b) in Oracle.");
  }

  // IF(c, a, b) and GROUP_CONCAT(...): the last occurrence first, so nesting works.
  for (let i = t.length - 2; i >= 0; i--) {
    if (!isPunct(t[i + 1], "(")) continue;
    const close = matchParen(t, i + 1);
    if (close === -1) continue;
    if (isWord(t[i], "IF")) {
      const args = splitArgs(t, i + 1, close);
      if (args.length !== 3) continue;
      const [c, a, b] = args.map((x) => trimPre(x));
      const body = [...toks("CASE WHEN", t[i].pre), ...trimPre(c).map((x, k) => (k === 0 ? { ...x, pre: " " } : x))];
      body.push(...toks("THEN"), ...a.map((x, k) => (k === 0 ? { ...x, pre: " " } : x)));
      body.push(...toks("ELSE"), ...b.map((x, k) => (k === 0 ? { ...x, pre: " " } : x)), ...toks("END"));
      t.splice(i, close - i + 1, ...body);
      notes.add("MySQL's IF(cond, a, b) is a CASE WHEN cond THEN a ELSE b END expression in PostgreSQL and Oracle.");
    } else if (isWord(t[i], "GROUP_CONCAT")) {
      let inner = t.slice(i + 2, close);
      let sep = "','";
      let orderBy: Tok[] = [];
      const sepAt = inner.findIndex((x) => isWord(x, "SEPARATOR"));
      if (sepAt !== -1) {
        sep = inner[sepAt + 1]?.v ?? sep;
        inner = inner.slice(0, sepAt);
      }
      const ob = inner.findIndex((x, k) => isWord(x, "ORDER") && isWord(inner[k + 1], "BY"));
      if (ob !== -1) {
        orderBy = inner.slice(ob);
        inner = inner.slice(0, ob);
      }
      const distinct = isWord(inner[0], "DISTINCT");
      const expr = distinct ? inner.slice(1) : inner;
      const call = [
        ...toks("string_agg(", t[i].pre),
        ...(distinct ? toks("DISTINCT", "") : []),
        ...expr.map((x, k) => (k === 0 ? { ...x, pre: distinct ? " " : "" } : x)),
        ...toks("::text,", ""),
        ...toks(sep),
        ...orderBy,
        ...toks(")", ""),
      ];
      t.splice(i, close - i + 1, ...call);
      notes.add("GROUP_CONCAT(x SEPARATOR s) is string_agg(x::text, s) in PostgreSQL (LISTAGG in Oracle).");
    }
  }

  // LIMIT offset, count  ->  LIMIT count OFFSET offset
  for (let i = 0; i < t.length - 3; i++) {
    if (isWord(t[i], "LIMIT") && t[i + 1].t === "number" && isPunct(t[i + 2], ",") && t[i + 3].t === "number") {
      const [off, cnt] = [t[i + 1].v, t[i + 3].v];
      t.splice(i + 1, 3, ...toks(`${cnt} OFFSET ${off}`));
      notes.add("MySQL's LIMIT offset, count flips the numbers: PostgreSQL writes LIMIT count OFFSET offset.");
    }
  }
  return t;
}

export function transpileMysql(sql: string): MysqlResult {
  const notes = new Set<string>();
  const normalised = normaliseQuotes(sql, notes);
  const statements = splitStatements(normalised).map((s) => render(trimPre(rewriteTokens(tokenize(s), notes))));
  return { sql: statements.join(";\n"), statements, notes: [...notes] };
}

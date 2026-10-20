import { subsets } from "./keys";

/** Functional-dependency solvers for DBMS Interview problems. Attributes are short names (usually single letters). */

export interface Fd {
  lhs: string[];
  rhs: string[];
}

export type NormalForm = "1NF" | "2NF" | "3NF" | "BCNF";
export const NORMAL_FORMS: NormalForm[] = ["1NF", "2NF", "3NF", "BCNF"];

/** Sorted, de-duplicated attribute set. */
export function norm(xs: Iterable<string>): string[] {
  return [...new Set(xs)].sort();
}

/** "ABC" → ["A", "B", "C"]. */
export function attrs(s: string): string[] {
  return norm(s.replace(/[^A-Za-z]/g, ""));
}

/** Parse "AB->C, C->D" (or →) into FDs over single-letter attributes. */
export function parseFds(s: string): Fd[] {
  return s
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [l, r] = p.split(/->|→/);
      return { lhs: attrs(l), rhs: attrs(r) };
    });
}

export const setText = (xs: readonly string[]): string => (xs.length ? norm(xs).join("") : "∅");
export const fdText = (f: Fd): string => `${setText(f.lhs)} → ${setText(f.rhs)}`;
export const fdsText = (fs: readonly Fd[]): string => fs.map(fdText).join(", ");

const subset = (a: readonly string[], b: readonly string[]) => a.every((x) => b.includes(x));
const sameSet = (a: readonly string[], b: readonly string[]) => subset(a, b) && subset(b, a);

/** X⁺ under F: repeatedly add the right side of every FD whose left side is already in. */
export function closure(x: readonly string[], fds: readonly Fd[]): string[] {
  const out = new Set(x);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of fds) {
      if (f.lhs.every((a) => out.has(a)) && f.rhs.some((a) => !out.has(a))) {
        f.rhs.forEach((a) => out.add(a));
        grew = true;
      }
    }
  }
  return norm(out);
}

/** F ⊨ X → Y iff Y ⊆ X⁺. */
export function implies(fds: readonly Fd[], f: Fd): boolean {
  return subset(f.rhs, closure(f.lhs, fds));
}

/** F and G are equivalent iff each implies every FD of the other. */
export function equivalent(f: readonly Fd[], g: readonly Fd[]): boolean {
  return g.every((x) => implies(f, x)) && f.every((x) => implies(g, x));
}

export function isSuperkeyOf(x: readonly string[], rel: readonly string[], fds: readonly Fd[]): boolean {
  return subset(rel, closure(x, fds));
}

/** Every candidate key (minimal superkey), smallest first, by enumerating attribute subsets. */
export function candidateKeys(rel: readonly string[], fds: readonly Fd[]): string[][] {
  const all = subsets(norm(rel)).sort((a, b) => a.length - b.length);
  const keys: string[][] = [];
  for (const s of all) {
    if (keys.some((k) => subset(k, s))) continue;
    if (isSuperkeyOf(s, rel, fds)) keys.push(s);
  }
  return keys;
}

/** Attributes that belong to some candidate key. */
export function primeAttributes(rel: readonly string[], fds: readonly Fd[]): string[] {
  return norm(candidateKeys(rel, fds).flat());
}

/**
 * A minimal (canonical) cover: single-attribute right sides, no extraneous left-side attributes and no redundant FDs,
 * merged back by left side. Equivalent to F; which cover you get can depend on FD order when several exist.
 */
export function minimalCover(fds: readonly Fd[]): Fd[] {
  let g: Fd[] = fds.flatMap((f) => f.rhs.filter((a) => !f.lhs.includes(a)).map((a) => ({ lhs: norm(f.lhs), rhs: [a] })));
  // Drop extraneous left-side attributes: B is extraneous in X → A if (X − B)⁺ under G already contains A.
  g = g.map((f) => {
    let lhs = f.lhs;
    for (const b of f.lhs) {
      const rest = lhs.filter((x) => x !== b);
      if (lhs.length > 1 && closure(rest, g).includes(f.rhs[0])) lhs = rest;
    }
    return { lhs, rhs: f.rhs };
  });
  g = g.filter((f, i) => g.findIndex((h) => sameSet(h.lhs, f.lhs) && h.rhs[0] === f.rhs[0]) === i);
  // Drop redundant FDs: X → A is redundant if the others still imply it.
  for (let i = 0; i < g.length; ) {
    const others = g.filter((_, j) => j !== i);
    if (implies(others, g[i])) g = others;
    else i++;
  }
  const merged: Fd[] = [];
  for (const f of g) {
    const m = merged.find((h) => sameSet(h.lhs, f.lhs));
    if (m) m.rhs = norm([...m.rhs, ...f.rhs]);
    else merged.push({ lhs: f.lhs, rhs: f.rhs });
  }
  return merged;
}

/** The FDs of F⁺ that hold on a sub-schema: X → (X⁺ ∩ Ri) − X for every X ⊆ Ri, reduced to a minimal cover. */
export function projectFds(sub: readonly string[], fds: readonly Fd[]): Fd[] {
  const out: Fd[] = [];
  for (const x of subsets(norm(sub))) {
    const rhs = closure(x, fds).filter((a) => sub.includes(a) && !x.includes(a));
    if (x.length && rhs.length) out.push({ lhs: x, rhs });
  }
  return minimalCover(out);
}

export interface NfReport {
  form: NormalForm;
  keys: string[][];
  prime: string[];
  /** The first FD that breaks the next normal form up, with why (absent for BCNF). */
  violation?: { fd: Fd; reason: string };
}

/**
 * The highest normal form (assuming atomic values, so at least 1NF).
 * 2NF: no non-prime attribute depends on a proper subset of a candidate key.
 * 3NF: for every non-trivial X → A in F, X is a superkey or A is prime.
 * BCNF: for every non-trivial X → A in F, X is a superkey.
 */
export function normalForm(rel: readonly string[], fds: readonly Fd[]): NfReport {
  const keys = candidateKeys(rel, fds);
  const prime = norm(keys.flat());
  for (const k of keys) {
    for (const s of subsets(k)) {
      if (s.length === k.length || s.length === 0) continue;
      const partial = closure(s, fds).filter((a) => rel.includes(a) && !prime.includes(a) && !s.includes(a));
      if (partial.length) {
        return { form: "1NF", keys, prime, violation: { fd: { lhs: s, rhs: partial }, reason: `${setText(s)} is part of the key ${setText(k)}, so ${setText(partial)} depends on part of a key (a partial dependency)` } };
      }
    }
  }
  const split = fds.flatMap((f) => f.rhs.filter((a) => !f.lhs.includes(a)).map((a) => ({ lhs: f.lhs, rhs: [a] })));
  for (const f of split) {
    if (!isSuperkeyOf(f.lhs, rel, fds) && !prime.includes(f.rhs[0])) {
      return { form: "2NF", keys, prime, violation: { fd: f, reason: `${setText(f.lhs)} is not a superkey and ${f.rhs[0]} is not prime (a transitive dependency)` } };
    }
  }
  for (const f of split) {
    if (!isSuperkeyOf(f.lhs, rel, fds)) {
      return { form: "3NF", keys, prime, violation: { fd: f, reason: `${setText(f.lhs)} is not a superkey (allowed in 3NF only because ${f.rhs[0]} is prime)` } };
    }
  }
  return { form: "BCNF", keys, prime };
}

/** Binary decomposition test: lossless iff R1 ∩ R2 → R1 or R1 ∩ R2 → R2. */
export function losslessBinary(r1: readonly string[], r2: readonly string[], fds: readonly Fd[]): boolean {
  const common = r1.filter((a) => r2.includes(a));
  const c = closure(common, fds);
  return subset(r1, c) || subset(r2, c);
}

/** The chase (tableau) test for a decomposition into any number of schemas: lossless iff some row becomes all-distinguished. */
export function losslessChase(rel: readonly string[], parts: readonly (readonly string[])[], fds: readonly Fd[]): boolean {
  const cols = norm(rel);
  // Distinguished symbols are "a"; row i's own symbols are "b<i>".
  const rows = parts.map((p, i) => cols.map((c) => (p.includes(c) ? "a" : `b${i}`)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of fds) {
      const li = f.lhs.map((a) => cols.indexOf(a));
      for (const ai of f.rhs.map((a) => cols.indexOf(a))) {
        for (let i = 0; i < rows.length; i++) {
          for (let j = i + 1; j < rows.length; j++) {
            if (!li.every((k) => rows[i][k] === rows[j][k]) || rows[i][ai] === rows[j][ai]) continue;
            // Equate the two symbols, preferring the distinguished one, everywhere in the column.
            const [keep, drop] = rows[j][ai] === "a" ? [rows[j][ai], rows[i][ai]] : [rows[i][ai], rows[j][ai]];
            for (const row of rows) if (row[ai] === drop) row[ai] = keep;
            changed = true;
          }
        }
      }
    }
  }
  return rows.some((row) => row.every((s) => s === "a"));
}

/**
 * Dependency preservation without computing F⁺: for each X → Y, grow Z from X by Z ∪= ((Z ∩ Ri)⁺ ∩ Ri) over the parts.
 * Returns the FDs of F that are lost (empty = preserving).
 */
export function lostDependencies(parts: readonly (readonly string[])[], fds: readonly Fd[]): Fd[] {
  return fds.filter((f) => {
    let z = norm(f.lhs);
    let grew = true;
    while (grew) {
      grew = false;
      for (const p of parts) {
        const add = closure(z.filter((a) => p.includes(a)), fds).filter((a) => p.includes(a) && !z.includes(a));
        if (add.length) {
          z = norm([...z, ...add]);
          grew = true;
        }
      }
    }
    return !subset(f.rhs, z);
  });
}

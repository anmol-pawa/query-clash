/** Key solvers for DBMS Interview problems. */

/** Every subset of `attrs`, as arrays in the order of `attrs`. */
export function subsets<T>(attrs: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let mask = 0; mask < 1 << attrs.length; mask++) out.push(attrs.filter((_, i) => mask & (1 << i)));
  return out;
}

/** A set of attributes is a superkey iff it contains some candidate key. */
export function isSuperkey(set: readonly string[], keys: readonly (readonly string[])[]): boolean {
  return keys.some((k) => k.every((a) => set.includes(a)));
}

/** Count superkeys of a relation by enumerating every attribute subset. */
export function countSuperkeys(attrs: readonly string[], keys: readonly (readonly string[])[]): number {
  return subsets(attrs).filter((s) => isSuperkey(s, keys)).length;
}

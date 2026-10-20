/** ER → relational mapping: how many tables the standard (Elmasri–Navathe style) mapping produces. */

export type Cardinality = "1:1" | "1:N" | "M:N";

export interface ErSchema {
  /** Strong entity sets. */
  entities: string[];
  /** Weak entity sets, each with its identifying owner. */
  weak: { name: string; owner: string }[];
  /** Multivalued attributes, each on an entity set. */
  multivalued: { entity: string; attr: string }[];
  /** Binary relationships between entity sets (identifying relationships of weak entities are not listed). */
  relationships: { name: string; a: string; b: string; card: Cardinality }[];
}

export interface TableCount {
  entities: number;
  weak: number;
  multivalued: number;
  /** M:N relationships get their own table; 1:1 and 1:N become a foreign key. */
  relationships: number;
  total: number;
}

/**
 * The minimum table count under the standard mapping, assuming partial participation:
 * one table per strong and weak entity set (the weak one carries the owner's key),
 * one per multivalued attribute, one per M:N relationship, and a foreign key (no table) for 1:1 and 1:N.
 */
export function countTables(s: ErSchema): TableCount {
  const entities = s.entities.length;
  const weak = s.weak.length;
  const multivalued = s.multivalued.length;
  const relationships = s.relationships.filter((r) => r.card === "M:N").length;
  return { entities, weak, multivalued, relationships, total: entities + weak + multivalued + relationships };
}

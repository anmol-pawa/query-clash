/** The Codex list's menu logic, as plain data so it is testable. */
import type { CodexEntry } from "@/content/types";

export type CodexCategory = CodexEntry["category"];

/** Each category's tab and header-stripe colour. */
export const CATEGORY_COLOR: Record<CodexCategory, string> = {
  Basics: "#7dd3fc",
  Joins: "#f472b6",
  Aggregation: "#fbbf24",
  Subqueries: "#a78bfa",
  DML: "#4ade80",
  Transactions: "#fb923c",
  DDL: "#f87171",
  Analytics: "#22d3ee",
  Hierarchies: "#a3e635",
  Performance: "#facc15",
  "Modern SQL": "#e879f9",
  MySQL: "#2dd4bf",
};

/** "All" followed by every category present, in first-seen order. */
export function codexCategories(entries: readonly CodexEntry[]): string[] {
  return ["All", ...new Set(entries.map((e) => e.category))];
}

/** Entries in a category ("All" for every one) whose title, definition or syntax contains the query (any case). */
export function filterCodex(entries: readonly CodexEntry[], cat: string, q: string): CodexEntry[] {
  const needle = q.trim().toLowerCase();
  return entries.filter((e) => (cat === "All" || e.category === cat) && (!needle || `${e.title} ${e.definition} ${e.syntax.postgres} ${e.syntax.oracle}`.toLowerCase().includes(needle)));
}

/** Unlocked / total per tab, for the counter on each category tab. */
export function categoryProgress(entries: readonly CodexEntry[], unlocked: readonly string[]): Record<string, { got: number; total: number }> {
  const out: Record<string, { got: number; total: number }> = {};
  for (const cat of codexCategories(entries)) {
    const inCat = entries.filter((e) => cat === "All" || e.category === cat);
    out[cat] = { got: inCat.filter((e) => unlocked.includes(e.id)).length, total: inCat.length };
  }
  return out;
}

export type EntryState = "mastered" | "unlocked" | "study" | "locked";

/** How a list row shows. Locked rows open only in study mode; among the open
 *  ones a mastered quiz wins, then unlocked, then "study" (opened early). */
export function entryState(id: string, save: { codex: readonly string[]; quizzes: readonly string[] }, study: boolean): EntryState {
  const unlocked = save.codex.includes(id);
  if (!unlocked && !study) return "locked";
  if (save.quizzes.includes(id)) return "mastered";
  return unlocked ? "unlocked" : "study";
}

/** Shown in place of a locked entry's title: one ? per letter, spaces kept, so the length is a hint. */
export function lockedTitle(title: string): string {
  return title.replace(/[^\s]/g, "?");
}

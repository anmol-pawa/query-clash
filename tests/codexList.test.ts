import { describe, expect, it } from "vitest";
import { CATEGORY_COLOR, categoryProgress, codexCategories, entryState, filterCodex, lockedTitle } from "@/components/menu/codexList";
import { CODEX } from "@/content/codex";

describe("codex list", () => {
  it("lists All first, then every category once, each with a colour", () => {
    const cats = codexCategories(CODEX);
    expect(cats[0]).toBe("All");
    expect(new Set(cats).size).toBe(cats.length);
    expect(cats.slice(1).sort()).toEqual([...new Set(CODEX.map((e) => e.category))].sort());
    for (const c of cats.slice(1)) expect(CATEGORY_COLOR[c as keyof typeof CATEGORY_COLOR]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("filters by category and by a case-insensitive search over title, definition and both dialects' syntax", () => {
    expect(filterCodex(CODEX, "All", "")).toHaveLength(CODEX.length);
    const joins = filterCodex(CODEX, "Joins", "");
    expect(joins.length).toBeGreaterThan(0);
    expect(joins.every((e) => e.category === "Joins")).toBe(true);
    const hits = filterCodex(CODEX, "All", "  cOnNeCt By ");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((e) => `${e.title} ${e.definition} ${e.syntax.postgres} ${e.syntax.oracle}`.toLowerCase().includes("connect by"))).toBe(true);
    expect(filterCodex(CODEX, "Joins", "zzz-no-such-thing")).toEqual([]);
  });

  it("counts unlocked entries per tab", () => {
    const p = categoryProgress(CODEX, ["select", "where", "null"]);
    expect(p.All).toEqual({ got: 3, total: CODEX.length });
    const sum = codexCategories(CODEX)
      .slice(1)
      .reduce((n, c) => n + p[c].total, 0);
    expect(sum).toBe(CODEX.length);
    expect(codexCategories(CODEX).slice(1).reduce((n, c) => n + p[c].got, 0)).toBe(3);
  });

  it("decides each row's state: locked unless unlocked or studying, mastered wins", () => {
    const save = { codex: ["a", "b"], quizzes: ["b", "c"] };
    expect(entryState("a", save, false)).toBe("unlocked");
    expect(entryState("b", save, false)).toBe("mastered");
    expect(entryState("c", save, false)).toBe("locked");
    expect(entryState("c", save, true)).toBe("mastered");
    expect(entryState("d", save, false)).toBe("locked");
    expect(entryState("d", save, true)).toBe("study");
  });

  it("hides a locked title but keeps its shape", () => {
    expect(lockedTitle("GROUP BY")).toBe("????? ??");
    expect(lockedTitle("CTE")).toBe("???");
  });
});

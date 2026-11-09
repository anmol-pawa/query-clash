import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_MISSIONS } from "@/content/chapters";
import { CODEX } from "@/content/codex";
import { QUESTIONS } from "@/content/interview";
import { COVERAGE_ROWS, coverageHoles, coverageMarkdown, coverageMatrix } from "@/lib/coverage";

const matrix = coverageMatrix(QUESTIONS, ALL_MISSIONS, CODEX);

describe("interview coverage matrix", () => {
  it("has unique row ids covering every interview area", () => {
    expect(new Set(COVERAGE_ROWS.map((r) => r.id)).size).toBe(COVERAGE_ROWS.length);
    const areas = new Set(COVERAGE_ROWS.map((r) => r.area));
    for (const a of ["SQL coding", "Schema design", "Indexing", "Query plans", "Transactions", "Scale and distribution", "Operations"]) expect(areas.has(a)).toBe(true);
  });

  it("has no row below its minimum content", () => {
    expect(coverageHoles(matrix)).toEqual([]);
  });

  it("docs/COVERAGE.md embeds the current matrix", () => {
    const doc = readFileSync("docs/COVERAGE.md", "utf8");
    expect(doc).toContain(coverageMarkdown(matrix));
  });
});

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { QUESTIONS } from "@/content/interview";
import { ALL_MISSIONS } from "@/content/chapters";
import { COVERAGE_ROWS, computeCoverage, coverageMarkdown } from "@/lib/coverage";

const results = computeCoverage(QUESTIONS, ALL_MISSIONS);

describe("interview coverage matrix", () => {
  it("every topic row has at least its minimum questions", () => {
    for (const r of results) expect(r.questions.length, `${r.row.topic}`).toBeGreaterThanOrEqual(r.row.minQuestions);
  });
  it("every SQL-coding row with a mission pattern has at least its minimum missions", () => {
    for (const r of results) if (r.row.minMissions) expect(r.missions.length, `${r.row.topic}`).toBeGreaterThanOrEqual(r.row.minMissions);
  });
  it("covers the headline interview areas", () => {
    const groups = new Set(COVERAGE_ROWS.map((r) => r.group));
    for (const g of ["SQL coding", "Schema design", "Indexing", "Query plans and tuning", "Transactions", "Scale and systems"]) expect(groups.has(g)).toBe(true);
  });
  it("docs/COVERAGE.md is up to date", () => {
    const md = coverageMarkdown(results, { questions: QUESTIONS.length, missions: ALL_MISSIONS.length });
    if (process.env.UPDATE_COVERAGE === "1") writeFileSync("docs/COVERAGE.md", md);
    expect(existsSync("docs/COVERAGE.md")).toBe(true);
    expect(readFileSync("docs/COVERAGE.md", "utf8")).toBe(md);
  });
});

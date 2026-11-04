import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_MISSIONS } from "@/content/chapters";
import { CODEX } from "@/content/codex";
import { QUESTIONS } from "@/content/interview";
import { COVERAGE, countQuestions, renderCoverageMd } from "@/lib/coverage";

const missionIds = new Set(ALL_MISSIONS.map((m) => m.id));
const codexIds = new Set(CODEX.map((c) => c.id));
const questionIds = new Set(QUESTIONS.map((q) => q.id));

describe("interview coverage matrix", () => {
  it("has unique row ids", () => {
    const ids = COVERAGE.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("references only real missions, codex entries and questions", () => {
    for (const r of COVERAGE) {
      for (const m of r.missions) expect(missionIds.has(m), `${r.id}: mission ${m}`).toBe(true);
      for (const c of r.codex) expect(codexIds.has(c), `${r.id}: codex ${c}`).toBe(true);
      for (const q of r.questionIds ?? []) expect(questionIds.has(q), `${r.id}: question ${q}`).toBe(true);
    }
  });

  it("meets every row's minimum question count", () => {
    for (const r of COVERAGE) expect(countQuestions(r, QUESTIONS), r.id).toBeGreaterThanOrEqual(r.minQuestions);
  });

  it("every row is covered by at least one of: missions, codex or questions, and each area has rows", () => {
    for (const r of COVERAGE) expect(r.minQuestions + r.missions.length + r.codex.length).toBeGreaterThan(0);
    const areas = new Set(COVERAGE.map((r) => r.area));
    expect(areas.size).toBe(7);
  });

  it("a row with neither missions nor codex entries must state a gap or a tool", () => {
    for (const r of COVERAGE) {
      if (r.missions.length === 0 && r.codex.length === 0) {
        expect(Boolean(r.gap) || (r.tools?.length ?? 0) > 0 || r.minQuestions >= 5, r.id).toBe(true);
      }
    }
  });

  it("docs/COVERAGE.md is up to date (run with UPDATE_COVERAGE=1 to regenerate)", () => {
    const md = renderCoverageMd(COVERAGE, QUESTIONS);
    if (process.env.UPDATE_COVERAGE) writeFileSync("docs/COVERAGE.md", md);
    expect(readFileSync("docs/COVERAGE.md", "utf8")).toBe(md);
  });
});

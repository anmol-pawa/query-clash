import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { EXPLAIN_PLANS } from "@/content/interview/explainPlans";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("EXPLAIN reading questions", () => {
  it("registers every question once with unique ids", () => {
    const ids = EXPLAIN_PLANS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(byId[id]).toBeDefined();
  });

  it("shows a plan on every question that refers to one", () => {
    for (const q of EXPLAIN_PLANS) {
      if (q.id !== "explain-analyze-writes") expect(q.plan, q.id).toMatch(/cost=|CREATE INDEX/);
    }
  });

  it("recomputes rows x loops from the nested-loop plan", () => {
    const plan = byId["explain-loops-total-rows"].plan!;
    const inner = plan.split("\n").find((l) => l.includes("customers_pkey"))!;
    const [, rows, loops] = inner.match(/actual time=[\d.]+\.\.[\d.]+ rows=(\d+) loops=(\d+)/)!.map(Number);
    expect(rows * loops).toBe((byId["explain-loops-total-rows"] as { answer: number }).answer);
  });

  it("recomputes rows read by the seq scan", () => {
    const plan = byId["explain-seq-scan-total-rows"].plan!;
    const returned = Number(plan.match(/actual time=[\d.]+\.\.[\d.]+ rows=(\d+)/)![1]);
    const removed = Number(plan.match(/Rows Removed by Filter: (\d+)/)![1]);
    expect(returned + removed).toBe((byId["explain-seq-scan-total-rows"] as { answer: number }).answer);
  });

  it("keeps the estimate-miss plan consistent with its explanation", () => {
    const plan = byId["explain-estimate-miss"].plan!;
    expect(plan).toMatch(/Seq Scan on events e\s+\(cost=[\d.]+\.\.[\d.]+ rows=1 /);
    expect(plan).toMatch(/rows=48210 loops=1/);
    expect(plan).toMatch(/loops=48210/);
  });

  it("keys each answer correctly", () => {
    expect(ans("explain-function-on-column")).toMatch(/lower\(email\)/);
    expect(ans("explain-rows-removed")).toMatch(/\(customer_id, status\)/);
    expect(ans("explain-estimate-miss")).toMatch(/extended statistics/);
    expect(ans("explain-heap-fetches")).toMatch(/visibility map/);
    expect(ans("explain-bitmap-and")).toMatch(/intersecting/);
    expect(ans("explain-hash-spill")).toMatch(/work_mem/);
    expect(ans("explain-sort-disk")).toMatch(/spilled/);
    expect(ans("explain-leading-wildcard")).toMatch(/gin_trgm_ops/);
    expect(ans("explain-low-selectivity")).toBe("False");
    expect(ans("explain-date-cast")).toMatch(/created_at >= '2026-01-15' AND created_at < '2026-01-16'/);
    expect(ans("explain-partial-index")).toMatch(/does not contain/);
    expect(ans("explain-composite-order")).toMatch(/leftmost-prefix/);
    expect(ans("explain-analyze-writes")).toMatch(/ROLLBACK/);
  });

  it("matches the selectivity claim: 92% of rows pass", () => {
    const plan = byId["explain-low-selectivity"].plan!;
    const kept = Number(plan.match(/rows=(\d+) loops=1\)\n/)![1]);
    const removed = Number(plan.match(/Removed by Filter: (\d+)/)![1]);
    expect(Math.round((kept / (kept + removed)) * 100)).toBe(92);
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { OPS_MIGRATIONS } from "@/content/interview/opsMigrations";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);
const num = (id: string) => (byId[id] as { answer: number }).answer;

describe("Operations and migrations questions", () => {
  it("registers every question once with unique ids", () => {
    const ids = OPS_MIGRATIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(byId[id]).toBeDefined();
  });

  it("recomputes the numeric answers", () => {
    expect(16 / 8).toBe(num("ops-wal-archive-rpo"));
    expect(2_000_000 * 0.004).toBeCloseTo(num("ops-total-time-rank"), 6);
  });

  it("keys each answer correctly", () => {
    expect(ans("ops-add-not-null-safe")).toMatch(/NOT VALID/);
    expect(ans("ops-create-index-concurrently")).toMatch(/without blocking writes/);
    expect(ans("ops-backfill-batches")).toMatch(/small batches/);
    expect(ans("ops-ddl-lock-queue")).toMatch(/queues behind/);
    expect(ans("ops-rpo-rto")).toMatch(/maximum acceptable data loss/);
    expect(ans("ops-vacuum-why")).toMatch(/dead row versions/);
    expect(ans("ops-bloat-long-tx")).toMatch(/old snapshot/);
    expect(ans("ops-slow-query-monitor")).toMatch(/pg_stat_statements/);
  });

  it("keys the multi-select, true/false and order", () => {
    expect((byId["ops-pitr-needs"] as { answers: number[] }).answers).toEqual([0, 1, 2]);
    expect((byId["ops-partition-benefits"] as { answers: number[] }).answers).toEqual([0, 1, 2]);
    expect((byId["ops-concurrently-in-tx"] as { answer: boolean }).answer).toBe(false);
    expect((byId["ops-replica-not-backup"] as { answer: boolean }).answer).toBe(false);
    const steps = (byId["ops-expand-contract"] as { steps: string[] }).steps;
    expect(steps[1]).toMatch(/Backfill/);
    expect(steps[3]).toMatch(/drop it/);
  });
});

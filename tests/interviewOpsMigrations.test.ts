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
    expect((50_000_000 / 10_000) * 0.2).toBeCloseTo(num("ops-backfill-math"), 10);
    expect(50 + 0.2 * 1_000_000).toBeCloseTo(num("ops-autovacuum-threshold"), 6);
    expect(5 * 12).toBe(num("ops-partition-count"));
  });

  it("keys each answer correctly", () => {
    expect(ans("ops-add-not-null")).toMatch(/NOT VALID/);
    expect(ans("ops-index-concurrently")).toMatch(/does not block writes/);
    expect(ans("ops-ddl-lock-queue")).toMatch(/queue behind/);
    expect(ans("ops-backup-types")).toMatch(/point-in-time recovery/);
    expect(ans("ops-vacuum-why")).toMatch(/dead row versions/);
    expect(ans("ops-partition-benefits")).toMatch(/dropping a partition/);
    expect(ans("ops-slow-queries")).toMatch(/pg_stat_statements/);
  });

  it("keys the multi-select, true/false and order", () => {
    expect((byId["ops-backfill-practices"] as { answers: number[] }).answers).toEqual([0, 1, 2]);
    expect((byId["ops-bloat-causes"] as { answers: number[] }).answers).toEqual([0, 1, 2]);
    expect((byId["ops-concurrently-failure"] as { answer: boolean }).answer).toBe(false);
    expect((byId["ops-backup-untested"] as { answer: boolean }).answer).toBe(false);
    const steps = (byId["ops-expand-contract"] as { steps: string[] }).steps;
    expect(steps[0]).toMatch(/Add the new column/);
    expect(steps[3]).toMatch(/drop it/);
    expect((byId["ops-pitr-order"] as { steps: string[] }).steps[0]).toMatch(/base backup/);
  });
});

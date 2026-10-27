import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { SCALE_FINE } from "@/content/interview/scaleFine";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);
const num = (id: string) => (byId[id] as { answer: number }).answer;

describe("Scale and pagination questions", () => {
  it("registers every question once with unique ids", () => {
    const ids = SCALE_FINE.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(byId[id]).toBeDefined();
  });

  it("recomputes the numeric answers", () => {
    expect(num("scale-offset-cost")).toBe(100_000 - 20);
    expect(num("scale-n-plus-one")).toBe(1 + 50);
    expect(num("scale-bulk-insert-trips")).toBe((100_000 * 0.5) / 1000);
    expect((100_000 / 1000) * 0.5).toBe(50); // 100 batches x 0.5 ms = 0.05 s
    expect(num("scale-counter-slots")).toBe(Math.ceil(10_000 / 400));
  });

  it("keys each answer correctly", () => {
    expect(ans("scale-keyset-query")).toMatch(/\(created_at, id\) < \(:ts, :id\)/);
    expect(ans("scale-offset-drift")).toMatch(/shown again/);
    expect(ans("scale-n-plus-one-fix")).toMatch(/ANY\(:order_ids\)/);
    expect(ans("scale-upsert")).toMatch(/DO UPDATE SET hits = page_views\.hits \+ 1/);
    expect(ans("scale-count-star")).toMatch(/reltuples/);
    expect(ans("scale-hot-counter")).toMatch(/Shard the counter/);
    expect(ans("scale-topk-query")).toMatch(/B-tree index on score/);
    expect(ans("scale-topk-per-group")).toMatch(/ROW_NUMBER\(\) OVER \(PARTITION BY customer_id/);
    expect(ans("scale-batch-delete")).toMatch(/batches/);
  });

  it("keys the multi-select keyset limitations", () => {
    expect((byId["scale-keyset-tradeoffs"] as { answers: number[] }).answers).toEqual([0, 1, 3]);
  });

  it("accepts MERGE as the short answer", () => {
    expect((byId["scale-merge-oracle"] as { accept: string[] }).accept).toContain("merge");
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { STORE_CHOICE } from "@/content/interview/storeChoice";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);
const num = (id: string) => (byId[id] as { answer: number }).answer;

describe("Data-store choice and NoSQL questions", () => {
  it("registers every question once with unique ids", () => {
    const ids = STORE_CHOICE.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(byId[id]).toBeDefined();
  });

  it("recomputes the numeric answers", () => {
    expect(num("store-bloom-skip")).toBeCloseTo(5 * 0.01, 10);
    expect(Math.round(10 * Math.LN2)).toBe(num("store-bloom-k"));
    const fp = (1 - Math.exp(-7 / 10)) ** 7;
    expect(fp).toBeGreaterThan(0.007);
    expect(fp).toBeLessThan(0.009);
    expect(100 * Math.ceil(3.5)).toBe(num("store-wcu"));
  });

  it("keys each answer correctly", () => {
    expect(ans("store-sql-vs-nosql")).toMatch(/relational database/);
    expect(ans("store-families")).toMatch(/Session tokens/);
    expect(ans("store-document-fit")).toMatch(/self-contained aggregate/);
    expect(ans("store-btree-vs-lsm")).toMatch(/sequential/);
    expect(ans("store-compaction-amp")).toMatch(/physically written/);
    expect(ans("store-bloom-property")).toMatch(/definitely not/);
    expect(ans("store-dynamo-keys")).toMatch(/hashing/);
    expect(ans("store-hot-partition")).toMatch(/higher-cardinality/);
    expect(ans("store-denormalize")).toMatch(/fan out/);
  });

  it("keys the multi-select, true/false and order", () => {
    expect((byId["store-secondary-index-cost"] as { answers: number[] }).answers).toEqual([0, 1, 2]);
    expect((byId["store-tombstone"] as { answer: boolean }).answer).toBe(false);
    const steps = (byId["store-lsm-write-path"] as { steps: string[] }).steps;
    expect(steps[0]).toMatch(/write-ahead log/);
    expect(steps[3]).toMatch(/compaction/);
  });
});

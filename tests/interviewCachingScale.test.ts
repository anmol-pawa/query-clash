import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { CACHING_SCALE } from "@/content/interview/cachingScale";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);
const num = (id: string) => (byId[id] as { answer: number }).answer;

describe("Caching and scale questions", () => {
  it("registers every question once with unique ids", () => {
    const ids = CACHING_SCALE.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(byId[id]).toBeDefined();
  });

  it("recomputes the numeric answers", () => {
    expect(Math.round(100_000_000 / 86_400)).toBe(num("cap-qps"));
    expect(200_000_000 * 250 / 1e9).toBe(num("cap-table-size"));
    expect(200_000_000 * 16 / 1e9).toBeCloseTo(num("cap-index-size"), 10);
    expect(10_000 * (1 - 0.9)).toBeCloseTo(num("cap-db-load"), 6);
    expect(1 + 0.05 * 20).toBeCloseTo(num("cap-avg-latency"), 10);
  });

  it("keys each answer correctly", () => {
    expect(ans("cache-write-through")).toMatch(/before acknowledging/);
    expect(ans("cache-invalidate-delete")).toMatch(/delete the cache key/);
    expect(ans("cache-stampede")).toMatch(/stampede/);
    expect(ans("cache-penetration")).toMatch(/Bloom filter/);
    expect(ans("cache-redis-leaderboard")).toMatch(/Sorted set/);
    expect(ans("cache-read-replica")).toMatch(/lag/);
    expect(ans("cache-lru-vs-ttl")).toMatch(/least recently used/);
  });

  it("keys the multi-select, true/false and order", () => {
    expect((byId["cache-stampede-fixes"] as { answers: number[] }).answers).toEqual([0, 1, 2]);
    expect((byId["cache-write-behind-loss"] as { answer: boolean }).answer).toBe(true);
    expect((byId["cache-redis-atomic"] as { answer: boolean }).answer).toBe(true);
    const steps = (byId["cache-aside-read"] as { steps: string[] }).steps;
    expect(steps[0]).toMatch(/checks the cache/);
    expect(steps[2]).toMatch(/stores the value/);
  });
});

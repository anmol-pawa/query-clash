import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

/** Replays a reference string through an LRU pool and counts hits. */
function lruHits(refs: string[], size: number): number {
  const pool: string[] = [];
  let hits = 0;
  for (const r of refs) {
    const i = pool.indexOf(r);
    if (i >= 0) {
      hits++;
      pool.splice(i, 1);
    } else if (pool.length === size) pool.shift();
    pool.push(r);
  }
  return hits;
}

describe("buffer pool fine-print questions", () => {
  it("recomputes page arithmetic", () => {
    const perPage = Math.floor(4096 / 100);
    expect(byId["buffine-records-per-page"]).toMatchObject({ answer: perPage });
    expect(byId["buffine-pages-needed"]).toMatchObject({ answer: Math.ceil(1000 / perPage) });
  });

  it("simulates LRU hits", () => {
    expect(byId["buffine-lru-hits"]).toMatchObject({ answer: lruHits(["A", "B", "A", "C", "B"], 2) });
    // looping over N+1 pages in an N-page pool never hits (sequential flooding)
    expect(lruHits(["A", "B", "C", "A", "B", "C", "A", "B", "C"], 2)).toBe(0);
  });

  it("keys each answer correctly", () => {
    expect(ans("buffine-sequential-flooding")).toMatch(/evicts every page/);
    expect(ans("buffine-dirty-eviction")).toBe("False");
    expect(ans("buffine-pin-count")).toBe("False");
  });
});

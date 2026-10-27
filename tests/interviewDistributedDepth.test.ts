import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { DISTRIBUTED_DEPTH } from "@/content/interview/distributedDepth";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);
const num = (id: string) => (byId[id] as { answer: number }).answer;

describe("Distributed data depth questions", () => {
  it("registers every question once with unique ids", () => {
    const ids = DISTRIBUTED_DEPTH.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(byId[id]).toBeDefined();
  });

  it("recomputes the numeric answers", () => {
    expect(Math.floor(7 / 2) + 1).toBe(num("dd-raft-majority"));
    expect(5 - 2 + 1).toBe(num("dd-quorum-rw"));
    // 3 and 4 nodes tolerate the same single failure.
    const tolerated = (n: number) => n - (Math.floor(n / 2) + 1);
    expect(tolerated(3)).toBe(tolerated(4));
    expect(tolerated(5)).toBe(tolerated(6));
    let moved = 0;
    for (let k = 0; k < 20; k++) if (k % 4 !== k % 5) moved++;
    expect((moved / 20) * 100).toBe(num("dd-rebalance-fraction"));
  });

  it("keys each answer correctly", () => {
    expect(ans("dd-sync-vs-async-commit")).toMatch(/no acknowledged write being lost/);
    expect(ans("dd-read-your-writes-fix")).toMatch(/route that user's reads to the primary/);
    expect(ans("dd-raft-even-cluster")).toMatch(/tolerates only 1 failure/);
    expect(ans("dd-shard-strategy")).toMatch(/dedicated shard/);
    expect(ans("dd-cross-shard")).toMatch(/2PC/);
    expect(ans("dd-outbox")).toMatch(/same local transaction/);
    expect(ans("dd-delivery-semantics")).toMatch(/idempotent consumers/);
    expect(ans("dd-cap-example")).toMatch(/Rejects or blocks/);
  });

  it("keys the true/false, multi-select and order questions", () => {
    expect((byId["dd-failover-loss"] as { answer: boolean }).answer).toBe(true);
    expect((byId["dd-cdc"] as { answers: number[] }).answers).toEqual([0, 1, 3]);
    const election = (byId["dd-leader-election"] as { steps: string[] }).steps;
    expect(election[0]).toMatch(/election timeout/);
    expect(election[3]).toMatch(/majority grants votes/);
    const models = (byId["dd-consistency-models"] as { steps: string[] }).steps;
    expect(models[0]).toMatch(/^Linearizable/);
    expect(models[3]).toMatch(/^Eventual/);
  });
});

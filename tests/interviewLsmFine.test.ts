import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("LSM and Bloom filter fine-print questions", () => {
  it("keys the LSM facts", () => {
    expect(ans("lsmfine-write-path")).toBe("A write-ahead log and an in-memory sorted memtable");
    expect(ans("lsmfine-tombstone")).toBe("It writes a tombstone marker that hides older versions until compaction drops them");
    expect(ans("lsmfine-workload")).toBe("Very high write throughput, accepting extra read and compaction work");
  });

  it("keys the Bloom filter facts", () => {
    expect(ans("lsmfine-bloom-errors")).toBe("The key is definitely absent, so the SSTable can be skipped");
    expect(ans("lsmfine-bloom-delete")).toBe("False");
  });

  it("computes the flush count", () => {
    expect(byId["lsmfine-flushes"]).toMatchObject({ answer: 100 / 4 });
  });

  it("a Bloom filter never gives false negatives", () => {
    const m = 64;
    const bits = new Array<boolean>(m).fill(false);
    const hashes = (k: number) => [k % m, (k * 7 + 3) % m, (k * 13 + 5) % m];
    const added = Array.from({ length: 12 }, (_, i) => i * 5 + 1);
    for (const k of added) for (const h of hashes(k)) bits[h] = true;
    for (const k of added) expect(hashes(k).every((h) => bits[h])).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);
const staticCount = (prefix: string) => QUESTIONS.filter((q) => q.id.startsWith(prefix) && !q.id.startsWith(`${prefix}gen`)).length;

describe("more transactions and distributed questions", () => {
  it("has at least 30 static questions per topic", () => {
    expect(staticCount("tx-")).toBeGreaterThanOrEqual(30);
    expect(staticCount("dst-")).toBeGreaterThanOrEqual(30);
  });

  it("keys each new transaction answer correctly", () => {
    expect(ans("tx-consistency-who")).toBe("False");
    expect(ans("tx-rollback-property")).toBe("Atomicity");
    expect(ans("tx-standard-phantoms")).toBe("SERIALIZABLE");
    expect(ans("tx-pg-rr-phantom")).toBe("False");
    expect(ans("tx-oracle-levels")).toMatch(/^READ COMMITTED \(default\), SERIALIZABLE and READ ONLY/);
    expect(ans("tx-serial-five")).toBe("120");
    expect(ans("tx-no-conflict-pair")).toBe("R1(A), R2(A)");
    expect(ans("tx-autocommit")).toMatch(/implicit transaction/);
    expect(ans("tx-pg-aborted")).toMatch(/current transaction is aborted/);
  });

  it("keys each new distributed answer correctly", () => {
    expect(ans("dst-partition-optional")).toBe("False");
    expect(ans("dst-quorum-read")).toBe("2");
    expect(ans("dst-follower-stale")).toMatch(/^A stale read/);
    expect(ans("dst-raft-failures")).toBe("2");
    expect(ans("dst-2pc-yes-abort")).toBe("False");
    expect(ans("dst-vnodes")).toMatch(/many small slices/);
    expect(ans("dst-hash-vs-range")).toBe("Range queries have to ask every shard");
    expect(ans("dst-ap-partition")).toMatch(/both sides/);
  });

  it("recomputes the numeric answers independently", () => {
    const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
    expect(factorial(5)).toBe(120);
    // Smallest R with R + W > N.
    let r = 1;
    while (r + 4 <= 5) r++;
    expect(r).toBe(2);
    // Raft majority of 5 is 3, so 2 failures are tolerated.
    expect(5 - (Math.floor(5 / 2) + 1)).toBe(2);
  });
});

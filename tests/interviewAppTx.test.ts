import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { APP_TX } from "@/content/interview/appTx";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("Transactions in application code questions", () => {
  it("registers every question once with unique ids", () => {
    const ids = APP_TX.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(byId[id]).toBeDefined();
  });

  it("recomputes the pool throughput", () => {
    const perConn = 1000 / 80;
    expect((byId["apptx-pool-math"] as { answer: number }).answer).toBe(perConn * 20);
    expect((1000 / 20) * 20).toBe(1000);
  });

  it("keys each answer correctly", () => {
    expect(ans("apptx-optimistic-update")).toMatch(/AND version = :v/);
    expect(ans("apptx-opt-vs-pess")).toMatch(/stock > 0/);
    expect(ans("apptx-oversell-fix")).toMatch(/stock >= 1/);
    expect(ans("apptx-for-update")).toMatch(/locks the row/);
    expect(ans("apptx-skip-locked")).toMatch(/SKIP LOCKED/);
    expect(ans("apptx-nowait")).toMatch(/error immediately/);
    expect(ans("apptx-retry-scope")).toMatch(/entire transaction/);
    expect(ans("apptx-deadlock-order")).toMatch(/consistent global order/);
    expect(ans("apptx-idempotency")).toMatch(/UNIQUE constraint/);
    expect(ans("apptx-pgbouncer-modes")).toMatch(/Session-level state/);
    expect(ans("apptx-select-then-insert")).toMatch(/UNIQUE \(show_id, seat_no\)/);
  });

  it("keys the multi-selects and the true/false", () => {
    expect((byId["apptx-retry-codes"] as { answers: number[] }).answers).toEqual([0, 1]);
    expect((byId["apptx-long-tx-hazards"] as { answers: number[] }).answers).toEqual([0, 1, 3]);
    expect((byId["apptx-idem-unique"] as { answer: boolean }).answer).toBe(false);
  });
});

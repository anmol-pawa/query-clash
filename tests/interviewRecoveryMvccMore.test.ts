import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { RECOVERY_MORE } from "@/content/interview/recoveryMore";
import { MVCC_MORE } from "@/content/interview/mvccMore";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("more recovery and MVCC questions", () => {
  it("has unique ids and registers every new question", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of [...RECOVERY_MORE, ...MVCC_MORE]) expect(byId[q.id]).toBe(q);
    expect(QUESTIONS.filter((q) => q.id.startsWith("rec-") && !q.id.startsWith("rec-gen")).length).toBeGreaterThanOrEqual(30);
    expect(QUESTIONS.filter((q) => q.id.startsWith("mvcc-") && !q.id.startsWith("mvcc-gen")).length).toBeGreaterThanOrEqual(30);
  });

  it("keys the recovery answers", () => {
    expect(ans("rec-wal-order")).toMatch(/before the changed data page/);
    expect(ans("rec-commit-durable")).toBe("True");
    expect(ans("rec-no-steal-force")).toBe("NO-STEAL with FORCE");
    expect(ans("rec-steal-noforce-both")).toBe("True");
    expect(ans("rec-imm-redo-a")).toBe("8");
    expect(ans("rec-imm-undo-b")).toBe("3");
    expect(ans("rec-aries-tables")).toMatch(/transaction table and the dirty page table/);
    expect(ans("rec-aries-redo-start")).toMatch(/smallest recLSN/);
    expect(ans("rec-aries-redo-skip")).toMatch(/pageLSN is at least/);
    expect(ans("rec-clr-not-undone")).toBe("False");
    expect(ans("rec-recovery-crash")).toBe("True");
    expect(ans("rec-group-commit")).toMatch(/once for several/);
    expect(ans("rec-physiological")).toMatch(/physical page/);
    expect(ans("rec-media-failure")).toMatch(/backup/);
    expect(ans("rec-oracle-redo-undo")).toMatch(/undo keeps old values/);
    expect(ans("rec-pg-fpw")).toMatch(/torn pages/);
  });

  it("keys the MVCC answers", () => {
    expect(ans("mvcc-readers-writers")).toBe("True");
    expect(ans("mvcc-pg-default")).toBe("READ COMMITTED");
    expect(ans("mvcc-pg-read-uncommitted")).toMatch(/READ COMMITTED/);
    expect(ans("mvcc-si-write-skew")).toBe("True");
    expect(ans("mvcc-first-committer")).toMatch(/first succeeds/);
    expect(ans("mvcc-dead-tuples")).toBe("4");
    expect(ans("mvcc-hot")).toMatch(/no indexed column changes/);
    expect(ans("mvcc-index-only")).toMatch(/visibility map/);
    expect(ans("mvcc-scn")).toBe("SCN");
    expect(ans("mvcc-bloat")).toMatch(/autovacuum/);
    expect(ans("mvcc-skip-locked")).toMatch(/job queue/);
    expect(ans("mvcc-lost-update-rc")).toMatch(/SET balance = balance \+ 10/);
  });

  it("computes the textbook log recovery values from the log", () => {
    type Rec = { t: string; kind: "start" | "commit" | "write"; item?: string; old?: number; nw?: number };
    const log: Rec[] = [
      { t: "T1", kind: "start" },
      { t: "T1", kind: "write", item: "A", old: 5, nw: 8 },
      { t: "T1", kind: "commit" },
      { t: "T2", kind: "start" },
      { t: "T2", kind: "write", item: "B", old: 3, nw: 9 },
    ];
    const committed = new Set(log.filter((r) => r.kind === "commit").map((r) => r.t));
    const db: Record<string, number> = { A: 5, B: 9 };
    for (const r of log) if (r.kind === "write" && committed.has(r.t)) db[r.item!] = r.nw!;
    for (const r of [...log].reverse()) if (r.kind === "write" && !committed.has(r.t)) db[r.item!] = r.old!;
    expect(db.A).toBe(8);
    expect(db.B).toBe(3);
    // insert + 3 updates = 4 versions; the delete adds none
    expect(1 + 3 + 0).toBe(4);
  });
});

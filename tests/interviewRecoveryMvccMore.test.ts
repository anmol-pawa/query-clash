import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("more recovery questions", () => {
  it("has at least 30 static recovery questions", () => {
    expect(QUESTIONS.filter((q) => q.id.startsWith("rec-") && !q.id.startsWith("rec-gen")).length).toBeGreaterThanOrEqual(30);
  });

  it("keys each answer correctly", () => {
    expect(ans("rec-steal")).toMatch(/^UNDO/);
    expect(ans("rec-noforce")).toMatch(/need not be written to disk at commit/);
    expect(ans("rec-no-undo-redo")).toBe("NO-STEAL + FORCE");
    expect(ans("rec-commit-point")).toBe("True");
    expect(ans("rec-group-commit")).toMatch(/one log flush/);
    expect(ans("rec-fsync")).toBe("True");
    expect(ans("rec-checkpoint-purpose")).toMatch(/how far back/);
    expect(ans("rec-undo-log-rule")).toMatch(/^1\. Append the update record.*2\. Write the new value.*3\. Append <COMMIT T>/);
    expect(ans("rec-redo-log-rule")).toMatch(/COMMIT record and update records are in the log/);
    expect(ans("rec-aries-order")).toMatch(/^1\. Analysis.*2\. Redo.*3\. Undo/);
    expect(ans("rec-redo-start")).toMatch(/smallest recLSN/);
    expect(ans("rec-clr-never-undone")).toBe("True");
    expect(ans("rec-torn-page")).toMatch(/Full-page images/);
    expect(ans("rec-pitr")).toMatch(/base backup plus the archived WAL/);
    expect(ans("rec-media-failure")).toMatch(/last backup/);
  });

  it("computes the redo count from the page LSN rule", () => {
    const pageLsn = 40;
    const redone = [30, 40, 50, 60].filter((lsn) => pageLsn < lsn).length;
    expect(ans("rec-redo-count")).toBe(String(redone));
  });
});

describe("more MVCC questions", () => {
  it("has at least 30 static MVCC questions", () => {
    expect(QUESTIONS.filter((q) => q.id.startsWith("mvcc-") && !q.id.startsWith("mvcc-gen")).length).toBeGreaterThanOrEqual(30);
  });

  it("keys each answer correctly", () => {
    expect(ans("mvcc-readers-writers")).toBe("False");
    expect(ans("mvcc-pg-delete")).toMatch(/xmax/);
    expect(ans("mvcc-hot")).toMatch(/no indexed column/);
    expect(ans("mvcc-vacuum-full")).toMatch(/ACCESS EXCLUSIVE/);
    expect(ans("mvcc-idle-in-tx")).toBe("True");
    expect(ans("mvcc-rc-snapshot")).toBe("True");
    expect(ans("mvcc-rr-serialize")).toMatch(/could not serialize access/);
    expect(ans("mvcc-write-skew")).toBe("False");
    expect(ans("mvcc-oracle-scn")).toMatch(/undo records/);
    expect(ans("mvcc-innodb")).toMatch(/REPEATABLE READ/);
    expect(ans("mvcc-mvto")).toMatch(/largest write timestamp/);
    expect(ans("mvcc-hint-bits")).toMatch(/tuple header/);
  });

  it("computes the numeric answers from first principles", () => {
    expect(ans("mvcc-versions-numeric")).toBe(String(1 + 4));
    const [xmin, xmax, running] = [100, 105, new Set([101, 103])];
    const visible = [99, 101, 102, 103, 104, 105].filter((x) => x < xmax && !running.has(x) && (x < xmin || x >= xmin));
    expect(ans("mvcc-snapshot-count")).toBe(String(visible.length));
  });
});

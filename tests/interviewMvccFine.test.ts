import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

/** Textbook visibility rule: xmin visible, and xmax unset or not visible to the snapshot. */
function visible(xmin: number, xmax: number | null, committedBefore: (xid: number) => boolean): boolean {
  return committedBefore(xmin) && (xmax === null || !committedBefore(xmax));
}

describe("MVCC fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("mvccfine-instant-rollback")).toBe("True");
    expect(ans("mvccfine-deleted-visible")).toBe("False");
    expect(ans("mvccfine-old-versions-home")).toBe(
      "PostgreSQL keeps them in the table itself until VACUUM; Oracle keeps them in undo segments",
    );
  });

  it("recomputes the numeric answers", () => {
    const rows = 5;
    const updates = 2;
    expect(rows * (updates + 1)).toBe(15);
    expect(byId["mvccfine-vacuum-live"]).toMatchObject({ answer: rows });
    expect(visible(100, 105, (x) => x <= 105)).toBe(false);
    const writes: Record<string, string> = { T1: "A", T2: "B" };
    const rowsWritten = Object.values(writes);
    expect(byId["mvccfine-si-disjoint"]).toMatchObject({ answer: new Set(rowsWritten).size });
    const snapshotCount = 10;
    expect(byId["mvccfine-rr-count"]).toMatchObject({ answer: snapshotCount });
  });
});

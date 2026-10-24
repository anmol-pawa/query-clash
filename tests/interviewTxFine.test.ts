import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

type Rec = { kind: "start" | "commit"; tx: string } | { kind: "ckpt"; active: string[] };

/** Undo/redo recovery: undo anything without a commit, redo commits after the last checkpoint. */
function classify(log: Rec[]) {
  const ckpt = log.map((r) => r.kind).lastIndexOf("ckpt");
  const committed = new Set(log.flatMap((r) => (r.kind === "commit" ? [r.tx] : [])));
  const seen = new Set(log.flatMap((r) => (r.kind === "start" ? [r.tx] : r.kind === "ckpt" ? r.active : [])));
  const undo = [...seen].filter((t) => !committed.has(t));
  const redo = log.slice(ckpt + 1).flatMap((r) => (r.kind === "commit" ? [r.tx] : []));
  return { undo, redo };
}

/** Transactions that must abort when `root` aborts, given "reader read uncommitted from writer" edges. */
function cascade(root: string, reads: [string, string][]): string[] {
  const out = new Set([root]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const [reader, writer] of reads) {
      if (out.has(writer) && !out.has(reader)) {
        out.add(reader);
        grew = true;
      }
    }
  }
  return [...out];
}

describe("transaction and recovery fine-print questions", () => {
  it("keys each answer correctly", () => {
    expect(ans("txfine-wal-commit")).toBe("False");
    expect(ans("txfine-strict-2pl")).toBe("True");
    expect(ans("txfine-write-skew")).toBe("Write skew");
    expect(ans("txfine-recoverable")).toBe("True");
  });

  it("recomputes the checkpoint log", () => {
    const { undo, redo } = classify([
      { kind: "start", tx: "T1" },
      { kind: "start", tx: "T2" },
      { kind: "commit", tx: "T1" },
      { kind: "ckpt", active: ["T2"] },
      { kind: "start", tx: "T3" },
      { kind: "commit", tx: "T3" },
      { kind: "start", tx: "T4" },
    ]);
    expect(undo.sort()).toEqual(["T2", "T4"]);
    expect(redo).toEqual(["T3"]);
    expect(byId["txfine-undo-count"]).toMatchObject({ answer: undo.length });
  });

  it("recomputes the cascading rollback", () => {
    const set = cascade("T1", [["T2", "T1"], ["T3", "T2"]]);
    expect(set).toHaveLength(3);
    expect(byId["txfine-cascade-count"]).toMatchObject({ answer: set.length });
  });
});

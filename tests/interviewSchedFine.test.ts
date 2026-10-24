import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

/** Basic timestamp ordering write check: "abort" if a younger txn read X, "skip" under Thomas if only a younger write exists. */
function writeOutcome(ts: number, rts: number, wts: number, thomas: boolean): "ok" | "abort" | "skip" {
  if (ts < rts) return "abort";
  if (ts < wts) return thomas ? "skip" : "abort";
  return "ok";
}

type Op = { kind: "r" | "w" | "c" | "a"; t: number; x?: string };

function parse(s: string): Op[] {
  return s.split(" ").map((tok) => {
    const m = /^([rwca])(\d)(?:\((\w)\))?$/.exec(tok)!;
    return { kind: m[1] as Op["kind"], t: Number(m[2]), x: m[3] };
  });
}

/** Recoverable: whenever Tj reads from Ti, Ti commits before Tj does (and Ti has not aborted). */
function recoverable(s: string): boolean {
  const ops = parse(s);
  const lastWriter: Record<string, number> = {};
  const readsFrom: [number, number][] = [];
  for (const op of ops) {
    if (op.kind === "w") lastWriter[op.x!] = op.t;
    if (op.kind === "r" && lastWriter[op.x!] && lastWriter[op.x!] !== op.t) readsFrom.push([op.t, lastWriter[op.x!]]);
  }
  const commitAt = (t: number) => ops.findIndex((o) => o.kind === "c" && o.t === t);
  return readsFrom.every(([reader, writer]) => {
    const cr = commitAt(reader);
    return cr < 0 || (commitAt(writer) >= 0 && commitAt(writer) < cr);
  });
}

/** Transactions (besides the aborter) that read, directly or transitively, from an aborted one. */
function cascade(s: string, aborter: number): number[] {
  const ops = parse(s);
  const lastWriter: Record<string, number> = {};
  const deps: [number, number][] = [];
  for (const op of ops) {
    if (op.kind === "w") lastWriter[op.x!] = op.t;
    if (op.kind === "r" && lastWriter[op.x!] && lastWriter[op.x!] !== op.t) deps.push([op.t, lastWriter[op.x!]]);
  }
  const dead = new Set([aborter]);
  for (let changed = true; changed; ) {
    changed = false;
    for (const [reader, writer] of deps) if (dead.has(writer) && !dead.has(reader)) {
        dead.add(reader);
        changed = true;
      }
  }
  dead.delete(aborter);
  return [...dead];
}

/** Nodes that lie on some cycle of a directed graph. */
function cycleNodes(edges: [number, number][]): number[] {
  const nodes = [...new Set(edges.flat())];
  return nodes.filter((n) => {
    const seen = new Set<number>();
    const stack = [n];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const [a, b] of edges) if (a === cur && !seen.has(b)) {
          seen.add(b);
          stack.push(b);
        }
    }
    return seen.has(n);
  });
}

describe("schedule fine-print questions", () => {
  it("applies the timestamp-ordering write rules", () => {
    expect(writeOutcome(5, 7, 0, false)).toBe("abort");
    expect(ans("schedfine-to-late-write")).toBe("True");
    expect(writeOutcome(5, 3, 7, false)).toBe("abort");
    expect(writeOutcome(5, 3, 7, true)).toBe("skip");
    expect(ans("schedfine-thomas-write")).toBe("True");
  });

  it("checks recoverability", () => {
    expect(recoverable("w1(X) r2(X) c2 c1")).toBe(false);
    expect(recoverable("w1(X) r2(X) c1 c2")).toBe(true);
    expect(ans("schedfine-recoverable")).toBe("False");
  });

  it("counts cascading aborts", () => {
    const dead = cascade("w1(X) r2(X) w2(Y) r3(Y) r4(Z) a1", 1);
    expect(dead.sort()).toEqual([2, 3]);
    expect(byId["schedfine-cascade-count"]).toMatchObject({ answer: dead.length });
  });

  it("finds the deadlock cycle", () => {
    const cycle = cycleNodes([[1, 2], [2, 3], [3, 1], [4, 1]]);
    expect(cycle.sort()).toEqual([1, 2, 3]);
    expect(byId["schedfine-deadlock-cycle"]).toMatchObject({ answer: cycle.length });
  });

  it("keys the strict 2PL question", () => {
    expect(ans("schedfine-strict-2pl")).toBe("Freedom from deadlock");
  });
});

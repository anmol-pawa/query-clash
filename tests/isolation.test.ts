import { describe, expect, it } from "vitest";
import { SCHEDULE_3, SCHEDULE_4, anomalyGen, anomalyHistory, graphOf, graphOrdersGen } from "@/content/interview/transactions";
import type { McqQuestion, NumericQuestion } from "@/content/interview/types";
import { ANOMALIES, ANOMALY_NAMES, LOWEST_LEVEL, anomalies, historyTable, parseHistory, type History, type IsoOp } from "@/lib/dbms/isolation";

const kinds = (text: string) => anomalies(parseHistory(text)).map((a) => a.anomaly);

/** Rebuild the history from the column table the player sees. */
function fromTable(t: ReturnType<typeof historyTable>): History {
  return t.rows.map((row) => {
    const col = row.slice(1).findIndex((c) => c !== "");
    const tx = Number(t.columns[col + 1].slice(1));
    const cell = String(row[col + 1]);
    if (cell === "commit") return { tx, kind: "C" };
    if (cell === "abort") return { tx, kind: "A" };
    const m = /^(read|write|select|insert)\((\w+)\)$/.exec(cell)!;
    const kind = ({ read: "R", write: "W", select: "S", insert: "I" } as const)[m[1] as "read"];
    return { tx, kind, target: m[2] } as IsoOp;
  });
}

describe("isolation anomaly detector", () => {
  it("recognises Berenson et al.'s canonical histories, one anomaly each", () => {
    expect(kinds("W1(X) R2(X) A1 C2")).toEqual(["dirty-read"]); // A1
    expect(kinds("R1(X) W2(X) C2 R1(X) C1")).toEqual(["non-repeatable-read"]); // A2
    expect(kinds("S1(P) I2(P) C2 S1(P) C1")).toEqual(["phantom"]); // A3
    expect(kinds("R1(X) W2(X) W1(X) C1 C2")).toEqual(["lost-update"]); // P4
    expect(kinds("R1(X) R2(X) W2(X) C2 W1(X) C1")).toEqual(["lost-update"]); // the classic two increments
    expect(kinds("R1(X) R2(Y) W1(Y) W2(X) C1 C2")).toEqual(["write-skew"]); // A5B
  });

  it("finds write skew in the on-call doctors example and nothing in serial or safe histories", () => {
    // Both doctors check that the other is on call (read X and Y), then each takes themself off call.
    expect(kinds("R1(X) R1(Y) R2(X) R2(Y) W1(X) W2(Y) C1 C2")).toEqual(["write-skew"]);
    expect(kinds("R1(X) W1(X) C1 R2(X) W2(X) C2")).toEqual([]);
    expect(kinds("R1(X) W1(Y) C1 R2(Y) W2(X) C2")).toEqual([]);
    expect(kinds("R1(X) R1(X) C1 W2(X) C2")).toEqual([]);
    expect(kinds("S1(P) S1(P) C1 I2(P) C2")).toEqual([]);
    // T2 reads T1's write only after T1 commits: not dirty.
    expect(kinds("W1(X) C1 R2(X) C2")).toEqual([]);
    // An aborted writer does not lose anyone's update.
    expect(kinds("R1(X) W2(X) W1(X) A1 C2")).toEqual([]);
  });

  it("maps each anomaly to the textbook lowest level that prevents it", () => {
    expect(LOWEST_LEVEL).toEqual({
      "dirty-read": "READ COMMITTED",
      "non-repeatable-read": "REPEATABLE READ",
      phantom: "SERIALIZABLE",
      "lost-update": "REPEATABLE READ",
      "write-skew": "SERIALIZABLE",
    });
  });

  it("builds a history showing exactly the requested anomaly for every seed", () => {
    for (const an of ANOMALIES)
      for (let seed = 0; seed < 300; seed++) {
        const h = anomalyHistory(an, seed);
        expect(kinds(h.map((o) => (o.target ? `${o.kind}${o.tx}(${o.target})` : `${o.kind}${o.tx}`)).join(" "))).toEqual([an]);
        // Each transaction ends exactly once, as its last step.
        for (const t of [1, 2]) {
          const ops = h.filter((o) => o.tx === t);
          expect(ops.filter((o) => o.kind === "C" || o.kind === "A")).toHaveLength(1);
          expect(["C", "A"]).toContain(ops.at(-1)!.kind);
        }
      }
  });
});

describe("anomaly generator", () => {
  it("is deterministic, keyed by the detector on the table shown, with four distinct choices", () => {
    const seen = new Map<string, number>();
    const pos = new Set<number>();
    for (let seed = 0; seed < 300; seed++) {
      const q = anomalyGen.generate(seed) as McqQuestion;
      expect(anomalyGen.generate(seed)).toEqual(q);
      const found = anomalies(fromTable(q.tables![0]));
      expect(found).toHaveLength(1);
      const an = found[0].anomaly;
      expect(q.choices[q.answer]).toBe(`${ANOMALY_NAMES[an]} · prevented from ${LOWEST_LEVEL[an]}`);
      expect(new Set(q.choices).size).toBe(4);
      // Only one option names the right anomaly with the right level.
      expect(q.choices.filter((c) => c.startsWith(ANOMALY_NAMES[an]) && c.endsWith(LOWEST_LEVEL[an]))).toHaveLength(1);
      seen.set(an, (seen.get(an) ?? 0) + 1);
      pos.add(q.answer);
    }
    expect(seen.size).toBe(5);
    expect(pos.size).toBe(4);
  });
});

describe("precedence graphs", () => {
  it("marks the textbook schedules' graphs", () => {
    expect(graphOf(SCHEDULE_3)).toEqual({ nodes: [1, 2], edges: [[1, 2]], cycle: null });
    expect(graphOf(SCHEDULE_4)).toEqual({ nodes: [1, 2], edges: [[1, 2], [2, 1]], cycle: [1, 2, 1] });
  });

  it("counts the serial orders of a drawn graph by brute force", () => {
    const perms = (xs: number[]): number[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
    let cyclic = 0;
    for (let seed = 0; seed < 300; seed++) {
      const q = graphOrdersGen.generate(seed) as NumericQuestion;
      expect(graphOrdersGen.generate(seed)).toEqual(q);
      const { nodes, edges } = q.graph!;
      expect(edges.length).toBeGreaterThanOrEqual(2);
      const count = perms(nodes).filter((p) => edges.every(([a, b]) => p.indexOf(a) < p.indexOf(b))).length;
      expect(q.answer).toBe(count);
      if (count === 0) cyclic++;
      expect(!!q.explainGraph!.cycle).toBe(count === 0);
    }
    expect(cyclic).toBe(75);
  });
});

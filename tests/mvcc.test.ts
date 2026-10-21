import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { MVCC, mvccCountGen, mvccVersionGen, siAbortGen } from "@/content/interview/mvcc";
import { answerText } from "@/game/engine/interview";
import type { Relation } from "@/lib/dbms/algebra";
import { firstCommitterWins, snapshotText, tupleVisible, xidVisible, type SiTx, type Snapshot } from "@/lib/dbms/mvcc";

/** The snapshot "xmin:xmax:xip" and aborted ids as the player reads them in a prompt. */
function readPrompt(prompt: string) {
  const m = /snapshot (\d+):(\d+):([\d,]*) /.exec(prompt)!;
  const snap: Snapshot = { xmin: Number(m[1]), xmax: Number(m[2]), active: m[3] ? m[3].split(",").map(Number) : [] };
  const a = /Transactions? ([\d, ]+) aborted\./.exec(prompt);
  const aborted = a ? a[1].split(",").map((x) => Number(x.trim())) : [];
  return { snap, aborted };
}

/** The definition, written differently from the solver: the set of transactions that had committed when the snapshot was taken. */
function committedAtSnapshot(snap: Snapshot, aborted: number[]): Set<number> {
  const out = new Set<number>();
  for (let x = 0; x < snap.xmax; x++) if (!snap.active.includes(x) && !aborted.includes(x)) out.add(x);
  return out;
}

const seen = (rows: Relation["rows"], c: Set<number>) =>
  rows.filter(([, xmin, xmax]) => c.has(Number(xmin)) && !(Number(xmax) !== 0 && c.has(Number(xmax))));

describe("MVCC solvers", () => {
  it("applies PostgreSQL's snapshot rules", () => {
    const snap: Snapshot = { xmin: 100, xmax: 104, active: [100, 102] };
    expect(snapshotText(snap)).toBe("100:104:100,102");
    expect([99, 100, 101, 102, 103, 104].filter((x) => xidVisible(x, snap, []))).toEqual([99, 101, 103]);
    expect(xidVisible(101, snap, [101])).toBe(false);
    // Created by a visible transaction, deleted by one that was running: still visible.
    expect(tupleVisible({ label: "a", xmin: 99, xmax: 102 }, snap, [])).toBe(true);
    // Deleted by a committed transaction: gone.
    expect(tupleVisible({ label: "a", xmin: 99, xmax: 101 }, snap, [])).toBe(false);
    // Deleter aborted: the row survives. Creator aborted: it never existed.
    expect(tupleVisible({ label: "a", xmin: 99, xmax: 101 }, snap, [101])).toBe(true);
    expect(tupleVisible({ label: "a", xmin: 101, xmax: 0 }, snap, [101])).toBe(false);
    // Created after the snapshot.
    expect(tupleVisible({ label: "a", xmin: 104, xmax: 0 }, snap, [])).toBe(false);
  });

  it("walks an update chain: each snapshot sees exactly one version", () => {
    // Row inserted by 10, updated by 12, updated by 15; snapshots taken at different moments.
    const chain = [
      { label: 1, xmin: 10, xmax: 12 },
      { label: 2, xmin: 12, xmax: 15 },
      { label: 3, xmin: 15, xmax: 0 },
    ];
    const at = (snap: Snapshot) => chain.filter((t) => tupleVisible(t, snap, [])).map((t) => t.label);
    expect(at({ xmin: 11, xmax: 11, active: [] })).toEqual([1]);
    expect(at({ xmin: 13, xmax: 14, active: [] })).toEqual([2]);
    expect(at({ xmin: 16, xmax: 16, active: [] })).toEqual([3]);
    // 12 was still running when the snapshot was taken: its update is not seen.
    expect(at({ xmin: 12, xmax: 14, active: [12] })).toEqual([1]);
  });

  it("applies first-committer-wins to the textbook lost-update and write-skew schedules", () => {
    // Both transactions read then write X: the later committer aborts.
    const lost: SiTx[] = [
      { id: 1, start: 1, commit: 3, writes: ["X"] },
      { id: 2, start: 2, commit: 4, writes: ["X"] },
    ];
    expect(firstCommitterWins(lost)).toEqual({ aborted: [2], reasons: { 2: { winner: 1, items: ["X"] } } });
    // Write skew: disjoint write sets, so snapshot isolation lets both commit.
    const skew: SiTx[] = [
      { id: 1, start: 1, commit: 3, writes: ["X"] },
      { id: 2, start: 2, commit: 4, writes: ["Y"] },
    ];
    expect(firstCommitterWins(skew).aborted).toEqual([]);
    // Not concurrent: T2 starts after T1 commits, so it is not a conflict.
    expect(firstCommitterWins([{ id: 1, start: 1, commit: 2, writes: ["X"] }, { id: 2, start: 3, commit: 4, writes: ["X"] }]).aborted).toEqual([]);
    // An aborted transaction does not abort a later one.
    const chain: SiTx[] = [
      { id: 1, start: 1, commit: 4, writes: ["X"] },
      { id: 2, start: 2, commit: 5, writes: ["X", "Y"] },
      { id: 3, start: 3, commit: 6, writes: ["Y"] },
    ];
    expect(firstCommitterWins(chain).aborted).toEqual([2]);
  });
});

describe("MVCC content", () => {
  const byId = Object.fromEntries(MVCC.map((q) => [q.id, q]));
  const ans = (id: string) => answerText(byId[id]);

  it("adds three generators and enough fixed questions to the concurrency topic", () => {
    expect(MVCC.length).toBeGreaterThanOrEqual(15);
    expect([...new Set(MVCC.map((q) => q.kind))].sort()).toEqual(["mcq", "multi", "numeric", "order", "truefalse"]);
    expect([...new Set(MVCC.map((q) => q.difficulty))].sort()).toEqual([1, 2, 3]);
    for (const q of MVCC) expect(QUESTIONS).toContain(q);
    expect(GENERATORS.filter((g) => g.topic === "concurrency")).toHaveLength(11);
  });

  it("keys each fixed answer correctly", () => {
    expect(ans("mvcc-idea")).toMatch(/^Readers do not block writers/);
    expect(ans("mvcc-pg-update")).toMatch(/^Sets xmax of the old version/);
    expect(ans("mvcc-pg-delete")).toBe("False");
    expect(ans("mvcc-vacuum")).toMatch(/^When no running snapshot/);
    expect(ans("mvcc-vacuum-long-tx")).toBe("True");
    expect(ans("mvcc-snapshot-timing")).toBe("READ COMMITTED only");
    expect(ans("mvcc-oracle-read")).toMatch(/SCN/);
    expect(ans("mvcc-ora-1555")).toMatch(/overwritten/);
    expect(ans("mvcc-where-old")).toMatch(/^PostgreSQL: in the table itself/);
    expect(ans("mvcc-fcw")).toMatch(/^T2 is aborted/);
    expect(ans("mvcc-si-serializable")).toMatch(/SSI/);
    expect(ans("mvcc-oracle-serializable")).toBe("False");
    expect(ans("mvcc-xid-wrap")).toMatch(/freezes/);
    expect(ans("mvcc-tradeoff")).toMatch(/cleanup/);
  });

  it("keys the computed fixed answers with the solver", () => {
    const multi = byId["mvcc-snapshot-visible"];
    if (multi.kind !== "multi") throw new Error("expected multi");
    const snap: Snapshot = { xmin: 100, xmax: 104, active: [100, 102] };
    expect(multi.answers.map((i) => multi.choices[i])).toEqual(multi.choices.filter((c) => xidVisible(Number(c), snap, [])));
    const num = byId["mvcc-visible-count"];
    if (num.kind !== "numeric") throw new Error("expected numeric");
    const s2: Snapshot = { xmin: 20, xmax: 25, active: [21, 23] };
    expect(num.answer).toBe([19, 20, 21, 22, 23, 24, 25, 26].filter((x) => xidVisible(x, s2, [24])).length);
  });

  it("generated problems are deterministic and answered from what the player sees", () => {
    const tally = { positions: new Set<number>(), noneVisible: 0, abortedShown: 0, counts: new Set<number>(), abortedSets: new Set<string>(), none: 0 };
    for (let seed = 1; seed <= 300; seed++) {
      for (const g of [mvccVersionGen, mvccCountGen, siAbortGen]) expect(g.generate(seed)).toEqual(g.generate(seed));

      const vq = mvccVersionGen.generate(seed);
      if (vq.kind !== "mcq") throw new Error("expected mcq");
      const { snap, aborted } = readPrompt(vq.prompt);
      const rows = vq.tables![0].rows;
      const shown = seen(rows, committedAtSnapshot(snap, aborted));
      expect(shown.length).toBeLessThanOrEqual(1);
      expect(vq.choices[vq.answer]).toBe(shown.length ? String(shown[0][0]) : "No version is visible");
      expect(new Set(vq.choices).size).toBe(vq.choices.length);
      expect(vq.choices).toContain("No version is visible");
      // Versions chain: each one's xmax is the next one's xmin.
      for (let i = 0; i + 1 < rows.length; i++) expect(rows[i][2]).toBe(rows[i + 1][1]);
      expect(snap.xmin).toBe(snap.active.length ? Math.min(...snap.active) : snap.xmax);
      tally.positions.add(vq.answer);
      if (!shown.length) tally.noneVisible++;
      if (aborted.length) tally.abortedShown++;

      const cq = mvccCountGen.generate(seed);
      if (cq.kind !== "numeric") throw new Error("expected numeric");
      const c = readPrompt(cq.prompt);
      expect(cq.answer).toBe(seen(cq.tables![0].rows, committedAtSnapshot(c.snap, c.aborted)).length);
      tally.counts.add(cq.answer);

      const sq = siAbortGen.generate(seed);
      if (sq.kind !== "multi") throw new Error("expected multi");
      const txs: SiTx[] = sq.tables![0].rows.map(([tx, start, commit, writes]) => ({
        id: Number(String(tx).slice(1)),
        start: Number(start),
        commit: Number(commit),
        writes: String(writes).split(", "),
      }));
      // The definition by interval overlap, replayed in commit order.
      const won: SiTx[] = [];
      const lost: number[] = [];
      for (const t of [...txs].sort((a, b) => a.commit - b.commit)) {
        const clash = won.some((w) => w.start < t.commit && t.start < w.commit && w.writes.some((x) => t.writes.includes(x)));
        if (clash) lost.push(t.id);
        else won.push(t);
      }
      expect(new Set(sq.choices).size).toBe(sq.choices.length);
      expect(sq.answers.map((i) => sq.choices[i])).toEqual(lost.length ? lost.sort((a, b) => a - b).map((id) => `T${id}`) : ["None"]);
      tally.abortedSets.add(lost.join());
      if (!lost.length) tally.none++;
    }
    expect(tally.positions.size).toBeGreaterThanOrEqual(4);
    expect(tally.noneVisible).toBeGreaterThan(30);
    expect(tally.noneVisible).toBeLessThan(200);
    expect(tally.abortedShown).toBeGreaterThan(20);
    expect(tally.counts.size).toBeGreaterThanOrEqual(4);
    expect(tally.abortedSets.size).toBeGreaterThanOrEqual(5);
    expect(tally.none).toBeGreaterThan(20);
    expect(tally.none).toBeLessThan(120);
  });
});

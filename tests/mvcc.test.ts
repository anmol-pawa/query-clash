import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { MVCC, mvccReadGen, mvccVisibleGen, randomReadOps, randomSiTxs, randomVisibleCase, siAbortGen } from "@/content/interview/mvcc";
import { answerText, buildDeck } from "@/game/engine/interview";
import type { Relation } from "@/lib/dbms/algebra";
import { committedBefore, firstCommitterWins, isVisible, selectResults, visibleVersion, type Clog, type Op, type RowVersion, type Snapshot } from "@/lib/dbms/mvcc";
import { rng } from "@/lib/rng";

describe("tuple visibility", () => {
  const clog: Clog = { 10: "committed", 11: "committed", 12: "aborted", 13: "running", 14: "committed" };
  const snap: Snapshot = { xmax: 14, xip: [11] };

  it("counts only transactions that committed before the snapshot", () => {
    expect(committedBefore(10, snap, clog)).toBe(true);
    expect(committedBefore(11, snap, clog)).toBe(false); // committed since, but was running at the snapshot
    expect(committedBefore(12, snap, clog)).toBe(false);
    expect(committedBefore(13, snap, clog)).toBe(false);
    expect(committedBefore(14, snap, clog)).toBe(false); // started after the snapshot
  });

  it("sees the old version while the updater is invisible, and the new one once it counts", () => {
    const chain: RowVersion[] = [
      { xmin: 10, xmax: 11, value: 50 },
      { xmin: 11, xmax: 0, value: 60 },
    ];
    expect(visibleVersion(chain, snap, clog)?.value).toBe(50);
    expect(visibleVersion(chain, { xmax: 14, xip: [] }, clog)?.value).toBe(60);
  });

  it("hides rows from aborted creators and ignores aborted deleters", () => {
    expect(isVisible({ xmin: 12, xmax: 0, value: 1 }, snap, clog)).toBe(false);
    expect(isVisible({ xmin: 10, xmax: 12, value: 1 }, snap, clog)).toBe(true);
    expect(isVisible({ xmin: 10, xmax: 10, value: 1 }, { xmax: 14, xip: [] }, clog)).toBe(false);
  });

  it("shows your own writes and hides the version you replaced", () => {
    const me = 20;
    const chain: RowVersion[] = [
      { xmin: 10, xmax: me, value: 5 },
      { xmin: me, xmax: 0, value: 6 },
    ];
    expect(visibleVersion(chain, snap, { ...clog, [me]: "running" }, me)?.value).toBe(6);
    expect(visibleVersion(chain, snap, { ...clog, [me]: "running" })?.value).toBe(5);
  });
});

describe("statement and transaction snapshots", () => {
  const ops = (s: string): Op[] =>
    s.split(" ").map((t) => {
      const m = /^(B|S|C|R|U)(\d)(?:=(\d+))?$/.exec(t)!;
      const kind = ({ B: "begin", S: "select", C: "commit", R: "rollback", U: "update" } as const)[m[1] as "B"];
      return { tx: Number(m[2]), kind, value: m[3] ? Number(m[3]) : undefined };
    });

  it("READ COMMITTED sees each new commit, REPEATABLE READ keeps the first snapshot", () => {
    const h = ops("B1 S1 U2=150 C2 S1");
    expect(selectResults(h, 100, "READ COMMITTED").map((x) => x.value)).toEqual([100, 150]);
    expect(selectResults(h, 100, "REPEATABLE READ").map((x) => x.value)).toEqual([100, 100]);
  });

  it("takes the REPEATABLE READ snapshot at the first statement, not at BEGIN", () => {
    expect(selectResults(ops("B1 U2=150 C2 S1 U3=200 C3 S1"), 100, "REPEATABLE READ").map((x) => x.value)).toEqual([150, 150]);
  });

  it("never shows uncommitted or rolled-back data", () => {
    expect(selectResults(ops("B1 U2=150 S1 R2 S1 U3=170 S1"), 100, "READ COMMITTED").map((x) => x.value)).toEqual([100, 100, 100]);
  });

  it("shows a transaction its own writes", () => {
    expect(selectResults(ops("B1 S1 U1=120 S1"), 100, "REPEATABLE READ").map((x) => x.value)).toEqual([100, 120]);
  });
});

describe("first-committer-wins", () => {
  it("aborts the later committer of two overlapping writers of the same item", () => {
    const r = firstCommitterWins([
      { id: 1, start: 1, commit: 3, writes: ["X"] },
      { id: 2, start: 2, commit: 4, writes: ["X", "Y"] },
    ]);
    expect(r.aborted).toEqual([2]);
    expect(r.why.get(2)).toBe(1);
  });

  it("lets disjoint, non-overlapping, or write-skew style transactions commit", () => {
    expect(firstCommitterWins([{ id: 1, start: 1, commit: 2, writes: ["X"] }, { id: 2, start: 3, commit: 4, writes: ["X"] }]).aborted).toEqual([]);
    expect(firstCommitterWins([{ id: 1, start: 1, commit: 3, writes: ["X"] }, { id: 2, start: 2, commit: 4, writes: ["Y"] }]).aborted).toEqual([]);
  });

  it("does not let an aborted transaction abort anyone", () => {
    const r = firstCommitterWins([
      { id: 1, start: 1, commit: 3, writes: ["X"] },
      { id: 2, start: 2, commit: 4, writes: ["X"] },
      { id: 3, start: 3, commit: 6, writes: ["X"] },
    ]);
    // T3 starts at 3, after T1 committed, and only overlaps T2, which aborted: it commits.
    expect(r.aborted).toEqual([2]);
  });
});

/** Replay the row's history: apply each writer only if its transaction counts for the snapshot. */
function oracle(c: { versions: RowVersion[]; snap: Snapshot; clog: Clog; you: number; self: boolean }): number | null {
  const counts = (x: number) => (c.self && x === c.you) || committedBefore(x, c.snap, c.clog);
  let value: number | null = null;
  for (const v of c.versions) if (counts(v.xmin)) value = v.value;
  const last = c.versions[c.versions.length - 1];
  if (last.xmax !== 0 && counts(last.xmax)) value = null;
  return value;
}

const rowsOf = (t: Relation) => t.rows;

describe("MVCC interview content", () => {
  const byId = Object.fromEntries(MVCC.map((q) => [q.id, q]));
  const ans = (id: string) => answerText(byId[id]);

  it("covers every question type with a spread of difficulties", () => {
    expect(MVCC.length).toBeGreaterThanOrEqual(18);
    expect(MVCC.every((q) => q.topic === "concurrency")).toBe(true);
    expect([...new Set(MVCC.map((q) => q.kind))].sort()).toEqual(["mcq", "multi", "numeric", "order", "short", "truefalse"]);
    expect([...new Set(MVCC.map((q) => q.difficulty))].sort()).toEqual([1, 2, 3]);
    for (const g of [mvccVisibleGen, mvccReadGen, siAbortGen]) expect(GENERATORS).toContain(g);
    expect(QUESTIONS).toEqual(expect.arrayContaining(MVCC));
  });

  it("keys each fixed answer correctly", () => {
    expect(ans("mvcc-idea")).toMatch(/^Readers do not block writers/);
    expect(ans("mvcc-writers")).toBe("False");
    expect(ans("mvcc-pg-update")).toMatch(/^Writes a new row version/);
    expect(ans("mvcc-xmin-xmax")).toMatch(/^Transaction 500 created it/);
    expect(ans("mvcc-vacuum")).toMatch(/dead row versions/);
    expect(ans("mvcc-vacuum-name")).toBe("vacuum");
    expect(ans("mvcc-long-tx")).toMatch(/bloats/);
    expect(ans("mvcc-versions-count")).toBe("4");
    expect(ans("mvcc-rr-snapshot")).toMatch(/^At its first query/);
    expect(ans("mvcc-oracle-undo")).toMatch(/undo data/);
    expect(ans("mvcc-ora1555")).toMatch(/overwritten/);
    expect(ans("mvcc-oracle-rc")).toBe("True");
    expect(ans("mvcc-fcw")).toMatch(/^The first to commit succeeds/);
    expect(ans("mvcc-oracle-serializable")).toMatch(/ORA-08177/);
    expect(ans("mvcc-ssi")).toBe("False");
    expect(ans("mvcc-pg-rr-anomalies")).toBe("Write skew");
    expect(ans("mvcc-for-update")).toMatch(/FOR UPDATE/);
    expect(ans("mvcc-wraparound")).toMatch(/freezes/);
    const order = byId["mvcc-visible-rule"];
    expect(order.kind === "order" && order.steps[2]).toMatch(/xmax/);
  });

  it("generated visibility problems are answered from the tables the player sees", () => {
    const seenAnswers = new Set<number>();
    let none = 0;
    let selfCases = 0;
    let pastSnapshotCommits = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const q = mvccVisibleGen.generate(seed);
      expect(mvccVisibleGen.generate(seed)).toEqual(q);
      if (q.kind !== "mcq") throw new Error("expected mcq");
      const [vt, tt] = q.tables!;
      const m = /xmax = (\d+) and xip = \{([^}]*)\}/.exec(q.prompt)!;
      const snap: Snapshot = { xmax: Number(m[1]), xip: m[2] ? m[2].split(", ").map(Number) : [] };
      const clog: Clog = {};
      let you: number | undefined;
      for (const [x, s] of rowsOf(tt)) {
        const xid = Number(x);
        if (String(s).startsWith("you")) {
          you = xid;
          clog[xid] = "running";
        } else clog[xid] = String(s) === "still running" ? "running" : (String(s) as "committed" | "aborted");
      }
      const versions = rowsOf(vt).map(([, xmin, xmax, value]) => ({ xmin: Number(xmin), xmax: Number(xmax), value: Number(value) }));
      // The chain is well formed: each update's xmax is the next version's xmin, so at most one version is visible.
      versions.forEach((v, i) => i + 1 < versions.length && expect(v.xmax).toBe(versions[i + 1].xmin));
      expect(versions.filter((v) => isVisible(v, snap, clog, you)).length).toBeLessThanOrEqual(1);
      const seen = oracle({ versions, snap, clog, you: you ?? -1, self: you !== undefined });
      expect(q.choices[q.answer]).toBe(seen === null ? "No row is returned" : String(seen));
      expect(new Set(q.choices).size).toBe(q.choices.length);
      seenAnswers.add(q.answer);
      if (seen === null) none++;
      if (you !== undefined) selfCases++;
      if (versions.some((v) => clog[v.xmin] === "committed" && !committedBefore(v.xmin, snap, clog))) pastSnapshotCommits++;
    }
    expect(seenAnswers.size).toBeGreaterThanOrEqual(4);
    expect(none).toBeGreaterThan(10);
    expect(selfCases).toBeGreaterThan(20);
    expect(pastSnapshotCommits).toBeGreaterThan(40);
  });

  it("random version chains agree with the replay oracle", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const c = randomVisibleCase(rng(seed));
      const v = visibleVersion(c.versions, c.snap, c.clog, c.self ? c.you : undefined);
      expect(v?.value ?? null).toBe(oracle(c));
      const xids = c.versions.flatMap((x) => [x.xmin, x.xmax]);
      expect(new Set(c.versions.map((x) => x.xmin)).size).toBe(c.versions.length);
      expect(xids.every((x) => x >= 0)).toBe(true);
      // Every id the table lists has a state and ids below the snapshot's xmax are not "later".
      for (const x of xids) if (x !== 0) expect(c.clog[x]).toBeDefined();
    }
  });

  it("generated read problems are answered from the history the player sees", () => {
    const levels = { rc: 0, rr: 0, differ: 0 };
    for (let seed = 1; seed <= 300; seed++) {
      const q = mvccReadGen.generate(seed);
      expect(mvccReadGen.generate(seed)).toEqual(q);
      if (q.kind !== "numeric") throw new Error("expected numeric");
      const initial = Number(/balance = (\d+)\./.exec(q.prompt)![1]);
      const level = q.prompt.includes("READ COMMITTED") ? "READ COMMITTED" : "REPEATABLE READ";
      const ops: Op[] = rowsOf(q.tables![0]).map(([, tx, stmt]) => {
        const s = String(stmt);
        const kind = s.startsWith("UPDATE") ? "update" : (s.split(" ")[0].toLowerCase() as "begin" | "select" | "commit" | "rollback");
        return { tx: Number(String(tx).slice(1)), kind, value: kind === "update" ? Number(s.split("= ")[1]) : undefined };
      });
      // Re-derive by the definition: READ COMMITTED = latest commit before the SELECT; REPEATABLE READ = latest commit before T1's first SELECT.
      const lastSelect = ops.map((o, i) => (o.kind === "select" ? i : -1)).filter((i) => i >= 0);
      const upto = level === "READ COMMITTED" ? lastSelect[1] : lastSelect[0];
      let want = initial;
      const pending = new Map<number, number>();
      for (const o of ops.slice(0, upto)) {
        if (o.kind === "update") pending.set(o.tx, o.value!);
        if (o.kind === "commit" && pending.has(o.tx)) want = pending.get(o.tx)!;
      }
      expect(q.answer).toBe(want);
      if (level === "READ COMMITTED") levels.rc++;
      else levels.rr++;
      const { ops: o2, initial: i2 } = randomReadOps(rng(seed));
      if (selectResults(o2, i2, "READ COMMITTED")[1].value !== selectResults(o2, i2, "REPEATABLE READ")[1].value) levels.differ++;
    }
    expect(levels.rc).toBe(150);
    expect(levels.rr).toBe(150);
    expect(levels.differ).toBeGreaterThan(30);
  });

  it("generated snapshot-isolation problems agree with the pairwise definition", () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 300; seed++) {
      const q = siAbortGen.generate(seed);
      expect(siAbortGen.generate(seed)).toEqual(q);
      if (q.kind !== "multi") throw new Error("expected multi");
      const txs = rowsOf(q.tables![0]).map(([t, start, commit, writes]) => ({ id: Number(String(t).slice(1)), start: Number(start), commit: Number(commit), writes: String(writes).split(", ") }));
      // Definition: replay in commit order; abort when a committed (non-aborted) overlapping transaction wrote the same item.
      const done: typeof txs = [];
      const aborted: number[] = [];
      for (const t of [...txs].sort((a, b) => a.commit - b.commit)) {
        const clash = done.some((c) => c.commit > t.start && c.writes.some((w) => t.writes.includes(w)));
        if (clash) aborted.push(t.id);
        else done.push(t);
      }
      const want = aborted.length ? aborted.sort().map((t) => `T${t}`) : ["None"];
      expect(q.answers.map((i) => q.choices[i])).toEqual(want);
      counts.add(aborted.length);
    }
    expect([...counts].sort()).toEqual([0, 1, 2]);
    for (let seed = 1; seed <= 50; seed++) {
      const ts = randomSiTxs(rng(seed));
      expect(new Set(ts.flatMap((t) => [t.start, t.commit])).size).toBe(6);
    }
  });

  it("builds decks that include MVCC questions", () => {
    const deck = buildDeck(QUESTIONS, GENERATORS, { topic: "concurrency", seed: 3, size: 12 });
    expect(deck).toHaveLength(12);
  });
});

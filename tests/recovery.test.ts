import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { ariesLosersGen, ariesRedoGen, randomAriesLog, randomLog, recoveredValueGen, recoveryPlanGen } from "@/content/interview/recovery";
import { answerText, buildDeck } from "@/game/engine/interview";
import type { Relation } from "@/lib/dbms/algebra";
import { ariesAnalysis, logText, parseLog, planText, recoveredValues, recoveryPlan, type AriesRec, type LogRec } from "@/lib/dbms/recovery";
import { rng } from "@/lib/rng";

/** Silberschatz's T0/T1 transfer: T0 moves 50 from A to B, T1 withdraws 100 from C. */
const T0T1 = "<T0 start> <T0, A, 1000, 950> <T0, B, 2000, 2050> <T0 commit> <T1 start> <T1, C, 700, 600> <T1 commit>";
const upTo = (n: number) => parseLog(T0T1).slice(0, n);

/** The definition: after recovery the database holds exactly the committed transactions' writes, replayed from the original values. */
function committedOnly(log: LogRec[]): Record<string, number> {
  const committed = new Set(log.flatMap((r) => (r.kind === "commit" ? [r.tx] : [])));
  const out: Record<string, number> = {};
  for (const r of log) if (r.kind === "update" && !(r.item in out)) out[r.item] = r.old;
  for (const r of log) if (r.kind === "update" && committed.has(r.tx)) out[r.item] = r.new;
  return out;
}

/** Read an undo/redo log back from the table the player sees. */
const logFromTable = (t: Relation) => parseLog(t.rows.map((row) => String(row[1])).join(" "));

/** Read an ARIES log back from the three tables the player sees. */
function ariesFromTables([log, att, dpt]: Relation[]): AriesRec[] {
  return log.rows.map(([lsn, text]) => {
    const s = String(text);
    let m = /^T(\d) updates (P\d)$/.exec(s);
    if (m) return { lsn: Number(lsn), kind: "update", tx: Number(m[1]), page: m[2] };
    m = /^T(\d) (commit|end)$/.exec(s);
    if (m) return { lsn: Number(lsn), kind: m[2] as "commit" | "end", tx: Number(m[1]) };
    expect(s).toMatch(/^checkpoint/);
    return {
      lsn: Number(lsn),
      kind: "checkpoint",
      att: att.rows.map(([t, l]) => [Number(String(t).slice(1)), Number(l)] as [number, number]),
      dpt: dpt.rows.map(([p, l]) => [String(p), Number(l)] as [string, number]),
    };
  });
}

describe("recovery solvers on textbook examples", () => {
  it("round-trips log records", () => {
    const log = parseLog("<T1 start> <T1, A, 100, 50> <checkpoint {T1, T2}> <checkpoint {}> <T1 commit>");
    expect(log.map((r) => logText(r)).join(" ")).toBe("<T1 start> <T1, A, 100, 50> <checkpoint {T1, T2}> <checkpoint {}> <T1 commit>");
    expect(logText(log[1], "redo-only")).toBe("<T1, A, 50>");
  });

  it("recovers Silberschatz's three T0/T1 crash points", () => {
    // (a) crash after <T0, B, 2000, 2050>: undo T0.
    expect(recoveryPlan(upTo(3), "undo-redo")).toMatchObject({ redo: [], undo: [0] });
    expect(recoveredValues(upTo(3))).toEqual({ A: 1000, B: 2000 });
    // (b) crash after <T1, C, 700, 600>: redo T0, undo T1.
    expect(recoveryPlan(upTo(6), "undo-redo")).toMatchObject({ redo: [0], undo: [1] });
    expect(recoveredValues(upTo(6))).toEqual({ A: 950, B: 2050, C: 700 });
    // (c) crash after <T1 commit>: redo both.
    expect(recoveryPlan(upTo(7), "undo-redo")).toMatchObject({ redo: [0, 1], undo: [] });
    expect(recoveredValues(upTo(7))).toEqual({ A: 950, B: 2050, C: 600 });
    // Deferred modification: case (b) redoes T0 and just drops T1.
    expect(recoveryPlan(upTo(6), "redo-only")).toMatchObject({ redo: [0], undo: [], discarded: [1] });
  });

  it("applies the checkpoint rule (Silberschatz's T1–T4 example)", () => {
    // T1 commits before the checkpoint; T2 and T3 are active at it; T4 starts after. Crash at the end.
    const log = parseLog(
      "<T1 start> <T1, A, 10, 20> <T1 commit> <T2 start> <T2, B, 30, 40> <T3 start> <checkpoint {T2, T3}> <T3, C, 5, 6> <T3 commit> <T4 start> <T4, D, 7, 8> <T2, B, 40, 50> <T2 commit>",
    );
    expect(recoveryPlan(log, "undo-redo")).toEqual({ redo: [2, 3], undo: [4], skipped: [1], discarded: [] });
    expect(planText(recoveryPlan(log, "undo-redo"))).toBe("Redo T2, T3 · Undo T4");
    // Redo goes back before the checkpoint for T2's first write; T1's A is left alone.
    expect(recoveredValues(log)).toEqual({ B: 50, C: 6, D: 7 });
  });

  it("runs the ARIES analysis pass", () => {
    const log: AriesRec[] = [
      { lsn: 10, kind: "update", tx: 1, page: "P1" },
      { lsn: 20, kind: "update", tx: 2, page: "P2" },
      { lsn: 30, kind: "checkpoint", att: [[1, 10], [2, 20]], dpt: [["P1", 10]] },
      { lsn: 40, kind: "update", tx: 3, page: "P3" },
      { lsn: 50, kind: "commit", tx: 1 },
      { lsn: 60, kind: "update", tx: 2, page: "P1" },
      { lsn: 70, kind: "end", tx: 1 },
      { lsn: 80, kind: "commit", tx: 3 },
    ];
    const a = ariesAnalysis(log);
    expect([...a.dpt]).toEqual([["P1", 10], ["P3", 40]]);
    expect(a.redoLSN).toBe(10);
    expect(a.losers).toEqual([2]);
    expect([...a.att.keys()].sort()).toEqual([2, 3]);
  });
});

describe("recovery solvers cross-checked", () => {
  it("leave exactly the committed work in the database", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const r = rng(seed);
      const log = randomLog(r, { txs: 2 + (seed % 3), checkpoint: seed % 2 === 0 });
      const got = recoveredValues(log);
      const want = committedOnly(log);
      for (const [k, v] of Object.entries(got)) expect(v).toBe(want[k]);
      // Items recovery leaves alone were written only by transactions committed before the checkpoint.
      const { skipped } = recoveryPlan(log, "undo-redo");
      for (const k of Object.keys(want).filter((k) => !(k in got))) expect(log.every((x) => x.kind !== "update" || x.item !== k || skipped.includes(x.tx))).toBe(true);
    }
  });

  it("match the simulated ARIES state", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const { log, truth } = randomAriesLog(rng(seed));
      const a = ariesAnalysis(log);
      expect(a.redoLSN).toBe(truth.redoLSN);
      expect(a.losers).toEqual(truth.losers);
    }
  });
});

describe("recovery content", () => {
  const rec = QUESTIONS.filter((q) => q.id.startsWith("rec-"));
  const byId = Object.fromEntries(rec.map((q) => [q.id, q]));
  const ans = (id: string) => answerText(byId[id]);

  it("covers every question type with a spread of difficulties", () => {
    expect(rec.length).toBeGreaterThanOrEqual(15);
    expect(rec.every((q) => q.topic === "concurrency")).toBe(true);
    expect([...new Set(rec.map((q) => q.kind))].sort()).toEqual(["mcq", "multi", "numeric", "order", "short", "truefalse"]);
    expect([...new Set(rec.map((q) => q.difficulty))].sort()).toEqual([1, 2, 3]);
    for (const g of [recoveryPlanGen, recoveredValueGen, ariesRedoGen, ariesLosersGen]) expect(GENERATORS).toContain(g);
  });

  it("keys each fixed answer correctly", () => {
    expect(ans("rec-wal")).toMatch(/^A page's log records reach stable storage before/);
    expect(ans("rec-steal-force")).toBe("Both undo and redo");
    expect(ans("rec-noforce-nosteal")).toBe("False");
    expect(ans("rec-deferred")).toBe("Only the new value");
    expect(ans("rec-idempotent")).toBe("idempotent");
    expect(ans("rec-checkpoint")).toMatch(/^It bounds/);
    expect(ans("rec-undo-order")).toBe("True");
    expect(ans("rec-aries-phases")).toMatch(/^1\. Analysis.*2\. Redo.*3\. Undo/);
    expect(ans("rec-repeat-history")).toBe("False");
    expect(ans("rec-pagelsn")).toMatch(/^Skip it/);
    expect(ans("rec-clr")).toMatch(/UndoNextLSN/);
    expect(ans("rec-aries-structures")).not.toMatch(/full copy/);
    expect(ans("rec-fuzzy")).toBe("True");
    expect(ans("rec-shadow")).toMatch(/page-table pointer/);
  });

  it("keys the computed fixed answers with the solver", () => {
    for (const id of ["rec-immediate-c", "rec-immediate-a"]) {
      const q = byId[id];
      if (q.kind !== "numeric") throw new Error("expected numeric");
      const item = /What is (\w) after recovery/.exec(q.prompt)![1];
      expect(q.answer).toBe(recoveredValues(parseLog(q.prompt))[item]);
    }
    expect(byId["rec-immediate-c"].kind === "numeric" && byId["rec-immediate-c"].answer).toBe(700);
  });

  it("generated problems are deterministic and answered from what the player sees", () => {
    const tally = { schemes: new Map<string, number>(), checkpoints: 0, positions: new Set<number>(), undoneAsked: 0, redoLSNs: new Set<number>(), loserCounts: new Set<number>() };
    for (let seed = 1; seed <= 300; seed++) {
      for (const g of [recoveryPlanGen, recoveredValueGen, ariesRedoGen, ariesLosersGen]) expect(g.generate(seed)).toEqual(g.generate(seed));

      const pq = recoveryPlanGen.generate(seed);
      if (pq.kind !== "mcq") throw new Error("expected mcq");
      const scheme = pq.prompt.includes("redo-only") ? "redo-only" : "undo-redo";
      // The redo-only table shows <T, X, new> with no old values.
      if (scheme === "redo-only") expect(pq.tables![0].rows.every(([, t]) => !/<T\d, \w, \d+, \d+>/.test(String(t)))).toBe(true);
      const shown = scheme === "redo-only" ? redoOnlyFromTable(pq.tables![0]) : logFromTable(pq.tables![0]);
      expect(pq.choices[pq.answer]).toBe(planText(recoveryPlan(shown, scheme)));
      expect(new Set(pq.choices).size).toBe(4);
      tally.schemes.set(scheme, (tally.schemes.get(scheme) ?? 0) + 1);
      if (shown.some((x) => x.kind === "checkpoint")) tally.checkpoints++;
      tally.positions.add(pq.answer);

      const vq = recoveredValueGen.generate(seed);
      if (vq.kind !== "numeric") throw new Error("expected numeric");
      const vlog = logFromTable(vq.tables![0]);
      const item = /What is (\w) after recovery/.exec(vq.prompt)![1];
      expect(vq.answer).toBe(committedOnly(vlog)[item]);
      if (vlog.some((x) => x.kind === "update" && x.item === item && !vlog.some((c) => c.kind === "commit" && c.tx === x.tx))) tally.undoneAsked++;

      const rq = ariesRedoGen.generate(seed);
      if (rq.kind !== "numeric") throw new Error("expected numeric");
      const alog = ariesFromTables(rq.tables!);
      expect(rq.answer).toBe(ariesAnalysis(alog).redoLSN);
      tally.redoLSNs.add(rq.answer);

      const lq = ariesLosersGen.generate(seed);
      if (lq.kind !== "multi") throw new Error("expected multi");
      const losers = ariesAnalysis(ariesFromTables(lq.tables!)).losers;
      expect(lq.answers.map((i) => lq.choices[i])).toEqual(losers.length ? losers.map((t) => `T${t}`) : ["None"]);
      tally.loserCounts.add(losers.length);
    }
    expect(tally.schemes.get("undo-redo")).toBe(150);
    expect(tally.checkpoints).toBe(226);
    expect(tally.positions.size).toBe(4);
    expect(tally.undoneAsked).toBeGreaterThan(100);
    expect(tally.redoLSNs.size).toBeGreaterThanOrEqual(4);
    expect(tally.loserCounts.size).toBeGreaterThanOrEqual(3);
  });

  it("builds decks mixing locking and recovery", () => {
    const deck = buildDeck(QUESTIONS, GENERATORS, { topic: "concurrency", seed: 11, size: 8 });
    expect(deck).toHaveLength(8);
  });
});

/** A redo-only table: <T, X, new> records (old values are unknown and irrelevant to the plan). */
function redoOnlyFromTable(t: Relation): LogRec[] {
  return parseLog(
    t.rows
      .map(([, text]) => String(text).replace(/^<T(\d+), (\w+), (-?\d+)>$/, "<T$1, $2, 0, $3>"))
      .join(" "),
  );
}

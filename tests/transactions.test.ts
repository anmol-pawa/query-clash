import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import {
  BLIND_WRITES,
  CASCADE,
  NONRECOVERABLE,
  RECOVERABILITY_CHOICES,
  SCHEDULE_3,
  SCHEDULE_4,
  conflictTfGen,
  edgeCountGen,
  orderText,
  randomSchedule,
  recoverabilityGen,
  serialOrdersGen,
  viewTfGen,
} from "@/content/interview/transactions";
import { answerText, buildDeck } from "@/game/engine/interview";
import type { Relation } from "@/lib/dbms/algebra";
import {
  blindWrites,
  conflicts,
  conflictSerialOrders,
  findCycle,
  isConflictSerializable,
  isViewSerializable,
  parseSchedule,
  precedenceGraph,
  readsFrom,
  recoverability,
  scheduleTable,
  scheduleText,
  serialSchedule,
  transactions,
  viewEquivalent,
  viewSerialOrders,
  type Schedule,
} from "@/lib/dbms/schedule";
import { rng } from "@/lib/rng";

const P = parseSchedule;

/** Read a schedule back from its column table, so generated problems are checked from what the player sees. */
function fromTable(t: Relation): Schedule {
  return t.rows.map((row) => {
    const col = row.findIndex((v, i) => i > 0 && v !== "");
    const tx = Number(String(t.columns[col]).slice(1));
    const cell = String(row[col]);
    if (cell === "commit") return { tx, kind: "C" as const };
    if (cell === "abort") return { tx, kind: "A" as const };
    const m = /^([RW])\((\w+)\)$/.exec(cell)!;
    return { tx, kind: m[1] as "R" | "W", item: m[2] };
  });
}

/** Conflict-equivalent to the serial order iff every conflicting pair keeps its order: checked straight from the definition. */
function conflictEquivalentTo(s: Schedule, order: number[]): boolean {
  return conflicts(s).every(({ i, j }) => order.indexOf(s[i].tx) < order.indexOf(s[j].tx));
}

const perms = (xs: number[]): number[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));

describe("schedule solvers on textbook examples", () => {
  it("parses and prints schedules", () => {
    expect(scheduleText(P("r1(A); w2(A), C1 a2"))).toBe("R1(A) W2(A) C1 A2");
    expect(() => P("R1")).toThrow();
    expect(() => P("C1(A)")).toThrow();
    expect(() => P("X1(A)")).toThrow();
    expect(scheduleTable(P("R1(A) W2(A) C1 A2")).rows).toEqual([
      [1, "R(A)", ""],
      [2, "", "W(A)"],
      [3, "commit", ""],
      [4, "", "abort"],
    ]);
  });

  it("finds Silberschatz's schedule 3 conflict-equivalent to T1, T2", () => {
    expect(precedenceGraph(SCHEDULE_3)).toEqual([[1, 2]]);
    expect(conflictSerialOrders(SCHEDULE_3)).toEqual([[1, 2]]);
    expect(isViewSerializable(SCHEDULE_3)).toBe(true);
    expect(viewEquivalent(SCHEDULE_3, serialSchedule(SCHEDULE_3, [1, 2]))).toBe(true);
  });

  it("finds the cycle in Silberschatz's schedule 4, which is not even view serializable", () => {
    expect(precedenceGraph(SCHEDULE_4)).toEqual([
      [1, 2],
      [2, 1],
    ]);
    expect(isConflictSerializable(SCHEDULE_4)).toBe(false);
    expect(findCycle([1, 2], precedenceGraph(SCHEDULE_4))).toEqual([1, 2, 1]);
    expect(conflictSerialOrders(SCHEDULE_4)).toEqual([]);
    expect(isViewSerializable(SCHEDULE_4)).toBe(false);
  });

  it("recognises the blind-write schedule as view but not conflict serializable", () => {
    expect(isConflictSerializable(BLIND_WRITES)).toBe(false);
    expect(viewSerialOrders(BLIND_WRITES)).toEqual([[1, 2, 3]]);
    expect(blindWrites(BLIND_WRITES).map((i) => BLIND_WRITES[i].tx)).toEqual([2, 3]);
  });

  it("orders the topological sorts and finds every equivalent serial order", () => {
    const s = P("R1(A) W2(A) R3(B) W1(B)");
    expect(precedenceGraph(s)).toEqual([
      [1, 2],
      [3, 1],
    ]);
    expect(conflictSerialOrders(s)).toEqual([[3, 1, 2]]);
    expect(conflictSerialOrders(P("R1(A) W2(A) R3(B)"))).toEqual([
      [1, 2, 3],
      [1, 3, 2],
      [3, 1, 2],
    ]);
  });

  it("tracks reads-from, skipping writes of aborted transactions", () => {
    expect(readsFrom(P("W1(A) R2(A) R1(A)"))).toEqual([
      { read: 1, from: 1 },
      { read: 2, from: 1 },
    ]);
    expect(readsFrom(P("W1(A) W2(A) A2 R3(A)"))).toEqual([{ read: 3, from: 1 }]);
    expect(readsFrom(P("R1(A)"))).toEqual([{ read: 0, from: 0 }]);
  });

  it("classifies recoverability", () => {
    expect(recoverability(NONRECOVERABLE).level).toBe("nonrecoverable");
    expect(recoverability(CASCADE).level).toBe("recoverable");
    expect(recoverability(P("W1(A) W2(A) C1 C2")).level).toBe("cascadeless");
    expect(recoverability(P("W1(A) C1 R2(A) W2(A) C2")).level).toBe("strict");
    expect(recoverability(P("W1(A) R2(A) A1 C2")).level).toBe("nonrecoverable");
    // A serial schedule with commits is strict.
    expect(recoverability(serialSchedule(P("R1(A) W1(A) C1 R2(A) W2(A) C2"), [2, 1])).level).toBe("strict");
  });
});

describe("schedule solvers cross-checked on random schedules", () => {
  it("agree with the definitions of conflict and view serializability", () => {
    const r = rng(42);
    let cs = 0;
    let vsOnly = 0;
    for (let n = 0; n < 400; n++) {
      const s = randomSchedule(r, { txs: n % 4 ? 3 : 2, items: 2, ops: [1, 3], blind: 0.6 });
      const txs = transactions(s);
      const byDef = perms(txs).filter((p) => conflictEquivalentTo(s, p));
      expect(conflictSerialOrders(s)).toEqual(byDef.sort((a, b) => a.join().localeCompare(b.join())));
      expect(isConflictSerializable(s)).toBe(byDef.length > 0);
      if (byDef.length) cs++;
      // Conflict serializable ⇒ view serializable; view but not conflict ⇒ blind writes.
      for (const p of byDef) expect(viewEquivalent(s, serialSchedule(s, p))).toBe(true);
      if (isViewSerializable(s) && !byDef.length) {
        vsOnly++;
        expect(blindWrites(s).length).toBeGreaterThan(0);
      }
    }
    expect(cs).toBeGreaterThan(50);
    expect(vsOnly).toBeGreaterThan(3);
  });

  it("nests strict ⊂ cascadeless ⊂ recoverable", () => {
    const r = rng(7);
    for (let n = 0; n < 400; n++) {
      const s = randomSchedule(r, { txs: 2 + (n % 2), items: 2, ops: [1, 3], ends: true, abort: 0.2 });
      const level = recoverability(s).level;
      const rf = readsFrom(s).filter(({ read, from }) => from && from !== s[read].tx);
      const commit = (t: number) => s.findIndex((o) => o.tx === t && o.kind === "C");
      const recoverable = rf.every(({ read, from }) => commit(s[read].tx) === -1 || (commit(from) !== -1 && commit(from) < commit(s[read].tx)));
      const cascadeless = rf.every(({ read, from }) => commit(from) !== -1 && commit(from) < read);
      expect(level === "nonrecoverable").toBe(!recoverable);
      if (recoverable) expect(level === "recoverable").toBe(!cascadeless);
    }
  });
});

describe("transactions content", () => {
  const tx = QUESTIONS.filter((q) => q.topic === "transactions");
  const byId = Object.fromEntries(tx.map((q) => [q.id, q]));
  const ans = (id: string) => answerText(byId[id]);

  it("covers every question type with a spread of difficulties", () => {
    expect(tx.length).toBeGreaterThanOrEqual(20);
    expect([...new Set(tx.map((q) => q.kind))].sort()).toEqual(["mcq", "multi", "numeric", "order", "short", "truefalse"]);
    expect([...new Set(tx.map((q) => q.difficulty))].sort()).toEqual([1, 2, 3]);
    expect(GENERATORS.filter((g) => g.topic === "transactions")).toHaveLength(5);
  });

  it("keys each fixed answer correctly", () => {
    expect(ans("tx-atomicity")).toBe("Atomicity");
    expect(ans("tx-durability")).toBe("durability");
    expect(ans("tx-isolation-component")).toMatch(/concurrency-control/);
    expect(ans("tx-states")).toBe("1. Active  2. Partially committed  3. Committed");
    expect(ans("tx-precedence-graph")).toBe("precedence");
    expect(ans("tx-cs-implies-vs")).toBe("True");
    expect(ans("tx-blind-writes")).toMatch(/^Blind writes/);
    expect(ans("tx-vs-np")).toBe("True");
    expect(ans("tx-recoverable-def")).toMatch(/Ti commits before Tj commits/);
    expect(ans("tx-class-order")).toBe("1. Serial  2. Strict  3. Cascadeless  4. Recoverable");
    expect(ans("tx-dirty-read")).toBe("A dirty read");
    expect(ans("tx-lost-update")).toBe("A lost update");
    expect(ans("tx-read-committed")).toBe("Non-repeatable read, Phantom read");
    expect(ans("tx-phantom")).toBe("phantom");
    expect(ans("tx-levels-order")).toBe("1. READ UNCOMMITTED  2. READ COMMITTED  3. REPEATABLE READ  4. SERIALIZABLE");
    expect(ans("tx-default-level")).toBe("READ COMMITTED");
    expect(ans("tx-write-skew")).toMatch(/^Write skew/);
    expect(ans("tx-pg-read-uncommitted")).toBe("False");
  });

  it("keys the computed fixed answers with the solvers", () => {
    const pair = (a: string, b: string) => conflicts(P(`${a} ${b}`)).length === 1;
    const q = byId["tx-conflicting-pairs"];
    if (q.kind !== "multi") throw new Error("expected multi");
    const picked = q.choices.map((c) => c.split(" and ")).flatMap(([a, b], i) => (pair(a, b) ? [i] : []));
    expect(q.answers).toEqual(picked);
    expect(ans("tx-serial-count")).toBe(`${perms([1, 2, 3, 4]).length} schedules`);
    expect(ans("tx-schedule3")).toBe(conflictSerialOrders(SCHEDULE_3).length === 1 && orderText(conflictSerialOrders(SCHEDULE_3)[0]) === "T1 → T2" ? "T1 then T2" : "?");
    expect(ans("tx-schedule4")).toBe(isConflictSerializable(SCHEDULE_4) ? "True" : "False");
    expect(isViewSerializable(BLIND_WRITES) && !isConflictSerializable(BLIND_WRITES)).toBe(true);
    expect(ans("tx-nonrecoverable")).toBe(recoverability(NONRECOVERABLE).level === "nonrecoverable" ? "False" : "True");
    // Cascade: T2 read from T1 and T3 from T2, none committed.
    const rf = readsFrom(CASCADE).map(({ read, from }) => [CASCADE[read].tx, from]);
    expect(rf).toContainEqual([2, 1]);
    expect(rf).toContainEqual([3, 2]);
    expect(ans("tx-cascade")).toBe("T2, T3");
  });

  it("generated problems are deterministic and answered by the solvers from the schedule shown", () => {
    const tally = { none: 0, cs: 0, vs: 0, edges: new Set<number>(), levels: new Map<string, number>() };
    for (let seed = 1; seed <= 200; seed++) {
      for (const g of [serialOrdersGen, edgeCountGen, conflictTfGen, recoverabilityGen, viewTfGen]) expect(g.generate(seed)).toEqual(g.generate(seed));

      const so = serialOrdersGen.generate(seed);
      if (so.kind !== "multi") throw new Error("expected multi");
      const s1 = fromTable(so.tables![0]);
      const want = perms(transactions(s1)).filter((p) => conflictEquivalentTo(s1, p)).map(orderText);
      expect(so.answers.map((i) => so.choices[i]).sort()).toEqual(want.length ? want.sort() : ["None: the precedence graph has a cycle"]);
      if (!want.length) tally.none++;
      expect(precedenceGraph(s1).length).toBeGreaterThanOrEqual(2);

      const ec = edgeCountGen.generate(seed);
      if (ec.kind !== "numeric") throw new Error("expected numeric");
      const s2 = fromTable(ec.tables![0]);
      const pairs = new Set(conflicts(s2).map(({ i, j }) => `${s2[i].tx}${s2[j].tx}`));
      expect(ec.answer).toBe(pairs.size);
      tally.edges.add(ec.answer);

      const tf = conflictTfGen.generate(seed);
      if (tf.kind !== "truefalse") throw new Error("expected truefalse");
      const s3 = fromTable(tf.tables![0]);
      expect(tf.answer).toBe(perms(transactions(s3)).some((p) => conflictEquivalentTo(s3, p)));
      if (tf.answer) tally.cs++;

      const rc = recoverabilityGen.generate(seed);
      if (rc.kind !== "mcq") throw new Error("expected mcq");
      expect(rc.choices[rc.answer]).toBe(RECOVERABILITY_CHOICES[recoverability(fromTable(rc.tables![0])).level]);
      tally.levels.set(rc.choices[rc.answer], (tally.levels.get(rc.choices[rc.answer]) ?? 0) + 1);

      const vt = viewTfGen.generate(seed);
      if (vt.kind !== "truefalse") throw new Error("expected truefalse");
      const s5 = fromTable(vt.tables![0]);
      expect(isConflictSerializable(s5)).toBe(false);
      expect(vt.answer).toBe(perms(transactions(s5)).some((p) => viewEquivalent(s5, serialSchedule(s5, p))));
      if (vt.answer) tally.vs++;
      expect(vt.explanation.startsWith(vt.answer ? "True." : "False.")).toBe(true);
    }
    expect(tally.none).toBeGreaterThan(40);
    expect(tally.none).toBeLessThan(100);
    expect(tally.cs).toBe(100);
    expect(tally.vs).toBe(100);
    expect(tally.edges.size).toBeGreaterThanOrEqual(4);
    for (const label of Object.values(RECOVERABILITY_CHOICES)) expect(tally.levels.get(label)).toBe(50);
  });

  it("builds full decks for the topic", () => {
    const deck = buildDeck(QUESTIONS, GENERATORS, { topic: "transactions", seed: 5, size: 8 });
    expect(deck).toHaveLength(8);
    expect(deck.every((q) => q.topic === "transactions")).toBe(true);
  });
});

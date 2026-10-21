import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { deadlockGen, lockedTransaction, lockingClassGen, preventionChoice, preventionGen, randomLockTable, tsOrderingGen } from "@/content/interview/concurrency";
import { randomSchedule } from "@/content/interview/transactions";
import { answerText, buildDeck } from "@/game/engine/interview";
import type { Relation } from "@/lib/dbms/algebra";
import {
  LOCK_MODES,
  LOCKING_NAMES,
  compatible,
  lockingClass,
  nodesOnCycles,
  parseLockSteps,
  prevention,
  timestampOrdering,
  waitForGraph,
  wellFormed,
  type LockStep,
  type LockTableRow,
  type LockingClass,
} from "@/lib/dbms/locking";
import { parseSchedule, type Schedule } from "@/lib/dbms/schedule";
import { rng } from "@/lib/rng";

/** The 2PL family straight from the definitions: lock times, unlock times and the commit. */
function classByDefinition(steps: LockStep[]): LockingClass {
  const locks = steps.flatMap((s, i) => (s.kind === "S" || s.kind === "X" ? [i] : []));
  const unlocks = steps.flatMap((s, i) => (s.kind === "U" ? [i] : []));
  const commit = steps.findIndex((s) => s.kind === "C");
  if (unlocks.length && Math.max(...locks) > Math.min(...unlocks)) return "not-2pl";
  const early = unlocks.filter((u) => u < commit);
  const xHeld = (u: number) => steps.some((s, i) => i < u && s.kind === "X" && s.item === steps[u].item);
  if (early.some(xHeld)) return "2pl";
  return early.length ? "strict" : "rigorous";
}

const WORDS: Record<string, LockStep["kind"]> = { "lock-S": "S", "lock-X": "X", unlock: "U", read: "R", write: "W", commit: "C" };

/** Read a transaction back from the table the player sees. */
function stepsFromTable(t: Relation): LockStep[] {
  return t.rows.map((row) => {
    const m = /^([\w-]+)(?:\((\w+)\))?$/.exec(String(row[1]))!;
    return m[2] ? { kind: WORDS[m[1]], item: m[2] } : { kind: WORDS[m[1]] };
  });
}

/** Read a lock table back: "T1:S T3:S" holders and a "T2:X" waiter. */
function lockRowsFromTable(t: Relation): LockTableRow[] {
  const ent = (x: string) => {
    const [tx, mode] = x.split(":");
    return { tx: Number(tx.slice(1)), mode: mode as "S" | "X" };
  };
  return t.rows.map(([item, held, waiting]) => ({
    item: String(item),
    holders: String(held).split(" ").map(ent),
    ...(waiting === "—" ? {} : { waiter: ent(String(waiting)) }),
  }));
}

function scheduleFromTable(t: Relation): Schedule {
  return t.rows.map((row) => {
    const col = row.findIndex((v, i) => i > 0 && v !== "");
    const m = /^([RW])\((\w+)\)$/.exec(String(row[col]))!;
    return { tx: Number(String(t.columns[col]).slice(1)), kind: m[1] as "R" | "W", item: m[2] };
  });
}

/**
 * Timestamp ordering by its meaning: an operation is rejected when an earlier, executed operation of a younger
 * transaction conflicts with it. Under Thomas' rule a write whose only such conflicts are younger writes is skipped.
 */
function firstRejected(s: Schedule, ts: Record<number, number>, thomas: boolean): number | null {
  const done: number[] = [];
  for (let k = 0; k < s.length; k++) {
    const younger = done.filter((j) => s[j].item === s[k].item && s[j].tx !== s[k].tx && (s[j].kind === "W" || s[k].kind === "W") && ts[s[j].tx] > ts[s[k].tx]);
    if (!younger.length) done.push(k);
    else if (thomas && s[k].kind === "W" && younger.every((j) => s[j].kind === "W")) continue;
    else return k;
  }
  return null;
}

describe("locking solvers on textbook examples", () => {
  it("has the multiple-granularity compatibility matrix", () => {
    const yes = LOCK_MODES.flatMap((a) => LOCK_MODES.filter((b) => compatible(a, b)).map((b) => `${a}-${b}`));
    expect(yes.sort()).toEqual(["IS-IS", "IS-IX", "IS-S", "IS-SIX", "IX-IS", "IX-IX", "S-IS", "S-S", "SIX-IS"].sort());
    for (const a of LOCK_MODES) for (const b of LOCK_MODES) expect(compatible(a, b)).toBe(compatible(b, a));
  });

  it("classifies Silberschatz's T1 (not two-phase) and T3 (two-phase) transfers", () => {
    const t1 = parseLockSteps("X(B) R(B) W(B) U(B) X(A) R(A) W(A) U(A) C");
    const t3 = parseLockSteps("X(B) R(B) W(B) X(A) R(A) W(A) U(B) U(A) C");
    expect(wellFormed(t1) && wellFormed(t3)).toBe(true);
    expect(lockingClass(t1).cls).toBe("not-2pl");
    expect(lockingClass(t1).reason).toMatch(/lock-X\(A\) comes after unlock\(B\)/);
    expect(lockingClass(t3).cls).toBe("2pl");
    expect(lockingClass(parseLockSteps("X(B) R(B) W(B) X(A) R(A) W(A) C U(B) U(A)")).cls).toBe("rigorous");
    expect(lockingClass(parseLockSteps("S(A) R(A) X(B) W(B) U(A) C U(B)")).cls).toBe("strict");
    // An upgrade counts as an X lock.
    expect(lockingClass(parseLockSteps("S(A) R(A) X(A) W(A) U(A) C")).cls).toBe("2pl");
  });

  it("rejects badly formed lock sequences", () => {
    expect(wellFormed(parseLockSteps("R(A) C"))).toBe(false);
    expect(wellFormed(parseLockSteps("S(A) W(A) C"))).toBe(false);
    expect(wellFormed(parseLockSteps("S(A) U(A) U(A) C"))).toBe(false);
    expect(wellFormed(parseLockSteps("X(A) S(A) C"))).toBe(false);
    expect(() => parseLockSteps("Q(A)")).toThrow();
    expect(() => parseLockSteps("C(A)")).toThrow();
  });

  it("builds Silberschatz's wait-for graph and finds the deadlock once T20 waits for T19", () => {
    const table: LockTableRow[] = [
      { item: "A", holders: [{ tx: 18, mode: "S" }, { tx: 19, mode: "S" }], waiter: { tx: 17, mode: "X" } },
      { item: "B", holders: [{ tx: 18, mode: "X" }], waiter: { tx: 19, mode: "S" } },
      { item: "C", holders: [{ tx: 20, mode: "X" }], waiter: { tx: 18, mode: "X" } },
      { item: "D", holders: [{ tx: 19, mode: "X" }] },
    ];
    const nodes = [17, 18, 19, 20];
    expect(waitForGraph(table)).toEqual([[17, 18], [17, 19], [18, 20], [19, 18]]);
    expect(nodesOnCycles(nodes, waitForGraph(table))).toEqual([]);
    table[3].waiter = { tx: 20, mode: "S" };
    expect(nodesOnCycles(nodes, waitForGraph(table))).toEqual([18, 19, 20]);
    // A shared request on a shared-held item does not wait.
    expect(waitForGraph([{ item: "A", holders: [{ tx: 1, mode: "S" }], waiter: { tx: 2, mode: "S" } }])).toEqual([]);
  });

  it("runs wait-die and wound-wait on Silberschatz's T14/T15/T16 example", () => {
    // Timestamps 5, 10, 15; T15 holds the item.
    expect(prevention("wait-die", 5, 10)).toBe("requester-waits");
    expect(prevention("wait-die", 15, 10)).toBe("requester-dies");
    expect(prevention("wound-wait", 5, 10)).toBe("holder-wounded");
    expect(prevention("wound-wait", 15, 10)).toBe("requester-waits");
  });

  it("runs timestamp ordering, with and without Thomas' write rule", () => {
    const s = parseSchedule("R1(Q) W2(Q) W1(Q)");
    expect(timestampOrdering(s, { 1: 10, 2: 20 }).rejected).toBe(2);
    const th = timestampOrdering(s, { 1: 10, 2: 20 }, true);
    expect(th.rejected).toBeNull();
    expect(th.steps[2].ignored).toBe(true);
    // Reading a value a younger transaction already wrote.
    expect(timestampOrdering(parseSchedule("W2(A) R1(A)"), { 1: 10, 2: 20 }).rejected).toBe(1);
    // Writing a value a younger transaction already read: rejected even with Thomas' rule.
    expect(timestampOrdering(parseSchedule("R2(A) W1(A)"), { 1: 10, 2: 20 }, true).rejected).toBe(1);
    // In timestamp order everything runs.
    expect(timestampOrdering(parseSchedule("R1(A) W1(A) R2(A) W2(A)"), { 1: 10, 2: 20 }).rejected).toBeNull();
  });
});

describe("locking solvers cross-checked", () => {
  it("classify random transactions as the definitions do", () => {
    const r = rng(11);
    const seen = new Set<LockingClass>();
    for (let n = 0; n < 400; n++) {
      // Shuffle the unlocks and the commit of a well-formed transaction around.
      const base = lockedTransaction((["not-2pl", "2pl", "strict", "rigorous"] as const)[n % 4], n + 1);
      const moved = base.slice();
      const i = Math.floor(r() * moved.length);
      if (moved[i].kind === "U" || moved[i].kind === "C") {
        const [x] = moved.splice(i, 1);
        moved.splice(Math.floor(r() * (moved.length + 1)), 0, x);
      }
      for (const steps of [base, moved]) {
        if (!wellFormed(steps)) continue;
        expect(lockingClass(steps).cls).toBe(classByDefinition(steps));
        seen.add(lockingClass(steps).cls);
      }
    }
    expect(seen.size).toBe(4);
  });

  it("run timestamp ordering as its definition says", () => {
    const r = rng(5);
    let rejected = 0;
    for (let n = 0; n < 400; n++) {
      const s = randomSchedule(r, { txs: 3, items: 2, ops: [1, 3], blind: 0.3 });
      const ts = { 1: [10, 20, 30][n % 3], 2: [20, 30, 10][n % 3], 3: [30, 10, 20][n % 3] };
      for (const thomas of [false, true]) {
        const got = timestampOrdering(s, ts, thomas).rejected;
        expect(got).toBe(firstRejected(s, ts, thomas));
        if (got !== null) rejected++;
      }
    }
    expect(rejected).toBeGreaterThan(100);
  });

  it("finds exactly the nodes that can reach themselves", () => {
    const r = rng(3);
    for (let n = 0; n < 200; n++) {
      const table = randomLockTable(r);
      const edges = waitForGraph(table);
      for (const [a, b] of edges) {
        const row = table.find((x) => x.waiter?.tx === a)!;
        expect(row.holders.some((h) => h.tx === b && !compatible(h.mode, row.waiter!.mode))).toBe(true);
      }
      // Each transaction waits at most once, so following its single wait chain decides whether it is on a cycle.
      const next = (t: number) => {
        const row = table.find((x) => x.waiter?.tx === t);
        return row ? row.holders.filter((h) => !compatible(h.mode, row.waiter!.mode)).map((h) => h.tx) : [];
      };
      const onCycle = (t: number) => {
        const seen = new Set<number>();
        const stack = next(t);
        while (stack.length) {
          const x = stack.pop()!;
          if (x === t) return true;
          if (!seen.has(x)) {
            seen.add(x);
            stack.push(...next(x));
          }
        }
        return false;
      };
      expect(nodesOnCycles([1, 2, 3, 4], edges)).toEqual([1, 2, 3, 4].filter(onCycle));
    }
  });
});

describe("concurrency content", () => {
  const cc = QUESTIONS.filter((q) => q.topic === "concurrency");
  const byId = Object.fromEntries(cc.map((q) => [q.id, q]));
  const ans = (id: string) => answerText(byId[id]);

  it("covers every question type with a spread of difficulties", () => {
    expect(cc.length).toBeGreaterThanOrEqual(20);
    expect([...new Set(cc.map((q) => q.kind))].sort()).toEqual(["mcq", "multi", "numeric", "order", "short", "truefalse"]);
    expect([...new Set(cc.map((q) => q.difficulty))].sort()).toEqual([1, 2, 3]);
    expect(GENERATORS.filter((g) => g.topic === "concurrency")).toHaveLength(4);
  });

  it("keys each fixed answer correctly", () => {
    expect(ans("cc-shared-shared")).toBe("True");
    expect(ans("cc-2pl-phases")).toBe("1. Growing phase: acquire locks, release none  2. Lock point: the last lock is acquired  3. Shrinking phase: release locks, acquire none");
    expect(ans("cc-2pl-guarantee")).toBe("Conflict-serializable schedules");
    expect(ans("cc-2pl-order")).toBe("Lock points");
    expect(ans("cc-lock-point")).toBe("lock point");
    expect(ans("cc-2pl-deadlock")).toBe("False");
    expect(ans("cc-strict-why")).toMatch(/no cascading rollbacks/);
    expect(ans("cc-conversion")).toBe("Upgrade only in the growing phase, downgrade only in the shrinking phase");
    expect(ans("cc-conservative")).toMatch(/^Conservative/);
    expect(ans("cc-wait-for")).toBe("wait-for graph");
    expect(ans("cc-coffman")).toBe("Mutual exclusion, Hold and wait, No preemption, Circular wait");
    expect(ans("cc-victim")).toMatch(/costs least/);
    expect(ans("cc-wound-wait-preemptive")).toBe("True");
    expect(ans("cc-original-ts")).toMatch(/cannot starve/);
    expect(ans("cc-timeout")).toBe("True");
    expect(ans("cc-granularity-order")).toBe("1. IX on database D  2. IX on table R  3. IX on the page holding the row  4. X on the row");
    expect(ans("cc-six")).toMatch(/^SIX on the table/);
    expect(ans("cc-escalation")).toMatch(/one table lock/);
    expect(ans("cc-thomas")).toBe("The obsolete write is ignored and T continues");
    expect(ans("cc-thomas-view")).toBe("True");
    expect(ans("cc-to-deadlock")).toBe("True");
    expect(ans("cc-validation")).toMatch(/^1\. Read phase.*2\. Validation phase.*3\. Write phase/);
    expect(ans("cc-tree-protocol")).toBe("True");
  });

  it("keys the computed fixed answers with the solvers", () => {
    const ix = byId["cc-ix-compat"];
    if (ix.kind !== "multi") throw new Error("expected multi");
    expect(ix.answers.map((i) => ix.choices[i])).toEqual(LOCK_MODES.filter((m) => compatible("IX", m)));
    const count = byId["cc-compat-count"];
    if (count.kind !== "numeric") throw new Error("expected numeric");
    expect(count.answer).toBe(LOCK_MODES.flatMap((a) => LOCK_MODES.filter((b) => compatible(a, b))).length);
    expect(prevention("wait-die", 1, 2)).toBe("requester-waits");
    expect(ans("cc-wait-die")).toBe("The older transaction waits");
    // T (TS 10) reads Q after a TS-15 write.
    expect(timestampOrdering(parseSchedule("W2(Q) R1(Q)"), { 1: 10, 2: 15 }).rejected).toBe(1);
    expect(ans("cc-to-read")).toMatch(/rolled back/);
    // The Thomas-view example: view equivalent to T1, T2, yet rejected by basic TO and accepted with Thomas' rule.
    expect(timestampOrdering(parseSchedule("R1(Q) W2(Q) W1(Q)"), { 1: 1, 2: 2 }).rejected).toBe(2);
    expect(timestampOrdering(parseSchedule("R1(Q) W2(Q) W1(Q)"), { 1: 1, 2: 2 }, true).rejected).toBeNull();
  });

  it("generated problems are deterministic and answered from what the player sees", () => {
    const classes = new Map<string, number>();
    const tally = { dead: 0, none: 0, deadSizes: new Set<number>(), outcomes: new Map<string, number>(), rejected: 0, thomasIgnored: 0, positions: new Set<number>() };
    for (let seed = 1; seed <= 300; seed++) {
      for (const g of [lockingClassGen, deadlockGen, preventionGen, tsOrderingGen]) expect(g.generate(seed)).toEqual(g.generate(seed));

      const lc = lockingClassGen.generate(seed);
      if (lc.kind !== "mcq") throw new Error("expected mcq");
      const steps = stepsFromTable(lc.tables![0]);
      expect(wellFormed(steps)).toBe(true);
      const want = classByDefinition(steps);
      expect(lc.choices[lc.answer]).toBe(LOCKING_NAMES[want]);
      classes.set(want, (classes.get(want) ?? 0) + 1);

      const dl = deadlockGen.generate(seed);
      if (dl.kind !== "multi") throw new Error("expected multi");
      const table = lockRowsFromTable(dl.tables![0]);
      const dead = nodesOnCycles([1, 2, 3, 4], waitForGraph(table));
      expect(dl.answers.map((i) => dl.choices[i])).toEqual(dead.length ? dead.map((t) => `T${t}`) : ["No deadlock"]);
      expect(dl.explainGraph!.edges).toEqual(waitForGraph(table));
      expect(dl.explainGraph!.title).toBe("Wait-for graph");
      if (dead.length) {
        tally.dead++;
        tally.deadSizes.add(dead.length);
      } else tally.none++;

      const pv = preventionGen.generate(seed);
      if (pv.kind !== "mcq") throw new Error("expected mcq");
      const m = /with (wait-die|wound-wait)\. T(\d) \(timestamp (\d+)\) requests .* T(\d) \(timestamp (\d+)\) holds/.exec(pv.prompt)!;
      const out = prevention(m[1] as "wait-die" | "wound-wait", Number(m[3]), Number(m[5]));
      expect(pv.choices[pv.answer]).toBe(preventionChoice(out, Number(m[2]), Number(m[4])));
      tally.outcomes.set(`${m[1]}:${out}`, (tally.outcomes.get(`${m[1]}:${out}`) ?? 0) + 1);

      const to = tsOrderingGen.generate(seed);
      if (to.kind !== "mcq") throw new Error("expected mcq");
      const s = scheduleFromTable(to.tables![0]);
      const tm = /TS\(T1\) = (\d+), TS\(T2\) = (\d+), TS\(T3\) = (\d+)/.exec(to.prompt)!;
      const thomas = to.prompt.includes("Thomas");
      const k = firstRejected(s, { 1: Number(tm[1]), 2: Number(tm[2]), 3: Number(tm[3]) }, thomas);
      const choice = to.choices[to.answer];
      if (k === null) expect(choice).toBe("None: every operation runs");
      else {
        expect(choice).toMatch(new RegExp(`\\(step ${k + 1}\\)$`));
        tally.rejected++;
      }
      expect(new Set(to.choices).size).toBe(5);
      if (thomas && /ignores it/.test(to.explanation)) tally.thomasIgnored++;
      tally.positions.add(to.answer);
    }
    for (const c of ["not-2pl", "2pl", "strict", "rigorous"]) expect(classes.get(c)).toBe(75);
    expect(tally.none).toBe(100);
    expect(tally.deadSizes.size).toBeGreaterThanOrEqual(2);
    for (const [, n] of tally.outcomes) expect(n).toBe(75);
    expect(tally.outcomes.size).toBe(4);
    expect(tally.rejected).toBeGreaterThan(180);
    expect(tally.thomasIgnored).toBeGreaterThan(40);
    expect(tally.positions.size).toBe(5);
  });

  it("builds full decks for the topic", () => {
    const deck = buildDeck(QUESTIONS, GENERATORS, { topic: "concurrency", seed: 5, size: 8 });
    expect(deck).toHaveLength(8);
    expect(deck.every((q) => q.topic === "concurrency")).toBe(true);
  });
});

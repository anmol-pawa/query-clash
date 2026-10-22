import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { quorumGen, shardGen, twoPcGen } from "@/content/interview/distributed";
import { answerText } from "@/game/engine/interview";
import { failuresTolerated, majority, modShard, movedByMod, quorumsOverlap, rangeShard, ringOwner, twoPcMessages, twoPhaseCommit, writesConflictSafe } from "@/lib/dbms/distributed";

const dst = QUESTIONS.filter((q) => q.id.startsWith("dst-"));
const byId = Object.fromEntries(dst.map((q) => [q.id, q]));

describe("distributed helpers", () => {
  it("handles quorums", () => {
    // Dynamo's common configuration N=3, R=2, W=2 overlaps; R=W=1 does not.
    expect(quorumsOverlap(3, 2, 2)).toBe(true);
    expect(quorumsOverlap(3, 1, 1)).toBe(false);
    expect(quorumsOverlap(5, 3, 3)).toBe(true);
    expect(quorumsOverlap(5, 2, 3)).toBe(false);
    expect(writesConflictSafe(5, 3)).toBe(true);
    expect(writesConflictSafe(4, 2)).toBe(false);
    expect(majority(5)).toBe(3);
    expect(majority(4)).toBe(3);
    expect(failuresTolerated(5, majority(5))).toBe(2);
  });

  it("places keys by mod and range", () => {
    expect(modShard(17, 5)).toBe(2);
    expect(modShard(-1, 5)).toBe(4);
    expect(movedByMod([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 3, 4)).toBe(9);
    const keys = Array.from({ length: 1200 }, (_, i) => i);
    expect(movedByMod(keys, 4, 5) / keys.length).toBeCloseTo(0.8, 1);
    expect([5, 40, 41, 90, 91, 500].map((k) => rangeShard(k, [40, 90]))).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("finds the ring owner with wrap-around", () => {
    const nodes = { A: 30, B: 150, C: 270 };
    expect(ringOwner(10, nodes, 360)).toBe("A");
    expect(ringOwner(31, nodes, 360)).toBe("B");
    expect(ringOwner(150, nodes, 360)).toBe("B");
    expect(ringOwner(300, nodes, 360)).toBe("A");
    expect(ringOwner(-10, nodes, 360)).toBe("A");
    const without = { A: 30, C: 270 };
    // Removing B moves only B's keys, to its successor C.
    const moved = Array.from({ length: 360 }, (_, p) => p).filter((p) => ringOwner(p, nodes, 360) !== ringOwner(p, without, 360));
    expect(moved.every((p) => ringOwner(p, nodes, 360) === "B" && ringOwner(p, without, 360) === "C")).toBe(true);
    expect(moved).toHaveLength(120);
  });

  it("decides two-phase commit", () => {
    expect(twoPhaseCommit(["yes", "yes"], false)).toBe("commit");
    expect(twoPhaseCommit(["yes", "no"], false)).toBe("abort");
    expect(twoPhaseCommit(["yes", "yes"], true)).toBe("blocked");
    expect(twoPhaseCommit(["yes", "no"], true)).toBe("abort");
    expect(twoPcMessages(3)).toBe(12);
  });
});

describe("distributed content", () => {
  it("covers every difficulty and the generators are registered", () => {
    expect(dst.length).toBeGreaterThanOrEqual(20);
    expect(dst.every((q) => q.topic === "distributed")).toBe(true);
    expect([...new Set(dst.map((q) => q.difficulty))].sort()).toEqual([1, 2, 3]);
    expect(new Set(dst.map((q) => q.kind)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(dst.map((q) => q.id)).size).toBe(dst.length);
    for (const g of [quorumGen, shardGen, twoPcGen]) expect(GENERATORS).toContain(g);
  });

  it("keys the fixed answers", () => {
    expect(answerText(byId["dst-cap"])).toBe("Consistency and availability");
    expect(answerText(byId["dst-cap-c"])).toMatch(/^Every read sees the most recent write/);
    expect(answerText(byId["dst-pacelc"])).toMatch(/^Even with no partition/);
    expect(answerText(byId["dst-quorum-rule"])).toBe("R + W > N");
    expect(answerText(byId["dst-mod-reshard"])).toMatch(/^Changing N remaps most keys/);
    expect(answerText(byId["dst-2pc-block"])).toMatch(/^If the coordinator fails after participants voted YES/);
    expect(answerText(byId["dst-2pc-no"])).toBe("True");
    expect(answerText(byId["dst-split-brain"])).toMatch(/^Split brain/);
    const multi = byId["dst-sql-vs-nosql"];
    expect(multi.kind === "multi" && multi.answers).toEqual([0, 1, 2]);
    const q = byId["dst-quorum-3"];
    expect(q.kind === "numeric" && q.answer).toBe(2);
    const order = byId["dst-2pc-phases"];
    expect(order.kind === "order" && order.steps[0]).toMatch(/PREPARE/);
  });
});

describe("distributed generators", () => {
  it("are deterministic and answered from the table the player sees", () => {
    const seen = { overlap: 0, tol: 0, conflict: 0, mod: 0, move: 0, range: 0, commit: 0, abort: 0, blocked: 0 };
    for (let seed = 1; seed <= 300; seed++) {
      expect(quorumGen.generate(seed)).toEqual(quorumGen.generate(seed));
      const q = quorumGen.generate(seed);
      const row = q.tables![0].rows[0].map(Number);
      const [n, w, rd] = row;
      if (q.kind === "numeric") {
        expect(q.answer).toBe(n - w);
        seen.tol++;
      } else if (q.kind === "truefalse" && q.prompt.startsWith("Is every read")) {
        expect(q.answer).toBe(rd + w > n);
        seen.overlap++;
      } else if (q.kind === "truefalse") {
        expect(q.answer).toBe(!(2 * w > n));
        seen.conflict++;
      } else throw new Error("unexpected kind");

      const s = shardGen.generate(seed);
      if (s.kind !== "numeric") throw new Error("expected numeric");
      const keys = String(s.tables![0].rows[0][0]).split(", ").map(Number);
      const nums = [...s.prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));
      if (s.prompt.startsWith("Keys are placed")) {
        const shards = nums[0];
        const target = nums[nums.length - 1];
        expect(s.answer).toBe(keys.filter((k) => k % shards === target).length);
        seen.mod++;
      } else if (s.prompt.startsWith("Data is sharded")) {
        const [, from, to] = /from (\d+) to (\d+)/.exec(s.prompt)!.map(Number);
        expect(s.answer).toBe(keys.filter((k) => k % from !== k % to).length);
        seen.move++;
      } else {
        const m = /holds keys ≤ (\d+), shard 1 holds \d+ to (\d+), .* on shard (\d)\?/.exec(s.prompt)!;
        const [b1, b2, target] = [Number(m[1]), Number(m[2]), Number(m[3])];
        const shardOf = (k: number) => (k <= b1 ? 0 : k <= b2 ? 1 : 2);
        expect(s.answer).toBe(keys.filter((k) => shardOf(k) === target).length);
        seen.range++;
      }

      const t = twoPcGen.generate(seed);
      if (t.kind !== "mcq") throw new Error("expected mcq");
      const votes = t.tables![0].rows.map((r) => String(r[1]));
      const crash = t.prompt.includes("crashes");
      const want = !votes.every((v) => v === "YES") ? 1 : crash ? 2 : 0;
      expect(t.answer).toBe(want);
      expect(new Set(t.choices).size).toBe(4);
      seen[(["commit", "abort", "blocked"] as const)[want]]++;
    }
    for (const v of Object.values(seen)) expect(v).toBeGreaterThan(20);
  });
});

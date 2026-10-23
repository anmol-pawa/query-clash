import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";
import { candidateKeys, closure, type Fd } from "@/lib/dbms/fd";
import { findCycle, type Edge } from "@/lib/dbms/schedule";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);
const staticCount = (prefix: string) => QUESTIONS.filter((q) => q.id.startsWith(prefix) && !q.id.includes("-gen")).length;

describe("more concurrency and normalization questions", () => {
  it("has at least 30 static questions in both topics", () => {
    expect(staticCount("cc-")).toBeGreaterThanOrEqual(30);
    expect(staticCount("nf-")).toBeGreaterThanOrEqual(30);
  });

  it("keys each new answer correctly", () => {
    expect(ans("cc-to-write")).toMatch(/^T is rolled back/);
    expect(ans("cc-upgrade-deadlock")).toMatch(/^Deadlock/);
    expect(ans("cc-phantom-rows")).toBe("True");
    expect(ans("cc-rigorous")).toBe("True");
    expect(ans("cc-break-cycles")).toBe("1");
    expect(ans("nf-superkey-count")).toBe("4");
    expect(ans("nf-augmentation")).toBe("True");
    expect(ans("nf-invalid-inference")).toBe("AB → C implies A → C");
    expect(ans("nf-fd-is-mvd")).toBe("True");
  });

  it("recomputes the superkey count and a rejected inference", () => {
    const fds: Fd[] = [{ lhs: ["A"], rhs: ["B", "C"] }];
    const attrs = ["A", "B", "C"];
    const keys = candidateKeys(attrs, fds);
    expect(keys.map((k) => [...k].join(""))).toEqual(["A"]);
    let supers = 0;
    for (let m = 1; m < 8; m++) {
      const set = attrs.filter((_, i) => m & (1 << i));
      if (closure(set, fds).length === 3) supers++;
    }
    expect(supers).toBe(4);
    // AB -> C does not give A -> C: A+ under {AB -> C} is just A.
    expect([...closure(["A"], [{ lhs: ["A", "B"], rhs: ["C"] }])]).toEqual(["A"]);
  });

  it("finds exactly one deadlock cycle in the wait-for graph", () => {
    const nodes = [1, 2, 3, 4, 5];
    const edges: Edge[] = [[1, 2], [2, 3], [3, 1], [4, 5]];
    expect(findCycle(nodes, edges)).not.toBeNull();
    expect(findCycle(nodes, edges.filter(([a, b]) => a !== 1 && b !== 1))).toBeNull();
  });
});

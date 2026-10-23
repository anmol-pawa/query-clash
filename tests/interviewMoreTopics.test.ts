import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";
import { blocksFor } from "@/lib/dbms/joins";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);
const staticCount = (prefix: string) => QUESTIONS.filter((q) => q.id.startsWith(prefix) && !q.id.startsWith(`${prefix}gen`)).length;

describe("more MVCC, ER and query questions", () => {
  it("has at least 30 static questions per topic", () => {
    expect(staticCount("mvcc-")).toBeGreaterThanOrEqual(30);
    expect(staticCount("er-")).toBeGreaterThanOrEqual(30);
    expect(staticCount("qry-")).toBeGreaterThanOrEqual(30);
  });

  it("keys each new MVCC answer correctly", () => {
    expect(ans("mvcc-readers-writers")).toBe("False");
    expect(ans("mvcc-rc-snapshot")).toBe("At the start of each statement");
    expect(ans("mvcc-snapshot-contents")).toMatch(/in-progress ids/);
    expect(ans("mvcc-delete-physical")).toBe("False");
    expect(ans("mvcc-bloat")).toMatch(/Dead tuple versions/);
    expect(ans("mvcc-vacuum-full")).toMatch(/exclusive lock/);
    expect(ans("mvcc-hot")).toMatch(/same page/);
    expect(ans("mvcc-versions-delete")).toBe("4");
    expect(ans("mvcc-write-skew")).toBe("False");
    expect(ans("mvcc-rc-update-recheck")).toMatch(/re-evaluates its WHERE/);
    expect(ans("mvcc-rr-error-code")).toMatch(/^Error 40001/);
    expect(ans("mvcc-innodb")).toMatch(/undo log.*REPEATABLE READ/);
  });

  it("keys each new ER and algebra answer correctly", () => {
    expect(ans("er-specialization")).toMatch(/top-down/);
    expect(ans("er-disjoint-overlap")).toMatch(/at most one subclass/);
    expect(ans("er-isa-mapping")).toMatch(/superclass plus one per subclass.*per subclass only.*type column/);
    expect(ans("er-ternary")).toMatch(/foreign key to each of the three/);
    expect(ans("er-composite-attr")).toMatch(/Flattened/);
    expect(ans("er-derived-attr")).toBe("True");
    expect(ans("er-aggregation")).toMatch(/whole relationship/);
    expect(ans("er-superkey-count")).toBe("4");
    expect(ans("er-natural-join-cols")).toBe("4");
    expect(ans("er-union-compat")).toMatch(/union-compatible/);
    expect(ans("er-rename-need")).toMatch(/join a relation with itself/);
    expect(ans("er-intersect-identity")).toBe("True");
  });

  it("keys each new query-processing answer correctly", () => {
    expect(ans("qry-merge-cost")).toBe("500 block transfers");
    expect(ans("qry-sort-runs")).toBe("100");
    expect(ans("qry-sort-passes")).toBe("3");
    expect(ans("qry-nl-worst")).toBe("50100 block transfers");
    expect(ans("qry-independence")).toBe("50 rows");
    expect(ans("qry-histogram")).toMatch(/skewed/);
    expect(ans("qry-bitmap-scan")).toMatch(/bitmap/);
    expect(ans("qry-index-only")).toMatch(/visibility map/);
    expect(ans("qry-sort-blocking")).toBe("Sort");
    expect(ans("qry-left-deep")).toMatch(/search space shrinks/);
    expect(ans("qry-order-by-index")).toBe("True");
  });

  it("recomputes the numeric answers independently", () => {
    // ER: superkeys of R(A,B,C) with sole key A = 2^(3-1); natural join keeps one copy of B, C.
    expect(2 ** (3 - 1)).toBe(4);
    expect(new Set(["A", "B", "C", "B", "C", "D"]).size).toBe(4);
    // Merge join, nested loop, selectivity.
    expect(100 + 400).toBe(500);
    expect(1000 * 50 + 100).toBe(50100);
    expect(Math.round(10000 * 0.1 * 0.05)).toBe(50);
    // External sort: runs, then merge passes with fan-in M - 1.
    expect(blocksFor(1000, 10)).toBe(100);
    let runs = 100;
    let passes = 0;
    while (runs > 1) {
      runs = Math.ceil(runs / 9);
      passes++;
    }
    expect(passes).toBe(3);
    // MVCC: insert + 3 updates = 4 versions; delete adds none.
    expect(1 + 3).toBe(4);
  });
});

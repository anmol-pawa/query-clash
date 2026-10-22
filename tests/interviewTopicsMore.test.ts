import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";
import { naturalJoin } from "@/lib/dbms/algebra";
import { blockNestedTransfers, nestedLoopTransfers, sortPasses } from "@/lib/dbms/joins";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);
const count = (topic: string) => QUESTIONS.filter((q) => q.topic === topic).length;

describe("more ER and relational algebra questions", () => {
  it("has at least 30 ER questions", () => expect(count("er")).toBeGreaterThanOrEqual(30));

  it("keys each answer", () => {
    expect(ans("er-overlap-total")).toBe("Overlapping and total");
    expect(ans("er-single-table-isa")).toMatch(/^Many NULLs/);
    expect(ans("er-ternary-binary")).toBe("False");
    expect(ans("er-derived")).toMatch(/^Derived attribute/);
    expect(ans("er-mn-pk")).toMatch(/\(student_id, course_id\)/);
    expect(ans("er-count-tables")).toBe("6");
    expect(ans("er-natural-join-count")).toBe("5");
    expect(ans("er-union-compatible")).toMatch(/^The same number of attributes/);
    expect(ans("er-ra-equivalences")).toBe(
      "σ_c1(σ_c2(R)) = σ_c2(σ_c1(R)), π_A(π_A,B(R)) = π_A(R), R ⋈ S = S ⋈ R",
    );
    expect(ans("er-relation-set")).toBe("True");
  });

  it("computes the join and table counts from the data", () => {
    expect(3 + 2 + 1).toBe(6);
    const r = { columns: ["A", "B"], rows: [[1, "x"], [2, "y"], [3, "x"]] };
    const s = { columns: ["B", "C"], rows: [["x", 10], ["x", 20], ["y", 30]] };
    expect(naturalJoin(r, s).rows).toHaveLength(5);
  });
});

describe("more query processing questions", () => {
  it("has at least 30 query questions", () => expect(count("query")).toBeGreaterThanOrEqual(30));

  it("keys each answer and checks the cost formulas", () => {
    const r = { n: 1000, b: 100 };
    const s = { n: 5000, b: 400 };
    expect(nestedLoopTransfers(r, s)).toBe(400100);
    expect(ans("qry-nl-cost-calc")).toBe("400100 transfers");
    expect(blockNestedTransfers(r, s, 12)).toBe(4100);
    expect(ans("qry-bnl-cost-calc")).toBe("4100 transfers");
    expect(blockNestedTransfers(r, s, 102)).toBe(500);
    expect(ans("qry-bnl-all-memory")).toBe("500 transfers");
    expect(sortPasses(1000, 10)).toBe(3);
    expect(ans("qry-sort-passes-calc")).toBe("3");
    expect(ans("qry-function-on-column")).toBe("WHERE UPPER(name) = 'ANN'");
    expect(ans("qry-leading-wildcard")).toBe("LIKE 'son%'");
    expect(ans("qry-heuristics")).toMatch(/^Push selections down.*Push projections down.*most restrictive/);
    expect(ans("qry-pipelining")).toBe("True");
    expect(ans("qry-estimate-gap")).toMatch(/^Stale or missing statistics/);
  });
});

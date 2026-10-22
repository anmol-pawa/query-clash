import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("more DBMS fundamentals questions", () => {
  it("has at least 30 static fundamentals questions", () => {
    expect(QUESTIONS.filter((q) => q.topic === "basics").length).toBeGreaterThanOrEqual(30);
  });

  it("keys each new answer correctly", () => {
    expect(ans("basics-fk")).toMatch(/matches a key value/);
    expect(ans("basics-fk-delete")).toMatch(/deleted too/);
    expect(ans("basics-null-compare")).toBe("UNKNOWN");
    expect(ans("basics-null-count")).toBe("3");
    expect(ans("basics-null-avg")).toBe("6");
    expect(ans("basics-not-in-null")).toBe("False");
    expect(ans("basics-superkey-candidate")).toBe("Every candidate key is a superkey");
    expect(ans("basics-primary-count")).toMatch(/^1/);
    expect(ans("basics-degree-cardinality")).toMatch(/attributes/);
    expect(ans("basics-cardinality-calc")).toBe("40");
    expect(ans("basics-delete-truncate")).toBe("DELETE accepts a WHERE clause, Both leave the table definition in place");
    expect(ans("basics-where-having")).toMatch(/before grouping/);
    expect(ans("basics-sql-order")).toMatch(/^1\. FROM.*2\. WHERE.*3\. GROUP BY.*4\. HAVING.*5\. SELECT.*6\. ORDER BY/);
    expect(ans("basics-view")).toMatch(/stored query/);
    expect(ans("basics-catalog")).toBe("catalog");
    expect(ans("basics-dcl")).toBe("GRANT, COMMIT, REVOKE");
    expect(ans("basics-union-all")).toMatch(/removes duplicate/);
    expect(ans("basics-union-count")).toMatch(/^8/);
    expect(ans("basics-surrogate")).toMatch(/system-generated/);
    expect(ans("basics-oltp-olap")).toMatch(/short transactions/);
    expect(ans("basics-distinct-pk")).toBe("True");
    expect(ans("basics-outer-join")).toBe("LEFT OUTER JOIN");
  });

  it("computes the textbook NULL aggregates from the data", () => {
    const x = [5, null, 7, null, 9];
    expect(x.filter((v) => v !== null).length).toBe(3);
    const y = [4, null, 8].filter((v): v is number => v !== null);
    expect(y.reduce((a, b) => a + b, 0) / y.length).toBe(6);
    expect(4 + 4).toBe(8);
  });
});

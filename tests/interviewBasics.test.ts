import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("fundamentals question bank", () => {
  it("has at least 30 fundamentals questions", () => {
    expect(QUESTIONS.filter((q) => q.topic === "basics").length).toBeGreaterThanOrEqual(30);
  });

  it("keys the keys-and-integrity answers", () => {
    expect(ans("basics-fk-null")).toBe("True");
    expect(ans("basics-candidate-keys")).toBe("An alternate key");
    expect(ans("basics-superkey-def")).toMatch(/^Any attribute set/);
  });

  it("keys the SQL sublanguage answers", () => {
    expect(ans("basics-dml-list")).toBe("SELECT, UPDATE, DELETE");
    expect(ans("basics-tcl-name")).toBe("tcl");
    expect(ans("basics-dcl")).toBe("GRANT and REVOKE");
    expect(ans("basics-delete-truncate")).toMatch(/WHERE clause.*faster/);
  });

  it("keys the architecture and model answers", () => {
    expect(ans("basics-data-independence-physical")).toBe("Physical data independence");
    expect(ans("basics-view")).toMatch(/^A stored query/);
    expect(ans("basics-dbms-components")).toBe("Query optimiser, Transaction manager, Buffer manager");
    expect(ans("basics-relational-model-author")).toBe("codd");
    expect(ans("basics-oltp-olap")).toMatch(/^Aggregating a year/);
  });

  it("keys the NULL and counting answers", () => {
    expect(ans("basics-null-compare")).toMatch(/^No rows/);
    expect(ans("basics-distinct-null")).toBe("3 rows");
    expect(ans("basics-count-null")).toBe("3");
  });

  it("keys the relational-algebra and clause-order answers", () => {
    expect(ans("basics-degree-cardinality")).toBe("5 attributes");
    expect(ans("basics-union-count")).toBe("10");
    expect(ans("basics-union-compatible")).toBe("True");
    expect(ans("basics-having-where")).toBe("HAVING");
    expect(ans("basics-sql-order")).toMatch(/^1\. FROM.*2\. WHERE.*3\. GROUP BY.*4\. HAVING.*5\. SELECT.*6\. ORDER BY/);
  });
});

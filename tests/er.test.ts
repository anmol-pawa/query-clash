import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import { divisionSize, joinSize, selectProject, tableCount } from "@/content/interview/er";
import { answerText, buildDeck } from "@/game/engine/interview";
import { difference, distinct, divide, naturalJoin, product, project, select, union, type Relation } from "@/lib/dbms/algebra";
import { countTables } from "@/lib/dbms/er";

const rel = (columns: string[], rows: (string | number)[][]): Relation => ({ columns, rows });

describe("relational algebra evaluator", () => {
  it("joins the textbook Employee ⋈ Dept example", () => {
    // The standard natural-join example: Mary's department has no row in Dept, and Production has no employees.
    const emp = rel(["Name", "EmpId", "DeptName"], [
      ["Harry", 3415, "Finance"],
      ["Sally", 2241, "Sales"],
      ["George", 3401, "Finance"],
      ["Harriet", 2202, "Sales"],
      ["Mary", 1257, "Human Resources"],
    ]);
    const dept = rel(["DeptName", "Manager"], [
      ["Finance", "George"],
      ["Sales", "Harriet"],
      ["Production", "Charles"],
    ]);
    const j = naturalJoin(emp, dept);
    expect(j.columns).toEqual(["Name", "EmpId", "DeptName", "Manager"]);
    expect(j.rows).toEqual([
      ["Harry", 3415, "Finance", "George"],
      ["Sally", 2241, "Sales", "Harriet"],
      ["George", 3401, "Finance", "George"],
      ["Harriet", 2202, "Sales", "Harriet"],
    ]);
    // With no shared columns, ⋈ is ×.
    expect(naturalJoin(rel(["A"], [[1], [2]]), rel(["B"], [["x"], ["y"], ["z"]])).rows).toHaveLength(6);
  });

  it("divides the textbook Completed ÷ DBProject example", () => {
    const completed = rel(["Student", "Task"], [
      ["Fred", "Database1"],
      ["Fred", "Database2"],
      ["Fred", "Compiler1"],
      ["Eugene", "Database1"],
      ["Eugene", "Compiler1"],
      ["Sarah", "Database1"],
      ["Sarah", "Database2"],
    ]);
    const db = rel(["Task"], [["Database1"], ["Database2"]]);
    expect(divide(completed, db)).toEqual({ columns: ["Student"], rows: [["Fred"], ["Sarah"]] });
    // Division by an empty relation keeps every candidate (vacuous "for all").
    expect(divide(completed, rel(["Task"], [])).rows).toHaveLength(3);
  });

  it("division equals its derived form π_X(R) − π_X((π_X(R) × S) − R)", () => {
    const r = rel(["X", "Y"], [[1, "a"], [1, "b"], [2, "a"], [3, "b"], [3, "a"], [3, "c"]]);
    const s = rel(["Y"], [["a"], ["b"]]);
    const px = project(r, ["X"]);
    const derived = difference(px, project(difference(project(product(px, s), ["X", "Y"]), r), ["X"]));
    expect(divide(r, s).rows).toEqual(derived.rows);
    expect(derived.rows).toEqual([[1], [3]]);
  });

  it("selects, projects with set semantics, and checks union compatibility", () => {
    const emp = rel(["name", "dept", "salary"], [["A", "HR", 50], ["B", "HR", 60], ["C", "Dev", 40], ["D", "Dev", 70]]);
    expect(select(emp, (t) => (t.salary as number) > 45).rows).toHaveLength(3);
    expect(project(emp, ["dept"]).rows).toEqual([["HR"], ["Dev"]]);
    expect(distinct(rel(["a"], [[1], [1], [2]])).rows).toEqual([[1], [2]]);
    expect(union(rel(["a"], [[1]]), rel(["a"], [[1], [2]])).rows).toEqual([[1], [2]]);
    expect(() => union(rel(["a"], []), rel(["b"], []))).toThrow();
    expect(() => product(rel(["a"], []), rel(["a"], []))).toThrow();
    expect(() => project(emp, ["nope"])).toThrow();
  });
});

describe("ER → relational table counts", () => {
  it("matches the standard textbook cases", () => {
    const two = (card: "1:1" | "1:N" | "M:N") =>
      countTables({ entities: ["E1", "E2"], weak: [], multivalued: [], relationships: [{ name: "R", a: "E1", b: "E2", card }] }).total;
    // Two entity sets and one relationship: M:N needs 3 tables, 1:N and 1:1 (partial participation) need 2.
    expect(two("M:N")).toBe(3);
    expect(two("1:N")).toBe(2);
    expect(two("1:1")).toBe(2);
    // Employee with Dependent (weak) and a multivalued phone: Employee, Dependent, EmployeePhone.
    expect(countTables({ entities: ["Employee"], weak: [{ name: "Dependent", owner: "Employee" }], multivalued: [{ entity: "Employee", attr: "phone" }], relationships: [] }).total).toBe(3);
  });

  it("generated table counts add up their parts", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const q = tableCount.generate(seed);
      if (q.kind !== "numeric") throw new Error("expected numeric");
      const entities = q.prompt.match(/Strong entity sets: ([^.]*)\./)![1].split(", ").length;
      const weak = (q.prompt.match(/Weak entity set/g) ?? []).length;
      const multi = (q.prompt.match(/multivalued attribute/g) ?? []).length;
      const mn = (q.prompt.match(/ M:N /g) ?? []).length;
      expect(q.answer).toBe(entities + weak + multi + mn);
    }
  });
});

describe("ER & relational model content", () => {
  const er = QUESTIONS.filter((q) => q.topic === "er");

  it("covers every question type with a spread of difficulties", () => {
    expect([...new Set(er.map((q) => q.kind))].sort()).toEqual(["mcq", "multi", "numeric", "order", "short", "truefalse"]);
    expect([...new Set(er.map((q) => q.difficulty))].sort()).toEqual([1, 2, 3]);
    expect(GENERATORS.filter((g) => g.topic === "er")).toHaveLength(4);
  });

  it("keys each answer correctly", () => {
    const byId = Object.fromEntries(er.map((q) => [q.id, q]));
    const ans = (id: string) => answerText(byId[id]);
    expect(ans("er-weak-entity")).toMatch(/owner entity set/);
    expect(ans("er-discriminator")).toBe("discriminator");
    expect(ans("er-weak-pk")).toBe("(emp_id, name)");
    expect(ans("er-weak-total")).toBe("True");
    expect(ans("er-total-participation")).toMatch(/^Total/);
    expect(ans("er-attribute-kinds")).toBe("age is a derived attribute, name is a composite attribute, email is a multivalued attribute");
    expect(ans("er-mn-mapping")).toMatch(/new Enrolls table/);
    expect(ans("er-1n-fk")).toBe("In Employee, referencing Department");
    expect(ans("er-multivalued-mapping")).toMatch(/primary key \(emp_id, phone\)/);
    expect(ans("er-recursive")).toBe("1");
    expect(ans("er-1to1-total")).toBe("A single merged table");
    expect(ans("er-candidate-keys")).toBe("{emp_id}, {email}");
    expect(ans("er-alternate-key")).toBe("alternate");
    expect(ans("er-fk-null")).toBe("True");
    expect(ans("er-primitive-ops")).toBe("σ selection, π projection, ∪ union, − set difference, × Cartesian product");
    expect(ans("er-projection-dupes")).toBe("True");
    expect(ans("er-division-use")).toMatch(/every course/);
    expect(ans("er-join-steps")).toMatch(/^1\. Form the Cartesian.*2\. Keep.*3\. Project/);
    expect(ans("er-mapping-order")).toMatch(/^1\. Map each strong.*2\. Map each weak.*3\. Map 1:1.*4\. Map each M:N.*5\. Map each multivalued/);
    expect(ans("er-product-size")).toBe("20 tuples");
  });

  it("generated algebra problems are answered by the evaluator from the tables they show", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const j = joinSize.generate(seed);
      const [R, S] = j.tables!;
      if (j.kind !== "numeric") throw new Error("expected numeric");
      // Count matching pairs directly (every row is distinct, so the bag count equals the set count).
      expect(j.answer).toBe(R.rows.reduce((n, a) => n + S.rows.filter((b) => b[0] === a[1]).length, 0));
      expect(new Set(R.rows.map((x) => JSON.stringify(x))).size).toBe(R.rows.length);

      const sp = selectProject.generate(seed);
      if (sp.kind !== "numeric") throw new Error("expected numeric");
      const k = Number(sp.prompt.match(/salary>(\d+)/)![1]);
      expect(sp.answer).toBe(new Set(sp.tables![0].rows.filter((x) => (x[2] as number) > k).map((x) => x[1])).size);

      const d = divisionSize.generate(seed);
      if (d.kind !== "numeric") throw new Error("expected numeric");
      const [takes, req] = d.tables!;
      const students = [...new Set(takes.rows.map((x) => x[0]))];
      const want = students.filter((s) => req.rows.every(([c]) => takes.rows.some((x) => x[0] === s && x[1] === c))).length;
      expect(d.answer).toBe(want);
      expect(d.answer).toBeGreaterThanOrEqual(1);
      for (const t of [...j.tables!, ...sp.tables!, ...d.tables!]) {
        expect(t.name).toBeTruthy();
        for (const row of t.rows) expect(row).toHaveLength(t.columns.length);
      }
    }
  });

  it("builds full decks for the topic", () => {
    const deck = buildDeck(QUESTIONS, GENERATORS, { topic: "er", seed: 3, size: 8 });
    expect(deck).toHaveLength(8);
    expect(deck.every((q) => q.topic === "er")).toBe(true);
  });
});

import type { Generator, Question } from "./types";
import { distinct, divide, naturalJoin, project, select, type Relation } from "@/lib/dbms/algebra";
import { countTables, type Cardinality, type ErSchema } from "@/lib/dbms/er";
import { randInt, rng, shuffled } from "@/lib/rng";

/** ER modelling and the relational model: entities, weak entities, participation, ER→tables, keys and relational algebra. */
export const ER: Question[] = [
  {
    id: "er-weak-entity",
    topic: "er",
    kind: "mcq",
    prompt: "What makes an entity set weak?",
    choices: [
      "It has no attributes of its own",
      "It cannot be identified by its own attributes alone and depends on an owner entity set",
      "It takes part in no relationships",
      "Its table has no foreign keys",
    ],
    answer: 1,
    explanation:
      "A weak entity set (drawn as a double rectangle) has no key of its own. Each weak entity is identified by its owner's key plus its own partial key, through an identifying relationship (a double diamond).",
    difficulty: 1,
    tags: ["er", "weak entity"],
    askedAt: "Standard in campus placement DBMS rounds.",
  },
  {
    id: "er-discriminator",
    topic: "er",
    kind: "short",
    prompt: "A weak entity's attribute that tells apart the weak entities of the same owner (e.g. a dependent's name) is called its partial key or its ___.",
    accept: ["discriminator", "partial key"],
    explanation:
      "The discriminator (partial key, underlined with a dashed line) is only unique within one owner. The weak entity's full key is the owner's primary key plus the discriminator.",
    difficulty: 1,
    tags: ["er", "weak entity"],
  },
  {
    id: "er-weak-pk",
    topic: "er",
    kind: "mcq",
    prompt: "Employee(emp_id, …) owns the weak entity set Dependent(name, birth_date). What is the primary key of the Dependent table?",
    choices: ["(name)", "(emp_id)", "(emp_id, name)", "(name, birth_date)"],
    answer: 2,
    explanation:
      "The weak entity's table takes the owner's primary key as a foreign key, and its primary key is that foreign key plus the discriminator: (emp_id, name). It usually cascades on delete from Employee.",
    difficulty: 2,
    tags: ["er mapping", "weak entity", "keys"],
    askedAt: "A frequent follow-up after defining weak entities.",
  },
  {
    id: "er-weak-total",
    topic: "er",
    kind: "truefalse",
    prompt: "A weak entity set always participates totally in its identifying relationship.",
    answer: true,
    explanation:
      "True. A weak entity cannot exist without its owner, so every weak entity takes part in the identifying relationship (a double line in the ER diagram).",
    difficulty: 2,
    tags: ["er", "weak entity", "participation"],
  },
  {
    id: "er-total-participation",
    topic: "er",
    kind: "mcq",
    prompt: "\"Every loan must belong to at least one customer.\" What is Loan's participation in the Borrower relationship?",
    choices: ["Partial (single line)", "Total (double line)", "One-to-one", "Weak"],
    answer: 1,
    explanation:
      "Participation is total when every entity in the set must take part in the relationship. It is drawn as a double line and is about existence, which is separate from the cardinality ratio (1:1, 1:N, M:N).",
    difficulty: 1,
    tags: ["er", "participation"],
  },
  {
    id: "er-attribute-kinds",
    topic: "er",
    kind: "multi",
    prompt: "A Customer has a date of birth, an age, a name made of first and last name, and any number of email addresses. Select every correct statement.",
    choices: [
      "age is a derived attribute",
      "name is a composite attribute",
      "email is a multivalued attribute",
      "date of birth is a derived attribute",
      "age should be stored as a key attribute",
    ],
    answers: [0, 1, 2],
    explanation:
      "age can be computed from the date of birth, so age is derived (a dashed ellipse) and the date of birth is stored. name splits into parts, so it is composite. Several emails make email multivalued (a double ellipse). Nothing here is a key.",
    difficulty: 1,
    tags: ["er", "attributes"],
    askedAt: "Common in service-company interviews.",
  },
  {
    id: "er-mn-mapping",
    topic: "er",
    kind: "mcq",
    prompt: "Student and Course are related M:N by Enrolls, which has the attribute grade. In the standard mapping, where does grade go?",
    choices: [
      "In the Student table",
      "In the Course table",
      "In a new Enrolls table keyed by (student_id, course_id)",
      "It is dropped, because relationships cannot have attributes",
    ],
    answer: 2,
    explanation:
      "An M:N relationship becomes its own table holding both participants' keys as foreign keys, together forming its primary key, plus the relationship's attributes. A grade belongs to a (student, course) pair, not to either side alone.",
    difficulty: 1,
    tags: ["er mapping", "cardinality"],
    askedAt: "Asked in almost every DBMS interview that touches design.",
  },
  {
    id: "er-1n-fk",
    topic: "er",
    kind: "mcq",
    prompt: "Department 1:N Employee (each employee works in at most one department). Where does the foreign key go?",
    choices: [
      "In Employee, referencing Department",
      "In Department, referencing Employee",
      "In a new WorksIn table",
      "In both tables",
    ],
    answer: 0,
    explanation:
      "Put the foreign key on the N side: each employee row stores one dept_id. On the 1 side you would need a list of employees per department, which is not atomic. A separate table also works but is not needed.",
    difficulty: 1,
    tags: ["er mapping", "cardinality", "foreign key"],
  },
  {
    id: "er-multivalued-mapping",
    topic: "er",
    kind: "mcq",
    prompt: "Employee(emp_id, name) has a multivalued attribute phone. How is it mapped?",
    choices: [
      "A phone column holding a comma-separated list",
      "Columns phone1, phone2 and phone3 in Employee",
      "A table EmployeePhone(emp_id, phone) with primary key (emp_id, phone)",
      "A table EmployeePhone(phone) with primary key (phone)",
    ],
    answer: 2,
    explanation:
      "A multivalued attribute gets its own table: the owner's key as a foreign key plus the value, with the pair as the primary key. A list in one column breaks 1NF, and phone1..phone3 cap the count and leave NULLs.",
    difficulty: 2,
    tags: ["er mapping", "attributes", "1nf"],
  },
  {
    id: "er-recursive",
    topic: "er",
    kind: "numeric",
    prompt: "Employee has a recursive 1:N relationship Manages (a manager manages many employees, each employee has at most one manager). How many tables does the standard mapping need for this ER diagram?",
    answer: 1,
    explanation:
      "One. A 1:N relationship becomes a foreign key on the N side, and here both sides are Employee, so Employee gets a self-referencing manager_id column that references emp_id.",
    difficulty: 2,
    tags: ["er mapping", "recursive relationship"],
    askedAt: "The classic employee–manager schema, also the setup for self-join SQL questions.",
  },
  {
    id: "er-1to1-total",
    topic: "er",
    kind: "mcq",
    prompt: "Person and Passport are related 1:1, and both sides participate totally (every person has exactly one passport and vice versa). What is the most compact correct mapping?",
    choices: [
      "Two tables plus a third relationship table",
      "A single merged table",
      "Two tables, each with a foreign key to the other",
      "It cannot be mapped without NULLs",
    ],
    answer: 1,
    explanation:
      "With 1:1 and total participation on both sides, every person row pairs with exactly one passport row, so the two can be merged into one table with no NULLs. With partial participation on one side you keep two tables and put a UNIQUE foreign key on the total side.",
    difficulty: 3,
    tags: ["er mapping", "cardinality", "participation"],
    askedAt: "A GATE-style follow-up to \"minimum number of tables\" questions.",
  },
  {
    id: "er-candidate-keys",
    topic: "er",
    kind: "multi",
    prompt: "In Staff(emp_id, email, name, dept), emp_id and email are each unique and never NULL, and names repeat. Select every candidate key.",
    choices: ["{emp_id}", "{email}", "{emp_id, email}", "{name, dept}"],
    answers: [0, 1],
    explanation:
      "A candidate key is a minimal superkey. {emp_id} and {email} each identify a row. {emp_id, email} is a superkey but not minimal, and {name, dept} need not be unique. One candidate key becomes the primary key and the other is an alternate key.",
    difficulty: 2,
    tags: ["keys", "candidate key", "superkey"],
    askedAt: "Asked in almost every DBMS round.",
  },
  {
    id: "er-alternate-key",
    topic: "er",
    kind: "short",
    prompt: "A candidate key that was not chosen as the primary key is called a(n) ___ key.",
    accept: ["alternate", "alternate key"],
    explanation:
      "Alternate keys are the candidate keys left over after the primary key is picked. They are usually enforced with UNIQUE (and NOT NULL) constraints.",
    difficulty: 1,
    tags: ["keys", "alternate key"],
  },
  {
    id: "er-fk-null",
    topic: "er",
    kind: "truefalse",
    prompt: "A foreign key column may hold NULL unless it is declared NOT NULL.",
    answer: true,
    explanation:
      "True. Referential integrity only requires a non-NULL foreign key value to match a referenced key. A NULL foreign key means \"not related\", which is how optional (partial) participation is stored.",
    difficulty: 2,
    tags: ["keys", "foreign key", "integrity"],
  },
  {
    id: "er-primitive-ops",
    topic: "er",
    kind: "multi",
    prompt: "Select every fundamental (primitive) operation of relational algebra.",
    choices: ["σ selection", "π projection", "∪ union", "− set difference", "× Cartesian product", "⋈ natural join", "÷ division", "∩ intersection"],
    answers: [0, 1, 2, 3, 4],
    explanation:
      "σ, π, ∪, −, × and ρ (rename) are the fundamental operations. The rest can be derived: R ∩ S = R − (R − S), ⋈ is σ over × followed by π, and ÷ is built from π, × and −.",
    difficulty: 2,
    tags: ["relational algebra"],
    askedAt: "Common in GATE and university-style interviews.",
  },
  {
    id: "er-projection-dupes",
    topic: "er",
    kind: "truefalse",
    prompt: "In relational algebra, π removes duplicate tuples from its result, unlike a plain SQL SELECT.",
    answer: true,
    explanation:
      "True. Relations are sets, so π returns each distinct tuple once. SQL works on bags (multisets) and keeps duplicates unless you write SELECT DISTINCT.",
    difficulty: 1,
    tags: ["relational algebra", "projection"],
  },
  {
    id: "er-division-use",
    topic: "er",
    kind: "mcq",
    prompt: "Which query is naturally written with the division operator ÷?",
    choices: [
      "Students who have taken at least one database course",
      "Students who have taken every course offered by the CS department",
      "Courses with no students",
      "The number of students per course",
    ],
    answer: 1,
    explanation:
      "Division answers \"for all\" questions: Takes(student, course) ÷ π_course(σ_dept='CS'(Course)) keeps the students paired with every CS course. In SQL it is usually written with a double NOT EXISTS.",
    difficulty: 2,
    tags: ["relational algebra", "division"],
    askedAt: "A favourite \"hard\" relational-algebra question.",
  },
  {
    id: "er-join-steps",
    topic: "er",
    kind: "order",
    prompt: "Put the steps of the textbook definition of the natural join R ⋈ S in order.",
    steps: [
      "Form the Cartesian product R × S",
      "Keep the tuples where every shared attribute has equal values (σ)",
      "Project away the duplicate copy of each shared attribute (π)",
    ],
    explanation:
      "R ⋈ S = π_{attrs of R ∪ S}(σ_{R.A = S.A for shared A}(R × S)). Engines never build the product; they use nested-loop, hash or sort-merge joins that give the same result.",
    difficulty: 2,
    tags: ["relational algebra", "join"],
  },
  {
    id: "er-mapping-order",
    topic: "er",
    kind: "order",
    prompt: "Order the steps of the standard ER→relational mapping algorithm.",
    steps: [
      "Map each strong entity set to a table with its simple attributes and key",
      "Map each weak entity set, adding its owner's key",
      "Map 1:1 and 1:N relationships as foreign keys",
      "Map each M:N relationship to its own table",
      "Map each multivalued attribute to its own table",
    ],
    explanation:
      "Strong entities come first because everything else refers to their keys. Weak entities need their owners' keys, and relationships need both participants' tables. This follows the Elmasri–Navathe algorithm, which ends with n-ary relationships.",
    difficulty: 3,
    tags: ["er mapping"],
  },
  {
    id: "er-product-size",
    topic: "er",
    kind: "numeric",
    prompt: "R has 5 tuples and 3 attributes. S has 4 tuples and 2 attributes, with no attribute names in common. How many tuples are in R × S?",
    answer: 20,
    unit: "tuples",
    explanation:
      "The Cartesian product pairs every tuple of R with every tuple of S: 5 × 4 = 20 tuples. Its degree (number of attributes) is 3 + 2 = 5.",
    difficulty: 1,
    tags: ["relational algebra", "cartesian product"],
  },
];

const ENTITY_POOL = ["Student", "Course", "Professor", "Department", "Project", "Employee"];
const WEAK_POOL = ["Dependent", "Section", "Payment"];
const MULTI_POOL = ["phone", "email", "skill"];
const REL_POOL = ["Enrolls", "Teaches", "Advises", "WorksOn", "Funds", "Leads"];
const CARDS: Cardinality[] = ["1:1", "1:N", "M:N"];

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** "How many tables?" for a random ER diagram, counted by `countTables`. */
export const tableCount: Generator = {
  id: "er-gen-tables",
  topic: "er",
  difficulty: 2,
  tags: ["er mapping", "cardinality"],
  askedAt: "\"Minimum number of tables\" is a GATE and placement-test staple.",
  generate(seed) {
    const r = rng(seed);
    const entities = shuffled(r, ENTITY_POOL).slice(0, randInt(r, 2, 4));
    const weak = r() < 0.5 ? [{ name: WEAK_POOL[randInt(r, 0, WEAK_POOL.length - 1)], owner: entities[randInt(r, 0, entities.length - 1)] }] : [];
    const multivalued = shuffled(r, MULTI_POOL)
      .slice(0, randInt(r, 0, 2))
      .map((attr) => ({ attr, entity: entities[randInt(r, 0, entities.length - 1)] }));
    const names = shuffled(r, REL_POOL);
    const relationships = Array.from({ length: randInt(r, 1, 3) }, (_, i) => {
      const [a, b] = shuffled(r, entities);
      return { name: names[i], a, b, card: CARDS[randInt(r, 0, 2)] };
    });
    const schema: ErSchema = { entities, weak, multivalued, relationships };
    const c = countTables(schema);
    const parts = [
      `Strong entity sets: ${entities.join(", ")}.`,
      ...weak.map((w) => `Weak entity set ${w.name}, owned by ${w.owner}.`),
      ...multivalued.map((m) => `${m.entity} has a multivalued attribute ${m.attr}.`),
      `Relationships: ${relationships.map((x) => `${x.name} (${x.a} ${x.card} ${x.b})`).join(", ")}.`,
    ];
    return {
      id: `er-gen-tables-${seed}`,
      topic: "er",
      kind: "numeric",
      prompt: `${parts.join(" ")} All participation is partial. How many tables does the standard ER→relational mapping produce?`,
      answer: c.total,
      unit: "tables",
      explanation:
        `${plural(c.entities, "table")} for the strong entities, ${c.weak} for weak entities, ${c.multivalued} for multivalued attributes and ${c.relationships} for M:N relationships: ${c.total}. ` +
        "1:1 and 1:N relationships become foreign keys, and a weak entity's identifying relationship needs no table.",
      difficulty: 2,
      tags: tableCount.tags,
      askedAt: tableCount.askedAt,
    };
  },
};

/** "How many tuples in R ⋈ S?" for two small random relations, evaluated by `naturalJoin`. */
export const joinSize: Generator = {
  id: "er-gen-join",
  topic: "er",
  difficulty: 2,
  tags: ["relational algebra", "join"],
  generate(seed) {
    const r = rng(seed);
    const rel = (name: string, cols: [string, string], n: number, left: boolean): Relation =>
      distinct({
        name,
        columns: cols,
        rows: Array.from({ length: n }, () => (left ? [randInt(r, 1, 4), ["x", "y", "z"][randInt(r, 0, 2)]] : [["x", "y", "z", "w"][randInt(r, 0, 3)], randInt(r, 5, 8)])),
      });
    const R = rel("R", ["A", "B"], randInt(r, 3, 5), true);
    const S = rel("S", ["B", "C"], randInt(r, 3, 5), false);
    const J = naturalJoin(R, S);
    const perB = [...new Set(R.rows.map((x) => x[1]))]
      .sort()
      .map((b) => `${b}: ${R.rows.filter((x) => x[1] === b).length}×${S.rows.filter((x) => x[0] === b).length}`);
    return {
      id: `er-gen-join-${seed}`,
      topic: "er",
      kind: "numeric",
      prompt: "How many tuples are in the natural join R ⋈ S?",
      tables: [{ ...R, name: "R" }, { ...S, name: "S" }],
      answer: J.rows.length,
      unit: "tuples",
      explanation: `The join matches on the shared attribute B. For each B value, multiply the matching tuple counts in R and S (${perB.join(", ")}) and add them up: ${J.rows.length}. Tuples with no partner disappear.`,
      difficulty: 2,
      tags: joinSize.tags,
    };
  },
};

const NAMES = ["Ana", "Ben", "Cy", "Dee", "Eli", "Fay"];
const DEPTS = ["HR", "Ops", "Dev"];

/** "How many tuples does π_dept(σ_salary>k(Emp)) return?", evaluated by `select` and `project`. */
export const selectProject: Generator = {
  id: "er-gen-select-project",
  topic: "er",
  difficulty: 1,
  tags: ["relational algebra", "selection", "projection"],
  generate(seed) {
    const r = rng(seed);
    const people = shuffled(r, NAMES).slice(0, randInt(r, 4, 6));
    const emp: Relation = { name: "Emp", columns: ["name", "dept", "salary"], rows: people.map((n) => [n, DEPTS[randInt(r, 0, 2)], 10 * randInt(r, 3, 9)]) };
    const k = 10 * randInt(r, 3, 7);
    const sel = select(emp, (t) => (t.salary as number) > k);
    const out = project(sel, ["dept"]);
    return {
      id: `er-gen-select-project-${seed}`,
      topic: "er",
      kind: "numeric",
      prompt: `How many tuples does π_dept(σ_salary>${k}(Emp)) return?`,
      tables: [emp],
      answer: out.rows.length,
      unit: "tuples",
      explanation: `σ keeps the ${plural(sel.rows.length, "employee")} earning more than ${k}. π_dept then keeps each distinct department once${out.rows.length ? ` (${out.rows.map((x) => x[0]).join(", ")})` : ""}: relational algebra removes duplicates, so the answer is ${out.rows.length}.`,
      difficulty: 1,
      tags: selectProject.tags,
    };
  },
};

const COURSES = ["DB", "OS", "CN", "AI"];

/** "How many students are in Takes ÷ Req?", evaluated by `divide`. */
export const divisionSize: Generator = {
  id: "er-gen-division",
  topic: "er",
  difficulty: 3,
  tags: ["relational algebra", "division"],
  askedAt: "Division is the classic tough relational-algebra question.",
  generate(seed) {
    const r = rng(seed);
    const req = shuffled(r, COURSES).slice(0, randInt(r, 2, 3)).sort();
    const students = shuffled(r, NAMES).slice(0, randInt(r, 3, 4)).sort();
    const rows = students.flatMap((s) => COURSES.filter(() => r() < 0.6).map((c) => [s, c]));
    // Make sure at least one student takes every required course, and keep a near miss interesting.
    const star = students[randInt(r, 0, students.length - 1)];
    for (const c of req) if (!rows.some((x) => x[0] === star && x[1] === c)) rows.push([star, c]);
    const takes: Relation = { name: "Takes", columns: ["student", "course"], rows: rows.sort((a, b) => a[0].localeCompare(b[0]) || COURSES.indexOf(a[1]) - COURSES.indexOf(b[1])) };
    const reqRel: Relation = { name: "Req", columns: ["course"], rows: req.map((c) => [c]) };
    const out = divide(takes, reqRel);
    const winners = out.rows.map((x) => x[0]);
    return {
      id: `er-gen-division-${seed}`,
      topic: "er",
      kind: "numeric",
      prompt: "How many students are in Takes ÷ Req?",
      tables: [takes, reqRel],
      answer: out.rows.length,
      unit: "students",
      explanation: `Takes ÷ Req keeps the students who take every course in Req (${req.join(", ")}). Extra courses do not matter, but missing even one does. That leaves ${winners.join(", ")}: ${out.rows.length}.`,
      difficulty: 3,
      tags: divisionSize.tags,
      askedAt: divisionSize.askedAt,
    };
  },
};

export const ER_GENERATORS: Generator[] = [tableCount, joinSize, selectProject, divisionSize];

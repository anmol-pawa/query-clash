import type { Mission } from "../types";
import type { Question } from "./types";

/**
 * Classic interview SQL: the standard question bank, run against the arena database on PGlite.
 * Each entry is a Mission (so the SQL engine's verdict logic and both dialect solutions apply)
 * paired with a "sql" question. Tests check both dialect solutions agree.
 */
interface Entry {
  id: string;
  title: string;
  difficulty: 1 | 2 | 3;
  tags: string[];
  askedAt?: string;
  task: string;
  postgres: string;
  /** Oracle-flavoured answer; defaults to the PostgreSQL one when the syntax is shared. */
  oracle?: string;
  ordered?: boolean;
  explanation: string;
  hints: [string, string, string];
  tables: string[];
}

const ENTRIES: Entry[] = [
  {
    id: "nth-salary",
    title: "Nth highest salary",
    difficulty: 2,
    tags: ["window functions", "ranking"],
    askedAt: "The single most-asked SQL interview question.",
    task: "Return the **3rd highest distinct salary** among employees, as one column `salary`.",
    postgres: "SELECT salary FROM (SELECT DISTINCT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees) t WHERE rnk = 3",
    explanation:
      "DENSE_RANK numbers distinct salary values without gaps, so ties share a rank and rank 3 is the third distinct value. ROW_NUMBER would count tied rows separately, and RANK leaves gaps after ties. Without window functions: ORDER BY salary DESC OFFSET 2 ROWS FETCH FIRST 1 ROW ONLY over DISTINCT salaries.",
    hints: ["Ties matter: two people can share a salary.", "A ranking window function that does not skip numbers after ties.", "DENSE_RANK() OVER (ORDER BY salary DESC), then filter the rank in an outer query."],
    tables: ["employees"],
  },
  {
    id: "second-highest-no-window",
    title: "Second highest without windows",
    difficulty: 1,
    tags: ["subquery", "aggregates"],
    askedAt: "The follow-up: 'now do it without window functions'.",
    task: "Return the **second highest distinct salary** as a single value named `salary`, without using window functions or LIMIT/FETCH.",
    postgres: "SELECT MAX(salary) AS salary FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)",
    explanation:
      "The inner query finds the top salary; the outer MAX over everything below it is the runner-up. This handles ties automatically and returns NULL (not an error) if there is no second value, unlike LIMIT 1 OFFSET 1.",
    hints: ["Find the maximum first.", "Take the maximum of the salaries strictly below it.", "SELECT MAX(salary) … WHERE salary < (SELECT MAX(salary) …)"],
    tables: ["employees"],
  },
  {
    id: "duplicates",
    title: "Find duplicates",
    difficulty: 1,
    tags: ["group by", "having"],
    askedAt: "Asked in nearly every fresher screen.",
    task: "List every **city** that more than one customer lives in, with the number of customers as `n`.",
    postgres: "SELECT city, COUNT(*) AS n FROM customers GROUP BY city HAVING COUNT(*) > 1",
    explanation:
      "Group by the column that should be unique and keep the groups with HAVING COUNT(*) > 1. WHERE cannot filter on an aggregate because it runs before grouping. To delete the extras you would keep one row per group, e.g. the MIN(primary key).",
    hints: ["You need to count rows per city.", "Filtering on a count happens after grouping.", "GROUP BY city HAVING COUNT(*) > 1"],
    tables: ["customers"],
  },
  {
    id: "never-ordered",
    title: "Customers who never ordered",
    difficulty: 1,
    tags: ["anti-join", "null"],
    askedAt: "Tests whether you know the NOT IN / NULL trap.",
    task: "List the **names** of customers who have never placed an order, sorted alphabetically (column `name`).",
    postgres: "SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id) ORDER BY c.name",
    ordered: true,
    explanation:
      "NOT EXISTS (or LEFT JOIN … WHERE o.customer_id IS NULL) is the safe anti-join. NOT IN returns no rows at all if the subquery produces even one NULL, because x <> NULL is unknown.",
    hints: ["You want customers with no matching order row.", "NOT EXISTS with a correlated subquery, or a LEFT JOIN that keeps the unmatched rows.", "WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)"],
    tables: ["customers", "orders"],
  },
  {
    id: "empty-departments",
    title: "Departments with no staff",
    difficulty: 1,
    tags: ["outer join"],
    task: "List the **dept_name** of every department that has no employees (sorted).",
    postgres: "SELECT d.dept_name FROM departments d LEFT JOIN employees e ON e.dept_id = d.dept_id WHERE e.emp_id IS NULL ORDER BY d.dept_name",
    ordered: true,
    explanation:
      "A LEFT JOIN keeps every department; unmatched ones get NULL in the employee columns, which IS NULL on the employee key picks out. Test a column that can never be NULL in a real match (the primary key), not a nullable one.",
    hints: ["An inner join would drop the departments you want.", "Keep all departments, then keep only the rows where the employee side is missing.", "LEFT JOIN employees … WHERE e.emp_id IS NULL"],
    tables: ["departments", "employees"],
  },
  {
    id: "report-counts",
    title: "Managers and their reports",
    difficulty: 2,
    tags: ["self join", "group by"],
    askedAt: "The classic self-join question (employee / manager).",
    task: "List every manager's `last_name` with the number of **direct reports** as `reports`, sorted by last_name.",
    postgres: "SELECT m.last_name, COUNT(*) AS reports FROM employees e JOIN employees m ON e.manager_id = m.emp_id GROUP BY m.emp_id, m.last_name ORDER BY m.last_name",
    ordered: true,
    explanation:
      "Join the table to itself with two aliases: e is the employee, m the manager reached through manager_id. Grouping by the manager's key counts the reports per manager. The inner join drops employees with no manager and managers with no reports; use a LEFT JOIN from m to e to keep every employee with a zero count.",
    hints: ["The employee and the manager are rows of the same table.", "Alias employees twice, join on manager_id = emp_id, and group by the manager.", "JOIN employees m ON e.manager_id = m.emp_id GROUP BY m.emp_id, m.last_name"],
    tables: ["employees"],
  },
  {
    id: "top-per-dept",
    title: "Top 2 earners per department",
    difficulty: 2,
    tags: ["window functions", "top-N per group"],
    askedAt: "Top-N per group appears in almost every product-company round.",
    task: "For each department, list the employees ranked **1 or 2 by salary** using `RANK()` (ties share a rank). Return `dept_id`, `last_name`, `salary` ordered by dept_id, salary descending, last_name.",
    postgres:
      "SELECT dept_id, last_name, salary FROM (SELECT dept_id, last_name, salary, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk FROM employees WHERE dept_id IS NOT NULL) t WHERE rnk <= 2 ORDER BY dept_id, salary DESC, last_name",
    ordered: true,
    explanation:
      "PARTITION BY restarts the ranking in each department. A window function cannot appear in WHERE, so rank in a subquery and filter outside. Use ROW_NUMBER for exactly N rows, RANK to keep ties, DENSE_RANK to keep the top N distinct values.",
    hints: ["Rank inside each department, not over the whole table.", "RANK() OVER (PARTITION BY … ORDER BY …) in a subquery, filter outside.", "RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC), then WHERE rnk <= 2"],
    tables: ["employees"],
  },
  {
    id: "above-dept-avg",
    title: "Above the department average",
    difficulty: 2,
    tags: ["correlated subquery", "window functions"],
    task: "List employees who earn **more than the average salary of their own department**: `last_name`, sorted.",
    postgres: "SELECT e.last_name FROM employees e WHERE e.salary > (SELECT AVG(x.salary) FROM employees x WHERE x.dept_id = e.dept_id) ORDER BY e.last_name",
    ordered: true,
    explanation:
      "A correlated subquery recomputes the department average for each row. A window alternative is AVG(salary) OVER (PARTITION BY dept_id) in a subquery, which scans the table once. Employees with no department compare against NULL and drop out.",
    hints: ["Each employee is compared with their own department's average.", "A subquery that references the outer row's dept_id.", "WHERE salary > (SELECT AVG(salary) FROM employees x WHERE x.dept_id = e.dept_id)"],
    tables: ["employees"],
  },
  {
    id: "running-total",
    title: "Running balance",
    difficulty: 2,
    tags: ["window functions", "running total"],
    askedAt: "Cumulative sums are a staple of analytics interviews.",
    task: "For account **3**, list each transaction (`txn_id`, `amount`) with the **running total** of amount as `running`, in order of txn_date then txn_id.",
    postgres: "SELECT txn_id, amount, SUM(amount) OVER (ORDER BY txn_date, txn_id) AS running FROM transactions WHERE account_id = 3 ORDER BY txn_date, txn_id",
    ordered: true,
    explanation:
      "SUM() OVER (ORDER BY …) defaults to a frame from the first row to the current row. Add txn_id to break date ties: with RANGE framing, rows sharing the same date would all show the same total. Filter with WHERE first; windows run after it.",
    hints: ["A cumulative sum, not a group total.", "SUM(...) OVER with an ORDER BY and no PARTITION.", "SUM(amount) OVER (ORDER BY txn_date, txn_id)"],
    tables: ["transactions"],
  },
  {
    id: "month-over-month",
    title: "Month-over-month change",
    difficulty: 3,
    tags: ["window functions", "date bucketing", "lag"],
    askedAt: "Typical analytics-engineer question.",
    task: "Count orders per month (`month` as `YYYY-MM`, `orders`), plus `change` = this month's count minus the previous month's (NULL for the first month). Order by month.",
    postgres:
      "SELECT month, orders, orders - LAG(orders) OVER (ORDER BY month) AS change FROM (SELECT TO_CHAR(order_date, 'YYYY-MM') AS month, COUNT(*) AS orders FROM orders GROUP BY TO_CHAR(order_date, 'YYYY-MM')) t ORDER BY month",
    ordered: true,
    explanation:
      "Bucket the dates with TO_CHAR (both PostgreSQL and Oracle) or DATE_TRUNC (PostgreSQL) / TRUNC (Oracle), aggregate, then compare each row with the previous one using LAG. Aggregate in a subquery first: LAG sees the grouped rows.",
    hints: ["Two steps: count per month, then compare neighbours.", "TO_CHAR(order_date, 'YYYY-MM') makes the bucket; LAG looks one row back.", "Subquery with GROUP BY, outer query with LAG(orders) OVER (ORDER BY month)"],
    tables: ["orders"],
  },
  {
    id: "pivot-status",
    title: "Pivot with CASE",
    difficulty: 2,
    tags: ["pivot", "conditional aggregation"],
    askedAt: "Asked as 'turn rows into columns'.",
    task: "In one row, count orders by status as four columns: `delivered`, `shipped`, `pending`, `cancelled`.",
    postgres:
      "SELECT SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered, SUM(CASE WHEN status = 'SHIPPED' THEN 1 ELSE 0 END) AS shipped, SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled FROM orders",
    explanation:
      "Conditional aggregation is the portable pivot: each column sums a CASE that yields 1 for its category. PostgreSQL also has FILTER (COUNT(*) FILTER (WHERE …)) and the crosstab extension; Oracle has PIVOT. The column list must be known in advance.",
    hints: ["One output row, so aggregate the whole table.", "SUM over a CASE expression that returns 1 or 0.", "SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered, …"],
    tables: ["orders"],
  },
  {
    id: "latest-order",
    title: "Latest order per customer",
    difficulty: 2,
    tags: ["window functions", "top-N per group"],
    task: "For each customer who has ordered, return `customer_id` and the `order_id` of their **most recent order** (latest order_date, then highest order_id). Order by customer_id.",
    postgres:
      "SELECT customer_id, order_id FROM (SELECT customer_id, order_id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, order_id DESC) AS rn FROM orders) t WHERE rn = 1 ORDER BY customer_id",
    ordered: true,
    explanation:
      "ROW_NUMBER with a full tie-break returns exactly one row per customer. Joining to MAX(order_date) instead would return several rows when a customer ordered twice on the latest day.",
    hints: ["One row per customer, the newest order.", "ROW_NUMBER partitioned by customer, newest first.", "ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, order_id DESC) = 1"],
    tables: ["orders"],
  },
  {
    id: "islands",
    title: "Gaps and islands",
    difficulty: 3,
    tags: ["window functions", "gaps and islands"],
    askedAt: "The hard-mode window question at senior screens.",
    task: "Group `emp_id` values into runs of consecutive numbers (islands). Return `first_id` and `last_id` of each island, ordered by first_id.",
    postgres:
      "SELECT MIN(emp_id) AS first_id, MAX(emp_id) AS last_id FROM (SELECT emp_id, emp_id - ROW_NUMBER() OVER (ORDER BY emp_id) AS grp FROM employees) t GROUP BY grp ORDER BY first_id",
    ordered: true,
    explanation:
      "Within a run of consecutive numbers, id minus row_number is constant, and it jumps whenever there is a gap. Grouping by that difference isolates each island; MIN and MAX give its ends. For dates, subtract the row number as a number of days.",
    hints: ["Within an island, id and position grow together.", "Subtract ROW_NUMBER() from the id: the result is the same for the whole island.", "GROUP BY (emp_id - ROW_NUMBER() OVER (ORDER BY emp_id)) in a subquery, then MIN/MAX"],
    tables: ["employees"],
  },
  {
    id: "above-company-avg",
    title: "Departments above the company average",
    difficulty: 2,
    tags: ["having", "subquery"],
    task: "List departments (`dept_id`) whose **average salary is above the overall average salary**, with `avg_salary` rounded to 2 decimals, ordered by dept_id.",
    postgres:
      "SELECT dept_id, ROUND(AVG(salary), 2) AS avg_salary FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id HAVING AVG(salary) > (SELECT AVG(salary) FROM employees) ORDER BY dept_id",
    ordered: true,
    explanation:
      "HAVING filters groups after aggregation and can hold a scalar subquery. The subquery has no correlation, so it runs once. WHERE would fail here because AVG is not available before grouping.",
    hints: ["Compare a group aggregate to a whole-table aggregate.", "Filter groups with HAVING and put the overall average in a subquery.", "HAVING AVG(salary) > (SELECT AVG(salary) FROM employees)"],
    tables: ["employees"],
  },
];

export const SQL_MISSIONS: Mission[] = ENTRIES.map((e) => ({
  id: `iq-${e.id}`,
  title: e.title,
  taunt: "",
  task: e.task,
  ordered: e.ordered,
  solution: { postgres: e.postgres, oracle: e.oracle ?? e.postgres },
  hints: e.hints,
  codex: [],
  tables: e.tables,
}));

export const SQL: Question[] = ENTRIES.map((e) => ({
  id: `sql-${e.id}`,
  topic: "sql",
  kind: "sql",
  prompt: e.task.replace(/\*\*/g, "").replace(/`/g, ""),
  missionId: `iq-${e.id}`,
  solution: e.postgres,
  explanation: e.explanation,
  difficulty: e.difficulty,
  tags: e.tags,
  askedAt: e.askedAt,
}));

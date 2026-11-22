import type { Chapter, Mission } from "../types";

const same = (sql: string) => ({ postgres: sql, oracle: sql });

/**
 * Chapter 13, "Window functions mastery". Wired into `CHAPTERS` as chapter 13 (PANEWARDEN).
 * Every solution is plain ANSI window SQL that runs unchanged on PostgreSQL and Oracle.
 * Several missions carry hidden rows (ties, odd bucket sizes) that expose the classic wrong answer.
 */
export const WINDOW_MISSIONS: Mission[] = [
  {
    id: "c13-running-rows",
    title: "The Tie That Binds",
    taunt: "Two deposits on one day? Your running balance will add both at once. Watch.",
    task: "For accounts 1 to 3, list `account_id`, `txn_id`, `amount` and a column `balance`: the running total of `amount` per account in the order `txn_date`, `txn_id`. Each row must show the balance as of that row only. Sort by `account_id`, `txn_date`, `txn_id`.",
    hidden: "INSERT INTO transactions (txn_id, account_id, txn_date, amount, txn_type) VALUES (9001, 1, DATE '2024-02-01', 100, 'DEPOSIT'), (9002, 1, DATE '2024-02-01', 50, 'DEPOSIT');",
    solution: same("SELECT account_id, txn_id, amount, SUM(amount) OVER (PARTITION BY account_id ORDER BY txn_date, txn_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance FROM transactions WHERE account_id <= 3 ORDER BY account_id, txn_date, txn_id"),
    ordered: true,
    hints: [
      "With ORDER BY and no frame, the default is RANGE: rows with the same ORDER BY value (peers) enter the frame together.",
      "Break the tie with a unique key (`txn_id`) and ask for a ROWS frame, which counts physical rows.",
      "SUM(amount) OVER (PARTITION BY account_id ORDER BY txn_date, txn_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)",
    ],
    codex: ["window-frames", "running-totals"],
    tables: ["transactions"],
  },
  {
    id: "c13-last-value",
    title: "The Frame Ends Here",
    taunt: "LAST_VALUE of the department? It is just the current row. The frame stops at you.",
    task: "For employees in departments 20 and 30, list `emp_id`, `dept_id`, `salary` and `top_salary`: the highest salary in the employee's department, obtained with `LAST_VALUE` over salary order. Sort by `emp_id`.",
    solution: same("SELECT emp_id, dept_id, salary, LAST_VALUE(salary) OVER (PARTITION BY dept_id ORDER BY salary ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS top_salary FROM employees WHERE dept_id IN (20, 30) ORDER BY emp_id"),
    ordered: true,
    hints: [
      "The default frame ends at the current row (and its peers), so LAST_VALUE just returns this row's own salary.",
      "Widen the frame to the whole partition: ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING.",
      "LAST_VALUE(salary) OVER (PARTITION BY dept_id ORDER BY salary ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)",
    ],
    codex: ["last-value-trap", "window-frames"],
    tables: ["employees"],
  },
  {
    id: "c13-moving-average",
    title: "Three-Step Smoothing",
    taunt: "A moving average needs a frame, not a guess. Include the rows you have, no more.",
    task: "For accounts 1 to 3 list `account_id`, `txn_id` and `avg3`: the average `amount` of the current transaction and the two before it in `txn_date`, `txn_id` order within the account, rounded to 2 decimals. The first rows of an account average whatever rows exist. Sort by `account_id`, `txn_date`, `txn_id`.",
    solution: same("SELECT account_id, txn_id, ROUND(AVG(amount) OVER (PARTITION BY account_id ORDER BY txn_date, txn_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS avg3 FROM transactions WHERE account_id <= 3 ORDER BY account_id, txn_date, txn_id"),
    ordered: true,
    hints: [
      "ROWS BETWEEN 2 PRECEDING AND CURRENT ROW is a 3-row window. Near the start of a partition it is simply smaller.",
      "AVG ignores the missing rows, so no special case for the first two rows is needed.",
      "ROUND(AVG(amount) OVER (PARTITION BY account_id ORDER BY txn_date, txn_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)",
    ],
    codex: ["window-frames"],
    tables: ["transactions"],
  },
  {
    id: "c13-range-days",
    title: "Thirty Days, Not Thirty Rows",
    taunt: "You counted rows. I asked for days. Quiet months fool a ROWS frame every time.",
    task: "For accounts 1 to 3 list `account_id`, `txn_id` and `last30`: the sum of `amount` over transactions of the same account dated within the 30 days up to and including the current row's date (the date and the 29 days before it). Use a RANGE frame over a day number. Sort by `account_id`, `txn_date`, `txn_id`.",
    solution: same("SELECT account_id, txn_id, SUM(amount) OVER (PARTITION BY account_id ORDER BY day_no RANGE BETWEEN 29 PRECEDING AND CURRENT ROW) AS last30 FROM (SELECT account_id, txn_id, txn_date, amount, txn_date - DATE '2024-01-01' AS day_no FROM transactions WHERE account_id <= 3) t ORDER BY account_id, txn_date, txn_id"),
    ordered: true,
    hints: [
      "ROWS counts neighbouring rows; RANGE compares values of the ORDER BY key. Make the key a number of days so RANGE can say `29 PRECEDING`.",
      "A date minus a date is a number of days in both PostgreSQL and Oracle, so the same frame works in both.",
      "SUM(amount) OVER (PARTITION BY account_id ORDER BY day_no RANGE BETWEEN 29 PRECEDING AND CURRENT ROW), where day_no = txn_date - DATE '2024-01-01' comes from a subquery.",
    ],
    codex: ["window-frames"],
    tables: ["transactions"],
  },
  {
    id: "c13-ntile",
    title: "Even Slices",
    taunt: "Four equal quartiles? With 26 rows? Somebody gets the leftovers.",
    task: "Split all employees into 4 salary quartiles with `NTILE`: quartile 1 holds the highest salaries. List `emp_id`, `salary` and `quartile`, ordering the buckets by `salary` descending then `emp_id`. Sort by `salary` descending, `emp_id`.",
    solution: same("SELECT emp_id, salary, NTILE(4) OVER (ORDER BY salary DESC, emp_id) AS quartile FROM employees ORDER BY salary DESC, emp_id"),
    ordered: true,
    hints: [
      "NTILE(n) deals rows into n buckets. When the count does not divide evenly, the first buckets get one extra row each.",
      "A hand-made formula such as CEIL(row_number * 4 / count) puts the boundaries in different places for uneven counts.",
      "NTILE(4) OVER (ORDER BY salary DESC, emp_id)",
    ],
    codex: ["ntile-cume-dist"],
    tables: ["employees"],
  },
  {
    id: "c13-cume-dist",
    title: "Where Do You Stand?",
    taunt: "ROW_NUMBER over COUNT is not a percentile when salaries tie. Ties share a rank.",
    task: "For employees of department 20 list `emp_id`, `salary`, `pct_rank` (`PERCENT_RANK` by salary ascending, rounded to 3 decimals) and `cume` (`CUME_DIST` by salary ascending, rounded to 3 decimals). Sort by `salary`, `emp_id`.",
    solution: same("SELECT emp_id, salary, ROUND(CAST(PERCENT_RANK() OVER (ORDER BY salary) AS NUMERIC), 3) AS pct_rank, ROUND(CAST(CUME_DIST() OVER (ORDER BY salary) AS NUMERIC), 3) AS cume FROM employees WHERE dept_id = 20 ORDER BY salary, emp_id"),
    ordered: true,
    hints: [
      "PERCENT_RANK = (rank - 1) / (rows - 1), so the lowest value is 0. CUME_DIST = rows at or below this value / total rows, so the highest is 1.",
      "Both give tied rows the same value. Filter the department in WHERE: the window only sees department 20's rows.",
      "ROUND(CAST(PERCENT_RANK() OVER (ORDER BY salary) AS NUMERIC), 3) and the same with CUME_DIST()",
    ],
    codex: ["ntile-cume-dist"],
    tables: ["employees"],
  },
  {
    id: "c13-lag-default",
    title: "First Step Free",
    taunt: "LAG on the first row gives NULL, and NULL poisons the subtraction. Give it a default.",
    task: "For every transaction list `txn_id`, `account_id` and `gap_days`: the days since the same account's previous transaction (ordered by `txn_date`, `txn_id`). An account's first transaction has a gap of 0. Use the default argument of `LAG`. Sort by `account_id`, `txn_date`, `txn_id`.",
    solution: same("SELECT txn_id, account_id, txn_date - LAG(txn_date, 1, txn_date) OVER (PARTITION BY account_id ORDER BY txn_date, txn_id) AS gap_days FROM transactions ORDER BY account_id, txn_date, txn_id"),
    ordered: true,
    hints: [
      "LAG(expr, offset, default) returns the default when there is no row that far back. Using the row's own date as the default makes the first gap 0.",
      "PARTITION BY account_id keeps one account's last transaction from becoming another account's 'previous' one.",
      "txn_date - LAG(txn_date, 1, txn_date) OVER (PARTITION BY account_id ORDER BY txn_date, txn_id)",
    ],
    codex: ["lag-lead"],
    tables: ["transactions"],
  },
  {
    id: "c13-top-two-ties",
    title: "Podium With a Tie",
    taunt: "Top two per department, you said. ROW_NUMBER picks two bodies and shrugs at the tie.",
    task: "List `dept_id`, `last_name` and `salary` for every employee who has one of the two highest distinct salaries in their department, so people tied on a salary are all included. Ignore employees without a department. Sort by `dept_id`, `salary` descending, `last_name`.",
    hidden: "INSERT INTO employees (emp_id, first_name, last_name, salary, hire_date, dept_id) VALUES (900, 'Tie', 'Twin', 150000, DATE '2024-01-02', 20);",
    solution: same("SELECT dept_id, last_name, salary FROM (SELECT dept_id, last_name, salary, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS r FROM employees WHERE dept_id IS NOT NULL) t WHERE r <= 2 ORDER BY dept_id, salary DESC, last_name"),
    ordered: true,
    hints: [
      "ROW_NUMBER hands out exactly N rows and picks a tied row arbitrarily; DENSE_RANK gives tied rows the same number with no gaps.",
      "Window functions cannot be filtered in the same SELECT: rank in a subquery, then keep r <= 2.",
      "SELECT … FROM (SELECT …, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS r FROM employees WHERE dept_id IS NOT NULL) t WHERE r <= 2",
    ],
    codex: ["top-n-per-group", "ranking"],
    tables: ["employees"],
  },
];

/** Plausible wrong queries per mission, used by tests to prove the trap (each must fail the mission). */
export const WINDOW_NAIVE: Record<string, string> = {
  "c13-running-rows": "SELECT account_id, txn_id, amount, SUM(amount) OVER (PARTITION BY account_id ORDER BY txn_date) AS balance FROM transactions WHERE account_id <= 3 ORDER BY account_id, txn_date, txn_id",
  "c13-last-value": "SELECT emp_id, dept_id, salary, LAST_VALUE(salary) OVER (PARTITION BY dept_id ORDER BY salary) AS top_salary FROM employees WHERE dept_id IN (20, 30) ORDER BY emp_id",
  "c13-moving-average": "SELECT account_id, txn_id, ROUND(AVG(amount) OVER (PARTITION BY account_id ORDER BY txn_date, txn_id ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING), 2) AS avg3 FROM transactions WHERE account_id <= 3 ORDER BY account_id, txn_date, txn_id",
  "c13-range-days": "SELECT account_id, txn_id, SUM(amount) OVER (PARTITION BY account_id ORDER BY txn_date, txn_id ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) AS last30 FROM transactions WHERE account_id <= 3 ORDER BY account_id, txn_date, txn_id",
  "c13-ntile": "SELECT emp_id, salary, CEIL(ROW_NUMBER() OVER (ORDER BY salary DESC, emp_id) * 4.0 / COUNT(*) OVER ()) AS quartile FROM employees ORDER BY salary DESC, emp_id",
  "c13-cume-dist": "SELECT emp_id, salary, ROUND(CAST(PERCENT_RANK() OVER (ORDER BY salary) AS NUMERIC), 3) AS pct_rank, ROUND(CAST(ROW_NUMBER() OVER (ORDER BY salary) * 1.0 / COUNT(*) OVER () AS NUMERIC), 3) AS cume FROM employees WHERE dept_id = 20 ORDER BY salary, emp_id",
  "c13-lag-default": "SELECT txn_id, account_id, COALESCE(txn_date - LAG(txn_date) OVER (ORDER BY txn_date, txn_id), 0) AS gap_days FROM transactions ORDER BY account_id, txn_date, txn_id",
  "c13-top-two-ties": "SELECT dept_id, last_name, salary FROM (SELECT dept_id, last_name, salary, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS r FROM employees WHERE dept_id IS NOT NULL) t WHERE r <= 2 ORDER BY dept_id, salary DESC, last_name",
};

export const CHAPTERS_13: Chapter[] = [
  {
    n: 13,
    boss: "panewarden",
    bossName: "PANEWARDEN",
    bossTitle: "Owl-Sage of the Sliding Window",
    title: "The Glasshouse of Windows",
    topics: ["Window frames", "ROWS vs RANGE", "LAST_VALUE trap", "NTILE and PERCENT_RANK", "LAG and LEAD", "Top-N per group"],
    intro:
      "Under a roof of amber glass lives an owl who never loses sight of a row's neighbours. PANEWARDEN slides a pane across your data and sees only what falls inside it. Learn where the frame starts and ends, and every running total, moving average and ranking becomes yours to bend.",
    defeat: "PANEWARDEN lowers its pane. You know your frames, your ties and your partitions, and no window can hide a row from you now.",
    color: "#f59e0b",
    missions: WINDOW_MISSIONS,
  },
];

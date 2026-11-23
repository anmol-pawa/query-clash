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

/* ------------------------------------------------------------------------------------------------
 * Chapter 14, "Recursive CTEs and graphs" (missions only; not yet in CHAPTERS, that is J2c).
 * Each mission builds its own small table in `setup` (raw PostgreSQL), so the hierarchy or graph is
 * visible in the task text. The Oracle form is the same statement without the RECURSIVE keyword.
 * Oracle forbids UNION (only UNION ALL) in the recursive member, so every guard here is a path
 * string checked with LIKE, which is portable to both engines.
 * ---------------------------------------------------------------------------------------------- */

const recursive = (sql: string) => ({ postgres: sql.replace(/^WITH /, "WITH RECURSIVE "), oracle: sql });

export const RECURSIVE_MISSIONS: Mission[] = [
  {
    id: "c14-bom",
    title: "Parts Explosion",
    taunt: "One bike, a hundred bolts hidden three levels down. Multiply your way to them.",
    task: "The table `bom(parent, child, qty)` lists which part contains how many of which child part. How many of each **raw part** (a part that is never a `parent`) does one `'BIKE'` need in total, counting everything inside sub-assemblies? Return `part` and `total_qty`, sorted by `part`.",
    setup:
      "CREATE TABLE bom (parent VARCHAR(20), child VARCHAR(20), qty INTEGER);\nINSERT INTO bom VALUES ('BIKE','FRAME',1),('BIKE','WHEEL',2),('FRAME','TUBE',3),('FRAME','BOLT',4),('WHEEL','RIM',1),('WHEEL','SPOKE',32),('WHEEL','HUB',1),('HUB','BOLT',6);",
    hidden: "INSERT INTO bom VALUES ('BIKE','SEAT',1),('SEAT','BOLT',4);",
    solution: recursive(
      "WITH parts (part, qty) AS (SELECT child, qty FROM bom WHERE parent = 'BIKE' UNION ALL SELECT b.child, p.qty * b.qty FROM bom b JOIN parts p ON b.parent = p.part) SELECT part, SUM(qty) AS total_qty FROM parts WHERE part NOT IN (SELECT parent FROM bom) GROUP BY part ORDER BY part",
    ),
    ordered: true,
    hints: [
      "Carry a running quantity down the tree: a child's quantity is its parent's quantity times the `qty` on the link.",
      "The same raw part can be reached through several sub-assemblies. Add the quantities from every path with SUM, and use UNION ALL so two equal rows from different paths both count.",
      "WITH parts (part, qty) AS (SELECT child, qty FROM bom WHERE parent = 'BIKE' UNION ALL SELECT b.child, p.qty * b.qty FROM bom b JOIN parts p ON b.parent = p.part) SELECT part, SUM(qty) … WHERE part NOT IN (SELECT parent FROM bom) GROUP BY part",
    ],
    codex: ["bom-rollup", "recursive-cte"],
    tables: [],
  },
  {
    id: "c14-reach",
    title: "Round and Round",
    taunt: "Follow the links and they lead back to where you started. Loop forever, little query.",
    task: "The table `links(src, dst)` records who follows whom, and it contains a loop. Which accounts can account **1** reach by following links, directly or through others? Return each reachable `node` once (account 1 is not reachable from itself here), sorted by `node`. Your query must terminate despite the loop.",
    setup:
      "CREATE TABLE links (src INTEGER, dst INTEGER);\nINSERT INTO links VALUES (1,2),(1,3),(2,4),(3,4),(4,5),(5,2),(6,7);",
    hidden: "INSERT INTO links VALUES (5,8),(8,9);",
    solution: recursive(
      "WITH reach (node, trail) AS (SELECT dst, ',1,' || dst || ',' FROM links WHERE src = 1 UNION ALL SELECT l.dst, r.trail || l.dst || ',' FROM links l JOIN reach r ON l.src = r.node WHERE r.trail NOT LIKE '%,' || l.dst || ',%') SELECT DISTINCT node FROM reach ORDER BY node",
    ),
    ordered: true,
    hints: [
      "Without a guard, 2 → 4 → 5 → 2 → 4 → 5 … never ends. The recursion must remember where it has been.",
      "Carry a `trail` string such as ',1,2,4,' and only step to a node whose ',id,' is not in it. LIKE works in both PostgreSQL and Oracle.",
      "WITH reach (node, trail) AS (SELECT dst, ',1,' || dst || ',' … UNION ALL SELECT l.dst, r.trail || l.dst || ',' … WHERE r.trail NOT LIKE '%,' || l.dst || ',%') SELECT DISTINCT node …",
    ],
    codex: ["recursive-cycle-guard", "recursive-cte"],
    tables: [],
  },
  {
    id: "c14-shortest",
    title: "The Cheapest Road",
    taunt: "Many roads lead to the same town. Count the kilometres, not the turns.",
    task: "The table `roads(src, dst, km)` holds one-way roads, and one of them leads back to the start. For every town reachable from `'A'`, return `node` and `dist`: the length of the **shortest** route in kilometres. Leave `'A'` itself out. Sort by `node`.",
    setup:
      "CREATE TABLE roads (src VARCHAR(5), dst VARCHAR(5), km INTEGER);\nINSERT INTO roads VALUES ('A','B',4),('A','C',2),('C','B',1),('B','D',5),('C','D',10),('D','E',3),('E','A',1);",
    solution: recursive(
      "WITH walk (node, dist, trail) AS (SELECT dst, km, ',A,' || dst || ',' FROM roads WHERE src = 'A' UNION ALL SELECT r.dst, w.dist + r.km, w.trail || r.dst || ',' FROM roads r JOIN walk w ON r.src = w.node WHERE w.trail NOT LIKE '%,' || r.dst || ',%') SELECT node, MIN(dist) AS dist FROM walk WHERE node <> 'A' GROUP BY node ORDER BY node",
    ),
    ordered: true,
    hints: [
      "Enumerate every loop-free route with a trail guard, adding the kilometres as you go, then keep the minimum per town.",
      "The fewest turns is not the fewest kilometres: A to D is 2 roads via C directly but 3 roads via B for a shorter total.",
      "WITH walk (node, dist, trail) AS (… UNION ALL SELECT r.dst, w.dist + r.km, w.trail || r.dst || ',' … WHERE w.trail NOT LIKE …) SELECT node, MIN(dist) … GROUP BY node",
    ],
    codex: ["recursive-cycle-guard", "recursive-cte"],
    tables: [],
  },
  {
    id: "c14-calendar",
    title: "Days Without Visitors",
    taunt: "Group by day and the quiet days vanish from your report. Silence is data too.",
    task: "The table `visits(visit_id, visit_day)` has one row per visit, with some quiet days. Return one row for **every** day from `2024-03-01` to `2024-03-10` inclusive: `cal_day` and `visits` (0 on quiet days). Generate the days with a recursive CTE. Sort by `cal_day`.",
    setup:
      "CREATE TABLE visits (visit_id INTEGER PRIMARY KEY, visit_day DATE);\nINSERT INTO visits VALUES (1,DATE '2024-03-01'),(2,DATE '2024-03-01'),(3,DATE '2024-03-02'),(4,DATE '2024-03-04'),(5,DATE '2024-03-04'),(6,DATE '2024-03-04'),(7,DATE '2024-03-07'),(8,DATE '2024-03-10');",
    hidden: "INSERT INTO visits VALUES (9,DATE '2024-02-27'),(10,DATE '2024-03-12');",
    solution: {
      postgres:
        "WITH RECURSIVE cal (cal_day) AS (SELECT DATE '2024-03-01' UNION ALL SELECT cal_day + 1 FROM cal WHERE cal_day < DATE '2024-03-10') SELECT c.cal_day, COUNT(v.visit_id) AS visits FROM cal c LEFT JOIN visits v ON v.visit_day = c.cal_day GROUP BY c.cal_day ORDER BY c.cal_day",
      oracle:
        "WITH cal (cal_day) AS (SELECT DATE '2024-03-01' FROM dual UNION ALL SELECT cal_day + 1 FROM cal WHERE cal_day < DATE '2024-03-10') SELECT c.cal_day, COUNT(v.visit_id) AS visits FROM cal c LEFT JOIN visits v ON v.visit_day = c.cal_day GROUP BY c.cal_day ORDER BY c.cal_day",
    },
    ordered: true,
    hints: [
      "A table that only contains days with visits cannot list the days without. Build a calendar first, then LEFT JOIN the visits onto it.",
      "Anchor: the first date. Recursive step: previous date + 1, stopping at the last date. `date + 1` adds one day in both PostgreSQL and Oracle. Use COUNT(v.visit_id), not COUNT(*), or an empty day counts as 1.",
      "WITH RECURSIVE cal (cal_day) AS (SELECT DATE '2024-03-01' UNION ALL SELECT cal_day + 1 FROM cal WHERE cal_day < DATE '2024-03-10') SELECT c.cal_day, COUNT(v.visit_id) … LEFT JOIN … GROUP BY c.cal_day",
    ],
    codex: ["recursive-series", "recursive-cte"],
    tables: [],
  },
  {
    id: "c14-closure",
    title: "Every Prerequisite",
    taunt: "You listed the direct prerequisites. I asked for all of them, however deep, once each.",
    task: "The table `prereqs(course, needs)` lists direct prerequisites. Return every pair `course`, `needs` that holds directly or through a chain of prerequisites (the transitive closure), each pair exactly once. Sort by `course`, `needs`.",
    setup:
      "CREATE TABLE prereqs (course VARCHAR(10), needs VARCHAR(10));\nINSERT INTO prereqs VALUES ('ALGO','DS'),('DS','PROG'),('DB','DS'),('DB','SQL1'),('OS','PROG'),('OS','ARCH');",
    hidden: "INSERT INTO prereqs VALUES ('SQL1','PROG');",
    solution: recursive(
      "WITH closure (course, req) AS (SELECT course, needs FROM prereqs UNION ALL SELECT c.course, p.needs FROM closure c JOIN prereqs p ON p.course = c.req) SELECT DISTINCT course, req AS needs FROM closure ORDER BY course, needs",
    ),
    ordered: true,
    hints: [
      "Anchor: the direct pairs. Recursive step: if course C needs R and R needs X, then C needs X.",
      "When two chains reach the same prerequisite (a diamond), the recursion produces the pair twice. Deduplicate in the final SELECT with DISTINCT: Oracle does not allow UNION in the recursive member.",
      "WITH closure (course, req) AS (SELECT course, needs FROM prereqs UNION ALL SELECT c.course, p.needs FROM closure c JOIN prereqs p ON p.course = c.req) SELECT DISTINCT course, req … ",
    ],
    codex: ["transitive-closure", "recursive-cte"],
    tables: [],
  },
  {
    id: "c14-loop-finder",
    title: "Who Reports to Themselves?",
    taunt: "A boss of a boss of a boss of… themselves. My data has loops. Find them all.",
    task: "In `staff(emp, boss)` every person has one boss (the CEO has none), but bad data created reporting loops. Return the `emp` of everyone who sits **on** a loop, meaning following boss links eventually returns to them. People who merely report into a loop are not on it. Sort by `emp`.",
    setup:
      "CREATE TABLE staff (emp INTEGER PRIMARY KEY, boss INTEGER);\nINSERT INTO staff VALUES (1,NULL),(2,1),(3,2),(4,3),(5,6),(6,7),(7,5),(8,5);",
    hidden: "INSERT INTO staff VALUES (11,12),(12,13),(13,14),(14,11);",
    solution: recursive(
      "WITH walk (origin, cur, trail) AS (SELECT emp, boss, ',' || emp || ',' || boss || ',' FROM staff WHERE boss IS NOT NULL UNION ALL SELECT w.origin, s.boss, w.trail || s.boss || ',' FROM walk w JOIN staff s ON s.emp = w.cur WHERE s.boss IS NOT NULL AND w.cur <> w.origin AND (s.boss = w.origin OR w.trail NOT LIKE '%,' || s.boss || ',%')) SELECT DISTINCT origin AS emp FROM walk WHERE cur = origin ORDER BY emp",
    ),
    ordered: true,
    hints: [
      "Start a walk from every person and follow `boss` links. A person is on a loop exactly when their own walk comes back to them.",
      "Stop a walk when it returns to its origin, and refuse to step onto a node already in the trail unless that node is the origin. That also stops walks that enter someone else's loop.",
      "Anchor: (emp, boss, trail). Recursive: join staff on s.emp = w.cur, keep s.boss = w.origin OR w.trail NOT LIKE '%,' || s.boss || ',%', and finish with SELECT DISTINCT origin … WHERE cur = origin",
    ],
    codex: ["recursive-cycle-guard", "recursive-cte"],
    tables: [],
  },
];

/** Plausible wrong queries per mission, used by tests to prove the trap (each must fail the mission). */
export const RECURSIVE_NAIVE: Record<string, string> = {
  "c14-bom":
    "WITH RECURSIVE parts (part, qty) AS (SELECT child, qty FROM bom WHERE parent = 'BIKE' UNION SELECT b.child, p.qty * b.qty FROM bom b JOIN parts p ON b.parent = p.part) SELECT part, SUM(qty) AS total_qty FROM parts WHERE part NOT IN (SELECT parent FROM bom) GROUP BY part ORDER BY part",
  "c14-reach":
    "WITH RECURSIVE reach (node, depth) AS (SELECT dst, 1 FROM links WHERE src = 1 UNION ALL SELECT l.dst, r.depth + 1 FROM links l JOIN reach r ON l.src = r.node WHERE r.depth < 3) SELECT DISTINCT node FROM reach ORDER BY node",
  "c14-shortest":
    "WITH RECURSIVE walk (node, dist, hops, trail) AS (SELECT dst, km, 1, ',A,' || dst || ',' FROM roads WHERE src = 'A' UNION ALL SELECT r.dst, w.dist + r.km, w.hops + 1, w.trail || r.dst || ',' FROM roads r JOIN walk w ON r.src = w.node WHERE w.trail NOT LIKE '%,' || r.dst || ',%') SELECT node, (SELECT x.dist FROM walk x WHERE x.node = w.node ORDER BY x.hops, x.dist LIMIT 1) AS dist FROM walk w WHERE node <> 'A' GROUP BY node ORDER BY node",
  "c14-calendar":
    "WITH RECURSIVE cal (cal_day) AS (SELECT MIN(visit_day) FROM visits UNION ALL SELECT cal_day + 1 FROM cal WHERE cal_day < (SELECT MAX(visit_day) FROM visits)) SELECT c.cal_day, COUNT(v.visit_id) AS visits FROM cal c LEFT JOIN visits v ON v.visit_day = c.cal_day GROUP BY c.cal_day ORDER BY c.cal_day",
  "c14-closure":
    "WITH RECURSIVE closure (course, req) AS (SELECT course, needs FROM prereqs UNION ALL SELECT c.course, p.needs FROM closure c JOIN prereqs p ON p.course = c.req) SELECT course, req AS needs FROM closure ORDER BY course, needs",
  "c14-loop-finder":
    "SELECT DISTINCT a.emp FROM staff a JOIN staff b ON b.emp = a.boss JOIN staff c ON c.emp = b.boss WHERE c.boss = a.emp ORDER BY a.emp",
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

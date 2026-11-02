import type { Question } from "./types";

/** Recursive CTE fine print: what each iteration sees, row counts, cycles, and the Oracle/PostgreSQL syntax difference. */
export const RECURSIVE_FINE: Question[] = [
  {
    id: "recfine-working-table",
    topic: "query",
    kind: "mcq",
    prompt: "In a recursive CTE, what rows does the recursive member read from the CTE on each iteration?",
    choices: [
      "Only the rows produced by the previous iteration",
      "Every row produced so far, anchor and all earlier iterations",
      "Only the anchor rows, every time",
      "The final result, which it must already know",
    ],
    answer: 0,
    explanation: "The recursive member sees just the rows the previous step added (the 'working table'); the engine appends each step's output to the result and stops when a step produces no rows. That is why a tree walk adds one level per iteration, and why a recursive member that returns the same rows again never stops.",
    difficulty: 2,
    tags: ["recursive cte", "iteration"],
    askedAt: "Org-chart and category-tree questions in SQL rounds",
  },
  {
    id: "recfine-row-count",
    topic: "query",
    kind: "numeric",
    prompt: "WITH RECURSIVE t(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM t WHERE n < 5) SELECT * FROM t; How many rows does this return?",
    answer: 5,
    explanation: "The anchor gives n = 1, then each iteration adds n + 1 while the previous n was below 5: 2, 3, 4, 5. The row with n = 5 produces nothing (5 < 5 is false), so the recursion ends after 5 rows. Forgetting the WHERE n < 5 guard is the classic infinite loop.",
    difficulty: 1,
    tags: ["recursive cte", "termination", "number series"],
  },
  {
    id: "recfine-cycle",
    topic: "query",
    kind: "mcq",
    prompt: "A recursive CTE walks a graph of edges that contains a cycle (A -> B -> A). The query carries the visited path as a column. What is the standard fix to stop it looping forever?",
    choices: [
      "Skip any edge whose target is already in the path, or use the CYCLE clause",
      "Change UNION ALL to INTERSECT",
      "Add ORDER BY to the recursive member",
      "Nothing: the engine detects cycles on its own",
    ],
    answer: 0,
    explanation: "Neither engine detects cycles by itself. Track the path (an array in PostgreSQL, a string in Oracle) and refuse to step onto a node already visited, or use the SQL-standard CYCLE clause (PostgreSQL 14 and later, and Oracle). Switching to UNION would only help if rows repeat exactly, which a growing path column prevents. As of October 2026.",
    difficulty: 3,
    tags: ["recursive cte", "cycles", "graph"],
    askedAt: "Follow-up on 'find all reachable nodes' questions",
  },
  {
    id: "recfine-oracle-keyword",
    topic: "query",
    kind: "truefalse",
    prompt: "True or false: Oracle needs the RECURSIVE keyword after WITH to write a recursive CTE, just as PostgreSQL does.",
    answer: false,
    explanation: "False. PostgreSQL requires WITH RECURSIVE; Oracle's recursive subquery factoring is written as plain WITH name (columns) AS (anchor UNION ALL recursive member) and rejects the extra keyword. Oracle also has its older CONNECT BY syntax for hierarchies.",
    difficulty: 2,
    tags: ["recursive cte", "Oracle", "PostgreSQL"],
  },
];

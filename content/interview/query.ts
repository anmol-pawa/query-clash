import type { Generator, Question } from "./types";
import type { Relation } from "@/lib/dbms/algebra";
import {
  allJoinTrees,
  blockNestedBest,
  blockNestedTransfers,
  blocksFor,
  equalitySize,
  hashJoinTransfers,
  hashNeedsRecursion,
  hashPartitions,
  joinSize,
  leftDeepOrders,
  mergeJoinSorted,
  mergeJoinUnsorted,
  nestedLoopTransfers,
  sortPasses,
  sortTransfers,
} from "@/lib/dbms/joins";
import { randInt, rng, shuffled } from "@/lib/rng";

const fmt = (n: number) => n.toLocaleString("en-US");

/** Query processing: join algorithms, I/O cost, selectivity, join ordering, EXPLAIN. Part of the "query" topic. */
export const QUERY: Question[] = [
  {
    id: "qry-pipeline",
    topic: "query",
    kind: "order",
    prompt: "Put the stages a SQL query goes through in order.",
    steps: ["Parse and validate (syntax, names, types)", "Rewrite to relational algebra", "Optimize: choose the cheapest plan", "Execute the plan", "Return the rows"],
    explanation: "The parser builds a parse tree and checks it against the catalog; the result is turned into relational algebra; the optimizer enumerates equivalent plans and picks the cheapest by estimated cost; the executor runs it.",
    difficulty: 1,
    tags: ["pipeline", "optimizer"],
  },
  {
    id: "qry-cost-unit",
    topic: "query",
    kind: "mcq",
    prompt: "What does a textbook cost model mainly count when comparing query plans?",
    choices: ["Block transfers (and seeks) between disk and memory", "CPU instructions only", "Number of SQL keywords", "Rows returned to the client"],
    answer: 0,
    explanation: "Disk I/O dominates: one block transfer costs far more than a tuple comparison in memory. Real optimizers (PostgreSQL) fold CPU costs in too, with page costs weighted against per-tuple costs.",
    difficulty: 1,
    tags: ["cost model"],
  },
  {
    id: "qry-push-selection",
    topic: "query",
    kind: "mcq",
    prompt: "Which rewrite is almost always a win?",
    choices: ["Push selections (and projections) down, before the joins", "Do all joins first, then filter", "Sort every relation first", "Replace every join by a cross product"],
    answer: 0,
    explanation: "Filtering early shrinks the inputs of the joins, so fewer blocks are read and joined. Selection pushdown is the first heuristic of every optimizer.",
    difficulty: 1,
    tags: ["heuristics", "selection pushdown"],
    askedAt: "Heuristic optimization.",
  },
  {
    id: "qry-nested-loop",
    topic: "query",
    kind: "mcq",
    prompt: "In a plain nested-loop join of r (outer) and s (inner), how many times is s read?",
    choices: ["Once per tuple of r", "Once per block of r", "Once", "Once per distinct join key"],
    answer: 0,
    explanation: "For each tuple of r the whole of s is scanned: n_r · b_s + b_r block transfers. That is why it is only used for tiny inputs or when an index on s makes the inner scan a lookup (index nested-loop join).",
    difficulty: 1,
    tags: ["nested loop"],
  },
  {
    id: "qry-bnl-better",
    topic: "query",
    kind: "mcq",
    prompt: "Why is block nested-loop join cheaper than tuple-at-a-time nested-loop join?",
    choices: ["The inner relation is scanned once per outer block (or per memory-load of outer blocks), not once per outer tuple", "It uses an index on the inner relation", "It sorts both relations first", "It avoids reading the outer relation"],
    answer: 0,
    explanation: "Cost goes from n_r · b_s + b_r to ceil(b_r / (M−2)) · b_s + b_r. Since a block holds many tuples, the factor n_r becomes a much smaller number of outer chunks.",
    difficulty: 2,
    tags: ["block nested loop"],
  },
  {
    id: "qry-bnl-outer",
    topic: "query",
    kind: "mcq",
    prompt: "For a block nested-loop join, which relation should be the outer one?",
    choices: ["The smaller one (fewer blocks)", "The larger one", "The one with more columns", "It makes no difference"],
    answer: 0,
    explanation: "The inner relation is rescanned ceil(b_outer / (M−2)) times; a small outer means few rescans of the big inner. With b_r = 100 and b_s = 400 and a single outer buffer, r outer costs 100·400+100 = 40,100 and s outer costs 400·100+400 = 40,400.",
    difficulty: 2,
    tags: ["block nested loop", "outer relation"],
  },
  {
    id: "qry-bnl-fits",
    topic: "query",
    kind: "mcq",
    prompt: "If the smaller relation fits entirely in memory (with room for 2 more buffers), what is the block-transfer cost of a block nested-loop join?",
    choices: ["b_r + b_s: each relation is read once", "b_r · b_s", "n_r · b_s", "2 · (b_r + b_s)"],
    answer: 0,
    explanation: "Make the small relation the outer and read it into memory in one go; one pass over the other relation finishes the join. This is the best case.",
    difficulty: 2,
    tags: ["block nested loop", "best case"],
  },
  {
    id: "qry-index-nl",
    topic: "query",
    kind: "mcq",
    prompt: "When is an index nested-loop join attractive?",
    choices: ["The outer is small and the inner has an index on the join column", "Both relations are huge and unindexed", "The join is a cross product", "The inner relation is already sorted but has no index"],
    answer: 0,
    explanation: "Each outer tuple becomes an index lookup (a few page reads) instead of a scan of the inner. With a small outer or a selective filter this beats hash and merge joins; with a large outer the many random lookups lose.",
    difficulty: 2,
    tags: ["index nested loop"],
    askedAt: "Join algorithm choice.",
  },
  {
    id: "qry-merge-sorted",
    topic: "query",
    kind: "mcq",
    prompt: "What does a merge join need, and what does it cost once the inputs are sorted?",
    choices: ["Both inputs sorted on the join key; b_r + b_s transfers", "An index on each input; n_r · b_s transfers", "Enough memory for one input; 3 (b_r + b_s)", "Nothing special; b_r · b_s"],
    answer: 0,
    explanation: "Two cursors walk the sorted inputs once. If the inputs are not sorted (and no index gives that order), the sort cost is added. The output is also sorted on the key, which helps a later ORDER BY or merge join.",
    difficulty: 2,
    tags: ["sort-merge"],
  },
  {
    id: "qry-hash-eq",
    topic: "query",
    kind: "truefalse",
    prompt: "A hash join can evaluate `r.a < s.b`.",
    answer: false,
    explanation: "Hashing only groups equal keys, so hash joins (and the basic hash index) handle equi-joins only. Range or inequality joins need nested loops (with a B+ tree index) or a merge-based approach for band conditions.",
    difficulty: 2,
    tags: ["hash join"],
    askedAt: "Common follow-up.",
  },
  {
    id: "qry-hash-phases",
    topic: "query",
    kind: "order",
    prompt: "Order the phases of a (grace) hash join.",
    steps: ["Partition both inputs with hash function h1 into n partitions on disk", "Read the build partition into memory and build an in-memory hash table with h2", "Probe the table with tuples of the matching probe partition", "Emit matches and move to the next partition"],
    explanation: "Matching tuples always land in partitions with the same index, so each pair of partitions can be joined independently. Cost: 3 (b_r + b_s) + 4 n_h (read, write the partitions, read them again; the 4 n_h covers partially filled blocks).",
    difficulty: 3,
    tags: ["hash join", "partitioning"],
  },
  {
    id: "qry-hash-build",
    topic: "query",
    kind: "mcq",
    prompt: "In a hash join, which input should be the build input?",
    choices: ["The smaller one, so its partitions (or hash table) fit in memory", "The larger one", "The one with the join key as primary key", "The one that is already sorted"],
    answer: 0,
    explanation: "The build input becomes the in-memory hash table; the probe input just streams past it. A small build side means fewer partitions and, ideally, no spill to disk at all (PostgreSQL builds its Hash node on the inner, smaller estimated input).",
    difficulty: 2,
    tags: ["hash join", "build input"],
  },
  {
    id: "qry-which-join",
    topic: "query",
    kind: "multi",
    prompt: "Which are good reasons for an optimizer to pick a merge join?",
    choices: ["Both inputs are already sorted on the join key (e.g. from index scans)", "The query has an ORDER BY on the join key afterwards", "The join condition is an inequality such as r.a < s.a with no index", "Both inputs are large and the join is an equi-join with no useful order"],
    answers: [0, 1],
    explanation: "Merge join shines when sorted input is free or its sorted output is reused. An unindexed inequality join falls back to nested loops, and large unordered equi-joins usually go to a hash join, which avoids sorting.",
    difficulty: 3,
    tags: ["merge join", "plan choice"],
  },
  {
    id: "qry-selectivity",
    topic: "query",
    kind: "numeric",
    prompt: "`employee` has 20,000 rows and the column `dept` has 50 distinct, uniformly distributed values. About how many rows does `WHERE dept = 'HR'` return?",
    answer: equalitySize(20000, 50),
    explanation: "Selectivity of an equality predicate is 1 / V(dept) = 1/50, so the estimate is 20,000 / 50 = 400 rows. Real optimizers refine this with histograms and most-common-value lists when the data is skewed.",
    difficulty: 2,
    tags: ["selectivity", "statistics"],
  },
  {
    id: "qry-stats",
    topic: "query",
    kind: "mcq",
    prompt: "A query suddenly picks a slow plan after a bulk load. What is the most likely first fix?",
    choices: ["Refresh the optimizer statistics (ANALYZE in PostgreSQL, DBMS_STATS in Oracle)", "Add more RAM", "Rewrite SELECT as SELECT *", "Drop all indexes"],
    answer: 0,
    explanation: "Plans are chosen from row-count and distribution estimates. After a large load the stored statistics are stale, so the optimizer misjudges selectivities (for example expecting a few rows and choosing a nested loop where thousands arrive).",
    difficulty: 2,
    tags: ["statistics", "ANALYZE"],
    askedAt: "Performance-tuning screens.",
  },
  {
    id: "qry-explain-cost",
    topic: "query",
    kind: "mcq",
    prompt: "In PostgreSQL `EXPLAIN` output, `Seq Scan on emp (cost=0.00..155.00 rows=10000 width=40)`. What do the two cost numbers mean?",
    choices: ["Start-up cost, then total cost, in arbitrary planner units", "Minimum and maximum milliseconds", "Rows read, rows returned", "Memory used before and after"],
    answer: 0,
    explanation: "The first number is the cost before the first row can be returned (0 for a scan, large for a sort or hash build); the second is the cost to return all rows. Units are arbitrary (a sequential page read = 1.0 by default). EXPLAIN ANALYZE adds actual times and row counts to compare against the estimates.",
    difficulty: 2,
    tags: ["EXPLAIN", "PostgreSQL"],
    askedAt: "Reading plans.",
  },
  {
    id: "qry-explain-analyze",
    topic: "query",
    kind: "mcq",
    prompt: "What is the difference between `EXPLAIN` and `EXPLAIN ANALYZE` in PostgreSQL?",
    choices: ["EXPLAIN shows the estimated plan; EXPLAIN ANALYZE also runs the query and shows actual times and row counts", "ANALYZE only works on SELECT", "EXPLAIN runs the query, ANALYZE does not", "They are identical"],
    answer: 0,
    explanation: "A large gap between estimated and actual rows is the usual sign of stale statistics or a correlated predicate. Beware: EXPLAIN ANALYZE really executes the statement, so wrap an UPDATE or DELETE in a transaction you roll back.",
    difficulty: 2,
    tags: ["EXPLAIN", "ANALYZE"],
  },
  {
    id: "qry-oracle-plan",
    topic: "query",
    kind: "mcq",
    prompt: "How do you see a query's execution plan in Oracle?",
    choices: ["EXPLAIN PLAN FOR <query>, then SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY)", "EXPLAIN <query>", "SHOW PLAN <query>", "DESCRIBE <query>"],
    answer: 0,
    explanation: "Oracle has no bare EXPLAIN statement: EXPLAIN PLAN writes the plan into PLAN_TABLE and DBMS_XPLAN.DISPLAY formats it. PostgreSQL uses EXPLAIN directly.",
    difficulty: 2,
    tags: ["EXPLAIN", "Oracle"],
  },
  {
    id: "qry-seqscan-index",
    topic: "query",
    kind: "mcq",
    prompt: "A table has an index on `status`, yet `WHERE status = 'active'` (90% of rows) uses a sequential scan. Why is that the right choice?",
    choices: ["Reading most of the table through an index costs more random page reads than one sequential pass", "Indexes are ignored on text columns", "The index is corrupt", "Sequential scans are always faster"],
    answer: 0,
    explanation: "An index pays off when the predicate is selective. For a large fraction of rows, each index hit is potentially a random page read, so reading the table sequentially once is cheaper. The same index helps for rare values (`status = 'banned'`).",
    difficulty: 2,
    tags: ["seq scan", "index scan", "selectivity"],
    askedAt: "\"Why isn't my index used?\"",
  },
  {
    id: "qry-join-order-count",
    topic: "query",
    kind: "numeric",
    prompt: "How many left-deep join orders exist for a query joining 5 relations?",
    answer: leftDeepOrders(5),
    explanation: "A left-deep tree is a permutation of the relations: 5! = 120. All tree shapes together number (2(n−1))!/(n−1)! = 8!/4! = 1,680, which is why optimizers use dynamic programming over subsets (System R) instead of enumerating everything.",
    difficulty: 3,
    tags: ["join ordering", "left-deep"],
  },
  {
    id: "qry-join-order-why",
    topic: "query",
    kind: "mcq",
    prompt: "Why does join order matter even though joins are associative and commutative?",
    choices: ["Different orders produce different intermediate result sizes, so very different costs", "Different orders return different rows", "Only the last join is ever executed", "Joins are not associative in SQL"],
    answer: 0,
    explanation: "The final result is the same, but joining the two most selective relations first keeps the intermediate results small. With outer joins, order can also change the result, so the optimizer has fewer legal rewrites there.",
    difficulty: 2,
    tags: ["join ordering"],
  },
  {
    id: "qry-covering-scan",
    topic: "query",
    kind: "mcq",
    prompt: "What does `Index Only Scan` (PostgreSQL) mean?",
    choices: ["All needed columns are in the index, so the table pages are mostly not read", "Only one row is read", "The index is rebuilt during the scan", "A unique index is required"],
    answer: 0,
    explanation: "A covering index answers the query alone. PostgreSQL still consults the visibility map to know a page's rows are visible to everyone, so a recently-written table may fall back to heap visits until VACUUM runs.",
    difficulty: 3,
    tags: ["index only scan", "covering"],
  },
];

function relTable(title: string, rows: { name: string; n: number; perBlock: number; b: number }[]): Relation {
  return { name: title, columns: ["Relation", "Tuples", "Tuples / block", "Blocks"], rows: rows.map((x) => [x.name, x.n, x.perBlock, x.b]) };
}

interface Pair {
  r: { n: number; perBlock: number; b: number };
  s: { n: number; perBlock: number; b: number };
}

function randomPair(r: () => number): Pair {
  const mk = () => {
    const perBlock = randInt(r, 4, 25);
    const n = randInt(r, 4, 100) * 100;
    return { n, perBlock, b: blocksFor(n, perBlock) };
  };
  let a = mk();
  let b = mk();
  if (a.b === b.b) b = { ...b, n: b.n + 100, b: blocksFor(b.n + 100, b.perBlock) };
  if (a.b < b.b) [a, b] = [b, a];
  return { r: a, s: b };
}

/** Cost of one join algorithm, from the relation sizes in the table. */
export const joinCostGen: Generator = {
  id: "qry-gen-joincost",
  topic: "query",
  difficulty: 3,
  tags: ["join cost", "block transfers"],
  askedAt: "I/O cost exercises.",
  generate(seed) {
    const r = rng(seed);
    const { r: R, s: S } = randomPair(r);
    const kinds = ["nl", "bnl", "bnl-m", "hash", "merge", "sort"] as const;
    const kind = kinds[seed % kinds.length];
    const m = randInt(r, 6, 40);
    const table = relTable("Relations", [
      { name: "r", ...R },
      { name: "s", ...S },
    ]);
    let prompt: string;
    let answer: number;
    let explanation: string;
    if (kind === "nl") {
      prompt = "How many block transfers does a tuple-at-a-time nested-loop join cost with r as the outer relation (one buffer block per relation, no indexes)?";
      answer = nestedLoopTransfers(R, S);
      explanation = `n_r · b_s + b_r = ${fmt(R.n)} · ${fmt(S.b)} + ${fmt(R.b)} = ${fmt(answer)}. With s outer it would be ${fmt(nestedLoopTransfers(S, R))}.`;
    } else if (kind === "bnl") {
      prompt = "How many block transfers does a block nested-loop join cost in the worst case (memory holds one block of the outer relation, one of the inner), with r as the outer relation?";
      answer = R.b * S.b + R.b;
      explanation = `b_r · b_s + b_r = ${fmt(R.b)} · ${fmt(S.b)} + ${fmt(R.b)} = ${fmt(answer)}. Putting the smaller relation outside gives ${fmt(S.b * R.b + S.b)}.`;
    } else if (kind === "bnl-m") {
      prompt = `A block nested-loop join has ${m} buffer blocks (M − 2 hold the outer relation, one the inner, one the output). With the smaller relation as the outer relation, how many block transfers does it need?`;
      answer = blockNestedTransfers(S, R, m);
      explanation = `Outer = s (${fmt(S.b)} blocks): ceil(b_s / (M−2)) · b_r + b_s = ceil(${fmt(S.b)} / ${m - 2}) · ${fmt(R.b)} + ${fmt(S.b)} = ${Math.ceil(S.b / (m - 2))} · ${fmt(R.b)} + ${fmt(S.b)} = ${fmt(answer)}.${S.b <= m - 2 ? ` s fits in memory, so this is the best case b_r + b_s = ${fmt(blockNestedBest(R, S))}.` : ""}`;
    } else if (kind === "hash") {
      const mm = Math.max(m, Math.ceil(Math.sqrt(S.b)) + 2);
      const build = S;
      prompt = `Hash join of r and s with ${mm} memory blocks. s is the build input, the number of partitions is ceil(b_s / M), and no recursive partitioning is needed. What is the cost, 3 (b_r + b_s) + 4 n_h, in block transfers?`;
      answer = hashJoinTransfers(R, S, build, mm);
      explanation = `n_h = ceil(${fmt(S.b)} / ${mm}) = ${hashPartitions(build, mm)}, so the cost is 3 · (${fmt(R.b)} + ${fmt(S.b)}) + 4 · ${hashPartitions(build, mm)} = ${fmt(answer)}.${hashNeedsRecursion(build, mm) ? " (n_h exceeds M−1 here, so a real system would partition recursively.)" : ""}`;
    } else if (kind === "merge") {
      prompt = "Both relations are already sorted on the join attribute. How many block transfers does the merge join need?";
      answer = mergeJoinSorted(R, S);
      explanation = `Each block of each relation is read once: b_r + b_s = ${fmt(R.b)} + ${fmt(S.b)} = ${fmt(answer)}.`;
    } else {
      const mm = randInt(r, 4, 12);
      prompt = `How many block transfers does a merge join need when neither relation is sorted? Count an external merge sort of each input with ${mm} buffer blocks as b · (2 · passes + 1) (passes = merge passes, the final write is not counted), then the merge itself.`;
      answer = mergeJoinUnsorted(R, S, mm);
      explanation = `Runs: r makes ceil(${fmt(R.b)}/${mm}) = ${Math.ceil(R.b / mm)} runs and ${sortPasses(R.b, mm)} merge passes (fan-in ${mm - 1}), costing ${fmt(sortTransfers(R.b, mm))}; s makes ${Math.ceil(S.b / mm)} runs and ${sortPasses(S.b, mm)} passes, costing ${fmt(sortTransfers(S.b, mm))}. The merge reads ${fmt(R.b)} + ${fmt(S.b)}. Total ${fmt(answer)}.`;
    }
    return {
      id: `qry-gen-joincost-${seed}`,
      topic: "query",
      kind: "numeric",
      prompt,
      tables: [table],
      answer,
      explanation,
      difficulty: 3,
      tags: joinCostGen.tags,
      askedAt: joinCostGen.askedAt,
    };
  },
};

/** Which relation should be the outer one, and what does it cost? */
export const outerChoiceGen: Generator = {
  id: "qry-gen-outer",
  topic: "query",
  difficulty: 2,
  tags: ["nested loop", "outer relation"],
  askedAt: "Join algorithm choice.",
  generate(seed) {
    const r = rng(seed);
    const { r: R, s: S } = randomPair(r);
    const swap = r() < 0.5;
    const [first, second] = swap ? [S, R] : [R, S];
    const names = swap ? ["s", "r"] : ["r", "s"];
    const block = seed % 2 === 0;
    const cost = (a: typeof R, b: typeof S) => (block ? a.b * b.b + a.b : a.n * b.b + a.b);
    const c1 = cost(first, second);
    const c2 = cost(second, first);
    const best = c1 <= c2 ? 0 : 1;
    const choices = [`${names[0]} as the outer relation`, `${names[1]} as the outer relation`, "They cost exactly the same", "Neither: both need an index"];
    const answer = c1 === c2 ? 2 : best;
    const alg = block ? "block nested-loop join (one buffer block per relation)" : "tuple-at-a-time nested-loop join (one buffer block per relation)";
    return {
      id: `qry-gen-outer-${seed}`,
      topic: "query",
      kind: "mcq",
      prompt: `For a ${alg}, which choice needs fewer block transfers?`,
      tables: [
        relTable("Relations", [
          { name: names[0], ...first },
          { name: names[1], ...second },
        ]),
      ],
      choices,
      answer,
      explanation: `${names[0]} outer: ${block ? `b · b' + b = ${fmt(first.b)} · ${fmt(second.b)} + ${fmt(first.b)}` : `n · b' + b = ${fmt(first.n)} · ${fmt(second.b)} + ${fmt(first.b)}`} = ${fmt(c1)}. ${names[1]} outer: ${block ? `${fmt(second.b)} · ${fmt(first.b)} + ${fmt(second.b)}` : `${fmt(second.n)} · ${fmt(first.b)} + ${fmt(second.b)}`} = ${fmt(c2)}. ${block ? "The smaller relation (fewest blocks) is best as the outer one." : "Here the relation with fewer tuples times the other's blocks wins, which is not always the smaller one in blocks."}`,
      difficulty: 2,
      tags: outerChoiceGen.tags,
      askedAt: outerChoiceGen.askedAt,
    };
  },
};

/** Estimated size of a selection or join result from distinct-value counts. */
export const selectivityGen: Generator = {
  id: "qry-gen-selectivity",
  topic: "query",
  difficulty: 2,
  tags: ["selectivity", "size estimation"],
  askedAt: "Cardinality estimation.",
  generate(seed) {
    const r = rng(seed);
    const nr = randInt(r, 10, 200) * 100;
    const ns = randInt(r, 10, 200) * 100;
    const vr = randInt(r, 5, 50) * 20;
    const vs = randInt(r, 5, 50) * 20;
    const join = seed % 2 === 0;
    const answer = join ? joinSize(nr, ns, vr, vs) : equalitySize(nr, vr);
    const table: Relation = { name: "Statistics", columns: ["Relation", "Tuples", "Distinct values of A"], rows: join ? [["r", nr, vr], ["s", ns, vs]] : [["r", nr, vr]] };
    return {
      id: `qry-gen-selectivity-${seed}`,
      topic: "query",
      kind: "numeric",
      prompt: join
        ? "Estimate the number of tuples in r ⋈ s on attribute A, assuming A is not a key of either relation and values are uniformly distributed. (Round up.)"
        : "Estimate how many tuples satisfy σ(A = c)(r), assuming uniformly distributed values. (Round up.)",
      tables: [table],
      answer,
      explanation: join
        ? `n_r · n_s / max(V(A,r), V(A,s)) = ${fmt(nr)} · ${fmt(ns)} / max(${vr}, ${vs}) = ${fmt(nr * ns)} / ${Math.max(vr, vs)} ≈ ${fmt(answer)}. Dividing by the larger count of distinct values is the safer estimate: it assumes every value of the column with fewer distinct values appears in the other.`
        : `n_r / V(A,r) = ${fmt(nr)} / ${vr} ≈ ${fmt(answer)}.`,
      difficulty: 2,
      tags: selectivityGen.tags,
      askedAt: selectivityGen.askedAt,
    };
  },
};

/** How many join orders does an n-way join have? */
export const joinOrderGen: Generator = {
  id: "qry-gen-orders",
  topic: "query",
  difficulty: 2,
  tags: ["join ordering", "search space"],
  askedAt: "Optimizer search space.",
  generate(seed) {
    const r = rng(seed);
    const n = randInt(r, 3, 7);
    const trees = seed % 2 === 0;
    const answer = trees ? allJoinTrees(n) : leftDeepOrders(n);
    const wrong = shuffled(r, [leftDeepOrders(n), allJoinTrees(n), leftDeepOrders(n - 1), n * n, 2 ** n].filter((x) => x !== answer));
    const choices = [...new Set(wrong)].slice(0, 3).map(fmt);
    const correct = fmt(answer);
    const at = randInt(r, 0, 3);
    choices.splice(at, 0, correct);
    return {
      id: `qry-gen-orders-${seed}`,
      topic: "query",
      kind: "mcq",
      prompt: trees
        ? `A query joins ${n} relations. How many distinct join trees (any shape, where the order of the two children counts) can the optimizer consider?`
        : `A query joins ${n} relations. How many left-deep join orders can the optimizer consider?`,
      choices,
      answer: at,
      explanation: trees
        ? `(2(n−1))! / (n−1)! with n = ${n}: ${fmt(allJoinTrees(n))}. Left-deep trees alone are only n! = ${fmt(leftDeepOrders(n))}. This explosion is why System R-style optimizers use dynamic programming over relation subsets and restrict the search to left-deep plans.`
        : `A left-deep plan is a permutation of the ${n} relations: ${n}! = ${fmt(answer)}. All tree shapes would be ${fmt(allJoinTrees(n))}.`,
      difficulty: 2,
      tags: joinOrderGen.tags,
      askedAt: joinOrderGen.askedAt,
    };
  },
};

export const QUERY_GENERATORS: Generator[] = [joinCostGen, outerChoiceGen, selectivityGen, joinOrderGen];

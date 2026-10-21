import type { Generator, Question } from "./types";
import type { Relation } from "@/lib/dbms/algebra";
import { build, fanout, height, leaves, levels, maxLevels, minLevels, showLevel } from "@/lib/dbms/btree";
import { randInt, rng, shuffled } from "@/lib/rng";

/** Storage and indexing: pages, B+ trees, clustered vs non-clustered, covering indexes. Part of the "storage" topic. */
export const STORAGE: Question[] = [
  {
    id: "sto-page",
    topic: "storage",
    kind: "mcq",
    prompt: "What is the unit of transfer between disk and the buffer pool in a DBMS?",
    choices: ["A page (block), commonly 4–16 KB", "A single row", "A single column value", "A whole table"],
    answer: 0,
    explanation: "Disks are read in blocks, and the cost of a query is counted in page I/Os. PostgreSQL pages are 8 KB, Oracle blocks 8 KB by default, and InnoDB pages 16 KB. Reading one row means reading its whole page.",
    difficulty: 1,
    tags: ["pages", "buffer pool"],
  },
  {
    id: "sto-why-index",
    topic: "storage",
    kind: "mcq",
    prompt: "What does an index mainly save?",
    choices: ["Page reads: it finds matching rows without scanning the whole table", "Disk space", "The cost of INSERTs", "The need for a primary key"],
    answer: 0,
    explanation: "An index turns a full scan (every page) into a few page reads. It costs extra space and slows writes, since every INSERT, UPDATE of an indexed column and DELETE must maintain it.",
    difficulty: 1,
    tags: ["index"],
  },
  {
    id: "sto-btree-vs-bplus",
    topic: "storage",
    kind: "mcq",
    prompt: "Where does a B+ tree keep the row pointers (record data) for its keys?",
    choices: ["Only in the leaves, which are linked in key order", "In every node, internal ones included", "Only in the root", "In a separate hash table"],
    answer: 0,
    explanation: "Internal nodes of a B+ tree hold only separator keys, so they fit more keys per page (higher fan-out, a shorter tree). A B-tree stores records in internal nodes too. The linked leaves make range scans a sequential walk.",
    difficulty: 1,
    tags: ["b+ tree", "b-tree"],
    askedAt: "\"B-tree vs B+ tree\" is a classic.",
  },
  {
    id: "sto-range",
    topic: "storage",
    kind: "truefalse",
    prompt: "A B+ tree index can answer both `WHERE k = 5` and `WHERE k BETWEEN 5 AND 50` efficiently.",
    answer: true,
    explanation: "Descend to the first matching leaf, then follow the leaf links until the key exceeds the upper bound. A hash index only answers equality.",
    difficulty: 1,
    tags: ["b+ tree", "range query"],
  },
  {
    id: "sto-all-leaves-same-depth",
    topic: "storage",
    kind: "truefalse",
    prompt: "In a B+ tree every leaf is at the same depth.",
    answer: true,
    explanation: "The tree only grows in height when the root splits, which pushes every leaf down one level together. That is why every lookup costs the same number of page reads.",
    difficulty: 1,
    tags: ["b+ tree", "balance"],
  },
  {
    id: "sto-split-copy",
    topic: "storage",
    kind: "mcq",
    prompt: "A B+ tree leaf overflows and splits. What happens to the separator key sent to the parent?",
    choices: [
      "The smallest key of the new right leaf is copied up; it stays in the leaf",
      "The middle key is moved up and removed from the leaves",
      "No key goes up, only a pointer",
      "The largest key of the left leaf is deleted",
    ],
    answer: 0,
    explanation: "Leaves must keep every key (they hold the record pointers), so a leaf split copies the separator up. An internal node split moves its middle key up instead, because internal keys are only signposts.",
    difficulty: 2,
    tags: ["b+ tree", "split"],
    askedAt: "Asked when you are told to \"insert into a B+ tree\" on a whiteboard.",
  },
  {
    id: "sto-root-split",
    topic: "storage",
    kind: "mcq",
    prompt: "When does a B+ tree get taller?",
    choices: ["When the root splits", "When any leaf splits", "On every insert", "When a key is deleted"],
    answer: 0,
    explanation: "A leaf split only adds a key to its parent. The height grows by one only when the split propagates all the way up and a new root is created.",
    difficulty: 2,
    tags: ["b+ tree", "height"],
  },
  {
    id: "sto-min-fill",
    topic: "storage",
    kind: "numeric",
    prompt: "In a B+ tree of order n = 10 (at most 10 pointers per node), what is the minimum number of keys in a non-root leaf?",
    answer: 5,
    explanation: "A non-root leaf holds between ceil((n−1)/2) and n−1 keys: ceil(9/2) = 5 to 9. A non-root internal node needs at least ceil(n/2) = 5 children.",
    difficulty: 2,
    tags: ["b+ tree", "occupancy"],
  },
  {
    id: "sto-fanout",
    topic: "storage",
    kind: "numeric",
    prompt: "A 4096-byte block holds a B+ tree node. Keys take 12 bytes and pointers 8 bytes. What is the largest order n (pointers per node) that fits?",
    answer: 205,
    explanation: "A node needs (n−1)·12 + n·8 ≤ 4096, i.e. 20n ≤ 4108, so n = 205.",
    difficulty: 2,
    tags: ["b+ tree", "fan-out"],
  },
  {
    id: "sto-clustered",
    topic: "storage",
    kind: "mcq",
    prompt: "What is a clustered index?",
    choices: [
      "An index whose order matches the physical order of the table's rows, so a table has at most one",
      "An index stored on several servers",
      "An index over several columns",
      "Any index on the primary key's column",
    ],
    answer: 0,
    explanation: "In a clustered (primary) index the rows themselves are stored in key order, so a range scan reads adjacent pages. Other indexes are non-clustered (secondary): their leaves hold pointers to the rows, and one lookup may need an extra page read per row.",
    difficulty: 2,
    tags: ["clustered", "secondary index"],
    askedAt: "Very common: \"clustered vs non-clustered index\".",
  },
  {
    id: "sto-innodb-pg",
    topic: "storage",
    kind: "mcq",
    prompt: "Which statement about PostgreSQL and Oracle tables is true?",
    choices: [
      "PostgreSQL tables are heaps and every index is secondary; Oracle tables are heaps unless created as an index-organized table (IOT)",
      "Both always store rows in primary-key order",
      "PostgreSQL's CLUSTER command keeps the table sorted after later inserts",
      "Oracle has no secondary indexes",
    ],
    answer: 0,
    explanation: "PostgreSQL's CLUSTER rewrites the table once in index order; later inserts are not kept in order. An Oracle IOT stores the rows in a B-tree on the primary key. (InnoDB, in MySQL, is always clustered on the primary key.)",
    difficulty: 3,
    tags: ["postgresql", "oracle", "iot", "heap"],
  },
  {
    id: "sto-covering",
    topic: "storage",
    kind: "mcq",
    prompt: "What is a covering index for a query?",
    choices: [
      "One containing every column the query needs, so the table is never read",
      "An index on the primary key",
      "An index covering all rows of a partitioned table",
      "An index that is also unique",
    ],
    answer: 0,
    explanation: "With every needed column in the index, the engine answers from the index alone (an index-only scan). PostgreSQL has INCLUDE columns for this; Oracle shows INDEX RANGE SCAN without a TABLE ACCESS step.",
    difficulty: 2,
    tags: ["covering index", "index-only scan"],
  },
  {
    id: "sto-composite-order",
    topic: "storage",
    kind: "multi",
    prompt: "There is a B+ tree index on (a, b). Which predicates can use it to seek (not just scan)?",
    choices: ["WHERE a = 1", "WHERE a = 1 AND b = 2", "WHERE b = 2", "WHERE b = 2 AND a = 1"],
    answers: [0, 1, 3],
    explanation: "A composite index is sorted by a, then b, so it helps only through its leftmost prefix. `b = 2` alone is scattered through the index. The order of predicates in the WHERE clause does not matter: `b = 2 AND a = 1` still gives the prefix (a, b).",
    difficulty: 3,
    tags: ["composite index", "leftmost prefix"],
    askedAt: "The \"leftmost prefix\" rule comes up in every indexing round.",
  },
  {
    id: "sto-functions",
    topic: "storage",
    kind: "mcq",
    prompt: "An index exists on email. Why can `WHERE LOWER(email) = 'a@x.com'` not use it?",
    choices: [
      "The index is sorted by email, not by LOWER(email); you need an expression (function-based) index",
      "Indexes only work on numbers",
      "LOWER is not deterministic",
      "Indexes cannot be used with string equality",
    ],
    answer: 0,
    explanation: "The index orders the raw values, so it cannot locate the transformed ones. Create an index on LOWER(email) (PostgreSQL expression index, Oracle function-based index).",
    difficulty: 2,
    tags: ["expression index", "sargable"],
  },
  {
    id: "sto-write-cost",
    topic: "storage",
    kind: "truefalse",
    prompt: "Adding more indexes to a table never slows down INSERTs.",
    answer: false,
    explanation: "Every index needs a new entry for each inserted row (and maybe a page split), so write cost grows with the number of indexes. That is the trade-off for faster reads.",
    difficulty: 1,
    tags: ["index", "write cost"],
  },
  {
    id: "sto-low-card",
    topic: "storage",
    kind: "mcq",
    prompt: "A table has 10 million rows, and a column `active` is true for 98% of them. A query asks for `WHERE active = true`. What will the optimiser usually do?",
    choices: ["Scan the whole table; an index would read nearly every page anyway, at random", "Use the index, always", "Refuse to run the query", "Rebuild the index"],
    answer: 0,
    explanation: "Low selectivity makes index lookups lose to a sequential scan: random page reads for nearly every row cost more than reading the table once in order. The index helps for the rare value (`active = false`).",
    difficulty: 2,
    tags: ["selectivity", "seq scan"],
  },
  {
    id: "sto-hash-eq",
    topic: "storage",
    kind: "truefalse",
    prompt: "A hash index supports `ORDER BY` on the indexed column.",
    answer: false,
    explanation: "Hashing scatters neighbouring keys, so there is no order to exploit. Hash indexes serve equality lookups only; B+ trees are the general-purpose default.",
    difficulty: 1,
    tags: ["hash index"],
  },
];


/** Insert keys into an order-n B+ tree. Drawn as one table row per level. */
function treeTable(order: number, keys: number[]): Relation {
  return { name: `Insert in this order (n = ${order})`, columns: ["Step", "Key"], rows: keys.map((k, i) => [i + 1, k]) };
}

function describeTree(order: number, keys: number[]): string {
  const t = build(order, keys);
  return levels(t)
    .map((l, i) => `${i === 0 ? "root" : i === levels(t).length - 1 ? "leaves" : "level " + (i + 1)}: ${showLevel(l)}`)
    .join("; ");
}

function randomKeys(r: () => number): { order: number; keys: number[] } {
  const order = randInt(r, 3, 5);
  const count = randInt(r, order + 2, order * 3 + 2);
  const keys = shuffled(r, Array.from({ length: 40 }, (_, i) => i + 1)).slice(0, count);
  return { order, keys };
}


/** "How many leaves / levels does the tree have?" Answered by inserting the keys in `btree.ts`. */
export const btreeCountGen: Generator = {
  id: "sto-gen-count",
  topic: "storage",
  difficulty: 2,
  tags: ["b+ tree", "insert", "split"],
  askedAt: "The whiteboard \"insert these keys\" exercise.",
  generate(seed) {
    const r = rng(seed);
    const { order, keys } = randomKeys(r);
    const t = build(order, keys);
    const askLeaves = seed % 2 === 0;
    const answer = askLeaves ? leaves(t).length : height(t);
    return {
      id: `sto-gen-count-${seed}`,
      topic: "storage",
      kind: "numeric",
      prompt: `Insert these ${keys.length} keys one by one into an empty B+ tree of order n = ${order} (a node holds at most ${order - 1} keys; a leaf that reaches ${order} keys splits ${Math.ceil(order / 2)} | ${order - Math.ceil(order / 2)}). ${askLeaves ? "How many leaf nodes does the final tree have?" : "How many levels does the final tree have (a lone root leaf is 1)?"}`,
      tables: [treeTable(order, keys)],
      answer,
      explanation: `Final tree — ${describeTree(order, keys)}. That is ${leaves(t).length} leaves and ${height(t)} levels.`,
      difficulty: 2,
      tags: btreeCountGen.tags,
      askedAt: btreeCountGen.askedAt,
    };
  },
};

/** "Which keys are in the root?" with wrong options from near-miss trees. */
export const btreeRootGen: Generator = {
  id: "sto-gen-root",
  topic: "storage",
  difficulty: 3,
  tags: ["b+ tree", "insert", "split"],
  askedAt: "Follow-up to the insert exercise.",
  generate(seed) {
    const r = rng(seed);
    const { order, keys } = randomKeys(r);
    const t = build(order, keys);
    const root = t.root.keys.join(", ");
    const opts = new Set<string>([root]);
    // Near misses: the tree built with a different order, or after dropping a key.
    for (const alt of [build(order === 3 ? 4 : order - 1, keys), build(order + 1, keys), build(order, keys.slice(0, -1)), build(order, keys.slice(1))]) {
      const s = alt.root.leaf ? "(no separator: the root is a leaf)" : alt.root.keys.join(", ");
      if (!opts.has(s) && opts.size < 4) opts.add(s);
    }
    for (let k = 1; opts.size < 4; k++) opts.add(t.root.keys.map((x) => x + k).join(", "));
    const choices = shuffled(r, [...opts]);
    return {
      id: `sto-gen-root-${seed}`,
      topic: "storage",
      kind: "mcq",
      prompt: `Insert these keys in order into an empty B+ tree of order n = ${order} (leaf splits copy the first key of the right half up; internal splits move the middle key up). Which keys end up in the root?`,
      tables: [treeTable(order, keys)],
      choices,
      answer: choices.indexOf(root),
      explanation: `Final tree — ${describeTree(order, keys)}.`,
      difficulty: 3,
      tags: btreeRootGen.tags,
      askedAt: btreeRootGen.askedAt,
    };
  },
};

/** "How many page reads for an index lookup?" and "how many levels at most?" from block, key and pointer sizes. */
export const btreeHeightGen: Generator = {
  id: "sto-gen-height",
  topic: "storage",
  difficulty: 2,
  tags: ["b+ tree", "fan-out", "height", "i/o cost"],
  askedAt: "Back-of-the-envelope index sizing.",
  generate(seed) {
    const r = rng(seed);
    const block = [2048, 4096, 8192, 16384][randInt(r, 0, 3)];
    const keyBytes = [4, 8, 12, 16, 20][randInt(r, 0, 4)];
    const ptr = [4, 8][randInt(r, 0, 1)];
    const n = fanout(block, keyBytes, ptr);
    const records = [10_000, 100_000, 1_000_000, 50_000_000, 1_000_000_000][randInt(r, 0, 4)];
    const atMost = seed % 2 === 0;
    const answer = atMost ? maxLevels(n, records) : minLevels(n, records);
    return {
      id: `sto-gen-height-${seed}`,
      topic: "storage",
      kind: "numeric",
      prompt: `A B+ tree index has ${records.toLocaleString("en-US")} distinct search keys. Blocks are ${block} bytes, a key takes ${keyBytes} bytes and a pointer ${ptr} bytes, and each node fills one block. ${atMost ? "At most how many levels (page reads for a lookup down to a leaf) can the tree have, if every node is only guaranteed half full? Use ceil(log base ceil(n/2) of K)." : "At least how many levels does it need, if every node is completely full?"}`,
      answer,
      explanation: `The order is the largest n with (n−1)·${keyBytes} + n·${ptr} ≤ ${block}, so n = ${n}. ${atMost ? `Half full means ceil(n/2) = ${Math.ceil(n / 2)} children per node, so the height is at most ceil(log_${Math.ceil(n / 2)} ${records.toLocaleString("en-US")}) = ${answer}.` : `A full tree of ${answer} levels holds up to (n−1)·n^${answer - 1} = ${((n - 1) * n ** (answer - 1)).toLocaleString("en-US")} keys, while ${answer - 1} levels hold only ${answer === 1 ? 0 : ((n - 1) * n ** (answer - 2)).toLocaleString("en-US")}, so ${answer} levels are needed.`} A lookup reads one page per level${atMost ? ", plus one more for the row itself in a non-clustered index" : ""}.`,
      difficulty: 2,
      tags: btreeHeightGen.tags,
      askedAt: btreeHeightGen.askedAt,
    };
  },
};

export const STORAGE_GENERATORS: Generator[] = [btreeCountGen, btreeRootGen, btreeHeightGen];

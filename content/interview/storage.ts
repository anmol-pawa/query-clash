import type { Generator, Question } from "./types";
import type { Relation } from "@/lib/dbms/algebra";
import { extBuckets, extBuild, linBuild, overflowPages, showDirectory, showLinear, staticBuckets } from "@/lib/dbms/hashing";
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
  {
    id: "sto-hash-static",
    topic: "storage",
    kind: "mcq",
    prompt: "What is the main weakness of static hashing (a fixed number of buckets, h(k) = k mod B)?",
    choices: ["When the file grows, overflow chains lengthen and lookups degrade; changing B means rehashing everything", "It cannot answer equality lookups", "It needs the keys to arrive sorted", "Every lookup costs log(B) page reads"],
    answer: 0,
    explanation: "B is fixed when the file is created. Too few buckets and the overflow chains grow; too many and space is wasted. Extendible and linear hashing grow the file gradually instead.",
    difficulty: 1,
    tags: ["static hashing", "overflow"],
  },
  {
    id: "sto-hash-lookup",
    topic: "storage",
    kind: "mcq",
    prompt: "In a hash index with no overflow, how many page reads does an equality lookup need on average (ignoring the row fetch)?",
    choices: ["About one: hash the key and read that bucket", "log_n of the number of keys", "As many as there are buckets", "Two: one for the root and one for the leaf"],
    answer: 0,
    explanation: "The hash function jumps straight to the bucket. That O(1) behaviour is why hashing wins on pure equality lookups, and why it cannot serve ranges or ORDER BY.",
    difficulty: 1,
    tags: ["hash index", "i/o cost"],
  },
  {
    id: "sto-hash-range",
    topic: "storage",
    kind: "truefalse",
    prompt: "A hash index can speed up `WHERE price BETWEEN 10 AND 20`.",
    answer: false,
    explanation: "Neighbouring values land in unrelated buckets, so a range needs every bucket. Use a B+ tree for ranges.",
    difficulty: 1,
    tags: ["hash index", "range"],
  },
  {
    id: "sto-ext-double",
    topic: "storage",
    kind: "mcq",
    prompt: "In extendible hashing a bucket overflows. When must the directory double?",
    choices: ["When the bucket's local depth equals the global depth", "Whenever any bucket overflows", "When the local depth is smaller than the global depth", "Only when the file reaches 50% load"],
    answer: 0,
    explanation: "If local depth < global depth, several directory entries already point to the bucket, so the split just re-points half of them. Only when local depth = global depth is there no spare bit, and the directory doubles (global depth + 1).",
    difficulty: 2,
    tags: ["extendible hashing", "directory"],
    askedAt: "A standard extendible-hashing follow-up.",
  },
  {
    id: "sto-ext-pointers",
    topic: "storage",
    kind: "numeric",
    prompt: "In an extendible hash with global depth 4, a bucket has local depth 2. How many directory entries point to it?",
    answer: 4,
    explanation: "2^(global − local) = 2^(4−2) = 4 entries share the bucket's two-bit prefix.",
    difficulty: 2,
    tags: ["extendible hashing", "directory"],
  },
  {
    id: "sto-ext-cost",
    topic: "storage",
    kind: "mcq",
    prompt: "What is the cost of extendible hashing compared with static hashing?",
    choices: ["An extra directory lookup (often kept in memory), and a directory that can double in size", "No overflow chains ever, so it is always smaller", "It needs sorted input", "It supports range scans"],
    answer: 0,
    explanation: "A lookup reads the directory and then one bucket, so there is no long overflow chain. In exchange the directory costs memory and doubles on a skewed split. Many keys with the same low bits make it grow quickly.",
    difficulty: 2,
    tags: ["extendible hashing", "directory"],
  },
  {
    id: "sto-lin-nodir",
    topic: "storage",
    kind: "mcq",
    prompt: "How does linear hashing grow without a directory?",
    choices: ["It splits buckets one at a time in order, using a split pointer and two hash functions", "It rehashes the whole file at 70% load", "It splits whichever bucket overflowed", "It keeps a B+ tree over the buckets"],
    answer: 0,
    explanation: "A pointer `next` marks the next bucket to split, in round-robin order, and the buckets before it are addressed by the finer function h_(i+1). The bucket that overflowed may differ from the one that splits, so overflow chains appear temporarily.",
    difficulty: 3,
    tags: ["linear hashing", "split pointer"],
    askedAt: "Asked to contrast with extendible hashing.",
  },
  {
    id: "sto-lin-addr",
    topic: "storage",
    kind: "numeric",
    prompt: "A linear hash file starts with 4 buckets (h_0(k) = k mod 4, h_1(k) = k mod 8). Level 0, split pointer next = 2. Which bucket holds key 14?",
    answer: 6,
    explanation: "h_0(14) = 14 mod 4 = 2, which is not above `next`: bucket 2 has already split this round, so use h_1(14) = 14 mod 8 = 6.",
    difficulty: 3,
    tags: ["linear hashing", "split pointer"],
  },
  {
    id: "sto-hash-load",
    topic: "storage",
    kind: "numeric",
    prompt: "A static hash file has 5 buckets and each page holds 3 keys. Bucket 0 receives 8 keys. How many overflow pages does bucket 0 chain?",
    answer: 2,
    explanation: "8 keys need ceil(8/3) = 3 pages, one primary plus 2 overflow pages. The others fit in their primary page.",
    difficulty: 2,
    tags: ["static hashing", "overflow"],
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

const hashKeys = (r: () => number, count: number): number[] => shuffled(r, Array.from({ length: 60 }, (_, i) => i + 1)).slice(0, count);

function hashTable(title: string, keys: number[]): Relation {
  return { name: title, columns: ["Step", "Key"], rows: keys.map((k, i) => [i + 1, k]) };
}

/** Extendible hashing: global depth or number of distinct buckets after the inserts. */
export const extendibleGen: Generator = {
  id: "sto-gen-ext",
  topic: "storage",
  difficulty: 3,
  tags: ["extendible hashing", "directory", "split"],
  askedAt: "Whiteboard hashing exercise.",
  generate(seed) {
    const r = rng(seed);
    const cap = randInt(r, 2, 3);
    const keys = hashKeys(r, randInt(r, cap + 2, cap * 3 + 2));
    const h = extBuild(cap, keys);
    const askDepth = seed % 2 === 0;
    const answer = askDepth ? h.globalDepth : extBuckets(h).length;
    return {
      id: `sto-gen-ext-${seed}`,
      topic: "storage",
      kind: "numeric",
      prompt: `Insert these keys in order into an empty extendible hash file. A bucket holds ${cap} keys, h(k) = k, and the directory uses the low-order bits of the key (start: global depth 0, one bucket). A full bucket splits, and the directory doubles first if the bucket's local depth equals the global depth. ${askDepth ? "What is the final global depth?" : "How many distinct buckets exist at the end (empty ones count)?"}`,
      tables: [hashTable(`Insert in this order (bucket size ${cap})`, keys)],
      answer,
      explanation: `Final directory — ${showDirectory(h)}. Global depth ${h.globalDepth}, ${extBuckets(h).length} distinct buckets.`,
      difficulty: 3,
      tags: extendibleGen.tags,
      askedAt: extendibleGen.askedAt,
    };
  },
};

/** Linear hashing: the split pointer or the bucket count after the inserts. */
export const linearGen: Generator = {
  id: "sto-gen-linear",
  topic: "storage",
  difficulty: 3,
  tags: ["linear hashing", "split pointer"],
  askedAt: "Contrast with extendible hashing.",
  generate(seed) {
    const r = rng(seed);
    const initial = [2, 3, 4][randInt(r, 0, 2)];
    const cap = randInt(r, 2, 3);
    const keys = hashKeys(r, randInt(r, cap * initial, cap * initial + 6));
    const h = linBuild(initial, cap, keys);
    const askNext = seed % 2 === 0;
    const answer = askNext ? h.next : h.buckets.length;
    return {
      id: `sto-gen-linear-${seed}`,
      topic: "storage",
      kind: "numeric",
      prompt: `A linear hash file starts with ${initial} empty buckets (level 0, split pointer next = 0), h_i(k) = k mod (${initial}·2^i). A page holds ${cap} keys. Whenever an insert makes its bucket exceed ${cap} keys, the bucket at the split pointer splits (using h_(i+1)) and the pointer advances; after the last bucket of the round splits, the level goes up and the pointer returns to 0. Insert the keys in order. ${askNext ? "What is the split pointer at the end?" : "How many buckets are there at the end?"}`,
      tables: [hashTable(`Insert in this order (${initial} buckets, page size ${cap})`, keys)],
      answer,
      explanation: `Final file (level ${h.level}, next = ${h.next}) — ${showLinear(h)}.`,
      difficulty: 3,
      tags: linearGen.tags,
      askedAt: linearGen.askedAt,
    };
  },
};

/** Static hashing: how many overflow pages the keys need. */
export const staticOverflowGen: Generator = {
  id: "sto-gen-static",
  topic: "storage",
  difficulty: 2,
  tags: ["static hashing", "overflow"],
  askedAt: "Hash file sizing.",
  generate(seed) {
    const r = rng(seed);
    const buckets = randInt(r, 3, 6);
    const cap = randInt(r, 2, 3);
    const keys = hashKeys(r, randInt(r, buckets * cap, buckets * cap + 8));
    const b = staticBuckets(buckets, keys);
    return {
      id: `sto-gen-static-${seed}`,
      topic: "storage",
      kind: "numeric",
      prompt: `A static hash file has ${buckets} primary buckets with h(k) = k mod ${buckets}, and each page holds ${cap} keys; a full bucket chains overflow pages. After inserting these keys, how many overflow pages exist in total?`,
      tables: [hashTable(`Keys (${buckets} buckets, page size ${cap})`, keys)],
      answer: overflowPages(b, cap),
      explanation: `Bucket contents — ${b.map((x, i) => `${i}: ${x.length}`).join(", ")} keys. A bucket with m keys needs ceil(m/${cap}) pages, so m ≤ ${cap} needs none and each further ${cap} keys add one page: ${overflowPages(b, cap)} overflow pages.`,
      difficulty: 2,
      tags: staticOverflowGen.tags,
      askedAt: staticOverflowGen.askedAt,
    };
  },
};

export const STORAGE_GENERATORS: Generator[] = [btreeCountGen, btreeRootGen, btreeHeightGen, extendibleGen, linearGen, staticOverflowGen];

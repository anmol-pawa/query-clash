import type { Generator, Question } from "./types";
import type { Relation } from "@/lib/dbms/algebra";
import { failuresTolerated, majority, modShard, movedByMod, quorumsOverlap, rangeShard, twoPcMessages, twoPhaseCommit, writesConflictSafe } from "@/lib/dbms/distributed";
import { randInt, rng, shuffled } from "@/lib/rng";

/** Distributed databases and NoSQL: CAP, replication, sharding, 2PC, consistency, store types. Part of the "distributed" topic. */
export const DISTRIBUTED: Question[] = [
  {
    id: "dst-cap",
    topic: "distributed",
    kind: "mcq",
    prompt: "CAP theorem: during a network partition, a system must choose between which two properties?",
    choices: ["Consistency and availability", "Consistency and partition tolerance", "Availability and partition tolerance", "Durability and isolation"],
    answer: 0,
    explanation: "Partitions are a fact of networks, so P is not optional. When one happens, you either refuse some requests to stay consistent (CP) or answer from possibly stale data (AP). With no partition you can have both.",
    difficulty: 1,
    tags: ["CAP"],
    askedAt: "Asked in almost every system-design round.",
  },
  {
    id: "dst-cap-c",
    topic: "distributed",
    kind: "mcq",
    prompt: "In the CAP theorem, what does 'consistency' mean?",
    choices: ["Every read sees the most recent write (linearizability)", "Every transaction obeys all integrity constraints", "Data is stored in a normalised form", "Replicas converge eventually"],
    answer: 0,
    explanation: "CAP's C is linearizability: the system behaves as if there were one copy. It is not the C in ACID, which is about constraints.",
    difficulty: 2,
    tags: ["CAP", "ACID"],
  },
  {
    id: "dst-pacelc",
    topic: "distributed",
    kind: "mcq",
    prompt: "What does PACELC add to CAP?",
    choices: ["Even with no partition (Else), there is a trade-off between latency and consistency", "A rule for choosing the number of shards", "A fourth guarantee called atomicity", "A formula for quorum sizes"],
    answer: 0,
    explanation: "If Partition: choose Availability or Consistency; Else: choose Latency or Consistency. Waiting for replicas to agree costs latency even when the network is healthy.",
    difficulty: 2,
    tags: ["PACELC"],
  },
  {
    id: "dst-sync-async",
    topic: "distributed",
    kind: "mcq",
    prompt: "A primary acknowledges a write only after it is applied locally; replicas apply it later. What is the risk?",
    choices: ["If the primary fails before replicating, acknowledged writes can be lost, and replicas can serve stale reads", "Writes become slower than synchronous replication", "The replicas can never catch up", "Two primaries are elected at once, always"],
    answer: 0,
    explanation: "Asynchronous replication is fast but has replication lag: reads from replicas may be stale, and a failover can lose the tail of the log. Synchronous replication waits for replicas and trades latency for safety.",
    difficulty: 1,
    tags: ["replication", "lag"],
  },
  {
    id: "dst-read-your-writes",
    topic: "distributed",
    kind: "mcq",
    prompt: "A user updates their profile and immediately reloads it from a lagging replica, seeing the old value. Which guarantee was violated?",
    choices: ["Read-your-writes", "Durability", "Atomicity", "Monotonic writes are required to be linearizable"],
    answer: 0,
    explanation: "Read-your-writes (a session guarantee) says a client sees its own earlier writes. Fixes: read from the primary for recently written data, or route the session to a replica that has caught up.",
    difficulty: 2,
    tags: ["consistency models", "replication lag"],
  },
  {
    id: "dst-quorum-rule",
    topic: "distributed",
    kind: "mcq",
    prompt: "With N replicas, write quorum W and read quorum R, which condition makes every read overlap the latest acknowledged write?",
    choices: ["R + W > N", "R + W = N", "R = W = 1", "W < N / 2"],
    answer: 0,
    explanation: "If R + W > N, any read set and any write set share at least one replica, so a read contacts a node holding the latest acknowledged value (pick the highest version).",
    difficulty: 2,
    tags: ["quorum"],
    askedAt: "Dynamo-style stores (Cassandra, Riak).",
  },
  {
    id: "dst-shard-vs-replica",
    topic: "distributed",
    kind: "mcq",
    prompt: "What is the difference between sharding and replication?",
    choices: ["Sharding splits data across nodes (each holds part); replication copies the same data to several nodes", "They are two names for the same thing", "Sharding copies data, replication splits it", "Replication is only for backups; sharding is only for reads"],
    answer: 0,
    explanation: "Sharding (partitioning) scales storage and write throughput; replication scales reads and survives failures. Real systems do both: each shard is replicated.",
    difficulty: 1,
    tags: ["sharding", "replication"],
  },
  {
    id: "dst-hot-shard",
    topic: "distributed",
    kind: "mcq",
    prompt: "A table is range-partitioned by a timestamp and most traffic is for 'now'. What goes wrong?",
    choices: ["The newest partition becomes a hotspot", "Range queries become impossible", "Rows can no longer be updated", "Every query touches every shard"],
    answer: 0,
    explanation: "Monotonic keys send all inserts to the last range. Hash partitioning spreads load but loses efficient range scans; a common compromise is hash(user) + timestamp.",
    difficulty: 2,
    tags: ["sharding", "hotspot"],
  },
  {
    id: "dst-mod-reshard",
    topic: "distributed",
    kind: "mcq",
    prompt: "Why is hash(key) mod N a poor sharding scheme when nodes are added or removed?",
    choices: ["Changing N remaps most keys, forcing a huge data move", "It cannot be computed quickly", "It puts all keys on one node", "It requires a central lookup table"],
    answer: 0,
    explanation: "Going from N to N+1 moves roughly N/(N+1) of all keys. Consistent hashing (or many virtual shards) moves only about 1/(N+1) of them.",
    difficulty: 2,
    tags: ["sharding", "consistent hashing"],
  },
  {
    id: "dst-consistent-hash",
    topic: "distributed",
    kind: "mcq",
    prompt: "What are virtual nodes in consistent hashing for?",
    choices: ["Placing each server at many ring positions to even out load and spread a failed node's keys", "Encrypting keys", "Making the ring smaller", "Avoiding hashing altogether"],
    answer: 0,
    explanation: "With one point per server the arcs are uneven. Many virtual points per server smooth the distribution, and when a server leaves its keys scatter across many successors instead of dumping on one.",
    difficulty: 3,
    tags: ["consistent hashing"],
  },
  {
    id: "dst-2pc-phases",
    topic: "distributed",
    kind: "order",
    prompt: "Put the two-phase commit steps in order.",
    steps: ["Coordinator sends PREPARE to all participants", "Participants force-log their vote and reply YES or NO", "Coordinator logs the decision (COMMIT if all YES, else ABORT)", "Coordinator sends the decision to participants", "Participants apply it and send ACK"],
    explanation: "A participant that votes YES is 'prepared': it must keep its locks and wait for the decision. The coordinator's decision log record is the commit point.",
    difficulty: 1,
    tags: ["2PC"],
  },
  {
    id: "dst-2pc-block",
    topic: "distributed",
    kind: "mcq",
    prompt: "Why is two-phase commit called a blocking protocol?",
    choices: ["If the coordinator fails after participants voted YES, they must hold locks until it recovers", "It blocks all reads on the database", "It uses blocking I/O", "It never terminates for a NO vote"],
    answer: 0,
    explanation: "A prepared participant cannot unilaterally commit or abort: others may have voted NO or already learned COMMIT. Three-phase commit and consensus-based commit (Paxos Commit, Spanner) reduce the blocking.",
    difficulty: 2,
    tags: ["2PC", "blocking"],
    askedAt: "Distributed transactions follow-up.",
  },
  {
    id: "dst-2pc-no",
    topic: "distributed",
    kind: "truefalse",
    prompt: "In two-phase commit, a participant that votes NO can abort its part immediately.",
    answer: true,
    explanation: "A NO vote guarantees the global outcome is abort, so the participant can safely roll back and release locks without waiting.",
    difficulty: 2,
    tags: ["2PC"],
  },
  {
    id: "dst-saga",
    topic: "distributed",
    kind: "mcq",
    prompt: "In a saga, what happens when step 3 of 5 fails?",
    choices: ["Compensating actions undo steps 2 and 1 (in reverse order)", "The database rolls back with ACID isolation", "Steps 4 and 5 run anyway", "Nothing: sagas ignore failures"],
    answer: 0,
    explanation: "A saga is a sequence of local transactions with a compensation for each. It trades atomic isolation for availability: other transactions may see intermediate states.",
    difficulty: 3,
    tags: ["saga", "distributed transactions"],
  },
  {
    id: "dst-eventual",
    topic: "distributed",
    kind: "mcq",
    prompt: "What does eventual consistency promise?",
    choices: ["If writes stop, all replicas eventually converge to the same value", "Reads always return the latest write", "Writes are never lost even without replication", "Transactions are serializable"],
    answer: 0,
    explanation: "It says nothing about how long convergence takes or what reads return meanwhile. Conflict resolution (last-write-wins, vector clocks, CRDTs) decides which value wins.",
    difficulty: 1,
    tags: ["consistency models"],
  },
  {
    id: "dst-lww",
    topic: "distributed",
    kind: "mcq",
    prompt: "What is the main hazard of last-write-wins conflict resolution?",
    choices: ["Concurrent updates are silently dropped, and clock skew can pick the wrong winner", "It is too slow", "It needs three replicas", "It cannot be used with timestamps"],
    answer: 0,
    explanation: "LWW keeps one of two concurrent writes and discards the other without telling anyone. Vector clocks detect concurrency; CRDTs merge instead of overwrite.",
    difficulty: 3,
    tags: ["conflict resolution"],
  },
  {
    id: "dst-store-kinds",
    topic: "distributed",
    kind: "multi",
    prompt: "Which of these are NoSQL data models?",
    choices: ["Key-value", "Document", "Wide-column", "Graph"],
    answers: [0, 1, 2, 3],
    explanation: "Key-value (Redis, DynamoDB), document (MongoDB), wide-column (Cassandra, HBase) and graph (Neo4j) are the four classic families.",
    difficulty: 1,
    tags: ["NoSQL"],
  },
  {
    id: "dst-graph-use",
    topic: "distributed",
    kind: "mcq",
    prompt: "Which store fits 'friends of friends who like X' with variable-depth traversals best?",
    choices: ["A graph database", "A key-value cache", "A column-family store", "A flat file"],
    answer: 0,
    explanation: "Graph stores keep adjacency directly, so multi-hop traversals do not need a join per hop. In SQL it takes recursive CTEs or repeated self-joins.",
    difficulty: 1,
    tags: ["NoSQL", "graph"],
  },
  {
    id: "dst-doc-use",
    topic: "distributed",
    kind: "mcq",
    prompt: "A catalogue has products whose attributes differ wildly by category and are always read together. Which model suits it?",
    choices: ["Document store", "Key-value store with opaque blobs and secondary scans", "Strictly normalised relational tables with one column per attribute", "Graph store"],
    answer: 0,
    explanation: "Documents hold a whole, flexible-schema aggregate in one read. The cost: cross-document joins and constraints are weaker, and duplicated data must be updated in many places.",
    difficulty: 2,
    tags: ["NoSQL", "document"],
  },
  {
    id: "dst-sql-vs-nosql",
    topic: "distributed",
    kind: "multi",
    prompt: "Which needs favour a relational database over a typical NoSQL store?",
    choices: ["Multi-row ACID transactions (payments, inventory)", "Ad-hoc queries and joins across many entities", "Strong integrity constraints (foreign keys)", "Horizontally partitioned writes of unbounded size with simple key access"],
    answers: [0, 1, 2],
    explanation: "Relational engines shine at transactions, joins and constraints. The last need (massive key-addressed writes) is where NoSQL scales out more easily, though many NewSQL systems now offer both.",
    difficulty: 2,
    tags: ["NoSQL", "SQL vs NoSQL"],
    askedAt: "'Why not just use MongoDB?'",
  },
  {
    id: "dst-base",
    topic: "distributed",
    kind: "mcq",
    prompt: "BASE is the NoSQL counterpart to ACID. What does it stand for?",
    choices: ["Basically Available, Soft state, Eventual consistency", "Balanced, Atomic, Serial, Eventual", "Backed-up, Available, Synchronised, Exact", "Basic Atomic Synchronous Execution"],
    answer: 0,
    explanation: "BASE favours availability and tolerates temporarily inconsistent (soft) state that converges later.",
    difficulty: 1,
    tags: ["BASE", "ACID"],
  },
  {
    id: "dst-split-brain",
    topic: "distributed",
    kind: "mcq",
    prompt: "A network partition leaves two nodes each believing they are the primary. What is this called, and how is it prevented?",
    choices: ["Split brain; require a majority quorum (or a fencing token) to act as primary", "Deadlock; use timeouts", "Phantom read; use serializable isolation", "Replication lag; add more replicas"],
    answer: 0,
    explanation: "Only the side holding a majority may elect a primary, so at most one side can. Fencing tokens stop a stale primary from writing after it loses leadership.",
    difficulty: 3,
    tags: ["split brain", "leader election"],
  },
  {
    id: "dst-quorum-3",
    topic: "distributed",
    kind: "numeric",
    prompt: "A cluster has N = 5 replicas and uses majority quorums for reads and writes. How many replica failures can it survive and still serve both?",
    answer: failuresTolerated(5, majority(5)),
    explanation: "Majority of 5 is 3, so 5 − 3 = 2 replicas may be down.",
    difficulty: 2,
    tags: ["quorum"],
  },
  {
    id: "dst-read-scale",
    topic: "distributed",
    kind: "mcq",
    prompt: "An app is read-heavy with a single database at its CPU limit. Which first step usually helps most?",
    choices: ["Add read replicas (and a cache) before sharding", "Shard immediately across 64 nodes", "Switch every table to a key-value store", "Turn off indexes"],
    answer: 0,
    explanation: "Replication scales reads cheaply and keeps single-node transactions. Sharding adds cross-shard queries and distributed transactions, so it comes when writes or data size demand it.",
    difficulty: 2,
    tags: ["replication", "scaling"],
  },
];

function table(title: string, columns: string[], rows: (string | number)[][]): Relation {
  return { name: title, columns, rows };
}

const QUORUM_NAMES = ["Cassandra-style", "Dynamo-style", "Riak-style"];

/** Quorum arithmetic: overlap, tolerated failures. */
export const quorumGen: Generator = {
  id: "dst-gen-quorum",
  topic: "distributed",
  difficulty: 2,
  tags: ["quorum", "consistency"],
  askedAt: "Dynamo-style stores.",
  generate(seed) {
    const r = rng(seed);
    const n = randInt(r, 3, 9);
    const w = randInt(r, 1, n);
    const rd = randInt(r, 1, n);
    const kind = seed % 3;
    const t = table(`${QUORUM_NAMES[seed % QUORUM_NAMES.length]} cluster`, ["Replicas N", "Write quorum W", "Read quorum R"], [[n, w, rd]]);
    if (kind === 0) {
      const strong = quorumsOverlap(n, rd, w);
      return {
        id: `dst-gen-quorum-${seed}`,
        topic: "distributed",
        kind: "truefalse",
        prompt: "Is every read guaranteed to overlap the most recent acknowledged write (no sloppy quorums, no failures during the operation)?",
        tables: [t],
        answer: strong,
        explanation: `R + W = ${rd} + ${w} = ${rd + w} ${strong ? ">" : "≤"} N = ${n}, so ${strong ? "every read set shares at least one replica with every write set." : "a read set can miss every replica that took the write, so a stale read is possible."}`,
        difficulty: 2,
        tags: quorumGen.tags,
        askedAt: quorumGen.askedAt,
      };
    }
    if (kind === 1) {
      const answer = failuresTolerated(n, w);
      return {
        id: `dst-gen-quorum-${seed}`,
        topic: "distributed",
        kind: "numeric",
        prompt: "How many replicas can be down while writes still succeed?",
        tables: [t],
        answer,
        explanation: `A write needs W = ${w} acknowledgements out of N = ${n} replicas, so N − W = ${answer} replicas may be unavailable.`,
        difficulty: 2,
        tags: quorumGen.tags,
        askedAt: quorumGen.askedAt,
      };
    }
    const safe = writesConflictSafe(n, w);
    return {
      id: `dst-gen-quorum-${seed}`,
      topic: "distributed",
      kind: "truefalse",
      prompt: "Can two concurrent writes to the same key both be acknowledged by disjoint sets of replicas?",
      tables: [t],
      answer: !safe,
      explanation: `Two write quorums must overlap when 2W > N. Here 2 · ${w} = ${2 * w} ${safe ? ">" : "≤"} ${n}, so ${safe ? "they always share a replica, which can reject the conflicting write." : "two writes can succeed on disjoint replica sets and diverge."}`,
      difficulty: 3,
      tags: quorumGen.tags,
      askedAt: quorumGen.askedAt,
    };
  },
};

/** Shard placement by mod and range, and how much data a resharding moves. */
export const shardGen: Generator = {
  id: "dst-gen-shard",
  topic: "distributed",
  difficulty: 2,
  tags: ["sharding", "partitioning"],
  askedAt: "System design: partitioning.",
  generate(seed) {
    const r = rng(seed);
    const keys = Array.from({ length: randInt(r, 8, 14) }, () => randInt(r, 10, 199));
    const unique = [...new Set(keys)];
    const kind = seed % 3;
    const t = table("Keys to place", ["Keys"], [[unique.join(", ")]]);
    if (kind === 0) {
      const shards = randInt(r, 3, 5);
      const target = randInt(r, 0, shards - 1);
      const answer = unique.filter((k) => modShard(k, shards) === target).length;
      return {
        id: `dst-gen-shard-${seed}`,
        topic: "distributed",
        kind: "numeric",
        prompt: `Keys are placed on ${shards} shards (numbered 0 to ${shards - 1}) by key mod ${shards}. How many of these keys land on shard ${target}?`,
        tables: [t],
        answer,
        explanation: `Shard ${target} gets the keys with key mod ${shards} = ${target}: ${unique.filter((k) => modShard(k, shards) === target).join(", ") || "none"}. That is ${answer}.`,
        difficulty: 1,
        tags: shardGen.tags,
        askedAt: shardGen.askedAt,
      };
    }
    if (kind === 1) {
      const from = randInt(r, 3, 5);
      const to = from + 1;
      const answer = movedByMod(unique, from, to);
      return {
        id: `dst-gen-shard-${seed}`,
        topic: "distributed",
        kind: "numeric",
        prompt: `Data is sharded by key mod N. The cluster grows from ${from} to ${to} shards. How many of these keys must move to a different shard?`,
        tables: [t],
        answer,
        explanation: `Compare key mod ${from} with key mod ${to} for each key: ${unique.map((k) => `${k}→${modShard(k, from)}/${modShard(k, to)}`).join(", ")}. ${answer} of ${unique.length} change shard. Mod placement reshuffles most keys; consistent hashing would move only about 1/${to}.`,
        difficulty: 2,
        tags: shardGen.tags,
        askedAt: shardGen.askedAt,
      };
    }
    const b1 = randInt(r, 40, 80);
    const b2 = randInt(r, b1 + 20, 150);
    const bounds = [b1, b2];
    const target = randInt(r, 0, 2);
    const answer = unique.filter((k) => rangeShard(k, bounds) === target).length;
    const range = ["keys ≤ " + b1, `${b1 + 1} ≤ keys ≤ ${b2}`, "keys > " + b2][target];
    return {
      id: `dst-gen-shard-${seed}`,
      topic: "distributed",
      kind: "numeric",
      prompt: `Range partitioning uses 3 shards: shard 0 holds keys ≤ ${b1}, shard 1 holds ${b1 + 1} to ${b2}, shard 2 holds keys > ${b2}. How many of these keys are on shard ${target}?`,
      tables: [t],
      answer,
      explanation: `Shard ${target} holds ${range}: ${unique.filter((k) => rangeShard(k, bounds) === target).join(", ") || "none"}, so ${answer}. Range partitions keep range scans on few shards but can create hotspots.`,
      difficulty: 1,
      tags: shardGen.tags,
      askedAt: shardGen.askedAt,
    };
  },
};

/** What does two-phase commit decide? */
export const twoPcGen: Generator = {
  id: "dst-gen-2pc",
  topic: "distributed",
  difficulty: 2,
  tags: ["2PC", "distributed transactions"],
  askedAt: "Distributed transactions.",
  generate(seed) {
    const r = rng(seed);
    const n = randInt(r, 2, 5);
    const noCount = r() < 0.5 ? 0 : randInt(r, 1, Math.min(2, n));
    const votes = shuffled(r, Array.from({ length: n }, (_, i) => (i < noCount ? "no" : "yes") as "yes" | "no"));
    const crash = seed % 3 === 0;
    const outcome = twoPhaseCommit(votes, crash);
    const choices = ["Global commit", "Global abort", "Participants that voted YES block until the coordinator recovers", "Each participant decides on its own"];
    const answer = outcome === "commit" ? 0 : outcome === "abort" ? 1 : 2;
    const msgs = twoPcMessages(n);
    const t = table("Votes", ["Participant", "Vote"], votes.map((v, i) => [`P${i + 1}`, v.toUpperCase()]));
    const base = crash ? "The coordinator crashes after collecting all votes but before sending any decision. " : "";
    return {
      id: `dst-gen-2pc-${seed}`,
      topic: "distributed",
      kind: "mcq",
      prompt: `${base}What is the outcome of this two-phase commit round?`,
      tables: [t],
      choices,
      answer,
      explanation:
        outcome === "commit"
          ? `All ${n} participants voted YES, so the coordinator logs COMMIT and tells everyone. A failure-free round costs ${msgs} messages (prepare, vote, decision, ack per participant).`
          : outcome === "abort"
            ? `${noCount} participant(s) voted NO, so the decision is ABORT; any NO vote aborts the transaction. A NO voter may abort immediately.${crash ? " Even though the coordinator crashed, the YES voters are not stuck: a NO voter knows the outcome can only be abort, so when they ask each other (the cooperative termination protocol) it tells them to roll back. Blocking needs every reachable participant to be prepared with no one who knows the decision." : ""}`
            : `Every vote was YES, so all participants are prepared and holding locks, but nobody has the decision. They cannot commit or abort alone and must wait for the coordinator to recover: this is why 2PC blocks.`,
      difficulty: 2,
      tags: twoPcGen.tags,
      askedAt: twoPcGen.askedAt,
    };
  },
};

export const DISTRIBUTED_GENERATORS: Generator[] = [quorumGen, shardGen, twoPcGen];

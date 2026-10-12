# Query Clash roadmap

The hourly routine works top to bottom: take the first unchecked box. Split big items into sub-boxes when you start them.

## A. Creature-battler art overhaul (original, Pokémon-*style*)

- [x] A1. Pixel-sprite system: define sprites as palette + character-grid strings in code (e.g. 64×64), render them to Pixi textures with nearest-neighbour scaling, and support a 2–4 frame idle animation. Include a unit test that every sprite map is rectangular and uses only palette keys.
- [ ] A2. Redraw the player as a creature trainer team. The player owns a starter creature (an original "data sprite" monster). Redraw the 10 bosses as original pixel monsters, keeping each one's theme (null ghost, chain golem, block golem, ice wraith, reaper, clockwork knight, forge giant, wind spirit, hydra, eye core).
  - [x] A2a. BYTEBAT back sprite plus hurt/faint animations; NULLOTH (null ghost) as the first 96×96 boss with idle/attack/hurt/faint.
  - [ ] A2b. Bosses 2–4: chain golem (Joinmaster), block golem (Aggregon), ice wraith — 96×96, idle/attack/hurt/faint.
  - [ ] A2c. Bosses 5–7: reaper, clockwork knight, forge giant.
  - [ ] A2d. Bosses 8–10: wind spirit, hydra, eye core.
  - [ ] A2e. Map each `BossId` to its sprite (and the starter to BYTEBAT) in a lookup with a test that every boss has one; add evolve frames for BYTEBAT.
- [ ] A3. GBA-style battle layout: foe front-sprite top-right on an elliptical platform, player back-sprite bottom-left, HP boxes with name / Lv / HP bar / XP bar, and a bottom text box that types out messages ("Wild NULLOTH appeared!", "BYTEBAT used JOIN CHAIN! It's super effective!"). Keep the existing spell effects, restyled to suit pixel art.
- [ ] A4. Types and effectiveness: give SQL concept types (Filter, Join, Aggregate, Window, Recursive, Transaction, Schema, Index…) a type chart against boss types. Show "super effective" / "not very effective" and fold the multiplier into damage. Add tests for the chart.
- [ ] A5. Collection: defeated bosses can be "captured" into a party/box screen (Querydex) with stats, and the starter evolves at chapter milestones (an evolution animation). Saved in localStorage.
- [ ] A6. Pixel UI pass: pixel font (an OFL font via next/font, e.g. Press Start 2P / Pixelify Sans), menus restyled as handheld-console menus, and transitions (screen wipe on battle start). Must stay readable and touch-friendly on iPhone.

## B. DBMS Interview mode (`/interview`)

A full DBMS curriculum for placement and system-design interviews, played as creature battles. Correct answer = your attack. Wrong answer = the foe's attack, plus an explanation.

- [ ] B1. Engine: question types MCQ, multi-select, true/false, order-the-steps, numeric/short answer, and generated problems. Questions live in `content/interview/*.ts` with explanation, difficulty, tags and an "asked at" note (e.g. common in product-company interviews). Add the route, a topic picker and a battle wrapper that reuses the battle screen.
- [ ] B2. ER modelling and relational model: entities, weak entities, cardinality and participation, ER→relational mapping, keys (super/candidate/primary/foreign/composite), relational algebra (σ, π, ⋈, ÷) with small evaluable examples.
- [ ] B3. Functional dependencies and normalization: an attribute-closure solver, candidate-key finder, minimal cover, and a normal-form classifier (1NF–BCNF, plus 4NF/5NF notes). Generated "find the keys / highest NF / decompose" problems, solver-checked against textbook examples. Cover lossless join and dependency preservation.
- [ ] B4. Transactions: ACID, schedules, conflict/view serializability (precedence-graph builder with drawn graph), recoverable/cascadeless/strict schedules, and isolation anomalies (dirty read, non-repeatable read, phantom, lost update, write skew) per isolation level.
- [ ] B5. Concurrency control and recovery: 2PL/strict 2PL, lock compatibility, deadlock detection and prevention (wait-die, wound-wait), timestamp ordering, MVCC, WAL, undo/redo, checkpoints, ARIES overview.
- [ ] B6. Storage and indexing: file organization, B-tree vs B+ tree (an interactive insert/split visualizer with generated "tree after inserting…" questions), hashing (static/extendible/linear), clustered vs non-clustered, covering indexes, cost of index lookups.
- [ ] B7. Query processing and optimization: join algorithms (nested loop, block nested loop, sort-merge, hash) with I/O-cost problems, selectivity, join ordering, reading EXPLAIN plans (linked to the SQL battles).
- [ ] B8. Distributed and NoSQL: CAP/PACELC, replication, sharding/partitioning, consistency models, 2PC, document/key-value/column/graph stores, when to pick SQL vs NoSQL.
- [ ] B9. Classic interview SQL: the standard question bank (Nth highest salary, duplicates, running totals, gaps and islands, top-N per group, self-joins, pivots, date bucketing) as SQL battles running on PGlite, in both dialects.
- [ ] B10. Spaced repetition: a Leitner box per question, a "daily interview drill" (10 mixed questions), a weak-topic report, and a mock interview (timed, 20 questions, scorecard).

## C. Polish

- [ ] C1. Two more SQL chapters: indexing deep-dive and SQL anti-patterns (N+1, implicit conversions, `SELECT *`, `OR` defeating indexes).
- [ ] C2. Daily challenge seeded by date, plus a streak counter.
- [ ] C3. Accessibility: keyboard navigation for every screen, ARIA live region for battle text, colour-blind-safe type colours.
- [ ] C4. Performance pass on mobile GPUs (texture atlases, fewer redraws), and a lighter first load (lazy-load PGlite after the menu).

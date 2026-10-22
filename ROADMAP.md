# Query Clash roadmap

The hourly routine works top to bottom: take the first unchecked box. Split big items into sub-boxes when you start them.

## A. Creature-battler art overhaul (original, Pokémon-*style*)

- [x] A1. Pixel-sprite system: define sprites as palette + character-grid strings in code (e.g. 64×64), render them to Pixi textures with nearest-neighbour scaling, and support a 2–4 frame idle animation. Include a unit test that every sprite map is rectangular and uses only palette keys.
- [x] A2. Redraw the player as a creature trainer team. The player owns a starter creature (an original "data sprite" monster). Redraw the 10 bosses as original pixel monsters, keeping each one's theme (null ghost, chain golem, block golem, ice wraith, reaper, clockwork knight, forge giant, wind spirit, hydra, eye core).
  - [x] A2a. BYTEBAT back sprite plus hurt/faint animations; NULLOTH (null ghost) as the first 96×96 boss with idle/attack/hurt/faint.
  - [x] A2b. Bosses 2–4: chain golem (Joinmaster), block golem (Aggregon), ice wraith — 96×96, idle/attack/hurt/faint.
  - [x] A2c. Bosses 5–7: reaper, clockwork knight, forge giant.
  - [x] A2d. Bosses 8–10: wind spirit, hydra, eye core.
  - [x] A2e. Map each `BossId` to its sprite (`subzero` → `frostnest`; the starter to BYTEBAT) in a lookup with a test that every boss has one; add evolve frames for BYTEBAT.
- [x] A3. GBA-style battle layout: foe front-sprite top-right on an elliptical platform, player back-sprite bottom-left, HP boxes with name / Lv / HP bar / XP bar, and a bottom text box that types out messages ("Wild NULLOTH appeared!", "BYTEBAT used JOIN CHAIN! It's super effective!"). Keep the existing spell effects, restyled to suit pixel art.
  - [x] A3a. Battle stage uses the pixel creatures: foe front sprite top-right and BYTEBAT's back sprite bottom-left, each on a grassy stone platform, sliding in at battle start; attack/hurt/faint frames drive the existing spell and counter effects.
  - [x] A3b. Handheld-style HP boxes (name / Lv / HP bar / XP bar) replacing the "Data Mage" header bars, foe box top-left and player box bottom-right of the stage.
  - [x] A3c. Bottom text box that types out battle messages ("Wild NULLOTH appeared!", "BYTEBAT used JOIN CHAIN!"; "It's super effective!" arrives with A4).
  - [x] A3d. Restyle the spell and counter effects for pixel art: sprite-based projectiles, impact sparks, beams and slashes with frame animation (particles only as extras).
    - [x] A3d1. Pixel FX sprite library (orb, impact spark, slash, shock ring, tileable beam; 4 frames each, colour ramp from the spell colour) and the shared helpers (projectile, beam, slash, ring, impact spark on every hit) drawn with it; shown in /dev/sprites.
    - [x] A3d2. Bespoke pixel art for the spells that still draw vector shapes.
      - [x] A3d2a. Chain links, meteor, summon minions, shield dome, bricks and lance.
      - [x] A3d2b. Portals (mirror), join frame (blade), surge wave and vortex (storm bolts go with the pixel lightning in A3d3).
    - [x] A3d3. Bespoke pixel art for the boss counters (gear, wind blades, breath, quake rocks, ice shards) and a pixel lightning bolt.
      - [x] A3d3a. Gear (Transactor), wind blades (Galeframe) and ice shards (Frostnest).
      - [x] A3d3b. Breath (Recursa), quake rocks (Schemaforge) and a pixel lightning bolt (storm spell).
- [x] A4. Types and effectiveness: give SQL concept types (Filter, Join, Aggregate, Window, Recursive, Transaction, Schema, Index…) a type chart against boss types. Show "super effective" / "not very effective" and fold the multiplier into damage. Add tests for the chart.
- [x] A5. Collection: defeated bosses can be "captured" into a party/box screen (Querydex) with stats, and the starter evolves at chapter milestones (an evolution animation). Saved in localStorage.
  - [x] A5a. Querydex: a campaign win captures the boss (saved with date and win count; old saves migrate from chapter stars), a `/querydex` party + box screen with animated sprites, silhouettes for unmet bosses, and a stats card (No., type, Lv, HP, wins, stars, weaknesses/resists), plus a capture note on the victory card.
  - [x] A5b. Starter evolution: BYTEBAT evolves at chapter milestones (e.g. after chapters 3 and 7) with a white-silhouette morph animation on the victory screen; the evolved form shows in battle, the HP box and the Querydex party.
    - [x] A5b1. KILOBAT (BYTEBAT's first evolution) front + back sprites with idle/attack/hurt/faint/evolve, the `STARTER_LINE` and a staged `starterSprite`, and the pure `starterStage` / `evolvedBy` milestone logic (after chapters 3 and 7), with tests.
    - [x] A5b2. Wire the stage in: the evolved form in battle (back sprite, HP box name), the Querydex party panel and the main menu; an evolution scene on the victory card when a capture evolves the starter (BYTEBAT's evolve frames morphing into KILOBAT, then "BYTEBAT evolved into KILOBAT!").
    - [x] A5b3. The final form (after chapter 7): a third original 64×64 front + back sprite with all animations, added to `STARTER_LINE`.
- [x] A6. Pixel UI pass: pixel font (an OFL font via next/font, e.g. Press Start 2P / Pixelify Sans), menus restyled as handheld-console menus, and transitions (screen wipe on battle start). Must stay readable and touch-friendly on iPhone.
  - [x] A6a. Pixel font (Tiny5, OFL, via next/font) for every display face and the Pixi stage text; the UI kit (buttons, modals, chips, HP bars, dialect toggle, panels) restyled as handheld-console windows with hard outlines and press ledges; the main menu as a handheld menu (pixel title, colour tabs, blinking ▸ cursor).
  - [x] A6b. Battle-start transition: a pixel screen wipe (e.g. diagonal block wipe or flash bands) into every battle (campaign, arena, versus), skipped under reduced motion.
  - [x] A6c. Restyle the remaining screens' bespoke menus (campaign map nodes, battle command bar and result tabs, codex and bestiary lists, victory/defeat cards) to the handheld style.
    - [x] A6c1. Campaign map as a pixel overworld: a generated pixel map (a biome per chapter, a road, a river with a bridge, trees/rocks/crystals, stone platforms, fog over locked chapters), boss sprites on the nodes (silhouettes when locked), the starter by the newest node, a blinking cursor, and the side panel's boss portrait.
    - [x] A6c2. Battle command bar and result tabs.
    - [x] A6c3. Codex and bestiary lists.
    - [x] A6c4. Victory/defeat cards.

## B. DBMS Interview mode (`/interview`)

A full DBMS curriculum for placement and system-design interviews, played as creature battles. Correct answer = your attack. Wrong answer = the foe's attack, plus an explanation.

- [x] B1. Engine: question types MCQ, multi-select, true/false, order-the-steps, numeric/short answer, and generated problems. Questions live in `content/interview/*.ts` with explanation, difficulty, tags and an "asked at" note (e.g. common in product-company interviews). Add the route, a topic picker and a battle wrapper that reuses the battle screen.
  - [x] B1a. Question engine: the question model and grading for every type (MCQ, multi-select, true/false, order, numeric, short answer), seeded generated problems, a deck builder, the topic list, and a first content file (DBMS fundamentals) with a test for every answer.
  - [x] B1b. `/interview` route with a handheld-style topic picker (per-topic progress, difficulty filter).
  - [x] B1c. Battle wrapper: the interview battle reuses the battle stage, HP boxes and text box; an answer panel per question type; correct = attack, wrong = the foe's attack plus the explanation.
- [x] B2. ER modelling and relational model: entities, weak entities, cardinality and participation, ER→relational mapping, keys (super/candidate/primary/foreign/composite), relational algebra (σ, π, ⋈, ÷) with small evaluable examples.
- [x] B3. Functional dependencies and normalization: an attribute-closure solver, candidate-key finder, minimal cover, and a normal-form classifier (1NF–BCNF, plus 4NF/5NF notes). Generated "find the keys / highest NF / decompose" problems, solver-checked against textbook examples. Cover lossless join and dependency preservation.
  - [x] B3a. FD solvers (closure, candidate keys, minimal cover, projection, NF classifier, binary and chase lossless tests, dependency preservation), fixed questions (FDs, Armstrong, keys, 1NF–BCNF, 4NF/5NF notes, lossless join, preservation) and generated closure / key-count / highest-NF / lossless / preservation problems.
  - [x] B3b. Decomposition: BCNF decomposition and 3NF synthesis algorithms with generated "decompose this" problems (pick the right decomposition), checked lossless (chase) and, for 3NF, dependency-preserving.
- [x] B4. Transactions: ACID, schedules, conflict/view serializability (precedence-graph builder with drawn graph), recoverable/cascadeless/strict schedules, and isolation anomalies (dirty read, non-repeatable read, phantom, lost update, write skew) per isolation level.
  - [x] B4a. Schedule solvers (conflicts, precedence graph, topological serial orders, view equivalence, reads-from, strict/cascadeless/recoverable classification), fixed questions (ACID, states, conflicts, conflict vs view serializability, recoverability, cascading rollback, isolation anomalies and levels, PostgreSQL/Oracle specifics) and generated serial-order / edge-count / conflict-serializable / recoverability / view-serializable problems.
  - [x] B4b. A drawn precedence graph (pixel SVG) under schedule prompts and in explanations, plus generated isolation-level anomaly problems ("which anomaly does this interleaving show, and which lowest level prevents it?").
- [x] B5. Concurrency control and recovery: 2PL/strict 2PL, lock compatibility, deadlock detection and prevention (wait-die, wound-wait), timestamp ordering, MVCC, WAL, undo/redo, checkpoints, ARIES overview.
  - [x] B5a. Concurrency control: lock compatibility (S/X and multiple granularity), the 2PL family (basic, strict, rigorous, conservative), wait-for graphs and deadlock detection, wait-die / wound-wait, timestamp ordering with Thomas' write rule, validation; generated "strongest locking protocol", "which transactions are deadlocked?" (drawn wait-for graph), "wait-die / wound-wait outcome" and "first rejected operation under timestamp ordering" problems.
  - [x] B5b. Recovery and MVCC: WAL, undo/redo logging, checkpoints, ARIES (analysis/redo/undo, LSNs, CLRs), MVCC snapshots and visibility, with generated "which transactions are redone/undone after this crash?" log problems.
    - [x] B5b1. Recovery: WAL, steal/force, immediate (undo/redo) and deferred (redo-only) logging, checkpoints, ARIES (analysis/redo/undo, LSNs, pageLSN, CLRs, fuzzy checkpoints), shadow paging; generated "which transactions are redone/undone?", "value after recovery", ARIES "where does redo start?" and "which transactions are losers?" problems.
    - [x] B5b2. MVCC: snapshots and visibility rules (PostgreSQL xmin/xmax, Oracle undo-based read consistency), snapshot isolation vs serializable, with generated "which row version does this transaction see?" problems.
- [x] B6. Storage and indexing: file organization, B-tree vs B+ tree (an interactive insert/split visualizer with generated "tree after inserting…" questions), hashing (static/extendible/linear), clustered vs non-clustered, covering indexes, cost of index lookups.
  - [x] B6a. B+ tree insert simulator (`lib/dbms/btree.ts`), 18 fixed storage and indexing questions (pages, B vs B+, splits, fan-out, clustered, covering, composite prefix, selectivity), generated "leaves / levels after inserting", "which keys are in the root?" and "levels from block/key/pointer sizes" problems.
  - [x] B6b. Hashing and the visualizer.
    - [x] B6b1. Hashing (static, extendible, linear) solvers, 9 fixed questions and generated problems.
    - [x] B6b2. An interactive insert/split B+ tree visualizer (type a key, watch the split), shown in the Storage battle's explanations or on a topic page.
- [x] B7. Query processing and optimization: join algorithms (nested loop, block nested loop, sort-merge, hash) with I/O-cost problems, selectivity, join ordering, reading EXPLAIN plans (linked to the SQL battles).
- [x] B8. Distributed and NoSQL: CAP/PACELC, replication, sharding/partitioning, consistency models, 2PC, document/key-value/column/graph stores, when to pick SQL vs NoSQL.
- [x] B9. (first slice: 14 questions, new "write the SQL" question kind graded on PGlite in both dialects; more questions can be added to `content/interview/sql.ts`) Classic interview SQL: the standard question bank (Nth highest salary, duplicates, running totals, gaps and islands, top-N per group, self-joins, pivots, date bucketing) as SQL battles running on PGlite, in both dialects.
- [x] B10. Spaced repetition: a Leitner box per question, a "daily interview drill" (10 mixed questions), a weak-topic report, and a mock interview (timed, 20 questions, scorecard).
  - [x] B10a. Leitner engine (`lib/leitner.ts`: five boxes, due days, daily drill builder, weak-topic stats), answers recorded from every interview battle, and a Daily drill + weak-topic panel on `/interview`.
  - [x] B10b. Mock interview: timed, 20 questions mixed across topics, no explanations until the end, a scorecard (per-topic breakdown, time, grade) saved to the save file.

## C. Polish

- [x] C1. Two more SQL chapters: indexing deep-dive and SQL anti-patterns (N+1, implicit conversions, `SELECT *`, `OR` defeating indexes).
  - [x] C1a. Chapter 11 "indexing deep-dive" missions (`content/chapters/part3.ts`: composite, expression, sorted, covering, redundant-index defense) and three codex entries, tested; not yet in `CHAPTERS`.
  - [x] C1b. Boss for chapter 11 (original 96×96 pixel monster with idle/attack/hurt/faint, type, biome, map node), then wire `INDEXING_MISSIONS` into a `Chapter`.
    - [x] C1b1. Boss art: ARBORIX (`scripts/art/arborix.mjs` → `game/sprites/creatures/arborix.ts`), a bark golem crowned with a B+ tree; registered in `SPRITES` and tested; the `/dev/sprites` Pixi previews now mount lazily (17 sprites exceeded the browser's WebGL context limit).
    - [x] C1b2. Wiring: add a `BossId` for it (`BOSS_SPRITE`, `BOSS_TYPE` = index, `BOSS_GLYPH`, the unused vector-rig `REGISTRY`), an 11th `BossAttackStyle` (new case in `game/render/attacks.ts`, since tests need distinct styles), an 11th overworld `MAP_NODES` / `BIOMES` entry, `Chapter` 11 in `CHAPTERS`, and fix the "10 bosses/chapters" assumptions in tests, Querydex, campaign page and save.
  - [x] C1c. Chapter 12 "SQL anti-patterns" missions (N+1 as a join, `SELECT *`, `OR` as `UNION`, implicit conversions, `NOT IN` with NULL), three new codex entries, tested, not yet in `CHAPTERS`.
  - [x] C1d. Boss for chapter 12 and its wiring (same checklist as C1b2: `BossId`, `BOSS_SPRITE`, `BOSS_TYPE`, `BOSS_GLYPH`, `REGISTRY`, a 12th attack style, `MAP_NODES`/`BIOMES`, `CHAPTERS`, the hard-coded `11` in `lib/save.ts` and `app/sandbox/page.tsx`, test counts).
    - [x] C1d1. Boss art: HYDRAX (`scripts/art/hydrax.mjs` → `game/sprites/creatures/hydrax.ts`), the N+1 hydra, registered in `SPRITES` and tested.
    - [x] C1d2. Wiring (checklist above).
- [x] C2. Daily challenge seeded by date, plus a streak counter (`lib/daily.ts`, panel on `/interview`; five questions from five topics, same for everyone each UTC day; a win extends the streak).
- [x] C3. Accessibility: keyboard navigation for every screen, ARIA live region for battle text, colour-blind-safe type colours.
  - [x] C3a. ARIA live region for battle text (`BattleTextBox`, whole message announced at once) and a distinct shape symbol on every type tag (`TYPE_INFO.symbol`, tested).
  - [x] C3b. Keyboard navigation: a global visible focus ring, Esc closes dialogs (`Modal` is now `role=dialog`), number / letter / T-F shortcuts for interview answer choices (map nodes and menu tiles were already focusable).
- [x] C4. Performance pass on mobile GPUs (texture atlases, fewer redraws), and a lighter first load (lazy-load PGlite after the menu).
  - [x] C4a. PGlite worker boots on browser idle (`warmupWhenIdle`) instead of during first paint, on the menu and campaign pages.
  - [x] C4b. Pixi battle stage: `antialias: false` for pixel art; moon + skyline rasterised once with `cacheAsTexture` (resolution 1); the scrolling floor lines are 12 pre-drawn Graphics whose y moves per frame, instead of clearing and re-stroking a Graphics every frame.

## D. Next ideas (added when A-C were all done)

- [x] D1. Spell-deck keyboard shortcuts in the campaign battle (1-4 to pick a spell), the item C3b skipped.
- [ ] D2. Refresh `docs/bosses.png` (README screenshot) so it shows all twelve bosses.
- [ ] D3. More interview questions per topic (aim for 30+ each), each with a test for its answer.
- [ ] D4. A third dialect note set (MySQL differences) as codex-only entries.

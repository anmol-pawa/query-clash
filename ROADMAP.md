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
- [ ] A6. Pixel UI pass: pixel font (an OFL font via next/font, e.g. Press Start 2P / Pixelify Sans), menus restyled as handheld-console menus, and transitions (screen wipe on battle start). Must stay readable and touch-friendly on iPhone.
  - [x] A6a. Pixel font (Tiny5, OFL, via next/font) for every display face and the Pixi stage text; the UI kit (buttons, modals, chips, HP bars, dialect toggle, panels) restyled as handheld-console windows with hard outlines and press ledges; the main menu as a handheld menu (pixel title, colour tabs, blinking ▸ cursor).
  - [x] A6b. Battle-start transition: a pixel screen wipe (e.g. diagonal block wipe or flash bands) into every battle (campaign, arena, versus), skipped under reduced motion.
  - [ ] A6c. Restyle the remaining screens' bespoke menus (campaign map nodes, battle command bar and result tabs, codex and bestiary lists, victory/defeat cards) to the handheld style.
    - [x] A6c1. Campaign map as a pixel overworld: a generated pixel map (a biome per chapter, a road, a river with a bridge, trees/rocks/crystals, stone platforms, fog over locked chapters), boss sprites on the nodes (silhouettes when locked), the starter by the newest node, a blinking cursor, and the side panel's boss portrait.
    - [ ] A6c2. Battle command bar and result tabs.
    - [ ] A6c3. Codex and bestiary lists.
    - [ ] A6c4. Victory/defeat cards.

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

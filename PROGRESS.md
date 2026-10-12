# query-clash progress log

Each hourly routine run appends an entry: date (IST), task, what changed, how it was verified, and what's next.

## 2026-10-12: planning
- Added CLAUDE.md (run protocol, art quality bar, rules) and ROADMAP.md. The hourly routine starts from the first unchecked task.

## 2026-10-12 (06:45 IST): A1 pixel-sprite system
- Added `game/sprites/pixel.ts`: sprites as palette + row-string frames with named animations (`idle` 2–4 frames required), a validator, RGBA conversion (incl. white silhouette for hurt/evolve flashes) and frame helpers (mirror, shift, overlay, bounds).
- Added `game/sprites/texture.ts`: nearest-neighbour Pixi textures (cached) and `PixelSprite`, a bottom-anchored animated sprite with `play(anim)` (non-looping anims resolve and return to idle) and `flashAmount`.
- Added `scripts/art/paint.mjs`, a small authoring painter (sphere-shaded ellipses with narrow Bayer dither bands, shaded polygons, lines, per-layer outlines) that emits committed sprite modules, and used it for the first creature: BYTEBAT the starter (64×64, 17 colours, idle 4f wing-flap + attack 3f).
- Added `/dev/sprites`, a sprite viewer: palette swatches, every animation at 1×/2×/4× on switchable backgrounds, plus a live Pixi preview through `PixelSprite` with Attack/Hurt buttons.
- Tests: `tests/sprites.test.ts` checks every sprite is rectangular, uses only palette keys, has a 2–4 frame idle that animates, is ≥64×64; plus helper unit tests.
- Verified: lint, typecheck, 109 tests, build, build:pages all pass. Playwright on the static export (desktop 1280×900 and iPhone 14): viewer and menu render, Pixi preview animates, no console errors, no horizontal overflow.
- Next: A2 (redraw the player creature team and the 10 bosses as pixel monsters, with back sprites; bosses 96×96). Likely split per boss group; BYTEBAT still needs a back sprite and hurt/faint frames.

## 2026-10-12 (11:20 IST): A2a BYTEBAT back sprite + NULLOTH boss
- Split A2 into A2a–A2e in ROADMAP.md (bosses in groups of three, then the BossId → sprite lookup and evolve frames).
- BYTEBAT: added `hurt` (2f, squeezed > < eyes) and `faint` (4f, x eyes, wings droop, sinks into the ground), plus a new `bytebat-back` sprite (64×64, back view with spine circuit trace) with idle/attack/hurt/faint for the player's side of the battle.
- NULLOTH, the chapter 1 boss (96×96, 14 colours): a hooded void-ghost with ∅ ring eyes, a jagged glowing mouth, wispy clawed arms, a swaying tattered tail and orbiting NULL bits. idle 4f (float + sway), attack 3f (arms raised, mouth open), hurt 2f, faint 4f (dither dissolve).
- `scripts/art/paint.mjs`: `emit()` now makes valid export names for ids with dashes, takes a `script` name, and writes a PNG contact sheet of every frame when `ART_PREVIEW=<dir>` is set (used to judge the art while authoring).
- `/dev/sprites`: the live Pixi preview picks a scale that fits 96×96 bosses (they were cropped at 3×).
- Tests: every sprite must have attack/hurt/faint and its faint must end lower or sparser; roster test for the back sprite and 96×96 boss size.
- Verified: lint, typecheck, 121 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: all three sprites render and animate, no console errors, no horizontal overflow.
- Next: A2b (Joinmaster chain golem, Aggregon block golem, ice wraith as 96×96 bosses).

## 2026-10-12 (11:55 IST): A2b bosses 2–4 (Joinmaster, Aggregon, ice wraith)
- JOINMASTER (chapter 2, 96×96, 18 colours): an iron chain golem on rusted stone legs, gold chain-link arms ending in shackled fists, a bandolier chain and a glowing foreign-key lock on its chest, visor helm with chain-gold horns. idle 4f (sway + key pulse), attack 3f (right fist swung overhead, then slammed), hurt 2f, faint 4f.
- AGGREGON (chapter 3, 96×96, 14 colours): a golem of 2.5D stacked terracotta blocks with a Σ core; its blocks drift apart as it breathes and slam together on attack (fists raised, then compressed). hurt 2f, faint 4f.
- FROSTNEST (chapter 4, the "Sub-Zero Query" boss; sprite id `frostnest` so we don't reuse an existing character name): an ice wraith with an icicle crown, a cloak trailing to a point, ice shoulder shards, icicle talons and a crystal nested in a crystal (a subquery) on its chest, with drifting snowflakes. idle 4f, attack 3f, hurt 2f, faint 4f.
- `scripts/art/paint.mjs`: shared `dissolve()` (faint fade) and `ring()` helpers. Each boss has its own script in `scripts/art/`.
- Tests: the roster test now requires all four bosses so far to exist at 96×96 (the generic sprite tests cover palette, frames, idle animation and faint).
- Verified: lint, typecheck, 136 tests, build, build:pages pass. Judged contact sheets for every frame while authoring; Playwright on the static export `/dev/sprites` at 1280×900 and iPhone 14: all three render and animate, no console errors, no horizontal overflow.
- Next: A2c (reaper, clockwork knight, forge giant).

## 2026-10-12 (16:25 IST): A2c bosses 5–7 (reaper, clockwork knight, forge giant)
- ROWREAPER (chapter 5, "The DML Reaper", 96×96, 18 colours): a hooded skull reaper in a tattered robe with a steel-bladed scythe; three harvested table rows orbit it (dim behind, glowing in front). idle 4f (float + hem sway + orbit), attack 3f (scythe wound back, then swept down to the left), hurt 2f, faint 4f.
- TRANSACTOR (chapter 6, "Clockwork Knight of ACID", 96×96, 19 colours): an armoured knight with a brass gear turning behind a chest window, a wind-up key spinning on its back, a clock-face shield whose hands tick each frame, a red plume and a sword. attack 3f (sword raised overhead, then slashed down), hurt 2f, faint 4f.
- SCHEMAFORGE (chapter 7, "Smith of Structures", 96×96, 18 colours): a cracked-stone forge giant with lava seams, a horned iron helm, a flickering beard of flame and a hot-faced smithing hammer; its leather apron glows with a schema (two tables linked by a key). attack 3f (hammer raised, then slammed in front with impact sparks), hurt 2f, faint 4f.
- `scripts/art/paint.mjs`: `Layer.set()` now returns the layer so calls chain.
- Tests: the roster test now requires all seven bosses so far at 96×96 (generic sprite tests cover palette, frames, idle animation and faint): 151 tests.
- Verified: lint, typecheck, 151 tests, build, build:pages pass. Judged contact sheets for every frame while authoring (fixed clipped scythe/hammer frames); Playwright on the static export `/dev/sprites` at 1280×900 and iPhone 14: all nine sprites render and animate, no console errors, no horizontal overflow.
- Next: A2d (wind spirit, hydra, eye core).

## 2026-10-12 (17:35 IST): A2d bosses 8–10 (wind spirit, hydra, eye core)
- GALEFRAME (chapter 8, "The Windwraith, Dancer of Frames", 96×96, 16 colours): a wind spirit whose body is a spinning funnel with diagonal swirl bands and gust streaks, a pale dancer's mask with a forehead gem in a wind hood, long violet ribbon-arms with wind claws, and a sliding window of three glass panes orbiting it, the lit pane stepping each frame. idle 4f (spin + tip sway), attack 3f (ribbons flung up, then whipped), hurt 2f, faint 4f.
- RECURSA (chapter 9, "The Recursion Hydra", 96×96, 18 colours): a coiled serpent hydra with three heads; each outer neck buds a smaller head, which buds a smaller one still (recursive members), and a gold base-case gem sits on its coils. Heads open jaws with fangs and tongue on attack (rear up, then strike down). hurt 2f, faint 4f.
- OPTICORE (chapter 10, "The Optimizer, Eye of the Planner", 96×96, 18 colours): a veined eye in a riveted brass-and-armour ring with shutter lids; its query plan (a ⋈ root over two children and four scans) hangs beneath on glowing cables, and cost lenses orbit it (passing behind the ring). The pupil roves in idle; attack narrows it to a slit with charge sparkles; faint shuts the armoured lid.
- Sprite ids `galeframe`, `recursa`, `opticore` (the BossId → sprite lookup comes in A2e).
- Tests: roster test requires all ten bosses at 96×96; 166 tests.
- Verified: lint, typecheck, 166 tests, build, build:pages pass. Judged contact sheets for every frame while authoring (respaced hydra heads so the buds stay on canvas, moved the plan tree up, put back-orbit lenses behind the ring). Playwright on the static export `/dev/sprites` at 1280×900 and iPhone 14: all twelve sprites render and animate, no console errors, no horizontal overflow.
- Next: A2e (map each BossId to its sprite with a test, BYTEBAT evolve frames).

## 2026-10-12 (18:30 IST): A2e boss → sprite lookup + BYTEBAT evolve
- `game/sprites/roster.ts`: `BOSS_SPRITE: Record<BossId, string>` (`subzero` → `frostnest`, `reaper` → `rowreaper`, `windwraith` → `galeframe`, `hydra` → `recursa`, `optimizer` → `opticore`), `STARTER` (front `bytebat`, back `bytebat-back`), plus `bossSprite()` / `starterSprite()` helpers for the battle stage (A3).
- BYTEBAT `evolve` (8f, 6 fps): light sparkles gather, the colours dither into a white silhouette with a cyan halo, then the silhouette flickers between a folded smaller shape and a taller "next form" (anchored at the feet) before a sparkle burst. Made with new `scripts/art/paint.mjs` helpers: `whiten`, `scaleLayer`, `halo`, `sparkle`.
- `/dev/sprites`: the live Pixi preview has an Evolve button for sprites that have an evolve animation.
- Tests: every chapter boss resolves to its own 96×96 sprite, renamed mappings, starter front/back, and the evolve animation fades to a white silhouette that changes shape: 171 tests. A2 is complete.
- Verified: lint, typecheck, 171 tests, build, build:pages pass. Judged the contact sheet (fixed the "next form" silhouette clipping at the top). Playwright on the static export `/dev/sprites` at 1280×900 and iPhone 14: evolve row renders, Evolve button plays the morph in Pixi, no console errors, no horizontal overflow. Note: Playwright mouse clicks on the preview's motion buttons (Hurt/Attack/Evolve) didn't fire in headless while DOM `click()` did; worth checking that tap works on a real iPhone when A3 adds battle buttons.
- Next: A3 (GBA-style battle layout using `bossSprite()` / `starterSprite()`).

## 2026-10-12 (21:25 IST): A3a pixel creatures on the battle stage
- Took over a stale routine lock (13:02 UTC, never released by the previous run).
- `game/render/characters/creature.ts`: `Creature`, a fighter built on `PixelSprite` standing on a grassy stone elliptical platform. It plays the sprite's `attack` frames when casting or winding up, `hurt` plus a white-silhouette flash and recoil on hits, and `faint` (held on its last frame via the new `PixelSprite.play(anim, loop, hold)`) then sinks and fades on KO. Lunges and knockback follow a `dir` field instead of mirroring the art.
- `game/render/stage.ts`: GBA layout. The foe's front sprite stands top-right near the horizon (3×) and BYTEBAT's back sprite bottom-left (5×). Both slide in on their platforms at battle start. Versus mode uses BYTEBAT's front sprite as the rival. The fit band now spans y 100–700 so 96×96 bosses aren't clipped. Boss counter-attacks keep each boss's old effect style and colour (`BOSS_STYLE` in `game/sprites/roster.ts`).
- `Character.castMotion()` replaces the `instanceof Mage` check in `performAttack`; `bossAttack`/`isHydra` take any fighter with a `style`. The vector Mage/Boss rigs are no longer used by the stage (to be removed in a later cleanup).
- Tests: every boss has a distinct counter style; every battle sprite has idle/attack/hurt/faint. 173 tests.
- Verified: lint, typecheck, 173 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: chapters 1, 7 and 10 show the boss on its platform top-right and BYTEBAT bottom-left; a correct cast (chapter 1) plays FILTER BOLT with damage numbers and the boss hurt flash; a wrong cast (chapter 7) plays Schemaforge's quake counter on BYTEBAT. No console errors, no horizontal overflow; /versus loads cleanly.
- Next: A3b (handheld-style HP boxes with name / Lv / HP / XP).

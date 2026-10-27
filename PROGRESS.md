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

## 2026-10-12 (21:50 IST): A3b handheld-style HP boxes
- `components/battle/HpBox.tsx`: cream cards with a hard dark border and inner bevel, the creature's name and level, an orange "HP" tag and a bar that bands green (>50%) / yellow (>20%) / red with a lag bar showing recent damage. The player's box adds HP numbers and an EXP bar. The foe's box sits top-left of the stage, the player's bottom-right; in versus a ▶ marks whose turn it is.
- `game/engine/hud.ts`: pure helpers `hpTone`, `levelFor` / `xpForLevel` / `xpProgress` (matching `level()` in lib/save), `bossLevel` (5 per chapter) and `arenaFoeLevel` (+1 per wave). Tests in `tests/hud.test.ts`.
- BattleScreen: the old "Data Mage" header bars and portraits are gone; the HUD row keeps Focus, the round timer and the boss title. Names now come from the sprites (BYTEBAT vs NULLOTH, SCHEMAFORGE…; versus is P1 BYTEBAT vs P2 BYTEBAT), so banners say e.g. "SCHEMAFORGE strikes!".
- Verified: lint, typecheck, 177 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14 for chapters 1 and 7, versus and arena: boxes sit in the free stage corners without covering either creature, no console errors, no horizontal overflow.
- Next: A3c (typed-out battle text box and pixel-art restyle of spell effects).

## 2026-10-13 (02:18 IST): A3c typed battle text box
- `components/battle/BattleTextBox.tsx`: a handheld-console text box under the stage (navy frame, gold inner border, cream card). It types each line out (45 chars/s), holds it, then moves to the next with a bouncing ▼; the last line stays. Tapping finishes the line or skips ahead; reduced motion shows lines whole.
- `game/engine/battleText.ts`: pure line builders and the typewriter (`typed`, `typeDuration`). Battle start: "Wild NULLOTH appeared!" → "Go! BYTEBAT!" → "Roll Call. What will BYTEBAT do?"; casts: "BYTEBAT used FILTER BOLT!", "A critical hit!", "3× combo!", "A finishing blow!", "NULLOTH took 24 damage!"; misses ("…'s query fizzled!", "… strikes back!"), timeouts and "… fainted!". Versus uses "P2 BYTEBAT wants to battle!".
- BattleScreen: the text box replaces the campaign/arena "ROUND n" and "TIME UP" banners (versus keeps its player/dialect banner; the attack-name banner with chips stays).
- Split the rest of A3 into A3d (pixel-art spell effects). Tests in `tests/battleText.test.ts`: 181 tests.
- Verified: lint, typecheck, 181 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14 (chapters 1 and 7): intro lines type out, a wrong cast shows "BYTEBAT's query fizzled!" then the counter line, a correct chapter-1 cast shows "BYTEBAT used …!", "A critical hit!", "NULLOTH took 269 damage!". No console errors, no horizontal overflow.
- Next: A3d (sprite-based spell and counter effects).

## 2026-10-13 (03:35 IST): A3d1 pixel move-effect sprites
- `game/sprites/effects.ts`: procedurally drawn pixel effects as character grids with a six-step ramp (outline, shadow, base, light, pale, white core) built from the spell colour by `fxRamp`: `orb` (16×16 data orb with a circling highlight and orbiting motes), `spark` (32×32 starburst that grows, then breaks into chips), `slash` (32×32 crescent swipe that sweeps and trails off), `ring` (32×32 shock ring that expands and breaks into dashes) and `beam` (an 8×16 tileable section with a pulsing width and drifting motes). `fxSprite(kind, color)` returns a normal 4-frame `SpriteDef`, cached per colour.
- `game/render/fx.ts`: `projectile`, `beam`, `ring` and `slash` now draw these sprites (nearest-neighbour, whole-pixel scales, on a new normal-blend `pix` layer under the damage text). The beam is a scrolling `TilingSprite` with a muzzle orb and a spark at the tip; soft glows and particles stay only as extras. New `playFx` and `impactSpark`; the stage plays a pixel spark on every hit of every spell and counter.
- `/dev/sprites` has a MOVE EFFECTS section showing each effect in four colours.
- Split A3d into A3d1 (this), A3d2 (bespoke spell art) and A3d3 (counter art).
- Tests: `tests/effects.test.ts` (valid sprites in any colour, per-colour cache, the ramp's brightness order, outline and shading on every frame, the ring expanding, the spark breaking up, the beam's white core): 188 tests.
- Verified: lint, typecheck, 188 tests, build, build:pages pass. Judged a contact sheet of all frames in three colours (thickened the spark rays). Playwright on the static export at 1280×900 and iPhone 14: /dev/sprites effects render; chapter 1 correct cast shows the pixel beam, muzzle orb, impact spark and ring; chapters 4, 5 and 10 counters play (Opticore's laser is a pixel beam). No console errors, no horizontal overflow.
- Next: A3d2 (bespoke pixel art for the remaining vector spell shapes).

## 2026-10-13 (07:45 IST): A3d2a pixel art for six spells
- `game/sprites/effects.ts`: six new procedurally drawn 4-frame effects on the same six-step colour ramp: `link` (a chain link lit on top with a glint that runs round it), `meteor` (a cracked rock with glowing seams and a flickering, tapering flame tail that sheds embers), `brick` (a bevelled table block with a header row and cell lines, a glint sweeping across), `lance` (a pale shaft, crossguard and faceted head with a travelling glint and trailing motes), `dome` (a hexagonal force field with honeycomb struts and a shimmer band sweeping down) and `minion` (a small diamond data imp with eyes and flapping wings).
- `game/render/attacks.ts`: JOIN CHAIN draws a sagging chain of pixel links (every other link turned edge-on); AGGREGATE SLAM charges a pixel meteor that grows in whole-pixel steps and falls diagonally onto the foe (it used to start above the visible stage for foes near the horizon); CTE SUMMON summons flapping pixel imps; TRANSACTION SHIELD raises the pixel hex dome over a soft glow; DDL FORGE (and Aggregon's counter) drops pixel table bricks; JSON LANCE throws the pixel spear. `fxSpriteOf` takes a parent container and `loopFrame` is exported. Glows and particles stay as extras.
- `/dev/sprites` MOVE EFFECTS shows the new kinds. Tests: outline and shading on every frame of every new kind, the meteor's head and tail placement, the lance narrowing to a tip with a pale shaft, the brick glint leaving on the last frame, the imp's eyes and flapping wings, the dome staying hollow: 193 tests.
- Verified: lint, typecheck, 193 tests, build, build:pages pass. Judged a contact sheet of every frame in three colours (reshaped the meteor tail, which first bulged like a gourd). Playwright on the static export at 1280×900 and iPhone 14: chapter 1 casts of CTE SUMMON, JOIN CHAIN and AGGREGATE SLAM show the imps, the link chain and the meteor; a wrong cast in chapter 3 drops the pixel bricks on BYTEBAT; /dev/sprites renders all effects. No console errors, no horizontal overflow. Not seen in battle: the dome and the lance (no chapter-1 query triggers them; my JSON test query was classified as FILTER BOLT), so they were judged on /dev/sprites only.
- Next: A3d2b (portals, join frame, surge wave, vortex).

## 2026-10-13 (08:40 IST): A3d2b pixel portals, join frame, surge wave and vortex
- `game/sprites/effects.ts`: four new procedurally drawn 4-frame effects on the six-step colour ramp: `portal` (an upright oval with a bevelled rim lit from the left, a two-armed swirl turning inside round a white eye, and glints running round the rim), `grid` (a riveted, bevelled 2×2 table frame with a glint travelling clockwise round its border), `wave` (a breaker rolling right: a shaded swell with ripple lines rising to a foam-edged curling lip over a dark tube, with spray) and `vortex` (three logarithmic spiral arms round a white eye, turning a third of their period across the loop so it cycles seamlessly).
- `game/render/attacks.ts`: SUBQUERY MIRROR opens three pixel portals from slits, spins them while the orb flies through, then flares and closes each one; WINDOW BLADE slides the pixel join frame onto the foe (glint running) for the three slashes; DATA SURGE rolls a big pixel breaker with two smaller swells behind it from the caster's ground to the foe, flipped to face the foe, ending in a pixel impact spark; PIVOT VORTEX spins the pixel vortex over a soft glow, growing in whole-pixel steps and squashed onto the ground plane. Vector shapes for these spells are gone; particles stay as extras.
- Tests: outline and shading on every frame of the new kinds, the portal's tall oval and turning swirl, the grid's see-through cells, dividers and moving glint, the wave rising to its crest with a dark tube and foam, the vortex's white eye and four distinct frames: 198 tests.
- Verified: lint, typecheck, 198 tests, build, build:pages pass. Judged a contact sheet of every frame in three colours (redrew the wave, which first read as a ball on a ramp). Playwright on the static export at 1280×900 (and iPhone 14 for the surge and vortex): chapter 1 casts of SUBQUERY MIRROR, WINDOW BLADE and PIVOT VORTEX, and the chapter 5 INSERT for DATA SURGE, all show the pixel effects. That caught a console error (the portals were destroyed while their closing tween ran), now fixed, and the surge wave first floated in the sky at the foe's floor height, so it now rolls up from the caster's ground. No console errors, no horizontal overflow.
- Next: A3d3 (pixel art for the boss counters: gear, wind blades, breath, quake rocks, ice shards, and a pixel lightning bolt).

## 2026-10-13 (12:22 IST): A3d3a pixel gear, wind blades and ice shards
- Took over a stale lock (03:43 UTC, from a run that never finished; main was green).
- `game/sprites/effects.ts`: three new procedurally drawn 4-frame effects on the six-step colour ramp: `gear` (a 32×32 cog with eight squared, bevelled teeth lit from the top-left, a recessed face ring, a see-through hub and four rivets; it turns a quarter tooth per frame so the loop is one smooth turn), `gust` (a 32×32 wind blade: a two-circle crescent, thick in the middle and pointed at the tips, with a white leading edge, a glint sliding along it and five flickering speed streaks behind) and `shard` (a 24×12 faceted ice crystal pointing right with a pale top facet, bright ridge, shadowed underside, a glint running to the tip and frost motes).
- `game/render/attacks.ts`: Transactor's counter throws the pixel gear on an arc (spinning through its frames), grinds it against BYTEBAT with sparks and a pixel impact spark, then drops it away; Galeframe's counter flies three pixel wind blades (flipped to face the target, on spread arcs), each ending in a pixel slash; Frostnest's counter fires five pixel ice shards (an ice-blue ramp) aimed at the target, each with a pixel impact spark. The vector gear and arc blades are gone; particles stay as extras.
- Split A3d3 into A3d3a (this) and A3d3b (breath, quake rocks, lightning).
- Tests: outline and shading on every frame of the new kinds, the gear's hub hole and alternating teeth turning across the loop, the blade's crescent thickness and white leading edge, the shard narrowing to its tip with a pale top and shadowed underside: 201 tests.
- Verified: lint, typecheck, 201 tests, build, build:pages pass. Judged ASCII dumps of the frames (rebuilt the blade, which first read as a thin bracket with no taper) and zoomed battle screenshots. Playwright on the static export at 1280×900 and iPhone 14: wrong casts in chapters 4, 6 and 8 play the ice shards, gear and wind blades on BYTEBAT; /dev/sprites renders all 18 effect kinds. No console errors, no horizontal overflow.
- Next: A3d3b (pixel breath, quake rocks and lightning bolt).

## 2026-10-13 (13:50 IST): A3d3b pixel breath, quake rocks and lightning (A3 done)
- `game/sprites/effects.ts`: four new procedurally drawn 4-frame effects on the six-step colour ramp: `flame` (a 24×20 breath fireball flying right: a white-hot round head and a snaking, flickering tail with forked tongues and spitting embers), `rock` (a 16×16 lumpy, faceted boulder lit from the top-left with a crack, turning a quarter per frame so it tumbles), `spike` (a 24×32 stone spire that erupts over three frames with strata lines, a lit left face and rubble thrown up, then chips at the tip) and `bolt` (a 24×64 lightning channel with a white core and a side fork, re-forked every frame).
- `game/render/attacks.ts`: Recursa's breath now streams pixel fireballs from every head, swelling in whole-pixel steps as they fly (particles kept as a thinner haze), ending in a pixel impact spark; Schemaforge's quake throws a line of tumbling stone boulders out of the ground toward the target, then two stone spires erupt either side of it before sinking away. `game/render/fx.ts`: `lightning` draws the pixel bolt (anchored at its tip, stretched in whole-pixel steps to reach the target, flickering through its frames over a soft glow) instead of jittered vector lines, so MERGE STORM's five strikes are pixel art. No vector shapes are left in the spell or counter effects, so A3d and A3 are ticked.
- Tests: outline and shading on every frame of the new kinds, the flame hottest at its head with a cooling tail, the boulder lit top-left and shadowed bottom-right in four distinct poses, the spire rising frame by frame with its lit face on the left, the bolt spanning top to bottom with an unbroken white core and a new fork each frame: 205 tests.
- Verified: lint, typecheck, 205 tests, build, build:pages pass. Judged ASCII dumps of the frames (rebuilt the flame, whose tongues first broke into loose fragments, and widened the spire). Playwright on the static export at 1280×900 and iPhone 14, with a video recording cut into frames by ffmpeg to catch the fast effects: an `INSERT … ON CONFLICT DO NOTHING` in chapter 5 casts MERGE STORM with pixel bolts; wrong casts in chapters 7 and 9 play the boulders and spires and the fireball breath on BYTEBAT (the first spire landed on top of BYTEBAT, so they now flank it); /dev/sprites renders all 22 effect kinds. No console errors, no horizontal overflow.
- Next: A4 (types and effectiveness chart).

## 2026-10-13 (17:30 IST): A4 types and effectiveness
- Took over a stale lock (08:42 UTC, from a run that never finished; main was green).
- `game/engine/types.ts`: ten SQL concept types (FILTER, JOIN, AGGREG, SUBQRY, WRITE, TXN, SCHEMA, WINDOW, RECURS, INDEX). Every attack gets the type of the concept that picked it (set ops count as JOIN, PIVOT as AGGREGATE, MERGE as WRITE, JSON as SCHEMA) and every boss the type of its chapter's topic. `TYPE_CHART` lists, per defending type, what it is weak to (always its own type, plus e.g. SUBQUERY vs JOIN: EXISTS is a semi-join; WINDOW vs AGGREGATE; TXN vs WRITE: ROLLBACK) and what it resists (e.g. JOIN vs RECURSIVE: fixed self-joins can't reach unbounded depth; FILTER vs AGGREGATE: WHERE can't filter groups; WRITE vs INDEX: every write updates every index), each with a one-line reason. Super effective ×1.5, resisted ×0.5; untyped foes (versus) are neutral.
- `computeDamage` takes `foeType` and folds the multiplier in (`mult.type`, `effect`, `type` on the result). The battle text box says "It's super effective!" / "It's not very effective…" after the move; the cast banner gets a SUPER EFFECTIVE / NOT VERY EFFECTIVE chip; the foe's HP box shows a pixel type badge; the intro card lists the boss's type, weaknesses and resistances; the debrief shows the type multiplier chip and the matchup's reason.
- Tests (`tests/types.test.ts`): every attack and boss typed, ten distinct boss types, no type both weak and resisted, every matchup explained, every boss weak to its own type, **no chapter's reference solution (either dialect) is ever resisted by its boss**, the textbook matchups, damage scaled exactly by the multiplier, and the effect line order in the text box: 212 tests.
- Verified: lint, typecheck, 212 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: chapter 2 intro shows JOIN type, weak to JOIN/SUBQRY, resists FILTER; the JOINMASTER HP box shows the JOIN badge; a correct inner join plays with the SUPER EFFECTIVE banner chip, "It's super effective!" in the text box and the reason in the debrief. No console errors, no horizontal overflow.
- Next: A5 (Querydex collection and starter evolution).

## 2026-10-13 (18:33 IST): A5a Querydex
- `game/engine/querydex.ts` (pure): `capture` records a campaign win (first-capture date kept, win count bumped), `migrateDex` treats every starred chapter in an older save as captured (date unknown), `caughtCount`, `dayOf`, and `dexStats` (No., type, Lv, HP and rounds, weaknesses and resistances with their reasons, the same numbers the battle uses). `lib/save.ts` gains `dex` and migrates on load; the campaign victory bookkeeping in `BattleScreen` captures the boss.
- `/querydex`: a handheld-style party panel (BYTEBAT with Lv and XP bar) and a box of the ten chapter bosses. Captured ones play their idle animation on a grass screen; unmet ones are dark silhouettes marked "???". The entry card shows the big sprite, No., type badge, Lv / HP / wins, best stars, capture date and the type matchups, or a link to the chapter battle for an unmet boss. On phones a tap scrolls to the entry. New `components/sprites/SpriteCanvas.tsx` plays a sprite animation on a 2D canvas without Pixi (with a silhouette mode). The main menu has a Querydex tile; the victory card shows "NULLOTH was captured! Registered in the Querydex." (or the win count on later wins).
- Fixed a 4px horizontal overflow on iPhone in battle: the five result tabs (with Plan) were too wide for 390px.
- Split A5 into A5a (this) and A5b (starter evolution). Tests (`tests/querydex.test.ts`): capture and re-capture, immutability, migration from stars, local day, every boss's card matching the battle numbers: 217 tests.
- Verified: lint, typecheck, 217 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: the empty, migrated (3/10 from stars) and 8/10 Querydex render, with no console errors and no overflow; chapter 1 played to victory with the reference solutions on both sizes shows the capture note and saves `dex.nulloth` with today's date.
- Next: A5b (BYTEBAT evolution at chapter milestones).

## 2026-10-13 (22:30 IST): A5b1 KILOBAT, the starter's first evolution
- Took over a stale lock (13:43 UTC, from a run that never released it; main was green).
- `scripts/art/kilobat.mjs` → `game/sprites/creatures/kilobat.ts` + `kilobat-back.ts`: KILOBAT, an original 64×64 data-bat that's taller and leaner than BYTEBAT. It has a round head on a slim body, long swept ears with gold notches, a jagged fur ruff, scalloped circuit wings (finger bones, glowing traces, gold thumb claws), a gold bit-collar, a chevroned chest and a cable tail ending in a two-pronged gold plug. 18 colours with body, wing, gold and chest ramps. Front: idle 4 (wing beat + tail sway), attack 3 (roar with fangs), hurt 2, faint 4 (sinks), evolve 8 (white-silhouette morph). Back: idle/attack/hurt/faint with a circuit spine, collar clasp and hanging plug.
- `game/sprites/roster.ts`: `STARTER_LINE` (BYTEBAT → KILOBAT) and `starterSprite(side, stage)` clamped to the forms that exist. `game/engine/querydex.ts`: `EVOLVE_AFTER = [3, 7]`, `starterStage(dex, forms)` (one step per milestone chapter whose boss is captured) and `evolvedBy(before, after, forms)` for the victory scene. Nothing uses a stage above 0 yet; A5b2 wires it in.
- Split A5b into A5b1 (this), A5b2 (wiring + victory evolution scene) and A5b3 (final form).
- Tests: KILOBAT goes through every sprite-library check, the starter line (64×64 forms, matching back sprites, clamping), the evolve-frame checks for both forms, and the milestone logic (stages after chapters 3 and 7, capped at the drawn forms, evolution reported once, migrated saves don't replay it): 233 tests.
- Verified: lint, typecheck, 233 tests, build, build:pages pass. Judged contact sheets of every frame (reshaped the wings, which first read as solid slabs, and lifted the brows off the eyes, which looked half-closed). Playwright on the static export at 1280×900 and iPhone 14: /dev/sprites shows KILOBAT's animations and Pixi preview. No console errors, no horizontal overflow.
- Next: A5b2 (evolved form in battle, HP box, Querydex and menu; the evolution scene on the victory card).

## 2026-10-13 (23:45 IST): A5b2 the evolved starter, wired in
- `game/sprites/roster.ts`: `starterStageOf(dex)`. The battle stage takes a `starter` option and puts that form's back sprite on the player's platform (versus stays BYTEBAT); the player's HP box and battle text use the form's name. The form is the one the battle started with, so a capture that evolves the starter doesn't swap it mid-scene.
- `game/sprites/evolution.ts`: `evolutionTimeline(from, to)`, the victory scene as a frame timeline: the old form idles, its evolve frames fade it to a white silhouette, the two silhouettes swap faster and faster (300 → 60 ms), then the new form's evolve frames play backwards, white to colour (~6 s). `components/sprites/EvolutionScene.tsx` plays it on a canvas (nearest-neighbour, pulsing screen glow) with two new synth cues (`sfx.evolving`, `sfx.evolved`), then idles in the new form: "BYTEBAT is evolving…" → "BYTEBAT evolved into KILOBAT!". Reduced motion skips straight to the result.
- `game/engine/querydex.ts`: `evolvedByCapture(dex, boss, forms)` reads the evolution back from the saved dex (first capture only, never for migrated saves), so the victory card needs no extra state.
- Querydex party panel and a new main-menu starter chip (sprite, name, Lv/XP, links to the Querydex) show the current form; the party panel says "Evolved from BYTEBAT." or which capture evolves it next.
- Tests (`tests/evolution.test.ts`): starter stage per save, the timeline (colour → white → morph alternating and speeding up → colour, beat order, length, rejects mismatched forms), and `evolvedByCapture` (fires once after chapter 3's first capture; not before the capture is saved, on re-wins, other chapters or migrated saves): 243 tests.
- Verified: lint, typecheck, 243 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: with chapters 1–2 captured, played chapter 3 to victory with the reference solutions; screenshots through the scene (glow, white-silhouette morph, KILOBAT revealed); then chapter 4 shows KILOBAT's back sprite and HP box, the Querydex party and main menu show KILOBAT. No console errors, no horizontal overflow (fixed the menu chip's XP line wrapping on iPhone).
- Next: A5b3 (the final form after chapter 7).

## 2026-10-14 (03:30 IST): A5b3 GIGAVERN, the starter's final form (A5 done)
- Took over a stale lock (18:43 UTC, from a run that never released it; main was green).
- `scripts/art/gigavern.mjs` → `game/sprites/creatures/gigavern.ts` + `gigavern-back.ts`: GIGAVERN, an original 64×64 data-wyvern and BYTEBAT's final form. It has gold-banded horns and a three-spike crest, a wedge head with a snout and fierce glowing slit eyes, huge four-scalloped dusk-magenta wings with glowing circuit veins and gold wrist horns, gold pauldrons, a gold-rimmed chest shield carrying a glowing database-cylinder core, gold talons and a banded cable tail ending in a three-pronged plug. 19 colours with body, wing, gold and plate ramps. Front: idle 4 (wing beat, tail sway, core flare), attack 3 (roar, horns tilt, core glows), hurt 2, faint 4 (sinks), evolve 8 (white-silhouette morph with cyan halo). Back: idle/attack/hurt/faint with gold dorsal plates down a circuit spine, pauldrons and the hanging plug.
- `STARTER_LINE` is now BYTEBAT → KILOBAT → GIGAVERN, so capturing chapter 7's boss evolves KILOBAT on the victory card; the battle, HP box, Querydex party and main menu pick it up through the existing stage logic.
- Tests: GIGAVERN goes through every sprite-library check and the evolve-frame checks; the starter line names all three forms; the stage is GIGAVERN after chapters 3 and 7; `evolvedByCapture` reports stage 2 on chapter 7's first capture only; the KILOBAT → GIGAVERN timeline morphs between the two forms: 258 tests.
- Verified: lint, typecheck, 258 tests, build, build:pages pass. Judged contact sheets of every frame (lowered the wingtips, which were clipped flat at the top edge, flipped the brows from worried to fierce, and gave the chest a gold-rimmed plate so the core reads). Playwright on the static export at 1280×900 and iPhone 14: with chapters 1–6 captured, played chapter 7 to victory with the reference solutions; the evolution scene goes KILOBAT → white morph → "KILOBAT evolved into GIGAVERN!"; chapter 8 shows GIGAVERN's back sprite and HP box; the Querydex party ("Evolved from KILOBAT.") and the main menu chip show GIGAVERN; /dev/sprites renders it. No console errors, no horizontal overflow.
- Next: A6 (pixel UI pass: pixel font, handheld-console menus, battle-start screen wipe).

## 2026-10-14 (04:30 IST): A6a pixel font and handheld-console UI kit
- Display font is now **Tiny5** (OFL, self-hosted by next/font, so it works offline) instead of Orbitron: every `font-display` title, menu, HP box, badge and button, plus the Pixi stage's damage numbers (`pixelFamily`). Tried Pixelify Sans first and dropped it: its bold "C", "2" and "5" read as "O", "8" and "S" in screenshots.
- `app/globals.css`: `.px-btn` (flat fill, 2px outline, top highlight, bottom ledge that the button presses into; primary/gold/danger ramps), `.px-window` (dark fill in a dark/light double outline), `.px-menu-item` (menu entry with a blinking ▸ cursor on hover/focus) and `.px-shadow` (hard pixel title shadow). `.panel` is now a square-cornered framed window, so every screen picks it up.
- `components/ui/kit.tsx`: Button/LinkButton use `.px-btn` (no float/scale tweens), Modal is a `.px-window`, Chip is a square pixel tag, Bar is a square HP bar with a flat fill, a dark ledge and a one-row highlight, and the dialect toggle is a pixel window with a flat sliding pill.
- Main menu: pixel QUERY CLASH title with a hard shadow (fits a 390px iPhone), mode entries as handheld menu windows with a colour tab and a ▸ cursor, a pixel PLAY button.
- Split A6 into A6a (this), A6b (battle-start screen wipe) and A6c (remaining bespoke menus).
- Verified: lint, typecheck, 258 tests, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: menu, campaign, Querydex and the chapter 1 battle intro render in the pixel font with the new windows and buttons. No console errors, no horizontal overflow.
- Next: A6b (battle-start screen wipe).

## 2026-10-14 (08:20 IST): A6b battle-start screen wipe
- Took over a stale lock (23:43 UTC, from a run that never released it; main was green).
- `game/render/wipe.ts`: the transition as a pure timeline (~1.36 s): two white encounter flashes, eight dark bands that sweep shut from alternating edges (staggered top to bottom, each with a lit bottom row and an accent-coloured leading edge), a short hold, then a diagonal block dissolve from the top-left, with each block shrinking in four whole steps so it stays chunky.
- `components/battle/BattleWipe.tsx` draws it on a fixed full-screen canvas above everything (`pointer-events: none`, so it never blocks the intro card) and unmounts when done. `BattleScreen` mounts it keyed on boss and wave, so it plays into every campaign battle, every arena wave and versus, in the chapter's accent colour. It renders nothing when reduced motion is on in the settings or in the OS.
- Tests (`tests/wipe.test.ts`): the flash blinks, every band closed before the reveal and staggered, the screen covered until the reveal then dissolving along the diagonal, the stepped block sizes, the grid covering phone and desktop viewports, and the phase order and length: 264 tests.
- Verified: lint, typecheck, 264 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14, with the page clock frozen at points along the timeline: screenshots of the flash, the bands sweeping shut, the full cover and the block dissolve over the chapter 1 intro card. The wipe also plays and clears on /arena and /versus. With reduced motion set there is no overlay. No console errors, no horizontal overflow.
- Next: A6c (restyle the remaining bespoke menus to the handheld style).

## 2026-10-14 (09:20 IST): A6c1 campaign map as a pixel overworld
- Split A6c into A6c1 (campaign map), A6c2 (battle command bar and result tabs), A6c3 (codex and bestiary lists) and A6c4 (victory/defeat cards).
- `game/render/overworld.ts` paints a deterministic 200×120 pixel map into an RGBA buffer. Each chapter's node owns a biome with wobbly borders: meadow, forest, mesa, snow, graveyard, stone plaza, volcanic, highland, swamp and crystal. Each biome has 3-shade ground, specks and its own decor stamps (trees, pines, rocks, tombstones, spires, crystals; all outlined, with shadows). A stepped 3-px dirt road joins the nodes in order. A river runs down the map and bends west, and the road crosses it on a railed plank bridge. Each node has an outlined stone platform. Chapters past the last unlocked one are fogged with a dark dither.
- `components/menu/OverworldMap.tsx` draws it on a canvas scaled nearest-neighbour. On `/campaign` the glowing glyph tiles and the SVG dashed path are gone. Each node is the boss's animated pixel sprite standing on its platform (a still silhouette while locked) with a pixel number/star tag. The selected node gets a blinking ▼ cursor, and the current starter form hops beside the newest unlocked node. The side panel shows the boss sprite on a dex screen, with square pixel round badges and a pixel window for the locked note.
- Tests (`tests/overworld.test.ts`): a node and biome per chapter, each node inside its own biome and platform, an opaque deterministic paint, one connected road through every node, the river kept off every platform and bridged, and fog on locked chapters only: 269 tests.
- Verified: lint, typecheck, 269 tests and build:pages pass. Judged a 5× contact render of the map (moved the river off chapter 5's platform). Playwright on the static export at 1280×900 and iPhone 14 with 0, 4 and 10 chapters cleared: sprites, tags, cursor, starter and fog render, node taps switch the panel, no console errors and no horizontal overflow (fixed nodes collapsing to 0 px width from the sprite's `max-w-full`).
- Next: A6c2 (battle command bar and result tabs).

## 2026-10-14 (13:30 IST): A6c2 battle command bar and result tabs
- Took over a stale lock (04:42 UTC, from a run that never released it; main was green).
- `app/globals.css`: new pixel pieces: `.px-tray` (sunken command tray), `.px-tab` (flat dark tabs; the selected one is raised, lit with `--tab` and gets a blinking ▸ cursor), `.px-key` (keycaps that press in), `.px-box` / `.px-box-title` (message boxes tinted with `--tone`), `.px-tag` (solid MATCH / NO MATCH / PREVIEW tags), `.px-card` (framed spell card with a coloured header stripe) and `.px-cursor` (blinking ▸ before a ready CAST).
- Command bar: the editor actions sit in a pixel tray (▷ PREVIEW, CLEAR, ⚡ CAST). The phone's fixed bottom bar is now a full-width pixel window with a PREVIEW key, a pixel timer readout and a big CAST button with a blinking ▸ when a cast is ready. Spell-deck group filters are pixel tabs in each group's colour, spell cards are framed pixel cards (no blur glow or tilt), and the touch symbol row uses keycaps.
- Result tabs: `components/battle/tabs.ts` holds the tab list (`resultTabs`) and D-pad stepping (`stepTab`, wraps at both ends). The result window has pixel tabs with a square red alert marker on Tutor, roving tabindex and ←/→ keys, and every tutor, error, dialect and plan callout is a tinted pixel box. Dropped the `AnimatePresence mode="wait"` exit animation: fast tab switching left the old panel stuck under a new tab. Fixed the Lens empty text breaking apart around "Oracle".
- Fixed a hydration error (#418) from A6b: `BattleWipe` read `prefers-reduced-motion` during render, so with the OS setting on, the static HTML and the client disagreed. It now reads it through `useSyncExternalStore` with a server snapshot.
- Tests (`tests/tabs.test.ts`): tab order, Target hidden in versus, the Tutor alert, D-pad wrapping both ways, a full loop, and stepping from a hidden tab: 275 tests.
- Verified: lint, typecheck, 275 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14, with and without OS reduced motion: chapter 1, typed and cast a wrong query from the keyboard (desktop) and the bottom bar (iPhone), checked the Tutor alert and boxes, walked the tabs with ←/→ and checked each panel matches its tab. No console errors, no horizontal overflow.
- Next: A6c3 (codex and bestiary lists).

## 2026-10-19 (00:20 IST): A6c3 codex and bestiary lists
- Took over a stale lock (2026-10-14 08:43 UTC, from a run that never released it; main was green).
- `components/menu/codexList.ts`: the Codex list logic as plain data: a colour per category, the category list, the search filter (title, definition and both dialects' syntax, any case, trimmed), unlocked/total per tab, each row's state (locked / study / unlocked / mastered) and a `?`-masked title for locked entries.
- Codex: a pixel title with UNLOCKED / MASTERED tags, a STUDY MODE toggle tab, category tabs in a sunken tray (each in its category colour with an unlocked/total count), a pixel FIND box (16px text on phones). Entries are framed rows with a category-coloured edge and a blinking ▸ cursor; locked entries show a hatched fill, a LOCKED tag and a `?????` title instead of blurred text. An opened entry has pixel terminal code windows (`.px-term`, also used by `CodeBlock` in battle) and tinted message boxes for dialect notes, enterprise and pitfalls; the quiz uses lettered keycap choices that turn green/red. There is an empty-search message box.
- Bestiary: boss tabs are pixel tabs with each boss's animated sprite and number, the stage sits in a pixel window, the spells are framed spell cards with a tier tag, and the side panel has a dex-screen portrait, No., name, title, the intro in a message box and topic tags.
- Tests (`tests/codexList.test.ts`): categories and colours, category and search filtering, per-tab counts, row states and the masked title: 280 tests.
- Verified: lint, typecheck, 280 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14 with a seeded save: Codex list, opening an entry, answering the quiz wrong, the Joins tab, study mode and an empty search; Bestiary with chapter 4 selected and Join Chain playing. No console errors, no horizontal overflow.
- Next: A6c4 (victory/defeat cards).

## 2026-10-20 (05:40 IST): A6c4 victory/defeat cards
- Took over a stale lock (2026-10-19 19:42 UTC, from a run that never released it; main was green).
- `game/sprites/ui.ts`: new in-repo UI sprites in the palette + grid format: an outlined 13×13 rating star (gold ramp with a twinkle frame, plus a dim slate version) and a stone platform generated from the ellipse equation (outline, lit top, shaded rim, specks).
- `components/battle/endCard.ts`: the card as plain data: banner text and tint per mode (VICTORY / DEFEATED / RUN OVER / PLAYER n WINS), the star row, who stands and who has fainted in the result scene, and the battle report rows.
- End card restyled to the handheld style: a pixel banner box with a hard drop shadow and a chapter/arena/versus subtitle; a dex-screen result scene with both creatures on stone platforms (the winner animated, the loser a dark knocked-over silhouette; hidden when the evolution scene plays); pixel stars that pop in (static under reduced motion); a message box with a blinking ▼; the capture note as a gold message box; and a BATTLE REPORT stat sheet with dotted leaders. Sprites show at an exact 1× on phones and 2× from `sm` up. `SpriteCanvas` takes a `style`.
- With this, A6 (pixel UI pass) is complete.
- Tests (`tests/endCard.test.ts`): banners and tones per mode, star clamping, scene sides for every mode/outcome, report order and combo counting, and the star/platform sprites (valid, symmetric star with outlined tips, outlined platform with a lit top over a shaded rim): 287 tests.
- Verified: lint, typecheck, 287 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: won chapter 1 by casting all 7 solutions (VICTORY, 3 stars, capture note, report) and lost it by casting wrong queries (DEFEATED, BYTEBAT fainted, NULLOTH standing). No console errors, no horizontal overflow.
- Next: B1 (DBMS Interview mode engine, route, topic picker and battle wrapper).

## 2026-10-20 (10:30 IST): B1a interview question engine, B1b topic picker
- Took over a stale lock (2026-10-20 00:43 UTC, from a run that never released it; main was green).
- Split B1 into B1a (engine + first content), B1b (route + topic picker) and B1c (battle wrapper).
- `content/interview/types.ts`: the question model: MCQ, multi-select, true/false, order-the-steps, numeric (with tolerance and unit) and short answer, each with an explanation, difficulty (1–3), tags and an optional "asked at" note; seeded `Generator`s; topics with a colour and a guardian boss.
- `game/engine/interview.ts`: `grade` for every type (multi-select needs exactly the right set; short answers are normalised for case, spaces and punctuation and never match empty), `correctResponse`, `answerText`, `scrambleSteps` (seeded, never pre-solved) and `buildDeck` (topic + difficulty filter, seeded shuffle, one instance per generator). `lib/rng.ts` holds a seeded PRNG.
- `content/interview/basics.ts`: 12 DBMS fundamentals questions covering every type, plus a generated "how many superkeys?" problem answered by a brute-force solver in `lib/dbms/keys.ts`. `content/interview/index.ts` lists the 9 curriculum topics, each guarded by a boss.
- `/interview` (not yet linked from the main menu; that comes with B1c): a handheld-style topic picker with difficulty tabs, a framed row per topic with the guardian's sprite and a solved/total bar (`+∞` when it has generators), and "coming soon" silhouettes for empty topics. The side panel shows the guardian on a dex screen, the blurb, counts per question type and the "asked at" note; on phones a tap scrolls it into view. The battle button is disabled until B1c. Save data gains `interview` (solved question ids).
- Tests (`tests/interview.test.ts`): every question well-formed and graded correct by its own key, each fundamentals answer pinned, every type covered, 200 seeds per generator well-formed and deterministic, superkey counts against textbook examples (8, 12, 7, 20) and inclusion–exclusion for 300 seeds, grading edge cases per type, the scramble and the deck builder, and the picker rows/progress: 303 tests.
- Verified: lint, typecheck, 303 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14 with a seeded save: list, difficulty tabs and topic switching. No console errors, no horizontal overflow.
- Next: B1c (the interview battle wrapper and answer panels; then link `/interview` from the main menu).


## 2026-10-20 (11:15 IST): B1c interview battle wrapper (B1 complete)
- Took the free lock (main was green).
- `game/engine/interviewBattle.ts`: the interview battle as a pure reducer (intro → ask → anim → explain → … → victory/defeat). Damage only lands when the attack animation hits. A right answer deals 90/110/130 by difficulty, +10% per streak step (capped at +40%) and crits from 3 in a row; a wrong one takes 22/26/30. The guardian has HP for about three quarters of the 8-question deck, so running out of questions with it standing is a loss. It also has stars, XP, text box lines, the end-card report and `mergeSolved` (only fixed questions are saved, never generated ones). Each question type has its own move (MCQ = Filter Bolt, multi = Join Chain, T/F = Aggregate Slam, order = CTE Summon, numeric = Index Haste, short = Window Blade). `moveStep` in the interview engine moves order steps.
- `components/interview/AnswerPanel.tsx`: an answer panel per type: lettered keycap choices (MCQ), toggle keycaps with an ANSWER button (multi-select), big TRUE/FALSE keys, an ordered list with ▲/▼ keys (40px tap targets on touch), and pixel input trays (16px on phones, decimal keypad for numeric, with the unit). Once answered, it locks and shows right answers in green and wrong picks in red.
- `components/interview/InterviewBattle.tsx`: reuses the campaign's screen wipe, Pixi stage (the topic's guardian against the player's current starter form), HP boxes and text box. It adds a question window (difficulty, type, tags, prompt), an explanation box (the right answer when you were wrong, the explanation, the "asked at" note), NEXT in a fixed bottom bar on phones, an intro card and a VICTORY/DEFEATED end card (scene on stone platforms, stars, report, Rematch/Topics). `/interview` starts a battle with a fresh seeded deck under the difficulty filter. The main menu links to DBMS Interview. `SceneCreature` moved to its own file so both end cards share it.
- Tests (`tests/interviewBattle.test.ts`): damage, counters and HP sizing, the move per type, every reducer guard, damage landing only on `land`, streak reset, clean win in exactly 5 answers with 3 stars, defeat by fainting (4 tough misses) and by running out of questions, star tiers, deck order, text lines (crit and streak), the report, `mergeSolved`, `moveStep` and full decks per difficulty: 321 tests.
- Verified: lint, typecheck, 321 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: one battle answering everything wrong (explanations shown, DEFEATED card, back to topics) and one answering everything right with the keyed answers, including ordering steps with ▲ and the generated superkey problem (VICTORY, solved count updated). Main menu tile checked. No console errors, no horizontal overflow.
- Next: B2 (ER modelling and relational model content).

## 2026-10-20 (16:20 IST): B2 ER modelling and relational model
- Took the free lock (main was green).
- `lib/dbms/algebra.ts`: a small relational-algebra evaluator with set semantics: σ, π, ×, natural ⋈, ÷ (with the vacuous empty-divisor case), ∪ and −, plus union-compatibility and name-clash checks. `lib/dbms/er.ts`: the standard ER→relational table count (strong and weak entities, multivalued attributes, M:N relationships; 1:1 and 1:N become foreign keys).
- `content/interview/er.ts`: 20 questions covering weak entities, discriminators, the weak entity's PK, total participation, attribute kinds, M:N / 1:N / multivalued / recursive / 1:1-total mappings, candidate and alternate keys, NULL foreign keys, the primitive operators, π removing duplicates, when to use ÷, the join definition and the mapping algorithm order. Every type and difficulty is covered. Four seeded generators, each answered by the solvers: "how many tables?" for a random ER diagram, |R ⋈ S|, |π_dept(σ_salary>k(Emp))| and |Takes ÷ Req| (always at least one answer).
- Questions can carry `tables` (small named relations). `components/interview/PromptTables.tsx` renders them under the prompt as pixel terminal tables (numbers right-aligned, scrolls sideways if needed).
- Tests (`tests/er.test.ts`): the textbook Employee ⋈ Dept and Completed ÷ DBProject examples, division against its derived form π_X(R) − π_X((π_X(R) × S) − R), set semantics and error cases, textbook table counts (M:N → 3, 1:N and 1:1 → 2, weak + multivalued), each fixed answer pinned, and 300 seeds per generator cross-checked by independent counting. The two interview tests that used "er" as the empty topic now use "normalization": 331 tests.
- Verified: lint, typecheck, 331 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: the picker with ER unlocked (20 questions + generators), ER battles with a division problem and its tables, and the explanation box. No console errors, no horizontal overflow.
- Next: B3 (functional dependencies and normalization: closure solver, candidate keys, minimal cover, NF classifier).

## 2026-10-20 (17:15 IST): B3a FD solvers and normalization content
- Took the free lock (main was green). Split B3 into B3a (solvers, fixed questions, generated problems) and B3b (BCNF decomposition / 3NF synthesis and "decompose this" problems).
- `lib/dbms/fd.ts`: attribute closure, implication and equivalence, candidate keys (minimal superkeys by subset enumeration), prime attributes, minimal cover (split RHS, drop extraneous LHS attributes, drop redundant FDs, merge), FD projection onto a sub-schema, a 1NF/2NF/3NF/BCNF classifier that reports the violating FD and why, the binary lossless test, the chase (tableau) test for any number of parts, and dependency preservation without computing F⁺.
- `content/interview/normalization.ts`: 26 questions (FD meaning, trivial FDs, Armstrong's axioms, closure algorithm, (AG)⁺, cycle key count, prime attributes, canonical cover, anomalies, 1NF/2NF/3NF/BCNF, 3NF-not-BCNF, 4NF/MVDs, 5NF/join dependencies, lossless join, BCNF losing AB → C, the 3NF guarantee and synthesis steps, denormalization), covering every type and difficulty. Five seeded generators: "which attributes are in X⁺?", "how many candidate keys?", "highest normal form?" (the seed picks the target form), "is this decomposition lossless?" and "does it preserve every FD?" (balanced true/false).
- Tests (`tests/normalization.test.ts`): Silberschatz (AG)⁺ and canonical-cover examples, the ABCDE cycle's 4 keys, Elmasri EMP_PROJ (1NF) and its lossy/lossless decompositions by the chase, AB → C, C → D (2NF), AB → C, C → B (3NF, keys AB/AC, lost AB → C), FD projection; 300 random schemas cross-checked against the F⁺ definitions of each normal form, key minimality, cover equivalence and non-redundancy, chase vs binary test, and preservation vs projected-FD equivalence; every fixed answer pinned (computed ones via the solvers); 200 seeds per generator re-solved from the prompt text, deterministic, with a spread of answers. The interview tests' empty topic moved to "transactions": 345 tests.
- Verified: lint, typecheck, 345 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: picker with Normalization unlocked (26 + generators), a battle with MCQ, short, order, multi-select closure questions and explanations. No console errors, no horizontal overflow.
- Next: B3b (BCNF decomposition and 3NF synthesis with generated "decompose this" problems).

## 2026-10-20 (20:15 IST): B3b BCNF decomposition and 3NF synthesis (B3 complete)
- Took the free lock (main was green).
- `lib/dbms/fd.ts`: `bcnfViolation` (smallest X ⊆ Ri breaking BCNF, judged against F⁺ rather than the FDs written on Ri), `partNormalForm` (a sub-schema's form via projected FDs), `bcnfDecompose` (the textbook split on X → X⁺ ∩ Ri − X, with a step trace) and `synthesize3nf` (minimal cover, one relation per left side, a candidate key if none holds one, drop contained relations).
- `content/interview/normalization.ts`: 3 new fixed questions (splitting on a BCNF violation, BCNF is always lossless, Silberschatz's dept_advisor 3NF-not-BCNF example) and two generators: "which is a lossless BCNF decomposition?" and "which is lossless, dependency-preserving and all-3NF?". The right option comes from the algorithm; three distractors (plausible slips first: dropping X from the remainder, stopping after one split, forgetting the key relation, using BCNF where it loses an FD; then random decompositions) are each checked to fail, and the explanation traces the algorithm and names each wrong option's fault (lossy, drops an attribute, loses an FD, or a part not in BCNF/3NF).
- Tests (`tests/decomposition.test.ts`): R(A, B, C) with A → B, B → C; dept_advisor (3NF keeps it, BCNF splits it and loses s_ID, dept_name → i_ID); cust_banker_branch (cover and dropping the contained relation); the added key relation; 300 random schemas checked against definitional BCNF/3NF tests over every X ⊆ Ri, the chase and projected-FD equivalence; 200 seeds per generator with exactly one option passing the independent checks, four distinct options and the answer spread across positions: 353 tests.
- Verified: lint, typecheck, 353 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: a ★★★ Normalization battle with both generated decompose-this questions, answered and explained. No console errors, no horizontal overflow.
- Next: B4 (transactions: schedules, conflict/view serializability with a drawn precedence graph, recoverability, isolation anomalies).

## 2026-10-20 (21:35 IST): B4a transaction schedules and serializability
- Took the free lock (main was green). Split B4 into B4a (solvers, fixed questions, generated problems) and B4b (a drawn precedence graph and generated isolation-anomaly problems).
- `lib/dbms/schedule.ts`: a schedule parser/printer ("R1(A) W2(A) C1 A2") and the textbook column table, conflicting pairs, the precedence graph, every topological order (the equivalent serial schedules), cycle finding, reads-from (skipping writes of aborted transactions), view equivalence and view-serial orders by trying each order, blind writes, and a strict ⊂ cascadeless ⊂ recoverable classifier that says why a schedule misses the next level.
- `content/interview/transactions.ts`: 24 questions (ACID and who enforces each, transaction states, conflicting pairs, serial-schedule count, precedence graphs, Silberschatz's schedules 3 and 4, conflict ⇒ view, blind writes, view testing is NP-complete, recoverable/cascading rollback/non-recoverable schedules, class order, dirty read, lost update, READ COMMITTED anomalies, phantoms, level order, PostgreSQL/Oracle defaults, write skew under snapshot isolation, PostgreSQL's READ UNCOMMITTED), every type and difficulty. Schedules show as T1/T2/T3 column tables. Five seeded generators: "select every equivalent serial order" (or "none: cycle"), precedence-graph edge count, conflict serializable true/false, strongest recoverability class (seed picks the class) and "view serializable though not conflict serializable" true/false.
- Tests (`tests/transactions.test.ts`): parser, Silberschatz schedules 3/4, the blind-write schedule, topological orders, reads-from with aborts, each recoverability class; 400 random schedules checked against the definition of conflict equivalence (every conflicting pair in serial order), conflict ⇒ view, view-only ⇒ blind writes, and the recoverable/cascadeless definitions; every fixed answer pinned (computed ones via the solvers); 200 seeds per generator re-solved from the schedule table the player sees, deterministic, balanced answers. The interview tests' empty topic moved to "concurrency": 367 tests.
- Verified: lint, typecheck, 367 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: Transactions battles with generated and fixed schedule questions (multi-select serial orders, recoverability MCQ, cascade, true/false) and explanations. No console errors, no horizontal overflow.
- Next: B4b (drawn precedence graph and isolation-anomaly generators).

## 2026-10-21 (01:30 IST): B4b drawn precedence graphs and isolation anomalies (B4 complete)
- Took the free lock (main was green).
- `components/interview/PrecedenceGraph.tsx`: a pixel SVG precedence graph (crisp edges, a dotted terminal grid, shaded square transaction nodes, arrowed edges, two-way pairs drawn as parallel lines, cycle nodes and edges in red). Questions can carry `graph` (drawn under the prompt) and `explainGraph` (drawn in the explanation, so it never gives the answer away). Silberschatz's schedules 3 and 4 and the serial-order, edge-count, conflict and view generators now show the solution graph after the answer.
- `lib/dbms/isolation.ts`: a two-transaction history model (read/write items, predicate select/insert, commit/abort) and detectors for Berenson et al.'s anomalies: dirty read (A1), non-repeatable read (A2), phantom (A3), lost update (P4) and write skew (A5B), each with a one-line reason, plus the lowest level preventing each (READ COMMITTED, REPEATABLE READ, SERIALIZABLE, REPEATABLE READ, SERIALIZABLE).
- `content/interview/transactions.ts`: two generators. "Which anomaly, and the lowest level preventing it?" (the seed picks the anomaly and varies items, which transaction leads, extra reads and commit timing; distractors are the right anomaly at a wrong level and two other anomalies at their own levels; the explanation adds the PostgreSQL/Oracle snapshot-isolation notes). "How many serial schedules match this drawn precedence graph?" (3–4 nodes, a quarter cyclic → 0).
- Tests (`tests/isolation.test.ts`): Berenson's canonical histories (one anomaly each), the on-call doctors write skew, serial and safe histories showing none (committed read, aborted overwriter), the level table; 300 seeds per anomaly showing exactly that anomaly; 300 generated questions re-solved from the column table the player sees, with four distinct options, one right option and every answer position used; 300 graph questions counted by brute-force permutations. The transactions content test now expects 7 generators: 374 tests.
- Verified: lint, typecheck, 374 tests, build, build:pages pass. Playwright on the static export at 1280×900 and iPhone 14: Transactions battles with the anomaly MCQ (write skew, phantom), the drawn-graph question (a 4-node cyclic graph, red cycle in the explanation), and serial-order / conflict questions showing the solution graph after answering. No console errors, no horizontal overflow.
- Next: B5 (concurrency control and recovery: 2PL, lock compatibility, deadlocks, timestamp ordering, MVCC, WAL/ARIES).

## 2026-10-21 (06:30 IST): B5a concurrency control
- Took the lock (the previous one was 4 hours stale; main was green). Split B5 into B5a (locking, deadlocks, timestamp ordering) and B5b (recovery and MVCC).
- `lib/dbms/locking.ts`: the IS/IX/S/SIX/X compatibility matrix, a lock-step parser and well-formedness check, a 2PL / strict / rigorous classifier that names the offending step, wait-for graphs from a lock table and the deadlocked (on-cycle) transactions, wait-die / wound-wait outcomes, and basic timestamp ordering (R-TS / W-TS trace, first rejected operation) with Thomas' write rule.
- `content/interview/concurrency.ts`: 26 questions covering lock compatibility, intention locks and the 9-entry matrix count, 2PL phases, the lock point and serial order, 2PL and deadlock, strict 2PL vs cascading rollback, conversions, conservative 2PL, wait-for graphs, the Coffman conditions, victim selection, wait-die / wound-wait, restarting with the original timestamp, timeouts, multiple-granularity lock order, SIX, escalation, timestamp-ordering rules, Thomas' rule (and its view-serializable schedules), validation phases and the tree protocol. Every question type and difficulty is used. Four seeded generators: "strongest locking protocol" (the seed picks the class), "which transactions are deadlocked?" (lock table, with the wait-for graph drawn in the explanation; a third have no deadlock), "wait-die / wound-wait: what happens?" (each scheme × age case) and "first rejected operation under timestamp ordering" (every third seed with Thomas' rule). `PrecedenceGraphSpec` gained an optional `title` ("Wait-for graph").
- Tests (`tests/concurrency.test.ts`): Silberschatz's T1/T3 transfers (not 2PL / 2PL), the T17–T20 wait-for graph and its deadlock once T20 waits, the T14/T15/T16 wait-die and wound-wait example, the Thomas-rule schedule R1(Q) W2(Q) W1(Q); 400 transactions checked against the 2PL-family definitions, 800 timestamp-ordering runs against "an earlier, younger conflicting operation", wait-for cycles against chain-following; every fixed answer pinned (the matrix answers via the solver); 300 seeds per generator re-solved from the table or prompt the player sees, with balanced classes and outcomes. The interview tests' empty topic moved to "storage": 388 tests.
- Verified: lint, typecheck, 388 tests, build and build:pages all pass. Playwright on the static export at 1280×900 and iPhone 14 played ★★★ Concurrency battles: a timestamp-ordering question with Thomas' rule (trace explanation), a deadlock question with its red-cycle wait-for graph, plus order, numeric, true/false and MCQ questions. No console errors and no horizontal overflow.
- Next: B5b (recovery: WAL, undo/redo, checkpoints, ARIES, MVCC, with generated crash-log problems).

## 2026-10-21 (07:45 IST): B5b1 recovery
- Took the free lock (main was green). Split B5b into B5b1 (recovery) and B5b2 (MVCC).
- `lib/dbms/recovery.ts`: log records (`<T start>`, `<T, X, old, new>`, `<T commit>`, `<checkpoint {L}>`) with a parser/printer and log table; `recoveryPlan` (Silberschatz's checkpoint rule: only transactions in L or started after it; committed → redo, incomplete → undo, or discarded under deferred modification; earlier commits skipped); `recoveredValues` (backward undo pass, then forward redo pass); and an ARIES analysis pass (transaction table + dirty page table from a fuzzy checkpoint, recLSNs, redo LSN, losers).
- `content/interview/recovery.ts` (part of the Concurrency & Recovery topic): 16 questions (WAL, steal/no-force, no-steal/force trade-offs, deferred modification, Silberschatz's T0/T1 log values, idempotence, checkpoints, undo/redo scan order, ARIES phases, repeating history, the pageLSN redo test, CLRs/UndoNextLSN, ARIES structures, fuzzy checkpoints, shadow paging), every type and difficulty. Four seeded generators: "what does recovery do?" (undo/redo or redo-only log, mostly with a checkpoint; distractors are the classic slips: ignoring the checkpoint, forgetting the checkpoint list, undoing under deferred modification, swapping), "value of X after recovery", "where does ARIES redo start?" and "which transactions are losers?" (log + checkpoint transaction and dirty page tables).
- Tests (`tests/recovery.test.ts`): Silberschatz's three T0/T1 crash points (both schemes), a T1–T4 checkpoint example, an ARIES analysis example; 400 random strict-2PL logs where recovery leaves exactly the committed transactions' writes, 400 ARIES logs whose analysis matches the simulated dirty pages and uncommitted transactions; every fixed answer pinned; 300 seeds per generator re-solved from the tables the player sees, deterministic, with spread answers. The concurrency topic now has 8 generators: 399 tests.
- Verified: lint, typecheck, 399 tests, build and build:pages pass. Playwright on the static export at 1280×900 and iPhone 14 played Concurrency battles opening with each generated recovery question (redo-only plan MCQ with explanation, value-after-recovery numeric, ARIES redo-LSN numeric with the three tables, ARIES losers multi-select). No console errors, no horizontal overflow.
- Next: B5b2 (MVCC snapshots and visibility).

## 2026-10-21 (22:10 UTC): B5b2 MVCC (B5 complete)
- Took the lock (the previous one was 16 hours stale; main was green).
- `lib/dbms/mvcc.ts`: PostgreSQL tuple visibility (xmin/xmax against a snapshot of xmax + xip and the transaction states, with your own writes), a per-version "why visible / not visible" story, a statement-vs-transaction snapshot simulator (READ COMMITTED vs REPEATABLE READ, snapshot taken at the first statement, not BEGIN) and the snapshot-isolation first-committer-wins rule.
- `content/interview/mvcc.ts` (Concurrency & Recovery topic): 19 questions (MVCC promise, writers still conflict, PostgreSQL update/xmin/xmax/VACUUM/bloat/long transactions/xid wraparound, Oracle undo/SCN/ORA-01555/statement-level consistency, snapshot isolation, first-committer-wins, Oracle SERIALIZABLE = SI/ORA-08177, PostgreSQL SSI, write skew, SELECT FOR UPDATE), every type and difficulty. Three seeded generators: "which salary does this snapshot see?" (version chain + transaction table, with aborted, running-at-snapshot, later, deleted and own-write cases), "T1's second SELECT at READ COMMITTED / REPEATABLE READ" and "which transactions abort under first-committer-wins?".
- Tests (`tests/mvcc.test.ts`): visibility rules, snapshot levels, FCW; 300 seeds per generator re-solved from the tables the player sees, 500 random chains against an independent replay oracle. The concurrency topic now has 11 generators: 417 tests.
- Verified: lint, typecheck, 417 tests, build, build:pages pass. Playwright (static export, desktop 1280x900 and iPhone 14) on one question per generator: tables, answer states and explanations render; no console errors, no horizontal overflow.
- Next: B6 (storage and indexing).

## 2026-10-21 (22:50 UTC): B6a B+ tree and indexing
- Took the lock (none held; main was green). Split B6 into B6a (B+ tree, index questions) and B6b (hashing, interactive visualizer).
- `lib/dbms/btree.ts`: Silberschatz-convention B+ tree insertion (leaf splits ceil(n/2) | rest and copies the key up; internal splits move the middle key up), levels, leaves, fan-out from block/key/pointer sizes, and the max/min height formulas in integer arithmetic.
- `content/interview/storage.ts` (the Storage & Indexing topic is now playable): 18 fixed questions (every difficulty; MCQ, multi, numeric, true/false) and three seeded generators: leaves or levels after inserting a key list, root keys (MCQ with near-miss trees from other orders), and levels from block/key/pointer sizes.
- Tests (`tests/btree.test.ts`, `tests/storage.test.ts`): worked splits at orders 3 and 4; 300 random trees at orders 3-7 check sorted keys, separator ranges, minimum occupancy, equal leaf depth, all keys present and the height bounds; every fixed answer pinned; 300 seeds per generator re-solved from the table the player sees. The interview tests' empty topic moved to "query": 426 tests.
- Verified: lint, typecheck, 426 tests, build, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: Storage battles render the questions and explanations; no console errors, no horizontal overflow.
- Next: B6b (hashing and the interactive B+ tree visualizer), then B7.

## 2026-10-21 (23:55 UTC): B6b1 hashing
- Took the lock (none held; main was green). Split B6b into B6b1 (hashing) and B6b2 (interactive B+ tree visualizer). The art overhaul (section A) is complete, so the work continues in section B.
- `lib/dbms/hashing.ts`: static hashing with overflow-page counting, extendible hashing (global/local depth, directory doubling only when local depth = global depth, bucket splits on the low-order bits) and linear hashing (split pointer, levels, h_i / h_i+1 addressing, splitting the bucket at the pointer rather than the overflowing one).
- `content/interview/storage.ts`: 9 new fixed questions (static weakness, lookup cost, hash vs range, when the directory doubles, directory pointers per bucket, extendible cost, linear hashing without a directory, linear address, overflow pages) and three seeded generators (extendible global depth / bucket count, linear split pointer / bucket count, static overflow pages), each showing the key list as a table and explaining with the final directory or file.
- Tests (`tests/hashing.test.ts`): worked extendible and linear examples; 400 random extendible files check every key is findable, buckets are within capacity, local depth <= global depth, and each bucket has exactly 2^(global-local) directory entries with matching prefixes; 400 random linear files check bucket count = initial*2^level + next and key addressing; every fixed answer pinned; 300 seeds per generator re-solved from the table the player sees. 433 tests.
- Verified: lint, typecheck, 433 tests, build and build:pages pass. Playwright on the static export at 1280x900 and iPhone 14 played Storage battles opening with extendible and static hashing questions (prompt, key table, numeric input): no console errors, no horizontal overflow.
- Next: B6b2 (interactive B+ tree visualizer), then B7.

## 2026-10-22 (00:45 UTC): B6b2 B+ tree visualizer (B6 complete)
- Took the free lock (main was green). The routine had no `add_repo` tool this run; the repo was already cloned, so I worked in place.
- `lib/dbms/btree.ts`: `insert` takes an optional split log (`SplitEvent`: leaf or internal, key moved/copied up, both halves), plus `has` and `searchPath`.
- `components/interview/BTreeVisualizer.tsx` and the `/interview/btree` page ("B+ Tree Lab"): choose order 3-5, type a key, see the tree redrawn (leaf chain, search path in yellow, split steps listed under it, root growth noted). Linked from the Storage topic panel.
- Tests: traced insert matches untraced on 100 random key sets, split count matches node count, `has`/`searchPath`. 435 tests.
- Verified: lint, typecheck, 435 tests, build and build:pages pass. Playwright (static export) at 1280x900 and iPhone 14: tree renders, no page overflow (the diagram scrolls inside its box on phones), no console errors (apart from the missing sw.js in my non-pages test build).
- Next: B7 (query processing and optimization).

## 2026-10-22 (01:55 UTC): B7 query processing and optimization
- Took the free lock (main was green). No `add_repo` tool again; worked in the existing clone.
- `lib/dbms/joins.ts`: textbook cost model: tuple nested loop, block nested loop (worst, best, M buffers), external sort passes and cost, merge join (sorted / unsorted), grace hash join (3(b_r+b_s)+4n_h, recursion check), equality and join size estimates, left-deep and bushy join-order counts.
- `content/interview/query.ts` (the Query Processing topic, guarded by OPTICORE, is now playable): 22 fixed questions (pipeline order, cost units, selection pushdown, each join algorithm and when to pick it, hash-join phases and build side, selectivity, stale statistics, PostgreSQL EXPLAIN / EXPLAIN ANALYZE / Oracle EXPLAIN PLAN, seq scan vs index, join ordering, index-only scans) and four seeded generators: join cost by algorithm (6 variants), which relation should be outer, selection/join size estimate, number of join orders.
- Tests (`tests/joins.test.ts`): Silberschatz's customer/depositor numbers (2,000,100 / 40,100 / 1,520), sort passes, 300 seeds per generator re-solved from the table the player sees, all variants and answer positions exercised, every fixed answer pinned. The empty-topic tests in `interview.test.ts` moved to "distributed". 441 tests.
- Verified: lint, typecheck, 441 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: Query Processing battle intro and first question render, no console errors, no horizontal overflow.
- Next: B8 (distributed and NoSQL).

## 2026-10-22 (03:05 UTC): B8 distributed and NoSQL
- Took the free lock (main was green). No `add_repo` tool again; worked in the existing clone.
- `lib/dbms/distributed.ts`: quorum overlap (R + W > N), write-conflict safety (2W > N), majority and tolerated failures, mod and range shard placement, keys moved by a reshard, consistent-hash ring owner with wrap-around, two-phase commit outcome (commit / abort / blocked) and message count.
- `content/interview/distributed.ts` (the Distributed & NoSQL topic is now playable): 24 fixed questions (CAP, PACELC, replication lag, read-your-writes, quorums, sharding vs replication, hotspots, mod resharding, virtual nodes, 2PC steps / blocking / NO vote, sagas, eventual consistency, LWW, four NoSQL families, SQL vs NoSQL, BASE, split brain) and three seeded generators: quorum arithmetic, shard placement / resharding movement, and the 2PC outcome from a vote table.
- Tests (`tests/distributed.test.ts`): helper checks (including that removing a ring node moves only its own keys), every fixed answer pinned, 300 seeds per generator re-solved from the table the player sees with every variant exercised. The empty-topic tests in `interview.test.ts` moved to "sql". 448 tests.
- Verified: lint, typecheck, 448 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: Distributed battle intro and first question render, no console errors, no horizontal overflow.
- Next: B9 (classic interview SQL on PGlite).

## 2026-10-22 (03:45 UTC): B9 classic interview SQL
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone.
- New interview question kind `sql` ("Write the SQL"): the Interview SQL topic (Frostnest) is now playable. The answer panel has the SQL editor, a PostgreSQL/Oracle toggle, Run (preview) and Submit (graded on PGlite against the reference result, in the player's dialect), plus Give up. A wrong submit shows the reason and allows retries.
- `content/interview/sql.ts`: 14 questions (Nth highest salary with and without windows, duplicates, anti-join / NOT IN trap, empty departments, self-join manager counts, top-2 per department with RANK, above department average, running balance, month-over-month with LAG, CASE pivot, latest order per customer, gaps and islands, departments above company average), each with 3 hints, explanation and Oracle/PostgreSQL solutions. The DB worker resolves these missions too.
- Tests (`tests/interviewSql.test.ts`): every solution runs in both dialects with equal non-empty results, reference passes and `SELECT 1` fails, known answers cross-checked, grading. 479 tests.
- Verified: lint, typecheck, 479 tests, build and build:pages pass. Playwright at 1280x900 and iPhone 14: SQL battle, Run, wrong submit message and give-up explanation render; no console errors, no horizontal overflow.
- Next: B10 (spaced repetition, daily drill, mock interview). More SQL bank questions can follow later.

## 2026-10-22 (05:10 UTC): B10a spaced repetition and daily drill
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone. Split B10 into B10a (this) and B10b (mock interview).
- `lib/leitner.ts`: five Leitner boxes (reviews after 0/1/3/7/21 days), right = up a box, wrong = back to box 1, `buildDrill` (due cards first by lowest box and most overdue, then unseen, then not-yet-due; at most 4 per topic; tops up with generated problems from the weakest topics), `weakTopics`, `boxCounts`, `dueCount`.
- Save: `leitner` and `topicStats`, updated on every answer in an interview battle (fixed questions get cards; generated ones only count toward topic stats). `/interview` has a Daily drill panel (due count, box chart, Start drill) and a weakest-topics list; the drill reuses the battle screen.
- Tests (`tests/leitner.test.ts`): box transitions and cap, intervals, UTC days, due counting, weak-topic ordering, drill size / distinctness / topic cap / determinism / due-first / top-up. 490 tests.
- Verified: lint, typecheck, 490 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: drill panel and a drill battle intro render, no console errors, no horizontal overflow.
- Next: B10b (mock interview), then C1.

## 2026-10-22 (06:00 UTC): B10b mock interview (B10 complete)
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-udert0`, same commit as main).
- `lib/mock.ts`: `buildMock` (20 questions spread 2-3 per topic over the 8 topics, fixed questions plus one generated problem per generator, seeded; SQL-writing questions are left out because submitting one reveals the verdict), `scorecard` (per-topic breakdown, skipped = wrong, grade A-F from 90/75/60/40%), and `addResult` (last 10 scorecards).
- `components/interview/MockInterview.tsx`: intro rules, a 30-minute clock computed from the start time, one question at a time with no feedback (answer advances, Skip, End now), then the scorecard: grade, verdict, time, weakest-first topic bars and every question with its answer and explanation. Finishing updates XP, Leitner boxes, topic stats and `mockResults` in the save. `/interview` has a Mock interview panel with the last result and best score. `Button` now accepts `data-testid`.
- Tests (`tests/mock.test.ts`): 20 distinct non-SQL questions over 40 seeds, determinism, even topic spread, scorecard maths and grade boundaries, history cap. 500 tests.
- Verified: lint, typecheck, 500 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: panel, intro, a question, and the scorecard render; saved history shows on the menu; no console errors, no horizontal overflow.
- Next: C1 (indexing deep-dive and SQL anti-patterns chapters).

## 2026-10-22 (06:50 UTC): C1a indexing chapter missions
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-anhcpl`, same commit as main). Split C1 into C1a-d, because each new chapter needs a boss with 96×96 art, a type, a biome and a map node, and tests tie chapters one-to-one to sprites.
- `content/chapters/part3.ts`: five Chapter 11 missions (composite index, expression index, mixed ASC/DESC index, covering index, drop a redundant prefix index as a defense round), checked against the PostgreSQL catalog so a correct index passes in either dialect. Three new codex entries: composite, expression / function-based, covering indexes.
- Tests (`tests/indexing.test.ts`): ids and codex references, both dialects agree and the check is non-empty, no-index answers fail, wrong column order fails, dropping the wrong index fails.
- Not yet in `CHAPTERS` (that waits for the boss art in C1b), so the campaign is unchanged.
- Next: C1b (chapter 11 boss art and wiring).

## 2026-10-22 (07:55 UTC): C1b1 chapter 11 boss art
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-db0tcg`, same commit as main). Split C1b into art (C1b1, this) and wiring (C1b2): a new boss touches `BossId`, the overworld, the attack styles, Querydex and many "10 chapters" assertions.
- ARBORIX: an original 96×96 bark golem with moss, glowing eyes and a brass belly plaque, crowned with a B+ tree (root node, two branch nodes, four chained leaf nodes; the keys glow one at a time while idle). Idle 4 frames (key scan), attack 3 (angry, arms raised, every key flares with sparkles), hurt 2 (X eyes, recoil), faint 4 (sag and dither dissolve). 18 colours, drawn by `scripts/art/arborix.mjs`.
- `/dev/sprites`: Pixi previews are created only while on screen. With 17 sprites the page passed the ~16 WebGL contexts a browser allows and logged "Could not retrieve shader source" errors.
- Tests: ARBORIX added to the "bosses are 96×96" roster test; the generic sprite checks (palette, animations, faint) cover it automatically. 514 tests.
- Verified: lint, typecheck, 514 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: ARBORIX sheet and live preview render, no console errors, no horizontal overflow.
- Next: C1b2 (wire ARBORIX in as chapter 11).

## 2026-10-22 (08:45 UTC): C1b2 chapter 11 wired in
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-qfw2ja`, same commit as main).
- ARBORIX is now chapter 11 "The Index Vault" (`CHAPTERS_11` in `content/chapters/part3.ts`, appended to `CHAPTERS`). New `BossId` `arborix` in `BOSS_SPRITE`, `BOSS_TYPE` (INDEX, shared with the Optimizer), `BOSS_GLYPH`, `BOSS_STYLE` and the unused vector-rig `REGISTRY`.
- New 11th boss counter-attack style `roots`: bark spikes burst from the ground toward the player, then leaves and a ground ring. 11th overworld node `[92, 52]` and a "grove" biome.
- Removed "10 chapters" assumptions: `unlockedChapters` cap, the arena wave modulo, menu counters, sandbox spell deck, and tests (sprites, querydex, overworld fog, type chart now says ten types each guarded by a boss).
- Verified: lint, typecheck, 519 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: map shows node 11, battle intro and a fight with ARBORIX render (Lv55, INDEX type); no console errors, no horizontal overflow.
- Next: C1c (anti-patterns chapter missions), then C1d (its boss and wiring).

## 2026-10-22 (09:50 UTC): C1c anti-pattern chapter missions
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-d83qtm`, same commit as main).
- `ANTIPATTERN_MISSIONS` in `content/chapters/part3.ts` (chapter 12, not yet in `CHAPTERS`): N+1 rewritten as one LEFT JOIN, `SELECT *` replaced by named columns (the task needs a computed `location` column, because the result checker accepts extra columns), `OR` rewritten as `UNION`, a cast on the column replaced by a plain comparison, and `NOT IN` with a NULL replaced by `NOT EXISTS`. Codex entries added: N+1, SELECT *, implicit conversions (`not-in-null` already existed).
- Limits: the checker compares results only, so the OR and cast missions cannot force the rewrite; the hints and codex teach it.
- Tests (`tests/antipatterns.test.ts`): ids and codex references, both dialects agree and are non-empty, the canonical solution passes, inner join drops zero-order customers, `SELECT *` fails, `NOT IN` returns nothing with NULL managers, cast and plain forms return the same row. 530 passed.
- Verified: lint, typecheck, tests, build:pages pass. No visual change, so no screenshots.
- Next: C1d (chapter 12 boss art and wiring).

## 2026-10-22 (10:50 UTC): C1d1 chapter 12 boss art
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-7aboh7`, same commit as main). Split C1d into art (C1d1, this) and wiring (C1d2).
- HYDRAX: an original 96×96 N+1 hydra: one big head (the first query) and four small heads (the N queries) on curving necks from a scaly coiled body with a belly plate. Idle 4 frames (small heads strike in turn), attack 3 (every head lunges, fangs and sparkles), hurt 2 (X eyes, recoil), faint 4 (heads drop, dither dissolve). 15 colours, drawn by `scripts/art/hydrax.mjs`. Fixed a first draft where the open mouth looked like a grille and the faint pose clipped at the bottom.
- Registered in `SPRITES`; the generic sprite tests and the "bosses are 96×96" roster test cover it.
- Verified: lint, typecheck, tests, build:pages pass. Judged the 13 frames from a rendered sheet; no UI changed, so no Playwright run.
- Next: C1d2 (wire HYDRAX in as chapter 12).

## 2026-10-22 (11:55 UTC): C1d2 chapter 12 wired in
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-wvl19c`, same commit as main).
- HYDRAX is now chapter 12 "The Anti-Pattern Marsh" (`CHAPTERS_12` in `content/chapters/part3.ts`, appended to `CHAPTERS`). New `BossId` `hydrax` in `BOSS_SPRITE`, `BOSS_TYPE`, `BOSS_GLYPH`, `BOSS_STYLE` and the vector-rig `REGISTRY`.
- Boss type is SUBQRY (not JOIN): the chapter's `SELECT *` and cast solutions are filter spells, which a JOIN type resists, and the "never resists a reference solution" test caught it.
- New 12th counter-attack style `heads`: five projectile-and-slash strikes from the big head and four small ones. 12th overworld node `[82, 80]` and a "marsh" biome. Caps of 11 became 12 in `lib/save.ts` and the sandbox spell deck; test counts updated.
- Verified: lint, typecheck, 540 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: map shows node 12 on the marsh, chapter 12 intro and the HYDRAX battle render, no console errors, no horizontal overflow.
- Next: C2 (daily challenge seeded by date, plus a streak counter).

## 2026-10-22 (12:48 UTC): C2 daily challenge and streak
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-dn7313`, same commit as main).
- `lib/daily.ts`: `buildDaily` picks five questions from five different topics by a seed derived from the UTC day (one slot is a generated problem), so everyone gets the same deck; `recordDailyWin` / `liveStreak` keep a streak of consecutive days (alive until a day is missed). New `daily` field in the save (`EMPTY_DAILY` default, so old saves load).
- UI: a "Daily challenge" panel at the top of `/interview` (streak, best, days won, done today) that starts a 5-question battle against ROWREAPER; a victory records the win via a new `onVictory` prop on `InterviewBattle`. Retrying is allowed and a second win on the same day changes nothing.
- Tests (`tests/daily.test.ts`): same deck per day, different across days, five distinct topics over 40 days, streak increments / resets / repeat-win no-op, live-streak window. 544 tests.
- Verified: lint, typecheck, tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: panel and daily battle intro render, no console errors, no horizontal overflow.
- Next: C3 (accessibility: keyboard navigation, ARIA live region for battle text, colour-blind-safe type colours).

## 2026-10-22 (13:55 UTC): C3a live region and colour-blind-safe types
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-qr06zu`, same commit as main). Split C3 into C3a (this) and C3b (keyboard navigation).
- `BattleTextBox` now renders a visually hidden `role="status"` live region holding the whole message (the typewriter text is visual only), and the button's label is a stable "Next line". Every type now has a distinct symbol in `TYPE_INFO` shown inside `TypeTag` (▼ FILTER, ⧓ JOIN, Σ AGGREG...), so type is not conveyed by colour alone.
- Tests: `tests/types.test.ts` checks symbols and colours are unique per type. 545 tests.
- Verified: lint, typecheck, tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: the live region reads "Wild NULLOTH appeared! Go! BYTEBAT! ...", tags show symbols, no console errors, no horizontal overflow.
- Next: C3b (keyboard navigation), then C4.

## 2026-10-22 (14:55 UTC): C3b keyboard navigation
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-skohol`, same commit as main).
- A global `:focus-visible` ring for anything without bespoke focus styling; `Modal` closes on Esc and is `role="dialog" aria-modal`; interview answers take 1-9 / A-H (choices) and T / F (true-false) keys, ignored while typing in a field or the SQL editor.
- Verified: lint, typecheck, 545 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: `/interview` renders, Tab shows the focus ring, no console errors, no horizontal overflow. The spell-deck shortcuts were not added.
- Next: C4 (performance pass, lazy-load PGlite).

## 2026-10-22 (15:55 UTC): C4a idle-time engine boot
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-5fugr6`, same commit as main). Split C4 into C4a (this) and C4b (Pixi rendering pass). The worker was already off the main thread; the menu/campaign pages now call `sqlClient().warmupWhenIdle()` (`requestIdleCallback`, 1.5 s timeout, `setTimeout` fallback, cancelled on unmount) so the PGlite download and WASM compile don't compete with first paint.
- Verified: lint, typecheck, 545 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: menu and campaign render, no console errors, no horizontal overflow.
- Noted: menu copy still says "ten bosses" (there are 12).
- Next: C4b (Pixi rendering pass).

## 2026-10-22 (16:50 UTC): C4b Pixi stage performance
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-fe1t8h`, same commit as main).
- `game/render/stage.ts`: `antialias: false`; moon and skyline go into one `scenery` container cached as a texture once (`cacheAsTexture`, resolution 1 to stay under mobile texture limits); the floor's scrolling lines were a Graphics cleared and re-stroked every frame, now 12 pre-drawn line Graphics whose `y` is updated per frame (no geometry rebuild). Other `clear()` calls are in short-lived effects, left alone.
- Not measured on a throttled CPU (headless software GL gives no useful numbers); the change removes the per-frame rebuild by construction.
- Verified: lint, typecheck, 545 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: chapter 1 battle renders (skyline, moon, floor lines, platforms), no console errors, no horizontal overflow.
- Next: ROADMAP C (remaining items) — check the next unchecked box; menu copy still says "ten bosses" (there are 12).

## 2026-10-22 (18:0x UTC): copy fixes, ROADMAP D
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-7h77dh`, same commit as main). Every box in ROADMAP A-C was ticked, so this run fixed the stale "ten bosses" copy (menu, README: 12 bosses, 71 missions, 12 chapters) and added section D with four follow-up tasks.
- Verified: lint, typecheck, 545 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: the menu says "twelve bosses", no console errors, no horizontal overflow.
- Next: D1 (spell-deck keyboard shortcuts).

## 2026-10-22 (19:0x UTC): D1 spell-deck keyboard shortcuts
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-w5nekm`, same commit as main).
- `SpellDeck`: keys 1-4 cast the first four cards of the open tab (ignored while typing in a field/the editor or with modifiers); the cards show a small number badge (hidden on touch) and `aria-keyshortcuts`. Applies to campaign/arena/versus battles and the sandbox.
- Verified: lint, typecheck, 545 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: pressing 2 inserted the EXPLAIN card in the sandbox, badges render, no console errors, no horizontal overflow.
- Next: D2 (refresh `docs/bosses.png`).

## 2026-10-22 (19:5x UTC): D2 refresh bosses.png
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-vijd66`, same commit as main).
- `docs/bosses.png` is now a 3x4 contact sheet of all twelve chapter battles (Playwright at 1280x720 on the static export, FIGHT clicked, 6 s after the slide-in), replacing the old ten-boss sheet taken before the art rewrite. README alt text says "twelve bosses".
- Verified: lint, typecheck, 545 tests, build:pages pass; all 12 `/battle/N/` pages render the boss sprite, platforms and HUD with no console errors. Docs-only change, no app code touched.
- Next: D3 (more interview questions per topic, 30+ each, each with an answer test).

## 2026-10-22 (21:5x UTC): D3a fundamentals questions
- Took the free lock (main was green). Worked in the existing clone (branch `claude/focused-cerf-ng8h88`, same commit as main). Split D3 into D3a (this) and D3b (the other topics). Fundamentals went from 12 to 34 questions: keys and FK actions, NULL three-valued logic (`NULL = NULL`, COUNT/AVG with NULLs, NOT IN with NULL), WHERE vs HAVING, SELECT logical order, views, catalog, DCL/TCL, UNION vs UNION ALL, OLTP vs OLAP, outer joins. Every answer is keyed in `tests/interviewBasicsMore.test.ts`.
- Verified: lint, typecheck, 548 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: `/interview` renders, no console errors, no horizontal overflow.
- CI and the Pages deploy were not checked: the GitHub Actions quota is used up until 2026-11-01.
- Next: D3b (top up the other topics to 30+).

## 2026-10-23 (01:4x UTC): D3b1 recovery questions
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-9qzfbm`, same commit as main). Split D3b into D3b1-3. Recovery went from 16 to 31 static questions: WAL rule, commit flush, FORCE/STEAL, prevLSN, recLSN, pageLSN redo skip, CLR undoNextLSN, ARIES phases and undo set, checkpoints, log record contents, crash during recovery, media failure. Every answer is keyed in `tests/interviewRecoveryMore.test.ts`.
- Verified: lint, typecheck, 551 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: `/interview` renders, no console errors, no horizontal overflow.
- CI and the Pages deploy were not checked: the GitHub Actions quota is used up until 2026-11-01.
- Next: D3b2 (MVCC, ER, Query to 30+).

## 2026-10-23 (02:4x UTC): D3b2 MVCC, ER and query questions
- Took the free lock (main was green). No `add_repo` tool; worked in the existing clone (branch `claude/focused-cerf-zyg50i`, same commit as main). Static question counts: MVCC 19 → 31 (snapshots, delete/bloat, VACUUM FULL, HOT, write skew, READ COMMITTED re-check, 40001 retry, InnoDB undo), ER 20 → 32 (ISA, ternary/composite mapping, aggregation, superkey count, natural join, union-compatibility, rename, ∩ identity), Query 22 → 33 (merge/NL costs, external sort runs/passes, independence selectivity, histograms, bitmap and index-only scans, blocking operators, left-deep trees). Every answer is keyed in `tests/interviewMoreTopics.test.ts`, and the numeric ones are recomputed there.
- Verified: lint, typecheck, 556 tests, build:pages pass. Playwright on the static export at 1280x900 and iPhone 14: `/interview` renders (305 questions), no console errors, no horizontal overflow.
- CI and the Pages deploy were not checked: the GitHub Actions quota is used up until 2026-11-01.
- Next: D3b3 (Transactions/Distributed, Storage, SQL to 30+).

## 2026-10-23 — D3b3a: more Transactions and Distributed questions

- Added 9 transactions questions (ACID corners, isolation per engine incl. Oracle, conflicts, autocommit, PG aborted transactions) and 8 distributed ones (CAP, quorum overlap, Raft majority, 2PC in-doubt, vnodes, hash vs range, AP behaviour), each keyed in `tests/interviewTxDistMore.test.ts`. Static counts: tx 33, dst 32.
- Verified: lint, typecheck, 560 tests, `build`, `build:pages` all pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: D3b3b (Storage 26 → 30+, SQL bank 14 → 30).

## 2026-10-23 — D3b3b: more Storage questions

- Added 10 storage questions (B+ tree capacity and lookup cost, linked leaves, PK vs FK indexes, LIKE prefix, random-key splits, fill factor, rows-per-page maths, Oracle IOT), each keyed in `tests/interviewStorageMore.test.ts`. Static storage count 26 → 36. Split the SQL bank (14 → 30) into D3b3c.
- Verified: lint, typecheck, 563 tests, `build`, `build:pages` all pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: D3b3c (SQL bank to 30), then D4.

## 2026-10-23 — D3b3c: SQL bank to 30

- Added 16 SQL interview missions to `content/interview/sql.ts` (14 → 30): revenue per customer, unsold products, headcount with empty departments (COUNT(col) vs COUNT(*)), median via PERCENTILE_CONT, repeat customers, top earner per department with ties, shipping delay, NULL-safe total pay, hires per year, revenue by category, same-city pairs (self join), 3-row moving average, recursive org-level headcount (Oracle variant without RECURSIVE), DENSE_RANK over an aggregate, payroll share, idle accounts. Every mission runs on both dialects and must agree; the test file also recomputes org depth, headcount, payroll shares, median, anti-joins and category revenue independently. This completes D3.
- Verified: lint, typecheck, 596 tests, `build`, `build:pages` all pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: D4 (MySQL differences as codex-only entries).

## 2026-10-23 — D4: MySQL differences in the Codex

- Added a "MySQL" Codex category (teal tab) with 11 codex-only entries in `content/codexMysql.ts`: LIMIT offset order, AUTO_INCREMENT gaps, backticks / `||` / CONCAT NULL, ON DUPLICATE KEY UPDATE vs REPLACE, ONLY_FULL_GROUP_BY, InnoDB clustered PK, DDL implicit commit, REPEATABLE READ default and gap locks, FULL OUTER JOIN emulation and set ops, case-insensitive collation and Oracle's ''=NULL, `/` vs DIV and date arithmetic. Each has MySQL, PostgreSQL and Oracle forms (MySQL sits under a `-- MySQL` comment in the PostgreSQL box) and a quiz keyed in `tests/codexMysql.test.ts`. They are not tied to missions, so they are read via study mode.
- Verified: lint, typecheck, 599 tests, `build:pages` pass. Playwright on the static export at 1280x900 and iPhone 14: `/codex` shows the MySQL tab and entries, no console errors, no horizontal overflow.
- CI and the Pages deploy were not checked: the GitHub Actions quota is used up until 2026-11-01.
- Next: ROADMAP has no unchecked tasks left; add new ideas (e.g. MySQL playground dialect, more art polish) before the next run.

## 2026-10-23 - D5: SQL bank to 38

- ROADMAP had no unchecked tasks, so added D5 and D6. Added 8 interview SQL missions to `content/interview/sql.ts` (30 -> 38): managers with 2+ reports (self join), each customer's second order (ROW_NUMBER), products with 3+ distinct buyers, orders with 3+ lines, order status shares, top-2 products per category by revenue, first-to-last order span, departments above average budget. All run on both dialects and must agree; `tests/interviewSql.test.ts` recomputes the answers independently.
- Verified: lint, typecheck, tests, `build`, `build:pages` pass (617 tests). Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: D6 (MySQL sandbox dialect, art polish, codex links in interview explanations).

## 2026-10-23 - D6a: Codex links in interview explanations

- Interview explanations now end with up to two "Codex ▸" links, derived from question tags (`TAG_TO_CODEX` in `content/interview/codexLinks.ts`), shown in the battle explanation box and in the mock-interview review. `/codex?entry=<id>` turns on study mode, opens that entry and scrolls to it. `tests/codexLinks.test.ts` checks every mapped id exists in the Codex and that the helper caps at two unique ids.
- Verified: lint, typecheck, 620 tests, `build`, `build:pages` pass. Playwright on the static export at 1280x900 and iPhone 14: played the daily battle to an explanation with links, clicked through to the Codex entry (opened), no console errors, no horizontal overflow.
- CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: D6 remainder (MySQL sandbox dialect, biome background art check).

## 2026-10-23 - D6b: pixel battle backdrops per biome

- The battle stage used one tinted neon-city background for every boss. Replaced it with `game/render/scenery.ts`: a deterministic 620x180 pixel scene per chapter biome (dithered sky bands, sun/moon, clouds/stars/ash, two ridge silhouettes, banded speckled ground, horizon props reusing the overworld stamps), scaled 4x with nearest-neighbour; each boss fights in its chapter's scene, versus/arena use scene 1. Removed the dead star/skyline/floor-line code from `stage.ts`. Added a "Battle scenes" gallery to `/dev/sprites` and `tests/scenery.test.ts`.
- Verified: lint, typecheck, 622 tests, `build:pages` pass. Playwright on the static export, desktop 1280x800 (chapters 1, 4, 7, 10, 12) and iPhone 14 (3, 9): scenes look right, full width on the wide stage, no console errors, no horizontal overflow. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: D6c (MySQL sandbox dialect; scope needs deciding).

## 2026-10-23 - D6c: MySQL scope decision and sandbox link

- Decided MySQL stays codex-only: no MySQL-compatible engine runs in the browser here, and a translation layer on PGlite would teach wrong behaviour. The sandbox header gets a "Coming from MySQL? ▸" link to `/codex?cat=MySQL`, a new deep link that preselects a category tab and turns on study mode.
- Verified: lint, typecheck, 622 tests, `build`, `build:pages` pass. Playwright on the static export at 1280x800 and iPhone 14: the link works from the sandbox, the Codex opens on MySQL entries, no console errors, no horizontal overflow. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks left; add new ideas (e.g. scroll the Codex tab bar to the selected tab, more interview topics, art polish for evolve/faint frames) before the next run.

## 2026-10-23 - E1: Codex tab bar follows the selected tab

- ROADMAP had no unchecked tasks, so added section E. `/codex` now scrolls the selected category tab into view (`app/codex/page.tsx`), so `/codex?cat=MySQL` shows the MySQL tab on phones instead of leaving it off-screen in the scrolling tab bar.
- Verified: lint, typecheck, 622 tests, `build:pages` pass. Playwright on the static export at 1280x800 and iPhone 14: `?cat=MySQL` selected tab is fully inside the tablist, no console errors, no horizontal overflow. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: E2 (more interview topics, evolve/faint frame polish).

## 2026-10-23 - E2a: more concurrency questions

- Added 6 concurrency questions (`content/interview/concurrencyMore.ts`): rigorous vs strict 2PL, update locks and conversion deadlock, timestamp-ordering late read, victims for a ring deadlock, row locks vs phantoms, SKIP LOCKED. Answers keyed in `tests/interviewConcurrencyMore.test.ts`.
- Verified: lint, typecheck, 624 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: E2b (evolve/faint frame polish).

## 2026-10-23 - E2b: evolve/faint polish

- Evolution scene: deterministic orbiting pixel sparkles (`evolutionSparkles`, amber plus-stars drawn on the canvas) through the glow, morph and reveal beats; the scene is also previewed on `/dev/sprites`. Faint (`Creature.ko`): white flash, stepped alpha blink, sink into the platform with dust puffs, then the existing fade.
- Verified: lint, typecheck, 625 tests, `build`, `build:pages` pass. Playwright on the static export at 1280x900 and iPhone 14: evolution preview shows sparkles on the white silhouette, no console errors, no horizontal overflow. The faint tweak is Pixi-only and was not screenshotted (typecheck/tests only). CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more interview topics, screenshot-check the faint sequence in a battle).

## 2026-10-23 - E3: faint preview in the sprite viewer

- ROADMAP had no unchecked tasks, so added E3. `/dev/sprites` creature previews get a Faint button that plays the faint frames with the same flash, stepped blink, sink and fade as `Creature.ko`, so the sequence can be reviewed without a battle.
- Verified: lint, typecheck, tests, `build`, `build:pages` pass. Playwright on the static export at 1280x900 and iPhone 14: Faint plays the faint frame on the sprite, no console errors, no horizontal overflow. Frame timing under software GL was too coarse to confirm each blink step by eye. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more interview topics, in-battle faint screenshot).

## 2026-10-23 - F1: more normalization questions

- ROADMAP had no unchecked tasks (MySQL sandbox scope was already settled as codex-only), so added F1: 6 normalization questions (chain FD highest NF, 3-key cycle count, all-prime implies 3NF, minimal cover size, lossy binary split, 3NF-but-not-BCNF). Answers are keyed and recomputed with the FD solvers in `tests/interviewNormalizationMore.test.ts`.
- Verified: lint, typecheck, tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, other topics to 40+).

## 2026-10-23 - F2: more distributed questions

- ROADMAP had no unchecked tasks, so added F2: 6 distributed questions (`content/interview/distributedMore2.ts`): minimum read quorum, 2PC uncertain state, consistent-hash node add, mod-N resharding 4 to 5 shards (80% move), CP behaviour in a partition, async-replication loss on failover. Answers keyed and recomputed in `tests/interviewDistributedMore2.test.ts`.
- Verified: lint, typecheck, 630 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, other topics to 40+).

## 2026-10-23 - G1: cost-estimate questions

- ROADMAP had no unchecked tasks, so added G1: 6 questions (B+ tree levels for 1M keys, block nested-loop join cost in both orders, external sort passes for 1000 pages / B=11, Grace hash join 3(|R|+|S|), hash index cannot do ranges). Answers keyed and recomputed in `tests/interviewCostsMore.test.ts`.
- Verified: lint, typecheck, 632 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, other topics to 40+).

## 2026-10-23 - H1: schedule counting and locking questions

- ROADMAP had no unchecked tasks, so added H1: 6 concurrency questions (`content/interview/schedulesMore.ts`): interleavings of 3+2 operations (C(5,2)=10), 5! serial schedules, rigorous vs strict 2PL, S→X upgrade deadlock, recoverable commit order, view vs conflict serializability with blind writes. Keyed and brute-force recomputed in `tests/interviewSchedulesMore.test.ts`.
- Verified: lint, typecheck, 634 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, other topics to 40+).

## 2026-10-23 - I1: isolation and recovery questions

- ROADMAP had no unchecked tasks, so added I1: 6 questions (`content/interview/isolationMore.ts`): READ COMMITTED anomalies, phantoms at REPEATABLE READ vs SERIALIZABLE, phenomena at READ UNCOMMITTED, undo set from a log, WAL flush rule, NO-FORCE. Keyed and recomputed in `tests/interviewIsolationMore.test.ts`.
- Verified: lint, typecheck, tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, other topics to 40+).

## 2026-10-24 - J1: keys and relational fine-print questions

- ROADMAP had no unchecked tasks, so added J1: 6 questions (`content/interview/keysMore.ts`): superkey count, nullable foreign key, natural join with no common attributes, minimum union size, weak-entity key, M:N table count. Keyed and recomputed in `tests/interviewKeysMore.test.ts`.
- Verified: lint, typecheck, tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - K1: query semantics questions

- ROADMAP had no unchecked tasks, so added K1: 6 query questions (`content/interview/querySemanticsMore.ts`): NOT IN with a NULL in the subquery, COUNT(col) with NULLs, UNION size with overlap, LEFT JOIN + WHERE on the right table, LEFT JOIN row count, HAVING vs WHERE. Keyed and recomputed in `tests/interviewQuerySemanticsMore.test.ts`.
- Verified: lint, typecheck, 643 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - L1: storage fine-print questions

- ROADMAP had no unchecked tasks, so added L1: 6 storage questions (`content/interview/storageFine.ts`): blocking factor (32), heap file blocks (313), sparse index entries, extendible-hash directory size (2^3), one clustered index, composite-index leftmost prefix. Keyed and recomputed in `tests/interviewStorageFine.test.ts`.
- Verified: lint, typecheck, 646 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - M1: Oracle vs PostgreSQL dialect questions

- ROADMAP had no unchecked tasks, so added M1: 6 basics questions (`content/interview/dialectsMore.ts`): Oracle '' as NULL, transactional DDL, FETCH FIRST as the portable row limit, nextval vs NEXTVAL, NULL ordering, MINUS vs EXCEPT. Keyed in `tests/interviewDialectsMore.test.ts`.
- Verified: lint, typecheck, tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - N1: integrity-constraint questions

- ROADMAP had no unchecked tasks, so added N1: 6 basics questions (`content/interview/constraintsMore.ts`): CHECK with NULL passes, multiple NULLs under UNIQUE (PostgreSQL), cascade delete count (10), FK must reference PK/UNIQUE, deferred constraints, empty cross join (0). Keyed in `tests/interviewConstraintsMore.test.ts`. Kept difficulty ≤ 2 because the topic-picker test expects no tough basics questions.
- Verified: lint, typecheck, 650 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - O1: locking fine-print questions

- ROADMAP had no unchecked tasks, so added O1: 6 concurrency questions (`content/interview/lockingFine.ts`): S vs X conflict, deadlock cycle victims (1), timestamp-ordering write rule (reject), IX intention-lock chain, FOR UPDATE NOWAIT, rollback dead tuples + VACUUM. Keyed in `tests/interviewLockingFine.test.ts`, with a small TO write-rule function checking the rule.
- Verified: lint, typecheck, 652 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - P1: relational algebra fine-print questions

- ROADMAP had no unchecked tasks, so added P1: 6 ER-topic questions (`content/interview/algebraFine.ts`): π set semantics (3), division (1), product size (12), non-commutative difference, commuting selections, 1:N foreign-key side. Keyed and recomputed (with a small division function) in `tests/interviewAlgebraFine.test.ts`.
- Verified: lint, typecheck, 655 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - Q1: transaction and recovery fine-print questions

- ROADMAP had no unchecked tasks, so added Q1: 6 transactions questions (`content/interview/txFine.ts`): WAL durability, undo count from a checkpoint log (2), cascading rollback (3), strict 2PL is cascadeless, write skew under snapshot isolation, recoverable without cascadeless. Keyed and recomputed (log classifier, cascade closure) in `tests/interviewTxFine.test.ts`.
- Verified: lint, typecheck, 658 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - R1: normalization fine-print questions

- ROADMAP had no unchecked tasks, so added R1: 6 normalization questions (`content/interview/normalizationFine.ts`): closure size (5), every two-attribute relation is BCNF, BCNF can lose dependencies, lossless split on a shared key, cyclic FDs give 3 keys, partial dependency leaves 1NF. Keyed and recomputed with the FD solvers in `tests/interviewNormalizationFine.test.ts`.
- Verified: lint, typecheck, 660 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - S1: query optimizer fine-print questions

- ROADMAP had no unchecked tasks, so added S1: 6 query questions (`content/interview/optimizerFine.ts`): uniform selectivity (200 rows), covering index / index-only scan, selection pushdown, LIKE prefix vs leading wildcard, left-deep join orders (4! = 24), index nested-loop cost (310). Keyed and recomputed in `tests/interviewOptimizerFine.test.ts`.
- Verified: lint, typecheck, 663 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - T1: indexing fine-print questions

- ROADMAP had no unchecked tasks, so added T1: 6 storage questions (`content/interview/indexFine.ts`): B+ tree leaf count (10,000), minimum children at order 5 (3), leaf chaining, dense secondary index, hash bucket collisions (4), why wide nodes. Keyed and recomputed in `tests/interviewIndexFine.test.ts`.
- Verified: lint, typecheck, 665 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - U1: MVCC fine-print questions

- ROADMAP had no unchecked tasks, so added U1: 6 concurrency questions (`content/interview/mvccFine.ts`): instant rollback in PostgreSQL, vacuum survivors (5 of 15), xmin/xmax visibility, disjoint writers under snapshot isolation (2 commit), stable REPEATABLE READ count (10), old versions in heap vs undo. Keyed in `tests/interviewMvccFine.test.ts`.
- Verified: lint, typecheck, 667 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - V1: distributed fine-print questions

- ROADMAP had no unchecked tasks, so added V1: 6 distributed questions (`content/interview/distributedFine.ts`): R+W > N overlap, 2PC message count (16), hot range shard, consistent-hash removal (250 keys), vector-clock concurrency, Lamport receive rule (8). Keyed and recomputed in `tests/interviewDistributedFine.test.ts`.
- Verified: lint, typecheck, 669 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more basics/ER depth).

## 2026-10-24 - W1: DBMS basics fine-print questions

- ROADMAP had no unchecked tasks, so added W1: 6 basics questions (`content/interview/basicsFine.ts`): table cell count (12), UNIQUE allows several NULLs, COUNT(DISTINCT) (2), physical data independence, SQL tables are bags, INTERSECT size (2). Keyed and recomputed in `tests/interviewBasicsFine.test.ts`.
- Verified: lint, typecheck, 671 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more ER depth).

## 2026-10-24 - X1: ER modelling fine-print questions

- ROADMAP had no unchecked tasks, so added X1: 6 ER questions (`content/interview/erFine.ts`): minimum table count for an ER→relational mapping (4), multivalued attribute table, total participation → NOT NULL foreign key, superkey count (4), M:N relationship-set bound (20), 1:N needs no own table. Keyed and recomputed in `tests/interviewErFine.test.ts`.
- Verified: lint, typecheck, 673 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (in-battle faint screenshot, more SQL missions, more questions for under-covered topics).

## 2026-10-24 - Y1: window and aggregate fine-print questions

- ROADMAP had no unchecked tasks, so added Y1: 6 query questions (`content/interview/windowFine.ts`): DENSE_RANK (3), default RANGE frame, AVG ignoring NULL (20), GROUP BY row bound (6), WHERE vs HAVING, ROW_NUMBER ties. Keyed and recomputed in `tests/interviewWindowFine.test.ts`.
- Verified: lint, typecheck, 675 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more questions for under-covered topics).

## 2026-10-24 - Z1: join fine-print questions

- ROADMAP had no unchecked tasks, so added Z1: 6 query questions (`content/interview/joinFine.ts`): FULL OUTER JOIN size (6), NULL keys never match, self-join pairs (6), EXISTS vs JOIN (2), anti-join (1), foreign-key join size (12). Keyed and recomputed in `tests/interviewJoinFine.test.ts`.
- Verified: lint, typecheck, 677 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more questions for under-covered topics).

## 2026-10-24 - AA1: subquery and set-operation fine-print questions

- ROADMAP had no unchecked tasks, so added AA1: 6 query questions (`content/interview/subqueryFine.ts`): NOT IN with NULL (0 rows), UNION distinct (3), EXCEPT ALL (2), scalar subquery returning two rows, empty-input aggregates, DISTINCT on pairs (3). Keyed and recomputed in `tests/interviewSubqueryFine.test.ts`.
- Verified: lint, typecheck, 679 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more questions for under-covered topics).

## 2026-10-24 - AB1: SQL fundamentals fine-print questions

- ROADMAP had no unchecked tasks, so added AB1: 6 query questions (`content/interview/sqlFine.ts`): Oracle TRUNCATE can't be rolled back, plain views store no rows, no row order without ORDER BY, LIMIT/OFFSET (5), COALESCE (7), logical clause evaluation order. Keyed and recomputed in `tests/interviewSqlFine.test.ts`.
- Verified: lint, typecheck, tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more questions for under-covered topics).

## 2026-10-24 - AC1: transaction basics fine-print questions

- ROADMAP had no unchecked tasks, so added AC1: 6 transaction questions (`content/interview/txBasicsFine.ts`): durability vs data-file writes, atomicity in a transfer, serial orders (24), interleavings (10), SERIALIZABLE retries, conflict pairs (3). Keyed and recomputed in `tests/interviewTxBasicsFine.test.ts`.
- Verified: lint, typecheck, 685 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more questions for under-covered topics).

## 2026-10-24 - AD1: recovery fine-print questions

- ROADMAP had no unchecked tasks, so added AD1: 6 recovery questions (`content/interview/recoveryFine.ts`): commit needs a flushed log, CLR count (5), group commit, redo vs pageLSN (2), ARIES repeats history, checkpoint contents. Keyed and recomputed in `tests/interviewRecoveryFine.test.ts`.
- Verified: lint, typecheck, 687 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more questions for under-covered topics).

## 2026-10-24 - AE1: buffer pool fine-print questions

- ROADMAP had no unchecked tasks, so added AE1: 6 storage questions (`content/interview/bufferFine.ts`): records per page (40), scan page count (25), LRU hits (1), sequential flooding, dirty-page eviction, pin counts. Keyed and recomputed in `tests/interviewBufferFine.test.ts` (including an LRU simulator).
- Verified: lint, typecheck, 690 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more questions for under-covered topics).

## 2026-10-24 - AF1: query execution fine-print questions

- ROADMAP had no unchecked tasks, so added AF1: 6 query questions (`content/interview/execFine.ts`): initial sorted runs (100), external sort I/O (8000), merge join with duplicate keys (6), hash join needs equality, blocking operators, interesting orders. Keyed and recomputed in `tests/interviewExecFine.test.ts` (including an external-sort simulator).
- Verified: lint, typecheck, 693 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more questions for under-covered topics).

## 2026-10-24 - AG1: schedule fine-print questions

- ROADMAP had no unchecked tasks, so added AG1: 6 concurrency questions (`content/interview/schedFine.ts`): timestamp-ordering write rejection, Thomas write rule, recoverability, cascading abort count (2), deadlock cycle size (3), what strict 2PL does not guarantee. Keyed and recomputed in `tests/interviewSchedFine.test.ts` (with small recoverability, cascade and cycle simulators).
- Verified: lint, typecheck, 698 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more questions for under-covered topics).

## 2026-10-25 - AH1: isolation-level fine-print questions

- ROADMAP had no unchecked tasks, so added AH1: 6 isolation questions (`content/interview/isolationFine.ts`): lowest level preventing dirty reads, PostgreSQL READ UNCOMMITTED = READ COMMITTED, PostgreSQL REPEATABLE READ has no phantoms, lost update (10), Oracle SERIALIZABLE write skew, Oracle has no READ UNCOMMITTED. Keyed and recomputed in `tests/interviewIsolationFine.test.ts`.
- Verified: lint, typecheck, 701 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more questions for under-covered topics).

## 2026-10-25 - AI1: engine internals fine-print questions

- ROADMAP had no unchecked tasks, so added AI1: 6 questions (`content/interview/engineFine.ts`): PostgreSQL TOAST, XID wraparound and freezing, HOT updates; Oracle ORA-01555 and redo vs undo; page count (12346). Keyed and recomputed in `tests/interviewEngineFine.test.ts`.
- Verified: lint, typecheck, 704 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more art polish such as back sprites for bosses).

## 2026-10-25 - AJ1: B+ tree and hashing fine-print questions

- ROADMAP had no unchecked tasks, so added AJ1: 6 storage questions (`content/interview/treeHashFine.ts`): non-root leaf minimum (2), three-level capacity (1,000,000), leaf split (2), extendible directory size (8), hash index and ranges, leaf sibling links. Keyed and recomputed in `tests/interviewTreeHashFine.test.ts` (with a leaf-split simulator).
- Verified: lint, typecheck, 707 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more art polish such as back sprites for bosses).

## 2026-10-25 - AK1: NULL and set-operation fine-print questions

- ROADMAP had no unchecked tasks, so added AK1: 6 questions (`content/interview/nullSetFine.ts`, topic `query`): NULL = NULL, NOT IN with a NULL (0 rows), COUNT(DISTINCT) ignoring NULLs (2), UNION ALL (8) vs UNION (4), INTERSECT treating NULLs as equal. Keyed and recomputed in `tests/interviewNullSetFine.test.ts` (with a three-valued NOT IN simulator).
- Verified: lint, typecheck, 711 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more art polish such as back sprites for bosses).

## 2026-10-25 - AL1: programmable-database fine-print questions

- ROADMAP had no unchecked tasks, so added AL1: 6 questions (`content/interview/programmableFine.ts`, topic `query`): materialized view staleness, trigger firing count (6), updatable views, procedure vs function COMMIT, cursor position (3 unread), WITH CHECK OPTION. Keyed and recomputed in `tests/interviewProgrammableFine.test.ts`.
- Verified: lint, typecheck, 714 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: ROADMAP has no unchecked tasks; add new ideas (more SQL missions, more art polish).

## 2026-10-25 - F1: hidden test cases for SQL coding missions

- The classic F1 missions (Nth salary, top-N per group, running total, month-over-month, islands, pivot, managers) already existed in the SQL bank, so this run added the missing piece: a **hidden test dataset**. `Mission.hidden` is raw PostgreSQL adding edge-case rows (ties, same-day rows). After a query matches the visible data, `evaluate` (`lib/db/engine.ts`) reruns the reference and the player's query on the hidden data in a rolled-back transaction. On a mismatch the verdict is wrong, with `reason` giving the expected vs your first rows, and `Verdict.hidden` holding both result sets.
- Added hidden cases to nth-salary, second-highest, top-per-dept, running-total and latest-order, each with a `naive` wrong query (OFFSET, ROW_NUMBER, RANGE frame, MAX-date join) in `SQL_NAIVE`. `tests/interviewSql.test.ts` checks the reference passes in both dialects, and each naive query passes the visible data but fails the hidden case.
- Verified: lint, typecheck, full test suite, `build`, `build:pages` (see below). No visual change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F2 (recursive CTE, sessionization, retention, LATERAL, generate_series, JSON operators) using the hidden-case support.

## 2026-10-25 - F2 (part 1): recursive, sessionization and LATERAL SQL missions

- Added 3 SQL coding missions to `content/interview/sql.ts`: management chain via upward recursive CTE (employee 116 -> 100, with Oracle form lacking `RECURSIVE`), sessionizing transactions into bursts (LAG + flag + running SUM; gap of exactly 30 days stays in one burst, which the visible data already exercises), and two latest orders per customer with `CROSS JOIN LATERAL ... FETCH FIRST 2 ROWS ONLY`. Both dialect solutions are checked by the existing per-mission tests.
- New tests in `tests/interviewSql.test.ts`: chain recomputed by hand, bursts recomputed by a JS sessionizer, LATERAL result recomputed by an independent ranking. (Note: tests that read the DB directly after hidden-case tests must call `resetDatabase` first, because mission setup is not rolled back until the next run.)
- Verified: lint, typecheck, 731 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F2b (BOM / reachability, retention, percentiles, anti-join, date series, JSON).

## 2026-10-25 - F2b: anti-join, date series, median and retention SQL missions

- Added 4 SQL coding missions to `content/interview/sql.ts`: employees managing nobody (NOT EXISTS; NOT IN returns 0 rows because of the CEO's NULL manager_id), orders per month with zero-filled months (PostgreSQL `generate_series`, Oracle recursive CTE with ADD_MONTHS; a hidden order in 2025-03 creates empty months and a GROUP BY-only naive query fails it), median salary per department (`PERCENTILE_CONT ... WITHIN GROUP`), and month-over-month retention (distinct customer-months self-joined to the previous month).
- New `F2b answers` tests in `tests/interviewSql.test.ts` recompute each result independently in JS (leaf employees, month series, medians, retention) and assert the NOT IN trap returns nothing.
- Verified: lint, typecheck, 744 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F2c (bill of materials / reachability with `Mission.setup`, funnel, JSON operators).

## 2026-10-26 - F2c: BOM explosion, funnel and JSON SQL missions

- Added 3 SQL coding missions to `content/interview/sql.ts`: bill-of-materials explosion (recursive CTE multiplying quantities down every path; uses a `bom` table created through `Mission.setup`, which `Entry` now supports; unrelated SCOOTER rows test the root filter), a customer funnel (signed up / ordered / delivered / repeat buyers via LEFT JOIN plus conditional aggregation), and fragile shipments per hub from the JSONB `details` column (PostgreSQL `->>`, Oracle `JSON_VALUE` + `JSON_EXISTS`; `JSON_VALUE` on a boolean returns `t`/`f` in PostgreSQL 18 but `true` in Oracle, so the Oracle filter uses `JSON_EXISTS`).
- New `F2c answers` tests in `tests/interviewSql.test.ts`: BOM totals by hand (BOLT 8, SPOKE 64...), funnel recounted in JS and checked non-increasing, JSON aggregation recomputed in JS. Both dialect solutions are covered by the per-mission tests.
- Verified: lint, typecheck, 753 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F3 (schema design drills graded by rules).

## 2026-10-26 - F3a: schema design question bank

- F3 split into F3a (questions), F3b (rule-based schema grader) and F3c (build-the-tables UI) in `ROADMAP.md`.
- Added 16 questions in `content/interview/schemaDesignFine.ts` (topic "er"): soft delete uniqueness via partial unique index and its costs, trigger-written append-only audit tables, multi-tenancy models, composite tenant foreign keys and row-level security, ID choice (int4 exhaustion in days, Snowflake timestamp years and per-ms capacity, UUIDv4 vs UUIDv7 B+ tree behaviour, enumerable IDs), and design-the-schema scenarios (follows junction table, order price snapshot, exclusion constraint against double booking, URL shortener keys, timestamptz).
- `tests/interviewSchemaDesignFine.test.ts` recomputes the numeric answers (24.9 days, ~70 years, 4096 per ms) and checks every answer key.
- Verified: lint, typecheck, 757 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F3b (rule-based schema grader).

## 2026-10-26 - F3b: rule-based schema grader

- Added `lib/dbms/schemaDesign.ts`: runs a player's CREATE TABLE script in a throwaway schema on PGlite, reads PKs, FKs, unique constraints, index column order and EXCLUDE constraints back from `pg_catalog`, then evaluates a `SchemaSpec` (table/pk/fk/junction/unique/index/exclusion/notNull checks, with alias names). SQL errors come back as `error`; the scratch schema is always dropped.
- Added specs for the three F3c scenarios (follows, bookings, URL shortener) in `content/interview/schemaScenarios.ts`.
- `tests/schemaDesign.test.ts` (10 tests): good and bad designs per scenario (missing composite junction key, missing reverse index, missing FKs, no overlap protection, nullable URL), cleanup of schemas, syntax errors.
- Note for F3c: the bookings design needs `btree_gist`; the app's PGlite worker must load `@electric-sql/pglite/contrib/btree_gist` (tests do).
- Verified: lint, typecheck, 767 tests, `build`, `build:pages` pass. No UI change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F3c (build-the-tables mission UI).

## 2026-10-26 - F3c: Schema Forge build-the-tables UI

- New page `/interview/schema` (`components/interview/SchemaLab.tsx`): three drill tabs (follow graph, room bookings, URL shortener) with a brief, a 16px editor, hint and reset; "Check design" grades the script on the PGlite worker and lists each rule with a tick or a cross plus the reason. Linked from the ER topic panel on `/interview` as "Schema forge".
- Worker/client/protocol gained a `gradeSchema` request. The worker now loads `btree_gist` (served from `public/pglite/contrib` by `scripts/copy-pglite.mjs`) so the bookings EXCLUDE constraint works in the app.
- `SCHEMA_DRILLS` in `content/interview/schemaScenarios.ts` carry briefs, hints, starters and reference solutions; new tests check every reference solution passes all rules and every starter fails.
- Verified: lint, typecheck, 774 tests, `build`, `build:pages` pass. Playwright on the static export (desktop + iPhone 14): bookings reference solution scores 7/7 in-browser, follows starter 2/8, no console errors, no horizontal overflow. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F4 (next unchecked task in ROADMAP.md).

## 2026-10-26 - F4: reading EXPLAIN / EXPLAIN ANALYZE

- New optional `plan` field on questions plus `components/interview/PlanBlock.tsx` (monospace, scrolls horizontally inside its own box, focusable), shown in the interview battle and the mock interview.
- 15 questions in `content/interview/explainPlans.ts` (topic "query") with real plan text: function on a column (expression index), Rows Removed by Filter (composite index), rows x loops, cardinality miss (extended statistics), Heap Fetches (visibility map), BitmapAnd, hash join batches, external merge sort, leading wildcard (pg_trgm), low selectivity (Seq Scan is right), date cast (half-open range), partial index predicate, leftmost-prefix rule, rows read by a Seq Scan, safe EXPLAIN ANALYZE on writes.
- `tests/interviewExplainPlans.test.ts` parses the plan text to recompute the numeric answers (1,000 rows from loops, 1,000,000 rows scanned), checks the estimate-miss and 92% selectivity plans against their explanations, and keys every answer.
- Verified: lint, typecheck, 781 tests, `build`, `build:pages` pass. Playwright on the static export (desktop + iPhone 14): plan renders under the prompt, no console errors, no horizontal page overflow. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F5 (pagination and query patterns at scale).

## 2026-10-27 - F5: pagination and query patterns at scale

- Added 15 questions in `content/interview/scaleFine.ts` (topic "query"): OFFSET cost and drift, keyset queries with row-value comparison and its limits, N+1 and batching fixes, bulk insert round-trip cost, upsert (ON CONFLICT / MERGE), why count(*) is slow under MVCC, hot-row counters and sharded counter slots, top-K and top-K per group, batched deletes and partition drops.
- `tests/interviewScaleFine.test.ts` recomputes the numeric answers (99,980 skipped, 51 queries, 50 s, 25 slots) and keys every answer.
- Verified: lint, typecheck, 786 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F6 (transactions in application code).

## 2026-10-27 - F6: transactions in application code

- Added 15 questions in `content/interview/appTx.ts` (topic "transactions"): optimistic locking with a version column and when it fails under contention, guarded atomic UPDATE for oversell/double-spend, SELECT FOR UPDATE, SKIP LOCKED job queues, NOWAIT, which SQLSTATEs to retry (40001, 40P01) and the retry scope, lock ordering against deadlocks, idempotency keys with a unique constraint (and why check-then-insert races), pool throughput math (250 req/s), PgBouncer transaction-mode pitfalls, long-transaction hazards, unique constraint against double booking.
- `tests/interviewAppTx.test.ts` recomputes the pool numbers and keys every answer.
- Verified: lint, typecheck, 790 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F7 (data-store choice and NoSQL).

## 2026-10-27 - F7: data-store choice and NoSQL

- Added 15 questions in `content/interview/storeChoice.ts` (topics "distributed" and "storage"): SQL vs NoSQL defaults, store families (key-value, document, graph, time-series), B-tree vs LSM, the LSM write path (WAL, memtable, SSTable, compaction), write amplification, tombstones, Bloom filter guarantees and sizing, DynamoDB/Cassandra partition and sort keys, hot partitions and write sharding, WCU cost, global secondary index costs, denormalization trade-offs.
- `tests/interviewStoreChoice.test.ts` recomputes the numbers (5 x 1% = 0.05 reads, k = 10 ln 2 = 7, false-positive rate about 0.8%, 100 x 4 KB = 400 WCU) and keys every answer.
- Verified: lint, typecheck, 794 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F8 (distributed data depth).

## 2026-10-27 - F8: distributed data depth

- Added 15 questions in `content/interview/distributedDepth.ts` (topic "distributed"): sync vs async replication, read-your-writes routing, failover data loss, Raft majority and leader election order, why clusters are odd-sized, R + W > N quorum math, sharding a hot tenant with a directory, key % N rebalancing (80% moves), cross-shard transfers (2PC vs saga), transactional outbox, effectively-once via idempotent consumers, log-based CDC, CAP/PACELC under partition, and consistency models ordered strongest to weakest.
- `tests/interviewDistributedDepth.test.ts` recomputes the numbers (majority 4 of 7, R = 4, 16 of 20 keys move) and keys every answer.
- Verified: lint, typecheck, 798 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F9 (caching and scale).

## 2026-10-27 - F9: caching and scale

- Added 16 questions in `content/interview/cachingScale.ts` (topics "distributed" and "storage"): cache-aside read path, write-through vs write-behind and its durability risk, delete-after-commit invalidation, stampede / thundering herd and its fixes (single-flight, jitter, stale-while-revalidate), cache penetration (negative caching, Bloom filter), Redis sorted sets and atomic INCR, read replicas and lag, LRU vs TTL, and capacity estimates (1,157 QPS, 50 GB of rows, 3.2 GB index, 1,000 DB reads/s at 90% hits, 2.0 ms average latency).
- `tests/interviewCachingScale.test.ts` recomputes every numeric answer and keys every answer.
- Verified: lint, typecheck, 802 tests, `build`, `build:pages` pass. Content-only change, so no screenshots. CI/deploy confirmation skipped (GitHub Actions quota exhausted until 2026-11-01).
- Next: F10 (operations and migrations).

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

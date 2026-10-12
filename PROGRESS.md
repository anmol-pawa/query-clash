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

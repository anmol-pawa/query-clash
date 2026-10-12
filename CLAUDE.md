# Working on Query Clash

Query Clash is a 1v1 battle game that teaches SQL (PostgreSQL + Oracle) and DBMS theory. Next.js 16 + React 19 + PixiJS 8 + PGlite (Postgres in WASM), deployed as a static installable PWA to GitHub Pages (https://anmol-pawa.github.io/query-clash/) by `.github/workflows/pages.yml` on every push to `main`.

This repo is developed by an **hourly routine**: each run is a fresh cloud session that does one slice of work from `ROADMAP.md`. Follow this protocol exactly.

## Run protocol

1. `git pull --rebase origin main`.
2. **Lock.** If `.routine/lock` exists and its timestamp (first line, ISO-8601 UTC) is less than 70 minutes old, another run is active: stop immediately without changes. Otherwise write the current UTC time to `.routine/lock`, commit `chore: routine lock`, and push. If the push is rejected, pull and re-check the lock.
3. Read `ROADMAP.md` and the last entries of `PROGRESS.md`. Take the **first unchecked task**. If it's too big for one run, split it into sub-tasks in `ROADMAP.md` and do the first one.
4. Work for at most ~40 minutes. Small, complete, working increments beat big unfinished ones.
5. Verify before committing. All of these must pass:
   - `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run build:pages`
   - Visual changes: drive the app with Playwright (Chromium lives at `/opt/pw-browsers`, never run `playwright install`), at desktop size and with `devices["iPhone 14"]`. Look at the screenshots. Check there are no console errors and no horizontal overflow on mobile.
6. Commit to `main` with a clear message, tick the task in `ROADMAP.md`, and append a dated entry to `PROGRESS.md`: what changed, how it was verified, and what's next.
7. Delete `.routine/lock`, commit, `git pull --rebase`, push.
8. Check that CI and the Pages deploy for your commit pass (`gh api repos/anmol-pawa/query-clash/actions/runs`). If you broke `main`, fixing it comes before any new work, this run or the next.

## Art quality bar (top priority)

The games need **real character art and animation**, not glowing shapes, stick figures or particle-only effects. Think of a polished handheld creature-battler, made of entirely original designs.

- **Creatures:** detailed, shaded pixel art. At least 64×64 for battle sprites (96×96 for bosses), a limited palette per creature with 3–4 shade ramps, clear silhouettes, outlines, and a front sprite plus a back sprite. Each creature needs its own **multi-frame animations**: idle (2–4 frames), attack (a lunge or casting pose), hurt (flash + recoil), faint (sink and fade), and evolve (white silhouette morph).
- **Battle scenes:** illustrated pixel backgrounds per area (sky, terrain, props), grass/stone platforms under each creature, and an intro transition (screen wipe or flash) plus a slide-in for both creatures.
- **Moves:** sprite-based effects (projectiles, impact sparks, beams, slashes) with frame animation, screen shake on hits and damage numbers. Particles add to drawn effects; they don't replace them.
- **World and UI:** a pixel overworld/map, a pixel font, and handheld-console menus and HP boxes. It must still be readable and touch-friendly on an iPhone.
- **How:** sprites are palette + character-grid strings (or small in-repo generated PNG sheets) rendered with nearest-neighbour scaling in Pixi. Build a sprite viewer page (`/dev/sprites`) for reviewing art, and judge every art change from screenshots before committing. Only use content that is original or generated in-repo, and never trace or copy existing games.

## Rules

- `main` must always build, pass tests and deploy. Never skip, disable or delete tests to get green.
- Keep every existing feature working, including offline play, iPhone install and touch controls. The service worker's worker-fragment fix in `scripts/gen-sw.mjs` must stay.
- **Art direction: "creature-battler" (Pokémon-*style*), all original.** See "Art quality bar" above. **Never** use Pokémon names, characters, sprites, logos, music or sounds, or anything traced from them.
- Educational content must be correct. Every quiz answer is checked by a test, and computed problems (closures, schedules, keys) are solved by code that tests check against textbook examples.
- Next.js here is v16, which differs from older versions: read `node_modules/next/dist/docs/` before changing routing or config.
- Never commit secrets, `node_modules`, `out/`, `.next/` or `public/pglite/`.

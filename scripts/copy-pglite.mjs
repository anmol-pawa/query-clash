// Serve PGlite's browser build as static files. The database worker imports
// it natively from /pglite/index.js instead of bundling it: PGlite's
// Emscripten glue locates pglite.wasm / pglite.data via import.meta.url, and
// bundlers rewrite that (Turbopack's production build breaks it outright).
import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dist = join(dirname(require.resolve("@electric-sql/pglite")));
const out = join(process.cwd(), "public", "pglite");
mkdirSync(out, { recursive: true });
for (const f of readdirSync(dist)) {
  if (/\.(js|wasm|data)$/.test(f)) cpSync(join(dist, f), join(out, f));
}
cpSync(join(dist, "fs"), join(out, "fs"), { recursive: true, filter: (p) => !p.endsWith(".cjs") && !p.endsWith(".map") && !p.endsWith(".d.ts") && !p.endsWith(".d.cts") });
// Extensions the worker loads natively (btree_gist backs the bookings schema drill's EXCLUDE constraint).
mkdirSync(join(out, "contrib"), { recursive: true });
cpSync(join(dist, "contrib", "btree_gist.js"), join(out, "contrib", "btree_gist.js"));
cpSync(join(dist, "btree_gist.tar.gz"), join(out, "btree_gist.tar.gz"));
console.log("pglite browser build copied to public/pglite");

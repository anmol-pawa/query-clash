import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { beforeAll, describe, expect, it } from "vitest";
import { SCHEMA_SPECS } from "@/content/interview/schemaScenarios";
import { gradeSchema, introspect } from "@/lib/dbms/schemaDesign";

let db: PGlite;
beforeAll(async () => {
  db = await PGlite.create({ extensions: { btree_gist } });
});
const spec = (id: string) => SCHEMA_SPECS.find((s) => s.id === id)!;
const failed = (g: Awaited<ReturnType<typeof gradeSchema>>) => g.results.filter((r) => !r.ok).map((r) => r.label);

const FOLLOWS_GOOD = `
CREATE TABLE users (id bigint PRIMARY KEY, handle text NOT NULL UNIQUE);
CREATE TABLE follows (
  follower_id bigint NOT NULL REFERENCES users(id),
  followee_id bigint NOT NULL REFERENCES users(id),
  PRIMARY KEY (follower_id, followee_id));
CREATE INDEX follows_followee ON follows (followee_id);
CREATE TABLE posts (id bigint PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id), body text);
CREATE INDEX posts_user_time ON posts (user_id, id DESC);`;

describe("introspect", () => {
  it("reads keys, foreign keys and index column order, and cleans up", async () => {
    const info = await introspect(db, FOLLOWS_GOOD);
    const f = info.tables.find((t) => t.name === "follows")!;
    expect(f.pk).toEqual(["follower_id", "followee_id"]);
    expect(f.fks.map((x) => x.refTable)).toEqual(["users", "users"]);
    expect(f.indexes.map((i) => i.columns[0]).sort()).toEqual(["followee_id", "follower_id"]);
    expect(info.tables.find((t) => t.name === "users")!.uniques).toEqual([["handle"]]);
    const left = await db.query(`SELECT 1 FROM pg_namespace WHERE nspname LIKE 'sd\\_%'`);
    expect(left.rows).toHaveLength(0);
  });
});

describe("follows", () => {
  it("accepts a good design", async () => {
    const g = await gradeSchema(db, FOLLOWS_GOOD, spec("follows"));
    expect(failed(g)).toEqual([]);
    expect(g.ok).toBe(true);
  });
  it("rejects a junction without a composite key and without the reverse index", async () => {
    const bad = FOLLOWS_GOOD.replace("PRIMARY KEY (follower_id, followee_id)", "id serial PRIMARY KEY").replace(/CREATE INDEX follows_followee[^;]*;/, "");
    const g = await gradeSchema(db, bad, spec("follows"));
    expect(failed(g)).toEqual([
      "follows is keyed by (follower, followee), so a pair cannot repeat",
      "Reverse lookup: an index led by the followee column",
    ]);
  });
  it("rejects missing foreign keys and a missing timeline index", async () => {
    const bad = `CREATE TABLE users (id int PRIMARY KEY);
      CREATE TABLE follows (follower_id int, followee_id int, PRIMARY KEY (follower_id, followee_id));
      CREATE TABLE posts (id int PRIMARY KEY, user_id int);`;
    const g = await gradeSchema(db, bad, spec("follows"));
    expect(failed(g)).toContain("posts references users");
    expect(failed(g)).toContain("Timeline: an index led by posts' author");
    expect(failed(g)).toContain("follows is keyed by (follower, followee), so a pair cannot repeat");
  });
  it("reports SQL errors instead of throwing, and leaves the db usable", async () => {
    const g = await gradeSchema(db, "CREATE TABLE users (id int PRIMARY KEY", spec("follows"));
    expect(g.ok).toBe(false);
    expect(g.error).toBeTruthy();
    expect((await gradeSchema(db, FOLLOWS_GOOD, spec("follows"))).ok).toBe(true);
  });
});

describe("bookings", () => {
  const good = `
    CREATE EXTENSION IF NOT EXISTS btree_gist;
    CREATE TABLE rooms (id int PRIMARY KEY, name text NOT NULL);
    CREATE TABLE guests (id int PRIMARY KEY, name text NOT NULL);
    CREATE TABLE bookings (
      id int PRIMARY KEY,
      room_id int NOT NULL REFERENCES rooms(id),
      guest_id int NOT NULL REFERENCES guests(id),
      stay daterange NOT NULL,
      EXCLUDE USING gist (room_id WITH =, stay WITH &&));`;
  it("accepts an exclusion-constraint design (the GiST index leads with room_id)", async () => {
    const g = await gradeSchema(db, good, spec("bookings"));
    expect(g.error).toBeUndefined();
    expect(failed(g)).toEqual([]);
  });
  it("rejects a design with no overlap protection", async () => {
    const g = await gradeSchema(
      db,
      `CREATE TABLE rooms (id int PRIMARY KEY); CREATE TABLE guests (id int PRIMARY KEY);
       CREATE TABLE bookings (id int PRIMARY KEY, room_id int REFERENCES rooms(id), guest_id int REFERENCES guests(id), check_in date, check_out date);`,
      spec("bookings"),
    );
    expect(failed(g)).toEqual([
      "An EXCLUDE constraint stops overlapping stays for one room",
      "An index led by room_id for availability lookups",
    ]);
  });
});

describe("url shortener", () => {
  it("accepts a unique code and NOT NULL url", async () => {
    const g = await gradeSchema(db, `CREATE TABLE links (id bigserial PRIMARY KEY, code text NOT NULL UNIQUE, long_url text NOT NULL);`, spec("url_shortener"));
    expect(failed(g)).toEqual([]);
  });
  it("accepts the code itself as primary key", async () => {
    const g = await gradeSchema(db, `CREATE TABLE urls (code text PRIMARY KEY, url text NOT NULL);`, spec("url_shortener"));
    expect(failed(g)).toEqual([]);
  });
  it("rejects a non-unique code and a nullable url", async () => {
    const g = await gradeSchema(db, `CREATE TABLE links (id serial PRIMARY KEY, code text, url text);`, spec("url_shortener"));
    expect(failed(g)).toEqual(["The short code is unique (it is the lookup key)", "The target URL is NOT NULL"]);
  });
});

import type { SchemaSpec } from "@/lib/dbms/schemaDesign";

/** Rule specs for the build-the-tables drills (graded by lib/dbms/schemaDesign.ts). */
export const SCHEMA_SPECS: SchemaSpec[] = [
  {
    id: "follows",
    tables: { users: ["users", "user", "accounts"], follows: ["follows", "follow", "followers", "user_follows"], posts: ["posts", "post", "tweets"] },
    checks: [
      { kind: "table", label: "A users table", names: ["users", "user", "accounts"] },
      { kind: "pk", label: "users has a primary key", table: "users" },
      { kind: "table", label: "A follows junction table (many-to-many)", names: ["follows", "follow", "followers", "user_follows"] },
      { kind: "junction", label: "follows is keyed by (follower, followee), so a pair cannot repeat", table: "follows", refs: ["users", "users"] },
      { kind: "index", label: "Reverse lookup: an index led by the followee column", table: "follows", leading: ["followee_id", "following_id", "followed_id", "target_id", "to_user_id"] },
      { kind: "table", label: "A posts table", names: ["posts", "post", "tweets"] },
      { kind: "fk", label: "posts references users", from: "posts", to: "users" },
      { kind: "index", label: "Timeline: an index led by posts' author", table: "posts", leading: ["user_id", "author_id"] },
    ],
  },
  {
    id: "bookings",
    tables: { rooms: ["rooms", "room"], guests: ["guests", "guest", "users", "customers"], bookings: ["bookings", "booking", "reservations", "reservation"] },
    checks: [
      { kind: "table", label: "A rooms table", names: ["rooms", "room"] },
      { kind: "table", label: "A bookings table", names: ["bookings", "booking", "reservations", "reservation"] },
      { kind: "pk", label: "bookings has a primary key", table: "bookings" },
      { kind: "fk", label: "bookings references rooms", from: "bookings", to: "rooms" },
      { kind: "fk", label: "bookings references guests", from: "bookings", to: "guests" },
      { kind: "exclusion", label: "An EXCLUDE constraint stops overlapping stays for one room", table: "bookings" },
      { kind: "index", label: "An index led by room_id for availability lookups", table: "bookings", leading: ["room_id"] },
    ],
  },
  {
    id: "url_shortener",
    tables: { links: ["links", "urls", "short_urls", "short_links"] },
    checks: [
      { kind: "table", label: "A table for short links", names: ["links", "urls", "short_urls", "short_links"] },
      { kind: "pk", label: "links has a primary key", table: "links" },
      { kind: "unique", label: "The short code is unique (it is the lookup key)", table: "links", columns: [["code"], ["short_code"], ["slug"], ["short_url"]] },
      { kind: "notNull", label: "The target URL is NOT NULL", table: "links", columns: [["url", "long_url", "target_url", "original_url"]] },
    ],
  },
];

export interface SchemaDrill {
  /** Matches a `SchemaSpec.id`. */
  id: string;
  title: string;
  icon: string;
  brief: string;
  /** What to think about, shown behind a button. */
  hint: string;
  /** Pre-filled editor text. */
  starter: string;
  /** A design that passes every check (tested). */
  solution: string;
}

export const SCHEMA_DRILLS: SchemaDrill[] = [
  {
    id: "follows",
    title: "Follow graph",
    icon: "🐦",
    brief: "Design the tables for a small social network: users, a follow relationship (a user follows many users and is followed by many), and posts written by users. The home timeline shows a user's followees' posts, and \"who follows me?\" must be fast too.",
    hint: "Many-to-many needs a junction table. Its composite primary key (follower_id, followee_id) already serves \"who do I follow?\" but not the reverse lookup: add an index led by followee_id. Posts need an index led by the author for timelines.",
    starter: "CREATE TABLE users (\n  id bigint PRIMARY KEY,\n  handle text NOT NULL\n);\n\n-- add follows and posts\n",
    solution: `CREATE TABLE users (id bigint PRIMARY KEY, handle text NOT NULL UNIQUE);
CREATE TABLE follows (
  follower_id bigint NOT NULL REFERENCES users(id),
  followee_id bigint NOT NULL REFERENCES users(id),
  PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX follows_followee_idx ON follows (followee_id, follower_id);
CREATE TABLE posts (
  id bigint PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_user_idx ON posts (user_id, created_at DESC);`,
  },
  {
    id: "bookings",
    title: "Room bookings",
    icon: "🏨",
    brief: "A hotel needs rooms, guests and bookings (a room is booked for a stay from check-in to check-out). Two stays for the same room must never overlap, and the database itself must enforce that, not application code.",
    hint: "A UNIQUE constraint cannot express overlap. Use a daterange column and EXCLUDE USING gist (room_id WITH =, stay WITH &&). Mixing = on an integer with && on a range needs the btree_gist extension: CREATE EXTENSION btree_gist.",
    starter: "CREATE EXTENSION IF NOT EXISTS btree_gist;\n\nCREATE TABLE rooms (\n  id int PRIMARY KEY,\n  label text NOT NULL\n);\n\n-- add guests and bookings\n",
    solution: `CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE rooms (id int PRIMARY KEY, label text NOT NULL);
CREATE TABLE guests (id int PRIMARY KEY, name text NOT NULL);
CREATE TABLE bookings (
  id int PRIMARY KEY,
  room_id int NOT NULL REFERENCES rooms(id),
  guest_id int NOT NULL REFERENCES guests(id),
  stay daterange NOT NULL,
  EXCLUDE USING gist (room_id WITH =, stay WITH &&)
);
CREATE INDEX bookings_room_idx ON bookings (room_id);`,
  },
  {
    id: "url_shortener",
    title: "URL shortener",
    icon: "🔗",
    brief: "Store short links: each has a short code that visitors type (looked up on every redirect) and the long URL it points to. Codes must never collide.",
    hint: "The lookup key is the short code, so it needs a UNIQUE constraint (which also creates the index). The target URL must be NOT NULL, and a surrogate primary key is fine.",
    starter: "CREATE TABLE links (\n  -- your columns\n);\n",
    solution: `CREATE TABLE links (
  id bigint PRIMARY KEY,
  code text NOT NULL UNIQUE,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  },
];

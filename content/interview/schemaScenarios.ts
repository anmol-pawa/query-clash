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

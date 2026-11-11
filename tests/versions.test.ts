import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CODEX } from "@/content/codex";

describe("version facts are stamped", () => {
  it("docs/VERSIONS.md carries an as-of stamp", () => {
    expect(readFileSync("docs/VERSIONS.md", "utf8")).toMatch(/As of (January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d/);
  });
  it("codex MERGE entry states its PostgreSQL version claims with a stamp", () => {
    const e = CODEX.find((c) => c.id === "merge");
    expect(e?.definition).toMatch(/as of November 2026/i);
  });
});

import { describe, expect, it } from "vitest";
import { CODEX } from "@/content/codex";
import { QUESTIONS } from "@/content/interview";
import { TAG_TO_CODEX, relatedCodex } from "@/content/interview/codexLinks";

describe("interview → codex links", () => {
  it("only points at real Codex entries", () => {
    const ids = new Set(CODEX.map((e) => e.id));
    for (const [tag, id] of Object.entries(TAG_TO_CODEX)) expect(ids.has(id), `${tag} → ${id}`).toBe(true);
  });
  it("returns at most two unique ids in tag order", () => {
    expect(relatedCodex({ tags: ["isolation", "anomalies", "window functions", "null"] })).toEqual(["isolation", "window-functions"]);
    expect(relatedCodex({ tags: ["Null", "b+ tree"] })).toEqual(["null"]);
    expect(relatedCodex({ tags: [] })).toEqual([]);
  });
  it("links a decent share of the bank", () => {
    expect(QUESTIONS.filter((q) => relatedCodex(q).length > 0).length).toBeGreaterThan(60);
  });
});

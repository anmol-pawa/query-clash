import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { SCHEMA_DESIGN_FINE } from "@/content/interview/schemaDesignFine";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("Schema design drills", () => {
  it("registers every question once with unique ids", () => {
    const ids = SCHEMA_DESIGN_FINE.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(byId[id]).toBeDefined();
  });

  it("recomputes ID capacity numbers", () => {
    const days = (2 ** 31 - 1) / 1000 / 86400;
    expect(Math.abs((byId["schema-id-int4-exhaust"] as { answer: number }).answer - days)).toBeLessThanOrEqual(0.1);
    const years = 2 ** 41 / 1000 / (365.25 * 86400);
    expect(Math.round(years)).toBe((byId["schema-id-snowflake-years"] as { answer: number }).answer);
    expect(2 ** 12).toBe((byId["schema-id-snowflake-rate"] as { answer: number }).answer);
    expect(41 + 10 + 12).toBe(63); // 1 sign bit + 63 = 64
  });

  it("keys each answer correctly", () => {
    expect(ans("schema-soft-delete-unique")).toMatch(/WHERE deleted_at IS NULL/);
    expect(ans("schema-multitenant-models")).toMatch(/tenant_id column/);
    expect(ans("schema-multitenant-fk")).toMatch(/FOREIGN KEY \(tenant_id, customer_id\)/);
    expect(ans("schema-multitenant-rls")).toBe("True");
    expect(ans("schema-id-uuid-btree")).toMatch(/right-most page/);
    expect(ans("schema-many-to-many")).toMatch(/PRIMARY KEY \(follower_id, followee_id\)/);
    expect(ans("schema-order-price-snapshot")).toMatch(/unit_price_cents/);
    expect(ans("schema-double-booking")).toMatch(/EXCLUDE USING gist/);
    expect(ans("schema-url-shortener")).toMatch(/code TEXT PRIMARY KEY/);
    expect(ans("schema-timestamps")).toMatch(/timestamptz/);
    expect(ans("schema-audit-table")).toMatch(/trigger/);
    expect(ans("schema-id-leak")).toMatch(/opaque public ID/);
  });

  it("keys the multi-select soft-delete question", () => {
    expect((byId["schema-soft-delete-tradeoff"] as { answers: number[] }).answers).toEqual([0, 1, 2]);
  });
});

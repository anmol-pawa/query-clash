import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { WAREHOUSE_FINE } from "@/content/interview/warehouseFine";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("Warehouse, JSONB, full-text and RLS questions", () => {
  it("registers every question once", () => {
    const ids = WAREHOUSE_FINE.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(byId[id]).toBeDefined();
  });

  it("keys each answer correctly", () => {
    expect(ans("dw-grain")).toMatch(/once per line/);
    expect(ans("dw-scd2")).toMatch(/Type 2: close the old/);
    expect(ans("dw-star-vs-3nf")).toMatch(/Fewer joins/);
    expect(ans("pg-jsonb-gin")).toMatch(/GIN/);
    expect(ans("pg-fts-index")).toMatch(/to_tsvector/);
    expect(ans("pg-rls")).toMatch(/BYPASSRLS/);
    expect(ans("sql-rcte-cycle")).toMatch(/path array/);
    expect(ans("pg-json-arrow")).toBe("(doc->>'age')::int > 9");
    expect(ans("idx-partial-queue")).toMatch(/WHERE status = 'pending'/);
    expect(ans("sql-rolling-gaps")).toMatch(/ROWS counts rows/);
    expect(ans("sql-calendar-zero-days")).toMatch(/LEFT JOIN/);
  });

  it("string comparison of JSON text differs from numeric comparison", () => {
    expect("30" > "9").toBe(false);
    expect(Number("30") > 9).toBe(true);
  });

  it("the fan-out arithmetic holds: a 3-line order with fee 5 sums to 15, not 5", () => {
    const lines = [5, 5, 5];
    expect(lines.reduce((a, b) => a + b, 0)).toBe(15);
  });
});

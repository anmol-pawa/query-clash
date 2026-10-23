import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/interview";
import { answerText } from "@/game/engine/interview";

const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
const ans = (id: string) => answerText(byId[id]);

describe("more storage questions", () => {
  it("has at least 30 static storage questions", () => {
    expect(QUESTIONS.filter((q) => q.id.startsWith("sto-") && !q.id.startsWith("sto-gen")).length).toBeGreaterThanOrEqual(30);
  });

  it("keys each new answer correctly", () => {
    expect(ans("sto-capacity")).toBe("1000000");
    expect(ans("sto-lookup-cost")).toBe("True");
    expect(ans("sto-linked-leaves")).toMatch(/^The leaf nodes are linked/);
    expect(ans("sto-pk-index")).toBe("True");
    expect(ans("sto-fk-index")).toBe("False");
    expect(ans("sto-like-leading")).toBe("name LIKE 'Ander%'");
    expect(ans("sto-random-keys")).toBe("True");
    expect(ans("sto-fill-factor")).toBe("True");
    expect(ans("sto-rows-per-page")).toBe("124");
    expect(ans("sto-iot")).toMatch(/^A table whose rows are stored inside a B\+ tree/);
  });

  it("recomputes the numeric answers independently", () => {
    expect(1 * 100 * 100 * 100).toBe(1_000_000);
    const perPage = Math.floor(8192 / 100);
    expect(perPage).toBe(81);
    expect(Math.ceil(10000 / perPage)).toBe(124);
  });
});

import { describe, expect, it } from "vitest";
import { castLines, faintLine, introLines, missLines, roundLine, timeoutLines, typeDuration, typed } from "@/game/engine/battleText";

describe("battle text box", () => {
  it("types a line out over time", () => {
    const t = "Wild NULLOTH appeared!";
    expect(typed(t, 0)).toBe("");
    expect(typed(t, -50)).toBe("");
    expect(typed(t, 100, 40)).toBe("Wild");
    expect(typed(t, 10_000)).toBe(t);
    expect(typed(t, typeDuration(t))).toBe(t);
    expect(typed(t, typeDuration(t) - 30).length).toBeLessThan(t.length);
  });

  it("opens with the foe appearing and the starter sent out", () => {
    expect(introLines("campaign", "NULLOTH", "BYTEBAT")).toEqual(["Wild NULLOTH appeared!", "Go! BYTEBAT!"]);
    expect(introLines("versus", "P2 BYTEBAT", "P1 BYTEBAT")[0]).toBe("P2 BYTEBAT wants to battle!");
  });

  it("announces the move, its bonuses and the damage", () => {
    expect(castLines({ user: "BYTEBAT", target: "NULLOTH", attack: "Join Chain", damage: 24 })).toEqual(["BYTEBAT used JOIN CHAIN!", "NULLOTH took 24 damage!"]);
    expect(castLines({ user: "BYTEBAT", target: "RECURSA", attack: "Filter Bolt", damage: 40, crit: true, combo: 2, finisher: true })).toEqual([
      "BYTEBAT used FILTER BOLT!",
      "A critical hit!",
      "3× combo!",
      "A finishing blow!",
      "RECURSA took 40 damage!",
    ]);
  });

  it("covers misses, timeouts, rounds and fainting", () => {
    expect(missLines("BYTEBAT", "SCHEMAFORGE")).toEqual(["BYTEBAT's query fizzled!", "SCHEMAFORGE strikes back!"]);
    expect(missLines("P1 BYTEBAT")).toEqual(["P1 BYTEBAT's query fizzled!"]);
    expect(timeoutLines("NULLOTH", false)).toEqual(["Time's up!", "NULLOTH strikes!"]);
    expect(timeoutLines("P2 BYTEBAT", true)).toHaveLength(1);
    expect(roundLine("BYTEBAT", "Filter the rows")).toBe("Filter the rows. What will BYTEBAT do?");
    expect(faintLine("OPTICORE")).toBe("OPTICORE fainted!");
  });
});

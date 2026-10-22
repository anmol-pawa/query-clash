import { describe, expect, it } from "vitest";
import { CHAPTERS } from "@/content/chapters";
import { ATTACKS, attackFor, detectConcepts } from "@/lib/dialect/concepts";
import { computeDamage } from "@/game/engine/damage";
import { castLines } from "@/game/engine/battleText";
import { ATTACK_TYPE, BOSS_TYPE, RESISTED, SQL_TYPES, SUPER, TYPE_CHART, effectiveness } from "@/game/engine/types";

const dialects = ["postgres", "oracle"] as const;

describe("type chart", () => {
  it("types every attack and every boss", () => {
    for (const k of Object.keys(ATTACKS)) expect(SQL_TYPES).toContain(ATTACK_TYPE[k as keyof typeof ATTACK_TYPE]);
    for (const c of CHAPTERS) expect(SQL_TYPES).toContain(BOSS_TYPE[c.boss]);
    // ten types, each guarded by a boss (ARBORIX shares INDEX with the Optimizer)
    expect(new Set(CHAPTERS.map((c) => BOSS_TYPE[c.boss])).size).toBe(SQL_TYPES.length);
  });

  it("never lists a type as both a weakness and a resistance, and explains each matchup", () => {
    for (const t of SQL_TYPES) {
      const { weak, resist } = TYPE_CHART[t];
      expect(weak.length).toBeGreaterThan(0);
      expect(resist.length).toBeGreaterThan(0);
      for (const w of weak) expect(resist.map((r) => r.type)).not.toContain(w.type);
      for (const m of [...weak, ...resist]) expect(m.why.length).toBeGreaterThan(10);
    }
  });

  it("makes every boss weak to its own chapter's concept", () => {
    for (const t of SQL_TYPES) expect(effectiveness(t, t).effect).toBe("super");
  });

  it("never resists a chapter's reference solutions", () => {
    for (const c of CHAPTERS)
      for (const m of c.missions)
        for (const d of dialects) {
          const type = ATTACK_TYPE[attackFor(detectConcepts(m.solution[d])).kind];
          expect(effectiveness(type, BOSS_TYPE[c.boss]).effect, `${m.id} (${d})`).not.toBe("resisted");
        }
  });

  it("covers the textbook matchups", () => {
    // EXISTS semi-joins beat join fan-out; recursion beats fixed self-joins
    expect(effectiveness("subquery", "join").effect).toBe("super");
    expect(effectiveness("join", "recursive").effect).toBe("resisted");
    // WHERE can't filter groups; GROUP BY can't keep rows next to totals
    expect(effectiveness("filter", "aggregate").effect).toBe("resisted");
    expect(effectiveness("aggregate", "window").effect).toBe("resisted");
    // indexes slow writes; ROLLBACK undoes writes
    expect(effectiveness("write", "index").effect).toBe("resisted");
    expect(effectiveness("txn", "write").effect).toBe("super");
    // neutral matchups and untyped foes
    expect(effectiveness("join", "index")).toEqual({ effect: "normal", mult: 1 });
    expect(effectiveness("join")).toEqual({ effect: "normal", mult: 1 });
  });
});

describe("type multiplier in damage", () => {
  const base = { secondsLeft: 0, totalSeconds: 100, hintsUsed: 0, attempts: 2 };
  it("folds the multiplier into damage", () => {
    const join = detectConcepts("SELECT * FROM a JOIN b ON a.id = b.id");
    const neutral = computeDamage({ ...base, concepts: join });
    expect(neutral.type).toBe("join");
    expect(neutral.mult.type).toBe(1);
    const sup = computeDamage({ ...base, concepts: join, foeType: "join" });
    expect(sup.effect.effect).toBe("super");
    expect(sup.mult.type).toBe(SUPER);
    expect(sup.damage).toBe(Math.round(neutral.damage * SUPER));
    const res = computeDamage({ ...base, concepts: join, foeType: "recursive" });
    expect(res.effect.effect).toBe("resisted");
    expect(res.damage).toBe(Math.round(neutral.damage * RESISTED));
    const plain = computeDamage({ ...base, concepts: join, foeType: "index" });
    expect(plain.damage).toBe(neutral.damage);
  });

  it("announces the effect after the move", () => {
    expect(castLines({ user: "BYTEBAT", target: "JOINMASTER", attack: "Subquery Mirror", damage: 90, effect: "super" })).toEqual([
      "BYTEBAT used SUBQUERY MIRROR!",
      "It's super effective!",
      "JOINMASTER took 90 damage!",
    ]);
    expect(castLines({ user: "BYTEBAT", target: "RECURSA", attack: "Join Chain", damage: 20, crit: true, effect: "resisted" }).slice(1, 3)).toEqual(["A critical hit!", "It's not very effective…"]);
    expect(castLines({ user: "BYTEBAT", target: "RECURSA", attack: "Join Chain", damage: 20, effect: "normal" })).toHaveLength(2);
  });
});

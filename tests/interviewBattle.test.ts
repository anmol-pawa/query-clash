import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS } from "@/content/interview";
import type { Question } from "@/content/interview/types";
import { buildDeck, moveStep } from "@/game/engine/interview";
import {
  CRIT_STREAK,
  DECK_SIZE,
  KIND_ATTACK,
  PLAYER_HP,
  answerLines,
  askLine,
  counterDamageFor,
  currentQuestion,
  foeHpFor,
  hitDamage,
  holdLine,
  initialInterview,
  interviewReducer,
  interviewStars,
  interviewXp,
  mergeSolved,
  type InterviewState,
} from "@/game/engine/interviewBattle";
import { ATTACKS } from "@/lib/dialect/concepts";

const deck = (n: number, difficulty: 1 | 2 | 3 = 1): Question[] =>
  Array.from({ length: n }, (_, i) => ({ id: `q${i}`, topic: "basics", kind: "truefalse", prompt: `Question number ${i}?`, explanation: "Because it is so.", difficulty, tags: ["t"], answer: true }));

/** Answer the current question and let the animation land. */
const play = (s: InterviewState, correct: boolean) => interviewReducer(interviewReducer(s, { type: "answer", correct }), { type: "land" });
const start = (n = DECK_SIZE, d: 1 | 2 | 3 = 1) => interviewReducer(initialInterview(deck(n, d), "BYTEBAT", "NULLOTH"), { type: "start" });

describe("interview battle numbers", () => {
  it("sizes the guardian so about three quarters of the deck must be right", () => {
    expect(foeHpFor(8)).toBe(600);
    expect(foeHpFor(4)).toBe(300);
    expect(foeHpFor(1)).toBe(100);
    expect(foeHpFor(0)).toBe(100);
  });

  it("scales hits by difficulty and streak, crits from the third in a row", () => {
    expect(hitDamage(1, 1)).toEqual({ damage: 90, crit: false });
    expect(hitDamage(2, 1)).toEqual({ damage: 110, crit: false });
    expect(hitDamage(3, 1)).toEqual({ damage: 130, crit: false });
    expect(hitDamage(1, 2)).toEqual({ damage: 99, crit: false });
    expect(hitDamage(1, CRIT_STREAK)).toEqual({ damage: Math.round(90 * 1.2 * 1.5), crit: true });
    // the streak bonus caps at +40%
    expect(hitDamage(1, 5).damage).toBe(hitDamage(1, 9).damage);
    expect(hitDamage(1, 5).damage).toBe(Math.round(90 * 1.4 * 1.5));
  });

  it("counters harder when the question was harder", () => {
    expect([1, 2, 3].map((d) => counterDamageFor(d as 1 | 2 | 3))).toEqual([22, 26, 30]);
  });

  it("gives every question type a real move", () => {
    for (const k of Object.values(KIND_ATTACK)) expect(ATTACKS[k]).toBeDefined();
    expect(new Set(Object.values(KIND_ATTACK)).size).toBe(Object.keys(KIND_ATTACK).length);
  });
});

describe("interview battle reducer", () => {
  it("starts in the intro and only answers while asking", () => {
    const s0 = initialInterview(deck(3), "BYTEBAT", "NULLOTH");
    expect(s0.phase).toBe("intro");
    expect(s0.player.hp).toBe(PLAYER_HP);
    expect(interviewReducer(s0, { type: "answer", correct: true })).toBe(s0);
    const s1 = interviewReducer(s0, { type: "start" });
    expect(s1.phase).toBe("ask");
    expect(interviewReducer(s1, { type: "start" })).toBe(s1);
    expect(interviewReducer(s1, { type: "next" })).toBe(s1);
    expect(interviewReducer(s1, { type: "land" })).toBe(s1);
  });

  it("applies damage only when the attack lands", () => {
    const s = start();
    const a = interviewReducer(s, { type: "answer", correct: true });
    expect(a.phase).toBe("anim");
    expect(a.foe.hp).toBe(s.foe.hp);
    expect(a.last).toEqual({ correct: true, damage: 90, crit: false });
    expect(interviewReducer(a, { type: "answer", correct: true })).toBe(a);
    const b = interviewReducer(a, { type: "land" });
    expect(b.phase).toBe("explain");
    expect(b.foe.hp).toBe(s.foe.hp - 90);
    expect(b.solved).toEqual(["q0"]);
    expect(b.stats.hits).toBe(1);
  });

  it("a wrong answer resets the streak and hurts the player", () => {
    let s = play(start(), true);
    s = interviewReducer(s, { type: "next" });
    s = play(s, true);
    expect(s.streak).toBe(2);
    s = play(interviewReducer(s, { type: "next" }), false);
    expect(s.streak).toBe(0);
    expect(s.player.hp).toBe(PLAYER_HP - 22);
    expect(s.stats).toMatchObject({ hits: 2, misses: 1, damageTaken: 22, bestCombo: 1 });
    expect(s.solved).toEqual(["q0", "q1"]);
  });

  it("wins when the guardian faints, with 3 stars for a clean run", () => {
    let s = start();
    let turns = 0;
    while (s.phase !== "victory") {
      s = play(s, true);
      s = interviewReducer(s, { type: "next" });
      turns++;
    }
    // 90 + 99 + 162 + 175 + 189 = 715 ≥ 600 at the fifth right answer
    expect(turns).toBe(5);
    expect(s.foe.hp).toBe(0);
    expect(s.stats.crits).toBe(3);
    expect(s.stats.bestCombo).toBe(4);
    expect(interviewStars(s)).toBe(3);
    expect(interviewXp(s)).toBe(5 * 15 + 3 * 40);
  });

  it("loses when the player faints", () => {
    let s = start(8, 3);
    let turns = 0;
    while (s.phase !== "defeat") {
      s = play(s, false);
      s = interviewReducer(s, { type: "next" });
      turns++;
    }
    // 30 per miss: the fourth one faints a 100 HP player
    expect(turns).toBe(4);
    expect(s.player.hp).toBe(0);
    expect(interviewStars(s)).toBe(0);
    expect(interviewXp(s)).toBe(0);
  });

  it("loses when the questions run out with the guardian standing", () => {
    let s = start(4);
    const pattern = [true, false, true, false];
    for (const c of pattern) s = interviewReducer(play(s, c), { type: "next" });
    expect(s.phase).toBe("defeat");
    expect(s.player.hp).toBeGreaterThan(0);
    expect(s.foe.hp).toBeGreaterThan(0);
    expect(holdLine("NULLOTH")).toContain("NULLOTH");
  });

  it("stars: 2 with a few misses and HP left, 1 when barely alive", () => {
    // 8 questions: miss twice, then answer the rest right
    let s = start();
    for (const c of [false, false, true, true, true, true, true, true]) {
      if (s.phase !== "ask") break;
      s = interviewReducer(play(s, c), { type: "next" });
    }
    expect(s.phase).toBe("victory");
    expect(interviewStars(s)).toBe(2);
    const low: InterviewState = { ...s, player: { ...s.player, hp: 30 } };
    expect(interviewStars(low)).toBe(1);
  });

  it("walks the whole deck in order", () => {
    let s = start(3);
    const seen: string[] = [];
    // a big HP pool so nobody faints
    s = { ...s, foe: { ...s.foe, hp: 10_000, maxHp: 10_000 } };
    while (s.phase === "ask") {
      seen.push(currentQuestion(s)!.id);
      s = interviewReducer(play(s, true), { type: "next" });
    }
    expect(seen).toEqual(["q0", "q1", "q2"]);
    expect(currentQuestion({ ...s, index: 99 })).toBeUndefined();
  });
});

describe("interview battle text", () => {
  it("asks and narrates answers", () => {
    const s = start(5);
    expect(askLine(s)).toBe("Question 1 of 5. What will BYTEBAT answer?");
    const hit = interviewReducer(s, { type: "answer", correct: true });
    expect(answerLines(hit, "Filter Bolt")).toEqual(["Correct!", "BYTEBAT used FILTER BOLT!", "NULLOTH took 90 damage!"]);
    const miss = interviewReducer(s, { type: "answer", correct: false });
    expect(answerLines(miss, "Filter Bolt")).toEqual(["Not quite!", "NULLOTH strikes back!", "BYTEBAT took 22 damage!"]);
    expect(answerLines(s, "x")).toEqual([]);
  });

  it("mentions crits and streaks", () => {
    let s = start();
    for (let i = 0; i < 2; i++) s = interviewReducer(play(s, true), { type: "next" });
    const third = interviewReducer(s, { type: "answer", correct: true });
    expect(answerLines(third, "Window Blade")).toEqual(["Correct!", "BYTEBAT used WINDOW BLADE!", "A critical hit!", "3 in a row!", "NULLOTH took 162 damage!"]);
  });
});

describe("interview battle helpers", () => {
  it("stores only fixed questions in the save, once", () => {
    const fixed = new Set(["a", "b", "c"]);
    expect(mergeSolved(["a"], ["a", "b", "gen-1"], fixed)).toEqual(["a", "b"]);
    expect(mergeSolved([], [], fixed)).toEqual([]);
  });

  it("moves order steps up and down, ignoring moves off the ends", () => {
    expect(moveStep(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveStep(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
    expect(moveStep(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
    expect(moveStep(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });

  it("builds a full battle deck for the fundamentals at every difficulty", () => {
    expect(buildDeck(QUESTIONS, GENERATORS, { topic: "basics", seed: 7, size: DECK_SIZE })).toHaveLength(DECK_SIZE);
    for (const d of [1, 2, 3] as const) {
      const avail = QUESTIONS.filter((q) => q.topic === "basics" && q.difficulty === d).length + GENERATORS.filter((g) => g.topic === "basics" && g.difficulty === d).length;
      expect(buildDeck(QUESTIONS, GENERATORS, { topic: "basics", seed: 7, size: DECK_SIZE, difficulties: [d] })).toHaveLength(Math.min(DECK_SIZE, avail));
    }
  });
});

describe("interview battle report", () => {
  it("counts the streak from the first right answer, and 0 with none", async () => {
    const { interviewReport } = await import("@/game/engine/interviewBattle");
    const base = { hits: 0, misses: 5, crits: 0, damageDealt: 0, damageTaken: 110, bestCombo: 0, hints: 0 };
    expect(interviewReport(base)).toEqual([["Right", 0], ["Wrong", 5], ["Crits", 0], ["Damage", 0], ["Best streak", 0]]);
    expect(interviewReport({ ...base, hits: 4, bestCombo: 2, damageDealt: 400 })[4]).toEqual(["Best streak", 3]);
  });
});

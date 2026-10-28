/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { GENERATORS, QUESTIONS, TOPICS } from "@/content/interview";
import { balanceChoices } from "@/lib/balanceChoices";
import type { Question } from "@/content/interview/types";
import { answerText, correctResponse, grade } from "@/game/engine/interview";

/** Every exported question array in content/interview/*.ts, keyed by "file:export". */
const modules = import.meta.glob<Record<string, unknown>>("../content/interview/*.ts", { eager: true });
const banks: Record<string, Question[]> = {};
for (const [path, mod] of Object.entries(modules)) {
  const file = path.split("/").pop()!.replace(".ts", "");
  if (file === "index" || file === "types") continue;
  for (const [name, value] of Object.entries(mod)) {
    if (Array.isArray(value) && value.length > 0 && value.every((q) => q && typeof q === "object" && "id" in q && "kind" in q && "prompt" in q)) {
      banks[`${file}:${name}`] = value as Question[];
    }
  }
}

describe("whole interview bank audit", () => {
  it("finds the banks it should audit and they are all wired into QUESTIONS", () => {
    expect(Object.keys(banks).length).toBeGreaterThan(40);
    const wired = new Set(QUESTIONS.map((q) => q.id));
    for (const [name, qs] of Object.entries(banks)) for (const q of qs) expect(wired.has(q.id), `${name} ${q.id} not exported via index`).toBe(true);
  });

  it("ids are unique across every bank and don't collide with generator ids", () => {
    // A bank module may re-export another's array; count each question object once.
    const ids = [...new Set(Object.values(banks).flat())].map((q) => q.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    const gen = new Set(GENERATORS.map((g) => g.id));
    expect(ids.filter((id) => gen.has(id))).toEqual([]);
  });

  it("every question has a topic, tags, a prompt, a real explanation and a keyed answer that grades correct", () => {
    const topics = new Set(TOPICS.map((t) => t.id));
    for (const q of QUESTIONS) {
      expect(topics.has(q.topic), q.id).toBe(true);
      expect(q.tags.length, q.id).toBeGreaterThan(0);
      expect(q.tags.every((t) => t.trim().length > 0), q.id).toBe(true);
      expect(q.prompt.trim().length, q.id).toBeGreaterThan(10);
      expect(q.explanation.trim().length, q.id).toBeGreaterThan(30);
      if (q.kind === "sql") continue;
      expect(grade(q, correctResponse(q)), q.id).toBe(true);
      expect(answerText(q).trim().length, q.id).toBeGreaterThan(0);
    }
  });

  it("choice questions have distinct, non-empty options and in-range keys", () => {
    for (const q of QUESTIONS) {
      if (q.kind !== "mcq" && q.kind !== "multi") continue;
      expect(q.choices.every((c) => c.trim().length > 0), q.id).toBe(true);
      expect(new Set(q.choices.map((c) => c.trim().toLowerCase())).size, q.id).toBe(q.choices.length);
      const keys = q.kind === "mcq" ? [q.answer] : q.answers;
      for (const k of keys) expect(Number.isInteger(k) && k >= 0 && k < q.choices.length, q.id).toBe(true);
    }
  });

  // Answer-position balance: a player must not be able to guess by slot.
  it("no bank parks its correct MCQ answers in one slot", () => {
    const flagged: string[] = [];
    for (const [name, qs] of Object.entries(banks)) {
      const mcq = qs.map(balanceChoices).filter((q) => q.kind === "mcq");
      if (mcq.length < 8) continue;
      const counts = new Map<number, number>();
      for (const q of mcq) if (q.kind === "mcq") counts.set(q.answer, (counts.get(q.answer) ?? 0) + 1);
      const top = Math.max(...counts.values());
      if (top / mcq.length > 0.6) flagged.push(`${name}: ${top}/${mcq.length} in slot ${[...counts].find(([, c]) => c === top)![0]}`);
    }
    expect(flagged).toEqual([]);
  });

  it("the whole MCQ set is spread over slots and the true/false set over both answers", () => {
    const mcq = QUESTIONS.filter((q) => q.kind === "mcq");
    const counts = new Map<number, number>();
    for (const q of mcq) if (q.kind === "mcq") counts.set(q.answer, (counts.get(q.answer) ?? 0) + 1);
    expect(Math.max(...counts.values()) / mcq.length).toBeLessThanOrEqual(0.4);
    const tf = QUESTIONS.filter((q) => q.kind === "truefalse");
    const trues = tf.filter((q) => q.kind === "truefalse" && q.answer).length;
    expect(trues / tf.length).toBeGreaterThan(0.3);
    expect(trues / tf.length).toBeLessThan(0.7);
  });
});

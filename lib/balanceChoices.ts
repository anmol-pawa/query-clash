import type { Question } from "@/content/interview/types";

/** FNV-1a, so a question's slot depends only on its id (stable across runs and bank edits elsewhere). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Choices that only make sense in the authored order: "all of the above", numeric ladders, or text pointing at "choice 3". */
function orderMatters(q: { choices: string[]; explanation: string }): boolean {
  if (/\b(choice|option|answer)s? [1-4a-d]\b|\b(first|second|third|fourth|last) (choice|option)\b/i.test(q.explanation)) return true;
  if (q.choices.some((c) => /\b(above|below|neither|both of|all of|none of)\b|^both\b/i.test(c))) return true;
  return q.choices.every((c) => /^[-+~≈]?\s*[\d.,]+\s*[a-z%×]{0,6}$/i.test(c.trim()));
}

/**
 * Authors tend to key the right answer in the first slots. Move a single-answer MCQ's correct choice to a slot
 * derived from its id (the other choices keep their relative order). Questions whose choices depend on position are untouched.
 */
export function balanceChoices(q: Question): Question {
  if (q.kind !== "mcq" || orderMatters(q)) return q;
  const n = q.choices.length;
  const target = hash(q.id) % n;
  if (target === q.answer) return q;
  const rest = q.choices.filter((_, i) => i !== q.answer);
  const choices = [...rest.slice(0, target), q.choices[q.answer], ...rest.slice(target)];
  return { ...q, choices, answer: target };
}

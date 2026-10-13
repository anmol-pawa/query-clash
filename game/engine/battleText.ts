/**
 * Pure helpers for the handheld-style battle text box: the lines it types out
 * ("Wild NULLOTH appeared!", "BYTEBAT used FILTER BOLT!") and the typewriter
 * reveal itself.
 */

import { Effect, effectLine } from "./types";

export type TextMode = "campaign" | "arena" | "versus";

/** Characters revealed per second by the typewriter. */
export const TYPE_CPS = 45;

/** The part of `text` revealed `elapsedMs` after it started typing. */
export function typed(text: string, elapsedMs: number, cps = TYPE_CPS): string {
  const n = Math.floor((Math.max(0, elapsedMs) * cps) / 1000);
  return text.slice(0, Math.min(text.length, n));
}

/** How long a line takes to type out fully. */
export const typeDuration = (text: string, cps = TYPE_CPS) => Math.ceil((text.length * 1000) / cps);

/** Opening lines when the battle starts. */
export function introLines(mode: TextMode, foe: string, player: string): string[] {
  if (mode === "versus") return [`${foe} wants to battle!`, `Go! ${player}!`];
  if (mode === "arena") return [`A wild ${foe} appeared!`, `Go! ${player}!`];
  return [`Wild ${foe} appeared!`, `Go! ${player}!`];
}

/** The prompt at the start of each round. */
export function roundLine(player: string, missionTitle: string): string {
  return `${missionTitle}. What will ${player} do?`;
}

export interface CastInfo {
  user: string;
  target: string;
  attack: string;
  damage: number;
  crit?: boolean;
  combo?: number;
  finisher?: boolean;
  effect?: Effect;
}

/** Lines for a correct cast: the move, its bonuses, then the damage dealt. */
export function castLines(c: CastInfo): string[] {
  const lines = [`${c.user} used ${c.attack.toUpperCase()}!`];
  if (c.crit) lines.push("A critical hit!");
  const eff = c.effect && effectLine(c.effect);
  if (eff) lines.push(eff);
  if (c.combo && c.combo > 0) lines.push(`${c.combo + 1}× combo!`);
  if (c.finisher) lines.push("A finishing blow!");
  lines.push(`${c.target} took ${c.damage} damage!`);
  return lines;
}

/** Lines for a wrong cast; `counter` is the foe that strikes back, if any. */
export function missLines(user: string, counter?: string): string[] {
  const lines = [`${user}'s query fizzled!`];
  if (counter) lines.push(`${counter} strikes back!`);
  return lines;
}

/** Lines when the round timer runs out; versus just passes the turn. */
export function timeoutLines(foe: string, versus: boolean): string[] {
  return versus ? ["Time's up! The turn passes."] : ["Time's up!", `${foe} strikes!`];
}

export const faintLine = (name: string) => `${name} fainted!`;

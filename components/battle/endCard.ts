/**
 * The victory/defeat card as plain data: its banner, tone, star row, the
 * result scene's winner and loser, and the battle report rows.
 */
export type EndMode = "campaign" | "arena" | "versus";

export interface EndStats {
  hits: number;
  misses: number;
  crits: number;
  damageDealt: number;
  bestCombo: number;
  hints: number;
}

export const WIN_TONE = "#f2b632";
export const LOSS_TONE = "#e0475e";
export const VERSUS_TONE = "#f472b6";

/** Banner text and tint. Versus always crowns someone; arena runs always end. */
export function endBanner(mode: EndMode, won: boolean, versusWinner: string): { title: string; tone: string } {
  if (mode === "versus") return { title: `${versusWinner.toUpperCase()} WINS`, tone: VERSUS_TONE };
  if (mode === "arena") return { title: "RUN OVER", tone: WIN_TONE };
  return won ? { title: "VICTORY", tone: WIN_TONE } : { title: "DEFEATED", tone: LOSS_TONE };
}

/** Three slots, lit for each star earned (clamped to 0–3). */
export function starRow(stars: number): boolean[] {
  return [1, 2, 3].map((i) => i <= stars);
}

/**
 * Who stands and who lies fainted in the result scene. `left` is the player
 * (P1 in versus), `right` the foe (P2 in versus).
 */
export function sceneSides(mode: EndMode, won: boolean, versusWinner: string): { left: "stand" | "fainted"; right: "stand" | "fainted" } {
  // an arena run ends when the player faints
  const leftWon = mode === "versus" ? versusWinner === "Player 1" : mode === "arena" ? false : won;
  return leftWon ? { left: "stand", right: "fainted" } : { left: "fainted", right: "stand" };
}

/** The battle report, in reading order. Best combo counts the first hit. */
export function reportRows(s: EndStats): [string, number][] {
  return [
    ["Hits", s.hits],
    ["Misses", s.misses],
    ["Crits", s.crits],
    ["Damage", s.damageDealt],
    ["Best combo", s.bestCombo + 1],
    ["Hints", s.hints],
  ];
}

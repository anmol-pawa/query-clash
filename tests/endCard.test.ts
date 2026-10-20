import { describe, expect, it } from "vitest";
import { LOSS_TONE, VERSUS_TONE, WIN_TONE, endBanner, reportRows, sceneSides, starRow } from "@/components/battle/endCard";
import { validateSprite } from "@/game/sprites/pixel";
import { PLATFORM_STONE, STAR_DIM, STAR_LIT, platformFrame } from "@/game/sprites/ui";

describe("victory/defeat card", () => {
  it("names the outcome per mode", () => {
    expect(endBanner("campaign", true, "")).toEqual({ title: "VICTORY", tone: WIN_TONE });
    expect(endBanner("campaign", false, "")).toEqual({ title: "DEFEATED", tone: LOSS_TONE });
    expect(endBanner("arena", false, "")).toEqual({ title: "RUN OVER", tone: WIN_TONE });
    expect(endBanner("versus", true, "Player 2")).toEqual({ title: "PLAYER 2 WINS", tone: VERSUS_TONE });
  });

  it("lights one star per star earned, clamped to three slots", () => {
    expect(starRow(0)).toEqual([false, false, false]);
    expect(starRow(2)).toEqual([true, true, false]);
    expect(starRow(3)).toEqual([true, true, true]);
    expect(starRow(5)).toEqual([true, true, true]);
  });

  it("stands the winner and fells the loser", () => {
    expect(sceneSides("campaign", true, "")).toEqual({ left: "stand", right: "fainted" });
    expect(sceneSides("campaign", false, "")).toEqual({ left: "fainted", right: "stand" });
    expect(sceneSides("arena", false, "")).toEqual({ left: "fainted", right: "stand" });
    expect(sceneSides("versus", true, "Player 1")).toEqual({ left: "stand", right: "fainted" });
    expect(sceneSides("versus", true, "Player 2")).toEqual({ left: "fainted", right: "stand" });
  });

  it("reports the stats in order, counting the first hit in the combo", () => {
    const rows = reportRows({ hits: 5, misses: 1, crits: 2, damageDealt: 340, bestCombo: 3, hints: 0 });
    expect(rows).toEqual([
      ["Hits", 5],
      ["Misses", 1],
      ["Crits", 2],
      ["Damage", 340],
      ["Best combo", 4],
      ["Hints", 0],
    ]);
  });
});

describe("card sprites", () => {
  it("are valid sprites", () => {
    for (const def of [STAR_LIT, STAR_DIM, PLATFORM_STONE]) expect(validateSprite(def), def.id).toEqual([]);
  });

  it("draw the star symmetric with an outline on its tips", () => {
    const f = STAR_DIM.anims.idle[0];
    for (const row of f) expect([...row].map((c) => (c === "." ? "." : "x")).join("")).toBe([...row].map((c) => (c === "." ? "." : "x")).reverse().join(""));
    expect(f[0][6]).toBe("k");
    expect(f[4][0]).toBe("k");
    expect(f[4][12]).toBe("k");
  });

  it("outlines the platform ellipse and lights its top over a shaded rim", () => {
    const f = platformFrame(48, 10);
    expect(f).toHaveLength(10);
    for (const row of f) {
      const ink = row.replace(/\./g, "");
      if (ink) expect(ink[0] + ink[ink.length - 1]).toBe("kk");
    }
    expect(f.slice(0, 4).join("")).toContain("h");
    expect(f.slice(6).join("")).toContain("d");
    expect(f.slice(6).join("")).not.toContain("h");
  });
});

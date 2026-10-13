import type { BossId } from "@/content/types";
import type { BossAttackStyle } from "@/game/render/characters/bosses";
import type { SpriteDef } from "./pixel";
import { spriteById } from "./index";

/** The player's starter creature: its front sprite (menus, Querydex) and back sprite (battle). */
export const STARTER = { front: "bytebat", back: "bytebat-back" } as const;

/** The starter's evolution line, one entry per stage (see `starterStage` in the Querydex engine). */
export const STARTER_LINE: readonly { front: string; back: string }[] = [STARTER, { front: "kilobat", back: "kilobat-back" }];

/**
 * Which pixel sprite plays each chapter boss. Sprite ids differ from some
 * BossIds on purpose (e.g. `subzero` → `frostnest`) so no sprite reuses an
 * existing character's name.
 */
export const BOSS_SPRITE: Readonly<Record<BossId, string>> = {
  nulloth: "nulloth",
  joinmaster: "joinmaster",
  aggregon: "aggregon",
  subzero: "frostnest",
  reaper: "rowreaper",
  transactor: "transactor",
  schemaforge: "schemaforge",
  windwraith: "galeframe",
  hydra: "recursa",
  optimizer: "opticore",
};

export function bossSprite(id: BossId): SpriteDef {
  const def = spriteById(BOSS_SPRITE[id]);
  if (!def) throw new Error(`no sprite "${BOSS_SPRITE[id]}" for boss ${id}`);
  return def;
}

export function starterSprite(side: keyof typeof STARTER, stage = 0): SpriteDef {
  const form = STARTER_LINE[Math.max(0, Math.min(stage, STARTER_LINE.length - 1))];
  const def = spriteById(form[side]);
  if (!def) throw new Error(`no starter sprite "${form[side]}"`);
  return def;
}

/** Each chapter boss keeps its old rig's counter-attack style and effect colour. */
export const BOSS_STYLE: Readonly<Record<BossId, { style: BossAttackStyle; color: number }>> = {
  nulloth: { style: "orbs", color: 0x5eead4 },
  joinmaster: { style: "chain", color: 0xfbbf24 },
  aggregon: { style: "blocks", color: 0xf97316 },
  subzero: { style: "shards", color: 0xa78bfa },
  reaper: { style: "scythe", color: 0x60a5fa },
  transactor: { style: "gear", color: 0x34d399 },
  schemaforge: { style: "quake", color: 0xf59e0b },
  windwraith: { style: "wind", color: 0x38bdf8 },
  hydra: { style: "breath", color: 0x4ade80 },
  optimizer: { style: "laser", color: 0xe879f9 },
};

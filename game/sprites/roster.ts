import type { BossId } from "@/content/types";
import type { SpriteDef } from "./pixel";
import { spriteById } from "./index";

/** The player's starter creature: its front sprite (menus, Querydex) and back sprite (battle). */
export const STARTER = { front: "bytebat", back: "bytebat-back" } as const;

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

export function starterSprite(side: keyof typeof STARTER): SpriteDef {
  const def = spriteById(STARTER[side]);
  if (!def) throw new Error(`no starter sprite "${STARTER[side]}"`);
  return def;
}

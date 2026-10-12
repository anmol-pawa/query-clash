import type { SpriteDef } from "./pixel";
import { BYTEBAT } from "./creatures/bytebat";
import { BYTEBAT_BACK } from "./creatures/bytebat-back";
import { NULLOTH } from "./creatures/nulloth";
import { JOINMASTER } from "./creatures/joinmaster";
import { AGGREGON } from "./creatures/aggregon";
import { FROSTNEST } from "./creatures/frostnest";

/** Every pixel sprite in the game, shown in /dev/sprites and checked by tests. */
export const SPRITES: readonly SpriteDef[] = [BYTEBAT, BYTEBAT_BACK, NULLOTH, JOINMASTER, AGGREGON, FROSTNEST];

export function spriteById(id: string): SpriteDef | undefined {
  return SPRITES.find((s) => s.id === id);
}

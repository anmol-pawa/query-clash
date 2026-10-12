import type { SpriteDef } from "./pixel";
import { BYTEBAT } from "./creatures/bytebat";

/** Every pixel sprite in the game, shown in /dev/sprites and checked by tests. */
export const SPRITES: readonly SpriteDef[] = [BYTEBAT];

export function spriteById(id: string): SpriteDef | undefined {
  return SPRITES.find((s) => s.id === id);
}

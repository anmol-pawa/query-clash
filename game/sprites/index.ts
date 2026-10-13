import type { SpriteDef } from "./pixel";
import { BYTEBAT } from "./creatures/bytebat";
import { BYTEBAT_BACK } from "./creatures/bytebat-back";
import { KILOBAT } from "./creatures/kilobat";
import { KILOBAT_BACK } from "./creatures/kilobat-back";
import { NULLOTH } from "./creatures/nulloth";
import { JOINMASTER } from "./creatures/joinmaster";
import { AGGREGON } from "./creatures/aggregon";
import { FROSTNEST } from "./creatures/frostnest";
import { ROWREAPER } from "./creatures/rowreaper";
import { TRANSACTOR } from "./creatures/transactor";
import { SCHEMAFORGE } from "./creatures/schemaforge";
import { GALEFRAME } from "./creatures/galeframe";
import { RECURSA } from "./creatures/recursa";
import { OPTICORE } from "./creatures/opticore";

/** Every pixel sprite in the game, shown in /dev/sprites and checked by tests. */
export const SPRITES: readonly SpriteDef[] = [BYTEBAT, BYTEBAT_BACK, KILOBAT, KILOBAT_BACK, NULLOTH, JOINMASTER, AGGREGON, FROSTNEST, ROWREAPER, TRANSACTOR, SCHEMAFORGE, GALEFRAME, RECURSA, OPTICORE];

export function spriteById(id: string): SpriteDef | undefined {
  return SPRITES.find((s) => s.id === id);
}

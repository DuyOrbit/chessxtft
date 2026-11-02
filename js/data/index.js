// ============================================================================
// CHESS TFT - DATA MODULE BARREL EXPORT
// ============================================================================

export * from './economy.data.js';
export * from './traits.data.js';
export * from './pieces.data.js';
export * from './maps.data.js';
export * from './items.data.js';
export * from './augments.data.js';
export * from './bot-profiles.data.js';
export * from './meta-comps.data.js';

import {
    STAGE_CONFIG,
    STAGE_ROUNDS_FORMAT,
    PVE_ENCOUNTERS,
    COMBAT_RULES,
    ECONOMY_RULES,
    DAMAGE_FORMULA,
    LEVEL_XP,
    SHOP_ODDS,
    SKIRMISH_CONFIG
} from './economy.data.js';
import { TRAITS, SYNERGIES } from './traits.data.js';
import { PIECES } from './pieces.data.js';
import { MAPS } from './maps.data.js';
import { ITEMS } from './items.data.js';
import { AUGMENTS } from './augments.data.js';
import { BOT_NAMES } from './bot-profiles.data.js';
import { META_COMPS } from './meta-comps.data.js';

/**
 * Returns a bundled copy of all static game data for backward compatibility
 */
export function getGameDataBundle() {
    return {
        STAGE_CONFIG,
        STAGE_ROUNDS_FORMAT,
        PVE_ENCOUNTERS,
        COMBAT_RULES,
        ECONOMY_RULES,
        DAMAGE_FORMULA,
        LEVEL_XP,
        SHOP_ODDS,
        SKIRMISH_CONFIG,
        SYNERGIES,
        TRAITS,
        PIECES,
        MAPS,
        ITEMS,
        AUGMENTS,
        BOT_NAMES,
        META_COMPS
    };
}

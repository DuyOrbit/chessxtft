// ============================================================================
// GAME EVENTS ENUM DEFINITIONS
// Decoupled event registry for Chess TFT pub/sub architecture
// ============================================================================

export const GAME_EVENTS = Object.freeze({
    // --- LIFECYCLE & ROUTING ---
    APP_INITIALIZED: 'app:initialized',
    SCREEN_CHANGED: 'screen:changed',
    USER_LOGGED_IN: 'user:logged_in',
    USER_LOGGED_OUT: 'user:logged_out',
    USER_PROFILE_UPDATED: 'user:profile_updated',

    // --- ROOM & MULTIPLAYER ---
    ROOM_CREATED: 'room:created',
    ROOM_JOINED: 'room:joined',
    ROOM_LEFT: 'room:left',
    ROOM_UPDATED: 'room:updated',
    ROOM_HOST_CHANGED: 'room:host_changed',
    MATCH_STARTED: 'match:started',
    MATCH_ENDED: 'match:ended',

    // --- TFT STAGE & ROUND ---
    STAGE_CHANGED: 'tft:stage_changed',
    ROUND_CHANGED: 'tft:round_changed',
    PHASE_CHANGED: 'tft:phase_changed', // 'prep' | 'combat'
    COUNTDOWN_TICK: 'tft:countdown_tick',

    // --- PLAYER ECONOMY & ROSTER ---
    GOLD_CHANGED: 'player:gold_changed',
    XP_CHANGED: 'player:xp_changed',
    LEVEL_CHANGED: 'player:level_changed',
    HP_CHANGED: 'player:hp_changed',
    STREAK_CHANGED: 'player:streak_changed',
    SYNERGIES_UPDATED: 'player:synergies_updated',

    // --- SHOP & RECRUITMENT ---
    SHOP_REFRESHED: 'shop:refreshed',
    SHOP_LOCKED_TOGGLED: 'shop:locked_toggled',
    UNIT_BOUGHT: 'shop:unit_bought',
    UNIT_SOLD: 'shop:unit_sold',
    UNIT_STAR_UP: 'shop:unit_star_up',

    // --- BOARD & BENCH INTERACTION ---
    BOARD_UPDATED: 'board:updated',
    BENCH_UPDATED: 'bench:updated',
    UNIT_MOVED: 'board:unit_moved',
    UNIT_SELECTED: 'board:unit_selected',
    UNIT_DESELECTED: 'board:unit_deselected',
    CELL_CLICKED: 'board:cell_clicked',
    CELL_HOVERED: 'board:cell_hovered',
    ITEM_EQUIPPED: 'item:equipped',
    ITEM_UNEQUIPPED: 'item:unequipped',
    AUGMENT_SELECTED: 'augment:selected',
    AUGMENT_CHOICES_OFFERED: 'augment:choices_offered',

    // --- BLITZ CHESS COMBAT ENGINE ---
    COMBAT_STARTED: 'combat:started',
    COMBAT_MOVE_MADE: 'combat:move_made',
    COMBAT_UNIT_DAMAGED: 'combat:unit_damaged',
    COMBAT_UNIT_ELIMINATED: 'combat:unit_eliminated',
    COMBAT_STATUS_APPLIED: 'combat:status_applied', // stun, burn, reload
    COMBAT_ENDED: 'combat:ended',

    // --- SPECTATOR & CASTER ---
    SPECTATOR_MODE_CHANGED: 'spectator:mode_changed', // 'multi' | 'pov'
    SPECTATOR_POV_TARGET_CHANGED: 'spectator:pov_target_changed',
    SPECTATOR_SPEED_CHANGED: 'spectator:speed_changed',
    SPECTATOR_PAUSE_TOGGLED: 'spectator:pause_toggled',
    SPECTATOR_TICK: 'spectator:tick',

    // --- AUDIO & NOTIFICATIONS ---
    PLAY_SFX: 'audio:play_sfx',
    PLAY_BGM: 'audio:play_bgm',
    STOP_BGM: 'audio:stop_bgm',
    SHOW_TOAST: 'ui:show_toast',
    SHOW_TOOLTIP: 'ui:show_tooltip',
    HIDE_TOOLTIP: 'ui:hide_tooltip'
});

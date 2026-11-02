// ============================================================================
// CHESS TFT - ECONOMY & GAME RULES CONFIGURATION
// ============================================================================

export const STAGE_CONFIG = Object.freeze({
    1: { cols: 5, rows: 6, deployRows: 2, blitzTime: 32, increment: 2, maxTurns: 35, label: "Mini 5x6 (Đầu Game - 32s)" },
    2: { cols: 6, rows: 7, deployRows: 2, blitzTime: 45, increment: 3, maxTurns: 45, label: "Vừa 6x7 (Giữa Game - 45s)" },
    3: { cols: 8, rows: 8, deployRows: 3, blitzTime: 60, increment: 3, maxTurns: 55, label: "Chuẩn 8x8 (Cuối Game - 60s)" }
});

export const STAGE_ROUNDS_FORMAT = Object.freeze({
    1: [
        { round: 1, type: "pve", icon: "👾", label: "Quái 1-1" },
        { round: 2, type: "pve", icon: "👾", label: "Quái 1-2" },
        { round: 3, type: "pve", icon: "👾", label: "Quái 1-3" }
    ],
    2: [
        { round: 1, type: "augment", icon: "🔮", label: "Lõi 2-1" },
        { round: 2, type: "combat", icon: "⚔️", label: "Vòng 2-2" },
        { round: 3, type: "combat", icon: "⚔️", label: "Vòng 2-3" },
        { round: 4, type: "carousel", icon: "🎁", label: "Đi Chợ 2-4" },
        { round: 5, type: "combat", icon: "⚔️", label: "Vòng 2-5" }
    ],
    3: [
        { round: 1, type: "combat", icon: "⚔️", label: "Vòng 3-1" },
        { round: 2, type: "augment", icon: "🔮", label: "Lõi 3-2" },
        { round: 3, type: "combat", icon: "⚔️", label: "Vòng 3-3" },
        { round: 4, type: "carousel", icon: "🎁", label: "Đi Chợ 3-4" },
        { round: 5, type: "combat", icon: "⚔️", label: "Vòng 3-5" }
    ],
    4: [
        { round: 1, type: "combat", icon: "⚔️", label: "Vòng 4-1" },
        { round: 2, type: "augment", icon: "🔮", label: "Lõi 4-2" },
        { round: 3, type: "combat", icon: "⚔️", label: "Vòng 4-3" },
        { round: 4, type: "carousel", icon: "👑", label: "Đi Chợ 4-4" },
        { round: 5, type: "combat", icon: "💀", label: "Quyết Đấu 4-5" }
    ]
});

export const PVE_ENCOUNTERS = Object.freeze({
    1: {
        round: "1-1",
        name: "Tượng Quái Đá (1-1)",
        avatar: "🗿",
        desc: "2 Tượng Lính Canh Quái Đá tĩnh canh giữ cổng thành",
        dropGold: 2,
        dropItems: ["iron_armor", "stun_hammer"],
        units: [
            { id: "stone_minion", r: 0, c: 1, stars: 1, name: "Quái Đá Lính 1" },
            { id: "stone_golem", r: 0, c: 3, stars: 1, name: "Tượng Đá Trưởng" }
        ]
    },
    2: {
        round: "1-2",
        name: "Đội Quái Đá Tuần Tra (1-2)",
        avatar: "🪨",
        desc: "3 Tượng Quái Đá phòng thủ vòng cung",
        dropGold: 3,
        dropItems: ["burn_cloak", "phase_boots", "sniper_scope"],
        units: [
            { id: "stone_minion", r: 0, c: 1, stars: 1, name: "Quái Đá Tiền Tuyến" },
            { id: "stone_golem", r: 0, c: 2, stars: 1, name: "Quái Đá Hộ Vệ" },
            { id: "stone_minion", r: 0, c: 3, stars: 1, name: "Quái Đá Yểm Trợ" }
        ]
    },
    3: {
        round: "1-3",
        name: "Thủ Lĩnh Quái Cổ Đại (1-3)",
        avatar: "👹",
        desc: "Khổng Lồ Đá Tĩnh cùng 2 Hộ Vệ Quái Cổ Đại",
        dropGold: 4,
        dropItems: ["iron_armor", "stun_hammer", "burn_cloak", "sniper_scope", "phase_boots"],
        units: [
            { id: "stone_minion", r: 0, c: 1, stars: 1, name: "Quái Đá Cận Vệ 1" },
            { id: "stone_golem", r: 0, c: 2, stars: 2, name: "Khổng Lồ Đá Cổ Đại" },
            { id: "stone_minion", r: 0, c: 3, stars: 1, name: "Quái Đá Cận Vệ 2" }
        ]
    }
});

export const COMBAT_RULES = Object.freeze({
    turnOneGrace: true,
    rangedReloadTurns: 1,
    stunImmunityTurns: 1,
    burnExplosionAoeDamage: 1,
    cavalryBonusVsRangerKing: 1
});

export const ECONOMY_RULES = Object.freeze({
    defaultStartingHp: 100,
    defaultStartingGold: 6,
    defaultStartingLevel: 3,
    baseRoundGold: 5,
    maxInterest: 5,
    rerollCost: 2,
    xpCost: 4,
    xpGainPerBuy: 4,
    passiveRoundXp: 2
});

export const DAMAGE_FORMULA = Object.freeze({
    checkmateBase: 8,
    checkmateStageMult: 2,
    checkmatePerUnit: 2,
    kingCaptureBase: 3,
    kingCaptureStageMult: 1,
    drawBase: 4
});

export const LEVEL_XP = Object.freeze({
    3: 2,
    4: 6,
    5: 10,
    6: 20,
    7: 32,
    8: 999
});

export const SHOP_ODDS = Object.freeze({
    3: [70, 25, 5, 0, 0],
    4: [50, 35, 15, 0, 0],
    5: [35, 38, 22, 5, 0],
    6: [24, 35, 28, 12, 1],
    7: [18, 27, 32, 18, 5],
    8: [12, 20, 30, 25, 13]
});

export const SKIRMISH_CONFIG = Object.freeze({
    budget: 30,
    cols: 6,
    rows: 7,
    deployRows: 3,
    blitzTime: 45,
    increment: 3,
    maxTurns: 50,
    difficulties: {
        apprentice: { id: "apprentice", name: "Tập Sự (Dễ)", icon: "🟢", blunderChance: 0.35, budget: 20 },
        veteran: { id: "veteran", name: "Chiến Binh (Vừa)", icon: "🟡", blunderChance: 0.18, budget: 26 },
        grandmaster: { id: "grandmaster", name: "Đại Kiện Tướng Magnus (Khó)", icon: "🔴", blunderChance: 0.05, budget: 30 }
    }
});

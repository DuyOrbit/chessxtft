// ============================================================================
// SIMULATION RUNNER: BOT VS BOT 1V1 MATCHES FOR META COMP WIN RATES
// ============================================================================
const fs = require('fs');
const path = require('path');

// Mock browser environment for node
global.window = {};
require('../js/data.js');

// Read and eval chess engine in Node environment
const chessEngineCode = fs.readFileSync(path.join(__dirname, '../js/chess-engine.js'), 'utf8');
(new Function('window', chessEngineCode))(global.window);
const BlitzChessEngine = global.window.BlitzChessEngine;

// Candidate Compositions for 1v1 Mode (Standard 30 Gold Budget or Equivalent Army)
const CANDIDATE_COMPS = [
    {
        id: "frost_vanguard",
        name: "Pháo Đài Băng Tuyết",
        roleDesc: "Khống chế băng giá kết hợp siêu dàn chắn Thiết Giáp bất tử",
        traits: ["vanguard", "frost"],
        mainCarries: ["frost_rook", "frost_knight"],
        synergySummary: "4 Thiết Giáp • 2 Băng Hệ",
        difficulty: "Dễ Chơi (Toàn Diện)",
        units: [
            { id: "king", r: 6, c: 2, stars: 1, isKing: true, cost: 0 },
            { id: "juggernaut", r: 4, c: 2, stars: 2, isKing: false, cost: 6 },
            { id: "frost_rook", r: 5, c: 0, stars: 2, isKing: false, cost: 8 },
            { id: "frost_knight", r: 4, c: 4, stars: 2, isKing: false, cost: 6 },
            { id: "shield_pawn", r: 4, c: 1, stars: 2, isKing: false, cost: 3 },
            { id: "shield_pawn", r: 4, c: 3, stars: 2, isKing: false, cost: 3 }
        ]
    },
    {
        id: "cavalry_rush",
        name: "Kỵ Binh Đột Kích Thần Tốc",
        roleDesc: "Đột kích nhảy chữ L vượt địa hình, áp sát bắt chết Vua và Carry hàng sau",
        traits: ["cavalry", "royal"],
        mainCarries: ["chancellor", "knight"],
        synergySummary: "3 Kỵ Binh • 2 Hoàng Gia • 2 Thiết Giáp",
        difficulty: "Trung Bình (Cơ Động)",
        units: [
            { id: "king", r: 6, c: 1, stars: 1, isKing: true, cost: 0 },
            { id: "chancellor", r: 5, c: 2, stars: 1, isKing: false, cost: 5 },
            { id: "knight", r: 4, c: 0, stars: 2, isKing: false, cost: 6 },
            { id: "frost_knight", r: 4, c: 5, stars: 2, isKing: false, cost: 6 },
            { id: "mercenary", r: 5, c: 4, stars: 2, isKing: false, cost: 3 },
            { id: "shield_pawn", r: 4, c: 2, stars: 2, isKing: false, cost: 3 }
        ]
    },
    {
        id: "sniper_siege",
        name: "Công Thành Xạ Thủ Tầm Xa",
        roleDesc: "Pháo đại bác bắn xuyên tường cùng cung thủ tỉa Vua từ xa an toàn",
        traits: ["ranger", "pyro", "vanguard"],
        mainCarries: ["cannon", "archer"],
        synergySummary: "2 Xạ Thủ • 2 Hỏa Hệ • 2 Thiết Giáp",
        difficulty: "Khó (Cần xếp góc)",
        units: [
            { id: "king", r: 6, c: 3, stars: 1, isKing: true, cost: 0 },
            { id: "cannon", r: 6, c: 1, stars: 1, isKing: false, cost: 4 },
            { id: "archer", r: 6, c: 5, stars: 2, isKing: false, cost: 6 },
            { id: "juggernaut", r: 4, c: 2, stars: 2, isKing: false, cost: 6 },
            { id: "shield_pawn", r: 5, c: 1, stars: 2, isKing: false, cost: 3 }, // Shield pawn directly in front of cannon for skip-jump shot!
            { id: "shield_pawn", r: 4, c: 4, stars: 2, isKing: false, cost: 3 }
        ]
    },
    {
        id: "pyro_mage_burn",
        name: "Hỏa Pháp Thiêu Đốt Nổ Lan",
        roleDesc: "Phép thuật trừ thẳng 2 lớp máu, gây thiêu đốt nổ lan phá tan đội hình trâu bò",
        traits: ["pyro", "mage"],
        mainCarries: ["pyro_bishop", "fire_mage"],
        synergySummary: "2 Hỏa Hệ • 2 Pháp Sư • 2 Thiết Giáp",
        difficulty: "Trung Bình (Khắc Chế Tank)",
        units: [
            { id: "king", r: 6, c: 2, stars: 1, isKing: true, cost: 0 },
            { id: "pyro_bishop", r: 5, c: 4, stars: 2, isKing: false, cost: 9 },
            { id: "fire_mage", r: 5, c: 1, stars: 2, isKing: false, cost: 3 },
            { id: "juggernaut", r: 4, c: 2, stars: 2, isKing: false, cost: 6 },
            { id: "shield_pawn", r: 4, c: 0, stars: 2, isKing: false, cost: 3 },
            { id: "shield_pawn", r: 4, c: 3, stars: 2, isKing: false, cost: 3 }
        ]
    },
    {
        id: "royal_ascendance",
        name: "Vương Triều Hậu Tối Thượng",
        roleDesc: "Nữ Hoàng cơ động toàn bản đồ kết hợp bảo vệ Vua với giáp Hoàng Gia",
        traits: ["royal", "mage", "vanguard"],
        mainCarries: ["grand_queen", "shield_pawn"],
        synergySummary: "2 Hoàng Gia • 2 Pháp Sư • 2 Thiết Giáp",
        difficulty: "Dễ Chơi (Sức mạnh 5 Vàng)",
        units: [
            { id: "king", r: 6, c: 2, stars: 1, isKing: true, cost: 0 },
            { id: "grand_queen", r: 5, c: 3, stars: 1, isKing: false, cost: 5 },
            { id: "juggernaut", r: 4, c: 2, stars: 2, isKing: false, cost: 6 },
            { id: "shield_pawn", r: 4, c: 1, stars: 3, isKing: false, cost: 6 },
            { id: "knight", r: 5, c: 0, stars: 2, isKing: false, cost: 6 }
        ]
    },
    {
        id: "fortune_heist",
        name: "Đạo Tặc Thần Bài Nổ Hũ",
        roleDesc: "Ném bài phép thuật, farm vàng kinh tế liên tục để out tài nguyên đối thủ",
        traits: ["fortune", "mage", "ranger"],
        mainCarries: ["corsair", "gambler"],
        synergySummary: "3 Đạo Tặc • 2 Xạ Thủ • 2 Pháp Sư",
        difficulty: "Khó (Kinh Tế Lăn Cầu Tuyết)",
        units: [
            { id: "king", r: 6, c: 2, stars: 1, isKing: true, cost: 0 },
            { id: "corsair", r: 6, c: 4, stars: 1, isKing: false, cost: 4 },
            { id: "gambler", r: 5, c: 1, stars: 2, isKing: false, cost: 9 },
            { id: "mercenary", r: 4, c: 3, stars: 2, isKing: false, cost: 3 },
            { id: "juggernaut", r: 4, c: 1, stars: 2, isKing: false, cost: 6 },
            { id: "archer", r: 6, c: 0, stars: 2, isKing: false, cost: 6 }
        ]
    },
    {
        id: "frostfire_storm",
        name: "Băng Hỏa Lưỡng Cực Đột Kích",
        roleDesc: "Kết hợp khống chế Đóng Băng và sát thương Thiêu Đốt nổ lan cực kỳ khó chịu",
        traits: ["frost", "pyro", "cavalry"],
        mainCarries: ["frost_knight", "pyro_bishop"],
        synergySummary: "2 Băng Hệ • 2 Hỏa Hệ • 2 Kỵ Binh",
        difficulty: "Trung Bình (Khống Chế & Cháy)",
        units: [
            { id: "king", r: 6, c: 2, stars: 1, isKing: true, cost: 0 },
            { id: "frost_knight", r: 4, c: 4, stars: 2, isKing: false, cost: 6 },
            { id: "pyro_bishop", r: 5, c: 1, stars: 2, isKing: false, cost: 9 },
            { id: "shield_pawn", r: 4, c: 2, stars: 2, isKing: false, cost: 3 },
            { id: "shield_pawn", r: 4, c: 0, stars: 2, isKing: false, cost: 3 },
            { id: "knight", r: 5, c: 5, stars: 2, isKing: false, cost: 6 }
        ]
    },
    {
        id: "ironclad_colossus",
        name: "Vạn Lý Thiết Giáp Phản Công",
        roleDesc: "Tối đa hóa phòng ngự với 4 Thiết Giáp, đợi đối thủ hết lượt rồi nghiền nát",
        traits: ["vanguard"],
        mainCarries: ["juggernaut", "shield_pawn"],
        synergySummary: "4 Thiết Giáp • Siêu Máu & Giáp",
        difficulty: "Dễ Chơi (Bất Tử Chống Sát Thủ)",
        units: [
            { id: "king", r: 6, c: 2, stars: 1, isKing: true, cost: 0 },
            { id: "juggernaut", r: 4, c: 2, stars: 2, isKing: false, cost: 6 },
            { id: "shield_pawn", r: 4, c: 1, stars: 3, isKing: false, cost: 6 },
            { id: "shield_pawn", r: 4, c: 3, stars: 3, isKing: false, cost: 6 },
            { id: "frost_rook", r: 5, c: 4, stars: 1, isKing: false, cost: 4 },
            { id: "mercenary", r: 5, c: 0, stars: 2, isKing: false, cost: 3 }
        ]
    }
];

// Helper to calculate synergies for an army
function calculateSynergies(units) {
    const counts = {};
    const uniqueIds = new Set();
    for (const u of units) {
        if (!u.id || u.isKing) continue;
        if (uniqueIds.has(u.id)) continue;
        uniqueIds.add(u.id);
        const def = window.CHESS_TFT_DATA.PIECES[u.id];
        if (!def || !def.traits) continue;
        for (const t of def.traits) {
            counts[t] = (counts[t] || 0) + 1;
        }
    }
    const result = {};
    const synDefs = window.CHESS_TFT_DATA.SYNERGIES || {};
    for (const t of Object.keys(counts)) {
        const def = synDefs[t];
        if (!def) continue;
        let activeTier = 0;
        for (const th of def.thresholds) {
            if (counts[t] >= th) activeTier = th;
        }
        if (activeTier > 0) {
            result[t] = { count: counts[t], activeTier };
        }
    }
    return result;
}

// Mirror army to top side of board (enemy side)
function mirrorArmy(units, cols, rows) {
    return units.map(u => ({
        ...u,
        r: (rows - 1) - u.r,
        c: (cols - 1) - u.c,
        uid: `enemy_${u.id}_${(rows - 1) - u.r}_${(cols - 1) - u.c}`,
        items: []
    }));
}

// Run single battle between compA (player) and compB (enemy)
function runMatch(compA, compB, cols = 6, rows = 7, mapId = "stone_fortress") {
    const mapDef = window.CHESS_TFT_DATA.MAPS.find(m => m.id === mapId) || window.CHESS_TFT_DATA.MAPS[0];
    const terrain = mapDef.generateTerrain(cols, rows);

    const playerPieces = compA.units.map(u => ({ ...u, uid: `p_${u.id}_${u.r}_${u.c}`, items: [] }));
    const enemyPieces = mirrorArmy(compB.units, cols, rows);

    const pSyn = calculateSynergies(playerPieces);
    const eSyn = calculateSynergies(compB.units);

    const engine = new BlitzChessEngine({
        cols,
        rows,
        terrain,
        maxTurns: 50,
        playerSynergies: pSyn,
        enemySynergies: eSyn,
        playerAugments: [],
        enemyAugments: []
    });

    engine.setupBoard(playerPieces, enemyPieces);

    let turns = 0;
    while (!engine.gameOver && turns < 50) {
        const currentSide = engine.turn;
        // Bot plays both sides with Grandmaster level intelligence (small blunder chance 0.08)
        const act = engine.chooseBotAction(currentSide, 0.08);
        if (!act) {
            const opp = currentSide === "player" ? "enemy" : "player";
            engine.endMatch(opp, "checkmate", `${currentSide} không còn nước đi hợp lệ!`);
            break;
        }
        engine.executeAction(act);
        turns++;
    }

    if (!engine.gameOver) {
        // Draw by maximum turns - evaluate pieces left
        engine.evaluateCombatEnd();
    }

    return engine.result; // { winner: "player" | "enemy" | "draw", reason, playerPiecesLeft, enemyPiecesLeft }
}

async function simulateTournament(roundsPerPair = 20) {
    console.log(`🚀 BẮT ĐẦU GIẢI ĐẤU MÔ PHỎNG BOT VS BOT (${CANDIDATE_COMPS.length} ĐỘI HÌNH)...`);
    console.log(`Số trận mỗi cặp: ${roundsPerPair * 2} (lượt đi và lượt về đổi bên)`);

    const stats = {};
    for (const c of CANDIDATE_COMPS) {
        stats[c.id] = {
            id: c.id,
            name: c.name,
            roleDesc: c.roleDesc,
            traits: c.traits,
            mainCarries: c.mainCarries,
            synergySummary: c.synergySummary,
            difficulty: c.difficulty,
            units: c.units,
            played: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0,
            headToHead: {} // oppId -> { played, wins, losses }
        };
    }

    const maps = ["stone_fortress", "crystal_river", "inferno_chasm"];
    let totalMatches = 0;

    for (let i = 0; i < CANDIDATE_COMPS.length; i++) {
        for (let j = i + 1; j < CANDIDATE_COMPS.length; j++) {
            const cA = CANDIDATE_COMPS[i];
            const cB = CANDIDATE_COMPS[j];

            if (!stats[cA.id].headToHead[cB.id]) stats[cA.id].headToHead[cB.id] = { played: 0, wins: 0, losses: 0 };
            if (!stats[cB.id].headToHead[cA.id]) stats[cB.id].headToHead[cA.id] = { played: 0, wins: 0, losses: 0 };

            for (let r = 0; r < roundsPerPair; r++) {
                const mapId = maps[r % maps.length];

                // Leg 1: cA as player (white), cB as enemy (black)
                const res1 = runMatch(cA, cB, 6, 7, mapId);
                totalMatches++;
                stats[cA.id].played++;
                stats[cB.id].played++;
                stats[cA.id].headToHead[cB.id].played++;
                stats[cB.id].headToHead[cA.id].played++;

                if (res1.winner === "player") {
                    stats[cA.id].wins++;
                    stats[cB.id].losses++;
                    stats[cA.id].headToHead[cB.id].wins++;
                    stats[cB.id].headToHead[cA.id].losses++;
                } else if (res1.winner === "enemy") {
                    stats[cB.id].wins++;
                    stats[cA.id].losses++;
                    stats[cB.id].headToHead[cA.id].wins++;
                    stats[cA.id].headToHead[cB.id].losses++;
                } else {
                    stats[cA.id].draws++;
                    stats[cB.id].draws++;
                }

                // Leg 2: cB as player (white), cA as enemy (black) - fairness swap!
                const res2 = runMatch(cB, cA, 6, 7, mapId);
                totalMatches++;
                stats[cA.id].played++;
                stats[cB.id].played++;
                stats[cA.id].headToHead[cB.id].played++;
                stats[cB.id].headToHead[cA.id].played++;

                if (res2.winner === "player") {
                    stats[cB.id].wins++;
                    stats[cA.id].losses++;
                    stats[cB.id].headToHead[cA.id].wins++;
                    stats[cA.id].headToHead[cB.id].losses++;
                } else if (res2.winner === "enemy") {
                    stats[cA.id].wins++;
                    stats[cB.id].losses++;
                    stats[cA.id].headToHead[cB.id].wins++;
                    stats[cB.id].headToHead[cA.id].losses++;
                } else {
                    stats[cA.id].draws++;
                    stats[cB.id].draws++;
                }
            }
        }
    }

    // Calculate Win Rates & Assign Tiers
    const compList = Object.values(stats);
    for (const c of compList) {
        c.winRate = Number(((c.wins / c.played) * 100).toFixed(1));
    }

    compList.sort((a, b) => b.winRate - a.winRate);

    // Assign Tiers based on winrate:
    // S Tier: Top 25% (> 58%)
    // A Tier: 48% - 58%
    // B Tier: < 48%
    for (let i = 0; i < compList.length; i++) {
        const c = compList[i];
        if (i <= 1 || c.winRate >= 58) {
            c.tier = "S";
            c.tierBadge = "👑 TIER S (BÁ ĐẠO)";
            c.tierColor = "#f59e0b";
        } else if (c.winRate >= 48) {
            c.tier = "A";
            c.tierBadge = "⭐ TIER A (RẤT MẠNH)";
            c.tierColor = "#38bdf8";
        } else {
            c.tier = "B";
            c.tierBadge = "🔥 TIER B (CÂN BẰNG)";
            c.tierColor = "#a855f7";
        }

        // Find best matchup & hardest matchup
        let bestOpp = null;
        let bestRate = -1;
        let hardOpp = null;
        let hardRate = 101;

        for (const [oppId, h] of Object.entries(c.headToHead)) {
            const oppComp = compList.find(x => x.id === oppId);
            const rate = (h.wins / h.played) * 100;
            if (rate > bestRate) {
                bestRate = rate;
                bestOpp = { name: oppComp.name, rate: Number(rate.toFixed(1)) };
            }
            if (rate < hardRate) {
                hardRate = rate;
                hardOpp = { name: oppComp.name, rate: Number(rate.toFixed(1)) };
            }
        }
        c.counterAgainst = bestOpp ? `Khắc chế: ${bestOpp.name} (${bestOpp.rate}% thắng)` : "";
        c.vulnerableTo = hardOpp ? `Bị khắc chế bởi: ${hardOpp.name} (${(100 - hardOpp.rate).toFixed(1)}% thua)` : "";
    }

    console.log(`\n✅ HOÀN TẤT MÔ PHỎNG ${totalMatches} TRẬN ĐẤU! BẢNG XẾP HẠNG WIN RATE:`);
    console.table(compList.map(c => ({
        Tier: c.tier,
        "Đội Hình": c.name,
        "Số Trận": c.played,
        "Thắng": c.wins,
        "Thua": c.losses,
        "Hòa": c.draws,
        "Tỉ Lệ Thắng": `${c.winRate}%`,
        "Khắc Chế Tốt Nhất": c.counterAgainst
    })));

    // Output formatted file: js/meta-comps-data.js
    const outputJs = `// ============================================================================
// CHESS TFT - GỢI Ý ĐỘI HÌNH META DỰA TRÊN ${totalMatches} TRẬN ĐẤU MÔ PHỎNG BOT 1V1
// Tự động sinh từ công cụ phân tích tỉ lệ thắng (tools/simulate_bot_comps.js)
// ============================================================================

window.CHESS_TFT_META_COMPS = ${JSON.stringify(compList, null, 4)};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CHESS_TFT_META_COMPS;
}
`;

    fs.writeFileSync(path.join(__dirname, '../js/meta-comps-data.js'), outputJs, 'utf8');
    console.log(`\n💾 Đã lưu kết quả dữ liệu gợi ý đội hình vào: js/meta-comps-data.js`);
    return compList;
}

simulateTournament(15);

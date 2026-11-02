// ============================================================================
// CHESS TFT - GỢI Ý ĐỘI HÌNH META DỰA TRÊN 840 TRẬN ĐẤU MÔ PHỎNG BOT 1V1
// Tự động sinh từ công cụ phân tích tỉ lệ thắng (tools/simulate_bot_comps.js)
// ============================================================================

export const META_COMPS = [
    {
        "id": "frost_vanguard",
        "name": "Pháo Đài Băng Tuyết",
        "roleDesc": "Khống chế băng giá kết hợp siêu dàn chắn Thiết Giáp bất tử",
        "traits": [
            "vanguard",
            "frost"
        ],
        "mainCarries": [
            "frost_rook",
            "frost_knight"
        ],
        "synergySummary": "4 Thiết Giáp • 2 Băng Hệ",
        "difficulty": "Dễ Chơi (Toàn Diện)",
        "units": [
            {
                "id": "king",
                "r": 6,
                "c": 2,
                "stars": 1,
                "isKing": true,
                "cost": 0
            },
            {
                "id": "juggernaut",
                "r": 4,
                "c": 2,
                "stars": 2,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "frost_rook",
                "r": 5,
                "c": 0,
                "stars": 2,
                "isKing": false,
                "cost": 8
            },
            {
                "id": "frost_knight",
                "r": 4,
                "c": 4,
                "stars": 2,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "shield_pawn",
                "r": 4,
                "c": 1,
                "stars": 2,
                "isKing": false,
                "cost": 3
            },
            {
                "id": "shield_pawn",
                "r": 4,
                "c": 3,
                "stars": 2,
                "isKing": false,
                "cost": 3
            }
        ],
        "played": 210,
        "wins": 190,
        "losses": 20,
        "draws": 0,
        "winRate": 90.5,
        "headToHead": {
            "cavalry_rush": {
                "played": 30,
                "wins": 15,
                "losses": 15
            },
            "sniper_siege": {
                "played": 30,
                "wins": 29,
                "losses": 1
            },
            "pyro_mage_burn": {
                "played": 30,
                "wins": 30,
                "losses": 0
            },
            "royal_ascendance": {
                "played": 30,
                "wins": 30,
                "losses": 0
            },
            "fortune_heist": {
                "played": 30,
                "wins": 26,
                "losses": 4
            },
            "frostfire_storm": {
                "played": 30,
                "wins": 30,
                "losses": 0
            },
            "ironclad_colossus": {
                "played": 30,
                "wins": 30,
                "losses": 0
            }
        },
        "tier": "S",
        "tierBadge": "👑 TIER S (BÁ ĐẠO)",
        "tierColor": "#f59e0b",
        "counterAgainst": "Khắc chế: Hỏa Pháp Thiêu Đốt Nổ Lan (100% thắng)",
        "vulnerableTo": "Bị khắc chế bởi: Kỵ Binh Đột Kích Thần Tốc (50.0% thua)"
    },
    {
        "id": "cavalry_rush",
        "name": "Kỵ Binh Đột Kích Thần Tốc",
        "roleDesc": "Đột kích nhảy chữ L vượt địa hình, áp sát bắt chết Vua và Carry hàng sau",
        "traits": [
            "cavalry",
            "royal"
        ],
        "mainCarries": [
            "chancellor",
            "knight"
        ],
        "synergySummary": "3 Kỵ Binh • 2 Hoàng Gia • 2 Thiết Giáp",
        "difficulty": "Trung Bình (Cơ Động)",
        "units": [
            {
                "id": "king",
                "r": 6,
                "c": 1,
                "stars": 1,
                "isKing": true,
                "cost": 0
            },
            {
                "id": "chancellor",
                "r": 5,
                "c": 2,
                "stars": 1,
                "isKing": false,
                "cost": 5
            },
            {
                "id": "knight",
                "r": 4,
                "c": 0,
                "stars": 2,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "frost_knight",
                "r": 4,
                "c": 5,
                "stars": 2,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "mercenary",
                "r": 5,
                "c": 4,
                "stars": 2,
                "isKing": false,
                "cost": 3
            },
            {
                "id": "shield_pawn",
                "r": 4,
                "c": 2,
                "stars": 2,
                "isKing": false,
                "cost": 3
            }
        ],
        "played": 210,
        "wins": 142,
        "losses": 66,
        "draws": 2,
        "winRate": 67.6,
        "headToHead": {
            "frost_vanguard": {
                "played": 30,
                "wins": 15,
                "losses": 15
            },
            "sniper_siege": {
                "played": 30,
                "wins": 22,
                "losses": 8
            },
            "pyro_mage_burn": {
                "played": 30,
                "wins": 18,
                "losses": 11
            },
            "royal_ascendance": {
                "played": 30,
                "wins": 18,
                "losses": 11
            },
            "fortune_heist": {
                "played": 30,
                "wins": 30,
                "losses": 0
            },
            "frostfire_storm": {
                "played": 30,
                "wins": 27,
                "losses": 3
            },
            "ironclad_colossus": {
                "played": 30,
                "wins": 12,
                "losses": 18
            }
        },
        "tier": "S",
        "tierBadge": "👑 TIER S (BÁ ĐẠO)",
        "tierColor": "#f59e0b",
        "counterAgainst": "Khắc chế: Đạo Tặc Thần Bài Nổ Hũ (100% thắng)",
        "vulnerableTo": "Bị khắc chế bởi: Vạn Lý Thiết Giáp Phản Công (60.0% thua)"
    },
    {
        "id": "ironclad_colossus",
        "name": "Vạn Lý Thiết Giáp Phản Công",
        "roleDesc": "Tối đa hóa phòng ngự với 4 Thiết Giáp, đợi đối thủ hết lượt rồi nghiền nát",
        "traits": [
            "vanguard"
        ],
        "mainCarries": [
            "juggernaut",
            "shield_pawn"
        ],
        "synergySummary": "4 Thiết Giáp • Siêu Máu & Giáp",
        "difficulty": "Dễ Chơi (Bất Tử Chống Sát Thủ)",
        "units": [
            {
                "id": "king",
                "r": 6,
                "c": 2,
                "stars": 1,
                "isKing": true,
                "cost": 0
            },
            {
                "id": "juggernaut",
                "r": 4,
                "c": 2,
                "stars": 2,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "shield_pawn",
                "r": 4,
                "c": 1,
                "stars": 3,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "shield_pawn",
                "r": 4,
                "c": 3,
                "stars": 3,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "frost_rook",
                "r": 5,
                "c": 4,
                "stars": 1,
                "isKing": false,
                "cost": 4
            },
            {
                "id": "mercenary",
                "r": 5,
                "c": 0,
                "stars": 2,
                "isKing": false,
                "cost": 3
            }
        ],
        "played": 210,
        "wins": 137,
        "losses": 71,
        "draws": 2,
        "winRate": 65.2,
        "headToHead": {
            "frost_vanguard": {
                "played": 30,
                "wins": 0,
                "losses": 30
            },
            "cavalry_rush": {
                "played": 30,
                "wins": 18,
                "losses": 12
            },
            "sniper_siege": {
                "played": 30,
                "wins": 26,
                "losses": 4
            },
            "pyro_mage_burn": {
                "played": 30,
                "wins": 19,
                "losses": 10
            },
            "royal_ascendance": {
                "played": 30,
                "wins": 25,
                "losses": 5
            },
            "fortune_heist": {
                "played": 30,
                "wins": 20,
                "losses": 9
            },
            "frostfire_storm": {
                "played": 30,
                "wins": 29,
                "losses": 1
            }
        },
        "tier": "S",
        "tierBadge": "👑 TIER S (BÁ ĐẠO)",
        "tierColor": "#f59e0b",
        "counterAgainst": "Khắc chế: Băng Hỏa Lưỡng Cực Đột Kích (96.7% thắng)",
        "vulnerableTo": "Bị khắc chế bởi: Pháo Đài Băng Tuyết (100.0% thua)"
    },
    {
        "id": "pyro_mage_burn",
        "name": "Hỏa Pháp Thiêu Đốt Nổ Lan",
        "roleDesc": "Phép thuật trừ thẳng 2 lớp máu, gây thiêu đốt nổ lan phá tan đội hình trâu bò",
        "traits": [
            "pyro",
            "mage"
        ],
        "mainCarries": [
            "pyro_bishop",
            "fire_mage"
        ],
        "synergySummary": "2 Hỏa Hệ • 2 Pháp Sư • 2 Thiết Giáp",
        "difficulty": "Trung Bình (Khắc Chế Tank)",
        "units": [
            {
                "id": "king",
                "r": 6,
                "c": 2,
                "stars": 1,
                "isKing": true,
                "cost": 0
            },
            {
                "id": "pyro_bishop",
                "r": 5,
                "c": 4,
                "stars": 2,
                "isKing": false,
                "cost": 9
            },
            {
                "id": "fire_mage",
                "r": 5,
                "c": 1,
                "stars": 2,
                "isKing": false,
                "cost": 3
            },
            {
                "id": "juggernaut",
                "r": 4,
                "c": 2,
                "stars": 2,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "shield_pawn",
                "r": 4,
                "c": 0,
                "stars": 2,
                "isKing": false,
                "cost": 3
            },
            {
                "id": "shield_pawn",
                "r": 4,
                "c": 3,
                "stars": 2,
                "isKing": false,
                "cost": 3
            }
        ],
        "played": 210,
        "wins": 114,
        "losses": 92,
        "draws": 4,
        "winRate": 54.3,
        "headToHead": {
            "frost_vanguard": {
                "played": 30,
                "wins": 0,
                "losses": 30
            },
            "cavalry_rush": {
                "played": 30,
                "wins": 11,
                "losses": 18
            },
            "sniper_siege": {
                "played": 30,
                "wins": 28,
                "losses": 2
            },
            "royal_ascendance": {
                "played": 30,
                "wins": 28,
                "losses": 2
            },
            "fortune_heist": {
                "played": 30,
                "wins": 15,
                "losses": 13
            },
            "frostfire_storm": {
                "played": 30,
                "wins": 22,
                "losses": 8
            },
            "ironclad_colossus": {
                "played": 30,
                "wins": 10,
                "losses": 19
            }
        },
        "tier": "A",
        "tierBadge": "⭐ TIER A (RẤT MẠNH)",
        "tierColor": "#38bdf8",
        "counterAgainst": "Khắc chế: Công Thành Xạ Thủ Tầm Xa (93.3% thắng)",
        "vulnerableTo": "Bị khắc chế bởi: Pháo Đài Băng Tuyết (100.0% thua)"
    },
    {
        "id": "royal_ascendance",
        "name": "Vương Triều Hậu Tối Thượng",
        "roleDesc": "Nữ Hoàng cơ động toàn bản đồ kết hợp bảo vệ Vua với giáp Hoàng Gia",
        "traits": [
            "royal",
            "mage",
            "vanguard"
        ],
        "mainCarries": [
            "grand_queen",
            "shield_pawn"
        ],
        "synergySummary": "2 Hoàng Gia • 2 Pháp Sư • 2 Thiết Giáp",
        "difficulty": "Dễ Chơi (Sức mạnh 5 Vàng)",
        "units": [
            {
                "id": "king",
                "r": 6,
                "c": 2,
                "stars": 1,
                "isKing": true,
                "cost": 0
            },
            {
                "id": "grand_queen",
                "r": 5,
                "c": 3,
                "stars": 1,
                "isKing": false,
                "cost": 5
            },
            {
                "id": "juggernaut",
                "r": 4,
                "c": 2,
                "stars": 2,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "shield_pawn",
                "r": 4,
                "c": 1,
                "stars": 3,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "knight",
                "r": 5,
                "c": 0,
                "stars": 2,
                "isKing": false,
                "cost": 6
            }
        ],
        "played": 210,
        "wins": 85,
        "losses": 120,
        "draws": 5,
        "winRate": 40.5,
        "headToHead": {
            "frost_vanguard": {
                "played": 30,
                "wins": 0,
                "losses": 30
            },
            "cavalry_rush": {
                "played": 30,
                "wins": 11,
                "losses": 18
            },
            "sniper_siege": {
                "played": 30,
                "wins": 23,
                "losses": 7
            },
            "pyro_mage_burn": {
                "played": 30,
                "wins": 2,
                "losses": 28
            },
            "fortune_heist": {
                "played": 30,
                "wins": 24,
                "losses": 5
            },
            "frostfire_storm": {
                "played": 30,
                "wins": 20,
                "losses": 7
            },
            "ironclad_colossus": {
                "played": 30,
                "wins": 5,
                "losses": 25
            }
        },
        "tier": "B",
        "tierBadge": "🔥 TIER B (CÂN BẰNG)",
        "tierColor": "#a855f7",
        "counterAgainst": "Khắc chế: Đạo Tặc Thần Bài Nổ Hũ (80% thắng)",
        "vulnerableTo": "Bị khắc chế bởi: Pháo Đài Băng Tuyết (100.0% thua)"
    },
    {
        "id": "fortune_heist",
        "name": "Đạo Tặc Thần Bài Nổ Hũ",
        "roleDesc": "Ném bài phép thuật, farm vàng kinh tế liên tục để out tài nguyên đối thủ",
        "traits": [
            "fortune",
            "mage",
            "ranger"
        ],
        "mainCarries": [
            "corsair",
            "gambler"
        ],
        "synergySummary": "3 Đạo Tặc • 2 Xạ Thủ • 2 Pháp Sư",
        "difficulty": "Khó (Kinh Tế Lăn Cầu Tuyết)",
        "units": [
            {
                "id": "king",
                "r": 6,
                "c": 2,
                "stars": 1,
                "isKing": true,
                "cost": 0
            },
            {
                "id": "corsair",
                "r": 6,
                "c": 4,
                "stars": 1,
                "isKing": false,
                "cost": 4
            },
            {
                "id": "gambler",
                "r": 5,
                "c": 1,
                "stars": 2,
                "isKing": false,
                "cost": 9
            },
            {
                "id": "mercenary",
                "r": 4,
                "c": 3,
                "stars": 2,
                "isKing": false,
                "cost": 3
            },
            {
                "id": "juggernaut",
                "r": 4,
                "c": 1,
                "stars": 2,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "archer",
                "r": 6,
                "c": 0,
                "stars": 2,
                "isKing": false,
                "cost": 6
            }
        ],
        "played": 210,
        "wins": 55,
        "losses": 146,
        "draws": 9,
        "winRate": 26.2,
        "headToHead": {
            "frost_vanguard": {
                "played": 30,
                "wins": 4,
                "losses": 26
            },
            "cavalry_rush": {
                "played": 30,
                "wins": 0,
                "losses": 30
            },
            "sniper_siege": {
                "played": 30,
                "wins": 10,
                "losses": 19
            },
            "pyro_mage_burn": {
                "played": 30,
                "wins": 13,
                "losses": 15
            },
            "royal_ascendance": {
                "played": 30,
                "wins": 5,
                "losses": 24
            },
            "frostfire_storm": {
                "played": 30,
                "wins": 14,
                "losses": 12
            },
            "ironclad_colossus": {
                "played": 30,
                "wins": 9,
                "losses": 20
            }
        },
        "tier": "B",
        "tierBadge": "🔥 TIER B (CÂN BẰNG)",
        "tierColor": "#a855f7",
        "counterAgainst": "Khắc chế: Băng Hỏa Lưỡng Cực Đột Kích (46.7% thắng)",
        "vulnerableTo": "Bị khắc chế bởi: Kỵ Binh Đột Kích Thần Tốc (100.0% thua)"
    },
    {
        "id": "sniper_siege",
        "name": "Công Thành Xạ Thủ Tầm Xa",
        "roleDesc": "Pháo đại bác bắn xuyên tường cùng cung thủ tỉa Vua từ xa an toàn",
        "traits": [
            "ranger",
            "pyro",
            "vanguard"
        ],
        "mainCarries": [
            "cannon",
            "archer"
        ],
        "synergySummary": "2 Xạ Thủ • 2 Hỏa Hệ • 2 Thiết Giáp",
        "difficulty": "Khó (Cần xếp góc)",
        "units": [
            {
                "id": "king",
                "r": 6,
                "c": 3,
                "stars": 1,
                "isKing": true,
                "cost": 0
            },
            {
                "id": "cannon",
                "r": 6,
                "c": 1,
                "stars": 1,
                "isKing": false,
                "cost": 4
            },
            {
                "id": "archer",
                "r": 6,
                "c": 5,
                "stars": 2,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "juggernaut",
                "r": 4,
                "c": 2,
                "stars": 2,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "shield_pawn",
                "r": 5,
                "c": 1,
                "stars": 2,
                "isKing": false,
                "cost": 3
            },
            {
                "id": "shield_pawn",
                "r": 4,
                "c": 4,
                "stars": 2,
                "isKing": false,
                "cost": 3
            }
        ],
        "played": 210,
        "wins": 52,
        "losses": 156,
        "draws": 2,
        "winRate": 24.8,
        "headToHead": {
            "frost_vanguard": {
                "played": 30,
                "wins": 1,
                "losses": 29
            },
            "cavalry_rush": {
                "played": 30,
                "wins": 8,
                "losses": 22
            },
            "pyro_mage_burn": {
                "played": 30,
                "wins": 2,
                "losses": 28
            },
            "royal_ascendance": {
                "played": 30,
                "wins": 7,
                "losses": 23
            },
            "fortune_heist": {
                "played": 30,
                "wins": 19,
                "losses": 10
            },
            "frostfire_storm": {
                "played": 30,
                "wins": 11,
                "losses": 18
            },
            "ironclad_colossus": {
                "played": 30,
                "wins": 4,
                "losses": 26
            }
        },
        "tier": "B",
        "tierBadge": "🔥 TIER B (CÂN BẰNG)",
        "tierColor": "#a855f7",
        "counterAgainst": "Khắc chế: Đạo Tặc Thần Bài Nổ Hũ (63.3% thắng)",
        "vulnerableTo": "Bị khắc chế bởi: Pháo Đài Băng Tuyết (96.7% thua)"
    },
    {
        "id": "frostfire_storm",
        "name": "Băng Hỏa Lưỡng Cực Đột Kích",
        "roleDesc": "Kết hợp khống chế Đóng Băng và sát thương Thiêu Đốt nổ lan cực kỳ khó chịu",
        "traits": [
            "frost",
            "pyro",
            "cavalry"
        ],
        "mainCarries": [
            "frost_knight",
            "pyro_bishop"
        ],
        "synergySummary": "2 Băng Hệ • 2 Hỏa Hệ • 2 Kỵ Binh",
        "difficulty": "Trung Bình (Khống Chế & Cháy)",
        "units": [
            {
                "id": "king",
                "r": 6,
                "c": 2,
                "stars": 1,
                "isKing": true,
                "cost": 0
            },
            {
                "id": "frost_knight",
                "r": 4,
                "c": 4,
                "stars": 2,
                "isKing": false,
                "cost": 6
            },
            {
                "id": "pyro_bishop",
                "r": 5,
                "c": 1,
                "stars": 2,
                "isKing": false,
                "cost": 9
            },
            {
                "id": "shield_pawn",
                "r": 4,
                "c": 2,
                "stars": 2,
                "isKing": false,
                "cost": 3
            },
            {
                "id": "shield_pawn",
                "r": 4,
                "c": 0,
                "stars": 2,
                "isKing": false,
                "cost": 3
            },
            {
                "id": "knight",
                "r": 5,
                "c": 5,
                "stars": 2,
                "isKing": false,
                "cost": 6
            }
        ],
        "played": 210,
        "wins": 49,
        "losses": 153,
        "draws": 8,
        "winRate": 23.3,
        "headToHead": {
            "frost_vanguard": {
                "played": 30,
                "wins": 0,
                "losses": 30
            },
            "cavalry_rush": {
                "played": 30,
                "wins": 3,
                "losses": 27
            },
            "sniper_siege": {
                "played": 30,
                "wins": 18,
                "losses": 11
            },
            "pyro_mage_burn": {
                "played": 30,
                "wins": 8,
                "losses": 22
            },
            "royal_ascendance": {
                "played": 30,
                "wins": 7,
                "losses": 20
            },
            "fortune_heist": {
                "played": 30,
                "wins": 12,
                "losses": 14
            },
            "ironclad_colossus": {
                "played": 30,
                "wins": 1,
                "losses": 29
            }
        },
        "tier": "B",
        "tierBadge": "🔥 TIER B (CÂN BẰNG)",
        "tierColor": "#a855f7",
        "counterAgainst": "Khắc chế: Công Thành Xạ Thủ Tầm Xa (60% thắng)",
        "vulnerableTo": "Bị khắc chế bởi: Pháo Đài Băng Tuyết (100.0% thua)"
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CHESS_TFT_META_COMPS;
}

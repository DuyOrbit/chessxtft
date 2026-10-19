// ============================================================================
// CHESS TFT - DATA DEFINITIONS (PIECES, SYNERGIES, MAPS, ITEMS, AUGMENTS)
// ============================================================================

window.CHESS_TFT_DATA = {
    // 1. STAGE BOARD SIZES (Fast Early -> Medium Mid -> Standard 8x8 Late)
    STAGE_CONFIG: {
        1: { cols: 5, rows: 6, deployRows: 2, blitzTime: 32, increment: 2, maxTurns: 35, label: "Mini 5x6 (Đầu Game - 32s)" },
        2: { cols: 6, rows: 7, deployRows: 2, blitzTime: 45, increment: 3, maxTurns: 45, label: "Vừa 6x7 (Giữa Game - 45s)" },
        3: { cols: 8, rows: 8, deployRows: 3, blitzTime: 60, increment: 3, maxTurns: 55, label: "Chuẩn 8x8 (Cuối Game - 60s)" }
    },

    // 1b. TFT STAGE ROUND PROGRESSION FORMAT (TFT Style Stage-Round)
    STAGE_ROUNDS_FORMAT: {
        1: [
            { round: 1, type: "combat", icon: "⚔️", label: "Vòng 1-1" },
            { round: 2, type: "augment", icon: "🔮", label: "Lõi 1-2" },
            { round: 3, type: "combat", icon: "⚔️", label: "Vòng 1-3" }
        ],
        2: [
            { round: 1, type: "combat", icon: "⚔️", label: "Vòng 2-1" },
            { round: 2, type: "combat", icon: "⚔️", label: "Vòng 2-2" },
            { round: 3, type: "augment", icon: "🔮", label: "Lõi 2-3" },
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
            { round: 2, type: "combat", icon: "⚔️", label: "Vòng 4-2" },
            { round: 3, type: "combat", icon: "⚔️", label: "Vòng 4-3" },
            { round: 4, type: "carousel", icon: "👑", label: "Đi Chợ 4-4" },
            { round: 5, type: "combat", icon: "💀", label: "Quyết Đấu 4-5" }
        ]
    },

    COMBAT_RULES: {
        turnOneGrace: true,
        rangedReloadTurns: 1,
        stunImmunityTurns: 1,
        burnExplosionAoeDamage: 1,
        cavalryBonusVsRangerKing: 1
    },

    ECONOMY_RULES: {
        defaultStartingHp: 100,
        defaultStartingGold: 6,
        defaultStartingLevel: 3,
        baseRoundGold: 5,
        maxInterest: 5,
        rerollCost: 2,
        xpCost: 4,
        xpGainPerBuy: 4,
        passiveRoundXp: 2
    },

    DAMAGE_FORMULA: {
        checkmateBase: 8,
        checkmateStageMult: 2,
        checkmatePerUnit: 2,
        kingCaptureBase: 3,
        kingCaptureStageMult: 1,
        drawBase: 4
    },

    // XP required to level up (Level 3 -> 8)
    LEVEL_XP: {
        3: 2,
        4: 6,
        5: 10,
        6: 20,
        7: 32,
        8: 999
    },

    // Shop tier odds by Player Level [Tier1, Tier2, Tier3, Tier4, Tier5]
    SHOP_ODDS: {
        3: [70, 25, 5, 0, 0],
        4: [50, 35, 15, 0, 0],
        5: [35, 38, 22, 5, 0],
        6: [24, 35, 28, 12, 1],
        7: [18, 27, 32, 18, 5],
        8: [12, 20, 30, 25, 13]
    },

    // 2. SYNERGIES (TỘC / HỆ)
    SYNERGIES: {
        vanguard: {
            id: "vanguard",
            name: "Thiết Giáp",
            icon: "🛡️",
            color: "#60a5fa",
            thresholds: [2, 4],
            desc: "Quân Thiết Giáp nhận thêm Lớp Máu (Giáp) khởi đầu trận đấu.",
            effectText: {
                2: "+1 Lớp Máu cho Thiết Giáp",
                4: "+2 Lớp Máu cho Thiết Giáp & Vua nhận +1 Lớp Máu"
            }
        },
        ranger: {
            id: "ranger",
            name: "Xạ Thủ",
            icon: "🏹",
            color: "#34d399",
            thresholds: [2, 3],
            desc: "Các quân Xạ Thủ được tăng tầm bắn xa mà không cần di chuyển vào ô địch.",
            effectText: {
                2: "+1 Ô tầm bắn xa cho Xạ Thủ",
                3: "+1 Ô tầm bắn & Bắn xuyên Tường Đá"
            }
        },
        pyro: {
            id: "pyro",
            name: "Hỏa Hệ",
            icon: "🔥",
            color: "#f97316",
            thresholds: [2, 3],
            desc: "Đòn đánh của quân Hỏa Hệ gây Thiêu Đốt (đếm ngược tự chết sau vài lượt).",
            effectText: {
                2: "Thiêu đốt 3 lượt khi tấn công",
                3: "Thiêu đốt 2 lượt (nổ cực nhanh!)"
            }
        },
        frost: {
            id: "frost",
            name: "Băng Hệ",
            icon: "❄️",
            color: "#38bdf8",
            thresholds: [2],
            desc: "Khi quân Băng Hệ di chuyển đến đứng cạnh kẻ địch, làm Choáng (đóng băng 1 lượt) 1 kẻ địch cạnh bên (mỗi quân 1 lần/trận).",
            effectText: {
                2: "Làm Choáng 1 lượt khi áp sát"
            }
        },
        cavalry: {
            id: "cavalry",
            name: "Kỵ Binh",
            icon: "🐎",
            color: "#eab308",
            thresholds: [2, 3],
            desc: "Kỵ Binh không bị làm chậm bởi Sông. Khi hạ gục 1 quân địch sẽ hồi thời gian đồng hồ Blitz và nhận thêm Giáp.",
            effectText: {
                2: "Miễn nhiễm Sông & +3s đồng hồ khi hạ gục",
                3: "Miễn nhiễm Sông, +4s đồng hồ & +1 Lớp Máu khi hạ gục"
            }
        },
        mage: {
            id: "mage",
            name: "Pháp Sư",
            icon: "🔮",
            color: "#c084fc",
            thresholds: [2, 3],
            desc: "Đòn tấn công của Pháp Sư phá thêm Lớp Máu (Giáp) của các quân trâu bò.",
            effectText: {
                2: "Đòn đánh Pháp Sư trừ 2 Lớp Máu cùng lúc",
                3: "Đòn đánh Pháp Sư trừ 3 Lớp Máu & +1 tầm phép"
            }
        },
        royal: {
            id: "royal",
            name: "Hoàng Gia",
            icon: "👑",
            color: "#fbbf24",
            thresholds: [2],
            desc: "Bảo vệ Vua tối đa và tăng sát thương trừ máu Linh Hồn đối thủ khi thắng.",
            effectText: {
                2: "Vua nhận +1 Lớp Giáp Bảo Hộ & +4 Sát thương Linh Hồn khi thắng"
            }
        },
        fortune: {
            id: "fortune",
            name: "Đạo Tặc (Nổ Hũ)",
            icon: "🎰",
            color: "#f43f5e",
            thresholds: [3],
            desc: "Tích trữ điểm thưởng trong Rương May Mắn khi thua chuỗi liên tiếp. Giành 1 trận thắng để NỔ HŨ nhận Vàng, Trang bị hoặc Quân Cờ 5 vàng!",
            effectText: {
                3: "Thua tích điểm thưởng theo chuỗi. Thắng mở Rương NỔ HŨ cực khủng!"
            }
        }
    },

    // 3. CHESS PIECES (QUÂN CỜ)
    PIECES: {
        king: {
            id: "king",
            name: "Quốc Vương",
            icon: "♔",
            enemyIcon: "♚",
            cost: 0,
            isKing: true,
            traits: ["royal"],
            moveType: "king",
            attackType: "melee",
            baseHp: [1, 2, 3],
            range: [1, 1, 1],
            desc: "Đi 1 ô mọi hướng. Mất Vua hoặc bị Chiếu Hết sẽ thua ngay lập tức!"
        },
        shield_pawn: {
            id: "shield_pawn",
            name: "Tốt Khiên",
            icon: "♙",
            badge: "🛡️",
            cost: 1,
            traits: ["vanguard"],
            moveType: "pawn",
            attackType: "melee",
            baseHp: [2, 3, 5],
            range: [1, 1, 1],
            desc: "Đi thẳng 1 ô, ăn chéo 1 ô. Có sẵn nhiều Lớp Máu. Đi tới hàng cuối sẽ Phong Cấp thành Hậu!"
        },
        mercenary: {
            id: "mercenary",
            name: "Lính Đánh Thuê",
            icon: "⚔️",
            badge: "🪙",
            cost: 1,
            traits: ["cavalry", "fortune"],
            moveType: "king",
            attackType: "melee",
            baseHp: [1, 2, 3],
            range: [1, 1, 1],
            desc: "Đi và chém 1 ô mọi hướng (8 hướng). Mỗi khi tiêu diệt kẻ địch sẽ rơi ra +1 Vàng!"
        },
        fire_mage: {
            id: "fire_mage",
            name: "Phù Thủy Lửa",
            icon: "🔥",
            badge: "🔮",
            cost: 1,
            traits: ["pyro", "mage"],
            moveType: "step_ortho",
            attackType: "ranged_ortho",
            baseHp: [1, 2, 3],
            range: [2, 2, 3],
            desc: "Đi 1 ô ngang/dọc. Bắn cầu lửa tầm xa 2 ô ngang/dọc (không cần bước vào) và gây Thiêu Đốt!"
        },
        archer: {
            id: "archer",
            name: "Cung Thủ",
            icon: "🏹",
            badge: "🎯",
            cost: 2,
            traits: ["ranger"],
            moveType: "king",
            attackType: "ranged_any",
            baseHp: [1, 2, 3],
            range: [2, 3, 4],
            desc: "Đi 1 ô mọi hướng. Bắn tên từ xa 2-4 ô theo đường thẳng/chéo mà không cần di chuyển vào ô địch!"
        },
        knight: {
            id: "knight",
            name: "Mã Đột Kích",
            icon: "♘",
            badge: "⚡",
            cost: 2,
            traits: ["cavalry"],
            moveType: "knight",
            attackType: "melee",
            baseHp: [1, 2, 4],
            range: [1, 1, 1],
            desc: "Nhảy chữ L vượt qua mọi Tường Đá, Sông và quân cờ khác để tập kích hàng sau."
        },
        frost_knight: {
            id: "frost_knight",
            name: "Kỵ Sĩ Băng",
            icon: "🧊",
            badge: "♘",
            cost: 2,
            traits: ["frost", "cavalry"],
            moveType: "knight",
            attackType: "melee",
            baseHp: [2, 3, 4],
            range: [1, 1, 1],
            desc: "Nhảy chữ L và có 2 Lớp Máu. Khi nhảy đến cạnh kẻ địch sẽ kích hoạt Băng Hệ làm Choáng!"
        },
        pyro_bishop: {
            id: "pyro_bishop",
            name: "Tượng Hỏa Pháp",
            icon: "♗",
            badge: "🔥",
            cost: 3,
            traits: ["pyro", "mage"],
            moveType: "bishop",
            attackType: "ranged_diag_or_slide",
            baseHp: [1, 2, 4],
            range: [2, 3, 4],
            desc: "Đi chéo không giới hạn. Có thể chưởng lửa từ xa 2 ô chéo gây Thiêu Đốt (tự chết sau 3 lượt)."
        },
        juggernaut: {
            id: "juggernaut",
            name: "Thiết Giáp Khổng Lồ",
            icon: "🗿",
            badge: "🛡️",
            cost: 3,
            traits: ["vanguard"],
            moveType: "rook_short",
            attackType: "melee",
            baseHp: [3, 4, 7],
            range: [2, 2, 3],
            desc: "Đi ngang/dọc tối đa 2 ô. Pháo đài di động: phải bị đối phương ăn 3-7 lần mới gục ngã!"
        },
        cannon: {
            id: "cannon",
            name: "Pháo Công Thành",
            icon: "💣",
            badge: "💥",
            cost: 4,
            traits: ["ranger", "pyro"],
            moveType: "cannon",
            attackType: "cannon_ranged",
            baseHp: [2, 3, 5],
            range: [8, 8, 8],
            desc: "Đi ngang/dọc như Xe. Bắn đại bác từ xa qua ĐÚNG 1 quân cản (hoặc Tường Đá) để nổ tung mục tiêu phía sau!"
        },
        frost_rook: {
            id: "frost_rook",
            name: "Xe Băng Giá",
            icon: "♖",
            badge: "❄️",
            cost: 4,
            traits: ["vanguard", "frost"],
            moveType: "rook",
            attackType: "melee",
            baseHp: [2, 4, 6],
            range: [8, 8, 8],
            desc: "Đi ngang/dọc không giới hạn. Khi dừng lại sẽ làm Choáng (đóng băng 1 lượt) kẻ địch đứng cạnh."
        },
        grand_queen: {
            id: "grand_queen",
            name: "Hậu Tối Thượng",
            icon: "♕",
            badge: "👑",
            cost: 5,
            traits: ["royal", "mage"],
            moveType: "queen",
            attackType: "queen_hybrid",
            baseHp: [2, 4, 8],
            range: [2, 3, 4],
            desc: "Đi ngang/dọc/chéo toàn bản đồ HOẶC bắn tia năng lượng tầm xa 2-3 ô mà không cần di chuyển!"
        },
        chancellor: {
            id: "chancellor",
            name: "Đại Thừa Tướng",
            icon: "🐉",
            badge: "👑",
            cost: 5,
            traits: ["royal", "cavalry", "vanguard"],
            moveType: "chancellor",
            attackType: "melee",
            baseHp: [3, 5, 9],
            range: [8, 8, 8],
            desc: "Kết hợp bước đi của cả XE + MÃ! Vừa càn quét đường thẳng vừa nhảy chữ L qua mọi địa hình."
        },
        gambler: {
            id: "gambler",
            name: "Con Bạc Gian Lận",
            icon: "🃏",
            badge: "🎲",
            cost: 3,
            traits: ["fortune", "mage"],
            moveType: "step_ortho",
            attackType: "ranged_ortho",
            baseHp: [1, 2, 4],
            range: [2, 3, 4],
            desc: "Ném bài phép tầm xa 2-3 ô. Khi tiêu diệt kẻ địch có 50% cơ hội ném thêm xúc xắc rơi +2 Vàng!"
        },
        corsair: {
            id: "corsair",
            name: "Thuyền Trưởng Hải Tặc",
            icon: "🏴‍☠️",
            badge: "🦜",
            cost: 4,
            traits: ["fortune", "ranger"],
            moveType: "king",
            attackType: "ranged_any",
            baseHp: [2, 3, 6],
            range: [2, 3, 4],
            desc: "Bắn súng hỏa mai từ xa 2-3 ô. Thủ lĩnh băng Đạo Tặc dẫn dắt cả đội tích lũy Rương Nổ Hũ khủng khiếp!"
        }
    },

    // 4. MAPS & CUSTOM TERRAINS (Cân bằng cho nhịp độ nhanh ở mọi kích thước bàn cờ)
    MAPS: [
        {
            id: "classic",
            name: "Đấu Trường Tốc Chiến",
            desc: "Mặt sân thông thoáng với 2 Ô Cường Hóa ở trung tâm giúp tăng tầm đánh và tốc độ nhập cuộc.",
            themeColor: "#334155",
            generateTerrain: function(cols, rows) {
                const grid = {};
                const midR = Math.floor(rows / 2);
                const c1 = Math.floor(cols / 2) - 1;
                const c2 = Math.ceil(cols / 2);
                grid[`${midR - 1},${c1}`] = "rune";
                grid[`${midR},${c2}`] = "rune";
                return grid;
            }
        },
        {
            id: "river_crossing",
            name: "Thung Lũng Sông Băng",
            desc: "Dòng sông cắt ngang giữa bàn cờ. Quân bộ binh bước xuống Sông bị Làm Chậm (nghỉ 1 lượt), hai bên cánh có Cầu Đá đi thường.",
            themeColor: "#0284c7",
            generateTerrain: function(cols, rows) {
                const grid = {};
                const midR = Math.floor(rows / 2);
                for (let c = 0; c < cols; c++) {
                    // Leave bridges on left and right edges for fast flanking
                    if (c === 0 || c === cols - 1) continue;
                    grid[`${midR},${c}`] = "river";
                    if (rows >= 7 && c === Math.floor(cols / 2)) {
                        grid[`${midR - 1},${c}`] = "river";
                    }
                }
                return grid;
            }
        },
        {
            id: "stone_fortress",
            name: "Pháo Đài Đá Cổ",
            desc: "Các khối Tường Đá chặn đường đi và tầm bắn thẳng. Quân Mã, Pháo hoặc Giày Tốc Biến có thể nhảy xuyên qua!",
            themeColor: "#64748b",
            generateTerrain: function(cols, rows) {
                const grid = {};
                const midR = Math.floor(rows / 2);
                if (cols <= 5) {
                    grid[`${midR},1`] = "wall";
                    grid[`${midR - 1},3`] = "wall";
                } else if (cols === 6) {
                    grid[`${midR},1`] = "wall";
                    grid[`${midR},4`] = "wall";
                } else {
                    grid[`${midR - 1},2`] = "wall";
                    grid[`${midR},5`] = "wall";
                    grid[`${midR},3`] = "rune";
                    grid[`${midR - 1},4`] = "rune";
                }
                return grid;
            }
        },
        {
            id: "lava_rift",
            name: "Hỏa Ngục Dung Nham",
            desc: "Ô Dung Nham ở giữa sân sẽ gây Thiêu Đốt (tự chết sau 3 lượt) cho bất kỳ quân cờ nào đứng lên nó!",
            themeColor: "#dc2626",
            generateTerrain: function(cols, rows) {
                const grid = {};
                const midR = Math.floor(rows / 2);
                const midC = Math.floor(cols / 2);
                grid[`${midR},${midC}`] = "lava";
                if (cols >= 6) {
                    grid[`${midR - 1},${midC - 1}`] = "lava";
                    grid[`${midR},${ 0 }`] = "rune";
                    grid[`${midR - 1},${cols - 1}`] = "rune";
                }
                return grid;
            }
        }
    ],

    // 5. ITEMS (TRANG BỊ)
    ITEMS: {
        stun_hammer: {
            id: "stun_hammer",
            name: "Búa Chấn Động",
            icon: "🔨",
            desc: "Khi quân mang đồ này di chuyển đến đứng cạnh kẻ địch, làm CHOÁNG (khóa di chuyển 1 lượt) kẻ địch đó!"
        },
        burn_cloak: {
            id: "burn_cloak",
            name: "Áo Choàng Lửa",
            icon: "🔥",
            desc: "Đòn đánh hoặc đứng cạnh kẻ địch lúc kết thúc lượt sẽ gây THIÊU ĐỐT (đếm ngược 3 lượt rồi tự nổ chết)!"
        },
        iron_armor: {
            id: "iron_armor",
            name: "Giáp Vĩnh Cửu",
            icon: "🛡️",
            desc: "Tăng thêm +2 Lớp Máu (phải bị đối phương ăn thêm 2 lần nữa mới chết)."
        },
        sniper_scope: {
            id: "sniper_scope",
            name: "Ống Nhòm Xạ Thủ",
            icon: "🔭",
            desc: "Cho phép quân cận chiến chém từ xa 2 ô mà không cần bước vào ô địch; hoặc +1 tầm bắn cho quân đánh xa."
        },
        phase_boots: {
            id: "phase_boots",
            name: "Giày Tốc Biến",
            icon: "👢",
            desc: "Đi qua Sông không bị chậm, miễn nhiễm Dung Nham và có thể nhảy qua Tường Đá / Quân cờ cản đường!"
        }
    },

    // 6. AUGMENTS (LÕI CÔNG NGHỆ)
    AUGMENTS: [
        {
            id: "aug_fortress",
            name: "Thành Trì Bất Diệt",
            icon: "🏰",
            desc: "Vua và toàn bộ quân Thiết Giáp của bạn nhận thêm +1 Lớp Máu mỗi ván đấu."
        },
        {
            id: "aug_pyromania",
            name: "Hỏa Cuồng Nộ",
            icon: "🌋",
            desc: "Hiệu ứng Thiêu Đốt của đội bạn kích hoạt nổ nhanh hơn 1 lượt (chỉ cần 2 lượt là tự chết!). Nhận 1 Phù Thủy Lửa."
        },
        {
            id: "aug_blitz_master",
            name: "Kiện Tướng Cờ Chớp",
            icon: "⚡",
            desc: "Đồng hồ của bạn được +12 giây mỗi ván, đồng hồ đối thủ bị -4 giây! Nhận ngay 4 Vàng."
        },
        {
            id: "aug_rich_get_richer",
            name: "Quỹ Đầu Tư Hoàng Gia",
            icon: "💰",
            desc: "Nhận ngay 10 Vàng. Lãi suất tối đa mỗi vòng tăng từ 5 lên 7 Vàng."
        },
        {
            id: "aug_tactical_expansion",
            name: "Mở Rộng Quân Đoàn",
            icon: "🎖️",
            desc: "Đội hình của bạn được đặt thêm +1 Quân Cờ lên bàn cờ (vượt giới hạn Cấp Độ)!"
        },
        {
            id: "aug_item_grab_bag",
            name: "Túi Đồ Thần Bí",
            icon: "🎁",
            desc: "Nhận ngay 1 Búa Chấn Động (Choáng) và 1 Áo Choàng Lửa (Thiêu Đốt) vào kho trang bị!"
        }
    ],

    // 7. BOT PROFILES (7 AI OPPONENTS FOR 8-PLAYER LOBBY)
    BOT_NAMES: [
        { name: "Magnus Bot", avatar: "🧙‍♂️", style: "Tấn Công Chớp Nhoáng", favTrait: "cavalry" },
        { name: "Hikaru AI", avatar: "🦊", style: "Siêu Cờ Chớp", favTrait: "ranger" },
        { name: "Kasparov Thủ Thành", avatar: "🦁", style: "Pháo Đài Thiết Giáp", favTrait: "vanguard" },
        { name: "Hỏa Vương Bot", avatar: "🐲", style: "Thiêu Đốt Tầm Xa", favTrait: "pyro" },
        { name: "Nữ Hoàng Băng", avatar: "❄️", style: "Đóng Băng Khống Chế", favTrait: "frost" },
        { name: "Pháo Thủ Điên", avatar: "💣", style: "Đại Bác Công Thành", favTrait: "ranger" },
        { name: "Đế Chế Hoàng Gia", avatar: "👑", style: "Nuôi Quân 5 Vàng", favTrait: "royal" }
    ]
};

window.applyDatabaseConfigToRuntime = function(rules, entities) {
    if (rules) {
        if (rules.STAGE_CONFIG) window.CHESS_TFT_DATA.STAGE_CONFIG = rules.STAGE_CONFIG;
        if (rules.combatRules) window.CHESS_TFT_DATA.COMBAT_RULES = { ...window.CHESS_TFT_DATA.COMBAT_RULES, ...rules.combatRules };
        if (rules.economy) window.CHESS_TFT_DATA.ECONOMY_RULES = { ...window.CHESS_TFT_DATA.ECONOMY_RULES, ...rules.economy };
        if (rules.damageFormula) window.CHESS_TFT_DATA.DAMAGE_FORMULA = { ...window.CHESS_TFT_DATA.DAMAGE_FORMULA, ...rules.damageFormula };
    }
    if (entities) {
        if (entities.LEVEL_XP) window.CHESS_TFT_DATA.LEVEL_XP = entities.LEVEL_XP;
        if (entities.SHOP_ODDS) window.CHESS_TFT_DATA.SHOP_ODDS = entities.SHOP_ODDS;
        if (entities.SYNERGIES) window.CHESS_TFT_DATA.SYNERGIES = entities.SYNERGIES;
        if (entities.PIECES) window.CHESS_TFT_DATA.PIECES = entities.PIECES;
        if (entities.ITEMS) window.CHESS_TFT_DATA.ITEMS = entities.ITEMS;
        if (entities.AUGMENTS) window.CHESS_TFT_DATA.AUGMENTS = entities.AUGMENTS;
        if (entities.BOT_NAMES) window.CHESS_TFT_DATA.BOT_NAMES = entities.BOT_NAMES;
    }
};


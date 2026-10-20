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
    },

    // 1c. PVE CREEP ENCOUNTERS (STAGE 1 QUÁI KHỞI ĐẦU)
    PVE_ENCOUNTERS: {
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
            desc: "Đi 1 ô mọi hướng. Mất Vua hoặc bị Chiếu Hết sẽ thua ngay lập tức!",
            guide: {
                role: "Trái Tim Vương Quốc (Tối Thượng)",
                recommendedPos: "Hàng sau cùng, kẹp giữa các quân Tanker",
                moveRule: "Di chuyển 1 ô bất kỳ hướng nào (8 hướng xung quanh).",
                attackRule: "Chém cận chiến 1 ô.",
                skillRule: "Vua bị bắt hoặc bị Chiếu Hết (Checkmate) là THUA NGAY VÁN ĐẤU! Giữ Vua sống sót đến cuối trận là ưu tiên số 1.",
                tips: "Xếp Vua ở góc an toàn hoặc sau lưng Tốt Khiên / Thiết Giáp. Tránh để hở cột dọc hoặc đường chéo để không bị Xe và Tượng địch nhắm vào."
            }
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
            desc: "Đi thẳng 1 ô, ăn chéo 1 ô. Có sẵn nhiều Lớp Máu. Đi tới hàng cuối sẽ Phong Cấp thành Hậu!",
            guide: {
                role: "Đỡ Đòn Hàng Đầu & Phong Cấp Lật Kèo",
                recommendedPos: "Hàng 1 (Tiền tuyến phía trước)",
                moveRule: "Đi thẳng 1 ô về phía trước. Nếu tiến tới hàng cuối cùng bàn cờ đối thủ, Tốt sẽ tự động PHONG CẤP THÀNH HẬU!",
                attackRule: "Ăn chéo 1 ô phía trước (cận chiến).",
                skillRule: "Sở hữu tới 2-5 Lớp Máu trâu bò. Kích hoạt Thiết Giáp nhận thêm Giáp ảo khởi đầu trận đấu.",
                tips: "Quân 1 vàng cực kỳ hiệu quả đầu game. Đặt làm lá chắn hút sát thương cho Cung Thủ và Phù Thủy phía sau bắn tỉa."
            }
        },
        stone_minion: {
            id: "stone_minion",
            name: "Tượng Quái Đá",
            icon: "🗿",
            enemyIcon: "🗿",
            badge: "👾",
            cost: 1,
            traits: ["vanguard"],
            moveType: "pawn",
            attackType: "melee",
            baseHp: [1, 2, 3],
            range: [1, 1, 1],
            desc: "Tượng quái đá lính canh ải PVE Stage 1. Rơi trang bị và vàng khi bị tiêu diệt.",
            guide: {
                role: "Quái Khởi Đầu PVE",
                recommendedPos: "Hàng tiền tuyến",
                moveRule: "Tiến lên 1 ô về phía trước.",
                attackRule: "Ăn chéo 1 ô cận chiến.",
                skillRule: "Khi bị hạ gục rơi ra Vàng hoặc Mảnh Trang Bị khởi đầu.",
                tips: "Dàn cờ đánh bại quái để thu thập trang bị đầu trận."
            }
        },
        stone_golem: {
            id: "stone_golem",
            name: "Khổng Lồ Đá Tĩnh",
            icon: "🪨",
            enemyIcon: "🪨",
            badge: "👑",
            cost: 2,
            isKing: true,
            traits: ["vanguard"],
            moveType: "king",
            attackType: "melee",
            baseHp: [2, 3, 5],
            range: [1, 1, 1],
            desc: "Thủ lĩnh quái đá cổ đại ở các ải PVE. Hạ gục rơi ra trang bị quý và vàng.",
            guide: {
                role: "Thủ Lĩnh Quái PVE",
                recommendedPos: "Trung tâm hàng phòng ngự",
                moveRule: "Di chuyển 1 ô mọi hướng.",
                attackRule: "Cận chiến 1 ô.",
                skillRule: "Đóng vai trò Trùm Quái ải PVE. Tiêu diệt mang lại tài nguyên lớn.",
                tips: "Tập trung hỏa lực hạ gục thủ lĩnh đá."
            }
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
            desc: "Đi và chém 1 ô mọi hướng (8 hướng). Mỗi khi tiêu diệt kẻ địch sẽ rơi ra +1 Vàng!",
            guide: {
                role: "Chiến Binh Kinh Tế (Farm Tiền)",
                recommendedPos: "Hàng 2 hoặc hai bên cánh",
                moveRule: "Đi và chém 1 ô mọi hướng (8 hướng).",
                attackRule: "Cận chiến 1 ô.",
                skillRule: "Mỗi khi tiêu diệt 1 quân cờ đối thủ, rơi ra ngay +1 Vàng kinh tế! Giúp kích hoạt mốc Đạo Tặc nổ hũ.",
                tips: "Đầu game xếp đứng sau Tanker để vét mạng kẻ địch ít máu, giúp bạn tích lũy lượng tiền khổng lồ để lên cấp sớm."
            }
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
            desc: "Đi 1 ô ngang/dọc. Bắn cầu lửa tầm xa 2 ô ngang/dọc (không cần bước vào) và gây Thiêu Đốt!",
            guide: {
                role: "Pháp Sư Bắn Tầm Xa & Thiêu Đốt Nổ Lan",
                recommendedPos: "Hàng 2 hoặc hàng 3 (Tuyến giữa)",
                moveRule: "Đi 1 ô theo chiều ngang hoặc dọc.",
                attackRule: "Bắn cầu lửa tầm xa 2 ô ngang/dọc mà không cần bước vào ô địch. Gây hiệu ứng Thiêu Đốt!",
                skillRule: "Kẻ bị Thiêu Đốt đếm ngược 3 lượt sẽ TỰ NỔ CHẾT và gây cháy lan -1 Lớp Máu ra 8 ô xung quanh. Đòn đánh Pháp Sư trừ thẳng 2 Lớp Máu.",
                tips: "Rất mạnh để khắc chế các quân trâu bò như Thiết Giáp Khổng Lồ và Tốt Khiên. Bắn từ xa mà không sợ bị phản công."
            }
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
            desc: "Đi 1 ô mọi hướng. Bắn tên từ xa 2-4 ô theo đường thẳng/chéo mà không cần di chuyển vào ô địch!",
            guide: {
                role: "Xạ Thủ Sát Thương Chủ Lực (Carry)",
                recommendedPos: "Góc sau cùng bàn cờ (Hàng 3 hoặc 4)",
                moveRule: "Đi 1 ô mọi hướng.",
                attackRule: "Bắn tên tầm xa từ 2 đến 4 ô (ngang, dọc, chéo) mà không cần di chuyển vào ô địch. Sau khi bắn sẽ cần Nạp Đạn 1 lượt (⏳).",
                skillRule: "Tầm bắn xa nhất trong các tướng đầu game, có thể bắn tỉa Vua đối phương từ nửa sân bên này.",
                tips: "Bảo kê Cung Thủ thật kỹ bằng hàng rào Tanker. Trang bị khuyên dùng: Kiếm Vô Cực, Cung Phong Ấn."
            }
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
            desc: "Nhảy chữ L vượt qua mọi Tường Đá, Sông và quân cờ khác để tập kích hàng sau.",
            guide: {
                role: "Sát Thủ Tập Kích Hàng Sau (Bắt Vua/Carry)",
                recommendedPos: "Hai cánh bàn cờ (Cột biên)",
                moveRule: "Nhảy chữ L (2 ô thẳng + 1 ô ngang). VƯỢT ĐỊA HÌNH: Nhảy qua đầu mọi quân cờ khác, nhảy qua cả Tường Đá và Sông!",
                attackRule: "Cận chiến trực tiếp vào ô đáp xuống.",
                skillRule: "Hệ Kỵ Binh gây thêm +1 sát thương phá Giáp lên Xạ Thủ và Vua địch! Tiêu diệt địch hồi thêm giây đồng hồ Blitz.",
                tips: "Quan sát vị trí Cung Thủ hoặc Vua đối phương, xếp Mã thẳng góc nhảy để ám sát ngay từ lượt đầu."
            }
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
            desc: "Nhảy chữ L và có 2 Lớp Máu. Khi nhảy đến cạnh kẻ địch sẽ kích hoạt Băng Hệ làm Choáng!",
            guide: {
                role: "Đột Kích Khống Chế & Đóng Băng",
                recommendedPos: "Hai cánh tiền tuyến",
                moveRule: "Nhảy chữ L vượt mọi vật cản và địa hình.",
                attackRule: "Cận chiến vào ô đáp xuống.",
                skillRule: "Sở hữu 2 Lớp Máu. Khi nhảy đến đứng cạnh kẻ địch sẽ làm Choáng (đóng băng 1 lượt) kẻ địch bên cạnh!",
                tips: "Dùng để nhảy áp sát chủ lực đối phương, làm đối thủ bị đóng băng mất lượt đi không thể bắn trả."
            }
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
            desc: "Đi chéo không giới hạn. Có thể chưởng lửa từ xa 2 ô chéo gây Thiêu Đốt (tự chết sau 3 lượt).",
            guide: {
                role: "Pháp Sư Cơ Động Toàn Sân & Chưởng Lửa Chéo",
                recommendedPos: "Đường chéo thông thoáng, không bị quân cản",
                moveRule: "Trượt chéo toàn bản đồ không giới hạn cự ly (nếu đường đi không bị cản).",
                attackRule: "Trượt chém chéo HOẶC phóng hỏa cầu tầm xa 2 ô chéo gây Thiêu Đốt.",
                skillRule: "Đòn đánh phá nhiều Lớp Máu cùng lúc. Tự do chuyển đổi giữa trượt cơ động và chưởng lửa từ xa.",
                tips: "Chú ý màu ô của Tượng (ô sáng hoặc ô tối). Đặt ở góc chéo thoáng để kiểm soát toàn bộ khu vực trung tâm."
            }
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
            desc: "Đi ngang/dọc tối đa 2 ô. Pháo đài di động: phải bị đối phương ăn 3-7 lần mới gục ngã!",
            guide: {
                role: "Siêu Pháo Đài Bất Tử (Main Tanker)",
                recommendedPos: "Chính giữa hàng 1 (Trung tâm phòng tuyến)",
                moveRule: "Đi ngang hoặc dọc tối đa 2 ô.",
                attackRule: "Cận chiến 2 ô.",
                skillRule: "Sở hữu lượng máu khủng khiếp: 3 đến 7 Lớp Máu! Đối phương phải tấn công đủ 3-7 lần mới hạ gục được.",
                tips: "Quân chắn đường số 1 của game. Đặt ngay trước mặt Vua để biến khu vực phòng thủ thành bức tường thép bất khả xâm phạm."
            }
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
            desc: "Đi ngang/dọc như Xe. Bắn đại bác từ xa qua ĐÚNG 1 quân cản (hoặc Tường Đá) để nổ tung mục tiêu phía sau!",
            guide: {
                role: "Đại Bác Xuyên Hàng Rào (Bắn Nhảy Cóc)",
                recommendedPos: "Hàng sau, đứng sau lưng 1 quân đồng minh hoặc Tường Đá",
                moveRule: "Đi ngang hoặc dọc như Xe cờ vua khi không tấn công.",
                attackRule: "Bắn đại bác tầm xa xuyên qua ĐÚNG 1 quân cản (hoặc Tường Đá) để nổ tung mục tiêu phía sau!",
                skillRule: "Bắn từ xa toàn bản đồ không cần di chuyển, chuyên tiêu diệt những kẻ địch ẩn nấp sau lưng Tanker.",
                tips: "Luôn đặt 1 quân Tốt Khiên phía trước Pháo để làm ngòi nổ bắn thẳng đại bác vào Vua đối thủ."
            }
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
            desc: "Đi ngang/dọc không giới hạn. Khi dừng lại sẽ làm Choáng (đóng băng 1 lượt) kẻ địch đứng cạnh.",
            guide: {
                role: "Chiến Xa Càn Quét & Đóng Băng Diện Rộng",
                recommendedPos: "Cột dọc hoặc hàng ngang thông thoáng",
                moveRule: "Lao thẳng ngang hoặc dọc toàn bàn cờ không giới hạn khoảng cách (như Xe Cờ Vua).",
                attackRule: "Càn quét cận chiến cực mạnh, có 2-6 Lớp Máu.",
                skillRule: "Khi dừng lại cạnh kẻ địch, phát ra luồng khí lạnh làm Choáng (đóng băng 1 lượt) kẻ địch bên cạnh!",
                tips: "Ở các vòng cuối bàn cờ mở rộng 8x8, Xe Băng Giá là hung thần có thể lao thẳng từ đầu sân sang bắt Vua đối thủ."
            }
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
            desc: "Đi ngang/dọc/chéo toàn bản đồ HOẶC bắn tia năng lượng tầm xa 2-3 ô mà không cần di chuyển!",
            guide: {
                role: "Nữ Hoàng Tối Thượng (Super Carry Toàn Năng)",
                recommendedPos: "Hàng 2 trung tâm, cơ động di chuyển",
                moveRule: "Toàn năng! Đi ngang, dọc, chéo toàn bản đồ không giới hạn cự ly.",
                attackRule: "Cận chiến càn quét HOẶC bắn tia năng lượng ma thuật tầm xa 2-3 ô mà không cần di chuyển!",
                skillRule: "Quân cờ bá đạo nhất trong Cờ Vua và Chess TFT. Kết hợp di chuyển không giới hạn và bắn phép tầm xa.",
                tips: "Tốt Phong Cấp lên Hậu hoặc mua được Hậu ở cấp 7-8 là chìa khóa giành chiến thắng Top 1."
            }
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
            desc: "Kết hợp bước đi của cả XE + MÃ! Vừa càn quét đường thẳng vừa nhảy chữ L qua mọi địa hình.",
            guide: {
                role: "Thần Tướng Bá Vương (Xe + Mã Kết Hợp)",
                recommendedPos: "Vị trí trung tâm linh hoạt",
                moveRule: "Sở hữu sức mạnh kết hợp của cả XE và MÃ: Vừa trượt ngang dọc vô tận vừa nhảy chữ L qua mọi chướng ngại vật!",
                attackRule: "Cận chiến càn quét với lượng máu khổng lồ (3-9 Lớp Máu).",
                skillRule: "Kích hoạt cùng lúc 3 Tộc Hệ đỉnh cao: Hoàng Gia, Kỵ Binh, Thiết Giáp.",
                tips: "Quân 5 vàng 1 cân 4 ở giai đoạn cuối trận. Không một địa hình hay hàng rào nào có thể cản được Đại Thừa Tướng."
            }
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
            desc: "Ném bài phép tầm xa 2-3 ô. Khi tiêu diệt kẻ địch có 50% cơ hội ném thêm xúc xắc rơi +2 Vàng!",
            guide: {
                role: "Pháp Sư Xả Bài & Lắc Xí Ngầu Kiếm Vàng",
                recommendedPos: "Hàng 2 hoặc 3 (Sau Tanker)",
                moveRule: "Đi 1 ô ngang hoặc dọc.",
                attackRule: "Ném bài phép thuật tầm xa 2-3 ô.",
                skillRule: "Khi hạ gục 1 mục tiêu, có 50% tỉ lệ lắc xúc xắc may mắn rơi ra ngay +2 Vàng!",
                tips: "Chủ lực phép thuật quan trọng của đội hình Đạo Tặc. Cho Con Bạc ăn mạng để nhận thêm vô số vàng tích lũy."
            }
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
            desc: "Bắn súng hỏa mai từ xa 2-3 ô. Thủ lĩnh băng Đạo Tặc dẫn dắt cả đội tích lũy Rương Nổ Hũ khủng khiếp!",
            guide: {
                role: "Thủ Lĩnh Nổ Hũ & Xạ Thủ Súng Hỏa Mai",
                recommendedPos: "Hàng sau (Backline an toàn)",
                moveRule: "Đi 1 ô mọi hướng.",
                attackRule: "Bắn súng hỏa mai từ xa 2-3 ô.",
                skillRule: "Kích hoạt mốc 3 Đạo Tặc (Nổ Hũ lớn): Chuỗi thua càng dài rương càng phình to, khi giành 1 chiến thắng sẽ NỔ HŨ nhận trang bị và tướng 5 vàng!",
                tips: "Carry xả sát thương chủ lực của đội hình Đạo Tặc. Cho mang trang bị tăng tầm đánh và tốc đánh."
            }
        },
        stone_minion: {
            id: "stone_minion",
            name: "Quái Đá Tiền Tuyến",
            icon: "🗿",
            enemyIcon: "🗿",
            cost: 1,
            isKing: false,
            traits: ["vanguard"],
            moveType: "king",
            attackType: "melee",
            baseHp: [1, 2, 3],
            range: [1, 1, 1],
            desc: "Lính canh đá tĩnh canh gác cửa thành. Di chuyển 1 ô mọi hướng và tấn công cận chiến.",
            guide: {
                role: "Quái PVE Khởi Đầu",
                recommendedPos: "Tiền tuyến quái vật",
                moveRule: "Di chuyển 1 ô mọi hướng.",
                attackRule: "Tấn công cận chiến 1 ô."
            }
        },
        stone_golem: {
            id: "stone_golem",
            name: "Thủ Lĩnh Quái Đá",
            icon: "🪨",
            enemyIcon: "🪨",
            cost: 2,
            isKing: true,
            traits: ["vanguard"],
            moveType: "king",
            attackType: "melee",
            baseHp: [2, 3, 5],
            range: [1, 1, 1],
            desc: "Thủ lĩnh quái đá cổ đại PVE. Tiêu diệt để mở rương phần thưởng Vàng và Mảnh Trang Bị khởi đầu!",
            guide: {
                role: "Thủ Lĩnh Quái PVE",
                recommendedPos: "Trung tâm đội hình quái",
                moveRule: "Di chuyển 1 ô mọi hướng.",
                attackRule: "Tấn công cận chiến uy lực."
            }
        },
        target_dummy: {
            id: "target_dummy",
            name: "Hình Nhân Tập Đánh",
            icon: "🎯",
            enemyIcon: "🎯",
            cost: 0,
            isKing: false,
            traits: ["vanguard"],
            moveType: "none",
            attackType: "melee",
            baseHp: [10, 25, 50],
            range: [1, 1, 1],
            desc: "Hình nhân bia đỡ đạn tĩnh dùng trong Phòng Tập, có lượng máu khổng lồ (10-50 máu) để thử nghiệm sát thương và tộc hệ.",
            guide: {
                role: "Hình Nhân Đo Sát Thương",
                recommendedPos: "Tùy ý",
                moveRule: "Đứng yên, không di chuyển.",
                attackRule: "Không tấn công."
            }
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
        if (entities.SYNERGIES) window.CHESS_TFT_DATA.SYNERGIES = { ...window.CHESS_TFT_DATA.SYNERGIES, ...entities.SYNERGIES };
        if (entities.PIECES) window.CHESS_TFT_DATA.PIECES = { ...window.CHESS_TFT_DATA.PIECES, ...entities.PIECES };
        if (entities.ITEMS) window.CHESS_TFT_DATA.ITEMS = { ...window.CHESS_TFT_DATA.ITEMS, ...entities.ITEMS };
        if (entities.AUGMENTS) window.CHESS_TFT_DATA.AUGMENTS = entities.AUGMENTS;
        if (entities.BOT_NAMES) window.CHESS_TFT_DATA.BOT_NAMES = entities.BOT_NAMES;
    }
};


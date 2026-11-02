// ============================================================================
// CHESS TFT - CHESS PIECES DEFINITIONS
// ============================================================================

export const PIECES = Object.freeze({
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
});

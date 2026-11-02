// ============================================================================
// CHESS TFT - TRAITS & SYNERGIES DATA
// ============================================================================

export const TRAITS = Object.freeze({
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
});

// Alias for backwards compatibility
export const SYNERGIES = TRAITS;

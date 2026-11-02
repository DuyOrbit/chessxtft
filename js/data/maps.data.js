// ============================================================================
// CHESS TFT - MAPS & TERRAIN DEFINITIONS
// ============================================================================

export const MAPS = Object.freeze([
    {
        id: "classic",
        name: "Đấu Trường Tốc Chiến",
        desc: "Mặt sân thông thoáng với 2 Ô Cường Hóa đối xứng ở trung tâm giúp tăng tầm đánh và tốc độ nhập cuộc.",
        themeColor: "#334155",
        generateTerrain: function(cols, rows) {
            const grid = {};
            function addSym(r, c, type) {
                grid[`${r},${c}`] = type;
                grid[`${rows - 1 - r},${cols - 1 - c}`] = type;
            }
            const isEven = (rows % 2 === 0);
            if (isEven) {
                const rTop = (rows / 2) - 1;
                const cLeft = Math.max(1, Math.floor(cols / 3));
                addSym(rTop, cLeft, "rune");
            } else {
                const midR = Math.floor(rows / 2);
                const cLeft = Math.max(1, Math.floor(cols / 3));
                grid[`${midR},${cLeft}`] = "rune";
                grid[`${midR},${cols - 1 - cLeft}`] = "rune";
            }
            return grid;
        }
    },
    {
        id: "river_crossing",
        name: "Thung Lũng Sông Băng",
        desc: "Dòng sông cắt ngang giữa sân đối xứng hoàn hảo. Bộ binh bước xuống Sông bị Làm Chậm, hai bên cánh có Cầu Đá thông thoáng.",
        themeColor: "#0284c7",
        generateTerrain: function(cols, rows) {
            const grid = {};
            function addSym(r, c, type) {
                grid[`${r},${c}`] = type;
                grid[`${rows - 1 - r},${cols - 1 - c}`] = type;
            }
            const isEven = (rows % 2 === 0);
            if (isEven) {
                const r1 = (rows / 2) - 1;
                for (let c = 1; c < cols - 1; c++) {
                    addSym(r1, c, "river");
                }
            } else {
                const midR = Math.floor(rows / 2);
                for (let c = 1; c < cols - 1; c++) {
                    grid[`${midR},${c}`] = "river";
                }
            }
            return grid;
        }
    },
    {
        id: "stone_fortress",
        name: "Pháo Đài Đá Cổ",
        desc: "Các khối Tường Đá đối xứng chia cắt đường bắn thẳng. Quân Mã, Pháo hoặc Giày Tốc Biến có thể nhảy xuyên qua!",
        themeColor: "#64748b",
        generateTerrain: function(cols, rows) {
            const grid = {};
            function addSym(r, c, type) {
                grid[`${r},${c}`] = type;
                grid[`${rows - 1 - r},${cols - 1 - c}`] = type;
            }
            const isEven = (rows % 2 === 0);
            if (isEven) {
                const rTop = (rows / 2) - 1;
                const cLeft = 1;
                addSym(rTop, cLeft, "wall");
                if (cols >= 6) {
                    addSym(rTop, cols - 2, "wall");
                }
            } else {
                const midR = Math.floor(rows / 2);
                const cLeft = 1;
                grid[`${midR},${cLeft}`] = "wall";
                if (cols >= 6) {
                    grid[`${midR},${cols - 1 - cLeft}`] = "wall";
                }
            }
            return grid;
        }
    },
    {
        id: "lava_rift",
        name: "Hỏa Ngục Dung Nham",
        desc: "Các ô Dung Nham đối xứng ở trung tâm gây Thiêu Đốt (tự chết sau 3 lượt) cho bất kỳ quân cờ nào đứng lên nó!",
        themeColor: "#dc2626",
        generateTerrain: function(cols, rows) {
            const grid = {};
            function addSym(r, c, type) {
                grid[`${r},${c}`] = type;
                grid[`${rows - 1 - r},${cols - 1 - c}`] = type;
            }
            const isEven = (rows % 2 === 0);
            if (isEven) {
                const rTop = (rows / 2) - 1;
                const midC = Math.floor(cols / 2);
                addSym(rTop, midC, "lava");
                if (cols >= 6) {
                    addSym(rTop, 0, "rune");
                }
            } else {
                const midR = Math.floor(rows / 2);
                const midC = Math.floor(cols / 2);
                grid[`${midR},${midC}`] = "lava";
                grid[`${midR},${cols - 1 - midC}`] = "lava";
                if (cols >= 6) {
                    grid[`${midR},0`] = "rune";
                    grid[`${midR},${cols - 1}`] = "rune";
                }
            }
            return grid;
        }
    },
    {
        id: "labyrinth_rocks",
        name: "Mê Cung Đá Tảng",
        desc: "Các khối Đá Cổ đối xứng tâm 180° công bằng tuyệt đối. Quân Mã nhảy qua đá và Xạ Thủ bắn tỉa qua khe đá là chìa khóa chiến thắng!",
        themeColor: "#475569",
        generateTerrain: function(cols, rows) {
            const grid = {};
            function addSym(r, c, type) {
                grid[`${r},${c}`] = type;
                grid[`${rows - 1 - r},${cols - 1 - c}`] = type;
            }
            const isEven = (rows % 2 === 0);
            if (isEven) {
                const rTop = (rows / 2) - 1;
                addSym(rTop, 1, "wall");
                if (cols >= 6) {
                    addSym(rTop, cols - 2, "wall");
                }
            } else {
                const midR = Math.floor(rows / 2);
                grid[`${midR},0`] = "wall";
                grid[`${midR},2`] = "wall";
                if (cols >= 6) {
                    grid[`${midR},${cols - 1 - 2}`] = "wall";
                    grid[`${midR},${cols - 1}`] = "wall";
                }
            }
            return grid;
        }
    }
]);

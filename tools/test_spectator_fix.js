const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const qaDir = path.join(__dirname, "..", "qa_screenshots");
if (!fs.existsSync(qaDir)) fs.mkdirSync(qaDir, { recursive: true });

(async () => {
    console.log("🚀 Bắt đầu test luồng Khán Giả xem 2 Bot Cờ Chớp 30 Vàng...");
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message, err.stack));
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // 1. Đăng nhập
    console.log("🔑 Đăng nhập admin...");
    await page.fill("#login-username", "admin");
    await page.fill("#login-password", "123");
    await page.click("#form-login button[type='submit']");
    await page.waitForTimeout(800);

    // 2. Chuyển sang tab Phòng Riêng
    console.log("🏠 Vào tab Phòng Riêng...");
    await page.click("#nav-item-rooms");
    await page.waitForTimeout(500);

    // 3. Chọn thể thức Cờ Chớp 1v1
    await page.selectOption("#select-room-gamemode", "skirmish_1v1");
    await page.waitForTimeout(300);

    // 4. Bấm Tạo Phòng Khán Giả
    console.log("🎙️ Bấm Tạo Phòng Khán Giả...");
    await page.click("#btn-create-spectator-room");
    await page.waitForTimeout(1000);

    // 5. Kiểm tra giao diện phòng chờ
    const isWaitingRoom = await page.evaluate(() => {
        const waiting = document.getElementById("lobby-view-waiting");
        return waiting && !waiting.classList.contains("hidden");
    });
    console.log("📋 Ở màn hình phòng chờ:", isWaitingRoom);

    // 6. Bấm Lấp Đầy Bằng Bot
    console.log("🤖 Lấp đầy bằng Bot...");
    await page.click("#btn-fill-all-bots");
    await page.waitForTimeout(800);

    // 7. Kiểm tra text của nút Bắt Đầu
    const startBtnText = await page.evaluate(() => {
        const btn = document.getElementById("btn-host-start-match");
        return btn ? btn.textContent.trim() : "";
    });
    console.log("🔘 Text nút Bắt Đầu hiện tại:", startBtnText);

    // Chụp ảnh phòng chờ
    const shotLobby = path.join(qaDir, "test_spectator_waiting_room.png");
    await page.screenshot({ path: shotLobby });
    console.log("📸 Đã lưu ảnh sảnh chờ:", shotLobby);

    // 8. Bấm Bắt Đầu Trận Đấu
    console.log("▶️ Bấm Bắt Đầu Trận Đấu...");
    await page.click("#btn-host-start-match");
    await page.waitForTimeout(2500);

    // 9. Kiểm tra xem đã vào đúng trận Cờ Chớp Khán Giả chưa
    const battleState = await page.evaluate(() => {
        const modeBadge = document.getElementById("game-mode-badge");
        const specBar = document.getElementById("skirmish-spec-control-bar");
        const h2h = document.getElementById("banner-1v1-headtohead");
        const board = document.getElementById("chess-board");
        const coach = document.getElementById("tutorial-coach-overlay");
        const sandboxBtn = document.getElementById("btn-sandbox-panel-toggle");
        const p1Name = document.getElementById("h2h-p1-name");
        const p2Name = document.getElementById("h2h-p2-name");

        return {
            modeBadgeText: modeBadge ? modeBadge.textContent.trim() : "",
            specBarVisible: specBar && !specBar.classList.contains("hidden"),
            h2hVisible: h2h && !h2h.classList.contains("hidden"),
            p1Name: p1Name ? p1Name.textContent.trim() : "",
            p2Name: p2Name ? p2Name.textContent.trim() : "",
            coachHidden: !coach || coach.classList.contains("hidden"),
            sandboxBtnHidden: !sandboxBtn || sandboxBtn.classList.contains("hidden"),
            cellsCount: board ? board.querySelectorAll(".board-cell").length : 0
        };
    });
    console.log("⚔️ Trạng thái trận đấu:", JSON.stringify(battleState, null, 2));

    // Đợi thêm 3s để xem Bot tự đi nước cờ
    await page.waitForTimeout(3000);

    const wallPositions = await page.evaluate(() => {
        const walls = Array.from(document.querySelectorAll("#chess-board .terrain-wall"));
        return walls.map(w => ({
            r: w.getAttribute("data-row"),
            c: w.getAttribute("data-col"),
            classes: w.className
        }));
    });
    console.log("🧱 Tọa độ các khối tường đá:", JSON.stringify(wallPositions));

    const boardMetrics = await page.evaluate(() => {
        const board = document.getElementById("chess-board");
        const bRect = board.getBoundingClientRect();
        const rows = [];
        for (let r = 0; r < 7; r++) {
            const cell = board.querySelector(`.board-cell[data-row="${r}"][data-col="0"]`);
            if (cell) {
                const cRect = cell.getBoundingClientRect();
                rows.push({
                    r,
                    top: Math.round(cRect.top - bRect.top),
                    bottom: Math.round(cRect.bottom - bRect.top),
                    height: Math.round(cRect.height),
                    visible: (cRect.bottom <= bRect.bottom + 2)
                });
            }
        }
        return {
            boardW: Math.round(bRect.width),
            boardH: Math.round(bRect.height),
            clientHeight: board.clientHeight,
            scrollHeight: board.scrollHeight,
            rows
        };
    });
    console.log("📏 Kích thước bàn cờ & 7 hàng:", JSON.stringify(boardMetrics, null, 2));

    const movesCount = await page.evaluate(() => {
        return window.app?.chess ? window.app.chess.turnCount : 0;
    });
    console.log("♟️ Số nước đi 2 Bot đã tự thực hiện:", movesCount);

    // Chụp ảnh trận đấu Cờ Chớp của 2 Bot
    const shotBattle = path.join(qaDir, "test_spectator_battle_screen.png");
    await page.screenshot({ path: shotBattle });
    console.log("📸 Đã lưu ảnh trận đấu:", shotBattle);

    await browser.close();
    console.log("✅ Hoàn tất kiểm thử tự động!");
})();

const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const qaDir = path.join(__dirname, "..", "qa_screenshots");
const artifactsDir = path.join(__dirname, "..", "artifacts");

(async () => {
    console.log("⚔️ Bắt đầu kiểm thử đối đầu 2 người chơi thật (2 Human Accounts PvP)...");
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    const report = {
        login: {},
        matchmaking: {},
        inGameSync: {},
        terrainCheck: {},
        errors: []
    };

    // Create 2 separate contexts (Player 1 & Player 2)
    const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    // 1. LOGIN BOTH PLAYERS
    console.log("🔑 Đăng nhập Tài khoản 1: admin...");
    await p1.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await p1.waitForTimeout(500);
    const p1Auth = await p1.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
    if (p1Auth) {
        await p1.fill("#login-username", "admin");
        await p1.fill("#login-password", "123");
        await p1.click("#form-login button[type='submit']");
        await p1.waitForTimeout(1000);
    }
    report.login.player1 = "admin logged in";

    console.log("🔑 Đăng nhập Tài khoản 2: kithu1...");
    await p2.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await p2.waitForTimeout(500);
    const p2Auth = await p2.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
    if (p2Auth) {
        await p2.fill("#login-username", "kithu1");
        await p2.fill("#login-password", "123");
        await p2.click("#form-login button[type='submit']");
        await p2.waitForTimeout(1000);
    }
    report.login.player2 = "kithu1 logged in";

    // 2. START MATCHMAKING FOR BOTH
    console.log("🎯 Cả 2 người chơi bắt đầu Tìm Trận Rank (Matchmaking)...");
    await p1.evaluate(() => {
        window.app.startMatchmaking();
    });
    await p1.waitForTimeout(300);

    await p2.evaluate(() => {
        window.app.startMatchmaking();
    });

    console.log("⏳ Đang chờ máy chủ ghép trận...");
    // Wait for match to form (up to 8 seconds)
    let inGame = false;
    for (let i = 0; i < 16; i++) {
        await new Promise(r => setTimeout(r, 500));
        const p1Game = await p1.evaluate(() => !document.getElementById("screen-game").classList.contains("hidden")).catch(() => false);
        const p2Game = await p2.evaluate(() => !document.getElementById("screen-game").classList.contains("hidden")).catch(() => false);
        if (p1Game && p2Game) {
            inGame = true;
            console.log(`✅ Cả 2 người chơi đã vào trận đấu sau ${(i + 1) * 0.5}s!`);
            break;
        }
    }

    report.matchmaking.matched = inGame;

    if (!inGame) {
        report.errors.push("Matchmaking did not transition both players to screen-game in time");
    }

    await p1.waitForTimeout(1500);
    await p2.waitForTimeout(1500);

    // 3. INSPECT SYNC & TERRAIN FOR BOTH PLAYERS
    const syncData = await Promise.all([
        p1.evaluate(() => {
            const room = window.app.currentRoom;
            const myName = window.app.currentUser?.displayName;
            const map = window.app.tft.currentMap;
            const terrain = window.app.tft.currentTerrain || {};
            const leaderboard = Array.from(document.querySelectorAll("#spec-leaderboard .spec-bot-row")).map(el => el.textContent.trim());
            const piecesOnBoard = Array.from(document.querySelectorAll(".board-cell .board-piece")).length;
            const wallsOnDeployZone = Array.from(document.querySelectorAll(".board-cell.cell-deploy-zone.terrain-wall")).length;

            return {
                player: myName,
                roomCode: room ? room.code : null,
                playersInRoom: room ? room.players.map(p => p.name) : [],
                mapName: map ? map.name : null,
                terrainCount: Object.keys(terrain).length,
                terrainKeys: Object.keys(terrain),
                leaderboardCount: leaderboard.length,
                piecesOnBoard,
                wallsOnDeployZone
            };
        }),
        p2.evaluate(() => {
            const room = window.app.currentRoom;
            const myName = window.app.currentUser?.displayName;
            const map = window.app.tft.currentMap;
            const terrain = window.app.tft.currentTerrain || {};
            const leaderboard = Array.from(document.querySelectorAll("#spec-leaderboard .spec-bot-row")).map(el => el.textContent.trim());
            const piecesOnBoard = Array.from(document.querySelectorAll(".board-cell .board-piece")).length;
            const wallsOnDeployZone = Array.from(document.querySelectorAll(".board-cell.cell-deploy-zone.terrain-wall")).length;

            return {
                player: myName,
                roomCode: room ? room.code : null,
                playersInRoom: room ? room.players.map(p => p.name) : [],
                mapName: map ? map.name : null,
                terrainCount: Object.keys(terrain).length,
                terrainKeys: Object.keys(terrain),
                leaderboardCount: leaderboard.length,
                piecesOnBoard,
                wallsOnDeployZone
            };
        })
    ]);

    report.inGameSync.player1 = syncData[0];
    report.inGameSync.player2 = syncData[1];
    console.log("🎮 Dữ liệu đồng bộ 2 người chơi:", syncData);

    // 4. BUY AND DEPLOY FOR BOTH PLAYERS
    console.log("🛒 Cả 2 người chơi mua và xếp quân cờ...");
    await p1.evaluate(() => {
        const cards = document.querySelectorAll(".shop-card");
        if (cards[0]) cards[0].click();
    });
    await p2.evaluate(() => {
        const cards = document.querySelectorAll(".shop-card");
        if (cards[0]) cards[0].click();
    });
    await p1.waitForTimeout(600);
    await p2.waitForTimeout(600);

    // Deploy to a safe deploy cell
    const p1Deploy = await p1.evaluate(() => {
        const slots = document.querySelectorAll(".bench-slot");
        if (slots[0]) slots[0].click();
        const safeCell = document.querySelector(".board-cell.cell-deploy-zone:not(.terrain-wall)");
        if (safeCell) {
            safeCell.click();
            return { ok: true, pos: safeCell.getAttribute("data-row") + "," + safeCell.getAttribute("data-col") };
        }
        return { ok: false };
    });

    const p2Deploy = await p2.evaluate(() => {
        const slots = document.querySelectorAll(".bench-slot");
        if (slots[0]) slots[0].click();
        const safeCell = document.querySelector(".board-cell.cell-deploy-zone:not(.terrain-wall)");
        if (safeCell) {
            safeCell.click();
            return { ok: true, pos: safeCell.getAttribute("data-row") + "," + safeCell.getAttribute("data-col") };
        }
        return { ok: false };
    });

    console.log("Xếp quân P1:", p1Deploy, "P2:", p2Deploy);
    await p1.waitForTimeout(1000);
    await p2.waitForTimeout(1000);

    // 5. TAKE SCREENSHOTS FOR BOTH PLAYERS
    const shot1 = path.join(qaDir, "two_players_player1_admin.png");
    const shot2 = path.join(qaDir, "two_players_player2_kithu1.png");

    await p1.screenshot({ path: shot1 });
    await p2.screenshot({ path: shot2 });
    console.log(`📸 Đã lưu ảnh Player 1: ${shot1}`);
    console.log(`📸 Đã lưu ảnh Player 2: ${shot2}`);

    // Copy to artifacts for easy user inspection
    fs.copyFileSync(shot1, path.join(artifactsDir, "two_players_player1_admin.png"));
    fs.copyFileSync(shot2, path.join(artifactsDir, "two_players_player2_kithu1.png"));

    await browser.close();

    console.log("\n=========================================");
    console.log("🎉 KẾT QUẢ KIỂM THỬ 2 TÀI KHOẢN NGƯỜI CHƠI THẬT:");
    console.log(JSON.stringify(report, null, 2));
    console.log("=========================================\n");
})();

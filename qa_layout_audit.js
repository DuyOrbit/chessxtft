const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log("=== PLAYWRIGHT: KHÁM PHÁ VÀ KIỂM TRA BỐ CỤC IN-GAME TRÊN MÀN HÌNH 1366x768 ===");
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    // Tạo context với kích thước chuẩn 1366 x 768
    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 }
    });

    const page = await context.newPage();
    const screenshotDir = path.join(__dirname, "qa_screenshots");
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    try {
        await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

        // Đăng nhập admin nếu cần
        const isAuthVisible = await page.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
        if (isAuthVisible) {
            console.log("-> Đăng nhập với tài khoản admin...");
            await page.fill("#login-username", "admin");
            await page.fill("#login-password", "123");
            await page.click("#form-login button[type='submit']");
            await page.waitForTimeout(1000);
        }

        // Vào trận SOLO
        console.log("-> Bấm 'Vào Trận Ngay' (#btn-quick-solo)...");
        await page.click("#btn-quick-solo");
        await page.waitForTimeout(1500);

        // Chụp màn hình Stage 1 Prep
        await page.screenshot({ path: path.join(screenshotDir, "layout_audit_1_prep.png") });
        console.log("📸 Đã chụp layout_audit_1_prep.png");

        // Đo đạc các kích thước thực tế và chiều cao / thanh cuộn
        const metrics = await page.evaluate(() => {
            const docEl = document.documentElement;
            const body = document.body;
            const screenGame = document.getElementById("screen-game");
            const topBar = document.querySelector("#screen-game .top-bar");
            const tracker = document.getElementById("stage-round-tracker");
            const mapBanner = document.getElementById("arena-map-banner");
            const boardCenter = document.querySelector(".center-board-column");
            const chessBoard = document.getElementById("chess-board");
            const bench = document.getElementById("bench-grid");
            const shopHud = document.querySelector(".shop-bar");
            const leftPanel = document.querySelector(".side-panel-left");
            const rightPanel = document.querySelector(".side-panel-right");

            return {
                windowInner: { w: window.innerWidth, h: window.innerHeight },
                bodyScroll: { w: body.scrollWidth, h: body.scrollHeight, scrollY: window.scrollY },
                screenGame: screenGame ? { h: screenGame.offsetHeight, scrollH: screenGame.scrollHeight } : null,
                topBarH: topBar ? topBar.offsetHeight : 0,
                trackerH: tracker ? tracker.offsetHeight : 0,
                mapBannerH: mapBanner ? mapBanner.offsetHeight : 0,
                boardCenterH: boardCenter ? boardCenter.offsetHeight : 0,
                chessBoard: chessBoard ? { w: chessBoard.offsetWidth, h: chessBoard.offsetHeight } : null,
                benchH: bench ? bench.offsetHeight : 0,
                shopHudH: shopHud ? shopHud.offsetHeight : 0,
                leftPanel: leftPanel ? { w: leftPanel.offsetWidth, h: leftPanel.offsetHeight, scrollH: leftPanel.scrollHeight } : null,
                rightPanel: rightPanel ? { w: rightPanel.offsetWidth, h: rightPanel.offsetHeight, scrollH: rightPanel.scrollHeight } : null
            };
        });

        console.log("\n--- METRICS PHÂN TÍCH GIAO DIỆN HIỆN TẠI ---");
        console.log(JSON.stringify(metrics, null, 2));

        // Mua quân, đánh thử 1 round để lên Stage 2 giống ảnh của user
        console.log("-> Mua 1 quân cờ...");
        const firstCard = await page.$("#shop-cards .shop-card:not(.shop-sold)");
        if (firstCard) await firstCard.click();
        await page.waitForTimeout(500);

        console.log("-> Bấm 'VÀO TRẬN' để chiến đấu...");
        await page.click("#btn-start-combat");
        await page.waitForTimeout(2000);

        await page.screenshot({ path: path.join(screenshotDir, "layout_audit_2_combat.png") });
        console.log("📸 Đã chụp layout_audit_2_combat.png");

    } catch (err) {
        console.error("LỖI TEST:", err.message);
    } finally {
        await browser.close();
    }
})();

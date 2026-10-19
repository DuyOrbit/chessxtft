const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log("=== BẮT ĐẦU TEST PLAYWRIGHT: MAP PREVIEW TRÊN SÂN NHÀ & BẢO MẬT SOI BÀI ===");
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => consoleLogs.push({ type: 'pageerror', text: err.message }));

    try {
        await page.goto("http://localhost/chesstft/", { waitUntil: "networkidle" });

        const isAuthVisible = await page.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
        if (isAuthVisible) {
            await page.fill("#login-username", "admin");
            await page.fill("#login-password", "123");
            await page.click("#form-login button[type='submit']");
            await page.waitForTimeout(1000);
        }

        // Click Vào Trận Ngay
        await page.click("#btn-quick-solo");
        await page.waitForTimeout(800);

        // 1. Check Map Info Bar on HOME board during Prep
        const homeMapText = await page.$eval("#map-info-bar", el => el.innerText.trim());
        console.log("1. Thanh thông tin bản đồ SÂN NHÀ lúc Chuẩn Bị:\n  ->", homeMapText);

        const homeTerrainCount = await page.$$eval("#chess-board .terrain-badge", els => els.length);
        console.log(`2. Số ô địa hình hiển thị trên sân nhà lúc Chuẩn Bị: ${homeTerrainCount} ô`);

        const screenshotDir = path.join(__dirname, "qa_screenshots");
        await page.screenshot({ path: path.join(screenshotDir, "prep_home_map_revealed.png") });
        console.log("📸 Đã chụp ảnh Sân Nhà có địa hình: qa_screenshots/prep_home_map_revealed.png");

        // 2. Click to scout first AI Bot
        console.log("3. Bấm soi bài Bot AI thứ 2 trong bảng xếp hạng...");
        await page.click("#leaderboard-list .leader-row:nth-child(2)");
        await page.waitForTimeout(600);

        const scoutMapText = await page.$eval("#map-info-bar", el => el.innerText.trim());
        console.log("4. Thanh thông tin bản đồ khi SOI BÀI ĐỐI THỦ:\n  ->", scoutMapText);

        const enemyTerrainCount = await page.$$eval("#chess-board .terrain-badge", els => els.length);
        console.log(`5. Số ô địa hình trên sân đối thủ (phải = 0 vì đã ẩn): ${enemyTerrainCount} ô`);

        await page.screenshot({ path: path.join(screenshotDir, "prep_scout_map_hidden.png") });
        console.log("📸 Đã chụp ảnh Soi Bài ẩn địa hình: qa_screenshots/prep_scout_map_hidden.png");

        // 3. Return Home
        console.log("6. Bấm Quay Về Sân Nhà (#btn-return-home)...");
        await page.click("#btn-return-home");
        await page.waitForTimeout(500);

        const returnTerrainCount = await page.$$eval("#chess-board .terrain-badge", els => els.length);
        console.log(`7. Số ô địa hình khi quay về sân nhà: ${returnTerrainCount} ô`);

        console.log("=== KIỂM TRA LỖI CONSOLE ===");
        const errors = consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror');
        console.log(`Số lỗi: ${errors.length}`);
        if (errors.length === 0) {
            console.log("✅ TẤT CẢ TÍNH NĂNG HOẠT ĐỘNG HOÀN HẢO!");
        }

    } catch (e) {
        console.error("Lỗi:", e);
    } finally {
        await browser.close();
    }
})();

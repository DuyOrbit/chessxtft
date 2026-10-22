const { chromium } = require('playwright-core');
const path = require('path');

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputDir = path.join(__dirname, "..", "qa_screenshots");

(async () => {
    console.log("🌌 Đang chụp ảnh kiểm tra Duelyst II UI...");
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    const isAuthVisible = await page.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
    if (isAuthVisible) {
        await page.fill("#login-username", "admin");
        await page.fill("#login-password", "123");
        await page.click("#form-login button[type='submit']");
        await page.waitForTimeout(1200);
    }

    console.log("⚔️ Bắt đầu trận đấu solo bot để kiểm tra bàn cờ Duelyst II...");
    await page.click("#btn-quick-solo");
    await page.waitForTimeout(1500);

    // Mua 2 tướng trong shop
    await page.evaluate(() => {
        const cards = document.querySelectorAll(".shop-card");
        if (cards[0]) cards[0].click();
        if (cards[1]) cards[1].click();
    });
    await page.waitForTimeout(1000);

    // Đưa 1 tướng từ bench lên bàn cờ
    await page.evaluate(() => {
        const benchSlots = document.querySelectorAll(".bench-slot");
        if (benchSlots[0]) benchSlots[0].click();
        const deployCell = document.querySelector(".board-cell.cell-deploy-zone");
        if (deployCell) deployCell.click();
    });
    await page.waitForTimeout(1000);

    const shotPath = path.join(outputDir, "duelyst2_ingame_board.png");
    await page.screenshot({ path: shotPath });
    console.log("✅ Đã chụp thành công: " + shotPath);

    const boardEl = await page.$(".board-wrapper");
    if (boardEl) {
        const boardShot = path.join(outputDir, "duelyst2_board_closeup.png");
        await boardEl.screenshot({ path: boardShot });
        console.log("✅ Đã chụp cận cảnh bàn cờ: " + boardShot);
    }

    await browser.close();
    process.exit(0);
})().catch(err => {
    console.error("❌ Lỗi:", err);
    process.exit(1);
});

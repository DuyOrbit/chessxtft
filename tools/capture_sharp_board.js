const { chromium } = require('playwright-core');
const path = require('path');

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const qaDir = path.join(__dirname, "..", "qa_screenshots");

(async () => {
    console.log("📸 Chụp ảnh kiểm chứng bàn cờ vuông vức không bo cong...");
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    await page.fill("#login-username", "admin");
    await page.fill("#login-password", "123");
    await page.click("#form-login button[type='submit']");
    await page.waitForTimeout(1000);

    await page.click("#btn-quick-solo");
    await page.waitForTimeout(1500);

    // Deploy 2 pieces to see board in action
    await page.evaluate(() => {
        const cards = document.querySelectorAll(".shop-card");
        if (cards[0]) cards[0].click();
        if (cards[1]) cards[1].click();
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
        const slots = document.querySelectorAll(".bench-slot");
        if (slots[0]) slots[0].click();
        const deploy = document.querySelector(".board-cell.cell-deploy-zone");
        if (deploy) deploy.click();
    });
    await page.waitForTimeout(800);

    const metrics = await page.evaluate(() => {
        const board = document.querySelector(".chess-board");
        const cells = Array.from(document.querySelectorAll(".board-cell"));
        const firstCell = cells[0];
        const bStyle = window.getComputedStyle(board);
        const cStyle = firstCell ? window.getComputedStyle(firstCell) : null;
        const bRect = board.getBoundingClientRect();
        const cRect = firstCell ? firstCell.getBoundingClientRect() : null;

        return {
            boardWidth: bRect.width,
            boardHeight: bRect.height,
            boardBorderRadius: bStyle.borderRadius,
            cellWidth: cRect ? cRect.width : 0,
            cellHeight: cRect ? cRect.height : 0,
            cellAspectRatio: cRect ? (cRect.width / cRect.height).toFixed(3) : 0,
            cellBorderRadius: cStyle ? cStyle.borderRadius : 0
        };
    });

    console.log("📐 Thông số bàn cờ mới:", metrics);

    const fullShot = path.join(qaDir, "verify_sharp_board_full.png");
    await page.screenshot({ path: fullShot });
    console.log(`📸 Đã lưu ảnh toàn màn hình: ${fullShot}`);

    const boardEl = await page.$(".board-wrapper");
    if (boardEl) {
        const boardShot = path.join(qaDir, "verify_sharp_board_closeup.png");
        await boardEl.screenshot({ path: boardShot });
        console.log(`📸 Đã lưu ảnh cận cảnh bàn cờ: ${boardShot}`);
    }

    await browser.close();
})();

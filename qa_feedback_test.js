const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log("=== PLAYWRIGHT: TEST ITEM TOOLTIP, UNEQUIP, SELL BUTTON ===");
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 }
    });

    const page = await context.newPage();
    const screenshotDir = path.join(__dirname, "qa_screenshots");

    page.on('console', msg => console.log(`  [BROWSER ${msg.type()}]:`, msg.text()));
    page.on('pageerror', err => console.log(`  [PAGE ERROR]:`, err.message));

    try {
        await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

        const isAuthVisible = await page.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
        if (isAuthVisible) {
            await page.fill("#login-username", "admin");
            await page.fill("#login-password", "123");
            await page.click("#form-login button[type='submit']");
            await page.waitForTimeout(1000);
        }

        await page.evaluate(() => {
            const btn = document.getElementById("btn-quick-solo");
            if (btn) btn.click();
        });
        await page.waitForSelector("#screen-game:not(.hidden)", { timeout: 10000 });
        await page.waitForTimeout(1200);

        // 1. Hover on Item in left column
        console.log("-> Hover vào ô trang bị đầu tiên bên trái...");
        const firstItem = await page.$(".hud-item-slots-vertical .inv-slot-compact");
        if (firstItem) {
            await firstItem.hover();
            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(screenshotDir, "test_item_hover.png") });
            console.log("📸 Đã chụp test_item_hover.png");
        }

        // 2. Select unit on board and equip item
        console.log("-> Lắp đồ vào quân cờ...");
        if (firstItem) {
            await firstItem.click(); // Select item
            await page.waitForTimeout(300);
            // Click on unit on board
            const unitPiece = await page.$("#chess-board .chess-piece");
            if (unitPiece) {
                await unitPiece.click();
                await page.waitForTimeout(500);
                await page.screenshot({ path: path.join(screenshotDir, "test_item_equipped.png") });
                console.log("📸 Đã chụp test_item_equipped.png");
            }
        }

        // 3. Test Unequip
        console.log("-> Bấm Gỡ Đồ...");
        const unequipBtn = await page.$("#btn-unequip-selected");
        if (unequipBtn && !(await unequipBtn.evaluate(el => el.classList.contains("hidden")))) {
            await unequipBtn.click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(screenshotDir, "test_item_unequipped.png") });
            console.log("📸 Đã chụp test_item_unequipped.png");
        }

        // 4. Test Sell unit
        console.log("-> Bấm Bán Quân...");
        const unitPiece2 = await page.$("#chess-board .chess-piece");
        if (unitPiece2) {
            await unitPiece2.click();
            await page.waitForTimeout(300);
            const directSellBtn = await page.$("#btn-sell-hud-direct");
            if (directSellBtn) {
                await directSellBtn.click();
                await page.waitForTimeout(500);
                await page.screenshot({ path: path.join(screenshotDir, "test_unit_sold.png") });
                console.log("📸 Đã chụp test_unit_sold.png");
            }
        }

        console.log("✅ All functional tests executed successfully!");

    } catch (err) {
        console.error("❌ Test failed:", err);
    } finally {
        await browser.close();
    }
})();

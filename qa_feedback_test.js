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

        // 3. Test Unequip with dedicated Búa Gỡ Đồ (Scissors/Remover Slot)
        console.log("-> Test dùng Búa Gỡ Đồ (#btn-item-remover)...");
        const removerBtn = await page.$("#btn-item-remover");
        if (removerBtn) {
            await removerBtn.click();
            await page.waitForTimeout(300);
            const unitPiece = await page.$("#chess-board .chess-piece");
            if (unitPiece) {
                await unitPiece.click();
                await page.waitForTimeout(500);
                await page.screenshot({ path: path.join(screenshotDir, "test_remover_used.png") });
                console.log("📸 Đã chụp test_remover_used.png");
            }
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

        // 6. Test Hover Piece Movement Preview & Prep Duration
        console.log("-> Kiểm tra thời gian chuẩn bị và rê chuột xem trước nước đi...");
        const prepTimerText = await page.$eval("#prep-timer-badge", el => el.textContent.trim());
        console.log(`-> Badge đếm ngược: ${prepTimerText}`);

        // Buy a piece into bench or place it, then hover
        const shopCard = await page.$(".shop-card");
        if (shopCard) {
            await shopCard.click();
            await page.waitForTimeout(400);
        }

        const benchSlotWithPiece = await page.$(".bench-slot:has(.chess-piece)");
        if (benchSlotWithPiece) {
            await benchSlotWithPiece.hover();
            await page.waitForTimeout(300);
            const previewCellsCount = await page.$$eval("#chess-board .cell-preview-move, #chess-board .cell-preview-attack", els => els.length);
            console.log(`-> Số ô xem trước nước đi khi rê chuột lên hàng chờ: ${previewCellsCount} (Mong muốn: > 0)`);
            await page.screenshot({ path: path.join(screenshotDir, "test_hover_preview.png") });
            console.log("📸 Đã chụp test_hover_preview.png");
        }

        // 7. Test Hover Piece Range in Combat Phase
        console.log("-> Bắt đầu giao tranh để kiểm tra rê chuột xem tầm đánh trong trận...");
        const enterCombatBtn = await page.$("#btn-start-combat");
        if (enterCombatBtn) {
            await enterCombatBtn.click();
            await page.waitForTimeout(1500);

            const combatPiece = await page.$("#chess-board .chess-piece");
            if (combatPiece) {
                await combatPiece.hover();
                await page.waitForTimeout(400);
                const combatPreviewCells = await page.$$eval("#chess-board .cell-preview-move, #chess-board .cell-preview-attack", els => els.length);
                console.log(`-> Số ô tầm đánh/nước đi khi rê chuột lên quân cờ TRONG TRẬN: ${combatPreviewCells} (Mong muốn: > 0)`);
                await page.screenshot({ path: path.join(screenshotDir, "test_combat_hover_preview.png") });
                console.log("📸 Đã chụp test_combat_hover_preview.png");
            }
        }

        console.log("✅ All functional tests executed successfully!");

    } catch (err) {
        console.error("❌ Test failed:", err);
    } finally {
        await browser.close();
    }
})();

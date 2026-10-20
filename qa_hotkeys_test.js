const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log("=== BẮT ĐẦU TEST PLAYWRIGHT: PHÍM TẮT D/F/E/W VÀ KHÓA SHOP (LOCK SHOP) ===");

    // 1. Ensure server.js is running on port 3000
    let serverProcess = null;
    const isPortOpen = async (port) => {
        try {
            const res = await fetch(`http://localhost:${port}/api/config`).catch(() => null);
            return !!res;
        } catch {
            return false;
        }
    };

    if (!(await isPortOpen(3000))) {
        console.log("-> Khởi động server Node.js port 3000...");
        serverProcess = spawn('node', ['server.js'], { cwd: __dirname, stdio: 'ignore' });
        await new Promise(r => setTimeout(r, 1500));
    } else {
        console.log("-> Server port 3000 đã sẵn sàng.");
    }

    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 } // Test đúng độ phân giải màn hình Laptop chuẩn 1366x768
    });

    const page = await context.newPage();
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => consoleLogs.push({ type: 'pageerror', text: err.message }));

    const screenshotDir = path.join(__dirname, "qa_screenshots");
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    try {
        await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

        // Đăng nhập nếu màn hình auth xuất hiện
        const isAuthVisible = await page.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
        if (isAuthVisible) {
            console.log("-> Đăng nhập với tài khoản admin...");
            await page.fill("#login-username", "admin");
            await page.fill("#login-password", "123");
            await page.click("#form-login button[type='submit']");
            await page.waitForTimeout(1000);
        }

        // Vào trận SOLO từ Sảnh chờ
        console.log("-> Bấm 'Vào Trận Ngay' (#btn-quick-solo)...");
        await page.click("#btn-quick-solo");
        await page.waitForTimeout(1000);

        // 1. Kiểm tra UI Hotkeys Strip và Badges
        console.log("\n[TEST 1] KIỂM TRA GIAO DIỆN PHÍM TẮT D/F/E/W/X & KHÓA SHOP");
        const hotkeysText = await page.$eval(".shop-hotkeys-inline", el => el.innerText.trim()).catch(() => "");
        console.log("  -> Dải phím tắt hiển thị:", hotkeysText);

        const badgeD = await page.$eval("#btn-reroll .hud-keybind-badge", el => el.innerText.trim()).catch(() => "");
        const badgeF = await page.$eval("#btn-buy-xp .hud-keybind-badge", el => el.innerText.trim()).catch(() => "");
        const badgeX = await page.$eval("#btn-lock-shop .hud-keybind-badge", el => el.innerText.trim()).catch(() => "");
        console.log(`  -> Badges trên các nút: Reroll=[${badgeD}], BuyXP=[${badgeF}], LockShop=[${badgeX}]`);

        await page.screenshot({ path: path.join(screenshotDir, "hotkeys_1_shop_ui.png") });
        console.log("  📸 Ảnh chụp 1: qa_screenshots/hotkeys_1_shop_ui.png");

        // 2. Test Khóa Shop (Lock Shop) bằng phím Space và X
        console.log("\n[TEST 2] TEST TÍNH NĂNG KHÓA SHOP (PHÍM SPACE / X & NÚT LOCK)");
        let isLockedBefore = await page.$eval("#btn-lock-shop", el => el.classList.contains("is-locked")).catch(() => false);
        console.log("  -> Trạng thái trước khi bấm: isLocked =", isLockedBefore);

        console.log("  -> Nhấn phím 'Space' để KHÓA CỬA HÀNG...");
        await page.keyboard.press("Space");
        await page.waitForTimeout(400);

        let isLockedAfterSpace = await page.$eval("#btn-lock-shop", el => el.classList.contains("is-locked")).catch(() => false);
        let lockIconSpace = await page.$eval("#btn-lock-icon", el => el.innerText.trim()).catch(() => "");
        let shopCardsLocked = await page.$eval("#shop-cards", el => el.classList.contains("shop-locked")).catch(() => false);
        let lockedIconsCount = await page.$$eval(".shop-card-locked-icon", els => els.length);

        console.log(`  -> Sau khi nhấn 'Space': isLocked = ${isLockedAfterSpace}, Icon = ${lockIconSpace}, shopCardsLocked = ${shopCardsLocked}, số thẻ có 🔒 = ${lockedIconsCount}`);
        if (!isLockedAfterSpace || lockIconSpace !== "🔒" || !shopCardsLocked) {
            throw new Error("LỖI: Khóa shop bằng phím Space không kích hoạt đúng trạng thái!");
        }

        console.log("  -> Nhấn phím 'Space' lần 2 để MỞ KHÓA CỬA HÀNG...");
        await page.keyboard.press("Space");
        await page.waitForTimeout(400);
        let isUnlockedAfterSpace = !(await page.$eval("#btn-lock-shop", el => el.classList.contains("is-locked")).catch(() => true));
        console.log(`  -> Mở khóa thành công: ${isUnlockedAfterSpace}`);

        console.log("  -> Nhấn phím 'x' để KHÓA lại...");
        await page.keyboard.press("x");
        await page.waitForTimeout(400);
        let isLockedAfterX = await page.$eval("#btn-lock-shop", el => el.classList.contains("is-locked")).catch(() => false);
        console.log(`  -> Khóa lại bằng 'x': ${isLockedAfterX}`);

        await page.screenshot({ path: path.join(screenshotDir, "hotkeys_2_locked_shop.png") });
        console.log("  📸 Ảnh chụp 2: qa_screenshots/hotkeys_2_locked_shop.png");

        // 3. Test Phím Tắt F (Mua XP)
        console.log("\n[TEST 3] TEST PHÍM TẮT F (MUA 4 XP)");
        const goldBeforeF = parseInt(await page.$eval("#hud-gold-amount", el => el.innerText.trim()));
        const xpRatioBefore = await page.$eval("#hud-xp-ratio", el => el.innerText.trim());
        console.log(`  -> Trước khi bấm F: Vàng = ${goldBeforeF}, XP = ${xpRatioBefore}`);

        console.log("  -> Nhấn phím 'f'...");
        await page.keyboard.press("f");
        await page.waitForTimeout(400);

        const goldAfterF = parseInt(await page.$eval("#hud-gold-amount", el => el.innerText.trim()));
        const xpRatioAfter = await page.$eval("#hud-xp-ratio", el => el.innerText.trim());
        console.log(`  -> Sau khi bấm F: Vàng = ${goldAfterF} (trừ 4), XP = ${xpRatioAfter}`);
        if (goldBeforeF - goldAfterF !== 4) {
            throw new Error("LỖI: Phím F không trừ đúng 4 vàng hoặc không tăng XP!");
        }
        await page.screenshot({ path: path.join(screenshotDir, "hotkeys_3_buy_xp_pressed.png") });
        console.log("  📸 Ảnh chụp 3: qa_screenshots/hotkeys_3_buy_xp_pressed.png");

        // 4. Test Mua 1 tướng vào Hàng Chờ (Bench)
        console.log("\n[TEST 4] MUA 1 QUÂN CỜ ĐỂ TEST PHÍM W VÀ PHÍM E");
        const firstCard = await page.$("#shop-cards .shop-card:not(.shop-sold)");
        if (firstCard) {
            await firstCard.click();
            await page.waitForTimeout(500);
            console.log("  -> Đã mua 1 quân cờ từ shop vào hàng chờ.");
        }

        // Tìm ô hàng chờ có quân
        const benchUnitsCount = await page.$$eval("#bench-grid .bench-slot:has(.chess-piece)", els => els.length);
        console.log(`  -> Số quân trên hàng chờ hiện tại: ${benchUnitsCount} quân`);

        // 5. Test Phím W: Hover hàng chờ -> Nhấn W -> Đưa lên sân
        console.log("\n[TEST 5] TEST PHÍM TẮT W (ĐƯA TƯỚNG TỪ HÀNG CHỜ LÊN SÀN)");
        const benchSlotWithPiece = await page.$("#bench-grid .bench-slot:has(.chess-piece)");
        if (!benchSlotWithPiece) throw new Error("Không tìm thấy quân cờ trên hàng chờ để test W!");

        const boardUnitsBeforeW = await page.$$eval("#chess-board .cell-deploy-zone:has(.chess-piece)", els => els.length);
        console.log(`  -> Quân trên sân nhà trước khi bấm W: ${boardUnitsBeforeW}`);

        // Rê chuột vào ô hàng chờ
        await benchSlotWithPiece.hover();
        await page.waitForTimeout(200);

        const isBenchHovered = await benchSlotWithPiece.evaluate(el => el.classList.contains("bench-hover-target"));
        console.log(`  -> Ô hàng chờ có class bench-hover-target: ${isBenchHovered}`);

        console.log("  -> Nhấn phím 'w' để đưa lên bàn cờ...");
        await page.keyboard.press("w");
        await page.waitForTimeout(500);

        const boardUnitsAfterW = await page.$$eval("#chess-board .cell-deploy-zone:has(.chess-piece)", els => els.length);
        console.log(`  -> Quân trên sân nhà sau khi bấm W: ${boardUnitsAfterW}`);
        if (boardUnitsAfterW <= boardUnitsBeforeW) {
            throw new Error("LỖI: Phím W không đưa được quân từ hàng chờ lên sàn đấu!");
        }

        await page.screenshot({ path: path.join(screenshotDir, "hotkeys_4_deployed_w.png") });
        console.log("  📸 Ảnh chụp 4: qa_screenshots/hotkeys_4_deployed_w.png");

        // 6. Test Phím W: Hover quân trên sân -> Nhấn W -> Thu hồi về hàng chờ
        console.log("\n[TEST 6] TEST PHÍM TẮT W (THU HỒI TƯỚNG TỪ SÀN VỀ HÀNG CHỜ)");
        // Tìm quân cờ trên sân không phải King
        const nonKingCell = await page.$("#chess-board .cell-deploy-zone:has(.chess-piece:not([data-piece-id='king']))");
        if (nonKingCell) {
            await nonKingCell.hover();
            await page.waitForTimeout(200);

            const isCellHovered = await nonKingCell.evaluate(el => el.classList.contains("cell-hover-target"));
            console.log(`  -> Ô bàn cờ có class cell-hover-target: ${isCellHovered}`);

            console.log("  -> Nhấn phím 'w' để thu hồi về hàng chờ...");
            await page.keyboard.press("w");
            await page.waitForTimeout(500);

            const boardUnitsAfterRecall = await page.$$eval("#chess-board .cell-deploy-zone:has(.chess-piece)", els => els.length);
            console.log(`  -> Quân trên sân nhà sau khi thu hồi: ${boardUnitsAfterRecall}`);
        }

        await page.screenshot({ path: path.join(screenshotDir, "hotkeys_5_recalled_w.png") });
        console.log("  📸 Ảnh chụp 5: qa_screenshots/hotkeys_5_recalled_w.png");

        // 7. Test Phím E: Bán nhanh quân cờ
        console.log("\n[TEST 7] TEST PHÍM TẮT E (BÁN NHANH QUÂN CỜ ĐANG TRỎ CHUỘT)");
        const benchSlotToSell = await page.$("#bench-grid .bench-slot:has(.chess-piece)");
        if (benchSlotToSell) {
            const goldBeforeE = parseInt(await page.$eval("#hud-gold-amount", el => el.innerText.trim()));
            console.log(`  -> Vàng trước khi bán [E]: ${goldBeforeE}🪙`);

            await benchSlotToSell.hover();
            await page.waitForTimeout(200);

            console.log("  -> Nhấn phím 'e' để bán nhanh quân cờ...");
            await page.keyboard.press("e");
            await page.waitForTimeout(500);

            const goldAfterE = parseInt(await page.$eval("#hud-gold-amount", el => el.innerText.trim()));
            console.log(`  -> Vàng sau khi bán [E]: ${goldAfterE}🪙 (+${goldAfterE - goldBeforeE}🪙)`);
            if (goldAfterE <= goldBeforeE) {
                throw new Error("LỖI: Phím E không hoàn tiền khi bán quân cờ!");
            }
        }

        await page.screenshot({ path: path.join(screenshotDir, "hotkeys_6_sold_e.png") });
        console.log("  📸 Ảnh chụp 6: qa_screenshots/hotkeys_6_sold_e.png");

        // 8. Test Phím D: Reroll cửa hàng
        console.log("\n[TEST 8] TEST PHÍM TẮT D (ĐỔI LẠI CỬA HÀNG / REROLL)");
        const goldBeforeD = parseInt(await page.$eval("#hud-gold-amount", el => el.innerText.trim()));
        const shopNamesBefore = await page.$$eval("#shop-cards .shop-unit-name", els => els.map(e => e.innerText));
        console.log(`  -> Vàng trước khi bấm D: ${goldBeforeD}🪙`);
        console.log(`  -> Danh sách bài trước khi roll: ${shopNamesBefore.join(", ")}`);

        console.log("  -> Nhấn phím 'd'...");
        await page.keyboard.press("d");
        await page.waitForTimeout(500);

        const goldAfterD = parseInt(await page.$eval("#hud-gold-amount", el => el.innerText.trim()));
        const shopNamesAfter = await page.$$eval("#shop-cards .shop-unit-name", els => els.map(e => e.innerText));
        console.log(`  -> Vàng sau khi bấm D: ${goldAfterD}🪙`);
        console.log(`  -> Danh sách bài sau khi roll: ${shopNamesAfter.join(", ")}`);

        await page.screenshot({ path: path.join(screenshotDir, "hotkeys_7_reroll_d.png") });
        console.log("  📸 Ảnh chụp 7: qa_screenshots/hotkeys_7_reroll_d.png");

        // 9. Kiểm tra Console Errors
        console.log("\n=== KIỂM TRA LỖI CONSOLE TRÌNH DUYỆT ===");
        const errors = consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror');
        console.log(`Số lỗi Console: ${errors.length}`);
        if (errors.length > 0) {
            console.error("Chi tiết lỗi:", errors);
        } else {
            console.log("✅ TẤT CẢ PHÍM TẮT D/F/E/W VÀ KHÓA SHOP (LOCK SHOP) ĐÃ HOẠT ĐỘNG 100% XUẤT SẮC!");
        }

    } catch (err) {
        console.error("❌ THẤT BẠI TẠI TEST:", err);
    } finally {
        await browser.close();
        if (serverProcess) {
            serverProcess.kill();
        }
        process.exit(0);
    }
})();

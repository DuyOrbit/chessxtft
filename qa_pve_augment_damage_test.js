const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log("=== BẮT ĐẦU TEST PLAYWRIGHT: PVE ROUNDS (1-1..1-3), AUGMENT (2-1), FLOATING DAMAGE & HIT FLASH ===");

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
        viewport: { width: 1366, height: 768 } // 1366x768 viewport constraint
    });

    const page = await context.newPage();
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => consoleLogs.push({ type: 'pageerror', text: err.message }));
    page.on('response', resp => {
        if (!resp.ok() && resp.status() !== 304) {
            console.log(`  [HTTP ${resp.status()}] ${resp.url()}`);
        }
    });

    const screenshotDir = path.join(__dirname, "qa_screenshots");
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    try {
        await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

        // Auto login if screen-auth visible
        const isAuthVisible = await page.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
        if (isAuthVisible) {
            console.log("-> Đăng nhập admin...");
            await page.fill("#login-username", "admin");
            await page.fill("#login-password", "123");
            await page.click("#form-login button[type='submit']");
            await page.waitForTimeout(1000);
        }

        console.log("-> Bấm 'Vào Trận Ngay' (#btn-quick-solo)...");
        await page.click("#btn-quick-solo");
        await page.waitForTimeout(1000);

        // 1. Kiểm tra màn hình 1366x768 không bị thanh cuộn ngang hoặc dọc
        console.log("\n[TEST 1] KIỂM TRA BỐ CỤC 1366x768 (NO OVERFLOW SCROLLBARS)");
        const scrollInfo = await page.evaluate(() => {
            return {
                docScrollWidth: document.documentElement.scrollWidth,
                docClientWidth: document.documentElement.clientWidth,
                docScrollHeight: document.documentElement.scrollHeight,
                docClientHeight: document.documentElement.clientHeight,
                bodyOverflow: window.getComputedStyle(document.body).overflow
            };
        });
        console.log("  -> Layout dimensions:", scrollInfo);
        const hasHorizontalScroll = scrollInfo.docScrollWidth > scrollInfo.docClientWidth;
        console.log(`  -> Cuộn ngang: ${hasHorizontalScroll ? "CÓ (LỖI)" : "KHÔNG (CHUẨN)"}`);
        if (hasHorizontalScroll) {
            throw new Error("LỖI: Màn hình 1366x768 bị tràn cuộn ngang!");
        }

        // 2. Kiểm tra Stage 1-1 PVE Encounter
        console.log("\n[TEST 2] KIỂM TRA VÒNG 1-1 LÀ PVE (QUÁI ĐÁ KHỞI ĐẦU)");
        const roundInfo = await page.evaluate(() => {
            const tft = window.app && window.app.tft;
            const roundDef = tft && tft.getCurrentRoundDef();
            return {
                stage: tft ? tft.stage : null,
                roundInStage: tft ? tft.roundInStage : null,
                type: roundDef ? roundDef.type : null,
                name: roundDef ? roundDef.name : null,
                enemySide: tft ? tft.enemySide : null
            };
        });
        console.log("  -> Thông tin vòng hiện tại:", roundInfo);
        if (roundInfo.stage !== 1 || roundInfo.roundInStage !== 1 || roundInfo.type !== "pve") {
            throw new Error(`LỖI: Vòng 1-1 không phải là PVE! Nhận được: ${JSON.stringify(roundInfo)}`);
        }

        // 3. Test Bắt đầu giao tranh PVE 1-1
        console.log("\n[TEST 3] BẮT ĐẦU GIAO TRANH PVE 1-1");
        await page.click("#btn-start-combat");
        await page.waitForTimeout(1200);

        // Kiểm tra đối thủ trên sàn cờ có quân quái đá
        const combatBoardStatus = await page.evaluate(() => {
            const app = window.app;
            const chess = app && app.chess;
            return {
                phase: app?.tft?.phase,
                currentOpponent: app?.tft?.currentOpponent,
                chessBoardPieces: chess ? chess.board.flat().filter(p => p !== null).map(p => ({
                    id: p.id,
                    side: p.side,
                    name: p.name,
                    r: p.r,
                    c: p.c
                })) : null
            };
        });
        console.log("  -> Tình trạng chi tiết:", JSON.stringify(combatBoardStatus, null, 2));
        const enemyPieces = (combatBoardStatus.chessBoardPieces || []).filter(p => p.side === "enemy");
        if (enemyPieces.length === 0 || !enemyPieces.some(p => p.id.includes("stone"))) {
            console.error("Browser Console logs:", JSON.stringify(consoleLogs, null, 2));
            const debugInfo = await page.evaluate(() => {
                const app = window.app;
                const opp = app?.tft?.currentOpponent;
                const cfg = app?.tft?.getStageConfig();
                const mirrored = opp ? app.tft.getMirroredEnemyPieces(opp, cfg) : null;
                const minionDef = window.CHESS_TFT_DATA?.PIECES?.["stone_minion"];
                return { opp, cfg, mirrored, minionDef };
            });
            console.error("Debug info from page:", JSON.stringify(debugInfo, null, 2));
            throw new Error("LỖI: Đối thủ không phải là quân Quái Đá PVE!");
        }

        await page.screenshot({ path: path.join(screenshotDir, "pve_1_combat_started.png") });
        console.log("  📸 Ảnh chụp 1: qa_screenshots/pve_1_combat_started.png");

        // 4. Test Floating Damage Text & Hit Flash FX trong giao tranh
        console.log("\n[TEST 4] TEST HIỆU ỨNG FLOATING DAMAGE & HIT FLASH TRÊN BÀN CỜ");
        // Giả lập trực tiếp gọi triggerCombatHitFx và kiểm tra DOM element xuất hiện
        const fxCreated = await page.evaluate(() => {
            const app = window.app;
            if (!app) return false;
            app.triggerCombatHitFx({
                targetR: 2,
                targetC: 4,
                damageText: "-25 ❤️",
                isCrit: false,
                isKill: false
            });
            const floatEl = document.querySelector(".floating-damage");
            const cellFlash = document.querySelector(".cell-hit-flash");
            return {
                hasFloatingDamage: !!floatEl,
                damageText: floatEl ? floatEl.textContent : null,
                hasCellFlash: !!cellFlash
            };
        });
        console.log("  -> Kết quả tạo FX Sát thương bay & Chớp đỏ:", fxCreated);
        if (!fxCreated.hasFloatingDamage || fxCreated.damageText !== "-25 ❤️" || !fxCreated.hasCellFlash) {
            throw new Error("LỖI: Hiệu ứng Floating Damage hoặc Hit Flash không hiển thị trên DOM!");
        }

        // Test Crit FX
        const critFxCreated = await page.evaluate(() => {
            const app = window.app;
            app.triggerCombatHitFx({
                targetR: 3,
                targetC: 3,
                damageText: "-50 💥",
                isCrit: true,
                isKill: true
            });
            const critEl = document.querySelector(".damage-crit");
            return {
                hasCritEl: !!critEl,
                text: critEl ? critEl.textContent : null
            };
        });
        console.log("  -> Kết quả tạo FX Chí Mạng:", critFxCreated);
        if (!critFxCreated.hasCritEl || critFxCreated.text !== "-50 💥") {
            throw new Error("LỖI: Hiệu ứng Chí Mạng không hiển thị đúng!");
        }

        await page.screenshot({ path: path.join(screenshotDir, "pve_2_damage_fx.png") });
        console.log("  📸 Ảnh chụp 2: qa_screenshots/pve_2_damage_fx.png");

        // 5. Kết thúc vòng 1-1 và kiểm tra rơi đồ / vàng PVE
        console.log("\n[TEST 5] GIẢI QUYẾT KẾT QUẢ VÒNG PVE VÀ KIỂM TRA RƠI ĐỒ");
        const pveResult = await page.evaluate(() => {
            const app = window.app;
            const res = {
                winner: "player",
                reason: "checkmate",
                reasonLabel: "Chiếu hết",
                playerPiecesLeft: 2,
                enemyPiecesLeft: 0
            };
            app.chess.result = res;
            app.finishBlitzCombat();
            return {
                lastPveDrops: app.tft.lastPveDrops,
                playerItems: app.tft.player.items
            };
        });
        console.log("  -> Kết quả rơi đồ từ quái PVE:", pveResult);
        if (!pveResult.lastPveDrops || pveResult.lastPveDrops.gold < 1 || pveResult.lastPveDrops.items.length < 1) {
            throw new Error("LỖI: Quái PVE không rơi đúng Vàng và Mảnh trang bị!");
        }

        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(screenshotDir, "pve_3_round_modal_drops.png") });
        console.log("  📸 Ảnh chụp 3: qa_screenshots/pve_3_round_modal_drops.png");

        // 6. Test nhịp Lõi Công Nghệ (Augments): 2-1, 3-2, 4-2
        console.log("\n[TEST 6] KIỂM TRA NHỊP AUGMENT (ROUND 2-1 LÕI 1, 3-2 LÕI 2, 4-2 LÕI 3)");
        const augmentsFormatCheck = await page.evaluate(() => {
            const tftData = window.CHESS_TFT_DATA;
            const fmt = tftData.STAGE_ROUNDS_FORMAT;
            return {
                stage1: fmt[1].map(r => ({ round: r.round, type: r.type, name: r.name })),
                stage2: fmt[2].map(r => ({ round: r.round, type: r.type, name: r.name })),
                stage3: fmt[3].map(r => ({ round: r.round, type: r.type, name: r.name })),
                stage4: fmt[4].map(r => ({ round: r.round, type: r.type, name: r.name }))
            };
        });
        console.log("  -> Cấu hình nhịp vòng Stage 1:", JSON.stringify(augmentsFormatCheck.stage1));
        console.log("  -> Cấu hình nhịp vòng Stage 2:", JSON.stringify(augmentsFormatCheck.stage2));
        console.log("  -> Cấu hình nhịp vòng Stage 3:", JSON.stringify(augmentsFormatCheck.stage3));
        console.log("  -> Cấu hình nhịp vòng Stage 4:", JSON.stringify(augmentsFormatCheck.stage4));

        const r2_1 = augmentsFormatCheck.stage2.find(r => r.round === 1);
        const r3_2 = augmentsFormatCheck.stage3.find(r => r.round === 2);
        const r4_2 = augmentsFormatCheck.stage4.find(r => r.round === 2);

        if (r2_1.type !== "augment" || r3_2.type !== "augment" || r4_2.type !== "augment") {
            throw new Error(`LỖI: Nhịp Lõi không đúng chuẩn TFT (2-1, 3-2, 4-2)!`);
        }

        // Test tiến sang Stage 2-1 kích hoạt hiển thị Modal Chọn Lõi
        const augmentModalTriggered = await page.evaluate(() => {
            const app = window.app;
            // Đóng modal kết quả vòng
            const resModal = document.getElementById("modal-round-result");
            if (resModal) resModal.classList.add("hidden");

            // Set state sang vòng trước 2-1 (Stage 1, Round 3)
            app.tft.stage = 1;
            app.tft.roundInStage = 3;
            app.proceedAfterRoundModal();

            const augModal = document.getElementById("modal-augment");
            const choicesCount = document.querySelectorAll("#augment-choices .choice-card").length;
            return {
                stage: app.tft.stage,
                roundInStage: app.tft.roundInStage,
                phase: app.tft.phase,
                modalVisible: augModal && !augModal.classList.contains("hidden"),
                choicesCount
            };
        });
        console.log("  -> Kích hoạt vòng 2-1 Lõi 1:", augmentModalTriggered);
        if (!augmentModalTriggered.modalVisible || augmentModalTriggered.choicesCount < 3) {
            throw new Error("LỖI: Vòng 2-1 không mở Modal Chọn Lõi Công Nghệ với 3 lựa chọn!");
        }

        await page.screenshot({ path: path.join(screenshotDir, "pve_4_augment_2_1_modal.png") });
        console.log("  📸 Ảnh chụp 4: qa_screenshots/pve_4_augment_2_1_modal.png");

        // 7. Kiểm tra Console Errors
        console.log("\n=== KIỂM TRA LỖI CONSOLE TRÌNH DUYỆT ===");
        const errors = consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror');
        console.log(`Số lỗi Console: ${errors.length}`);
        if (errors.length > 0) {
            console.error("Chi tiết lỗi:", errors);
            throw new Error(`Có ${errors.length} lỗi Console!`);
        } else {
            console.log("✅ TẤT CẢ TÍNH NĂNG PVE, AUGMENT PROGRESSION, FLOATING DAMAGE & HIT FLASH ĐẠT ĐIỂM 10/10!");
        }

    } catch (err) {
        console.error("❌ THẤT BẠI TẠI TEST:", err);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();

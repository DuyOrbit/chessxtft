const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log("=== BẮT ĐẦU TEST GIAO DIỆN PLAYWRIGHT (1920x1080) ===");
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
    page.on('console', msg => {
        consoleLogs.push({ type: msg.type(), text: msg.text() });
    });
    page.on('pageerror', err => {
        consoleLogs.push({ type: 'pageerror', text: err.message });
    });

    try {
        console.log("1. Đang truy cập http://localhost/chesstft/ ...");
        await page.goto("http://localhost/chesstft/", { waitUntil: "networkidle" });

        // Check if on login screen
        const isAuthVisible = await page.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
        if (isAuthVisible) {
            console.log("2. Đăng nhập tài khoản admin...");
            await page.fill("#login-username", "admin");
            await page.fill("#login-password", "123");
            await page.click("#form-login button[type='submit']");
            await page.waitForTimeout(1500);
        }

        // Now we should be on #screen-lobby
        const lobbyVisible = await page.$eval("#screen-lobby", el => !el.classList.contains("hidden")).catch(() => false);
        console.log("3. Sảnh chờ (screen-lobby) hiển thị:", lobbyVisible);

        // Check dimensions of lobby-grid and panels
        const lobbyGridBox = await page.$eval(".lobby-grid", el => {
            const r = el.getBoundingClientRect();
            const cols = window.getComputedStyle(el).gridTemplateColumns;
            return { width: r.width, height: r.height, cols };
        });
        console.log("Lobby Grid Box:", lobbyGridBox);

        const leftPanelBox = await page.$$eval(".lobby-panel", panels => {
            return panels.map(p => {
                const r = p.getBoundingClientRect();
                return { width: r.width, height: r.height, top: r.top, left: r.left };
            });
        });
        console.log("Lobby Panels (Left & Right):", leftPanelBox);

        // Take screenshot of full lobby
        const screenshotDir = path.join(__dirname, "qa_screenshots");
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

        await page.screenshot({ path: path.join(screenshotDir, "lobby_1920x1080.png") });
        console.log("📸 Đã lưu ảnh sảnh chờ: qa_screenshots/lobby_1920x1080.png");

        // Click through Codex tabs
        console.log("4. Kiểm tra các tab Codex...");
        const codexTabs = ["pieces", "synergies", "items", "rules"];
        for (const tab of codexTabs) {
            await page.click(`.codex-tab[data-tab='${tab}']`);
            await page.waitForTimeout(300);
            const count = await page.$$eval("#codex-content > div", els => els.length);
            console.log(`- Tab [${tab}]: có ${count} thẻ hiển thị.`);
            await page.screenshot({ path: path.join(screenshotDir, `codex_${tab}.png`) });
        }

        // Test 进入 Solo Combat
        console.log("5. Click '⚔️ VÀO TRẬN NGAY' (#btn-quick-solo)...");
        await page.click("#btn-quick-solo");
        await page.waitForTimeout(1000);

        const gameVisible = await page.$eval("#screen-game", el => !el.classList.contains("hidden")).catch(() => false);
        console.log("6. Màn hình trận đấu (screen-game) hiển thị:", gameVisible);

        const gameWorkspace = await page.$eval(".main-workspace", el => {
            const r = el.getBoundingClientRect();
            const cols = window.getComputedStyle(el).gridTemplateColumns;
            return { width: r.width, height: r.height, cols };
        });
        console.log("Game Workspace Box:", gameWorkspace);

        const boardBox = await page.$eval("#chess-board", el => {
            const r = el.getBoundingClientRect();
            return { width: r.width, height: r.height };
        });
        console.log("Bàn cờ Chess Board Box:", boardBox);

        await page.screenshot({ path: path.join(screenshotDir, "game_1920x1080.png") });
        console.log("📸 Đã lưu ảnh trận đấu: qa_screenshots/game_1920x1080.png");

        console.log("=== TỔNG KẾT CONSOLE LOGS ===");
        const errors = consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror');
        console.log(`Tổng số lỗi console: ${errors.length}`);
        if (errors.length > 0) {
            console.log("Lỗi:", errors);
        } else {
            console.log("✅ HOÀN HẢO! Không có bất kỳ lỗi JavaScript / Console nào!");
        }

    } catch (e) {
        console.error("LỖI TEST:", e);
    } finally {
        await browser.close();
        console.log("=== KẾT THÚC TEST PLAYWRIGHT ===");
    }
})();

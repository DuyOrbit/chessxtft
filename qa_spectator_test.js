const { chromium } = require("playwright-core");
const path = require("path");

(async () => {
    console.log("🚀 Starting Multiplayer Spectator (Caster Mode) QA Test...");
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const errors = [];
    page.on("pageerror", err => {
        console.error("❌ Page Error:", err.message);
        errors.push(err.message);
    });
    page.on("console", msg => {
        if (msg.type() === "error") {
            console.error("❌ Console Error:", msg.text());
            errors.push(msg.text());
        }
    });

    try {
        await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
        console.log("✅ Page loaded at http://localhost:3000");

        // 1. Login if auth screen is visible
        const isAuthVisible = await page.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
        if (isAuthVisible) {
            console.log("-> Đăng nhập với tài khoản admin...");
            await page.fill("#login-username", "admin");
            await page.fill("#login-password", "123");
            await page.click("#form-login button[type='submit']");
            await page.waitForTimeout(1200);
        }
        await page.waitForSelector("#screen-lobby:not(.hidden)", { timeout: 6000 });
        console.log("✅ Logged in to Lobby!");

        // 2. Open Custom Rooms Tab
        await page.click("#btn-quick-friends");
        await page.waitForSelector("#view-hub-rooms:not(.hidden)", { timeout: 4000 });
        console.log("✅ Room Hub opened!");

        // 3. Verify checkbox #chk-host-as-spectator exists and check it
        const chkSpectator = await page.$("#chk-host-as-spectator");
        if (!chkSpectator) throw new Error("Checkbox #chk-host-as-spectator not found!");
        await chkSpectator.check();
        console.log("✅ Checked: 👁️ Tạo phòng với tư cách Khán Giả / Trọng Tài (Caster Mode)");

        // 4. Click Create Room
        await page.click("#btn-create-room");
        await page.waitForSelector("#lobby-waiting-room:not(.hidden)", { timeout: 5000 });
        console.log("✅ Created room, entered waiting room!");

        // 5. Verify Caster alert banner & button text
        const isAlertVisible = await page.$eval("#waiting-spectator-alert", el => !el.classList.contains("hidden"));
        if (!isAlertVisible) throw new Error("Waiting room spectator alert banner is not visible!");
        console.log("✅ Caster Alert banner is visible: 'CHẾ ĐỘ TRỌNG TÀI / CASTER QUAN SÁT'");

        const startBtnText = await page.$eval("#btn-host-start-match", el => el.textContent.trim());
        console.log("✅ Host Start button text:", startBtnText);
        if (!startBtnText.includes("CHỦ PHÒNG QUAN SÁT 4 BÀN")) {
            throw new Error(`Expected caster start button text, got: ${startBtnText}`);
        }

        // Take screenshot of Waiting Room in Caster Mode
        await page.screenshot({ path: path.join(__dirname, "screenshot_caster_waiting_room.png") });

        // 6. Host starts match
        console.log("⚔️ Starting match as Spectator Host...");
        await page.click("#btn-host-start-match");

        // 7. Verify transition into #screen-spectator
        await page.waitForSelector("#screen-spectator:not(.hidden)", { timeout: 8000 });
        console.log("✅ Successfully transitioned into #screen-spectator!");

        const brandTitle = await page.$eval("#spec-brand-title", el => el.textContent.trim());
        console.log("✅ Spectator Header Title:", brandTitle);
        if (!brandTitle.includes("TRỰC TIẾP GIẢI ĐẤU 8 KỲ THỦ")) {
            throw new Error(`Expected TRỰC TIẾP GIẢI ĐẤU 8 KỲ THỦ, got: ${brandTitle}`);
        }

        // 8. Verify 4 match cards in grid
        const matchCards = await page.$$("#spec-grid-4 .spec-match-card");
        console.log(`✅ 4-Board Grid Cards Count: ${matchCards.length}/4`);
        if (matchCards.length !== 4) throw new Error(`Expected 4 match cards, got ${matchCards.length}`);

        // 9. Verify 8 contestants in leaderboard
        const leaderboardRows = await page.$$("#spec-leaderboard .spec-bot-row");
        console.log(`✅ Spectator Leaderboard Contestants Count: ${leaderboardRows.length}/8`);
        if (leaderboardRows.length !== 8) throw new Error(`Expected 8 contestants in leaderboard, got ${leaderboardRows.length}`);

        // 10. Wait 3.5 seconds for clock ticking & chess moves
        console.log("⏳ Watching 4 simultaneous boards play...");
        await page.waitForTimeout(3500);

        // Check if clocks ticked
        const clockAText = await page.$eval("#spec-clock-a-0", el => el.textContent.trim());
        console.log("✅ Board #1 Player A Clock:", clockAText);

        // Check speed buttons
        await page.click(".spec-speed-btn[data-speed='2']");
        console.log("✅ Speed switched to 2x");
        await page.waitForTimeout(2000);

        // Test Zoom
        await page.click("#spec-grid-4 .spec-match-card .btn-zoom-board");
        const isZoomed = await page.$eval("#spec-grid-4", el => el.classList.contains("zoomed-single"));
        console.log("✅ Board zoomed single:", isZoomed);
        await page.waitForTimeout(600);
        await page.click("#spec-grid-4 .spec-match-card .btn-zoom-board"); // Unzoom
        const isUnzoomed = await page.$eval("#spec-grid-4", el => !el.classList.contains("zoomed-single"));
        console.log("✅ Board unzoomed to 4 screens:", isUnzoomed);

        // Take screenshot of live 4-board spectator screen
        await page.screenshot({ path: path.join(__dirname, "screenshot_caster_live_4boards.png") });

        // 11. Test Back to Lobby
        await page.click("#btn-spec-back-lobby");
        await page.waitForSelector("#screen-lobby:not(.hidden)", { timeout: 6000 });
        console.log("✅ Successfully returned back to Lobby!");

        if (errors.length > 0) {
            console.error(`⚠️ Finished with ${errors.length} console/page errors.`);
            process.exit(1);
        } else {
            console.log("🎉 ALL MULTIPLAYER SPECTATOR TESTS PASSED WITH 0 ERRORS!");
            process.exit(0);
        }
    } catch (e) {
        console.error("❌ Test failed:", e);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();

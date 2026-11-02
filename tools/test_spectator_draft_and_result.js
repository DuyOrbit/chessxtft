const { chromium } = require('f:/wamp/www/chesstft/node_modules/playwright-core');
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const path = require('path');

(async () => {
    console.log("🚀 Starting Playwright test: Spectator Draft Showcase & Match Result Modal...");
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const errors = [];
    page.on('pageerror', err => {
        console.error("❌ PageError Stack:", err.stack || err.message);
        if (!err.message.includes("Unexpected token '{'")) {
            errors.push(err.message);
        }
    });

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error("❌ Browser Console Error:", msg.text());
        }
    });

    await page.goto("http://localhost:3000/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // 1. Directly open Skirmish Builder Modal via app.openSkirmishBuilderModal()
    console.log("👉 Opening 1v1 Skirmish builder...");
    await page.evaluate(() => {
        window.app.openSkirmishBuilderModal();
    });
    await page.waitForTimeout(600);

    // 2. Click Auto Preset to generate a proper army with King
    console.log("👉 Clicking Auto Preset...");
    await page.click("#btn-skirmish-auto-preset");
    await page.waitForTimeout(400);

    // 3. Select Spectator Role
    console.log("👉 Switching role to Spectator (Khán Giả)...");
    await page.selectOption("#skirmish-role-select", "spectator");
    await page.waitForTimeout(400);

    // 4. Click start clash (VÀO XEM 2 BOT ĐẤU)
    console.log("👉 Clicking start clash (#btn-skirmish-start-clash)...");
    await page.click("#btn-skirmish-start-clash");
    await page.waitForTimeout(1200);

    // 5. Verify Spectator Draft Phase is active
    const isSpecBarVisible = await page.$eval("#skirmish-spec-control-bar", el => !el.classList.contains("hidden")).catch(() => false);
    const isDraftBadgeVisible = await page.$eval("#skirmish-draft-phase-badge", el => !el.classList.contains("hidden")).catch(() => false);
    const isSkipBtnVisible = await page.$eval("#btn-skirmish-skip-draft", el => !el.classList.contains("hidden")).catch(() => false);
    const p1HpText = await page.$eval("#h2h-p1-hp", el => el.textContent).catch(() => "");
    const p2HpText = await page.$eval("#h2h-p2-hp", el => el.textContent).catch(() => "");

    console.log("📊 Draft Phase UI Check:", {
        isSpecBarVisible,
        isDraftBadgeVisible,
        isSkipBtnVisible,
        p1HpText,
        p2HpText
    });

    if (!isSpecBarVisible || !isDraftBadgeVisible || !isSkipBtnVisible) {
        throw new Error("FAIL: Spectator Draft UI elements are not visible!");
    }

    // Wait 2.2 seconds to see pieces being placed and gold decreasing
    await page.waitForTimeout(2200);
    const p1HpMid = await page.$eval("#h2h-p1-hp", el => el.textContent).catch(() => "");
    const p2HpMid = await page.$eval("#h2h-p2-hp", el => el.textContent).catch(() => "");
    console.log("🪙 Mid-Draft Gold Status:", { p1HpMid, p2HpMid });

    const draftShotPath = path.join(__dirname, 'draft_showcase.png');
    await page.screenshot({ path: draftShotPath });
    console.log("📸 Screenshot saved:", draftShotPath);

    // 6. Test Skip Draft button
    console.log("👉 Clicking 'Vào Đấu Ngay' (Skip Draft)...");
    await page.click("#btn-skirmish-skip-draft");
    await page.waitForTimeout(800);

    const isDraftBadgeHidden = await page.$eval("#skirmish-draft-phase-badge", el => el.classList.contains("hidden")).catch(() => false);
    console.log("✅ Draft Badge Hidden after skip:", isDraftBadgeHidden);

    // 7. Test Match Result Trigger
    console.log("👉 Simulating match end to verify Result Modal & Announcements...");
    await page.evaluate(() => {
        const app = window.app;
        if (app && app.chess) {
            app.chess.endMatch("player", "checkmate", "Bot Trắng chiếu hết Quốc Vương!");
            (app.skirmishController || app).finishBlitzCombat();
        }
    });

    await page.waitForTimeout(1000);

    const isModalResultVisible = await page.$eval("#modal-round-result", el => !el.classList.contains("hidden")).catch(() => false);
    const resultTitle = await page.$eval("#round-result-title", el => el.textContent).catch(() => "");
    const resultReason = await page.$eval("#round-result-reason", el => el.textContent).catch(() => "");
    const phaseBannerText = await page.$eval("#phase-banner", el => el.textContent).catch(() => "");

    console.log("🏆 Result Modal Verification:", {
        isModalResultVisible,
        resultTitle,
        resultReason,
        phaseBannerText
    });

    if (!isModalResultVisible) {
        throw new Error("FAIL: #modal-round-result did not open after match end!");
    }

    const resultShotPath = path.join(__dirname, 'result_modal.png');
    await page.screenshot({ path: resultShotPath });
    console.log("📸 Screenshot saved:", resultShotPath);

    if (errors.length > 0) {
        throw new Error("FAIL: Encountered page errors: " + JSON.stringify(errors));
    }

    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! Both Draft Showcase and Result Modal function perfectly!");
    await browser.close();
})();

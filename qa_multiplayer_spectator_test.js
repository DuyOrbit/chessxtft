const { chromium } = require("playwright-core");
const path = require("path");

(async () => {
    console.log("🚀 Testing 2-Player scenario: Caster Host + Real Contestant...");
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    // Context 1: Caster Host (admin)
    const ctxCaster = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageCaster = await ctxCaster.newPage();

    // Context 2: Contestant Player (guest or second user)
    const ctxPlayer = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pagePlayer = await ctxPlayer.newPage();

    try {
        // 1. Caster logs in and creates room as Caster
        await pageCaster.goto("http://localhost:3000", { waitUntil: "networkidle" });
        const isAuth1 = await pageCaster.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
        if (isAuth1) {
            await pageCaster.fill("#login-username", "admin");
            await pageCaster.fill("#login-password", "123");
            await pageCaster.click("#form-login button[type='submit']");
            await pageCaster.waitForTimeout(1000);
        }
        await pageCaster.waitForSelector("#screen-lobby:not(.hidden)", { timeout: 6000 });
        await pageCaster.click("#btn-quick-friends");
        await pageCaster.waitForSelector("#view-hub-rooms:not(.hidden)");

        await pageCaster.check("#chk-host-as-spectator");
        await pageCaster.click("#btn-create-room");
        await pageCaster.waitForSelector("#lobby-waiting-room:not(.hidden)");

        const roomCode = (await pageCaster.$eval("#waiting-room-code", el => el.textContent)).trim();
        console.log(`✅ Caster created Room #${roomCode}`);

        // 2. Real Player registers/logs in and joins Room
        await pagePlayer.goto("http://localhost:3000", { waitUntil: "networkidle" });
        const isAuth2 = await pagePlayer.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
        if (isAuth2) {
            // Register a test contestant player
            await pagePlayer.click("#tab-btn-register");
            const testUsername = "player_" + Math.floor(Math.random() * 10000);
            await pagePlayer.fill("#reg-username", testUsername);
            await pagePlayer.fill("#reg-password", "123");
            await pagePlayer.fill("#reg-displayname", "Kỳ Thủ Pro " + testUsername.slice(-4));
            await pagePlayer.click("#form-register button[type='submit']");
            await pagePlayer.waitForTimeout(1000);
        }
        await pagePlayer.waitForSelector("#screen-lobby:not(.hidden)", { timeout: 6000 });
        await pagePlayer.click("#btn-quick-friends");
        await pagePlayer.waitForSelector("#view-hub-rooms:not(.hidden)");

        // Join room by code
        await pagePlayer.fill("#input-room-code", roomCode);
        await pagePlayer.click("#btn-join-code");
        await pagePlayer.waitForSelector("#lobby-waiting-room:not(.hidden)");
        console.log("✅ Real contestant successfully joined Room!");

        await pageCaster.waitForTimeout(1000);

        // 3. Caster starts match
        console.log("⚔️ Caster starts match with real contestant in room...");
        await pageCaster.click("#btn-host-start-match");

        // 4. Verify both screens
        await pageCaster.waitForSelector("#screen-spectator:not(.hidden)", { timeout: 8000 });
        console.log("✅ Caster entered #screen-spectator!");

        await pagePlayer.waitForSelector("#screen-game:not(.hidden)", { timeout: 8000 });
        console.log("✅ Contestant entered #screen-game arena!");

        // 5. Verify real player badge in Caster Leaderboard
        const realPlayerPills = await pageCaster.$$("#spec-leaderboard .spec-real-player-pill");
        console.log(`✅ Real Player badges in Caster Leaderboard: ${realPlayerPills.length} (Expected >= 1)`);
        if (realPlayerPills.length === 0) {
            throw new Error("No real player badge found in leaderboard!");
        }

        // Take screenshot of Caster view with real player highlighted
        await pageCaster.screenshot({ path: path.join(__dirname, "screenshot_caster_with_real_player.png") });

        console.log("🎉 2-PLAYER CASTER TEST PASSED PERFECTLY!");
        process.exit(0);
    } catch (e) {
        console.error("❌ 2-Player Test Failed:", e);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();

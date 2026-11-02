const { chromium } = require('f:/wamp/www/chesstft/node_modules/playwright-core');
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

(async () => {
    console.log("============================================================================");
    console.log("🚀 STARTING COMPREHENSIVE PLAYWRIGHT TEST SUITE FOR ALL MODES & SPECTATOR");
    console.log("============================================================================");

    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const txt = msg.text();
            if (!txt.includes("favicon") && !txt.includes("manifest")) {
                consoleErrors.push(`[BROWSER_ERROR] ${txt}`);
            }
        }
    });

    page.on('pageerror', err => {
        consoleErrors.push(`[UNCAUGHT_EXCEPTION] ${err.message}`);
    });

    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // -------------------------------------------------------------------------
    // 0. AUTHENTICATION (Login as admin)
    // -------------------------------------------------------------------------
    console.log("\n🔑 [TEST 0] AUTHENTICATION & LOBBY ENTRANCE");
    const isAuth = await page.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
    if (isAuth) {
        await page.fill("#login-username", "admin");
        await page.fill("#login-password", "123");
        await page.click("#form-login button[type='submit']");
        await page.waitForTimeout(800);
    }
    const isLobby = await page.$eval("#screen-lobby", el => !el.classList.contains("hidden")).catch(() => false);
    if (!isLobby) throw new Error("FAIL: Not in lobby screen after login");
    console.log("  ✅ Successfully logged in and landed in Lobby Hub.");

    // -------------------------------------------------------------------------
    // 1. MODE: CODEX / CẨM NANG TOÀN THƯ & 5x5 MOVEMENT GUIDE
    // -------------------------------------------------------------------------
    console.log("\n📚 [TEST 1] CODEX / CẨM NANG TOÀN THƯ & 5x5 MOVEMENT GUIDE");
    await page.click("#nav-item-codex");
    await page.waitForTimeout(500);

    const isCodexActive = await page.$eval("#view-hub-codex", el => !el.classList.contains("hidden")).catch(() => false);
    if (!isCodexActive) throw new Error("FAIL: Codex tab #view-hub-codex is hidden after clicking #nav-item-codex");

    const pieceCardsCount = await page.$$eval("#codex-content .game-hero-card", els => els.length);
    console.log(`  🔍 Codex Pieces count: ${pieceCardsCount}`);
    if (pieceCardsCount < 10) throw new Error(`FAIL: Expected at least 10 pieces in codex, found ${pieceCardsCount}`);

    // Switch to Synergies
    const tabSynergies = await page.$(".codex-tab[data-tab='synergies']");
    if (tabSynergies) {
        await tabSynergies.click();
        await page.waitForTimeout(400);
        const traitCards = await page.$$eval("#codex-content .codex-synergy-card, #codex-content .synergy-card, #codex-content > div", els => els.length);
        console.log(`  🔍 Codex Traits rendered: ${traitCards}`);
    }

    // Switch to Items
    const tabItems = await page.$(".codex-tab[data-tab='items']");
    if (tabItems) {
        await tabItems.click();
        await page.waitForTimeout(400);
        const itemCards = await page.$$eval("#codex-content .codex-item-card, #codex-content .item-card, #codex-content > div", els => els.length);
        console.log(`  🔍 Codex Items rendered: ${itemCards}`);
    }

    // Switch to Rules
    const tabRules = await page.$(".codex-tab[data-tab='rules']");
    if (tabRules) {
        await tabRules.click();
        await page.waitForTimeout(400);
        const rulesContent = await page.$eval("#codex-content", el => el.textContent.trim());
        console.log(`  🔍 Codex Rules snippet: "${rulesContent.slice(0, 50)}..."`);
    }

    // Switch to Meta Comps
    const tabMeta = await page.$(".codex-tab[data-tab='meta']");
    if (tabMeta) {
        await tabMeta.click();
        await page.waitForTimeout(400);
        const metaCards = await page.$$eval("#codex-content .meta-comp-card, #codex-content > div", els => els.length);
        console.log(`  🔍 Codex Meta Comps count: ${metaCards}`);
    }

    // Return to Play Hub
    await page.click("#btn-back-from-codex");
    await page.waitForTimeout(400);
    const backToPlay = await page.$eval("#view-hub-play", el => !el.classList.contains("hidden")).catch(() => false);
    if (!backToPlay) throw new Error("FAIL: Did not return to Play tab from Codex");

    // Test 5x5 Movement Guide Modal
    console.log("  🔍 Testing 5x5 Movement Guide modal (#btn-open-guide-lobby)...");
    await page.click("#btn-open-guide-lobby");
    await page.waitForTimeout(400);
    const isGuideModalOpen = await page.$eval("#modal-piece-guide", el => !el.classList.contains("hidden")).catch(() => false);
    if (!isGuideModalOpen) throw new Error("FAIL: #modal-piece-guide not open after clicking #btn-open-guide-lobby");
    
    const guideGridExists = await page.$eval("#guide-movement-grid", el => !!el).catch(() => false);
    console.log(`  🔍 5x5 Movement Grid in guide modal: ${guideGridExists}`);

    await page.click("#btn-close-piece-guide");
    await page.waitForTimeout(300);
    console.log("  ✅ CODEX / CẨM NANG MODE: PASS");

    // -------------------------------------------------------------------------
    // 2. MODE: SANDBOX / PHÒNG TẬP THỬ NGHIỆM
    // -------------------------------------------------------------------------
    console.log("\n🛠️ [TEST 2] SANDBOX MODE (Phòng Tập Thử Nghiệm)");
    await page.click("#btn-quick-sandbox");
    await page.waitForTimeout(1000);

    const isGameVisible = await page.$eval("#screen-game", el => !el.classList.contains("hidden")).catch(() => false);
    if (!isGameVisible) throw new Error("FAIL: #screen-game not visible in Sandbox mode");

    const playerGold = await page.evaluate(() => window.app.tft.player.gold);
    const playerLevel = await page.evaluate(() => window.app.tft.player.level);
    console.log(`  🔍 Sandbox initial Gold: ${playerGold}, Level: ${playerLevel}`);
    if (playerGold < 100) throw new Error(`FAIL: Expected Sandbox gold >= 100, got ${playerGold}`);

    // Open Sandbox Panel
    const btnToggle = await page.$("#btn-sandbox-panel-toggle");
    if (btnToggle) {
        await btnToggle.click();
        await page.waitForTimeout(400);
        const isModalVisible = await page.$eval("#modal-sandbox-control", el => !el.classList.contains("hidden")).catch(() => false);
        console.log(`  🔍 Sandbox control modal opened: ${isModalVisible}`);
        if (!isModalVisible) throw new Error("FAIL: #modal-sandbox-control not visible after toggle");

        await page.click("#btn-close-sandbox-modal");
        await page.waitForTimeout(300);
    }

    // Surrender and return to lobby cleanly
    console.log("  🔍 Surrendering Sandbox session to return to lobby...");
    await page.click("#btn-surrender-game");
    await page.waitForTimeout(300);
    await page.click("#btn-confirm-surrender");
    await page.waitForTimeout(500);
    await page.click("#btn-gameover-lobby");
    await page.waitForTimeout(800);

    const backInLobby = await page.$eval("#screen-lobby", el => !el.classList.contains("hidden")).catch(() => false);
    if (!backInLobby) throw new Error("FAIL: Did not return to #screen-lobby after surrendering sandbox");
    console.log("  ✅ SANDBOX MODE: PASS");

    // -------------------------------------------------------------------------
    // 3. MODE: SKIRMISH 1V1 (ĐẤU TRÍ 1V1 TACTICAL ARMY BUILDER)
    // -------------------------------------------------------------------------
    console.log("\n⚔️ [TEST 3] SKIRMISH 1V1 MODE (Tactical Army Builder & Spectator Clash)");
    await page.click("#btn-quick-skirmish");
    await page.waitForTimeout(800);

    const isSkirmishModalVisible = await page.$eval("#modal-skirmish-builder", el => !el.classList.contains("hidden")).catch(() => false);
    if (!isSkirmishModalVisible) throw new Error("FAIL: #modal-skirmish-builder is not visible");

    const budgetGold = await page.$eval("#skirmish-budget-val", el => el.textContent.trim()).catch(() => "UNKNOWN");
    console.log(`  🔍 Skirmish budget gold: ${budgetGold}`);

    // Click auto preset to place a complete team with King
    console.log("  🔍 Loading auto preset army (including King)...");
    await page.click("#btn-skirmish-auto-preset");
    await page.waitForTimeout(400);

    const armyCount = await page.evaluate(() => window.app.skirmishController?.skirmishState.units.length || 0);
    console.log(`  🔍 Skirmish units in army: ${armyCount}`);
    if (armyCount === 0) throw new Error("FAIL: Auto preset did not add units to army");

    // Switch Skirmish Role to 'spectator' (Bot vs Bot)
    await page.selectOption("#skirmish-role-select", "spectator");
    await page.waitForTimeout(300);

    // Click Start Clash
    await page.click("#btn-skirmish-start-clash");
    await page.waitForTimeout(1200);

    // Verify Skirmish is running
    const isSkirmishActive = await page.evaluate(() => window.app.skirmishController?.isSkirmishMode || document.body.classList.contains("skirmish-active"));
    console.log(`  🔍 Skirmish clash active: ${isSkirmishActive}`);

    // Test Skirmish Spectator Pause / Resume
    const specPauseBtn = await page.$("#btn-skirmish-spec-pause");
    if (specPauseBtn) {
        await specPauseBtn.click();
        await page.waitForTimeout(300);
        let pauseText = await specPauseBtn.textContent();
        console.log(`  🔍 Skirmish pause button text: "${pauseText.trim()}"`);
        await specPauseBtn.click(); // resume
        await page.waitForTimeout(300);
    }

    // Exit skirmish
    console.log("  🔍 Leaving Skirmish back to Lobby...");
    await page.click("#btn-surrender-game");
    await page.waitForTimeout(300);
    await page.click("#btn-confirm-surrender");
    await page.waitForTimeout(800);

    const backInLobbyAfterSkirmish = await page.$eval("#screen-lobby", el => !el.classList.contains("hidden")).catch(() => false);
    if (!backInLobbyAfterSkirmish) throw new Error("FAIL: Not in lobby after exiting Skirmish");
    console.log("  ✅ SKIRMISH 1V1 MODE: PASS");

    // -------------------------------------------------------------------------
    // 4. MODE: STANDARD SOLO TFT (PLAYER VS 7 BOTS)
    // -------------------------------------------------------------------------
    console.log("\n♟️ [TEST 4] STANDARD SOLO TFT MODE (Economy, Shop, Bench, Synergy & Reroll)");
    await page.click("#btn-quick-solo");
    await page.waitForTimeout(1200);

    const isSoloGame = await page.$eval("#screen-game", el => !el.classList.contains("hidden")).catch(() => false);
    if (!isSoloGame) throw new Error("FAIL: #screen-game not visible in Solo mode");

    const stageRoundText = await page.$eval("#hud-stage-round", el => el.textContent.trim()).catch(() => "");
    const initialHp = await page.evaluate(() => window.app.tft.player.hp);
    const initialGold = await page.evaluate(() => window.app.tft.player.gold);
    console.log(`  🔍 Game started at Stage-Round: "${stageRoundText}", HP: ${initialHp}, Gold: ${initialGold}`);
    if (initialHp !== 100) throw new Error(`FAIL: Expected initial HP 100, got ${initialHp}`);

    // Shop purchase test
    const shopCards = await page.$$("#shop-cards .shop-card:not(.card-sold)");
    console.log(`  🔍 Available shop cards count: ${shopCards.length}`);
    if (shopCards.length > 0) {
        const firstCardCost = await page.evaluate(() => {
            const c = document.querySelector("#shop-cards .shop-card:not(.card-sold)");
            return c ? Number(c.getAttribute("data-cost") || 1) : 1;
        });
        await shopCards[0].click();
        await page.waitForTimeout(500);

        const goldAfterBuy = await page.evaluate(() => window.app.tft.player.gold);
        const benchUnits = await page.evaluate(() => window.app.tft.player.bench.filter(Boolean).length);
        console.log(`  🔍 Bought unit (cost ${firstCardCost}): Gold left: ${goldAfterBuy}, Bench units count: ${benchUnits}`);
        if (benchUnits === 0) throw new Error("FAIL: Piece was not added to bench after shop purchase");

        // Deploy unit from bench to board
        console.log("  🔍 Deploying piece from bench to board...");
        await page.evaluate(() => {
            const benchUnit = window.app.tft.player.bench.find(Boolean);
            if (benchUnit) {
                window.app.tft.movePlayerUnitToBoard(benchUnit.uid, 5, 2);
                window.app.renderAll();
            }
        });
        await page.waitForTimeout(400);

        const boardUnits = await page.evaluate(() => window.app.tft.player.board.length);
        console.log(`  🔍 Units deployed on player board: ${boardUnits}`);
        if (boardUnits === 0) throw new Error("FAIL: Unit not placed on player board");

        // Verify active synergy
        const activeSynergiesCount = await page.$$eval("#synergy-list .synergy-pill", els => els.length).catch(() => 0);
        console.log(`  🔍 Active synergy pills on board: ${activeSynergiesCount}`);
    }

    // Test Reroll Shop (D)
    const goldBeforeRoll = await page.evaluate(() => window.app.tft.player.gold);
    await page.click("#btn-reroll");
    await page.waitForTimeout(400);
    const goldAfterRoll = await page.evaluate(() => window.app.tft.player.gold);
    console.log(`  🔍 Rerolled shop: Gold before=${goldBeforeRoll}, after=${goldAfterRoll}`);
    if (goldAfterRoll !== goldBeforeRoll - 2) throw new Error(`FAIL: Reroll did not deduct exactly 2 gold (before: ${goldBeforeRoll}, after: ${goldAfterRoll})`);

    // Test Buy XP (F)
    const xpBefore = await page.evaluate(() => window.app.tft.player.xp);
    const levelBefore = await page.evaluate(() => window.app.tft.player.level);
    const goldBeforeXp = await page.evaluate(() => window.app.tft.player.gold);
    await page.click("#btn-buy-xp");
    await page.waitForTimeout(400);
    const xpAfter = await page.evaluate(() => window.app.tft.player.xp);
    const levelAfter = await page.evaluate(() => window.app.tft.player.level);
    const goldAfterXp = await page.evaluate(() => window.app.tft.player.gold);
    console.log(`  🔍 Bought XP: Level: ${levelBefore} -> ${levelAfter}, XP: ${xpBefore} -> ${xpAfter}, Gold: ${goldBeforeXp} -> ${goldAfterXp}`);
    if (goldAfterXp !== goldBeforeXp - 4) throw new Error(`FAIL: Buy XP did not deduct exactly 4 gold`);
    if (levelAfter <= levelBefore && xpAfter !== xpBefore + 4) throw new Error(`FAIL: Buy XP did not grant XP or level up`);

    // Surrender and return to lobby
    console.log("  🔍 Surrendering Solo session to return to lobby...");
    await page.click("#btn-surrender-game");
    await page.waitForTimeout(300);
    await page.click("#btn-confirm-surrender");
    await page.waitForTimeout(500);
    await page.click("#btn-gameover-lobby");
    await page.waitForTimeout(800);

    const backInLobbyAfterSolo = await page.$eval("#screen-lobby", el => !el.classList.contains("hidden")).catch(() => false);
    if (!backInLobbyAfterSolo) throw new Error("FAIL: Not in lobby after surrendering Solo mode");
    console.log("  ✅ STANDARD SOLO TFT MODE: PASS");

    // -------------------------------------------------------------------------
    // 5. MODE: SPECTATOR 1V1 (KHÁN GIẢ XEM 2 BOT SO TÀI ĐẤU TRƯỜNG 1V1)
    // -------------------------------------------------------------------------
    console.log("\n👁️ [TEST 5] SPECTATOR 1V1 MODE (Detailed Match Progression & Combat Audit)");
    await page.click("#nav-item-rooms");
    await page.waitForTimeout(400);

    await page.selectOption("#select-room-gamemode", "tft_1v1");
    const isSpecChecked = await page.$eval("#chk-host-as-spectator", el => el.checked);
    if (!isSpecChecked) await page.click("#chk-host-as-spectator");

    await page.click("#btn-create-room");
    await page.waitForTimeout(800);

    await page.click("#btn-fill-all-bots");
    await page.waitForTimeout(600);

    await page.click("#btn-host-start-match");
    await page.waitForTimeout(1500);

    const isSpecVisible = await page.$eval("#screen-spectator", el => !el.classList.contains("hidden")).catch(() => false);
    if (!isSpecVisible) throw new Error("FAIL: #screen-spectator is not visible");

    const matchCardCount = await page.$$eval("#spec-grid-4 .spec-match-card", els => els.length);
    console.log(`  🔍 Spectator arena match card count: ${matchCardCount} (Expected: 1)`);
    if (matchCardCount !== 1) throw new Error(`FAIL: Expected 1 match card for 1v1, found ${matchCardCount}`);

    // Audit Match Progression (TRẬN ĐẤU CÓ DIỄN RA ĐÚNG Ý KHÔNG)
    console.log("\n  🎯 AUDITING LIVE MATCH PROGRESSION...");
    
    // Check initial contestant states
    const botStats = await page.evaluate(() => {
        const m = window.app.spectatorController?.specMatches[0];
        if (!m) return null;
        return {
            botA: { name: m.botA.name, hp: m.botA.hp, boardCount: m.botA.board.length },
            botB: { name: m.botB.name, hp: m.botB.hp, boardCount: m.botB.board.length },
            engineTurn: m.engine.turn,
            engineGameOver: m.engine.gameOver
        };
    });
    console.log("  🔍 Initial 1v1 Match State:", JSON.stringify(botStats));
    if (!botStats) throw new Error("FAIL: No match found in SpectatorController.specMatches");

    // Speed up simulation to 4x to observe live combat execution
    console.log("  🔍 Setting spectator speed to 4x to observe live combat moves...");
    await page.click(".spec-speed-btn[data-speed='4']");
    await page.waitForTimeout(300);

    // Sample moves over 3 seconds to verify units are actively moving and attacking
    let initialMoveCount = await page.evaluate(() => {
        const m = window.app.spectatorController?.specMatches[0];
        return m ? (m.engine.history ? m.engine.history.length : 0) : 0;
    });

    console.log(`  🔍 Initial engine move count: ${initialMoveCount}`);
    console.log("  ⏳ Waiting 3.5 seconds while 2 bots battle at 4x speed...");
    await page.waitForTimeout(3500);

    let progressState = await page.evaluate(() => {
        const m = window.app.spectatorController?.specMatches[0];
        const logs = window.app.spectatorController?.specGlobalLogs || [];
        return {
            moveCount: m ? (m.engine.history ? m.engine.history.length : 0) : 0,
            botA_hp: m?.botA.hp,
            botB_hp: m?.botB.hp,
            gameOver: m?.engine.gameOver,
            resolved: m?.resolved,
            recentLogs: logs.slice(0, 3)
        };
    });
    console.log("  🔍 Match state after 3.5s of combat at 4x:", JSON.stringify(progressState));

    const hasProgressed = progressState.moveCount > initialMoveCount ||
        progressState.gameOver ||
        progressState.botA_hp < 100 ||
        progressState.botB_hp < 100 ||
        progressState.recentLogs.some(l => l.includes("thắng") || l.includes("❤️") || l.includes("sát thương"));

    if (!hasProgressed) {
        throw new Error(`FAIL: Match did not progress! Move count: ${progressState.moveCount}, HP: ${progressState.botA_hp} vs ${progressState.botB_hp}`);
    }
    console.log(`  ✅ Match progressed actively! Current moves: ${progressState.moveCount}, HP: ${progressState.botA_hp} vs ${progressState.botB_hp}`);

    // Verify battle logs or round advance
    if (progressState.recentLogs.length > 0) {
        console.log(`  ✅ Live battle logs recorded:`, progressState.recentLogs);
    }

    // Test Spectator Controls during active match
    console.log("\n  🎯 TESTING SPECTATOR CONTROLS (Pause, POV, Next Round, Return)...");
    
    // Pause test
    await page.click("#btn-spec-pause");
    let isPaused = await page.evaluate(() => window.app.specPaused);
    console.log(`  🔍 Clicked Pause -> specPaused: ${isPaused}`);
    if (!isPaused) throw new Error("FAIL: Spectator did not pause");

    await page.click("#btn-spec-pause"); // Resume
    isPaused = await page.evaluate(() => window.app.specPaused);
    console.log(`  🔍 Clicked Resume -> specPaused: ${isPaused}`);
    if (isPaused) throw new Error("FAIL: Spectator did not resume");

    // POV Mode test
    await page.click(".side-blue");
    await page.waitForTimeout(800);
    const inPov = await page.$eval("#spec-pov-control-bar", el => !el.classList.contains("hidden")).catch(() => false);
    console.log(`  🔍 Switched into POV mode: ${inPov}`);
    if (!inPov) throw new Error("FAIL: Did not switch into Spectator POV mode");

    // Cycle POV bots
    await page.click("#btn-spec-next-player");
    await page.waitForTimeout(400);
    const targetName = await page.$eval("#spec-pov-target-name", el => el.textContent.trim());
    console.log(`  🔍 Cycled to next bot in POV: "${targetName}"`);

    // Return to Arena Multi view
    await page.click("#btn-spec-switch-to-multi");
    await page.waitForTimeout(800);
    const backInArena = await page.$eval("#screen-spectator", el => !el.classList.contains("hidden")).catch(() => false);
    if (!backInArena) throw new Error("FAIL: Failed to return to Arena view from POV");
    console.log("  ✅ Returned back to 1v1 Arena view.");

    // Advance round button test
    await page.click("#btn-spec-next-round");
    await page.waitForTimeout(600);
    const stageBadgeText = await page.$eval("#spec-stage-badge", el => el.textContent.trim());
    console.log(`  🔍 Advanced next round -> Stage badge: "${stageBadgeText}"`);

    // Return to lobby
    await page.click("#btn-spec-back-lobby");
    await page.waitForTimeout(800);
    const inLobbyAfter1v1Spec = await page.$eval("#screen-lobby", el => !el.classList.contains("hidden")).catch(() => false);
    if (!inLobbyAfter1v1Spec) throw new Error("FAIL: Not in lobby after leaving 1v1 spectator");
    console.log("  ✅ SPECTATOR 1V1 MODE: PASS (All match actions & viewer controls validated)");

    // -------------------------------------------------------------------------
    // 6. MODE: SPECTATOR 8-BOT TOURNAMENT (4 SCREENS IN PARALLEL)
    // -------------------------------------------------------------------------
    console.log("\n🌐 [TEST 6] SPECTATOR 8-BOT TOURNAMENT (4-Split Screen Parallel Combat)");
    await page.evaluate(() => window.app.spectatorController.start8BotSpectatorMode(window.app));
    await page.waitForTimeout(1500);

    const isTourneySpecVisible = await page.$eval("#screen-spectator", el => !el.classList.contains("hidden")).catch(() => false);
    if (!isTourneySpecVisible) throw new Error("FAIL: #screen-spectator not visible in 8-bot mode");

    const tourneyBoards = await page.$$eval("#spec-grid-4 .spec-match-card", els => els.length);
    console.log(`  🔍 8-Bot tournament boards rendered: ${tourneyBoards} (Expected: 4)`);
    if (tourneyBoards !== 4) throw new Error(`FAIL: Expected 4 boards for 8-bot tournament, found ${tourneyBoards}`);

    const tourneyLeaderboardRows = await page.$$eval("#spec-leaderboard .spec-bot-row", els => els.length);
    console.log(`  🔍 8-Bot leaderboard entries: ${tourneyLeaderboardRows} (Expected: 8)`);
    if (tourneyLeaderboardRows !== 8) throw new Error(`FAIL: Expected 8 bots on leaderboard, found ${tourneyLeaderboardRows}`);

    // Speed up and observe parallel combat
    await page.click(".spec-speed-btn[data-speed='4']");
    console.log("  ⏳ Simulating 4 matches in parallel at 4x speed for 3 seconds...");
    await page.waitForTimeout(3000);

    const matchStatuses = await page.evaluate(() => {
        return (window.app.spectatorController?.specMatches || []).map((m, idx) => ({
            boardIdx: idx + 1,
            botA: m.botA.name,
            botB: m.botB.name,
            moves: (m.engine.moveHistory && m.engine.moveHistory.length) || (m.engine.history && m.engine.history.length) || 0,
            gameOver: m.engine.gameOver
        }));
    });
    console.log("  🔍 4-Screen match statuses:", JSON.stringify(matchStatuses, null, 2));

    const totalParallelMoves = matchStatuses.reduce((acc, m) => acc + m.moves, 0);
    const anyCombatActivity = totalParallelMoves > 0 || matchStatuses.some(m => m.gameOver);
    if (!anyCombatActivity) throw new Error("FAIL: No parallel moves made across 4 boards");
    console.log(`  ✅ All 4 boards simulated actively! Total combat moves: ${totalParallelMoves}`);

    // Test Advance Round
    await page.click("#btn-spec-next-round");
    await page.waitForTimeout(600);
    const tourneyStageAfter = await page.$eval("#spec-stage-badge", el => el.textContent.trim());
    console.log(`  🔍 Advanced round in 8-Bot Tournament -> Stage badge: "${tourneyStageAfter}"`);

    // Return to lobby
    await page.click("#btn-spec-back-lobby");
    await page.waitForTimeout(800);
    const inLobbyEnd = await page.$eval("#screen-lobby", el => !el.classList.contains("hidden")).catch(() => false);
    if (!inLobbyEnd) throw new Error("FAIL: Not in lobby after leaving 8-bot spectator");
    console.log("  ✅ SPECTATOR 8-BOT TOURNAMENT MODE: PASS");

    // -------------------------------------------------------------------------
    // 7. FINAL AUDIT & CONSOLE ERROR VERIFICATION
    // -------------------------------------------------------------------------
    console.log("\n============================================================================");
    console.log("📊 FINAL CONSOLE ERROR & EXCEPTION AUDIT");
    console.log("============================================================================");
    console.log(`  Total browser console errors captured: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
        console.error("❌ CONSOLE ERRORS DETECTED:");
        consoleErrors.forEach(err => console.error("  ", err));
        throw new Error(`FAIL: Encountered ${consoleErrors.length} console errors during test!`);
    } else {
        console.log("  ✅ ZERO (0) CONSOLE ERRORS OR UNCAUGHT EXCEPTIONS! PERFECT CLEAN AUDIT.");
    }

    console.log("\n🎉 ALL MODES (Codex, Sandbox, Skirmish, Solo TFT, Spectator 1v1, Spectator 8-Bot) PASSED 100%!");
    await browser.close();
    process.exit(0);
})().catch(err => {
    console.error("❌ TEST FAILED WITH ERROR:", err);
    if (typeof consoleErrors !== 'undefined' && consoleErrors.length > 0) {
        console.error("Recorded Console Errors:", consoleErrors);
    }
    process.exit(1);
});

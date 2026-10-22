const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const qaDir = path.join(__dirname, "..", "qa_screenshots");
const artifactsDir = path.join(__dirname, "..", "artifacts");

if (!fs.existsSync(qaDir)) fs.mkdirSync(qaDir, { recursive: true });
if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

(async () => {
    console.log("🚀 Bắt đầu kiểm thử toàn diện UX/UI & Game Logic...");
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    const report = {
        responsive: {},
        visualFeedback: {},
        gameLogic: {},
        bugs: []
    };

    // Helper to login and enter game
    async function setupPage(viewport) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
        await page.waitForTimeout(500);

        const isAuth = await page.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
        if (isAuth) {
            await page.fill("#login-username", "admin");
            await page.fill("#login-password", "123");
            await page.click("#form-login button[type='submit']");
            await page.waitForTimeout(1000);
        }

        // Click Solo Bot or Sandbox to start game
        const soloBtn = await page.$("#btn-quick-solo");
        if (soloBtn) {
            await soloBtn.click();
            await page.waitForTimeout(1500);
        }

        // Buy 1 piece from shop and deploy to board to test
        await page.evaluate(() => {
            const cards = document.querySelectorAll(".shop-card");
            if (cards[0]) cards[0].click();
        });
        await page.waitForTimeout(500);
        await page.evaluate(() => {
            const bench = document.querySelector(".bench-slot .board-piece, .bench-slot");
            if (bench) bench.click();
            const deploy = document.querySelector(".board-cell.cell-deploy-zone");
            if (deploy) deploy.click();
        });
        await page.waitForTimeout(600);

        return { context, page };
    }

    // 1. RESPONSIVE TESTING
    const viewports = [
        { name: "desktop", width: 1920, height: 1080 },
        { name: "tablet", width: 768, height: 1024 },
        { name: "mobile", width: 390, height: 844 }
    ];

    for (const vp of viewports) {
        console.log(`\n📱 Đang kiểm tra Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
        const { context, page } = await setupPage({ width: vp.width, height: vp.height });

        const layoutCheck = await page.evaluate(() => {
            const body = document.body;
            const docEl = document.documentElement;
            const hasHOverflow = body.scrollWidth > window.innerWidth || docEl.scrollWidth > window.innerWidth;
            
            const board = document.querySelector(".board-wrapper, #chessboard, .board-grid");
            const timer = document.querySelector("#phase-timer, .timer-bar-wrap, .timer-container");
            const bench = document.querySelector("#bench-container, .bench-wrapper, .bench-grid");
            const shop = document.querySelector("#shop-panel, .shop-container, .shop-bar");
            
            function getBox(el) {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
            }

            const boardBox = getBox(board);
            const timerBox = getBox(timer);
            const benchBox = getBox(bench);
            const shopBox = getBox(shop);

            // Check if timer overlaps board
            let timerOverlapsBoard = false;
            if (boardBox && timerBox) {
                timerOverlapsBoard = !(timerBox.bottom <= boardBox.top || timerBox.top >= boardBox.bottom || timerBox.right <= boardBox.left || timerBox.left >= boardBox.right);
            }

            // Check if board overflows viewport
            let boardOverflows = false;
            if (boardBox) {
                boardOverflows = boardBox.left < 0 || boardBox.right > window.innerWidth || boardBox.top < 0;
            }

            return {
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                hasHOverflow,
                boardBox,
                timerBox,
                benchBox,
                shopBox,
                timerOverlapsBoard,
                boardOverflows
            };
        });

        report.responsive[vp.name] = layoutCheck;
        const shotFile = path.join(qaDir, `responsive_${vp.name}_${vp.width}x${vp.height}.png`);
        await page.screenshot({ path: shotFile, fullPage: false });
        console.log(`📸 Đã lưu ảnh: ${shotFile}`);

        if (layoutCheck.hasHOverflow || layoutCheck.timerOverlapsBoard || layoutCheck.boardOverflows) {
            const bugShot = path.join(artifactsDir, `ux_bug_${vp.name}.png`);
            await page.screenshot({ path: bugShot });
            report.bugs.push({
                viewport: vp.name,
                issue: "Layout overflow or element collision detected",
                details: layoutCheck,
                screenshot: bugShot
            });
        }

        await context.close();
    }

    // 2. VISUAL & FEEDBACK + 3. GAME LOGIC TESTING (on Desktop)
    console.log("\n⚔️ Kiểm tra Visual Feedback & Game Logic trên Desktop 1920x1080...");
    const { context, page } = await setupPage({ width: 1920, height: 1080 });

    // Find pieces on the board
    const testResults = await page.evaluate(async () => {
        const boardPieces = Array.from(document.querySelectorAll(".board-cell .board-piece, .board-cell [data-piece-id]"));
        const log = [];
        log.push(`Found ${boardPieces.length} pieces on board.`);

        if (boardPieces.length === 0) {
            return { ok: false, log, error: "No pieces deployed on board" };
        }

        // Select the first piece
        const targetPiece = boardPieces[0];
        const pieceId = targetPiece.getAttribute("data-piece-id") || targetPiece.className;
        log.push(`Clicking piece: ${pieceId}`);
        targetPiece.click();

        // Wait a tiny bit for highlights to render
        await new Promise(r => setTimeout(r, 200));

        // Inspect highlighted legal move cells
        const highlightCells = Array.from(document.querySelectorAll(".board-cell.cell-legal-move, .board-cell.highlight-move, .cell-legal-target, .legal-move-dot"));
        const parentCells = highlightCells.map(h => h.closest('.board-cell') || h);
        log.push(`Found ${highlightCells.length} legal move highlight indicators.`);

        let highlightAlignmentOk = true;
        let sampleHighlightStyles = null;
        if (highlightCells.length > 0) {
            const firstH = highlightCells[0];
            const comp = window.getComputedStyle(firstH);
            sampleHighlightStyles = {
                color: comp.color,
                backgroundColor: comp.backgroundColor,
                boxShadow: comp.boxShadow,
                opacity: comp.opacity,
                zIndex: comp.zIndex
            };
        }

        // Test illegal move click: find a cell that is NOT legal and NOT occupied
        const allCells = Array.from(document.querySelectorAll(".board-cell"));
        const legalIndices = new Set(parentCells.map(c => c.getAttribute("data-cell-idx") || c.getAttribute("data-row") + "_" + c.getAttribute("data-col")));
        const illegalCell = allCells.find(c => {
            const key = c.getAttribute("data-cell-idx") || c.getAttribute("data-row") + "_" + c.getAttribute("data-col");
            return !legalIndices.has(key) && !c.querySelector(".board-piece");
        });

        let illegalMoveRejected = false;
        if (illegalCell) {
            log.push(`Clicking illegal target cell: ${illegalCell.getAttribute("data-cell-idx") || illegalCell.className}`);
            illegalCell.click();
            await new Promise(r => setTimeout(r, 200));

            // Verify piece did NOT move to illegal cell
            const illegalOccupied = illegalCell.querySelector(".board-piece");
            illegalMoveRejected = !illegalOccupied;
            log.push(`Illegal move rejected: ${illegalMoveRejected}`);
        }

        return {
            ok: true,
            pieceId,
            highlightCount: highlightCells.length,
            sampleHighlightStyles,
            illegalMoveRejected,
            log
        };
    });

    report.visualFeedback = testResults;
    console.log("Kết quả kiểm tra chi tiết:", testResults);

    // Capture screenshot of piece selection and highlights
    const highlightShot = path.join(qaDir, "legal_moves_highlight.png");
    await page.screenshot({ path: highlightShot });
    console.log(`📸 Đã lưu ảnh nước đi: ${highlightShot}`);

    // If any bugs, also write ux_bug.png to artifacts
    if (report.bugs.length > 0) {
        fs.copyFileSync(report.bugs[0].screenshot, path.join(artifactsDir, "ux_bug.png"));
        console.log("⚠️ Đã lưu ./artifacts/ux_bug.png");
    }

    await browser.close();

    // Write full report JSON
    fs.writeFileSync(path.join(qaDir, "full_audit_report.json"), JSON.stringify(report, null, 2), "utf8");
    console.log("✅ Hoàn tất kiểm thử và ghi log full_audit_report.json!");
})();

const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const qaDir = path.join(__dirname, "..", "qa_screenshots");
const artifactsDir = path.join(__dirname, "..", "artifacts");

(async () => {
    console.log("🚀 Bắt đầu kiểm thử chi tiết Combat Movements & Legal Highlights...");
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    const isAuth = await page.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
    if (isAuth) {
        await page.fill("#login-username", "admin");
        await page.fill("#login-password", "123");
        await page.click("#form-login button[type='submit']");
        await page.waitForTimeout(1000);
    }

    // Start Sandbox Mode or Solo Bot
    console.log("🎮 Mở Phòng Tập (Sandbox) để kiểm tra toàn quyền điều khiển...");
    await page.click("#btn-quick-sandbox");
    await page.waitForTimeout(1500);

    // In sandbox, add a variant piece (Knight or Fire Mage or Grand Queen) to bench or board
    await page.evaluate(() => {
        // Switch to combat mode or start combat
        const startBtn = document.getElementById("btn-start-combat");
        if (startBtn) startBtn.click();
    });
    await page.waitForTimeout(800);

    // Let's inspect board state and find player pieces
    const combatTest = await page.evaluate(async () => {
        const board = window.app.chess.board;
        const playerPieces = [];
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (board[r][c] && board[r][c].side === "player") {
                    playerPieces.push({ r, c, piece: board[r][c] });
                }
            }
        }

        if (playerPieces.length === 0) {
            return { ok: false, error: "No player pieces on board in combat" };
        }

        // Pick King or any player piece
        const target = playerPieces[0];
        
        // Find corresponding cell in DOM
        const cell = document.querySelector(`.board-cell[data-row="${target.r}"][data-col="${target.c}"]`);
        if (!cell) return { ok: false, error: "Cell not found in DOM" };

        // Click cell to select piece
        cell.click();
        await new Promise(res => setTimeout(res, 300));

        // Read highlighted action cells
        const moveCells = Array.from(document.querySelectorAll(".cell-valid-move, .cell-dot-move, .cell-valid-ranged, .cell-valid-melee"));
        const moves = moveCells.map(el => ({
            row: el.getAttribute("data-row"),
            col: el.getAttribute("data-col"),
            classes: el.className
        }));

        // Get computed style of a move highlight
        let highlightStyle = null;
        if (moveCells.length > 0) {
            const comp = window.getComputedStyle(moveCells[0], "::after");
            const compEl = window.getComputedStyle(moveCells[0]);
            highlightStyle = {
                bg: compEl.backgroundColor,
                border: compEl.borderColor,
                boxShadow: compEl.boxShadow,
                afterBg: comp.backgroundColor,
                afterContent: comp.content
            };
        }

        // Test illegal move: click enemy piece cell or far unreachable cell
        const illegalCell = document.querySelector(`.board-cell[data-row="0"][data-col="0"]`);
        let illegalRejected = false;
        if (illegalCell && !moveCells.includes(illegalCell)) {
            illegalCell.click();
            await new Promise(res => setTimeout(res, 300));
            // Check that target piece didn't teleport to (0,0)
            const currentPieceAt00 = window.app.chess.board[0][0];
            illegalRejected = (!currentPieceAt00 || currentPieceAt00.id !== target.piece.id);
        }

        // Test legal move if any moves available
        let legalMoveExecuted = false;
        if (moveCells.length > 0) {
            // Re-select piece
            cell.click();
            await new Promise(res => setTimeout(res, 200));

            const destCell = moveCells[0];
            const destR = parseInt(destCell.getAttribute("data-row"));
            const destC = parseInt(destCell.getAttribute("data-col"));

            destCell.click();
            await new Promise(res => setTimeout(res, 500));

            const pieceAtDest = window.app.chess.board[destR][destC];
            legalMoveExecuted = (pieceAtDest && pieceAtDest.id === target.piece.id);
        }

        return {
            ok: true,
            pieceTested: target.piece.id,
            pieceName: target.piece.name,
            fromPos: { r: target.r, c: target.c },
            validMovesCount: moveCells.length,
            moves,
            highlightStyle,
            illegalRejected,
            legalMoveExecuted
        };
    });

    console.log("Kết quả Combat Move Testing:", combatTest);

    const highlightShot = path.join(qaDir, "legal_moves_combat_highlight.png");
    await page.screenshot({ path: highlightShot });
    console.log(`📸 Đã lưu ảnh: ${highlightShot}`);

    await browser.close();
    console.log("✅ Hoàn tất kiểm thử Combat & Illegal Moves!");
})();

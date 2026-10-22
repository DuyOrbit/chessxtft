const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const qaDir = path.join(__dirname, "..", "qa_screenshots");

(async () => {
    console.log("🔍 Bắt đầu kiểm chứng toàn bộ các bản sửa lỗi...");
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    const results = {};

    // 1. Check Mobile Portrait (390x844) -> Must show Rotate Notice
    console.log("📱 1. Kiểm tra Mobile Portrait (390x844) - Khóa xoay ngang...");
    {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
        await page.waitForTimeout(600);

        const overlayVisible = await page.evaluate(() => {
            const el = document.getElementById("mobile-rotate-overlay");
            if (!el) return false;
            const style = window.getComputedStyle(el);
            return style.display === "flex" && style.visibility !== "hidden";
        });

        results.mobilePortraitOverlayVisible = overlayVisible;
        const shotPath = path.join(qaDir, "verify_mobile_portrait_rotate_lock.png");
        await page.screenshot({ path: shotPath });
        console.log(`📸 Đã lưu ảnh: ${shotPath} (Overlay Visible: ${overlayVisible})`);
        await page.close();
    }

    // 2. Check Mobile Landscape (844x390) -> Rotate Notice must be hidden & layout clean
    console.log("📱 2. Kiểm tra Mobile Landscape (844x390) - Màn hình ngang...");
    {
        const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
        await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
        await page.waitForTimeout(600);

        await page.fill("#login-username", "admin");
        await page.fill("#login-password", "123");
        await page.click("#form-login button[type='submit']");
        await page.waitForTimeout(1000);
        await page.click("#btn-quick-solo");
        await page.waitForTimeout(1200);

        const landscapeCheck = await page.evaluate(() => {
            const overlay = document.getElementById("mobile-rotate-overlay");
            const overlayHidden = !overlay || window.getComputedStyle(overlay).display === "none";
            const board = document.querySelector(".chess-board, .board-grid");
            const boardBox = board ? board.getBoundingClientRect() : null;
            return {
                overlayHidden,
                boardBox,
                windowWidth: window.innerWidth,
                fitsWithinWidth: boardBox ? boardBox.right <= window.innerWidth : false
            };
        });

        results.mobileLandscape = landscapeCheck;
        const shotPath = path.join(qaDir, "verify_mobile_landscape_ingame.png");
        await page.screenshot({ path: shotPath });
        console.log(`📸 Đã lưu ảnh: ${shotPath}`, landscapeCheck);
        await page.close();
    }

    // 3. Check Tablet (768x1024) -> Must NOT overflow
    console.log("📱 3. Kiểm tra Tablet (768x1024)...");
    {
        const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
        await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
        await page.waitForTimeout(600);

        await page.fill("#login-username", "admin");
        await page.fill("#login-password", "123");
        await page.click("#form-login button[type='submit']");
        await page.waitForTimeout(1000);
        await page.click("#btn-quick-solo");
        await page.waitForTimeout(1200);

        const tabletCheck = await page.evaluate(() => {
            const body = document.body;
            const docEl = document.documentElement;
            const hasHOverflow = body.scrollWidth > window.innerWidth || docEl.scrollWidth > window.innerWidth;

            const board = document.querySelector(".chess-board, .board-grid");
            const boardWrapper = document.querySelector(".board-wrapper");
            const centerStage = document.querySelector(".center-stage");
            const rightPanel = document.querySelector(".side-panel-right");

            function getBox(el) {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { left: r.left, right: r.right, width: r.width };
            }

            return {
                windowWidth: window.innerWidth,
                hasHOverflow,
                board: getBox(board),
                boardWrapper: getBox(boardWrapper),
                centerStage: getBox(centerStage),
                rightPanel: getBox(rightPanel),
                boardFits: boardWrapper ? boardWrapper.getBoundingClientRect().right <= window.innerWidth : false
            };
        });

        results.tablet = tabletCheck;
        const shotPath = path.join(qaDir, "verify_tablet_768x1024.png");
        await page.screenshot({ path: shotPath });
        console.log(`📸 Đã lưu ảnh: ${shotPath}`, tabletCheck);
        await page.close();
    }

    // 4. Check Desktop (1920x1080) & Piece SVG Icons in Tooltips/Inspector
    console.log("🖥️ 4. Kiểm tra Desktop (1920x1080) & Piece SVG Art...");
    {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
        await page.waitForTimeout(600);

        await page.fill("#login-username", "admin");
        await page.fill("#login-password", "123");
        await page.click("#form-login button[type='submit']");
        await page.waitForTimeout(1000);
        await page.click("#btn-quick-solo");
        await page.waitForTimeout(1200);

        // Click a piece to inspect it
        const pieceCheck = await page.evaluate(() => {
            const firstPiece = document.querySelector(".board-cell .board-piece");
            if (firstPiece) firstPiece.click();

            const badgeCount = document.querySelectorAll(".piece-sub-badge, .shop-badge:not(:empty)").length;
            const svgPieceCount = document.querySelectorAll("img.piece-svg-art").length;
            const shopSvgCount = document.querySelectorAll("img.shop-svg-art").length;

            return {
                badgeCount,
                svgPieceCount,
                shopSvgCount
            };
        });

        results.desktopPieceSvgs = pieceCheck;
        const shotPath = path.join(qaDir, "verify_desktop_clean_sprites.png");
        await page.screenshot({ path: shotPath });
        console.log(`📸 Đã lưu ảnh: ${shotPath}`, pieceCheck);
        await page.close();
    }

    await browser.close();

    console.log("\n=========================================");
    console.log("🎉 TẤT CẢ KẾT QUẢ KIỂM CHỨNG:");
    console.log(JSON.stringify(results, null, 2));
    console.log("=========================================\n");
})();

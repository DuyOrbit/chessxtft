const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputDir = path.join(__dirname, "qa_screenshots");

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
    console.log("🚀 Bắt đầu kịch bản Playwright chụp ảnh giao diện chuẩn AAA cho README...");
    const browser = await chromium.launch({
        headless: true,
        executablePath: chromePath
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // 1. Màn hình Đăng Nhập / Đăng Ký (Auth Screen)
    console.log("📸 [1/8] Chụp màn hình Đăng Nhập / Đăng Ký...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outputDir, "01_auth_screen.png") });

    // 2. Sảnh Chờ Gaming Client (Lobby Hub)
    console.log("📸 [2/8] Đăng nhập và chụp Sảnh Chờ Gaming Client...");
    const isAuthVisible = await page.$eval("#screen-auth", el => !el.classList.contains("hidden")).catch(() => false);
    if (isAuthVisible) {
        await page.fill("#login-username", "admin");
        await page.fill("#login-password", "123");
        await page.click("#form-login button[type='submit']");
        await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(outputDir, "02_lobby_hub.png") });

    // 3. Cẩm Nang Codex & Tộc Hệ (Codex Synergies)
    console.log("📸 [3/8] Chụp Cẩm Nang Bách Khoa Toàn Thư (Codex Synergies)...");
    await page.click("#nav-item-codex");
    await page.waitForTimeout(800);
    await page.click(".codex-tab[data-tab='synergies']");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outputDir, "03_codex_synergies.png") });

    // Quay lại sảnh chơi
    await page.click("#btn-back-from-codex");
    await page.waitForTimeout(600);

    // 4. Vào trận đấu Solo AI - Giai đoạn Chuẩn Bị (Prep Phase)
    console.log("📸 [4/8] Vào trận Solo AI & chụp Bàn Đấu Giai Đoạn Chuẩn Bị...");
    await page.click("#btn-quick-solo");
    await page.waitForTimeout(1500);

    // Mua 2 tướng trong shop để đưa lên sân và hàng chờ
    await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll(".shop-card:not(.bought)"));
        if (cards[0]) cards[0].click();
        if (cards[1]) cards[1].click();
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outputDir, "04_gameplay_prep_phase.png") });

    // 5. Rê chuột lên quân cờ để kích hoạt hiển thị tầm đánh & nước đi chiến thuật (Tactical Range Preview)
    console.log("📸 [5/8] Chụp Rê Chuột Xem Trước Tầm Đánh & Nước Đi...");
    const pieceSelector = "#chess-board .chess-piece";
    const pieceExists = await page.$(pieceSelector);
    if (pieceExists) {
        await page.hover(pieceSelector);
        await page.waitForTimeout(600);
    }
    await page.screenshot({ path: path.join(outputDir, "05_tactical_range_preview.png") });

    // 6. Giao Tranh (Combat Phase) & Biểu Đồ Sát Thương DPS Meter
    console.log("📸 [6/8] Bắt đầu Giao Tranh & Biểu Đồ Sát Thương DPS...");
    await page.click("#btn-start-combat");
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
        // Mô phỏng chỉ số DPS thực tế khi giao tranh nổ ra
        if (window.app && window.app.chess) {
            window.app.chess.damageStats = {
                p1: { name: "Cung Thủ Băng", icon: "🏹", stars: 2, totalDamage: 540, hits: 8, kills: 2, side: "player" },
                p2: { name: "Tốt Khiên Thiết Giáp", icon: "🛡️", stars: 2, totalDamage: 320, hits: 6, kills: 1, side: "player" },
                e1: { name: "Tượng Quái Đá", icon: "🗿", stars: 1, totalDamage: 210, hits: 4, kills: 0, side: "enemy" }
            };
            const dpsBox = document.getElementById("panel-dps-meter");
            if (dpsBox) dpsBox.classList.remove("hidden");
            window.app.renderDpsMeter();
        }
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outputDir, "06_gameplay_combat_dps.png") });

    // 7. Chế độ Sandbox / Phòng Tập Thử Nghiệm Sức Mạnh (God Mode Toolkit)
    console.log("📸 [7/8] Khởi tạo Phòng Tập Sandbox & Bảng Điều Khiển God Mode...");
    await page.evaluate(() => {
        window.app.startSandboxSession();
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
        const btnToggle = document.getElementById("btn-sandbox-panel-toggle");
        if (btnToggle) btnToggle.click();
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outputDir, "07_sandbox_godmode.png") });

    // 8. Chế độ Khán Giả / Trọng Tài GM (4 Màn Hình Trực Tiếp 2x2)
    console.log("📸 [8/8] Khởi tạo Chế độ Khán Giả Trực Tiếp 4 Bàn Cờ (Spectator Mode)...");
    await page.evaluate(() => {
        // Đóng toàn bộ modals đang mở trước khi sang Spectator
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
        window.app.start8BotSpectatorMode();
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outputDir, "08_spectator_caster_4boards.png") });

    await browser.close();
    console.log("✨ HOÀN TẤT! Đã chụp thành công toàn bộ 8 bức ảnh showcase độ phân giải 1920x1080!");
})().catch(err => {
    console.error("❌ Lỗi Playwright:", err);
    process.exit(1);
});

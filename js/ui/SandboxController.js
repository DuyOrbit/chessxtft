// ============================================================================
// CHESS TFT - SANDBOX & TUTORIAL CONTROLLER (ES MODULE)
// Interactive Sandbox practice mode & Tutorial guide
// ============================================================================

import { PIECES } from '../data/pieces.data.js';
import { ITEMS } from '../data/items.data.js';
import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class SandboxController {
    constructor(app) {
        this.app = app;
        this.isTutorialMode = false;
        this.tutorialStep = 0;
        this.isSandboxMode = false;
        this.sandboxSelectedPieceId = 'shield_pawn';
        this.sandboxSelectedSide = 'player';
        this.sandboxSelectedStars = 1;
        this.sandboxSelectedItems = [];
    }

    get app() { return this._app || window.app; }
    set app(v) { this._app = v; }
    get tft() { return this.app?.tft || window.app?.tft; }
    get sfx() { return this.app?.sfx || window.app?.sfx; }
    get currentUser() { return this.app?.currentUser || window.app?.currentUser; }
    get currentRoom() { return this.app?.currentRoom || window.app?.currentRoom; }
    get socket() { return this.app?.socket || window.app?.socket; }

    startNewGameSession(...args) { return (this.app || window.app).startNewGameSession(...args); }
    renderAll(...args) { return (this.app || window.app).renderAll(...args); }
    showScreen(...args) { return (this.app || window.app).showScreen(...args); }
    updateUserProfileUI(...args) { return (this.app || window.app).updateUserProfileUI(...args); }
    stopCombatTimers(...args) {
        if (this.app?.stopCombatTimers) return this.app.stopCombatTimers(...args);
        if (window.app?.stopCombatTimers) return window.app.stopCombatTimers(...args);
    }

    showToast(msg, type = 'info') {
        eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: msg, type });
    }
    startTutorialSession() {
        this.isTutorialMode = true;
        this.tutorialStep = 1;
        this.isRankedMode = false;

        const coachBot = {
            id: "bot_coach_martin",
            name: "Bot Martin (Huấn Luyện Viên)",
            avatar: "🎓",
            isBot: true,
            hp: 60,
            maxHp: 60,
            level: 3,
            gold: 6,
            elo: 250,
            board: [],
            bench: []
        };

        const tutorialRoom = {
            code: "TUTORIAL",
            timeMode: "relaxed",
            fillBots: false,
            players: [
                { id: this.currentUser ? this.currentUser.id : "guest", name: "Bạn (Học Viên)", avatar: "👑" },
                coachBot
            ]
        };

        this.startNewGameSession(tutorialRoom);
        this.tft.bots = [coachBot];
        this.tft.player.gold = 10;
        this.renderAll();

        const overlay = document.getElementById("tutorial-coach-overlay");
        if (overlay) overlay.classList.remove("hidden");
        this.renderTutorialStep(1);
    }

    renderTutorialStep(step) {
        this.tutorialStep = step;
        const ind = document.getElementById("tutorial-step-indicator");
        const text = document.getElementById("tutorial-coach-text");
        const nextBtn = document.getElementById("btn-tutorial-next-step");

        document.querySelectorAll(".tutorial-highlight-target").forEach(el => el.classList.remove("tutorial-highlight-target"));

        if (step === 1) {
            if (ind) ind.textContent = "BƯỚC 1 / 4: MUA QUÂN";
            if (text) text.textContent = "Chào bạn đến với Chess TFT! Mỗi lượt bạn sẽ nhận Vàng (🪙). Ở hàng dưới cùng là Cửa Hàng. Hãy bấm mua 1 quân cờ để đưa vào Hàng Chờ (Bench)!";
            if (nextBtn) nextBtn.style.display = "none";
            document.getElementById("shop-cards")?.classList.add("tutorial-highlight-target");
        } else if (step === 2) {
            if (ind) ind.textContent = "BƯỚC 2 / 4: XẾP ĐỘI HÌNH";
            if (text) text.textContent = "Rất tốt! Quân cờ đã vào Hàng Chờ. Hãy bấm vào quân đó rồi bấm vào 1 ô trên nửa sân của bạn để xếp đội hình. Quân Đỡ Đòn xếp hàng trước, Quân Bắn Xa xếp hàng sau!";
            if (nextBtn) nextBtn.style.display = "none";
            document.querySelector(".tft-player-bench")?.classList.add("tutorial-highlight-target");
        } else if (step === 3) {
            if (ind) ind.textContent = "BƯỚC 3 / 4: TỘC / HỆ";
            if (text) text.textContent = "Nhìn sang Bảng Tộc / Hệ bên trái! Khi có đủ quân cùng Tộc (Thiết Giáp, Kỵ Binh, Băng Quốc...), hiệu ứng buff sẽ kích hoạt. Tôi vừa tặng bạn 1 quân cùng Tộc vào Hàng Chờ, hãy xếp lên sân để kích hoạt Tộc!";
            if (nextBtn) {
                nextBtn.style.display = "inline-block";
                nextBtn.textContent = "Tiếp Theo ➔";
            }
            // Tặng 1 quân cùng Tộc vào Bench để kích hoạt
            const emptyBench = this.tft.player.bench.findIndex(b => b === null);
            if (emptyBench !== -1) {
                const boughtPieceId = this.tft.player.board.find(u => u.id !== "king")?.id || "shield_pawn";
                const matchingDef = window.CHESS_TFT_DATA.PIECES[boughtPieceId];
                const matchingTrait = (matchingDef && matchingDef.traits && matchingDef.traits[0]) || "guardian";
                const partnerPiece = Object.values(window.CHESS_TFT_DATA.PIECES).find(p => p.id !== boughtPieceId && p.traits.includes(matchingTrait)) || window.CHESS_TFT_DATA.PIECES["frost_knight"];
                this.tft.player.bench[emptyBench] = {
                    uid: this.tft.nextUid("unit"),
                    id: partnerPiece.id,
                    stars: 1,
                    items: []
                };
                this.renderAll();
                this.showToast(`🎁 Martin đã tặng bạn 1 quân [${partnerPiece.name}] để ghép Tộc!`, "success");
            }
            document.getElementById("synergy-list")?.classList.add("tutorial-highlight-target");
        } else if (step === 4) {
            if (ind) ind.textContent = "BƯỚC 4 / 4: GIAO TRANH";
            if (text) text.textContent = "Quân cờ có nhiều Lớp Máu (thanh xanh dưới chân). Mất Vua hoặc bị Chiếu Hết là THUA NGAY! Giờ hãy bấm nút '⚔️ VÀO TRẬN' để chiến đấu thử cùng tôi!";
            if (nextBtn) nextBtn.style.display = "none";
            document.getElementById("btn-start-combat")?.classList.add("tutorial-highlight-target");
        }
    }

    advanceTutorialStep(step) {
        if (!this.isTutorialMode) return;
        this.sfx.starUp();
        this.renderTutorialStep(step);
    }

    finishTutorialSession() {
        this.isTutorialMode = false;
        document.querySelectorAll(".tutorial-highlight-target").forEach(el => el.classList.remove("tutorial-highlight-target"));
        document.getElementById("tutorial-coach-overlay")?.classList.add("hidden");
        const modal = document.getElementById("modal-tutorial-complete");
        if (modal) modal.classList.remove("hidden");
        this.sfx.victory();

        if (this.currentUser) {
            if (!this.currentUser.stats) this.currentUser.stats = {};
            this.currentUser.stats.elo = (this.currentUser.stats.elo || 1000) + 100;
            if (!this.currentUser.customModifiers) this.currentUser.customModifiers = {};
            this.currentUser.customModifiers.startingGold = (this.currentUser.customModifiers.startingGold || 6) + 20;
            localStorage.setItem("chesstft_user", JSON.stringify(this.currentUser));
            this.updateUserProfileUI(this.currentUser);
        }
    }

    // ========================================================================
    // SANDBOX / TRAINING MODE WITH GOD MODE TOOLKIT & DPS METER
    // ========================================================================
    startSandboxSession() {
        this.isSandboxMode = true;
        if (this.app) this.app.isSandboxMode = true;
        if (window.app) window.app.isSandboxMode = true;
        this.isTutorialMode = false;
        this.isRankedMode = false;
        this.sandboxEnemyAI = true;

        const dummyBot = {
            id: "bot_sandbox_dummy",
            name: "Hình Nhân & Bot Thử Nghiệm",
            avatar: "🎯",
            isBot: true,
            hp: 200,
            maxHp: 200,
            level: 8,
            gold: 999,
            elo: 1000,
            board: [
                { uid: "enemy_dummy_1", id: "target_dummy", r: 1, c: 1, stars: 2, items: [] },
                { uid: "enemy_dummy_2", id: "target_dummy", r: 1, c: 2, stars: 3, items: [] },
                { uid: "enemy_dummy_3", id: "target_dummy", r: 1, c: 3, stars: 2, items: [] }
            ],
            bench: []
        };

        const sandboxRoom = {
            code: "SANDBOX",
            timeMode: "relaxed",
            fillBots: false,
            players: [
                { id: this.currentUser ? this.currentUser.id : "guest", name: "Kỳ Thủ Thử Nghiệm", avatar: "🛠️" },
                dummyBot
            ]
        };

        this.startNewGameSession(sandboxRoom);
        this.tft.bots = [dummyBot];
        this.tft.currentOpponent = dummyBot;

        // Cấp tài nguyên dồi dào
        this.tft.player.gold = 999;
        this.tft.player.level = 8;
        this.tft.player.xp = 0;
        this.tft.player.hp = 100;

        // Tặng sẵn bộ trang bị để test
        this.tft.player.items = ["iron_armor", "stun_hammer", "burn_cloak", "sniper_scope", "phase_boots"];

        // Khởi tạo giao diện
        this.renderAll();
        this.initSandboxModalEvents();
        this.renderSandboxChampions();
        this.renderSandboxItems();

        // Mở panel DPS meter mặc định
        const dpsPanel = document.getElementById("panel-dps-meter");
        if (dpsPanel) dpsPanel.classList.remove("hidden");
        this.renderDpsMeter();

        this.showToast("🛠️ Đã vào Chế Độ Phòng Tập! Bấm nút '🛠️ PHÒNG TẬP' để triệu hồi tướng 3⭐, đồ đạc và hình nhân!", "success");
    }

    initSandboxModalEvents() {
        const modal = document.getElementById("modal-sandbox-control");
        const btnToggle = document.getElementById("btn-sandbox-panel-toggle");
        const btnClose = document.getElementById("btn-close-sandbox-modal");
        const btnFooterClose = document.getElementById("btn-footer-close-sandbox");

        btnToggle?.replaceWith(btnToggle.cloneNode(true));
        document.getElementById("btn-sandbox-panel-toggle")?.addEventListener("click", () => {
            modal?.classList.remove("hidden");
            this.renderSandboxChampions();
            this.renderSandboxItems();
        });

        btnClose?.replaceWith(btnClose.cloneNode(true));
        document.getElementById("btn-close-sandbox-modal")?.addEventListener("click", () => {
            modal?.classList.add("hidden");
        });

        btnFooterClose?.replaceWith(btnFooterClose.cloneNode(true));
        document.getElementById("btn-footer-close-sandbox")?.addEventListener("click", () => {
            modal?.classList.add("hidden");
        });

        // Tab navigation inside sandbox modal
        document.querySelectorAll(".sandbox-tab-btn").forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        document.querySelectorAll(".sandbox-tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".sandbox-tab-btn").forEach(b => b.classList.remove("active"));
                document.querySelectorAll(".sandbox-view-pane").forEach(p => p.classList.add("hidden"));
                btn.classList.add("active");
                const tab = btn.getAttribute("data-tab");
                const targetPane = document.getElementById(`sandbox-view-${tab}`);
                if (targetPane) targetPane.classList.remove("hidden");
            });
        });

        // Enemy AI Toggle Checkbox
        const chkAi = document.getElementById("chk-enemy-ai-active");
        if (chkAi) {
            chkAi.checked = this.sandboxEnemyAI;
            chkAi.onchange = () => {
                this.sandboxEnemyAI = chkAi.checked;
                this.showToast(this.sandboxEnemyAI ? "🤖 Đã bật: Địch sẽ tấn công và di chuyển!" : "🎯 Đã tắt: Địch sẽ đứng yên làm bia thử nghiệm!", "info");
            };
        }

        // Enemy Presets
        document.getElementById("btn-enemy-preset-dummy")?.addEventListener("click", () => {
            if (!this.tft.currentOpponent) return;
            this.tft.currentOpponent.board = [
                { uid: `dummy_${Date.now()}_1`, id: "target_dummy", r: 1, c: 1, stars: 2, items: [] },
                { uid: `dummy_${Date.now()}_2`, id: "target_dummy", r: 1, c: 2, stars: 3, items: [] },
                { uid: `dummy_${Date.now()}_3`, id: "target_dummy", r: 1, c: 3, stars: 2, items: [] }
            ];
            this.showToast("🎯 Đã tạo 3 Hình Nhân Tập Đánh (Dummy) 2⭐-3⭐ bên phía địch!", "success");
            this.renderAll();
        });

        document.getElementById("btn-enemy-preset-vanguard")?.addEventListener("click", () => {
            if (!this.tft.currentOpponent) return;
            this.tft.currentOpponent.board = [
                { uid: `vang_${Date.now()}_0`, id: "king", r: 0, c: 2, stars: 1, items: [] },
                { uid: `vang_${Date.now()}_1`, id: "shield_pawn", r: 1, c: 1, stars: 3, items: ["iron_armor"] },
                { uid: `vang_${Date.now()}_2`, id: "heavy_rook", r: 1, c: 2, stars: 3, items: ["iron_armor", "stun_hammer"] },
                { uid: `vang_${Date.now()}_3`, id: "shield_pawn", r: 1, c: 3, stars: 3, items: ["iron_armor"] }
            ];
            this.showToast("🛡️ Đã đặt Đội Hình Siêu Thiết Giáp 3⭐ cho đối thủ!", "success");
            this.renderAll();
        });

        document.getElementById("btn-enemy-preset-assassin")?.addEventListener("click", () => {
            if (!this.tft.currentOpponent) return;
            this.tft.currentOpponent.board = [
                { uid: `ass_${Date.now()}_0`, id: "king", r: 0, c: 2, stars: 1, items: [] },
                { uid: `ass_${Date.now()}_1`, id: "shadow_bishop", r: 1, c: 0, stars: 3, items: ["burn_cloak"] },
                { uid: `ass_${Date.now()}_2`, id: "shadow_bishop", r: 1, c: 4, stars: 3, items: ["sniper_scope"] },
                { uid: `ass_${Date.now()}_3`, id: "cavalry_knight", r: 1, c: 2, stars: 3, items: ["phase_boots"] }
            ];
            this.showToast("🗡️ Đã đặt Đội Hình Sát Thủ Đột Kích 3⭐ cho đối thủ!", "success");
            this.renderAll();
        });

        document.getElementById("btn-enemy-preset-boss")?.addEventListener("click", () => {
            if (!this.tft.currentOpponent) return;
            this.tft.currentOpponent.board = [
                { uid: `boss_${Date.now()}_0`, id: "king", r: 0, c: 2, stars: 1, items: [] },
                { uid: `boss_${Date.now()}_1`, id: "grand_marshal", r: 1, c: 2, stars: 3, items: ["iron_armor", "burn_cloak", "stun_hammer"] }
            ];
            this.showToast("👑 Đã triệu hồi Đại Thừa Tướng 3⭐ Full Đồ cho đối thủ!", "warn");
            this.renderAll();
        });

        document.getElementById("btn-enemy-clear-all")?.addEventListener("click", () => {
            if (!this.tft.currentOpponent) return;
            this.tft.currentOpponent.board = [
                { uid: `enemy_king_only`, id: "king", r: 0, c: 2, stars: 1, items: [] }
            ];
            this.showToast("🧹 Đã dọn sạch quân trợ chiến của đối thủ (chỉ giữ Vua)!", "info");
            this.renderAll();
        });

        // Cheats actions
        document.getElementById("btn-cheat-add-gold")?.addEventListener("click", () => {
            this.tft.player.gold += 999;
            this.sfx.starUp();
            this.renderAll();
            this.showToast("🪙 +999 Vàng thành công!", "success");
        });

        document.getElementById("btn-cheat-max-level")?.addEventListener("click", () => {
            this.tft.player.level = 8;
            this.tft.player.xp = 0;
            this.sfx.starUp();
            this.renderAll();
            this.showToast("⬆️ Đã nâng cấp sàn đấu lên Cấp 8 (Tối đa 8 quân)! ", "success");
        });

        document.getElementById("btn-cheat-heal-hp")?.addEventListener("click", () => {
            this.tft.player.hp = 100;
            this.sfx.starUp();
            this.renderAll();
            this.showToast("❤️ Đã hồi đầy 100 Máu!", "success");
        });

        document.getElementById("btn-cheat-upgrade-selected")?.addEventListener("click", () => {
            if (!this.selectedPrepUnitUid) {
                this.showToast("Vui lòng bấm chọn 1 quân cờ trên bàn hoặc hàng chờ trước!", "warn");
                return;
            }
            let target = this.tft.player.board.find(u => u.uid === this.selectedPrepUnitUid);
            if (!target) {
                target = this.tft.player.bench.find(u => u && u.uid === this.selectedPrepUnitUid);
            }
            if (target) {
                target.stars = 3;
                this.sfx.starUp();
                this.renderAll();
                this.showToast(`⭐ Đã thăng cấp ${window.CHESS_TFT_DATA.PIECES[target.id]?.name} lên 3⭐ (MAX)!`, "success");
            }
        });

        document.getElementById("btn-cheat-reset-board")?.addEventListener("click", () => {
            this.stopCombatTimers();
            this.chess = null;
            this.tft.phase = "prep";
            this.selectedCombatSquare = null;
            this.validCombatActions = [];
            this.renderAll();
            this.renderDpsMeter();
            this.showToast("🔄 Đã khôi phục bàn cờ về Giai Đoạn Chuẩn Bị!", "info");
        });

        document.getElementById("btn-cheat-start-combat")?.addEventListener("click", () => {
            modal?.classList.add("hidden");
            this.startBlitzCombat();
        });
    }

    renderSandboxChampions() {
        const grid = document.getElementById("sandbox-champion-grid");
        if (!grid) return;
        grid.innerHTML = "";

        const pieces = window.CHESS_TFT_DATA.PIECES || {};
        Object.values(pieces).forEach(p => {
            const btn = document.createElement("div");
            btn.className = "sandbox-champ-btn";
            btn.innerHTML = `
                <div class="sandbox-champ-icon">${p.icon}</div>
                <div class="sandbox-champ-name">${p.name}</div>
                <div class="sandbox-champ-cost">${p.cost === 0 ? "0 Vàng (Đặc biệt)" : `${p.cost} 🪙`}</div>
            `;
            btn.title = `Nhận ${p.name} vào Hàng Chờ`;

            btn.addEventListener("click", () => {
                const checkedRadio = document.querySelector('input[name="sandbox-star-val"]:checked');
                const stars = checkedRadio ? parseInt(checkedRadio.value, 10) : 1;
                this.spawnSandboxUnit(p.id, stars);
            });

            grid.appendChild(btn);
        });
    }

    spawnSandboxUnit(pieceId, stars = 1) {
        const emptyBench = this.tft.player.bench.findIndex(b => b === null);
        const def = window.CHESS_TFT_DATA.PIECES[pieceId];
        if (!def) return;

        const newUnit = {
            uid: this.tft.nextUid("unit"),
            id: pieceId,
            stars: stars,
            items: []
        };

        if (emptyBench !== -1) {
            this.tft.player.bench[emptyBench] = newUnit;
            this.sfx.starUp();
            this.showToast(`✨ Đã thêm [${stars}⭐ ${def.name}] vào Hàng Chờ!`, "success");
            this.renderAll();
        } else {
            // Nếu bench đầy, thử tìm ô trống ở sân nhà
            const cfg = this.tft.getStageConfig();
            const freeSpot = this.tft.findFreeDeploySquare(this.tft.player, cfg);
            if (freeSpot) {
                newUnit.r = freeSpot.r;
                newUnit.c = freeSpot.c;
                this.tft.player.board.push(newUnit);
                this.sfx.starUp();
                this.showToast(`✨ Hàng chờ đầy, đã đưa [${stars}⭐ ${def.name}] thẳng lên sàn đấu!`, "success");
                this.renderAll();
            } else {
                this.showToast("Cả Hàng Chờ lẫn Sàn Đấu đều đã đầy, hãy bán bớt quân!", "warn");
            }
        }
    }

    renderSandboxItems() {
        const itemsGrid = document.getElementById("sandbox-items-grid");
        if (itemsGrid) {
            itemsGrid.innerHTML = "";
            const items = window.CHESS_TFT_DATA.ITEMS || {};
            Object.values(items).forEach(it => {
                const card = document.createElement("div");
                card.className = "sandbox-item-card";
                card.innerHTML = `
                    <span class="sandbox-item-icon">${it.icon}</span>
                    <div class="sandbox-item-info">
                        <div class="sandbox-item-name">${it.name}</div>
                    </div>
                `;
                card.title = `${it.name}: ${it.desc}`;
                card.addEventListener("click", () => {
                    if (this.tft.player.items.length >= 10) {
                        this.showToast("Kho trang bị đã đầy (tối đa 10 món)!", "warn");
                        return;
                    }
                    this.tft.player.items.push(it.id);
                    this.sfx.starUp();
                    this.renderAll();
                    this.showToast(`🎒 Đã nhận [${it.name}] vào Kho Đồ!`, "success");
                });
                itemsGrid.appendChild(card);
            });
        }

        const augGrid = document.getElementById("sandbox-augments-grid");
        if (augGrid) {
            augGrid.innerHTML = "";
            const augs = window.CHESS_TFT_DATA.AUGMENTS || [];
            augs.forEach(aug => {
                const card = document.createElement("div");
                card.className = "sandbox-aug-card";
                const isOwned = this.tft.player.augments.includes(aug.id);
                card.style.opacity = isOwned ? "0.6" : "1";
                card.innerHTML = `
                    <div style="font-weight:700; color:#c084fc; font-size:0.78rem;">${aug.icon} ${aug.name} ${isOwned ? "✅ Đã Có" : ""}</div>
                    <div style="font-size:0.68rem; color:#94a3b8; margin-top:2px;">${aug.desc}</div>
                `;
                card.addEventListener("click", () => {
                    if (this.tft.player.augments.includes(aug.id)) {
                        this.tft.player.augments = this.tft.player.augments.filter(id => id !== aug.id);
                        this.showToast(`Đã gỡ Lõi [${aug.name}]`, "info");
                    } else {
                        this.tft.player.augments.push(aug.id);
                        this.sfx.starUp();
                        this.showToast(`🔮 Đã kích hoạt Lõi [${aug.name}]!`, "success");
                    }
                    this.renderAll();
                    this.renderSandboxItems();
                });
                augGrid.appendChild(card);
            });
        }
    }

    renderDpsMeter() {
        const dpsContainer = document.getElementById("dps-meter-list");
        const totalLabel = document.getElementById("dps-total-label");
        if (!dpsContainer) return;

        if (!this.chess || !this.chess.damageStats || Object.keys(this.chess.damageStats).length === 0) {
            dpsContainer.innerHTML = `<div class="empty-hint" style="font-size:0.72rem; padding:4px 0;">Chưa ghi nhận sát thương trong giao tranh...</div>`;
            if (totalLabel) totalLabel.textContent = "0 dmg";
            return;
        }

        const statsArray = Object.values(this.chess.damageStats).sort((a, b) => b.totalDamage - a.totalDamage);
        const maxDamage = Math.max(1, statsArray[0]?.totalDamage || 1);
        let sumDamage = 0;

        dpsContainer.innerHTML = "";
        statsArray.forEach(stat => {
            sumDamage += stat.totalDamage;
            const pct = Math.min(100, Math.round((stat.totalDamage / maxDamage) * 100));
            const row = document.createElement("div");
            row.className = `dps-row ${stat.side === "enemy" ? "enemy" : ""}`;
            row.innerHTML = `
                <div class="dps-bar-bg" style="width: ${pct}%;"></div>
                <span class="dps-piece-icon">${stat.icon}</span>
                <span class="dps-piece-name">${stat.name} ${"⭐".repeat(stat.stars || 1)}</span>
                <span class="dps-value-box">${stat.totalDamage} 💥</span>
            `;
            row.title = `${stat.name}: ${stat.totalDamage} sát thương (${stat.hits} đòn đánh, ${stat.kills} mạng hạ gục)`;
            dpsContainer.appendChild(row);
        });

        if (totalLabel) {
            totalLabel.textContent = `${sumDamage} dmg`;
        }
    }

    // ========================================================================
    // 1V1 TACTICAL SKIRMISH BUILDER & ARENA
    // ========================================================================
}

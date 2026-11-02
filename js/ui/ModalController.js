// ============================================================================
// CHESS TFT - MODAL CONTROLLER (ES MODULE)
// Round Results, Stage Armory, Augment Selection, Carousel & Phase Countdowns
// ============================================================================

import { ITEMS } from '../data/items.data.js';
import { AUGMENTS } from '../data/augments.data.js';
import { PIECES } from '../data/pieces.data.js';
import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class ModalController {
    constructor(app) {
        this.app = app;
        this.prepTimer = null;
        this.augmentTimer = null;
        this.carouselTimer = null;
        this.armoryTimer = null;
        this.roundResultTimer = null;
    }

    get app() { return this._app || window.app; }
    set app(v) { this._app = v; }
    get tft() { return this.app?.tft || window.app?.tft; }
    get sfx() { return this.app?.sfx || window.app?.sfx; }
    get currentUser() { return this.app?.currentUser || window.app?.currentUser; }
    get currentRoom() { return this.app?.currentRoom || window.app?.currentRoom; }
    get socket() { return this.app?.socket || window.app?.socket; }

    get isSandboxMode() { return this.app?.sandboxController?.isSandboxMode || this.app?.isSandboxMode || false; }
    get isSkirmishMode() { return this.app?.skirmishController?.isSkirmishMode || this.app?.isSkirmishMode || false; }
    get isSkirmishSpectator() { return this.app?.skirmishController?.isSkirmishSpectator || false; }

    playPrepBgm(...args) {
        if (this.app?.playPrepBgm) return this.app.playPrepBgm(...args);
        if (this.sfx?.playBgm) return this.sfx.playBgm("prep");
    }

    showScreen(...args) { return (this.app || window.app).showScreen(...args); }
    renderAll(...args) { return (this.app || window.app).renderAll(...args); }
    startCombatPhase(...args) { return (this.app || window.app).startCombatPhase?.(...args); }
    stopCombatTimers(...args) { return (this.app || window.app).stopCombatTimers?.(...args); }
    showGameOverModal(...args) { return (this.app || window.app).showGameOverModal?.(...args); }

    showToast(msg, type = 'info') {
        eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: msg, type });
    }
    showRoundResultModal(res) {
        const modal = document.getElementById("modal-round-result");
        const titleEl = document.getElementById("round-result-title");
        const reasonEl = document.getElementById("round-result-reason");
        const logsEl = document.getElementById("round-match-logs");

        if (this.isSkirmishMode) {
            this.clearRoundResultCountdown();
            const skirmishCtrl = this.app?.skirmishController;
            const playerClock = (skirmishCtrl?.playerClock ?? this.app?.playerClock ?? 0);
            const enemyClock = (skirmishCtrl?.enemyClock ?? this.app?.enemyClock ?? 0);
            const chessEng = this.app?.chess ?? skirmishCtrl?.chess ?? this.chess;
            const isSpectator = this.isSkirmishSpectator;

            let whiteDisplayName = "Bot Trắng";
            let blackDisplayName = "Bot Đen";
            const p1NameEl = document.getElementById("h2h-p1-name");
            const p2NameEl = document.getElementById("h2h-p2-name");
            if (p1NameEl && p1NameEl.textContent) {
                whiteDisplayName = p1NameEl.textContent.replace(/^🤖\s*/, '').trim();
            }
            if (p2NameEl && p2NameEl.textContent) {
                blackDisplayName = p2NameEl.textContent.replace(/^🤖\s*/, '').trim();
            }

            if (isSpectator) {
                if (res.winner === "player") {
                    titleEl.textContent = `👑 ${whiteDisplayName.toUpperCase()} CHIẾN THẮNG!`;
                    titleEl.className = "modal-title text-win";
                } else if (res.winner === "enemy") {
                    titleEl.textContent = `👑 ${blackDisplayName.toUpperCase()} CHIẾN THẮNG!`;
                    titleEl.className = "modal-title text-win";
                } else {
                    titleEl.textContent = "⚖️ HÒA CỜ CHIẾN THUẬT!";
                    titleEl.className = "modal-title";
                }
                reasonEl.textContent = `${res.reasonLabel || "Ván đấu kết thúc"} • ${whiteDisplayName}: ${res.playerPiecesLeft || 0} quân • ${blackDisplayName}: ${res.enemyPiecesLeft || 0} quân`;
            } else {
                if (res.winner === "player") {
                    titleEl.textContent = "🏆 CHIẾN THẮNG TUYỆT ĐỐI!";
                    titleEl.className = "modal-title text-win";
                } else if (res.winner === "enemy") {
                    titleEl.textContent = "💀 THẤT BẠI TRONG ĐẤU TRÍ!";
                    titleEl.className = "modal-title text-loss";
                } else {
                    titleEl.textContent = "⚖️ HÒA CỜ CHIẾN THUẬT!";
                    titleEl.className = "modal-title";
                }
                reasonEl.textContent = `${res.reasonLabel || "Ván đấu kết thúc"} • Bạn còn: ${res.playerPiecesLeft || 0} quân • Đối thủ còn: ${res.enemyPiecesLeft || 0} quân`;
            }

            const timerEl = document.getElementById("round-result-timer");
            if (timerEl) timerEl.textContent = isSpectator ? "🎙️ Trận Đấu Giữa 2 Bot Đã Hoàn Tất" : "⚔️ Đấu Trí 1v1: Thách Đấu Kỳ Thủ AI";
            const sectionTitleEl = modal ? modal.querySelector(".panel-section-title") : null;
            if (sectionTitleEl) sectionTitleEl.textContent = "📊 Chi Tiết Giao Tranh Cờ Chớp 1v1";

            const pClockVal = (typeof playerClock === 'number') ? playerClock.toFixed(1) : "0.0";
            const eClockVal = (typeof enemyClock === 'number') ? enemyClock.toFixed(1) : "0.0";

            logsEl.innerHTML = `
                <div style="background: rgba(0,0,0,0.5); padding: 12px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.3); text-align: left;">
                    <div style="font-size: 0.85rem; color: #fbbf24; font-weight: 700; margin-bottom: 6px;">📊 Thống kê trận đấu:</div>
                    <div style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.7;">
                        • Tổng số lượt đi: <strong>${chessEng ? chessEng.turnCount : 0} nước</strong><br>
                        • Đồng hồ còn lại: <strong>${isSpectator ? whiteDisplayName : "Bạn"}: ${pClockVal}s</strong> • <strong>${isSpectator ? blackDisplayName : "Đối thủ"}: ${eClockVal}s</strong><br>
                        • Kết quả phân định: <strong style="color:#38bdf8;">${res.reasonLabel || "Chiếu hết / Đoạt Vua"}</strong>
                    </div>
                </div>
            `;

            const btnNext = document.getElementById("btn-next-round");
            const btnSpec = document.getElementById("btn-spectate-other-boards");
            if (btnSpec) {
                btnSpec.textContent = isSpectator ? "🏠 Quay Lại Phòng Chờ" : "🛠️ Đổi Đội Hình & Map";
                btnSpec.onclick = () => {
                    modal.classList.add("hidden");
                    if (isSpectator) {
                        (this.app?.waitingRoomController || this.app).renderWaitingRoom?.();
                    } else {
                        (this.app || window.app).showScreen?.("lobby");
                        (skirmishCtrl || this.app || window.app).openSkirmishBuilderModal?.();
                    }
                };
            }
            if (btnNext) {
                btnNext.textContent = isSpectator ? "🔄 Xem Trận Đấu Mới" : "🔄 Tái Đấu Ngay";
                btnNext.onclick = () => {
                    modal.classList.add("hidden");
                    if (this.app?.isOnlineSkirmish && (this.app?.currentRoom || skirmishCtrl?.currentRoom)) {
                        (this.app?.waitingRoomController || this.app).renderWaitingRoom?.();
                    } else {
                        (skirmishCtrl || this.app || window.app).startSkirmishBattle?.();
                    }
                };
            }

            modal.classList.remove("hidden");
            return;
        }

        if (res.winner === "player") {
            titleEl.textContent = "🏆 CHIẾN THẮNG VÁN CỜ CHỚP!";
            titleEl.className = "modal-title text-win";
        } else if (res.winner === "enemy") {
            titleEl.textContent = "💔 THẤT BẠI VÁN CỜ CHỚP!";
            titleEl.className = "modal-title text-loss";
        } else {
            titleEl.textContent = "⚖️ HÒA CỜ CHỚP!";
            titleEl.className = "modal-title";
        }

        reasonEl.textContent = `Kết quả: ${res.reasonLabel} • Quân sống sót: Bạn ${res.playerPiecesLeft} - Đối thủ ${res.enemyPiecesLeft}`;

        logsEl.innerHTML = "";
        for (const item of this.tft.roundMatchLogs) {
            const d = document.createElement("div");
            d.className = `round-log-item ${item.isPlayerMatch ? "round-log-highlight" : ""} ${item.isFortune ? "round-log-fortune" : ""} ${item.isComeback ? "round-log-comeback" : ""}`;
            d.textContent = item.summary;
            logsEl.appendChild(d);
        }

        // Last Stand Alert
        if (this.tft.lastStandTriggeredThisRound) {
            this.showToast(`🛡️ Ý CHÍ PHỤC THÙ ĐÃ KÍCH HOẠT! Nhận ngay +15🪙, Quốc Vương +1 Lớp Máu vĩnh viễn & +15s Đồng Hồ!`, "warn");
            this.sfx.victory();
        }

        // Fortune Cashout Celebration Toast
        if (this.tft.lastFortuneCashout) {
            const cash = this.tft.lastFortuneCashout;
            let details = `+${cash.gold}🪙`;
            if (cash.items.length) details += `, Trang bị: [${cash.items.map(it => window.CHESS_TFT_DATA.ITEMS[it]?.name || it).join(", ")}]`;
            if (cash.pieces.length) details += `, Tướng 5🪙: [${cash.pieces.map(pid => window.CHESS_TFT_DATA.PIECES[pid]?.name || pid).join(", ")}]`;
            this.showToast(`🎰 NỔ HŨ THÀNH CÔNG (Chuỗi ${cash.streak} thua)! Mở rương nhận: ${details}`, "success");
            this.sfx.victory();
        }

        // PVE Creep Drops Toast
        if (this.tft.lastPveDrops) {
            const drops = this.tft.lastPveDrops;
            let dropDesc = `+${drops.gold}🪙 Vàng`;
            if (drops.itemNames && drops.itemNames.length > 0) {
                dropDesc += ` & Mảnh trang bị [${drops.itemNames.join(" + ")}]`;
            }
            this.showToast(`🎁 CHIẾN LỢI PHẨM QUÁI PVE: ${dropDesc}!`, "success");
            this.sfx.starUp();
        }

        modal.classList.remove("hidden");

        const btnNext = document.getElementById("btn-next-round");
        const timerEl = document.getElementById("round-result-timer");

        if (this.isWaitingForRoundSync && !this.allBoardsFinishedCurrentRound) {
            if (btnNext) btnNext.textContent = "👁️ Soi Bài Đối Thủ (Đang Chờ Vòng Mới)";
            if (timerEl) timerEl.textContent = `⏳ Đang chờ người chơi khác hoàn tất vòng ${this.tft.stage}-${this.tft.roundInStage}...`;
            this.clearRoundResultCountdown();
            // Tự động đóng modal sau 4.5s để người chơi ra bàn cờ quan sát trận của đối thủ
            this.roundResultTimer = setTimeout(() => {
                if (!modal.classList.contains("hidden")) {
                    btnNext?.click();
                }
            }, 4500);
        } else {
            if (btnNext) btnNext.textContent = "➡️ Tiếp Tục Vòng Mới";
            this.startRoundResultCountdown();
        }
    }

    proceedAfterRoundModal() {
        this.clearRoundResultCountdown();
        this.isPostMatchSpectating = false;
        this.isFinishedCombat = false;
        this.tft.scoutingPlayerId = "player";
        const nextInfo = this.tft.advanceToNextRound();

        if (nextInfo.phase === "gameover") {
            this.showGameOverModal();
            return;
        }

        if (nextInfo.boardScaled) {
            const cfg = this.tft.getStageConfig();
            this.showToast(`📐 Sang Stage ${this.tft.stage}: Bàn cờ mở rộng thành ${cfg.cols}x${cfg.rows}!`, "success");
        }

        if (nextInfo.freeRerollGiven) {
            this.showToast(`🎁 HỖ TRỢ CHUỖI THUA: Bạn nhận được +1 lượt Đổi Shop MIỄN PHÍ!`, "success");
        }

        if (nextInfo.comebackPackage) {
            this.showToast(`🔥 TIẾP TẾ LỘI NGƯỢC DÒNG (Chuỗi Thua ≥ 4): Nhận ngay +${nextInfo.comebackPackage.gold}🪙 và ${nextInfo.comebackPackage.itemIcon} ${nextInfo.comebackPackage.itemName}!`, "success");
        }

        if (nextInfo.shopLockedPreserved) {
            this.showToast("🔒 Cửa hàng đã được giữ nguyên từ vòng trước (Đã tự động mở khóa)!", "info");
        }

        // STAGE ARMORY SELECTION (ĐỀ XUẤT 1: KHO TIẾP TẾ CHIẾN TRƯỜNG KHI CHUYỂN GIAI ĐOẠN)
        if (nextInfo.phase === "armory") {
            this.openStageArmoryModal(nextInfo.armoryChoices, nextInfo.newStage);
        } else if (nextInfo.phase === "augment") {
            this.openAugmentModal();
        } else if (nextInfo.phase === "carousel") {
            this.openCarouselModal();
        } else {
            this.startPrepCountdown();
        }

        this.renderAll();
        this.syncMyStateToRoom();
    }

    openStageArmoryModal(choices, newStage) {
        this.sfx.playBgm("armory");
        const modal = document.getElementById("modal-armory");
        const titleEl = document.getElementById("armory-title");
        const subEl = document.getElementById("armory-sub");
        const container = document.getElementById("armory-choices");

        if (titleEl) titleEl.textContent = `🎁 KHO TIẾP TẾ CHIẾN TRƯỜNG — GIAI ĐOẠN ${newStage}`;
        if (subEl) subEl.textContent = `Chúc mừng bạn đã vượt qua Giai Đoạn ${newStage - 1}! Chọn 1 trong 3 Gói Nâng Cấp để tăng tốc sức mạnh cho đội hình:`;

        if (!container) return;
        container.innerHTML = "";

        const armoryChoices = choices || [];
        armoryChoices.forEach((choice, idx) => {
            const card = document.createElement("div");
            card.className = "choice-card-armory";
            card.innerHTML = `
                <div class="armory-card-tag">${choice.tag}</div>
                <div class="armory-card-icon">${choice.icon}</div>
                <div class="armory-card-title">${choice.title}</div>
                <div class="armory-card-desc">${choice.desc}</div>
                <button class="armory-card-btn">${choice.btnText || "Nhận Gói Này"}</button>
            `;
            card.addEventListener("click", () => {
                this.clearArmoryCountdown();
                this.tft.claimArmoryChoice(idx);
                this.sfx.starUp();
                modal.classList.add("hidden");
                this.showToast(`🎁 Đã nhận thành công: ${choice.title}!`, "success");

                // Kiểm tra xem vòng 1 của stage mới có chọn Lõi hay không
                const stageFmt = (window.CHESS_TFT_DATA.STAGE_ROUNDS_FORMAT && window.CHESS_TFT_DATA.STAGE_ROUNDS_FORMAT[this.tft.stage]) || [];
                const rDef = stageFmt.find(r => r.round === this.tft.roundInStage);
                if (rDef && rDef.type === "augment" && this.tft.player.augments.length < 3) {
                    this.openAugmentModal();
                } else {
                    this.startPrepCountdown();
                }
                this.renderAll();
                this.syncMyStateToRoom();
            });
            container.appendChild(card);
        });

        modal.classList.remove("hidden");
        this.startArmoryCountdown();
    }

    startArmoryCountdown() {
        this.clearArmoryCountdown();
        this.armorySecondsLeft = 15;
        const timerEl = document.getElementById("armory-timer");
        if (timerEl) timerEl.textContent = `⏳ Tự động nhận sau: ${this.armorySecondsLeft}s`;

        this.armoryTimer = setInterval(() => {
            this.armorySecondsLeft--;
            const el = document.getElementById("armory-timer");
            if (el) el.textContent = `⏳ Tự động nhận sau: ${this.armorySecondsLeft}s`;

            if (this.armorySecondsLeft <= 0) {
                this.clearArmoryCountdown();
                const firstChoice = document.querySelector("#armory-choices .choice-card-armory");
                if (firstChoice && !document.getElementById("modal-armory")?.classList.contains("hidden")) {
                    firstChoice.click();
                }
            }
        }, 1000);
    }

    clearArmoryCountdown() {
        if (this.armoryTimer) {
            clearInterval(this.armoryTimer);
            this.armoryTimer = null;
        }
    }

    openAugmentModal() {
        this.sfx.playBgm("prep");
        const modal = document.getElementById("modal-augment");
        const container = document.getElementById("augment-choices");
        container.innerHTML = "";

        const unowned = window.CHESS_TFT_DATA.AUGMENTS.filter(a => !this.tft.player.augments.includes(a.id));
        const shuffled = [...unowned].sort(() => Math.random() - 0.5).slice(0, 3);

        for (const aug of shuffled) {
            const card = document.createElement("div");
            card.className = "choice-card";
            card.innerHTML = `
                <div class="choice-icon">${aug.icon}</div>
                <div class="choice-title">${aug.name}</div>
                <div class="choice-desc">${aug.desc}</div>
                <button class="btn-primary">Chọn Lõi Này</button>
            `;
            card.addEventListener("click", () => {
                this.clearAugmentCountdown();
                this.tft.chooseAugment(aug.id);
                this.sfx.starUp();
                modal.classList.add("hidden");
                this.showToast(`Đã kích hoạt Lõi: ${aug.name}!`, "success");
                this.startPrepCountdown();
                this.renderAll();
            });
            container.appendChild(card);
        }

        modal.classList.remove("hidden");
        this.startAugmentCountdown();
    }

    openCarouselModal() {
        this.sfx.playBgm("carousel");
        const modal = document.getElementById("modal-carousel");
        const container = document.getElementById("carousel-choices");
        container.innerHTML = "";

        const choices = this.tft.generateCarouselChoices();
        for (const ch of choices) {
            const pDef = window.CHESS_TFT_DATA.PIECES[ch.pieceId];
            const iDef = window.CHESS_TFT_DATA.ITEMS[ch.itemId];

            const card = document.createElement("div");
            card.className = "choice-card carousel-card";
            card.innerHTML = `
                <div class="choice-icon"><img src="assets/pieces/${pDef.id}.svg" class="carousel-choice-svg" alt="${pDef.name}" /><span class="carousel-plus">+</span><span class="carousel-item-icon">${iDef.icon}</span></div>
                <div class="choice-title">${pDef.name} (${pDef.cost}🪙)</div>
                <div class="choice-sub">Kèm trang bị: <strong>${iDef.name}</strong></div>
                <div class="choice-desc">${iDef.desc}</div>
                <button class="btn-primary">Lấy Quân & Đồ</button>
            `;
            card.addEventListener("click", () => {
                this.clearCarouselCountdown();
                this.tft.pickCarouselChoice(ch);
                this.sfx.starUp();
                modal.classList.add("hidden");
                this.showToast(`Đi Chợ thành công: Nhận ${pDef.name} cầm ${iDef.name}!`, "success");
                this.startPrepCountdown();
                this.renderAll();
            });
            container.appendChild(card);
        }

        modal.classList.remove("hidden");
        this.startCarouselCountdown();
    }

    async showGameOverModal() {
        this.clearAllCountdowns();
        const modal = document.getElementById("modal-gameover");
        const title = document.getElementById("gameover-title");
        const desc = document.getElementById("gameover-desc");

        const aliveAll = this.tft.getAllParticipants().sort((a, b) => b.hp - a.hp);
        const rank = aliveAll.findIndex(p => p.id === "player") + 1;

        if (!this.tft.player.eliminated && rank === 1) {
            title.textContent = "👑 TOP 1 ĐẤU TRƯỜNG CỜ CHỚP!";
            desc.textContent = `Xin chúc mừng! Bạn đã đánh bại toàn bộ 7 Đối Thủ và thống trị bàn cờ với ${this.tft.player.hp} Máu còn lại!`;
            this.sfx.victory();
        } else {
            title.textContent = `🏁 KẾT THÚC Ở HẠNG #${rank} / 8`;
            desc.textContent = `Bạn đã dừng bước tại Vòng ${this.tft.stage}-${this.tft.roundInStage}. Kết quả trận đấu đã được lưu vào Database!`;
            this.sfx.defeat();
        }

        modal.classList.remove("hidden");

        // Record match result & update user ELO in db/users.json & db/matches.json
        if (this.currentUser && this.currentUser.id && !this.currentUser.id.startsWith("local_")) {
            try {
                const token = this.currentUser?.token || JSON.parse(localStorage.getItem("chesstft_user") || "{}")?.token || "";
                const headers = { "Content-Type": "application/json" };
                if (token) headers["Authorization"] = `Bearer ${token}`;
                const res = await fetch("api.php?action=match_finish", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        userId: this.currentUser.id,
                        rank,
                        stageReached: `${this.tft.stage}-${this.tft.roundInStage}`,
                        roomCode: this.currentRoom ? this.currentRoom.code : "SOLO",
                        finalComp: this.tft.player.board.map(u => ({ id: u.id, stars: u.stars, items: u.items }))
                    })
                });
                const data = await res.json();
                if (data.ok && data.user) {
                    if (token && !data.user.token) data.user.token = token;
                    this.currentUser = data.user;
                    localStorage.setItem("chesstft_user", JSON.stringify(data.user));
                    this.renderLobbyHeader();
                }
            } catch (e) {
                // Offline fallback
            }
        }
    }

    // ========================================================================
    // AUTO COUNTDOWN TIMERS (ANTI-STALLING / CHỐNG CÂU GIỜ)
    // ========================================================================
    startPrepCountdown() {
        this.clearPrepCountdown();
        this.isPostMatchSpectating = false;
        this.isFinishedCombat = false;
        if (this.tft) this.tft.scoutingPlayerId = "player";
        this.playPrepBgm();

        // Ở chế độ Sandbox (Phòng Tập), thời gian chuẩn bị là vô hạn để thoải mái test!
        if (this.isSandboxMode) {
            const badge = document.getElementById("prep-timer-badge");
            if (badge) {
                badge.classList.remove("hidden");
                badge.textContent = `♾️ VÔ HẠN`;
                badge.style.background = "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)";
                badge.style.color = "#04060c";
                badge.style.fontWeight = "800";
            }
            return;
        }

        this.prepSecondsLeft = 40; // 40s (tăng thêm 10s theo yêu cầu) chuẩn bị TFT
        const badge = document.getElementById("prep-timer-badge");
        if (badge) {
            badge.classList.remove("hidden");
            badge.textContent = `⏳ ${this.prepSecondsLeft}s`;
            badge.style.background = "";
            badge.style.color = "";
        }

        this.prepTimer = setInterval(() => {
            this.prepSecondsLeft--;
            const b = document.getElementById("prep-timer-badge");
            if (b) {
                b.textContent = `⏳ ${this.prepSecondsLeft}s`;
                if (this.prepSecondsLeft <= 5) {
                    b.style.background = "#ef4444";
                    b.style.color = "#ffffff";
                }
            }

            if (this.prepSecondsLeft === 3) {
                this.preloadUpcomingCombatTrack();
            }

            if (this.prepSecondsLeft <= 0) {
                this.clearPrepCountdown();
                if (this.tft && this.tft.phase === "prep") {
                    this.showToast("⏰ Hết thời gian chuẩn bị! Tự động bắt đầu giao tranh!", "warn");
                    this.syncMyStateToRoom();
                    this.startBlitzCombat();
                }
            }
        }, 1000);
    }

    clearPrepCountdown() {
        if (this.prepTimer) {
            clearInterval(this.prepTimer);
            this.prepTimer = null;
        }
        const badge = document.getElementById("prep-timer-badge");
        if (badge) badge.classList.add("hidden");
    }

    startAugmentCountdown() {
        this.clearAugmentCountdown();
        this.augmentSecondsLeft = 15; // 15s chọn Lõi chuẩn TFT
        const timerEl = document.getElementById("augment-timer");
        if (timerEl) timerEl.textContent = `⏳ Tự động chọn sau: ${this.augmentSecondsLeft}s`;

        this.augmentTimer = setInterval(() => {
            this.augmentSecondsLeft--;
            const el = document.getElementById("augment-timer");
            if (el) el.textContent = `⏳ Tự động chọn sau: ${this.augmentSecondsLeft}s`;

            if (this.augmentSecondsLeft <= 0) {
                this.clearAugmentCountdown();
                const container = document.getElementById("augment-choices");
                const firstCard = container?.querySelector(".choice-card");
                if (firstCard) {
                    this.showToast("⏰ Hết giờ chọn Lõi! Đã tự động chọn Lõi ngẫu nhiên.", "warn");
                    firstCard.click();
                } else {
                    document.getElementById("modal-augment")?.classList.add("hidden");
                    this.proceedAfterRoundModal();
                }
            }
        }, 1000);
    }

    clearAugmentCountdown() {
        if (this.augmentTimer) {
            clearInterval(this.augmentTimer);
            this.augmentTimer = null;
        }
    }

    startCarouselCountdown() {
        this.clearCarouselCountdown();
        this.carouselSecondsLeft = 12; // 12s Đi Chợ chuẩn TFT
        const timerEl = document.getElementById("carousel-timer");
        if (timerEl) timerEl.textContent = `⏳ Tự động nhặt sau: ${this.carouselSecondsLeft}s`;

        this.carouselTimer = setInterval(() => {
            this.carouselSecondsLeft--;
            const el = document.getElementById("carousel-timer");
            if (el) el.textContent = `⏳ Tự động nhặt sau: ${this.carouselSecondsLeft}s`;

            if (this.carouselSecondsLeft <= 0) {
                this.clearCarouselCountdown();
                const container = document.getElementById("carousel-choices");
                const firstCard = container?.querySelector(".choice-card");
                if (firstCard) {
                    this.showToast("⏰ Hết giờ Đi Chợ! Đã tự động nhặt quân cờ & trang bị.", "warn");
                    firstCard.click();
                } else {
                    document.getElementById("modal-carousel")?.classList.add("hidden");
                    this.proceedAfterRoundModal();
                }
            }
        }, 1000);
    }

    clearCarouselCountdown() {
        if (this.carouselTimer) {
            clearInterval(this.carouselTimer);
            this.carouselTimer = null;
        }
    }

    startRoundResultCountdown() {
        this.clearRoundResultCountdown();
        this.roundResultSecondsLeft = 3; // 3s hiển thị kết quả
        const timerEl = document.getElementById("round-result-timer");
        if (timerEl) timerEl.textContent = `⏳ Tự động tiếp tục sau: ${this.roundResultSecondsLeft}s`;

        this.roundResultTimer = setInterval(() => {
            this.roundResultSecondsLeft--;
            const el = document.getElementById("round-result-timer");
            if (el) el.textContent = `⏳ Tự động tiếp tục sau: ${this.roundResultSecondsLeft}s`;

            if (this.roundResultSecondsLeft <= 0) {
                this.clearRoundResultCountdown();
                const btnNext = document.getElementById("btn-next-round");
                if (btnNext && !document.getElementById("modal-round-result").classList.contains("hidden")) {
                    btnNext.click();
                }
            }
        }, 1000);
    }

    clearRoundResultCountdown() {
        if (this.roundResultTimer) {
            clearInterval(this.roundResultTimer);
            this.roundResultTimer = null;
        }
    }

    clearAllCountdowns() {
        this.clearPrepCountdown();
        this.clearAugmentCountdown();
        this.clearCarouselCountdown();
        this.clearArmoryCountdown();
        this.clearRoundResultCountdown();
    }
}

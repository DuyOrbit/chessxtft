// ============================================================================
// CHESS TFT - SKIRMISH CONTROLLER (ES MODULE)
// Tactical 1v1 Point-Buy Army Builder, Meta Comps & Skirmish Battles
// ============================================================================

import { PIECES } from '../data/pieces.data.js';
import { SYNERGIES } from '../data/traits.data.js';
import { MAPS } from '../data/maps.data.js';
import { META_COMPS } from '../data/meta-comps.data.js';
import { SKIRMISH_CONFIG } from '../data/economy.data.js';
import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class SkirmishController {
    constructor(app) {
        this.app = app;
        this.skirmishState = {
            goldLeft: 30,
            units: [],
            selectedRosterPieceId: null,
            mapId: 'map_arena_1v1'
        };
        this.skirmishHoveredCell = null;
        this.isSkirmishMode = false;
        this.isOnlineSkirmish = false;
        this.skirmishRole = null;
        this.skirmishOpponent = null;
        this.skirmishTimerInterval = null;
        this.skirmishBotTurnTimeout = null;
    }

    get app() { return this._app || window.app; }
    set app(v) { this._app = v; }
    get tft() { return this.app?.tft || window.app?.tft; }
    get sfx() { return this.app?.sfx || window.app?.sfx; }
    get currentUser() { return this.app?.currentUser || window.app?.currentUser; }
    get currentRoom() { return this.app?.currentRoom || window.app?.currentRoom; }
    get socket() { return this.app?.socket || window.app?.socket; }

    showScreen(...args) { return (this.app || window.app).showScreen(...args); }
    renderAll(...args) { return (this.app || window.app).renderAll(...args); }
    updateUserProfileUI(...args) { return (this.app || window.app).updateUserProfileUI(...args); }

    playCombatBgm(...args) {
        if (this.app?.playCombatBgm) return this.app.playCombatBgm(...args);
        if (this.sfx?.playBgm) return this.sfx.playBgm("combat");
    }

    triggerCombatHitFx(hit) {
        if (this.app?.triggerCombatHitFx) return this.app.triggerCombatHitFx(hit);
        if (this.app?.boardController?.triggerCombatHitFx) return this.app.boardController.triggerCombatHitFx(hit, this.app);
    }

    renderDpsMeter(...args) {
        if (this.app?.renderDpsMeter) return this.app.renderDpsMeter(...args);
        if (this.app?.sandboxController?.renderDpsMeter) return this.app.sandboxController.renderDpsMeter(...args);
    }

    finishBlitzCombat(...args) {
        if (this.app?.finishBlitzCombat) return this.app.finishBlitzCombat(...args);
        if (window.app?.finishBlitzCombat) return window.app.finishBlitzCombat(...args);
    }

    stopCombatTimers(...args) {
        if (this.draftShowcaseTimer) {
            clearInterval(this.draftShowcaseTimer);
            clearTimeout(this.draftShowcaseTimer);
            this.draftShowcaseTimer = null;
        }
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        if (this.skirmishSpecTimeout) {
            clearTimeout(this.skirmishSpecTimeout);
            this.skirmishSpecTimeout = null;
        }
        if (this.app?.stopCombatTimers) return this.app.stopCombatTimers(...args);
        if (window.app?.stopCombatTimers) return window.app.stopCombatTimers(...args);
    }

    renderRightPanel(...args) {
        if (this.app?.renderRightPanel) return this.app.renderRightPanel(...args);
        if (window.app?.renderRightPanel) return window.app.renderRightPanel(...args);
    }

    showToast(msg, type = 'info') {
        eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: msg, type });
    }
    initSkirmishEvents() {
        document.getElementById("btn-close-skirmish-builder")?.addEventListener("click", () => {
            this.closeSkirmishBuilderModal();
        });

        document.getElementById("skirmish-map-select")?.addEventListener("change", (e) => {
            this.skirmishState.mapId = e.target.value;
            this.renderSkirmishBoard();
        });

        document.getElementById("skirmish-bot-select")?.addEventListener("change", (e) => {
            this.skirmishState.botDifficulty = e.target.value;
        });

        document.getElementById("skirmish-time-select")?.addEventListener("change", (e) => {
            this.skirmishState.timeControl = e.target.value;
        });

        document.getElementById("skirmish-role-select")?.addEventListener("change", (e) => {
            this.skirmishRole = e.target.value;
            const clashBtn = document.getElementById("btn-skirmish-start-clash");
            if (clashBtn) {
                if (this.skirmishRole === "spectator") {
                    clashBtn.innerHTML = `<span>👁️</span><span>VÀO XEM 2 BOT ĐẤU (CLASH)!</span>`;
                    this.showToast("👁️ Chế Độ Khán Giả: Trận đấu 1v1 sẽ tự động diễn ra giữa Bot Trắng và Bot Đen!", "info");
                } else {
                    clashBtn.innerHTML = `<span>⚔️</span><span>VÀO TRẬN ĐẤU (CLASH)!</span>`;
                    this.showToast("⚔️ Chế Độ Thi Đấu: Bạn trực tiếp điều khiển quân cờ!", "info");
                }
            }
        });

        document.getElementById("skirmish-guide-select")?.addEventListener("change", (e) => {
            this.guideMode = e.target.value;
            localStorage.setItem("chesstft_guide_mode", this.guideMode);
            if (this.updateGuideButtons) this.updateGuideButtons();
            this.showToast(this.guideMode === "beginner" ? "🎓 Đã chọn: Chế độ Tân Thủ (Gợi ý đầy đủ)" : "♟️ Đã chọn: Chế độ Kỳ Thủ (Tắt gợi ý)", "info");
        });

        // Skirmish Spectator Control Bar events
        document.getElementById("btn-skirmish-spec-pause")?.addEventListener("click", () => {
            this.skirmishSpecPaused = !this.skirmishSpecPaused;
            const pauseBtn = document.getElementById("btn-skirmish-spec-pause");
            if (pauseBtn) pauseBtn.textContent = this.skirmishSpecPaused ? "▶️ Tiếp Tục" : "⏸️ Tạm Dừng";
            this.showToast(this.skirmishSpecPaused ? "⏸️ Đã tạm dừng trận đấu 2 Bot!" : "▶️ Tiếp tục trận đấu!", "info");
            if (!this.skirmishSpecPaused) {
                this.scheduleSkirmishSpectatorTurn();
            }
        });

        document.querySelectorAll(".skirmish-speed-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".skirmish-speed-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.skirmishSpecSpeed = Number(btn.getAttribute("data-speed")) || 1;
                this.showToast(`⚡ Tốc độ xem: ${this.skirmishSpecSpeed}x`, "info");
            });
        });

        document.getElementById("btn-skirmish-skip-draft")?.addEventListener("click", () => {
            if (this.skipSpectatorDraft) {
                this.skipSpectatorDraft();
            }
        });

        document.getElementById("btn-skirmish-spec-back")?.addEventListener("click", () => {
            this.stopCombatTimers();
            document.getElementById("skirmish-spec-control-bar")?.classList.add("hidden");
            this.isSkirmishSpectator = false;
            this.showScreen("lobby");
            this.openSkirmishBuilderModal();
        });

        document.getElementById("btn-skirmish-auto-preset")?.addEventListener("click", () => {
            this.autoGenerateSkirmishPreset();
        });

        document.getElementById("btn-skirmish-reset-board")?.addEventListener("click", () => {
            this.resetSkirmishBoard();
        });

        document.getElementById("btn-skirmish-start-clash")?.addEventListener("click", () => {
            this.startSkirmishBattle();
        });

        document.getElementById("btn-skirmish-upgrade-star")?.addEventListener("click", () => {
            this.upgradeSkirmishUnitStar();
        });

        document.getElementById("btn-skirmish-sell-unit")?.addEventListener("click", () => {
            this.sellSkirmishUnit();
        });

        // Skirmish 1v1 Meta Preset Dropdown
        document.getElementById("skirmish-meta-preset-select")?.addEventListener("change", (e) => {
            const compId = e.target.value;
            if (compId) {
                this.loadMetaCompToSkirmish(compId);
            }
        });

        // Top Bar HUD & In-Game Meta Comps Modal
        document.getElementById("btn-toggle-meta-comps")?.addEventListener("click", () => {
            this.openMetaCompsModal("all");
        });

        document.getElementById("btn-close-meta-comps")?.addEventListener("click", () => {
            document.getElementById("modal-meta-comps")?.classList.add("hidden");
        });

        document.querySelectorAll(".meta-filter-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".meta-filter-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const tier = btn.getAttribute("data-tier") || "all";
                this.renderMetaCompsModal(tier);
            });
        });
    }

    loadMetaCompToSkirmish(compId) {
        const comp = (window.CHESS_TFT_META_COMPS || []).find(c => c.id === compId);
        if (!comp) return;

        this.skirmishState.units = JSON.parse(JSON.stringify(comp.units));
        this.openSkirmishBuilderModal();

        const presetSel = document.getElementById("skirmish-meta-preset-select");
        if (presetSel) presetSel.value = comp.id;

        this.calculateSkirmishGold();
        this.renderSkirmishBoard();
        this.renderSkirmishSynergies();
        this.showToast(`✅ Đã nạp thành công đội hình Meta '${comp.name}' (${comp.winRate}% Win)!`, "success");
    }

    openMetaCompsModal(filterTier = "all") {
        const modal = document.getElementById("modal-meta-comps");
        if (!modal) return;
        modal.classList.remove("hidden");

        document.querySelectorAll(".meta-filter-btn").forEach(b => {
            b.classList.toggle("active", b.getAttribute("data-tier") === filterTier);
        });

        this.renderMetaCompsModal(filterTier);
    }

    renderMetaCompsModal(filterTier = "all") {
        const listEl = document.getElementById("meta-comps-modal-list");
        if (!listEl) return;
        listEl.innerHTML = "";

        const allComps = window.CHESS_TFT_META_COMPS || [];
        const filtered = (filterTier === "all")
            ? allComps
            : allComps.filter(c => c.tier === filterTier);

        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="empty-hint" style="grid-column:1/-1;">Không có đội hình nào thuộc nhóm này.</div>`;
            return;
        }

        for (const comp of filtered) {
            const tierColor = comp.tier === "S" ? "#f59e0b" : (comp.tier === "A" ? "#38bdf8" : "#c084fc");
            const tierBg = comp.tier === "S" ? "rgba(245,158,11,0.2)" : (comp.tier === "A" ? "rgba(56,189,248,0.2)" : "rgba(168,85,247,0.2)");

            const traitsBadges = (comp.traits || []).map(t => {
                const s = window.CHESS_TFT_DATA.SYNERGIES[t];
                return s ? `<span class="codex-trait-badge" style="border-color:${s.color}; font-size:0.7rem; padding:2px 6px;">${s.icon} ${s.name}</span>` : `<span class="codex-trait-badge">${t}</span>`;
            }).join(" ");

            const carriesHtml = (comp.mainCarries || []).map(cId => {
                const p = window.CHESS_TFT_DATA.PIECES[cId];
                return p ? `<span class="carry-chip" style="font-size:0.68rem; padding:1px 5px;">${p.icon} ${p.name}</span>` : "";
            }).join(" ");

            const unitsHtml = (comp.units || []).map(u => {
                const p = window.CHESS_TFT_DATA.PIECES[u.id];
                if (!p) return "";
                return `<span class="comp-unit-chip cost-tier-${p.cost}" style="font-size:0.68rem;">${p.icon} ${p.name} ${"★".repeat(u.stars || 1)}</span>`;
            }).join(" ");

            let miniBoardCells = "";
            for (let r = 0; r < 7; r++) {
                for (let c = 0; c < 6; c++) {
                    const unitOnCell = (comp.units || []).find(u => u.r === r && u.c === c);
                    if (unitOnCell) {
                        const p = window.CHESS_TFT_DATA.PIECES[unitOnCell.id];
                        miniBoardCells += `<div class="mini-cell mini-occupied" title="${p?.name || unitOnCell.id} (${unitOnCell.stars}⭐)">
                            <span>${p?.icon || "♟️"}</span>
                            <span class="mini-star">${unitOnCell.stars > 1 ? unitOnCell.stars + "★" : ""}</span>
                        </div>`;
                    } else if (r >= 4) {
                        miniBoardCells += `<div class="mini-cell mini-deploy"></div>`;
                    } else {
                        miniBoardCells += `<div class="mini-cell"></div>`;
                    }
                }
            }

            const card = document.createElement("div");
            card.className = "game-meta-comp-card";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="meta-tier-pill" style="background:${tierBg}; color:${tierColor}; border:1px solid ${tierColor};">Tier ${comp.tier}</span>
                    <span class="meta-winrate-pill" style="color:#22c55e;">🔥 ${comp.winRate}% Thắng (${comp.wins}W / ${comp.played} trận Bot)</span>
                </div>
                <div>
                    <div class="meta-comp-name" style="font-size:0.95rem;">${comp.name}</div>
                    <div class="meta-comp-syn-tag" style="font-size:0.72rem;">${comp.synergySummary}</div>
                </div>
                <div class="hero-card-traits" style="margin-top:2px;">${traitsBadges}</div>
                <div class="meta-comp-desc" style="font-size:0.72rem;">${comp.roleDesc}</div>

                <div>
                    <span class="meta-sub-label">🎯 Chủ Lực:</span>
                    <div class="meta-carries-flex">${carriesHtml}</div>
                </div>

                <div>
                    <span class="meta-sub-label">♟️ Quân Cờ:</span>
                    <div class="meta-units-flex">${unitsHtml}</div>
                </div>

                <div class="meta-board-preview-box">
                    <div style="display:flex; justify-content:space-between; font-size:0.65rem; color:#94a3b8; margin-bottom:3px;">
                        <span>🗺️ Sơ đồ bàn cờ 6x7</span>
                        <span>Độ khó: ${comp.difficulty}</span>
                    </div>
                    <div class="mini-board-grid-6x7">
                        ${miniBoardCells}
                    </div>
                </div>

                <div style="background:rgba(255,255,255,0.03); padding:6px; border-radius:6px; font-size:0.7rem; line-height:1.4;">
                    <div style="color:#e2e8f0; margin-bottom:3px;">💡 <strong>Mẹo:</strong> ${comp.playstyleGuide}</div>
                    <div style="color:#f87171;">🛡️ <strong>Khắc chế:</strong> ${comp.counterInfo}</div>
                </div>

                <button class="btn-game btn-game-gold btn-modal-load-skirmish" style="font-size:0.74rem; padding:6px 10px; font-weight:800; border-radius:6px; cursor:pointer; width:100%;">
                    ⚔️ Nạp Vào Doanh Trại Cờ Chớp
                </button>
            `;

            const loadBtn = card.querySelector(".btn-modal-load-skirmish");
            if (loadBtn) {
                loadBtn.addEventListener("click", () => {
                    document.getElementById("modal-meta-comps")?.classList.add("hidden");
                    this.loadMetaCompToSkirmish(comp.id);
                });
            }

            listEl.appendChild(card);
        }
    }

    openSkirmishBuilderModal() {
        this.isSkirmishMode = false;
        const modal = document.getElementById("modal-skirmish-builder");
        if (!modal) return;

        // Ensure state has King
        if (!this.skirmishState.units || this.skirmishState.units.length === 0) {
            this.skirmishState.units = [
                { uid: "skirmish_king", id: "king", r: 6, c: 2, stars: 1, cost: 0, isKing: true }
            ];
        }

        // Populate Meta Preset dropdown once
        const metaPresetSel = document.getElementById("skirmish-meta-preset-select");
        if (metaPresetSel && metaPresetSel.children.length <= 1) {
            (window.CHESS_TFT_META_COMPS || []).forEach(comp => {
                const opt = document.createElement("option");
                opt.value = comp.id;
                opt.textContent = `[Tier ${comp.tier}] ${comp.winRate}% - ${comp.name}`;
                metaPresetSel.appendChild(opt);
            });
        }

        this.calculateSkirmishGold();
        this.renderSkirmishBoard();
        this.renderSkirmishRoster();
        this.renderSkirmishSynergies();

        const roleSel = document.getElementById("skirmish-role-select");
        if (roleSel) roleSel.value = this.skirmishRole || "player";

        const clashBtn = document.getElementById("btn-skirmish-start-clash");
        if (clashBtn) {
            if (this.isOnlineSkirmish) {
                clashBtn.disabled = false;
                clashBtn.innerHTML = `<span>✅</span><span>SẴN SÀNG (ONLINE 1V1)</span>`;
            } else if (this.skirmishRole === "spectator") {
                clashBtn.innerHTML = `<span>👁️</span><span>VÀO XEM 2 BOT ĐẤU (CLASH)!</span>`;
            } else {
                clashBtn.innerHTML = `<span>⚔️</span><span>VÀO TRẬN ĐẤU (CLASH)!</span>`;
            }
        }

        const guideSel = document.getElementById("skirmish-guide-select");
        if (guideSel) guideSel.value = this.guideMode || "beginner";

        modal.classList.remove("hidden");
    }

    closeSkirmishBuilderModal() {
        document.getElementById("modal-skirmish-builder")?.classList.add("hidden");
    }

    calculateSkirmishGold() {
        const totalBudget = window.CHESS_TFT_DATA.SKIRMISH_CONFIG?.budget || 30;
        let spent = 0;
        for (const u of this.skirmishState.units) {
            spent += Number(u.cost || 0);
        }
        this.skirmishState.budget = totalBudget;
        this.skirmishState.goldRemaining = Math.max(0, totalBudget - spent);

        const goldValEl = document.getElementById("skirmish-gold-val");
        if (goldValEl) {
            goldValEl.textContent = this.skirmishState.goldRemaining;
        }

        const countTagEl = document.getElementById("skirmish-unit-count-tag");
        if (countTagEl) {
            countTagEl.textContent = `${this.skirmishState.units.length} / 10 Quân`;
        }

        if (this.isOnlineSkirmish && this.socket && this.socket.connected && this.currentRoom) {
            this.socket.emit("skirmish:draftSync", {
                roomCode: this.currentRoom.code,
                army: this.skirmishState.units,
                goldRemaining: this.skirmishState.goldRemaining
            });
        }
    }

    renderSkirmishBoard() {
        const boardGrid = document.getElementById("skirmish-board");
        if (!boardGrid) return;
        boardGrid.innerHTML = "";

        const cols = 6;
        const rows = 7;
        const mapDef = window.CHESS_TFT_DATA.MAPS.find(m => m.id === this.skirmishState.mapId) || window.CHESS_TFT_DATA.MAPS[2];
        const terrain = mapDef.generateTerrain(cols, rows);

        const selectedRosterPiece = this.skirmishState.selectedRosterPieceId 
            ? window.CHESS_TFT_DATA.PIECES[this.skirmishState.selectedRosterPieceId] 
            : null;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement("div");
                cell.className = "skirmish-cell";
                cell.dataset.r = r;
                cell.dataset.c = c;

                const terr = terrain[`${r},${c}`];
                if (terr) {
                    cell.classList.add(`terrain-${terr}`);
                }

                // Check zone
                if (r <= 2) {
                    cell.classList.add("enemy-zone");
                } else if (r === 3) {
                    cell.classList.add("terrain-zone");
                } else {
                    cell.classList.add("deploy-zone");
                    // Valid drop indicator if placing from roster
                    if (selectedRosterPiece && !terr) {
                        const occupied = this.skirmishState.units.find(u => u.r === r && u.c === c);
                        if (!occupied) {
                            cell.classList.add("valid-target-drop");
                        }
                    }
                }

                // Check unit
                const unit = this.skirmishState.units.find(u => u.r === r && u.c === c);
                if (unit) {
                    cell.classList.add("occupied");
                    const def = window.CHESS_TFT_DATA.PIECES[unit.id];
                    const starIdx = Math.min(2, (unit.stars || 1) - 1);
                    const baseHp = def ? def.baseHp[starIdx] : 1;

                    const starStr = unit.stars === 3 ? "⭐⭐⭐" : (unit.stars === 2 ? "⭐⭐" : "⭐");
                    cell.innerHTML = `
                        <span class="skirmish-piece-stars">${starStr}</span>
                        <span class="skirmish-piece-avatar">${def?.icon || "♟️"}</span>
                        <span class="skirmish-piece-hp">❤️x${baseHp}</span>
                    `;

                    if (this.skirmishState.selectedBoardPos && this.skirmishState.selectedBoardPos.r === r && this.skirmishState.selectedBoardPos.c === c) {
                        cell.classList.add("selected");
                    }
                }

                cell.addEventListener("mouseenter", (e) => {
                    if (unit) {
                        this.showPieceMovementTooltip(unit.id, e);
                    }
                });
                cell.addEventListener("mousemove", (e) => {
                    if (unit) {
                        this.movePieceMovementTooltip(e);
                    }
                });
                cell.addEventListener("mouseleave", () => {
                    this.hidePieceMovementTooltip();
                });

                cell.addEventListener("click", () => {
                    this.handleSkirmishCellClick(r, c);
                });

                boardGrid.appendChild(cell);
            }
        }
    }

    renderSkirmishRoster() {
        const grid = document.getElementById("skirmish-roster-grid");
        if (!grid) return;
        grid.innerHTML = "";

        const allPieces = window.CHESS_TFT_DATA.PIECES;
        const validPieceIds = Object.keys(allPieces).filter(id => {
            const p = allPieces[id];
            return !p.isKing && id !== "stone_minion" && id !== "stone_golem" && id !== "target_dummy";
        });

        validPieceIds.forEach(id => {
            const def = allPieces[id];
            const card = document.createElement("div");
            const canAfford = this.skirmishState.goldRemaining >= def.cost;
            const isSelected = this.skirmishState.selectedRosterPieceId === id;

            card.className = `skirmish-roster-card ${isSelected ? "selected" : ""} ${!canAfford && !isSelected ? "disabled" : ""}`;
            card.innerHTML = `
                <div class="roster-card-icon"><img src="assets/pieces/${def.id}.svg" class="roster-svg" alt="${def.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" /><span class="roster-fallback" style="display:none;">${def.icon}</span></div>
                <div class="roster-card-info">
                    <span class="roster-card-name">${def.name}</span>
                    <div class="roster-card-meta">
                        <span class="roster-card-cost">🪙 ${def.cost}g</span>
                        <span>❤️x${def.baseHp[0]}</span>
                    </div>
                    <span class="roster-card-traits">${def.traits.map(t => window.CHESS_TFT_DATA.SYNERGIES[t]?.name || t).join(" • ")}</span>
                </div>
            `;

            card.title = `${def.name} (${def.cost} Vàng)\n${def.desc}\nTộc Hệ: ${def.traits.join(", ")}`;

            card.addEventListener("click", () => {
                if (!canAfford && !isSelected) {
                    this.showToast(`Không đủ Vàng để mua ${def.name} (${def.cost} Vàng)!`, "warn");
                    return;
                }
                if (this.skirmishState.selectedRosterPieceId === id) {
                    this.skirmishState.selectedRosterPieceId = null;
                } else {
                    this.skirmishState.selectedRosterPieceId = id;
                    this.skirmishState.selectedBoardPos = null;
                    this.showToast(`Đã chọn ${def.name} — Bấm vào ô sáng ở hàng 4, 5, 6 để đặt!`, "info");
                }
                this.updateSkirmishToolbar();
                this.renderSkirmishRoster();
                this.renderSkirmishBoard();
            });

            card.addEventListener("mouseenter", (e) => {
                this.showPieceMovementTooltip(id, e);
            });
            card.addEventListener("mousemove", (e) => {
                this.movePieceMovementTooltip(e);
            });
            card.addEventListener("mouseleave", () => {
                this.hidePieceMovementTooltip();
            });

            grid.appendChild(card);
        });
    }

    renderSkirmishSynergies() {
        const box = document.getElementById("skirmish-synergies-box");
        if (!box) return;
        box.innerHTML = "";

        const syn = this.tft.calculateSynergies({ board: this.skirmishState.units });
        let hasActive = false;

        Object.keys(syn).forEach(traitId => {
            const count = syn[traitId];
            const def = window.CHESS_TFT_DATA.SYNERGIES[traitId];
            if (!def) return;
            const activeThreshold = [...def.thresholds].reverse().find(t => count >= t);

            if (count > 0) {
                hasActive = true;
                const pill = document.createElement("span");
                pill.className = `skirmish-syn-pill ${activeThreshold ? "active" : ""}`;
                pill.innerHTML = `<span>${def.icon}</span> <span>${def.name}</span> <span>(${count})</span>`;
                pill.title = `${def.name}: ${count} quân trên sân.\n${def.desc}`;
                box.appendChild(pill);
            }
        });

        if (!hasActive) {
            box.innerHTML = `<span style="font-size:0.7rem; color:#64748b;">Chưa kích hoạt Tộc Hệ nào</span>`;
        }
    }

    handleSkirmishCellClick(r, c) {
        if (r <= 2) {
            this.showToast("Đây là nửa sân đối thủ (Bí mật)! Bạn chỉ được xếp quân ở hàng 4, 5, 6.", "warn");
            return;
        }

        const mapDef = window.CHESS_TFT_DATA.MAPS.find(m => m.id === this.skirmishState.mapId) || window.CHESS_TFT_DATA.MAPS[2];
        const terrain = mapDef.generateTerrain(6, 7);
        if (terrain[`${r},${c}`] === "wall") {
            this.showToast("Ô này có đá tảng cản đường, không thể đặt quân!", "warn");
            return;
        }

        const existingUnit = this.skirmishState.units.find(u => u.r === r && u.c === c);

        // 1. If clicking on an occupied cell -> Select unit
        if (existingUnit) {
            this.skirmishState.selectedBoardPos = { r, c };
            this.skirmishState.selectedRosterPieceId = null;
            this.updateSkirmishToolbar(existingUnit);
            this.renderSkirmishBoard();
            this.renderSkirmishRoster();
            return;
        }

        // 2. If clicking on an empty cell AND a roster piece was selected -> Place new piece
        if (this.skirmishState.selectedRosterPieceId) {
            const pieceId = this.skirmishState.selectedRosterPieceId;
            const def = window.CHESS_TFT_DATA.PIECES[pieceId];
            if (!def) return;

            if (this.skirmishState.goldRemaining < def.cost) {
                this.showToast(`Không đủ Vàng để mua ${def.name}!`, "warn");
                return;
            }

            if (this.skirmishState.units.length >= 10) {
                this.showToast("Đã đạt giới hạn tối đa 10 quân trên sân!", "warn");
                return;
            }

            this.skirmishState.units.push({
                uid: `skirmish_${pieceId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                id: pieceId,
                r,
                c,
                stars: 1,
                cost: def.cost,
                isKing: false
            });

            this.sfx.buy();
            this.calculateSkirmishGold();
            this.renderSkirmishBoard();
            this.renderSkirmishRoster();
            this.renderSkirmishSynergies();
            return;
        }

        // 3. If clicking on an empty cell AND a placed unit was selected -> Move unit to this cell
        if (this.skirmishState.selectedBoardPos) {
            const unit = this.skirmishState.units.find(u => u.r === this.skirmishState.selectedBoardPos.r && u.c === this.skirmishState.selectedBoardPos.c);
            if (unit) {
                unit.r = r;
                unit.c = c;
                this.sfx.move();
                this.skirmishState.selectedBoardPos = null;
                this.updateSkirmishToolbar();
                this.renderSkirmishBoard();
            }
        }
    }

    updateSkirmishToolbar(unit = null) {
        const toolbar = document.getElementById("skirmish-selected-unit-toolbar");
        const titleEl = document.getElementById("skirmish-selected-unit-title");
        const btnUpgrade = document.getElementById("btn-skirmish-upgrade-star");
        const btnSell = document.getElementById("btn-skirmish-sell-unit");
        if (!toolbar) return;

        if (!unit) {
            toolbar.classList.add("hidden");
            return;
        }

        toolbar.classList.remove("hidden");
        const def = window.CHESS_TFT_DATA.PIECES[unit.id];
        const starsStr = unit.stars === 3 ? "⭐⭐⭐" : (unit.stars === 2 ? "⭐⭐" : "⭐");
        titleEl.textContent = `${unit.name || def?.name} (${starsStr}) • Tọa độ [${unit.r}, ${unit.c}]`;

        if (unit.isKing) {
            btnUpgrade.classList.add("hidden");
            btnSell.classList.add("hidden");
        } else {
            btnUpgrade.classList.remove("hidden");
            btnSell.classList.remove("hidden");

            // Upgrade star cost
            const maxStars = def.cost <= 2 ? 3 : 2;
            if (unit.stars >= maxStars) {
                btnUpgrade.textContent = `⭐ Đã đạt tối đa (${unit.stars}⭐)`;
                btnUpgrade.disabled = true;
                btnUpgrade.style.opacity = "0.5";
            } else {
                const upgradeCost = def.cost;
                btnUpgrade.textContent = `⭐ Nâng ${unit.stars + 1}⭐ (+${upgradeCost}g)`;
                btnUpgrade.disabled = this.skirmishState.goldRemaining < upgradeCost;
                btnUpgrade.style.opacity = this.skirmishState.goldRemaining < upgradeCost ? "0.5" : "1";
            }

            btnSell.textContent = `🗑️ Thu Hồi (Hoàn ${unit.cost}g)`;
        }
    }

    upgradeSkirmishUnitStar() {
        if (!this.skirmishState.selectedBoardPos) return;
        const unit = this.skirmishState.units.find(u => u.r === this.skirmishState.selectedBoardPos.r && u.c === this.skirmishState.selectedBoardPos.c);
        if (!unit || unit.isKing) return;

        const def = window.CHESS_TFT_DATA.PIECES[unit.id];
        const maxStars = def.cost <= 2 ? 3 : 2;
        if (unit.stars >= maxStars) {
            this.showToast(`Quân này đã đạt cấp sao tối đa (${maxStars}⭐)!`, "warn");
            return;
        }

        const upgradeCost = def.cost;
        if (this.skirmishState.goldRemaining < upgradeCost) {
            this.showToast(`Không đủ Vàng để nâng sao (Cần thêm ${upgradeCost} Vàng)!`, "warn");
            return;
        }

        unit.stars += 1;
        unit.cost += upgradeCost;
        this.sfx.upgrade();
        this.showToast(`✨ Đã thăng cấp ${def.name} lên ${unit.stars}⭐!`, "success");

        this.calculateSkirmishGold();
        this.updateSkirmishToolbar(unit);
        this.renderSkirmishBoard();
        this.renderSkirmishRoster();
        this.renderSkirmishSynergies();
    }

    sellSkirmishUnit() {
        if (!this.skirmishState.selectedBoardPos) return;
        const unitIdx = this.skirmishState.units.findIndex(u => u.r === this.skirmishState.selectedBoardPos.r && u.c === this.skirmishState.selectedBoardPos.c);
        if (unitIdx === -1) return;
        const unit = this.skirmishState.units[unitIdx];

        if (unit.isKing) {
            this.showToast("Quốc Vương là chỉ huy tối cao, không thể thu hồi khỏi chiến trường!", "error");
            return;
        }

        const refund = unit.cost;
        this.skirmishState.units.splice(unitIdx, 1);
        this.skirmishState.selectedBoardPos = null;
        this.sfx.sell();
        this.showToast(`Đã thu hồi quân cờ và nhận lại +${refund} Vàng.`, "info");

        this.calculateSkirmishGold();
        this.updateSkirmishToolbar();
        this.renderSkirmishBoard();
        this.renderSkirmishRoster();
        this.renderSkirmishSynergies();
    }

    resetSkirmishBoard() {
        this.skirmishState.units = [
            { uid: "skirmish_king", id: "king", r: 6, c: 2, stars: 1, cost: 0, isKing: true }
        ];
        this.skirmishState.selectedBoardPos = null;
        this.skirmishState.selectedRosterPieceId = null;
        this.calculateSkirmishGold();
        this.updateSkirmishToolbar();
        this.renderSkirmishBoard();
        this.renderSkirmishRoster();
        this.renderSkirmishSynergies();
        this.showToast("Đã đặt lại bàn cờ về vị trí ban đầu (Hoàn đủ 30 Vàng).", "info");
    }

    autoGenerateSkirmishPreset() {
        this.skirmishState.units = [
            { uid: "sk_king", id: "king", r: 6, c: 2, stars: 1, cost: 0, isKing: true },
            { uid: "sk_jug", id: "juggernaut", r: 4, c: 2, stars: 2, cost: 4, isKing: false },
            { uid: "sk_arch", id: "archer", r: 5, c: 0, stars: 2, cost: 4, isKing: false },
            { uid: "sk_fk", id: "frost_knight", r: 4, c: 4, stars: 2, cost: 4, isKing: false },
            { uid: "sk_sp1", id: "shield_pawn", r: 4, c: 1, stars: 2, cost: 2, isKing: false },
            { uid: "sk_sp2", id: "shield_pawn", r: 4, c: 3, stars: 2, cost: 2, isKing: false },
            { uid: "sk_fm", id: "fire_mage", r: 5, c: 3, stars: 2, cost: 2, isKing: false },
            { uid: "sk_pb", id: "pyro_bishop", r: 5, c: 5, stars: 2, cost: 6, isKing: false },
            { uid: "sk_merc", id: "mercenary", r: 5, c: 1, stars: 2, cost: 2, isKing: false },
            { uid: "sk_knt", id: "knight", r: 4, c: 0, stars: 2, cost: 4, isKing: false }
        ];

        this.skirmishState.selectedBoardPos = null;
        this.skirmishState.selectedRosterPieceId = null;
        this.sfx.upgrade();
        this.calculateSkirmishGold();
        this.updateSkirmishToolbar();
        this.renderSkirmishBoard();
        this.renderSkirmishRoster();
        this.renderSkirmishSynergies();
        this.showToast("🎲 Đã nạp Đội Hình Mẫu Cân Bằng (Đầy đủ 30 Vàng & 4 Tộc Hệ)!", "success");
    }

    generateBotSkirmishArmy(difficulty = "grandmaster", cols = 6, rows = 7) {
        if (difficulty === "apprentice") {
            return [
                { id: "king", r: 6, c: 2, stars: 1, isKing: true },
                { id: "shield_pawn", r: 4, c: 1, stars: 1, isKing: false },
                { id: "shield_pawn", r: 4, c: 3, stars: 1, isKing: false },
                { id: "mercenary", r: 4, c: 2, stars: 1, isKing: false },
                { id: "archer", r: 5, c: 0, stars: 1, isKing: false },
                { id: "knight", r: 5, c: 4, stars: 1, isKing: false }
            ];
        } else if (difficulty === "veteran") {
            return [
                { id: "king", r: 6, c: 3, stars: 1, isKing: true },
                { id: "juggernaut", r: 4, c: 2, stars: 2, isKing: false },
                { id: "shield_pawn", r: 4, c: 1, stars: 2, isKing: false },
                { id: "frost_knight", r: 4, c: 4, stars: 2, isKing: false },
                { id: "archer", r: 5, c: 0, stars: 2, isKing: false },
                { id: "fire_mage", r: 5, c: 4, stars: 2, isKing: false }
            ];
        } else {
            return [
                { id: "king", r: 6, c: 1, stars: 1, isKing: true },
                { id: "juggernaut", r: 4, c: 1, stars: 2, isKing: false },
                { id: "frost_knight", r: 4, c: 4, stars: 2, isKing: false },
                { id: "archer", r: 5, c: 0, stars: 2, isKing: false },
                { id: "pyro_bishop", r: 5, c: 5, stars: 2, isKing: false },
                { id: "shield_pawn", r: 4, c: 3, stars: 2, isKing: false },
                { id: "knight", r: 4, c: 0, stars: 2, isKing: false },
                { id: "fire_mage", r: 5, c: 2, stars: 2, isKing: false }
            ];
        }
    }

    startSkirmishBattle() {
        const kingUnit = this.skirmishState.units.find(u => u.isKing || u.id === "king");
        if (!kingUnit) {
            this.showToast("Đội hình bắt buộc phải có 1 Quốc Vương (King)!", "error");
            return;
        }

        if (this.isOnlineSkirmish) {
            if (this.socket && this.socket.connected && this.currentRoom) {
                const clashBtn = document.getElementById("btn-skirmish-start-clash");
                if (clashBtn) {
                    clashBtn.disabled = true;
                    clashBtn.innerHTML = `<span>⏳</span><span>ĐÃ SẴN SÀNG (CHỜ ĐỐI THỦ...)</span>`;
                }
                this.socket.emit("skirmish:submitArmy", {
                    roomCode: this.currentRoom.code,
                    army: this.skirmishState.units,
                    mapId: this.skirmishState.mapId
                });
                this.showToast("⏳ Đội hình đã gửi lên máy chủ! Đang chờ đối thủ sẵn sàng...", "info");
            }
            return;
        }

        this.isSkirmishMode = true;
        if (this.app) this.app.isSkirmishMode = true;
        if (window.app) window.app.isSkirmishMode = true;
        this.isSandboxMode = false;
        this.isTutorialMode = false;
        this.isRankedMode = false;

        document.getElementById("modal-skirmish-builder")?.classList.add("hidden");

        this.showScreen("game");
        document.body.classList.add("skirmish-active");

        const shopHud = document.querySelector(".tft-bottom-hud");
        if (shopHud) shopHud.classList.add("hidden");
        const benchRow = document.querySelector(".bench-container");
        if (benchRow) benchRow.classList.add("hidden");
        const prepTimer = document.getElementById("prep-timer-badge");
        if (prepTimer) prepTimer.classList.add("hidden");

        const cols = 6;
        const rows = 7;
        const mapDef = window.CHESS_TFT_DATA.MAPS.find(m => m.id === this.skirmishState.mapId) || window.CHESS_TFT_DATA.MAPS[2];
        const terrain = mapDef.generateTerrain(cols, rows);

        const playerPieces = this.skirmishState.units.map(u => ({
            ...u,
            uid: `player_${u.id}_${u.r}_${u.c}`,
            items: []
        }));

        const botArmy = this.generateBotSkirmishArmy(this.skirmishState.botDifficulty, cols, rows);
        const enemyMirrored = botArmy.map(u => ({
            ...u,
            r: (rows - 1) - u.r,
            c: (cols - 1) - u.c,
            uid: `enemy_${u.id}_${(rows - 1) - u.r}_${(cols - 1) - u.c}`,
            items: []
        }));

        const tc = this.skirmishState.timeControl || "300_5";
        const [clockSecs, clockInc] = tc.split("_").map(Number);

        this.isSkirmishSpectator = (this.skirmishRole === "spectator");
        this.skirmishSpecPaused = false;
        this.skirmishSpecSpeed = 1;

        if (this.app) this.app.isSkirmishSpectator = this.isSkirmishSpectator;
        if (window.app) window.app.isSkirmishSpectator = this.isSkirmishSpectator;

        if (this.isSkirmishSpectator) {
            this.startSpectatorDraftShowcase({
                whiteName: "Bot Trắng",
                blackName: `Bot Đen (${this.skirmishState.botDifficulty === 'grandmaster' ? 'Magnus' : 'AI'})`,
                whiteRawUnits: this.skirmishState.units,
                blackRawUnits: botArmy,
                mapId: this.skirmishState.mapId,
                cols,
                rows,
                terrain,
                mapDef,
                onComplete: () => {
                    this.runSkirmishCombat({
                        playerPieces,
                        enemyMirrored,
                        cols,
                        rows,
                        terrain,
                        mapDef,
                        clockSecs,
                        clockInc,
                        whiteName: "Bot Trắng",
                        blackName: "Bot Đen",
                        opponentId: "bot_enemy",
                        isWhite: true
                    });
                }
            });
        } else {
            this.runSkirmishCombat({
                playerPieces,
                enemyMirrored,
                cols,
                rows,
                terrain,
                mapDef,
                clockSecs,
                clockInc,
                whiteName: this.currentUser?.name || "Bạn",
                blackName: "Đối Thủ AI",
                opponentId: "bot_enemy",
                isWhite: true
            });
        }
    }

    startOnlineSkirmishBattle({ whitePlayerId, blackPlayerId, whiteName, blackName, mapId, armies }) {
        this.isOnlineSkirmish = true;
        this.isSkirmishMode = true;
        this.isSandboxMode = false;
        this.isTutorialMode = false;
        this.isRankedMode = false;

        document.getElementById("modal-skirmish-builder")?.classList.add("hidden");
        document.querySelectorAll(".tutorial-highlight-target").forEach(el => el.classList.remove("tutorial-highlight-target"));
        document.getElementById("tutorial-coach-overlay")?.classList.add("hidden");
        document.getElementById("btn-sandbox-panel-toggle")?.classList.add("hidden");
        document.getElementById("sandbox-panel")?.classList.add("hidden");

        this.showScreen("game");
        document.body.classList.add("skirmish-active");

        const shopHud = document.querySelector(".tft-bottom-hud");
        if (shopHud) shopHud.classList.add("hidden");
        const benchRow = document.querySelector(".bench-container");
        if (benchRow) benchRow.classList.add("hidden");
        const prepTimer = document.getElementById("prep-timer-badge");
        if (prepTimer) prepTimer.classList.add("hidden");

        const isWhite = (this.currentUser && this.currentUser.id === whitePlayerId) ||
                        (this.socket && this.socket.id === whitePlayerId);
        const isBlack = (this.currentUser && this.currentUser.id === blackPlayerId) ||
                        (this.socket && this.socket.id === blackPlayerId);
        const isParticipant = isWhite || isBlack;

        this.isSkirmishSpectator = !isParticipant;
        this.skirmishRole = this.isSkirmishSpectator ? "spectator" : "player";
        this.onlineSkirmishIsWhite = isWhite;
        this.skirmishSpecPaused = false;
        this.skirmishSpecSpeed = 1;

        if (this.app) {
            this.app.isOnlineSkirmish = true;
            this.app.isSkirmishMode = true;
            this.app.isSandboxMode = false;
            this.app.isTutorialMode = false;
            this.app.isRankedMode = false;
            this.app.isSkirmishSpectator = this.isSkirmishSpectator;
            this.app.isSpectatorPOV = false;
            this.app.isMultiplayerSpectator = this.isSkirmishSpectator;
        }
        if (window.app) {
            window.app.isOnlineSkirmish = true;
            window.app.isSkirmishMode = true;
            window.app.isSandboxMode = false;
            window.app.isTutorialMode = false;
            window.app.isRankedMode = false;
            window.app.isSkirmishSpectator = this.isSkirmishSpectator;
            window.app.isSpectatorPOV = false;
            window.app.isMultiplayerSpectator = this.isSkirmishSpectator;
        }

        const cols = 6;
        const rows = 7;
        const mapDef = window.CHESS_TFT_DATA.MAPS.find(m => m.id === mapId) || window.CHESS_TFT_DATA.MAPS[2];
        const terrain = mapDef.generateTerrain(cols, rows);

        const defaultBotArmy1 = [
            { id: "king", r: 6, c: 2, stars: 1, isKing: true, cost: 0 },
            { id: "juggernaut", r: 4, c: 2, stars: 2, isKing: false, cost: 6 },
            { id: "frost_rook", r: 5, c: 0, stars: 2, isKing: false, cost: 8 },
            { id: "frost_knight", r: 4, c: 4, stars: 2, isKing: false, cost: 6 },
            { id: "shield_pawn", r: 4, c: 1, stars: 2, isKing: false, cost: 3 }
        ];
        const defaultBotArmy2 = [
            { id: "king", r: 6, c: 2, stars: 1, isKing: true, cost: 0 },
            { id: "corsair", r: 4, c: 1, stars: 2, isKing: false, cost: 6 },
            { id: "archer", r: 5, c: 5, stars: 2, isKing: false, cost: 6 },
            { id: "gambler", r: 4, c: 4, stars: 2, isKing: false, cost: 6 },
            { id: "shield_pawn", r: 4, c: 5, stars: 2, isKing: false, cost: 3 }
        ];

        let whiteRawUnits = (armies && armies[whitePlayerId]) ? armies[whitePlayerId] : defaultBotArmy1;
        let blackRawUnits = (armies && armies[blackPlayerId]) ? armies[blackPlayerId] : defaultBotArmy2;

        const opponentId = isWhite ? blackPlayerId : whitePlayerId;
        const opponentIsBot = this.currentRoom && this.currentRoom.players && this.currentRoom.players.some(p => p.id === opponentId && p.isBot);
        this.onlineSkirmishOpponentIsBot = !this.isSkirmishSpectator && !!opponentIsBot;

        let playerPieces, enemyMirrored;
        if (this.isSkirmishSpectator) {
            playerPieces = whiteRawUnits.map(u => ({
                ...u,
                uid: `white_${u.id}_${u.r}_${u.c}`,
                items: []
            }));
            enemyMirrored = blackRawUnits.map(u => ({
                ...u,
                r: (rows - 1) - u.r,
                c: (cols - 1) - u.c,
                uid: `black_${u.id}_${(rows - 1) - u.r}_${(cols - 1) - u.c}`,
                items: []
            }));
        } else {
            const myRawUnits = isWhite ? whiteRawUnits : blackRawUnits;
            const oppRawUnits = isWhite ? blackRawUnits : whiteRawUnits;
            playerPieces = myRawUnits.map(u => ({
                ...u,
                uid: `player_${u.id}_${u.r}_${u.c}`,
                items: []
            }));
            enemyMirrored = oppRawUnits.map(u => ({
                ...u,
                r: (rows - 1) - u.r,
                c: (cols - 1) - u.c,
                uid: `enemy_${u.id}_${(rows - 1) - u.r}_${(cols - 1) - u.c}`,
                items: []
            }));
        }

        const tc = this.skirmishState.timeControl || "300_5";
        const [clockSecs, clockInc] = tc.split("_").map(Number);

        if (this.isSkirmishSpectator) {
            this.startSpectatorDraftShowcase({
                whiteName,
                blackName,
                whiteRawUnits,
                blackRawUnits,
                mapId,
                cols,
                rows,
                terrain,
                mapDef,
                onComplete: () => {
                    this.runSkirmishCombat({
                        playerPieces,
                        enemyMirrored,
                        cols,
                        rows,
                        terrain,
                        mapDef,
                        clockSecs,
                        clockInc,
                        whiteName,
                        blackName,
                        opponentId,
                        isWhite: true
                    });
                }
            });
        } else {
            this.runSkirmishCombat({
                playerPieces,
                enemyMirrored,
                cols,
                rows,
                terrain,
                mapDef,
                clockSecs,
                clockInc,
                whiteName,
                blackName,
                opponentId,
                isWhite
            });
        }
    }

    showFloatingDraftTag(r, c, text) {
        const cellEl = document.querySelector(`.board-cell[data-r="${r}"][data-c="${c}"]`);
        if (!cellEl) return;
        const tag = document.createElement("span");
        tag.className = "draft-cost-tag";
        tag.textContent = text;
        cellEl.appendChild(tag);
        setTimeout(() => tag.remove(), 1200);
    }

    startSpectatorDraftShowcase({ whiteName, blackName, whiteRawUnits, blackRawUnits, mapId, cols, rows, terrain, mapDef, onComplete }) {
        const specBar = document.getElementById("skirmish-spec-control-bar");
        if (specBar) specBar.classList.remove("hidden");
        const draftBadge = document.getElementById("skirmish-draft-phase-badge");
        const draftTimer = document.getElementById("skirmish-draft-timer");
        const skipBtn = document.getElementById("btn-skirmish-skip-draft");
        const pauseBtn = document.getElementById("btn-skirmish-spec-pause");
        const statusText = document.getElementById("skirmish-spec-status-text");

        if (draftBadge) draftBadge.classList.remove("hidden");
        if (skipBtn) skipBtn.classList.remove("hidden");
        if (pauseBtn) pauseBtn.classList.add("hidden");
        if (statusText) statusText.textContent = `🎯 Soi Kèo & Dàn Trận: ${whiteName} vs ${blackName}`;

        const modeBadge = document.getElementById("game-mode-badge");
        if (modeBadge) modeBadge.textContent = "🎯 KHÁN GIẢ • SOI KÈO & DÀN TRẬN 30 VÀNG";

        const h2h = document.getElementById("banner-1v1-headtohead");
        const p1Name = document.getElementById("h2h-p1-name");
        const p2Name = document.getElementById("h2h-p2-name");
        const p1Hp = document.getElementById("h2h-p1-hp");
        const p2Hp = document.getElementById("h2h-p2-hp");

        if (h2h) h2h.classList.remove("hidden");
        if (p1Name) p1Name.textContent = `🤖 ${whiteName} (Trắng)`;
        if (p2Name) p2Name.textContent = `🤖 ${blackName} (Đen)`;
        if (p1Hp) p1Hp.textContent = "🪙 30/30 Vàng";
        if (p2Hp) p2Hp.textContent = "🪙 30/30 Vàng";

        const pClockLabel = document.getElementById("label-clock-player");
        const eClockLabel = document.getElementById("label-clock-enemy");
        if (pClockLabel) pClockLabel.textContent = "BOT TRẮNG";
        if (eClockLabel) eClockLabel.textContent = "BOT ĐEN";

        // Initialize empty board for drafting animation
        this.chess = new window.BlitzChessEngine({
            cols,
            rows,
            terrain,
            maxTurns: 55,
            playerSynergies: {},
            enemySynergies: {},
            playerAugments: [],
            enemyAugments: []
        });
        this.chess.setupBoard([], []);
        if (this.app) this.app.chess = this.chess;
        if (window.app) window.app.chess = this.chess;
        this.renderAll();
        this.renderRightPanel();

        const sortUnits = (arr) => {
            return [...arr].sort((a, b) => {
                if (a.isKing || a.id === "king") return -1;
                if (b.isKing || b.id === "king") return 1;
                return (b.cost || 0) - (a.cost || 0);
            });
        };

        const sortedWhite = sortUnits(whiteRawUnits || []);
        const sortedBlack = sortUnits(blackRawUnits || []);

        const whitePlaced = [];
        const blackPlaced = [];
        let whiteGold = 30;
        let blackGold = 30;

        let totalSteps = Math.max(sortedWhite.length, sortedBlack.length);
        let currentStep = 0;
        let isFinished = false;

        this.showToast("🎯 Giai đoạn Dàn Trận 30 Vàng! Đang theo dõi 2 bên tuyển chọn đội hình...", "info");

        const finishDraft = () => {
            if (isFinished) return;
            isFinished = true;
            if (this.draftShowcaseTimer) {
                clearInterval(this.draftShowcaseTimer);
                clearTimeout(this.draftShowcaseTimer);
                this.draftShowcaseTimer = null;
            }

            if (draftBadge) draftBadge.classList.add("hidden");
            if (skipBtn) skipBtn.classList.add("hidden");
            if (pauseBtn) pauseBtn.classList.remove("hidden");
            if (statusText) statusText.textContent = `Đang theo dõi: 🤖 ${whiteName} vs 🤖 ${blackName}`;
            if (modeBadge) modeBadge.textContent = "👁️ KHÁN GIẢ • 2 BOT TỰ ĐẤU 1V1";

            this.sfx.combatStart();
            this.showToast("⚔️ Dàn trận hoàn tất! Hai bên bắt đầu ván cờ chớp!", "success");

            if (onComplete) onComplete();
        };

        this.skipSpectatorDraft = finishDraft;
        if (skipBtn) skipBtn.onclick = () => finishDraft();

        const stepDuration = 700;
        let remainingSecs = Math.max(3, Math.ceil((totalSteps * stepDuration) / 1000));
        if (draftTimer) draftTimer.textContent = `${remainingSecs}s`;

        this.draftShowcaseTimer = setInterval(() => {
            if (isFinished) return;

            let hasPlacedAny = false;

            // Place White unit
            if (currentStep < sortedWhite.length) {
                const u = sortedWhite[currentStep];
                const piece = {
                    ...u,
                    uid: `white_${u.id}_${u.r}_${u.c}`,
                    items: []
                };
                whitePlaced.push(piece);
                whiteGold = Math.max(0, whiteGold - (u.cost || 0));
                hasPlacedAny = true;

                if (p1Hp) p1Hp.textContent = `🪙 ${whiteGold}/30 Vàng • ${whitePlaced.length} Quân`;
                this.showFloatingDraftTag(piece.r, piece.c, `-${u.cost || 0}🪙 ${u.id}`);
            }

            // Place Black unit (mirrored for top half)
            if (currentStep < sortedBlack.length) {
                const u = sortedBlack[currentStep];
                const mirR = (rows - 1) - u.r;
                const mirC = (cols - 1) - u.c;
                const piece = {
                    ...u,
                    r: mirR,
                    c: mirC,
                    uid: `black_${u.id}_${mirR}_${mirC}`,
                    items: []
                };
                blackPlaced.push(piece);
                blackGold = Math.max(0, blackGold - (u.cost || 0));
                hasPlacedAny = true;

                if (p2Hp) p2Hp.textContent = `🪙 ${blackGold}/30 Vàng • ${blackPlaced.length} Quân`;
                this.showFloatingDraftTag(mirR, mirC, `-${u.cost || 0}🪙 ${u.id}`);
            }

            if (hasPlacedAny) {
                if (this.sfx?.buy) this.sfx.buy();
                else if (this.sfx?.place) this.sfx.place();

                const playerSyn = this.tft.calculateSynergies({ board: whitePlaced });
                const enemySyn = this.tft.calculateSynergies({ board: blackPlaced });
                this.chess.playerSynergies = playerSyn;
                this.chess.enemySynergies = enemySyn;
                this.chess.setupBoard(whitePlaced, blackPlaced);
                this.renderAll();
                this.renderRightPanel();

                document.querySelectorAll(".board-cell.has-piece").forEach(el => {
                    el.classList.add("piece-spawn-bounce");
                    setTimeout(() => el.classList.remove("piece-spawn-bounce"), 450);
                });
            }

            currentStep++;
            remainingSecs = Math.max(0, remainingSecs - 1);
            if (draftTimer) draftTimer.textContent = `${remainingSecs}s`;

            if (currentStep >= totalSteps) {
                clearInterval(this.draftShowcaseTimer);
                this.draftShowcaseTimer = setTimeout(() => {
                    finishDraft();
                }, 800);
            }
        }, stepDuration);
    }

    runSkirmishCombat({ playerPieces, enemyMirrored, cols, rows, terrain, mapDef, clockSecs, clockInc, whiteName, blackName, opponentId, isWhite }) {
        const playerSyn = this.tft.calculateSynergies({ board: playerPieces });
        const enemySyn = this.tft.calculateSynergies({ board: enemyMirrored });

        this.chess = new window.BlitzChessEngine({
            cols,
            rows,
            terrain,
            maxTurns: 55,
            playerSynergies: playerSyn,
            enemySynergies: enemySyn,
            playerAugments: [],
            enemyAugments: []
        });

        this.chess.setupBoard(playerPieces, enemyMirrored);
        if (this.app) this.app.chess = this.chess;
        if (window.app) window.app.chess = this.chess;

        this.playerClock = clockSecs || 300;
        this.enemyClock = clockSecs || 300;
        this.skirmishClockIncrement = clockInc || 5;

        // White moves first
        this.chess.turn = "player";

        // Head-to-head banner
        const h2h = document.getElementById("banner-1v1-headtohead");
        if (h2h) {
            h2h.classList.remove("hidden");
            const p1Name = document.getElementById("h2h-p1-name");
            const p2Name = document.getElementById("h2h-p2-name");
            const p1Hp = document.getElementById("h2h-p1-hp");
            const p2Hp = document.getElementById("h2h-p2-hp");
            if (this.isSkirmishSpectator) {
                if (p1Name) p1Name.textContent = `🤖 ${whiteName} (Trắng)`;
                if (p2Name) p2Name.textContent = `🤖 ${blackName} (Đen)`;
            } else {
                if (p1Name) p1Name.textContent = `${this.currentUser?.name || "Bạn"} (${isWhite ? "Quân Trắng" : "Quân Đen"})`;
                if (p2Name) p2Name.textContent = `${isWhite ? blackName : whiteName} (${isWhite ? "Quân Đen" : "Quân Trắng"})`;
            }
            if (p1Hp) p1Hp.textContent = `${playerPieces.length} Quân`;
            if (p2Hp) p2Hp.textContent = `${enemyMirrored.length} Quân`;
        }

        const modeBadge = document.getElementById("game-mode-badge");
        if (modeBadge) {
            if (this.isSkirmishSpectator) {
                modeBadge.textContent = "👁️ KHÁN GIẢ • 2 BOT TỰ ĐẤU 1V1";
            } else {
                modeBadge.textContent = isWhite ? "⚔️ CỜ CHỚP 1V1 (BẠN ĐI TRẮNG - ĐI TRƯỚC)" : "⚔️ CỜ CHỚP 1V1 (BẠN ĐI ĐEN - ĐI SAU)";
            }
        }

        const specBar = document.getElementById("skirmish-spec-control-bar");
        const pauseBtn = document.getElementById("btn-skirmish-spec-pause");
        if (pauseBtn) pauseBtn.textContent = "⏸️ Tạm Dừng";

        if (this.isSkirmishSpectator) {
            if (specBar) specBar.classList.remove("hidden");
            const statusText = document.getElementById("skirmish-spec-status-text");
            if (statusText) statusText.textContent = `Đang theo dõi: 🤖 ${whiteName} vs 🤖 ${blackName}`;
        } else {
            if (specBar) specBar.classList.add("hidden");
        }

        const pb = document.getElementById("phase-banner");
        if (pb) {
            pb.textContent = "⚔️ GIAO TRANH CỜ CHỚP • LƯỢT TRẮNG ĐI TRƯỚC!";
            pb.className = "phase-banner phase-combat";
        }

        this.playCombatBgm();
        this.sfx.combatStart();

        this.renderAll();
        this.renderDpsMeter();

        this.stopCombatTimers();
        this.clockInterval = setInterval(() => {
            if (!this.chess || this.chess.gameOver) return;

            if (this.chess.turn === "player") {
                this.playerClock = Math.max(0, this.playerClock - 0.1);
                if (this.playerClock <= 0) {
                    this.chess.endMatch("enemy", "timeout", this.isSkirmishSpectator ? `${whiteName} hết thời gian!` : "Bạn hết thời gian đồng hồ Cờ Chớp!");
                    if (!this.isSkirmishSpectator && this.socket && this.socket.connected && this.currentRoom) {
                        this.socket.emit("skirmish:endMatch", {
                            roomCode: this.currentRoom.code,
                            winnerId: opponentId,
                            reason: "timeout",
                            reasonLabel: "Hết thời gian Cờ Chớp"
                        });
                    }
                    this.finishBlitzCombat();
                }
            } else {
                this.enemyClock = Math.max(0, this.enemyClock - 0.1);
                if (this.enemyClock <= 0) {
                    this.chess.endMatch("player", "timeout", this.isSkirmishSpectator ? `${blackName} hết thời gian!` : "Đối thủ hết thời gian đồng hồ Cờ Chớp!");
                    if (!this.isSkirmishSpectator && this.socket && this.socket.connected && this.currentRoom) {
                        this.socket.emit("skirmish:endMatch", {
                            roomCode: this.currentRoom.code,
                            winnerId: this.currentUser?.id,
                            reason: "timeout",
                            reasonLabel: "Đối thủ hết thời gian"
                        });
                    }
                    this.finishBlitzCombat();
                }
            }
            this.renderRightPanel();
        }, 100);

        if (this.isSkirmishSpectator) {
            this.scheduleSkirmishSpectatorTurn();
            this.showToast(`👁️ Bạn đang là Khán Giả theo dõi 2 bên đấu trí trên bản đồ ${mapDef.name}!`, "info");
        } else {
            if (isWhite) {
                this.showToast("⚔️ Bạn cầm QUÂN TRẮNG và được đi trước! Hãy ra nước cờ đầu tiên.", "success");
            } else {
                this.showToast("🛡️ Bạn cầm QUÂN ĐEN! Đang chờ đối thủ ra nước cờ đầu tiên...", "info");
                if (this.onlineSkirmishOpponentIsBot) {
                    this.scheduleBotTurn();
                }
            }
        }
    }

    scheduleSkirmishSpectatorTurn() {
        if (!this.chess || this.chess.gameOver || !this.isSkirmishSpectator) return;
        if (this.skirmishSpecPaused) return;

        if (this.skirmishSpecTimeout) {
            clearTimeout(this.skirmishSpecTimeout);
            this.skirmishSpecTimeout = null;
        }

        const side = this.chess.turn; // "player" (Bot Trắng) or "enemy" (Bot Đen)
        const speed = this.skirmishSpecSpeed || 1;
        const delay = Math.max(140, Math.round(750 / speed));

        this.skirmishSpecTimeout = setTimeout(() => {
            if (!this.chess || this.chess.gameOver || !this.isSkirmishSpectator || this.skirmishSpecPaused) return;

            const inc = this.skirmishClockIncrement || 5;
            const diff = this.skirmishState.botDifficulty;
            const blunder = side === "player" ? 0.15 : (diff === "apprentice" ? 0.35 : (diff === "veteran" ? 0.18 : 0.05));
            const botAct = this.chess.chooseBotAction(side, blunder);

            if (!botAct) {
                const opp = side === "player" ? "enemy" : "player";
                this.chess.endMatch(opp, "checkmate", `Không còn nước đi hợp lệ cho ${side === "player" ? "Bot Trắng" : "Bot Đen"}!`);
                this.finishBlitzCombat();
                return;
            }

            const res = this.chess.executeAction(botAct);
            if (res) {
                if (side === "player") this.playerClock += inc + (res.clockBonus || 0);
                else this.enemyClock += inc + (res.clockBonus || 0);

                if (botAct.type === "ranged") this.sfx.ranged();
                else if (botAct.type === "melee") this.sfx.hitArmor();
                else this.sfx.move();

                this.renderAll();

                if (res.combatHit) {
                    this.triggerCombatHitFx(res.combatHit);
                }

                if (res.gameOver || this.chess.gameOver) {
                    this.finishBlitzCombat();
                    return;
                }

                this.scheduleSkirmishSpectatorTurn();
            }
        }, delay);
    }

}

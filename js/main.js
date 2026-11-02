// ============================================================================
// CHESS TFT - MAIN APPLICATION ORCHESTRATOR (ES MODULE)
// Assembles Core Engine, TFT Manager, UI Controllers, Audio & Network Services
// ============================================================================

import { getGameDataBundle } from './data/index.js';
import { BlitzChessEngine } from './core/engine/ChessEngine.js';
import { TFTGameManager } from './core/tft/TFTGameManager.js';
import { eventBus } from './core/events/EventBus.js';
import { GAME_EVENTS } from './core/events/GameEvents.js';

// Services
import { SoundFX } from './services/AudioService.js';
import { ApiService } from './services/ApiService.js';
import { networkService } from './services/NetworkService.js';
import { InputHandler } from './input/InputHandler.js';

// UI Controllers
import { ToastManager } from './ui/ToastManager.js';
import { ScreenRouter } from './ui/ScreenRouter.js';
import { TooltipManager } from './ui/TooltipManager.js';
import { HUDController } from './ui/HUDController.js';
import { UnitInspector } from './ui/UnitInspector.js';
import { PieceRenderer } from './ui/PieceRenderer.js';
import { ShopController } from './ui/ShopController.js';
import { SynergyPanel } from './ui/SynergyPanel.js';
import { BenchController } from './ui/BenchController.js';
import { BoardController } from './ui/BoardController.js';
import { SpectatorController } from './ui/SpectatorController.js';
import { WaitingRoomController } from './ui/WaitingRoomController.js';
import { AdminPanelController } from './ui/AdminPanelController.js';
import { CodexController } from './ui/CodexController.js';
import { SkirmishController } from './ui/SkirmishController.js';
import { SandboxController } from './ui/SandboxController.js';
import { ModalController } from './ui/ModalController.js';

// STUDIO GAME UI HELPERS: LUCIDE VECTOR ICONS & HEXTECH TOOLTIPS
window.renderLucideIcons = function(targetEl = null) {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
        try {
            if (targetEl && targetEl instanceof HTMLElement) {
                window.lucide.createIcons({ root: targetEl });
            } else {
                window.lucide.createIcons();
            }
        } catch (e) {
            console.warn("Lucide render warning:", e);
        }
    }
};

window.initGameTooltips = function(targetEl = null) {
    if (window.tippy) {
        try {
            const selector = targetEl ? targetEl.querySelectorAll("[data-tippy-content]") : document.querySelectorAll("[data-tippy-content]");
            if (selector.length > 0) {
                window.tippy(selector, {
                    theme: 'hextech',
                    animation: 'shift-away',
                    arrow: true,
                    duration: [150, 100],
                });
            }
        } catch (e) {}
    }
};

export class ChessTFTApp {
    constructor() {
        window.game = this;
        window.app = this;
        this.eventBus = eventBus;

        // Static Game Data & Engine Globals (Compatibility Bridge)
        window.CHESS_TFT_DATA = getGameDataBundle();
        window.BlitzChessEngine = BlitzChessEngine;
        window.TFTGameManager = TFTGameManager;

        // Core Managers & Services
        this.tft = new TFTGameManager();
        this.chess = null;
        this.sfx = new SoundFX();
        this.api = ApiService;
        this.networkService = networkService;
        this.inputHandler = new InputHandler(this);

        // UI Controllers
        this.toastManager = new ToastManager();
        this.screenRouter = new ScreenRouter();
        this.tooltipManager = new TooltipManager();
        this.hudController = new HUDController();
        this.unitInspector = new UnitInspector();
        this.shopController = new ShopController();
        this.synergyPanel = new SynergyPanel();
        this.boardController = new BoardController(this);
        this.benchController = new BenchController(this);
        this.spectatorController = new SpectatorController(this);
        this.waitingRoomController = new WaitingRoomController(this);
        this.adminPanelController = new AdminPanelController(this);
        this.codexController = new CodexController(this);
        this.skirmishController = new SkirmishController(this);
        this.sandboxController = new SandboxController(this);
        this.modalController = new ModalController(this);

        this.currentUser = null;
        this.selectedRegAvatar = "👑";
        this.currentRoom = null;
        this.socket = null;
        this.onlineSkirmishOpponentIsBot = false;
        this.codexActiveTab = "pieces";
        this.adminDbCache = null;
        this.selectedAdminUserId = null;
        this.selectedAdminPieceId = "shield_pawn";

        this.tft = new window.TFTGameManager();
        this.chess = null;

        // UI interaction state
        this.selectedPrepUnitUid = null;
        this.selectedItemIndex = null;
        this.isRemoverActive = false;
        this.selectedCombatSquare = null;
        this.validCombatActions = [];
        this.hoveredUnit = null; // { type: 'board'|'bench', unit, r, c, slotIndex, uid }
        this.hoveredCell = null; // { r, c }
        this.hoveredBenchSlot = null; // index 0..7

        // Blitz timers (in seconds)
        this.playerClock = 45;
        this.enemyClock = 45;
        this.clockInterval = null;
        this.botMoveTimeout = null;

        // 8-Bot Spectator (4-Screen Split View) state
        this.specMatches = [];
        this.specSpeed = 1;
        this.specPaused = false;
        this.specZoomIndex = null;
        this.specMoveInterval = null;
        this.specClockInterval = null;
        this.specAutoNextTimeout = null;
        this.specGlobalLogs = [];

        // In-Match Spectator Modes (Mode 1: POV 1 Kỳ Thủ, Mode 2: Multi-Screen 4 Bàn Đấu)
        this.spectatorMode = "multi"; // "multi" | "pov"
        this.isSpectatorPOV = false;
        this.spectatorPovTargetId = null;

        // Auto countdown timers (Anti-stalling / Chống câu giờ)
        this.prepTimer = null;
        this.prepSecondsLeft = 40; // 40s chuẩn bị (+10s theo feedback)
        this.augmentTimer = null;
        this.augmentSecondsLeft = 15;
        this.carouselTimer = null;
        this.carouselSecondsLeft = 12;
        this.roundResultTimer = null;
        this.roundResultSecondsLeft = 4;

        // Post-match spectate states
        this.isPostMatchSpectating = false;
        this.isFinishedCombat = false;

        // Sandbox / Training Mode state
        this.isSandboxMode = false;
        this.sandboxEnemyAI = true;

        // 1v1 Tactical Skirmish Mode state
        this.isSkirmishMode = false;
        this.skirmishRole = "player"; // "player" | "spectator"
        this.isSkirmishSpectator = false;
        this.skirmishSpecPaused = false;
        this.skirmishSpecSpeed = 1;
        this.skirmishSpecTimeout = null;
        this.guideMode = localStorage.getItem("chesstft_guide_mode") || "beginner";
        this.skirmishState = {
            budget: 30,
            goldRemaining: 30,
            mapId: "stone_fortress",
            botDifficulty: "grandmaster",
            timeControl: "300_5",
            selectedRosterPieceId: null,
            selectedBoardPos: null,
            units: [
                { uid: "skirmish_king", id: "king", r: 6, c: 2, stars: 1, cost: 0, isKing: true }
            ]
        };


        this.initSocket();
        this.bindStaticEvents();
        this.bindAuthAndLobbyEvents();
        this.initSkirmishEvents();
        this.bindAdminEvents();
        this.bindSpectatorEvents();
        this.loadInitialConfigAndSession();
    }


    async loadInitialConfigAndSession() {
        try {
            const res = await fetch("api.php?action=config");
            if (res.ok) {
                const data = await res.json();
                if (data.ok && window.applyDatabaseConfigToRuntime) {
                    window.applyDatabaseConfigToRuntime(data.rules, data.entities);
                }
                const badge = document.getElementById("lobby-online-status");
                if (badge && (!this.socket || !this.socket.connected)) {
                    badge.textContent = `🟢 Đã kết nối ${data.dbEngine || "WampServer (PHP + MySQL)"}`;
                }
            }
        } catch (e) {
            // Running offline via file:// is also supported
        }

        const savedUser = localStorage.getItem("chesstft_user");
        if (savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                if (parsed && parsed.username) {
                    this.onLoginSuccess(parsed);
                    if (window.location.search.includes("spectate=1")) {
                        this.start8BotSpectatorMode();
                    }
                    return;
                }
            } catch (e) {}
        }

        if (window.location.search.includes("spectate=1")) {
            this.onLoginSuccess({
                id: "u_admin",
                username: "admin",
                displayName: "GM Tối Cao (Admin)",
                avatar: "👑",
                role: "admin",
                stats: { elo: 1500, gamesPlayed: 12, top1Count: 6 },
                customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["stun_hammer", "burn_cloak"] }
            });
            this.start8BotSpectatorMode();
            return;
        }
        this.showScreen("auth");
    }

    showScreen(screenName, pushToHistory = true) {
        this.currentScreen = screenName;
        document.getElementById("screen-auth").classList.toggle("hidden", screenName !== "auth");
        document.getElementById("screen-lobby").classList.toggle("hidden", screenName !== "lobby");
        document.getElementById("screen-game").classList.toggle("hidden", screenName !== "game");
        const specEl = document.getElementById("screen-spectator");
        if (specEl) specEl.classList.toggle("hidden", screenName !== "spectator");
        this.hideSynergyTooltip();

        if (screenName !== "game") {
            document.body.classList.remove("skirmish-active");
            const shopHud = document.querySelector(".tft-bottom-hud");
            if (shopHud) shopHud.classList.remove("hidden");
            const benchRow = document.querySelector(".bench-container");
            if (benchRow) benchRow.classList.remove("hidden");
            const prepTimer = document.getElementById("prep-timer-badge");
            if (prepTimer) prepTimer.classList.remove("hidden");
        }

        if (screenName === "auth") {
            this.sfx.playBgm("title");
        } else if (screenName === "lobby" || screenName === "spectator") {
            this.sfx.playBgm("lobby");
        } else if (screenName === "game") {
            if (this.isSkirmishMode || (this.tft && this.tft.phase === "combat")) {
                this.playCombatBgm();
            } else {
                this.playPrepBgm();
            }
        }

        if (pushToHistory && window.history && window.history.pushState) {
            window.history.pushState({ screen: screenName, tab: this.currentLobbyTab || "play" }, "");
        }
        window.renderLucideIcons();
    }

    playCombatBgm() {
        if (!this.sfx) return;
        const stage = this.tft ? (this.tft.stage || 1) : 1;
        const playerHp = this.tft?.player?.hp ?? 100;
        const oppHp = this.tft?.currentOpponent?.hp ?? 100;
        const roundInStage = this.tft?.roundInStage || 1;

        // Cao trào combat giữ nguyên: Máu sinh tử <= 25 HP hoặc vòng quyết chiến 4-4/4-5
        const isClimax = (playerHp <= 25 || oppHp <= 25 || (stage >= 4 && roundInStage >= 4));

        if (isClimax) {
            this.sfx.playBgm("combat_climax");
        } else if (stage <= 2) {
            // Giao tranh đầu game (Stage 1 & 2): Spring Meadows - Beneath the Blue Tree
            this.sfx.playBgm("combat_early");
        } else {
            // Giao tranh giữa và cuối game (Stage 3+): The Manor - Clea!
            this.sfx.playBgm("combat");
        }
    }

    playPrepBgm() {
        if (!this.sfx) return;
        // Giai đoạn chuẩn bị (Shop / Bench / Xếp quân cờ): Xoay tua bản nhạc Yellow Forest & Camp Preparation
        const stage = this.tft?.stage || 1;
        const trackKey = (stage % 2 === 0) ? "prep_alt" : "prep";
        this.sfx.playBgm(trackKey);
    }

    cycleScoutingPlayer(direction = 1) {
        if (!this.tft) return;
        const all = this.tft.getAllParticipants ? this.tft.getAllParticipants() : [];
        if (all.length <= 1) return;
        const currentId = this.tft.scoutingPlayerId || "player";
        const currentIndex = all.findIndex(p => p.id === currentId);
        let nextIndex = (currentIndex + direction + all.length) % all.length;
        this.tft.scoutingPlayerId = all[nextIndex].id;
        const target = all[nextIndex];
        this.showToast(`👁️ Đang xem nhà: ${target.name} (${target.avatar || "🦊"})`, "info");
        this.renderAll();
    }

    startEliminatedSpectatorSession() {
        this.stopCombatTimers();
        this.clearAllCountdowns();
        this.isPostMatchSpectating = false;

        if (this.currentRoom && this.currentRoom.code !== "SOLO") {
            this.startMultiplayerSpectatorSession(this.currentRoom);
        } else {
            const aliveBots = this.tft.getAllParticipants().filter(p => !p.eliminated && p.id !== "player");
            this.tft.spectatorBots = aliveBots.length > 0 ? aliveBots : (this.tft.bots || []);
            this.spectatorPovTargetId = this.tft.spectatorBots[0]?.id || "bot_0";
            this.setSpectatorMode("pov", this.spectatorPovTargetId);
            this.showScreen("spectator");
            this.startSpectatorRoundMatches();
        }
        this.showToast("👁️ Bạn đang ở chế độ Khán Giả theo dõi giải đấu!", "info");
    }

    preloadUpcomingCombatTrack() {
        if (!this.sfx || !this.tft) return;
        const stage = this.tft.stage || 1;
        const playerHp = this.tft?.player?.hp ?? 100;
        const oppHp = this.tft?.currentOpponent?.hp ?? 100;
        const roundInStage = this.tft?.roundInStage || 1;
        const isClimax = (playerHp <= 25 || oppHp <= 25 || (stage >= 4 && roundInStage >= 4));
        const trackKey = isClimax ? "combat_climax" : (stage <= 2 ? "combat_early" : "combat");
        this.sfx.preloadTrack(trackKey);
    }


    // ========================================================================
    // DELEGATION BRIDGES TO MODULAR UI CONTROLLERS
    // ========================================================================
    showToast(msg, type = "info") {
        if (this.toastManager) this.toastManager.show(msg, type);
        else eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: msg, type });
    }

    renderShop() {
        if (this.shopController) this.shopController.renderShop(this);
    }

    toggleLockShop() {
        if (this.shopController) this.shopController.toggleLockShop(this);
    }

    handleHotkeyReroll() {
        if (this.shopController) this.shopController.handleHotkeyReroll(this);
    }

    handleHotkeyBuyXP() {
        if (this.shopController) this.shopController.handleHotkeyBuyXP(this);
    }

    handleHotkeySellPiece() {
        if (this.benchController) this.benchController.handleHotkeySellPiece(this);
    }

    handleHotkeyDeployOrRecall() {
        if (this.benchController) this.benchController.handleHotkeyDeployOrRecall(this);
    }

    renderBench() {
        if (this.benchController) this.benchController.render(this);
    }

    renderBoardArea() {
        if (this.boardController) this.boardController.renderBoardArea(this);
    }

    renderPrepBoardCells(boardEl, cfg, viewed, isScouting) {
        if (this.boardController) this.boardController.renderPrepBoardCells(this, boardEl, cfg, viewed, isScouting);
    }

    handlePrepBoardClick(r, c, unit) {
        if (this.boardController) this.boardController.handlePrepBoardClick(this, r, c, unit);
    }

    renderCombatBoardCells(boardEl, cfg) {
        if (this.boardController) this.boardController.renderCombatBoardCells(this, boardEl, cfg);
    }

    triggerCombatHitFx(hit) {
        if (this.boardController) this.boardController.triggerCombatHitFx(hit, this);
    }

    createPieceDOM(piece) {
        return PieceRenderer.createPieceDOM(piece, this.tooltipManager);
    }

    renderSynergies() {
        if (this.synergyPanel) this.synergyPanel.render(this);
    }

    showSynergyTooltip(traitId, evt, p) {
        if (this.tooltipManager) this.tooltipManager.showSynergyTooltip(traitId, evt, p);
    }

    moveSynergyTooltip(evt) {
        if (this.tooltipManager) this.tooltipManager.moveSynergyTooltip(evt);
    }

    hideSynergyTooltip() {
        if (this.tooltipManager) this.tooltipManager.hideSynergyTooltip();
    }

    showItemTooltip(itemId, evt) {
        if (this.tooltipManager) this.tooltipManager.showItemTooltip(itemId, evt);
    }

    moveItemTooltip(evt) {
        if (this.tooltipManager) this.tooltipManager.moveItemTooltip(evt);
    }

    hideItemTooltip() {
        if (this.tooltipManager) this.tooltipManager.hideItemTooltip();
    }

    showPieceMovementTooltip(pieceId, evt) {
        if (this.tooltipManager) this.tooltipManager.showPieceMovementTooltip(pieceId, evt);
    }

    movePieceMovementTooltip(evt) {
        if (this.tooltipManager) this.tooltipManager.movePieceMovementTooltip(evt);
    }

    hidePieceMovementTooltip() {
        if (this.tooltipManager) this.tooltipManager.hidePieceMovementTooltip();
    }

    renderSelectedUnitInspector() {
        if (this.unitInspector) this.unitInspector.render(this);
    }

    // Codex & Piece Guide
    renderCodex() {
        if (this.codexController) this.codexController.renderCodex();
    }

    openPieceGuide(pieceId) {
        if (this.codexController) this.codexController.openPieceGuide(pieceId);
    }

    closePieceGuide() {
        if (this.codexController) this.codexController.closePieceGuide();
    }

    renderPieceGuide(selectedId, filter) {
        if (this.codexController) this.codexController.renderPieceGuide(selectedId, filter);
    }

    getPieceMovementGrid(pieceId) {
        return this.codexController ? this.codexController.getPieceMovementGrid(pieceId) : [];
    }

    highlightPieceMovementPreview(pieceId, r, c) {
        if (this.codexController) this.codexController.highlightPieceMovementPreview(pieceId, r, c);
    }

    highlightCombatPieceHover(r, c) {
        if (this.codexController) this.codexController.highlightCombatPieceHover(r, c);
    }

    clearMovementPreview() {
        if (this.codexController) this.codexController.clearMovementPreview();
    }

    // Waiting Room & Bots
    renderWaitingRoom() {
        if (this.waitingRoomController) this.waitingRoomController.render(this);
    }

    addBotToRoom(profile) {
        if (this.waitingRoomController) this.waitingRoomController.addBotToRoom(this, profile);
    }

    removeBotFromRoom(botId) {
        if (this.waitingRoomController) this.waitingRoomController.removeBotFromRoom(this, botId);
    }

    fillAllBotsInRoom() {
        if (this.waitingRoomController) this.waitingRoomController.fillAllBotsInRoom(this);
    }

    clearAllBotsInRoom() {
        if (this.waitingRoomController) this.waitingRoomController.clearAllBotsInRoom(this);
    }

    // Admin Panel
    bindAdminEvents() {
        if (this.adminPanelController) this.adminPanelController.bindAdminEvents();
    }

    openAdminDatabaseModal() {
        if (this.adminPanelController) this.adminPanelController.openAdminDatabaseModal();
    }

    renderAdminUsersTab() {
        if (this.adminPanelController) this.adminPanelController.renderAdminUsersTab();
    }

    renderAdminRulesTab() {
        if (this.adminPanelController) this.adminPanelController.renderAdminRulesTab();
    }

    renderAdminPiecesTab() {
        if (this.adminPanelController) this.adminPanelController.renderAdminPiecesTab();
    }

    // Spectator
    bindSpectatorEvents() {
        if (this.spectatorController) this.spectatorController.bindSpectatorEvents(this);
    }

    start8BotSpectatorMode() {
        if (this.spectatorController) this.spectatorController.start8BotSpectatorMode(this);
    }

    startMultiplayerSpectatorSession(roomData) {
        if (this.spectatorController) this.spectatorController.startMultiplayerSpectatorSession(this, roomData);
    }

    startSpectatorRoundMatches() {
        if (this.spectatorController) this.spectatorController.startSpectatorRoundMatches(this);
    }

    scheduleSpectatorTick() {
        if (this.spectatorController) this.spectatorController.scheduleSpectatorTick(this);
    }

    tickSpectatorMoves() {
        if (this.spectatorController) this.spectatorController.tickSpectatorMoves(this);
    }

    checkAllSpectatorMatchesFinished() {
        if (this.spectatorController) this.spectatorController.checkAllSpectatorMatchesFinished(this);
    }

    advanceSpectatorNextRound() {
        if (this.spectatorController) this.spectatorController.advanceSpectatorNextRound(this);
    }

    stopSpectatorTimers() {
        if (this.spectatorController) this.spectatorController.stopSpectatorTimers();
    }

    updateSpectatorClocksOnly() {
        if (this.spectatorController) this.spectatorController.updateSpectatorClocksOnly();
    }

    updateSpectatorPovClocksOnly() {
        if (this.spectatorController) this.spectatorController.updateSpectatorPovClocksOnly(this);
    }

    renderSpectatorView() {
        if (this.spectatorController) this.spectatorController.renderSpectatorView(this);
    }

    renderSpectatorLeaderboard() {
        if (this.spectatorController) this.spectatorController.renderSpectatorLeaderboard(this);
    }

    renderSpectatorMatchCard(m, cfg) {
        return this.spectatorController ? this.spectatorController.renderSpectatorMatchCard(this, m, cfg) : null;
    }

    setSpectatorMode(mode, targetId) {
        if (this.spectatorController) this.spectatorController.setSpectatorMode(this, mode, targetId);
    }

    cycleSpectatorPOVTarget(dir) {
        if (this.spectatorController) this.spectatorController.cycleSpectatorPOVTarget(this, dir);
    }

    getViewedParticipant() {
        return this.spectatorController ? this.spectatorController.getViewedParticipant(this) : this.tft.player;
    }

    renderSpectatorPOV() {
        if (this.spectatorController) this.spectatorController.renderSpectatorPOV(this);
    }

    renderSpectatorPOVBoard(boardEl, cfg) {
        if (this.spectatorController) this.spectatorController.renderSpectatorPOVBoard(this, boardEl, cfg);
    }

    renderSpectatorEngineOnMainBoard(boardEl, cfg, m, viewed) {
        if (this.spectatorController) this.spectatorController.renderSpectatorEngineOnMainBoard(this, boardEl, cfg, m, viewed);
    }

    renderSpectatorPOVLeaderboard() {
        if (this.spectatorController) this.spectatorController.renderSpectatorPOVLeaderboard(this);
    }

    // Skirmish
    initSkirmishEvents() {
        if (this.skirmishController) this.skirmishController.initSkirmishEvents();
    }

    loadMetaCompToSkirmish(comp) {
        if (this.skirmishController) this.skirmishController.loadMetaCompToSkirmish(comp);
    }

    openMetaCompsModal() {
        if (this.skirmishController) this.skirmishController.openMetaCompsModal();
    }

    renderMetaCompsModal(tier) {
        if (this.skirmishController) this.skirmishController.renderMetaCompsModal(tier);
    }

    openSkirmishBuilderModal() {
        if (this.skirmishController) this.skirmishController.openSkirmishBuilderModal();
    }

    closeSkirmishBuilderModal() {
        if (this.skirmishController) this.skirmishController.closeSkirmishBuilderModal();
    }

    startSkirmishBattle() {
        if (this.skirmishController) this.skirmishController.startSkirmishBattle();
    }

    startOnlineSkirmishBattle(roomData) {
        if (this.skirmishController) this.skirmishController.startOnlineSkirmishBattle(roomData);
    }

    // Sandbox & Tutorial
    startTutorialSession() {
        if (this.sandboxController) this.sandboxController.startTutorialSession();
    }

    advanceTutorialStep(step) {
        if (this.sandboxController) this.sandboxController.advanceTutorialStep(step);
    }

    finishTutorialSession() {
        if (this.sandboxController) this.sandboxController.finishTutorialSession();
    }

    startSandboxSession() {
        if (this.sandboxController) this.sandboxController.startSandboxSession();
    }

    renderDpsMeter() {
        if (this.sandboxController) this.sandboxController.renderDpsMeter();
    }

    // Modals & Countdowns
    openStageArmoryModal(choices, newStage) {
        if (this.modalController) this.modalController.openStageArmoryModal(choices, newStage);
    }

    openAugmentModal(choices) {
        if (this.modalController) this.modalController.openAugmentModal(choices);
    }

    openCarouselModal(items) {
        if (this.modalController) this.modalController.openCarouselModal(items);
    }

    startPrepCountdown() {
        if (this.modalController) this.modalController.startPrepCountdown();
    }

    clearPrepCountdown() {
        if (this.modalController) this.modalController.clearPrepCountdown();
    }

    startAugmentCountdown() {
        if (this.modalController) this.modalController.startAugmentCountdown();
    }

    clearAugmentCountdown() {
        if (this.modalController) this.modalController.clearAugmentCountdown();
    }

    startCarouselCountdown() {
        if (this.modalController) this.modalController.startCarouselCountdown();
    }

    clearCarouselCountdown() {
        if (this.modalController) this.modalController.clearCarouselCountdown();
    }

    startRoundResultCountdown() {
        if (this.modalController) this.modalController.startRoundResultCountdown();
    }

    clearRoundResultCountdown() {
        if (this.modalController) this.modalController.clearRoundResultCountdown();
    }

    clearAllCountdowns() {
        if (this.modalController) this.modalController.clearAllCountdowns();
    }

    showRoundResultModal(res) {
        if (this.modalController) this.modalController.showRoundResultModal(res);
    }

    proceedAfterRoundModal() {
        if (this.modalController) this.modalController.proceedAfterRoundModal();
    }

    startNewGameSession(roomData = null) {
        this.stopCombatTimers();
        this.clearAllCountdowns();
        this.isOnlineSkirmish = false;
        this.tft.resetGame(this.currentUser, roomData);
        this.chess = null;
        this.selectedPrepUnitUid = null;

        const is1v1TFT = roomData && (roomData.mode === "tft_1v1" || roomData.maxPlayers === 2);
        const roomBadge = document.getElementById("game-room-badge");
        if (roomBadge) {
            if (is1v1TFT) {
                roomBadge.textContent = `⚔️ TFT 1v1: #${roomData.code}`;
            } else {
                roomBadge.textContent = roomData ? `Phòng: #${roomData.code}` : "Chế độ: Đấu Đơn";
            }
        }

        const h2h = document.getElementById("banner-1v1-headtohead");
        if (h2h) {
            if (is1v1TFT) {
                h2h.classList.remove("hidden");
                const opp = (roomData.players || []).find(p => p.id !== this.currentUser?.id) || { name: "Đối Thủ 1v1" };
                const p1Name = document.getElementById("h2h-p1-name");
                const p2Name = document.getElementById("h2h-p2-name");
                const p1Hp = document.getElementById("h2h-p1-hp");
                const p2Hp = document.getElementById("h2h-p2-hp");
                if (p1Name) p1Name.textContent = this.currentUser?.name || "Bạn";
                if (p2Name) p2Name.textContent = opp.name || "Đối Thủ";
                if (p1Hp) p1Hp.textContent = `${this.tft.player.hp} HP`;
                if (p2Hp) p2Hp.textContent = `${opp.hp !== undefined ? opp.hp : 100} HP`;
            } else {
                h2h.classList.add("hidden");
            }
        }

        this.showScreen("game");
        this.renderAll();
        this.syncMyStateToRoom();
        this.startPrepCountdown();
        this.showToast(is1v1TFT ? "⚔️ Trận đấu TFT 1v1 bắt đầu! Đối đầu trực tiếp qua từng vòng cờ!" : "⚔️ Trận đấu bắt đầu! Hãy mua quân, xếp đội hình và chuẩn bị giao tranh!", "success");
    }


    initSocket() {
        if (typeof window.io !== "function") {
            const badge = document.getElementById("lobby-online-status");
            if (badge) badge.textContent = "🟢 Chế độ WampServer (Apache + PHP + MySQL)";
            this.fetchOpenRoomsViaPhp();
            return;
        }
        try {
            this.socket = window.io();
            this.socket.on("connect", () => {
                const badge = document.getElementById("lobby-online-status");
                if (badge) badge.textContent = "🟢 Đã kết nối Server Online";
            });
            this.socket.on("connect_error", (err) => {
                const badge = document.getElementById("lobby-online-status");
                if (badge) badge.textContent = "🟡 Mất kết nối Socket - Đang thử lại...";
                console.warn("Socket.io connect error:", err.message);
            });

            this.socket.on("config:updated", ({ rules, entities }) => {
                if (window.applyDatabaseConfigToRuntime) {
                    window.applyDatabaseConfigToRuntime(rules, entities);
                }
                this.renderCodex();
                if (!document.getElementById("screen-game").classList.contains("hidden")) {
                    this.renderAll();
                }
                this.showToast("⚙️ Database vừa được Admin cập nhật trực tiếp!", "info");
            });

            this.socket.on("rooms:list", (list) => {
                this.renderOpenRoomsList(list || []);
            });

            this.socket.on("room:updated", (room) => {
                this.currentRoom = room;
                this.renderWaitingRoom();
            });

            this.socket.on("room:matchStarted", ({ room, rules, entities }) => {
                if (window.applyDatabaseConfigToRuntime) {
                    window.applyDatabaseConfigToRuntime(rules, entities);
                }
                this.currentRoom = room;
                this.isRankedMode = !!room.isRanked;

                const isPlayer = Array.isArray(room.players) && room.players.some(p =>
                    (this.currentUser && p.id === this.currentUser.id) ||
                    (this.socket && p.socketId === this.socket.id)
                );
                const isSpectator = !isPlayer || (room.isSpectatorHost && this.currentUser?.id === room.hostId) ||
                    (Array.isArray(room.spectators) && room.spectators.some(s => s.id === this.currentUser?.id || s.socketId === this.socket?.id));

                if (isSpectator) {
                    this.startMultiplayerSpectatorSession(room);
                    return;
                }

                if (this.currentUser) {
                    const meInRoom = room.players.find(p => p.id === this.currentUser.id);
                    if (meInRoom && meInRoom.customModifiers) {
                        this.currentUser.customModifiers = meInRoom.customModifiers;
                    }
                }
                this.startNewGameSession(room);
            });

            this.socket.on("matchmaking:matched", ({ room, rules, entities }) => {
                if (this.matchmakingTimer) {
                    clearInterval(this.matchmakingTimer);
                    this.matchmakingTimer = null;
                }
                document.getElementById("modal-matchmaking")?.classList.add("hidden");
                if (window.applyDatabaseConfigToRuntime) {
                    window.applyDatabaseConfigToRuntime(rules, entities);
                }
                this.currentRoom = room;
                this.isRankedMode = true;
                if (this.currentUser) {
                    const meInRoom = room.players.find(p => p.id === this.currentUser.id);
                    if (meInRoom && meInRoom.customModifiers) {
                        this.currentUser.customModifiers = meInRoom.customModifiers;
                    }
                }
                this.showToast("⚔️ ĐÃ TÌM THẤY TRẬN ĐẤU XẾP HẠNG! VÀO ĐẤU TRƯỜNG!", "success");
                this.startNewGameSession(room);
            });

            this.socket.on("room:roundCombatProgress", ({ key, stage, round, finishedCount, totalHumans, allDone }) => {
                this.roundSyncFinishedCount = finishedCount;
                this.roundSyncTotalHumans = totalHumans;
                const text = document.getElementById("sync-sub-text");
                if (text) {
                    text.textContent = `Đang chờ các kỳ thủ khác kết thúc vòng ${key || ""} (${finishedCount}/${totalHumans} kỳ thủ đã xong)...`;
                }
                const resultTimerEl = document.getElementById("round-result-timer");
                if (resultTimerEl && this.isWaitingForRoundSync && !this.allBoardsFinishedCurrentRound) {
                    resultTimerEl.textContent = `⏳ Đang chờ kỳ thủ khác (${finishedCount}/${totalHumans} xong)...`;
                }
            });

            this.socket.on("room:allBoardsFinished", ({ key }) => {
                this.allBoardsFinishedCurrentRound = true;
                this.isWaitingForRoundSync = false;
                this.showToast("✅ Tất cả kỳ thủ đã hoàn tất vòng! Chuẩn bị chuyển vòng...", "success");
                try { this.sfx.victory(); } catch (e) {}

                const banner = document.getElementById("banner-waiting-sync");
                const titleEl = document.getElementById("sync-title-text");
                const subEl = document.getElementById("sync-sub-text");
                const modal = document.getElementById("modal-round-result");

                if (banner && !banner.classList.contains("hidden")) {
                    if (titleEl) titleEl.textContent = "✅ TẤT CẢ KỲ THỦ ĐÃ HOÀN TẤT VÒNG!";
                    if (subEl) subEl.textContent = "Đang đồng bộ chuyển sang vòng tiếp theo trong 1.5s...";
                    setTimeout(() => {
                        banner.classList.add("hidden");
                        this.proceedAfterRoundModal();
                        this.syncMyStateToRoom();
                    }, 1500);
                    return;
                }

                if (modal && !modal.classList.contains("hidden")) {
                    const btnNext = document.getElementById("btn-next-round");
                    if (btnNext) btnNext.textContent = "✅ Cả Phòng Đã Xong — Chuyển Vòng";
                    const timerEl = document.getElementById("round-result-timer");
                    if (timerEl) timerEl.textContent = "✅ Đang chuyển sang vòng tiếp theo...";
                    setTimeout(() => {
                        modal.classList.add("hidden");
                        this.proceedAfterRoundModal();
                        this.syncMyStateToRoom();
                    }, 1200);
                    return;
                }

                // If player is already on game screen scouting
                if (banner) banner.classList.add("hidden");
                this.proceedAfterRoundModal();
                this.syncMyStateToRoom();
            });

            this.socket.on("match:remotePlayerState", ({ playerId, state }) => {
                if (!this.tft || !state) return;
                const remotePart = this.tft.bots?.find(b => b.remoteUserId === playerId);
                if (remotePart) {
                    remotePart.hp = state.hp;
                    remotePart.level = state.level;
                    if (state.gold !== undefined) remotePart.gold = state.gold;
                    if (state.streak !== undefined) remotePart.streak = state.streak;
                    if (Array.isArray(state.board)) remotePart.board = state.board;
                    if (Array.isArray(state.bench)) remotePart.bench = state.bench;
                    if (Array.isArray(state.items)) remotePart.items = state.items;
                    if (Array.isArray(state.augments)) remotePart.augments = state.augments;
                    if (state.eliminated !== undefined) remotePart.eliminated = state.eliminated;
                    this.renderLeaderboard();
                    if (this.tft.scoutingPlayerId === remotePart.id) {
                        this.renderBoardArea();
                        this.renderSynergies();
                        this.renderBench();
                        this.renderRightPanel();
                    }
                }
                // Also update in spectator tournament if spectator mode is active
                if (Array.isArray(this.tft.spectatorBots)) {
                    const specPart = this.tft.spectatorBots.find(b => b.remoteUserId === playerId || b.id === playerId);
                    if (specPart) {
                        specPart.hp = state.hp;
                        specPart.level = state.level;
                        if (state.gold !== undefined) specPart.gold = state.gold;
                        if (state.streak !== undefined) specPart.streak = state.streak;
                        if (Array.isArray(state.board)) specPart.board = state.board;
                        if (Array.isArray(state.bench)) specPart.bench = state.bench;
                        if (Array.isArray(state.items)) specPart.items = state.items;
                        if (Array.isArray(state.augments)) specPart.augments = state.augments;
                        if (state.eliminated !== undefined) specPart.eliminated = state.eliminated;
                        if (this.currentScreen === "spectator") {
                            this.renderSpectatorView();
                        } else if (this.isSpectatorPOV && this.spectatorPovTargetId === specPart.id) {
                            this.renderSpectatorPOV();
                        }
                    }
                }
            });

            // ================================================================
            // SKIRMISH 1V1 ONLINE PVP SOCKET EVENTS
            // ================================================================
            this.socket.on("skirmish:setupArmy", ({ room }) => {
                this.currentRoom = room;
                const isPlayer = Array.isArray(room.players) && room.players.some(p =>
                    (this.currentUser && p.id === this.currentUser.id) ||
                    (this.socket && p.socketId === this.socket.id)
                );
                if (!isPlayer) {
                    this.isOnlineSkirmish = true;
                    this.isSkirmishMode = true;
                    this.isSkirmishSpectator = true;
                    this.skirmishRole = "spectator";
                    this.showToast("👁️ Bạn đang là Khán Giả: Đang chờ các kỳ thủ dàn trận...", "info");
                    return;
                }
                this.isOnlineSkirmish = true;
                this.isSkirmishMode = true;
                this.isSkirmishSpectator = false;
                this.skirmishRole = "player";
                this.showScreen("lobby");
                this.openSkirmishBuilderModal();
                const clashBtnText = document.getElementById("btn-skirmish-clash-text");
                if (clashBtnText) clashBtnText.textContent = "✅ SẴN SÀNG (ONLINE 1V1)";
                const roleSel = document.getElementById("skirmish-role-select");
                if (roleSel && roleSel.parentElement) roleSel.parentElement.style.display = "none";
                const botSel = document.getElementById("skirmish-bot-select");
                if (botSel && botSel.parentElement) botSel.parentElement.style.display = "none";
                this.showToast("⚔️ Trận đấu Cờ Chớp 1v1 bắt đầu! Hãy dùng 30 Vàng dàn đội hình bí mật rồi bấm Sẵn Sàng!", "success");
            });

            this.socket.on("skirmish:armySubmitted", ({ playerId, readyCount, total }) => {
                if (playerId === this.currentUser?.id) {
                    this.showToast(`⏳ Bạn đã sẵn sàng! Đang chờ đối thủ (${readyCount}/${total})...`, "info");
                    const clashBtn = document.getElementById("btn-skirmish-start-clash");
                    if (clashBtn) {
                        clashBtn.disabled = true;
                        clashBtn.innerHTML = `<span>⏳</span><span>ĐÃ SẴN SÀNG (CHỜ ĐỐI THỦ...)</span>`;
                    }
                } else {
                    this.showToast(`🔔 Đối thủ đã nạp xong đội hình! (${readyCount}/${total})`, "success");
                }
            });

            this.socket.on("skirmish:battleStart", ({ room, whitePlayerId, blackPlayerId, whiteName, blackName, mapId, armies }) => {
                this.currentRoom = room;
                this.isOnlineSkirmish = true;
                this.closeSkirmishBuilderModal();
                this.startOnlineSkirmishBattle({ whitePlayerId, blackPlayerId, whiteName, blackName, mapId, armies });
            });

            this.socket.on("skirmish:opponentAction", ({ action, playerClock, enemyClock, senderId }) => {
                if (!this.chess || this.chess.gameOver || !this.isOnlineSkirmish) return;

                const rows = this.chess.rows;
                const cols = this.chess.cols;
                let finalAction;

                if (this.isSkirmishSpectator) {
                    // Góc nhìn Khán Giả: Quân Trắng xếp ở dưới (hàng 4-6), Quân Đen xếp ở trên (hàng 0-2)
                    // Nếu người đi là Quân Trắng (p0), họ gửi tọa độ gốc từ sân dưới -> giữ nguyên tọa độ
                    // Nếu người đi là Quân Đen (p1), họ gửi tọa độ từ góc nhìn của họ (hàng 4-6) -> lật lên đỉnh bàn cờ
                    const isSenderWhite = (this.currentRoom && this.currentRoom.players && this.currentRoom.players[0] && 
                        (this.currentRoom.players[0].id === senderId || this.currentRoom.players[0].socketId === senderId));
                    if (isSenderWhite) {
                        finalAction = { ...action };
                    } else {
                        finalAction = {
                            type: action.type,
                            fromR: (rows - 1) - action.fromR,
                            fromC: (cols - 1) - action.fromC,
                            toR: (rows - 1) - action.toR,
                            toC: (cols - 1) - action.toC,
                            stopR: action.stopR !== undefined ? ((rows - 1) - action.stopR) : ((rows - 1) - action.toR),
                            stopC: action.stopC !== undefined ? ((cols - 1) - action.stopC) : ((cols - 1) - action.toC)
                        };
                    }
                } else {
                    // Góc nhìn kỳ thủ: đối thủ luôn ngồi ở phía trên đối diện nên lật tọa độ
                    finalAction = {
                        type: action.type,
                        fromR: (rows - 1) - action.fromR,
                        fromC: (cols - 1) - action.fromC,
                        toR: (rows - 1) - action.toR,
                        toC: (cols - 1) - action.toC,
                        stopR: action.stopR !== undefined ? ((rows - 1) - action.stopR) : ((rows - 1) - action.toR),
                        stopC: action.stopC !== undefined ? ((cols - 1) - action.stopC) : ((cols - 1) - action.toC)
                    };
                }

                this.chess.executeAction(finalAction);
                this.sfx.move();
                this.selectedCombatSquare = null;
                this.validCombatActions = [];
                this.renderAll();
                this.renderDpsMeter();

                if (this.chess.gameOver) {
                    this.finishBlitzCombat();
                }
            });

            this.socket.on("skirmish:specDraftUpdate", ({ playerId, army, goldRemaining }) => {
                if (!this.isSkirmishSpectator) return;
                const h2h = document.getElementById("banner-1v1-headtohead");
                if (h2h && this.currentRoom && this.currentRoom.players) {
                    const p0 = this.currentRoom.players[0];
                    const p1 = this.currentRoom.players[1];
                    if (p0 && (p0.id === playerId || p0.socketId === playerId)) {
                        const p1Hp = document.getElementById("h2h-p1-hp");
                        if (p1Hp) p1Hp.textContent = `🪙 ${goldRemaining !== undefined ? goldRemaining : 0}/30 Vàng • ${army ? army.length : 0} Quân`;
                    } else if (p1 && (p1.id === playerId || p1.socketId === playerId)) {
                        const p2Hp = document.getElementById("h2h-p2-hp");
                        if (p2Hp) p2Hp.textContent = `🪙 ${goldRemaining !== undefined ? goldRemaining : 0}/30 Vàng • ${army ? army.length : 0} Quân`;
                    }
                }
            });

            this.socket.on("skirmish:matchOver", ({ winnerId, reason, reasonLabel }) => {
                const isWin = (winnerId === this.currentUser?.id);
                this.stopCombatTimers();
                this.clearAllCountdowns();
                if (this.chess && !this.chess.gameOver) {
                    const isWhiteWin = (this.currentRoom?.players?.[0]?.id === winnerId);
                    const winRole = this.isSkirmishSpectator 
                        ? (isWhiteWin ? "player" : "enemy") 
                        : (isWin ? "player" : "enemy");
                    this.chess.endMatch(winRole, reason || "resignation", reasonLabel || "Trận đấu kết thúc");
                }
                if (isWin) {
                    this.showToast(`🏆 CHIẾN THẮNG 1V1! Đối thủ bị hạ gục (${reasonLabel || reason})!`, "success");
                    this.sfx.victory();
                } else if (this.isSkirmishSpectator) {
                    this.showToast(`🏁 Ván đấu kết thúc! (${reasonLabel || reason})`, "info");
                } else {
                    this.showToast(`💔 THẤT BẠI 1V1! (${reasonLabel || reason})`, "defeat");
                    this.sfx.defeat();
                }
                this.finishBlitzCombat();
            });
        } catch (e) {}
    }

    async fetchOpenRoomsViaPhp() {
        try {
            const res = await fetch("api.php?action=room_list");
            if (res.ok) {
                const d = await res.json();
                if (d.ok && Array.isArray(d.rooms)) {
                    this.renderOpenRoomsList(d.rooms.map(r => ({
                        code: r.code,
                        hostName: r.hostName,
                        playerCount: r.humanCount || 1,
                        maxPlayers: 8,
                        timeMode: r.timeMode,
                        fillBots: r.fillBots
                    })));
                }
            }
        } catch (e) {}
    }

    syncMyStateToRoom() {
        if (!this.socket || !this.currentRoom || !this.currentUser) return;
        this.socket.emit("match:syncPlayerState", {
            code: this.currentRoom.code,
            playerId: this.currentUser.id,
            state: {
                hp: this.tft.player.hp,
                level: this.tft.player.level,
                gold: this.tft.player.gold,
                streak: this.tft.player.streak,
                board: this.tft.player.board,
                bench: this.tft.player.bench,
                items: this.tft.player.items,
                augments: this.tft.player.augments,
                eliminated: this.tft.player.eliminated
            }
        });
    }


    bindAuthAndLobbyEvents() {
        const tabLogin = document.getElementById("tab-btn-login");
        const tabReg = document.getElementById("tab-btn-register");
        const formLogin = document.getElementById("form-login");
        const formReg = document.getElementById("form-register");

        tabLogin.addEventListener("click", () => {
            tabLogin.classList.add("active");
            tabReg.classList.remove("active");
            formLogin.classList.remove("hidden");
            formReg.classList.add("hidden");
        });

        tabReg.addEventListener("click", () => {
            tabReg.classList.add("active");
            tabLogin.classList.remove("active");
            formReg.classList.remove("hidden");
            formLogin.classList.add("hidden");
        });

        document.querySelectorAll("#reg-avatar-picker .av-option").forEach(el => {
            el.addEventListener("click", () => {
                document.querySelectorAll("#reg-avatar-picker .av-option").forEach(x => x.classList.remove("selected"));
                el.classList.add("selected");
                this.selectedRegAvatar = el.getAttribute("data-av");
            });
        });

        // Strip spaces automatically from registration username
        const regUserInput = document.getElementById("reg-username");
        if (regUserInput) {
            regUserInput.addEventListener("input", () => {
                regUserInput.value = regUserInput.value.replace(/\s+/g, "");
            });
        }

        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("login-username").value.trim();
            const password = document.getElementById("login-password").value;
            try {
                const res = await fetch("api.php?action=login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (!data.ok) {
                    this.showToast(data.msg || "Đăng nhập thất bại!", "warn");
                    return;
                }
                if (data.rules && window.applyDatabaseConfigToRuntime) {
                    window.applyDatabaseConfigToRuntime(data.rules, data.entities);
                }
                this.onLoginSuccess(data.user);
            } catch (err) {
                this.onLoginSuccess({
                    id: "local_admin",
                    username,
                    displayName: username === "admin" ? "GM Tối Cao (Admin)" : username,
                    avatar: "👑",
                    role: username === "admin" ? "admin" : "player",
                    stats: { elo: 1500, gamesPlayed: 0, top1Count: 0 },
                    customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["stun_hammer", "burn_cloak"] }
                });
            }
        });

        formReg.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("reg-username").value.trim();
            const displayName = document.getElementById("reg-displayname").value.trim();
            const password = document.getElementById("reg-password").value;
            try {
                const res = await fetch("api.php?action=register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, displayName, password, avatar: this.selectedRegAvatar })
                });
                const data = await res.json();
                if (!data.ok) {
                    this.showToast(data.msg || "Đăng ký thất bại!", "warn");
                    return;
                }
                if (data.rules && window.applyDatabaseConfigToRuntime) {
                    window.applyDatabaseConfigToRuntime(data.rules, data.entities);
                }
                this.showToast("🎉 Tạo tài khoản thành công!", "success");
                this.onLoginSuccess(data.user);
            } catch (err) {
                this.onLoginSuccess({
                    id: `local_${Date.now()}`,
                    username,
                    displayName: displayName || username,
                    avatar: this.selectedRegAvatar,
                    role: "player",
                    stats: { elo: 1000, gamesPlayed: 0, top1Count: 0 },
                    customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["stun_hammer", "burn_cloak"] }
                });
            }
        });

        document.getElementById("btn-logout").addEventListener("click", () => {
            localStorage.removeItem("chesstft_user");
            if (this.socket && this.currentRoom) {
                this.socket.emit("room:leave");
            }
            this.stopSpectatorTimers();
            this.currentUser = null;
            this.currentRoom = null;
            this.showScreen("auth");
        });

        // Chess.com / Royal Arena Sidebar Tab Switcher
        const switchLobbyTab = (tabName, pushToHistory = true) => {
            this.currentLobbyTab = tabName;
            document.querySelectorAll(".cc-nav-link").forEach(l => l.classList.remove("active"));
            document.querySelectorAll(".cc-tab-view").forEach(v => v.classList.add("hidden"));
            if (tabName === "play") {
                document.getElementById("nav-item-play")?.classList.add("active");
                document.getElementById("view-hub-play")?.classList.remove("hidden");
            } else if (tabName === "codex") {
                document.getElementById("nav-item-codex")?.classList.add("active");
                document.getElementById("view-hub-codex")?.classList.remove("hidden");
                this.renderCodex();
            } else if (tabName === "rooms") {
                document.getElementById("nav-item-rooms")?.classList.add("active");
                document.getElementById("view-hub-rooms")?.classList.remove("hidden");
                if (this.socket && this.socket.connected) {
                    this.socket.emit("rooms:refresh");
                } else {
                    this.fetchOpenRoomsViaPhp();
                }
            }
            if (pushToHistory && window.history && window.history.pushState) {
                window.history.pushState({ screen: "lobby", tab: tabName }, "");
            }
        };
        this.switchLobbyTab = switchLobbyTab;

        document.getElementById("nav-item-play")?.addEventListener("click", () => switchLobbyTab("play"));
        document.getElementById("nav-item-codex")?.addEventListener("click", () => switchLobbyTab("codex"));
        document.getElementById("nav-item-rooms")?.addEventListener("click", () => switchLobbyTab("rooms"));
        document.getElementById("nav-item-tutorial")?.addEventListener("click", () => this.startTutorialSession());
        document.getElementById("btn-quick-friends")?.addEventListener("click", () => switchLobbyTab("rooms"));

        // Nút quay về sảnh từ Codex & Phòng Riêng
        document.getElementById("btn-back-from-codex")?.addEventListener("click", () => switchLobbyTab("play"));
        document.getElementById("btn-back-from-rooms")?.addEventListener("click", () => switchLobbyTab("play"));

        // XỬ LÝ NÚT QUAY VỀ TRÌNH DUYỆT (BROWSER BACK BUTTON / POPSTATE):
        // Ngăn chặn hoàn toàn việc bấm quay về bị thoát / văng khỏi trang web!
        if (window.history && window.history.replaceState) {
            window.history.replaceState({ screen: "lobby", tab: "play" }, "");
        }

        window.addEventListener("popstate", (e) => {
            // 1. Nếu có modal nào đang mở (Cẩm nang tướng, luật, admin, đầu hàng...) -> Đóng modal trước
            const openModals = [
                "modal-piece-guide",
                "modal-rules",
                "modal-admin-db",
                "modal-surrender",
                "modal-stage-armory",
                "modal-game-over",
                "modal-tutorial-complete"
            ];
            for (const mId of openModals) {
                const modalEl = document.getElementById(mId);
                if (modalEl && !modalEl.classList.contains("hidden")) {
                    modalEl.classList.add("hidden");
                    if (window.history && window.history.pushState) {
                        window.history.pushState({ screen: this.currentScreen || "lobby", tab: this.currentLobbyTab || "play" }, "");
                    }
                    return;
                }
            }

            // 2. Nếu đang trong ván đấu (#screen-game) -> Quay về sảnh
            if (this.currentScreen === "game") {
                document.getElementById("btn-back-lobby")?.click();
                return;
            }

            // 3. Nếu đang trong chế độ Spectator (#screen-spectator) -> Quay về sảnh
            if (this.currentScreen === "spectator") {
                document.getElementById("btn-spec-back-lobby")?.click();
                return;
            }

            // 4. Nếu đang ở sảnh nhưng ở tab Codex hoặc Rooms -> Quay về tab Play chính
            if (this.currentScreen === "lobby" && this.currentLobbyTab && this.currentLobbyTab !== "play") {
                switchLobbyTab("play", false);
                if (window.history && window.history.pushState) {
                    window.history.pushState({ screen: "lobby", tab: "play" }, "");
                }
                return;
            }

            // Giữ lại state để không bao giờ bị văng khỏi trang web khi bấm Back liên tục
            if (window.history && window.history.pushState) {
                window.history.pushState({ screen: "lobby", tab: "play" }, "");
            }
        });

        // Cảnh báo người chơi khi lỡ tắt tab lúc ván cờ đang diễn ra
        window.addEventListener("beforeunload", (e) => {
            if (this.currentScreen === "game" && this.tft && !this.tft.isGameOver) {
                e.preventDefault();
                e.returnValue = "Ván cờ đang diễn ra! Bạn có chắc chắn muốn rời khỏi trang không?";
                return e.returnValue;
            }
        });

        // Hero Mode Tabs (Ranked / Solo / Tutorial / Custom)
        this.activeHeroMode = "ranked";
        const heroBtnLabel = document.getElementById("hero-btn-label");
        const heroModeDesc = document.getElementById("hero-mode-desc");

        document.querySelectorAll(".cc-time-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".cc-time-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                const mode = tab.getAttribute("data-mode");
                this.activeHeroMode = mode;
                if (mode === "ranked") {
                    if (heroBtnLabel) heroBtnLabel.textContent = "XUẤT TRẬN CHIẾN ĐẤU (RANK)";
                    if (heroModeDesc) heroModeDesc.textContent = "Tự động ghép cùng kỳ thủ online thật. Ghế trống tự động thêm 7 Bot AI sau 4s!";
                } else if (mode === "skirmish") {
                    if (heroBtnLabel) heroBtnLabel.textContent = "DÀN QUÂN & THÁCH ĐẤU 1V1";
                    if (heroModeDesc) heroModeDesc.textContent = "Đấu Trí 1v1: Mua quân với ngân sách 30 Vàng, tự chọn Bản đồ có Đá cản đường và đấu trí Turn-based!";
                } else if (mode === "solo") {
                    if (heroBtnLabel) heroBtnLabel.textContent = "KHIÊU CHIẾN 7 BOT AI";
                    if (heroModeDesc) heroModeDesc.textContent = "Luyện tập offline cùng 7 Bot AI thông minh (Magnus, Kasparov...). Không sợ mất điểm ELO!";
                } else if (mode === "sandbox") {
                    if (heroBtnLabel) heroBtnLabel.textContent = "VÀO PHÒNG TẬP (SANDBOX)";
                    if (heroModeDesc) heroModeDesc.textContent = "Phòng tập chiến thuật không giới hạn: Thử nghiệm mọi tướng 1⭐-3⭐, trang bị, tạo hình nhân Dummy và đo DPS!";
                } else if (mode === "tutorial") {
                    if (heroBtnLabel) heroBtnLabel.textContent = "VÀO LỚP HỌC VIỆN";
                    if (heroModeDesc) heroModeDesc.textContent = "Khóa huấn luyện tương tác từng bước cùng Huấn Luyện Viên Martin. Nắm vững luật cờ và tộc hệ!";
                } else if (mode === "custom") {
                    if (heroBtnLabel) heroBtnLabel.textContent = "MỞ PHÒNG BẠN BÈ";
                    if (heroModeDesc) heroModeDesc.textContent = "Tạo phòng riêng hoặc nhập mã để mời bạn bè cùng so tài cờ chớp!";
                }
            });
        });

        // Giant Chess.com Green Button
        document.getElementById("btn-hero-play-main")?.addEventListener("click", () => {
            if (this.activeHeroMode === "ranked") {
                this.startMatchmaking();
            } else if (this.activeHeroMode === "skirmish") {
                this.openSkirmishBuilderModal();
            } else if (this.activeHeroMode === "solo") {
                document.getElementById("btn-quick-solo")?.click();
            } else if (this.activeHeroMode === "sandbox") {
                this.startSandboxSession();
            } else if (this.activeHeroMode === "tutorial") {
                this.startTutorialSession();
            } else if (this.activeHeroMode === "custom") {
                switchLobbyTab("rooms");
            }
        });

        // Feature cards and Quick actions click handlers
        document.getElementById("btn-quick-skirmish")?.addEventListener("click", () => this.openSkirmishBuilderModal());
        document.getElementById("btn-start-tutorial")?.addEventListener("click", () => this.startTutorialSession());
        document.getElementById("btn-quick-tutorial")?.addEventListener("click", () => this.startTutorialSession());
        document.getElementById("btn-play-bot-feature")?.addEventListener("click", () => document.getElementById("btn-quick-solo")?.click());
        document.getElementById("btn-play-rank-feature")?.addEventListener("click", () => this.startMatchmaking());
        document.getElementById("btn-quick-sandbox")?.addEventListener("click", () => this.startSandboxSession());
        document.getElementById("btn-play-sandbox-feature")?.addEventListener("click", () => this.startSandboxSession());

        // Tutorial buttons
        document.getElementById("btn-tutorial-next-step")?.addEventListener("click", () => {
            this.advanceTutorialStep(4);
        });
        document.getElementById("btn-tutorial-skip")?.addEventListener("click", () => {
            this.isTutorialMode = false;
            document.querySelectorAll(".tutorial-highlight-target").forEach(el => el.classList.remove("tutorial-highlight-target"));
            document.getElementById("tutorial-coach-overlay")?.classList.add("hidden");
            this.showToast("Đã bỏ qua hướng dẫn tân thủ.", "info");
        });
        document.getElementById("btn-tutorial-go-rank")?.addEventListener("click", () => {
            document.getElementById("modal-tutorial-complete")?.classList.add("hidden");
            this.showScreen("lobby");
            this.startMatchmaking();
        });
        document.getElementById("btn-tutorial-go-lobby")?.addEventListener("click", () => {
            document.getElementById("modal-tutorial-complete")?.classList.add("hidden");
            this.showScreen("lobby");
        });

        // Ranked Auto-Matchmaking (Người auto matching nhau)
        const btnRankedMatch = document.getElementById("btn-start-matchmaking");
        if (btnRankedMatch) {
            btnRankedMatch.addEventListener("click", () => {
                this.startMatchmaking();
            });
        }

        const btnCancelMatch = document.getElementById("btn-cancel-matchmaking");
        if (btnCancelMatch) {
            btnCancelMatch.addEventListener("click", () => {
                this.cancelMatchmaking();
            });
        }

        // Quick Solo Play vs 7 Bots (Luyện tập rõ ràng)
        document.getElementById("btn-quick-solo").addEventListener("click", async () => {
            this.isRankedMode = false;
            await this.refreshMyUserProfile();
            this.currentRoom = null;
            this.startNewGameSession(null);
        });

        // Surrender match listeners
        const btnSurrender = document.getElementById("btn-surrender-game");
        if (btnSurrender) {
            btnSurrender.addEventListener("click", () => {
                document.getElementById("modal-surrender")?.classList.remove("hidden");
            });
        }

        const btnCancelSur = document.getElementById("btn-cancel-surrender");
        if (btnCancelSur) {
            btnCancelSur.addEventListener("click", () => {
                document.getElementById("modal-surrender")?.classList.add("hidden");
            });
        }

        const btnConfirmSur = document.getElementById("btn-confirm-surrender");
        if (btnConfirmSur) {
            btnConfirmSur.addEventListener("click", () => {
                document.getElementById("modal-surrender")?.classList.add("hidden");
                this.handlePlayerSurrender();
            });
        }

        // Mode Select listener
        const modeSelect = document.getElementById("select-room-gamemode");
        if (modeSelect) {
            modeSelect.addEventListener("change", (e) => {
                const val = e.target.value;
                const desc = document.getElementById("room-mode-desc-text");
                if (desc) {
                    if (val === "tft_1v1") {
                        desc.textContent = "⚔️ Chế độ Quyết Đấu 1v1: Tối đa 2 người (đấu người hoặc luyện tập với Đại Kiện Tướng AI)! Đối đầu trực tiếp qua từng vòng TFT, trừ máu nhau đến khi 1 người cạn 100 HP.";
                        desc.style.color = "#fbbf24";
                    } else if (val === "skirmish_1v1") {
                        desc.textContent = "♟️ Chế độ Cờ Chớp 1v1: 2 người chơi cầm ngân sách 30 Vàng dàn quân bí mật, sau đó vào bàn cờ 6x7 so tài Cờ Chớp thời gian thực (turn-based) qua mạng!";
                        desc.style.color = "#38bdf8";
                    } else {
                        desc.textContent = "Tạo phòng riêng hoặc nhập mã để so tài cùng bạn bè. Hỗ trợ Đấu Trường 8 Người, Quyết Đấu 1v1 TFT và Cờ Chớp Chiến Thuật 1v1!";
                        desc.style.color = "";
                    }
                }
            });
        }

        // Create Room (Supports both Socket.IO and WampServer PHP+MySQL)
        document.getElementById("btn-create-room").addEventListener("click", async () => {
            const mode = document.getElementById("select-room-gamemode")?.value || "tft_8p";
            const timeMode = document.getElementById("select-room-timemode").value;
            const isSpectator = !!document.getElementById("chk-host-as-spectator")?.checked;
            const is1v1 = (mode === "tft_1v1" || mode === "skirmish_1v1");
            const fillBots = !is1v1;

            if (this.socket && this.socket.connected) {
                this.socket.emit("room:create", { user: this.currentUser, mode, timeMode, fillBots, isSpectator }, (res) => {
                    if (res && res.ok) {
                        this.currentRoom = res.room;
                        this.renderWaitingRoom();
                        const roleMsg = isSpectator ? "với tư cách Trọng Tài / Khán Giả (Caster)" : "";
                        const modeMsg = is1v1 ? (mode === "skirmish_1v1" ? "1v1 Cờ Chớp" : "1v1 TFT") : "8 Người";
                        this.showToast(`Đã tạo phòng #${res.room.code} (${modeMsg}) ${roleMsg}! Hãy gửi mã cho đối thủ!`, "success");
                    } else {
                        this.showToast(res?.msg || "Không thể tạo phòng!", "warn");
                    }
                });
                return;
            }
            try {
                const res = await fetch("api.php?action=room_create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user: this.currentUser, mode, timeMode, fillBots, isSpectator })
                });
                const d = await res.json();
                if (d.ok && d.room) {
                    this.currentRoom = d.room;
                    this.renderWaitingRoom();
                    this.showToast(`Đã tạo phòng #${d.room.code}!`, "success");
                } else {
                    this.showToast(d.msg || "Không thể tạo phòng!", "warn");
                }
            } catch (e) {
                this.showToast("Không thể tạo phòng! Vui lòng kiểm tra kết nối mạng.", "warn");
            }
        });

        // Create Room as Spectator (Caster Mode) directly
        document.getElementById("btn-create-spectator-room")?.addEventListener("click", async () => {
            const mode = document.getElementById("select-room-gamemode")?.value || "tft_8p";
            const timeMode = document.getElementById("select-room-timemode")?.value || "standard";
            const is1v1 = (mode === "tft_1v1" || mode === "skirmish_1v1");
            const fillBots = !is1v1;
            const chk = document.getElementById("chk-host-as-spectator");
            if (chk) chk.checked = true;

            if (this.socket && this.socket.connected) {
                this.socket.emit("room:create", { user: this.currentUser, mode, timeMode, fillBots, isSpectator: true }, (res) => {
                    if (res && res.ok) {
                        this.currentRoom = res.room;
                        this.renderWaitingRoom();
                        this.showToast(`🎙️ Đã tạo phòng Khán Giả #${res.room.code}!`, "success");
                    } else {
                        this.showToast(res?.msg || "Không thể tạo phòng!", "warn");
                    }
                });
                return;
            }
            try {
                const res = await fetch("api.php?action=room_create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user: this.currentUser, mode, timeMode, fillBots, isSpectator: true })
                });
                const d = await res.json();
                if (d.ok && d.room) {
                    this.currentRoom = d.room;
                    this.renderWaitingRoom();
                    this.showToast(`🎙️ Đã tạo phòng Khán Giả #${d.room.code}!`, "success");
                }
            } catch (e) {}
        });

        // Quick action: Spectator 8-bot match
        document.getElementById("btn-quick-spectator")?.addEventListener("click", () => {
            this.start8BotSpectatorMode();
        });

        // Join Room by Code
        document.getElementById("btn-join-code").addEventListener("click", () => {
            const code = document.getElementById("input-room-code").value.trim().toUpperCase();
            if (!code) {
                this.showToast("Vui lòng nhập Mã Phòng 6 ký tự!", "warn");
                return;
            }
            this.joinRoomByCode(code);
        });

        document.getElementById("btn-refresh-rooms").addEventListener("click", () => {
            if (this.socket && this.socket.connected) {
                this.socket.emit("rooms:refresh");
            } else {
                this.fetchOpenRoomsViaPhp();
            }
        });

        document.getElementById("btn-copy-code").addEventListener("click", () => {
            if (!this.currentRoom) return;
            navigator.clipboard?.writeText(this.currentRoom.code);
            this.showToast(`📋 Đã copy mã phòng: ${this.currentRoom.code}`, "success");
        });

        document.getElementById("btn-leave-room").addEventListener("click", () => {
            if (this.socket) this.socket.emit("room:leave");
            this.currentRoom = null;
            this.renderWaitingRoom();
        });

        document.getElementById("btn-switch-to-spectator")?.addEventListener("click", () => {
            if (!this.socket || !this.currentRoom) return;
            this.socket.emit("room:switchRole", { code: this.currentRoom.code, targetRole: "spectator" }, (res) => {
                if (res && res.ok) {
                    this.showToast("👁️ Bạn đã chuyển sang Hàng Ghế Khán Giả / Trọng Tài!", "info");
                } else {
                    this.showToast(res?.msg || "Không thể chuyển vai trò!", "warn");
                }
            });
        });

        document.getElementById("btn-switch-to-player")?.addEventListener("click", () => {
            if (!this.socket || !this.currentRoom) return;
            this.socket.emit("room:switchRole", { code: this.currentRoom.code, targetRole: "player" }, (res) => {
                if (res && res.ok) {
                    this.showToast("⚔️ Bạn đã chuyển vào Ghế Thi Đấu!", "success");
                } else {
                    this.showToast(res?.msg || "Không thể chuyển vai trò!", "warn");
                }
            });
        });

        document.getElementById("btn-add-single-bot")?.addEventListener("click", () => {
            this.addBotToRoom();
        });

        document.getElementById("btn-fill-all-bots")?.addEventListener("click", () => {
            this.fillAllBotsInRoom();
        });

        document.getElementById("btn-clear-all-bots")?.addEventListener("click", () => {
            this.clearAllBotsInRoom();
        });

        document.getElementById("chk-fill-bots").addEventListener("change", (e) => {
            if (this.currentRoom) {
                this.currentRoom.fillBots = e.target.checked;
            }
            if (this.socket && this.currentRoom) {
                this.socket.emit("room:updateSettings", {
                    code: this.currentRoom.code,
                    fillBots: e.target.checked
                });
            }
        });

        document.getElementById("btn-host-start-match").addEventListener("click", async () => {
            if (!this.currentRoom) return;
            if (this.socket && this.socket.connected) {
                this.socket.emit("room:start", { code: this.currentRoom.code }, (res) => {
                    if (res && !res.ok) {
                        this.showToast(res.msg, "warn");
                    }
                });
                return;
            }
            try {
                const res = await fetch("api.php?action=room_start", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        code: this.currentRoom.code,
                        fillBots: this.currentRoom.fillBots !== false,
                        timeMode: this.currentRoom.timeMode || "standard"
                    })
                });
                const d = await res.json();
                if (d.ok && d.room) {
                    this.startNewGameSession(d.room);
                }
            } catch (e) {
                this.startNewGameSession(this.currentRoom);
            }
        });

        // Codex Tabs
        document.querySelectorAll(".codex-tab").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".codex-tab").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.codexActiveTab = btn.getAttribute("data-tab");
                this.renderCodex();
            });
        });

        // Back to Lobby buttons
        document.getElementById("btn-back-lobby").addEventListener("click", () => {
            this.stopCombatTimers();
            this.stopSpectatorTimers();
            this.clearAllCountdowns();
            this.isSpectatorPOV = false;
            if (this.isMultiplayerSpectator) {
                if (this.socket && this.socket.connected) {
                    this.socket.emit("room:leave");
                }
                this.isMultiplayerSpectator = false;
                this.currentRoom = null;
            }
            document.getElementById("skirmish-spec-control-bar")?.classList.add("hidden");
            document.getElementById("spec-pov-control-bar")?.classList.add("hidden");
            const actionBtns = [
                document.getElementById("btn-start-combat"),
                document.getElementById("btn-reroll"),
                document.getElementById("btn-buy-xp"),
                document.getElementById("btn-lock-shop"),
                document.getElementById("btn-surrender-game")
            ];
            actionBtns.forEach(b => { if (b) b.style.display = ""; });
            this.isSkirmishSpectator = false;
            this.showScreen("lobby");
            this.refreshMyUserProfile();
        });

        document.getElementById("btn-gameover-lobby").addEventListener("click", () => {
            document.getElementById("modal-gameover").classList.add("hidden");
            this.stopCombatTimers();
            this.stopSpectatorTimers();
            this.clearAllCountdowns();
            this.isSpectatorPOV = false;
            if (this.isMultiplayerSpectator) {
                if (this.socket && this.socket.connected) {
                    this.socket.emit("room:leave");
                }
                this.isMultiplayerSpectator = false;
                this.currentRoom = null;
            }
            document.getElementById("skirmish-spec-control-bar")?.classList.add("hidden");
            document.getElementById("spec-pov-control-bar")?.classList.add("hidden");
            const actionBtns = [
                document.getElementById("btn-start-combat"),
                document.getElementById("btn-reroll"),
                document.getElementById("btn-buy-xp"),
                document.getElementById("btn-lock-shop"),
                document.getElementById("btn-surrender-game")
            ];
            actionBtns.forEach(b => { if (b) b.style.display = ""; });
            this.isSkirmishSpectator = false;
            this.showScreen("lobby");
            this.refreshMyUserProfile();
        });

        // Global DPS Meter Toggle (available across all match modes)
        const btnDpsToggle = document.getElementById("btn-toggle-dps-meter");
        if (btnDpsToggle) {
            btnDpsToggle.addEventListener("click", () => {
                const p = document.getElementById("panel-dps-meter");
                if (p) {
                    p.classList.toggle("hidden");
                    btnDpsToggle.classList.toggle("active", !p.classList.contains("hidden"));
                    this.renderDpsMeter();
                }
            });
        }

        // Combat speed toggle for Solo AI matches (1x / 2x)
        this.combatSpeed = 1;
        const btnCombatSpeed = document.getElementById("btn-combat-speed");
        if (btnCombatSpeed) {
            btnCombatSpeed.addEventListener("click", () => {
                this.combatSpeed = (this.combatSpeed === 1) ? 2 : 1;
                btnCombatSpeed.textContent = `⏩ ${this.combatSpeed}x`;
                btnCombatSpeed.classList.toggle("active", this.combatSpeed === 2);
                this.showToast(`⚡ Tốc độ giao tranh Solo: ${this.combatSpeed}x`, "info");
            });
        }
    }

    async refreshMyUserProfile() {
        try {
            const res = await fetch("api.php?action=config");
            if (res.ok) {
                const d = await res.json();
                if (d.ok && window.applyDatabaseConfigToRuntime) {
                    window.applyDatabaseConfigToRuntime(d.rules, d.entities);
                }
            }
        } catch (e) {}
    }

    onLoginSuccess(user) {
        this.currentUser = user;
        localStorage.setItem("chesstft_user", JSON.stringify(user));
        this.showScreen("lobby");
        this.renderLobbyHeader();
        this.renderWaitingRoom();
        this.renderCodex();
        if (this.socket && this.socket.connected) {
            this.socket.emit("rooms:refresh");
        } else {
            this.fetchOpenRoomsViaPhp();
        }
    }

    renderLobbyHeader() {
        if (!this.currentUser) return;
        const u = this.currentUser;
        const mods = u.customModifiers || {};

        const elo = u.stats?.elo || 1000;
        let rankTier = "Sắt Đoàn";
        let rankIcon = "🛡️";
        if (elo >= 1800) { rankTier = "Thách Đấu"; rankIcon = "👑"; }
        else if (elo >= 1500) { rankTier = "Cao Thủ"; rankIcon = "💎"; }
        else if (elo >= 1300) { rankTier = "Kim Cương"; rankIcon = "🔷"; }
        else if (elo >= 1150) { rankTier = "Vàng Kim"; rankIcon = "🥇"; }
        else if (elo >= 1000) { rankTier = "Bạc Bất Khuất"; rankIcon = "🥈"; }
        else { rankTier = "Đồng Khởi Điểm"; rankIcon = "🥉"; }

        const nameEl = document.getElementById("lobby-user-name");
        const avatarEl = document.getElementById("lobby-user-avatar");
        const roleEl = document.getElementById("lobby-user-role-badge");
        const rankEl = document.getElementById("lobby-user-rank-tier");
        const recordEl = document.getElementById("lobby-user-record");
        const hpEl = document.getElementById("lobby-hp-val");
        const goldEl = document.getElementById("lobby-gold-val");

        if (nameEl) nameEl.textContent = u.displayName || u.username;
        if (avatarEl) avatarEl.textContent = u.avatar || "👑";
        if (roleEl) roleEl.textContent = u.role === "admin" ? "GM Tối Cao (Admin)" : "Kỳ Thủ";
        if (rankEl) rankEl.textContent = `${rankIcon} ${rankTier} (ELO: ${elo})`;
        if (recordEl) recordEl.textContent = `Top 1: ${u.stats?.top1Count || 0}/${u.stats?.gamesPlayed || 0} trận`;
        if (hpEl) hpEl.textContent = `${mods.startingHp || 100} HP`;
        if (goldEl) goldEl.textContent = `${mods.startingGold !== undefined ? mods.startingGold : 6} Vàng`;

        const topbarRankEl = document.getElementById("lobby-topbar-rank");
        const perksValEl = document.getElementById("lobby-perks-val");
        if (topbarRankEl) topbarRankEl.textContent = `${rankIcon} ${rankTier}`;
        if (perksValEl) perksValEl.textContent = `Khởi Đầu: ${mods.startingHp || 100} HP • ${mods.startingGold !== undefined ? mods.startingGold : 6}🪙`;

        // Legacy elements fallback
        const legacyBadge = document.getElementById("lobby-user-badge");
        if (legacyBadge) legacyBadge.textContent = `${u.avatar || "👑"} ${u.displayName || u.username} (${u.role === "admin" ? "ADMIN" : "Kỳ Thủ"})`;
        const legacyElo = document.getElementById("lobby-user-elo");
        if (legacyElo) legacyElo.textContent = `🏆 ELO: ${elo} • Top 1: ${u.stats?.top1Count || 0}/${u.stats?.gamesPlayed || 0}`;
        const legacyPerks = document.getElementById("lobby-user-perks");
        if (legacyPerks) legacyPerks.textContent = `❤️ ${mods.startingHp || 100} HP • 🪙 ${mods.startingGold !== undefined ? mods.startingGold : 6} Vàng`;

        const adminBtn = document.getElementById("btn-open-admin");
        const specTopBtn = document.getElementById("btn-open-spectator-top");
        const specCard = document.getElementById("admin-spectator-card");
        if (specTopBtn) specTopBtn.classList.remove("hidden");
        if (specCard) specCard.classList.remove("hidden");
        if (u.role === "admin") {
            if (adminBtn) adminBtn.classList.remove("hidden");
        } else {
            if (adminBtn) adminBtn.classList.add("hidden");
        }
    }

    async joinRoomByCode(code, asSpectator = false) {
        if (!code) {
            this.showToast("Vui lòng nhập Mã Phòng 6 ký tự!", "warn");
            return;
        }
        if (this.socket && this.socket.connected) {
            this.socket.emit("room:join", { code, user: this.currentUser, asSpectator }, (res) => {
                if (res && res.ok) {
                    this.currentRoom = res.room;
                    this.renderWaitingRoom();
                    const specMsg = asSpectator ? "với tư cách Khán Giả" : "";
                    this.showToast(`Đã vào phòng ${res.room.code} ${specMsg}!`, "success");
                } else {
                    this.showToast((res && res.msg) || "Không thể vào phòng!", "warn");
                }
            });
            return;
        }
        try {
            const res = await fetch("api.php?action=room_join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, user: this.currentUser, asSpectator })
            });
            const d = await res.json();
            if (d.ok && d.room) {
                this.currentRoom = d.room;
                this.renderWaitingRoom();
                this.showToast(`Đã vào phòng #${d.room.code}!`, "success");
            } else {
                this.showToast(d.msg || "Không tìm thấy phòng!", "warn");
            }
        } catch (e) {
            this.showToast("Không thể kết nối vào phòng!", "warn");
        }
    }

    renderOpenRoomsList(list) {
        const container = document.getElementById("open-rooms-list");
        if (!container) return;
        container.innerHTML = "";

        if (list.length === 0) {
            container.innerHTML = `<div class="empty-hint">Chưa có phòng nào đang mở. Hãy bấm 'Tạo Phòng Mới' để rủ bạn bè!</div>`;
            return;
        }

        const modeLabels = {
            standard: "⏱️ Tiêu Chuẩn (45-75s)",
            relaxed: "☕ Thư Thả (70-120s)",
            blitz: "⚡ Siêu Chớp (28-48s)"
        };

        for (const r of list) {
            const row = document.createElement("div");
            row.className = "room-item-row";
            const casterTag = r.isSpectatorHost ? `<span class="badge-pill" style="font-size:0.68rem; background:rgba(56,189,248,0.2); color:#38bdf8; border:1px solid #38bdf8; margin-left:4px;">🎙️ Caster Host</span>` : "";
            const specCountTag = r.spectatorCount > 0 ? `<span style="font-size:0.7rem; color:#94a3b8; margin-left:6px;">👁️ ${r.spectatorCount}</span>` : "";

            let modeBadge = `<span class="badge-pill room-tag-mode mode-tft-8p" style="font-size:0.68rem; background:rgba(168,85,247,0.25); color:#c084fc; border:1px solid #a855f7; padding:2px 6px; border-radius:4px; margin-left:4px;">👑 TFT 8P</span>`;
            if (r.mode === "tft_1v1") {
                modeBadge = `<span class="badge-pill room-tag-mode mode-tft-1v1" style="font-size:0.68rem; background:rgba(245,158,11,0.25); color:#fbbf24; border:1px solid #f59e0b; padding:2px 6px; border-radius:4px; margin-left:4px;">⚔️ TFT 1v1</span>`;
            } else if (r.mode === "skirmish_1v1") {
                modeBadge = `<span class="badge-pill room-tag-mode mode-skirmish-1v1" style="font-size:0.68rem; background:rgba(56,189,248,0.25); color:#38bdf8; border:1px solid #0284c7; padding:2px 6px; border-radius:4px; margin-left:4px;">♟️ Cờ Chớp 1v1</span>`;
            }

            const maxP = r.maxPlayers || (r.mode && r.mode.includes("1v1") ? 2 : 8);

            row.innerHTML = `
                <div>
                    <div style="font-weight:800; color:var(--accent-gold); display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                        <span>Phòng #${r.code} — Chủ phòng: ${r.hostName}</span>
                        ${modeBadge}
                        ${casterTag}
                        ${specCountTag}
                    </div>
                    <div style="font-size:0.74rem; color:var(--text-muted);">${modeLabels[r.timeMode] || r.timeMode} • Người chơi: ${r.playerCount}/${maxP} ${r.fillBots ? "(+Bot tự lấp)" : "(Không Bot)"}</div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${r.playerCount < maxP ? `<button class="btn-primary btn-join-contestant" style="padding:4px 10px; font-size:0.75rem;">⚔️ Thi Đấu</button>` : ""}
                    <button class="btn-join-spectator" title="Xem trực tiếp trận đấu">👁️ Xem Trực Tiếp</button>
                </div>
            `;
            const joinBtn = row.querySelector(".btn-join-contestant");
            if (joinBtn) {
                joinBtn.addEventListener("click", () => {
                    this.joinRoomByCode(r.code, false);
                });
            }
            const specBtn = row.querySelector(".btn-join-spectator");
            if (specBtn) {
                specBtn.addEventListener("click", () => {
                    this.joinRoomByCode(r.code, true);
                });
            }
            container.appendChild(row);
        }
    }


    bindStaticEvents() {
        document.getElementById("btn-reroll").addEventListener("click", () => {
            this.handleHotkeyReroll();
        });

        document.getElementById("btn-buy-xp").addEventListener("click", () => {
            this.handleHotkeyBuyXP();
        });

        document.getElementById("btn-lock-shop").addEventListener("click", () => {
            this.toggleLockShop();
        });

        document.getElementById("btn-start-combat").addEventListener("click", () => {
            if (this.tft.phase === "prep") {
                this.syncMyStateToRoom();
                this.startBlitzCombat();
            }
        });

        document.getElementById("btn-return-home").addEventListener("click", () => {
            this.tft.scoutingPlayerId = "player";
            this.renderAll();
        });

        document.getElementById("btn-scout-prev")?.addEventListener("click", () => this.cycleScoutingPlayer(-1));
        document.getElementById("btn-scout-next")?.addEventListener("click", () => this.cycleScoutingPlayer(1));
        document.getElementById("btn-scout-proceed")?.addEventListener("click", () => {
            this.isPostMatchSpectating = false;
            this.tft.scoutingPlayerId = "player";
            this.proceedAfterRoundModal();
        });

        document.getElementById("btn-spectate-other-boards")?.addEventListener("click", () => {
            this.clearRoundResultCountdown();
            document.getElementById("modal-round-result").classList.add("hidden");
            this.isPostMatchSpectating = true;
            const others = this.tft.getAllParticipants().filter(p => p.id !== "player" && !p.eliminated);
            if (others.length > 0) {
                this.tft.scoutingPlayerId = others[0].id;
            }
            this.showToast("👁️ Bạn đang xem trận đấu các nhà khác! Bấm [1]/[2] hoặc click danh sách để đổi nhà.", "info");
            this.renderAll();
        });

        document.getElementById("btn-gameover-spectate")?.addEventListener("click", () => {
            document.getElementById("modal-gameover").classList.add("hidden");
            this.startEliminatedSpectatorSession();
        });

        const sellUnitAction = () => {
            if (!this.selectedPrepUnitUid) {
                this.showToast("Hãy chọn 1 quân cờ trên bàn hoặc hàng chờ để bán!", "info");
                return;
            }
            const res = this.tft.sellUnit(this.selectedPrepUnitUid);
            if (res.ok) {
                this.selectedPrepUnitUid = null;
                this.sfx.move();
                const feeNote = (res.stars > 1 && res.feeDeducted) ? ` (Đã trừ ${res.feeDeducted}🪙 phí ghép)` : "";
                this.showToast(`Đã bán ${res.name} (+${res.refund} Vàng)${feeNote}`, "info");
                this.renderAll();
                this.syncMyStateToRoom();
            } else {
                this.showToast(res.msg, "warn");
            }
        };

        document.getElementById("btn-sell-selected")?.addEventListener("click", sellUnitAction);
        document.getElementById("btn-sell-hud-direct")?.addEventListener("click", sellUnitAction);

        document.getElementById("btn-item-remover")?.addEventListener("click", () => {
            if (this.tft.phase !== "prep") {
                this.showToast("Chỉ có thể dùng Búa Gỡ Đồ trong giai đoạn Chuẩn Bị!", "warn");
                return;
            }
            this.isRemoverActive = !this.isRemoverActive;
            if (this.isRemoverActive) {
                this.selectedItemIndex = null;
                this.showToast("✂️ Búa Gỡ Đồ đang bật! Bấm vào bất kỳ quân cờ nào để tháo đồ về kho.", "info");
            } else {
                this.showToast("Đã tắt Búa Gỡ Đồ.", "info");
            }
            this.renderRightPanel();
        });

        document.getElementById("btn-unequip-selected")?.addEventListener("click", () => {
            if (!this.selectedPrepUnitUid) return;
            const res = this.tft.unequipItems(this.selectedPrepUnitUid);
            if (res.ok) {
                this.sfx.move();
                this.showToast(`Đã gỡ ${res.count} trang bị từ ${res.unitName} về kho đồ!`, "success");
                this.renderAll();
                this.syncMyStateToRoom();
            } else {
                this.showToast(res.msg, "warn");
            }
        });

        document.getElementById("btn-rules-modal").addEventListener("click", () => {
            document.getElementById("modal-rules").classList.remove("hidden");
        });

        document.getElementById("btn-close-rules").addEventListener("click", () => {
            document.getElementById("modal-rules").classList.add("hidden");
        });

        const guideModalBtn = document.getElementById("btn-piece-guide-modal");
        if (guideModalBtn) guideModalBtn.addEventListener("click", () => this.openPieceGuide());

        const lobbyGuideBtn = document.getElementById("btn-open-guide-lobby");
        if (lobbyGuideBtn) lobbyGuideBtn.addEventListener("click", () => this.openPieceGuide());

        const closeGuideBtn = document.getElementById("btn-close-piece-guide");
        if (closeGuideBtn) closeGuideBtn.addEventListener("click", () => this.closePieceGuide());

        const footerCloseGuideBtn = document.getElementById("btn-footer-close-guide");
        if (footerCloseGuideBtn) footerCloseGuideBtn.addEventListener("click", () => this.closePieceGuide());

        // BGM Toggle Buttons (Lobby & Game Header) & Sound Pack Switcher
        const updateBgmButtons = () => {
            const isPlaying = !this.sfx.bgmMuted;
            const text = isPlaying ? "🎵 Nhạc: BẬT" : "🔇 Nhạc: TẮT";
            const btn1 = document.getElementById("btn-toggle-bgm");
            const btn2 = document.getElementById("btn-toggle-bgm-game");
            if (btn1) {
                btn1.textContent = text;
                btn1.classList.toggle("audio-off", !isPlaying);
            }
            if (btn2) {
                btn2.textContent = text;
                btn2.classList.toggle("audio-off", !isPlaying);
            }
            const isE33 = this.sfx.currentPack === "expedition33";
            const labelPack = document.getElementById("label-sound-pack");
            const btnPackGame = document.getElementById("btn-sound-pack-game");
            if (labelPack) labelPack.textContent = isE33 ? "🎼 OST: Expedition 33" : "🎼 OST: Cổ Điển";
            if (btnPackGame) btnPackGame.textContent = isE33 ? "🎼 E33" : "🎼 Classic";
        };

        const onToggleBgm = () => {
            this.sfx.toggleBgm();
            updateBgmButtons();
            const state = !this.sfx.bgmMuted ? `Đã bật: ${this.sfx.getCurrentTrackName()} 🎵` : "Đã tắt nhạc nền 🔇";
            this.showToast(state, "info");
        };

        const onCycleSoundPack = () => {
            const pack = this.sfx.cycleSoundPack();
            updateBgmButtons();
            this.showToast(`Đã chuyển bộ nhạc sang: ${pack.name} 🎼`, "success");
        };

        const btnBgm1 = document.getElementById("btn-toggle-bgm");
        if (btnBgm1) btnBgm1.addEventListener("click", onToggleBgm);

        const btnBgm2 = document.getElementById("btn-toggle-bgm-game");
        if (btnBgm2) btnBgm2.addEventListener("click", onToggleBgm);

        const btnPack1 = document.getElementById("btn-sound-pack");
        if (btnPack1) btnPack1.addEventListener("click", onCycleSoundPack);

        const btnPack2 = document.getElementById("btn-sound-pack-game");
        if (btnPack2) btnPack2.addEventListener("click", onCycleSoundPack);

        updateBgmButtons();

        // Mode Tân Thủ vs Mode Kỳ Thủ (Toggle in-game)
        this.updateGuideButtons = () => {
            const isBeginner = this.guideMode === "beginner";
            const btn = document.getElementById("btn-toggle-guide-mode");
            if (btn) {
                btn.textContent = isBeginner ? "🎓 Trợ Giúp: BẬT" : "♟️ Trợ Giúp: TẮT";
                btn.classList.toggle("guide-off", !isBeginner);
                btn.style.borderColor = isBeginner ? "#22c55e" : "#ef4444";
                btn.title = isBeginner 
                    ? "Chế độ Tân Thủ đang BẬT: Rê chuột vào quân sẽ hiện nước đi và sơ đồ 5x5. Bấm để TẮT (Chế độ Kỳ Thủ)."
                    : "Chế độ Kỳ Thủ đang BẬT: Đã tắt toàn bộ gợi ý khi rê chuột. Bấm để BẬT (Chế độ Tân Thủ).";
            }
            const sel = document.getElementById("skirmish-guide-select");
            if (sel) sel.value = this.guideMode;
        };

        const onToggleGuideMode = () => {
            this.guideMode = this.guideMode === "beginner" ? "veteran" : "beginner";
            localStorage.setItem("chesstft_guide_mode", this.guideMode);
            this.updateGuideButtons();
            if (this.guideMode === "beginner") {
                this.showToast("🎓 Đã bật Chế độ Tân Thủ: Rê chuột vào quân sẽ hiện nước đi và sơ đồ 5x5.", "success");
            } else {
                this.clearMovementPreview();
                this.hidePieceMovementTooltip();
                this.showToast("♟️ Đã bật Chế độ Kỳ Thủ: Tắt toàn bộ gợi ý khi rê chuột (Chuẩn cờ thi đấu)!", "info");
            }
        };

        const btnGuideToggle = document.getElementById("btn-toggle-guide-mode");
        if (btnGuideToggle) btnGuideToggle.addEventListener("click", onToggleGuideMode);

        this.updateGuideButtons();

        window.addEventListener("keydown", (e) => {
            if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;

            // Global Guide / Close shortcuts
            if (e.key === "h" || e.key === "H") {
                const modal = document.getElementById("modal-piece-guide");
                if (modal && !modal.classList.contains("hidden")) {
                    this.closePieceGuide();
                } else {
                    this.openPieceGuide();
                }
                return;
            } else if (e.key === "Escape") {
                this.closePieceGuide();
                return;
            }

            // TFT In-Game Hotkeys: D / F / E / W / X
            const gameScreen = document.getElementById("screen-game");
            if (!gameScreen || gameScreen.classList.contains("hidden")) return;

            // Prevent shortcuts when a modal overlay is visible
            const openModal = document.querySelector(".modal-overlay:not(.hidden)");
            if (openModal) return;

            const k = e.key.toLowerCase();
            if (k === "1") {
                const canCycle = (this.tft.phase === "prep") || (!this.chess || this.chess.gameOver) || this.isPostMatchSpectating || this.tft.player.eliminated;
                if (canCycle) {
                    e.preventDefault();
                    this.cycleScoutingPlayer(-1);
                    return;
                }
            } else if (k === "2") {
                const canCycle = (this.tft.phase === "prep") || (!this.chess || this.chess.gameOver) || this.isPostMatchSpectating || this.tft.player.eliminated;
                if (canCycle) {
                    e.preventDefault();
                    this.cycleScoutingPlayer(1);
                    return;
                }
            } else if (e.key === " " || e.key === "Spacebar" || e.code === "Space") {
                if (this.tft && this.tft.scoutingPlayerId && this.tft.scoutingPlayerId !== "player") {
                    e.preventDefault();
                    this.tft.scoutingPlayerId = "player";
                    this.renderAll();
                    return;
                }
                e.preventDefault();
                this.toggleLockShop();
                return;
            }

            if (k === "d") {
                e.preventDefault();
                this.handleHotkeyReroll();
            } else if (k === "f") {
                e.preventDefault();
                this.handleHotkeyBuyXP();
            } else if (k === "e") {
                e.preventDefault();
                this.handleHotkeySellPiece();
            } else if (k === "w") {
                e.preventDefault();
                this.handleHotkeyDeployOrRecall();
            } else if (k === "x") {
                e.preventDefault();
                this.toggleLockShop();
            }
        });

        document.getElementById("btn-next-round").addEventListener("click", () => {
            this.clearRoundResultCountdown();
            document.getElementById("modal-round-result").classList.add("hidden");

            // Nếu đang trong phòng nhiều người và các kỳ thủ khác chưa xong, hiển thị Banner chờ & cho phép soi bài
            if (this.isWaitingForRoundSync && !this.allBoardsFinishedCurrentRound) {
                const banner = document.getElementById("banner-waiting-sync");
                if (banner) {
                    const titleEl = document.getElementById("sync-title-text");
                    const subEl = document.getElementById("sync-sub-text");
                    if (titleEl) titleEl.textContent = "⚔️ VÁN CỜ CỦA BẠN ĐÃ HOÀN TẤT!";
                    if (subEl) subEl.textContent = `Đang chờ các kỳ thủ khác kết thúc vòng ${this.tft.stage}-${this.tft.roundInStage} (${this.roundSyncFinishedCount || 1}/${this.roundSyncTotalHumans || 2} xong)...`;
                    banner.classList.remove("hidden");
                }
                this.showToast("⏳ Ván của bạn đã xong! Hãy bấm vào đối thủ bên phải để soi bài trong lúc chờ.", "info");
                return;
            }

            this.proceedAfterRoundModal();
            this.syncMyStateToRoom();
        });

        document.getElementById("btn-restart-game").addEventListener("click", () => {
            document.getElementById("modal-gameover").classList.add("hidden");
            this.startNewGameSession(this.currentRoom);
        });
    }

    showToast(msg, type = "info") {
        const container = document.getElementById("toast-container");
        const el = document.createElement("div");
        el.className = `toast toast-${type}`;
        el.textContent = msg;
        container.appendChild(el);
        setTimeout(() => {
            el.classList.add("toast-fade");
            setTimeout(() => el.remove(), 300);
        }, 2800);
    }

    // ========================================================================
    // MATCHMAKING & SURRENDER HANDLERS
    // ========================================================================
    startMatchmaking() {
        if (!this.currentUser) {
            this.showToast("Vui lòng đăng nhập trước khi tìm trận!", "warn");
            return;
        }
        if (!this.socket || !this.socket.connected) {
            this.showToast("Đang kết nối lại máy chủ Online... Vui lòng thử lại sau giây lát!", "warn");
            return;
        }

        const modal = document.getElementById("modal-matchmaking");
        modal?.classList.remove("hidden");
        this.matchmakingSeconds = 0;
        const timerEl = document.getElementById("matchmaking-timer");
        if (timerEl) timerEl.textContent = "⏳ 00:00";

        if (this.matchmakingTimer) clearInterval(this.matchmakingTimer);
        this.matchmakingTimer = setInterval(() => {
            this.matchmakingSeconds++;
            const mins = String(Math.floor(this.matchmakingSeconds / 60)).padStart(2, "0");
            const secs = String(this.matchmakingSeconds % 60).padStart(2, "0");
            if (timerEl) timerEl.textContent = `⏳ ${mins}:${secs}`;
        }, 1000);

        this.socket.emit("matchmaking:find", {
            user: this.currentUser,
            timeMode: "standard"
        });
    }

    cancelMatchmaking() {
        if (this.matchmakingTimer) {
            clearInterval(this.matchmakingTimer);
            this.matchmakingTimer = null;
        }
        document.getElementById("modal-matchmaking")?.classList.add("hidden");
        if (this.socket && this.socket.connected) {
            this.socket.emit("matchmaking:cancel");
        }
        this.showToast("Đã hủy tìm trận xếp hạng.", "info");
    }

    async handlePlayerSurrender() {
        this.stopCombatTimers();
        this.clearAllCountdowns();

        if (this.isSkirmishMode) {
            this.isSkirmishMode = false;
            document.body.classList.remove("skirmish-active");
            this.sfx.defeat();
            this.showToast("Đã rời trận đấu Đấu Trí 1v1.", "info");
            this.showScreen("lobby");
            return;
        }

        const res = this.tft.surrenderPlayer();
        this.sfx.defeat();

        if (this.currentUser && this.currentUser.id) {
            try {
                await fetch("api.php?action=match_finish", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: this.currentUser.id,
                        rank: res.rank,
                        totalPlayers: 8,
                        roomCode: this.currentRoom ? this.currentRoom.code : "SOLO",
                        winnerName: "Đối thủ",
                        stageReached: `Stage ${this.tft.stage}-${this.tft.roundInStage}`
                    })
                });
            } catch (e) {}
        }

        const modal = document.getElementById("modal-gameover");
        const titleEl = document.getElementById("gameover-title");
        const descEl = document.getElementById("gameover-desc");
        if (titleEl) {
            titleEl.textContent = `🏳️ BẠN ĐÃ ĐẦU HÀNG (TOP #${res.rank})`;
            titleEl.className = "modal-title text-loss";
        }
        if (descEl) {
            descEl.innerHTML = `Bạn đã dừng cuộc chơi ở <strong>Vòng ${this.tft.stage}-${this.tft.roundInStage}</strong>.<br/>Chúc bạn may mắn hơn ở trận đấu tiếp theo!`;
        }
        modal?.classList.remove("hidden");
    }

    // ========================================================================
    // RENDERING PIPELINE
    // ========================================================================

    renderAll() {
        this.renderTopHeader();
        this.renderStageRoundTracker();
        this.renderTftEconomyHud();
        this.renderLeaderboard();
        this.renderSynergies();
        this.renderBoardArea();
        this.renderBench();
        this.renderShop();
        this.renderRightPanel();
        this.renderSelectedUnitInspector();
        window.renderLucideIcons();
    }

    renderStageRoundTracker() {
        const trackerEl = document.getElementById("stage-round-tracker");
        if (!trackerEl || !this.tft) return;

        const currentStage = this.tft.stage;
        const currentRound = this.tft.roundInStage;
        const stageFmt = (window.CHESS_TFT_DATA.STAGE_ROUNDS_FORMAT && window.CHESS_TFT_DATA.STAGE_ROUNDS_FORMAT[currentStage]) || [];

        let html = `<div class="stage-pill-track"><span style="font-size:0.78rem; font-weight:800; color:#38bdf8; margin-right:4px;">STAGE ${currentStage}</span>`;
        for (const item of stageFmt) {
            let statusClass = "future";
            if (item.round < currentRound) statusClass = "past";
            else if (item.round === currentRound) statusClass = "current";

            html += `
                <div class="tracker-node ${statusClass}" title="${item.label}">
                    <span>${item.icon}</span>
                    <span>${currentStage}-${item.round}</span>
                </div>
            `;
        }
        html += `</div>`;
        trackerEl.innerHTML = html;
    }

    renderTftEconomyHud() {
        if (!this.tft) return;
        const p = this.tft.player;
        const neededXp = window.CHESS_TFT_DATA.LEVEL_XP[p.level] || 999;
        const xpPercent = neededXp === 999 ? 100 : Math.min(100, Math.floor((p.xp / neededXp) * 100));

        const hudLvlName = document.getElementById("hud-level-name");
        if (hudLvlName) hudLvlName.textContent = `CẤP ${p.level}`;

        const hudXpRatio = document.getElementById("hud-xp-ratio");
        if (hudXpRatio) hudXpRatio.textContent = neededXp === 999 ? "MAX" : `${p.xp} / ${neededXp} XP`;

        const hudXpProg = document.getElementById("hud-xp-progress");
        if (hudXpProg) hudXpProg.style.width = `${xpPercent}%`;

        const hudGoldAmt = document.getElementById("hud-gold-amount");
        if (hudGoldAmt) hudGoldAmt.textContent = p.gold;

        const maxInterest = p.augments.includes("aug_rich_get_richer") ? 7 : 5;
        const interest = Math.min(maxInterest, Math.floor(p.gold / 10));
        const hudInterest = document.getElementById("hud-interest-badge");
        if (hudInterest) hudInterest.textContent = `+${interest}🪙 Lãi`;

        const hudStreak = document.getElementById("hud-streak-badge");
        if (hudStreak) {
            if (p.streak > 0) hudStreak.textContent = `🔥 Thắng ${p.streak}`;
            else if (p.streak < 0) hudStreak.textContent = `💧 Thua ${Math.abs(p.streak)}`;
            else hudStreak.textContent = `⚖️ Chuỗi: 0`;
        }

        const deployed = this.tft.getNonKingCount(p);
        const maxAllowed = this.tft.getMaxUnitsAllowed(p);
        const hudCap = document.getElementById("hud-unit-cap");
        if (hudCap) hudCap.textContent = `Quân: ${deployed}/${maxAllowed}`;

        // CẬP NHẬT SỐ TƯỚNG TRÊN SÀN ĐẤU (WATERMARK CHUẨN TFT: 5/5)
        const watermark = document.getElementById("board-unit-watermark");
        if (watermark) {
            if (this.isSkirmishMode) {
                watermark.classList.add("hidden");
            } else if (this.tft.phase === "prep") {
                watermark.classList.remove("hidden");
                watermark.textContent = `${deployed}/${maxAllowed}`;
                watermark.classList.toggle("over-cap", deployed > maxAllowed);
                watermark.title = `Số tướng trên sàn: ${deployed}/${maxAllowed} (+1 Vua)`;
            } else {
                watermark.classList.add("hidden");
            }
        }

        // CẬP NHẬT TỶ LỆ RA TƯỚNG THEO CẤP ĐỘ (SHOP ODDS)
        const odds = (window.CHESS_TFT_DATA.SHOP_ODDS && window.CHESS_TFT_DATA.SHOP_ODDS[p.level]) || [100, 0, 0, 0, 0];
        for (let i = 1; i <= 5; i++) {
            const oEl = document.getElementById(`odds-tier-${i}`);
            if (oEl) oEl.textContent = `${odds[i - 1]}%`;
        }

        const modeBadge = document.getElementById("game-mode-badge");
        const btnSandbox = document.getElementById("btn-sandbox-panel-toggle");
        if (btnSandbox) {
            btnSandbox.classList.toggle("hidden", !this.isSandboxMode);
        }

        if (modeBadge) {
            if (this.isSkirmishMode) {
                modeBadge.textContent = "⚔️ ĐẤU TRÍ 1V1 (SKIRMISH)";
                modeBadge.className = "badge-pill";
                modeBadge.style.background = "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)";
                modeBadge.style.color = "#04060c";
                modeBadge.style.fontWeight = "800";
            } else if (this.isSandboxMode) {
                modeBadge.textContent = "🛠️ PHÒNG TẬP CHIẾN THUẬT";
                modeBadge.className = "badge-pill";
                modeBadge.style.background = "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)";
                modeBadge.style.color = "#04060c";
                modeBadge.style.fontWeight = "800";
            } else if (this.isRankedMode) {
                modeBadge.textContent = "🏆 LEO RANK ONLINE";
                modeBadge.className = "badge-pill badge-mode";
                modeBadge.style.background = "";
                modeBadge.style.color = "";
            } else {
                modeBadge.textContent = "🤖 ĐẤU VỚI BOT AI";
                modeBadge.className = "badge-pill";
                modeBadge.style.background = "";
                modeBadge.style.color = "";
            }
        }
    }

    renderTopHeader() {
        if (this.isSkirmishMode) {
            const mapDef = (window.CHESS_TFT_DATA.MAPS && window.CHESS_TFT_DATA.MAPS.find(m => m.id === (this.skirmishState?.mapId || 'map_arena_1v1'))) || (window.CHESS_TFT_DATA.MAPS && window.CHESS_TFT_DATA.MAPS[2]) || { name: 'Đấu Trường Cờ Chớp' };
            const stageBadge = document.getElementById("stage-round-badge");
            if (stageBadge) stageBadge.textContent = "⚡ 1v1 Blitz (30 Vàng)";
            const boardBadge = document.getElementById("board-size-badge");
            if (boardBadge) boardBadge.textContent = "📐 Bàn cờ: 6x7 Cờ Vua";
            const phaseBanner = document.getElementById("phase-banner");
            if (phaseBanner) {
                if (this.isSkirmishSpectator) {
                    phaseBanner.textContent = `🎙️ KHÁN GIẢ • ĐANG THEO DÕI 2 BOT AI THI ĐẤU TRÊN BẢN ĐỒ ${mapDef.name.toUpperCase()}`;
                    phaseBanner.className = "phase-banner phase-combat";
                } else {
                    phaseBanner.textContent = `⚔️ ĐẤU TRÍ CỜ CHỚP 1V1 — BẢN ĐỒ ${mapDef.name.toUpperCase()}`;
                    phaseBanner.className = "phase-banner phase-combat";
                }
            }
            document.getElementById("btn-start-combat")?.classList.add("hidden");
            return;
        }
        const cfg = this.tft.getStageConfig();
        document.getElementById("stage-round-badge").textContent = `Vòng ${this.tft.stage}-${this.tft.roundInStage}`;
        document.getElementById("board-size-badge").textContent = `📐 Bàn cờ: ${cfg.label}`;

        const phaseBanner = document.getElementById("phase-banner");
        const btnStart = document.getElementById("btn-start-combat");

        if (this.tft.phase === "prep") {
            phaseBanner.textContent = "🛠️ GIAI ĐOẠN CHUẨN BỊ — Mua quân, Ghép sao, Lắp đồ & Soi bài (Ẩn địa hình)";
            phaseBanner.className = "phase-banner phase-prep";
            btnStart.classList.remove("hidden");
        } else if (this.tft.phase === "combat") {
            const oppName = this.tft.currentOpponent ? this.tft.currentOpponent.name : "Đối Thủ";
            const turnOneTag = (this.chess && this.chess.turnCount === 1)
                ? " • 🛡️ LƯỢT 1 KHAI CUỘC (Chỉ di chuyển dàn trận)"
                : "";
            phaseBanner.textContent = `⚔️ CỜ CHỚP vs ${oppName} (${this.tft.currentMap.name})${turnOneTag}`;
            phaseBanner.className = "phase-banner phase-combat";
            btnStart.classList.add("hidden");
        } else {
            phaseBanner.textContent = "✨ SỰ KIỆN ĐẶC BIỆT ĐẤU TRƯỜNG";
            phaseBanner.className = "phase-banner phase-prep";
            btnStart.classList.add("hidden");
        }

        // Player stats bar
        const p = this.tft.player;
        document.getElementById("player-hp").textContent = `${p.hp} HP`;
        document.getElementById("player-gold").textContent = `${p.gold} 🪙`;
        const neededXp = window.CHESS_TFT_DATA.LEVEL_XP[p.level] || "MAX";
        document.getElementById("player-level").textContent = `Cấp ${p.level} (${p.xp}/${neededXp} XP)`;

        const deployed = this.tft.getNonKingCount(p);
        const maxAllowed = this.tft.getMaxUnitsAllowed(p);
        document.getElementById("player-unit-cap").textContent = `Quân trên sân: ${deployed}/${maxAllowed} (+1 Vua)`;

        const streakEl = document.getElementById("player-streak");
        if (p.streak > 0) {
            streakEl.textContent = `🔥 Chuỗi thắng ${p.streak}`;
        } else if (p.streak < 0) {
            streakEl.textContent = `💧 Chuỗi thua ${Math.abs(p.streak)}`;
        } else {
            streakEl.textContent = `⚖️ Chuỗi: 0`;
        }

        // Prep phase timer badge
        const prepTimerBadge = document.getElementById("prep-timer-badge");
        if (prepTimerBadge) {
            if (this.tft.phase === "prep") {
                prepTimerBadge.classList.remove("hidden");
                prepTimerBadge.textContent = `⏳ ${this.prepSecondsLeft}s`;
            } else {
                prepTimerBadge.classList.add("hidden");
            }
        }

        // Fortune Chest Badge
        const fortuneBadge = document.getElementById("fortune-chest-badge");
        if (fortuneBadge) {
            const syn = this.tft.calculateSynergies(p);
            const hasFortune = syn.fortune && syn.fortune.activeTier >= 3;
            if (hasFortune || p.fortuneLossStreak > 0 || p.fortuneScore > 0) {
                fortuneBadge.classList.remove("hidden");
                fortuneBadge.textContent = `🎰 Rương: ${p.fortuneScore || 0}đ (Chuỗi ${p.fortuneLossStreak || 0} thua)`;
            } else {
                fortuneBadge.classList.add("hidden");
            }
        }
    }

    // Render 8-Player Lobby & Scouting Buttons
    renderLeaderboard() {
        const listEl = document.getElementById("leaderboard-list");
        if (!listEl) return;
        listEl.innerHTML = "";

        if (this.isSkirmishMode) {
            let botName = "Đại Kiện Tướng Magnus AI";
            let botAvatar = "👑";

            if (this.isOnlineSkirmish) {
                const opp = (this.currentRoom?.players || []).find(p => p.id !== this.currentUser?.id);
                botName = opp ? opp.name : (this.onlineSkirmishIsWhite ? "Đối Thủ (Quân Đen)" : "Đối Thủ (Quân Trắng)");
                botAvatar = opp?.avatar || "⚔️";
            } else {
                const botDiff = this.skirmishState.botDifficulty;
                botName = botDiff === "apprentice" ? "Bot Martin (Tập Sự)" : (botDiff === "veteran" ? "Bot Hikaru (Chiến Binh)" : "Đại Kiện Tướng Magnus AI");
                botAvatar = botDiff === "apprentice" ? "🎓" : (botDiff === "veteran" ? "⚡" : "👑");
            }

            const allPieces = this.chess ? this.chess.board.flat().filter(Boolean) : [];
            const playerPieces = this.chess ? allPieces.filter(p => p.side === "player") : this.skirmishState.units;
            const enemyPieces = this.chess ? allPieces.filter(p => p.side === "enemy") : [];

            // Update live Head-to-Head HUD
            const h2h = document.getElementById("banner-1v1-headtohead");
            if (h2h && !h2h.classList.contains("hidden")) {
                const p1Hp = document.getElementById("h2h-p1-hp");
                const p2Hp = document.getElementById("h2h-p2-hp");
                if (p1Hp) p1Hp.textContent = `${playerPieces.length} Quân`;
                if (p2Hp) p2Hp.textContent = `${enemyPieces.length} Quân`;
            }

            const fmtClock = (sec) => {
                if (sec >= 60) {
                    const m = Math.floor(sec / 60);
                    const s = Math.floor(sec % 60);
                    return `${m}:${s < 10 ? '0' : ''}${s}`;
                }
                return `${sec.toFixed(1)}s`;
            };

            listEl.innerHTML = `
                <div class="leader-row leader-self" style="border-color:#38bdf8; background:rgba(56, 189, 248, 0.1);">
                    <div class="leader-top">
                        <span class="leader-avatar">${this.currentUser?.avatar || "👑"}</span>
                        <div class="leader-info">
                            <div class="leader-name" style="font-weight:800; color:#f8fafc;">${this.currentUser?.displayName || "Bạn (Kỳ Thủ)"}</div>
                            <div class="leader-sub" style="color:#94a3b8;">Còn: <strong style="color:#38bdf8;">${playerPieces.length}</strong> Quân trên sân</div>
                        </div>
                        <span class="leader-hp-num" style="color:#38bdf8; font-family:'Rajdhani',sans-serif; font-size:1.05rem; font-weight:800;">${this.chess ? fmtClock(this.playerClock) : "5:00"} ⏱️</span>
                    </div>
                </div>
                <div class="leader-row leader-current-opp" style="margin-top:6px; border-color:#f87171; background:rgba(239, 68, 68, 0.1);">
                    <div class="leader-top">
                        <span class="leader-avatar">${botAvatar}</span>
                        <div class="leader-info">
                            <div class="leader-name" style="font-weight:800; color:#f8fafc;">${botName} <span class="opponent-scout-badge" style="background:#ef4444; color:#fff; font-size:0.65rem;">⚔️ ĐỐI THỦ</span></div>
                            <div class="leader-sub" style="color:#94a3b8;">Còn: <strong style="color:#f87171;">${enemyPieces.length}</strong> Quân trên sân</div>
                        </div>
                        <span class="leader-hp-num" style="color:#f87171; font-family:'Rajdhani',sans-serif; font-size:1.05rem; font-weight:800;">${this.chess ? fmtClock(this.enemyClock) : "5:00"} ⏱️</span>
                    </div>
                </div>
            `;
            return;
        }

        const all = [...this.tft.getAllParticipants()].sort((a, b) => b.hp - a.hp);
        const potentialOpps = (this.tft.phase === "prep") ? this.tft.getPotentialOpponents() : [];

        for (const part of all) {
            const row = document.createElement("div");
            const isScouted = this.isSpectatorPOV
                ? (this.spectatorPovTargetId === part.id)
                : (this.tft.scoutingPlayerId === part.id);
            const isCurrentOpp = (!this.isSpectatorPOV) && this.tft.phase === "combat" && this.tft.currentOpponent && this.tft.currentOpponent.id === part.id;
            const isPotentialOpp = (!this.isSpectatorPOV) && this.tft.phase === "prep" && part.id !== "player" && !part.eliminated &&
                potentialOpps.some(o => o.id === part.id);

            row.className = `leader-row ${part.id === "player" ? "leader-self" : ""} ${isScouted ? "leader-scouted" : ""} ${part.eliminated ? "leader-dead" : ""} ${isCurrentOpp ? "leader-current-opp" : ""}`;

            const hpPercent = Math.max(0, Math.min(100, part.hp));
            const nonKingCount = this.tft.getNonKingCount(part);

            let oppBadge = "";
            if (this.isSpectatorPOV && isScouted) {
                oppBadge = `<span class="opponent-scout-badge" style="background:#ef4444; color:#fff;" title="Đang xem góc nhìn của kỳ thủ này">👁️ ĐANG XEM</span>`;
            } else if (isCurrentOpp) {
                oppBadge = `<span class="opponent-scout-badge" title="⚔️ Đang trực tiếp giao tranh!">⚔️ Đấu thủ</span>`;
            } else if (isPotentialOpp) {
                oppBadge = `<span class="opponent-scout-badge" title="⚔️ Đối thủ tiềm năng có thể gặp vòng tới! Bấm để soi bài!">⚔️</span>`;
            }

            // Extract all items owned by this participant (on board + bench)
            const allItems = [];
            if (part.items && Array.isArray(part.items)) allItems.push(...part.items);
            if (part.board && Array.isArray(part.board)) {
                for (const u of part.board) {
                    if (u.items && Array.isArray(u.items)) allItems.push(...u.items);
                }
            }
            if (part.bench && Array.isArray(part.bench)) {
                for (const u of part.bench) {
                    if (u && u.items && Array.isArray(u.items)) allItems.push(...u.items);
                }
            }

            row.innerHTML = `
                <div class="leader-top">
                    <span class="leader-avatar">${part.avatar}</span>
                    <div class="leader-info">
                        <div class="leader-name">${part.name} ${oppBadge}</div>
                        <div class="leader-sub">Cấp ${part.level} • ${nonKingCount} Quân ${part.style ? `• ${part.style}` : ""}</div>
                    </div>
                    <span class="leader-hp-num">${part.hp} HP</span>
                </div>
                <div class="leader-hp-bar">
                    <div class="leader-hp-fill" style="width:${hpPercent}%; background:${part.hp > 50 ? "#22c55e" : (part.hp > 25 ? "#f59e0b" : "#ef4444")}"></div>
                </div>
            `;

            row.addEventListener("click", () => {
                if (this.isSpectatorPOV) {
                    this.setSpectatorMode("pov", part.id);
                    return;
                }
                const canScout = (this.tft.phase === "prep") || (!this.chess || this.chess.gameOver) || this.isFinishedCombat || this.isPostMatchSpectating || this.tft.player.eliminated;
                if (!canScout) {
                    this.showToast("Đang trong lượt đánh Cờ Chớp của bạn, hãy hoàn thành trận đấu trước khi xem nhà khác!", "warn");
                    return;
                }
                this.tft.scoutingPlayerId = part.id;
                this.selectedPrepUnitUid = null;
                this.renderAll();
            });

            listEl.appendChild(row);
        }
    }


    renderRightPanel() {
        // 1. Blitz Clocks - Chỉ hiển thị khi Giao Tranh (Combat Phase) để tiết kiệm không gian!
        const clocksWrap = document.querySelector(".custom-clocks-box");
        const isCombat = (this.isSkirmishMode || (this.tft && this.tft.phase === "combat")) && this.chess && !this.chess.gameOver;
        if (clocksWrap) {
            clocksWrap.style.display = isCombat ? "block" : "none";
        }

        const fmtClock = (sec) => {
            if (sec >= 60) {
                const m = Math.floor(sec / 60);
                const s = Math.floor(sec % 60);
                return `${m}:${s < 10 ? '0' : ''}${s}`;
            }
            return `${sec.toFixed(1)}s`;
        };

        document.getElementById("clock-player").textContent = fmtClock(this.playerClock);
        document.getElementById("clock-enemy").textContent = fmtClock(this.enemyClock);

        const pLabel = document.getElementById("label-clock-player");
        const eLabel = document.getElementById("label-clock-enemy");
        if (pLabel && eLabel) {
            const isSpec = this.isSkirmishSpectator || this.skirmishController?.isSkirmishSpectator;
            if (isSpec) {
                pLabel.textContent = "BOT TRẮNG";
                const diff = (this.skirmishController?.skirmishState || this.skirmishState)?.botDifficulty;
                eLabel.textContent = diff === "grandmaster" ? "BOT ĐEN (MAGNUS)" : "BOT ĐEN";
            } else {
                pLabel.textContent = "BẠN";
                eLabel.textContent = "ĐỐI THỦ";
            }
        }

        const pClockBox = document.getElementById("clock-box-player");
        const eClockBox = document.getElementById("clock-box-enemy");
        if (isCombat) {
            pClockBox.classList.toggle("clock-active", this.chess.turn === "player");
            eClockBox.classList.toggle("clock-active", this.chess.turn === "enemy");
        } else {
            pClockBox.classList.remove("clock-active");
            eClockBox.classList.remove("clock-active");
        }

        // 2. Compact TFT Item Inventory (Nhỏ gọn chuẩn TFT)
        const viewed = this.getViewedParticipant();
        const isSelf = (viewed === this.tft.player) && !this.isSpectatorPOV;
        const viewedItems = viewed?.items || [];
        const itemContainer = document.getElementById("item-inventory");
        itemContainer.innerHTML = "";
        if (viewedItems.length === 0) {
            itemContainer.innerHTML = `<div class="empty-hint" style="font-size:0.75rem;">${isSelf ? "Kho đồ trống (Nhận ở Đi Chợ & Chọn Lõi)." : `Kho đồ của ${viewed?.name || "Kỳ thủ"} đang trống.`}</div>`;
        } else {
            const grid = document.createElement("div");
            grid.className = "item-inventory-tft-grid";
            viewedItems.forEach((itemId, idx) => {
                const it = window.CHESS_TFT_DATA.ITEMS[itemId];
                if (!it) return;
                const slot = document.createElement("div");
                slot.className = `inv-slot-compact ${isSelf && this.selectedItemIndex === idx ? "selected" : ""}`;
                slot.innerHTML = `<span>${it.icon}</span>`;
                slot.title = `${it.name}: ${it.desc}`;

                if (isSelf) {
                    slot.addEventListener("click", () => {
                        this.selectedItemIndex = this.selectedItemIndex === idx ? null : idx;
                        if (this.selectedItemIndex !== null) {
                            this.isRemoverActive = false; // deactivate remover if selecting an item
                            this.showToast(`Đã chọn ${it.name} — Bấm vào 1 quân cờ trên bàn hoặc hàng chờ để trang bị!`, "info");
                        }
                        this.renderRightPanel();
                    });
                }

                slot.addEventListener("mouseenter", (e) => this.showItemTooltip(itemId, e));
                slot.addEventListener("mousemove", (e) => this.moveItemTooltip(e));
                slot.addEventListener("mouseleave", () => this.hideItemTooltip());

                grid.appendChild(slot);
            });
            itemContainer.appendChild(grid);
        }

        // Remover tool slot state
        const removerBtn = document.getElementById("btn-item-remover");
        if (removerBtn) {
            removerBtn.classList.toggle("selected", !!this.isRemoverActive);
            removerBtn.parentElement.style.display = isSelf ? "flex" : "none";
        }

        // 3. Augments Owned
        const viewedAugs = viewed?.augments || [];
        const augContainer = document.getElementById("augment-list");
        augContainer.innerHTML = "";
        if (viewedAugs.length === 0) {
            augContainer.innerHTML = `<div class="empty-hint">${isSelf ? "Chưa có Lõi (Mở ở vòng 1-2, 2-2, 3-2)." : `${viewed?.name || "Kỳ thủ"} chưa chọn Lõi.`}</div>`;
        } else {
            for (const augId of viewedAugs) {
                const aug = window.CHESS_TFT_DATA.AUGMENTS.find(a => a.id === augId);
                if (!aug) continue;
                const d = document.createElement("div");
                d.className = "aug-badge";
                d.innerHTML = `<span>${aug.icon} <strong>${aug.name}</strong></span><div class="aug-sub">${aug.desc}</div>`;
                augContainer.appendChild(d);
            }
        }

        // 4. Combat Move Log
        const logEl = document.getElementById("combat-log");
        if (logEl) {
            logEl.innerHTML = "";
            if (!this.chess || this.chess.moveHistory.length === 0) {
                logEl.innerHTML = `<div class="empty-hint">Nhật ký nước đi Cờ Chớp sẽ hiển thị tại đây.</div>`;
            } else {
                const recent = this.chess.moveHistory.slice(-10).reverse();
                for (const entry of recent) {
                    const row = document.createElement("div");
                    row.className = `log-row log-${entry.side}`;
                    row.textContent = `[Lượt ${entry.turn}] ${entry.text}`;
                    logEl.appendChild(row);
                }
            }
        }
    }


    startBlitzCombat() {
        this.clearPrepCountdown();
        this.playCombatBgm();
        this.selectedPrepUnitUid = null;
        this.selectedItemIndex = null;
        this.selectedCombatSquare = null;
        this.validCombatActions = [];

        this.tft.prepareCombatRound();
        const cfg = this.tft.getStageConfig();
        const opp = this.tft.currentOpponent;

        const playerSyn = this.tft.calculateSynergies(this.tft.player);
        const enemySyn = this.tft.calculateSynergies(opp);

        const terrain = this.tft.currentMap.generateTerrain(cfg.cols, cfg.rows);

        this.chess = new window.BlitzChessEngine({
            cols: cfg.cols,
            rows: cfg.rows,
            terrain,
            maxTurns: cfg.maxTurns,
            playerSynergies: playerSyn,
            enemySynergies: enemySyn,
            playerAugments: this.tft.player.augments,
            enemyAugments: opp.augments || []
        });

        const enemyMirrored = this.tft.getMirroredEnemyPieces(opp, cfg);
        this.chess.setupBoard(this.tft.player.board, enemyMirrored);

        // Setup Blitz Clocks (including custom account modifier extraClockSeconds)
        const hasBlitzAug = this.tft.player.augments.includes("aug_blitz_master");
        const extraSec = Number(this.tft.player.extraClockSeconds || 0);
        this.playerClock = Math.max(10, cfg.blitzTime + (hasBlitzAug ? 12 : 0) + extraSec);
        this.enemyClock = Math.max(12, cfg.blitzTime - (hasBlitzAug ? 4 : 0));

        this.sfx.move();
        this.renderAll();

        // Start Blitz Clock Interval with speed multiplier
        this.stopCombatTimers();
        const tickRateMs = Math.round(100 / (this.combatSpeed || 1));
        this.clockInterval = setInterval(() => {
            if (!this.chess || this.chess.gameOver) return;

            const dt = 0.1;
            if (this.chess.turn === "player") {
                this.playerClock = Math.max(0, this.playerClock - dt);
                if (this.playerClock <= 0) {
                    this.chess.endMatch("enemy", "timeout", "Bạn hết thời gian đồng hồ Cờ Chớp!");
                    this.finishBlitzCombat();
                }
            } else {
                this.enemyClock = Math.max(0, this.enemyClock - dt);
                if (this.enemyClock <= 0) {
                    this.chess.endMatch("player", "timeout", "Đối thủ hết thời gian đồng hồ Cờ Chớp!");
                    this.finishBlitzCombat();
                }
            }
            this.renderRightPanel();
        }, tickRateMs);
    }

    stopCombatTimers() {
        if (this.skirmishController?.draftShowcaseTimer) {
            clearInterval(this.skirmishController.draftShowcaseTimer);
            clearTimeout(this.skirmishController.draftShowcaseTimer);
            this.skirmishController.draftShowcaseTimer = null;
        }
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        if (this.botMoveTimeout) {
            clearTimeout(this.botMoveTimeout);
            this.botMoveTimeout = null;
        }
        if (this.skirmishSpecTimeout) {
            clearTimeout(this.skirmishSpecTimeout);
            this.skirmishSpecTimeout = null;
        }
    }

    handleCombatBoardClick(r, c, pieceOnCell, matchedAction) {
        if (!this.chess || this.chess.gameOver) return;
        if (this.isSkirmishSpectator) {
            if (pieceOnCell) {
                this.showPieceMovementTooltip(pieceOnCell, r, c);
            }
            return;
        }
        if (this.chess.turn !== "player") {
            this.showToast("Đang là lượt đi của Đối Thủ!", "warn");
            return;
        }

        // 1. Execute matched action if player clicked a highlighted valid destination
        if (matchedAction) {
            const inc = this.isSkirmishMode ? (this.skirmishClockIncrement || 5) : this.tft.getStageConfig().increment;
            const res = this.chess.executeAction(matchedAction);
            this.selectedCombatSquare = null;
            this.validCombatActions = [];

            if (res) {
                // Clock increment + Cavalry bonus
                this.playerClock += inc + (res.clockBonus || 0);

                if (matchedAction.type === "ranged") this.sfx.ranged();
                else if (matchedAction.type === "melee") this.sfx.capture();
                else this.sfx.move();

                this.renderAll();

                if (res.combatHit) {
                    this.triggerCombatHitFx(res.combatHit);
                }

                if (res.gameOver || this.chess.gameOver) {
                    if (this.isOnlineSkirmish && this.socket && this.socket.connected && this.currentRoom) {
                        this.socket.emit("skirmish:action", {
                            roomCode: this.currentRoom.code,
                            action: matchedAction,
                            playerClock: this.playerClock,
                            enemyClock: this.enemyClock
                        });
                        this.socket.emit("skirmish:endMatch", {
                            roomCode: this.currentRoom.code,
                            winnerId: this.currentUser?.id,
                            reason: this.chess.result?.reason || "checkmate",
                            reasonLabel: this.chess.result?.reasonLabel || "Chiếu hết đối thủ"
                        });
                    }
                    this.finishBlitzCombat();
                    return;
                }

                // Trigger AI Bot response or send online action if it's now enemy's turn
                if (this.chess.turn === "enemy") {
                    if (this.isOnlineSkirmish) {
                        if (this.socket && this.socket.connected && this.currentRoom) {
                            this.socket.emit("skirmish:action", {
                                roomCode: this.currentRoom.code,
                                action: matchedAction,
                                playerClock: this.playerClock,
                                enemyClock: this.enemyClock
                            });
                        }
                        if (this.onlineSkirmishOpponentIsBot) {
                            this.scheduleBotTurn();
                        }
                    } else {
                        this.scheduleBotTurn();
                    }
                }
            }
            return;
        }

        // 2. Select player's own piece to show valid actions
        if (pieceOnCell && pieceOnCell.side === "player") {
            if (pieceOnCell.stunnedTurns > 0) {
                this.showToast(`${pieceOnCell.name} đang bị CHOÁNG (khóa di chuyển lượt này)!`, "warn");
                return;
            }
            this.selectedCombatSquare = { r, c };
            this.validCombatActions = this.chess.getPieceActions(r, c, false);
            this.sfx.move();
            this.renderAll();
        } else {
            this.selectedCombatSquare = null;
            this.validCombatActions = [];
            this.renderAll();
        }
    }

    scheduleBotTurn() {
        if (!this.chess || this.chess.gameOver || this.chess.turn !== "enemy") return;

        // Nếu ở Sandbox Mode và người dùng tắt AI đánh trả, bỏ lượt trả lại cho người chơi
        if (this.isSandboxMode && !this.sandboxEnemyAI) {
            this.botMoveTimeout = setTimeout(() => {
                if (!this.chess || this.chess.gameOver || this.chess.turn !== "enemy") return;
                this.chess.turn = "player";
                this.renderAll();
            }, 100);
            return;
        }

        // Bot suy nghĩ nhanh gọn (tùy chỉnh theo combatSpeed)
        const speed = (this.combatSpeed || 1);
        const thinkMs = Math.round((180 + Math.floor(Math.random() * 200)) / speed);
        this.botMoveTimeout = setTimeout(() => {
            if (!this.chess || this.chess.gameOver || this.chess.turn !== "enemy") return;

            const inc = this.isSkirmishMode ? (this.skirmishClockIncrement || 5) : this.tft.getStageConfig().increment;
            let blunder = 0.22;
            if (this.isSkirmishMode) {
                const diff = this.skirmishState.botDifficulty;
                blunder = diff === "apprentice" ? 0.35 : (diff === "veteran" ? 0.18 : 0.05);
            }
            const botAct = this.chess.chooseBotAction("enemy", blunder);
            if (!botAct) {
                this.chess.endMatch("player", "checkmate", "Đối thủ không còn nước đi hợp lệ!");
                this.finishBlitzCombat();
                return;
            }

            const res = this.chess.executeAction(botAct);
            if (res) {
                this.enemyClock += inc + (res.clockBonus || 0);
                if (botAct.type === "ranged") this.sfx.ranged();
                else if (botAct.type === "melee") this.sfx.hitArmor();
                else this.sfx.move();

                this.renderAll();

                if (res.combatHit) {
                    this.triggerCombatHitFx(res.combatHit);
                }

                if (this.isOnlineSkirmish && this.socket && this.socket.connected && this.currentRoom) {
                    this.socket.emit("skirmish:action", {
                        roomCode: this.currentRoom.code,
                        action: botAct,
                        playerClock: this.playerClock,
                        enemyClock: this.enemyClock
                    });
                }

                if (res.gameOver || this.chess.gameOver) {
                    if (this.isOnlineSkirmish && this.socket && this.socket.connected && this.currentRoom) {
                        this.socket.emit("skirmish:endMatch", {
                            roomCode: this.currentRoom.code,
                            winnerId: "bot",
                            reason: this.chess.result?.reason || "checkmate",
                            reasonLabel: this.chess.result?.reasonLabel || "Bot chiếu hết"
                        });
                    }
                    this.finishBlitzCombat();
                    return;
                }

                // If player had all units stunned and turn bounced back to enemy, schedule again
                if (this.chess.turn === "enemy") {
                    this.scheduleBotTurn();
                }
            }
        }, thinkMs);
    }

    isMultiplayerWithOtherHumans() {
        if (!this.socket || !this.socket.connected) return false;
        if (!this.currentRoom || this.currentRoom.code === "SOLO") return false;
        if (!Array.isArray(this.currentRoom.players)) return false;
        const humans = this.currentRoom.players.filter(p => !p.isBot && !p.eliminated);
        return humans.length > 1;
    }

    finishBlitzCombat() {
        this.stopCombatTimers();
        this.playPrepBgm();
        this.isFinishedCombat = true;
        if (!this.chess || !this.chess.result) return;

        const res = this.chess.result;
        if (res.winner === "player") this.sfx.victory();
        else this.sfx.defeat();

        if (this.isSkirmishMode) {
            const pb = document.getElementById("phase-banner");
            if (pb) {
                const p1El = document.getElementById("h2h-p1-name");
                const p2El = document.getElementById("h2h-p2-name");
                const wName = (p1El?.textContent || "Bot Trắng").replace(/^🤖\s*/, '').trim().toUpperCase();
                const bName = (p2El?.textContent || "Bot Đen").replace(/^🤖\s*/, '').trim().toUpperCase();
                const winnerText = res.winner === "player" ? `${wName} CHIẾN THẮNG` : (res.winner === "enemy" ? `${bName} CHIẾN THẮNG` : "HÒA CỜ");
                pb.textContent = `🏁 VÁN ĐẤU KẾT THÚC: ${winnerText} (${res.reasonLabel || "Chiếu hết"})`;
                pb.className = "phase-banner phase-combat";
            }
            this.renderAll();
            this.renderDpsMeter();
            setTimeout(() => {
                this.showRoundResultModal(res);
            }, 450);
            return;
        }

        this.tft.resolveRoundResults(res, this.chess.goldEarnedPlayer);

        // Ở chế độ Sandbox, người chơi bất tử (khóa máu không sợ bị trừ máu chết)
        if (this.isSandboxMode) {
            this.tft.player.hp = Math.max(100, this.tft.player.hp || 100);
            this.tft.player.eliminated = false;
        }

        this.renderAll();
        this.renderDpsMeter();

        // Nếu là Tutorial Mode thì hoàn thành khóa huấn luyện sau khi thắng ván đấu đầu tiên
        if (this.isTutorialMode) {
            setTimeout(() => {
                this.finishTutorialSession();
            }, 600);
            return;
        }

        // Kiểm tra xem trận đấu có người chơi thật khác hay không
        const isMulti = this.isMultiplayerWithOtherHumans();
        this.isWaitingForRoundSync = isMulti;
        this.allBoardsFinishedCurrentRound = !isMulti;

        // Gửi thông báo hoàn tất ván cờ tới Server để đồng bộ vòng đấu
        if (this.socket && this.currentRoom && this.currentRoom.code !== "SOLO") {
            this.socket.emit("room:playerFinishedCombat", {
                code: this.currentRoom.code,
                playerId: this.currentUser ? this.currentUser.id : "player",
                stage: this.tft.stage,
                round: this.tft.roundInStage
            });
        }

        // Show Round Result Modal after 450ms
        setTimeout(() => {
            this.showRoundResultModal(res);
        }, 450);
    }

}

// Initializer
function initApp() {
    if (!window.app) {
        window.app = new ChessTFTApp();
        if (window.renderLucideIcons) window.renderLucideIcons();
        if (window.initGameTooltips) window.initGameTooltips();
    }
}

if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

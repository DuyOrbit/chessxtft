// ============================================================================
// CHESS TFT - SPECTATOR CONTROLLER (ES MODULE)
// Multi-board 8-Bot tournament, 1v1 Caster Arena, 4-Split Screen & POV mode
// ============================================================================

import { PIECES } from '../data/pieces.data.js';
import { ITEMS } from '../data/items.data.js';
import { AUGMENTS } from '../data/augments.data.js';
import { PieceRenderer } from './PieceRenderer.js';
import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class SpectatorController {
    constructor(app) {
        this._app = app;
        this.specMatches = [];
        this.specMoveInterval = null;
        this.specClockInterval = null;
        this.specAutoNextTimeout = null;
        this.specSpeed = 1;
        this.specPaused = false;
        this.specZoomIndex = null;
        this.specGlobalLogs = [];
        this.isMultiplayerSpectator = false;
        this.isSpectatorPOV = false;
        this.spectatorPovTargetId = null;
        this.spectatorMode = 'multi';
    }

    get app() {
        return this._app || window.app;
    }

    set app(v) {
        this._app = v;
    }

    bindSpectatorEvents(app) {
        const openBtn1 = document.getElementById('btn-open-spectator-top');
        const openBtn2 = document.getElementById('btn-start-spectator-8bots');
        if (openBtn1) openBtn1.addEventListener('click', () => this.start8BotSpectatorMode(app));
        if (openBtn2) openBtn2.addEventListener('click', () => this.start8BotSpectatorMode(app));

        const backBtn = document.getElementById('btn-spec-back-lobby');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.stopSpectatorTimers();
                if (this.isMultiplayerSpectator) {
                    if (app.networkService && app.networkService.isConnected()) {
                        app.networkService.leaveRoom();
                    } else if (app.socket && app.socket.connected) {
                        app.socket.emit('room:leave');
                    }
                    this.isMultiplayerSpectator = false;
                    app.currentRoom = null;
                    const brandTitle = document.getElementById('spec-brand-title');
                    if (brandTitle) brandTitle.innerHTML = '👁️ QUAN SÁT GIẢI ĐẤU 8 BOT (4 MÀN HÌNH)';
                    const newBtn = document.getElementById('btn-spec-new-8bots');
                    if (newBtn) newBtn.style.display = '';
                }
                if (typeof app.showScreen === 'function') app.showScreen('lobby');
            });
        }

        const newBtn = document.getElementById('btn-spec-new-8bots');
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                this.start8BotSpectatorMode(app);
            });
        }

        const pauseBtn = document.getElementById('btn-spec-pause');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.specPaused = !this.specPaused;
                app.specPaused = this.specPaused;
                pauseBtn.textContent = this.specPaused ? '▶️ Tiếp Tục' : '⏸️ Tạm Dừng';
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                    message: this.specPaused ? '⏸️ Đã tạm dừng 4 bàn đấu!' : '▶️ Tiếp tục 4 bàn đấu!',
                    type: 'info'
                });
            });
        }

        const nextBtn = document.getElementById('btn-spec-next-round');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.advanceSpectatorNextRound(app);
            });
        }

        document.querySelectorAll('.spec-speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.spec-speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.specSpeed = Number(btn.getAttribute('data-speed')) || 1;
                app.specSpeed = this.specSpeed;
                this.scheduleSpectatorTick(app);
            });
        });

        const specToPovBtn = document.getElementById('btn-spec-switch-to-pov');
        if (specToPovBtn) {
            specToPovBtn.addEventListener('click', () => {
                const firstAlive = (app.tft.spectatorBots || []).find(b => !b.eliminated) || app.tft.spectatorBots?.[0];
                this.setSpectatorMode(app, 'pov', firstAlive?.id);
            });
        }

        const povToMultiBtn = document.getElementById('btn-spec-switch-to-multi');
        if (povToMultiBtn) {
            povToMultiBtn.addEventListener('click', () => {
                this.setSpectatorMode(app, 'multi');
            });
        }

        const prevPlayerBtn = document.getElementById('btn-spec-prev-player');
        if (prevPlayerBtn) {
            prevPlayerBtn.addEventListener('click', () => {
                this.cycleSpectatorPOVTarget(app, -1);
            });
        }

        const nextPlayerBtn = document.getElementById('btn-spec-next-player');
        if (nextPlayerBtn) {
            nextPlayerBtn.addEventListener('click', () => {
                this.cycleSpectatorPOVTarget(app, 1);
            });
        }
    }

    start8BotSpectatorMode(app) {
        app = app || this.app;
        this.isMultiplayerSpectator = false;
        if (typeof app.stopCombatTimers === 'function') app.stopCombatTimers();
        this.stopSpectatorTimers();
        this.specPaused = false;
        this.specZoomIndex = null;
        this.specGlobalLogs = [
            '🎬 Khởi tạo Giải Đấu 8 Kỳ Thủ AI! 8 Bot được chia thành 4 cặp đấu Cờ Chớp trực tiếp trên 4 màn hình!'
        ];

        const pauseBtn = document.getElementById('btn-spec-pause');
        if (pauseBtn) pauseBtn.textContent = '⏸️ Tạm Dừng';

        const brandTitle = document.getElementById('spec-brand-title');
        if (brandTitle) brandTitle.innerHTML = '👁️ QUAN SÁT GIẢI ĐẤU 8 BOT (4 MÀN HÌNH)';
        const newBtn = document.getElementById('btn-spec-new-8bots');
        if (newBtn) newBtn.style.display = '';

        app.tft.reset8BotTournament();
        if (typeof app.showScreen === 'function') app.showScreen('spectator');
        this.startSpectatorRoundMatches(app);
        eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
            message: '👁️ Đang phát trực tiếp 4 bàn đấu của 8 Bot AI cùng lúc!',
            type: 'success'
        });
    }

    startMultiplayerSpectatorSession(app, roomData) {
        app = app || this.app;
        this.isMultiplayerSpectator = true;
        app.currentRoom = roomData;
        if (typeof app.stopCombatTimers === 'function') app.stopCombatTimers();
        this.stopSpectatorTimers();
        this.specPaused = false;
        this.specZoomIndex = null;

        const is1v1 = (roomData?.mode === 'tft_1v1' || roomData?.mode === 'skirmish_1v1' || roomData?.maxPlayers === 2);
        const realCount = (roomData?.players || []).filter(p => !p.isBot).length;
        this.specGlobalLogs = is1v1 ? [
            `🎬 TRỰC TIẾP QUYẾT ĐẤU 1V1 (PHÒNG #${roomData.code})!`,
            `⚔️ Hai đối thủ trực tiếp so tài Cờ Chớp qua từng vòng đấu!`,
            `🎙️ Chế độ Caster / Trọng Tài: Đang theo dõi trực tiếp bàn đấu trung tâm.`
        ] : [
            `🎬 TRỰC TIẾP GIẢI ĐẤU 8 KỲ THỦ (PHÒNG #${roomData.code})!`,
            `👥 Có ${realCount} người chơi thật cùng tranh tài trên 4 bàn Cờ Chớp cùng lúc!`,
            `🎙️ Chế độ Caster / Trọng Tài: Bạn đang theo dõi toàn cảnh 4 màn hình 2x2 siêu mượt.`
        ];

        const pauseBtn = document.getElementById('btn-spec-pause');
        if (pauseBtn) pauseBtn.textContent = '⏸️ Tạm Dừng';

        const brandTitle = document.getElementById('spec-brand-title');
        if (brandTitle) {
            brandTitle.innerHTML = is1v1
                ? `🎙️ TRỰC TIẾP QUYẾT ĐẤU 1V1 • PHÒNG #${roomData.code}`
                : `🎙️ TRỰC TIẾP GIẢI ĐẤU 8 KỲ THỦ • PHÒNG #${roomData.code}`;
        }

        const newBtn = document.getElementById('btn-spec-new-8bots');
        if (newBtn) newBtn.style.display = 'none';

        app.tft.resetMultiplayerSpectatorTournament(roomData);
        if (typeof app.showScreen === 'function') app.showScreen('spectator');
        this.startSpectatorRoundMatches(app);
        eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
            message: is1v1
                ? `🎙️ Đang phát sóng trực tiếp trận Quyết Đấu 1v1 của Phòng #${roomData.code}!`
                : `🎙️ Đang phát sóng trực tiếp 4 bàn đấu của Phòng #${roomData.code}!`,
            type: 'success'
        });
    }

    startSpectatorRoundMatches(app) {
        app = app || this.app;
        this.stopSpectatorTimers();
        this.specMatches = app.tft.prepare8BotRoundMatches();
        this.renderSpectatorView(app);
        this.scheduleSpectatorTick(app);

        // 100ms clock tick for all 4 boards
        this.specClockInterval = setInterval(() => {
            if (this.specPaused) return;
            let anyClockUpdated = false;
            const dt = 0.1 * this.specSpeed;

            for (const m of this.specMatches) {
                if (m.engine.gameOver) continue;
                anyClockUpdated = true;
                if (m.engine.turn === 'player') {
                    m.clockA = Math.max(0, m.clockA - dt);
                    if (m.clockA <= 0) {
                        m.engine.endMatch('enemy', 'timeout', `${m.botA.name} hết giờ!`);
                        const logLine = app.tft.resolveSingleBotMatch(m);
                        if (logLine) this.specGlobalLogs.unshift(logLine);
                    }
                } else {
                    m.clockB = Math.max(0, m.clockB - dt);
                    if (m.clockB <= 0) {
                        m.engine.endMatch('player', 'timeout', `${m.botB.name} hết giờ!`);
                        const logLine = app.tft.resolveSingleBotMatch(m);
                        if (logLine) this.specGlobalLogs.unshift(logLine);
                    }
                }
            }

            if (anyClockUpdated) {
                if (this.isSpectatorPOV) {
                    this.updateSpectatorPovClocksOnly(app);
                } else {
                    this.updateSpectatorClocksOnly();
                }
                this.checkAllSpectatorMatchesFinished(app);
            }
        }, 100);
    }

    scheduleSpectatorTick(app) {
        app = app || this.app;
        if (this.specMoveInterval) {
            clearInterval(this.specMoveInterval);
            this.specMoveInterval = null;
        }
        const intervalMs = Math.max(110, Math.round(520 / this.specSpeed));
        this.specMoveInterval = setInterval(() => {
            if (this.specPaused) return;
            this.tickSpectatorMoves(app);
        }, intervalMs);
    }

    tickSpectatorMoves(app) {
        app = app || this.app;
        let anyMoved = false;

        for (const m of this.specMatches) {
            if (m.engine.gameOver) continue;
            anyMoved = true;
            const side = m.engine.turn;
            const act = m.engine.chooseBotAction(side, 0.18);
            if (!act) {
                const winnerSide = side === 'player' ? 'enemy' : 'player';
                m.engine.endMatch(winnerSide, 'checkmate', 'Không còn nước đi hợp lệ!');
            } else {
                const res = m.engine.executeAction(act);
                if (res) {
                    if (side === 'player') m.clockA += m.increment + (res.clockBonus || 0);
                    else m.clockB += m.increment + (res.clockBonus || 0);
                }
            }

            if (m.engine.gameOver && !m.resolved) {
                const logLine = app.tft.resolveSingleBotMatch(m);
                if (logLine) {
                    this.specGlobalLogs.unshift(logLine);
                }
            }
        }

        if (anyMoved) {
            if (app.sfx) app.sfx.move();
            if (this.isSpectatorPOV) {
                this.renderSpectatorPOV(app);
            } else {
                this.renderSpectatorView(app);
            }
            this.checkAllSpectatorMatchesFinished(app);
        }
    }

    checkAllSpectatorMatchesFinished(app) {
        if (this.specMatches.length === 0) return;
        const allDone = this.specMatches.every(m => m.engine.gameOver);
        if (!allDone) return;

        for (const m of this.specMatches) {
            if (!m.resolved) {
                const logLine = app.tft.resolveSingleBotMatch(m);
                if (logLine) this.specGlobalLogs.unshift(logLine);
            }
        }

        if (this.specMoveInterval) {
            clearInterval(this.specMoveInterval);
            this.specMoveInterval = null;
        }
        if (this.specClockInterval) {
            clearInterval(this.specClockInterval);
            this.specClockInterval = null;
        }

        if (this.isSpectatorPOV) {
            this.renderSpectatorPOV(app);
        } else {
            this.renderSpectatorView(app);
        }

        const aliveBots = app.tft.spectatorBots.filter(b => !b.eliminated);
        if (aliveBots.length <= 1) {
            const champ = aliveBots[0] || app.tft.spectatorBots[0];
            this.specGlobalLogs.unshift(`👑 NHÀ VÔ ĐỊCH GIẢI ĐẤU 8 BOT: ${champ.avatar} ${champ.name} (${champ.hp} ❤️ còn lại)!`);
            if (app.sfx) app.sfx.victory();
            this.renderSpectatorView(app);
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                message: `👑 ${champ.name} đã vô địch giải đấu 8 Bot!`,
                type: 'success'
            });
            return;
        }

        const autoChk = document.getElementById('chk-spec-auto');
        if (autoChk && autoChk.checked && !this.specAutoNextTimeout) {
            this.specAutoNextTimeout = setTimeout(() => {
                this.specAutoNextTimeout = null;
                if (!this.specPaused) {
                    this.advanceSpectatorNextRound(app);
                }
            }, 2200);
        }
    }

    advanceSpectatorNextRound(app) {
        app = app || this.app;
        this.stopSpectatorTimers();
        for (const m of this.specMatches) {
            if (!m.engine.gameOver) {
                m.engine.endMatch('draw', 'draw', 'Qua vòng nhanh');
            }
            if (!m.resolved) {
                const logLine = app.tft.resolveSingleBotMatch(m);
                if (logLine) this.specGlobalLogs.unshift(logLine);
            }
        }

        const aliveBots = app.tft.spectatorBots.filter(b => !b.eliminated);
        if (aliveBots.length <= 1) {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                message: "Giải đấu đã tìm ra Nhà Vô Địch! Hãy bấm 'Tạo Ván 8 Bot Mới' để xem giải mới.",
                type: 'info'
            });
            return;
        }

        const info = app.tft.advance8BotRound();
        const cfg = app.tft.getStageConfig();
        if (info.boardScaled) {
            this.specGlobalLogs.unshift(`📐 Bước sang Stage ${app.tft.stage}: Bàn cờ của cả 4 màn hình mở rộng thành ${cfg.cols}x${cfg.rows}!`);
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                message: `📐 Sang Stage ${app.tft.stage}: Bàn cờ mở rộng thành ${cfg.cols}x${cfg.rows}!`,
                type: 'success'
            });
        }
        this.startSpectatorRoundMatches(app);
    }

    stopSpectatorTimers() {
        if (this.specMoveInterval) {
            clearInterval(this.specMoveInterval);
            this.specMoveInterval = null;
        }
        if (this.specClockInterval) {
            clearInterval(this.specClockInterval);
            this.specClockInterval = null;
        }
        if (this.specAutoNextTimeout) {
            clearTimeout(this.specAutoNextTimeout);
            this.specAutoNextTimeout = null;
        }
    }

    updateSpectatorClocksOnly() {
        for (const m of this.specMatches) {
            const cA = document.getElementById(`spec-clock-a-${m.matchIndex}`);
            const cB = document.getElementById(`spec-clock-b-${m.matchIndex}`);
            if (cA) cA.textContent = `⏱️ ${m.clockA.toFixed(1)}s`;
            if (cB) cB.textContent = `⏱️ ${m.clockB.toFixed(1)}s`;
        }
    }

    updateSpectatorPovClocksOnly(app) {
        app = app || this.app;
        if (!this.isSpectatorPOV || !app.tft) return;
        const viewed = this.getViewedParticipant(app);
        if (!viewed) return;
        const m = this.specMatches?.find(match => match.botA.id === viewed.id || match.botB.id === viewed.id);
        if (!m) return;
        const pClock = document.getElementById('clock-player');
        const eClock = document.getElementById('clock-enemy');
        const pBox = document.getElementById('clock-box-player');
        const eBox = document.getElementById('clock-box-enemy');
        if (pClock) pClock.textContent = `${m.clockA.toFixed(1)}s`;
        if (eClock) eClock.textContent = `${m.clockB.toFixed(1)}s`;
        if (pBox) pBox.classList.toggle('clock-active', m.engine.turn === 'player' && !m.engine.gameOver);
        if (eBox) eBox.classList.toggle('clock-active', m.engine.turn === 'enemy' && !m.engine.gameOver);
    }

    renderSpectatorView(app) {
        app = app || this.app;
        if (this.isSpectatorPOV) {
            this.renderSpectatorPOV(app);
            return;
        }

        const cfg = app.tft.getStageConfig();
        const is1v1 = (app.tft.spectatorBots && app.tft.spectatorBots.length <= 2) ||
            (app.currentRoom && (app.currentRoom.mode === 'tft_1v1' || app.currentRoom.mode === 'skirmish_1v1' || app.currentRoom.maxPlayers === 2));
        const totalExpected = is1v1 ? 2 : 8;
        const aliveCount = (app.tft.spectatorBots || []).filter(b => !b.eliminated).length;

        const roleLabel = this.isMultiplayerSpectator ? 'Kỳ thủ' : 'Bot';
        const aliveBadge = document.getElementById('spec-alive-badge');
        if (aliveBadge) {
            aliveBadge.textContent = `${this.isMultiplayerSpectator ? '👥' : '🤖'} Còn sống: ${aliveCount}/${totalExpected} ${roleLabel}`;
        }

        const lbTitleEl = document.getElementById('spec-leaderboard-title');
        if (lbTitleEl) {
            if (is1v1) {
                lbTitleEl.textContent = this.isMultiplayerSpectator
                    ? '👥 2 Kỳ Thủ Quyết Đấu (Trực Tiếp)'
                    : '🤖 2 Bot Quyết Đấu 1v1';
            } else {
                lbTitleEl.textContent = this.isMultiplayerSpectator
                    ? '👥 Bảng Xếp Hạng 8 Kỳ Thủ (Trực Tiếp)'
                    : '🤖 Bảng Xếp Hạng 8 Bot (Can Thiệp Nhanh)';
            }
        }

        this.renderSpectatorLeaderboard(app);

        // Global log
        const logEl = document.getElementById('spec-global-log');
        if (logEl) {
            logEl.innerHTML = '';
            for (const line of this.specGlobalLogs.slice(0, 25)) {
                const d = document.createElement('div');
                d.className = 'log-row';
                d.textContent = line;
                logEl.appendChild(d);
            }
        }

        // 4 Split Screens Grid or Single Big Board for 1v1
        const gridEl = document.getElementById('spec-grid-4');
        if (gridEl) {
            const isSingleMatch = is1v1 || (this.specMatches && this.specMatches.length === 1);
            gridEl.classList.toggle('zoomed-single', this.specZoomIndex !== null || isSingleMatch);
            gridEl.innerHTML = '';

            for (const m of this.specMatches) {
                if (this.specZoomIndex !== null && this.specZoomIndex !== m.matchIndex) continue;
                gridEl.appendChild(this.renderSpectatorMatchCard(app, m, cfg));
            }
        }
    }

    renderSpectatorLeaderboard(app) {
        const lbEl = document.getElementById('spec-leaderboard');
        if (!lbEl) return;
        lbEl.innerHTML = '';

        const sorted = [...(app.tft.spectatorBots || [])].sort((a, b) => b.hp - a.hp);
        sorted.forEach((bot, idx) => {
            const row = document.createElement('div');
            const isReal = !!bot.isRealPlayer;
            row.className = `spec-bot-row ${bot.eliminated ? 'eliminated' : ''} ${isReal ? 'real-player' : ''}`;

            const unitsHtml = (bot.board || []).map(u => {
                const def = PIECES[u.id];
                return def ? `<span class="spec-bot-unit-pill" title="${def.name}"><img src="assets/pieces/${def.id}.svg" class="spec-unit-svg" alt="${def.name}" />${'★'.repeat(u.stars || 1)}</span>` : '';
            }).join('');

            const realTag = isReal
                ? `<span class="spec-real-player-pill">👤 NGƯỜI THẬT</span>`
                : `<span style="font-size:0.65rem; color:#94a3b8;">🤖 BOT</span>`;

            // Augments badges
            const augsHtml = (bot.augments || []).map(augId => {
                const def = AUGMENTS.find(a => a.id === augId);
                if (!def) return '';
                return `<span class="lb-aug-badge" title="[Lõi] ${def.name}: ${def.desc}">${def.icon} ${def.name}</span>`;
            }).join('');

            const isAdmin = app.currentUser && app.currentUser.role === 'admin';

            row.innerHTML = `
                <div class="spec-bot-top">
                    <span>#${idx + 1} ${bot.avatar} ${bot.name} ${realTag} <button class="btn-pov-card btn-view-bot-pov" title="Xem góc nhìn 1 người">👁️ POV</button></span>
                    <span style="color:${bot.hp > 40 ? '#4ade80' : '#f87171'}; font-weight:800;">❤️ ${bot.hp}</span>
                </div>
                <div class="spec-bot-meta">
                    <span>Lv.${bot.level} • 🪙 ${bot.gold} • ${isReal ? `ELO ${bot.elo || 1000}` : `Hệ: ${bot.style}`}</span>
                    <span>${bot.streak > 0 ? `🔥+${bot.streak}` : (bot.streak < 0 ? `❄️${bot.streak}` : '⚖️0')}</span>
                </div>
                ${augsHtml ? `<div class="lb-badges-cluster" style="margin:2px 0 4px;">${augsHtml}</div>` : ''}
                <div class="spec-bot-units">${unitsHtml}</div>
                ${isAdmin ? `
                <div class="spec-bot-admin-btns">
                    <button class="spec-mini-btn btn-buff-hp" title="Admin cộng +25 Máu cho Kỳ thủ này">+25 ❤️</button>
                    <button class="spec-mini-btn btn-buff-star" title="Admin nâng toàn bộ đội hình lên +1 Sao">⬆️ Nâng Sao</button>
                    <button class="spec-mini-btn btn-buff-item" title="Admin tặng thêm Trang bị">🎁 +Đồ</button>
                </div>
                ` : ''}
            `;

            row.style.cursor = 'pointer';
            row.addEventListener('click', (e) => {
                if (e.target.closest('.spec-mini-btn')) return;
                this.setSpectatorMode(app, 'pov', bot.id);
            });

            row.querySelector('.btn-view-bot-pov')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setSpectatorMode(app, 'pov', bot.id);
            });

            if (isAdmin) {
                row.querySelector('.btn-buff-hp')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    bot.hp = Math.min(200, bot.hp + 25);
                    bot.eliminated = false;
                    eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                        message: `⚡ Admin đã bơm +25 Máu cho ${bot.name}!`,
                        type: 'success'
                    });
                    this.renderSpectatorLeaderboard(app);
                });

                row.querySelector('.btn-buff-star')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    for (const u of bot.board) {
                        u.stars = Math.min(3, (u.stars || 1) + 1);
                    }
                    if (app.sfx) app.sfx.starUp();
                    eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                        message: `🌟 Admin đã nâng Sao toàn bộ đội hình của ${bot.name}!`,
                        type: 'success'
                    });
                    this.renderSpectatorLeaderboard(app);
                });

                row.querySelector('.btn-buff-item')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const itemIds = Object.keys(ITEMS);
                    const nonKings = bot.board.filter(u => u.id !== 'king');
                    if (nonKings.length > 0) {
                        const target = nonKings[Math.floor(Math.random() * nonKings.length)];
                        const randItem = itemIds[Math.floor(Math.random() * itemIds.length)];
                        target.items.push(randItem);
                        eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                            message: `🎁 Admin đã trang bị ${ITEMS[randItem].name} cho ${bot.name}!`,
                            type: 'success'
                        });
                        this.renderSpectatorLeaderboard(app);
                    }
                });
            }

            lbEl.appendChild(row);
        });
    }

    renderSpectatorMatchCard(app, m, cfg) {
        const card = document.createElement('div');
        const eng = m.engine;
        card.className = `spec-match-card ${eng.gameOver ? 'match-finished' : ''}`;

        const is1v1 = (this.specMatches && this.specMatches.length === 1);
        const isZoomed = this.specZoomIndex === m.matchIndex || is1v1;
        const baseCellPx = isZoomed
            ? (cfg.rows <= 6 ? 64 : (cfg.rows === 7 ? 54 : 46))
            : (cfg.rows <= 6 ? 34 : (cfg.rows === 7 ? 30 : 26));

        const lastMove = eng.moveHistory.length > 0
            ? eng.moveHistory[eng.moveHistory.length - 1]
            : null;
        const footerText = eng.gameOver
            ? m.summaryText
            : (lastMove ? `[Lượt ${lastMove.turn}] ${lastMove.text}` : '⏳ Bắt đầu ván đấu...');

        let statusPillText = `Lượt ${eng.turnCount}/${eng.maxTurns}`;
        if (eng.gameOver && eng.result) {
            statusPillText = `🏁 ${eng.result.reasonLabel}`;
        }

        const matchTitle = is1v1
            ? `<span>⚔️ SÂN ĐẤU QUYẾT ĐẤU 1V1</span>`
            : `<span>📺 BÀN #${m.matchIndex + 1} ${m.isExhibition ? '(Bản Sao)' : ''}</span>`;
        const zoomBtnHtml = is1v1
            ? ''
            : `<button class="spec-mini-btn btn-zoom-board">${isZoomed ? '🗗 Xem 4 Màn Hình' : '🔍 Phóng To'}</button>`;

        card.innerHTML = `
            <div class="spec-match-header">
                <div class="spec-match-title">
                    ${matchTitle}
                    <span class="badge-pill" style="font-size:0.68rem; padding:1px 6px;">${m.mapDef.name}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <span style="font-size:0.68rem; color:#94a3b8;">${statusPillText}</span>
                    ${zoomBtnHtml}
                </div>
            </div>

            <div class="spec-fighters-bar">
                <div class="spec-fighter side-blue ${!eng.gameOver && eng.turn === 'player' ? 'turn-active' : ''}" style="cursor:pointer;" title="Bấm để xem POV ${m.botA.name}">
                    <span>${m.botA.avatar} ${m.botA.name} ${m.botA.isRealPlayer ? '<span class="spec-real-player-pill">👤 THẬT</span>' : ''} (❤️${m.botA.hp}) <button class="btn-pov-card btn-card-pov-a" title="Xem camera 1 người">👁️ POV</button></span>
                    <span id="spec-clock-a-${m.matchIndex}">⏱️ ${m.clockA.toFixed(1)}s</span>
                </div>
                <span class="spec-vs-pill">VS</span>
                <div class="spec-fighter side-red ${!eng.gameOver && eng.turn === 'enemy' ? 'turn-active' : ''}" style="cursor:pointer;" title="Bấm để xem POV ${m.botB.name}">
                    <span>${m.botB.avatar} ${m.botB.name} ${m.botB.isRealPlayer ? '<span class="spec-real-player-pill">👤 THẬT</span>' : ''} (❤️${m.botB.hp}) <button class="btn-pov-card btn-card-pov-b" title="Xem camera 1 người">👁️ POV</button></span>
                    <span id="spec-clock-b-${m.matchIndex}">⏱️ ${m.clockB.toFixed(1)}s</span>
                </div>
            </div>

            <div class="spec-board-wrap">
                <div class="spec-board-grid" style="grid-template-columns: repeat(${cfg.cols}, ${baseCellPx}px); grid-template-rows: repeat(${cfg.rows}, ${baseCellPx}px);"></div>
            </div>

            <div class="spec-match-footer">${footerText}</div>
        `;

        card.querySelector('.side-blue')?.addEventListener('click', () => {
            this.setSpectatorMode(app, 'pov', m.botA.id);
        });
        card.querySelector('.side-red')?.addEventListener('click', () => {
            this.setSpectatorMode(app, 'pov', m.botB.id);
        });

        card.querySelector('.btn-card-pov-a')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setSpectatorMode(app, 'pov', m.botA.id);
        });
        card.querySelector('.btn-card-pov-b')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setSpectatorMode(app, 'pov', m.botB.id);
        });

        card.querySelector('.btn-zoom-board')?.addEventListener('click', () => {
            this.specZoomIndex = isZoomed ? null : m.matchIndex;
            this.renderSpectatorView(app);
        });

        const boardGrid = card.querySelector('.spec-board-grid');
        const lastAct = eng.lastAction;

        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                const cell = document.createElement('div');
                const isLight = (r + c) % 2 === 0;
                cell.className = `spec-cell ${isLight ? 'light' : 'dark'}`;

                const terr = typeof eng.getTerrain === 'function' ? eng.getTerrain(r, c) : (eng.terrain && eng.terrain[`${r},${c}`]);
                if (terr === 'river') cell.style.background = 'rgba(14, 165, 233, 0.32)';
                else if (terr === 'lava') cell.style.background = 'rgba(239, 68, 68, 0.32)';
                else if (terr === 'wall') {
                    cell.style.background = '#090d16';
                    cell.innerHTML = `<span style="font-size:0.75rem; opacity:0.65;">🧱</span>`;
                }

                if (lastAct) {
                    if (lastAct.fromR === r && lastAct.fromC === c) cell.classList.add('last-from');
                    if (lastAct.toR === r && lastAct.toC === c) cell.classList.add('last-to');
                }

                const unit = eng.board[r][c];
                if (unit) {
                    const hpSegs = [];
                    for (let i = 0; i < unit.maxHp; i++) {
                        hpSegs.push(`<span class="spec-hp-seg ${i >= unit.hp ? 'lost' : ''}"></span>`);
                    }
                    let statusBadge = '';
                    if (unit.stunnedTurns > 0) statusBadge = '💫';
                    else if (unit.burnTurns > 0) statusBadge = '🔥';
                    else if (unit.reloadTurns > 0) statusBadge = '⏳';

                    cell.innerHTML = `
                        <div class="spec-unit-token side-${unit.side}" style="font-size:${Math.max(12, Math.round(baseCellPx * 0.52))}px;">
                            <span class="spec-unit-stars">${'★'.repeat(unit.stars || 1)}</span>
                            <span>${unit.icon}</span>
                            ${statusBadge ? `<span class="spec-unit-status">${statusBadge}</span>` : ''}
                            <div class="spec-unit-hpbar">${hpSegs.join('')}</div>
                        </div>
                    `;
                    cell.style.cursor = 'pointer';
                    cell.setAttribute('title', `Bấm xem thông tin ô quân: ${unit.name || unit.id}`);
                    cell.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const owner = unit.side === 'player' ? m.botA : m.botB;
                        const def = PIECES[unit.id];
                        const itemNames = (unit.items && unit.items.length > 0)
                            ? unit.items.map(itId => ITEMS[itId]?.name || itId).join(', ')
                            : 'Không có';
                        eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                            message: `♟️ ${def?.name || unit.name || unit.id} ${'★'.repeat(unit.stars || 1)} (${owner.name}) • Máu: ${unit.hp}/${unit.maxHp} • Đồ: ${itemNames}`,
                            type: 'info'
                        });
                    });
                }

                boardGrid.appendChild(cell);
            }
        }

        return card;
    }

    setSpectatorMode(app, mode, targetId = null) {
        app = app || this.app;
        this.spectatorMode = mode;
        const is1v1 = (app.tft?.spectatorBots && app.tft.spectatorBots.length <= 2) ||
            (app.currentRoom && (app.currentRoom.mode === 'tft_1v1' || app.currentRoom.mode === 'skirmish_1v1' || app.currentRoom.maxPlayers === 2));

        if (mode === 'pov') {
            this.isSpectatorPOV = true;
            app.isSpectatorPOV = true;
            const participants = app.tft.spectatorBots || (app.tft.getAllParticipants ? app.tft.getAllParticipants() : []);
            if (targetId) {
                this.spectatorPovTargetId = targetId;
            } else if (!this.spectatorPovTargetId || !participants.some(p => p.id === this.spectatorPovTargetId)) {
                const firstAlive = participants.find(p => !p.eliminated) || participants[0];
                this.spectatorPovTargetId = firstAlive?.id || 'bot_0';
            }

            if (typeof app.showScreen === 'function') app.showScreen('game');
            const povBar = document.getElementById('spec-pov-control-bar');
            if (povBar) povBar.classList.remove('hidden');

            const povToMultiBtn = document.getElementById('btn-spec-switch-to-multi');
            if (povToMultiBtn) {
                povToMultiBtn.textContent = is1v1 ? '⚔️ Về Khán Đài Quyết Đấu (1v1)' : '📺 Đổi Sang 4 Bàn Đấu (2x2)';
            }

            const actionBtns = [
                document.getElementById('btn-start-combat'),
                document.getElementById('btn-reroll'),
                document.getElementById('btn-buy-xp'),
                document.getElementById('btn-lock-shop'),
                document.getElementById('btn-surrender-game')
            ];
            actionBtns.forEach(b => { if (b) b.style.display = 'none'; });

            this.renderSpectatorPOV(app);
            const target = participants.find(p => p.id === this.spectatorPovTargetId);
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                message: `👁️ Đang theo dõi góc nhìn POV của ${target?.name || 'Kỳ thủ'}!`,
                type: 'info'
            });
        } else {
            this.isSpectatorPOV = false;
            app.isSpectatorPOV = false;
            const povBar = document.getElementById('spec-pov-control-bar');
            if (povBar) povBar.classList.add('hidden');

            const actionBtns = [
                document.getElementById('btn-start-combat'),
                document.getElementById('btn-reroll'),
                document.getElementById('btn-buy-xp'),
                document.getElementById('btn-lock-shop'),
                document.getElementById('btn-surrender-game')
            ];
            actionBtns.forEach(b => { if (b) b.style.display = ''; });

            if (typeof app.showScreen === 'function') app.showScreen('spectator');
            this.renderSpectatorView(app);
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                message: is1v1 ? '⚔️ Đã chuyển về khán đài Quyết Đấu 1v1!' : '📺 Đã chuyển sang chế độ theo dõi 4 bàn cờ cùng lúc!',
                type: 'info'
            });
        }
    }

    cycleSpectatorPOVTarget(app, dir = 1) {
        app = app || this.app;
        const participants = app.tft.spectatorBots || (app.tft.getAllParticipants ? app.tft.getAllParticipants() : []);
        if (!participants || participants.length === 0) return;
        let curIdx = participants.findIndex(p => p.id === this.spectatorPovTargetId);
        if (curIdx === -1) curIdx = 0;
        const newIdx = (curIdx + dir + participants.length) % participants.length;
        this.spectatorPovTargetId = participants[newIdx].id;
        this.renderSpectatorPOV(app);
        if (app.sfx) app.sfx.move();
        eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
            message: `👁️ Chuyển camera sang: ${participants[newIdx].name}`,
            type: 'info'
        });
    }

    getViewedParticipant(app) {
        app = app || this.app;
        if (this.isSpectatorPOV) {
            const participants = app.tft.spectatorBots || (app.tft.getAllParticipants ? app.tft.getAllParticipants() : []);
            return participants.find(p => p.id === this.spectatorPovTargetId) || participants[0] || app.tft.player;
        }
        if (app.tft && app.tft.scoutingPlayerId && app.tft.scoutingPlayerId !== 'player') {
            return app.tft.getParticipantById(app.tft.scoutingPlayerId) || app.tft.player;
        }
        return app.tft ? app.tft.player : null;
    }

    renderSpectatorPOV(app) {
        app = app || this.app;
        if (!this.isSpectatorPOV || !app.tft) return;
        const viewed = this.getViewedParticipant(app);
        if (!viewed) return;

        // 1. Update POV control bar info
        const avEl = document.getElementById('spec-pov-target-av');
        const nameEl = document.getElementById('spec-pov-target-name');
        const statsEl = document.getElementById('spec-pov-target-stats');
        if (avEl) avEl.textContent = viewed.avatar || '👑';
        if (nameEl) nameEl.textContent = `Đang Xem: ${viewed.name} ${viewed.isRealPlayer ? '(Người thật)' : ''}`;
        if (statsEl) {
            const streakStr = viewed.streak > 0 ? `🔥+${viewed.streak}` : (viewed.streak < 0 ? `❄️${viewed.streak}` : '⚖️0');
            statsEl.textContent = `❤️ ${viewed.hp} HP • Lv.${viewed.level} • 🪙 ${viewed.gold} Vàng • Chuỗi ${streakStr}`;
        }

        // 2. Update Top Bar indicators via HUDController
        if (app.hudController) {
            app.hudController.updatePlayerStats(viewed, app.tft.stage, app.tft.roundInStage);
        }

        // 3. Render Synergies
        if (typeof app.renderSynergies === 'function') app.renderSynergies();

        // 4. Render Right Panel
        if (typeof app.renderRightPanel === 'function') app.renderRightPanel();

        // 5. Render Bench
        if (typeof app.renderBench === 'function') app.renderBench();

        // 6. Render Board
        if (typeof app.renderBoardArea === 'function') app.renderBoardArea();

        // 7. Render Leaderboard with POV highlights
        this.renderSpectatorPOVLeaderboard(app);
    }

    renderSpectatorPOVBoard(app, boardEl, cfg) {
        const viewed = this.getViewedParticipant(app);
        if (!viewed) return;

        const scoutBanner = document.getElementById('scouting-banner');
        const mapInfoBar = document.getElementById('map-info-bar');

        boardEl.style.gridTemplateColumns = `repeat(${cfg.cols}, 1fr)`;
        boardEl.style.gridTemplateRows = `repeat(${cfg.rows}, 1fr)`;
        boardEl.innerHTML = '';

        const activeMatch = this.specMatches?.find(m => m.botA.id === viewed.id || m.botB.id === viewed.id);
        const inActiveCombat = activeMatch && !activeMatch.engine.gameOver;

        if (inActiveCombat) {
            if (scoutBanner) {
                scoutBanner.classList.remove('hidden');
                const targetText = document.getElementById('scouting-target-name');
                if (targetText) targetText.textContent = `🔴 [TRỰC TIẾP]: ${activeMatch.botA.name} VS ${activeMatch.botB.name} (Bàn #${activeMatch.matchIndex + 1})`;
            }
            if (mapInfoBar) {
                mapInfoBar.innerHTML = `
                    <span class="map-active-pill" style="background:${activeMatch.mapDef.themeColor}">🗺️ ${activeMatch.mapDef.name}</span>
                    <span class="map-desc-text">${activeMatch.summaryText || 'Đang giao tranh Cờ Chớp trực tiếp...'}</span>
                `;
            }
            this.renderSpectatorEngineOnMainBoard(app, boardEl, cfg, activeMatch, viewed);
        } else {
            if (scoutBanner) {
                scoutBanner.classList.remove('hidden');
                const targetText = document.getElementById('scouting-target-name');
                if (targetText) targetText.textContent = `👁️ [GIAI ĐOẠN XẾP CỜ]: Đang theo dõi bàn cờ & hàng chờ của ${viewed.name}`;
            }
            if (mapInfoBar) {
                const mapDef = app.tft.currentMap || MAPS[0];
                mapInfoBar.innerHTML = `
                    <span class="map-active-pill" style="background:${mapDef.themeColor}">🗺️ Bản Đồ: ${mapDef.name}</span>
                    <span class="map-desc-text">Kỳ thủ đang sắp xếp đội hình và trang bị.</span>
                `;
            }
            if (app.boardController) {
                app.boardController.renderPrepBoardCells(app, boardEl, cfg, viewed, true);
            }
        }
    }

    renderSpectatorEngineOnMainBoard(app, boardEl, cfg, m, viewed) {
        const eng = m.engine;

        const pLabel = document.querySelector('#clock-box-player .clock-label');
        const eLabel = document.querySelector('#clock-box-enemy .clock-label');
        const pClock = document.getElementById('clock-player');
        const eClock = document.getElementById('clock-enemy');
        const pBox = document.getElementById('clock-box-player');
        const eBox = document.getElementById('clock-box-enemy');

        if (pLabel) pLabel.textContent = `${m.botA.name.slice(0, 10)} ${m.botA.id === viewed.id ? '👁️' : ''}`;
        if (eLabel) eLabel.textContent = `${m.botB.name.slice(0, 10)} ${m.botB.id === viewed.id ? '👁️' : ''}`;
        if (pClock) pClock.textContent = `${m.clockA.toFixed(1)}s`;
        if (eClock) eClock.textContent = `${m.clockB.toFixed(1)}s`;
        if (pBox) pBox.classList.toggle('clock-active', eng.turn === 'player' && !eng.gameOver);
        if (eBox) eBox.classList.toggle('clock-active', eng.turn === 'enemy' && !eng.gameOver);

        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                const cell = document.createElement('div');
                const isLight = (r + c) % 2 === 0;
                const terr = typeof eng.getTerrain === 'function' ? eng.getTerrain(r, c) : (eng.terrain && eng.terrain[`${r},${c}`]);
                cell.className = `board-cell ${isLight ? 'cell-light' : 'cell-dark'}`;

                if (terr) {
                    cell.classList.add(`terrain-${terr}`);
                    const terrBadge = document.createElement('span');
                    terrBadge.className = 'terrain-badge';
                    if (terr === 'river') terrBadge.textContent = '🌊 Sông';
                    else if (terr === 'wall') terrBadge.textContent = '🧱 Tường';
                    else if (terr === 'lava') terrBadge.textContent = '🌋 Dung Nham';
                    else if (terr === 'rune') terrBadge.textContent = '✨ +Tầm';
                    cell.appendChild(terrBadge);
                }

                if (eng.lastAction) {
                    if ((eng.lastAction.fromR === r && eng.lastAction.fromC === c) ||
                        (eng.lastAction.toR === r && eng.lastAction.toC === c)) {
                        cell.classList.add('cell-last-move');
                    }
                }

                const piece = eng.board[r][c];
                if (piece) {
                    const pieceEl = PieceRenderer.createPieceDOM(piece, app.tooltipManager);
                    cell.appendChild(pieceEl);
                }
                if (app.selectedCombatSquare && app.selectedCombatSquare.r === r && app.selectedCombatSquare.c === c) {
                    cell.classList.add('cell-selected');
                }
                cell.addEventListener('click', () => {
                    if (piece) {
                        app.selectedCombatSquare = (app.selectedCombatSquare && app.selectedCombatSquare.r === r && app.selectedCombatSquare.c === c)
                            ? null
                            : { r, c };
                        this.renderSpectatorEngineOnMainBoard(app, boardEl, cfg, m, viewed);
                        if (typeof app.renderSelectedUnitInspector === 'function') app.renderSelectedUnitInspector();
                    }
                });
                boardEl.appendChild(cell);
            }
        }
    }

    renderSpectatorPOVLeaderboard(app) {
        const listEl = document.getElementById('leaderboard-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        const bots = [...(app.tft.spectatorBots || [])].sort((a, b) => b.hp - a.hp);
        for (const bot of bots) {
            const row = document.createElement('div');
            const isTarget = bot.id === this.spectatorPovTargetId;
            row.className = `leader-row ${isTarget ? 'leader-scouted leader-self' : ''} ${bot.eliminated ? 'leader-dead' : ''}`;

            const hpPercent = Math.max(0, Math.min(100, bot.hp));
            const nonKingCount = (bot.board || []).filter(u => u.id !== 'king').length;

            const augBadges = (bot.augments || []).map(augId => {
                const def = AUGMENTS.find(a => a.id === augId);
                if (!def) return '';
                return `<span class="lb-aug-badge" title="[Lõi] ${def.name}: ${def.desc}">${def.icon}</span>`;
            }).join('');

            const equippedItems = [];
            (bot.board || []).forEach(u => {
                (u.items || []).forEach(itId => {
                    const it = ITEMS[itId];
                    if (it) equippedItems.push(it);
                });
            });
            const itemBadges = equippedItems.slice(0, 5).map(it =>
                `<span class="lb-item-badge" title="[Trang bị] ${it.name}: ${it.desc}">${it.icon}</span>`
            ).join('');

            const badgesCluster = (augBadges || itemBadges)
                ? `<div class="lb-badges-cluster">${augBadges} ${itemBadges}</div>`
                : '';

            const targetTag = isTarget ? `<span class="opponent-scout-badge" style="background:#0ea5e9;">👁️ Đang xem</span>` : '';

            row.innerHTML = `
                <div class="leader-top">
                    <span class="leader-avatar">${bot.avatar}</span>
                    <div class="leader-info">
                        <div class="leader-name">${bot.name} ${targetTag}</div>
                        <div class="leader-sub">Cấp ${bot.level} • ${nonKingCount} Quân ${bot.isRealPlayer ? '• Người thật' : ''}</div>
                        ${badgesCluster}
                    </div>
                    <span class="leader-hp-num">${bot.hp} HP</span>
                </div>
                <div class="leader-hp-bar">
                    <div class="leader-hp-fill" style="width:${hpPercent}%; background:${bot.hp > 50 ? '#22c55e' : (bot.hp > 25 ? '#f59e0b' : '#ef4444')}"></div>
                </div>
            `;

            row.addEventListener('click', () => {
                this.setSpectatorMode(app, 'pov', bot.id);
            });

            listEl.appendChild(row);
        }
    }
}

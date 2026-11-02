// ============================================================================
// CHESS TFT - WAITING ROOM CONTROLLER (ES MODULE)
// Renders Lobby Waiting Room, slots (humans & bots), caster roles, bot actions
// ============================================================================

import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class WaitingRoomController {
    constructor() {
        this.controlsBox = document.getElementById('lobby-room-controls');
        this.waitingBox = document.getElementById('lobby-waiting-room');
    }

    render(app) {
        if (!this.controlsBox || !this.waitingBox) return;

        if (!app.currentRoom) {
            this.controlsBox.classList.remove('hidden');
            this.waitingBox.classList.add('hidden');
            return;
        }

        this.controlsBox.classList.add('hidden');
        this.waitingBox.classList.remove('hidden');

        const is1v1 = (app.currentRoom.mode === 'tft_1v1' || app.currentRoom.mode === 'skirmish_1v1');
        const maxSlots = is1v1 ? 2 : 8;

        const codeEl = document.getElementById('waiting-room-code');
        const countEl = document.getElementById('waiting-player-count');
        const maxPlayersEl = document.getElementById('waiting-max-players');

        if (codeEl) codeEl.textContent = app.currentRoom.code;
        if (countEl) countEl.textContent = app.currentRoom.players.length;
        if (maxPlayersEl) maxPlayersEl.textContent = maxSlots;

        // 1v1 Alert Banner
        const badge1v1 = document.getElementById('waiting-1v1-badge');
        const badge1v1Text = document.getElementById('waiting-1v1-badge-text');
        if (badge1v1) {
            if (is1v1) {
                badge1v1.classList.remove('hidden');
                const txt = (app.currentRoom.mode === 'skirmish_1v1')
                    ? 'THỂ THỨC: CỜ CHỚP CHIẾN THUẬT 1V1 (POINT-BUY 30 VÀNG - ĐẤU NGƯỜI HOẶC BOT AI)'
                    : 'THỂ THỨC: TFT ĐỐI ĐẦU 1V1 (SOLO HEAD-TO-HEAD - ĐẤU NGƯỜI HOẶC BOT AI)';
                if (badge1v1Text) badge1v1Text.textContent = txt;
                else badge1v1.textContent = txt;
            } else {
                badge1v1.classList.add('hidden');
            }
        }

        const isHost = app.currentUser && app.currentRoom.hostId === app.currentUser.id;
        const isSpectator = (app.currentRoom.isSpectatorHost && isHost) ||
            (Array.isArray(app.currentRoom.spectators) && app.currentRoom.spectators.some(s => s.id === app.currentUser?.id));

        // Quick Bot Action Bar
        const botBar = document.getElementById('waiting-bot-actions-bar');
        if (botBar) {
            botBar.style.display = isHost ? 'flex' : 'none';
            if (window.renderLucideIcons) window.renderLucideIcons(botBar);
        }

        const fillBotsChk = document.getElementById('chk-fill-bots');
        if (fillBotsChk) {
            fillBotsChk.checked = is1v1 ? false : (app.currentRoom.fillBots !== false);
            if (fillBotsChk.parentElement) {
                fillBotsChk.parentElement.style.display = is1v1 ? 'none' : '';
            }
            fillBotsChk.disabled = !isHost || is1v1;
        }

        const specAlert = document.getElementById('waiting-spectator-alert');
        if (specAlert) specAlert.classList.toggle('hidden', !isSpectator);

        // Role switcher buttons toggle
        const btnToSpec = document.getElementById('btn-switch-to-spectator');
        const btnToPlayer = document.getElementById('btn-switch-to-player');
        if (btnToSpec && btnToPlayer) {
            btnToSpec.style.display = isSpectator ? 'none' : '';
            btnToPlayer.style.display = isSpectator ? '' : 'none';
            const isFull = app.currentRoom.players.length >= maxSlots;
            btnToPlayer.disabled = isFull;
            btnToPlayer.title = isFull ? `Ghế thi đấu đã đủ ${maxSlots} người!` : 'Chuyển vào ghế thi đấu';
        }

        const specs = app.currentRoom.spectators || [];
        const specCountEl = document.getElementById('waiting-spectator-count');
        if (specCountEl) specCountEl.textContent = specs.length;

        const specListEl = document.getElementById('waiting-spectators-list');
        if (specListEl) {
            if (specs.length > 0) {
                specListEl.classList.remove('hidden');
                specListEl.innerHTML = `👁️ <strong>Trọng Tài / Khán Giả (${specs.length}):</strong> ` +
                    specs.map(s => `${s.avatar || '👁️'} ${s.name}${s.isHost ? ' 👑(Chủ phòng)' : ''}`).join(', ');
            } else {
                specListEl.classList.add('hidden');
            }
        }

        const startBtn = document.getElementById('btn-host-start-match');
        if (startBtn) {
            startBtn.disabled = !isHost;
            if (isHost) {
                if (is1v1) {
                    const isReady1v1 = app.currentRoom.players.length >= 2;
                    if (isSpectator) {
                        startBtn.disabled = false;
                        if (isReady1v1) {
                            const p0 = app.currentRoom.players[0];
                            const p1 = app.currentRoom.players[1];
                            const label = (app.currentRoom.mode === 'skirmish_1v1')
                                ? `🎙️ BẮT ĐẦU THEO DÕI 2 BOT AI ĐẤU TRÍ (${p0.name} vs ${p1.name})`
                                : `🎙️ BẮT ĐẦU THEO DÕI 2 BOT QUYẾT ĐẤU (${p0.name} vs ${p1.name})`;
                            startBtn.textContent = label;
                        } else if (app.currentRoom.players.length === 1) {
                            startBtn.textContent = '🎙️ BẮT ĐẦU VỚI BOT (TỰ ĐỘNG BÙ BOT THỨ 2)';
                        } else {
                            startBtn.textContent = '🎙️ BẮT ĐẦU VỚI 2 BOT AI (TỰ ĐỘNG THÊM 2 BOT)';
                        }
                    } else {
                        const opp = app.currentRoom.players.find(pl => pl.id !== app.currentUser?.id);
                        const oppBotNotice = opp && opp.isBot ? ` (VỚI BOT ${opp.name})` : ' (2/2 ĐỦ)';
                        if (isReady1v1) {
                            startBtn.disabled = false;
                            startBtn.textContent = (app.currentRoom.mode === 'skirmish_1v1')
                                ? `♟️ BẮT ĐẦU CỜ CHỚP 1V1${oppBotNotice}`
                                : `⚔️ BẮT ĐẦU QUYẾT ĐẤU TFT 1V1${oppBotNotice}`;
                        } else {
                            startBtn.disabled = false;
                            startBtn.textContent = '⚔️ BẮT ĐẦU NGAY VỚI BOT AI (TỰ ĐỘNG THÊM BOT)';
                        }
                    }
                } else {
                    const totalPlayers = app.currentRoom.players.length;
                    const hasBots = app.currentRoom.players.some(pl => pl.isBot);
                    if (isSpectator) {
                        startBtn.disabled = false;
                        startBtn.textContent = (totalPlayers === 0)
                            ? '🎙️ BẮT ĐẦU GIẢI ĐẤU (8 BOT TỰ ĐỘNG THI ĐẤU)'
                            : `🎙️ BẮT ĐẦU GIẢI ĐẤU (${totalPlayers}/8 Ghế)`;
                    } else {
                        startBtn.disabled = totalPlayers < 1;
                        startBtn.textContent = `⚔️ BẮT ĐẦU TRẬN ĐẤU (${totalPlayers}/8 Ghế${hasBots ? ' gồm Bot' : ''})`;
                    }
                }
            } else {
                startBtn.textContent = `⏳ Đang chờ Chủ Phòng (${app.currentRoom.hostName}) bắt đầu...`;
            }
        }

        const grid = document.getElementById('waiting-players-grid');
        if (grid) {
            grid.innerHTML = '';
            for (let i = 0; i < maxSlots; i++) {
                const p = app.currentRoom.players[i];
                const slot = document.createElement('div');
                if (p) {
                    if (p.isBot) {
                        slot.className = 'waiting-slot slot-bot-filled';
                        slot.innerHTML = `
                            <span style="font-size:1.3rem;">${p.avatar || '🤖'}</span>
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:800; display:flex; align-items:center;">
                                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name}</span>
                                    <span class="bot-tag-badge">AI BOT</span>
                                </div>
                                <div style="font-size:0.7rem; color:#d8b4fe;">${p.style || 'Đại Kiện Tướng AI'} • ELO ${p.elo || 1500}</div>
                            </div>
                            ${isHost ? `<button class="btn-kick-bot-slot" title="Đuổi Bot này để nhường ghế cho bạn bè">✕ Đuổi</button>` : ''}
                        `;
                        slot.querySelector('.btn-kick-bot-slot')?.addEventListener('click', () => {
                            this.removeBotFromRoom(app, p.id);
                        });
                    } else {
                        slot.className = 'waiting-slot slot-human';
                        slot.innerHTML = `
                            <span style="font-size:1.3rem;">${p.avatar || '👑'}</span>
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:800;">${p.name} ${p.isHost ? '👑' : ''}</div>
                                <div style="font-size:0.7rem; color:#93c5fd;">Người chơi thật • ELO ${p.elo || 1000}</div>
                            </div>
                        `;
                    }
                } else {
                    slot.className = 'waiting-slot slot-empty';
                    slot.innerHTML = `
                        <span style="font-size:1.2rem; opacity:0.6;">${is1v1 ? '👤' : '🤖'}</span>
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:700; color:var(--text-muted);">Ghế Trống #${i + 1}</div>
                            <div style="font-size:0.68rem; color:var(--text-muted);">${is1v1 ? 'Chờ bạn vào hoặc bấm thêm Bot' : (app.currentRoom.fillBots !== false ? 'Tự động lấp Bot khi bắt đầu' : 'Đang chờ người vào')}</div>
                        </div>
                        ${isHost ? `<button class="btn-add-bot-slot" title="Thêm 1 Bot vào ghế này">+ Thêm Bot</button>` : ''}
                    `;
                    slot.querySelector('.btn-add-bot-slot')?.addEventListener('click', () => {
                        this.addBotToRoom(app);
                    });
                }
                grid.appendChild(slot);
            }
        }

        // Render Spectators Grid
        const specGridEl = document.getElementById('waiting-spectators-grid');
        if (specGridEl) {
            specGridEl.innerHTML = '';
            if (specs.length === 0) {
                specGridEl.innerHTML = `<div class="empty-hint" style="grid-column:1/-1; padding:10px 0;">Chưa có khán giả nào. Bấm 'Chuyển Sang Khán Giả' để theo dõi trực tiếp trận đấu!</div>`;
            } else {
                specs.forEach(s => {
                    const card = document.createElement('div');
                    const isMe = s.id === app.currentUser?.id;
                    card.className = `waiting-spec-card ${isMe ? 'self-spec' : ''}`;
                    card.innerHTML = `
                        <span class="waiting-spec-av">${s.avatar || '👁️'}</span>
                        <div>
                            <div class="waiting-spec-name">${s.name} ${s.isHost ? '👑' : ''} ${isMe ? '(Bạn)' : ''}</div>
                            <div class="waiting-spec-sub">${s.isHost ? '🎙️ Trọng Tài / Chủ Phòng' : '👁️ Khán Giả Theo Dõi'}</div>
                        </div>
                    `;
                    specGridEl.appendChild(card);
                });
            }
        }
    }

    addBotToRoom(app, botProfile = null) {
        if (!app.currentRoom) return;
        if (app.socket && app.socket.connected) {
            app.socket.emit('room:addBot', { code: app.currentRoom.code, botProfile }, (res) => {
                if (res && res.ok) {
                    eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                        message: `🤖 Đã thêm Bot ${res.bot?.name || 'AI'} vào phòng!`,
                        type: 'success'
                    });
                } else {
                    eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: res?.msg || 'Không thể thêm Bot!', type: 'warn' });
                }
            });
            return;
        }

        fetch('api.php?action=room_add_bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: app.currentRoom.code, botProfile })
        })
        .then(r => r.json())
        .then(d => {
            if (d && d.ok) {
                app.currentRoom.players = d.players;
                this.render(app);
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                    message: `🤖 Đã thêm Bot ${d.bot?.displayName || 'AI'} vào phòng!`,
                    type: 'success'
                });
            } else {
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: d?.msg || 'Không thể thêm Bot!', type: 'warn' });
            }
        })
        .catch(() => {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Lỗi kết nối khi thêm Bot!', type: 'error' });
        });
    }

    removeBotFromRoom(app, botId) {
        if (!app.currentRoom) return;
        if (app.socket && app.socket.connected) {
            app.socket.emit('room:removeBot', { code: app.currentRoom.code, botId }, (res) => {
                if (res && res.ok) {
                    eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                        message: `✕ Đã đuổi Bot ${res.removed?.name || ''} khỏi phòng!`,
                        type: 'info'
                    });
                } else {
                    eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: res?.msg || 'Không thể xóa Bot!', type: 'warn' });
                }
            });
            return;
        }

        fetch('api.php?action=room_remove_bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: app.currentRoom.code, botId })
        })
        .then(r => r.json())
        .then(d => {
            if (d && d.ok) {
                app.currentRoom.players = d.players;
                this.render(app);
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: '✕ Đã xóa Bot khỏi phòng!', type: 'info' });
            } else {
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: d?.msg || 'Không thể xóa Bot!', type: 'warn' });
            }
        })
        .catch(() => {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Lỗi kết nối khi xóa Bot!', type: 'error' });
        });
    }

    fillAllBotsInRoom(app) {
        if (!app.currentRoom) return;
        if (app.socket && app.socket.connected) {
            app.socket.emit('room:fillAllBots', { code: app.currentRoom.code }, (res) => {
                if (res && res.ok) {
                    eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                        message: '⚡ Đã lấp đầy toàn bộ ghế bằng các Kiện Tướng AI!',
                        type: 'success'
                    });
                } else {
                    eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: res?.msg || 'Không thể lấp Bot!', type: 'warn' });
                }
            });
            return;
        }

        fetch('api.php?action=room_fill_all_bots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: app.currentRoom.code })
        })
        .then(r => r.json())
        .then(d => {
            if (d && d.ok) {
                app.currentRoom.players = d.players;
                this.render(app);
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: '⚡ Đã lấp đầy toàn bộ ghế bằng Bot!', type: 'success' });
            } else {
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: d?.msg || 'Không thể lấp Bot!', type: 'warn' });
            }
        })
        .catch(() => {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Lỗi kết nối khi lấp Bot!', type: 'error' });
        });
    }

    clearAllBotsInRoom(app) {
        if (!app.currentRoom) return;
        if (app.socket && app.socket.connected) {
            app.socket.emit('room:clearAllBots', { code: app.currentRoom.code }, (res) => {
                if (res && res.ok) {
                    eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                        message: '🧹 Đã đuổi toàn bộ Bot ra khỏi phòng!',
                        type: 'info'
                    });
                } else {
                    eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: res?.msg || 'Không thể xóa Bot!', type: 'warn' });
                }
            });
            return;
        }

        fetch('api.php?action=room_clear_all_bots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: app.currentRoom.code })
        })
        .then(r => r.json())
        .then(d => {
            if (d && d.ok) {
                app.currentRoom.players = d.players;
                this.render(app);
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: '🧹 Đã đuổi toàn bộ Bot ra khỏi phòng!', type: 'info' });
            } else {
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: d?.msg || 'Không thể xóa Bot!', type: 'warn' });
            }
        })
        .catch(() => {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Lỗi kết nối khi xóa Bot!', type: 'error' });
        });
    }
}

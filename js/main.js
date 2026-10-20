// ============================================================================
// CHESS TFT - MAIN UI CONTROLLER, AUDIO SYNTHESIZER & BLITZ CLOCK LOOP
// ============================================================================

class SoundFX {
    constructor() {
        this.ctx = null;
        this.sfxMuted = false;
        this.bgmMuted = localStorage.getItem("chess_tft_bgm_muted") === "true";
        this.bgmVolume = parseFloat(localStorage.getItem("chess_tft_bgm_vol") || "0.45");

        this.currentTrack = null;
        this.bgmAudio = new Audio();
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = this.bgmMuted ? 0 : this.bgmVolume;

        this.tracks = {
            lobby: "assets/audio/lobby_theme.mp3",
            combat: "assets/audio/combat_theme.ogg"
        };

        this.userUnlocked = false;
        this.setupUserUnlock();
    }

    setupUserUnlock() {
        const unlock = () => {
            this.userUnlocked = true;
            this.init();
            if (!this.bgmMuted && this.currentTrack) {
                this.bgmAudio.play().catch(() => {});
            }
            window.removeEventListener("click", unlock);
            window.removeEventListener("keydown", unlock);
            window.removeEventListener("touchstart", unlock);
        };
        window.addEventListener("click", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
        window.addEventListener("touchstart", unlock, { once: true });
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => {});
        }
    }

    playBgm(trackName) {
        if (!this.tracks[trackName]) return;
        if (this.currentTrack === trackName && !this.bgmAudio.paused) return;

        this.currentTrack = trackName;
        const targetSrc = this.tracks[trackName];

        try {
            if (this.bgmAudio.src.indexOf(targetSrc) === -1) {
                this.bgmAudio.src = targetSrc;
            }
            this.bgmAudio.volume = this.bgmMuted ? 0 : this.bgmVolume;
            if (this.userUnlocked && !this.bgmMuted) {
                this.bgmAudio.play().catch(e => {
                    console.log("BGM play deferred until user gesture:", e);
                });
            }
        } catch (e) {
            console.warn("Audio error:", e);
        }
    }

    toggleBgm() {
        this.bgmMuted = !this.bgmMuted;
        localStorage.setItem("chess_tft_bgm_muted", this.bgmMuted ? "true" : "false");
        if (this.bgmMuted) {
            this.bgmAudio.pause();
        } else {
            this.bgmAudio.volume = this.bgmVolume;
            if (this.currentTrack) {
                this.bgmAudio.play().catch(() => {});
            }
        }
        return !this.bgmMuted;
    }

    setBgmVolume(val) {
        this.bgmVolume = Math.max(0, Math.min(1, val));
        localStorage.setItem("chess_tft_bgm_vol", this.bgmVolume.toString());
        if (!this.bgmMuted) {
            this.bgmAudio.volume = this.bgmVolume;
        }
    }

    playTone(freq, type = "sine", duration = 0.12, vol = 0.12) {
        if (this.sfxMuted) return;
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    move() { this.playTone(340, "triangle", 0.09, 0.12); }
    ranged() {
        this.playTone(620, "sawtooth", 0.08, 0.1);
        setTimeout(() => this.playTone(440, "triangle", 0.12, 0.12), 50);
    }
    hitArmor() { this.playTone(190, "square", 0.14, 0.15); }
    capture() {
        this.playTone(280, "sawtooth", 0.12, 0.15);
        setTimeout(() => this.playTone(520, "triangle", 0.15, 0.14), 60);
    }
    starUp() {
        [440, 554, 659, 880].forEach((f, idx) => {
            setTimeout(() => this.playTone(f, "triangle", 0.16, 0.15), idx * 70);
        });
    }
    victory() {
        [523, 659, 784, 1046].forEach((f, idx) => {
            setTimeout(() => this.playTone(f, "sine", 0.22, 0.16), idx * 90);
        });
    }
    defeat() {
        [392, 349, 311, 261].forEach((f, idx) => {
            setTimeout(() => this.playTone(f, "sawtooth", 0.22, 0.14), idx * 100);
        });
    }
}

class ChessTFTApp {
    constructor() {
        this.sfx = new SoundFX();
        this.currentUser = null;
        this.selectedRegAvatar = "👑";
        this.currentRoom = null;
        this.socket = null;
        this.codexActiveTab = "pieces";
        this.adminDbCache = null;
        this.selectedAdminUserId = null;
        this.selectedAdminPieceId = "shield_pawn";

        this.tft = new window.TFTGameManager();
        this.chess = null;

        // UI interaction state
        this.selectedPrepUnitUid = null;
        this.selectedItemIndex = null;
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

        // Auto countdown timers (Anti-stalling / Chống câu giờ)
        this.prepTimer = null;
        this.prepSecondsLeft = 30;
        this.augmentTimer = null;
        this.augmentSecondsLeft = 15;
        this.carouselTimer = null;
        this.carouselSecondsLeft = 12;
        this.roundResultTimer = null;
        this.roundResultSecondsLeft = 4;

        this.initSocket();
        this.bindStaticEvents();
        this.bindAuthAndLobbyEvents();
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

        if (screenName === "lobby" || screenName === "auth") {
            this.sfx.playBgm("lobby");
        } else if (screenName === "game") {
            if (this.tft && this.tft.phase === "combat") {
                this.sfx.playBgm("combat");
            } else {
                this.sfx.playBgm("lobby");
            }
        }

        if (pushToHistory && window.history && window.history.pushState) {
            window.history.pushState({ screen: screenName, tab: this.currentLobbyTab || "play" }, "");
        }
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
                if (!this.tft) return;
                const remotePart = this.tft.bots.find(b => b.remoteUserId === playerId);
                if (remotePart && state) {
                    remotePart.hp = state.hp;
                    remotePart.level = state.level;
                    if (Array.isArray(state.board)) {
                        remotePart.board = state.board;
                    }
                    this.renderLeaderboard();
                    if (this.tft.scoutingPlayerId === remotePart.id) {
                        this.renderBoardArea();
                        this.renderSynergies();
                    }
                }
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
                board: this.tft.player.board
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
                } else if (mode === "solo") {
                    if (heroBtnLabel) heroBtnLabel.textContent = "KHIÊU CHIẾN 7 BOT AI";
                    if (heroModeDesc) heroModeDesc.textContent = "Luyện tập offline cùng 7 Bot AI thông minh (Magnus, Kasparov...). Không sợ mất điểm ELO!";
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
            } else if (this.activeHeroMode === "solo") {
                document.getElementById("btn-quick-solo")?.click();
            } else if (this.activeHeroMode === "tutorial") {
                this.startTutorialSession();
            } else if (this.activeHeroMode === "custom") {
                switchLobbyTab("rooms");
            }
        });

        // Feature cards click handlers
        document.getElementById("btn-start-tutorial")?.addEventListener("click", () => this.startTutorialSession());
        document.getElementById("btn-quick-tutorial")?.addEventListener("click", () => this.startTutorialSession());
        document.getElementById("btn-play-bot-feature")?.addEventListener("click", () => document.getElementById("btn-quick-solo")?.click());
        document.getElementById("btn-play-rank-feature")?.addEventListener("click", () => this.startMatchmaking());

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

        // Create Room (Supports both Socket.IO and WampServer PHP+MySQL)
        document.getElementById("btn-create-room").addEventListener("click", async () => {
            const timeMode = document.getElementById("select-room-timemode").value;
            if (this.socket && this.socket.connected) {
                this.socket.emit("room:create", { user: this.currentUser, timeMode, fillBots: true }, (res) => {
                    if (res && res.ok) {
                        this.currentRoom = res.room;
                        this.renderWaitingRoom();
                        this.showToast(`Đã tạo phòng ${res.room.code}! Hãy gửi mã này cho bạn bè!`, "success");
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
                    body: JSON.stringify({ user: this.currentUser, timeMode, fillBots: true })
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
            this.clearAllCountdowns();
            this.showScreen("lobby");
            this.refreshMyUserProfile();
        });

        document.getElementById("btn-gameover-lobby").addEventListener("click", () => {
            document.getElementById("modal-gameover").classList.add("hidden");
            this.stopCombatTimers();
            this.clearAllCountdowns();
            this.showScreen("lobby");
            this.refreshMyUserProfile();
        });
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
        if (u.role === "admin") {
            if (adminBtn) adminBtn.classList.remove("hidden");
            if (specTopBtn) specTopBtn.classList.remove("hidden");
            if (specCard) specCard.classList.remove("hidden");
        } else {
            if (adminBtn) adminBtn.classList.add("hidden");
            if (specTopBtn) specTopBtn.classList.add("hidden");
            if (specCard) specCard.classList.add("hidden");
        }
    }

    async joinRoomByCode(code) {
        if (this.socket && this.socket.connected) {
            this.socket.emit("room:join", { code, user: this.currentUser }, (res) => {
                if (res && res.ok) {
                    this.currentRoom = res.room;
                    this.renderWaitingRoom();
                    this.showToast(`Đã vào phòng ${res.room.code}!`, "success");
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
                body: JSON.stringify({ code, user: this.currentUser })
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
            row.innerHTML = `
                <div>
                    <div style="font-weight:800; color:var(--accent-gold);">Phòng #${r.code} — Chủ phòng: ${r.hostName}</div>
                    <div style="font-size:0.74rem; color:var(--text-muted);">${modeLabels[r.timeMode] || r.timeMode} • Người chơi: ${r.playerCount}/8 ${r.fillBots ? "(+Bot tự lấp)" : ""}</div>
                </div>
                <button class="btn-primary">Vào Phòng</button>
            `;
            row.querySelector("button").addEventListener("click", () => {
                this.joinRoomByCode(r.code);
            });
            container.appendChild(row);
        }
    }

    renderWaitingRoom() {
        const controlsBox = document.getElementById("lobby-room-controls");
        const waitingBox = document.getElementById("lobby-waiting-room");
        if (!this.currentRoom) {
            controlsBox.classList.remove("hidden");
            waitingBox.classList.add("hidden");
            return;
        }

        controlsBox.classList.add("hidden");
        waitingBox.classList.remove("hidden");

        document.getElementById("waiting-room-code").textContent = this.currentRoom.code;
        document.getElementById("waiting-player-count").textContent = this.currentRoom.players.length;
        document.getElementById("chk-fill-bots").checked = this.currentRoom.fillBots !== false;

        const isHost = this.currentUser && this.currentRoom.hostId === this.currentUser.id;
        document.getElementById("chk-fill-bots").disabled = !isHost;
        const startBtn = document.getElementById("btn-host-start-match");
        startBtn.disabled = !isHost;
        startBtn.textContent = isHost
            ? "⚔️ BẮT ĐẦU TRẬN ĐẤU (Đủ 8 ghế cùng Bot)"
            : `⏳ Đang chờ Chủ Phòng (${this.currentRoom.hostName}) bắt đầu...`;

        const grid = document.getElementById("waiting-players-grid");
        grid.innerHTML = "";

        for (let i = 0; i < 8; i++) {
            const p = this.currentRoom.players[i];
            const slot = document.createElement("div");
            if (p) {
                slot.className = "waiting-slot slot-human";
                slot.innerHTML = `
                    <span style="font-size:1.3rem;">${p.avatar || "👑"}</span>
                    <div>
                        <div style="font-weight:800;">${p.name} ${p.isHost ? "👑" : ""}</div>
                        <div style="font-size:0.7rem; color:#93c5fd;">Người chơi thật • ELO ${p.elo || 1000}</div>
                    </div>
                `;
            } else {
                slot.className = "waiting-slot slot-bot";
                slot.innerHTML = `
                    <span style="font-size:1.2rem;">🤖</span>
                    <div>
                        <div style="font-weight:700; color:var(--text-muted);">Ghế Trống #${i + 1}</div>
                        <div style="font-size:0.68rem; color:var(--text-muted);">${this.currentRoom.fillBots !== false ? "Sẽ tự lấp bằng Bot AI" : "Đang chờ người vào"}</div>
                    </div>
                `;
            }
            grid.appendChild(slot);
        }
    }

    // ========================================================================
    // CODEX / WIKI ENCYCLOPEDIA IN MAIN LOBBY
    // ========================================================================
    renderCodex() {
        const container = document.getElementById("codex-content");
        if (!container) return;
        container.innerHTML = "";

        const getCostTierName = (cost, isKing) => {
            if (isKing) return "Quốc Vương";
            switch (cost) {
                case 1: return "1 🪙 Thường";
                case 2: return "2 🪙 Hiếm";
                case 3: return "3 🪙 Tinh Anh";
                case 4: return "4 🪙 Sử Thi";
                case 5: return "5 🪙 Huyền Thoại";
                default: return `${cost} 🪙`;
            }
        };

        if (this.codexActiveTab === "pieces") {
            const pieces = Object.values(window.CHESS_TFT_DATA.PIECES).sort((a, b) => a.cost - b.cost);
            for (const p of pieces) {
                const traitsBadges = (p.traits || []).map(t => {
                    const s = window.CHESS_TFT_DATA.SYNERGIES[t];
                    return s 
                        ? `<span class="codex-trait-badge" style="border-color:${s.color}; background:rgba(${parseInt(s.color.slice(1,3),16)||20},${parseInt(s.color.slice(3,5),16)||30},${parseInt(s.color.slice(5,7),16)||50},0.28)">${s.icon} ${s.name}</span>`
                        : `<span class="codex-trait-badge">${t}</span>`;
                }).join(" ");

                const tierName = getCostTierName(p.cost, p.isKing);

                const card = document.createElement("div");
                card.className = `game-hero-card cost-tier-${p.cost} ${p.isKing ? "hero-card-king" : ""}`;
                card.innerHTML = `
                    <div class="hero-card-header">
                        <div class="hero-card-tier-pill">${tierName}</div>
                        ${p.badge ? `<div class="hero-card-badge">${p.badge}</div>` : ""}
                    </div>
                    <div class="hero-card-portrait">
                        <div class="hero-avatar-halo"></div>
                        <img src="assets/pieces/${p.id}.svg" class="hero-avatar-svg" alt="${p.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                        <div class="hero-avatar-icon" style="display:none;">${p.icon}</div>
                    </div>
                    <div class="hero-card-title-wrap">
                        <h4 class="hero-card-name">${p.name}</h4>
                        <div class="hero-card-traits">${traitsBadges}</div>
                    </div>
                    <div class="hero-card-stats-grid">
                        <div class="hero-stat-cell">
                            <span class="hero-stat-label">🛡️ Máu (★ / ★★ / ★★★)</span>
                            <span class="hero-stat-val">${p.baseHp.join(" / ")}</span>
                        </div>
                        <div class="hero-stat-cell">
                            <span class="hero-stat-label">🎯 Tầm Đánh</span>
                            <span class="hero-stat-val">${p.range.join(" / ")} ô</span>
                        </div>
                    </div>
                    <div class="hero-card-desc">
                        <span class="hero-desc-icon">⚡</span>
                        <span>${p.desc}</span>
                    </div>
                    <button class="btn-game btn-game-cyan codex-view-guide-btn" data-piece-id="${p.id}" style="font-size:0.75rem; padding:6px 10px; margin-top:6px; font-weight:700; width:100%; border-radius:6px; cursor:pointer;">♟️ Xem Bàn Cờ Nước Đi & Mẹo Chơi</button>
                `;

                const guideBtn = card.querySelector(".codex-view-guide-btn");
                if (guideBtn) {
                    guideBtn.addEventListener("click", () => {
                        this.openPieceGuide(p.id);
                    });
                }

                container.appendChild(card);
            }
        } else if (this.codexActiveTab === "synergies") {
            for (const syn of Object.values(window.CHESS_TFT_DATA.SYNERGIES)) {
                const unitBadges = Object.values(window.CHESS_TFT_DATA.PIECES)
                    .filter(p => p.traits && p.traits.includes(syn.id))
                    .map(p => `<span class="syn-unit-chip cost-tier-${p.cost}">${p.icon} ${p.name} (${p.isKing ? "Vua" : p.cost + "🪙"})</span>`)
                    .join(" ");

                const tiersHtml = syn.thresholds.map(th => `
                    <div class="syn-tier-row">
                        <span class="syn-threshold-badge">Mốc [${th}]</span>
                        <span class="syn-threshold-effect">${syn.effectText[th]}</span>
                    </div>
                `).join("");

                const card = document.createElement("div");
                card.className = "game-synergy-card";
                card.innerHTML = `
                    <div class="synergy-card-head" style="border-left: 4px solid ${syn.color};">
                        <div class="synergy-card-title">
                            <span class="synergy-crest" style="background:${syn.color};">${syn.icon}</span>
                            <div>
                                <h4 class="synergy-name">${syn.name}</h4>
                                <span class="synergy-milestone-tag">Yêu cầu mốc: ${syn.thresholds.join(" / ")} quân</span>
                            </div>
                        </div>
                    </div>
                    <div class="synergy-card-desc">${syn.desc}</div>
                    <div class="synergy-thresholds-container">${tiersHtml}</div>
                    <div class="synergy-units-list">
                        <span class="synergy-units-title">♟️ Danh sách quân cờ:</span>
                        <div class="synergy-units-flex">${unitBadges}</div>
                    </div>
                `;
                container.appendChild(card);
            }
        } else if (this.codexActiveTab === "items") {
            for (const it of Object.values(window.CHESS_TFT_DATA.ITEMS)) {
                const card = document.createElement("div");
                card.className = "game-item-card";
                card.innerHTML = `
                    <div class="item-card-head">
                        <div class="item-icon-frame">${it.icon}</div>
                        <div class="item-title-wrap">
                            <h4 class="item-name">${it.name}</h4>
                            <span class="item-type-badge">Trang Bị Hoàn Chỉnh</span>
                        </div>
                    </div>
                    <div class="item-card-desc">${it.desc}</div>
                `;
                container.appendChild(card);
            }
            for (const mp of window.CHESS_TFT_DATA.MAPS) {
                const card = document.createElement("div");
                card.className = "game-item-card game-map-card";
                card.innerHTML = `
                    <div class="item-card-head">
                        <div class="item-icon-frame">🗺️</div>
                        <div class="item-title-wrap">
                            <h4 class="item-name">${mp.name}</h4>
                            <span class="item-type-badge map-type-badge">Đấu Trường Chiến Thuật</span>
                        </div>
                    </div>
                    <div class="item-card-desc">${mp.desc}</div>
                `;
                container.appendChild(card);
            }
        } else if (this.codexActiveTab === "rules") {
            const st = window.CHESS_TFT_DATA.STAGE_CONFIG;
            const df = window.CHESS_TFT_DATA.DAMAGE_FORMULA || {};
            container.style.gridTemplateColumns = "1fr";
            container.innerHTML = `
                <div class="game-rule-card">
                    <div class="rule-card-title">⏱️ 1. Thời Gian Đồng Hồ Cờ Chớp & Mở Rộng Bàn Cờ</div>
                    <div class="rule-card-content">
                        <div class="rule-row">
                            <span class="rule-badge">Stage 1</span>
                            <span>Bàn cờ <code>${st[1].cols}x${st[1].rows}</code> — Đồng hồ <strong>${st[1].blitzTime}s + ${st[1].increment}s/nước</strong>.</span>
                        </div>
                        <div class="rule-row">
                            <span class="rule-badge">Stage 2</span>
                            <span>Bàn cờ <code>${st[2].cols}x${st[2].rows}</code> — Đồng hồ <strong>${st[2].blitzTime}s + ${st[2].increment}s/nước</strong>.</span>
                        </div>
                        <div class="rule-row">
                            <span class="rule-badge">Stage 3+</span>
                            <span>Bàn cờ <code>${st[3].cols}x${st[3].rows}</code> — Đồng hồ <strong>${st[3].blitzTime}s + ${st[3].increment}s/nước</strong>.</span>
                        </div>
                        <div class="rule-note">
                            👁️ <strong>Soi Bài Bảo Mật:</strong> Khi bấm xem nhà đối thủ lúc Chuẩn Bị, toàn bộ địa hình bản đồ bị ẩn đi để bạn không biết trước mình sắp gặp ai!
                        </div>
                    </div>
                </div>

                <div class="game-rule-card">
                    <div class="rule-card-title">💥 2. Công Thức Tính Sát Thương Máu Linh Hồn (Player HP)</div>
                    <div class="rule-card-content">
                        <div class="rule-row rule-row-danger">
                            <span class="rule-badge badge-danger">Chiếu Hết (Checkmate) / Hết Giờ</span>
                            <span>Trừ máu NẶNG = <code>(${df.checkmateBase || 8} + ${df.checkmateStageMult || 2} × Stage) + ${df.checkmatePerUnit || 2} × (Số quân còn sống của bên thắng)</code>.</span>
                        </div>
                        <div class="rule-row rule-row-warn">
                            <span class="rule-badge badge-warn">Ăn Vua (Quên Đỡ Chiếu)</span>
                            <span>Trừ máu NHẸ HƠN = <code>(${df.kingCaptureBase || 3} + ${df.kingCaptureStageMult || 1} × Stage) + Chênh lệch quân trên sân</code>.</span>
                        </div>
                        <div class="rule-row">
                            <span class="rule-badge">Hòa Cờ Chớp</span>
                            <span>Cả 2 bên bị trừ <code>(${df.drawBase || 4} + Stage)</code> Máu.</span>
                        </div>
                    </div>
                </div>

                <div class="game-rule-card">
                    <div class="rule-card-title">🔥 3. Cơ Chế Chuỗi Thắng / Thua & Lội Ngược Dòng (Comeback)</div>
                    <div class="rule-card-content">
                        <div class="rule-row">
                            <span class="rule-badge badge-gold">Thưởng Chuỗi Vàng</span>
                            <span>Chuỗi 2-3 trận: <strong>+1🪙</strong> | Chuỗi 4 trận: <strong>+2🪙</strong> | Chuỗi 5+ trận: <strong>+3🪙</strong> mỗi vòng.</span>
                        </div>
                        <div class="rule-row">
                            <span class="rule-badge badge-purple">🎲 Hỗ Trợ Chuỗi Thua (≥ 3 trận)</span>
                            <span>Mỗi vòng nhận <strong>+1 Lượt Đổi Shop Miễn Phí</strong> giúp người có bài yếu dễ dàng lật kèo.</span>
                        </div>
                        <div class="rule-row">
                            <span class="rule-badge badge-purple">📦 Hòm Cứu Trợ (Chuỗi Thua ≥ 4 trận)</span>
                            <span>Tặng ngay <strong>+10 Vàng</strong> và <strong>1 Trang Bị Hoàn Chỉnh</strong> ngẫu nhiên!</span>
                        </div>
                        <div class="rule-row rule-row-danger">
                            <span class="rule-badge badge-danger">🛡️ Ý Chí Phục Thù (Máu ≤ 25 HP)</span>
                            <span>Khi máu rơi xuống ≤ 25 lần đầu tiên: Lập tức nhận <strong>+15 Vàng</strong>, Quốc Vương được tăng vĩnh viễn <strong>+1 Lớp Máu</strong> và <strong>+15s</strong> thời gian đồng hồ cờ chớp!</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        container.style.gridTemplateColumns = "repeat(auto-fill, minmax(280px, 1fr))";
    }

    // ========================================================================
    // INTERACTIVE PIECE GUIDE & 5x5 MOVEMENT CODEX
    // ========================================================================
    openPieceGuide(pieceId = null) {
        const modal = document.getElementById("modal-piece-guide");
        if (!modal) return;
        modal.classList.remove("hidden");
        this.guideFilter = this.guideFilter || "all";

        // Bind filter tabs if not already bound
        if (!this._guideFiltersBound) {
            this._guideFiltersBound = true;
            modal.querySelectorAll(".guide-filter-pill").forEach(pill => {
                pill.addEventListener("click", () => {
                    modal.querySelectorAll(".guide-filter-pill").forEach(p => p.classList.remove("active"));
                    pill.classList.add("active");
                    const f = pill.getAttribute("data-filter");
                    this.guideFilter = f;
                    this.renderPieceGuide(this.guideSelectedPieceId, f);
                });
            });
        }

        const pieces = Object.values(window.CHESS_TFT_DATA.PIECES);
        const targetId = pieceId || (pieces.length ? pieces[0].id : "shield_pawn");
        this.renderPieceGuide(targetId, this.guideFilter);
    }

    closePieceGuide() {
        const modal = document.getElementById("modal-piece-guide");
        if (modal) modal.classList.add("hidden");
    }

    renderPieceGuide(selectedId, filter = "all") {
        this.guideSelectedPieceId = selectedId;
        const allPieces = Object.values(window.CHESS_TFT_DATA.PIECES);
        // Sort order: 1, 2, 3, 4, 5, then King (0)
        allPieces.sort((a, b) => {
            if (a.isKing) return 1;
            if (b.isKing) return -1;
            return a.cost - b.cost;
        });

        let filtered = allPieces;
        if (filter === "king") {
            filtered = allPieces.filter(p => p.isKing);
        } else if (filter !== "all") {
            const costNum = parseInt(filter, 10);
            filtered = allPieces.filter(p => !p.isKing && p.cost === costNum);
        }

        if (!filtered.some(p => p.id === selectedId)) {
            selectedId = filtered.length ? filtered[0].id : allPieces[0].id;
            this.guideSelectedPieceId = selectedId;
        }

        // Render Left Piece List
        const listEl = document.getElementById("guide-piece-list");
        if (listEl) {
            listEl.innerHTML = "";
            for (const p of filtered) {
                const item = document.createElement("div");
                item.className = `guide-piece-item cost-tier-${p.cost} ${p.id === selectedId ? "active" : ""}`;
                item.innerHTML = `
                    <div class="guide-item-left">
                        <img src="assets/pieces/${p.id}.svg" style="width:24px; height:24px; border-radius:4px;" alt="${p.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
                        <span class="guide-item-icon" style="display:none;">${p.icon}</span>
                        <span class="guide-item-name">${p.name}</span>
                    </div>
                    <span class="guide-item-cost">${p.isKing ? "👑 Vua" : p.cost + "🪙"}</span>
                `;
                item.addEventListener("click", () => {
                    this.renderPieceGuide(p.id, this.guideFilter);
                });
                listEl.appendChild(item);
            }
        }

        // Render Right Piece Detail
        const detailEl = document.getElementById("guide-piece-detail");
        const def = window.CHESS_TFT_DATA.PIECES[selectedId];
        if (!detailEl || !def) return;

        const traitsHtml = (def.traits || []).map(tId => {
            const s = window.CHESS_TFT_DATA.SYNERGIES[tId];
            return s ? `<span class="codex-trait-badge" style="border-color:${s.color}; background:rgba(${parseInt(s.color.slice(1,3),16)||20},${parseInt(s.color.slice(3,5),16)||30},${parseInt(s.color.slice(5,7),16)||50},0.28)">${s.icon} ${s.name}</span>` : `<span class="codex-trait-badge">${tId}</span>`;
        }).join(" ");

        const grid = this.getPieceMovementGrid(def.id);
        let hasMove = false, hasAttack = false, hasJump = false, hasPawnAtk = false, hasCannon = false;

        let cellsHtml = "";
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const cellType = grid[r][c];
                const isLight = (r + c) % 2 === 0;
                let cellClass = `guide-cell ${isLight ? "cell-light" : ""}`;
                let cellContent = "";
                let cellTitle = "";

                if (cellType === "center") {
                    cellClass += " cell-center";
                    cellContent = def.icon;
                    cellTitle = `${def.name} (Tọa độ hiện tại)`;
                } else if (cellType === "move") {
                    cellClass += " cell-move";
                    cellContent = "🟢";
                    cellTitle = "Nước di chuyển hợp lệ";
                    hasMove = true;
                } else if (cellType === "attack") {
                    cellClass += " cell-attack";
                    cellContent = "🎯";
                    cellTitle = "Tầm bắn từ xa (không cần bước vào)";
                    hasAttack = true;
                } else if (cellType === "jump") {
                    cellClass += " cell-jump";
                    cellContent = "⚡";
                    cellTitle = "Nhảy chữ L (vượt qua mọi địa hình và quân cản)";
                    hasJump = true;
                } else if (cellType === "pawn-atk") {
                    cellClass += " cell-pawn-atk";
                    cellContent = "⚔️";
                    cellTitle = "Ăn chéo cận chiến (Tiêu diệt kẻ địch phía trước)";
                    hasPawnAtk = true;
                } else if (cellType === "cannon") {
                    cellClass += " cell-cannon";
                    cellContent = "💣";
                    cellTitle = "Bắn đại bác xuyên ngòi nổ (nhảy cóc qua 1 quân cản)";
                    hasCannon = true;
                }

                cellsHtml += `<div class="${cellClass}" title="${cellTitle}">${cellContent}</div>`;
            }
        }

        const guide = def.guide || {};

        detailEl.innerHTML = `
            <div class="guide-detail-header">
                <div class="guide-detail-title-row">
                    <div class="guide-detail-avatar">
                        <img src="assets/pieces/${def.id}.svg" class="guide-avatar-img" alt="${def.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
                        <span style="display:none;">${def.icon}</span>
                    </div>
                    <div class="guide-detail-meta">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <h3 class="guide-detail-name">${def.name}</h3>
                            <span class="guide-item-cost">${def.isKing ? "👑 Tối Thượng" : def.cost + " 🪙"}</span>
                        </div>
                        <div class="guide-detail-traits">${traitsHtml}</div>
                    </div>
                </div>
                <div class="guide-detail-stats-row">
                    <div class="guide-stat-badge">🛡️ Lớp Máu: ${def.baseHp.join(" / ")} (★/★★/★★★)</div>
                    <div class="guide-stat-badge">🎯 Tầm Đánh: ${def.range.join(" / ")} ô</div>
                </div>
            </div>

            <div class="guide-board-wrap">
                <div class="guide-5x5-board">${cellsHtml}</div>
                <div class="guide-board-legend">
                    <div class="guide-legend-title">📖 KÝ HIỆU MINH HỌA NƯỚC ĐI</div>
                    <div class="guide-legend-row">
                        <span class="guide-legend-chip chip-center">♟️</span>
                        <span><strong>Vị trí hiện tại:</strong> Trung tâm bàn cờ</span>
                    </div>
                    ${hasMove ? `<div class="guide-legend-row"><span class="guide-legend-chip chip-move">🟢</span><span><strong>Nước di chuyển:</strong> Bước vào ô trống</span></div>` : ""}
                    ${hasAttack ? `<div class="guide-legend-row"><span class="guide-legend-chip chip-attack">🎯</span><span><strong>Tầm bắn từ xa:</strong> Bắn hạ địch mà không cần di chuyển</span></div>` : ""}
                    ${hasJump ? `<div class="guide-legend-row"><span class="guide-legend-chip chip-jump">⚡</span><span><strong>Nhảy chữ L:</strong> Nhảy qua đầu quân cờ & địa hình</span></div>` : ""}
                    ${hasPawnAtk ? `<div class="guide-legend-row"><span class="guide-legend-chip chip-pawn">⚔️</span><span><strong>Ăn chéo cận chiến:</strong> Ăn quân địch ở ô chéo phía trước</span></div>` : ""}
                    ${hasCannon ? `<div class="guide-legend-row"><span class="guide-legend-chip chip-cannon">💣</span><span><strong>Đại bác xuyên thấu:</strong> Nhảy qua đúng 1 quân cản để nổ tung mục tiêu</span></div>` : ""}
                </div>
            </div>

            <div class="guide-cards-grid">
                <div class="guide-info-card">
                    <div class="guide-card-head">🧭 1. QUY LUẬT DI CHUYỂN</div>
                    <div class="guide-card-text">${guide.moveRule || def.desc}</div>
                </div>
                <div class="guide-info-card">
                    <div class="guide-card-head">⚔️ 2. TẤN CÔNG & KỸ NĂNG</div>
                    <div class="guide-card-text">${guide.attackRule || "Cận chiến 1 ô."} ${guide.skillRule || ""}</div>
                </div>
                <div class="guide-info-card full-width">
                    <div class="guide-card-head">💡 3. VỊ TRÍ ĐẶT & MẸO TÂN THỦ</div>
                    <div class="guide-card-text">
                        • <strong>Vị trí khuyến nghị:</strong> <span style="color:#fde047; font-weight:700;">${guide.recommendedPos || "Tiền tuyến"}</span><br/>
                        • <strong>Vai trò chiến thuật:</strong> <span style="color:#60a5fa; font-weight:700;">${guide.role || "Đa dụng"}</span><br/>
                        • <strong>Mẹo hay:</strong> ${guide.tips || def.desc}
                    </div>
                </div>
            </div>
        `;
    }

    getPieceMovementGrid(pieceId) {
        const grid = Array.from({ length: 5 }, () => Array(5).fill(null));
        grid[2][2] = "center";
        const def = window.CHESS_TFT_DATA.PIECES[pieceId];
        if (!def) return grid;

        const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        const allDirs = [...orthoDirs, ...diagDirs];
        const knightJumps = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        const in5 = (r, c) => r >= 0 && r < 5 && c >= 0 && c < 5;

        switch (def.id) {
            case "king": {
                for (const [dr, dc] of allDirs) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = "move";
                }
                break;
            }
            case "shield_pawn": {
                grid[1][2] = "move";
                grid[1][1] = "pawn-atk";
                grid[1][3] = "pawn-atk";
                break;
            }
            case "mercenary": {
                for (const [dr, dc] of allDirs) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = "move";
                }
                break;
            }
            case "fire_mage": {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "attack";
                }
                break;
            }
            case "archer": {
                for (const [dr, dc] of allDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    if (in5(2 + dr * 2, 2 + dc * 2)) grid[2 + dr * 2][2 + dc * 2] = "attack";
                }
                break;
            }
            case "knight":
            case "frost_knight": {
                for (const [dr, dc] of knightJumps) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = "jump";
                }
                break;
            }
            case "pyro_bishop": {
                for (const [dr, dc] of diagDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "attack";
                }
                break;
            }
            case "juggernaut": {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "move";
                }
                break;
            }
            case "cannon": {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "cannon";
                }
                break;
            }
            case "frost_rook": {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "move";
                }
                break;
            }
            case "grand_queen": {
                for (const [dr, dc] of allDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    if (in5(2 + dr * 2, 2 + dc * 2)) grid[2 + dr * 2][2 + dc * 2] = "attack";
                }
                break;
            }
            case "chancellor": {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "move";
                }
                for (const [dr, dc] of knightJumps) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = "jump";
                }
                break;
            }
            case "gambler": {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "attack";
                }
                break;
            }
            case "corsair": {
                for (const [dr, dc] of allDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    if (in5(2 + dr * 2, 2 + dc * 2)) grid[2 + dr * 2][2 + dc * 2] = "attack";
                }
                break;
            }
            default: {
                for (const [dr, dc] of allDirs) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = "move";
                }
                break;
            }
        }

        return grid;
    }

    startNewGameSession(roomData = null) {
        this.stopCombatTimers();
        this.clearAllCountdowns();
        this.tft.resetGame(this.currentUser, roomData);
        this.chess = null;
        this.selectedPrepUnitUid = null;
        this.selectedItemIndex = null;
        document.getElementById("game-room-badge").textContent = roomData ? `Phòng: #${roomData.code}` : "Chế độ: Đấu Đơn";
        this.showScreen("game");
        this.renderAll();
        this.syncMyStateToRoom();
        this.startPrepCountdown();
        this.showToast("⚔️ Trận đấu bắt đầu! Hãy mua quân, xếp đội hình và chuẩn bị giao tranh!", "success");
    }

    // ========================================================================
    // INTERACTIVE TUTORIAL WITH COACH BOT (CHẾ ĐỘ HƯỚNG DẪN TỪNG BƯỚC)
    // ========================================================================
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
    // ADMIN DATABASE PANEL (EDIT ACCOUNTS, GAME RULES & PIECES LIVE)
    // ========================================================================
    bindAdminEvents() {
        document.getElementById("btn-open-admin").addEventListener("click", () => {
            this.openAdminDatabaseModal();
        });

        document.getElementById("btn-close-admin").addEventListener("click", () => {
            document.getElementById("modal-admin-db").classList.add("hidden");
        });

        document.querySelectorAll(".admin-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                const target = tab.getAttribute("data-admintab");
                document.getElementById("admin-panel-users").classList.toggle("hidden", target !== "users");
                document.getElementById("admin-panel-rules").classList.toggle("hidden", target !== "rules");
                document.getElementById("admin-panel-pieces").classList.toggle("hidden", target !== "pieces");
            });
        });
    }

    async openAdminDatabaseModal() {
        const modal = document.getElementById("modal-admin-db");
        modal.classList.remove("hidden");
        try {
            const res = await fetch("api.php?action=admin_db");
            const data = await res.json();
            if (data.ok) {
                this.adminDbCache = data;
                if (!this.selectedAdminPieceId || !data.entities?.PIECES?.[this.selectedAdminPieceId]) {
                    const firstKey = Object.keys(data.entities?.PIECES || {})[0];
                    if (firstKey) this.selectedAdminPieceId = firstKey;
                }
                this.renderAdminUsersTab();
                this.renderAdminRulesTab();
                this.renderAdminPiecesTab();
            }
        } catch (e) {
            this.showToast("Không thể tải Database từ Server!", "warn");
        }
    }

    renderAdminUsersTab() {
        const listEl = document.getElementById("admin-users-list");
        listEl.innerHTML = "";
        if (!this.adminDbCache || !this.adminDbCache.users) return;

        if (!this.selectedAdminUserId && this.adminDbCache.users.length > 0) {
            this.selectedAdminUserId = this.adminDbCache.users[0].id;
        }

        for (const u of this.adminDbCache.users) {
            const item = document.createElement("div");
            item.className = `admin-list-item ${this.selectedAdminUserId === u.id ? "active" : ""}`;
            item.innerHTML = `
                <span>${u.avatar || "👤"} ${u.displayName} (<code>${u.username}</code>)</span>
                <span class="badge-pill">${u.role}</span>
            `;
            item.addEventListener("click", () => {
                this.selectedAdminUserId = u.id;
                this.renderAdminUsersTab();
            });
            listEl.appendChild(item);
        }

        const user = this.adminDbCache.users.find(u => u.id === this.selectedAdminUserId);
        const editor = document.getElementById("admin-user-editor");
        if (!user) return;

        const mods = user.customModifiers || {};
        const ownedItems = new Set(mods.bonusItems || []);
        const allItemsHtml = Object.values(window.CHESS_TFT_DATA.ITEMS).map(it => `
            <label class="checkbox-label">
                <input type="checkbox" class="adm-user-item-chk" value="${it.id}" ${ownedItems.has(it.id) ? "checked" : ""} />
                <span>${it.icon} ${it.name}</span>
            </label>
        `).join("");

        editor.innerHTML = `
            <div class="lobby-box-title">Chỉnh Sửa Tài Khoản: ${user.username}</div>
            <div class="admin-grid-2">
                <div class="form-group">
                    <label>Tên hiển thị</label>
                    <input type="text" id="adm-u-display" value="${user.displayName || ""}" />
                </div>
                <div class="form-group">
                    <label>Quyền hạn (Role)</label>
                    <select id="adm-u-role" class="lobby-select">
                        <option value="player" ${user.role === "player" ? "selected" : ""}>Player (Người chơi)</option>
                        <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin (Quản trị viên)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Điểm Xếp Hạng (ELO)</label>
                    <input type="number" id="adm-u-elo" value="${user.stats?.elo || 1000}" />
                </div>
                <div class="form-group">
                    <label>Đổi Mật Khẩu Mới (Để trống nếu giữ nguyên)</label>
                    <input type="text" id="adm-u-pass" placeholder="Mật khẩu hiện tại: ${user.password || "***"}" />
                </div>
            </div>

            <div class="panel-section-title" style="margin-top:8px;">⚡ Can Thiệp Chỉ Số Khởi Đầu Trong Trận Của Riêng Tài Khoản Này</div>
            <div class="admin-grid-2">
                <div class="form-group">
                    <label>❤️ Máu Linh Hồn Khởi Đầu (Mặc định: 100)</label>
                    <input type="number" id="adm-u-hp" value="${mods.startingHp || 100}" />
                </div>
                <div class="form-group">
                    <label>🪙 Vàng Khởi Đầu Ván Đấu (Mặc định: 6)</label>
                    <input type="number" id="adm-u-gold" value="${mods.startingGold !== undefined ? mods.startingGold : 6}" />
                </div>
                <div class="form-group">
                    <label>⬆️ Cấp Độ Khởi Đầu (3 -> 8)</label>
                    <input type="number" id="adm-u-level" min="3" max="8" value="${mods.startingLevel || 3}" />
                </div>
                <div class="form-group">
                    <label>⏱️ Cộng/Trừ Giây Đồng Hồ Cờ Chớp Mỗi Hiệp</label>
                    <input type="number" id="adm-u-clock" value="${mods.extraClockSeconds || 0}" />
                </div>
            </div>

            <div class="form-group">
                <label>🎒 Trang Bị Tặng Sẵn Vào Kho Đồ Đầu Trận:</label>
                <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:4px;">${allItemsHtml}</div>
            </div>

            <label class="checkbox-label" style="color:#f87171;">
                <input type="checkbox" id="adm-u-banned" ${mods.isBanned ? "checked" : ""} />
                <span>🚫 Khóa tài khoản này (Không cho đăng nhập)</span>
            </label>

            <button id="btn-save-admin-user" class="btn-combat-go">💾 Lưu Tài Khoản Vào Database (MySQL users / JSON)</button>
        `;

        document.getElementById("btn-save-admin-user").addEventListener("click", async () => {
            const selectedItems = Array.from(editor.querySelectorAll(".adm-user-item-chk:checked")).map(c => c.value);
            const updates = {
                displayName: document.getElementById("adm-u-display").value.trim(),
                role: document.getElementById("adm-u-role").value,
                elo: Number(document.getElementById("adm-u-elo").value),
                password: document.getElementById("adm-u-pass").value,
                customModifiers: {
                    startingHp: Number(document.getElementById("adm-u-hp").value),
                    startingGold: Number(document.getElementById("adm-u-gold").value),
                    startingLevel: Number(document.getElementById("adm-u-level").value),
                    extraClockSeconds: Number(document.getElementById("adm-u-clock").value),
                    bonusItems: selectedItems,
                    isBanned: document.getElementById("adm-u-banned").checked
                }
            };

            const res = await fetch("api.php?action=admin_user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, updates })
            });
            const data = await res.json();
            if (data.ok) {
                this.showToast(data.msg, "success");
                if (this.currentUser && this.currentUser.id === user.id) {
                    this.currentUser = data.user;
                    localStorage.setItem("chesstft_user", JSON.stringify(data.user));
                    this.renderLobbyHeader();
                }
                this.openAdminDatabaseModal();
            }
        });
    }

    renderAdminRulesTab() {
        const box = document.getElementById("admin-rules-editor");
        if (!this.adminDbCache || !this.adminDbCache.rules) return;
        const r = this.adminDbCache.rules;
        const s1 = r.STAGE_CONFIG["1"];
        const s2 = r.STAGE_CONFIG["2"];
        const s3 = r.STAGE_CONFIG["3"];
        const cb = r.combatRules || {};
        const ec = r.economy || {};
        const df = r.damageFormula || {};

        box.innerHTML = `
            <div class="lobby-box-title">⏱️ Cấu Hình Thời Gian Đồng Hồ Cờ Chớp & Bàn Cờ Theo Stage</div>
            <div class="admin-grid-3">
                <div class="form-group">
                    <label>Stage 1 (5x6) — Đồng hồ (Giây)</label>
                    <input type="number" id="adm-r-s1time" value="${s1.blitzTime}" />
                </div>
                <div class="form-group">
                    <label>Stage 2 (6x7) — Đồng hồ (Giây)</label>
                    <input type="number" id="adm-r-s2time" value="${s2.blitzTime}" />
                </div>
                <div class="form-group">
                    <label>Stage 3 (8x8) — Đồng hồ (Giây)</label>
                    <input type="number" id="adm-r-s3time" value="${s3.blitzTime}" />
                </div>
                <div class="form-group">
                    <label>Giây cộng thêm mỗi nước (Stage 1-2)</label>
                    <input type="number" id="adm-r-inc1" value="${s1.increment}" />
                </div>
                <div class="form-group">
                    <label>Vàng thưởng mỗi vòng (Base Gold)</label>
                    <input type="number" id="adm-r-basegold" value="${ec.baseRoundGold || 5}" />
                </div>
                <div class="form-group">
                    <label>Lãi suất tối đa mỗi vòng</label>
                    <input type="number" id="adm-r-maxint" value="${ec.maxInterest || 5}" />
                </div>
            </div>

            <div class="panel-section-title" style="margin-top:8px;">💥 Công Thức Trừ Máu Linh Hồn (Chiếu Hết vs Ăn Vua)</div>
            <div class="admin-grid-3">
                <div class="form-group">
                    <label>Sát thương cơ bản CHIẾU HẾT</label>
                    <input type="number" id="adm-r-cmbase" value="${df.checkmateBase ?? 8}" />
                </div>
                <div class="form-group">
                    <label>Máu trừ mỗi quân sống (Chiếu Hết)</label>
                    <input type="number" id="adm-r-cmunit" value="${df.checkmatePerUnit ?? 2}" />
                </div>
                <div class="form-group">
                    <label>Sát thương cơ bản ĂN VUA (Quên chiếu)</label>
                    <input type="number" id="adm-r-kcbase" value="${df.kingCaptureBase ?? 3}" />
                </div>
            </div>

            <label class="checkbox-label">
                <input type="checkbox" id="adm-r-grace" ${cb.turnOneGrace !== false ? "checked" : ""} />
                <span>🛡️ Bật Luật Lượt 1 Công Bằng (Nước đầu tiên chỉ di chuyển dàn trận, không tấn công ngay)</span>
            </label>

            <button id="btn-save-admin-rules" class="btn-combat-go">💾 Lưu Luật Chơi Vào Database (MySQL game_rules / JSON)</button>
        `;

        document.getElementById("btn-save-admin-rules").addEventListener("click", async () => {
            const updatedRules = JSON.parse(JSON.stringify(r));
            updatedRules.STAGE_CONFIG["1"].blitzTime = Number(document.getElementById("adm-r-s1time").value) || 45;
            updatedRules.STAGE_CONFIG["2"].blitzTime = Number(document.getElementById("adm-r-s2time").value) || 60;
            updatedRules.STAGE_CONFIG["3"].blitzTime = Number(document.getElementById("adm-r-s3time").value) || 75;
            const inc = Number(document.getElementById("adm-r-inc1").value) || 3;
            updatedRules.STAGE_CONFIG["1"].increment = inc;
            updatedRules.STAGE_CONFIG["2"].increment = inc;

            updatedRules.economy.baseRoundGold = Number(document.getElementById("adm-r-basegold").value) || 5;
            updatedRules.economy.maxInterest = Number(document.getElementById("adm-r-maxint").value) || 5;

            updatedRules.damageFormula.checkmateBase = Number(document.getElementById("adm-r-cmbase").value);
            updatedRules.damageFormula.checkmatePerUnit = Number(document.getElementById("adm-r-cmunit").value);
            updatedRules.damageFormula.kingCaptureBase = Number(document.getElementById("adm-r-kcbase").value);
            updatedRules.combatRules.turnOneGrace = document.getElementById("adm-r-grace").checked;

            const res = await fetch("api.php?action=admin_rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rules: updatedRules })
            });
            const data = await res.json();
            if (data.ok) {
                if (data.rules && window.applyDatabaseConfigToRuntime) {
                    window.applyDatabaseConfigToRuntime(data.rules, data.entities);
                }
                this.showToast(data.msg, "success");
                this.renderCodex();
                this.openAdminDatabaseModal();
            }
        });
    }

    renderAdminPiecesTab() {
        const listEl = document.getElementById("admin-pieces-list");
        const editor = document.getElementById("admin-piece-editor");
        if (!this.adminDbCache || !this.adminDbCache.entities) return;

        const pieces = this.adminDbCache.entities.PIECES;
        listEl.innerHTML = "";

        for (const p of Object.values(pieces)) {
            const item = document.createElement("div");
            item.className = `admin-list-item ${this.selectedAdminPieceId === p.id ? "active" : ""}`;
            item.innerHTML = `
                <span>${p.icon} ${p.name}</span>
                <span class="badge-pill">${p.isKing ? "Vua" : p.cost + "🪙"}</span>
            `;
            item.addEventListener("click", () => {
                this.selectedAdminPieceId = p.id;
                this.renderAdminPiecesTab();
            });
            listEl.appendChild(item);
        }

        const p = pieces[this.selectedAdminPieceId];
        if (!p) return;

        editor.innerHTML = `
            <div class="lobby-box-title">${p.icon} Chỉnh Sửa Quân Cờ: ${p.name} (<code>${p.id}</code>)</div>
            <div class="admin-grid-2">
                <div class="form-group">
                    <label>Tên Quân Cờ</label>
                    <input type="text" id="adm-p-name" value="${p.name}" />
                </div>
                <div class="form-group">
                    <label>Giá Mua Trong Shop (1 -> 5 Vàng)</label>
                    <input type="number" id="adm-p-cost" min="0" max="5" value="${p.cost}" ${p.isKing ? "disabled" : ""} />
                </div>
            </div>

            <div class="panel-section-title">🛡️ Số Lớp Máu (Phải ăn bao nhiêu lần mới chết ở 1★ / 2★ / 3★)</div>
            <div class="admin-grid-3">
                <div class="form-group">
                    <label>Lớp Máu 1 Sao (★)</label>
                    <input type="number" id="adm-p-hp1" min="1" max="20" value="${p.baseHp[0]}" />
                </div>
                <div class="form-group">
                    <label>Lớp Máu 2 Sao (★★)</label>
                    <input type="number" id="adm-p-hp2" min="1" max="25" value="${p.baseHp[1]}" />
                </div>
                <div class="form-group">
                    <label>Lớp Máu 3 Sao (★★★)</label>
                    <input type="number" id="adm-p-hp3" min="1" max="30" value="${p.baseHp[2]}" />
                </div>
            </div>

            <div class="panel-section-title">🎯 Tầm Đánh / Tầm Bắn Xa (1★ / 2★ / 3★)</div>
            <div class="admin-grid-3">
                <div class="form-group">
                    <label>Tầm 1 Sao (★)</label>
                    <input type="number" id="adm-p-rng1" min="1" max="8" value="${p.range[0]}" />
                </div>
                <div class="form-group">
                    <label>Tầm 2 Sao (★★)</label>
                    <input type="number" id="adm-p-rng2" min="1" max="8" value="${p.range[1]}" />
                </div>
                <div class="form-group">
                    <label>Tầm 3 Sao (★★★)</label>
                    <input type="number" id="adm-p-rng3" min="1" max="8" value="${p.range[2]}" />
                </div>
            </div>

            <div class="form-group">
                <label>Mô tả kỹ năng & bước đi</label>
                <input type="text" id="adm-p-desc" value="${p.desc}" />
            </div>

            <button id="btn-save-admin-piece" class="btn-combat-go">💾 Lưu Quân Cờ Vào Database (MySQL pieces / JSON)</button>
        `;

        document.getElementById("btn-save-admin-piece").addEventListener("click", async () => {
            const pieceData = {
                name: document.getElementById("adm-p-name").value.trim(),
                cost: Number(document.getElementById("adm-p-cost").value),
                baseHp: [
                    Number(document.getElementById("adm-p-hp1").value) || 1,
                    Number(document.getElementById("adm-p-hp2").value) || 2,
                    Number(document.getElementById("adm-p-hp3").value) || 3
                ],
                range: [
                    Number(document.getElementById("adm-p-rng1").value) || 1,
                    Number(document.getElementById("adm-p-rng2").value) || 1,
                    Number(document.getElementById("adm-p-rng3").value) || 1
                ],
                desc: document.getElementById("adm-p-desc").value.trim()
            };

            const res = await fetch("api.php?action=admin_piece", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pieceId: p.id, pieceData })
            });
            const data = await res.json();
            if (data.ok) {
                if (data.entities && window.applyDatabaseConfigToRuntime) {
                    window.applyDatabaseConfigToRuntime(data.rules, data.entities);
                }
                this.showToast(data.msg, "success");
                this.renderCodex();
                this.openAdminDatabaseModal();
            }
        });
    }

    // ========================================================================
    // ADMIN SPECTATOR MODE: 8-BOT ARENA (4 SIMULTANEOUS SPLIT SCREENS 2x2)
    // ========================================================================
    bindSpectatorEvents() {
        const openBtn1 = document.getElementById("btn-open-spectator-top");
        const openBtn2 = document.getElementById("btn-start-spectator-8bots");
        if (openBtn1) openBtn1.addEventListener("click", () => this.start8BotSpectatorMode());
        if (openBtn2) openBtn2.addEventListener("click", () => this.start8BotSpectatorMode());

        const backBtn = document.getElementById("btn-spec-back-lobby");
        if (backBtn) {
            backBtn.addEventListener("click", () => {
                this.stopSpectatorTimers();
                this.showScreen("lobby");
            });
        }

        const newBtn = document.getElementById("btn-spec-new-8bots");
        if (newBtn) {
            newBtn.addEventListener("click", () => {
                this.start8BotSpectatorMode();
            });
        }

        const pauseBtn = document.getElementById("btn-spec-pause");
        if (pauseBtn) {
            pauseBtn.addEventListener("click", () => {
                this.specPaused = !this.specPaused;
                pauseBtn.textContent = this.specPaused ? "▶️ Tiếp Tục" : "⏸️ Tạm Dừng";
                this.showToast(this.specPaused ? "⏸️ Đã tạm dừng 4 bàn đấu!" : "▶️ Tiếp tục 4 bàn đấu!", "info");
            });
        }

        const nextBtn = document.getElementById("btn-spec-next-round");
        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                this.advanceSpectatorNextRound();
            });
        }

        document.querySelectorAll(".spec-speed-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".spec-speed-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.specSpeed = Number(btn.getAttribute("data-speed")) || 1;
                this.scheduleSpectatorTick();
            });
        });
    }

    start8BotSpectatorMode() {
        this.stopCombatTimers();
        this.stopSpectatorTimers();
        this.specPaused = false;
        this.specZoomIndex = null;
        this.specGlobalLogs = [
            "🎬 Khởi tạo Giải Đấu 8 Kỳ Thủ AI! 8 Bot được chia thành 4 cặp đấu Cờ Chớp trực tiếp trên 4 màn hình!"
        ];

        const pauseBtn = document.getElementById("btn-spec-pause");
        if (pauseBtn) pauseBtn.textContent = "⏸️ Tạm Dừng";

        this.tft.reset8BotTournament();
        this.showScreen("spectator");
        this.startSpectatorRoundMatches();
        this.showToast("👁️ Đang phát trực tiếp 4 bàn đấu của 8 Bot AI cùng lúc!", "success");
    }

    startSpectatorRoundMatches() {
        this.stopSpectatorTimers();
        this.specMatches = this.tft.prepare8BotRoundMatches();
        this.renderSpectatorView();
        this.scheduleSpectatorTick();

        // 100ms clock tick for all 4 boards
        this.specClockInterval = setInterval(() => {
            if (this.specPaused) return;
            let anyClockUpdated = false;
            const dt = 0.1 * this.specSpeed;

            for (const m of this.specMatches) {
                if (m.engine.gameOver) continue;
                anyClockUpdated = true;
                if (m.engine.turn === "player") {
                    m.clockA = Math.max(0, m.clockA - dt);
                    if (m.clockA <= 0) {
                        m.engine.endMatch("enemy", "timeout", `${m.botA.name} hết giờ!`);
                        const logLine = this.tft.resolveSingleBotMatch(m);
                        if (logLine) this.specGlobalLogs.unshift(logLine);
                    }
                } else {
                    m.clockB = Math.max(0, m.clockB - dt);
                    if (m.clockB <= 0) {
                        m.engine.endMatch("player", "timeout", `${m.botB.name} hết giờ!`);
                        const logLine = this.tft.resolveSingleBotMatch(m);
                        if (logLine) this.specGlobalLogs.unshift(logLine);
                    }
                }
            }

            if (anyClockUpdated) {
                this.updateSpectatorClocksOnly();
                this.checkAllSpectatorMatchesFinished();
            }
        }, 100);
    }

    scheduleSpectatorTick() {
        if (this.specMoveInterval) {
            clearInterval(this.specMoveInterval);
            this.specMoveInterval = null;
        }
        const intervalMs = Math.max(110, Math.round(520 / this.specSpeed));
        this.specMoveInterval = setInterval(() => {
            if (this.specPaused) return;
            this.tickSpectatorMoves();
        }, intervalMs);
    }

    tickSpectatorMoves() {
        let anyMoved = false;

        for (const m of this.specMatches) {
            if (m.engine.gameOver) continue;
            anyMoved = true;
            const side = m.engine.turn;
            const act = m.engine.chooseBotAction(side, 0.18);
            if (!act) {
                const winnerSide = side === "player" ? "enemy" : "player";
                m.engine.endMatch(winnerSide, "checkmate", "Không còn nước đi hợp lệ!");
            } else {
                const res = m.engine.executeAction(act);
                if (res) {
                    if (side === "player") m.clockA += m.increment + (res.clockBonus || 0);
                    else m.clockB += m.increment + (res.clockBonus || 0);
                }
            }

            if (m.engine.gameOver && !m.resolved) {
                const logLine = this.tft.resolveSingleBotMatch(m);
                if (logLine) {
                    this.specGlobalLogs.unshift(logLine);
                }
            }
        }

        if (anyMoved) {
            this.sfx.move();
            this.renderSpectatorView();
            this.checkAllSpectatorMatchesFinished();
        }
    }

    checkAllSpectatorMatchesFinished() {
        if (this.specMatches.length === 0) return;
        const allDone = this.specMatches.every(m => m.engine.gameOver);
        if (!allDone) return;

        // Ensure all matches are resolved
        for (const m of this.specMatches) {
            if (!m.resolved) {
                const logLine = this.tft.resolveSingleBotMatch(m);
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

        this.renderSpectatorView();

        const aliveBots = this.tft.spectatorBots.filter(b => !b.eliminated);
        if (aliveBots.length <= 1) {
            const champ = aliveBots[0] || this.tft.spectatorBots[0];
            this.specGlobalLogs.unshift(`👑 NHÀ VÔ ĐỊCH GIẢI ĐẤU 8 BOT: ${champ.avatar} ${champ.name} (${champ.hp} ❤️ còn lại)!`);
            this.sfx.victory();
            this.renderSpectatorView();
            this.showToast(`👑 ${champ.name} đã vô địch giải đấu 8 Bot!`, "success");
            return;
        }

        const autoChk = document.getElementById("chk-spec-auto");
        if (autoChk && autoChk.checked && !this.specAutoNextTimeout) {
            this.specAutoNextTimeout = setTimeout(() => {
                this.specAutoNextTimeout = null;
                if (!this.specPaused) {
                    this.advanceSpectatorNextRound();
                }
            }, 2200);
        }
    }

    advanceSpectatorNextRound() {
        this.stopSpectatorTimers();
        // Force-resolve any unfinished match before advancing
        for (const m of this.specMatches) {
            if (!m.engine.gameOver) {
                m.engine.endMatch("draw", "draw", "Qua vòng nhanh");
            }
            if (!m.resolved) {
                const logLine = this.tft.resolveSingleBotMatch(m);
                if (logLine) this.specGlobalLogs.unshift(logLine);
            }
        }

        const aliveBots = this.tft.spectatorBots.filter(b => !b.eliminated);
        if (aliveBots.length <= 1) {
            this.showToast("Giải đấu đã tìm ra Nhà Vô Địch! Hãy bấm 'Tạo Ván 8 Bot Mới' để xem giải mới.", "info");
            return;
        }

        const info = this.tft.advance8BotRound();
        const cfg = this.tft.getStageConfig();
        if (info.boardScaled) {
            this.specGlobalLogs.unshift(`📐 Bước sang Stage ${this.tft.stage}: Bàn cờ của cả 4 màn hình mở rộng thành ${cfg.cols}x${cfg.rows}!`);
            this.showToast(`📐 Sang Stage ${this.tft.stage}: Bàn cờ mở rộng thành ${cfg.cols}x${cfg.rows}!`, "success");
        }
        this.startSpectatorRoundMatches();
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

    renderSpectatorView() {
        const cfg = this.tft.getStageConfig();
        const aliveCount = this.tft.spectatorBots.filter(b => !b.eliminated).length;

        document.getElementById("spec-stage-badge").textContent = `Vòng ${this.tft.stage}-${this.tft.roundInStage}`;
        document.getElementById("spec-boardsize-badge").textContent = `📐 Bàn cờ: ${cfg.cols}x${cfg.rows}`;
        document.getElementById("spec-alive-badge").textContent = `🤖 Còn sống: ${aliveCount}/8 Bot`;

        this.renderSpectatorLeaderboard();

        // Global log
        const logEl = document.getElementById("spec-global-log");
        logEl.innerHTML = "";
        for (const line of this.specGlobalLogs.slice(0, 25)) {
            const d = document.createElement("div");
            d.className = "log-row";
            d.textContent = line;
            logEl.appendChild(d);
        }

        // 4 Split Screens Grid
        const gridEl = document.getElementById("spec-grid-4");
        gridEl.classList.toggle("zoomed-single", this.specZoomIndex !== null);
        gridEl.innerHTML = "";

        for (const m of this.specMatches) {
            if (this.specZoomIndex !== null && this.specZoomIndex !== m.matchIndex) continue;
            gridEl.appendChild(this.renderSpectatorMatchCard(m, cfg));
        }
    }

    renderSpectatorLeaderboard() {
        const lbEl = document.getElementById("spec-leaderboard");
        lbEl.innerHTML = "";

        const sorted = [...this.tft.spectatorBots].sort((a, b) => b.hp - a.hp);
        sorted.forEach((bot, idx) => {
            const row = document.createElement("div");
            row.className = `spec-bot-row ${bot.eliminated ? "eliminated" : ""}`;

            const unitsHtml = bot.board.map(u => {
                const def = window.CHESS_TFT_DATA.PIECES[u.id];
                return `<span class="spec-bot-unit-pill" title="${def.name}">${def.icon}${"★".repeat(u.stars || 1)}</span>`;
            }).join("");

            row.innerHTML = `
                <div class="spec-bot-top">
                    <span>#${idx + 1} ${bot.avatar} ${bot.name}</span>
                    <span style="color:${bot.hp > 40 ? "#4ade80" : "#f87171"};">❤️ ${bot.hp}</span>
                </div>
                <div class="spec-bot-meta">
                    <span>Lv.${bot.level} • 🪙 ${bot.gold} • Hệ: ${bot.style}</span>
                    <span>${bot.streak > 0 ? `🔥+${bot.streak}` : (bot.streak < 0 ? `❄️${bot.streak}` : "⚖️0")}</span>
                </div>
                <div class="spec-bot-units">${unitsHtml}</div>
                <div class="spec-bot-admin-btns">
                    <button class="spec-mini-btn btn-buff-hp" title="Admin cộng +25 Máu cho Bot này">+25 ❤️</button>
                    <button class="spec-mini-btn btn-buff-star" title="Admin nâng toàn bộ đội hình Bot này lên +1 Sao">⬆️ Nâng Sao</button>
                    <button class="spec-mini-btn btn-buff-item" title="Admin tặng thêm Trang bị cho Bot này">🎁 +Đồ</button>
                </div>
            `;

            row.querySelector(".btn-buff-hp").addEventListener("click", () => {
                bot.hp = Math.min(200, bot.hp + 25);
                bot.eliminated = false;
                this.showToast(`⚡ Admin đã bơm +25 Máu cho ${bot.name}!`, "success");
                this.renderSpectatorLeaderboard();
            });

            row.querySelector(".btn-buff-star").addEventListener("click", () => {
                for (const u of bot.board) {
                    u.stars = Math.min(3, (u.stars || 1) + 1);
                }
                this.sfx.starUp();
                this.showToast(`🌟 Admin đã nâng Sao toàn bộ đội hình của ${bot.name}!`, "success");
                this.renderSpectatorLeaderboard();
            });

            row.querySelector(".btn-buff-item").addEventListener("click", () => {
                const itemIds = Object.keys(window.CHESS_TFT_DATA.ITEMS);
                const nonKings = bot.board.filter(u => u.id !== "king");
                if (nonKings.length > 0) {
                    const target = nonKings[Math.floor(Math.random() * nonKings.length)];
                    const randItem = itemIds[Math.floor(Math.random() * itemIds.length)];
                    target.items.push(randItem);
                    this.showToast(`🎁 Admin đã trang bị ${window.CHESS_TFT_DATA.ITEMS[randItem].name} cho ${bot.name}!`, "success");
                    this.renderSpectatorLeaderboard();
                }
            });

            lbEl.appendChild(row);
        });
    }

    renderSpectatorMatchCard(m, cfg) {
        const card = document.createElement("div");
        const eng = m.engine;
        card.className = `spec-match-card ${eng.gameOver ? "match-finished" : ""}`;

        // Calculate optimal square pixel size so 4 boards fit cleanly in 2x2 grid
        const isZoomed = this.specZoomIndex === m.matchIndex;
        const baseCellPx = isZoomed
            ? (cfg.rows <= 6 ? 58 : (cfg.rows === 7 ? 50 : 44))
            : (cfg.rows <= 6 ? 34 : (cfg.rows === 7 ? 30 : 26));

        const lastMove = eng.moveHistory.length > 0
            ? eng.moveHistory[eng.moveHistory.length - 1]
            : null;
        const footerText = eng.gameOver
            ? m.summaryText
            : (lastMove ? `[Lượt ${lastMove.turn}] ${lastMove.text}` : "⏳ Bắt đầu ván đấu...");

        let statusPillText = `Lượt ${eng.turnCount}/${eng.maxTurns}`;
        if (eng.gameOver && eng.result) {
            statusPillText = `🏁 ${eng.result.reasonLabel}`;
        }

        card.innerHTML = `
            <div class="spec-match-header">
                <div class="spec-match-title">
                    <span>📺 BÀN #${m.matchIndex + 1} ${m.isExhibition ? "(Bản Sao)" : ""}</span>
                    <span class="badge-pill" style="font-size:0.68rem; padding:1px 6px;">${m.mapDef.name}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <span style="font-size:0.68rem; color:#94a3b8;">${statusPillText}</span>
                    <button class="spec-mini-btn btn-zoom-board">${isZoomed ? "🗗 Xem 4 Màn Hình" : "🔍 Phóng To"}</button>
                </div>
            </div>

            <div class="spec-fighters-bar">
                <div class="spec-fighter side-blue ${!eng.gameOver && eng.turn === "player" ? "turn-active" : ""}">
                    <span>${m.botA.avatar} ${m.botA.name} (❤️${m.botA.hp})</span>
                    <span id="spec-clock-a-${m.matchIndex}">⏱️ ${m.clockA.toFixed(1)}s</span>
                </div>
                <span class="spec-vs-pill">VS</span>
                <div class="spec-fighter side-red ${!eng.gameOver && eng.turn === "enemy" ? "turn-active" : ""}">
                    <span>${m.botB.avatar} ${m.botB.name} (❤️${m.botB.hp})</span>
                    <span id="spec-clock-b-${m.matchIndex}">⏱️ ${m.clockB.toFixed(1)}s</span>
                </div>
            </div>

            <div class="spec-board-wrap">
                <div class="spec-board-grid" style="grid-template-columns: repeat(${cfg.cols}, ${baseCellPx}px); grid-template-rows: repeat(${cfg.rows}, ${baseCellPx}px);"></div>
            </div>

            <div class="spec-match-footer">${footerText}</div>
        `;

        card.querySelector(".btn-zoom-board").addEventListener("click", () => {
            this.specZoomIndex = isZoomed ? null : m.matchIndex;
            this.renderSpectatorView();
        });

        const boardGrid = card.querySelector(".spec-board-grid");
        const lastAct = eng.lastAction;

        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                const cell = document.createElement("div");
                const isLight = (r + c) % 2 === 0;
                cell.className = `spec-cell ${isLight ? "light" : "dark"}`;

                const terr = typeof eng.getTerrain === "function" ? eng.getTerrain(r, c) : (eng.terrain && eng.terrain[`${r},${c}`]);
                if (terr === "river") cell.style.background = "rgba(14, 165, 233, 0.32)";
                else if (terr === "lava") cell.style.background = "rgba(239, 68, 68, 0.32)";
                else if (terr === "wall") {
                    cell.style.background = "#090d16";
                    cell.innerHTML = `<span style="font-size:0.75rem; opacity:0.65;">🧱</span>`;
                }

                if (lastAct) {
                    if (lastAct.fromR === r && lastAct.fromC === c) cell.classList.add("last-from");
                    if (lastAct.toR === r && lastAct.toC === c) cell.classList.add("last-to");
                }

                const unit = eng.board[r][c];
                if (unit) {
                    const hpSegs = [];
                    for (let i = 0; i < unit.maxHp; i++) {
                        hpSegs.push(`<span class="spec-hp-seg ${i >= unit.hp ? "lost" : ""}"></span>`);
                    }
                    let statusBadge = "";
                    if (unit.stunnedTurns > 0) statusBadge = "💫";
                    else if (unit.burnTurns > 0) statusBadge = `🔥`;
                    else if (unit.reloadTurns > 0) statusBadge = "⏳";

                    cell.innerHTML = `
                        <div class="spec-unit-token side-${unit.side}" style="font-size:${Math.max(12, Math.round(baseCellPx * 0.52))}px;">
                            <span class="spec-unit-stars">${"★".repeat(unit.stars || 1)}</span>
                            <span>${unit.icon}</span>
                            ${statusBadge ? `<span class="spec-unit-status">${statusBadge}</span>` : ""}
                            <div class="spec-unit-hpbar">${hpSegs.join("")}</div>
                        </div>
                    `;
                }

                boardGrid.appendChild(cell);
            }
        }

        return card;
    }

    // ========================================================================
    // TFT HOTKEY ACTIONS (D / F / E / W / X) & LOCK SHOP
    // ========================================================================
    handleHotkeyReroll() {
        const gameScreen = document.getElementById("screen-game");
        if (!gameScreen || gameScreen.classList.contains("hidden")) return;

        if (this.tft.phase !== "prep") {
            this.showToast("Chỉ có thể đổi Shop trong giai đoạn Chuẩn Bị!", "warn");
            return;
        }

        const hadFree = (this.tft.player.freeRerolls || 0) > 0;
        if (this.tft.rollShop(false)) {
            this.sfx.move();
            if (hadFree) {
                this.showToast(`🎁 Đã dùng 1 lượt Đổi Shop MIỄN PHÍ [D]! Còn lại: ${this.tft.player.freeRerolls || 0}`, "success");
            }
            this.renderAll();
            this.syncMyStateToRoom();

            const btn = document.getElementById("btn-reroll");
            if (btn) {
                btn.classList.add("btn-key-pressed");
                setTimeout(() => btn.classList.remove("btn-key-pressed"), 150);
            }
        } else {
            this.showToast("Không đủ 2 Vàng để đổi Shop! [D]", "warn");
        }
    }

    handleHotkeyBuyXP() {
        const gameScreen = document.getElementById("screen-game");
        if (!gameScreen || gameScreen.classList.contains("hidden")) return;

        if (this.tft.phase !== "prep") {
            this.showToast("Chỉ có thể mua XP trong giai đoạn Chuẩn Bị!", "warn");
            return;
        }

        if (this.tft.buyXP()) {
            this.sfx.starUp();
            this.renderAll();
            this.syncMyStateToRoom();

            const btn = document.getElementById("btn-buy-xp");
            if (btn) {
                btn.classList.add("btn-key-pressed");
                setTimeout(() => btn.classList.remove("btn-key-pressed"), 150);
            }
        } else {
            this.showToast("Không đủ 4 Vàng hoặc đã đạt Cấp tối đa (Lv.8)! [F]", "warn");
        }
    }

    handleHotkeySellPiece() {
        const gameScreen = document.getElementById("screen-game");
        if (!gameScreen || gameScreen.classList.contains("hidden")) return;

        // Target priority: Hovered Unit -> Selected Prep Unit
        let targetUid = null;
        if (this.hoveredUnit && this.hoveredUnit.uid) {
            targetUid = this.hoveredUnit.uid;
        } else if (this.selectedPrepUnitUid) {
            targetUid = this.selectedPrepUnitUid;
        }

        if (!targetUid) {
            this.showToast("💡 Trỏ chuột vào quân cờ (hoặc bấm chọn) rồi nhấn phím [E] để Bán Nhanh!", "info");
            return;
        }

        const benchUnit = this.tft.player.bench.find(u => u && u.uid === targetUid);
        const boardUnit = this.tft.player.board.find(u => u && u.uid === targetUid);
        const targetUnit = benchUnit || boardUnit;

        if (!targetUnit) {
            this.showToast("Không tìm thấy quân cờ để bán!", "warn");
            return;
        }

        if (targetUnit.id === "king") {
            this.showToast("Không thể bán Quốc Vương (Vua)!", "warn");
            return;
        }

        if (this.tft.phase !== "prep" && boardUnit) {
            this.showToast("Không thể bán quân đang trên bàn cờ khi đang Giao Tranh!", "warn");
            return;
        }

        const res = this.tft.sellUnit(targetUnit.uid);
        if (res.ok) {
            if (this.selectedPrepUnitUid === targetUnit.uid) {
                this.selectedPrepUnitUid = null;
            }
            if (this.hoveredUnit && this.hoveredUnit.uid === targetUnit.uid) {
                this.hoveredUnit = null;
            }
            this.sfx.move();
            this.showToast(`💰 Đã bán nhanh [E] ${res.name} (+${res.refund} 🪙)`, "info");
            this.renderAll();
            this.syncMyStateToRoom();

            const sellBtn = document.getElementById("btn-sell-selected");
            if (sellBtn && !sellBtn.classList.contains("hidden")) {
                sellBtn.classList.add("btn-key-pressed");
                setTimeout(() => sellBtn.classList.remove("btn-key-pressed"), 150);
            }
        } else {
            this.showToast(res.msg || "Không thể bán quân cờ!", "warn");
        }
    }

    handleHotkeyDeployOrRecall() {
        const gameScreen = document.getElementById("screen-game");
        if (!gameScreen || gameScreen.classList.contains("hidden")) return;

        if (this.tft.phase !== "prep") {
            this.showToast("Chỉ có thể điều động hoặc thu hồi quân cờ trong Giai Đoạn Chuẩn Bị!", "warn");
            return;
        }

        let targetUid = null;
        if (this.hoveredUnit && this.hoveredUnit.uid) {
            targetUid = this.hoveredUnit.uid;
        } else if (this.selectedPrepUnitUid) {
            targetUid = this.selectedPrepUnitUid;
        }

        if (!targetUid) {
            this.showToast("💡 Trỏ chuột vào quân cờ rồi bấm phím [W] để đưa lên sân hoặc thu hồi!", "info");
            return;
        }

        const benchUnit = this.tft.player.bench.find(u => u && u.uid === targetUid);
        const boardUnit = this.tft.player.board.find(u => u && u.uid === targetUid);

        // CASE 1: UNIT IS ON BENCH -> DEPLOY TO BOARD
        if (benchUnit) {
            const cfg = this.tft.getStageConfig();
            const minR = cfg.rows - cfg.deployRows;

            let targetR = -1;
            let targetC = -1;

            // If player is hovering over a valid empty deploy cell, deploy there!
            if (this.hoveredCell && this.hoveredCell.r >= minR && this.hoveredCell.r < cfg.rows) {
                const occupied = this.tft.player.board.some(u => u.r === this.hoveredCell.r && u.c === this.hoveredCell.c);
                if (!occupied) {
                    targetR = this.hoveredCell.r;
                    targetC = this.hoveredCell.c;
                }
            }

            // Otherwise find the first available cell in deploy zone
            if (targetR === -1) {
                const centerC = Math.floor(cfg.cols / 2);
                const colOrder = [centerC];
                for (let d = 1; d < cfg.cols; d++) {
                    if (centerC - d >= 0) colOrder.push(centerC - d);
                    if (centerC + d < cfg.cols) colOrder.push(centerC + d);
                }

                for (let r = cfg.rows - 1; r >= minR; r--) {
                    for (const c of colOrder) {
                        const occupied = this.tft.player.board.some(u => u.r === r && u.c === c);
                        if (!occupied) {
                            targetR = r;
                            targetC = c;
                            break;
                        }
                    }
                    if (targetR !== -1) break;
                }
            }

            if (targetR === -1) {
                this.showToast("Không còn ô trống nào trong khu vực sân nhà!", "warn");
                return;
            }

            const res = this.tft.movePlayerUnitToBoard(benchUnit.uid, targetR, targetC);
            if (res.ok) {
                const def = window.CHESS_TFT_DATA.PIECES[benchUnit.id];
                this.selectedPrepUnitUid = null;
                this.hoveredUnit = null;
                this.sfx.move();
                if (this.isTutorialMode && this.tutorialStep === 2) {
                    this.advanceTutorialStep(3);
                }
                this.showToast(`⚔️ Đã đưa [W] ${def.name} lên sân đấu!`, "info");
                this.renderAll();
                this.syncMyStateToRoom();
            } else {
                this.showToast(res.msg || "Không thể đặt quân lên sàn!", "warn");
            }
            return;
        }

        // CASE 2: UNIT IS ON BOARD -> RECALL TO BENCH
        if (boardUnit) {
            if (boardUnit.id === "king") {
                this.showToast("Quốc Vương bắt buộc phải ở trên bàn cờ!", "warn");
                return;
            }

            const res = this.tft.moveBoardUnitToBench(boardUnit.uid);
            if (res.ok) {
                const def = window.CHESS_TFT_DATA.PIECES[boardUnit.id];
                this.selectedPrepUnitUid = null;
                this.hoveredUnit = null;
                this.sfx.move();
                this.showToast(`📦 Đã thu hồi [W] ${def.name} về hàng chờ!`, "info");
                this.renderAll();
                this.syncMyStateToRoom();
            } else {
                this.showToast(res.msg || "Hàng chờ đã đầy!", "warn");
            }
            return;
        }
    }

    toggleLockShop() {
        const gameScreen = document.getElementById("screen-game");
        if (!gameScreen || gameScreen.classList.contains("hidden")) return;

        this.tft.shopLocked = !this.tft.shopLocked;
        this.sfx.move();

        if (this.tft.shopLocked) {
            this.showToast("🔒 Đã KHÓA Cửa Hàng [X]! Các quân cờ sẽ được giữ nguyên cho vòng sau.", "info");
        } else {
            this.showToast("🔓 Đã MỞ KHÓA Cửa Hàng [X]! Sẽ tự động làm mới ở vòng sau.", "info");
        }

        this.renderShop();

        const lockBtn = document.getElementById("btn-lock-shop");
        if (lockBtn) {
            lockBtn.classList.add("btn-key-pressed");
            setTimeout(() => lockBtn.classList.remove("btn-key-pressed"), 150);
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

        document.getElementById("btn-sell-selected").addEventListener("click", () => {
            if (!this.selectedPrepUnitUid) return;
            const res = this.tft.sellUnit(this.selectedPrepUnitUid);
            if (res.ok) {
                this.selectedPrepUnitUid = null;
                this.sfx.move();
                this.showToast(`Đã bán ${res.name} (+${res.refund} Vàng)`, "info");
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

        // BGM Toggle Buttons (Lobby & Game Header)
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
        };

        const onToggleBgm = () => {
            this.sfx.toggleBgm();
            updateBgmButtons();
            const state = !this.sfx.bgmMuted ? "Đã bật nhạc nền 🎵" : "Đã tắt nhạc nền 🔇";
            this.showToast(state, "info");
        };

        const btnBgm1 = document.getElementById("btn-toggle-bgm");
        if (btnBgm1) btnBgm1.addEventListener("click", onToggleBgm);

        const btnBgm2 = document.getElementById("btn-toggle-bgm-game");
        if (btnBgm2) btnBgm2.addEventListener("click", onToggleBgm);

        updateBgmButtons();

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
            if (this.tft.phase === "prep") {
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
        if (modeBadge) {
            if (this.isRankedMode) {
                modeBadge.textContent = "🏆 LEO RANK ONLINE";
                modeBadge.className = "badge-pill badge-mode";
            } else {
                modeBadge.textContent = "🤖 ĐẤU VỚI BOT AI";
                modeBadge.className = "badge-pill";
            }
        }
    }

    renderTopHeader() {
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
        listEl.innerHTML = "";

        const all = [...this.tft.getAllParticipants()].sort((a, b) => b.hp - a.hp);
        const potentialOpps = (this.tft.phase === "prep") ? this.tft.getPotentialOpponents() : [];

        for (const part of all) {
            const row = document.createElement("div");
            const isScouted = this.tft.scoutingPlayerId === part.id;
            const isCurrentOpp = this.tft.phase === "combat" && this.tft.currentOpponent && this.tft.currentOpponent.id === part.id;
            const isPotentialOpp = this.tft.phase === "prep" && part.id !== "player" && !part.eliminated &&
                potentialOpps.some(o => o.id === part.id);

            row.className = `leader-row ${part.id === "player" ? "leader-self" : ""} ${isScouted ? "leader-scouted" : ""} ${part.eliminated ? "leader-dead" : ""} ${isCurrentOpp ? "leader-current-opp" : ""}`;

            const hpPercent = Math.max(0, Math.min(100, part.hp));
            const nonKingCount = this.tft.getNonKingCount(part);

            let oppBadge = "";
            if (isCurrentOpp) {
                oppBadge = `<span class="opponent-scout-badge" title="⚔️ Đang trực tiếp giao tranh!">⚔️ Đấu thủ</span>`;
            } else if (isPotentialOpp) {
                oppBadge = `<span class="opponent-scout-badge" title="⚔️ Đối thủ tiềm năng có thể gặp vòng tới! Bấm để soi bài!">⚔️</span>`;
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
                if (this.tft.phase !== "prep") {
                    this.showToast("Đang trong trận Cờ Chớp, không thể chuyển màn hình soi bài!", "warn");
                    return;
                }
                this.tft.scoutingPlayerId = part.id;
                this.selectedPrepUnitUid = null;
                this.renderAll();
            });

            listEl.appendChild(row);
        }
    }

    renderSynergies() {
        const container = document.getElementById("synergy-list");
        container.innerHTML = "";

        const viewedParticipant = this.tft.phase === "prep"
            ? this.tft.getParticipantById(this.tft.scoutingPlayerId)
            : this.tft.player;

        const synergies = this.tft.calculateSynergies(viewedParticipant);
        const entries = Object.values(synergies).sort((a, b) => (b.activeTier > 0 ? 1 : 0) - (a.activeTier > 0 ? 1 : 0) || b.count - a.count);

        if (entries.length === 0) {
            container.innerHTML = `<div class="empty-hint">Chưa có Tộc/Hệ nào trên sân.</div>`;
        } else {
            for (const syn of entries) {
                const isActive = syn.activeTier > 0;
                const badge = document.createElement("div");
                badge.className = `synergy-item ${isActive ? "synergy-active" : "synergy-inactive"}`;
                const threshStr = syn.thresholds.join(" / ");
                const activeBonus = isActive ? syn.effectText[syn.activeTier] : `Cần ${syn.thresholds[0]} quân để kích hoạt`;

                badge.innerHTML = `
                    <div class="synergy-head">
                        <span class="synergy-icon" style="background:${isActive ? syn.color : "#334155"}">${syn.icon}</span>
                        <div class="synergy-title-wrap">
                            <span class="synergy-name">${syn.name}</span>
                            <span class="synergy-count">${syn.count} (${threshStr})</span>
                        </div>
                    </div>
                    <div class="synergy-desc">${activeBonus}</div>
                `;

                badge.addEventListener("mouseenter", (e) => this.showSynergyTooltip(syn.id, e, viewedParticipant));
                badge.addEventListener("mousemove", (e) => this.moveSynergyTooltip(e));
                badge.addEventListener("mouseleave", () => this.hideSynergyTooltip());

                container.appendChild(badge);
            }
        }

        // Also show compact pills for all other Synergies not yet on board so player can hover to inspect any Tộc/Hệ
        const unplaced = Object.values(window.CHESS_TFT_DATA.SYNERGIES).filter(s => !synergies[s.id]);
        if (unplaced.length > 0) {
            const divTitle = document.createElement("div");
            divTitle.className = "synergy-unplaced-divider";
            divTitle.textContent = "Tộc/Hệ khác (Trỏ chuột xem chi tiết):";
            container.appendChild(divTitle);

            const miniWrap = document.createElement("div");
            miniWrap.className = "synergy-mini-pills";
            for (const sDef of unplaced) {
                const pill = document.createElement("span");
                pill.className = "synergy-mini-pill";
                pill.innerHTML = `${sDef.icon} ${sDef.name}`;
                pill.addEventListener("mouseenter", (e) => this.showSynergyTooltip(sDef.id, e, viewedParticipant));
                pill.addEventListener("mousemove", (e) => this.moveSynergyTooltip(e));
                pill.addEventListener("mouseleave", () => this.hideSynergyTooltip());
                miniWrap.appendChild(pill);
            }
            container.appendChild(miniWrap);
        }
    }

    showSynergyTooltip(traitId, evt, participant = null) {
        const synDef = window.CHESS_TFT_DATA.SYNERGIES[traitId];
        if (!synDef) return;

        const targetPart = participant || (this.tft.phase === "prep"
            ? this.tft.getParticipantById(this.tft.scoutingPlayerId)
            : this.tft.player);

        const activeSynergies = this.tft.calculateSynergies(targetPart);
        const currentSyn = activeSynergies[traitId] || { count: 0, activeTier: 0 };

        const boardIds = new Set((targetPart.board || []).map(u => u && u.id));
        const benchIds = new Set((targetPart.bench || []).filter(Boolean).map(u => u.id));

        // Build Tier Threshold Rows
        const tiersHtml = synDef.thresholds.map(th => {
            const isTierActive = currentSyn.activeTier === th;
            const isReached = currentSyn.count >= th;
            return `
                <div class="syn-tier-row ${isTierActive ? "tier-active" : ""}">
                    <span class="syn-tier-num">(${th})</span>
                    <span>${synDef.effectText[th]} ${isTierActive ? "✓" : (isReached ? "" : "")}</span>
                </div>
            `;
        }).join("");

        // Find all pieces belonging to this trait
        const matchingPieces = Object.values(window.CHESS_TFT_DATA.PIECES)
            .filter(p => p.traits && p.traits.includes(traitId))
            .sort((a, b) => a.cost - b.cost);

        const unitsHtml = matchingPieces.map(p => {
            const onBoard = boardIds.has(p.id);
            const onBench = !onBoard && benchIds.has(p.id);
            const stateClass = onBoard ? "unit-on-board" : (onBench ? "unit-on-bench" : "");
            const costLabel = p.isKing ? "Mặc định (Vua)" : `${p.cost} Vàng 🪙`;
            const statusTag = onBoard ? " • ✓ Trên sân" : (onBench ? " • Hàng chờ" : "");

            return `
                <div class="syn-unit-chip ${stateClass}">
                    <span class="syn-unit-icon">${p.icon}</span>
                    <div class="syn-unit-meta">
                        <span class="syn-unit-name">${p.name}</span>
                        <span class="syn-unit-cost">${costLabel}${statusTag}</span>
                    </div>
                </div>
            `;
        }).join("");

        const tipEl = document.getElementById("synergy-tooltip");
        tipEl.innerHTML = `
            <div class="syn-tip-header">
                <div class="syn-tip-icon" style="background:${synDef.color}">${synDef.icon}</div>
                <div>
                    <div class="syn-tip-title">${synDef.name}</div>
                    <div class="syn-tip-count">Đang kích hoạt: ${currentSyn.count} quân thuộc hệ này trên sân</div>
                </div>
            </div>
            <div class="syn-tip-desc">${synDef.desc}</div>
            <div class="syn-tip-tiers">${tiersHtml}</div>
            <div class="syn-tip-units-title">Các Quân Cờ Thuộc Hệ ${synDef.name} (${matchingPieces.length}):</div>
            <div class="syn-tip-units-grid">${unitsHtml}</div>
        `;
        tipEl.classList.remove("hidden");
        this.moveSynergyTooltip(evt);

        // Highlight matching units on Board, Bench & Shop
        const matchIdSet = new Set(matchingPieces.map(p => p.id));
        document.querySelectorAll("[data-piece-id]").forEach(el => {
            if (matchIdSet.has(el.getAttribute("data-piece-id"))) {
                el.classList.add("trait-hover-highlight");
            }
        });
    }

    moveSynergyTooltip(evt) {
        const tipEl = document.getElementById("synergy-tooltip");
        if (!tipEl || tipEl.classList.contains("hidden")) return;

        const pad = 16;
        let x = evt.clientX + pad;
        let y = evt.clientY + pad;

        const rect = tipEl.getBoundingClientRect();
        if (x + rect.width > window.innerWidth - 12) {
            x = Math.max(12, evt.clientX - rect.width - pad);
        }
        if (y + rect.height > window.innerHeight - 12) {
            y = Math.max(12, window.innerHeight - rect.height - 12);
        }

        tipEl.style.left = `${x}px`;
        tipEl.style.top = `${y}px`;
    }

    hideSynergyTooltip() {
        const tipEl = document.getElementById("synergy-tooltip");
        if (tipEl) tipEl.classList.add("hidden");
        document.querySelectorAll(".trait-hover-highlight").forEach(el => {
            el.classList.remove("trait-hover-highlight");
        });
    }

    // ========================================================================
    // RENDER CHESS BOARD (PREP, BLIND-MAP SCOUTING & LIVE BLITZ COMBAT)
    // ========================================================================
    renderBoardArea() {
        const cfg = this.tft.getStageConfig();
        const boardEl = document.getElementById("chess-board");
        const scoutBanner = document.getElementById("scouting-banner");
        const mapInfoBar = document.getElementById("map-info-bar");

        boardEl.style.gridTemplateColumns = `repeat(${cfg.cols}, 1fr)`;
        boardEl.style.gridTemplateRows = `repeat(${cfg.rows}, 1fr)`;
        boardEl.innerHTML = "";

        if (this.tft.phase === "prep") {
            const viewed = this.tft.getParticipantById(this.tft.scoutingPlayerId);
            const isScoutingOther = viewed.id !== "player";

            if (isScoutingOther) {
                scoutBanner.classList.remove("hidden");
                document.getElementById("scouting-target-name").textContent = `🕵️ Đang Soi Bài: ${viewed.name} (Cấp ${viewed.level} • ${viewed.hp} HP)`;
                // When scouting another player, their terrain is hidden for fair play!
                mapInfoBar.innerHTML = `
                    <span class="map-hidden-pill">🕶️ Bản Đồ Đối Thủ: <strong>ĐANG ẨN</strong> (Chỉ soi được quân cờ & đội hình, địa hình sân khách được bảo mật!)</span>
                `;
            } else {
                scoutBanner.classList.add("hidden");
                // On player's HOME board: REVEAL the upcoming map & terrain so player can strategically position pawns and avoid rocks/walls!
                const mapDef = this.tft.currentMap || window.CHESS_TFT_DATA.MAPS[0];
                mapInfoBar.innerHTML = `
                    <span class="map-active-pill" style="background:${mapDef.themeColor}">🗺️ Bản Đồ Vòng Tới: ${mapDef.name}</span>
                    <span class="map-desc-text">${mapDef.desc}</span>
                `;
            }

            this.renderPrepBoardCells(boardEl, cfg, viewed, isScoutingOther);
        } else if (this.tft.phase === "combat" && this.chess) {
            scoutBanner.classList.add("hidden");
            mapInfoBar.innerHTML = `
                <span class="map-active-pill" style="background:${this.tft.currentMap.themeColor}">🗺️ ${this.tft.currentMap.name}</span>
                <span class="map-desc-text">${this.tft.currentMap.desc}</span>
            `;
            this.renderCombatBoardCells(boardEl, cfg);
        }
    }

    renderPrepBoardCells(boardEl, cfg, viewedParticipant, isScoutingOther) {
        const minDeployRow = cfg.rows - cfg.deployRows;
        const homeTerrain = (!isScoutingOther && this.tft.currentTerrain) ? this.tft.currentTerrain : null;

        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                const cell = document.createElement("div");
                const isLight = (r + c) % 2 === 0;
                const isDeployZone = r >= minDeployRow;
                const terr = homeTerrain ? homeTerrain[`${r},${c}`] : null;

                cell.className = `board-cell ${isLight ? "cell-light" : "cell-dark"} ${isDeployZone ? "cell-deploy-zone" : "cell-enemy-zone"}`;

                if (terr) {
                    cell.classList.add(`terrain-${terr}`);
                    const terrBadge = document.createElement("span");
                    terrBadge.className = "terrain-badge";
                    if (terr === "river") terrBadge.textContent = "🌊 Sông";
                    else if (terr === "wall") terrBadge.textContent = "🧱 Đá Cản";
                    else if (terr === "lava") terrBadge.textContent = "🌋 Dung Nham";
                    else if (terr === "rune") terrBadge.textContent = "✨ +Tầm";
                    cell.appendChild(terrBadge);
                }

                // Coordinate label on edges
                if (c === 0) {
                    const rLbl = document.createElement("span");
                    rLbl.className = "coord-label coord-row";
                    rLbl.textContent = cfg.rows - r;
                    cell.appendChild(rLbl);
                }

                // Check if unit is on this tile
                const unit = viewedParticipant.board.find(u => u.r === r && u.c === c);
                if (unit) {
                    const def = window.CHESS_TFT_DATA.PIECES[unit.id];
                    const starIdx = Math.min(2, (unit.stars || 1) - 1);
                    let previewHp = def.baseHp[starIdx] + (unit.items?.includes("iron_armor") ? 2 : 0);

                    const pieceEl = this.createPieceDOM({
                        uid: unit.uid,
                        id: unit.id,
                        name: def.name,
                        icon: def.icon,
                        badge: def.badge,
                        stars: unit.stars,
                        side: isScoutingOther ? "enemy" : "player",
                        hp: previewHp,
                        maxHp: previewHp,
                        items: unit.items || [],
                        stunnedTurns: 0,
                        burnTurns: 0
                    });

                    if (!isScoutingOther && this.selectedPrepUnitUid === unit.uid) {
                        cell.classList.add("cell-selected");
                    }
                    cell.appendChild(pieceEl);
                } else if (!isScoutingOther && isDeployZone && this.selectedPrepUnitUid) {
                    cell.classList.add("cell-can-place");
                }

                if (!isScoutingOther) {
                    cell.addEventListener("mouseenter", () => {
                        this.hoveredCell = { r, c };
                        if (unit) {
                            this.hoveredUnit = { type: "board", unit, r, c, uid: unit.uid };
                            cell.classList.add("cell-hover-target");
                        } else {
                            this.hoveredUnit = null;
                        }
                    });
                    cell.addEventListener("mouseleave", () => {
                        cell.classList.remove("cell-hover-target");
                        if (this.hoveredUnit && this.hoveredUnit.uid === (unit && unit.uid)) {
                            this.hoveredUnit = null;
                        }
                        if (this.hoveredCell && this.hoveredCell.r === r && this.hoveredCell.c === c) {
                            this.hoveredCell = null;
                        }
                    });
                }

                cell.addEventListener("click", () => {
                    if (isScoutingOther) {
                        this.showToast("Bạn đang Soi Bài đối thủ! Bấm 'Về Sân Nhà' để xếp quân của mình.", "info");
                        return;
                    }
                    this.handlePrepBoardClick(r, c, unit);
                });

                boardEl.appendChild(cell);
            }
        }
    }

    handlePrepBoardClick(r, c, unitOnCell) {
        // 1. If an item is selected in inventory, equip it onto the clicked unit!
        if (this.selectedItemIndex !== null && unitOnCell) {
            const res = this.tft.equipItem(this.selectedItemIndex, unitOnCell.uid);
            if (res.ok) {
                this.selectedItemIndex = null;
                this.sfx.starUp();
                this.showToast(`Đã lắp ${res.itemName} cho ${res.unitName}!`, "info");
                this.renderAll();
            } else {
                this.showToast(res.msg, "warn");
            }
            return;
        }

        // 2. If a unit is already selected, try moving/swapping it to (r, c)
        if (this.selectedPrepUnitUid) {
            if (unitOnCell && unitOnCell.uid === this.selectedPrepUnitUid) {
                this.selectedPrepUnitUid = null;
                this.renderAll();
                return;
            }
            const res = this.tft.movePlayerUnitToBoard(this.selectedPrepUnitUid, r, c);
            if (res.ok) {
                this.selectedPrepUnitUid = null;
                this.sfx.move();
                if (this.isTutorialMode && this.tutorialStep === 2) {
                    this.advanceTutorialStep(3);
                }
                this.renderAll();
            } else {
                this.showToast(res.msg, "warn");
            }
            return;
        }

        // 3. Otherwise select the unit on this cell
        if (unitOnCell) {
            this.selectedPrepUnitUid = unitOnCell.uid;
            this.sfx.move();
            this.renderAll();
        }
    }

    renderCombatBoardCells(boardEl, cfg) {
        const eng = this.chess;
        const isPlayerInCheck = eng.isKingInCheck("player");
        const playerKingDanger = eng.isKingLethallyThreatened("player");
        const enemyKingDanger = eng.isKingLethallyThreatened("enemy");

        const checkAlertEl = document.getElementById("king-check-alert");
        if (checkAlertEl) {
            if (isPlayerInCheck) {
                checkAlertEl.classList.remove("hidden");
                if (playerKingDanger) {
                    checkAlertEl.innerHTML = "🚨 <strong>NGUY CẤP: CHIẾU SÁT THỦ!</strong> Vua của bạn có thể bị bắt ngay nước tới! Phải chạy Vua hoặc chặn cản!";
                } else {
                    checkAlertEl.innerHTML = "🚨 <strong>BẠN ĐANG BỊ CHIẾU TƯỚNG!</strong> Di chuyển Vua hoặc chặn đường tấn công kẻo bị bắt Vua!";
                }
            } else {
                checkAlertEl.classList.add("hidden");
            }
        }

        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                const cell = document.createElement("div");
                const isLight = (r + c) % 2 === 0;
                const terr = eng.getTerrain(r, c);
                cell.className = `board-cell ${isLight ? "cell-light" : "cell-dark"}`;

                if (terr) {
                    cell.classList.add(`terrain-${terr}`);
                    const terrBadge = document.createElement("span");
                    terrBadge.className = "terrain-badge";
                    if (terr === "river") terrBadge.textContent = "🌊 Sông";
                    else if (terr === "wall") terrBadge.textContent = "🧱 Tường";
                    else if (terr === "lava") terrBadge.textContent = "🌋 Dung Nham";
                    else if (terr === "rune") terrBadge.textContent = "✨ +Tầm";
                    cell.appendChild(terrBadge);
                }

                // Highlight last move
                if (eng.lastAction) {
                    if ((eng.lastAction.fromR === r && eng.lastAction.fromC === c) ||
                        (eng.lastAction.toR === r && eng.lastAction.toC === c)) {
                        cell.classList.add("cell-last-move");
                    }
                }

                // Highlight selected piece
                if (this.selectedCombatSquare && this.selectedCombatSquare.r === r && this.selectedCombatSquare.c === c) {
                    cell.classList.add("cell-selected");
                }

                // Highlight valid action targets for selected piece:
                // Chấm XANH LÁ (🟢) cho nước đi thuần túy vào ô trống
                // Chấm VÀNG HỔ PHÁCH (🟡) cho ô trong phạm vi tấn công/bắn xa/làm choáng/thiêu đốt
                const matchedAction = this.validCombatActions.find(a => a.toR === r && a.toC === c);
                if (matchedAction) {
                    if (matchedAction.type === "move") {
                        cell.classList.add("cell-valid-move", "cell-dot-move");
                    } else if (matchedAction.type === "ranged") {
                        cell.classList.add("cell-valid-ranged", "cell-dot-attack");
                    } else {
                        cell.classList.add("cell-valid-melee", "cell-dot-attack");
                    }
                }

                const piece = eng.board[r][c];
                if (piece) {
                    if (piece.id === "king" && piece.side === "player" && isPlayerInCheck) {
                        cell.classList.add("cell-king-in-check");
                    }
                    const pieceEl = this.createPieceDOM(piece);
                    cell.appendChild(pieceEl);
                }

                cell.addEventListener("click", () => {
                    this.handleCombatBoardClick(r, c, piece, matchedAction);
                });

                boardEl.appendChild(cell);
            }
        }
    }

    createPieceDOM(piece) {
        const wrapper = document.createElement("div");
        wrapper.className = `chess-piece piece-${piece.side} star-${piece.stars} ${piece.stunnedTurns > 0 ? "piece-stunned" : ""} ${piece.burnTurns > 0 ? "piece-burning" : ""}`;
        wrapper.setAttribute("data-piece-id", piece.id);

        const starsStr = "★".repeat(piece.stars || 1);

        // Multi-HP shield pips bar
        let hpHtml = "";
        for (let i = 0; i < piece.maxHp; i++) {
            const filled = i < piece.hp;
            hpHtml += `<span class="hp-pip ${filled ? "hp-filled" : "hp-empty"}"></span>`;
        }

        // Status badges (Stun / Stun Immunity / Reload / Burn)
        let statusHtml = "";
        if (piece.stunnedTurns > 0) {
            statusHtml += `<span class="status-pill status-stun" title="Đang bị Choáng (Khóa di chuyển)">💫</span>`;
        } else if ((piece.stunImmuneTurns || 0) > 0) {
            statusHtml += `<span class="status-pill status-immune" title="Đang Kháng Choáng (Miễn nhiễm choáng liên tiếp)">🛡️</span>`;
        }
        if ((piece.reloadTurns || 0) > 0) {
            statusHtml += `<span class="status-pill status-reload" title="Đang Nạp Đạn (Lượt này chỉ di chuyển/cận chiến, lượt sau mới bắn xa tiếp)">⏳</span>`;
        }
        if (piece.burnTurns > 0) {
            statusHtml += `<span class="status-pill status-burn" title="Đang bị Thiêu Đốt (Nổ lan 8 ô sau ${piece.burnTurns} lượt)">🔥${piece.burnTurns}</span>`;
        }

        // Equipped items icons (TFT Mini Icons)
        let itemsHtml = "";
        if (piece.items && piece.items.length > 0) {
            itemsHtml = `<div class="piece-items">` +
                piece.items.map(id => {
                    const it = window.CHESS_TFT_DATA.ITEMS[id];
                    return it ? `<span class="piece-mini-item" title="${it.name}: ${it.desc}">${it.icon}</span>` : "";
                }).join("") +
                `</div>`;
        }

        wrapper.innerHTML = `
            <div class="piece-top-row">
                <span class="piece-stars">${starsStr}</span>
                <div class="piece-statuses">${statusHtml}</div>
            </div>
            <div class="piece-main-icon">
                <img src="assets/pieces/${piece.id}.svg" class="piece-svg-art" alt="${piece.name || ''}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
                <span class="piece-fallback-icon" style="display:none;">${piece.icon}</span>
                ${piece.badge ? `<span class="piece-sub-badge">${piece.badge}</span>` : ""}
            </div>
            <div class="piece-hp-bar" title="Lớp Máu: ${piece.hp}/${piece.maxHp} (Phải bị ăn ${piece.hp} lần mới chết)">
                ${hpHtml}
            </div>
            ${itemsHtml}
        `;
        return wrapper;
    }

    // ========================================================================
    // BENCH & SHOP RENDERING
    // ========================================================================
    renderBench() {
        const benchEl = document.getElementById("bench-grid");
        benchEl.innerHTML = "";

        for (let i = 0; i < 8; i++) {
            const slotEl = document.createElement("div");
            const unit = this.tft.player.bench[i];
            slotEl.className = `bench-slot ${unit && this.selectedPrepUnitUid === unit.uid ? "bench-selected" : ""}`;

            if (unit) {
                const def = window.CHESS_TFT_DATA.PIECES[unit.id];
                const starIdx = Math.min(2, (unit.stars || 1) - 1);
                const maxHp = def.baseHp[starIdx] + (unit.items?.includes("iron_armor") ? 2 : 0);

                slotEl.appendChild(this.createPieceDOM({
                    uid: unit.uid,
                    id: unit.id,
                    name: def.name,
                    icon: def.icon,
                    badge: def.badge,
                    stars: unit.stars,
                    side: "player",
                    hp: maxHp,
                    maxHp: maxHp,
                    items: unit.items || [],
                    stunnedTurns: 0,
                    burnTurns: 0
                }));
                const nameTag = document.createElement("div");
                nameTag.className = "bench-unit-name";
                nameTag.textContent = def.name;
                slotEl.appendChild(nameTag);
            } else {
                slotEl.innerHTML = `<span class="bench-empty-label">Hàng chờ ${i + 1}</span>`;
            }

            slotEl.addEventListener("mouseenter", () => {
                if (unit) {
                    this.hoveredUnit = { type: "bench", unit, slotIndex: i, uid: unit.uid };
                    slotEl.classList.add("bench-hover-target");
                } else {
                    this.hoveredBenchSlot = i;
                    this.hoveredUnit = null;
                }
            });
            slotEl.addEventListener("mouseleave", () => {
                slotEl.classList.remove("bench-hover-target");
                if (this.hoveredUnit && this.hoveredUnit.uid === (unit && unit.uid)) {
                    this.hoveredUnit = null;
                }
                if (this.hoveredBenchSlot === i) {
                    this.hoveredBenchSlot = null;
                }
            });

            slotEl.addEventListener("click", () => {
                // Equip item onto bench unit
                if (this.selectedItemIndex !== null && unit) {
                    const res = this.tft.equipItem(this.selectedItemIndex, unit.uid);
                    if (res.ok) {
                        this.selectedItemIndex = null;
                        this.sfx.starUp();
                        this.showToast(`Đã lắp ${res.itemName} cho ${res.unitName}!`, "info");
                        this.renderAll();
                    } else {
                        this.showToast(res.msg, "warn");
                    }
                    return;
                }

                // Move board unit to empty bench slot
                if (this.selectedPrepUnitUid && !unit) {
                    const res = this.tft.moveBoardUnitToBench(this.selectedPrepUnitUid, i);
                    if (res.ok) {
                        this.selectedPrepUnitUid = null;
                        this.sfx.move();
                        this.renderAll();
                        return;
                    }
                }

                if (unit) {
                    this.selectedPrepUnitUid = this.selectedPrepUnitUid === unit.uid ? null : unit.uid;
                    this.sfx.move();
                    this.renderAll();
                }
            });

            benchEl.appendChild(slotEl);
        }
    }

    renderShop() {
        const shopEl = document.getElementById("shop-cards");
        shopEl.innerHTML = "";

        const isLocked = !!this.tft.shopLocked;
        shopEl.classList.toggle("shop-locked", isLocked);

        const lockBtn = document.getElementById("btn-lock-shop");
        if (lockBtn) {
            lockBtn.classList.toggle("is-locked", isLocked);
            lockBtn.title = isLocked
                ? "Cửa hàng đang KHÓA (Giữ nguyên thẻ bài cho vòng sau). Bấm hoặc nhấn [X] để Mở Khóa."
                : "Khóa Cửa Hàng: Giữ nguyên 5 quân cờ này sang vòng sau (Phím tắt: X).";

            const lockIcon = document.getElementById("btn-lock-icon");
            if (lockIcon) {
                lockIcon.textContent = isLocked ? "🔒" : "🔓";
            } else {
                lockBtn.innerHTML = `
                    <span id="btn-lock-icon">${isLocked ? "🔒" : "🔓"}</span>
                    <span class="hud-keybind-badge lock-keybind">X</span>
                `;
            }
        }

        const rerollBtn = document.getElementById("btn-reroll");
        if (rerollBtn) {
            const freeCount = this.tft.player.freeRerolls || 0;
            if (freeCount > 0) {
                rerollBtn.innerHTML = `
                    <div class="hud-btn-main">
                        <span class="reroll-btn-title">🎲 ĐỔI MIỄN PHÍ</span>
                        <span class="hud-keybind-badge">D</span>
                    </div>
                    <span class="reroll-btn-cost badge-free-reroll">FREE (${freeCount})</span>
                `;
                rerollBtn.classList.add("btn-free-reroll");
                rerollBtn.title = `Bạn có ${freeCount} lượt đổi shop miễn phí nhờ chuỗi thua! (Phím tắt: D)`;
            } else {
                rerollBtn.innerHTML = `
                    <div class="hud-btn-main">
                        <span class="reroll-btn-title">🎲 ĐỔI LẠI</span>
                        <span class="hud-keybind-badge">D</span>
                    </div>
                    <span id="reroll-cost-label" class="reroll-btn-cost">2 🪙</span>
                `;
                rerollBtn.classList.remove("btn-free-reroll");
                rerollBtn.title = "Đổi mới 5 quân cờ trong Cửa Hàng (Tốn 2 Vàng - Phím tắt: D)";
            }
        }

        for (const slot of this.tft.shop) {
            const card = document.createElement("div");
            if (slot.sold) {
                card.className = "shop-card shop-sold";
                card.innerHTML = `<div class="sold-text">ĐÃ MUA</div>`;
                shopEl.appendChild(card);
                continue;
            }

            if (isLocked) {
                const lockPill = document.createElement("span");
                lockPill.className = "shop-card-locked-icon";
                lockPill.textContent = "🔒";
                lockPill.title = "Thẻ bài này đang được khóa cho vòng sau";
                card.appendChild(lockPill);
            }

            const def = window.CHESS_TFT_DATA.PIECES[slot.id];
            const copiesOwned = this.tft.countMatchingUnits(this.tft.player, slot.id, 1);
            const canUpgradeHint = copiesOwned >= 2 ? "✨ GHÉP 2 SAO!" : (copiesOwned === 1 ? "Đã có 1/3" : "");

            const traitsHtml = def.traits.map(tId => {
                const sDef = window.CHESS_TFT_DATA.SYNERGIES[tId];
                return `<span class="shop-trait-pill" data-trait-id="${tId}">${sDef.icon} ${sDef.name}</span>`;
            }).join("");

            card.className = `shop-card cost-tier-${def.cost} ${copiesOwned >= 2 ? "shop-merge-glow" : ""}`;
            card.setAttribute("data-piece-id", def.id);
            card.title = `${def.name} (${def.cost}🪙) — Bấm ℹ️ hoặc phím [H] để xem hướng dẫn nước đi`;
            card.innerHTML = `
                <div class="shop-card-top">
                    <span class="shop-unit-name">${def.name}</span>
                    <div class="shop-top-right">
                        <span class="shop-unit-cost">${def.cost} 🪙</span>
                        <button class="shop-guide-btn" title="Xem hướng dẫn cách đi & mẹo chơi của ${def.name}" data-piece-id="${def.id}">ℹ️</button>
                    </div>
                </div>
                <div class="shop-card-body">
                    <div class="shop-unit-icon">
                        <img src="assets/pieces/${def.id}.svg" class="shop-svg-art" alt="${def.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
                        <span class="shop-fallback-icon" style="display:none;">${def.icon}</span>
                        <span class="shop-badge">${def.badge || ""}</span>
                    </div>
                    <div class="shop-traits">${traitsHtml}</div>
                </div>
                <div class="shop-unit-stats">
                    <span>🛡️ ${def.baseHp[0]} HP</span>
                    <span>🎯 Tầm: ${def.range[0]}</span>
                </div>
                ${canUpgradeHint ? `<div class="shop-merge-tag">${canUpgradeHint}</div>` : ""}
            `;

            // Guide button inside shop card
            const guideBtn = card.querySelector(".shop-guide-btn");
            if (guideBtn) {
                guideBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.openPieceGuide(def.id);
                });
            }

            // Attach Synergy Tooltip when hovering trait pills inside Shop cards
            card.querySelectorAll(".shop-trait-pill").forEach(pill => {
                const tId = pill.getAttribute("data-trait-id");
                pill.addEventListener("mouseenter", (e) => this.showSynergyTooltip(tId, e, this.tft.player));
                pill.addEventListener("mousemove", (e) => this.moveSynergyTooltip(e));
                pill.addEventListener("mouseleave", () => this.hideSynergyTooltip());
            });

            card.addEventListener("click", () => {
                this.hideSynergyTooltip();
                const res = this.tft.buyShopUnit(slot.slotIndex);
                if (res.ok) {
                    if (res.merged) {
                        this.sfx.starUp();
                        this.showToast(`🌟 NÂNG CẤP! ${res.merged.name} đã lên ${res.merged.stars} SAO (★)!`, "success");
                    } else {
                        this.sfx.move();
                    }
                    if (this.isTutorialMode && this.tutorialStep === 1) {
                        this.advanceTutorialStep(2);
                    }
                    this.renderAll();
                } else {
                    this.showToast(res.msg, "warn");
                }
            });

            shopEl.appendChild(card);
        }
    }

    renderRightPanel() {
        // 1. Blitz Clocks
        document.getElementById("clock-player").textContent = `${this.playerClock.toFixed(1)}s`;
        document.getElementById("clock-enemy").textContent = `${this.enemyClock.toFixed(1)}s`;

        const pClockBox = document.getElementById("clock-box-player");
        const eClockBox = document.getElementById("clock-box-enemy");
        if (this.tft.phase === "combat" && this.chess && !this.chess.gameOver) {
            pClockBox.classList.toggle("clock-active", this.chess.turn === "player");
            eClockBox.classList.toggle("clock-active", this.chess.turn === "enemy");
        } else {
            pClockBox.classList.remove("clock-active");
            eClockBox.classList.remove("clock-active");
        }

        // 2. Compact TFT Item Inventory (Nhỏ gọn chuẩn TFT)
        const itemContainer = document.getElementById("item-inventory");
        itemContainer.innerHTML = "";
        if (this.tft.player.items.length === 0) {
            itemContainer.innerHTML = `<div class="empty-hint" style="font-size:0.75rem;">Kho đồ trống (Nhận ở Đi Chợ & Chọn Lõi).</div>`;
        } else {
            const grid = document.createElement("div");
            grid.className = "item-inventory-tft-grid";
            this.tft.player.items.forEach((itemId, idx) => {
                const it = window.CHESS_TFT_DATA.ITEMS[itemId];
                if (!it) return;
                const slot = document.createElement("div");
                slot.className = `inv-slot-compact ${this.selectedItemIndex === idx ? "selected" : ""}`;
                slot.innerHTML = `<span>${it.icon}</span>`;
                slot.title = `${it.name}: ${it.desc}`;

                slot.addEventListener("click", () => {
                    this.selectedItemIndex = this.selectedItemIndex === idx ? null : idx;
                    if (this.selectedItemIndex !== null) {
                        this.showToast(`Đã chọn ${it.name} — Bấm vào 1 quân cờ trên bàn hoặc hàng chờ để trang bị!`, "info");
                    }
                    this.renderRightPanel();
                });
                grid.appendChild(slot);
            });
            itemContainer.appendChild(grid);
        }

        // 3. Augments Owned
        const augContainer = document.getElementById("augment-list");
        augContainer.innerHTML = "";
        if (this.tft.player.augments.length === 0) {
            augContainer.innerHTML = `<div class="empty-hint">Chưa có Lõi (Mở ở vòng 1-2, 2-2, 3-2).</div>`;
        } else {
            for (const augId of this.tft.player.augments) {
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

    renderSelectedUnitInspector() {
        const box = document.getElementById("selected-unit-box");
        const sellBtn = document.getElementById("btn-sell-selected");

        let unit = null;
        if (this.tft.phase === "prep" && this.selectedPrepUnitUid) {
            unit = this.tft.player.board.find(u => u.uid === this.selectedPrepUnitUid) ||
                   this.tft.player.bench.find(u => u && u.uid === this.selectedPrepUnitUid);
        } else if (this.tft.phase === "combat" && this.selectedCombatSquare && this.chess) {
            unit = this.chess.board[this.selectedCombatSquare.r][this.selectedCombatSquare.c];
        }

        if (!unit) {
            box.innerHTML = `<div class="empty-hint">Bấm vào 1 quân cờ để xem chi tiết bước đi, Lớp Máu hoặc Bán quân.</div>`;
            sellBtn.classList.add("hidden");
            return;
        }

        const def = window.CHESS_TFT_DATA.PIECES[unit.id];
        const starIdx = Math.min(2, (unit.stars || 1) - 1);
        const hpDisplay = unit.hp !== undefined ? `${unit.hp}/${unit.maxHp}` : `${def.baseHp[starIdx]}`;

        box.innerHTML = `
            <div class="insp-head">
                <span class="insp-icon">${def.icon}</span>
                <div>
                    <div class="insp-title">${def.name} ${"★".repeat(unit.stars || 1)}</div>
                    <div class="insp-meta">🛡️ Lớp Máu: <strong>${hpDisplay}</strong> • 🎯 Tầm: <strong>${def.range[starIdx]}</strong></div>
                </div>
            </div>
            <div class="insp-desc">${def.desc}</div>
        `;

        if (this.tft.phase === "prep" && !def.isKing) {
            const refund = this.tft.getUnitSellValue(unit);
            sellBtn.innerHTML = `💰 Bán quân (+${refund} 🪙) <span class="hud-keybind-badge" style="margin-left:4px;">E</span>`;
            sellBtn.classList.remove("hidden");
        } else {
            sellBtn.classList.add("hidden");
        }
    }

    // ========================================================================
    // BLITZ CHESS COMBAT LOOP
    // ========================================================================
    startBlitzCombat() {
        this.clearPrepCountdown();
        this.sfx.playBgm("combat");
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

        // Start 100ms Blitz Clock Interval
        this.stopCombatTimers();
        this.clockInterval = setInterval(() => {
            if (!this.chess || this.chess.gameOver) return;

            if (this.chess.turn === "player") {
                this.playerClock = Math.max(0, this.playerClock - 0.1);
                if (this.playerClock <= 0) {
                    this.chess.endMatch("enemy", "timeout", "Bạn hết thời gian đồng hồ Cờ Chớp!");
                    this.finishBlitzCombat();
                }
            } else {
                this.enemyClock = Math.max(0, this.enemyClock - 0.1);
                if (this.enemyClock <= 0) {
                    this.chess.endMatch("player", "timeout", "Đối thủ hết thời gian đồng hồ Cờ Chớp!");
                    this.finishBlitzCombat();
                }
            }
            this.renderRightPanel();
        }, 100);
    }

    stopCombatTimers() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        if (this.botMoveTimeout) {
            clearTimeout(this.botMoveTimeout);
            this.botMoveTimeout = null;
        }
    }

    handleCombatBoardClick(r, c, pieceOnCell, matchedAction) {
        if (!this.chess || this.chess.gameOver) return;
        if (this.chess.turn !== "player") {
            this.showToast("Đang là lượt đi của Đối Thủ!", "warn");
            return;
        }

        // 1. Execute matched action if player clicked a highlighted valid destination
        if (matchedAction) {
            const cfg = this.tft.getStageConfig();
            const res = this.chess.executeAction(matchedAction);
            this.selectedCombatSquare = null;
            this.validCombatActions = [];

            if (res) {
                // Clock increment + Cavalry bonus
                this.playerClock += cfg.increment + (res.clockBonus || 0);

                if (matchedAction.type === "ranged") this.sfx.ranged();
                else if (matchedAction.type === "melee") this.sfx.capture();
                else this.sfx.move();

                this.renderAll();

                if (res.gameOver || this.chess.gameOver) {
                    this.finishBlitzCombat();
                    return;
                }

                // Trigger AI Bot response if it's now enemy's turn
                if (this.chess.turn === "enemy") {
                    this.scheduleBotTurn();
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

        // Bot suy nghĩ nhanh gọn 180ms - 380ms để nhịp độ cờ chớp dồn dập
        const thinkMs = 180 + Math.floor(Math.random() * 200);
        this.botMoveTimeout = setTimeout(() => {
            if (!this.chess || this.chess.gameOver || this.chess.turn !== "enemy") return;

            const cfg = this.tft.getStageConfig();
            const botAct = this.chess.chooseBotAction("enemy", 0.22);
            if (!botAct) {
                this.chess.endMatch("player", "checkmate", "Đối thủ không còn nước đi hợp lệ!");
                this.finishBlitzCombat();
                return;
            }

            const res = this.chess.executeAction(botAct);
            if (res) {
                this.enemyClock += cfg.increment + (res.clockBonus || 0);
                if (botAct.type === "ranged") this.sfx.ranged();
                else if (botAct.type === "melee") this.sfx.hitArmor();
                else this.sfx.move();

                this.renderAll();

                if (res.gameOver || this.chess.gameOver) {
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
        this.sfx.playBgm("lobby");
        if (!this.chess || !this.chess.result) return;

        const res = this.chess.result;
        if (res.winner === "player") this.sfx.victory();
        else this.sfx.defeat();

        this.tft.resolveRoundResults(res, this.chess.goldEarnedPlayer);
        this.renderAll();

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

    showRoundResultModal(res) {
        const modal = document.getElementById("modal-round-result");
        const titleEl = document.getElementById("round-result-title");
        const reasonEl = document.getElementById("round-result-reason");
        const logsEl = document.getElementById("round-match-logs");

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
                <div class="choice-icon">${pDef.icon} <span class="carousel-plus">+</span> ${iDef.icon}</div>
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
                const res = await fetch("api.php?action=match_finish", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
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
        this.sfx.playBgm("lobby");
        this.prepSecondsLeft = 18; // 18s chuẩn bị nhanh gọn chuẩn TFT
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
        this.augmentSecondsLeft = 12; // 12s chọn Lõi nhanh
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
        this.carouselSecondsLeft = 10; // 10s Đi Chợ nhanh
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

window.addEventListener("DOMContentLoaded", () => {
    window.app = new ChessTFTApp();
});

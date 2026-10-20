const io = require("socket.io-client");
const https = require("https");
const path = require("path");

// Mock browser environment for data.js, chess-engine.js, and tft-manager.js
global.window = global;
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

require(path.join(__dirname, "../js/data.js"));
require(path.join(__dirname, "../js/chess-engine.js"));
require(path.join(__dirname, "../js/tft-manager.js"));

const SERVER_URL = "https://chessxtft.onrender.com";
const ROOM_CODE = "LJ3XTJ";

const BOT_CONFIGS = [
    { username: "bot_magnus", displayName: "Magnus Carlsen 🤖", avatar: "🤖" },
    { username: "bot_hikaru", displayName: "Hikaru Nakamura ⚡", avatar: "⚡" },
    { username: "bot_kasparov", displayName: "Garry Kasparov 🦁", avatar: "🦁" },
    { username: "bot_tal", displayName: "Mikhail Tal 🔥", avatar: "🔥" },
    { username: "bot_fischer", displayName: "Bobby Fischer ♟️", avatar: "♟️" },
    { username: "bot_capablanca", displayName: "José Capablanca 🛡️", avatar: "🛡️" },
    { username: "bot_morphy", displayName: "Paul Morphy 🎩", avatar: "🎩" },
    { username: "bot_judit", displayName: "Judit Polgar 👑", avatar: "👑" }
];

function registerOrLogin(botCfg) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            username: botCfg.username,
            password: "123",
            displayName: botCfg.displayName,
            avatar: botCfg.avatar
        });

        // Try register first
        const req = https.request(`${SERVER_URL}/api.php?action=register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload)
            }
        }, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                try {
                    const data = JSON.parse(body);
                    if (data.ok && data.user) {
                        return resolve(data.user);
                    }
                    // If username exists, try login
                    loginUser(botCfg).then(resolve).catch(reject);
                } catch (e) {
                    loginUser(botCfg).then(resolve).catch(reject);
                }
            });
        });

        req.on("error", () => {
            loginUser(botCfg).then(resolve).catch(reject);
        });
        req.write(payload);
        req.end();
    });
}

function loginUser(botCfg) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            username: botCfg.username,
            password: "123"
        });

        const req = https.request(`${SERVER_URL}/api.php?action=login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload)
            }
        }, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                try {
                    const data = JSON.parse(body);
                    if (data.ok && data.user) {
                        resolve(data.user);
                    } else {
                        // Fallback user object
                        resolve({
                            id: `user_${botCfg.username}`,
                            username: botCfg.username,
                            displayName: botCfg.displayName,
                            avatar: botCfg.avatar,
                            stats: { elo: 1200 }
                        });
                    }
                } catch (e) {
                    resolve({
                        id: `user_${botCfg.username}`,
                        username: botCfg.username,
                        displayName: botCfg.displayName,
                        avatar: botCfg.avatar,
                        stats: { elo: 1200 }
                    });
                }
            });
        });

        req.on("error", (e) => reject(e));
        req.write(payload);
        req.end();
    });
}

class BotClient {
    constructor(cfg) {
        this.cfg = cfg;
        this.user = null;
        this.socket = null;
        this.tft = null;
        this.chess = null;
        this.roomData = null;
        this.combatInterval = null;
        this.isFinishedCombat = false;
        this.stage = 1;
        this.roundInStage = 1;
    }

    async init() {
        this.user = await registerOrLogin(this.cfg);
        console.log(`[${this.cfg.displayName}] Authenticated: ID=${this.user.id}`);

        this.socket = io(SERVER_URL, {
            transports: ["websocket", "polling"],
            reconnection: true
        });

        this.socket.on("connect", () => {
            console.log(`[${this.cfg.displayName}] Socket connected: ${this.socket.id}`);
            this.joinRoom();
        });

        this.socket.on("room:updated", (room) => {
            this.roomData = room;
            console.log(`[${this.cfg.displayName}] Room updated: ${room.players.length}/8 players`);
        });

        this.socket.on("room:matchStarted", ({ room, rules, entities }) => {
            console.log(`⚔️ [${this.cfg.displayName}] MATCH STARTED!`);
            this.roomData = room;
            this.startMatch();
        });

        this.socket.on("room:allBoardsFinished", ({ key, stage, round }) => {
            console.log(`🔄 [${this.cfg.displayName}] All boards finished round ${key}! Transitioning...`);
            setTimeout(() => {
                this.advanceToNextRound();
            }, 1000 + Math.random() * 1000);
        });

        this.socket.on("disconnect", () => {
            console.log(`⚠️ [${this.cfg.displayName}] Disconnected`);
        });
    }

    joinRoom() {
        this.socket.emit("room:join", {
            code: ROOM_CODE,
            user: this.user,
            asSpectator: false
        }, (res) => {
            if (res && res.ok) {
                console.log(`✅ [${this.cfg.displayName}] Successfully joined room #${ROOM_CODE}!`);
            } else {
                console.error(`❌ [${this.cfg.displayName}] Failed to join room:`, res?.msg);
            }
        });
    }

    syncState() {
        if (!this.socket || !this.tft || !this.user) return;
        const p = this.tft.player;
        this.socket.emit("match:syncPlayerState", {
            code: ROOM_CODE,
            playerId: this.user.id,
            state: {
                hp: p.hp,
                level: p.level,
                gold: p.gold,
                streak: p.streak,
                board: p.board,
                bench: p.bench,
                items: p.items,
                augments: p.augments,
                eliminated: p.eliminated || p.hp <= 0
            }
        });
    }

    startMatch() {
        this.tft = new window.TFTGameManager();
        this.tft.resetGame(this.user, this.roomData);
        this.syncState();
        this.handlePreparationPhase();
    }

    handlePreparationPhase() {
        if (!this.tft || this.tft.player.eliminated) return;
        this.isFinishedCombat = false;
        const p = this.tft.player;

        // Human-like thinking delay before shopping/moving
        const thinkMs = 1500 + Math.floor(Math.random() * 2500);
        setTimeout(() => {
            if (p.eliminated) return;

            // 1. Buy XP if rich
            if (p.gold >= 14 && p.level < 8) {
                this.tft.buyXP();
            }

            // 2. Buy from shop
            if (Array.isArray(this.tft.shop)) {
                for (let i = 0; i < this.tft.shop.length; i++) {
                    const slot = this.tft.shop[i];
                    if (slot && p.gold >= slot.cost) {
                        const buyRes = this.tft.buyShopUnit(i);
                        if (buyRes && buyRes.ok) {
                            console.log(`🛒 [${this.cfg.displayName}] Bought ${slot.name}`);
                            if (p.gold < 3) break;
                        }
                    }
                }
            }

            // 3. Move units from bench to board if space available
            const cfg = this.tft.getStageConfig();
            const maxUnits = p.level + (p.augments.includes("aug_tactical_expansion") ? 1 : 0);
            
            for (let bIdx = 0; bIdx < p.bench.length; bIdx++) {
                const benchUnit = p.bench[bIdx];
                if (!benchUnit) continue;
                if (p.board.length >= maxUnits) break;

                // Find empty cell in player deploy rows (rows 0 to deployRows-1)
                let placed = false;
                for (let r = 0; r < cfg.deployRows; r++) {
                    for (let c = 0; c < cfg.cols; c++) {
                        const occupied = p.board.some(u => u.r === r && u.c === c);
                        if (!occupied) {
                            this.tft.movePlayerUnitToBoard(benchUnit.uid, r, c);
                            placed = true;
                            break;
                        }
                    }
                    if (placed) break;
                }
            }

            // 4. Augment selection if pending
            if (p.augments.length < 3 && Math.random() < 0.5) {
                const unowned = window.CHESS_TFT_DATA.AUGMENTS.filter(a => !p.augments.includes(a.id));
                if (unowned.length > 0) {
                    const chosen = unowned[Math.floor(Math.random() * unowned.length)];
                    this.tft.chooseAugment(chosen.id);
                }
            }

            this.syncState();

            // After preparation (human-like prep time: 4-7s), start combat
            const prepDelay = 3000 + Math.floor(Math.random() * 3000);
            setTimeout(() => {
                this.startCombat();
            }, prepDelay);

        }, thinkMs);
    }

    startCombat() {
        if (!this.tft || this.tft.player.eliminated || this.isFinishedCombat) return;

        this.tft.prepareCombatRound();
        const cfg = this.tft.getStageConfig();
        const opp = this.tft.currentOpponent || {
            name: "Đối Thủ Ngẫu Nhiên",
            hp: 100,
            board: [],
            augments: []
        };

        const playerSyn = this.tft.calculateSynergies(this.tft.player);
        const enemySyn = this.tft.calculateSynergies(opp);
        const terrain = this.tft.currentMap ? this.tft.currentMap.generateTerrain(cfg.cols, cfg.rows) : [];

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

        this.syncState();
        this.runCombatLoop();
    }

    runCombatLoop() {
        if (this.combatInterval) clearInterval(this.combatInterval);

        // Turn move interval: 1000ms - 2200ms per move (simulating human blitz chess player)
        this.combatInterval = setInterval(() => {
            if (!this.chess || this.chess.gameOver || this.isFinishedCombat) {
                clearInterval(this.combatInterval);
                this.finishCombat();
                return;
            }

            const currentTurn = this.chess.turn; // "player" or "enemy"
            const blunderChance = 0.18;
            const act = this.chess.chooseBotAction(currentTurn, blunderChance);

            if (!act) {
                const winner = currentTurn === "player" ? "enemy" : "player";
                this.chess.endMatch(winner, "checkmate", "Không còn nước đi hợp lệ!");
                clearInterval(this.combatInterval);
                this.finishCombat();
                return;
            }

            this.chess.executeAction(act);

            if (this.chess.gameOver) {
                clearInterval(this.combatInterval);
                this.finishCombat();
            }
        }, 1200 + Math.floor(Math.random() * 800));
    }

    finishCombat() {
        if (this.isFinishedCombat) return;
        this.isFinishedCombat = true;
        if (this.combatInterval) {
            clearInterval(this.combatInterval);
            this.combatInterval = null;
        }

        const res = this.chess?.result || { winner: "enemy", reason: "timeout" };
        this.tft.resolveRoundResults(res, this.chess?.goldEarnedPlayer || 0);

        console.log(`🏁 [${this.cfg.displayName}] Finished Round ${this.tft.stage}-${this.tft.roundInStage}: ${res.winner === "player" ? "VICTORY 🏆" : "DEFEAT 💀"} (HP: ${this.tft.player.hp})`);

        this.syncState();

        // Notify server that this bot finished combat
        this.socket.emit("room:playerFinishedCombat", {
            code: ROOM_CODE,
            playerId: this.user.id,
            stage: this.tft.stage,
            round: this.tft.roundInStage
        });

        if (this.tft.player.hp <= 0) {
            this.tft.player.eliminated = true;
            console.log(`💀 [${this.cfg.displayName}] Eliminated!`);
            this.syncState();
        }
    }

    advanceToNextRound() {
        if (!this.tft || this.tft.player.eliminated) return;
        this.tft.nextRound();
        console.log(`🚀 [${this.cfg.displayName}] Entering Stage ${this.tft.stage}-${this.tft.roundInStage}`);
        this.syncState();
        this.handlePreparationPhase();
    }
}

async function main() {
    console.log("=================================================");
    console.log(`🤖 Spawning 8 Human-like Bots for Room #${ROOM_CODE}`);
    console.log("=================================================");

    const bots = [];
    for (let i = 0; i < BOT_CONFIGS.length; i++) {
        const cfg = BOT_CONFIGS[i];
        const bot = new BotClient(cfg);
        bots.push(bot);
        await bot.init();
        // Stagger bot logins slightly by 400ms
        await new Promise(r => setTimeout(r, 400));
    }

    console.log("\n✨ All 8 bots have joined room LJ3XTJ!");
    console.log("👀 The room host (spectator) can now click 'Bắt Đầu Trận Đấu' in the waiting room!");
}

main().catch(console.error);

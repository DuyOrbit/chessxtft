// ============================================================================
// CHESS TFT - 8-PLAYER LOBBY, ECONOMY, SHOP, STAR-UP, ITEMS & MATCHMAKING
// ============================================================================

class TFTGameManager {
    constructor() {
        this.uidCounter = 100;
        this.resetGame();
    }

    nextUid(prefix = "u") {
        this.uidCounter += 1;
        return `${prefix}_${this.uidCounter}`;
    }

    resetGame(userProfile = null, roomData = null) {
        this.stage = 1;
        this.roundInStage = 1; // 1..4 per stage
        this.phase = "prep"; // "prep" | "combat" | "augment" | "carousel" | "gameover"
        this.shopLocked = false;
        this.shop = [];
        this.scoutingPlayerId = "player";
        this.currentPairings = [];
        this.currentOpponent = null;
        this.predictedOpponents = [];
        this.roundMatchLogs = [];
        this.roomCode = roomData ? roomData.code : null;
        this.timeMode = roomData ? (roomData.timeMode || "standard") : "standard";
        this.pickRoundMap();

        const econ = window.CHESS_TFT_DATA.ECONOMY_RULES || {};
        const mods = (userProfile && userProfile.customModifiers) ? userProfile.customModifiers : {};

        const startHp = (mods.startingHp !== undefined && !isNaN(Number(mods.startingHp))) ? Number(mods.startingHp) : (econ.defaultStartingHp || 100);
        const startGold = (mods.startingGold !== undefined && !isNaN(Number(mods.startingGold)))
            ? Number(mods.startingGold)
            : (econ.defaultStartingGold || 6);
        const startLevel = Math.min(8, Math.max(1, (mods.startingLevel !== undefined && !isNaN(Number(mods.startingLevel))) ? Number(mods.startingLevel) : (econ.defaultStartingLevel || 3)));
        const bonusItems = Array.isArray(mods.bonusItems) ? [...mods.bonusItems] : ["stun_hammer", "burn_cloak"];
        const extraClock = Number(mods.extraClockSeconds) || 0;

        // Initialize Human Player with DB Account Modifiers
        this.player = {
            id: "player",
            userId: userProfile ? userProfile.id : "guest",
            name: userProfile ? `${userProfile.displayName || userProfile.username} (Bạn)` : "Bạn (Kỳ Thủ)",
            avatar: userProfile ? (userProfile.avatar || "👑") : "👑",
            isBot: false,
            hp: startHp,
            maxHp: startHp,
            gold: startGold,
            level: startLevel,
            xp: 0,
            extraClockSeconds: extraClock,
            streak: 0,
            freeRerolls: 0,
            lastStandTriggered: false,
            hasReceivedComebackPackageStage: {},
            fortuneLossStreak: 0,
            fortuneScore: 0,
            board: [],
            bench: Array(8).fill(null),
            items: bonusItems,
            augments: [],
            eliminated: false
        };

        // Place Player's default King & 2 starter units on Stage 1 board
        const cfg = this.getStageConfig();
        this.player.board.push({
            uid: this.nextUid("king"),
            id: "king",
            stars: 1,
            r: cfg.rows - 1,
            c: Math.floor(cfg.cols / 2),
            items: []
        });
        this.player.board.push({
            uid: this.nextUid("unit"),
            id: "shield_pawn",
            stars: 1,
            r: cfg.rows - 2,
            c: Math.floor(cfg.cols / 2),
            items: []
        });
        this.player.board.push({
            uid: this.nextUid("unit"),
            id: "archer",
            stars: 1,
            r: cfg.rows - 1,
            c: Math.max(0, Math.floor(cfg.cols / 2) - 1),
            items: []
        });

        // Build the other 7 participants: Real Room Friends first, then fill remaining slots with AI Bots!
        this.bots = [];
        const otherHumans = (roomData && Array.isArray(roomData.players))
            ? roomData.players.filter(p => p.id !== (userProfile && userProfile.id))
            : [];

        for (let i = 0; i < otherHumans.length && this.bots.length < 7; i++) {
            const h = otherHumans[i];
            const hMods = h.customModifiers || {};
            const hHp = Number(hMods.startingHp) || 100;
            const humanParticipant = {
                id: `human_${h.id}`,
                remoteUserId: h.id,
                name: `👤 ${h.name}`,
                avatar: h.avatar || "🦊",
                style: `Người Chơi (ELO ${h.elo || 1000})`,
                favTrait: "royal",
                isBot: false,
                isRemoteHuman: true,
                hp: hHp,
                maxHp: hHp,
                gold: Number(hMods.startingGold) || 6,
                level: Number(hMods.startingLevel) || 3,
                xp: 0,
                streak: 0,
                board: [],
                bench: [],
                items: [],
                augments: [],
                eliminated: false
            };
            this.initBotStarterBoard(humanParticipant, cfg);
            this.bots.push(humanParticipant);
        }

        const shouldFillBots = !roomData || roomData.fillBots !== false || this.bots.length === 0;
        if (shouldFillBots) {
            const botProfiles = window.CHESS_TFT_DATA.BOT_NAMES || [];
            let botIdx = 0;
            while (this.bots.length < 7 && botIdx < botProfiles.length) {
                const profile = botProfiles[botIdx];
                const bot = {
                    id: `bot_${botIdx}`,
                    name: profile.name,
                    avatar: profile.avatar,
                    style: profile.style,
                    favTrait: profile.favTrait,
                    isBot: true,
                    hp: econ.defaultStartingHp || 100,
                    maxHp: econ.defaultStartingHp || 100,
                    gold: econ.defaultStartingGold || 6,
                    level: 3,
                    xp: 0,
                    streak: 0,
                    board: [],
                    bench: [],
                    items: [],
                    augments: [],
                    eliminated: false
                };
                this.initBotStarterBoard(bot, cfg);
                this.bots.push(bot);
                botIdx++;
            }
        }

        this.rollShop(true);
        this.pickPotentialOpponents();
    }

    getAllParticipants() {
        return [this.player, ...this.bots];
    }

    getParticipantById(id) {
        if (id === "player") return this.player;
        return this.bots.find(b => b.id === id || b.remoteUserId === id) || this.player;
    }

    getStageConfig() {
        const s = Math.min(3, Math.max(1, this.stage));
        const base = window.CHESS_TFT_DATA.STAGE_CONFIG[s] || window.CHESS_TFT_DATA.STAGE_CONFIG[1];
        let mult = 1.0;
        if (this.timeMode === "relaxed") mult = 1.6;
        else if (this.timeMode === "blitz") mult = 0.65;
        return {
            ...base,
            blitzTime: Math.round(base.blitzTime * mult)
        };
    }

    getCurrentRoundDef() {
        const fmt = (window.CHESS_TFT_DATA && window.CHESS_TFT_DATA.STAGE_ROUNDS_FORMAT && window.CHESS_TFT_DATA.STAGE_ROUNDS_FORMAT[this.stage]) || [];
        return fmt.find(r => r.round === this.roundInStage) || { type: "combat", name: `Vòng ${this.stage}-${this.roundInStage}` };
    }

    getMaxUnitsAllowed(participant) {
        let cap = participant.level; // Level 3 -> 3 units (+1 free King = 4 total on board)
        if (participant.augments.includes("aug_tactical_expansion")) {
            cap += 1;
        }
        return cap;
    }

    getNonKingCount(participant) {
        return participant.board.filter(u => u.id !== "king").length;
    }

    initBotStarterBoard(bot, cfg) {
        bot.board = [
            {
                uid: this.nextUid("bking"),
                id: "king",
                stars: 1,
                r: cfg.rows - 1,
                c: Math.floor(cfg.cols / 2),
                items: []
            }
        ];
        this.upgradeBotArmy(bot);
    }

    // Re-fit board positions when Stage increases board dimensions (e.g., 5x6 -> 6x7 -> 8x8)
    rescaleBoardsForNewStage(oldCfg, newCfg) {
        const rowShift = newCfg.rows - oldCfg.rows;
        const colShift = Math.floor((newCfg.cols - oldCfg.cols) / 2);

        for (const p of this.getAllParticipants()) {
            const occupied = new Set();
            for (const unit of p.board) {
                let nr = Math.min(newCfg.rows - 1, Math.max(newCfg.rows - newCfg.deployRows, unit.r + rowShift));
                let nc = Math.min(newCfg.cols - 1, Math.max(0, unit.c + colShift));
                while (occupied.has(`${nr},${nc}`)) {
                    nc = (nc + 1) % newCfg.cols;
                    if (nc === 0) {
                        nr = nr > newCfg.rows - newCfg.deployRows ? nr - 1 : newCfg.rows - 1;
                    }
                }
                unit.r = nr;
                unit.c = nc;
                occupied.add(`${nr},${nc}`);
            }
        }
    }

    // Calculate active synergies for a participant's board
    calculateSynergies(participant) {
        const uniqueIdsByTrait = {};
        for (const unit of participant.board) {
            const def = window.CHESS_TFT_DATA.PIECES[unit.id];
            if (!def) continue;
            for (const t of def.traits) {
                if (!uniqueIdsByTrait[t]) uniqueIdsByTrait[t] = new Set();
                uniqueIdsByTrait[t].add(unit.id);
            }
        }

        const result = {};
        for (const [traitId, synDef] of Object.entries(window.CHESS_TFT_DATA.SYNERGIES)) {
            const count = uniqueIdsByTrait[traitId] ? uniqueIdsByTrait[traitId].size : 0;
            let activeTier = 0;
            for (const th of synDef.thresholds) {
                if (count >= th) activeTier = th;
            }
            if (count > 0) {
                result[traitId] = {
                    ...synDef,
                    count,
                    activeTier
                };
            }
        }
        return result;
    }

    // Roll 5 Shop Slots based on Player Level Odds
    rollShop(free = false) {
        if (!free) {
            if (this.player.freeRerolls > 0) {
                this.player.freeRerolls -= 1;
            } else {
                if (this.player.gold < 2) return false;
                this.player.gold -= 2;
            }
        }

        const odds = window.CHESS_TFT_DATA.SHOP_ODDS[this.player.level] || window.CHESS_TFT_DATA.SHOP_ODDS[8];
        const allPieces = Object.values(window.CHESS_TFT_DATA.PIECES).filter(p => !p.isKing);

        this.shop = [];
        for (let i = 0; i < 5; i++) {
            const roll = Math.random() * 100;
            let acc = 0;
            let chosenCost = 1;
            for (let tierIdx = 0; tierIdx < odds.length; tierIdx++) {
                acc += odds[tierIdx];
                if (roll <= acc) {
                    chosenCost = tierIdx + 1;
                    break;
                }
            }

            let pool = allPieces.filter(p => p.cost === chosenCost);
            if (pool.length === 0) pool = allPieces.filter(p => p.cost === 1);
            const picked = pool[Math.floor(Math.random() * pool.length)];
            this.shop.push({
                slotIndex: i,
                id: picked.id,
                cost: picked.cost,
                sold: false
            });
        }
        return true;
    }

    // Buy XP (4 Gold = 4 XP)
    buyXP() {
        if (this.player.level >= 8 || this.player.gold < 4) return false;
        this.player.gold -= 4;
        this.addPlayerXP(4);
        return true;
    }

    addPlayerXP(amount) {
        if (this.player.level >= 8) return;
        this.player.xp += amount;
        while (this.player.level < 8) {
            const needed = window.CHESS_TFT_DATA.LEVEL_XP[this.player.level];
            if (this.player.xp >= needed) {
                this.player.xp -= needed;
                this.player.level += 1;
            } else {
                break;
            }
        }
    }

    // Buy unit from Shop slot
    buyShopUnit(slotIndex) {
        const slot = this.shop[slotIndex];
        if (!slot || slot.sold) return { ok: false, msg: "Ô này đã bán!" };
        if (this.player.gold < slot.cost) return { ok: false, msg: "Không đủ Vàng!" };

        // Check if buying this unit triggers an immediate 3-of-a-kind merge even if bench is full
        const canInstantMerge = this.countMatchingUnits(this.player, slot.id, 1) >= 2;
        const emptyBenchIdx = this.player.bench.findIndex(b => b === null);

        // Also allow placing directly onto board if during prep & board has room
        const cfg = this.getStageConfig();
        const canPlaceOnBoard = this.phase === "prep" && this.getNonKingCount(this.player) < this.getMaxUnitsAllowed(this.player);

        if (emptyBenchIdx === -1 && !canInstantMerge && !canPlaceOnBoard) {
            return { ok: false, msg: "Hàng chờ (Bench) và Sân đấu đã đầy!" };
        }

        this.player.gold -= slot.cost;
        slot.sold = true;

        const newUnit = {
            uid: this.nextUid("unit"),
            id: slot.id,
            stars: 1,
            items: []
        };

        if (emptyBenchIdx !== -1) {
            this.player.bench[emptyBenchIdx] = newUnit;
        } else if (canPlaceOnBoard) {
            const spot = this.findFreeDeploySquare(this.player, cfg);
            newUnit.r = spot.r;
            newUnit.c = spot.c;
            this.player.board.push(newUnit);
        } else {
            // Temporary push for instant merge
            this.player.bench.push(newUnit);
        }

        const merged = this.checkAndMergeStars(this.player);
        // Ensure bench stays length 8
        if (this.player.bench.length > 8) {
            this.player.bench = this.player.bench.slice(0, 8);
        }

        return { ok: true, merged };
    }

    countMatchingUnits(participant, id, stars) {
        let count = 0;
        for (const u of participant.board) {
            if (u && u.id === id && u.stars === stars) count++;
        }
        for (const u of participant.bench) {
            if (u && u.id === id && u.stars === stars) count++;
        }
        return count;
    }

    // Automatic 3-of-a-kind Star Upgrade (1★ -> 2★ -> 3★)
    checkAndMergeStars(participant) {
        let anyMerged = false;
        let mergedInfo = null;

        let repeat = true;
        while (repeat) {
            repeat = false;
            const groups = {};

            // Collect from board first (so upgraded unit prefers staying on board)
            participant.board.forEach((u, idx) => {
                if (!u || u.isKing || u.stars >= 3) return;
                const key = `${u.id}_${u.stars}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push({ loc: "board", index: idx, unit: u });
            });

            participant.bench.forEach((u, idx) => {
                if (!u || u.stars >= 3) return;
                const key = `${u.id}_${u.stars}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push({ loc: "bench", index: idx, unit: u });
            });

            for (const key of Object.keys(groups)) {
                const list = groups[key];
                if (list.length >= 3) {
                    const trio = list.slice(0, 3);
                    const primary = trio[0];
                    const combinedItems = [];
                    for (const entry of trio) {
                        for (const it of (entry.unit.items || [])) {
                            if (combinedItems.length < 3) {
                                combinedItems.push(it);
                            } else if (!participant.isBot) {
                                participant.items.push(it);
                            }
                        }
                    }

                    // Upgrade primary unit
                    primary.unit.stars += 1;
                    primary.unit.items = combinedItems;

                    // Remove the 2nd and 3rd copies
                    for (let i = 2; i >= 1; i--) {
                        const rem = trio[i];
                        if (rem.loc === "board") {
                            participant.board = participant.board.filter(u => u.uid !== rem.unit.uid);
                        } else {
                            const bIdx = participant.bench.findIndex(u => u && u.uid === rem.unit.uid);
                            if (bIdx !== -1) participant.bench[bIdx] = null;
                        }
                    }

                    anyMerged = true;
                    mergedInfo = {
                        name: window.CHESS_TFT_DATA.PIECES[primary.unit.id].name,
                        stars: primary.unit.stars
                    };
                    repeat = true;
                    break;
                }
            }
        }

        return anyMerged ? mergedInfo : null;
    }

    findFreeDeploySquare(participant, cfg) {
        const minR = cfg.rows - cfg.deployRows;
        for (let r = cfg.rows - 1; r >= minR; r--) {
            for (let c = 0; c < cfg.cols; c++) {
                const taken = participant.board.some(u => u.r === r && u.c === c);
                if (!taken) return { r, c };
            }
        }
        return { r: cfg.rows - 1, c: 0 };
    }

    // Sell a unit from Board or Bench
    sellUnit(uid) {
        const bIdx = this.player.bench.findIndex(u => u && u.uid === uid);
        if (bIdx !== -1) {
            const unit = this.player.bench[bIdx];
            const refund = this.getUnitSellValue(unit);
            this.player.gold += refund;
            if (unit.items && unit.items.length > 0) {
                this.player.items.push(...unit.items);
            }
            this.player.bench[bIdx] = null;
            return { ok: true, refund, name: window.CHESS_TFT_DATA.PIECES[unit.id].name };
        }

        if (this.phase !== "prep") {
            return { ok: false, msg: "Không thể bán quân đang trên bàn cờ khi đang Giao Tranh!" };
        }

        const boardIdx = this.player.board.findIndex(u => u.uid === uid);
        if (boardIdx !== -1) {
            const unit = this.player.board[boardIdx];
            if (unit.id === "king") {
                return { ok: false, msg: "Không thể bán Quốc Vương (Vua)!" };
            }
            const refund = this.getUnitSellValue(unit);
            this.player.gold += refund;
            if (unit.items && unit.items.length > 0) {
                this.player.items.push(...unit.items);
            }
            this.player.board.splice(boardIdx, 1);
            return { ok: true, refund, name: window.CHESS_TFT_DATA.PIECES[unit.id].name };
        }

        return { ok: false, msg: "Không tìm thấy quân cờ!" };
    }

    getUnitSellValue(unit) {
        const base = window.CHESS_TFT_DATA.PIECES[unit.id]?.cost || 1;
        if (unit.stars === 1) return base;
        if (unit.stars === 2) return Math.max(2, base * 3 - 1);
        return Math.max(5, base * 9 - 2);
    }

    // Equip item from player inventory onto a unit (on board or bench)
    equipItem(itemIndex, targetUid) {
        const itemId = this.player.items[itemIndex];
        if (!itemId) return { ok: false, msg: "Trang bị không hợp lệ!" };

        let unit = this.player.board.find(u => u.uid === targetUid);
        if (!unit) unit = this.player.bench.find(u => u && u.uid === targetUid);
        if (!unit) return { ok: false, msg: "Không tìm thấy quân cờ!" };

        if (!unit.items) unit.items = [];
        if (unit.items.length >= 3) {
            return { ok: false, msg: "Quân cờ này đã mang tối đa 3 trang bị!" };
        }

        unit.items.push(itemId);
        this.player.items.splice(itemIndex, 1);
        return {
            ok: true,
            itemName: window.CHESS_TFT_DATA.ITEMS[itemId].name,
            unitName: window.CHESS_TFT_DATA.PIECES[unit.id].name
        };
    }

    // Unequip all items from a unit back to player inventory (during Prep Phase)
    unequipItems(targetUid) {
        if (this.phase !== "prep") {
            return { ok: false, msg: "Chỉ được gỡ trang bị trong giai đoạn Chuẩn Bị!" };
        }
        let unit = this.player.board.find(u => u.uid === targetUid);
        if (!unit) unit = this.player.bench.find(u => u && u.uid === targetUid);
        if (!unit) return { ok: false, msg: "Không tìm thấy quân cờ!" };

        if (!unit.items || unit.items.length === 0) {
            return { ok: false, msg: "Quân cờ này không mang trang bị nào!" };
        }

        const count = unit.items.length;
        this.player.items.push(...unit.items);
        unit.items = [];

        return {
            ok: true,
            count,
            unitName: window.CHESS_TFT_DATA.PIECES[unit.id]?.name || "Quân cờ"
        };
    }

    // Move unit between Bench <-> Board or reposition on Board during Prep Phase
    movePlayerUnitToBoard(uid, targetR, targetC) {
        if (this.phase !== "prep") return { ok: false, msg: "Chỉ được xếp đội hình trong giai đoạn Chuẩn Bị!" };
        const cfg = this.getStageConfig();
        const minR = cfg.rows - cfg.deployRows;
        if (targetR < minR || targetR >= cfg.rows || targetC < 0 || targetC >= cfg.cols) {
            return { ok: false, msg: `Chỉ được đặt quân trong ${cfg.deployRows} hàng sân nhà của bạn!` };
        }

        const existingOnTarget = this.player.board.find(u => u.r === targetR && u.c === targetC);
        const boardUnit = this.player.board.find(u => u.uid === uid);

        if (boardUnit) {
            // Repositioning on board
            if (existingOnTarget) {
                existingOnTarget.r = boardUnit.r;
                existingOnTarget.c = boardUnit.c;
            }
            boardUnit.r = targetR;
            boardUnit.c = targetC;
            return { ok: true };
        }

        // Moving from Bench to Board
        const benchIdx = this.player.bench.findIndex(u => u && u.uid === uid);
        if (benchIdx === -1) return { ok: false, msg: "Không tìm thấy quân cờ!" };
        const benchUnit = this.player.bench[benchIdx];

        if (existingOnTarget) {
            if (existingOnTarget.id === "king") {
                return { ok: false, msg: "Không thể cất Vua xuống hàng chờ!" };
            }
            // Swap bench unit with board unit
            this.player.bench[benchIdx] = {
                uid: existingOnTarget.uid,
                id: existingOnTarget.id,
                stars: existingOnTarget.stars,
                items: existingOnTarget.items
            };
            existingOnTarget.uid = benchUnit.uid;
            existingOnTarget.id = benchUnit.id;
            existingOnTarget.stars = benchUnit.stars;
            existingOnTarget.items = benchUnit.items;
            return { ok: true };
        } else {
            // Placing into empty square: check team size cap
            if (this.getNonKingCount(this.player) >= this.getMaxUnitsAllowed(this.player)) {
                return { ok: false, msg: `Đã đạt giới hạn quân cờ trên sân (${this.getMaxUnitsAllowed(this.player)} quân + Vua). Hãy lên Cấp để đặt thêm!` };
            }
            this.player.bench[benchIdx] = null;
            this.player.board.push({
                uid: benchUnit.uid,
                id: benchUnit.id,
                stars: benchUnit.stars,
                items: benchUnit.items || [],
                r: targetR,
                c: targetC
            });
            return { ok: true };
        }
    }

    moveBoardUnitToBench(uid, targetBenchIdx = -1) {
        if (this.phase !== "prep") return { ok: false, msg: "Chỉ được cất quân trong giai đoạn Chuẩn Bị!" };
        const bIdx = this.player.board.findIndex(u => u.uid === uid);
        if (bIdx === -1) return { ok: false, msg: "Quân cờ không ở trên sân!" };
        const unit = this.player.board[bIdx];
        if (unit.id === "king") {
            return { ok: false, msg: "Quốc Vương bắt buộc phải ở trên bàn cờ!" };
        }

        let slot = targetBenchIdx;
        if (slot < 0 || this.player.bench[slot] !== null) {
            slot = this.player.bench.findIndex(b => b === null);
        }
        if (slot === -1) return { ok: false, msg: "Hàng chờ đã đầy!" };

        this.player.board.splice(bIdx, 1);
        this.player.bench[slot] = {
            uid: unit.uid,
            id: unit.id,
            stars: unit.stars,
            items: unit.items || []
        };
        return { ok: true };
    }

    // Upgrade AI Bots between rounds so all 7 Bots build realistic, thematic armies
    upgradeAllBotsForRound() {
        const cfg = this.getStageConfig();
        const allPieces = Object.values(window.CHESS_TFT_DATA.PIECES).filter(p => !p.isKing);
        const itemIds = Object.keys(window.CHESS_TFT_DATA.ITEMS);

        for (const bot of this.bots) {
            if (bot.eliminated) continue;
            // Bot levels up with stage/round
            const targetLevel = Math.min(8, 2 + this.stage + Math.floor(this.roundInStage / 2));
            bot.level = Math.max(bot.level, targetLevel);
            this.upgradeBotArmy(bot);

            // Give Bot occasional items and upgrades
            if (Math.random() < 0.45) {
                const nonKing = bot.board.filter(u => !u.isKing);
                if (nonKing.length > 0) {
                    const lucky = nonKing[Math.floor(Math.random() * nonKing.length)];
                    if (this.stage >= 2 && lucky.stars === 1 && Math.random() < 0.5) {
                        lucky.stars = 2;
                    } else if (this.stage >= 3 && lucky.stars === 2 && Math.random() < 0.25) {
                        lucky.stars = 3;
                    }
                    if (lucky.items.length < 2 && Math.random() < 0.5) {
                        lucky.items.push(itemIds[Math.floor(Math.random() * itemIds.length)]);
                    }
                }
            }
            this.positionBotBoard(bot, cfg);
        }
    }

    upgradeBotArmy(bot) {
        const cfg = this.getStageConfig();
        const maxAllowed = this.getMaxUnitsAllowed(bot);
        const allPieces = Object.values(window.CHESS_TFT_DATA.PIECES).filter(p => !p.isKing);
        const maxCost = Math.min(5, this.stage + 2);

        while (this.getNonKingCount(bot) < maxAllowed) {
            // Prefer units matching bot's favorite trait
            let pool = allPieces.filter(p => p.cost <= maxCost && p.traits.includes(bot.favTrait));
            if (pool.length === 0 || Math.random() < 0.35) {
                pool = allPieces.filter(p => p.cost <= maxCost);
            }
            const pick = pool[Math.floor(Math.random() * pool.length)];
            const spot = this.findFreeDeploySquare(bot, cfg);
            bot.board.push({
                uid: this.nextUid("bunit"),
                id: pick.id,
                stars: this.stage >= 2 && Math.random() < 0.3 ? 2 : 1,
                r: spot.r,
                c: spot.c,
                items: []
            });
        }
        this.positionBotBoard(bot, cfg);
    }

    positionBotBoard(bot, cfg) {
        const occupied = new Set();
        const backR = cfg.rows - 1;
        const frontR = cfg.rows - cfg.deployRows;

        // Place King safely in the back row near center
        const king = bot.board.find(u => u.id === "king");
        if (king) {
            king.r = backR;
            king.c = Math.min(cfg.cols - 1, Math.max(0, Math.floor(cfg.cols / 2)));
            occupied.add(`${king.r},${king.c}`);
        }

        // Place Vanguards/Melees in front row, Rangers/Mages in back row
        for (const u of bot.board) {
            if (u.id === "king") continue;
            const def = window.CHESS_TFT_DATA.PIECES[u.id];
            const prefersFront = def.traits.includes("vanguard") || def.traits.includes("cavalry") || u.id === "shield_pawn";
            let targetR = prefersFront ? frontR : backR;
            let placed = false;

            const rowOrder = prefersFront
                ? Array.from({ length: cfg.deployRows }, (_, i) => frontR + i)
                : Array.from({ length: cfg.deployRows }, (_, i) => backR - i);

            for (const r of rowOrder) {
                for (let c = 0; c < cfg.cols; c++) {
                    if (!occupied.has(`${r},${c}`)) {
                        u.r = r;
                        u.c = c;
                        occupied.add(`${r},${c}`);
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
        }
    }

    // Generate 2-3 potential upcoming opponents for the Prep phase so player can scout them
    // Generate 2-3 potential upcoming opponents for the Prep phase so player can scout them
    pickPotentialOpponents() {
        if (this.stage === 1) {
            const pveEncounters = window.CHESS_TFT_DATA.PVE_ENCOUNTERS || {};
            const pveData = pveEncounters[this.roundInStage] || pveEncounters[1];
            this.predictedOpponents = [{
                id: `pve_${this.stage}_${this.roundInStage}`,
                name: pveData.name,
                avatar: pveData.avatar || "👾",
                isPve: true,
                level: 1,
                hp: 100,
                gold: 0,
                augments: [],
                items: [],
                board: pveData.units.map(u => ({
                    uid: `pve_${u.id}_${u.r}_${u.c}`,
                    id: u.id,
                    name: u.name,
                    r: u.r,
                    c: u.c,
                    stars: u.stars || 1,
                    items: []
                }))
            }];
            return this.predictedOpponents;
        }

        const aliveOthers = this.getAllParticipants().filter(p => !p.eliminated && p.id !== "player");
        if (aliveOthers.length === 0) {
            this.predictedOpponents = [];
            return [];
        }
        const shuffled = [...aliveOthers].sort(() => Math.random() - 0.5);
        const count = Math.min(3, shuffled.length);
        this.predictedOpponents = shuffled.slice(0, count);
        return this.predictedOpponents;
    }

    getPotentialOpponents() {
        if (!this.predictedOpponents || this.predictedOpponents.length === 0) {
            return this.pickPotentialOpponents();
        }
        return this.predictedOpponents;
    }

    pickRoundMap() {
        const maps = window.CHESS_TFT_DATA.MAPS;
        const mapIdx = (this.stage * 3 + this.roundInStage) % maps.length;
        this.currentMap = maps[mapIdx];
        const cfg = this.getStageConfig();
        this.currentTerrain = this.currentMap.generateTerrain(cfg.cols, cfg.rows);
        return this.currentMap;
    }

    // Create 1v1 Pairings for the current round and set combat phase
    prepareCombatRound() {
        // Stage 1: PVE Creep Encounter (Tượng Quái Đá Khởi Đầu)
        if (this.stage === 1) {
            const pveEncounters = window.CHESS_TFT_DATA.PVE_ENCOUNTERS || {};
            const pveData = pveEncounters[this.roundInStage] || pveEncounters[1];
            this.currentOpponent = {
                id: `pve_${this.stage}_${this.roundInStage}`,
                name: pveData.name,
                avatar: pveData.avatar || "👾",
                desc: pveData.desc,
                isPve: true,
                level: 1,
                hp: 100,
                gold: 0,
                augments: [],
                items: [],
                board: pveData.units.map(u => ({
                    uid: `pve_${u.id}_${u.r}_${u.c}`,
                    id: u.id,
                    name: u.name,
                    r: u.r,
                    c: u.c,
                    stars: u.stars || 1,
                    items: []
                }))
            };

            this.currentPairings = [[this.player, this.currentOpponent]];
            const aliveOthers = this.getAllParticipants().filter(p => !p.eliminated && p.id !== "player");
            aliveOthers.forEach(b => {
                this.currentPairings.push([b, { ...this.currentOpponent, id: `pve_${b.id}` }]);
            });

            if (!this.currentMap || !this.currentTerrain) {
                this.pickRoundMap();
            }
            this.phase = "combat";
            this.scoutingPlayerId = "player";
            return;
        }

        const alive = this.getAllParticipants().filter(p => !p.eliminated);
        const others = alive.filter(p => p.id !== "player");

        // Pick player's opponent from the predicted pool so scouting was accurate!
        let chosenOpp = null;
        if (this.predictedOpponents && this.predictedOpponents.length > 0) {
            const validCandidates = this.predictedOpponents.filter(p => !p.eliminated);
            if (validCandidates.length > 0) {
                chosenOpp = validCandidates[Math.floor(Math.random() * validCandidates.length)];
            }
        }
        if (!chosenOpp && others.length > 0) {
            chosenOpp = others[Math.floor(Math.random() * others.length)];
        }

        this.currentPairings = [];
        if (chosenOpp) {
            this.currentOpponent = chosenOpp;
            this.currentPairings.push([this.player, this.currentOpponent]);

            const remainingOthers = others.filter(p => p.id !== chosenOpp.id);
            for (let i = remainingOthers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [remainingOthers[i], remainingOthers[j]] = [remainingOthers[j], remainingOthers[i]];
            }

            for (let i = 0; i < remainingOthers.length; i += 2) {
                if (i + 1 < remainingOthers.length) {
                    this.currentPairings.push([remainingOthers[i], remainingOthers[i + 1]]);
                } else {
                    this.currentPairings.push([remainingOthers[i], this.player]);
                }
            }
        }

        if (!this.currentMap || !this.currentTerrain) {
            this.pickRoundMap();
        }
        this.phase = "combat";
        this.scoutingPlayerId = "player";
    }

    // Build mirrored enemy pieces for top of the board (flipped vertically & horizontally)
    getMirroredEnemyPieces(opponent, cfg) {
        if (opponent && opponent.isPve) {
            return opponent.board.map(u => ({
                ...u,
                r: u.r,
                c: u.c,
                items: [...(u.items || [])]
            }));
        }
        return opponent.board.map(u => ({
            ...u,
            r: (cfg.rows - 1) - u.r,
            c: (cfg.cols - 1) - u.c,
            items: [...(u.items || [])]
        }));
    }

    // ========================================================================
    // EXACT PLAYER HP DAMAGE FORMULAS (Checkmate vs King Capture vs Draw)
    // ========================================================================
    calculateMatchDamage(winnerParticipant, resultType, winnerPiecesLeft, loserPiecesLeft) {
        const df = window.CHESS_TFT_DATA.DAMAGE_FORMULA || {};
        if (resultType === "draw") {
            const drawBase = df.drawBase !== undefined ? Number(df.drawBase) : 4;
            const drawDmg = drawBase + this.stage;
            return {
                damage: drawDmg,
                formulaText: `Hòa Cờ: Cả 2 bên bị trừ ${drawDmg} Máu (${drawBase} + Stage ${this.stage})`
            };
        }

        const syn = winnerParticipant ? this.calculateSynergies(winnerParticipant) : {};
        const royalBonus = (syn.royal && syn.royal.activeTier >= 2) ? 4 : 0;

        if (resultType === "checkmate" || resultType === "timeout") {
            const cmBase = df.checkmateBase !== undefined ? Number(df.checkmateBase) : 8;
            const cmMult = df.checkmateStageMult !== undefined ? Number(df.checkmateStageMult) : 2;
            const cmPerUnit = df.checkmatePerUnit !== undefined ? Number(df.checkmatePerUnit) : 2;

            const base = cmBase + this.stage * cmMult;
            const unitDmg = (winnerPiecesLeft || 0) * cmPerUnit;
            const total = base + unitDmg + royalBonus;
            return {
                damage: total,
                formulaText: `Chiếu Hết / Hết Giờ (Trừ Nặng): ${base} (Cơ bản) + ${unitDmg} (${winnerPiecesLeft} quân sống x${cmPerUnit})${royalBonus ? ` + ${royalBonus} (Hoàng Gia)` : ""} = -${total} Máu!`
            };
        } else if (resultType === "pieces_eliminated" || resultType === "draw_advantage") {
            // CƠ CHẾ MỚI: Hết Cờ Trừ Vua & Luật Hòa Hơn Cờ (Sát thương tính theo chênh lệch quân số)
            const kcBase = df.kingCaptureBase !== undefined ? Number(df.kingCaptureBase) : 3;
            const kcMult = df.kingCaptureStageMult !== undefined ? Number(df.kingCaptureStageMult) : 1;

            const base = kcBase + this.stage * kcMult;
            const diff = Math.max(1, (winnerPiecesLeft || 0) - (loserPiecesLeft || 0));
            const total = base + diff + royalBonus;
            const label = resultType === "pieces_eliminated"
                ? "Hết Cờ Đặt Trên Sân Trừ Vua (Luật Hơn Cờ)"
                : "Hòa Hơn Cờ (Nhiều Quân Hơn)";
            return {
                damage: total,
                formulaText: `${label}: ${base} (Cơ bản Stage ${this.stage}) + ${diff} (Hơn ${diff} quân trên sân)${royalBonus ? ` + ${royalBonus} (Hoàng Gia)` : ""} = -${total} Máu!`
            };
        } else {
            // "king_captured" -> Forgot they were in check and got King eaten!
            const kcBase = df.kingCaptureBase !== undefined ? Number(df.kingCaptureBase) : 3;
            const kcMult = df.kingCaptureStageMult !== undefined ? Number(df.kingCaptureStageMult) : 1;

            const base = kcBase + this.stage * kcMult;
            const diff = Math.max(0, (winnerPiecesLeft || 0) - (loserPiecesLeft || 0));
            const total = base + diff + royalBonus;
            return {
                damage: total,
                formulaText: `Quên Đỡ Chiếu Bị Ăn Vua (Trừ Nhẹ + Chênh Lệch Cờ): ${base} (Cơ bản) + ${diff} (Chênh lệch ${winnerPiecesLeft} - ${loserPiecesLeft} quân)${royalBonus ? ` + ${royalBonus} (Hoàng Gia)` : ""} = -${total} Máu!`
            };
        }
    }

    // Resolve Player Match & Simulate Other 3 Bot-vs-Bot Matches
    resolveRoundResults(playerMatchResult, goldFromMercenary = 0) {
        this.roundMatchLogs = [];
        const opp = this.currentOpponent;

        // 1. Apply Player vs Current Opponent Result
        this.player.gold += goldFromMercenary;
        this.lastPveDrops = null;

        // Xử lý riêng cho Vòng Quái Khởi Đầu PVE (Stage 1)
        if (opp && (opp.isPve || this.stage === 1)) {
            const pveEncounters = window.CHESS_TFT_DATA.PVE_ENCOUNTERS || {};
            const pveData = pveEncounters[this.roundInStage] || pveEncounters[1];
            const dropGold = pveData.dropGold || (this.roundInStage + 1);
            this.player.gold += dropGold;

            // Rơi 1-2 mảnh trang bị khởi đầu định hình đội hình
            const dropItems = pveData.dropItems || ["iron_armor", "stun_hammer", "burn_cloak", "sniper_scope", "phase_boots"];
            const itemKey1 = dropItems[Math.floor(Math.random() * dropItems.length)];
            this.player.items.push(itemKey1);

            let itemKey2 = null;
            if (this.roundInStage === 3) {
                // Round 1-3 rơi 2 trang bị
                const remaining = dropItems.filter(k => k !== itemKey1);
                itemKey2 = (remaining.length > 0 ? remaining : dropItems)[Math.floor(Math.random() * dropItems.length)];
                this.player.items.push(itemKey2);
            }

            const itemDef1 = window.CHESS_TFT_DATA.ITEMS[itemKey1];
            const itemDef2 = itemKey2 ? window.CHESS_TFT_DATA.ITEMS[itemKey2] : null;
            const itemNames = [itemDef1 ? `${itemDef1.name} ${itemDef1.icon}` : itemKey1];
            if (itemDef2) itemNames.push(`${itemDef2.name} ${itemDef2.icon}`);

            this.lastPveDrops = {
                gold: dropGold,
                items: itemKey2 ? [itemKey1, itemKey2] : [itemKey1],
                itemNames
            };

            this.roundMatchLogs.push({
                isPlayerMatch: true,
                isPve: true,
                summary: `🎁 Dọn Sạch ${opp.name}: Rơi ra +${dropGold}🪙 Vàng & Trang Bị [${itemNames.join(" + ")}]!`
            });

            // Các Bot cũng hạ gục quái để nhận vàng và trang bị chuẩn TFT
            this.bots.forEach(b => {
                if (!b.eliminated) {
                    b.gold = (b.gold || 0) + dropGold;
                    if (!b.items) b.items = [];
                    const botItem = dropItems[Math.floor(Math.random() * dropItems.length)];
                    b.items.push(botItem);
                }
            });

            return;
        }

        // Xử lý Hòa Hơn Cờ nếu kết quả hòa nhưng có chênh lệch quân số
        if (playerMatchResult.winner === "draw") {
            const pCount = playerMatchResult.playerPiecesLeft || 0;
            const eCount = playerMatchResult.enemyPiecesLeft || 0;
            if (pCount > eCount) {
                playerMatchResult.winner = "player";
                playerMatchResult.reason = "draw_advantage";
                playerMatchResult.reasonLabel = `Hòa Hơn Cờ (Bạn còn ${pCount} vs Đối thủ ${eCount} quân)`;
            } else if (eCount > pCount) {
                playerMatchResult.winner = "enemy";
                playerMatchResult.reason = "draw_advantage";
                playerMatchResult.reasonLabel = `Hòa Hơn Cờ (Đối thủ còn ${eCount} vs Bạn ${pCount} quân)`;
            }
        }

        if (playerMatchResult.winner === "draw") {
            const dmgInfo = this.calculateMatchDamage(null, "draw", playerMatchResult.playerPiecesLeft, playerMatchResult.enemyPiecesLeft);
            this.player.hp = Math.max(0, this.player.hp - dmgInfo.damage);
            opp.hp = Math.max(0, opp.hp - dmgInfo.damage);
            this.player.streak = 0;
            opp.streak = 0;
            this.roundMatchLogs.push({
                isPlayerMatch: true,
                summary: `⚖️ Hòa Bằng Cờ với ${opp.name}! (${dmgInfo.formulaText})`
            });
        } else if (playerMatchResult.winner === "player") {
            const dmgInfo = this.calculateMatchDamage(
                this.player,
                playerMatchResult.reason,
                playerMatchResult.playerPiecesLeft,
                playerMatchResult.enemyPiecesLeft
            );
            opp.hp = Math.max(0, opp.hp - dmgInfo.damage);
            this.player.gold += 1; // +1 Gold for winning combat
            this.player.streak = this.player.streak > 0 ? this.player.streak + 1 : 1;
            opp.streak = opp.streak < 0 ? opp.streak - 1 : -1;
            this.roundMatchLogs.push({
                isPlayerMatch: true,
                summary: `🏆 Bạn thắng ${opp.name} (${playerMatchResult.reasonLabel || "Chiến Thắng"})! ${dmgInfo.formulaText}`
            });
        } else {
            const dmgInfo = this.calculateMatchDamage(
                opp,
                playerMatchResult.reason,
                playerMatchResult.enemyPiecesLeft,
                playerMatchResult.playerPiecesLeft
            );
            this.player.hp = Math.max(0, this.player.hp - dmgInfo.damage);
            opp.gold += 1;
            this.player.streak = this.player.streak < 0 ? this.player.streak - 1 : -1;
            opp.streak = opp.streak > 0 ? opp.streak + 1 : 1;
            this.roundMatchLogs.push({
                isPlayerMatch: true,
                summary: `💔 Bạn thua ${opp.name} (${playerMatchResult.reasonLabel || "Thất Bại"})! ${dmgInfo.formulaText}`
            });
        }

        // Last Stand Comeback Mechanism (Ý Chí Phục Thù khi Máu <= 25)
        this.lastStandTriggeredThisRound = false;
        if (this.player.hp > 0 && this.player.hp <= 25 && !this.player.lastStandTriggered) {
            this.player.lastStandTriggered = true;
            this.lastStandTriggeredThisRound = true;
            this.player.gold += 15;
            this.player.extraClockSeconds = (this.player.extraClockSeconds || 0) + 15;
            const king = this.player.board.find(u => u.id === "king");
            if (king) {
                king.maxHp = (king.maxHp || 1) + 1;
                king.hp = (king.hp || 1) + 1;
            }
            this.roundMatchLogs.push({
                isPlayerMatch: true,
                isComeback: true,
                summary: `🛡️ Ý CHÍ PHỤC THÙ ĐÃ KÍCH HOẠT! Máu nguy cấp (<= 25 HP): Tặng ngay +15🪙, Vua nhận +1 Lớp Máu bảo hộ vĩnh viễn & +15s Đồng Hồ cờ chớp!`
            });
        }

        // Fortune (Đạo Tặc / Nổ Hũ) processing
        this.lastFortuneCashout = null;
        const playerSyn = this.calculateSynergies(this.player);
        const hasFortune = playerSyn.fortune && playerSyn.fortune.activeTier >= 3;

        if (playerMatchResult.winner === "player") {
            if (hasFortune && (this.player.fortuneLossStreak || 0) > 0) {
                const streak = this.player.fortuneLossStreak;
                const score = this.player.fortuneScore || 0;
                let cashoutGold = 0;
                let cashoutItems = [];
                let cashoutPieces = [];

                if (streak === 1) {
                    cashoutGold = 6 + Math.floor(Math.random() * 3);
                } else if (streak === 2) {
                    cashoutGold = 10 + Math.floor(Math.random() * 4);
                } else if (streak === 3) {
                    cashoutGold = 16 + Math.floor(Math.random() * 5);
                    const allItems = Object.keys(window.CHESS_TFT_DATA.ITEMS);
                    cashoutItems.push(allItems[Math.floor(Math.random() * allItems.length)]);
                } else if (streak === 4) {
                    cashoutGold = 24 + Math.floor(Math.random() * 6);
                    const allItems = Object.keys(window.CHESS_TFT_DATA.ITEMS);
                    cashoutItems.push(allItems[Math.floor(Math.random() * allItems.length)]);
                } else {
                    cashoutGold = 35 + streak * 5;
                    const allItems = Object.keys(window.CHESS_TFT_DATA.ITEMS);
                    cashoutItems.push(allItems[Math.floor(Math.random() * allItems.length)]);
                    cashoutItems.push(allItems[Math.floor(Math.random() * allItems.length)]);
                    const legendaries = ["grand_queen", "chancellor"];
                    cashoutPieces.push(legendaries[Math.floor(Math.random() * legendaries.length)]);
                }

                this.player.gold += cashoutGold;
                for (const it of cashoutItems) {
                    this.player.items.push(it);
                }
                for (const pid of cashoutPieces) {
                    const freeBench = this.player.bench.findIndex(b => b === null);
                    if (freeBench !== -1) {
                        this.player.bench[freeBench] = {
                            uid: this.nextUid("unit"),
                            id: pid,
                            stars: 1,
                            items: []
                        };
                    }
                }

                this.lastFortuneCashout = {
                    streak,
                    score,
                    gold: cashoutGold,
                    items: cashoutItems,
                    pieces: cashoutPieces
                };

                let rewardDetails = `+${cashoutGold}🪙`;
                if (cashoutItems.length) rewardDetails += `, Trang bị: ${cashoutItems.map(it => window.CHESS_TFT_DATA.ITEMS[it]?.name || it).join(", ")}`;
                if (cashoutPieces.length) rewardDetails += `, Tướng 5🪙: ${cashoutPieces.map(p => window.CHESS_TFT_DATA.PIECES[p]?.name || p).join(", ")}`;

                this.roundMatchLogs.push({
                    isPlayerMatch: true,
                    isFortune: true,
                    summary: `🎰 NỔ HŨ THÀNH CÔNG (Chuỗi ${streak} trận thua)! Phần thưởng: ${rewardDetails}`
                });

                this.player.fortuneLossStreak = 0;
                this.player.fortuneScore = 0;
            }
        } else if (playerMatchResult.winner === "enemy" || playerMatchResult.winner === "draw") {
            if (hasFortune) {
                this.player.fortuneLossStreak = (this.player.fortuneLossStreak || 0) + 1;
                const pointsAdded = Math.min(30, 2 + this.player.fortuneLossStreak * 3);
                this.player.fortuneScore = (this.player.fortuneScore || 0) + pointsAdded;
                this.roundMatchLogs.push({
                    isPlayerMatch: true,
                    isFortune: true,
                    summary: `🎰 Tộc Đạo Tặc tích lũy Rương May Mắn: Chuỗi ${this.player.fortuneLossStreak} thua (+${pointsAdded} điểm hũ, tổng ${this.player.fortuneScore}đ)!`
                });
            }
        }

        // 2. Simulate the remaining Bot-vs-Bot pairings
        for (let i = 1; i < this.currentPairings.length; i++) {
            const [b1, b2] = this.currentPairings[i];
            if (b2.id === "player") continue; // Ghost match

            const rRoll = Math.random();
            if (rRoll < 0.12) {
                const dmg = 4 + this.stage;
                b1.hp = Math.max(0, b1.hp - dmg);
                b2.hp = Math.max(0, b2.hp - dmg);
                this.roundMatchLogs.push({
                    isPlayerMatch: false,
                    summary: `⚖️ ${b1.name} hòa ${b2.name} (-${dmg} Máu mỗi bên)`
                });
            } else {
                const b1Power = b1.board.reduce((s, u) => s + u.stars * 2 + (u.items?.length || 0), 0) + Math.random() * 6;
                const b2Power = b2.board.reduce((s, u) => s + u.stars * 2 + (u.items?.length || 0), 0) + Math.random() * 6;
                const winner = b1Power >= b2Power ? b1 : b2;
                const loser = b1Power >= b2Power ? b2 : b1;
                const rType = Math.random();
                let outcomeType = "pieces_eliminated";
                let outcomeLabel = "Quét Sạch Cờ";
                if (rType < 0.45) {
                    outcomeType = "pieces_eliminated";
                    outcomeLabel = "Quét Sạch Cờ";
                } else if (rType < 0.78) {
                    outcomeType = "checkmate";
                    outcomeLabel = "Chiếu Hết";
                } else {
                    outcomeType = "king_captured";
                    outcomeLabel = "Ăn Vua";
                }
                const winUnits = Math.max(2, Math.floor(Math.random() * winner.board.length) + 1);
                const loseUnits = outcomeType === "pieces_eliminated" ? 1 : Math.max(1, Math.floor(Math.random() * 2));
                const dmgInfo = this.calculateMatchDamage(
                    winner,
                    outcomeType,
                    winUnits,
                    loseUnits
                );
                loser.hp = Math.max(0, loser.hp - dmgInfo.damage);
                this.roundMatchLogs.push({
                    isPlayerMatch: false,
                    summary: `⚔️ ${winner.name} hạ ${loser.name} bằng ${outcomeLabel} (-${dmgInfo.damage} Máu)`
                });
            }
        }

        // Check eliminations
        for (const p of this.getAllParticipants()) {
            if (p.hp <= 0 && !p.eliminated) {
                p.eliminated = true;
                this.roundMatchLogs.push({
                    isPlayerMatch: p.id === "player",
                    summary: `☠️ ${p.name} đã bị loại khỏi Đấu Trường!`
                });
            }
        }
    }

    // Generate 3 strategic reward options for Stage Armory Transition (Đề xuất 1: Kho Tiếp Tế Chiến Trường)
    generateStageArmoryChoices(newStage) {
        if (newStage === 2) {
            // Stage 1 -> 2 (Early to Mid game)
            const stage2Items = ["crown_promotion", "cape_sunfire", "frozen_staff", "thorn_armor", "gunblade_vamp", "rfc_cannon"];
            const chosenItemKey = stage2Items[Math.floor(Math.random() * stage2Items.length)];
            const itemDef = window.CHESS_TFT_DATA.ITEMS[chosenItemKey] || { name: "Vương Miện Phong Cấp", desc: "+1 Lớp Máu & Tự động Phong Cấp Hậu khi tiến sát sân địch!" };

            const pairOptions = [
                {
                    title: "Quân Đoàn Băng Giá",
                    pieces: ["frost_rook", "frost_knight"],
                    desc: "Chiêu mộ ngay Xe Băng (4🪙) và Kỵ Sĩ Băng (2🪙) kích hoạt mốc 2 Băng Quốc làm chậm kẻ địch!"
                },
                {
                    title: "Băng Đao Phủ & Xạ Thủ",
                    pieces: ["mercenary", "archer"],
                    desc: "Chiêu mộ ngay Đao Phủ (4🪙) và Cung Thủ (2🪙) kích hoạt mốc Xạ Thủ & Kỵ Binh càn quét!"
                },
                {
                    title: "Quân Đoàn Hỏa Ngục",
                    pieces: ["fire_mage", "pyro_bishop"],
                    desc: "Chiêu mộ ngay Pháp Sư Lửa (4🪙) và Tượng Hỏa (2🪙) kích hoạt mốc Hỏa Ngục thiêu đốt nổ lan!"
                }
            ];
            const chosenPair = pairOptions[Math.floor(Math.random() * pairOptions.length)];

            return [
                {
                    type: "item",
                    tag: "🛡️ TRANG BỊ ĐỘT PHÁ",
                    title: itemDef.name,
                    icon: "⚔️",
                    itemKey: chosenItemKey,
                    desc: itemDef.desc || "Trang bị hoàn chỉnh nâng cao chỉ số tác chiến tức thì.",
                    btnText: `Nhận ${itemDef.name}`
                },
                {
                    type: "pieces",
                    tag: "♟️ VIỆN TRỢ TƯỚNG",
                    title: chosenPair.title,
                    icon: "👑",
                    pieces: chosenPair.pieces,
                    desc: chosenPair.desc,
                    btnText: "Chiêu Mộ 2 Tướng"
                },
                {
                    type: "economy",
                    tag: "💰 KHO BÁU & ROLL",
                    title: "Kho Vàng Hoàng Gia & Lượt Roll",
                    icon: "💎",
                    gold: 12,
                    freeRerolls: 2,
                    xp: 4,
                    desc: "Nhận ngay +12 Vàng tích lũy, 2 Vé Đổi Lại Miễn Phí (Free Rerolls) và +4 EXP thăng cấp sàn đấu!",
                    btnText: "Nhận +12🪙, 2 Roll, +4 EXP"
                }
            ];
        } else {
            // Stage 3+ (Mid to Late game)
            const stage3Items = ["crown_promotion", "sword_death", "gunblade_vamp", "frozen_staff"];
            const chosenItemKey = stage3Items[Math.floor(Math.random() * stage3Items.length)];
            const itemDef = window.CHESS_TFT_DATA.ITEMS[chosenItemKey] || { name: "Vương Miện Cờ Vua Thần Thoại", desc: "+1 Slot tướng trên bàn cờ" };

            const lateOptions = [
                {
                    title: "Nữ Hoàng & Đao Phủ",
                    pieces: ["grand_queen", "cannon"],
                    desc: "Chiêu mộ Nữ Hoàng Tối Thượng (5🪙) toàn năng và Pháo Cao Xạ (3🪙) bắn tầm xa bá đạo!"
                },
                {
                    title: "Đại Thừa Tướng & Thần Bạc",
                    pieces: ["chancellor", "gambler"],
                    desc: "Chiêu mộ Đại Thừa Tướng (5🪙 Xe + Mã kết hợp) và Con Bạc (3🪙 nổ vàng)!"
                }
            ];
            const chosenLate = lateOptions[Math.floor(Math.random() * lateOptions.length)];

            return [
                {
                    type: "item",
                    tag: "👑 VŨ KHÍ THẦN THOẠI",
                    title: `${itemDef.name} (+5🪙)`,
                    icon: "⚔️",
                    itemKey: chosenItemKey,
                    bonusGold: 5,
                    desc: `${itemDef.desc} (Kèm theo +5 Vàng viện trợ chiến trường)`,
                    btnText: `Nhận ${itemDef.name} + 5🪙`
                },
                {
                    type: "pieces",
                    tag: "🌟 VIỆN TRỢ SIÊU CẤP",
                    title: chosenLate.title,
                    icon: "👑",
                    pieces: chosenLate.pieces,
                    desc: chosenLate.desc,
                    btnText: "Chiêu Mộ Tướng 5🪙"
                },
                {
                    type: "economy",
                    tag: "💎 KHO BÁU ĐẠI ĐẾ",
                    title: "Kho Vàng & Bão Roll Miễn Phí",
                    icon: "💰",
                    gold: 20,
                    freeRerolls: 4,
                    xp: 8,
                    desc: "Nhận ngay +20 Vàng cực lớn, 4 Vé Đổi Lại Miễn Phí và +8 EXP để thăng cấp 7-8 xoay bài thần tốc!",
                    btnText: "Nhận +20🪙, 4 Roll, +8 EXP"
                }
            ];
        }
    }

    // Claim selected Stage Armory reward package
    claimArmoryChoice(choiceIndex) {
        if (!this.currentArmoryChoices || !this.currentArmoryChoices[choiceIndex]) return { ok: false };
        const choice = this.currentArmoryChoices[choiceIndex];

        if (choice.type === "item") {
            if (choice.itemKey) {
                this.player.items.push(choice.itemKey);
            }
            if (choice.bonusGold) {
                this.player.gold += choice.bonusGold;
            }
        } else if (choice.type === "pieces" && Array.isArray(choice.pieces)) {
            for (const pid of choice.pieces) {
                const emptyBench = this.player.bench.findIndex(b => b === null);
                if (emptyBench !== -1) {
                    this.player.bench[emptyBench] = {
                        uid: this.nextUid("unit"),
                        id: pid,
                        stars: 1,
                        items: []
                    };
                    this.checkAndMergeStars(this.player);
                } else {
                    const cost = window.CHESS_TFT_DATA.PIECES[pid]?.cost || 3;
                    this.player.gold += cost;
                }
            }
        } else if (choice.type === "economy") {
            if (choice.gold) this.player.gold += choice.gold;
            if (choice.freeRerolls) this.player.freeRerolls = (this.player.freeRerolls || 0) + choice.freeRerolls;
            if (choice.xp) this.addPlayerXP(choice.xp);
        }

        // Give Bot participants an armory bump as well so AI stays competitive
        this.bots.forEach((b) => {
            if (!b.eliminated) {
                b.gold = (b.gold || 0) + 6;
                b.level = Math.min(8, (b.level || 3) + 1);
            }
        });

        this.currentArmoryChoices = null;
        this.phase = "prep";
        this.pickPotentialOpponents();
        return { ok: true, choice };
    }

    // Advance to next Round / Stage and award TFT Income (Base + Interest + Streak + XP)
    advanceToNextRound() {
        const aliveBots = this.bots.filter(b => !b.eliminated);
        if (this.player.eliminated || aliveBots.length === 0) {
            this.phase = "gameover";
            return { phase: "gameover" };
        }

        const oldCfg = this.getStageConfig();

        // TFT Stage Format: Stage 1 has 3 rounds, Stage 2+ has 5 rounds
        const currentStageFmt = (window.CHESS_TFT_DATA.STAGE_ROUNDS_FORMAT && window.CHESS_TFT_DATA.STAGE_ROUNDS_FORMAT[this.stage]) || [];
        const maxRoundsForStage = currentStageFmt.length || 5;

        this.roundInStage += 1;
        let isStageTransition = false;
        let prevStage = this.stage;
        if (this.roundInStage > maxRoundsForStage) {
            this.stage += 1;
            this.roundInStage = 1;
            isStageTransition = true;
        }

        const newCfg = this.getStageConfig();
        if (newCfg.cols !== oldCfg.cols || newCfg.rows !== oldCfg.rows) {
            this.rescaleBoardsForNewStage(oldCfg, newCfg);
        }

        // Generate upcoming round's map and terrain so player can preview and position pawns
        this.pickRoundMap();

        // Calculate Economy Income for Player
        const baseIncome = 5;
        const maxInterest = this.player.augments.includes("aug_rich_get_richer") ? 7 : 5;
        const interest = Math.min(maxInterest, Math.floor(this.player.gold / 10));
        const absStreak = Math.abs(this.player.streak);
        const streakBonus = absStreak >= 4 ? 3 : (absStreak >= 3 ? 2 : (absStreak >= 2 ? 1 : 0));
        const totalIncome = baseIncome + interest + streakBonus;

        this.player.gold += totalIncome;
        this.addPlayerXP(2); // +2 passive XP each round

        // Upgrade bots for the new round
        this.upgradeAllBotsForRound();

        // Roll shop unless locked
        const wasShopLocked = !!this.shopLocked;
        if (!this.shopLocked) {
            this.rollShop(true);
        } else {
            this.shopLocked = false;
        }

        // Comeback system: Free Rerolls for Loss Streaks (Chuỗi thua từ 3 trở lên được Free Reroll)
        let freeRerollGiven = false;
        if (this.player.streak <= -3) {
            this.player.freeRerolls = (this.player.freeRerolls || 0) + 1;
            freeRerollGiven = true;
        }

        // Comeback Mega Cache on 4+ loss streak
        let comebackPackage = null;
        if (this.player.streak === -4) {
            comebackPackage = this.awardComebackCache(this.player);
        }

        // Determine phase based on TFT Stage-Round Format
        const newStageFmt = (window.CHESS_TFT_DATA.STAGE_ROUNDS_FORMAT && window.CHESS_TFT_DATA.STAGE_ROUNDS_FORMAT[this.stage]) || [];
        const roundDef = newStageFmt.find(r => r.round === this.roundInStage) || { type: "combat" };

        if (roundDef.type === "augment") {
            const allAugs = (window.CHESS_TFT_DATA.AUGMENTS || []).map(a => a.id);
            const botsList = (this.bots && this.bots.length > 0) ? this.bots : (this.opponents || []);
            for (const opp of botsList) {
                if (!opp.augments) opp.augments = [];
                if (opp.augments.length < 3) {
                    const unowned = allAugs.filter(a => !opp.augments.includes(a));
                    if (unowned.length > 0) {
                        opp.augments.push(unowned[Math.floor(Math.random() * unowned.length)]);
                    }
                }
            }
            if (this.player.augments.length < 3) {
                this.phase = "augment";
            } else {
                this.phase = "prep";
                this.pickPotentialOpponents();
            }
        } else if (isStageTransition && this.stage >= 3) {
            // STAGE ARMORY REWARD KHI CHUYỂN GIAI ĐOẠN 3 & 4
            this.phase = "armory";
            const armoryChoices = this.generateStageArmoryChoices(this.stage);
            this.currentArmoryChoices = armoryChoices;
            return {
                phase: "armory",
                isStageTransition: true,
                newStage: this.stage,
                prevStage,
                armoryChoices,
                freeRerollGiven,
                comebackPackage,
                shopLockedPreserved: wasShopLocked,
                boardScaled: newCfg.cols !== oldCfg.cols
            };
        } else if (roundDef.type === "carousel") {
            this.phase = "carousel";
        } else {
            this.phase = "prep";
            this.pickPotentialOpponents();
        }

        return {
            phase: this.phase,
            isStageTransition: false,
            freeRerollGiven,
            comebackPackage,
            shopLockedPreserved: wasShopLocked,
            boardScaled: newCfg.cols !== oldCfg.cols
        };
    }

    // Apply chosen Augment (Lõi Công Nghệ)
    chooseAugment(augId) {
        if (this.player.augments.includes(augId)) return;
        this.player.augments.push(augId);

        const cfg = this.getStageConfig();
        if (augId === "aug_rich_get_richer") {
            this.player.gold += 10;
        } else if (augId === "aug_blitz_master") {
            this.player.gold += 4;
        } else if (augId === "aug_item_grab_bag") {
            this.player.items.push("stun_hammer", "burn_cloak");
        } else if (augId === "aug_pyromania") {
            const emptyIdx = this.player.bench.findIndex(b => b === null);
            if (emptyIdx !== -1) {
                this.player.bench[emptyIdx] = {
                    uid: this.nextUid("unit"),
                    id: "fire_mage",
                    stars: 1,
                    items: []
                };
                this.checkAndMergeStars(this.player);
            }
        }

        this.phase = "prep";
        this.pickPotentialOpponents();
    }

    // Generate 6 Carousel options (Piece + Complete Item)
    generateCarouselChoices() {
        const pieces = Object.values(window.CHESS_TFT_DATA.PIECES).filter(p => !p.isKing && p.cost >= 2);
        const items = Object.keys(window.CHESS_TFT_DATA.ITEMS);
        const choices = [];
        for (let i = 0; i < 6; i++) {
            const p = pieces[Math.floor(Math.random() * pieces.length)];
            const it = items[Math.floor(Math.random() * items.length)];
            choices.push({
                index: i,
                pieceId: p.id,
                itemId: it
            });
        }
        return choices;
    }

    pickCarouselChoice(choice) {
        const emptyIdx = this.player.bench.findIndex(b => b === null);
        if (emptyIdx !== -1) {
            this.player.bench[emptyIdx] = {
                uid: this.nextUid("unit"),
                id: choice.pieceId,
                stars: 1,
                items: [choice.itemId]
            };
            this.checkAndMergeStars(this.player);
        } else {
            // Bench full: give item and gold equivalent
            this.player.items.push(choice.itemId);
            this.player.gold += 3;
        }
        this.phase = "prep";
        this.pickPotentialOpponents();
    }

    // ========================================================================
    // ADMIN SPECTATOR MODE: 8-BOT TOURNAMENT & MULTIPLAYER SPECTATOR
    // ========================================================================
    resetMultiplayerSpectatorTournament(roomData) {
        this.stage = 1;
        this.roundInStage = 1;
        this.timeMode = roomData?.timeMode || "standard";
        this.spectatorBots = [];

        const econ = window.CHESS_TFT_DATA.ECONOMY_RULES || {};
        const cfg = this.getStageConfig();
        const baseProfiles = window.CHESS_TFT_DATA.BOT_NAMES || [];
        const itemIds = Object.keys(window.CHESS_TFT_DATA.ITEMS || {});

        const contestants = Array.isArray(roomData?.players) ? [...roomData.players] : [];
        let fillCounter = 0;
        while (contestants.length < 8) {
            const bp = baseProfiles[fillCounter % baseProfiles.length] || {
                name: `Kỳ Thủ AI #${fillCounter + 1}`,
                avatar: "🤖",
                style: "Cân Bằng"
            };
            contestants.push({
                id: `filler_${Date.now()}_${fillCounter}`,
                name: bp.name,
                avatar: bp.avatar,
                isBot: true,
                elo: 1400,
                style: bp.style || "Cân Bằng"
            });
            fillCounter++;
        }

        for (let i = 0; i < 8; i++) {
            const p = contestants[i];
            const isReal = !p.isBot;
            const customMods = p.customModifiers || {};

            const startingHp = Number(customMods.startingHp) || econ.defaultStartingHp || 100;
            const startingGold = Number(customMods.startingGold) || econ.defaultStartingGold || 6;
            const startingLevel = Math.min(8, Math.max(1, Number(customMods.startingLevel) || 3));

            const bot = {
                id: p.id || `spec_contestant_${i}`,
                name: p.name || `Kỳ Thủ #${i + 1}`,
                avatar: p.avatar || (isReal ? "👑" : "🤖"),
                style: p.style || (isReal ? "Cao Thủ Người Thật" : "Cân Bằng"),
                favTrait: p.favTrait || (isReal ? "royal" : "cavalry"),
                isBot: !isReal,
                isRealPlayer: isReal,
                elo: p.elo || 1000,
                hp: startingHp,
                maxHp: startingHp,
                gold: startingGold,
                level: startingLevel,
                xp: 0,
                streak: 0,
                board: [],
                bench: [],
                items: [],
                augments: [],
                eliminated: false,
                customModifiers: customMods
            };

            this.initBotStarterBoard(bot, cfg);

            // Grant bonus items or 1 starter item
            const nonKings = bot.board.filter(u => u.id !== "king");
            if (Array.isArray(customMods.bonusItems) && customMods.bonusItems.length > 0 && nonKings.length > 0) {
                customMods.bonusItems.forEach(itemId => {
                    if (window.CHESS_TFT_DATA.ITEMS && window.CHESS_TFT_DATA.ITEMS[itemId]) {
                        nonKings[0].items.push(itemId);
                    }
                });
            } else if (nonKings.length > 0 && itemIds.length > 0) {
                nonKings[0].items.push(itemIds[i % itemIds.length]);
            }

            this.spectatorBots.push(bot);
        }
    }

    reset8BotTournament() {
        this.stage = 1;
        this.roundInStage = 1;
        this.timeMode = "standard";
        this.spectatorBots = [];

        const econ = window.CHESS_TFT_DATA.ECONOMY_RULES || {};
        const cfg = this.getStageConfig();
        const baseProfiles = window.CHESS_TFT_DATA.BOT_NAMES || [];
        const eightProfiles = [
            ...baseProfiles,
            { name: "Bá Tước Bóng Đêm", avatar: "🦇", style: "Sát Thủ Cờ Chớp", favTrait: "cavalry" }
        ].slice(0, 8);

        const itemIds = Object.keys(window.CHESS_TFT_DATA.ITEMS);

        for (let i = 0; i < 8; i++) {
            const prof = eightProfiles[i] || {
                name: `Kỳ Thủ AI #${i + 1}`,
                avatar: "🤖",
                style: "Cân Bằng",
                favTrait: "royal"
            };
            const bot = {
                id: `spec_bot_${i}`,
                name: prof.name,
                avatar: prof.avatar,
                style: prof.style,
                favTrait: prof.favTrait,
                isBot: true,
                isRealPlayer: false,
                hp: econ.defaultStartingHp || 100,
                maxHp: econ.defaultStartingHp || 100,
                gold: econ.defaultStartingGold || 6,
                level: 3,
                xp: 0,
                streak: 0,
                board: [],
                bench: [],
                items: [],
                augments: [],
                eliminated: false
            };
            this.initBotStarterBoard(bot, cfg);
            // Give each bot 1 starter item on a non-king unit for exciting round 1 action
            const nonKings = bot.board.filter(u => u.id !== "king");
            if (nonKings.length > 0 && itemIds.length > 0) {
                nonKings[0].items.push(itemIds[i % itemIds.length]);
            }
            this.spectatorBots.push(bot);
        }
    }

    prepare8BotRoundMatches() {
        const cfg = this.getStageConfig();
        const maps = window.CHESS_TFT_DATA.MAPS;

        // Ensure all alive bots are positioned properly on current stage board size
        const alive = this.spectatorBots.filter(b => !b.eliminated);
        for (const bot of alive) {
            this.positionBotBoard(bot, cfg);
        }

        // Adjust clocks for chosen room timeMode
        let matchBlitzTime = cfg.blitzTime;
        let matchIncrement = cfg.increment;
        if (this.timeMode === "relaxed") {
            matchBlitzTime = Math.round(cfg.blitzTime * 1.55);
            matchIncrement = cfg.increment + 1;
        } else if (this.timeMode === "blitz") {
            matchBlitzTime = Math.max(18, Math.round(cfg.blitzTime * 0.62));
            matchIncrement = Math.max(1, cfg.increment - 1);
        }

        // Shuffle alive bots to form 4 pairs
        const shuffled = [...alive].sort(() => Math.random() - 0.5);
        const matches = [];

        for (let m = 0; m < 4; m++) {
            const idxA = (m * 2) % Math.max(1, shuffled.length);
            const idxB = (m * 2 + 1) % Math.max(1, shuffled.length);
            const botA = shuffled[idxA];
            const botB = shuffled[idxB] !== botA ? shuffled[idxB] : (shuffled[(idxA + 1) % shuffled.length] || botA);
            const isExhibition = (m * 2 >= shuffled.length); // True if fewer than 8 bots alive and this screen is a bonus clone match

            const mapDef = maps[(this.stage + this.roundInStage + m) % maps.length];
            const terrain = mapDef.generateTerrain(cfg.cols, cfg.rows);
            const synA = this.calculateSynergies(botA);
            const synB = this.calculateSynergies(botB);

            const engine = new window.BlitzChessEngine({
                cols: cfg.cols,
                rows: cfg.rows,
                terrain,
                maxTurns: cfg.maxTurns,
                playerSynergies: synA,
                enemySynergies: synB,
                playerAugments: botA.augments || [],
                enemyAugments: botB.augments || []
            });

            const mirroredB = this.getMirroredEnemyPieces(botB, cfg);
            engine.setupBoard(botA.board, mirroredB);

            matches.push({
                matchIndex: m,
                botA,
                botB,
                isExhibition,
                mapDef,
                engine,
                clockA: matchBlitzTime,
                clockB: matchBlitzTime,
                increment: matchIncrement,
                resolved: false,
                summaryText: "⚔️ Đang giao tranh Cờ Chớp..."
            });
        }

        return matches;
    }

    resolveSingleBotMatch(matchObj) {
        if (matchObj.resolved || !matchObj.engine.gameOver) return null;
        matchObj.resolved = true;

        const res = matchObj.engine.result;
        const botA = matchObj.botA;
        const botB = matchObj.botB;

        if (matchObj.isExhibition) {
            matchObj.summaryText = `👻 [Bản Sao] ${res.winner === "player" ? botA.name : (res.winner === "enemy" ? botB.name : "Hòa")} (${res.reasonLabel})`;
            return matchObj.summaryText;
        }

        if (res.winner === "draw") {
            const dmg = this.calculateMatchDamage(null, "draw", res.playerPiecesLeft, res.enemyPiecesLeft);
            botA.hp = Math.max(0, botA.hp - dmg.damage);
            botB.hp = Math.max(0, botB.hp - dmg.damage);
            botA.streak = 0;
            botB.streak = 0;
            matchObj.summaryText = `⚖️ Hòa Cờ! Cả hai -${dmg.damage} ❤️`;
        } else if (res.winner === "player") {
            const dmg = this.calculateMatchDamage(botA, res.reason, res.playerPiecesLeft, res.enemyPiecesLeft);
            botB.hp = Math.max(0, botB.hp - dmg.damage);
            botA.gold += 2;
            botA.streak = botA.streak >= 0 ? botA.streak + 1 : 1;
            botB.streak = botB.streak <= 0 ? botB.streak - 1 : -1;
            matchObj.summaryText = `🏆 ${botA.avatar} ${botA.name} thắng (${res.reasonLabel}) -> ${botB.name} -${dmg.damage} ❤️`;
        } else {
            const dmg = this.calculateMatchDamage(botB, res.reason, res.enemyPiecesLeft, res.playerPiecesLeft);
            botA.hp = Math.max(0, botA.hp - dmg.damage);
            botB.gold += 2;
            botB.streak = botB.streak >= 0 ? botB.streak + 1 : 1;
            botA.streak = botA.streak <= 0 ? botA.streak - 1 : -1;
            matchObj.summaryText = `🏆 ${botB.avatar} ${botB.name} thắng (${res.reasonLabel}) -> ${botA.name} -${dmg.damage} ❤️`;
        }

        if (botA.hp <= 0) botA.eliminated = true;
        if (botB.hp <= 0) botB.eliminated = true;

        return `[Vòng ${this.stage}-${this.roundInStage} • Bàn #${matchObj.matchIndex + 1}] ${matchObj.summaryText}`;
    }

    advance8BotRound() {
        const oldCfg = this.getStageConfig();
        this.roundInStage += 1;
        if (this.roundInStage > 4) {
            this.roundInStage = 1;
            this.stage += 1;
        }
        const newCfg = this.getStageConfig();

        // Scale boards if stage increased
        if (newCfg.cols !== oldCfg.cols) {
            const rowShift = newCfg.rows - oldCfg.rows;
            const colShift = Math.floor((newCfg.cols - oldCfg.cols) / 2);
            for (const bot of this.spectatorBots) {
                for (const u of bot.board) {
                    u.r = Math.min(newCfg.rows - 1, Math.max(newCfg.rows - newCfg.deployRows, u.r + rowShift));
                    u.c = Math.min(newCfg.cols - 1, Math.max(0, u.c + colShift));
                }
            }
        }

        // Give income, level up, upgrade units & items for all alive bots
        const itemIds = Object.keys(window.CHESS_TFT_DATA.ITEMS);
        for (const bot of this.spectatorBots) {
            if (bot.eliminated) continue;
            const interest = Math.min(5, Math.floor(bot.gold / 10));
            bot.gold += 5 + interest;

            const targetLevel = Math.min(8, 2 + this.stage + Math.floor(this.roundInStage / 2));
            bot.level = Math.max(bot.level, targetLevel);
            this.upgradeBotArmy(bot);

            // Upgrade stars & items progressively
            const nonKings = bot.board.filter(u => u.id !== "king");
            if (nonKings.length > 0 && Math.random() < 0.65) {
                const pick = nonKings[Math.floor(Math.random() * nonKings.length)];
                if (this.stage >= 2 && pick.stars === 1) pick.stars = 2;
                else if (this.stage >= 3 && pick.stars === 2 && Math.random() < 0.35) pick.stars = 3;

                if (pick.items.length < 2 && Math.random() < 0.5) {
                    pick.items.push(itemIds[Math.floor(Math.random() * itemIds.length)]);
                }
            }

            // Award augments progressively to spectator bots (up to 3 augments)
            if (!bot.augments) bot.augments = [];
            const allAugs = (window.CHESS_TFT_DATA.AUGMENTS || []).map(a => a.id);
            if (this.stage >= 2 && bot.augments.length < Math.min(3, this.stage - 1)) {
                const unowned = allAugs.filter(a => !bot.augments.includes(a));
                if (unowned.length > 0) {
                    bot.augments.push(unowned[Math.floor(Math.random() * unowned.length)]);
                }
            }

            this.positionBotBoard(bot, newCfg);
        }

        const aliveCount = this.spectatorBots.filter(b => !b.eliminated).length;
        return {
            aliveCount,
            boardScaled: newCfg.cols !== oldCfg.cols
        };
    }

    // Surrender match (Đầu hàng & Out game)
    surrenderPlayer() {
        this.player.hp = 0;
        this.player.eliminated = true;
        this.phase = "gameover";
        const alive = this.getAllParticipants().filter(p => !p.eliminated);
        const rank = alive.length + 1;
        this.roundMatchLogs.push({
            isPlayerMatch: true,
            summary: `🏳️ Bạn đã chủ động đầu hàng và rời trận đấu (Xếp hạng #${rank})!`
        });
        return {
            rank,
            phase: "gameover"
        };
    }
}

window.TFTGameManager = TFTGameManager;

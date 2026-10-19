// ============================================================================
// CHESS TFT - CUSTOM BLITZ CHESS ENGINE
// Supports Dynamic Board Sizes, Terrains, Multi-HP Layers, Ranged Attacks,
// Stun/Burn Status Effects, No-Check-Lock Blitz Rule & AI Move Selection
// ============================================================================

class BlitzChessEngine {
    constructor(config) {
        this.cols = config.cols;
        this.rows = config.rows;
        this.terrain = config.terrain || {}; // key "r,c" -> "river" | "wall" | "lava" | "rune"
        this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
        this.turn = "player"; // "player" (bottom, moves up -r) | "enemy" (top, moves down +r)
        this.turnCount = 1;
        this.maxTurns = config.maxTurns || 44;
        this.playerSynergies = config.playerSynergies || {};
        this.enemySynergies = config.enemySynergies || {};
        this.playerAugments = config.playerAugments || [];
        this.enemyAugments = config.enemyAugments || [];
        this.moveHistory = [];
        this.gameOver = false;
        this.result = null; // { winner, reason, reasonLabel, playerPiecesLeft, enemyPiecesLeft }
        this.goldEarnedPlayer = 0;
        this.lastAction = null; // For visual highlights & animations
    }

    inBounds(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    getTerrain(r, c) {
        return this.terrain[`${r},${c}`] || null;
    }

    getSynergyLevel(side, traitId) {
        const syn = side === "player" ? this.playerSynergies : this.enemySynergies;
        return syn[traitId] ? syn[traitId].activeTier : 0;
    }

    hasAugment(side, augId) {
        const augs = side === "player" ? this.playerAugments : this.enemyAugments;
        return augs.includes(augId);
    }

    hasItem(piece, itemId) {
        return piece.items && piece.items.includes(itemId);
    }

    // Initialize combat board from deployed pieces
    setupBoard(playerPieces, enemyPieces) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.board[r][c] = null;
            }
        }

        const placeSide = (pieces, side) => {
            for (const p of pieces) {
                const def = window.CHESS_TFT_DATA.PIECES[p.id];
                const starIdx = Math.min(2, (p.stars || 1) - 1);
                let maxHp = def.baseHp[starIdx];

                // Synergy & Item HP bonuses
                const vanguardLv = this.getSynergyLevel(side, "vanguard");
                if (def.traits.includes("vanguard")) {
                    if (vanguardLv >= 4) maxHp += 2;
                    else if (vanguardLv >= 2) maxHp += 1;
                    if (this.hasAugment(side, "aug_fortress")) maxHp += 1;
                }
                if (def.isKing) {
                    if (vanguardLv >= 4) maxHp += 1;
                    if (this.getSynergyLevel(side, "royal") >= 2) maxHp += 1;
                    if (this.hasAugment(side, "aug_fortress")) maxHp += 1;
                }
                if (p.items && p.items.includes("iron_armor")) {
                    maxHp += 2;
                }

                const r = p.r;
                const c = p.c;
                if (this.inBounds(r, c)) {
                    // Clear any terrain under initial spawn squares so units never spawn inside walls
                    delete this.terrain[`${r},${c}`];
                    this.board[r][c] = {
                        uid: p.uid || `${side}_${p.id}_${r}_${c}`,
                        id: p.id,
                        name: def.name,
                        icon: side === "enemy" && def.enemyIcon ? def.enemyIcon : def.icon,
                        badge: def.badge || "",
                        side: side,
                        stars: p.stars || 1,
                        isKing: !!def.isKing,
                        traits: [...def.traits],
                        moveType: def.moveType,
                        attackType: def.attackType,
                        baseRange: def.range[starIdx],
                        hp: maxHp,
                        maxHp: maxHp,
                        items: [...(p.items || [])],
                        stunnedTurns: 0,
                        stunImmuneTurns: 0, // > 0 prevents consecutive stun-lock
                        reloadTurns: 0,     // > 0 prevents consecutive ranged shots without reloading
                        burnTurns: 0,       // > 0 means counting down to AoE explosion
                        frostUsed: false,
                        r: r,
                        c: c
                    };
                }
            }
        };

        placeSide(playerPieces, "player");
        placeSide(enemyPieces, "enemy");
    }

    getAttackDamage(piece, target = null) {
        let dmg = 1;
        const mageLv = this.getSynergyLevel(piece.side, "mage");
        if (piece.traits.includes("mage")) {
            if (mageLv >= 3) dmg = 3;
            else if (mageLv >= 2) dmg = 2;
        }
        // Balance Patch 1.1: Cavalry deals +1 bonus armor damage against Rangers & King to counter Turtle/Sniper meta
        if (target && piece.traits.includes("cavalry")) {
            if (target.isKing || (target.traits && target.traits.includes("ranger"))) {
                dmg += 1;
            }
        }
        return dmg;
    }

    getEffectiveRange(piece, r, c) {
        let rng = piece.baseRange;
        const rangerLv = this.getSynergyLevel(piece.side, "ranger");
        if (piece.traits.includes("ranger") && rangerLv >= 2) {
            rng += 1;
        }
        if (piece.traits.includes("mage") && this.getSynergyLevel(piece.side, "mage") >= 3) {
            rng += 1;
        }
        if (this.hasItem(piece, "sniper_scope")) {
            rng = Math.max(2, rng + 1);
        }
        if (this.getTerrain(r, c) === "rune") {
            rng += 1;
        }
        return rng;
    }

    canJumpObstacles(piece) {
        return piece.moveType === "knight" || this.hasItem(piece, "phase_boots");
    }

    canPierceWallsWithShot(piece) {
        const rangerLv = this.getSynergyLevel(piece.side, "ranger");
        return (piece.traits.includes("ranger") && rangerLv >= 3) || this.hasItem(piece, "phase_boots");
    }

    ignoresRiver(piece) {
        const cavLv = this.getSynergyLevel(piece.side, "cavalry");
        return (piece.traits.includes("cavalry") && cavLv >= 2) ||
               piece.moveType === "knight" ||
               this.hasItem(piece, "phase_boots");
    }

    // Generate all valid actions for a piece at (r, c)
    // Action format:
    // { fromR, fromC, toR, toC, type: "move" | "melee" | "ranged", stopR, stopC }
    getPieceActions(r, c, ignoreStun = false) {
        const piece = this.board[r][c];
        if (!piece) return [];
        if (!ignoreStun && piece.stunnedTurns > 0) return [];

        const actions = [];
        const side = piece.side;
        const forward = side === "player" ? -1 : 1;
        const effRange = this.getEffectiveRange(piece, r, c);
        const isReloading = (piece.reloadTurns || 0) > 0;
        const hasScope = this.hasItem(piece, "sniper_scope") && !isReloading;
        const canJump = this.canJumpObstacles(piece);
        const canPierceWallShot = this.canPierceWallsWithShot(piece);

        // Balance Patch 1.1: Turn 1 Opening Grace (First move of the match can only position, not attack!)
        const isTurnOneGrace = this.turnCount === 1;

        const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        const allDirs = [...orthoDirs, ...diagDirs];
        const knightJumps = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        // Helper to add a step or slide along directions
        const traceDirections = (dirs, maxSteps, allowMove, allowMelee, allowRanged) => {
            const effAllowMelee = allowMelee && !isTurnOneGrace;
            const effAllowRanged = allowRanged && !isTurnOneGrace && !isReloading;

            for (const [dr, dc] of dirs) {
                let prevR = r;
                let prevC = c;
                for (let step = 1; step <= maxSteps; step++) {
                    const nr = r + dr * step;
                    const nc = c + dc * step;
                    if (!this.inBounds(nr, nc)) break;

                    const terr = this.getTerrain(nr, nc);
                    const occupant = this.board[nr][nc];

                    // Wall check
                    if (terr === "wall") {
                        if (canJump || (effAllowRanged && canPierceWallShot)) {
                            continue;
                        }
                        break;
                    }

                    if (!occupant) {
                        if (allowMove) {
                            actions.push({
                                fromR: r, fromC: c,
                                toR: nr, toC: nc,
                                stopR: nr, stopC: nc,
                                type: "move"
                            });
                        }
                        prevR = nr;
                        prevC = nc;
                    } else {
                        // Found a piece
                        if (occupant.side !== side) {
                            if (effAllowRanged) {
                                actions.push({
                                    fromR: r, fromC: c,
                                    toR: nr, toC: nc,
                                    stopR: r, stopC: c,
                                    type: "ranged"
                                });
                            } else if (effAllowMelee) {
                                const useRangedByScope = hasScope && step <= 2;
                                actions.push({
                                    fromR: r, fromC: c,
                                    toR: nr, toC: nc,
                                    stopR: useRangedByScope ? r : prevR,
                                    stopC: useRangedByScope ? c : prevC,
                                    type: useRangedByScope ? "ranged" : "melee"
                                });
                            }
                        }
                        // Cannot slide past a piece unless phase_boots
                        if (!this.hasItem(piece, "phase_boots")) {
                            break;
                        }
                    }
                }
            }
        };

        switch (piece.moveType) {
            case "king": {
                traceDirections(allDirs, 1, true, piece.attackType === "melee", false);
                if (piece.attackType === "ranged_any") {
                    traceDirections(allDirs, effRange, false, false, true);
                } else if (hasScope) {
                    traceDirections(allDirs, 2, false, false, true);
                }
                break;
            }

            case "pawn": {
                // Move 1 step forward
                const fr = r + forward;
                if (this.inBounds(fr, c) && !this.board[fr][c] && this.getTerrain(fr, c) !== "wall") {
                    actions.push({
                        fromR: r, fromC: c,
                        toR: fr, toC: c,
                        stopR: fr, stopC: c,
                        type: "move"
                    });
                }
                // Attack diagonally forward (disabled on Turn 1 Opening Grace)
                if (!isTurnOneGrace) {
                    for (const dc of [-1, 1]) {
                        const ar = r + forward;
                        const ac = c + dc;
                        if (this.inBounds(ar, ac) && this.board[ar][ac] && this.board[ar][ac].side !== side) {
                            actions.push({
                                fromR: r, fromC: c,
                                toR: ar, toC: ac,
                                stopR: r, stopC: c,
                                type: hasScope ? "ranged" : "melee"
                            });
                        }
                    }
                }
                break;
            }

            case "step_ortho": {
                traceDirections(orthoDirs, 1, true, false, false);
                traceDirections(orthoDirs, effRange, false, false, true);
                break;
            }

            case "knight": {
                for (const [dr, dc] of knightJumps) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (!this.inBounds(nr, nc)) continue;
                    if (this.getTerrain(nr, nc) === "wall") continue;
                    const occ = this.board[nr][nc];
                    if (!occ) {
                        actions.push({
                            fromR: r, fromC: c,
                            toR: nr, toC: nc,
                            stopR: nr, stopC: nc,
                            type: "move"
                        });
                    } else if (occ.side !== side && !isTurnOneGrace) {
                        actions.push({
                            fromR: r, fromC: c,
                            toR: nr, toC: nc,
                            stopR: r, stopC: c,
                            type: hasScope ? "ranged" : "melee"
                        });
                    }
                }
                break;
            }

            case "bishop": {
                traceDirections(diagDirs, 8, true, true, false);
                // Pyro bishop also has ranged diagonal fire bolt up to effRange
                traceDirections(diagDirs, effRange, false, false, true);
                break;
            }

            case "rook_short": {
                traceDirections(orthoDirs, effRange, true, true, false);
                break;
            }

            case "rook": {
                traceDirections(orthoDirs, 8, true, true, false);
                break;
            }

            case "cannon": {
                // Move like a Rook when not capturing
                traceDirections(orthoDirs, 8, true, false, false);
                // Capture by jumping over EXACTLY 1 screen (piece or wall) along orthoDirs
                if (!isTurnOneGrace && !isReloading) {
                    for (const [dr, dc] of orthoDirs) {
                        let screenCount = 0;
                        for (let step = 1; step <= 8; step++) {
                            const nr = r + dr * step;
                            const nc = c + dc * step;
                            if (!this.inBounds(nr, nc)) break;
                            const terr = this.getTerrain(nr, nc);
                            const occ = this.board[nr][nc];

                            if (screenCount === 0) {
                                if (terr === "wall" || occ) {
                                    screenCount = 1;
                                }
                            } else if (screenCount === 1) {
                                if (terr === "wall") {
                                    break; // Second wall stops cannonball
                                }
                                if (occ) {
                                    if (occ.side !== side) {
                                        actions.push({
                                            fromR: r, fromC: c,
                                            toR: nr, toC: nc,
                                            stopR: r, stopC: c,
                                            type: "ranged"
                                        });
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
                break;
            }

            case "queen": {
                // Grand Queen: Ranged energy blast up to effRange OR melee slide up to 8
                traceDirections(allDirs, effRange, false, false, true);
                traceDirections(allDirs, 8, true, true, false);
                break;
            }

            case "chancellor": {
                // Rook + Knight
                traceDirections(orthoDirs, 8, true, true, false);
                for (const [dr, dc] of knightJumps) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (!this.inBounds(nr, nc)) continue;
                    if (this.getTerrain(nr, nc) === "wall") continue;
                    const occ = this.board[nr][nc];
                    if (!occ) {
                        actions.push({
                            fromR: r, fromC: c,
                            toR: nr, toC: nc,
                            stopR: nr, stopC: nc,
                            type: "move"
                        });
                    } else if (occ.side !== side && !isTurnOneGrace) {
                        actions.push({
                            fromR: r, fromC: c,
                            toR: nr, toC: nc,
                            stopR: r, stopC: c,
                            type: "melee"
                        });
                    }
                }
                break;
            }
        }

        // Deduplicate actions on target square (prefer ranged over melee if both target the same enemy square)
        const mapByTarget = new Map();
        for (const act of actions) {
            const key = `${act.toR},${act.toC}`;
            const existing = mapByTarget.get(key);
            if (!existing || (act.type === "ranged" && existing.type !== "ranged")) {
                mapByTarget.set(key, act);
            }
        }
        return Array.from(mapByTarget.values());
    }

    getAllSideActions(side, ignoreStun = false) {
        const list = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const p = this.board[r][c];
                if (p && p.side === side) {
                    const acts = this.getPieceActions(r, c, ignoreStun);
                    list.push(...acts);
                }
            }
        }
        return list;
    }

    findKing(side) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const p = this.board[r][c];
                if (p && p.side === side && p.isKing) {
                    return p;
                }
            }
        }
        return null;
    }

    // Check if 'side' King is under attack / in check by opponent right now
    isKingInCheck(side) {
        const king = this.findKing(side);
        if (!king) return false;
        const oppSide = side === "player" ? "enemy" : "player";
        const oppActions = this.getAllSideActions(oppSide, false);
        return oppActions.some(act => act.toR === king.r && act.toC === king.c);
    }

    // Check if 'side' King can be killed in 1 move by opponent right now
    isKingLethallyThreatened(side) {
        const king = this.findKing(side);
        if (!king) return true;
        const oppSide = side === "player" ? "enemy" : "player";
        const oppActions = this.getAllSideActions(oppSide, false);
        for (const act of oppActions) {
            if (act.toR === king.r && act.toC === king.c) {
                const attacker = this.board[act.fromR][act.fromC];
                const dmg = this.getAttackDamage(attacker, king);
                if (king.hp <= dmg) {
                    return true;
                }
            }
        }
        return false;
    }

    // Clone minimal board state to test if any move saves the King (for Checkmate vs Blunder detection)
    canSideSaveKing(side) {
        const myActions = this.getAllSideActions(side, false);
        if (myActions.length === 0) return false;

        for (const act of myActions) {
            const snapshot = this.saveSnapshot();
            this.applyActionSilent(act);
            const stillLethal = this.isKingLethallyThreatened(side);
            this.restoreSnapshot(snapshot);
            if (!stillLethal) {
                return true;
            }
        }
        return false;
    }

    saveSnapshot() {
        const grid = Array.from({ length: this.rows }, (_, r) =>
            Array.from({ length: this.cols }, (_, c) => {
                const p = this.board[r][c];
                return p ? { ...p, items: [...p.items], traits: [...p.traits] } : null;
            })
        );
        return { grid, turn: this.turn, turnCount: this.turnCount };
    }

    restoreSnapshot(snap) {
        this.board = snap.grid;
        this.turn = snap.turn;
        this.turnCount = snap.turnCount;
    }

    // Lightweight simulation of an action for checkmate/AI lookahead
    applyActionSilent(action) {
        const attacker = this.board[action.fromR][action.fromC];
        if (!attacker) return;
        const target = this.board[action.toR][action.toC];

        if (action.type === "move") {
            this.board[action.fromR][action.fromC] = null;
            attacker.r = action.toR;
            attacker.c = action.toC;
            this.board[action.toR][action.toC] = attacker;
        } else {
            const dmg = this.getAttackDamage(attacker, target);
            if (action.type === "ranged") {
                attacker.reloadTurns = 1;
            }
            if (target) {
                target.hp -= dmg;
                if (target.hp <= 0) {
                    // Target dies
                    if (action.type === "ranged") {
                        this.board[action.toR][action.toC] = null;
                    } else {
                        this.board[action.fromR][action.fromC] = null;
                        attacker.r = action.toR;
                        attacker.c = action.toC;
                        this.board[action.toR][action.toC] = attacker;
                    }
                } else {
                    // Target survives with reduced HP layer!
                    if (action.type === "melee") {
                        this.board[action.fromR][action.fromC] = null;
                        attacker.r = action.stopR;
                        attacker.c = action.stopC;
                        this.board[action.stopR][action.stopC] = attacker;
                    }
                }
            }
        }
    }

    // Execute a real move on the board with all status effects, promotions, and win checks
    executeAction(action) {
        if (this.gameOver) return null;
        const attacker = this.board[action.fromR][action.fromC];
        if (!attacker) return null;

        const side = attacker.side;
        const oppSide = side === "player" ? "enemy" : "player";
        const target = this.board[action.toR][action.toC];
        const events = [];
        let clockBonus = 0;
        let capturedKing = false;

        if (action.type === "move") {
            this.board[action.fromR][action.fromC] = null;
            attacker.r = action.toR;
            attacker.c = action.toC;
            this.board[action.toR][action.toC] = attacker;
            events.push(`${attacker.name} đi tới (${action.toR + 1}, ${action.toC + 1})`);
        } else if (target) {
            const dmg = this.getAttackDamage(attacker, target);
            target.hp -= dmg;

            // Balance Patch 1.1: Ranged attack requires 1 turn Reload before shooting ranged again!
            if (action.type === "ranged") {
                attacker.reloadTurns = 2; // Will decrement by 1 at end of this turn -> stays 1 for next turn
            }

            // Check Pyro / Burn on attack
            const pyroLv = this.getSynergyLevel(side, "pyro");
            const hasBurnItem = this.hasItem(attacker, "burn_cloak");
            if (attacker.traits.includes("pyro") || hasBurnItem) {
                let burnDuration = 3;
                if (pyroLv >= 3) burnDuration = 2;
                if (this.hasAugment(side, "aug_pyromania")) burnDuration = Math.max(1, burnDuration - 1);
                if (target.burnTurns === 0 || target.burnTurns > burnDuration) {
                    target.burnTurns = burnDuration;
                }
            }

            if (target.hp <= 0) {
                // Target eliminated!
                if (target.isKing) {
                    capturedKing = true;
                }
                if (action.type === "ranged") {
                    this.board[action.toR][action.toC] = null;
                    events.push(`🏹 ${attacker.name} bắn hạ ${target.name} (Nạp đạn 1 lượt)!`);
                } else {
                    this.board[action.fromR][action.fromC] = null;
                    attacker.r = action.toR;
                    attacker.c = action.toC;
                    this.board[action.toR][action.toC] = attacker;
                    events.push(`⚔️ ${attacker.name} tiêu diệt ${target.name}!`);
                }

                // Mercenary gold reward
                if (attacker.id === "mercenary" && side === "player") {
                    const goldGain = attacker.stars >= 3 ? 3 : (attacker.stars === 2 ? 2 : 1);
                    this.goldEarnedPlayer += goldGain;
                    events.push(`🪙 Lính Đánh Thuê nhặt +${goldGain} Vàng!`);
                }

                // Cavalry kill bonus
                const cavLv = this.getSynergyLevel(side, "cavalry");
                if (attacker.traits.includes("cavalry") && cavLv >= 2) {
                    clockBonus = cavLv >= 3 ? 4 : 3;
                    if (cavLv >= 3) {
                        attacker.hp += 1;
                        attacker.maxHp = Math.max(attacker.maxHp, attacker.hp);
                    }
                    events.push(`🐎 Kỵ Binh hồi +${clockBonus}s đồng hồ!`);
                }
            } else {
                // Multi-HP target survived the hit!
                if (action.type === "melee") {
                    this.board[action.fromR][action.fromC] = null;
                    attacker.r = action.stopR;
                    attacker.c = action.stopC;
                    this.board[action.stopR][action.stopC] = attacker;
                }
                events.push(`🛡️ ${attacker.name} phá ${dmg} Giáp của ${target.name} (còn ${target.hp} Lớp Máu)${action.type === "ranged" ? " • Nạp đạn 1 lượt" : ""}!`);
            }
        }

        // Pawn Promotion when reaching opposite back rank
        const backRank = side === "player" ? 0 : this.rows - 1;
        if (attacker.id === "shield_pawn" && attacker.r === backRank) {
            const queenDef = window.CHESS_TFT_DATA.PIECES.grand_queen;
            attacker.id = "grand_queen";
            attacker.name = "Hậu Phong Cấp";
            attacker.icon = queenDef.icon;
            attacker.moveType = "queen";
            attacker.attackType = "queen_hybrid";
            attacker.baseRange = 2;
            attacker.hp += 2;
            attacker.maxHp += 2;
            events.push(`👑 Tốt Khiên phong cấp thành HẬU TỐI THƯỢNG!`);
        }

        // Terrain effects at attacker's final position
        const endTerrain = this.getTerrain(attacker.r, attacker.c);
        if (endTerrain === "river" && !this.ignoresRiver(attacker) && (action.fromR !== attacker.r || action.fromC !== attacker.c)) {
            attacker.stunnedTurns = Math.max(attacker.stunnedTurns, 2); // Will tick down to 1 so skips next turn
            events.push(`🌊 ${attacker.name} lội Sông nên bị Làm Chậm 1 lượt!`);
        } else if (endTerrain === "lava" && !this.hasItem(attacker, "phase_boots")) {
            attacker.burnTurns = attacker.burnTurns > 0 ? Math.min(attacker.burnTurns, 2) : 2;
            events.push(`🌋 ${attacker.name} dẫm Dung Nham và bị Thiêu Đốt!`);
        }

        // Adjacent on-arrival effects: Stun Hammer, Frost Rook, Frost Synergy, Burn Cloak
        const adjDirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        const movedTile = action.fromR !== attacker.r || action.fromC !== attacker.c;

        for (const [dr, dc] of adjDirs) {
            const nr = attacker.r + dr;
            const nc = attacker.c + dc;
            if (!this.inBounds(nr, nc)) continue;
            const neighbor = this.board[nr][nc];
            if (!neighbor || neighbor.side === side) continue;

            // Balance Patch 1.1: Respect Stun Immunity (stunImmuneTurns > 0 prevents consecutive stun-lock)
            const canBeStunned = (neighbor.stunImmuneTurns || 0) === 0 && neighbor.stunnedTurns === 0;

            // 1. Stun Hammer item or Frost Rook innate
            if (movedTile && (this.hasItem(attacker, "stun_hammer") || attacker.id === "frost_rook")) {
                if (canBeStunned) {
                    neighbor.stunnedTurns = 1;
                    events.push(`🔨 ${neighbor.name} bị CHOÁNG 1 lượt bởi ${attacker.name}!`);
                } else if ((neighbor.stunImmuneTurns || 0) > 0) {
                    events.push(`🛡️ ${neighbor.name} đang Kháng Choáng (miễn nhiễm choáng liên tiếp)!`);
                }
            }

            // 2. Frost Synergy (once per frost unit per match)
            if (movedTile && !attacker.frostUsed && attacker.traits.includes("frost") && this.getSynergyLevel(side, "frost") >= 2) {
                if (canBeStunned) {
                    neighbor.stunnedTurns = 1;
                    attacker.frostUsed = true;
                    events.push(`❄️ Hệ Băng đóng băng ${neighbor.name} 1 lượt!`);
                }
            }

            // 3. Burn Cloak aura
            if (this.hasItem(attacker, "burn_cloak")) {
                let bTurns = this.hasAugment(side, "aug_pyromania") ? 2 : 3;
                if (neighbor.burnTurns === 0 || neighbor.burnTurns > bTurns) {
                    neighbor.burnTurns = bTurns;
                    events.push(`🔥 Áo Choàng Lửa đốt cháy ${neighbor.name} (${bTurns} lượt)!`);
                }
            }
        }

        this.lastAction = {
            fromR: action.fromR,
            fromC: action.fromC,
            toR: action.toR,
            toC: action.toC,
            stopR: attacker.r,
            stopC: attacker.c,
            type: action.type,
            side: side
        };

        // 1. Did this move directly capture the enemy King? (King Capture = Opponent forgot they were in check!)
        if (capturedKing || !this.findKing(oppSide)) {
            this.endMatch(side, "king_captured", "Ăn Trực Tiếp Vua (Đối phương quên đỡ chiếu!)");
            this.moveHistory.push({ turn: this.turnCount, side, text: events.join(" • ") });
            return { events, clockBonus, gameOver: true };
        }

        // 2. Process end-of-turn status effects for 'side' (Reload, Stun Immunity, Stun recovery & AoE Burn Explosion)
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const p = this.board[r][c];
                if (!p || p.side !== side) continue;

                // Clear previous Stun Immunity after surviving 1 full turn cycle
                if (p.stunImmuneTurns > 0) {
                    p.stunImmuneTurns = Math.max(0, p.stunImmuneTurns - 1);
                }

                // Tick down Ranged Reload cooldown
                if (p.reloadTurns > 0) {
                    p.reloadTurns = Math.max(0, p.reloadTurns - 1);
                }

                // Stun recovery for pieces that didn't just get stunned this turn
                if (p.stunnedTurns > 0 && p !== attacker) {
                    p.stunnedTurns = Math.max(0, p.stunnedTurns - 1);
                    if (p.stunnedTurns === 0) {
                        // Grant 1 turn of Stun Immunity so it cannot be perma-stunned!
                        p.stunImmuneTurns = 1;
                    }
                } else if (p === attacker && p.stunnedTurns > 1) {
                    // River slow applied 2 so after this decrement it remains 1 for next turn
                    p.stunnedTurns -= 1;
                }

                // Burn countdown & Anti-Turtle AoE Explosion (8 surrounding tiles)
                if (p.burnTurns > 0) {
                    p.burnTurns -= 1;
                    if (p.burnTurns === 0) {
                        events.push(`💥 ${p.name} phát nổ Thiêu Đốt và gây cháy lan 8 ô xung quanh!`);
                        this.board[r][c] = null;

                        // Deal 1 AoE HP Layer Damage to adjacent allied units (breaks Turtle formations!)
                        for (const [dr, dc] of adjDirs) {
                            const ar = r + dr;
                            const ac = c + dc;
                            if (!this.inBounds(ar, ac)) continue;
                            const adjUnit = this.board[ar][ac];
                            if (adjUnit && adjUnit.side === side) {
                                adjUnit.hp -= 1;
                                if (adjUnit.hp <= 0) {
                                    this.board[ar][ac] = null;
                                    events.push(`🔥 Nổ lan thiêu rụi luôn ${adjUnit.name}!`);
                                } else {
                                    events.push(`🔥 Nổ lan phá 1 Giáp của ${adjUnit.name} (còn ${adjUnit.hp} Lớp Máu)!`);
                                }
                            }
                        }

                        if (!this.findKing(side)) {
                            this.endMatch(oppSide, "checkmate", "Vua bị nổ tung bởi Thiêu Đốt!");
                            this.moveHistory.push({ turn: this.turnCount, side, text: events.join(" • ") });
                            return { events, clockBonus, gameOver: true };
                        }
                    }
                }
            }
        }

        // Switch turn
        this.turn = oppSide;
        this.turnCount += 1;

        // 3. Check if the new side to move is in TRUE CHECKMATE!
        // True Checkmate = King is currently lethally threatened AND no action can save the King!
        const oppKingInDanger = this.isKingLethallyThreatened(oppSide);
        const oppCanSaveKing = this.canSideSaveKing(oppSide);

        if (oppKingInDanger && !oppCanSaveKing) {
            events.push(`⚡ CHIẾU HẾT (CHECKMATE)! Không còn nước đi nào cứu được Vua!`);
            this.endMatch(side, "checkmate", "Chiếu Hết Tuyệt Đối (Checkmate)!");
            this.moveHistory.push({ turn: this.turnCount - 1, side, text: events.join(" • ") });
            return { events, clockBonus, gameOver: true };
        }

        // 4. Check if the new side has zero moves at all (Stalemate / All Frozen) or Max Turns reached
        const oppAllMoves = this.getAllSideActions(oppSide, false);
        if (oppAllMoves.length === 0) {
            // If all units are stunned, pass turn back or if truly no units can move
            const oppUnstunnedMoves = this.getAllSideActions(oppSide, true);
            if (oppUnstunnedMoves.length === 0) {
                this.endMatch("draw", "draw", "Hòa Cờ (Hết nước đi hợp lệ)!");
                this.moveHistory.push({ turn: this.turnCount - 1, side, text: events.join(" • ") });
                return { events, clockBonus, gameOver: true };
            } else {
                // Skip stunned turn automatically after clearing stun and granting stun immunity
                events.push(`❄️ Toàn bộ quân của ${oppSide === "player" ? "Bạn" : "Đối Thủ"} đang bị Choáng — Mất lượt & Nhận Kháng Choáng!`);
                for (let r = 0; r < this.rows; r++) {
                    for (let c = 0; c < this.cols; c++) {
                        const p = this.board[r][c];
                        if (p && p.side === oppSide && p.stunnedTurns > 0) {
                            p.stunnedTurns = 0;
                            p.stunImmuneTurns = 1;
                        }
                    }
                }
                this.turn = side;
            }
        }

        if (this.turnCount > this.maxTurns) {
            this.endMatch("draw", "draw", "Hòa Cờ (Hết số lượt giao tranh tối đa)!");
            this.moveHistory.push({ turn: this.turnCount - 1, side, text: events.join(" • ") });
            return { events, clockBonus, gameOver: true };
        }

        this.moveHistory.push({ turn: this.turnCount - 1, side, text: events.join(" • ") });
        return { events, clockBonus, gameOver: false };
    }

    countSurvivingPieces(side) {
        let count = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] && this.board[r][c].side === side) {
                    count++;
                }
            }
        }
        return count;
    }

    endMatch(winner, reason, reasonLabel) {
        this.gameOver = true;
        this.result = {
            winner, // "player" | "enemy" | "draw"
            reason, // "checkmate" | "timeout" | "king_captured" | "draw"
            reasonLabel,
            playerPiecesLeft: this.countSurvivingPieces("player"),
            enemyPiecesLeft: this.countSurvivingPieces("enemy")
        };
    }

    // ========================================================================
    // AI BLITZ BOT LOGIC
    // Plays fast, attacks aggressively, prioritizes capturing King if exposed,
    // and has a realistic chance in Blitz to overlook subtle checks so the
    // player can also experience capturing the Bot's King!
    // ========================================================================
    chooseBotAction(side = "enemy", blunderChance = 0.22) {
        const actions = this.getAllSideActions(side, false);
        if (actions.length === 0) return null;

        const oppSide = side === "player" ? "enemy" : "player";
        const oppKing = this.findKing(oppSide);

        // 1. If Bot can lethally capture opponent's King right now, DO IT IMMEDIATELY!
        if (oppKing) {
            for (const act of actions) {
                if (act.toR === oppKing.r && act.toC === oppKing.c) {
                    const att = this.board[act.fromR][act.fromC];
                    if (oppKing.hp <= this.getAttackDamage(att, oppKing)) {
                        return act;
                    }
                }
            }
        }

        // 2. Check if Bot's own King is currently in lethal danger
        const myKingInDanger = this.isKingLethallyThreatened(side);
        const forgetCheckInBlitz = Math.random() < blunderChance;

        let bestAction = actions[0];
        let bestScore = -99999;

        for (const act of actions) {
            let score = (Math.random() - 0.5) * 4;
            const attacker = this.board[act.fromR][act.fromC];
            const target = this.board[act.toR][act.toC];

            // Test outcome of this action
            const snap = this.saveSnapshot();
            this.applyActionSilent(act);
            const kingStillInDanger = this.isKingLethallyThreatened(side);
            const putsEnemyKingInDanger = this.isKingLethallyThreatened(oppSide);
            this.restoreSnapshot(snap);

            // If Bot notices check (doesn't blunder), heavily penalize leaving King in lethal danger
            if (!forgetCheckInBlitz && kingStillInDanger) {
                score -= 500;
            } else if (myKingInDanger && !kingStillInDanger && !forgetCheckInBlitz) {
                score += 300; // Great defensive save!
            }

            // Reward attacking enemy pieces
            if (target && target.side === oppSide) {
                const dmg = this.getAttackDamage(attacker, target);
                if (target.isKing) {
                    score += 120; // Stripping King armor layer
                } else if (target.hp <= dmg) {
                    score += 55 + (window.CHESS_TFT_DATA.PIECES[target.id]?.cost || 1) * 12;
                } else {
                    score += 28 + dmg * 10;
                }
                if (act.type === "ranged") {
                    score += 18; // Ranged attacks are safe and strong
                }
            }

            // Reward checking enemy King
            if (putsEnemyKingInDanger) {
                score += 65;
            }

            // Positional advancement toward enemy half
            const forwardDir = side === "enemy" ? 1 : -1;
            if (!attacker.isKing) {
                score += (act.toR - act.fromR) * forwardDir * 4;
            }

            // Terrain awareness
            const destTerr = this.getTerrain(act.stopR, act.stopC);
            if (destTerr === "rune") score += 12;
            if (destTerr === "lava" && !this.hasItem(attacker, "phase_boots")) score -= 25;
            if (destTerr === "river" && !this.ignoresRiver(attacker)) score -= 12;

            if (score > bestScore) {
                bestScore = score;
                bestAction = act;
            }
        }

        return bestAction;
    }
}

window.BlitzChessEngine = BlitzChessEngine;

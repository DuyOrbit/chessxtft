// ============================================================================
// CHESS TFT - BOARD CONTROLLER (ES MODULE)
// Renders Chess Board cells during Prep & Combat, handles tile clicks & Hit FX
// ============================================================================

import { PIECES } from '../data/pieces.data.js';
import { MAPS } from '../data/maps.data.js';
import { PVE_ENCOUNTERS } from '../data/economy.data.js';
import { PieceRenderer } from './PieceRenderer.js';
import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class BoardController {
    constructor() {
        this.boardEl = document.getElementById('chess-board');
        this.scoutBanner = document.getElementById('scouting-banner');
        this.mapInfoBar = document.getElementById('map-info-bar');
        this.checkAlertEl = document.getElementById('king-check-alert');
    }

    renderBoardArea(app) {
        if (!this.boardEl) return;
        const cfg = app.tft.getStageConfig();

        this.boardEl.style.gridTemplateColumns = `repeat(${cfg.cols}, 1fr)`;
        this.boardEl.style.gridTemplateRows = `repeat(${cfg.rows}, 1fr)`;
        this.boardEl.style.aspectRatio = `${cfg.cols} / ${cfg.rows}`;
        this.boardEl.innerHTML = '';

        if (app.isSkirmishMode && app.chess) {
            document.body.classList.add('skirmish-active');
            const cols = app.chess.cols || 6;
            const rows = app.chess.rows || 7;
            this.boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            this.boardEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
            this.boardEl.style.aspectRatio = `${cols} / ${rows}`;
            this.boardEl.style.width = 'auto';
            this.boardEl.style.height = 'min(560px, 70vh)';
            this.boardEl.style.maxHeight = '580px';
            if (this.scoutBanner) this.scoutBanner.classList.add('hidden');
            const mapDef = MAPS.find(m => m.id === app.skirmishState?.mapId) || MAPS[2];
            if (this.mapInfoBar) {
                this.mapInfoBar.innerHTML = `
                    <span class="map-active-pill" style="background:${mapDef.themeColor}">⚔️ Đấu Trí 1v1: ${mapDef.name}</span>
                    <span class="map-desc-text">${mapDef.desc}</span>
                `;
            }
            this.renderCombatBoardCells(app, this.boardEl, { cols, rows });
            return;
        }

        if (app.isSpectatorPOV) {
            if (typeof app.renderSpectatorPOVBoard === 'function') {
                app.renderSpectatorPOVBoard(this.boardEl, cfg);
            }
            return;
        }

        const isScoutingOther = app.tft.scoutingPlayerId && app.tft.scoutingPlayerId !== 'player';
        if (isScoutingOther) {
            const viewed = app.tft.getParticipantById(app.tft.scoutingPlayerId) || app.tft.player;
            if (this.scoutBanner) this.scoutBanner.classList.remove('hidden');
            const targetNameEl = document.getElementById('scouting-target-name');
            if (targetNameEl) {
                targetNameEl.textContent = `🕵️ Đang Xem Bàn Cờ: ${viewed.name} (${viewed.avatar || '🦊'}) • Cấp ${viewed.level} • ${viewed.hp} HP`;
            }

            const btnProceed = document.getElementById('btn-scout-proceed');
            if (btnProceed) {
                btnProceed.classList.toggle('hidden', !app.isPostMatchSpectating);
            }

            if (this.mapInfoBar) {
                this.mapInfoBar.innerHTML = `
                    <span class="map-hidden-pill">👁️ Khán Giả: <strong>${viewed.name}</strong> • Phím <strong>[1]</strong> / <strong>[2]</strong> hoặc click BXH để đổi nhà</span>
                `;
            }

            this.renderPrepBoardCells(app, this.boardEl, cfg, viewed, true);
            return;
        }

        if (app.tft.phase === 'prep') {
            if (this.scoutBanner) this.scoutBanner.classList.add('hidden');
            if (app.tft.stage === 1) {
                const pveDef = PVE_ENCOUNTERS[app.tft.roundInStage] || PVE_ENCOUNTERS[1];
                if (this.mapInfoBar) {
                    this.mapInfoBar.innerHTML = `
                        <span class="map-active-pill" style="background:#7c3aed">👾 Vòng ${app.tft.stage}-${app.tft.roundInStage}: ${pveDef?.name || 'Quái Khởi Đầu'}</span>
                        <span class="map-desc-text">Đánh bại quái khởi đầu PVE để thu thập Mảnh Trang Bị & Vàng định hình đội hình!</span>
                    `;
                }
            } else {
                const mapDef = app.tft.currentMap || MAPS[0];
                if (this.mapInfoBar) {
                    this.mapInfoBar.innerHTML = `
                        <span class="map-active-pill" style="background:${mapDef.themeColor}">🗺️ Bản Đồ Vòng Tới: ${mapDef.name}</span>
                        <span class="map-desc-text">${mapDef.desc}</span>
                    `;
                }
            }
            this.renderPrepBoardCells(app, this.boardEl, cfg, app.tft.player, false);
        } else if (app.tft.phase === 'combat' && app.chess) {
            if (this.scoutBanner) this.scoutBanner.classList.add('hidden');
            if (app.tft.stage === 1) {
                const pveDef = PVE_ENCOUNTERS[app.tft.roundInStage] || PVE_ENCOUNTERS[1];
                if (this.mapInfoBar) {
                    this.mapInfoBar.innerHTML = `
                        <span class="map-active-pill" style="background:#7c3aed">👾 Giao Tranh PVE: ${pveDef?.name || 'Tượng Quái Đá'}</span>
                        <span class="map-desc-text">${pveDef?.desc || 'Tiêu diệt quái rơi ra mảnh trang bị và vàng khởi đầu.'}</span>
                    `;
                }
            } else {
                if (this.mapInfoBar) {
                    this.mapInfoBar.innerHTML = `
                        <span class="map-active-pill" style="background:${app.tft.currentMap.themeColor}">🗺️ ${app.tft.currentMap.name}</span>
                        <span class="map-desc-text">${app.tft.currentMap.desc}</span>
                    `;
                }
            }
            this.renderCombatBoardCells(app, this.boardEl, cfg);
        }
    }

    renderPrepBoardCells(app, boardEl, cfg, viewedParticipant, isScoutingOther) {
        const minDeployRow = cfg.rows - cfg.deployRows;
        const homeTerrain = (!isScoutingOther && app.tft.currentTerrain) ? app.tft.currentTerrain : null;

        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                const cell = document.createElement('div');
                const isLight = (r + c) % 2 === 0;
                const isDeployZone = r >= minDeployRow;
                const terr = homeTerrain ? homeTerrain[`${r},${c}`] : null;

                cell.className = `board-cell ${isLight ? 'cell-light' : 'cell-dark'} ${isDeployZone ? 'cell-deploy-zone' : 'cell-enemy-zone'}`;

                if (terr) {
                    cell.classList.add(`terrain-${terr}`);
                    const terrBadge = document.createElement('span');
                    terrBadge.className = 'terrain-badge';
                    if (terr === 'river') terrBadge.textContent = '🌊 Sông';
                    else if (terr === 'wall') terrBadge.textContent = '🧱 Đá Cản';
                    else if (terr === 'lava') terrBadge.textContent = '🌋 Dung Nham';
                    else if (terr === 'rune') terrBadge.textContent = '✨ +Tầm';
                    cell.appendChild(terrBadge);
                }

                // Coordinate label on edges
                if (c === 0) {
                    const rLbl = document.createElement('span');
                    rLbl.className = 'coord-label coord-row';
                    rLbl.textContent = cfg.rows - r;
                    cell.appendChild(rLbl);
                }

                // Check if unit is on this tile
                const unit = (viewedParticipant.board || []).find(u => u.r === r && u.c === c);
                if (unit) {
                    const def = PIECES[unit.id];
                    if (def) {
                        const starIdx = Math.min(2, (unit.stars || 1) - 1);
                        let previewHp = def.baseHp[starIdx] + (unit.items?.includes('iron_armor') ? 2 : 0);

                        const pieceEl = PieceRenderer.createPieceDOM({
                            uid: unit.uid,
                            id: unit.id,
                            name: def.name,
                            icon: def.icon,
                            badge: def.badge,
                            stars: unit.stars,
                            side: isScoutingOther ? 'enemy' : 'player',
                            hp: previewHp,
                            maxHp: previewHp,
                            items: unit.items || [],
                            stunnedTurns: 0,
                            burnTurns: 0
                        }, app.tooltipManager);

                        if ((!isScoutingOther || app.isSpectatorPOV) && app.selectedPrepUnitUid === unit.uid) {
                            cell.classList.add('cell-selected');
                        }
                        cell.appendChild(pieceEl);
                    }
                } else if (!isScoutingOther && isDeployZone && (!homeTerrain || homeTerrain[`${r},${c}`] !== 'wall') && app.selectedPrepUnitUid) {
                    cell.classList.add('cell-can-place');
                }

                if (!isScoutingOther || app.isSpectatorPOV) {
                    cell.addEventListener('mouseenter', () => {
                        app.hoveredCell = { r, c };
                        if (unit) {
                            app.hoveredUnit = { type: 'board', unit, r, c, uid: unit.uid };
                            cell.classList.add('cell-hover-target');
                            if (typeof app.highlightPieceMovementPreview === 'function') {
                                app.highlightPieceMovementPreview(unit.id, r, c);
                            }
                        } else {
                            app.hoveredUnit = null;
                            if (typeof app.clearMovementPreview === 'function') {
                                app.clearMovementPreview();
                            }
                        }
                    });
                    cell.addEventListener('mouseleave', () => {
                        cell.classList.remove('cell-hover-target');
                        if (typeof app.clearMovementPreview === 'function') {
                            app.clearMovementPreview();
                        }
                        if (app.hoveredUnit && app.hoveredUnit.uid === unit?.uid) {
                            app.hoveredUnit = null;
                        }
                        if (app.hoveredCell && app.hoveredCell.r === r && app.hoveredCell.c === c) {
                            app.hoveredCell = null;
                        }
                    });
                }

                cell.addEventListener('click', () => {
                    if (app.isSpectatorPOV) {
                        if (unit) {
                            app.selectedPrepUnitUid = (app.selectedPrepUnitUid === unit.uid) ? null : unit.uid;
                            this.renderBoardArea(app);
                            if (typeof app.renderSelectedUnitInspector === 'function') app.renderSelectedUnitInspector();
                        }
                        return;
                    }
                    if (isScoutingOther) {
                        eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                            message: "Bạn đang Soi Bài đối thủ! Bấm 'Về Sân Nhà' để xếp quân của mình.",
                            type: 'info'
                        });
                        return;
                    }
                    this.handlePrepBoardClick(app, r, c, unit);
                });

                boardEl.appendChild(cell);
            }
        }
    }

    handlePrepBoardClick(app, r, c, unitOnCell) {
        // 0. Remover active
        if (app.isRemoverActive && unitOnCell) {
            const res = app.tft.unequipItems(unitOnCell.uid);
            if (res.ok) {
                app.isRemoverActive = false;
                if (app.sfx) app.sfx.move();
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                    message: `✂️ Đã tháo ${res.count} trang bị từ ${res.unitName} về kho đồ!`,
                    type: 'success'
                });
                if (typeof app.renderAll === 'function') app.renderAll();
                if (typeof app.syncMyStateToRoom === 'function') app.syncMyStateToRoom();
            } else {
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: res.msg, type: 'warn' });
            }
            return;
        }

        // 1. Equip item
        if (app.selectedItemIndex !== null && unitOnCell) {
            const res = app.tft.equipItem(app.selectedItemIndex, unitOnCell.uid);
            if (res.ok) {
                app.selectedItemIndex = null;
                if (app.sfx) app.sfx.starUp();
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                    message: `Đã lắp ${res.itemName} cho ${res.unitName}!`,
                    type: 'info'
                });
                if (typeof app.renderAll === 'function') app.renderAll();
            } else {
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: res.msg, type: 'warn' });
            }
            return;
        }

        // 2. Unit already selected -> move/swap
        if (app.selectedPrepUnitUid) {
            if (unitOnCell && unitOnCell.uid === app.selectedPrepUnitUid) {
                app.selectedPrepUnitUid = null;
                if (typeof app.renderAll === 'function') app.renderAll();
                return;
            }
            const res = app.tft.movePlayerUnitToBoard(app.selectedPrepUnitUid, r, c);
            if (res.ok) {
                app.selectedPrepUnitUid = null;
                if (app.sfx) app.sfx.move();
                if (app.isTutorialMode && app.tutorialStep === 2) {
                    if (typeof app.advanceTutorialStep === 'function') app.advanceTutorialStep(3);
                }
                if (typeof app.renderAll === 'function') app.renderAll();
            } else {
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: res.msg, type: 'warn' });
            }
            return;
        }

        // 3. Select unit on cell
        if (unitOnCell) {
            app.selectedPrepUnitUid = unitOnCell.uid;
            if (app.sfx) app.sfx.move();
            if (typeof app.renderAll === 'function') app.renderAll();
        }
    }

    renderCombatBoardCells(app, boardEl, cfg) {
        const eng = app.chess;
        if (!eng) return;

        const isPlayerInCheck = eng.isKingInCheck('player');
        const playerKingDanger = eng.isKingLethallyThreatened('player');

        if (this.checkAlertEl) {
            if (isPlayerInCheck) {
                this.checkAlertEl.classList.remove('hidden');
                if (playerKingDanger) {
                    this.checkAlertEl.innerHTML = '🚨 <strong>NGUY CẤP: CHIẾU SÁT THỦ!</strong> Vua của bạn có thể bị bắt ngay nước tới! Phải chạy Vua hoặc chặn cản!';
                } else {
                    this.checkAlertEl.innerHTML = '🚨 <strong>BẠN ĐANG BỊ CHIẾU TƯỚNG!</strong> Di chuyển Vua hoặc chặn đường tấn công kẻo bị bắt Vua!';
                }
            } else {
                this.checkAlertEl.classList.add('hidden');
            }
        }

        for (let r = 0; r < cfg.rows; r++) {
            for (let c = 0; c < cfg.cols; c++) {
                const cell = document.createElement('div');
                const isLight = (r + c) % 2 === 0;
                const terr = eng.getTerrain ? eng.getTerrain(r, c) : null;
                cell.className = `board-cell ${isLight ? 'cell-light' : 'cell-dark'}`;
                cell.setAttribute('data-row', r);
                cell.setAttribute('data-col', c);

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

                // Highlight last move
                if (eng.lastAction) {
                    if ((eng.lastAction.fromR === r && eng.lastAction.fromC === c) ||
                        (eng.lastAction.toR === r && eng.lastAction.toC === c)) {
                        cell.classList.add('cell-last-move');
                    }
                }

                // Highlight selected piece
                if (app.selectedCombatSquare && app.selectedCombatSquare.r === r && app.selectedCombatSquare.c === c) {
                    cell.classList.add('cell-selected');
                }

                // Highlight valid action targets
                const matchedAction = (app.validCombatActions || []).find(a => a.toR === r && a.toC === c);
                if (matchedAction) {
                    if (matchedAction.type === 'move') {
                        cell.classList.add('cell-valid-move', 'cell-dot-move');
                    } else if (matchedAction.type === 'ranged') {
                        cell.classList.add('cell-valid-ranged', 'cell-dot-attack');
                    } else {
                        cell.classList.add('cell-valid-melee', 'cell-dot-attack');
                    }
                }

                const piece = eng.board[r][c];
                if (piece) {
                    if (piece.id === 'king' && piece.side === 'player' && isPlayerInCheck) {
                        cell.classList.add('cell-king-in-check');
                    }
                    const pieceEl = PieceRenderer.createPieceDOM(piece, app.tooltipManager);
                    cell.appendChild(pieceEl);
                }

                cell.addEventListener('mouseenter', (e) => {
                    if (piece) {
                        cell.classList.add('cell-hover-target');
                        if (app.guideMode === 'beginner') {
                            if (!app.selectedCombatSquare && typeof app.highlightCombatPieceHover === 'function') {
                                app.highlightCombatPieceHover(r, c);
                            }
                            if (app.tooltipManager) app.tooltipManager.showPieceMovementTooltip(piece.id, e);
                        }
                    }
                });

                cell.addEventListener('mousemove', (e) => {
                    if (piece && app.guideMode === 'beginner' && app.tooltipManager) {
                        app.tooltipManager.movePieceMovementTooltip(e);
                    }
                });

                cell.addEventListener('mouseleave', () => {
                    cell.classList.remove('cell-hover-target');
                    if (app.tooltipManager) app.tooltipManager.hidePieceMovementTooltip();
                    if (!app.selectedCombatSquare && typeof app.clearMovementPreview === 'function') {
                        app.clearMovementPreview();
                    }
                });

                cell.addEventListener('click', () => {
                    if (typeof app.clearMovementPreview === 'function') app.clearMovementPreview();
                    if (typeof app.handleCombatBoardClick === 'function') {
                        app.handleCombatBoardClick(r, c, piece, matchedAction);
                    }
                });

                boardEl.appendChild(cell);
            }
        }
    }

    triggerCombatHitFx(hit, app = null) {
        if (!hit || !this.boardEl) return;
        const cell = this.boardEl.querySelector(`.board-cell[data-row='${hit.targetR}'][data-col='${hit.targetC}']`);
        if (!cell) return;

        // 1. Hit flash
        const pieceEl = cell.querySelector('.chess-piece');
        if (pieceEl) {
            pieceEl.classList.remove('hit-flash');
            void pieceEl.offsetWidth;
            pieceEl.classList.add('hit-flash');
            setTimeout(() => pieceEl.classList.remove('hit-flash'), 250);
        } else {
            cell.classList.remove('cell-hit-flash');
            void cell.offsetWidth;
            cell.classList.add('cell-hit-flash');
            setTimeout(() => cell.classList.remove('cell-hit-flash'), 250);
        }

        // 2. Floating damage badge
        const dmgBadge = document.createElement('div');
        dmgBadge.className = `floating-damage ${hit.isCrit ? 'damage-crit' : 'damage-normal'}`;
        dmgBadge.textContent = hit.damageText || (hit.isCrit ? `-${hit.damage || 50} CRIT!` : `-${hit.damage || 25}`);
        cell.appendChild(dmgBadge);

        if (app && typeof app.renderDpsMeter === 'function') {
            app.renderDpsMeter();
        }

        if (window.gsap) {
            window.gsap.fromTo(dmgBadge,
                { y: 0, scale: 0.6, opacity: 0 },
                {
                    y: -36,
                    scale: hit.isCrit ? 1.4 : 1.15,
                    opacity: 1,
                    duration: 0.35,
                    ease: 'back.out(2)',
                    onComplete: () => {
                        window.gsap.to(dmgBadge, {
                            y: -54,
                            opacity: 0,
                            duration: 0.45,
                            ease: 'power2.in',
                            onComplete: () => {
                                if (dmgBadge.parentNode) dmgBadge.parentNode.removeChild(dmgBadge);
                            }
                        });
                    }
                }
            );
        } else {
            setTimeout(() => {
                if (dmgBadge.parentNode) dmgBadge.parentNode.removeChild(dmgBadge);
            }, 900);
        }
    }
}

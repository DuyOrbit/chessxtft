// ============================================================================
// CHESS TFT - BENCH CONTROLLER (ES MODULE)
// Renders the 8 bench slots, bench piece interactions, and quick hotkeys
// ============================================================================

import { PIECES } from '../data/pieces.data.js';
import { PieceRenderer } from './PieceRenderer.js';
import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class BenchController {
    constructor() {
        this.benchEl = document.getElementById('bench-grid');
    }

    render(app) {
        if (!this.benchEl) return;
        this.benchEl.innerHTML = '';

        const viewed = typeof app.getViewedParticipant === 'function'
            ? app.getViewedParticipant()
            : (app.tft.phase === 'prep'
                ? app.tft.getParticipantById(app.tft.scoutingPlayerId)
                : app.tft.player);

        const isSelf = (!app.isSpectatorPOV) && (viewed === app.tft.player || viewed?.id === 'player');
        const benchList = viewed?.bench || [];

        for (let i = 0; i < 8; i++) {
            const slotEl = document.createElement('div');
            const unit = benchList[i];
            slotEl.className = `bench-slot ${unit && app.selectedPrepUnitUid === unit.uid ? 'bench-selected' : ''}`;

            if (unit) {
                const def = PIECES[unit.id];
                if (def) {
                    const starIdx = Math.min(2, (unit.stars || 1) - 1);
                    const maxHp = def.baseHp[starIdx] + (unit.items?.includes('iron_armor') ? 2 : 0);

                    slotEl.appendChild(PieceRenderer.createPieceDOM({
                        uid: unit.uid,
                        id: unit.id,
                        name: def.name,
                        icon: def.icon,
                        badge: def.badge,
                        stars: unit.stars,
                        side: isSelf ? 'player' : 'enemy',
                        hp: maxHp,
                        maxHp: maxHp,
                        items: unit.items || [],
                        stunnedTurns: 0,
                        burnTurns: 0
                    }, app.tooltipManager));

                    const nameTag = document.createElement('div');
                    nameTag.className = 'bench-unit-name';
                    nameTag.textContent = def.name;
                    slotEl.appendChild(nameTag);
                }
            } else {
                slotEl.innerHTML = `<span class="bench-empty-label">Hàng chờ ${i + 1}</span>`;
            }

            slotEl.addEventListener('mouseenter', (e) => {
                if (unit) {
                    app.hoveredUnit = { type: 'bench', unit, slotIndex: i, uid: unit.uid };
                    slotEl.classList.add('bench-hover-target');
                    if (typeof app.clearMovementPreview === 'function') app.clearMovementPreview();
                    if (app.tooltipManager) app.tooltipManager.showPieceMovementTooltip(unit.id, e);
                } else {
                    app.hoveredBenchSlot = i;
                    app.hoveredUnit = null;
                    if (typeof app.clearMovementPreview === 'function') app.clearMovementPreview();
                    if (app.tooltipManager) app.tooltipManager.hidePieceMovementTooltip();
                }
            });

            slotEl.addEventListener('mousemove', (e) => {
                if (unit && app.tooltipManager) {
                    app.tooltipManager.movePieceMovementTooltip(e);
                }
            });

            slotEl.addEventListener('mouseleave', () => {
                slotEl.classList.remove('bench-hover-target');
                if (typeof app.clearMovementPreview === 'function') app.clearMovementPreview();
                if (app.tooltipManager) app.tooltipManager.hidePieceMovementTooltip();
                if (app.hoveredUnit && app.hoveredUnit.uid === unit?.uid) {
                    app.hoveredUnit = null;
                }
                if (app.hoveredBenchSlot === i) {
                    app.hoveredBenchSlot = null;
                }
            });

            slotEl.addEventListener('click', () => {
                if (app.isSpectatorPOV) {
                    if (unit) {
                        app.selectedPrepUnitUid = (app.selectedPrepUnitUid === unit.uid) ? null : unit.uid;
                        this.render(app);
                        if (typeof app.renderSelectedUnitInspector === 'function') app.renderSelectedUnitInspector();
                    }
                    return;
                }
                if (!isSelf) return;

                // Unequip item via Remover tool on bench unit
                if (app.isRemoverActive && unit) {
                    const res = app.tft.unequipItems(unit.uid);
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

                // Equip item onto bench unit
                if (app.selectedItemIndex !== null && unit) {
                    const res = app.tft.equipItem(app.selectedItemIndex, unit.uid);
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

                // Move board unit to empty bench slot
                if (app.selectedPrepUnitUid && !unit) {
                    const res = app.tft.moveBoardUnitToBench(app.selectedPrepUnitUid, i);
                    if (res.ok) {
                        app.selectedPrepUnitUid = null;
                        if (app.sfx) app.sfx.move();
                        if (typeof app.renderAll === 'function') app.renderAll();
                        return;
                    }
                }

                if (unit) {
                    app.selectedPrepUnitUid = app.selectedPrepUnitUid === unit.uid ? null : unit.uid;
                    if (app.sfx) app.sfx.move();
                    if (typeof app.renderAll === 'function') app.renderAll();
                }
            });

            this.benchEl.appendChild(slotEl);
        }
    }

    handleHotkeySellPiece(app) {
        if (app.isSpectatorPOV) return;
        const gameScreen = document.getElementById('screen-game');
        if (!gameScreen || gameScreen.classList.contains('hidden')) return;

        let targetUid = null;
        if (app.hoveredUnit && app.hoveredUnit.uid) {
            targetUid = app.hoveredUnit.uid;
        } else if (app.selectedPrepUnitUid) {
            targetUid = app.selectedPrepUnitUid;
        }

        if (!targetUid) {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                message: '💡 Trỏ chuột vào quân cờ (hoặc bấm chọn) rồi nhấn phím [E] để Bán Nhanh!',
                type: 'info'
            });
            return;
        }

        const benchUnit = app.tft.player.bench.find(u => u && u.uid === targetUid);
        const boardUnit = app.tft.player.board.find(u => u && u.uid === targetUid);
        const targetUnit = benchUnit || boardUnit;

        if (!targetUnit) {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Không tìm thấy quân cờ để bán!', type: 'warn' });
            return;
        }

        if (targetUnit.id === 'king') {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Không thể bán Quốc Vương (Vua)!', type: 'warn' });
            return;
        }

        if (app.tft.phase !== 'prep' && boardUnit) {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Không thể bán quân đang trên bàn cờ khi đang Giao Tranh!', type: 'warn' });
            return;
        }

        const res = app.tft.sellUnit(targetUnit.uid);
        if (res.ok) {
            if (app.selectedPrepUnitUid === targetUnit.uid) {
                app.selectedPrepUnitUid = null;
            }
            if (app.hoveredUnit && app.hoveredUnit.uid === targetUnit.uid) {
                app.hoveredUnit = null;
            }
            if (app.sfx) app.sfx.move();
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                message: `💰 Đã bán nhanh [E] ${res.name} (+${res.refund} 🪙)`,
                type: 'info'
            });
            if (typeof app.renderAll === 'function') app.renderAll();
            if (typeof app.syncMyStateToRoom === 'function') app.syncMyStateToRoom();

            const sellBtn = document.getElementById('btn-sell-selected');
            if (sellBtn && !sellBtn.classList.contains('hidden')) {
                sellBtn.classList.add('btn-key-pressed');
                setTimeout(() => sellBtn.classList.remove('btn-key-pressed'), 150);
            }
        } else {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: res.msg || 'Không thể bán quân cờ!', type: 'warn' });
        }
    }

    handleHotkeyDeployOrRecall(app) {
        if (app.isSpectatorPOV) return;
        const gameScreen = document.getElementById('screen-game');
        if (!gameScreen || gameScreen.classList.contains('hidden')) return;

        if (app.tft.phase !== 'prep') {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                message: 'Chỉ có thể điều động hoặc thu hồi quân cờ trong Giai Đoạn Chuẩn Bị!',
                type: 'warn'
            });
            return;
        }

        let targetUid = null;
        if (app.hoveredUnit && app.hoveredUnit.uid) {
            targetUid = app.hoveredUnit.uid;
        } else if (app.selectedPrepUnitUid) {
            targetUid = app.selectedPrepUnitUid;
        }

        if (!targetUid) {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                message: '💡 Trỏ chuột vào quân cờ rồi bấm phím [W] để đưa lên sân hoặc thu hồi!',
                type: 'info'
            });
            return;
        }

        const benchUnit = app.tft.player.bench.find(u => u && u.uid === targetUid);
        const boardUnit = app.tft.player.board.find(u => u && u.uid === targetUid);

        // CASE 1: UNIT IS ON BENCH -> DEPLOY TO BOARD
        if (benchUnit) {
            const cfg = app.tft.getStageConfig();
            const minR = cfg.rows - cfg.deployRows;

            let targetR = -1;
            let targetC = -1;

            if (app.hoveredCell && app.hoveredCell.r >= minR && app.hoveredCell.r < cfg.rows) {
                const occupied = app.tft.player.board.some(u => u.r === app.hoveredCell.r && u.c === app.hoveredCell.c);
                if (!occupied) {
                    targetR = app.hoveredCell.r;
                    targetC = app.hoveredCell.c;
                }
            }

            if (targetR === -1) {
                const centerC = Math.floor(cfg.cols / 2);
                const colOrder = [centerC];
                for (let d = 1; d < cfg.cols; d++) {
                    if (centerC - d >= 0) colOrder.push(centerC - d);
                    if (centerC + d < cfg.cols) colOrder.push(centerC + d);
                }

                for (let r = cfg.rows - 1; r >= minR; r--) {
                    for (const c of colOrder) {
                        const occupied = app.tft.player.board.some(u => u.r === r && u.c === c);
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
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Không còn ô trống nào trong khu vực sân nhà!', type: 'warn' });
                return;
            }

            const res = app.tft.movePlayerUnitToBoard(benchUnit.uid, targetR, targetC);
            if (res.ok) {
                const def = PIECES[benchUnit.id];
                app.selectedPrepUnitUid = null;
                app.hoveredUnit = null;
                if (app.sfx) app.sfx.move();
                if (app.isTutorialMode && app.tutorialStep === 2) {
                    if (typeof app.advanceTutorialStep === 'function') app.advanceTutorialStep(3);
                }
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                    message: `⚔️ Đã đưa [W] ${def.name} lên sân đấu!`,
                    type: 'info'
                });
                if (typeof app.renderAll === 'function') app.renderAll();
                if (typeof app.syncMyStateToRoom === 'function') app.syncMyStateToRoom();
            } else {
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: res.msg || 'Không thể đặt quân lên sàn!', type: 'warn' });
            }
            return;
        }

        // CASE 2: UNIT IS ON BOARD -> RECALL TO BENCH
        if (boardUnit) {
            if (boardUnit.id === 'king') {
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Quốc Vương bắt buộc phải ở trên bàn cờ!', type: 'warn' });
                return;
            }

            const res = app.tft.moveBoardUnitToBench(boardUnit.uid);
            if (res.ok) {
                const def = PIECES[boardUnit.id];
                app.selectedPrepUnitUid = null;
                app.hoveredUnit = null;
                if (app.sfx) app.sfx.move();
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                    message: `📦 Đã thu hồi [W] ${def.name} về hàng chờ!`,
                    type: 'info'
                });
                if (typeof app.renderAll === 'function') app.renderAll();
                if (typeof app.syncMyStateToRoom === 'function') app.syncMyStateToRoom();
            } else {
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: res.msg || 'Hàng chờ đã đầy!', type: 'warn' });
            }
        }
    }
}

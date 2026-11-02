// ============================================================================
// CHESS TFT - TOOLTIP MANAGER (ES MODULE)
// Floating Tooltips for Items, Synergies, and Piece Movement Previews
// ============================================================================

import { ITEMS } from '../data/items.data.js';
import { PIECES } from '../data/pieces.data.js';
import { TRAITS, SYNERGIES } from '../data/traits.data.js';

export class TooltipManager {
    constructor() {
        this.synergyEl = document.getElementById('synergy-tooltip');
        this.itemEl = document.getElementById('item-tooltip');
        this.movementEl = document.getElementById('piece-movement-tooltip');
    }

    // --- ITEM TOOLTIP ---
    showItemTooltip(itemId, evt) {
        const item = ITEMS[itemId];
        if (!item) return;

        const tipEl = document.getElementById('item-tooltip');
        if (!tipEl) return;

        tipEl.innerHTML = `
            <div class="item-tip-header">
                <div class="item-tip-icon">${item.icon}</div>
                <div>
                    <div class="item-tip-name">${item.name}</div>
                    <div class="item-tip-tag">Trang Bị Cờ Chớp TFT</div>
                </div>
            </div>
            <div class="item-tip-desc">${item.desc}</div>
            <div class="item-tip-instruction">💡 Click trang bị rồi click vào quân cờ để lắp đồ. Hoặc chọn quân rồi bấm "Gỡ Đồ" để thu hồi.</div>
        `;
        tipEl.classList.remove('hidden');
        this.moveItemTooltip(evt);
    }

    moveItemTooltip(evt) {
        const tipEl = document.getElementById('item-tooltip');
        if (!tipEl || tipEl.classList.contains('hidden') || !evt) return;

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

    hideItemTooltip() {
        const tipEl = document.getElementById('item-tooltip');
        if (tipEl) tipEl.classList.add('hidden');
    }

    // --- PIECE MOVEMENT MINI-GRID TOOLTIP ---
    getPieceMovementGrid(pieceId) {
        const grid = Array.from({ length: 5 }, () => Array(5).fill(null));
        grid[2][2] = 'center';
        const def = PIECES[pieceId];
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
            case 'king':
            case 'mercenary': {
                for (const [dr, dc] of allDirs) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = 'move';
                }
                break;
            }
            case 'shield_pawn': {
                grid[1][2] = 'move';
                grid[1][1] = 'pawn-atk';
                grid[1][3] = 'pawn-atk';
                break;
            }
            case 'fire_mage':
            case 'gambler': {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = 'move';
                    grid[2 + dr * 2][2 + dc * 2] = 'attack';
                }
                break;
            }
            case 'archer':
            case 'grand_queen':
            case 'corsair': {
                for (const [dr, dc] of allDirs) {
                    grid[2 + dr][2 + dc] = 'move';
                    if (in5(2 + dr * 2, 2 + dc * 2)) grid[2 + dr * 2][2 + dc * 2] = 'attack';
                }
                break;
            }
            case 'knight':
            case 'frost_knight': {
                for (const [dr, dc] of knightJumps) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = 'jump';
                }
                break;
            }
            case 'pyro_bishop': {
                for (const [dr, dc] of diagDirs) {
                    grid[2 + dr][2 + dc] = 'move';
                    grid[2 + dr * 2][2 + dc * 2] = 'attack';
                }
                break;
            }
            case 'juggernaut':
            case 'frost_rook': {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = 'move';
                    grid[2 + dr * 2][2 + dc * 2] = 'move';
                }
                break;
            }
            case 'cannon': {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = 'move';
                    grid[2 + dr * 2][2 + dc * 2] = 'cannon';
                }
                break;
            }
            case 'chancellor': {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = 'move';
                    grid[2 + dr * 2][2 + dc * 2] = 'move';
                }
                for (const [dr, dc] of knightJumps) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = 'jump';
                }
                break;
            }
            case 'target_dummy':
                break;
            default: {
                for (const [dr, dc] of allDirs) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = 'move';
                }
                break;
            }
        }
        return grid;
    }

    showPieceMovementTooltip(pieceId, evt) {
        const def = PIECES[pieceId];
        if (!def) return;

        const tipEl = document.getElementById('piece-movement-tooltip');
        if (!tipEl) return;

        const grid = this.getPieceMovementGrid(pieceId);
        let cellsHtml = '';

        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const cellType = grid[r][c];
                const isLight = (r + c) % 2 === 0;
                let cellClass = `pmt-cell ${isLight ? 'cell-light' : 'cell-dark'}`;
                let cellContent = '';

                if (cellType === 'center') {
                    cellClass += ' cell-center';
                    cellContent = '♟️';
                } else if (cellType === 'move') {
                    cellClass += ' cell-move';
                    cellContent = '•';
                } else if (cellType === 'attack') {
                    cellClass += ' cell-attack';
                    cellContent = '🎯';
                } else if (cellType === 'jump') {
                    cellClass += ' cell-jump';
                    cellContent = '⚡';
                } else if (cellType === 'pawn-atk') {
                    cellClass += ' cell-pawn-atk';
                    cellContent = '⚔️';
                } else if (cellType === 'cannon') {
                    cellClass += ' cell-cannon';
                    cellContent = '💣';
                }

                cellsHtml += `<div class="${cellClass}">${cellContent}</div>`;
            }
        }

        tipEl.innerHTML = `
            <div class="pmt-header">
                <span class="pmt-title">${def.icon} ${def.name}</span>
                <span class="pmt-cost">${def.isKing ? 'Vua' : `${def.cost} Vàng 🪙`}</span>
            </div>
            <div class="pmt-grid-wrap">
                <div class="pmt-grid">${cellsHtml}</div>
            </div>
            <div class="pmt-desc">${def.desc}</div>
        `;

        tipEl.classList.remove('hidden');
        this.movePieceMovementTooltip(evt);
    }

    movePieceMovementTooltip(evt) {
        if (!evt) return;
        const tipEl = document.getElementById('piece-movement-tooltip');
        if (!tipEl || tipEl.classList.contains('hidden')) return;

        const pad = 14;
        let x = evt.clientX + pad;
        let y = evt.clientY + pad;

        const rect = tipEl.getBoundingClientRect();
        if (x + rect.width > window.innerWidth - 10) {
            x = Math.max(10, evt.clientX - rect.width - pad);
        }
        if (y + rect.height > window.innerHeight - 10) {
            y = Math.max(10, window.innerHeight - rect.height - 10);
        }

        tipEl.style.left = `${x}px`;
        tipEl.style.top = `${y}px`;
    }

    hidePieceMovementTooltip() {
        const tipEl = document.getElementById('piece-movement-tooltip');
        if (tipEl) tipEl.classList.add('hidden');
    }

    // --- SYNERGY TOOLTIP ---
    showSynergyTooltip(traitId, evt, activeSynergies = {}, targetPart = null) {
        const synDef = SYNERGIES[traitId] || TRAITS[traitId];
        if (!synDef) return;

        const currentSyn = activeSynergies[traitId] || { count: 0, activeTier: 0 };
        const boardIds = new Set((targetPart?.board || []).map(u => u && u.id));
        const benchIds = new Set((targetPart?.bench || []).filter(Boolean).map(u => u.id));

        const tiersHtml = synDef.thresholds.map(th => {
            const isTierActive = currentSyn.activeTier === th;
            return `
                <div class="syn-tier-row ${isTierActive ? 'tier-active' : ''}">
                    <span class="syn-tier-num">(${th})</span>
                    <span>${synDef.effectText[th]} ${isTierActive ? '✓' : ''}</span>
                </div>
            `;
        }).join('');

        const matchingPieces = Object.values(PIECES)
            .filter(p => p.traits && p.traits.includes(traitId))
            .sort((a, b) => a.cost - b.cost);

        const unitsHtml = matchingPieces.map(p => {
            const onBoard = boardIds.has(p.id);
            const onBench = !onBoard && benchIds.has(p.id);
            const stateClass = onBoard ? 'unit-on-board' : (onBench ? 'unit-on-bench' : '');
            const costLabel = p.isKing ? 'Mặc định (Vua)' : `${p.cost} Vàng 🪙`;
            const statusTag = onBoard ? ' • ✓ Trên sân' : (onBench ? ' • Hàng chờ' : '');

            return `
                <div class="syn-unit-chip ${stateClass}">
                    <span class="syn-unit-icon"><img src="assets/pieces/${p.id}.svg" class="syn-unit-svg" alt="${p.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" /><span class="syn-unit-fallback" style="display:none;">${p.icon}</span></span>
                    <div class="syn-unit-meta">
                        <span class="syn-unit-name">${p.name}</span>
                        <span class="syn-unit-cost">${costLabel}${statusTag}</span>
                    </div>
                </div>
            `;
        }).join('');

        const tipEl = document.getElementById('synergy-tooltip');
        if (!tipEl) return;

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
        tipEl.classList.remove('hidden');
    }

    hideSynergyTooltip() {
        const tipEl = document.getElementById('synergy-tooltip');
        if (tipEl) tipEl.classList.add('hidden');
    }
}

export const tooltipManager = new TooltipManager();
export default tooltipManager;

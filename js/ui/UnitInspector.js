// ============================================================================
// CHESS TFT - UNIT INSPECTOR (ES MODULE)
// Renders selected piece info (HP, items, synergies, sell value, unequip)
// ============================================================================

import { PIECES } from '../data/pieces.data.js';
import { ITEMS } from '../data/items.data.js';
import { tooltipManager } from './TooltipManager.js';

export class UnitInspector {
    constructor() {
        this.boxEl = document.getElementById('selected-unit-box');
        this.sellBtn = document.getElementById('btn-sell-selected');
        this.unequipBtn = document.getElementById('btn-unequip-selected');
        this.directSellBtn = document.getElementById('btn-sell-hud-direct');
        this.hudSellLabel = document.getElementById('hud-sell-label');
    }

    render(unit, options = {}) {
        const { isSpectator = false, phase = 'prep', getSellValue = () => 0 } = options;

        if (!this.boxEl) return;

        if (!unit) {
            this.boxEl.innerHTML = `<div class="empty-hint">Bấm vào 1 quân cờ để xem chi tiết bước đi, Lớp Máu hoặc Bán quân.</div>`;
            this.sellBtn?.classList.add('hidden');
            this.unequipBtn?.classList.add('hidden');
            if (this.directSellBtn) {
                this.directSellBtn.style.opacity = '0.5';
                if (this.hudSellLabel) this.hudSellLabel.textContent = '💰 BÁN TƯỚNG (E)';
            }
            return;
        }

        const def = PIECES[unit.id];
        if (!def) return;

        const starIdx = Math.min(2, (unit.stars || 1) - 1);
        const hpDisplay = unit.hp !== undefined ? `${unit.hp}/${unit.maxHp}` : `${def.baseHp[starIdx]}`;

        let itemsHtml = '';
        if (unit.items && unit.items.length > 0) {
            itemsHtml = `<div class="insp-items-row" style="margin-top:4px; display:flex; gap:4px; align-items:center;">
                <span style="font-size:0.7rem; color:#fbbf24; font-weight:700;">Đồ mang:</span>
                ${unit.items.map(itId => {
                    const it = ITEMS[itId];
                    return it ? `<span class="lb-item-badge" style="cursor:help;" data-item-id="${itId}" title="${it.name}: ${it.desc}">${it.icon} ${it.name}</span>` : '';
                }).join('')}
            </div>`;
        }

        this.boxEl.innerHTML = `
            <div class="insp-head">
                <div class="insp-icon-wrap">
                    <img src="assets/pieces/${def.id}.svg" class="insp-svg" alt="${def.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
                    <span class="insp-fallback" style="display:none;">${def.icon}</span>
                </div>
                <div>
                    <div class="insp-title">${def.name} ${'★'.repeat(unit.stars || 1)}</div>
                    <div class="insp-meta">🛡️ Lớp Máu: <strong>${hpDisplay}</strong> • 🎯 Tầm: <strong>${def.range[starIdx]}</strong></div>
                </div>
            </div>
            ${itemsHtml}
            <div class="insp-desc">${def.desc}</div>
        `;

        this.boxEl.querySelectorAll('[data-item-id]').forEach(el => {
            const itemId = el.getAttribute('data-item-id');
            el.addEventListener('mouseenter', (e) => tooltipManager.showItemTooltip(itemId, e));
            el.addEventListener('mousemove', (e) => tooltipManager.moveItemTooltip(e));
            el.addEventListener('mouseleave', () => tooltipManager.hideItemTooltip());
        });

        if (!isSpectator && phase === 'prep' && !def.isKing) {
            const refund = getSellValue(unit);
            const feeNote = unit.stars > 1 ? ` <span style="font-size:0.7em; opacity:0.8;">(-${unit.stars === 2 ? 1 : 2}🪙 phí ghép)</span>` : '';
            if (this.sellBtn) {
                this.sellBtn.innerHTML = `💰 Bán (+${refund} 🪙)${feeNote}`;
                this.sellBtn.classList.remove('hidden');
            }
            if (this.directSellBtn) {
                this.directSellBtn.style.opacity = '1';
                if (this.hudSellLabel) this.hudSellLabel.textContent = `💰 BÁN (+${refund}🪙)${unit.stars > 1 ? ` [-${unit.stars === 2 ? 1 : 2}🪙 phí]` : ''}`;
            }
            if (this.unequipBtn) {
                if (unit.items && unit.items.length > 0) {
                    this.unequipBtn.classList.remove('hidden');
                    this.unequipBtn.innerHTML = `📦 Gỡ Đồ (${unit.items.length})`;
                } else {
                    this.unequipBtn.classList.add('hidden');
                }
            }
        } else {
            this.sellBtn?.classList.add('hidden');
            this.unequipBtn?.classList.add('hidden');
            if (this.directSellBtn) {
                this.directSellBtn.style.opacity = '0.5';
                if (this.hudSellLabel) this.hudSellLabel.textContent = '💰 BÁN TƯỚNG (E)';
            }
        }
    }
}

export const unitInspector = new UnitInspector();
export default unitInspector;

// ============================================================================
// CHESS TFT - PIECE RENDERER (ES MODULE)
// Builds piece DOM with stars, HP bar, status badges, and item slots
// ============================================================================

import { ITEMS } from '../data/items.data.js';

export class PieceRenderer {
    static createPieceDOM(piece, tooltipManager = null) {
        const wrapper = document.createElement('div');
        wrapper.className = `chess-piece piece-${piece.side} star-${piece.stars} ${piece.stunnedTurns > 0 ? 'piece-stunned' : ''} ${piece.burnTurns > 0 ? 'piece-burning' : ''}`;
        wrapper.setAttribute('data-piece-id', piece.id);

        const starsStr = '★'.repeat(piece.stars || 1);

        // Multi-HP shield pips bar
        let hpHtml = '';
        for (let i = 0; i < piece.maxHp; i++) {
            const filled = i < piece.hp;
            hpHtml += `<span class="hp-pip ${filled ? 'hp-filled' : 'hp-empty'}"></span>`;
        }

        // Status badges (Stun / Stun Immunity / Reload / Burn)
        let statusHtml = '';
        if (piece.stunnedTurns > 0) {
            statusHtml += `<span class="status-pill status-stun" title="Đang bị Choáng (Khóa di chuyển)"><i data-lucide="zap" class="icon-amber"></i></span>`;
        } else if ((piece.stunImmuneTurns || 0) > 0) {
            statusHtml += `<span class="status-pill status-immune" title="Đang Kháng Choáng (Miễn nhiễm choáng liên tiếp)"><i data-lucide="shield" class="icon-cyan"></i></span>`;
        }
        if ((piece.reloadTurns || 0) > 0) {
            statusHtml += `<span class="status-pill status-reload" title="Đang Nạp Đạn (Lượt này chỉ di chuyển/cận chiến, lượt sau mới bắn xa tiếp)"><i data-lucide="hourglass" class="icon-purple"></i></span>`;
        }
        if (piece.burnTurns > 0) {
            statusHtml += `<span class="status-pill status-burn" title="Đang bị Thiêu Đốt (Nổ lan 8 ô sau ${piece.burnTurns} lượt)"><i data-lucide="flame" class="icon-red"></i>${piece.burnTurns}</span>`;
        }

        // Equipped items icons (TFT Mini Icons)
        let itemsHtml = '';
        if (piece.items && piece.items.length > 0) {
            itemsHtml = `<div class="piece-items">` +
                piece.items.map(id => {
                    const it = ITEMS[id];
                    return it ? `<span class="piece-mini-item" data-item-id="${id}" title="${it.name}: ${it.desc}">${it.icon}</span>` : '';
                }).join('') +
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
            </div>
            <div class="piece-hp-bar" title="Lớp Máu: ${piece.hp}/${piece.maxHp} (Phải bị ăn ${piece.hp} lần mới chết)">
                ${hpHtml}
            </div>
            ${itemsHtml}
        `;

        wrapper.querySelectorAll('[data-item-id]').forEach(el => {
            const itemId = el.getAttribute('data-item-id');
            el.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                if (tooltipManager) tooltipManager.showItemTooltip(itemId, e);
            });
            el.addEventListener('mousemove', (e) => {
                e.stopPropagation();
                if (tooltipManager) tooltipManager.moveItemTooltip(e);
            });
            el.addEventListener('mouseleave', (e) => {
                e.stopPropagation();
                if (tooltipManager) tooltipManager.hideItemTooltip();
            });
        });

        return wrapper;
    }
}

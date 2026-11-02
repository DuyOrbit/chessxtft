// ============================================================================
// CHESS TFT - SYNERGY PANEL (ES MODULE)
// Renders active and unplaced synergies in the left panel
// ============================================================================

import { SYNERGIES, TRAITS } from '../data/traits.data.js';

export class SynergyPanel {
    constructor() {
        this.container = document.getElementById('synergy-list');
    }

    render(app) {
        if (!this.container) return;
        this.container.innerHTML = '';

        let viewedParticipant;
        if (app.isSkirmishMode) {
            const playerPieces = app.chess
                ? app.chess.board.flat().filter(p => p && p.side === 'player')
                : (app.skirmishState?.units || []);
            viewedParticipant = { board: playerPieces };
        } else {
            viewedParticipant = typeof app.getViewedParticipant === 'function'
                ? app.getViewedParticipant()
                : (app.tft.phase === 'prep'
                    ? app.tft.getParticipantById(app.tft.scoutingPlayerId)
                    : app.tft.player);
        }

        const synergies = app.tft.calculateSynergies(viewedParticipant);
        const entries = Object.values(synergies).sort((a, b) =>
            (b.activeTier > 0 ? 1 : 0) - (a.activeTier > 0 ? 1 : 0) || b.count - a.count
        );

        if (entries.length === 0) {
            this.container.innerHTML = `<div class="empty-hint">Chưa có Tộc/Hệ nào trên sân.</div>`;
        } else {
            for (const syn of entries) {
                const isActive = syn.activeTier > 0;
                const badge = document.createElement('div');
                badge.className = `synergy-item ${isActive ? 'synergy-active' : 'synergy-inactive'}`;
                const threshStr = (syn.thresholds || []).join(' / ');
                const activeBonus = isActive
                    ? (syn.effectText?.[syn.activeTier] || '')
                    : `Cần ${syn.thresholds?.[0] || 2} quân để kích hoạt`;

                badge.innerHTML = `
                    <div class="synergy-head">
                        <span class="synergy-icon" style="background:${isActive ? syn.color : '#334155'}">${syn.icon}</span>
                        <div class="synergy-title-wrap">
                            <span class="synergy-name">${syn.name}</span>
                            <span class="synergy-count">${syn.count} (${threshStr})</span>
                        </div>
                    </div>
                    <div class="synergy-desc">${activeBonus}</div>
                `;

                badge.addEventListener('mouseenter', (e) => {
                    if (app.tooltipManager) app.tooltipManager.showSynergyTooltip(syn.id, e, viewedParticipant);
                });
                badge.addEventListener('mousemove', (e) => {
                    if (app.tooltipManager) app.tooltipManager.moveSynergyTooltip(e);
                });
                badge.addEventListener('mouseleave', () => {
                    if (app.tooltipManager) app.tooltipManager.hideSynergyTooltip();
                });

                this.container.appendChild(badge);
            }
        }

        // Also show compact pills for all other Synergies not yet on board so player can hover to inspect any Tộc/Hệ
        const unplaced = Object.values(SYNERGIES).filter(s => !synergies[s.id]);
        if (unplaced.length > 0) {
            const divTitle = document.createElement('div');
            divTitle.className = 'synergy-unplaced-divider';
            divTitle.textContent = 'Tộc/Hệ khác (Trỏ chuột xem chi tiết):';
            this.container.appendChild(divTitle);

            const miniWrap = document.createElement('div');
            miniWrap.className = 'synergy-mini-pills';
            for (const sDef of unplaced) {
                const pill = document.createElement('span');
                pill.className = 'synergy-mini-pill';
                pill.innerHTML = `${sDef.icon} ${sDef.name}`;
                pill.addEventListener('mouseenter', (e) => {
                    if (app.tooltipManager) app.tooltipManager.showSynergyTooltip(sDef.id, e, viewedParticipant);
                });
                pill.addEventListener('mousemove', (e) => {
                    if (app.tooltipManager) app.tooltipManager.moveSynergyTooltip(e);
                });
                pill.addEventListener('mouseleave', () => {
                    if (app.tooltipManager) app.tooltipManager.hideSynergyTooltip();
                });
                miniWrap.appendChild(pill);
            }
            this.container.appendChild(miniWrap);
        }
    }
}

// ============================================================================
// CHESS TFT - HUD CONTROLLER (ES MODULE)
// Renders Top Bar indicators, HUD stats, roll odds & Blitz clocks
// ============================================================================

import { SHOP_ODDS, LEVEL_XP } from '../data/economy.data.js';

export class HUDController {
    constructor() {
        this.hpEl = document.getElementById('player-hp');
        this.goldEl = document.getElementById('player-gold');
        this.levelEl = document.getElementById('player-level');
        this.unitCapEl = document.getElementById('player-unit-cap');
        this.stageBadgeEl = document.getElementById('stage-round-badge');
        this.hudLvlEl = document.getElementById('hud-level-name');
        this.hudGoldEl = document.getElementById('hud-gold-amount');
        this.hudXpEl = document.getElementById('hud-xp-amount');
        this.hudXpFillEl = document.getElementById('hud-xp-fill');
        this.playerClockEl = document.getElementById('clock-player');
        this.enemyClockEl = document.getElementById('clock-enemy');
        this.playerClockBox = document.getElementById('clock-box-player');
        this.enemyClockBox = document.getElementById('clock-box-enemy');
    }

    updatePlayerStats(player, stage = 1, roundInStage = 1) {
        if (!player) return;

        if (this.hpEl) this.hpEl.textContent = `${player.hp} HP`;
        if (this.goldEl) this.goldEl.textContent = `${player.gold} 🪙`;
        if (this.levelEl) this.levelEl.textContent = `Cấp ${player.level}`;
        if (this.unitCapEl) this.unitCapEl.textContent = `Quân: ${(player.board || []).length}/${player.level + 1}`;
        if (this.stageBadgeEl) this.stageBadgeEl.textContent = `Vòng ${stage}-${roundInStage}`;

        if (this.hudLvlEl) this.hudLvlEl.textContent = `CẤP ${player.level}`;
        if (this.hudGoldEl) this.hudGoldEl.textContent = player.gold;

        const maxLvlXp = LEVEL_XP[player.level] || 99;
        if (this.hudXpEl) this.hudXpEl.textContent = player.level >= 8 ? 'MAX' : `${player.xp}/${maxLvlXp}`;
        if (this.hudXpFillEl) {
            const pct = player.level >= 8 ? 100 : Math.min(100, (player.xp / maxLvlXp) * 100);
            this.hudXpFillEl.style.width = `${pct}%`;
        }

        this.updateRollOdds(player.level);
    }

    updateRollOdds(level) {
        const odds = SHOP_ODDS[level] || [100, 0, 0, 0, 0];
        const pills = document.querySelectorAll('.odd-pill');
        odds.forEach((val, idx) => {
            if (pills[idx]) {
                pills[idx].textContent = `${val}%`;
                pills[idx].style.opacity = val > 0 ? '1' : '0.35';
            }
        });
    }

    updateClocks(playerSeconds, enemySeconds, activeSide = null, isGameOver = false) {
        if (this.playerClockEl) this.playerClockEl.textContent = `${playerSeconds.toFixed(1)}s`;
        if (this.enemyClockEl) this.enemyClockEl.textContent = `${enemySeconds.toFixed(1)}s`;

        if (this.playerClockBox) {
            this.playerClockBox.classList.toggle('clock-active', activeSide === 'player' && !isGameOver);
        }
        if (this.enemyClockBox) {
            this.enemyClockBox.classList.toggle('clock-active', activeSide === 'enemy' && !isGameOver);
        }
    }
}

export const hudController = new HUDController();
export default hudController;

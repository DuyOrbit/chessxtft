// ============================================================================
// CHESS TFT - SHOP CONTROLLER (ES MODULE)
// Renders Shop Cards, Roll Odds, Buy/Lock/Reroll and Buy XP actions
// ============================================================================

import { PIECES } from '../data/pieces.data.js';
import { SYNERGIES } from '../data/traits.data.js';
import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class ShopController {
    constructor() {
        this.shopEl = document.getElementById('shop-cards');
        this.lockBtn = document.getElementById('btn-lock-shop');
        this.lockIcon = document.getElementById('btn-lock-icon');
        this.lockLabel = document.getElementById('btn-lock-label');
        this.rerollBtn = document.getElementById('btn-reroll');
        this.buyXpBtn = document.getElementById('btn-buy-xp');
    }

    renderShop(app) {
        if (!this.shopEl) return;
        this.shopEl.innerHTML = '';

        if (app.isSpectatorPOV) {
            const viewed = typeof app.getViewedParticipant === 'function' ? app.getViewedParticipant() : null;
            this.shopEl.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; color:#94a3b8; font-weight:700; font-size:0.95rem; letter-spacing:0.5px;">🔴 CHẾ ĐỘ KHÁN GIẢ: Đang theo dõi kỳ thủ ${viewed?.name || ''} (Cấp ${viewed?.level || 1} • ${viewed?.gold || 0} 🪙)</div>`;
            return;
        }

        const isLocked = !!app.tft.shopLocked;
        this.shopEl.classList.toggle('shop-locked', isLocked);

        if (this.lockBtn) {
            this.lockBtn.classList.toggle('is-locked', isLocked);
            this.lockBtn.title = isLocked
                ? 'Cửa hàng đang KHÓA (Giữ nguyên thẻ bài cho vòng sau). Bấm hoặc nhấn [Space] để Mở Khóa.'
                : 'Khóa Cửa Hàng: Giữ nguyên 5 quân cờ này sang vòng sau (Phím tắt: Space / X).';

            if (this.lockIcon) {
                this.lockIcon.innerHTML = isLocked ? `<i data-lucide="lock" class="icon-amber"></i>` : `<i data-lucide="unlock"></i>`;
            }
            if (this.lockLabel) {
                this.lockLabel.textContent = isLocked ? 'Đã Khóa' : 'Giữ bài';
            }
        }

        if (this.rerollBtn) {
            const freeCount = app.tft.player.freeRerolls || 0;
            if (freeCount > 0) {
                this.rerollBtn.innerHTML = `
                    <div class="hud-btn-main">
                        <span class="reroll-btn-title"><i data-lucide="sparkles" class="icon-gold"></i> ĐỔI FREE</span>
                        <span class="hud-keybind-badge">D</span>
                    </div>
                    <span class="reroll-btn-cost badge-free-reroll">FREE (${freeCount})</span>
                `;
                this.rerollBtn.classList.add('btn-free-reroll');
                this.rerollBtn.title = `Bạn có ${freeCount} lượt đổi shop miễn phí nhờ chuỗi thua! (Phím tắt: D)`;
            } else {
                this.rerollBtn.innerHTML = `
                    <div class="hud-btn-main">
                        <span class="reroll-btn-title"><i data-lucide="refresh-cw" class="icon-cyan"></i> ĐỔI LẠI</span>
                        <span class="hud-keybind-badge">D</span>
                    </div>
                    <span id="reroll-cost-label" class="reroll-btn-cost">2 <i data-lucide="coins" class="icon-amber"></i></span>
                `;
                this.rerollBtn.classList.remove('btn-free-reroll');
                this.rerollBtn.title = 'Đổi mới 5 quân cờ trong Cửa Hàng (Tốn 2 Vàng - Phím tắt: D)';
            }
        }

        for (const slot of app.tft.shop) {
            const card = document.createElement('div');
            if (slot.sold) {
                card.className = 'shop-card shop-sold';
                card.innerHTML = `<div class="sold-text">ĐÃ MUA</div>`;
                this.shopEl.appendChild(card);
                continue;
            }

            if (isLocked) {
                const lockPill = document.createElement('span');
                lockPill.className = 'shop-card-locked-icon';
                lockPill.innerHTML = `<i data-lucide="lock" class="icon-amber"></i>`;
                lockPill.title = 'Thẻ bài này đang được khóa cho vòng sau';
                card.appendChild(lockPill);
            }

            const def = PIECES[slot.id];
            if (!def) continue;

            const copiesOwned = app.tft.countMatchingUnits(app.tft.player, slot.id, 1);
            const canUpgradeHint = copiesOwned >= 2 ? `<i data-lucide="sparkles" class="icon-gold"></i> GHÉP 2 SAO!` : (copiesOwned === 1 ? 'Đã có 1/3' : '');

            const traitsHtml = (def.traits || []).map(tId => {
                const sDef = SYNERGIES[tId];
                return sDef ? `<span class="shop-trait-pill" data-trait-id="${tId}">${sDef.icon} ${sDef.name}</span>` : '';
            }).join('');

            card.className = `shop-card cost-tier-${def.cost} ${copiesOwned >= 2 ? 'shop-merge-glow' : ''}`;
            card.setAttribute('data-piece-id', def.id);
            card.title = `${def.name} (${def.cost} Vàng) — Bấm ℹ️ hoặc phím [H] để xem hướng dẫn nước đi`;
            card.innerHTML = `
                <div class="shop-card-top">
                    <span class="shop-unit-name">${def.name}</span>
                    <div class="shop-top-right">
                        <span class="shop-unit-cost">${def.cost} <i data-lucide="coins" class="icon-amber"></i></span>
                        <button class="shop-guide-btn" title="Xem hướng dẫn cách đi & mẹo chơi của ${def.name}" data-piece-id="${def.id}"><i data-lucide="help-circle"></i></button>
                    </div>
                </div>
                <div class="shop-card-body">
                    <div class="shop-unit-icon">
                        <img src="assets/pieces/${def.id}.svg" class="shop-svg-art" alt="${def.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
                        <span class="shop-fallback-icon" style="display:none;">${def.icon}</span>
                    </div>
                    <div class="shop-traits">${traitsHtml}</div>
                </div>
                <div class="shop-unit-stats">
                    <span><i data-lucide="shield" class="icon-emerald"></i> ${def.baseHp[0]} HP</span>
                    <span><i data-lucide="crosshair" class="icon-red"></i> Tầm: ${def.range[0]}</span>
                </div>
                ${canUpgradeHint ? `<div class="shop-merge-tag">${canUpgradeHint}</div>` : ''}
            `;

            // Guide button inside shop card
            const guideBtn = card.querySelector('.shop-guide-btn');
            if (guideBtn) {
                guideBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof app.openPieceGuide === 'function') {
                        app.openPieceGuide(def.id);
                    }
                });
            }

            // Synergy Tooltip on hover trait pills
            card.querySelectorAll('.shop-trait-pill').forEach(pill => {
                const tId = pill.getAttribute('data-trait-id');
                pill.addEventListener('mouseenter', (e) => {
                    if (app.tooltipManager) {
                        app.tooltipManager.hidePieceMovementTooltip();
                        app.tooltipManager.showSynergyTooltip(tId, e, app.tft.player);
                    }
                });
                pill.addEventListener('mousemove', (e) => {
                    if (app.tooltipManager) app.tooltipManager.moveSynergyTooltip(e);
                });
                pill.addEventListener('mouseleave', () => {
                    if (app.tooltipManager) app.tooltipManager.hideSynergyTooltip();
                });
            });

            // Card piece movement preview tooltip
            card.addEventListener('mouseenter', (e) => {
                if (e.target.closest('.shop-trait-pill') || e.target.closest('.shop-guide-btn')) return;
                if (app.tooltipManager) app.tooltipManager.showPieceMovementTooltip(def.id, e);
            });
            card.addEventListener('mousemove', (e) => {
                const synTip = document.getElementById('synergy-tooltip');
                if (synTip && !synTip.classList.contains('hidden')) return;
                if (app.tooltipManager) app.tooltipManager.movePieceMovementTooltip(e);
            });
            card.addEventListener('mouseleave', () => {
                if (app.tooltipManager) app.tooltipManager.hidePieceMovementTooltip();
            });

            // Click card to buy
            card.addEventListener('click', () => {
                if (app.tooltipManager) {
                    app.tooltipManager.hideSynergyTooltip();
                    app.tooltipManager.hidePieceMovementTooltip();
                }
                const res = app.tft.buyShopUnit(slot.slotIndex);
                if (res.ok) {
                    if (res.merged) {
                        if (app.sfx) app.sfx.starUp();
                        eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                            message: `🌟 NÂNG CẤP! ${res.merged.name} đã lên ${res.merged.stars} SAO (★)!`,
                            type: 'success'
                        });
                    } else {
                        if (app.sfx) app.sfx.move();
                    }
                    if (app.isTutorialMode && app.tutorialStep === 1) {
                        if (typeof app.advanceTutorialStep === 'function') app.advanceTutorialStep(2);
                    }
                    if (typeof app.renderAll === 'function') app.renderAll();
                } else {
                    eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: res.msg, type: 'warn' });
                }
            });

            this.shopEl.appendChild(card);
        }

        if (window.renderLucideIcons) window.renderLucideIcons(this.shopEl);
        if (window.gsap) {
            window.gsap.from(this.shopEl.querySelectorAll('.shop-card:not(.shop-sold)'), {
                y: -14,
                scale: 0.94,
                opacity: 0.25,
                duration: 0.28,
                stagger: 0.04,
                ease: 'power2.out',
                clearProps: 'transform,opacity'
            });
        }
    }

    toggleLockShop(app) {
        if (app.isSpectatorPOV) return;
        const gameScreen = document.getElementById('screen-game');
        if (!gameScreen || gameScreen.classList.contains('hidden')) return;

        app.tft.shopLocked = !app.tft.shopLocked;
        if (app.sfx) app.sfx.move();

        if (app.tft.shopLocked) {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                message: '🔒 Đã KHÓA Cửa Hàng [Space]! Các quân cờ sẽ được giữ nguyên cho vòng sau.',
                type: 'info'
            });
        } else {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                message: '🔓 Đã MỞ KHÓA Cửa Hàng [Space]! Sẽ tự động làm mới ở vòng sau.',
                type: 'info'
            });
        }

        this.renderShop(app);

        if (this.lockBtn) {
            this.lockBtn.classList.add('btn-key-pressed');
            setTimeout(() => this.lockBtn.classList.remove('btn-key-pressed'), 150);
        }
    }

    handleHotkeyReroll(app) {
        if (app.isSpectatorPOV) return;
        const gameScreen = document.getElementById('screen-game');
        if (!gameScreen || gameScreen.classList.contains('hidden')) return;

        if (app.tft.phase !== 'prep') {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Chỉ có thể đổi Shop trong giai đoạn Chuẩn Bị!', type: 'warn' });
            return;
        }

        const hadFree = (app.tft.player.freeRerolls || 0) > 0;
        if (app.tft.rollShop(false)) {
            if (app.sfx) app.sfx.move();
            if (hadFree) {
                eventBus.emit(GAME_EVENTS.SHOW_TOAST, {
                    message: `🎁 Đã dùng 1 lượt Đổi Shop MIỄN PHÍ [D]! Còn lại: ${app.tft.player.freeRerolls || 0}`,
                    type: 'success'
                });
            }
            if (typeof app.renderAll === 'function') app.renderAll();
            if (typeof app.syncMyStateToRoom === 'function') app.syncMyStateToRoom();

            if (this.rerollBtn) {
                this.rerollBtn.classList.add('btn-key-pressed');
                setTimeout(() => this.rerollBtn.classList.remove('btn-key-pressed'), 150);
            }
        } else {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Không đủ 2 Vàng để đổi Shop! [D]', type: 'warn' });
        }
    }

    handleHotkeyBuyXP(app) {
        if (app.isSpectatorPOV) return;
        const gameScreen = document.getElementById('screen-game');
        if (!gameScreen || gameScreen.classList.contains('hidden')) return;

        if (app.tft.phase !== 'prep') {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Chỉ có thể mua XP trong giai đoạn Chuẩn Bị!', type: 'warn' });
            return;
        }

        if (app.tft.buyXP()) {
            if (app.sfx) app.sfx.starUp();
            if (typeof app.renderAll === 'function') app.renderAll();
            if (typeof app.syncMyStateToRoom === 'function') app.syncMyStateToRoom();

            if (this.buyXpBtn) {
                this.buyXpBtn.classList.add('btn-key-pressed');
                setTimeout(() => this.buyXpBtn.classList.remove('btn-key-pressed'), 150);
            }
        } else {
            eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: 'Không đủ 4 Vàng hoặc đã đạt Cấp tối đa (Lv.8)! [F]', type: 'warn' });
        }
    }
}

// ============================================================================
// CHESS TFT - INPUT & KEYBOARD HOTKEY HANDLER (ES MODULE)
// Listens to global hotkeys (D / F / E / W / X / Space / Esc) & dispatches events
// ============================================================================

import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class InputHandler {
    constructor() {
        this.enabled = true;
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    handleKeyDown(e) {
        if (!this.enabled) return;

        // Skip input handling when user is typing in forms/inputs
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
            return;
        }

        // Global Guide / Close shortcuts (H / Esc)
        if (e.key === 'h' || e.key === 'H') {
            eventBus.emit('ui:toggle_guide');
            return;
        } else if (e.key === 'Escape') {
            eventBus.emit('ui:close_modal');
            return;
        }

        // TFT In-Game Hotkeys only active when game screen is visible
        const gameScreen = document.getElementById('screen-game');
        if (!gameScreen || gameScreen.classList.contains('hidden')) return;

        // Prevent shortcuts if modal overlay is open
        const openModal = document.querySelector('.modal-overlay:not(.hidden)');
        if (openModal) return;

        const k = e.key.toLowerCase();

        // 1 & 2: Scouting next/previous player
        if (k === '1') {
            e.preventDefault();
            eventBus.emit('scouting:cycle', -1);
            return;
        } else if (k === '2') {
            e.preventDefault();
            eventBus.emit('scouting:cycle', 1);
            return;
        } else if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') {
            e.preventDefault();
            eventBus.emit('input:space_pressed');
            return;
        }

        // TFT Standard Hotkeys
        switch (k) {
            case 'd':
                e.preventDefault();
                eventBus.emit('input:hotkey_reroll');
                break;
            case 'f':
                e.preventDefault();
                eventBus.emit('input:hotkey_buy_xp');
                break;
            case 'e':
                e.preventDefault();
                eventBus.emit('input:hotkey_sell_piece');
                break;
            case 'w':
                e.preventDefault();
                eventBus.emit('input:hotkey_deploy_recall');
                break;
            case 'x':
                e.preventDefault();
                eventBus.emit('input:hotkey_lock_shop');
                break;
        }
    }
}

export const inputHandler = new InputHandler();
export default inputHandler;

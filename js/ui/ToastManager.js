// ============================================================================
// CHESS TFT - TOAST MANAGER (ES MODULE)
// Manages transient notification toasts with animations & types
// ============================================================================

import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class ToastManager {
    constructor(containerId = 'toast-container') {
        this.containerId = containerId;
    }

    get container() {
        return document.getElementById(this.containerId);
    }

    show(payload, fallbackType = 'info') {
        const c = this.container;
        if (!c) return;

        let msg = payload;
        let type = fallbackType;
        if (payload && typeof payload === 'object' && payload.message !== undefined) {
            msg = payload.message;
            type = payload.type || fallbackType;
        }

        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = msg;
        c.appendChild(el);

        setTimeout(() => {
            el.classList.add('toast-fade');
            setTimeout(() => el.remove(), 300);
        }, 2800);
    }
}

export const toastManager = new ToastManager();

// Decoupled event listener
eventBus.on(GAME_EVENTS.SHOW_TOAST, (msg, type) => {
    toastManager.show(msg, type);
});

export default toastManager;

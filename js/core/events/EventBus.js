// ============================================================================
// EVENT BUS (PUB / SUB DECOUPLING MODULE)
// Allows UI, Engine, Services, and TFT Manager to communicate without tight coupling
// ============================================================================

export class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name from GAME_EVENTS
     * @param {Function} handler - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, handler) {
        if (typeof handler !== 'function') return () => {};
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);
        return () => this.off(event, handler);
    }

    /**
     * Subscribe once
     * @param {string} event
     * @param {Function} handler
     */
    once(event, handler) {
        if (typeof handler !== 'function') return;
        const wrapper = (...args) => {
            this.off(event, wrapper);
            handler(...args);
        };
        this.on(event, wrapper);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event
     * @param {Function} handler
     */
    off(event, handler) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).delete(handler);
        if (this.listeners.get(event).size === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * Emit an event with data
     * @param {string} event
     * @param  {...any} args
     */
    emit(event, ...args) {
        if (!this.listeners.has(event)) return;
        const handlers = Array.from(this.listeners.get(event));
        for (const fn of handlers) {
            try {
                fn(...args);
            } catch (err) {
                console.error(`[EventBus] Error in listener for event "${event}":`, err);
            }
        }
    }

    /**
     * Remove all listeners
     */
    clear() {
        this.listeners.clear();
    }
}

// Global shared singleton instance for the app
export const eventBus = new EventBus();

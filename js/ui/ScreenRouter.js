// ============================================================================
// CHESS TFT - SCREEN ROUTER (ES MODULE)
// Manages screen transitions, history states, and navigation
// ============================================================================

import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class ScreenRouter {
    constructor() {
        this.currentScreen = 'auth';
        this.currentLobbyTab = 'play';
    }

    showScreen(screenName, pushToHistory = true) {
        this.currentScreen = screenName;

        const screens = {
            auth: document.getElementById('screen-auth'),
            lobby: document.getElementById('screen-lobby'),
            game: document.getElementById('screen-game'),
            spectator: document.getElementById('screen-spectator')
        };

        for (const [name, el] of Object.entries(screens)) {
            if (el) {
                el.classList.toggle('hidden', name !== screenName);
            }
        }

        if (screenName !== 'game') {
            document.body.classList.remove('skirmish-active');
            const shopHud = document.querySelector('.tft-bottom-hud');
            if (shopHud) shopHud.classList.remove('hidden');
            const benchRow = document.querySelector('.bench-container');
            if (benchRow) benchRow.classList.remove('hidden');
            const prepTimer = document.getElementById('prep-timer-badge');
            if (prepTimer) prepTimer.classList.remove('hidden');
        }

        // BGM routing trigger via EventBus
        if (screenName === 'auth') {
            eventBus.emit(GAME_EVENTS.PLAY_BGM, 'title');
        } else if (screenName === 'lobby' || screenName === 'spectator') {
            eventBus.emit(GAME_EVENTS.PLAY_BGM, 'lobby');
        }

        if (pushToHistory && window.history && window.history.pushState) {
            window.history.pushState({ screen: screenName, tab: this.currentLobbyTab || 'play' }, '');
        }

        if (typeof window.renderLucideIcons === 'function') {
            window.renderLucideIcons();
        }

        eventBus.emit(GAME_EVENTS.SCREEN_CHANGED, screenName);
    }
}

export const screenRouter = new ScreenRouter();
export default screenRouter;

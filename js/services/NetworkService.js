// ============================================================================
// CHESS TFT - NETWORK SERVICE (SOCKET.IO CLIENT)
// Manages real-time multiplayer connections, room sync & matchmaking
// ============================================================================

import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class NetworkService {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    /**
     * Connect to the Socket.IO server
     * @param {Object} auth - { userId, username, displayName, avatar }
     */
    connect(auth = {}) {
        if (typeof window.io !== 'function') {
            console.warn('[NetworkService] Socket.io client script not found.');
            return null;
        }

        if (this.socket && this.socket.connected) {
            return this.socket;
        }

        this.socket = window.io({
            transports: ['websocket', 'polling'],
            auth
        });

        this.bindSocketEvents();
        return this.socket;
    }

    bindSocketEvents() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            this.connected = true;
            console.log('[NetworkService] Connected to server, socketId:', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            console.log('[NetworkService] Disconnected:', reason);
        });

        this.socket.on('room:updated', (data) => {
            eventBus.emit(GAME_EVENTS.ROOM_UPDATED, data);
        });

        this.socket.on('room:matchStarted', (data) => {
            eventBus.emit(GAME_EVENTS.MATCH_STARTED, data);
        });

        this.socket.on('room:kicked', (data) => {
            eventBus.emit('room:kicked', data);
        });
    }

    emit(event, data, callback) {
        if (!this.socket) {
            if (typeof callback === 'function') callback({ ok: false, msg: 'Chưa kết nối Socket.IO' });
            return;
        }
        this.socket.emit(event, data, callback);
    }

    isConnected() {
        return !!(this.socket && this.socket.connected);
    }

    leaveRoom() {
        this.emit('room:leave');
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }
}

export const networkService = new NetworkService();
export default networkService;

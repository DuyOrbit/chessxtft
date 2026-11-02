// ============================================================================
// CHESS TFT - API SERVICE (ES MODULE)
// Centralized HTTP client for WampServer PHP/MySQL backend (api.php) & Node.js
// Supports Token-Based Bearer Authentication for Secured Admin & Match APIs
// ============================================================================

export class ApiService {
    constructor(baseUrl = 'api.php') {
        this.baseUrl = baseUrl;
    }

    getAuthHeaders() {
        let token = '';
        try {
            const userStr = localStorage.getItem('chesstft_user');
            if (userStr) {
                const parsed = JSON.parse(userStr);
                token = parsed.token || '';
            }
        } catch (e) {}
        if (!token && window.app?.currentUser?.token) {
            token = window.app.currentUser.token;
        }
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    async get(action, params = {}) {
        const query = new URLSearchParams({ action, ...params }).toString();
        const url = `${this.baseUrl}?${query}`;
        const res = await fetch(url, {
            headers: {
                ...this.getAuthHeaders()
            }
        });
        return res.json();
    }

    async post(action, body = {}) {
        const url = `${this.baseUrl}?action=${encodeURIComponent(action)}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders()
            },
            body: JSON.stringify(body)
        });
        return res.json();
    }

    // --- AUTH & USER ---
    async login(username, password) {
        return this.post('login', { username, password });
    }

    async register(userData) {
        return this.post('register', userData);
    }

    async fetchConfig() {
        return this.get('config');
    }

    // --- ROOMS ---
    async fetchRooms() {
        return this.get('room_list');
    }

    async createRoom(roomData) {
        return this.post('room_create', roomData);
    }

    async joinRoom(code, user, isSpectator = false) {
        return this.post('room_join', { code, user, isSpectator });
    }

    async startRoom(code, user) {
        return this.post('room_start', { code, user });
    }

    async addBotToRoom(code, user) {
        return this.post('room_add_bot', { code, user });
    }

    async removeBotFromRoom(code, user, slotIndex) {
        return this.post('room_remove_bot', { code, user, slotIndex });
    }

    async fillAllBots(code, user) {
        return this.post('room_fill_all_bots', { code, user });
    }

    async clearAllBots(code, user) {
        return this.post('room_clear_all_bots', { code, user });
    }

    async finishMatch(matchData) {
        return this.post('match_finish', matchData);
    }

    // --- ADMIN PANEL (MYSQL phpMyAdmin / JSON) ---
    async adminGetDb() {
        return this.get('admin_db');
    }

    async adminSaveUser(userData) {
        return this.post('admin_user', userData);
    }

    async adminCreateUser(userData) {
        return this.post('admin_user_create', userData);
    }

    async adminDeleteUser(userId) {
        return this.post('admin_user_delete', { userId, id: userId });
    }

    async adminSaveRules(rulesData) {
        return this.post('admin_rules', rulesData);
    }

    async adminSavePiece(pieceData) {
        return this.post('admin_piece', pieceData);
    }

    async adminSeedDefaults() {
        return this.post('admin_seed_defaults', {});
    }
}

export const apiService = new ApiService();
export default apiService;

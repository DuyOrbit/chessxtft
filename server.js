// ============================================================================
// CHESS TFT - BACKEND SERVER (EXPRESS + SOCKET.IO + JSON DATABASE)
// Supports Auth, Editable Account Modifiers, Editable Game Rules & Entities,
// Real-time Rooms, Bot Auto-Fill, Live Scouting Sync & 1v1 PvP Blitz Relay
// ============================================================================

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.json({ limit: "2mb" }));

// Unified /api.php bridge so requests to api.php?action=... work on both WampServer (Apache+PHP+MySQL) and Node.js
app.all("/api.php", (req, res, next) => {
    const action = req.query.action;
    if (action === "config") {
        req.url = "/api/config";
        req.method = "GET";
    } else if (action === "register") {
        req.url = "/api/auth/register";
        req.method = "POST";
    } else if (action === "login") {
        req.url = "/api/auth/login";
        req.method = "POST";
    } else if (action === "admin_db") {
        req.url = "/api/admin/db";
        req.method = "GET";
    } else if (action === "admin_user") {
        req.url = "/api/admin/user";
        req.method = "POST";
    } else if (action === "admin_user_create") {
        req.url = "/api/admin/user/create";
        req.method = "POST";
    } else if (action === "admin_user_delete") {
        req.url = "/api/admin/user/delete";
        req.method = "POST";
    } else if (action === "admin_seed_defaults") {
        req.url = "/api/admin/seed_defaults";
        req.method = "POST";
    } else if (action === "admin_rules") {
        req.url = "/api/admin/rules";
        req.method = "POST";
    } else if (action === "admin_piece") {
        req.url = "/api/admin/piece";
        req.method = "POST";
    } else if (action === "match_finish") {
        req.url = "/api/matches/finish";
        req.method = "POST";
        return next();
    } else if (action === "room_list") {
        req.url = "/api/rooms/list";
        req.method = "GET";
        return next();
    } else if (action === "room_create") {
        req.url = "/api/rooms/create";
        req.method = "POST";
        return next();
    } else {
        return res.status(400).json({ ok: false, msg: `Hành động '${action || ""}' không được hỗ trợ trên Node.js!` });
    }
    next();
});

app.use(express.static(path.join(__dirname)));

const DB_DIR = path.join(__dirname, "db");
const FILES = {
    users: path.join(DB_DIR, "users.json"),
    rules: path.join(DB_DIR, "game_rules.json"),
    entities: path.join(DB_DIR, "gameplay_entities.json"),
    matches: path.join(DB_DIR, "matches.json")
};

function readJSON(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw);
    } catch (e) {
        console.error("Error reading JSON:", filePath, e.message);
        return fallback;
    }
}

function writeJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
        return true;
    } catch (e) {
        console.error("Error writing JSON:", filePath, e.message);
        return false;
    }
}

function sanitizeUser(u) {
    const copy = { ...u };
    delete copy.password;
    return copy;
}

function ensureUserInDatabase(user) {
    if (!user || (!user.username && !user.id)) return;
    const users = readJSON(FILES.users, []);
    const cleanUser = String(user.username || user.displayName || user.id).trim().toLowerCase();
    const existing = users.find(u => u.id === user.id || u.username.toLowerCase() === cleanUser);
    if (!existing) {
        const newUser = {
            id: user.id || `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            username: cleanUser,
            password: user.password || "123",
            displayName: user.displayName || user.username || cleanUser,
            avatar: user.avatar || "👤",
            role: user.role || "player",
            createdAt: user.createdAt || new Date().toISOString(),
            stats: user.stats || { elo: 1000, gamesPlayed: 0, top1Count: 0, wins: 0, losses: 0 },
            customModifiers: user.customModifiers || {
                startingHp: 100,
                startingGold: 6,
                startingLevel: 3,
                extraClockSeconds: 0,
                bonusItems: ["stun_hammer", "burn_cloak"],
                isBanned: false
            }
        };
        users.push(newUser);
        writeJSON(FILES.users, users);
    }
}

// ============================================================================
// 1. AUTH & CONFIG REST API
// ============================================================================

app.get("/api/config", (req, res) => {
    const rules = readJSON(FILES.rules, {});
    const entities = readJSON(FILES.entities, {});
    res.json({ ok: true, rules, entities });
});

app.post("/api/auth/register", (req, res) => {
    const { username, password, displayName, avatar } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ ok: false, msg: "Vui lòng nhập Tên đăng nhập và Mật khẩu!" });
    }
    const cleanUser = String(username).trim().toLowerCase();
    if (cleanUser.length < 2) {
        return res.status(400).json({ ok: false, msg: "Tên đăng nhập phải từ 2 ký tự trở lên!" });
    }

    const users = readJSON(FILES.users, []);
    if (users.some(u => u.username.toLowerCase() === cleanUser)) {
        return res.status(400).json({ ok: false, msg: "Tên đăng nhập này đã tồn tại!" });
    }

    const rules = readJSON(FILES.rules, {});
    const econ = rules.economy || {};

    const newUser = {
        id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        username: cleanUser,
        password: String(password),
        displayName: (displayName && String(displayName).trim()) || cleanUser,
        avatar: avatar || "🧙‍♂️",
        role: users.length === 0 || cleanUser === "admin" ? "admin" : "player",
        createdAt: new Date().toISOString(),
        stats: {
            elo: 1000,
            gamesPlayed: 0,
            top1Count: 0,
            wins: 0,
            losses: 0
        },
        customModifiers: {
            startingHp: econ.defaultStartingHp || 100,
            startingGold: econ.defaultStartingGold || 6,
            startingLevel: econ.defaultStartingLevel || 3,
            extraClockSeconds: 0,
            bonusItems: ["stun_hammer", "burn_cloak"],
            isBanned: false
        }
    };

    users.push(newUser);
    writeJSON(FILES.users, users);

    const entities = readJSON(FILES.entities, {});
    res.json({
        ok: true,
        user: sanitizeUser(newUser),
        rules,
        entities
    });
});

app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ ok: false, msg: "Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!" });
    }

    const cleanUser = String(username).trim().toLowerCase();
    const users = readJSON(FILES.users, []);
    const found = users.find(u => u.username.toLowerCase() === cleanUser && u.password === String(password));

    if (!found) {
        return res.status(401).json({ ok: false, msg: "Sai tên đăng nhập hoặc mật khẩu!" });
    }
    if (found.customModifiers && found.customModifiers.isBanned) {
        return res.status(403).json({ ok: false, msg: "Tài khoản này đang bị tạm khóa bởi Admin!" });
    }

    const rules = readJSON(FILES.rules, {});
    const entities = readJSON(FILES.entities, {});
    res.json({
        ok: true,
        user: sanitizeUser(found),
        rules,
        entities
    });
});

app.get("/api/user/:id", (req, res) => {
    const users = readJSON(FILES.users, []);
    const found = users.find(u => u.id === req.params.id);
    if (!found) return res.status(404).json({ ok: false });
    res.json({ ok: true, user: sanitizeUser(found) });
});

app.post("/api/matches/finish", (req, res) => {
    const { userId, rank, totalPlayers, roomCode, winnerName } = req.body || {};
    const users = readJSON(FILES.users, []);
    const u = users.find(x => x.id === userId);
    if (u) {
        if (!u.stats) u.stats = { elo: 1000, gamesPlayed: 0, top1Count: 0, wins: 0, losses: 0 };
        u.stats.gamesPlayed += 1;
        if (rank === 1) {
            u.stats.top1Count += 1;
            u.stats.elo += 35;
        } else if (rank <= 4) {
            u.stats.elo += 12;
        } else {
            u.stats.elo = Math.max(100, u.stats.elo - 15);
        }
        writeJSON(FILES.users, users);
    }

    const matches = readJSON(FILES.matches, []);
    matches.unshift({
        id: `match_${Date.now()}`,
        timestamp: new Date().toISOString(),
        roomCode: roomCode || "SOLO",
        winnerName: winnerName || "Unknown",
        playerRank: rank || 1,
        totalPlayers: totalPlayers || 8
    });
    writeJSON(FILES.matches, matches.slice(0, 100));

    res.json({ ok: true, user: u ? sanitizeUser(u) : null });
});

// ============================================================================
// 2. ADMIN DATABASE MANAGEMENT API (EDIT ACCOUNTS, RULES & PIECES LIVE)
// ============================================================================

app.get("/api/admin/db", (req, res) => {
    const users = readJSON(FILES.users, []).map(u => ({ ...u }));
    const rules = readJSON(FILES.rules, {});
    const entities = readJSON(FILES.entities, {});
    const matches = readJSON(FILES.matches, []);
    res.json({ ok: true, users, rules, entities, matches });
});

app.post("/api/admin/user", (req, res) => {
    const { userId, updates } = req.body || {};
    const users = readJSON(FILES.users, []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return res.status(404).json({ ok: false, msg: "Không tìm thấy người dùng!" });

    const u = users[idx];
    if (updates.displayName !== undefined) u.displayName = updates.displayName;
    if (updates.role !== undefined) u.role = updates.role;
    if (updates.password && String(updates.password).trim() !== "") {
        u.password = String(updates.password).trim();
    }
    if (updates.elo !== undefined) {
        if (!u.stats) u.stats = {};
        u.stats.elo = Number(updates.elo) || 1000;
    }
    if (updates.customModifiers) {
        u.customModifiers = {
            ...u.customModifiers,
            startingHp: Number(updates.customModifiers.startingHp) || 100,
            startingGold: Number(updates.customModifiers.startingGold) || 6,
            startingLevel: Math.min(8, Math.max(1, Number(updates.customModifiers.startingLevel) || 3)),
            extraClockSeconds: Number(updates.customModifiers.extraClockSeconds) || 0,
            bonusItems: Array.isArray(updates.customModifiers.bonusItems)
                ? updates.customModifiers.bonusItems
                : ["stun_hammer", "burn_cloak"],
            isBanned: !!updates.customModifiers.isBanned
        };
    }

    writeJSON(FILES.users, users);
    res.json({ ok: true, msg: `Đã cập nhật tài khoản ${u.username}!`, user: sanitizeUser(u) });
});

app.post("/api/admin/user/create", (req, res) => {
    const { username, displayName, password, role, elo, avatar, customModifiers } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ ok: false, msg: "Vui lòng nhập Tên đăng nhập và Mật khẩu!" });
    }
    const cleanUser = String(username).trim().toLowerCase();
    const users = readJSON(FILES.users, []);
    if (users.some(u => u.username.toLowerCase() === cleanUser)) {
        return res.status(400).json({ ok: false, msg: `Tên đăng nhập '${cleanUser}' đã tồn tại!` });
    }
    const newUser = {
        id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        username: cleanUser,
        password: String(password).trim(),
        displayName: (displayName && String(displayName).trim()) || cleanUser,
        avatar: avatar || "👤",
        role: role === "admin" ? "admin" : "player",
        createdAt: new Date().toISOString(),
        stats: {
            elo: Number(elo) || 1000,
            gamesPlayed: 0,
            top1Count: 0,
            wins: 0,
            losses: 0
        },
        customModifiers: {
            startingHp: Number(customModifiers?.startingHp) || 100,
            startingGold: Number(customModifiers?.startingGold) || 6,
            startingLevel: Math.min(8, Math.max(1, Number(customModifiers?.startingLevel) || 3)),
            extraClockSeconds: Number(customModifiers?.extraClockSeconds) || 0,
            bonusItems: Array.isArray(customModifiers?.bonusItems) ? customModifiers.bonusItems : ["stun_hammer", "burn_cloak"],
            isBanned: !!customModifiers?.isBanned
        }
    };
    users.push(newUser);
    writeJSON(FILES.users, users);
    res.json({ ok: true, msg: `Đã tạo tài khoản '${cleanUser}' thành công!`, user: sanitizeUser(newUser), users: users.map(sanitizeUser) });
});

app.post("/api/admin/user/delete", (req, res) => {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ ok: false, msg: "Thiếu ID tài khoản cần xóa!" });
    const users = readJSON(FILES.users, []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return res.status(404).json({ ok: false, msg: "Không tìm thấy tài khoản cần xóa!" });
    if (users[idx].username === "admin" || (users[idx].role === "admin" && users.filter(x => x.role === "admin").length <= 1)) {
        return res.status(400).json({ ok: false, msg: "Không thể xóa tài khoản Admin Tối Thượng duy nhất!" });
    }
    const deleted = users.splice(idx, 1)[0];
    writeJSON(FILES.users, users);
    res.json({ ok: true, msg: `Đã xóa tài khoản '${deleted.username}' khỏi hệ thống!`, users: users.map(sanitizeUser) });
});

app.post("/api/admin/seed_defaults", (req, res) => {
    const defaultAccounts = [
        { id: "user_admin", username: "admin", password: "123", displayName: "Admin Tối Thượng", avatar: "👑", role: "admin", stats: { elo: 1500, gamesPlayed: 5, top1Count: 3, wins: 18, losses: 4 }, customModifiers: { startingHp: 100, startingGold: 10, startingLevel: 3, extraClockSeconds: 10, bonusItems: ["stun_hammer", "burn_cloak"], isBanned: false } },
        { id: "user_kithu1", username: "kithu1", password: "123", displayName: "Kỳ Thủ Tiên Phong", avatar: "🦊", role: "player", stats: { elo: 1050, gamesPlayed: 8, top1Count: 2, wins: 12, losses: 6 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["stun_hammer", "burn_cloak"], isBanned: false } },
        { id: "user_kithu2", username: "kithu2", password: "123", displayName: "Kỳ Thủ Chiến Lược", avatar: "🐺", role: "player", stats: { elo: 1100, gamesPlayed: 6, top1Count: 1, wins: 9, losses: 5 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["iron_armor"], isBanned: false } },
        { id: "user_kithu3", username: "kithu3", password: "123", displayName: "Kỳ Thủ Tinh Anh", avatar: "🦁", role: "player", stats: { elo: 1150, gamesPlayed: 10, top1Count: 3, wins: 15, losses: 7 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["sniper_scope"], isBanned: false } },
        { id: "user_kithu4", username: "kithu4", password: "123", displayName: "Kỳ Thủ Bất Bại", avatar: "🐯", role: "player", stats: { elo: 1200, gamesPlayed: 12, top1Count: 4, wins: 20, losses: 8 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["phase_boots"], isBanned: false } },
        { id: "user_kithu5", username: "kithu5", password: "123", displayName: "Kỳ Thủ Phù Thủy", avatar: "🧙‍♂️", role: "player", stats: { elo: 1250, gamesPlayed: 9, top1Count: 2, wins: 14, losses: 6 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["burn_cloak"], isBanned: false } },
        { id: "user_kithu6", username: "kithu6", password: "123", displayName: "Kỳ Thủ Thiện Xạ", avatar: "🏹", role: "player", stats: { elo: 1300, gamesPlayed: 11, top1Count: 3, wins: 17, losses: 7 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["sniper_scope"], isBanned: false } },
        { id: "user_kithu7", username: "kithu7", password: "123", displayName: "Kỳ Thủ Thần Tài", avatar: "🎰", role: "player", stats: { elo: 1350, gamesPlayed: 15, top1Count: 5, wins: 22, losses: 9 }, customModifiers: { startingHp: 100, startingGold: 8, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["stun_hammer"], isBanned: false } },
        { id: "user_kithu8", username: "kithu8", password: "123", displayName: "Kỳ Thủ Hộ Vệ", avatar: "🛡️", role: "player", stats: { elo: 1400, gamesPlayed: 14, top1Count: 4, wins: 21, losses: 8 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["iron_armor"], isBanned: false } },
        { id: "bot_magnus", username: "bot_magnus", password: "123", displayName: "Đại Kiện Tướng Magnus (Bot)", avatar: "🤖", role: "player", stats: { elo: 1800, gamesPlayed: 50, top1Count: 25, wins: 80, losses: 20 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["phase_boots"], isBanned: false } },
        { id: "bot_kasparov", username: "bot_kasparov", password: "123", displayName: "Bá Tước Bóng Đêm (Bot)", avatar: "🦇", role: "player", stats: { elo: 1750, gamesPlayed: 45, top1Count: 20, wins: 70, losses: 22 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["burn_cloak"], isBanned: false } },
        { id: "bot_frost", username: "bot_frost", password: "123", displayName: "Phù Thủy Băng Giá (Bot)", avatar: "🧙‍♀️", role: "player", stats: { elo: 1650, gamesPlayed: 35, top1Count: 15, wins: 55, losses: 18 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["stun_hammer"], isBanned: false } },
        { id: "bot_guardian", username: "bot_guardian", password: "123", displayName: "Hiệp Sĩ Hoàng Gia (Bot)", avatar: "🛡️", role: "player", stats: { elo: 1600, gamesPlayed: 30, top1Count: 12, wins: 48, losses: 16 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["iron_armor"], isBanned: false } },
        { id: "bot_sniper", username: "bot_sniper", password: "123", displayName: "Xạ Thủ Tinh Anh (Bot)", avatar: "🏹", role: "player", stats: { elo: 1550, gamesPlayed: 28, top1Count: 10, wins: 42, losses: 15 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["sniper_scope"], isBanned: false } },
        { id: "bot_fortune", username: "bot_fortune", password: "123", displayName: "Đạo Tặc Thần Bài (Bot)", avatar: "🎰", role: "player", stats: { elo: 1500, gamesPlayed: 25, top1Count: 8, wins: 38, losses: 14 }, customModifiers: { startingHp: 100, startingGold: 10, startingLevel: 3, extraClockSeconds: 0, bonusItems: ["stun_hammer"], isBanned: false } },
        { id: "bot_martin", username: "bot_martin", password: "123", displayName: "Kỳ Thủ Martin (Bot)", avatar: "♟️", role: "player", stats: { elo: 1200, gamesPlayed: 20, top1Count: 4, wins: 25, losses: 12 }, customModifiers: { startingHp: 100, startingGold: 6, startingLevel: 3, extraClockSeconds: 0, bonusItems: [], isBanned: false } }
    ];

    const currentUsers = readJSON(FILES.users, []);
    let addedCount = 0;
    for (const def of defaultAccounts) {
        const found = currentUsers.find(u => u.username.toLowerCase() === def.username.toLowerCase());
        if (!found) {
            currentUsers.push({ ...def, createdAt: new Date().toISOString() });
            addedCount++;
        }
    }
    writeJSON(FILES.users, currentUsers);
    res.json({ ok: true, msg: `Đã nạp bổ sung ${addedCount} tài khoản chuẩn vào Database! Tổng số: ${currentUsers.length} tài khoản.`, users: currentUsers.map(sanitizeUser) });
});

app.post("/api/admin/rules", (req, res) => {
    const { rules } = req.body || {};
    if (!rules || !rules.STAGE_CONFIG) {
        return res.status(400).json({ ok: false, msg: "Dữ liệu game_rules không hợp lệ!" });
    }
    writeJSON(FILES.rules, rules);
    const entities = readJSON(FILES.entities, {});
    io.emit("config:updated", { rules, entities });
    res.json({ ok: true, msg: "Đã lưu Luật Chơi & Thời Gian Đồng Hồ vào Database!" });
});

app.post("/api/admin/piece", (req, res) => {
    const { pieceId, pieceData } = req.body || {};
    const entities = readJSON(FILES.entities, {});
    if (!entities.PIECES || !entities.PIECES[pieceId]) {
        return res.status(404).json({ ok: false, msg: "Không tìm thấy quân cờ!" });
    }

    entities.PIECES[pieceId] = {
        ...entities.PIECES[pieceId],
        ...pieceData
    };
    writeJSON(FILES.entities, entities);

    const rules = readJSON(FILES.rules, {});
    io.emit("config:updated", { rules, entities });
    res.json({ ok: true, msg: `Đã cập nhật quân cờ ${entities.PIECES[pieceId].name} vào Database!` });
});

// ============================================================================
// 3. REAL-TIME ROOMS & MULTIPLAYER LOBBY (SOCKET.IO)
// ============================================================================

const rooms = new Map(); // code -> room object

function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function getPublicRoomsList() {
    const list = [];
    for (const r of rooms.values()) {
        if (r.status === "waiting") {
            list.push({
                code: r.code,
                hostName: r.hostName,
                playerCount: r.players.length,
                maxPlayers: 8,
                timeMode: r.timeMode,
                fillBots: r.fillBots,
                isSpectatorHost: !!r.isSpectatorHost,
                spectatorCount: (r.spectators || []).length
            });
        }
    }
    return list;
}

function broadcastRoomsList() {
    io.emit("rooms:list", getPublicRoomsList());
}

app.get("/api/rooms/list", (req, res) => {
    res.json({ ok: true, rooms: getPublicRoomsList() });
});

app.post("/api/rooms/create", (req, res) => {
    const { user, timeMode = "standard", fillBots = true, isSpectator = false } = req.body || {};
    let code = generateRoomCode();
    while (rooms.has(code)) code = generateRoomCode();

    const dbUsers = readJSON(FILES.users, []);
    const freshUser = dbUsers.find(u => u.id === user?.id) || user || { id: `anon_${Date.now()}`, username: "Guest" };

    const room = {
        code,
        hostId: freshUser.id,
        hostSocketId: null,
        hostName: freshUser.displayName || freshUser.username,
        timeMode,
        fillBots: !!fillBots,
        isSpectatorHost: !!isSpectator,
        status: "waiting",
        spectators: isSpectator ? [
            {
                id: freshUser.id,
                socketId: null,
                name: freshUser.displayName || freshUser.username,
                avatar: freshUser.avatar || "🎙️",
                isHost: true
            }
        ] : [],
        players: isSpectator ? [] : [
            {
                id: freshUser.id,
                socketId: null,
                name: freshUser.displayName || freshUser.username,
                avatar: freshUser.avatar || "👑",
                elo: freshUser.stats?.elo || 1000,
                customModifiers: freshUser.customModifiers || {},
                isHost: true,
                isBot: false
            }
        ],
        liveBoards: {}
    };

    rooms.set(code, room);
    broadcastRoomsList();
    res.json({ ok: true, room });
});

// Matchmaking Queue for Auto-Matching Ranked Players
const matchmakingQueue = []; // { socket, user, timeMode, timer }

function tryFormMatchmakingRoom() {
    if (matchmakingQueue.length === 0) return;

    // Take up to 8 waiting players, minimum 1 if timer elapsed
    const candidates = matchmakingQueue.splice(0, 8);
    if (candidates.length === 0) return;

    const hostCandidate = candidates[0];
    let code = "RANK_" + generateRoomCode().slice(0, 4);
    while (rooms.has(code)) code = "RANK_" + generateRoomCode().slice(0, 4);

    const dbUsers = readJSON(FILES.users, []);
    const roomPlayers = candidates.map((c, idx) => {
        const fresh = dbUsers.find(u => u.id === c.user?.id) || c.user;
        return {
            id: fresh.id,
            socketId: c.socket.id,
            name: fresh.displayName || fresh.username,
            avatar: fresh.avatar || "👑",
            elo: fresh.stats?.elo || 1000,
            customModifiers: fresh.customModifiers || {},
            isHost: idx === 0,
            isBot: false
        };
    });

    const room = {
        code,
        hostId: roomPlayers[0].id,
        hostSocketId: hostCandidate.socket.id,
        hostName: roomPlayers[0].name,
        timeMode: hostCandidate.timeMode || "standard",
        fillBots: true,
        isRanked: true,
        status: "playing",
        players: roomPlayers,
        liveBoards: {},
        roundFinished: {}
    };

    rooms.set(code, room);

    const rules = readJSON(FILES.rules, {});
    const entities = readJSON(FILES.entities, {});

    candidates.forEach(c => {
        c.socket.join(code);
        c.socket.data.roomCode = code;
        c.socket.data.userId = c.user?.id;
        c.socket.emit("matchmaking:matched", { room, rules, entities });
    });

    broadcastRoomsList();
}

io.on("connection", (socket) => {
    socket.emit("rooms:list", getPublicRoomsList());

    socket.on("rooms:refresh", () => {
        socket.emit("rooms:list", getPublicRoomsList());
    });

    // 1. Ranked Auto-Matchmaking
    socket.on("matchmaking:find", ({ user, timeMode = "standard" }) => {
        // Remove if already in queue
        const existingIdx = matchmakingQueue.findIndex(q => q.socket.id === socket.id);
        if (existingIdx !== -1) matchmakingQueue.splice(existingIdx, 1);

        const entry = { socket, user, timeMode };
        matchmakingQueue.push(entry);

        // Auto-match after 3.5 seconds if nobody else joins (auto-fill 7 AI Bots)
        // or immediately if there are 2+ human players
        if (matchmakingQueue.length >= 2) {
            tryFormMatchmakingRoom();
        } else {
            setTimeout(() => {
                const idx = matchmakingQueue.findIndex(q => q.socket.id === socket.id);
                if (idx !== -1) {
                    tryFormMatchmakingRoom();
                }
            }, 3500);
        }
    });

    socket.on("matchmaking:cancel", () => {
        const idx = matchmakingQueue.findIndex(q => q.socket.id === socket.id);
        if (idx !== -1) matchmakingQueue.splice(idx, 1);
    });

    // Create a new Room (Can be created as player or as spectator/caster)
    socket.on("room:create", ({ user, timeMode = "standard", fillBots = true, isSpectator = false }, cb) => {
        let code = generateRoomCode();
        while (rooms.has(code)) code = generateRoomCode();

        // Always fetch latest customModifiers from DB for this user
        const dbUsers = readJSON(FILES.users, []);
        const foundUser = user ? (dbUsers.find(u => u.id === user.id) || user) : null;
        const freshUser = foundUser || {
            id: socket.id,
            displayName: "Kỳ Thủ",
            username: "player_" + socket.id.slice(0, 4),
            avatar: isSpectator ? "🎙️" : "👑",
            stats: { elo: 1000 }
        };
        ensureUserInDatabase(freshUser);

        const room = {
            code,
            hostId: freshUser.id,
            hostSocketId: socket.id,
            hostName: freshUser.displayName || freshUser.username,
            timeMode, // "standard" (45/60/75s) | "relaxed" (75/90/120s) | "blitz" (25/35/45s)
            fillBots: !!fillBots,
            isSpectatorHost: !!isSpectator,
            status: "waiting", // "waiting" | "playing"
            spectators: isSpectator ? [
                {
                    id: freshUser.id,
                    socketId: socket.id,
                    name: freshUser.displayName || freshUser.username,
                    avatar: freshUser.avatar || "🎙️",
                    isHost: true
                }
            ] : [],
            players: isSpectator ? [] : [
                {
                    id: freshUser.id,
                    socketId: socket.id,
                    name: freshUser.displayName || freshUser.username,
                    avatar: freshUser.avatar || "👑",
                    elo: freshUser.stats?.elo || 1000,
                    customModifiers: freshUser.customModifiers || {},
                    isHost: true,
                    isBot: false
                }
            ],
            liveBoards: {}
        };

        rooms.set(code, room);
        socket.join(code);
        socket.data.roomCode = code;
        socket.data.userId = freshUser.id;
        socket.data.isSpectator = !!isSpectator;

        broadcastRoomsList();
        if (cb) cb({ ok: true, room });
    });

    // Join an existing Room by Code (Can join as Contestant or as Spectator)
    socket.on("room:join", ({ code, user, asSpectator = false }, cb) => {
        const cleanCode = String(code || "").trim().toUpperCase();
        const room = rooms.get(cleanCode);
        if (!room) {
            return cb && cb({ ok: false, msg: `Không tìm thấy phòng mã '${cleanCode}'!` });
        }
        if (room.status !== "waiting" && !asSpectator) {
            return cb && cb({ ok: false, msg: "Phòng này đã bắt đầu trận đấu!" });
        }

        const dbUsers = readJSON(FILES.users, []);
        const foundUser = user ? (dbUsers.find(u => u.id === user.id) || user) : null;
        const freshUser = foundUser || {
            id: socket.id,
            displayName: asSpectator ? "Khán Giả" : "Kỳ Thủ",
            username: (asSpectator ? "spec_" : "player_") + socket.id.slice(0, 4),
            avatar: asSpectator ? "👁️" : "👑",
            stats: { elo: 1000 }
        };
        ensureUserInDatabase(freshUser);

        if (asSpectator) {
            if (!room.spectators) room.spectators = [];
            const existingSpec = room.spectators.find(s => s.id === freshUser.id);
            if (existingSpec) {
                existingSpec.socketId = socket.id;
            } else {
                room.spectators.push({
                    id: freshUser.id,
                    socketId: socket.id,
                    name: freshUser.displayName || freshUser.username,
                    avatar: freshUser.avatar || "👁️",
                    isHost: false
                });
            }

            socket.join(cleanCode);
            socket.data.roomCode = cleanCode;
            socket.data.userId = freshUser.id;
            socket.data.isSpectator = true;

            io.to(cleanCode).emit("room:updated", room);
            broadcastRoomsList();
            if (cb) cb({ ok: true, room, isSpectator: true });
            return;
        }

        if (room.players.length >= 8) {
            return cb && cb({ ok: false, msg: "Phòng đã đủ 8 người chơi!" });
        }

        const existing = room.players.find(p => p.id === freshUser.id);
        if (existing) {
            existing.socketId = socket.id;
        } else {
            room.players.push({
                id: freshUser.id,
                socketId: socket.id,
                name: freshUser.displayName || freshUser.username,
                avatar: freshUser.avatar || "🦊",
                elo: freshUser.stats?.elo || 1000,
                customModifiers: freshUser.customModifiers || {},
                isHost: false,
                isBot: false
            });
        }

        socket.join(cleanCode);
        socket.data.roomCode = cleanCode;
        socket.data.userId = freshUser.id;
        socket.data.isSpectator = false;

        io.to(cleanCode).emit("room:updated", room);
        broadcastRoomsList();
        if (cb) cb({ ok: true, room });
    });

    // Update Room Settings (Host only)
    socket.on("room:updateSettings", ({ code, timeMode, fillBots }) => {
        const room = rooms.get(code);
        if (!room || room.hostSocketId !== socket.id) return;
        if (timeMode) room.timeMode = timeMode;
        if (fillBots !== undefined) room.fillBots = !!fillBots;
        io.to(code).emit("room:updated", room);
        broadcastRoomsList();
    });

    // Switch role between Contestant (player) and Spectator
    socket.on("room:switchRole", ({ code, targetRole }, cb) => {
        const cleanCode = String(code || "").trim().toUpperCase();
        const room = rooms.get(cleanCode);
        if (!room) return cb && cb({ ok: false, msg: "Phòng không tồn tại!" });
        if (room.status !== "waiting") return cb && cb({ ok: false, msg: "Trận đấu đã bắt đầu, không thể đổi vai trò!" });

        const userId = socket.data.userId;
        const dbUsers = readJSON(FILES.users, []);
        const freshUser = dbUsers.find(u => u.id === userId) || { id: userId, username: "Khách", displayName: "Khách" };

        if (!room.spectators) room.spectators = [];
        if (!room.players) room.players = [];

        if (targetRole === "spectator") {
            const pIdx = room.players.findIndex(p => p.id === userId || p.socketId === socket.id);
            let wasHost = (room.hostSocketId === socket.id || room.hostId === userId);
            if (pIdx !== -1) {
                if (room.players[pIdx].isHost) wasHost = true;
                room.players.splice(pIdx, 1);
            }
            const existingSpec = room.spectators.find(s => s.id === userId || s.socketId === socket.id);
            if (!existingSpec) {
                room.spectators.push({
                    id: userId,
                    socketId: socket.id,
                    name: freshUser.displayName || freshUser.username,
                    avatar: freshUser.avatar || "👁️",
                    isHost: wasHost
                });
            } else {
                existingSpec.socketId = socket.id;
                if (wasHost) existingSpec.isHost = true;
            }

            if (wasHost) {
                room.isSpectatorHost = true;
                room.hostId = userId;
                room.hostSocketId = socket.id;
                room.hostName = freshUser.displayName || freshUser.username;
            }
            socket.data.isSpectator = true;
            io.to(cleanCode).emit("room:updated", room);
            broadcastRoomsList();
            if (cb) cb({ ok: true, role: "spectator", room });
        } else if (targetRole === "player") {
            if (room.players.length >= 8) {
                return cb && cb({ ok: false, msg: "Ghế thi đấu đã đủ 8 người!" });
            }
            const sIdx = room.spectators.findIndex(s => s.id === userId || s.socketId === socket.id);
            let wasHost = (room.hostSocketId === socket.id || room.hostId === userId);
            if (sIdx !== -1) {
                if (room.spectators[sIdx].isHost) wasHost = true;
                room.spectators.splice(sIdx, 1);
            }
            const existingPlayer = room.players.find(p => p.id === userId || p.socketId === socket.id);
            if (!existingPlayer) {
                room.players.push({
                    id: userId,
                    socketId: socket.id,
                    name: freshUser.displayName || freshUser.username,
                    avatar: freshUser.avatar || "👑",
                    elo: freshUser.stats?.elo || 1000,
                    customModifiers: freshUser.customModifiers || {},
                    isHost: wasHost,
                    isBot: false
                });
            } else {
                existingPlayer.socketId = socket.id;
                if (wasHost) existingPlayer.isHost = true;
            }

            if (wasHost) {
                room.isSpectatorHost = false;
                room.hostId = userId;
                room.hostSocketId = socket.id;
                room.hostName = freshUser.displayName || freshUser.username;
            }
            socket.data.isSpectator = false;
            io.to(cleanCode).emit("room:updated", room);
            broadcastRoomsList();
            if (cb) cb({ ok: true, role: "player", room });
        } else {
            if (cb) cb({ ok: false, msg: "Vai trò không hợp lệ!" });
        }
    });

    // Leave Room
    socket.on("room:leave", () => {
        handleSocketLeaveRoom(socket);
    });

    // Start Match in Room
    socket.on("room:start", ({ code }, cb) => {
        const room = rooms.get(code);
        if (!room) return cb && cb({ ok: false, msg: "Phòng không tồn tại!" });
        if (room.hostSocketId !== socket.id) {
            return cb && cb({ ok: false, msg: "Chỉ Chủ Phòng mới có quyền bắt đầu!" });
        }

        room.status = "playing";
        const rules = readJSON(FILES.rules, {});
        const entities = readJSON(FILES.entities, {});

        // Auto-fill bots to complete 8 players if fillBots is enabled
        if (room.fillBots !== false && room.players.length < 8) {
            const botProfiles = [
                { name: "Đại Kiện Tướng Magnus", avatar: "🤖", elo: 1800, style: "Tấn Công Tổng Lực", favTrait: "cavalry" },
                { name: "Bá Tước Bóng Đêm", avatar: "🦇", elo: 1750, style: "Sát Thủ Cờ Chớp", favTrait: "assassin" },
                { name: "Phù Thủy Băng Giá", avatar: "🧙‍♀️", elo: 1650, style: "Phép Thuật Khống Chế", favTrait: "sorcerer" },
                { name: "Hiệp Sĩ Hoàng Gia", avatar: "🛡️", elo: 1600, style: "Hộ Vệ Bất Tử", favTrait: "guardian" },
                { name: "Xạ Thủ Tinh Anh", avatar: "🏹", elo: 1550, style: "Tầm Xa Xuyên Giáp", favTrait: "sniper" },
                { name: "Đạo Tặc Thần Bài", avatar: "🎰", elo: 1500, style: "Nổ Hũ Kinh Tế", favTrait: "fortune" },
                { name: "Kỳ Thủ Martin", avatar: "♟️", elo: 1200, style: "Cân Bằng Cơ Bản", favTrait: "royal" }
            ];
            let bIdx = 0;
            while (room.players.length < 8) {
                const bp = botProfiles[bIdx % botProfiles.length];
                room.players.push({
                    id: `bot_fill_${Date.now()}_${bIdx}`,
                    socketId: null,
                    name: bp.name,
                    avatar: bp.avatar,
                    elo: bp.elo,
                    style: bp.style,
                    favTrait: bp.favTrait,
                    customModifiers: {},
                    isHost: false,
                    isBot: true
                });
                bIdx++;
            }
        }

        // Refresh each human player's customModifiers from DB right before match start
        const dbUsers = readJSON(FILES.users, []);
        room.players.forEach(p => {
            if (!p.isBot) {
                const dbU = dbUsers.find(u => u.id === p.id);
                if (dbU) {
                    p.customModifiers = dbU.customModifiers || {};
                }
            }
        });

        io.to(code).emit("room:matchStarted", {
            room,
            rules,
            entities
        });
        broadcastRoomsList();
        if (cb) cb({ ok: true });
    });

    // Live Board & HP Sync for Multiplayer Scouting & Leaderboard
    socket.on("match:syncPlayerState", ({ code, playerId, state }) => {
        const room = rooms.get(code);
        if (!room) return;
        room.liveBoards[playerId] = state;
        if (state && (state.hp <= 0 || state.eliminated)) {
            const p = room.players.find(x => x.id === playerId);
            if (p) {
                p.eliminated = true;
                p.hp = 0;
            }
            if (room.roundFinished) {
                for (const key of Object.keys(room.roundFinished)) {
                    const activeHumans = room.players.filter(x => !x.isBot && !x.eliminated && !x.disconnected && (x.hp === undefined || x.hp > 0));
                    let finishedCount = 0;
                    activeHumans.forEach(x => {
                        if (room.roundFinished[key].has(x.id)) finishedCount++;
                    });
                    if (activeHumans.length <= 1 || finishedCount >= activeHumans.length) {
                        io.to(code).emit("room:allBoardsFinished", { key });
                    }
                }
            }
        }
        socket.to(code).emit("match:remotePlayerState", {
            playerId,
            state
        });
    });

    // Synchronized Round Combat Completion (Tất cả người chơi cùng xong ván mới chuyển vòng)
    socket.on("room:playerFinishedCombat", ({ code, playerId, stage, round }) => {
        const room = rooms.get(code);
        if (!room) return;
        const key = `${stage}-${round}`;
        if (!room.roundFinished) room.roundFinished = {};
        if (!room.roundFinished[key]) room.roundFinished[key] = new Set();
        room.roundFinished[key].add(playerId);

        // Filter active human players who are not bots and not eliminated
        const activeHumans = room.players.filter(p => !p.isBot && !p.eliminated && !p.disconnected && (p.hp === undefined || p.hp > 0));
        const totalHumans = activeHumans.length;

        let finishedCount = 0;
        activeHumans.forEach(p => {
            if (room.roundFinished[key].has(p.id)) finishedCount++;
        });

        const allDone = (totalHumans <= 1) || (finishedCount >= totalHumans);

        io.to(code).emit("room:roundCombatProgress", {
            key,
            stage,
            round,
            finishedCount,
            totalHumans,
            allDone
        });

        if (allDone) {
            io.to(code).emit("room:allBoardsFinished", { key, stage, round });
        }
    });

    // Disconnect cleanup
    socket.on("disconnect", () => {
        const qIdx = matchmakingQueue.findIndex(q => q.socket.id === socket.id);
        if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);
        handleSocketLeaveRoom(socket);
    });
});

function handleSocketLeaveRoom(socket) {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    if (socket.data.isSpectator && Array.isArray(room.spectators)) {
        room.spectators = room.spectators.filter(s => s.socketId !== socket.id);
        if (room.hostSocketId === socket.id) {
            // Transfer host to first player or next spectator
            if (room.players.length > 0) {
                const firstPlayer = room.players.find(p => !p.disconnected) || room.players[0];
                firstPlayer.isHost = true;
                room.hostId = firstPlayer.id;
                room.hostSocketId = firstPlayer.socketId;
                room.hostName = firstPlayer.name;
                room.isSpectatorHost = false;
            } else if (room.spectators.length > 0) {
                const firstSpec = room.spectators[0];
                firstSpec.isHost = true;
                room.hostId = firstSpec.id;
                room.hostSocketId = firstSpec.socketId;
                room.hostName = firstSpec.name;
                room.isSpectatorHost = true;
            }
        }
    } else {
        const leavingPlayer = room.players.find(p => p.socketId === socket.id);
        if (room.status === "playing" && leavingPlayer) {
            leavingPlayer.eliminated = true;
            leavingPlayer.hp = 0;
            leavingPlayer.disconnected = true;
            if (room.roundFinished) {
                for (const key of Object.keys(room.roundFinished)) {
                    const activeHumans = room.players.filter(p => !p.isBot && !p.eliminated && !p.disconnected && (p.hp === undefined || p.hp > 0));
                    let finishedCount = 0;
                    activeHumans.forEach(p => {
                        if (room.roundFinished[key].has(p.id)) finishedCount++;
                    });
                    if (activeHumans.length <= 1 || finishedCount >= activeHumans.length) {
                        io.to(code).emit("room:allBoardsFinished", { key });
                    }
                }
            }
        } else {
            room.players = room.players.filter(p => p.socketId !== socket.id);
        }

        if (!room.isSpectatorHost && !room.players.some(p => p.isHost && !p.disconnected)) {
            const firstActive = room.players.find(p => !p.disconnected) || room.players[0];
            if (firstActive) {
                firstActive.isHost = true;
                room.hostId = firstActive.id;
                room.hostSocketId = firstActive.socketId;
                room.hostName = firstActive.name;
            }
        }
    }

    socket.leave(code);
    socket.data.roomCode = null;
    socket.data.isSpectator = false;

    const totalActive = (room.players || []).filter(p => !p.isBot && !p.disconnected).length + (room.spectators || []).length;
    if (totalActive === 0) {
        rooms.delete(code);
    } else {
        io.to(code).emit("room:updated", room);
    }
    broadcastRoomsList();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`♟️ CHESS TFT SERVER RUNNING AT: http://localhost:${PORT}`);
    console.log(`========================================================`);
});

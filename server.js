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
                fillBots: r.fillBots
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
    const { user, timeMode = "standard", fillBots = true } = req.body || {};
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
        status: "waiting",
        players: [
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

io.on("connection", (socket) => {
    socket.emit("rooms:list", getPublicRoomsList());

    socket.on("rooms:refresh", () => {
        socket.emit("rooms:list", getPublicRoomsList());
    });

    // Create a new Room
    socket.on("room:create", ({ user, timeMode = "standard", fillBots = true }, cb) => {
        let code = generateRoomCode();
        while (rooms.has(code)) code = generateRoomCode();

        // Always fetch latest customModifiers from DB for this user
        const dbUsers = readJSON(FILES.users, []);
        const freshUser = dbUsers.find(u => u.id === user?.id) || user;

        const room = {
            code,
            hostId: freshUser.id,
            hostSocketId: socket.id,
            hostName: freshUser.displayName || freshUser.username,
            timeMode, // "standard" (45/60/75s) | "relaxed" (75/90/120s) | "blitz" (25/35/45s)
            fillBots: !!fillBots,
            status: "waiting", // "waiting" | "playing"
            players: [
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

        broadcastRoomsList();
        if (cb) cb({ ok: true, room });
    });

    // Join an existing Room by Code
    socket.on("room:join", ({ code, user }, cb) => {
        const cleanCode = String(code || "").trim().toUpperCase();
        const room = rooms.get(cleanCode);
        if (!room) {
            return cb && cb({ ok: false, msg: `Không tìm thấy phòng mã '${cleanCode}'!` });
        }
        if (room.status !== "waiting") {
            return cb && cb({ ok: false, msg: "Phòng này đã bắt đầu trận đấu!" });
        }
        if (room.players.length >= 8) {
            return cb && cb({ ok: false, msg: "Phòng đã đủ 8 người chơi!" });
        }

        const dbUsers = readJSON(FILES.users, []);
        const freshUser = dbUsers.find(u => u.id === user?.id) || user;

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

        // Refresh each human player's customModifiers from DB right before match start
        const dbUsers = readJSON(FILES.users, []);
        room.players.forEach(p => {
            const dbU = dbUsers.find(u => u.id === p.id);
            if (dbU) {
                p.customModifiers = dbU.customModifiers || {};
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
        socket.to(code).emit("match:remotePlayerState", {
            playerId,
            state
        });
    });

    // Disconnect cleanup
    socket.on("disconnect", () => {
        handleSocketLeaveRoom(socket);
    });
});

function handleSocketLeaveRoom(socket) {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    room.players = room.players.filter(p => p.socketId !== socket.id);
    socket.leave(code);
    socket.data.roomCode = null;

    if (room.players.length === 0) {
        rooms.delete(code);
    } else {
        if (!room.players.some(p => p.isHost)) {
            room.players[0].isHost = true;
            room.hostId = room.players[0].id;
            room.hostSocketId = room.players[0].socketId;
            room.hostName = room.players[0].name;
        }
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

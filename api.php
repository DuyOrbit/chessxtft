<?php
/**
 * ============================================================================
 * CHESS TFT ONLINE — WAMPSERVER PHP + MYSQL BACKEND API (api.php)
 * Kết nối trực tiếp vào MySQL (phpMyAdmin) của WampServer:
 *   - Database: chesstft_db
 *   - Bảng: users, game_rules, pieces, rooms, matches
 * Tự động khởi tạo Database & Bảng từ database.sql nếu chưa tồn tại!
 * ============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$DB_HOST = '127.0.0.1';
$DB_USER = 'root';
$DB_PASS = '';
$DB_NAME = 'chesstft_db';

function getPdoConnection($host, $user, $pass, $dbName) {
    try {
        // Connect to MySQL server first
        $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);

        // Ensure database exists
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `$dbName`");

        // Check if `users` table exists; if not, run database.sql automatically
        $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
        if ($stmt->rowCount() === 0) {
            $sqlFile = __DIR__ . '/database.sql';
            if (file_exists($sqlFile)) {
                $sql = file_get_contents($sqlFile);
                $pdo->exec($sql);
            }
        } else {
            // Check if legacy pieces exist (e.g. 'pawn' or 'guard' instead of 'shield_pawn')
            $chkPiece = $pdo->query("SELECT id FROM pieces WHERE id IN ('pawn', 'guard') LIMIT 1");
            if ($chkPiece && $chkPiece->fetch()) {
                // Reseed pieces table cleanly with canonical 13 pieces
                $pdo->exec("DELETE FROM pieces");
                $sqlFile = __DIR__ . '/database.sql';
                if (file_exists($sqlFile)) {
                    $sql = file_get_contents($sqlFile);
                    $pdo->exec($sql);
                }
            }
        }
        return $pdo;
    } catch (Exception $e) {
        return null;
    }
}

$pdo = getPdoConnection($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);

// Helper to read JSON fallback files in db/
function readJsonFallback($filename, $default) {
    $path = __DIR__ . '/db/' . $filename;
    if (!file_exists($path)) return $default;
    $data = json_decode(file_get_contents($path), true);
    return $data !== null ? $data : $default;
}

function writeJsonFallback($filename, $data) {
    $path = __DIR__ . '/db/' . $filename;
    @file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Helper to format a MySQL user row into the frontend user object
function formatUserRow($row) {
    $bonusArr = [];
    if (!empty($row['bonusItems'])) {
        $bonusArr = array_values(array_filter(array_map('trim', explode(',', $row['bonusItems']))));
    }
    return [
        'id' => $row['id'],
        'username' => $row['username'],
        'password' => $row['password'],
        'displayName' => $row['displayName'],
        'role' => $row['role'],
        'avatar' => $row['avatar'] ?: '♟️',
        'stats' => [
            'gamesPlayed' => (int)$row['gamesPlayed'],
            'top1Count' => (int)$row['top1Count'],
            'top4Count' => (int)$row['top4Count'],
            'elo' => (int)$row['elo']
        ],
        'customModifiers' => [
            'startingHp' => (int)$row['startingHp'],
            'startingGold' => (int)$row['startingGold'],
            'startingLevel' => (int)$row['startingLevel'],
            'extraClockSeconds' => (int)$row['extraClockSeconds'],
            'bonusItems' => $bonusArr,
            'isBanned' => ((int)$row['isBanned']) === 1
        ]
    ];
}

// Build full rules object from MySQL `game_rules` table
function loadRulesFromDb($pdo) {
    $baseRules = readJsonFallback('game_rules.json', []);
    if (!$pdo) return $baseRules;

    $stmt = $pdo->query("SELECT rule_key, rule_value FROM game_rules");
    $kv = [];
    while ($r = $stmt->fetch()) {
        $kv[$r['rule_key']] = $r['rule_value'];
    }
    if (empty($kv)) return $baseRules;

    $baseRules['STAGE_CONFIG']['1']['blitzTime'] = (int)($kv['stage1_blitz_time'] ?? 45);
    $baseRules['STAGE_CONFIG']['2']['blitzTime'] = (int)($kv['stage2_blitz_time'] ?? 60);
    $baseRules['STAGE_CONFIG']['3']['blitzTime'] = (int)($kv['stage3_blitz_time'] ?? 75);
    $baseRules['STAGE_CONFIG']['1']['increment'] = (int)($kv['stage1_increment'] ?? 3);
    $baseRules['STAGE_CONFIG']['2']['increment'] = (int)($kv['stage1_increment'] ?? 3);
    $baseRules['STAGE_CONFIG']['3']['increment'] = (int)($kv['stage3_increment'] ?? 4);
    $baseRules['STAGE_CONFIG']['1']['maxTurns'] = (int)($kv['stage1_max_turns'] ?? 36);
    $baseRules['STAGE_CONFIG']['2']['maxTurns'] = (int)($kv['stage2_max_turns'] ?? 48);
    $baseRules['STAGE_CONFIG']['3']['maxTurns'] = (int)($kv['stage3_max_turns'] ?? 64);

    $baseRules['combatRules']['turnOneGrace'] = ((int)($kv['turn_one_grace'] ?? 1)) === 1;
    $baseRules['combatRules']['rangedReloadTurns'] = (int)($kv['ranged_reload_turns'] ?? 1);
    $baseRules['combatRules']['stunImmuneTurns'] = (int)($kv['stun_immune_turns'] ?? 1);

    $baseRules['economy']['baseRoundGold'] = (int)($kv['base_round_gold'] ?? 5);
    $baseRules['economy']['maxInterest'] = (int)($kv['max_interest'] ?? 5);
    $baseRules['economy']['rerollCost'] = (int)($kv['reroll_cost'] ?? 2);
    $baseRules['economy']['buyXpCost'] = (int)($kv['buy_xp_cost'] ?? 4);
    $baseRules['economy']['buyXpAmount'] = (int)($kv['buy_xp_amount'] ?? 4);

    $baseRules['damageFormula']['checkmateBase'] = (int)($kv['checkmate_base_dmg'] ?? 8);
    $baseRules['damageFormula']['checkmateStageMult'] = (int)($kv['checkmate_stage_mult'] ?? 2);
    $baseRules['damageFormula']['checkmatePerUnit'] = (int)($kv['checkmate_per_unit_dmg'] ?? 2);
    $baseRules['damageFormula']['kingCaptureBase'] = (int)($kv['king_capture_base_dmg'] ?? 3);
    $baseRules['damageFormula']['kingCaptureStageMult'] = (int)($kv['king_capture_stage_mult'] ?? 1);
    $baseRules['damageFormula']['kingCaptureDiffMult'] = (int)($kv['king_capture_diff_mult'] ?? 1);
    $baseRules['damageFormula']['drawBase'] = (int)($kv['draw_base_dmg'] ?? 4);

    return $baseRules;
}

// Build full entities object merging MySQL `pieces` table
function loadEntitiesFromDb($pdo) {
    $entities = readJsonFallback('gameplay_entities.json', []);
    if (!$pdo) return $entities;

    $stmt = $pdo->query("SELECT * FROM pieces");
    while ($p = $stmt->fetch()) {
        $id = $p['id'];
        $synArr = array_values(array_filter(array_map('trim', explode(',', $p['synergies']))));
        $existing = $entities['PIECES'][$id] ?? [];
        $entities['PIECES'][$id] = array_merge($existing, [
            'id' => $id,
            'name' => $p['name'],
            'icon' => $p['icon'],
            'cost' => (int)$p['cost'],
            'isKing' => ((int)$p['isKing']) === 1,
            'traits' => $synArr,
            'baseHp' => [(int)$p['hp_star1'], (int)$p['hp_star2'], (int)$p['hp_star3']],
            'range' => [(int)$p['range_star1'], (int)$p['range_star2'], (int)$p['range_star3']],
            'attackType' => $p['attackType'],
            'moveType' => $p['moveType'],
            'desc' => $p['desc_text']
        ]);
    }
    return $entities;
}

$action = $_GET['action'] ?? '';
$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true) ?: [];

// ============================================================================
// 1. GET CONFIG
// ============================================================================
if ($action === 'config') {
    echo json_encode([
        'ok' => true,
        'dbEngine' => $pdo ? 'MySQL (WampServer phpMyAdmin)' : 'JSON Fallback',
        'rules' => loadRulesFromDb($pdo),
        'entities' => loadEntitiesFromDb($pdo)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ============================================================================
// 2. AUTH: REGISTER
// ============================================================================
if ($action === 'register') {
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';
    $displayName = trim($body['displayName'] ?? $username);
    $avatar = $body['avatar'] ?? '♟️';

    if (strlen($username) < 2 || strlen($password) < 2) {
        echo json_encode(['ok' => false, 'msg' => 'Tên đăng nhập và mật khẩu phải có ít nhất 2 ký tự!']);
        exit;
    }

    if ($pdo) {
        $chk = $pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)");
        $chk->execute([$username]);
        if ($chk->fetch()) {
            echo json_encode(['ok' => false, 'msg' => 'Tên đăng nhập này đã tồn tại trong MySQL!']);
            exit;
        }
        $newId = 'u_' . time() . '_' . rand(100, 999);
        $ins = $pdo->prepare("INSERT INTO users (id, username, password, displayName, role, avatar, elo, gamesPlayed, top1Count, top4Count, startingHp, startingGold, startingLevel, extraClockSeconds, bonusItems, isBanned) VALUES (?, ?, ?, ?, 'player', ?, 1000, 0, 0, 0, 100, 6, 3, 0, '', 0)");
        $ins->execute([$newId, $username, $password, $displayName ?: $username, $avatar]);

        $sel = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $sel->execute([$newId]);
        $userObj = formatUserRow($sel->fetch());
        unset($userObj['password']);
        echo json_encode(['ok' => true, 'user' => $userObj], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ============================================================================
// 3. AUTH: LOGIN
// ============================================================================
if ($action === 'login') {
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    if ($pdo) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND password = ?");
        $stmt->execute([$username, $password]);
        $row = $stmt->fetch();
        if (!$row) {
            echo json_encode(['ok' => false, 'msg' => 'Sai tên đăng nhập hoặc mật khẩu!']);
            exit;
        }
        if (((int)$row['isBanned']) === 1) {
            echo json_encode(['ok' => false, 'msg' => 'Tài khoản này đã bị khóa bởi Admin trong MySQL!']);
            exit;
        }
        $userObj = formatUserRow($row);
        unset($userObj['password']);
        echo json_encode(['ok' => true, 'user' => $userObj], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ============================================================================
// 4. ADMIN: GET ALL DATABASE TABLES
// ============================================================================
if ($action === 'admin_db') {
    $users = [];
    $matches = [];
    if ($pdo) {
        $uStmt = $pdo->query("SELECT * FROM users ORDER BY role ASC, elo DESC");
        while ($r = $uStmt->fetch()) {
            $users[] = formatUserRow($r);
        }
        $mStmt = $pdo->query("SELECT * FROM matches ORDER BY id DESC LIMIT 30");
        $matches = $mStmt->fetchAll();
    } else {
        $users = readJsonFallback('users.json', []);
        $matches = readJsonFallback('matches.json', []);
    }

    echo json_encode([
        'ok' => true,
        'dbEngine' => $pdo ? 'MySQL (chesstft_db)' : 'JSON',
        'users' => $users,
        'rules' => loadRulesFromDb($pdo),
        'entities' => loadEntitiesFromDb($pdo),
        'matches' => $matches
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ============================================================================
// 5. ADMIN: UPDATE USER ACCOUNT & MODIFIERS IN MYSQL
// ============================================================================
if ($action === 'admin_user') {
    $userId = $body['userId'] ?? '';
    $up = $body['updates'] ?? [];
    $mods = $up['customModifiers'] ?? [];

    if ($pdo && $userId) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $curr = $stmt->fetch();
        if (!$curr) {
            echo json_encode(['ok' => false, 'msg' => 'Không tìm thấy tài khoản trong bảng users!']);
            exit;
        }

        $displayName = !empty($up['displayName']) ? $up['displayName'] : $curr['displayName'];
        $role = !empty($up['role']) ? $up['role'] : $curr['role'];
        $elo = isset($up['elo']) ? (int)$up['elo'] : (int)$curr['elo'];
        $password = (!empty($up['password'])) ? $up['password'] : $curr['password'];

        $startingHp = isset($mods['startingHp']) ? (int)$mods['startingHp'] : (int)$curr['startingHp'];
        $startingGold = isset($mods['startingGold']) ? (int)$mods['startingGold'] : (int)$curr['startingGold'];
        $startingLevel = isset($mods['startingLevel']) ? (int)$mods['startingLevel'] : (int)$curr['startingLevel'];
        $extraClockSeconds = isset($mods['extraClockSeconds']) ? (int)$mods['extraClockSeconds'] : (int)$curr['extraClockSeconds'];
        $bonusItems = isset($mods['bonusItems']) && is_array($mods['bonusItems']) ? implode(',', $mods['bonusItems']) : $curr['bonusItems'];
        $isBanned = !empty($mods['isBanned']) ? 1 : 0;

        $uStmt = $pdo->prepare("UPDATE users SET displayName=?, role=?, elo=?, password=?, startingHp=?, startingGold=?, startingLevel=?, extraClockSeconds=?, bonusItems=?, isBanned=? WHERE id=?");
        $uStmt->execute([$displayName, $role, $elo, $password, $startingHp, $startingGold, $startingLevel, $extraClockSeconds, $bonusItems, $isBanned, $userId]);

        $stmt->execute([$userId]);
        $updatedUser = formatUserRow($stmt->fetch());
        echo json_encode(['ok' => true, 'msg' => 'Đã lưu tài khoản vào bảng `users` trong MySQL (phpMyAdmin)!', 'user' => $updatedUser], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ============================================================================
// 6. ADMIN: UPDATE GAME RULES IN MYSQL `game_rules` TABLE
// ============================================================================
if ($action === 'admin_rules') {
    $r = $body['rules'] ?? [];
    if ($pdo && !empty($r)) {
        $pairs = [
            'stage1_blitz_time' => $r['STAGE_CONFIG']['1']['blitzTime'] ?? 45,
            'stage2_blitz_time' => $r['STAGE_CONFIG']['2']['blitzTime'] ?? 60,
            'stage3_blitz_time' => $r['STAGE_CONFIG']['3']['blitzTime'] ?? 75,
            'stage1_increment' => $r['STAGE_CONFIG']['1']['increment'] ?? 3,
            'stage3_increment' => $r['STAGE_CONFIG']['3']['increment'] ?? 4,
            'turn_one_grace' => !empty($r['combatRules']['turnOneGrace']) ? '1' : '0',
            'base_round_gold' => $r['economy']['baseRoundGold'] ?? 5,
            'max_interest' => $r['economy']['maxInterest'] ?? 5,
            'checkmate_base_dmg' => $r['damageFormula']['checkmateBase'] ?? 8,
            'checkmate_per_unit_dmg' => $r['damageFormula']['checkmatePerUnit'] ?? 2,
            'king_capture_base_dmg' => $r['damageFormula']['kingCaptureBase'] ?? 3
        ];
        $stmt = $pdo->prepare("UPDATE game_rules SET rule_value = ? WHERE rule_key = ?");
        foreach ($pairs as $k => $v) {
            $stmt->execute([(string)$v, $k]);
        }
        writeJsonFallback('game_rules.json', $r);
        echo json_encode([
            'ok' => true,
            'msg' => 'Đã cập nhật bảng `game_rules` trong MySQL (phpMyAdmin)!',
            'rules' => loadRulesFromDb($pdo),
            'entities' => loadEntitiesFromDb($pdo)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ============================================================================
// 7. ADMIN: UPDATE PIECE IN MYSQL `pieces` TABLE
// ============================================================================
if ($action === 'admin_piece') {
    $pieceId = $body['pieceId'] ?? '';
    $pd = $body['pieceData'] ?? [];
    if ($pdo && $pieceId && !empty($pd)) {
        $stmt = $pdo->prepare("UPDATE pieces SET name=?, cost=?, hp_star1=?, hp_star2=?, hp_star3=?, range_star1=?, range_star2=?, range_star3=?, desc_text=? WHERE id=?");
        $stmt->execute([
            $pd['name'],
            (int)$pd['cost'],
            (int)($pd['baseHp'][0] ?? 1),
            (int)($pd['baseHp'][1] ?? 2),
            (int)($pd['baseHp'][2] ?? 3),
            (int)($pd['range'][0] ?? 1),
            (int)($pd['range'][1] ?? 1),
            (int)($pd['range'][2] ?? 1),
            $pd['desc'],
            $pieceId
        ]);
        echo json_encode([
            'ok' => true,
            'msg' => "Đã lưu quân cờ {$pd['name']} vào bảng `pieces` trong MySQL (phpMyAdmin)!",
            'rules' => loadRulesFromDb($pdo),
            'entities' => loadEntitiesFromDb($pdo)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ============================================================================
// 8. RECORD MATCH HISTORY & ELO IN MYSQL `matches` & `users`
// ============================================================================
if ($action === 'match_finish') {
    $userId = $body['userId'] ?? '';
    $rank = (int)($body['rank'] ?? 8);
    $stageReached = $body['stageReached'] ?? '1-1';
    $roomCode = $body['roomCode'] ?? 'SOLO';
    $finalComp = json_encode($body['finalComp'] ?? [], JSON_UNESCAPED_UNICODE);

    $eloDeltaMap = [1 => 35, 2 => 22, 3 => 12, 4 => 5, 5 => -5, 6 => -12, 7 => -20, 8 => -28];
    $delta = $eloDeltaMap[$rank] ?? 0;

    if ($pdo && $userId) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $u = $stmt->fetch();
        if ($u) {
            $newElo = max(0, (int)$u['elo'] + $delta);
            $games = (int)$u['gamesPlayed'] + 1;
            $top1 = (int)$u['top1Count'] + ($rank === 1 ? 1 : 0);
            $top4 = (int)$u['top4Count'] + ($rank <= 4 ? 1 : 0);

            $upd = $pdo->prepare("UPDATE users SET elo=?, gamesPlayed=?, top1Count=?, top4Count=? WHERE id=?");
            $upd->execute([$newElo, $games, $top1, $top4, $userId]);

            $ins = $pdo->prepare("INSERT INTO matches (userId, username, roomCode, rank_result, stageReached, eloDelta, finalComp_json) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $ins->execute([$userId, $u['username'], $roomCode, $rank, $stageReached, $delta, $finalComp]);

            $stmt->execute([$userId]);
            $updatedUser = formatUserRow($stmt->fetch());
            unset($updatedUser['password']);
            echo json_encode(['ok' => true, 'user' => $updatedUser], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    echo json_encode(['ok' => true]);
    exit;
}

// ============================================================================
// 9. WAMPSERVER MULTIPLAYER ROOMS (Via MySQL `rooms` Table)
// ============================================================================
if ($action === 'room_list' && $pdo) {
    // Clean up old rooms (> 2 hours)
    $pdo->exec("DELETE FROM rooms WHERE updatedAt < (NOW() - INTERVAL 2 HOUR)");
    $stmt = $pdo->query("SELECT * FROM rooms WHERE status = 'waiting' ORDER BY updatedAt DESC");
    $list = [];
    while ($r = $stmt->fetch()) {
        $players = json_decode($r['players_json'], true) ?: [];
        $list[] = [
            'code' => $r['code'],
            'name' => $r['name'],
            'hostName' => $r['hostName'],
            'humanCount' => count($players),
            'maxPlayers' => 8,
            'fillBots' => ((int)$r['fillBots']) === 1,
            'timeMode' => $r['timeMode'],
            'status' => $r['status']
        ];
    }
    echo json_encode(['ok' => true, 'rooms' => $list], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'room_create' && $pdo) {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 6; $i++) $code .= $chars[rand(0, strlen($chars) - 1)];

    $user = $body['user'] ?? [];
    $hostId = $user['id'] ?? ('guest_' . time());
    $hostName = $user['displayName'] ?? ($user['username'] ?? 'Kỳ Thủ');
    $roomName = trim($body['roomName'] ?? "Phòng của $hostName");
    $fillBots = !isset($body['fillBots']) || $body['fillBots'] ? 1 : 0;
    $timeMode = $body['timeMode'] ?? 'standard';
    $isSpectator = !empty($body['isSpectator']);

    $players = $isSpectator ? [] : [[
        'id' => $hostId,
        'username' => $user['username'] ?? 'guest',
        'displayName' => $hostName,
        'avatar' => $user['avatar'] ?? '👑',
        'elo' => $user['stats']['elo'] ?? 1000,
        'customModifiers' => $user['customModifiers'] ?? null,
        'isHost' => true,
        'hp' => 100,
        'level' => 3,
        'board' => []
    ]];

    $spectators = $isSpectator ? [[
        'id' => $hostId,
        'name' => $hostName,
        'avatar' => $user['avatar'] ?? '🎙️',
        'isHost' => true
    ]] : [];

    $stmt = $pdo->prepare("INSERT INTO rooms (code, name, hostId, hostName, fillBots, timeMode, status, players_json) VALUES (?, ?, ?, ?, ?, ?, 'waiting', ?)");
    $stmt->execute([$code, $roomName, $hostId, $hostName, $fillBots, $timeMode, json_encode($players, JSON_UNESCAPED_UNICODE)]);

    echo json_encode([
        'ok' => true,
        'room' => [
            'code' => $code,
            'name' => $roomName,
            'hostId' => $hostId,
            'hostName' => $hostName,
            'fillBots' => $fillBots === 1,
            'timeMode' => $timeMode,
            'status' => 'waiting',
            'isSpectatorHost' => $isSpectator,
            'spectators' => $spectators,
            'players' => $players
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'room_join' && $pdo) {
    $code = strtoupper(trim($body['code'] ?? ''));
    $user = $body['user'] ?? [];
    $asSpectator = !empty($body['asSpectator']);
    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE code = ?");
    $stmt->execute([$code]);
    $r = $stmt->fetch();
    if (!$r) {
        echo json_encode(['ok' => false, 'msg' => 'Không tìm thấy Mã Phòng này!']);
        exit;
    }
    $players = json_decode($r['players_json'], true) ?: [];
    if (!$asSpectator && count($players) >= 8) {
        echo json_encode(['ok' => false, 'msg' => 'Phòng đã đủ 8 người chơi!']);
        exit;
    }
    $uid = $user['id'] ?? ('guest_' . time());
    $exists = false;
    foreach ($players as &$p) {
        if ($p['id'] === $uid) { $exists = true; break; }
    }
    if (!$exists && !$asSpectator) {
        $players[] = [
            'id' => $uid,
            'username' => $user['username'] ?? 'guest',
            'displayName' => $user['displayName'] ?? 'Kỳ Thủ',
            'avatar' => $user['avatar'] ?? '⚔️',
            'elo' => $user['stats']['elo'] ?? 1000,
            'customModifiers' => $user['customModifiers'] ?? null,
            'isHost' => false,
            'hp' => 100,
            'level' => 3,
            'board' => []
        ];
        $upd = $pdo->prepare("UPDATE rooms SET players_json = ? WHERE code = ?");
        $upd->execute([json_encode($players, JSON_UNESCAPED_UNICODE), $code]);
    }
    echo json_encode([
        'ok' => true,
        'room' => [
            'code' => $r['code'],
            'name' => $r['name'],
            'hostId' => $r['hostId'],
            'hostName' => $r['hostName'],
            'fillBots' => ((int)$r['fillBots']) === 1,
            'timeMode' => $r['timeMode'],
            'status' => $r['status'],
            'players' => $players
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'room_get' && $pdo) {
    $code = strtoupper(trim($_GET['code'] ?? ($body['code'] ?? '')));
    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE code = ?");
    $stmt->execute([$code]);
    $r = $stmt->fetch();
    if (!$r) {
        echo json_encode(['ok' => false]);
        exit;
    }
    echo json_encode([
        'ok' => true,
        'room' => [
            'code' => $r['code'],
            'name' => $r['name'],
            'hostId' => $r['hostId'],
            'hostName' => $r['hostName'],
            'fillBots' => ((int)$r['fillBots']) === 1,
            'timeMode' => $r['timeMode'],
            'status' => $r['status'],
            'players' => json_decode($r['players_json'], true) ?: []
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'room_start' && $pdo) {
    $code = strtoupper(trim($body['code'] ?? ''));
    $fillBots = !isset($body['fillBots']) || $body['fillBots'] ? 1 : 0;
    $timeMode = $body['timeMode'] ?? 'standard';
    $upd = $pdo->prepare("UPDATE rooms SET status = 'playing', fillBots = ?, timeMode = ? WHERE code = ?");
    $upd->execute([$fillBots, $timeMode, $code]);

    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE code = ?");
    $stmt->execute([$code]);
    $r = $stmt->fetch();
    echo json_encode([
        'ok' => true,
        'room' => [
            'code' => $r['code'],
            'name' => $r['name'],
            'hostId' => $r['hostId'],
            'hostName' => $r['hostName'],
            'fillBots' => ((int)$r['fillBots']) === 1,
            'timeMode' => $r['timeMode'],
            'status' => 'playing',
            'players' => json_decode($r['players_json'], true) ?: []
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(['ok' => false, 'msg' => 'Unknown API action']);

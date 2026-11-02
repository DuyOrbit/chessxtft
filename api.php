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
$allowedOrigin = getenv('ALLOWED_ORIGIN') ?: '*';
header("Access-Control-Allow-Origin: $allowedOrigin");
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$DB_HOST = getenv('DB_HOST') ?: '127.0.0.1';
$DB_USER = getenv('DB_USER') ?: 'root';
$DB_PASS = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
$DB_NAME = getenv('DB_NAME') ?: 'chesstft_db';

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
        }

        // Ensure `token` column exists in `users` table for Bearer authentication
        try {
            $colChk = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'token'");
            if ($colChk && $colChk->rowCount() === 0) {
                $pdo->exec("ALTER TABLE `users` ADD COLUMN `token` VARCHAR(128) NULL AFTER `password`");
            }
        } catch (Exception $e) {
            error_log("Failed to ensure token column: " . $e->getMessage());
        }

        return $pdo;
    } catch (Exception $e) {
        error_log("MySQL connection error: " . $e->getMessage());
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

// Password hashing & migration
function hashUserPassword($plain) {
    return password_hash($plain, PASSWORD_DEFAULT);
}

function verifyUserPasswordAndMigrate($plain, $hashedOrPlain, $userId, $pdo) {
    if (empty($hashedOrPlain)) return false;

    // Check if it's already a modern password_hash (bcrypt / argon2)
    if (password_verify($plain, $hashedOrPlain)) {
        return true;
    }

    // Auto-migrate legacy plaintext password if it matches
    if ((string)$plain === (string)$hashedOrPlain) {
        $newHash = hashUserPassword($plain);
        if ($pdo && $userId) {
            try {
                $upd = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
                $upd->execute([$newHash, $userId]);
            } catch (Exception $e) {
                error_log("Password auto-migration failed in MySQL: " . $e->getMessage());
            }
        } else if (!$pdo && $userId) {
            $users = readJsonFallback('users.json', []);
            foreach ($users as &$u) {
                if ($u['id'] === $userId) {
                    $u['password'] = $newHash;
                    break;
                }
            }
            writeJsonFallback('users.json', $users);
        }
        return true;
    }

    return false;
}

// Token extraction & authentication
function getAuthTokenFromRequest() {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
        return trim($matches[1]);
    }
    if (!empty($_GET['token'])) return trim($_GET['token']);
    $rawBody = file_get_contents('php://input');
    $body = json_decode($rawBody, true) ?: [];
    if (!empty($body['token'])) return trim($body['token']);
    return '';
}

function getAuthenticatedUser($pdo) {
    $token = getAuthTokenFromRequest();
    if (!$token) return null;

    if ($pdo) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE token = ? LIMIT 1");
        $stmt->execute([$token]);
        $row = $stmt->fetch();
        if ($row) return $row;
    } else {
        $users = readJsonFallback('users.json', []);
        foreach ($users as $u) {
            if (!empty($u['token']) && hash_equals($u['token'], $token)) {
                return $u;
            }
        }
    }
    return null;
}

function requireAdminPermission($pdo) {
    $user = getAuthenticatedUser($pdo);
    if (!$user || ($user['role'] ?? '') !== 'admin') {
        http_response_code(403);
        echo json_encode([
            'ok' => false,
            'msg' => 'Từ chối truy cập: Yêu cầu quyền Quản trị viên (Admin) với Token hợp lệ!'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    return $user;
}

// Helper to format a MySQL user row into the frontend user object (NEVER EXPOSES PASSWORD)
function formatUserRow($row) {
    $bonusArr = [];
    if (!empty($row['bonusItems'])) {
        $bonusArr = array_values(array_filter(array_map('trim', explode(',', $row['bonusItems']))));
    }
    return [
        'id' => $row['id'],
        'username' => $row['username'],
        // Password field is intentionally REMOVED for security
        'displayName' => $row['displayName'],
        'role' => $row['role'],
        'avatar' => $row['avatar'] ?: '♟️',
        'stats' => [
            'gamesPlayed' => (int)($row['gamesPlayed'] ?? 0),
            'top1Count' => (int)($row['top1Count'] ?? 0),
            'top4Count' => (int)($row['top4Count'] ?? 0),
            'elo' => (int)($row['elo'] ?? 1000)
        ],
        'customModifiers' => [
            'startingHp' => (int)($row['startingHp'] ?? 100),
            'startingGold' => (int)($row['startingGold'] ?? 6),
            'startingLevel' => (int)($row['startingLevel'] ?? 3),
            'extraClockSeconds' => (int)($row['extraClockSeconds'] ?? 0),
            'bonusItems' => $bonusArr,
            'isBanned' => ((int)($row['isBanned'] ?? 0)) === 1
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
    $baseRules['STAGE_CONFIG']['2']['increment'] = (int)($kv['stage2_increment'] ?? ($kv['stage1_increment'] ?? 3));
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
    $password = (string)($body['password'] ?? '');
    $displayName = trim($body['displayName'] ?? $username);
    $avatar = $body['avatar'] ?? '♟️';

    if (strlen($username) < 2 || strlen($password) < 2) {
        echo json_encode(['ok' => false, 'msg' => 'Tên đăng nhập và mật khẩu phải có ít nhất 2 ký tự!']);
        exit;
    }

    $hashedPassword = hashUserPassword($password);
    $token = bin2hex(random_bytes(32));
    $newId = 'u_' . time() . '_' . random_int(100, 999);

    if ($pdo) {
        $chk = $pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)");
        $chk->execute([$username]);
        if ($chk->fetch()) {
            echo json_encode(['ok' => false, 'msg' => 'Tên đăng nhập này đã tồn tại trong MySQL!']);
            exit;
        }
        $ins = $pdo->prepare("INSERT INTO users (id, username, password, token, displayName, role, avatar, elo, gamesPlayed, top1Count, top4Count, startingHp, startingGold, startingLevel, extraClockSeconds, bonusItems, isBanned) VALUES (?, ?, ?, ?, ?, 'player', ?, 1000, 0, 0, 0, 100, 6, 3, 0, '', 0)");
        $ins->execute([$newId, $username, $hashedPassword, $token, $displayName ?: $username, $avatar]);

        $sel = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $sel->execute([$newId]);
        $userObj = formatUserRow($sel->fetch());
        $userObj['token'] = $token;
        echo json_encode(['ok' => true, 'user' => $userObj], JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        $users = readJsonFallback('users.json', []);
        $cleanUser = strtolower($username);
        foreach ($users as $u) {
            if (strtolower($u['username']) === $cleanUser) {
                echo json_encode(['ok' => false, 'msg' => 'Tên đăng nhập này đã tồn tại!']);
                exit;
            }
        }
        $newUser = [
            'id' => $newId,
            'username' => $cleanUser,
            'password' => $hashedPassword,
            'token' => $token,
            'displayName' => $displayName ?: $username,
            'role' => 'player',
            'avatar' => $avatar ?: '♟️',
            'createdAt' => date('c'),
            'stats' => ['gamesPlayed' => 0, 'top1Count' => 0, 'top4Count' => 0, 'elo' => 1000],
            'customModifiers' => [
                'startingHp' => 100, 'startingGold' => 6, 'startingLevel' => 3,
                'extraClockSeconds' => 0, 'bonusItems' => ['stun_hammer', 'burn_cloak'], 'isBanned' => false
            ]
        ];
        $users[] = $newUser;
        writeJsonFallback('users.json', $users);
        $safe = $newUser;
        unset($safe['password']);
        echo json_encode(['ok' => true, 'user' => $safe], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ============================================================================
// 3. AUTH: LOGIN
// ============================================================================
if ($action === 'login') {
    $username = trim($body['username'] ?? '');
    $password = (string)($body['password'] ?? '');

    if ($pdo) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)");
        $stmt->execute([$username]);
        $row = $stmt->fetch();
        if (!$row || !verifyUserPasswordAndMigrate($password, $row['password'], $row['id'], $pdo)) {
            echo json_encode(['ok' => false, 'msg' => 'Sai tên đăng nhập hoặc mật khẩu!']);
            exit;
        }
        if (((int)$row['isBanned']) === 1) {
            echo json_encode(['ok' => false, 'msg' => 'Tài khoản này đã bị khóa bởi Admin trong MySQL!']);
            exit;
        }

        $token = bin2hex(random_bytes(32));
        $tokStmt = $pdo->prepare("UPDATE users SET token = ? WHERE id = ?");
        $tokStmt->execute([$token, $row['id']]);

        $userObj = formatUserRow($row);
        $userObj['token'] = $token;
        echo json_encode(['ok' => true, 'user' => $userObj], JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        $users = readJsonFallback('users.json', []);
        $cleanUser = strtolower($username);
        $foundIdx = -1;
        foreach ($users as $i => $u) {
            if (strtolower($u['username']) === $cleanUser) {
                $foundIdx = $i;
                break;
            }
        }
        if ($foundIdx === -1 || !verifyUserPasswordAndMigrate($password, $users[$foundIdx]['password'], $users[$foundIdx]['id'], null)) {
            echo json_encode(['ok' => false, 'msg' => 'Sai tên đăng nhập hoặc mật khẩu!']);
            exit;
        }
        $found = $users[$foundIdx];
        if (!empty($found['customModifiers']['isBanned'])) {
            echo json_encode(['ok' => false, 'msg' => 'Tài khoản này đang bị tạm khóa bởi Admin!']);
            exit;
        }

        $token = bin2hex(random_bytes(32));
        $users[$foundIdx]['token'] = $token;
        writeJsonFallback('users.json', $users);

        $safe = $users[$foundIdx];
        unset($safe['password']);
        $safe['token'] = $token;
        echo json_encode(['ok' => true, 'user' => $safe], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ============================================================================
// SECURITY CHECKPOINT: ALL `admin_*` ACTIONS REQUIRE VALID ADMIN TOKEN
// ============================================================================
if (strpos($action, 'admin_') === 0) {
    requireAdminPermission($pdo);
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
            $users[] = formatUserRow($r); // Guaranteed NO password field!
        }
        $mStmt = $pdo->query("SELECT * FROM matches ORDER BY id DESC LIMIT 50");
        $matches = $mStmt->fetchAll();
    } else {
        $rawUsers = readJsonFallback('users.json', []);
        foreach ($rawUsers as $u) {
            $copy = $u;
            unset($copy['password']);
            $users[] = $copy;
        }
        $matches = readJsonFallback('matches.json', []);
    }

    echo json_encode([
        'ok' => true,
        'dbEngine' => $pdo ? 'MySQL (chesstft_db)' : 'JSON Database (db/users.json)',
        'users' => $users,
        'rules' => loadRulesFromDb($pdo),
        'entities' => loadEntitiesFromDb($pdo),
        'matches' => $matches
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ============================================================================
// 5. ADMIN: UPDATE USER ACCOUNT & MODIFIERS
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
        $password = $curr['password'];
        if (!empty($up['password']) && trim($up['password']) !== '') {
            $password = hashUserPassword(trim($up['password']));
        }

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
        echo json_encode(['ok' => true, 'msg' => 'Đã lưu tài khoản vào bảng `users` trong MySQL!', 'user' => $updatedUser], JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        $users = readJsonFallback('users.json', []);
        $idx = -1;
        foreach ($users as $i => $u) {
            if ($u['id'] === $userId) { $idx = $i; break; }
        }
        if ($idx === -1) {
            echo json_encode(['ok' => false, 'msg' => 'Không tìm thấy tài khoản!']);
            exit;
        }
        if (isset($up['displayName'])) $users[$idx]['displayName'] = $up['displayName'];
        if (isset($up['role'])) $users[$idx]['role'] = $up['role'];
        if (!empty($up['password']) && trim($up['password']) !== '') {
            $users[$idx]['password'] = hashUserPassword(trim($up['password']));
        }
        if (isset($up['elo'])) $users[$idx]['stats']['elo'] = (int)$up['elo'];
        if ($mods) {
            $users[$idx]['customModifiers'] = array_merge($users[$idx]['customModifiers'] ?? [], [
                'startingHp' => isset($mods['startingHp']) ? (int)$mods['startingHp'] : 100,
                'startingGold' => isset($mods['startingGold']) ? (int)$mods['startingGold'] : 6,
                'startingLevel' => isset($mods['startingLevel']) ? (int)$mods['startingLevel'] : 3,
                'extraClockSeconds' => isset($mods['extraClockSeconds']) ? (int)$mods['extraClockSeconds'] : 0,
                'bonusItems' => $mods['bonusItems'] ?? ['stun_hammer', 'burn_cloak'],
                'isBanned' => !empty($mods['isBanned'])
            ]);
        }
        writeJsonFallback('users.json', $users);
        $safe = $users[$idx];
        unset($safe['password']);
        echo json_encode(['ok' => true, 'msg' => "Đã lưu tài khoản {$safe['username']} vào Database!", 'user' => $safe], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// 5b. ADMIN CREATE USER
if ($action === 'admin_user_create') {
    $username = strtolower(trim($body['username'] ?? ''));
    $password = (string)($body['password'] ?? '123');
    $displayName = trim($body['displayName'] ?? $username);
    $role = ($body['role'] ?? 'player') === 'admin' ? 'admin' : 'player';
    $avatar = $body['avatar'] ?? '👤';
    $elo = (int)($body['elo'] ?? 1000);
    $mods = $body['customModifiers'] ?? [];

    if (strlen($username) < 2) {
        echo json_encode(['ok' => false, 'msg' => 'Tên đăng nhập phải từ 2 ký tự trở lên!']);
        exit;
    }

    $hashedPassword = hashUserPassword($password);
    $newId = 'u_' . time() . '_' . random_int(100, 999);
    $bonusList = $mods['bonusItems'] ?? ['stun_hammer', 'burn_cloak'];
    $bonusStr = is_array($bonusList) ? implode(',', $bonusList) : '';

    if ($pdo) {
        $chk = $pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)");
        $chk->execute([$username]);
        if ($chk->fetch()) {
            echo json_encode(['ok' => false, 'msg' => "Tên đăng nhập '{$username}' đã tồn tại trong MySQL!"]);
            exit;
        }
        try {
            $ins = $pdo->prepare("INSERT INTO users (id, username, password, displayName, role, avatar, elo, gamesPlayed, top1Count, top4Count, startingHp, startingGold, startingLevel, extraClockSeconds, bonusItems, isBanned) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?)");
            $ins->execute([
                $newId, $username, $hashedPassword, $displayName ?: $username, $role, $avatar, $elo,
                (int)($mods['startingHp'] ?? 100), (int)($mods['startingGold'] ?? 6), (int)($mods['startingLevel'] ?? 3),
                (int)($mods['extraClockSeconds'] ?? 0), $bonusStr, !empty($mods['isBanned']) ? 1 : 0
            ]);
        } catch (Exception $e) {
            error_log("admin_user_create MySQL error: " . $e->getMessage());
            echo json_encode(['ok' => false, 'msg' => 'Lỗi lưu tài khoản vào MySQL: ' . $e->getMessage()]);
            exit;
        }
    }

    $users = readJsonFallback('users.json', []);
    $newUser = [
        'id' => $newId,
        'username' => $username,
        'password' => $hashedPassword,
        'displayName' => $displayName ?: $username,
        'role' => $role,
        'avatar' => $avatar,
        'createdAt' => date('c'),
        'stats' => ['elo' => $elo, 'gamesPlayed' => 0, 'top1Count' => 0, 'wins' => 0, 'losses' => 0],
        'customModifiers' => [
            'startingHp' => (int)($mods['startingHp'] ?? 100),
            'startingGold' => (int)($mods['startingGold'] ?? 6),
            'startingLevel' => (int)($mods['startingLevel'] ?? 3),
            'extraClockSeconds' => (int)($mods['extraClockSeconds'] ?? 0),
            'bonusItems' => $bonusList,
            'isBanned' => !empty($mods['isBanned'])
        ]
    ];
    $users[] = $newUser;
    writeJsonFallback('users.json', $users);

    $safeUsers = array_map(function($u) {
        $c = $u;
        unset($c['password']);
        return $c;
    }, $users);

    $safeNew = $newUser;
    unset($safeNew['password']);

    echo json_encode(['ok' => true, 'msg' => "Đã tạo tài khoản '{$username}' thành công!", 'user' => $safeNew, 'users' => $safeUsers], JSON_UNESCAPED_UNICODE);
    exit;
}

// 5c. ADMIN DELETE USER
if ($action === 'admin_user_delete') {
    $userId = $body['userId'] ?? ($body['id'] ?? '');
    if (!$userId) {
        echo json_encode(['ok' => false, 'msg' => 'Thiếu ID người dùng cần xóa!']);
        exit;
    }

    $deletedUsername = '';
    if ($pdo) {
        $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if ($row) {
            if ($row['username'] === 'admin') {
                echo json_encode(['ok' => false, 'msg' => 'Không thể xóa tài khoản Admin Tối Thượng!']);
                exit;
            }
            $deletedUsername = $row['username'];
            $del = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $del->execute([$userId]);
        }
    }

    $users = readJsonFallback('users.json', []);
    $idx = -1;
    foreach ($users as $i => $u) {
        if ($u['id'] === $userId) { $idx = $i; break; }
    }
    if ($idx !== -1) {
        if ($users[$idx]['username'] === 'admin') {
            echo json_encode(['ok' => false, 'msg' => 'Không thể xóa tài khoản Admin Tối Thượng!']);
            exit;
        }
        $deleted = array_splice($users, $idx, 1)[0];
        $deletedUsername = $deleted['username'];
        writeJsonFallback('users.json', $users);
    }

    if (!$deletedUsername) {
        echo json_encode(['ok' => false, 'msg' => 'Không tìm thấy tài khoản cần xóa!']);
        exit;
    }

    $safeUsers = array_map(function($u) {
        $c = $u;
        unset($c['password']);
        return $c;
    }, $users);

    echo json_encode(['ok' => true, 'msg' => "Đã xóa tài khoản '{$deletedUsername}' khỏi hệ thống!", 'users' => $safeUsers], JSON_UNESCAPED_UNICODE);
    exit;
}

// 5d. ADMIN SEED DEFAULTS
if ($action === 'admin_seed_defaults') {
    $defaultAccounts = [
        ['id' => 'u_admin', 'username' => 'admin', 'password' => '123', 'displayName' => 'GM Tối Cao (Admin)', 'role' => 'admin', 'avatar' => '👑', 'elo' => 1500, 'gamesPlayed' => 12, 'top1Count' => 6, 'top4Count' => 10, 'startingHp' => 100, 'startingGold' => 10, 'startingLevel' => 3, 'extraClockSeconds' => 10, 'bonusItems' => 'stun_hammer,burn_cloak'],
        ['id' => 'u_kithu1', 'username' => 'kithu1', 'password' => '123', 'displayName' => 'Kỳ Thủ Tiên Phong', 'role' => 'player', 'avatar' => '🦊', 'elo' => 1050, 'gamesPlayed' => 8, 'top1Count' => 2, 'top4Count' => 4, 'startingHp' => 100, 'startingGold' => 6, 'startingLevel' => 3, 'extraClockSeconds' => 0, 'bonusItems' => 'stun_hammer,burn_cloak'],
        ['id' => 'u_bot_magnus', 'username' => 'bot_magnus', 'password' => '123', 'displayName' => 'Đại Kiện Tướng Magnus (Bot)', 'role' => 'player', 'avatar' => '🤖', 'elo' => 1800, 'gamesPlayed' => 50, 'top1Count' => 25, 'top4Count' => 38, 'startingHp' => 100, 'startingGold' => 6, 'startingLevel' => 3, 'extraClockSeconds' => 0, 'bonusItems' => 'phase_boots']
    ];

    $added = 0;
    if ($pdo) {
        $ins = $pdo->prepare("INSERT INTO users (id, username, password, displayName, role, avatar, elo, gamesPlayed, top1Count, top4Count, startingHp, startingGold, startingLevel, extraClockSeconds, bonusItems, isBanned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0) ON DUPLICATE KEY UPDATE displayName=VALUES(displayName)");
        foreach ($defaultAccounts as $acc) {
            $hashed = hashUserPassword($acc['password']);
            $ins->execute([
                $acc['id'], $acc['username'], $hashed, $acc['displayName'], $acc['role'], $acc['avatar'],
                $acc['elo'], $acc['gamesPlayed'], $acc['top1Count'], $acc['top4Count'],
                $acc['startingHp'], $acc['startingGold'], $acc['startingLevel'], $acc['extraClockSeconds'], $acc['bonusItems']
            ]);
            $added++;
        }
    }
    echo json_encode(['ok' => true, 'msg' => "Đã đồng bộ $added tài khoản mẫu vào hệ thống!"]);
    exit;
}

// ============================================================================
// 6. ADMIN: UPDATE FULL GAME RULES (ALL 23 KEYS SAVED PROPERLY)
// ============================================================================
if ($action === 'admin_rules') {
    $r = $body['rules'] ?? [];
    if (!empty($r)) {
        if ($pdo) {
            $pairs = [
                'stage1_blitz_time' => $r['STAGE_CONFIG']['1']['blitzTime'] ?? 45,
                'stage2_blitz_time' => $r['STAGE_CONFIG']['2']['blitzTime'] ?? 60,
                'stage3_blitz_time' => $r['STAGE_CONFIG']['3']['blitzTime'] ?? 75,
                'stage1_increment' => $r['STAGE_CONFIG']['1']['increment'] ?? 3,
                'stage2_increment' => $r['STAGE_CONFIG']['2']['increment'] ?? ($r['STAGE_CONFIG']['1']['increment'] ?? 3),
                'stage3_increment' => $r['STAGE_CONFIG']['3']['increment'] ?? 4,
                'stage1_max_turns' => $r['STAGE_CONFIG']['1']['maxTurns'] ?? 36,
                'stage2_max_turns' => $r['STAGE_CONFIG']['2']['maxTurns'] ?? 48,
                'stage3_max_turns' => $r['STAGE_CONFIG']['3']['maxTurns'] ?? 64,
                'turn_one_grace' => !empty($r['combatRules']['turnOneGrace']) ? '1' : '0',
                'ranged_reload_turns' => $r['combatRules']['rangedReloadTurns'] ?? 1,
                'stun_immune_turns' => $r['combatRules']['stunImmuneTurns'] ?? 1,
                'base_round_gold' => $r['economy']['baseRoundGold'] ?? 5,
                'max_interest' => $r['economy']['maxInterest'] ?? 5,
                'reroll_cost' => $r['economy']['rerollCost'] ?? 2,
                'buy_xp_cost' => $r['economy']['buyXpCost'] ?? 4,
                'buy_xp_amount' => $r['economy']['buyXpAmount'] ?? 4,
                'checkmate_base_dmg' => $r['damageFormula']['checkmateBase'] ?? 8,
                'checkmate_stage_mult' => $r['damageFormula']['checkmateStageMult'] ?? 2,
                'checkmate_per_unit_dmg' => $r['damageFormula']['checkmatePerUnit'] ?? 2,
                'king_capture_base_dmg' => $r['damageFormula']['kingCaptureBase'] ?? 3,
                'king_capture_stage_mult' => $r['damageFormula']['kingCaptureStageMult'] ?? 1,
                'king_capture_diff_mult' => $r['damageFormula']['kingCaptureDiffMult'] ?? 1,
                'draw_base_dmg' => $r['damageFormula']['drawBase'] ?? 4
            ];
            $stmt = $pdo->prepare("INSERT INTO game_rules (rule_key, rule_value, description) VALUES (?, ?, '') ON DUPLICATE KEY UPDATE rule_value = VALUES(rule_value)");
            foreach ($pairs as $k => $v) {
                $stmt->execute([$k, (string)$v]);
            }
        }
        writeJsonFallback('game_rules.json', $r);
        echo json_encode([
            'ok' => true,
            'msg' => 'Đã cập nhật toàn bộ 23 thông số luật chơi thành công!',
            'rules' => loadRulesFromDb($pdo),
            'entities' => loadEntitiesFromDb($pdo)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ============================================================================
// 7. ADMIN: UPDATE PIECE
// ============================================================================
if ($action === 'admin_piece') {
    $pieceId = $body['pieceId'] ?? '';
    $pd = $body['pieceData'] ?? [];
    if ($pieceId && !empty($pd)) {
        if ($pdo) {
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
        }
        $entities = readJsonFallback('gameplay_entities.json', []);
        if (isset($entities['PIECES'][$pieceId])) {
            $entities['PIECES'][$pieceId]['name'] = $pd['name'];
            $entities['PIECES'][$pieceId]['cost'] = (int)$pd['cost'];
            $entities['PIECES'][$pieceId]['baseHp'] = [(int)($pd['baseHp'][0] ?? 1), (int)($pd['baseHp'][1] ?? 2), (int)($pd['baseHp'][2] ?? 3)];
            $entities['PIECES'][$pieceId]['range'] = [(int)($pd['range'][0] ?? 1), (int)($pd['range'][1] ?? 1), (int)($pd['range'][2] ?? 1)];
            $entities['PIECES'][$pieceId]['desc'] = $pd['desc'];
            writeJsonFallback('gameplay_entities.json', $entities);
        }
        echo json_encode([
            'ok' => true,
            'msg' => "Đã lưu quân cờ {$pd['name']} thành công!",
            'rules' => loadRulesFromDb($pdo),
            'entities' => loadEntitiesFromDb($pdo)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ============================================================================
// 8. RECORD MATCH HISTORY & ELO (VERIFIES CALLER IDENTITY VIA TOKEN)
// ============================================================================
if ($action === 'match_finish') {
    $authUser = getAuthenticatedUser($pdo);
    $userId = $body['userId'] ?? '';

    // If an authenticated session exists, ensure the report belongs to this user
    if ($authUser && $authUser['id'] !== $userId) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'msg' => 'Từ chối: Không thể ghi nhận kết quả trận đấu cho tài khoản khác!']);
        exit;
    }

    // Ignore guest / local playground matches for official ELO ranking
    if (!$userId || strpos($userId, 'local_') === 0 || strpos($userId, 'guest_') === 0) {
        echo json_encode(['ok' => true]);
        exit;
    }

    $rank = max(1, min(8, (int)($body['rank'] ?? 8)));
    $stageReached = $body['stageReached'] ?? '1-1';
    $roomCode = $body['roomCode'] ?? 'SOLO';
    $finalComp = json_encode($body['finalComp'] ?? [], JSON_UNESCAPED_UNICODE);

    $eloDeltaMap = [1 => 35, 2 => 22, 3 => 12, 4 => 5, 5 => -5, 6 => -12, 7 => -20, 8 => -28];
    $delta = $eloDeltaMap[$rank] ?? 0;

    if ($pdo) {
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
            echo json_encode(['ok' => true, 'user' => $updatedUser], JSON_UNESCAPED_UNICODE);
            exit;
        }
    } else {
        $users = readJsonFallback('users.json', []);
        foreach ($users as &$u) {
            if ($u['id'] === $userId) {
                if (!isset($u['stats'])) $u['stats'] = ['elo' => 1000, 'gamesPlayed' => 0, 'top1Count' => 0, 'top4Count' => 0];
                $u['stats']['gamesPlayed'] = ($u['stats']['gamesPlayed'] ?? 0) + 1;
                $u['stats']['elo'] = max(0, ($u['stats']['elo'] ?? 1000) + $delta);
                if ($rank === 1) $u['stats']['top1Count'] = ($u['stats']['top1Count'] ?? 0) + 1;
                if ($rank <= 4) $u['stats']['top4Count'] = ($u['stats']['top4Count'] ?? 0) + 1;
                writeJsonFallback('users.json', $users);

                $matches = readJsonFallback('matches.json', []);
                array_unshift($matches, [
                    'id' => 'match_' . time(),
                    'userId' => $userId,
                    'username' => $u['username'],
                    'roomCode' => $roomCode,
                    'rank' => $rank,
                    'stageReached' => $stageReached,
                    'eloDelta' => $delta,
                    'finishedAt' => date('c')
                ]);
                writeJsonFallback('matches.json', array_slice($matches, 0, 100));

                $safe = $u;
                unset($safe['password']);
                echo json_encode(['ok' => true, 'user' => $safe], JSON_UNESCAPED_UNICODE);
                exit;
            }
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
    for ($i = 0; $i < 6; $i++) $code .= $chars[random_int(0, strlen($chars) - 1)];

    $authUser = getAuthenticatedUser($pdo);
    $user = $body['user'] ?? [];
    $hostId = $authUser['id'] ?? ($user['id'] ?? ('guest_' . time() . '_' . random_int(100, 999)));
    $hostName = $authUser['displayName'] ?? ($user['displayName'] ?? ($user['username'] ?? 'Kỳ Thủ'));
    $roomName = trim($body['roomName'] ?? "Phòng của $hostName");
    $mode = $body['mode'] ?? 'tft_8p';
    $is1v1 = ($mode === 'tft_1v1' || $mode === 'skirmish_1v1');
    $maxPlayers = $is1v1 ? 2 : 8;
    $fillBots = $is1v1 ? 0 : (!isset($body['fillBots']) || $body['fillBots'] ? 1 : 0);
    $timeMode = $body['timeMode'] ?? 'standard';
    $isSpectator = !empty($body['isSpectator']);

    $players = $isSpectator ? [] : [[
        'id' => $hostId,
        'username' => $authUser['username'] ?? ($user['username'] ?? 'guest'),
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
            'mode' => $mode,
            'maxPlayers' => $maxPlayers,
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
    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE code = ? FOR UPDATE");
    $stmt->execute([$code]);
    $r = $stmt->fetch();
    if (!$r) {
        echo json_encode(['ok' => false, 'msg' => 'Không tìm thấy Mã Phòng này!']);
        exit;
    }
    $players = json_decode($r['players_json'], true) ?: [];
    $mode = $r['mode'] ?? 'tft_8p';
    $maxAllowed = ($mode === 'tft_1v1' || $mode === 'skirmish_1v1') ? 2 : 8;
    if (!$asSpectator && count($players) >= $maxAllowed) {
        echo json_encode(['ok' => false, 'msg' => "Phòng đã đủ $maxAllowed người chơi!"]);
        exit;
    }
    $authUser = getAuthenticatedUser($pdo);
    $uid = $authUser['id'] ?? ($user['id'] ?? ('guest_' . time() . '_' . random_int(100, 999)));
    $exists = false;
    foreach ($players as &$p) {
        if ($p['id'] === $uid) { $exists = true; break; }
    }
    if (!$exists && !$asSpectator) {
        $players[] = [
            'id' => $uid,
            'username' => $authUser['username'] ?? ($user['username'] ?? 'guest'),
            'displayName' => $authUser['displayName'] ?? ($user['displayName'] ?? 'Kỳ Thủ'),
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
            'mode' => $mode,
            'maxPlayers' => $maxAllowed,
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

if ($action === 'room_start' && $pdo) {
    $code = strtoupper(trim($body['code'] ?? ''));
    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE code = ?");
    $stmt->execute([$code]);
    $r = $stmt->fetch();
    if (!$r) {
        echo json_encode(['ok' => false, 'msg' => 'Không tìm thấy phòng!']);
        exit;
    }

    $authUser = getAuthenticatedUser($pdo);
    $callerId = $authUser['id'] ?? ($body['user']['id'] ?? '');
    if ($callerId !== $r['hostId']) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'msg' => 'Chỉ có Chủ phòng mới có quyền bắt đầu trận đấu!']);
        exit;
    }

    $fillBots = !isset($body['fillBots']) || $body['fillBots'] ? 1 : 0;
    $timeMode = $body['timeMode'] ?? 'standard';
    $upd = $pdo->prepare("UPDATE rooms SET status = 'playing', fillBots = ?, timeMode = ? WHERE code = ?");
    $upd->execute([$fillBots, $timeMode, $code]);

    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE code = ?");
    $stmt->execute([$code]);
    $updatedRoom = $stmt->fetch();
    echo json_encode([
        'ok' => true,
        'room' => [
            'code' => $updatedRoom['code'],
            'name' => $updatedRoom['name'],
            'hostId' => $updatedRoom['hostId'],
            'hostName' => $updatedRoom['hostName'],
            'fillBots' => ((int)$updatedRoom['fillBots']) === 1,
            'timeMode' => $updatedRoom['timeMode'],
            'status' => 'playing',
            'players' => json_decode($updatedRoom['players_json'], true) ?: []
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'room_add_bot' && $pdo) {
    $code = strtoupper(trim($body['code'] ?? ''));
    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE code = ?");
    $stmt->execute([$code]);
    $r = $stmt->fetch();
    if (!$r) {
        echo json_encode(['ok' => false, 'msg' => 'Không tìm thấy phòng!']);
        exit;
    }
    $players = json_decode($r['players_json'], true) ?: [];
    $mode = $r['mode'] ?? 'tft_8p';
    $maxAllowed = ($mode === 'tft_1v1' || $mode === 'skirmish_1v1') ? 2 : 8;
    if (count($players) >= $maxAllowed) {
        echo json_encode(['ok' => false, 'msg' => "Phòng đã đủ $maxAllowed người!"]);
        exit;
    }
    $botNames = [
        ['name' => 'Đại Kiện Tướng Magnus AI', 'avatar' => '🤖', 'elo' => 1800, 'style' => 'Tấn Công Tổng Lực'],
        ['name' => 'Bá Tước Bóng Đêm AI', 'avatar' => '🦇', 'elo' => 1750, 'style' => 'Sát Thủ Cờ Chớp'],
        ['name' => 'Phù Thủy Băng Giá AI', 'avatar' => '🧙‍♀️', 'elo' => 1650, 'style' => 'Phép Thuật Khống Chế'],
        ['name' => 'Hiệp Sĩ Hoàng Gia AI', 'avatar' => '🛡️', 'elo' => 1600, 'style' => 'Hộ Vệ Bất Tử'],
        ['name' => 'Kỳ Thủ Martin AI', 'avatar' => '♟️', 'elo' => 1200, 'style' => 'Cân Bằng Cơ Bản']
    ];
    $botIdx = count(array_filter($players, function($p) { return !empty($p['isBot']); }));
    $chosen = $botNames[$botIdx % count($botNames)];
    $bot = [
        'id' => 'bot_' . time() . '_' . $botIdx,
        'username' => 'bot_' . $botIdx,
        'displayName' => $chosen['name'],
        'avatar' => $chosen['avatar'],
        'elo' => $chosen['elo'],
        'style' => $chosen['style'],
        'isHost' => false,
        'isBot' => true,
        'hp' => 100,
        'level' => 3,
        'board' => []
    ];
    $players[] = $bot;
    $upd = $pdo->prepare("UPDATE rooms SET players_json = ? WHERE code = ?");
    $upd->execute([json_encode($players, JSON_UNESCAPED_UNICODE), $code]);
    echo json_encode(['ok' => true, 'bot' => $bot, 'players' => $players], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'room_remove_bot' && $pdo) {
    $code = strtoupper(trim($body['code'] ?? ''));
    $botId = $body['botId'] ?? '';
    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE code = ?");
    $stmt->execute([$code]);
    $r = $stmt->fetch();
    if (!$r) {
        echo json_encode(['ok' => false, 'msg' => 'Không tìm thấy phòng!']);
        exit;
    }
    $players = json_decode($r['players_json'], true) ?: [];
    $filtered = [];
    foreach ($players as $p) {
        if ($p['id'] !== $botId) {
            $filtered[] = $p;
        }
    }
    $upd = $pdo->prepare("UPDATE rooms SET players_json = ? WHERE code = ?");
    $upd->execute([json_encode($filtered, JSON_UNESCAPED_UNICODE), $code]);
    echo json_encode(['ok' => true, 'players' => $filtered], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'room_fill_all_bots' && $pdo) {
    $code = strtoupper(trim($body['code'] ?? ''));
    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE code = ?");
    $stmt->execute([$code]);
    $r = $stmt->fetch();
    if (!$r) {
        echo json_encode(['ok' => false, 'msg' => 'Không tìm thấy phòng!']);
        exit;
    }
    $players = json_decode($r['players_json'], true) ?: [];
    $mode = $r['mode'] ?? 'tft_8p';
    $maxAllowed = ($mode === 'tft_1v1' || $mode === 'skirmish_1v1') ? 2 : 8;

    $botNames = [
        ['name' => 'Đại Kiện Tướng Magnus AI', 'avatar' => '🤖', 'elo' => 1800, 'style' => 'Tấn Công Tổng Lực'],
        ['name' => 'Bá Tước Bóng Đêm AI', 'avatar' => '🦇', 'elo' => 1750, 'style' => 'Sát Thủ Cờ Chớp'],
        ['name' => 'Phù Thủy Băng Giá AI', 'avatar' => '🧙‍♀️', 'elo' => 1650, 'style' => 'Phép Thuật Khống Chế'],
        ['name' => 'Hiệp Sĩ Hoàng Gia AI', 'avatar' => '🛡️', 'elo' => 1600, 'style' => 'Hộ Vệ Bất Tử'],
        ['name' => 'Xạ Thủ Tinh Anh AI', 'avatar' => '🏹', 'elo' => 1550, 'style' => 'Tầm Xa Xuyên Giáp'],
        ['name' => 'Đạo Tặc Thần Bài AI', 'avatar' => '🎰', 'elo' => 1500, 'style' => 'Nổ Hũ Kinh Tế'],
        ['name' => 'Kỳ Thủ Martin AI', 'avatar' => '♟️', 'elo' => 1200, 'style' => 'Cân Bằng Cơ Bản']
    ];

    $botIdx = count(array_filter($players, function($p) { return !empty($p['isBot']); }));
    while (count($players) < $maxAllowed) {
        $chosen = $botNames[$botIdx % count($botNames)];
        $players[] = [
            'id' => 'bot_' . time() . '_' . $botIdx,
            'username' => 'bot_' . $botIdx,
            'displayName' => $chosen['name'],
            'avatar' => $chosen['avatar'],
            'elo' => $chosen['elo'],
            'style' => $chosen['style'],
            'isHost' => false,
            'isBot' => true,
            'hp' => 100,
            'level' => 3,
            'board' => []
        ];
        $botIdx++;
    }

    $upd = $pdo->prepare("UPDATE rooms SET players_json = ? WHERE code = ?");
    $upd->execute([json_encode($players, JSON_UNESCAPED_UNICODE), $code]);
    echo json_encode(['ok' => true, 'players' => $players], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'room_clear_all_bots' && $pdo) {
    $code = strtoupper(trim($body['code'] ?? ''));
    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE code = ?");
    $stmt->execute([$code]);
    $r = $stmt->fetch();
    if (!$r) {
        echo json_encode(['ok' => false, 'msg' => 'Không tìm thấy phòng!']);
        exit;
    }
    $players = json_decode($r['players_json'], true) ?: [];
    $filtered = array_values(array_filter($players, function($p) { return empty($p['isBot']); }));
    $upd = $pdo->prepare("UPDATE rooms SET players_json = ? WHERE code = ?");
    $upd->execute([json_encode($filtered, JSON_UNESCAPED_UNICODE), $code]);
    echo json_encode(['ok' => true, 'players' => $filtered], JSON_UNESCAPED_UNICODE);
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

echo json_encode(['ok' => false, 'msg' => 'Unknown API action']);

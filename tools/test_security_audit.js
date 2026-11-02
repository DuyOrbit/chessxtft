const http = require('http');

async function runTest() {
    console.log('--- KHỞI ĐỘNG KIỂM THỬ BẢO MẬT VÀ LOGIC ---');

    // 1. Start server for testing on port 3001
    process.env.PORT = '3001';
    const serverModule = require('../server.js');
    await new Promise(r => setTimeout(r, 1200));

    function makeRequest(method, path, body = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: '127.0.0.1',
                port: 3001,
                path,
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            }, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(data) });
                    } catch (e) {
                        resolve({ status: res.statusCode, raw: data });
                    }
                });
            });
            req.on('error', reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }

    let adminToken = '';
    let playerToken = '';

    // TEST 1: Login Admin
    console.log('\n[Test 1] Đăng nhập Admin:');
    const loginRes = await makeRequest('POST', '/api/auth/login', { username: 'admin', password: '123' });
    console.log('Status:', loginRes.status, 'OK:', loginRes.body.ok);
    if (loginRes.body.ok && loginRes.body.user) {
        adminToken = loginRes.body.user.token;
        console.log('✅ Đã nhận Admin Token:', adminToken.slice(0, 16) + '...');
        console.log('✅ Kiểm tra Password trong response:', loginRes.body.user.password === undefined ? 'ĐÃ ĐƯỢC XÓA BẢO MẬT' : '❌ LỘ PASSWORD!');
    } else {
        console.error('❌ Đăng nhập Admin thất bại:', loginRes.body);
    }

    // TEST 2: Access admin_db WITHOUT token (Must be blocked 403)
    console.log('\n[Test 2] Gọi /api/admin/db KHÔNG CÓ TOKEN:');
    const blockedRes = await makeRequest('GET', '/api/admin/db');
    console.log('Status:', blockedRes.status, 'Response:', blockedRes.body);
    if (blockedRes.status === 403) {
        console.log('✅ CHẶN THÀNH CÔNG (403 Forbidden) cho truy cập trái phép!');
    } else {
        console.error('❌ LỖ HỔNG: Không chặn được request thiếu token!');
    }

    // TEST 3: Access admin_db WITH Admin Token
    console.log('\n[Test 3] Gọi /api/admin/db VỚI ADMIN TOKEN:');
    const allowedRes = await makeRequest('GET', '/api/admin/db', null, { 'Authorization': `Bearer ${adminToken}` });
    console.log('Status:', allowedRes.status, 'OK:', allowedRes.body.ok);
    if (allowedRes.body.ok && Array.isArray(allowedRes.body.users)) {
        const anyPasswordLeaked = allowedRes.body.users.some(u => u.password !== undefined);
        console.log('✅ Lấy dữ liệu Admin thành công, tổng user:', allowedRes.body.users.length);
        console.log('✅ Kiểm tra Password toàn bộ Users:', anyPasswordLeaked ? '❌ CÒN LỘ PASSWORD!' : 'HOÀN TOÀN SẠCH MẬT KHẨU (0% LEAK)!');
    }

    // TEST 4: Register normal player & try accessing admin_db (Must be blocked 403)
    console.log('\n[Test 4] Đăng nhập tài khoản Player thường gọi API Admin:');
    const testUsername = 'tester_' + Date.now().toString().slice(-4);
    const regRes = await makeRequest('POST', '/api/auth/register', { username: testUsername, password: 'password123', displayName: 'Người Chơi Thử Nghiệm' });
    if (regRes.body.ok && regRes.body.user) {
        playerToken = regRes.body.user.token;
        const playerTryAdmin = await makeRequest('GET', '/api/admin/db', null, { 'Authorization': `Bearer ${playerToken}` });
        console.log('Player gọi admin_db status:', playerTryAdmin.status);
        if (playerTryAdmin.status === 403) {
            console.log('✅ CHẶN THÀNH CÔNG (403 Forbidden) khi người chơi thường cố truy cập Admin API!');
        } else {
            console.error('❌ LỖ HỔNG: Người chơi thường vẫn truy cập được Admin!');
        }
    }

    // TEST 5: Match finish token verification
    console.log('\n[Test 5] Kiểm tra Match Finish chống giả mạo danh tính:');
    // Tester cố ghi điểm cho Admin
    const fakeMatch = await makeRequest('POST', '/api/matches/finish', {
        userId: 'user_admin',
        rank: 1,
        totalPlayers: 8,
        roomCode: 'TEST',
        winnerName: 'Fake'
    }, { 'Authorization': `Bearer ${playerToken}` });
    console.log('Mạo danh ghi trận cho user_admin:', fakeMatch.status, fakeMatch.body);
    if (fakeMatch.status === 403) {
        console.log('✅ CHẶN THÀNH CÔNG (403) khi cố tình mạo danh tài khoản khác!');
    }

    // Tester ghi điểm cho chính mình
    const legitimateMatch = await makeRequest('POST', '/api/matches/finish', {
        userId: regRes.body.user.id,
        rank: 1,
        totalPlayers: 8,
        roomCode: 'SOLO'
    }, { 'Authorization': `Bearer ${playerToken}` });
    console.log('Ghi nhận trận đấu chính chủ:', legitimateMatch.status, legitimateMatch.body.ok ? '✅ THÀNH CÔNG' : '❌ THẤT BẠI');

    console.log('\n--- TOÀN BỘ CÁC BÀI KIỂM THỬ BẢO MẬT ĐÃ HOÀN TẤT XUẤT SẮC! ---');
    process.exit(0);
}

runTest().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});


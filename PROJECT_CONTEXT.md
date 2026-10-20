# ♟️ CHESS TFT ONLINE - TÀI LIỆU TOÀN CẢNH DỰ ÁN CHO AI & LẬP TRÌNH VIÊN (PROJECT CONTEXT)

> **Mục đích tài liệu:** Lưu trữ toàn bộ tri thức, kiến trúc, quy tắc game, tiến độ phát triển và lịch sử trao đổi của dự án Chess TFT. Bất kỳ AI Assistant (Antigravity, Cursor, Windsurf, Copilot, Claude...) khi mở tài liệu này đều nắm bắt 100% dự án như thể đã lập trình từ đầu.

---

## 📌 1. Tổng Quan Dự Án & Ý Tưởng Cốt Lõi
- **Tên dự án:** Chess TFT Online (Đấu Trường Cờ Vua Đấu Sĩ).
- **Thể loại:** Tactical Auto-Battler kết hợp luật Cờ Vua chuẩn (Chess Pieces & Moves) và cơ chế Đấu Trường Chân Lý (TFT Economy, Bench, Synergies, Items, Augments, Stars, Stage Progression).
- **Phong cách giao diện:** **Royal Grandmaster Arena** (Obsidian Dark Slate `#04060c` / `#090d18`, Viền vàng kim 24K `#f59e0b`, ánh sáng Arcane Mana `#38bdf8` và Ngọc Lục Bảo `#22c55e`).
- **Tương thích:** Tối ưu hóa 100% cho màn hình Laptop chuẩn **1366x768** và Desktop **1920x1080** không cần thu nhỏ/zoom hay cuộn chuột.

---

## 🛠️ 2. Kiến Trúc Kỹ Thuật (Tech Stack)
Dự án được thiết kế chạy **Dual-Stack (Đồng thời cả Node.js và PHP/MySQL/WampServer)**:
1. **Frontend:**
   - Single Page Application (SPA) viết bằng Pure Vanilla JavaScript (ES6+), HTML5 Canvas, Web Audio API (nhạc nền giao hưởng & sound effects tổng hợp).
   - CSS3 hiện đại (Grid, Flexbox, Glassmorphism, animations nhẹ mượt).
   - Tích hợp SPA History (`history.pushState` & `popstate`) chống văng khỏi web khi người chơi bấm nút Back của trình duyệt.
2. **Backend Lựa Chọn 1: Node.js (Real-time Multiplayer & Server Tự Độc Lập)**
   - `server.js`: Express + Socket.IO + JSON Database fallback (`db/`).
   - Hỗ trợ phòng chơi bạn bè, tự động ghép 7 Bot AI sau 4 giây, đồng bộ trạng thái vòng đấu (Round Sync), đồng bộ ván đấu 1v1 blitz và theo dõi 4 bàn cờ cùng lúc (8-Bot Spectator Mode).
   - Cổng mặc định: `http://localhost:3000`.
3. **Backend Lựa Chọn 2: WampServer (Apache + PHP + MySQL)**
   - `api.php`: API RESTful kết nối cơ sở dữ liệu MySQL `chesstft` (`database.sql`).
   - Đường dẫn cục bộ: `http://localhost/chesstft/` (nằm tại `F:\wamp\www\chesstft\`).
4. **Tài khoản quản trị mặc định (Admin)**:
   - Username: `admin` | Mật khẩu: `123` (Role: ADMIN, được cấp quyền mở Quản trị Database và Chế độ GM Spectator 4 bàn).

---

## 📂 3. Cấu Trúc File & Thư Mục Quan Trọng
```text
f:\chesstft\
├── index.html              # Toàn bộ cấu trúc giao diện 3 màn hình (Auth, Lobby, Game) và Modals
├── styles.css              # Thiết kế Royal Grandmaster Arena & Responsive 1366x768
├── server.js               # Node.js backend server (Socket.io + API bridge)
├── api.php                 # PHP backend cho WampServer
├── database.sql            # Schema MySQL
├── js/
│   ├── main.js             # Controller chính: Quản lý đăng nhập, lobby, socket, tutorial, điều hướng
│   ├── tft-manager.js      # Engine TFT: Shop, roll, XP, máu, vàng, armory, chuỗi thắng/thua, nổ hũ Đạo Tặc
│   ├── sfx-manager.js      # Bộ phát nhạc nền giao hưởng & hiệu ứng âm thanh Web Audio API
│   ├── pieces-data.js      # Từ điển 15 quân cờ, 8 tộc hệ, trang bị, bản đồ
│   └── bot-engine.js       # AI Bot chơi cờ (Magnus, Kasparov...)
├── qa_screenshots/         # Ảnh chụp Playwright kiểm thử thực tế
└── PROJECT_CONTEXT.md      # Tài liệu này
```

---

## ⚔️ 4. Quy Tắc & Cơ Chế Gameplay Đã Hoàn Thiện
1. **Bàn cờ Mini 5x6**:
   - Vua (King) là linh hồn, bị bắt là thua ngay (hoặc trừ lượng máu lớn).
   - Quân cờ giữ nguyên cách đi/ăn của Cờ Vua cổ điển (Mã nhảy chữ L, Tượng đi chéo, Xe đi thẳng, Hậu đa năng, Tốt tiến 1 ăn chéo).
2. **Hệ Thống TFT**:
   - 15 quân cờ phân cấp 1⭐, 2⭐ (ghép 3 quân 1⭐), 3⭐ (ghép 3 quân 2⭐).
   - 8 Tộc / Hệ: Quý Tộc, Hiệp Sĩ, Sát Thủ, Pháp Sư, Đạo Tặc (Cơ chế nổ hũ chuỗi thua), Cung Thủ, Băng Tộc, Thánh Thần.
   - Kho Tiếp Tế Chiến Trường (Stage Armory): Khi chuyển vòng (VD: từ 1. qua 2.), người chơi được chọn 1 trong 3 phần thưởng trang bị/vàng/tướng.
   - Đồng bộ vòng đấu (Multiplayer Sync): Tất cả người chơi trong phòng phải hoàn tất giao tranh vòng hiện tại thì mới cùng qua vòng tiếp theo.
3. **Huấn Luyện Viên Martin (Interactive Tutorial)**:
   - Chế độ hướng dẫn tương tác 4 bước giúp người chơi mới làm quen với việc mua tướng, dàn trận và kích hoạt tộc hệ.

---

## 🚀 5. Roadmap Nâng Cao Trải Nghiệm Người Dùng (UX) Đang Chờ Triển Khai
1. **Phím Tắt Nhanh Chuẩn TFT (Keyboard Shortcuts)**:
   - Phím `D`: Đổi lại cửa hàng (Reroll).
   - Phím `F`: Mua 4 XP.
   - Phím `E`: Bán nhanh quân cờ đang trỏ chuột vào.
   - Phím `W`: Đưa tướng từ Hàng Chờ lên sàn / thu hồi về.
2. **Khóa Cửa Hàng (Lock Shop 🔒)**: Giữ nguyên thẻ cờ cho hiệp sau khi đang thiếu tiền.
3. **Hiệu Ứng Số Sát Thương Bay (Floating Damage Numbers & Hit Flash)**: Chém nảy số `-25`, `-50 💥` và nháy đỏ viền tướng.
4. **Kéo Thả Trực Quan (Drag & Drop)**: Hỗ trợ song song cả kéo-thả lẫn click-to-move.
5. **Âm Thanh Riêng Cho Từng Quân Cờ (Piece SFX)**: Tiếng vó ngựa, tiếng tên bắn, tiếng sét ma thuật.
6. **Combat DPS Meter**: Biểu đồ thống kê sát thương chi tiết sau mỗi hiệp.

---

## 🔗 6. Thông Tin Git & Đồng Bộ
- **Repository:** `https://github.com/DuyOrbit/chessxtft.git` (Nhánh: `main`).
- **Thư mục đồng bộ WampServer:** `F:\wamp\www\chesstft\`.
- Khi sửa code, luôn nhớ đồng bộ sang thư mục WampServer và push lên GitHub.

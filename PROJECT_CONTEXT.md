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
1. **Bàn cờ Mini 5x6 & Luật Thắng Bại Mới**:
   - Vua (King) là linh hồn, bị bắt là thua ngay (hoặc trừ lượng máu lớn).
   - **Cơ chế Hết Cờ Đặt Trên Sân (Trừ Vua)**: 1 trong 2 bên bị tiêu diệt sạch toàn bộ quân cờ trợ chiến trước (chỉ còn lại duy nhất Vua) sẽ **THUA NGAY LẬP TỨC**. Máu bị trừ tính theo **Luật Hòa Hơn Cờ**: `Sát thương = (3 + Stage) + Chênh lệch quân số còn lại của bên thắng`.
   - **Luật Hòa Hơn Cờ**: Khi hết số lượt tối đa hoặc hết giờ hòa cờ, hệ thống so sánh quân số hai bên — bên nào còn nhiều quân hơn sẽ giành chiến thắng theo thế "Hòa hơn cờ" (bên kém cờ bị trừ máu theo độ chênh lệch quân số).
   - Quân cờ giữ nguyên cách đi/ăn của Cờ Vua cổ điển (Mã nhảy chữ L, Tượng đi chéo, Xe đi thẳng, Hậu đa năng, Tốt tiến 1 ăn chéo).
2. **Hệ Thống TFT**:
   - 15 quân cờ phân cấp 1⭐, 2⭐ (ghép 3 quân 1⭐), 3⭐ (ghép 3 quân 2⭐).
   - 8 Tộc / Hệ: Quý Tộc, Hiệp Sĩ, Sát Thủ, Pháp Sư, Đạo Tặc (Cơ chế nổ hũ chuỗi thua), Cung Thủ, Băng Tộc, Thánh Thần.
   - Kho Tiếp Tế Chiến Trường (Stage Armory): Khi chuyển vòng (VD: từ 1. qua 2.), người chơi được chọn 1 trong 3 phần thưởng trang bị/vàng/tướng.
   - Đồng bộ vòng đấu (Multiplayer Sync): Tất cả người chơi trong phòng phải hoàn tất giao tranh vòng hiện tại thì mới cùng qua vòng tiếp theo.
3. **Huấn Luyện Viên Martin (Interactive Tutorial)**:
   - Chế độ hướng dẫn tương tác 4 bước giúp người chơi mới làm quen với việc mua tướng, dàn trận và kích hoạt tộc hệ.
4. **Phím Tắt Nhanh Chuẩn TFT (Keyboard Shortcuts D/F/E/W/X)**:
   - Phím `D`: Đổi lại 5 thẻ bài trong Cửa Hàng (Reroll, tốn 2 Vàng hoặc dùng Free Reroll từ Chuỗi Thua).
   - Phím `F`: Mua 4 điểm kinh nghiệm (XP) để thăng cấp sàn đấu (tốn 4 Vàng).
   - Phím `E`: Bán nhanh quân cờ đang trỏ chuột vào (hoặc quân đang chọn) và hoàn trả Vàng chuẩn theo số sao.
   - Phím `W`: Đưa nhanh tướng từ Hàng Chờ lên sàn đấu (ưu tiên ô trống tại sân nhà) / Thu hồi tướng từ sân về Hàng Chờ.
   - Phím `X` hoặc click nút Khóa: Bật/Tắt Khóa Cửa Hàng (Lock Shop 🔒).
   - Dải phím tắt trực quan & Badges ký hiệu phím hiển thị đồng bộ trên thanh Shop HUD.
5. **Khóa Cửa Hàng (Lock Shop 🔒)**:
   - Nút Khóa Shop trên thanh kinh tế HUD hiển thị trạng thái phát sáng viền hổ phách hoàng gia (Amber Gold Pulse).
   - Dải nhãn cảnh báo `🔒 SHOP ĐÃ KHÓA (GIỮ CHO VÒNG SAU)` hiển thị trên khung thẻ bài.
   - Khi chuyển hiệp mới (`nextRound`), engine TFT tự động giữ nguyên 5 thẻ bài và thông báo Toast mở khóa cho kỳ thủ.
6. **Chế Độ Khán Giả / Trọng Tài Trực Tiếp 8 Người (Multiplayer Spectator / Caster Mode 🎙️)**:
   - Khi tạo phòng bạn bè, chủ phòng có tùy chọn checkbox: `👁️ Tạo phòng với tư cách Khán Giả / Trọng Tài (Caster Mode: Xem 4 bàn cờ 8 người cùng lúc)`.
   - Chủ phòng không chiếm 1 trong 8 ghế thi đấu, dành toàn bộ 8 ghế cho người chơi thật (hoặc bot tự lấp nếu thiếu).
   - Người chơi khác tại danh sách phòng có nút `👁️ Xem Trực Tiếp` để tham gia phòng với tư cách khán giả không giới hạn số lượng.
   - Khi trận đấu bắt đầu, khán giả/caster được chuyển sang giao diện `#screen-spectator` chia 4 màn hình 2x2 siêu mượt, theo dõi trực tiếp 4 cặp đấu cùng lúc:
     - Bảng Xếp Hạng 8 Kỳ Thủ bên trái có nhãn `👤 NGƯỜI THẬT` kèm chỉ số ELO phát sáng nổi bật so với Bot AI.
     - Đồng hồ Cờ Chớp đếm ngược trực tiếp cho từng người chơi trên cả 4 bàn theo đúng cấu hình thời gian phòng (Tiêu chuẩn / Thư thả / Siêu chớp).
     - Nút điều chỉnh tốc độ trận đấu (0.5x, 1x, 2x, 4x), Tạm Dừng, Phóng to 1 bàn bất kỳ (Zoom-in), Sang vòng tiếp.
     - Nhật ký chiến đấu ghi lại chi tiết diễn biến thắng/thua/hết giờ/chiếu hết của cả 4 bàn cờ.
     - Nút `🏠 Về Sảnh` tự động rời phòng sạch sẽ và hoàn trả giao diện chuẩn.

7. **Chế Độ Phòng Tập & Thử Nghiệm Sức Mạnh Tướng (Sandbox / God Mode Arena 🎯)**:
   - Thêm nút và thẻ **Phòng Tập** tại Sảnh Chờ Lobby (thẻ thứ 4 trong bộ Feature Cards và dải phím nhanh).
   - Bảng Điều Khiển Thần Thánh (**God Mode Toolkit**) hỗ trợ:
     - **Triệu Hồi Tướng & Sao Tùy Ý**: Mọi quân cờ từ 0-5 vàng có thể nhận ngay 1⭐, 2⭐ hoặc 3⭐ thẳng vào Hàng Chờ / Sàn Đấu.
     - **Kho Trang Bị & Lõi Công Nghệ**: Bấm là nhận ngay bất kỳ trang bị nào vào kho hoặc kích hoạt trực tiếp Lõi (Augment).
     - **Tùy Chỉnh Đội Hình Địch**: Sinh sẵn Hình Nhân Tập Đánh (**Target Dummy** 50 HP bia đỡ đạn tĩnh), Đội hình Full Thiết Giáp trâu bò, 6 Sát Thủ hoặc Boss Đại Thừa Tướng 3⭐.
     - **Chế Độ Bia Tập Đánh**: Tùy chọn Bật/Tắt AI đánh trả (cho Địch đứng yên làm bia thử nghiệm skill/nước đi).
     - **Cheat Thần Thánh**: +999 Vàng, Max Cấp 8, Hồi Đầy 100 HP (Khóa HP bất tử khi test), Thăng cấp 3⭐ quân đang chọn, Reset sàn đấu khôi phục trạng thái chuẩn bị.
     - **Thời gian chuẩn bị vô hạn (`♾️ VÔ HẠN`)**: Không lo hết giờ đếm ngược khi đang dàn trận thử nghiệm.
8. **Biểu Đồ Sát Thương Thời Gian Thực (Combat DPS Meter 📊)**:
   - Theo dõi tổng lượng sát thương và biểu đồ % sát thương của từng quân cờ (cả phe ta và phe địch) trong giao tranh.
   - Nút bật/tắt `📊 DPS` ngay trên thanh Top Header.
9. **Tối Ưu Bố Cục Không Gian 1366x768 & Trải Nghiệm Chuẩn Bị (Prep Phase UX) ⏳**:
   - **Tăng Thời Gian Chuẩn Bị (+10s)**: Nâng thời gian chuẩn bị từ 30s lên 40s (mặc định badge hiển thị `⏳ 40s`), giúp người chơi có đủ thời gian mua sắm, roll thẻ bài, quan sát đối thủ và sắp xếp chiến thuật.
   - **Thêm Nhạc Nền Giai Đoạn Chuẩn Bị (Soundtrack Expansion)**: Tích hợp thêm bản nhạc giao hưởng chuẩn bị chiến thuật mới `assets/audio/expedition33_prep.webm` ("Camp Preparation - Tactical Briefing"), tự động luân phiên giữa các vòng/stage cùng bản nhạc truyền thống giúp trải nghiệm âm thanh phong phú và thư giãn hơn.
   - **Rê Chuột Xem Trước Nước Đi & Ô Tấn Công Tức Thì Cả Chuẩn Bị & Trong Trận (Instant Hover Movement & Attack Range)**:
     - **Giai đoạn chuẩn bị:** Khi rê chuột vào bất kỳ quân cờ nào trên sàn đấu hoặc hàng chờ (Bench), bàn cờ lập tức kích hoạt visual indicator hiển thị vùng di chuyển và tầm đánh.
     - **Trong trận giao tranh (Combat Phase):** Khi rê chuột lên bất kỳ quân cờ nào (cả quân phe ta lẫn quân phe địch), hệ thống gọi trực tiếp engine `this.chess.getPieceActions(r, c, true)` để hiển thị chính xác mọi ô quân đó có thể di chuyển (vòng tròn xanh ngọc `.cell-preview-move`) hoặc tầm tấn công/bắn xa/ăn quân (tâm ngắm hổ phách `.cell-preview-attack`), giúp kỳ thủ nắm bắt nước đi và tầm đe dọa của đối thủ ngay trong lúc chiến đấu mà không làm mất trạng thái chọn quân.
   - **Tối Ưu Hóa Không Gian Sàn Đấu & Cột Phải**: 
     - Mở rộng kích thước bàn cờ trung tâm tại màn hình 1366x768 (`width: min(520px, 54vh)`, `height: min(440px, 45vh)`), khắc phục khoảng trống thừa bên phải bàn cờ.
     - Tự động ẩn cụm đồng hồ Cờ Chớp (`custom-clocks-box`) trong giai đoạn chuẩn bị để dồn không gian cho Bảng Xếp Hạng, Hộp Soi Quân và Biểu đồ DPS, chỉ hiển thị đồng hồ khi bắt đầu vào trận giao tranh.

---

## 🚀 5. Roadmap Nâng Cao Trải Nghiệm Người Dùng (UX) Đang Chờ Triển Khai
1. **Kéo Thả Trực Quan (Drag & Drop)**: Hỗ trợ song song cả kéo-thả lẫn click-to-move.
2. **Âm Thanh Riêng Cho Từng Quân Cờ (Piece SFX)**: Tiếng vó ngựa, tiếng tên bắn, tiếng sét ma thuật.

---

## 🔗 6. Thông Tin Git & Đồng Bộ
- **Repository:** `https://github.com/DuyOrbit/chessxtft.git` (Nhánh: `main`).
- **Thư mục đồng bộ WampServer:** `F:\wamp\www\chesstft\`.
- Khi sửa code, luôn nhớ đồng bộ sang thư mục WampServer và push lên GitHub.

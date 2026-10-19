-- ============================================================================
-- CHESS TFT ONLINE — FILE CƠ SỞ DỮ LIỆU MYSQL DÀNH CHO WAMPSERVER (phpMyAdmin)
-- Hướng dẫn: Mở http://localhost/phpmyadmin -> Chọn tab "Import" (Nhập) -> Chọn file database.sql -> Bấm Go (Thực hiện)
-- (Lưu ý: File api.php cũng sẽ tự động khởi tạo Database này nếu bạn chưa kịp Import tay!)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `chesstft_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `chesstft_db`;

-- ============================================================================
-- 1. BẢNG `users`: QUẢN LÝ TÀI KHOẢN & CAN THIỆP CHỈ SỐ KHỞI ĐẦU TRONG TRẬN
-- Bạn có thể nhấp đúp vào từng ô trong phpMyAdmin để chỉnh Vàng, Máu, Cấp độ, Giây đồng hồ cho từng người chơi!
-- ============================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `username` VARCHAR(64) NOT NULL UNIQUE COMMENT 'Tên đăng nhập',
  `password` VARCHAR(128) NOT NULL COMMENT 'Mật khẩu',
  `displayName` VARCHAR(100) NOT NULL COMMENT 'Tên hiển thị trong game',
  `role` ENUM('player', 'admin') NOT NULL DEFAULT 'player' COMMENT 'Quyền: admin được mở bảng Quản Trị DB',
  `avatar` VARCHAR(16) NOT NULL DEFAULT '♟️' COMMENT 'Biểu tượng đại diện',
  `elo` INT NOT NULL DEFAULT 1000 COMMENT 'Điểm xếp hạng ELO',
  `gamesPlayed` INT NOT NULL DEFAULT 0 COMMENT 'Tổng số trận đã đấu',
  `top1Count` INT NOT NULL DEFAULT 0 COMMENT 'Số lần đạt Top 1',
  `top4Count` INT NOT NULL DEFAULT 0 COMMENT 'Số lần vào Top 4',
  `startingHp` INT NOT NULL DEFAULT 100 COMMENT 'Can thiệp: Máu Linh Hồn đầu trận (Mặc định 100)',
  `startingGold` INT NOT NULL DEFAULT 6 COMMENT 'Can thiệp: Vàng đầu trận (Mặc định 6)',
  `startingLevel` INT NOT NULL DEFAULT 3 COMMENT 'Can thiệp: Cấp độ đầu trận (3 -> 8)',
  `extraClockSeconds` INT NOT NULL DEFAULT 0 COMMENT 'Can thiệp: Cộng/trừ thêm giây đồng hồ Cờ Chớp mỗi hiệp',
  `bonusItems` VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'Can thiệp: ID trang bị tặng sẵn đầu trận (cách nhau dấu phẩy, VD: stun_hammer,burn_cloak)',
  `isBanned` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Khóa tài khoản, 0 = Hoạt động bình thường',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `username`, `password`, `displayName`, `role`, `avatar`, `elo`, `gamesPlayed`, `top1Count`, `top4Count`, `startingHp`, `startingGold`, `startingLevel`, `extraClockSeconds`, `bonusItems`, `isBanned`)
VALUES
  ('u_admin', 'admin', '123', 'GM Tối Cao (Admin)', 'admin', '👑', 1500, 12, 6, 10, 100, 6, 3, 0, '', 0),
  ('u_demo1', 'kithu1', '123', 'Kỳ Thủ Tiên Phong', 'player', '⚔️', 1050, 5, 1, 3, 100, 6, 3, 0, '', 0)
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- ============================================================================
-- 2. BẢNG `game_rules`: CAN THIỆP LUẬT CHƠI, THỜI GIAN CỜ CHỚP, KINH TẾ & TRỪ MÁU
-- Mỗi dòng là 1 thông số cấu hình có chú thích tiếng Việt rõ ràng để sửa trực tiếp trong phpMyAdmin
-- ============================================================================
CREATE TABLE IF NOT EXISTS `game_rules` (
  `rule_key` VARCHAR(64) NOT NULL PRIMARY KEY COMMENT 'Mã thông số',
  `rule_value` VARCHAR(64) NOT NULL COMMENT 'Giá trị cấu hình',
  `description` VARCHAR(255) NOT NULL COMMENT 'Giải thích ý nghĩa thông số'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `game_rules` (`rule_key`, `rule_value`, `description`) VALUES
  ('stage1_blitz_time', '45', 'Thời gian đồng hồ Cờ Chớp ở Stage 1 - Đầu game bàn 5x6 (Giây)'),
  ('stage2_blitz_time', '60', 'Thời gian đồng hồ Cờ Chớp ở Stage 2 - Giữa game bàn 6x7 (Giây)'),
  ('stage3_blitz_time', '75', 'Thời gian đồng hồ Cờ Chớp ở Stage 3+ - Cuối game bàn 8x8 (Giây)'),
  ('stage1_increment', '3', 'Số giây cộng thêm sau mỗi nước đi ở Stage 1 & 2'),
  ('stage3_increment', '4', 'Số giây cộng thêm sau mỗi nước đi ở Stage 3+'),
  ('stage1_max_turns', '36', 'Giới hạn số lượt tối đa mỗi hiệp ở Stage 1 trước khi xử Hòa'),
  ('stage2_max_turns', '48', 'Giới hạn số lượt tối đa mỗi hiệp ở Stage 2 trước khi xử Hòa'),
  ('stage3_max_turns', '64', 'Giới hạn số lượt tối đa mỗi hiệp ở Stage 3+ trước khi xử Hòa'),
  ('turn_one_grace', '1', 'Luật Lượt 1 Công Bằng: 1 = Bật (lượt đầu chỉ di chuyển dàn trận), 0 = Tắt'),
  ('ranged_reload_turns', '1', 'Số lượt nạp đạn sau khi quân Đánh Xa bắn tên/pháo'),
  ('stun_immune_turns', '1', 'Số lượt kháng choáng sau khi vừa tỉnh dậy (chống choáng vĩnh viễn)'),
  ('base_round_gold', '5', 'Lượng Vàng cơ bản phát thêm sau mỗi vòng đấu'),
  ('max_interest', '5', 'Lãi suất Vàng tối đa mỗi vòng (1 vàng mỗi 10 vàng tích trữ)'),
  ('reroll_cost', '2', 'Chi phí Vàng mỗi lần bấm Đổi Shop (Reroll)'),
  ('buy_xp_cost', '4', 'Chi phí Vàng mỗi lần bấm Mua EXP'),
  ('buy_xp_amount', '4', 'Lượng EXP nhận được mỗi lần bấm Mua EXP'),
  ('checkmate_base_dmg', '8', 'Sát thương gốc trừ Máu Linh Hồn khi thắng bằng CHIẾU HẾT (hoặc đối thủ hết giờ)'),
  ('checkmate_stage_mult', '2', 'Hệ số nhân theo Stage khi thắng bằng CHIẾU HẾT'),
  ('checkmate_per_unit_dmg', '2', 'Máu trừ thêm trên mỗi quân cờ còn sống của bên thắng khi CHIẾU HẾT'),
  ('king_capture_base_dmg', '3', 'Sát thương gốc trừ Máu Linh Hồn khi thắng bằng ĂN VUA (đối phương quên đỡ chiếu)'),
  ('king_capture_stage_mult', '1', 'Hệ số nhân theo Stage khi thắng bằng ĂN VUA'),
  ('king_capture_diff_mult', '1', 'Máu trừ thêm theo chênh lệch quân trên sân (Quân thắng - Quân thua) khi ĂN VUA'),
  ('draw_base_dmg', '4', 'Sát thương gốc cả 2 bên cùng chịu khi HÒA CỜ')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- ============================================================================
-- 3. BẢNG `pieces`: CAN THIỆP CHỈ SỐ 13 QUÂN CỜ (GIÁ TIỀN, LỚP MÁU 1★/2★/3★, TẦM BẮN, MÔ TẢ)
-- Bạn có thể sửa trực tiếp cột cost, hp_star1, hp_star2, hp_star3, range_star1..3 trong phpMyAdmin!
-- ============================================================================
CREATE TABLE IF NOT EXISTS `pieces` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY COMMENT 'Mã định danh quân cờ',
  `name` VARCHAR(100) NOT NULL COMMENT 'Tên hiển thị quân cờ',
  `icon` VARCHAR(16) NOT NULL COMMENT 'Biểu tượng trên bàn cờ',
  `cost` INT NOT NULL DEFAULT 1 COMMENT 'Giá mua trong Shop (0 = Vua, 1 -> 5 Vàng)',
  `isKing` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Quân Vua Bất Diệt',
  `synergies` VARCHAR(120) NOT NULL COMMENT 'Các Tộc/Hệ kích hoạt (cách nhau dấu phẩy)',
  `hp_star1` INT NOT NULL DEFAULT 1 COMMENT 'Số Lớp Máu ở 1 Sao (★) - Phải ăn bao nhiêu lần mới chết',
  `hp_star2` INT NOT NULL DEFAULT 2 COMMENT 'Số Lớp Máu ở 2 Sao (★★)',
  `hp_star3` INT NOT NULL DEFAULT 3 COMMENT 'Số Lớp Máu ở 3 Sao (★★★)',
  `range_star1` INT NOT NULL DEFAULT 1 COMMENT 'Tầm đánh/bắn xa ở 1 Sao (★)',
  `range_star2` INT NOT NULL DEFAULT 1 COMMENT 'Tầm đánh/bắn xa ở 2 Sao (★★)',
  `range_star3` INT NOT NULL DEFAULT 1 COMMENT 'Tầm đánh/bắn xa ở 3 Sao (★★★)',
  `attackType` VARCHAR(32) NOT NULL DEFAULT 'melee' COMMENT 'melee = Cận chiến lao vào, ranged = Bắn xa đứng nguyên vị trí',
  `moveType` VARCHAR(50) NOT NULL DEFAULT 'pawn' COMMENT 'Kiểu bước đi trên bàn cờ',
  `desc_text` TEXT NOT NULL COMMENT 'Mô tả bước đi và kỹ năng hiển thị trong Cẩm Nang & Tooltip'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `pieces` (`id`, `name`, `icon`, `cost`, `isKing`, `synergies`, `hp_star1`, `hp_star2`, `hp_star3`, `range_star1`, `range_star2`, `range_star3`, `attackType`, `moveType`, `desc_text`) VALUES
  ('king', 'Quốc Vương', '♔', 0, 1, 'royal', 1, 2, 3, 1, 1, 1, 'melee', 'king', 'Đi 1 ô mọi hướng. Mất Vua hoặc bị Chiếu Hết sẽ thua ngay lập tức!'),
  ('shield_pawn', 'Tốt Khiên', '♙', 1, 0, 'vanguard', 2, 3, 5, 1, 1, 1, 'melee', 'pawn', 'Đi thẳng 1 ô, ăn chéo 1 ô. Có sẵn nhiều Lớp Máu. Đi tới hàng cuối sẽ Phong Cấp thành Hậu!'),
  ('mercenary', 'Lính Đánh Thuê', '⚔️', 1, 0, 'cavalry,fortune', 1, 2, 3, 1, 1, 1, 'melee', 'king', 'Đi và chém 1 ô mọi hướng (8 hướng). Tiêu diệt kẻ địch rơi Vàng và tích điểm Hũ Thần Tài!'),
  ('fire_mage', 'Phù Thủy Lửa', '🔥', 1, 0, 'pyro,mage', 1, 2, 3, 2, 2, 3, 'ranged_ortho', 'step_ortho', 'Đi 1 ô ngang/dọc. Bắn cầu lửa tầm xa 2 ô ngang/dọc (không cần bước vào) và gây Thiêu Đốt!'),
  ('archer', 'Cung Thủ', '🏹', 2, 0, 'ranger', 1, 2, 3, 2, 3, 4, 'ranged_any', 'king', 'Đi 1 ô mọi hướng. Bắn tên từ xa 2-4 ô theo đường thẳng/chéo mà không cần di chuyển vào ô địch!'),
  ('knight', 'Mã Đột Kích', '♘', 2, 0, 'cavalry', 1, 2, 4, 1, 1, 1, 'melee', 'knight', 'Nhảy chữ L vượt qua mọi Tường Đá, Sông và quân cờ khác để tập kích hàng sau.'),
  ('frost_knight', 'Kỵ Sĩ Băng', '🧊', 2, 0, 'frost,cavalry', 2, 3, 4, 1, 1, 1, 'melee', 'knight', 'Nhảy chữ L và có 2 Lớp Máu. Khi nhảy đến cạnh kẻ địch sẽ kích hoạt Băng Hệ làm Choáng!'),
  ('gambler', 'Thần Xúc Xắc', '🎲', 3, 0, 'fortune,mage', 2, 3, 5, 1, 1, 1, 'melee', 'bishop', 'Đi chéo như Tượng. Đòn đánh có cơ hội hồi Vàng và tăng gấp đôi điểm tích lũy Hũ Thần Tài!'),
  ('pyro_bishop', 'Tượng Hỏa Pháp', '♗', 3, 0, 'pyro,mage', 1, 2, 4, 2, 3, 4, 'ranged_diag_or_slide', 'bishop', 'Đi chéo không giới hạn. Có thể chưởng lửa từ xa 2 ô chéo gây Thiêu Đốt (tự nổ sau 3 lượt).'),
  ('juggernaut', 'Thiết Giáp Khổng Lồ', '🗿', 3, 0, 'vanguard', 3, 4, 7, 2, 2, 3, 'melee', 'rook_short', 'Đi ngang/dọc tối đa 2 ô. Pháo đài di động: phải bị đối phương ăn 3-7 lần mới gục ngã!'),
  ('corsair', 'Thuyền Trưởng Cướp Biển', '🏴‍☠️', 4, 0, 'fortune,ranger', 2, 4, 6, 8, 8, 8, 'cannon_ranged', 'cannon', 'Bắn đại bác từ xa qua 1 quân cản. Khi nổ hũ tăng thêm 25% giá trị phần thưởng!'),
  ('cannon', 'Pháo Công Thành', '💣', 4, 0, 'ranger,pyro', 2, 3, 5, 8, 8, 8, 'cannon_ranged', 'cannon', 'Đi ngang/dọc như Xe. Bắn đại bác từ xa qua ĐÚNG 1 quân cản (hoặc Tường Đá) để nổ tung mục tiêu phía sau!'),
  ('frost_rook', 'Xe Băng Giá', '♖', 4, 0, 'vanguard,frost', 2, 4, 6, 8, 8, 8, 'melee', 'rook', 'Đi ngang/dọc không giới hạn. Khi dừng lại sẽ làm Choáng (đóng băng 1 lượt) kẻ địch đứng cạnh.'),
  ('grand_queen', 'Hậu Tối Thượng', '♕', 5, 0, 'royal,mage', 2, 4, 8, 2, 3, 4, 'queen_hybrid', 'queen', 'Đi ngang/dọc/chéo toàn bản đồ HOẶC bắn tia năng lượng tầm xa 2-3 ô mà không cần di chuyển!'),
  ('chancellor', 'Đại Thừa Tướng', '🐉', 5, 0, 'royal,cavalry,vanguard', 3, 5, 9, 8, 8, 8, 'melee', 'chancellor', 'Kết hợp bước đi của cả XE + MÃ! Vừa càn quét đường thẳng vừa nhảy chữ L qua mọi địa hình.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ============================================================================
-- 4. BẢNG `rooms`: QUẢN LÝ PHÒNG CHỜ GHÉP TRẬN ONLINE TRÊN WAMPSERVER
-- ============================================================================
CREATE TABLE IF NOT EXISTS `rooms` (
  `code` VARCHAR(12) NOT NULL PRIMARY KEY COMMENT 'Mã phòng 6 ký tự',
  `name` VARCHAR(100) NOT NULL COMMENT 'Tên phòng',
  `hostId` VARCHAR(64) NOT NULL COMMENT 'ID chủ phòng',
  `hostName` VARCHAR(100) NOT NULL COMMENT 'Tên chủ phòng',
  `fillBots` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Tự động lấp đầy Bot cho đủ 8 người',
  `timeMode` VARCHAR(32) NOT NULL DEFAULT 'standard' COMMENT 'standard / relaxed / blitz',
  `status` VARCHAR(32) NOT NULL DEFAULT 'waiting' COMMENT 'waiting = Đang chờ, playing = Đang đấu',
  `players_json` LONGTEXT NOT NULL COMMENT 'Danh sách người chơi trong phòng (JSON)',
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. BẢNG `matches`: LỊCH SỬ TRẬN ĐẤU & CỘNG TRỪ ĐIỂM ELO
-- ============================================================================
CREATE TABLE IF NOT EXISTS `matches` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` VARCHAR(64) NOT NULL,
  `username` VARCHAR(64) NOT NULL,
  `roomCode` VARCHAR(16) NOT NULL DEFAULT 'SOLO',
  `rank_result` INT NOT NULL COMMENT 'Thứ hạng đạt được (1 -> 8)',
  `stageReached` VARCHAR(16) NOT NULL COMMENT 'Vòng đấu đạt tới (VD: 3-2)',
  `eloDelta` INT NOT NULL DEFAULT 0 COMMENT 'Điểm ELO thay đổi',
  `finalComp_json` TEXT NOT NULL COMMENT 'Đội hình kết thúc trận',
  `finishedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

// ============================================================================
// CHESS TFT - ADMIN PANEL CONTROLLER (ES MODULE)
// MySQL & JSON Database Inspector, Users Editor, Game Rules & Pieces Tuner
// ============================================================================

import { ITEMS } from '../data/items.data.js';
import { PIECES } from '../data/pieces.data.js';
import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class AdminPanelController {
    constructor(app) {
        this.app = app;
        this.adminDbCache = null;
        this.selectedAdminUserId = null;
        this.selectedAdminPieceId = null;
        this.adminUserCreateMode = false;
    }

    get app() { return this._app || window.app; }
    set app(v) { this._app = v; }
    get currentUser() { return this.app?.currentUser || window.app?.currentUser; }
    set currentUser(v) { if (this.app) this.app.currentUser = v; if (window.app) window.app.currentUser = v; }

    
    getAuthHeaders() {
        let token = this.currentUser?.token || '';
        if (!token) {
            try {
                const s = localStorage.getItem('chesstft_user');
                if (s) token = JSON.parse(s).token || '';
            } catch (e) {}
        }
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    }

    showToast(msg, type = 'info') {
        eventBus.emit(GAME_EVENTS.SHOW_TOAST, { message: msg, type });
    }
    bindAdminEvents() {
        document.getElementById("btn-open-admin").addEventListener("click", () => {
            this.openAdminDatabaseModal();
        });

        document.getElementById("btn-close-admin").addEventListener("click", () => {
            document.getElementById("modal-admin-db").classList.add("hidden");
        });

        const searchInput = document.getElementById("admin-user-search");
        if (searchInput) {
            searchInput.addEventListener("input", () => {
                this.renderAdminUsersTab();
            });
        }

        const addBtn = document.getElementById("btn-admin-add-user");
        if (addBtn) {
            addBtn.addEventListener("click", () => {
                this.adminUserCreateMode = true;
                this.renderAdminUsersTab();
            });
        }

        const resetBtn = document.getElementById("btn-admin-reset-users");
        if (resetBtn) {
            resetBtn.addEventListener("click", async () => {
                try {
                    const res = await fetch("api.php?action=admin_seed_defaults", {
                        method: "POST",
                        headers: this.getAuthHeaders()
                    });
                    const data = await res.json();
                    if (data.ok) {
                        this.showToast(data.msg || "Đã nạp bổ sung các tài khoản chuẩn!", "success");
                        this.openAdminDatabaseModal();
                    }
                } catch (e) {
                    this.showToast("Không thể kết nối đến máy chủ!", "warn");
                }
            });
        }

        document.querySelectorAll(".admin-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                const target = tab.getAttribute("data-admintab");
                document.getElementById("admin-panel-users").classList.toggle("hidden", target !== "users");
                document.getElementById("admin-panel-rules").classList.toggle("hidden", target !== "rules");
                document.getElementById("admin-panel-pieces").classList.toggle("hidden", target !== "pieces");
            });
        });
    }

    async openAdminDatabaseModal() {
        const modal = document.getElementById("modal-admin-db");
        modal.classList.remove("hidden");
        try {
            const res = await fetch("api.php?action=admin_db", { headers: this.getAuthHeaders() });
            const data = await res.json();
            if (data.ok) {
                this.adminDbCache = data;
                if (!this.selectedAdminPieceId || !data.entities?.PIECES?.[this.selectedAdminPieceId]) {
                    const firstKey = Object.keys(data.entities?.PIECES || {})[0];
                    if (firstKey) this.selectedAdminPieceId = firstKey;
                }
                this.renderAdminUsersTab();
                this.renderAdminRulesTab();
                this.renderAdminPiecesTab();
            }
        } catch (e) {
            this.showToast("Không thể tải Database từ Server!", "warn");
        }
    }

    renderAdminUsersTab() {
        const listEl = document.getElementById("admin-users-list");
        if (!listEl) return;
        listEl.innerHTML = "";
        if (!this.adminDbCache || !this.adminDbCache.users) return;

        const allUsers = this.adminDbCache.users;
        const searchInput = document.getElementById("admin-user-search");
        const query = (searchInput?.value || "").trim().toLowerCase();

        const filtered = query
            ? allUsers.filter(u =>
                (u.username && u.username.toLowerCase().includes(query)) ||
                (u.displayName && u.displayName.toLowerCase().includes(query))
              )
            : allUsers;

        const countEl = document.getElementById("admin-users-count");
        if (countEl) countEl.textContent = `${filtered.length}/${allUsers.length}`;

        if (!this.adminUserCreateMode && !this.selectedAdminUserId && filtered.length > 0) {
            this.selectedAdminUserId = filtered[0].id;
        }

        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="empty-hint" style="font-size:0.75rem;">Không tìm thấy tài khoản nào khớp với "${query}".</div>`;
        } else {
            for (const u of filtered) {
                const item = document.createElement("div");
                const isSelected = (!this.adminUserCreateMode) && (this.selectedAdminUserId === u.id);
                item.className = `admin-list-item ${isSelected ? "active" : ""}`;
                item.innerHTML = `
                    <span>${u.avatar || "👤"} ${u.displayName} (<code>${u.username}</code>)</span>
                    <span class="badge-pill" style="font-size:0.65rem;">${u.role}</span>
                `;
                item.addEventListener("click", () => {
                    this.adminUserCreateMode = false;
                    this.selectedAdminUserId = u.id;
                    this.renderAdminUsersTab();
                });
                listEl.appendChild(item);
            }
        }

        const editor = document.getElementById("admin-user-editor");
        if (!editor) return;

        // MODE 1: CREATE NEW USER
        if (this.adminUserCreateMode) {
            const allItemsHtml = Object.values(window.CHESS_TFT_DATA.ITEMS).map(it => `
                <label class="checkbox-label">
                    <input type="checkbox" class="adm-new-user-item-chk" value="${it.id}" />
                    <span>${it.icon} ${it.name}</span>
                </label>
            `).join("");

            editor.innerHTML = `
                <div class="lobby-box-title" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>➕ Tạo Mới Tài Khoản Kỳ Thủ</span>
                    <button id="btn-cancel-create-user" class="btn-sm-admin" style="background:#475569;">Quay Lại Sửa</button>
                </div>
                <div class="admin-grid-2">
                    <div class="form-group">
                        <label>Tên đăng nhập (Username) *</label>
                        <input type="text" id="adm-new-username" placeholder="VD: kithu9, pro_player..." />
                    </div>
                    <div class="form-group">
                        <label>Tên hiển thị (DisplayName)</label>
                        <input type="text" id="adm-new-display" placeholder="VD: Kỳ Thủ Đại Sư..." />
                    </div>
                    <div class="form-group">
                        <label>Mật khẩu ban đầu</label>
                        <input type="text" id="adm-new-pass" value="123" />
                    </div>
                    <div class="form-group">
                        <label>Quyền hạn (Role)</label>
                        <select id="adm-new-role" class="lobby-select">
                            <option value="player" selected>Player (Kỳ thủ thi đấu)</option>
                            <option value="admin">Admin (Quản trị viên)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Avatar Biểu tượng</label>
                        <input type="text" id="adm-new-avatar" value="👤" />
                    </div>
                    <div class="form-group">
                        <label>Điểm Xếp Hạng (ELO)</label>
                        <input type="number" id="adm-new-elo" value="1000" />
                    </div>
                </div>

                <div class="panel-section-title" style="margin-top:8px;">⚡ Can Thiệp Chỉ Số Khởi Đầu Khi Vào Trận</div>
                <div class="admin-grid-2">
                    <div class="form-group">
                        <label>❤️ Máu Linh Hồn Khởi Đầu</label>
                        <input type="number" id="adm-new-hp" value="100" />
                    </div>
                    <div class="form-group">
                        <label>🪙 Vàng Khởi Đầu Ván Đấu</label>
                        <input type="number" id="adm-new-gold" value="6" />
                    </div>
                    <div class="form-group">
                        <label>⬆️ Cấp Độ Khởi Đầu (3 -> 8)</label>
                        <input type="number" id="adm-new-level" min="3" max="8" value="3" />
                    </div>
                    <div class="form-group">
                        <label>⏱️ Cộng Giây Cờ Chớp</label>
                        <input type="number" id="adm-new-clock" value="0" />
                    </div>
                </div>

                <div class="form-group">
                    <label>🎒 Trang Bị Tặng Sẵn Đầu Trận:</label>
                    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:4px;">${allItemsHtml}</div>
                </div>

                <div style="margin-top:10px;">
                    <button id="btn-submit-create-user" class="btn-combat-go">➕ Lưu Tài Khoản Mới Vào Database</button>
                </div>
            `;

            document.getElementById("btn-cancel-create-user")?.addEventListener("click", () => {
                this.adminUserCreateMode = false;
                this.renderAdminUsersTab();
            });

            document.getElementById("btn-submit-create-user")?.addEventListener("click", async () => {
                const username = document.getElementById("adm-new-username").value.trim();
                const displayName = document.getElementById("adm-new-display").value.trim();
                const password = document.getElementById("adm-new-pass").value.trim();
                const role = document.getElementById("adm-new-role").value;
                const avatar = document.getElementById("adm-new-avatar").value.trim() || "👤";
                const elo = Number(document.getElementById("adm-new-elo").value) || 1000;
                const selectedItems = Array.from(editor.querySelectorAll(".adm-new-user-item-chk:checked")).map(c => c.value);

                if (!username || !password) {
                    this.showToast("Vui lòng điền đầy đủ Tên đăng nhập và Mật khẩu!", "warn");
                    return;
                }

                try {
                    const res = await fetch("api.php?action=admin_user_create", {
                        method: "POST",
                        headers: this.getAuthHeaders(),
                        body: JSON.stringify({
                            username,
                            displayName,
                            password,
                            role,
                            avatar,
                            elo,
                            customModifiers: {
                                startingHp: Number(document.getElementById("adm-new-hp").value) || 100,
                                startingGold: Number(document.getElementById("adm-new-gold").value) || 6,
                                startingLevel: Number(document.getElementById("adm-new-level").value) || 3,
                                extraClockSeconds: Number(document.getElementById("adm-new-clock").value) || 0,
                                bonusItems: selectedItems,
                                isBanned: false
                            }
                        })
                    });
                    const data = await res.json();
                    if (data.ok) {
                        this.showToast(data.msg || "Đã tạo tài khoản thành công!", "success");
                        this.adminUserCreateMode = false;
                        this.selectedAdminUserId = data.user?.id;
                        this.openAdminDatabaseModal();
                    } else {
                        this.showToast(data.msg || "Tạo tài khoản thất bại!", "warn");
                    }
                } catch (e) {
                    this.showToast("Lỗi khi kết nối đến server!", "warn");
                }
            });

            return;
        }

        // MODE 2: EDIT EXISTING USER
        const user = allUsers.find(u => u.id === this.selectedAdminUserId) || filtered[0];
        if (!user) {
            editor.innerHTML = `<div class="empty-hint">Chưa chọn tài khoản nào để chỉnh sửa.</div>`;
            return;
        }

        const mods = user.customModifiers || {};
        const ownedItems = new Set(mods.bonusItems || []);
        const allItemsHtml = Object.values(window.CHESS_TFT_DATA.ITEMS).map(it => `
            <label class="checkbox-label">
                <input type="checkbox" class="adm-user-item-chk" value="${it.id}" ${ownedItems.has(it.id) ? "checked" : ""} />
                <span>${it.icon} ${it.name}</span>
            </label>
        `).join("");

        const isMainAdmin = user.username === "admin";

        editor.innerHTML = `
            <div class="lobby-box-title" style="display:flex; justify-content:space-between; align-items:center;">
                <span>Chỉnh Sửa Tài Khoản: <code>${user.username}</code> (${user.displayName})</span>
                ${isMainAdmin ? `<span class="badge-role-tag">👑 TỐI CAO</span>` : `<button id="btn-delete-admin-user" class="btn-delete-admin-user">🗑️ Xóa Tài Khoản</button>`}
            </div>
            <div class="admin-grid-2">
                <div class="form-group">
                    <label>Tên hiển thị</label>
                    <input type="text" id="adm-u-display" value="${user.displayName || ""}" />
                </div>
                <div class="form-group">
                    <label>Quyền hạn (Role)</label>
                    <select id="adm-u-role" class="lobby-select">
                        <option value="player" ${user.role === "player" ? "selected" : ""}>Player (Người chơi)</option>
                        <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin (Quản trị viên)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Điểm Xếp Hạng (ELO)</label>
                    <input type="number" id="adm-u-elo" value="${user.stats?.elo || 1000}" />
                </div>
                <div class="form-group">
                    <label>Đổi Mật Khẩu Mới (Để trống nếu giữ nguyên)</label>
                    <input type="text" id="adm-u-pass" placeholder="Mật khẩu hiện tại: ${user.password || "***"}" />
                </div>
            </div>

            <div class="panel-section-title" style="margin-top:8px;">⚡ Can Thiệp Chỉ Số Khởi Đầu Trong Trận Của Riêng Tài Khoản Này</div>
            <div class="admin-grid-2">
                <div class="form-group">
                    <label>❤️ Máu Linh Hồn Khởi Đầu (Mặc định: 100)</label>
                    <input type="number" id="adm-u-hp" value="${mods.startingHp || 100}" />
                </div>
                <div class="form-group">
                    <label>🪙 Vàng Khởi Đầu Ván Đấu (Mặc định: 6)</label>
                    <input type="number" id="adm-u-gold" value="${mods.startingGold !== undefined ? mods.startingGold : 6}" />
                </div>
                <div class="form-group">
                    <label>⬆️ Cấp Độ Khởi Đầu (3 -> 8)</label>
                    <input type="number" id="adm-u-level" min="3" max="8" value="${mods.startingLevel || 3}" />
                </div>
                <div class="form-group">
                    <label>⏱️ Cộng/Trừ Giây Đồng Hồ Cờ Chớp Mỗi Hiệp</label>
                    <input type="number" id="adm-u-clock" value="${mods.extraClockSeconds || 0}" />
                </div>
            </div>

            <div class="form-group">
                <label>🎒 Trang Bị Tặng Sẵn Vào Kho Đồ Đầu Trận:</label>
                <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:4px;">${allItemsHtml}</div>
            </div>

            <label class="checkbox-label" style="color:#f87171;">
                <input type="checkbox" id="adm-u-banned" ${mods.isBanned ? "checked" : ""} />
                <span>🚫 Khóa tài khoản này (Không cho đăng nhập)</span>
            </label>

            <button id="btn-save-admin-user" class="btn-combat-go">💾 Lưu Tài Khoản Vào Database (MySQL users / JSON)</button>
        `;

        document.getElementById("btn-save-admin-user")?.addEventListener("click", async () => {
            const selectedItems = Array.from(editor.querySelectorAll(".adm-user-item-chk:checked")).map(c => c.value);
            const updates = {
                displayName: document.getElementById("adm-u-display").value.trim(),
                role: document.getElementById("adm-u-role").value,
                elo: Number(document.getElementById("adm-u-elo").value),
                password: document.getElementById("adm-u-pass").value,
                customModifiers: {
                    startingHp: Number(document.getElementById("adm-u-hp").value),
                    startingGold: Number(document.getElementById("adm-u-gold").value),
                    startingLevel: Number(document.getElementById("adm-u-level").value),
                    extraClockSeconds: Number(document.getElementById("adm-u-clock").value),
                    bonusItems: selectedItems,
                    isBanned: document.getElementById("adm-u-banned").checked
                }
            };

            const res = await fetch("api.php?action=admin_user", {
                method: "POST",
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ userId: user.id, updates })
            });
            const data = await res.json();
            if (data.ok) {
                this.showToast(data.msg, "success");
                if (this.currentUser && this.currentUser.id === user.id) {
                    this.currentUser = data.user;
                    localStorage.setItem("chesstft_user", JSON.stringify(data.user));
                    this.renderLobbyHeader();
                }
                this.openAdminDatabaseModal();
            }
        });

        document.getElementById("btn-delete-admin-user")?.addEventListener("click", async () => {
            if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản '${user.username}' khỏi hệ thống?`)) return;
            try {
                const res = await fetch("api.php?action=admin_user_delete", {
                    method: "POST",
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({ userId: user.id })
                });
                const data = await res.json();
                if (data.ok) {
                    this.showToast(data.msg, "info");
                    this.selectedAdminUserId = null;
                    this.openAdminDatabaseModal();
                } else {
                    this.showToast(data.msg || "Không thể xóa tài khoản!", "warn");
                }
            } catch (e) {
                this.showToast("Lỗi khi kết nối đến máy chủ!", "warn");
            }
        });
    }

    renderAdminRulesTab() {
        const box = document.getElementById("admin-rules-editor");
        if (!this.adminDbCache || !this.adminDbCache.rules) return;
        const r = this.adminDbCache.rules;
        const s1 = r.STAGE_CONFIG["1"];
        const s2 = r.STAGE_CONFIG["2"];
        const s3 = r.STAGE_CONFIG["3"];
        const cb = r.combatRules || {};
        const ec = r.economy || {};
        const df = r.damageFormula || {};

        box.innerHTML = `
            <div class="lobby-box-title">⏱️ Cấu Hình Thời Gian Đồng Hồ Cờ Chớp & Bàn Cờ Theo Stage</div>
            <div class="admin-grid-3">
                <div class="form-group">
                    <label>Stage 1 (5x6) — Đồng hồ (Giây)</label>
                    <input type="number" id="adm-r-s1time" value="${s1.blitzTime}" />
                </div>
                <div class="form-group">
                    <label>Stage 2 (6x7) — Đồng hồ (Giây)</label>
                    <input type="number" id="adm-r-s2time" value="${s2.blitzTime}" />
                </div>
                <div class="form-group">
                    <label>Stage 3 (8x8) — Đồng hồ (Giây)</label>
                    <input type="number" id="adm-r-s3time" value="${s3.blitzTime}" />
                </div>
                <div class="form-group">
                    <label>Giây cộng thêm mỗi nước (Stage 1-2)</label>
                    <input type="number" id="adm-r-inc1" value="${s1.increment}" />
                </div>
                <div class="form-group">
                    <label>Vàng thưởng mỗi vòng (Base Gold)</label>
                    <input type="number" id="adm-r-basegold" value="${ec.baseRoundGold || 5}" />
                </div>
                <div class="form-group">
                    <label>Lãi suất tối đa mỗi vòng</label>
                    <input type="number" id="adm-r-maxint" value="${ec.maxInterest || 5}" />
                </div>
            </div>

            <div class="panel-section-title" style="margin-top:8px;">💥 Công Thức Trừ Máu Linh Hồn (Chiếu Hết vs Ăn Vua)</div>
            <div class="admin-grid-3">
                <div class="form-group">
                    <label>Sát thương cơ bản CHIẾU HẾT</label>
                    <input type="number" id="adm-r-cmbase" value="${df.checkmateBase ?? 8}" />
                </div>
                <div class="form-group">
                    <label>Máu trừ mỗi quân sống (Chiếu Hết)</label>
                    <input type="number" id="adm-r-cmunit" value="${df.checkmatePerUnit ?? 2}" />
                </div>
                <div class="form-group">
                    <label>Sát thương cơ bản ĂN VUA (Quên chiếu)</label>
                    <input type="number" id="adm-r-kcbase" value="${df.kingCaptureBase ?? 3}" />
                </div>
            </div>

            <label class="checkbox-label">
                <input type="checkbox" id="adm-r-grace" ${cb.turnOneGrace !== false ? "checked" : ""} />
                <span>🛡️ Bật Luật Lượt 1 Công Bằng (Nước đầu tiên chỉ di chuyển dàn trận, không tấn công ngay)</span>
            </label>

            <button id="btn-save-admin-rules" class="btn-combat-go">💾 Lưu Luật Chơi Vào Database (MySQL game_rules / JSON)</button>
        `;

        document.getElementById("btn-save-admin-rules").addEventListener("click", async () => {
            const updatedRules = JSON.parse(JSON.stringify(r));
            updatedRules.STAGE_CONFIG["1"].blitzTime = Number(document.getElementById("adm-r-s1time").value) || 45;
            updatedRules.STAGE_CONFIG["2"].blitzTime = Number(document.getElementById("adm-r-s2time").value) || 60;
            updatedRules.STAGE_CONFIG["3"].blitzTime = Number(document.getElementById("adm-r-s3time").value) || 75;
            const inc = Number(document.getElementById("adm-r-inc1").value) || 3;
            updatedRules.STAGE_CONFIG["1"].increment = inc;
            updatedRules.STAGE_CONFIG["2"].increment = inc;

            updatedRules.economy.baseRoundGold = Number(document.getElementById("adm-r-basegold").value) || 5;
            updatedRules.economy.maxInterest = Number(document.getElementById("adm-r-maxint").value) || 5;

            updatedRules.damageFormula.checkmateBase = Number(document.getElementById("adm-r-cmbase").value);
            updatedRules.damageFormula.checkmatePerUnit = Number(document.getElementById("adm-r-cmunit").value);
            updatedRules.damageFormula.kingCaptureBase = Number(document.getElementById("adm-r-kcbase").value);
            updatedRules.combatRules.turnOneGrace = document.getElementById("adm-r-grace").checked;

            const res = await fetch("api.php?action=admin_rules", {
                method: "POST",
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ rules: updatedRules })
            });
            const data = await res.json();
            if (data.ok) {
                if (data.rules && window.applyDatabaseConfigToRuntime) {
                    window.applyDatabaseConfigToRuntime(data.rules, data.entities);
                }
                this.showToast(data.msg, "success");
                this.renderCodex();
                this.openAdminDatabaseModal();
            }
        });
    }

    renderAdminPiecesTab() {
        const listEl = document.getElementById("admin-pieces-list");
        const editor = document.getElementById("admin-piece-editor");
        if (!this.adminDbCache || !this.adminDbCache.entities) return;

        const pieces = this.adminDbCache.entities.PIECES;
        listEl.innerHTML = "";

        for (const p of Object.values(pieces)) {
            const item = document.createElement("div");
            item.className = `admin-list-item ${this.selectedAdminPieceId === p.id ? "active" : ""}`;
            item.innerHTML = `
                <span>${p.icon} ${p.name}</span>
                <span class="badge-pill">${p.isKing ? "Vua" : p.cost + "🪙"}</span>
            `;
            item.addEventListener("click", () => {
                this.selectedAdminPieceId = p.id;
                this.renderAdminPiecesTab();
            });
            listEl.appendChild(item);
        }

        const p = pieces[this.selectedAdminPieceId];
        if (!p) return;

        editor.innerHTML = `
            <div class="lobby-box-title">${p.icon} Chỉnh Sửa Quân Cờ: ${p.name} (<code>${p.id}</code>)</div>
            <div class="admin-grid-2">
                <div class="form-group">
                    <label>Tên Quân Cờ</label>
                    <input type="text" id="adm-p-name" value="${p.name}" />
                </div>
                <div class="form-group">
                    <label>Giá Mua Trong Shop (1 -> 5 Vàng)</label>
                    <input type="number" id="adm-p-cost" min="0" max="5" value="${p.cost}" ${p.isKing ? "disabled" : ""} />
                </div>
            </div>

            <div class="panel-section-title">🛡️ Số Lớp Máu (Phải ăn bao nhiêu lần mới chết ở 1★ / 2★ / 3★)</div>
            <div class="admin-grid-3">
                <div class="form-group">
                    <label>Lớp Máu 1 Sao (★)</label>
                    <input type="number" id="adm-p-hp1" min="1" max="20" value="${p.baseHp[0]}" />
                </div>
                <div class="form-group">
                    <label>Lớp Máu 2 Sao (★★)</label>
                    <input type="number" id="adm-p-hp2" min="1" max="25" value="${p.baseHp[1]}" />
                </div>
                <div class="form-group">
                    <label>Lớp Máu 3 Sao (★★★)</label>
                    <input type="number" id="adm-p-hp3" min="1" max="30" value="${p.baseHp[2]}" />
                </div>
            </div>

            <div class="panel-section-title">🎯 Tầm Đánh / Tầm Bắn Xa (1★ / 2★ / 3★)</div>
            <div class="admin-grid-3">
                <div class="form-group">
                    <label>Tầm 1 Sao (★)</label>
                    <input type="number" id="adm-p-rng1" min="1" max="8" value="${p.range[0]}" />
                </div>
                <div class="form-group">
                    <label>Tầm 2 Sao (★★)</label>
                    <input type="number" id="adm-p-rng2" min="1" max="8" value="${p.range[1]}" />
                </div>
                <div class="form-group">
                    <label>Tầm 3 Sao (★★★)</label>
                    <input type="number" id="adm-p-rng3" min="1" max="8" value="${p.range[2]}" />
                </div>
            </div>

            <div class="form-group">
                <label>Mô tả kỹ năng & bước đi</label>
                <input type="text" id="adm-p-desc" value="${p.desc}" />
            </div>

            <button id="btn-save-admin-piece" class="btn-combat-go">💾 Lưu Quân Cờ Vào Database (MySQL pieces / JSON)</button>
        `;

        document.getElementById("btn-save-admin-piece").addEventListener("click", async () => {
            const pieceData = {
                name: document.getElementById("adm-p-name").value.trim(),
                cost: Number(document.getElementById("adm-p-cost").value),
                baseHp: [
                    Number(document.getElementById("adm-p-hp1").value) || 1,
                    Number(document.getElementById("adm-p-hp2").value) || 2,
                    Number(document.getElementById("adm-p-hp3").value) || 3
                ],
                range: [
                    Number(document.getElementById("adm-p-rng1").value) || 1,
                    Number(document.getElementById("adm-p-rng2").value) || 1,
                    Number(document.getElementById("adm-p-rng3").value) || 1
                ],
                desc: document.getElementById("adm-p-desc").value.trim()
            };

            const res = await fetch("api.php?action=admin_piece", {
                method: "POST",
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ pieceId: p.id, pieceData })
            });
            const data = await res.json();
            if (data.ok) {
                if (data.entities && window.applyDatabaseConfigToRuntime) {
                    window.applyDatabaseConfigToRuntime(data.rules, data.entities);
                }
                this.showToast(data.msg, "success");
                this.renderCodex();
                this.openAdminDatabaseModal();
            }
        });
    }

    // ========================================================================
    // ADMIN SPECTATOR MODE: 8-BOT ARENA (4 SIMULTANEOUS SPLIT SCREENS 2x2)
}

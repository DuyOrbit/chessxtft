// ============================================================================
// CHESS TFT - CODEX CONTROLLER (ES MODULE)
// Encyclopedia of Pieces, Traits, Items, Maps, Augments & 5x5 Move Simulator
// ============================================================================

import { PIECES } from '../data/pieces.data.js';
import { SYNERGIES, TRAITS } from '../data/traits.data.js';
import { ITEMS } from '../data/items.data.js';
import { MAPS } from '../data/maps.data.js';
import { AUGMENTS } from '../data/augments.data.js';

export class CodexController {
    constructor() {
        this.codexActiveTab = 'pieces';
        this.guideSelectedPieceId = null;
        this.guideFilter = 'all';
        this._guideFiltersBound = false;
        this.guideMode = 'beginner';
    }
    renderCodex() {
        const container = document.getElementById("codex-content");
        if (!container) return;
        container.innerHTML = "";

        const getCostTierName = (cost, isKing) => {
            if (isKing) return "Quốc Vương";
            switch (cost) {
                case 1: return "1 🪙 Thường";
                case 2: return "2 🪙 Hiếm";
                case 3: return "3 🪙 Tinh Anh";
                case 4: return "4 🪙 Sử Thi";
                case 5: return "5 🪙 Huyền Thoại";
                default: return `${cost} 🪙`;
            }
        };

        if (this.codexActiveTab === "pieces") {
            const pieces = Object.values(window.CHESS_TFT_DATA.PIECES).sort((a, b) => a.cost - b.cost);
            for (const p of pieces) {
                const traitsBadges = (p.traits || []).map(t => {
                    const s = window.CHESS_TFT_DATA.SYNERGIES[t];
                    return s 
                        ? `<span class="codex-trait-badge" style="border-color:${s.color}; background:rgba(${parseInt(s.color.slice(1,3),16)||20},${parseInt(s.color.slice(3,5),16)||30},${parseInt(s.color.slice(5,7),16)||50},0.28)">${s.icon} ${s.name}</span>`
                        : `<span class="codex-trait-badge">${t}</span>`;
                }).join(" ");

                const tierName = getCostTierName(p.cost, p.isKing);

                const card = document.createElement("div");
                card.className = `game-hero-card cost-tier-${p.cost} ${p.isKing ? "hero-card-king" : ""}`;
                card.innerHTML = `
                    <div class="hero-card-header">
                        <div class="hero-card-tier-pill">${tierName}</div>
                        ${p.badge ? `<div class="hero-card-badge">${p.badge}</div>` : ""}
                    </div>
                    <div class="hero-card-portrait">
                        <div class="hero-avatar-halo"></div>
                        <img src="assets/pieces/${p.id}.svg" class="hero-avatar-svg" alt="${p.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                        <div class="hero-avatar-icon" style="display:none;">${p.icon}</div>
                    </div>
                    <div class="hero-card-title-wrap">
                        <h4 class="hero-card-name">${p.name}</h4>
                        <div class="hero-card-traits">${traitsBadges}</div>
                    </div>
                    <div class="hero-card-stats-grid">
                        <div class="hero-stat-cell">
                            <span class="hero-stat-label"><i data-lucide="shield" class="icon-emerald"></i> Máu (★ / ★★ / ★★★)</span>
                            <span class="hero-stat-val">${p.baseHp.join(" / ")}</span>
                        </div>
                        <div class="hero-stat-cell">
                            <span class="hero-stat-label"><i data-lucide="crosshair" class="icon-red"></i> Tầm Đánh</span>
                            <span class="hero-stat-val">${p.range.join(" / ")} ô</span>
                        </div>
                    </div>
                    <div class="hero-card-desc">
                        <span class="hero-desc-icon"><i data-lucide="zap" class="icon-amber"></i></span>
                        <span>${p.desc}</span>
                    </div>
                    <button class="btn-game btn-game-cyan codex-view-guide-btn" data-piece-id="${p.id}" style="font-size:0.75rem; padding:6px 10px; margin-top:6px; font-weight:700; width:100%; border-radius:6px; cursor:pointer;"><i data-lucide="compass" class="icon-cyan"></i> Xem Bàn Cờ Nước Đi & Mẹo Chơi</button>
                `;

                const guideBtn = card.querySelector(".codex-view-guide-btn");
                if (guideBtn) {
                    guideBtn.addEventListener("click", () => {
                        this.openPieceGuide(p.id);
                    });
                }

                container.appendChild(card);
            }
        } else if (this.codexActiveTab === "synergies") {
            for (const syn of Object.values(window.CHESS_TFT_DATA.SYNERGIES)) {
                const unitBadges = Object.values(window.CHESS_TFT_DATA.PIECES)
                    .filter(p => p.traits && p.traits.includes(syn.id))
                    .map(p => `<span class="syn-unit-chip cost-tier-${p.cost}">${p.icon} ${p.name} (${p.isKing ? "Vua" : p.cost + " Vàng"})</span>`)
                    .join(" ");

                const tiersHtml = syn.thresholds.map(th => `
                    <div class="syn-tier-row">
                        <span class="syn-threshold-badge">Mốc [${th}]</span>
                        <span class="syn-threshold-effect">${syn.effectText[th]}</span>
                    </div>
                `).join("");

                const card = document.createElement("div");
                card.className = "game-synergy-card";
                card.innerHTML = `
                    <div class="synergy-card-head" style="border-left: 4px solid ${syn.color};">
                        <div class="synergy-card-title">
                            <span class="synergy-crest" style="background:${syn.color};">${syn.icon}</span>
                            <div>
                                <h4 class="synergy-name">${syn.name}</h4>
                                <span class="synergy-milestone-tag">Yêu cầu mốc: ${syn.thresholds.join(" / ")} quân</span>
                            </div>
                        </div>
                    </div>
                    <div class="synergy-card-desc">${syn.desc}</div>
                    <div class="synergy-thresholds-container">${tiersHtml}</div>
                    <div class="synergy-units-list">
                        <span class="synergy-units-title"><i data-lucide="shield" class="icon-cyan"></i> Danh sách quân cờ:</span>
                        <div class="synergy-units-flex">${unitBadges}</div>
                    </div>
                `;
                container.appendChild(card);
            }
        } else if (this.codexActiveTab === "items") {
            for (const it of Object.values(window.CHESS_TFT_DATA.ITEMS)) {
                const card = document.createElement("div");
                card.className = "game-item-card";
                card.innerHTML = `
                    <div class="item-card-head">
                        <div class="item-icon-frame">${it.icon}</div>
                        <div class="item-title-wrap">
                            <h4 class="item-name">${it.name}</h4>
                            <span class="item-type-badge">Trang Bị Hoàn Chỉnh</span>
                        </div>
                    </div>
                    <div class="item-card-desc">${it.desc}</div>
                `;
                container.appendChild(card);
            }
            for (const mp of window.CHESS_TFT_DATA.MAPS) {
                const card = document.createElement("div");
                card.className = "game-item-card game-map-card";
                card.innerHTML = `
                    <div class="item-card-head">
                        <div class="item-icon-frame"><i data-lucide="map" class="icon-cyan"></i></div>
                        <div class="item-title-wrap">
                            <h4 class="item-name">${mp.name}</h4>
                            <span class="item-type-badge map-type-badge">Đấu Trường Chiến Thuật</span>
                        </div>
                    </div>
                    <div class="item-card-desc">${mp.desc}</div>
                `;
                container.appendChild(card);
            }
        } else if (this.codexActiveTab === "rules") {
            const st = window.CHESS_TFT_DATA.STAGE_CONFIG;
            const df = window.CHESS_TFT_DATA.DAMAGE_FORMULA || {};
            container.style.gridTemplateColumns = "1fr";
            container.innerHTML = `
                <div class="game-rule-card">
                    <div class="rule-card-title"><i data-lucide="clock" class="icon-cyan"></i> 1. Thời Gian Đồng Hồ Cờ Chớp & Mở Rộng Bàn Cờ</div>
                    <div class="rule-card-content">
                        <div class="rule-row">
                            <span class="rule-badge">Stage 1</span>
                            <span>Bàn cờ <code>${st[1].cols}x${st[1].rows}</code> — Đồng hồ <strong>${st[1].blitzTime}s + ${st[1].increment}s/nước</strong>.</span>
                        </div>
                        <div class="rule-row">
                            <span class="rule-badge">Stage 2</span>
                            <span>Bàn cờ <code>${st[2].cols}x${st[2].rows}</code> — Đồng hồ <strong>${st[2].blitzTime}s + ${st[2].increment}s/nước</strong>.</span>
                        </div>
                        <div class="rule-row">
                            <span class="rule-badge">Stage 3+</span>
                            <span>Bàn cờ <code>${st[3].cols}x${st[3].rows}</code> — Đồng hồ <strong>${st[3].blitzTime}s + ${st[3].increment}s/nước</strong>.</span>
                        </div>
                        <div class="rule-note">
                            <i data-lucide="eye-off" class="icon-cyan"></i> <strong>Soi Bài Bảo Mật:</strong> Khi bấm xem nhà đối thủ lúc Chuẩn Bị, toàn bộ địa hình bản đồ bị ẩn đi để bạn không biết trước mình sắp gặp ai!
                        </div>
                    </div>
                </div>

                <div class="game-rule-card">
                    <div class="rule-card-title"><i data-lucide="swords" class="icon-red"></i> 2. Công Thức Tính Sát Thương Máu Linh Hồn (Player HP)</div>
                    <div class="rule-card-content">
                        <div class="rule-row rule-row-danger">
                            <span class="rule-badge badge-danger">Chiếu Hết (Checkmate) / Hết Giờ</span>
                            <span>Trừ máu NẶNG = <code>(${df.checkmateBase || 8} + ${df.checkmateStageMult || 2} × Stage) + ${df.checkmatePerUnit || 2} × (Số quân còn sống của bên thắng)</code>.</span>
                        </div>
                        <div class="rule-row rule-row-warn">
                            <span class="rule-badge badge-warn">Ăn Vua (Quên Đỡ Chiếu)</span>
                            <span>Trừ máu NHẸ HƠN = <code>(${df.kingCaptureBase || 3} + ${df.kingCaptureStageMult || 1} × Stage) + Chênh lệch quân trên sân</code>.</span>
                        </div>
                        <div class="rule-row">
                            <span class="rule-badge">Hòa Cờ Chớp</span>
                            <span>Cả 2 bên bị trừ <code>(${df.drawBase || 4} + Stage)</code> Máu.</span>
                        </div>
                    </div>
                </div>

                <div class="game-rule-card">
                    <div class="rule-card-title"><i data-lucide="flame" class="icon-amber"></i> 3. Cơ Chế Chuỗi Thắng / Thua & Lội Ngược Dòng (Comeback)</div>
                    <div class="rule-card-content">
                        <div class="rule-row">
                            <span class="rule-badge badge-gold">Thưởng Chuỗi Vàng</span>
                            <span>Chuỗi 2-3 trận: <strong>+1 Vàng</strong> | Chuỗi 4 trận: <strong>+2 Vàng</strong> | Chuỗi 5+ trận: <strong>+3 Vàng</strong> mỗi vòng.</span>
                        </div>
                        <div class="rule-row">
                            <span class="rule-badge badge-purple"><i data-lucide="refresh-cw" class="icon-cyan"></i> Hỗ Trợ Chuỗi Thua (≥ 3 trận)</span>
                            <span>Mỗi vòng nhận <strong>+1 Lượt Đổi Shop Miễn Phí</strong> giúp người có bài yếu dễ dàng lật kèo.</span>
                        </div>
                        <div class="rule-row">
                            <span class="rule-badge badge-purple"><i data-lucide="package" class="icon-amber"></i> Hòm Cứu Trợ (Chuỗi Thua ≥ 4 trận)</span>
                            <span>Tặng ngay <strong>+10 Vàng</strong> và <strong>1 Trang Bị Hoàn Chỉnh</strong> ngẫu nhiên!</span>
                        </div>
                        <div class="rule-row rule-row-danger">
                            <span class="rule-badge badge-danger"><i data-lucide="shield-alert" class="icon-red"></i> Ý Chí Phục Thù (Máu ≤ 25 HP)</span>
                            <span>Khi máu rơi xuống ≤ 25 lần đầu tiên: Lập tức nhận <strong>+15 Vàng</strong>, Quốc Vương được tăng vĩnh viễn <strong>+1 Lớp Máu</strong> và <strong>+15s</strong> thời gian đồng hồ cờ chớp!</span>
                        </div>
                    </div>
                </div>

                <div class="game-rule-card">
                    <div class="rule-card-title"><i data-lucide="coins" class="icon-gold"></i> 4. Cơ Chế Bán Tướng & Phí Ghép Sao</div>
                    <div class="rule-card-content">
                        <div class="rule-row">
                            <span class="rule-badge badge-gold">Tướng 1⭐</span>
                            <span>Bán hoàn lại <strong>100%</strong> giá mua ban đầu (1 Vàng ➔ 1 Vàng, 2 Vàng ➔ 2 Vàng...).</span>
                        </div>
                        <div class="rule-row">
                            <span class="rule-badge badge-purple">Tướng 2⭐ (Ghép từ 3 con)</span>
                            <span>Bán hoàn lại: <code>(Giá gốc × 3) - 1 Vàng Phí Ghép</code> (Tướng 1 Vàng hoàn 2 Vàng; Tướng 2 Vàng hoàn 5 Vàng; Tướng 3 Vàng hoàn 8 Vàng...). Toàn bộ trang bị trên người sẽ an toàn rơi về kho!</span>
                        </div>
                        <div class="rule-row">
                            <span class="rule-badge badge-gold">Tướng 3⭐ (Ghép từ 9 con)</span>
                            <span>Bán hoàn lại: <code>(Giá gốc × 9) - 2 Vàng Phí Ghép</code>.</span>
                        </div>
                    </div>
                </div>
            `;
            window.renderLucideIcons(container);
            return;
        } else if (this.codexActiveTab === "meta") {
            const comps = window.CHESS_TFT_META_COMPS || [];
            container.style.gridTemplateColumns = "repeat(auto-fill, minmax(350px, 1fr))";

            for (const comp of comps) {
                const tierColor = comp.tier === "S" ? "#f59e0b" : (comp.tier === "A" ? "#38bdf8" : "#c084fc");
                const tierBg = comp.tier === "S" ? "rgba(245,158,11,0.2)" : (comp.tier === "A" ? "rgba(56,189,248,0.2)" : "rgba(168,85,247,0.2)");

                const traitsBadges = (comp.traits || []).map(t => {
                    const s = window.CHESS_TFT_DATA.SYNERGIES[t];
                    return s ? `<span class="codex-trait-badge" style="border-color:${s.color}; font-size:0.72rem; padding:2px 7px;">${s.icon} ${s.name}</span>` : `<span class="codex-trait-badge">${t}</span>`;
                }).join(" ");

                const carriesHtml = (comp.mainCarries || []).map(cId => {
                    const p = window.CHESS_TFT_DATA.PIECES[cId];
                    return p ? `<span class="carry-chip">${p.icon} ${p.name} (Chủ Lực)</span>` : "";
                }).join(" ");

                const unitsHtml = (comp.units || []).map(u => {
                    const p = window.CHESS_TFT_DATA.PIECES[u.id];
                    if (!p) return "";
                    return `<span class="comp-unit-chip cost-tier-${p.cost}">${p.icon} ${p.name} ${"★".repeat(u.stars || 1)}</span>`;
                }).join(" ");

                // Generate 6x7 mini board preview
                let miniBoardCells = "";
                for (let r = 0; r < 7; r++) {
                    for (let c = 0; c < 6; c++) {
                        const unitOnCell = (comp.units || []).find(u => u.r === r && u.c === c);
                        if (unitOnCell) {
                            const p = window.CHESS_TFT_DATA.PIECES[unitOnCell.id];
                            miniBoardCells += `<div class="mini-cell mini-occupied" title="${p?.name || unitOnCell.id} (${unitOnCell.stars}⭐)">
                                <span>${p?.icon || "♟️"}</span>
                                <span class="mini-star">${unitOnCell.stars > 1 ? unitOnCell.stars + "★" : ""}</span>
                            </div>`;
                        } else if (r >= 4) {
                            miniBoardCells += `<div class="mini-cell mini-deploy"></div>`;
                        } else {
                            miniBoardCells += `<div class="mini-cell"></div>`;
                        }
                    }
                }

                const card = document.createElement("div");
                card.className = "game-meta-comp-card";
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="meta-tier-pill" style="background:${tierBg}; color:${tierColor}; border:1px solid ${tierColor};">Tier ${comp.tier}</span>
                        <span class="meta-winrate-pill" style="color:#22c55e;">🔥 ${comp.winRate}% Thắng (${comp.wins}W / ${comp.played} trận Bot)</span>
                    </div>
                    <div>
                        <div class="meta-comp-name">${comp.name}</div>
                        <div class="meta-comp-syn-tag">${comp.synergySummary}</div>
                    </div>
                    <div class="hero-card-traits" style="margin-top:2px;">${traitsBadges}</div>
                    <div class="meta-comp-desc">${comp.roleDesc}</div>

                    <div>
                        <span class="meta-sub-label">🎯 Tướng Chủ Lực:</span>
                        <div class="meta-carries-flex">${carriesHtml}</div>
                    </div>

                    <div>
                        <span class="meta-sub-label">♟️ Danh Sách Quân Cờ:</span>
                        <div class="meta-units-flex">${unitsHtml}</div>
                    </div>

                    <div class="meta-board-preview-box">
                        <div style="display:flex; justify-content:space-between; font-size:0.68rem; color:#94a3b8; margin-bottom:4px;">
                            <span>🗺️ Sơ đồ xếp trận chuẩn (6x7)</span>
                            <span>Độ khó: ${comp.difficulty}</span>
                        </div>
                        <div class="mini-board-grid-6x7">
                            ${miniBoardCells}
                        </div>
                    </div>

                    <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; font-size:0.72rem; line-height:1.4;">
                        <div style="color:#e2e8f0; margin-bottom:4px;">💡 <strong>Mẹo vận hành:</strong> ${comp.playstyleGuide}</div>
                        <div style="color:#f87171;">🛡️ <strong>Khắc chế:</strong> ${comp.counterInfo}</div>
                    </div>

                    <button class="btn-game btn-game-gold btn-load-comp-skirmish" style="font-size:0.75rem; padding:6px 10px; font-weight:800; border-radius:6px; cursor:pointer; width:100%;">
                        ⚔️ Nạp Đội Hình Này Vào Cờ Chớp 1v1
                    </button>
                `;

                const loadBtn = card.querySelector(".btn-load-comp-skirmish");
                if (loadBtn) {
                    loadBtn.addEventListener("click", () => {
                        this.loadMetaCompToSkirmish(comp.id);
                    });
                }

                container.appendChild(card);
            }
        }
        container.style.gridTemplateColumns = (this.codexActiveTab === "meta") ? "repeat(auto-fill, minmax(350px, 1fr))" : "repeat(auto-fill, minmax(280px, 1fr))";
        window.renderLucideIcons(container);
        if (window.gsap) {
            window.gsap.from(container.children, {
                y: 12,
                opacity: 0,
                duration: 0.22,
                stagger: 0.02,
                ease: "power1.out",
                clearProps: "transform,opacity"
            });
        }
    }

    // ========================================================================
    // INTERACTIVE PIECE GUIDE & 5x5 MOVEMENT CODEX
    // ========================================================================
    openPieceGuide(pieceId = null) {
        const modal = document.getElementById("modal-piece-guide");
        if (!modal) return;
        modal.classList.remove("hidden");
        this.guideFilter = this.guideFilter || "all";

        // Bind filter tabs if not already bound
        if (!this._guideFiltersBound) {
            this._guideFiltersBound = true;
            modal.querySelectorAll(".guide-filter-pill").forEach(pill => {
                pill.addEventListener("click", () => {
                    modal.querySelectorAll(".guide-filter-pill").forEach(p => p.classList.remove("active"));
                    pill.classList.add("active");
                    const f = pill.getAttribute("data-filter");
                    this.guideFilter = f;
                    this.renderPieceGuide(this.guideSelectedPieceId, f);
                });
            });
        }

        const pieces = Object.values(window.CHESS_TFT_DATA.PIECES);
        const targetId = pieceId || (pieces.length ? pieces[0].id : "shield_pawn");
        this.renderPieceGuide(targetId, this.guideFilter);
    }

    closePieceGuide() {
        const modal = document.getElementById("modal-piece-guide");
        if (modal) modal.classList.add("hidden");
    }

    renderPieceGuide(selectedId, filter = "all") {
        this.guideSelectedPieceId = selectedId;
        const allPieces = Object.values(window.CHESS_TFT_DATA.PIECES);
        // Sort order: 1, 2, 3, 4, 5, then King (0)
        allPieces.sort((a, b) => {
            if (a.isKing) return 1;
            if (b.isKing) return -1;
            return a.cost - b.cost;
        });

        let filtered = allPieces;
        if (filter === "king") {
            filtered = allPieces.filter(p => p.isKing);
        } else if (filter !== "all") {
            const costNum = parseInt(filter, 10);
            filtered = allPieces.filter(p => !p.isKing && p.cost === costNum);
        }

        if (!filtered.some(p => p.id === selectedId)) {
            selectedId = filtered.length ? filtered[0].id : allPieces[0].id;
            this.guideSelectedPieceId = selectedId;
        }

        // Render Left Piece List
        const listEl = document.getElementById("guide-piece-list");
        if (listEl) {
            listEl.innerHTML = "";
            for (const p of filtered) {
                const item = document.createElement("div");
                item.className = `guide-piece-item cost-tier-${p.cost} ${p.id === selectedId ? "active" : ""}`;
                item.innerHTML = `
                    <div class="guide-item-left">
                        <img src="assets/pieces/${p.id}.svg" style="width:24px; height:24px; border-radius:4px;" alt="${p.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
                        <span class="guide-item-icon" style="display:none;">${p.icon}</span>
                        <span class="guide-item-name">${p.name}</span>
                    </div>
                    <span class="guide-item-cost">${p.isKing ? "👑 Vua" : p.cost + "🪙"}</span>
                `;
                item.addEventListener("click", () => {
                    this.renderPieceGuide(p.id, this.guideFilter);
                });
                listEl.appendChild(item);
            }
        }

        // Render Right Piece Detail
        const detailEl = document.getElementById("guide-piece-detail");
        const def = window.CHESS_TFT_DATA.PIECES[selectedId];
        if (!detailEl || !def) return;

        const traitsHtml = (def.traits || []).map(tId => {
            const s = window.CHESS_TFT_DATA.SYNERGIES[tId];
            return s ? `<span class="codex-trait-badge" style="border-color:${s.color}; background:rgba(${parseInt(s.color.slice(1,3),16)||20},${parseInt(s.color.slice(3,5),16)||30},${parseInt(s.color.slice(5,7),16)||50},0.28)">${s.icon} ${s.name}</span>` : `<span class="codex-trait-badge">${tId}</span>`;
        }).join(" ");

        const grid = this.getPieceMovementGrid(def.id);
        let hasMove = false, hasAttack = false, hasJump = false, hasPawnAtk = false, hasCannon = false;

        let cellsHtml = "";
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const cellType = grid[r][c];
                const isLight = (r + c) % 2 === 0;
                let cellClass = `guide-cell ${isLight ? "cell-light" : ""}`;
                let cellContent = "";
                let cellTitle = "";

                if (cellType === "center") {
                    cellClass += " cell-center";
                    cellContent = def.icon;
                    cellTitle = `${def.name} (Tọa độ hiện tại)`;
                } else if (cellType === "move") {
                    cellClass += " cell-move";
                    cellContent = "🟢";
                    cellTitle = "Nước di chuyển hợp lệ";
                    hasMove = true;
                } else if (cellType === "attack") {
                    cellClass += " cell-attack";
                    cellContent = "🎯";
                    cellTitle = "Tầm bắn từ xa (không cần bước vào)";
                    hasAttack = true;
                } else if (cellType === "jump") {
                    cellClass += " cell-jump";
                    cellContent = "⚡";
                    cellTitle = "Nhảy chữ L (vượt qua mọi địa hình và quân cản)";
                    hasJump = true;
                } else if (cellType === "pawn-atk") {
                    cellClass += " cell-pawn-atk";
                    cellContent = "⚔️";
                    cellTitle = "Ăn chéo cận chiến (Tiêu diệt kẻ địch phía trước)";
                    hasPawnAtk = true;
                } else if (cellType === "cannon") {
                    cellClass += " cell-cannon";
                    cellContent = "💣";
                    cellTitle = "Bắn đại bác xuyên ngòi nổ (nhảy cóc qua 1 quân cản)";
                    hasCannon = true;
                }

                cellsHtml += `<div class="${cellClass}" title="${cellTitle}">${cellContent}</div>`;
            }
        }

        const guide = def.guide || {};

        detailEl.innerHTML = `
            <div class="guide-detail-header">
                <div class="guide-detail-title-row">
                    <div class="guide-detail-avatar">
                        <img src="assets/pieces/${def.id}.svg" class="guide-avatar-img" alt="${def.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
                        <span style="display:none;">${def.icon}</span>
                    </div>
                    <div class="guide-detail-meta">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <h3 class="guide-detail-name">${def.name}</h3>
                            <span class="guide-item-cost">${def.isKing ? "👑 Tối Thượng" : def.cost + " 🪙"}</span>
                        </div>
                        <div class="guide-detail-traits">${traitsHtml}</div>
                    </div>
                </div>
                <div class="guide-detail-stats-row">
                    <div class="guide-stat-badge">🛡️ Lớp Máu: ${def.baseHp.join(" / ")} (★/★★/★★★)</div>
                    <div class="guide-stat-badge">🎯 Tầm Đánh: ${def.range.join(" / ")} ô</div>
                </div>
            </div>

            <div class="guide-board-wrap">
                <div class="guide-5x5-board">${cellsHtml}</div>
                <div class="guide-board-legend">
                    <div class="guide-legend-title">📖 KÝ HIỆU MINH HỌA NƯỚC ĐI</div>
                    <div class="guide-legend-row">
                        <span class="guide-legend-chip chip-center">♟️</span>
                        <span><strong>Vị trí hiện tại:</strong> Trung tâm bàn cờ</span>
                    </div>
                    ${hasMove ? `<div class="guide-legend-row"><span class="guide-legend-chip chip-move">🟢</span><span><strong>Nước di chuyển:</strong> Bước vào ô trống</span></div>` : ""}
                    ${hasAttack ? `<div class="guide-legend-row"><span class="guide-legend-chip chip-attack">🎯</span><span><strong>Tầm bắn từ xa:</strong> Bắn hạ địch mà không cần di chuyển</span></div>` : ""}
                    ${hasJump ? `<div class="guide-legend-row"><span class="guide-legend-chip chip-jump">⚡</span><span><strong>Nhảy chữ L:</strong> Nhảy qua đầu quân cờ & địa hình</span></div>` : ""}
                    ${hasPawnAtk ? `<div class="guide-legend-row"><span class="guide-legend-chip chip-pawn">⚔️</span><span><strong>Ăn chéo cận chiến:</strong> Ăn quân địch ở ô chéo phía trước</span></div>` : ""}
                    ${hasCannon ? `<div class="guide-legend-row"><span class="guide-legend-chip chip-cannon">💣</span><span><strong>Đại bác xuyên thấu:</strong> Nhảy qua đúng 1 quân cản để nổ tung mục tiêu</span></div>` : ""}
                </div>
            </div>

            <div class="guide-cards-grid">
                <div class="guide-info-card">
                    <div class="guide-card-head">🧭 1. QUY LUẬT DI CHUYỂN</div>
                    <div class="guide-card-text">${guide.moveRule || def.desc}</div>
                </div>
                <div class="guide-info-card">
                    <div class="guide-card-head">⚔️ 2. TẤN CÔNG & KỸ NĂNG</div>
                    <div class="guide-card-text">${guide.attackRule || "Cận chiến 1 ô."} ${guide.skillRule || ""}</div>
                </div>
                <div class="guide-info-card full-width">
                    <div class="guide-card-head">💡 3. VỊ TRÍ ĐẶT & MẸO TÂN THỦ</div>
                    <div class="guide-card-text">
                        • <strong>Vị trí khuyến nghị:</strong> <span style="color:#fde047; font-weight:700;">${guide.recommendedPos || "Tiền tuyến"}</span><br/>
                        • <strong>Vai trò chiến thuật:</strong> <span style="color:#60a5fa; font-weight:700;">${guide.role || "Đa dụng"}</span><br/>
                        • <strong>Mẹo hay:</strong> ${guide.tips || def.desc}
                    </div>
                </div>
            </div>
        `;
    }

    getPieceMovementGrid(pieceId) {
        const grid = Array.from({ length: 5 }, () => Array(5).fill(null));
        grid[2][2] = "center";
        const def = window.CHESS_TFT_DATA.PIECES[pieceId];
        if (!def) return grid;

        const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        const allDirs = [...orthoDirs, ...diagDirs];
        const knightJumps = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        const in5 = (r, c) => r >= 0 && r < 5 && c >= 0 && c < 5;

        switch (def.id) {
            case "king": {
                for (const [dr, dc] of allDirs) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = "move";
                }
                break;
            }
            case "shield_pawn": {
                grid[1][2] = "move";
                grid[1][1] = "pawn-atk";
                grid[1][3] = "pawn-atk";
                break;
            }
            case "mercenary": {
                for (const [dr, dc] of allDirs) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = "move";
                }
                break;
            }
            case "fire_mage": {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "attack";
                }
                break;
            }
            case "archer": {
                for (const [dr, dc] of allDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    if (in5(2 + dr * 2, 2 + dc * 2)) grid[2 + dr * 2][2 + dc * 2] = "attack";
                }
                break;
            }
            case "knight":
            case "frost_knight": {
                for (const [dr, dc] of knightJumps) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = "jump";
                }
                break;
            }
            case "pyro_bishop": {
                for (const [dr, dc] of diagDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "attack";
                }
                break;
            }
            case "juggernaut": {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "move";
                }
                break;
            }
            case "cannon": {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "cannon";
                }
                break;
            }
            case "frost_rook": {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "move";
                }
                break;
            }
            case "grand_queen": {
                for (const [dr, dc] of allDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    if (in5(2 + dr * 2, 2 + dc * 2)) grid[2 + dr * 2][2 + dc * 2] = "attack";
                }
                break;
            }
            case "chancellor": {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "move";
                }
                for (const [dr, dc] of knightJumps) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = "jump";
                }
                break;
            }
            case "gambler": {
                for (const [dr, dc] of orthoDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    grid[2 + dr * 2][2 + dc * 2] = "attack";
                }
                break;
            }
            case "corsair": {
                for (const [dr, dc] of allDirs) {
                    grid[2 + dr][2 + dc] = "move";
                    if (in5(2 + dr * 2, 2 + dc * 2)) grid[2 + dr * 2][2 + dc * 2] = "attack";
                }
                break;
            }
            case "target_dummy": {
                // Dummy stands still, no moves
                break;
            }
            default: {
                for (const [dr, dc] of allDirs) {
                    const nr = 2 + dr, nc = 2 + dc;
                    if (in5(nr, nc)) grid[nr][nc] = "move";
                }
                break;
            }
        }

        return grid;
    }

    highlightPieceMovementPreview(pieceId, centerR, centerC) {
        this.clearMovementPreview();
        if (!Number.isInteger(centerR) || !Number.isInteger(centerC)) return;
        const boardEl = document.getElementById("chess-board");
        if (!boardEl) return;

        const totalRows = (this.chess && this.chess.rows) ? this.chess.rows : (this.tft ? this.tft.getStageConfig().rows : 6);
        const totalCols = (this.chess && this.chess.cols) ? this.chess.cols : (this.tft ? this.tft.getStageConfig().cols : 5);

        const r0 = centerR;
        const c0 = centerC;

        const grid = this.getPieceMovementGrid(pieceId);
        // grid is 5x5, center is (2,2)
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (dr === 0 && dc === 0) continue;
                const type = grid[dr + 2][dc + 2];
                if (!type) continue;

                const tr = r0 + dr;
                const tc = c0 + dc;
                if (tr >= 0 && tr < totalRows && tc >= 0 && tc < totalCols) {
                    let cellEl = boardEl.querySelector(`.board-cell[data-row='${tr}'][data-col='${tc}']`);
                    if (!cellEl) {
                        const cellIdx = tr * totalCols + tc;
                        cellEl = boardEl.children[cellIdx];
                    }
                    if (cellEl) {
                        if (type === "attack" || type === "pawn-atk" || type === "cannon") {
                            cellEl.classList.add("cell-preview-attack");
                        } else {
                            cellEl.classList.add("cell-preview-move");
                        }
                    }
                }
            }
        }
    }

    highlightCombatPieceHover(r, c) {
        this.clearMovementPreview();
        if (!this.chess) return;
        const boardEl = document.getElementById("chess-board");
        if (!boardEl) return;

        const piece = this.chess.board[r] && this.chess.board[r][c];
        if (!piece) return;

        // Use real engine actions for the hovered piece (both player and enemy)
        const actions = this.chess.getPieceActions(r, c, true);
        if (actions && actions.length > 0) {
            actions.forEach(act => {
                const cellEl = boardEl.querySelector(`.board-cell[data-row='${act.toR}'][data-col='${act.toC}']`);
                if (cellEl) {
                    if (act.type === "ranged" || act.type === "melee" || act.type === "pawn-capture" || act.type === "cannon-fire") {
                        cellEl.classList.add("cell-preview-attack");
                    } else {
                        cellEl.classList.add("cell-preview-move");
                    }
                }
            });
        } else {
            // Show theoretical movement range if temporarily blocked or in opening grace
            this.highlightPieceMovementPreview(piece.id, r, c);
        }
    }

    clearMovementPreview() {
        const boardEl = document.getElementById("chess-board");
        if (!boardEl) return;
        const activeMoves = boardEl.querySelectorAll(".cell-preview-move, .cell-preview-attack");
        activeMoves.forEach(el => {
            el.classList.remove("cell-preview-move", "cell-preview-attack");
        });
    }

}

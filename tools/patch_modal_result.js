const fs = require('fs');
const path = require('path');

function patchFile(relPath) {
    const fullPath = path.join(__dirname, '..', relPath);
    let code = fs.readFileSync(fullPath, 'utf8');

    const startIndex = code.indexOf('if (this.isSkirmishMode) {');
    if (startIndex === -1) {
        console.log(`[SKIP] not found in ${relPath}`);
        return;
    }

    const modalRemoveStr = 'modal.classList.remove("hidden");';
    const removeIndex = code.indexOf(modalRemoveStr, startIndex);
    if (removeIndex === -1) {
        console.log(`[SKIP] modal remove not found in ${relPath}`);
        return;
    }

    const returnIndex = code.indexOf('return;', removeIndex);
    const endIndex = code.indexOf('}', returnIndex) + 1;

    const oldBlock = code.substring(startIndex, endIndex);

    const newBlock = `if (this.isSkirmishMode) {
            this.clearRoundResultCountdown();
            const skirmishCtrl = this.app?.skirmishController;
            const playerClock = (skirmishCtrl?.playerClock ?? this.app?.playerClock ?? 0);
            const enemyClock = (skirmishCtrl?.enemyClock ?? this.app?.enemyClock ?? 0);
            const chessEng = this.app?.chess ?? skirmishCtrl?.chess ?? this.chess;
            const isSpectator = this.isSkirmishSpectator;

            let whiteDisplayName = "Bot Trắng";
            let blackDisplayName = "Bot Đen";
            const p1NameEl = document.getElementById("h2h-p1-name");
            const p2NameEl = document.getElementById("h2h-p2-name");
            if (p1NameEl && p1NameEl.textContent) {
                whiteDisplayName = p1NameEl.textContent.replace(/^🤖\\s*/, '').trim();
            }
            if (p2NameEl && p2NameEl.textContent) {
                blackDisplayName = p2NameEl.textContent.replace(/^🤖\\s*/, '').trim();
            }

            if (isSpectator) {
                if (res.winner === "player") {
                    titleEl.textContent = \`👑 \${whiteDisplayName.toUpperCase()} CHIẾN THẮNG!\`;
                    titleEl.className = "modal-title text-win";
                } else if (res.winner === "enemy") {
                    titleEl.textContent = \`👑 \${blackDisplayName.toUpperCase()} CHIẾN THẮNG!\`;
                    titleEl.className = "modal-title text-win";
                } else {
                    titleEl.textContent = "⚖️ HÒA CỜ CHIẾN THUẬT!";
                    titleEl.className = "modal-title";
                }
                reasonEl.textContent = \`\${res.reasonLabel || "Ván đấu kết thúc"} • \${whiteDisplayName}: \${res.playerPiecesLeft || 0} quân • \${blackDisplayName}: \${res.enemyPiecesLeft || 0} quân\`;
            } else {
                if (res.winner === "player") {
                    titleEl.textContent = "🏆 CHIẾN THẮNG TUYỆT ĐỐI!";
                    titleEl.className = "modal-title text-win";
                } else if (res.winner === "enemy") {
                    titleEl.textContent = "💀 THẤT BẠI TRONG ĐẤU TRÍ!";
                    titleEl.className = "modal-title text-loss";
                } else {
                    titleEl.textContent = "⚖️ HÒA CỜ CHIẾN THUẬT!";
                    titleEl.className = "modal-title";
                }
                reasonEl.textContent = \`\${res.reasonLabel || "Ván đấu kết thúc"} • Bạn còn: \${res.playerPiecesLeft || 0} quân • Đối thủ còn: \${res.enemyPiecesLeft || 0} quân\`;
            }

            const timerEl = document.getElementById("round-result-timer");
            if (timerEl) timerEl.textContent = isSpectator ? "🎙️ Trận Đấu Giữa 2 Bot Đã Hoàn Tất" : "⚔️ Đấu Trí 1v1: Thách Đấu Kỳ Thủ AI";
            const sectionTitleEl = modal ? modal.querySelector(".panel-section-title") : null;
            if (sectionTitleEl) sectionTitleEl.textContent = "📊 Chi Tiết Giao Tranh Cờ Chớp 1v1";

            const pClockVal = (typeof playerClock === 'number') ? playerClock.toFixed(1) : "0.0";
            const eClockVal = (typeof enemyClock === 'number') ? enemyClock.toFixed(1) : "0.0";

            logsEl.innerHTML = \`
                <div style="background: rgba(0,0,0,0.5); padding: 12px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.3); text-align: left;">
                    <div style="font-size: 0.85rem; color: #fbbf24; font-weight: 700; margin-bottom: 6px;">📊 Thống kê trận đấu:</div>
                    <div style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.7;">
                        • Tổng số lượt đi: <strong>\${chessEng ? chessEng.turnCount : 0} nước</strong><br>
                        • Đồng hồ còn lại: <strong>\${isSpectator ? whiteDisplayName : "Bạn"}: \${pClockVal}s</strong> • <strong>\${isSpectator ? blackDisplayName : "Đối thủ"}: \${eClockVal}s</strong><br>
                        • Kết quả phân định: <strong style="color:#38bdf8;">\${res.reasonLabel || "Chiếu hết / Đoạt Vua"}</strong>
                    </div>
                </div>
            \`;

            const btnNext = document.getElementById("btn-next-round");
            const btnSpec = document.getElementById("btn-spectate-other-boards");
            if (btnSpec) {
                btnSpec.textContent = isSpectator ? "🏠 Quay Lại Phòng Chờ" : "🛠️ Đổi Đội Hình & Map";
                btnSpec.onclick = () => {
                    modal.classList.add("hidden");
                    if (isSpectator) {
                        (this.app?.waitingRoomController || this.app).renderWaitingRoom?.();
                    } else {
                        (this.app || window.app).showScreen?.("lobby");
                        (skirmishCtrl || this.app || window.app).openSkirmishBuilderModal?.();
                    }
                };
            }
            if (btnNext) {
                btnNext.textContent = isSpectator ? "🔄 Xem Trận Đấu Mới" : "🔄 Tái Đấu Ngay";
                btnNext.onclick = () => {
                    modal.classList.add("hidden");
                    if (this.app?.isOnlineSkirmish && (this.app?.currentRoom || skirmishCtrl?.currentRoom)) {
                        (this.app?.waitingRoomController || this.app).renderWaitingRoom?.();
                    } else {
                        (skirmishCtrl || this.app || window.app).startSkirmishBattle?.();
                    }
                };
            }

            modal.classList.remove("hidden");
            return;
        }`;

    code = code.replace(oldBlock, newBlock);
    fs.writeFileSync(fullPath, code, 'utf8');
    console.log(`[SUCCESS] Patched ${relPath}`);
}

patchFile('js/ui/ModalController.js');
patchFile('js/main.legacy.js');

const fs = require('fs');
const path = require('path');

function patch(relPath) {
    const full = path.join(__dirname, '..', relPath);
    let code = fs.readFileSync(full, 'utf8');

    const oldStr = `if (this.isSkirmishMode) {\n            this.renderAll();\n            this.renderDpsMeter();\n            setTimeout(() => {\n                this.showRoundResultModal(res);\n            }, 450);\n            return;\n        }`;
    const oldStrCRLF = `if (this.isSkirmishMode) {\r\n            this.renderAll();\r\n            this.renderDpsMeter();\r\n            setTimeout(() => {\r\n                this.showRoundResultModal(res);\r\n            }, 450);\r\n            return;\r\n        }`;

    const newStr = `if (this.isSkirmishMode) {
            const pb = document.getElementById("phase-banner");
            if (pb) {
                const p1El = document.getElementById("h2h-p1-name");
                const p2El = document.getElementById("h2h-p2-name");
                const wName = (p1El?.textContent || "Bot Trắng").replace(/^🤖\\s*/, '').trim().toUpperCase();
                const bName = (p2El?.textContent || "Bot Đen").replace(/^🤖\\s*/, '').trim().toUpperCase();
                const winnerText = res.winner === "player" ? \`\${wName} CHIẾN THẮNG\` : (res.winner === "enemy" ? \`\${bName} CHIẾN THẮNG\` : "HÒA CỜ");
                pb.textContent = \`🏁 VÁN ĐẤU KẾT THÚC: \${winnerText} (\${res.reasonLabel || "Chiếu hết"})\`;
                pb.className = "phase-banner phase-combat";
            }
            this.renderAll();
            this.renderDpsMeter();
            setTimeout(() => {
                this.showRoundResultModal(res);
            }, 450);
            return;
        }`;

    if (code.includes(oldStr)) {
        code = code.replace(oldStr, newStr);
        fs.writeFileSync(full, code, 'utf8');
        console.log(`[SUCCESS] Patched ${relPath} (LF)`);
    } else if (code.includes(oldStrCRLF)) {
        code = code.replace(oldStrCRLF, newStr);
        fs.writeFileSync(full, code, 'utf8');
        console.log(`[SUCCESS] Patched ${relPath} (CRLF)`);
    } else {
        console.log(`[SKIP] not found in ${relPath}`);
    }
}

patch('js/main.js');
patch('js/main.legacy.js');

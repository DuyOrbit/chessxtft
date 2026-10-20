const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'assets', 'pieces');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const PIECE_ART_SPECS = {
    king: {
        name: "Quốc Vương",
        bgStart: "#451a03", bgEnd: "#1e1b4b",
        glow: "#f59e0b",
        border: "#fbbf24",
        symbol: "♔",
        subIcon: "👑",
        title: "ROYAL KING",
        details: `<path d="M128 40 L140 70 L175 60 L160 95 L190 120 L150 135 L128 175 L106 135 L66 120 L96 95 L81 60 L116 70 Z" fill="url(#gradGold)" filter="url(#glow)"/>
                  <circle cx="128" cy="95" r="18" fill="#fef08a" opacity="0.9"/>
                  <path d="M128 75 L128 115 M108 95 L148 95" stroke="#78350f" stroke-width="6" stroke-linecap="round"/>`
    },
    shield_pawn: {
        name: "Tốt Khiên",
        bgStart: "#0f172a", bgEnd: "#1e293b",
        glow: "#60a5fa",
        border: "#94a3b8",
        symbol: "♙",
        subIcon: "🛡️",
        title: "SHIELD PAWN",
        details: `<path d="M78 60 Q128 40 178 60 Q188 130 128 190 Q68 130 78 60 Z" fill="url(#gradSteel)" stroke="#94a3b8" stroke-width="6" filter="url(#glow)"/>
                  <path d="M98 75 Q128 60 158 75 Q164 125 128 168 Q92 125 98 75 Z" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
                  <circle cx="128" cy="115" r="14" fill="#38bdf8" filter="url(#glow)"/>`
    },
    mercenary: {
        name: "Lính Đánh Thuê",
        bgStart: "#14532d", bgEnd: "#0f172a",
        glow: "#22c55e",
        border: "#4ade80",
        symbol: "⚔️",
        subIcon: "🪙",
        title: "MERCENARY",
        details: `<path d="M70 70 L186 186 M186 70 L70 186" stroke="#4ade80" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>
                  <circle cx="128" cy="128" r="28" fill="#eab308" stroke="#fef08a" stroke-width="4"/>
                  <text x="128" y="137" font-size="26" font-family="sans-serif" font-weight="900" text-anchor="middle" fill="#713f12">🪙</text>`
    },
    fire_mage: {
        name: "Phù Thủy Lửa",
        bgStart: "#7c2d12", bgEnd: "#1e1b4b",
        glow: "#f97316",
        border: "#fb923c",
        symbol: "🔥",
        subIcon: "🔮",
        title: "FIRE MAGE",
        details: `<path d="M128 35 Q175 85 155 130 Q185 120 165 175 Q128 200 91 175 Q65 135 105 120 Q85 75 128 35 Z" fill="url(#gradFire)" filter="url(#glow)"/>
                  <circle cx="128" cy="135" r="18" fill="#fef08a" filter="url(#glow)"/>
                  <circle cx="128" cy="135" r="8" fill="#ffffff"/>`
    },
    archer: {
        name: "Cung Thủ",
        bgStart: "#064e3b", bgEnd: "#0f172a",
        glow: "#10b981",
        border: "#34d399",
        symbol: "🏹",
        subIcon: "🎯",
        title: "RANGER ARCHER",
        details: `<path d="M80 60 Q150 128 80 196" fill="none" stroke="#34d399" stroke-width="10" stroke-linecap="round" filter="url(#glow)"/>
                  <path d="M80 60 L80 196" stroke="#f0fdf4" stroke-width="3" stroke-dasharray="6,4"/>
                  <path d="M65 128 L195 128 M195 128 L170 115 M195 128 L170 141" stroke="#fbbf24" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>`
    },
    knight: {
        name: "Mã Đột Kích",
        bgStart: "#1e1b4b", bgEnd: "#0f172a",
        glow: "#3b82f6",
        border: "#60a5fa",
        symbol: "♘",
        subIcon: "⚡",
        title: "BLITZ KNIGHT",
        details: `<path d="M90 190 Q90 130 110 95 Q100 80 115 50 Q130 50 145 65 Q175 75 180 100 Q165 105 150 95 Q165 130 170 190 Z" fill="url(#gradKnight)" stroke="#93c5fd" stroke-width="5" filter="url(#glow)"/>
                  <path d="M125 105 L150 120 L135 135 L160 160" stroke="#facc15" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>`
    },
    frost_knight: {
        name: "Kỵ Sĩ Băng",
        bgStart: "#0c4a6e", bgEnd: "#082f49",
        glow: "#38bdf8",
        border: "#7dd3fc",
        symbol: "🧊",
        subIcon: "❄️",
        title: "FROST KNIGHT",
        details: `<path d="M90 190 Q90 130 110 95 Q100 80 115 50 Q130 50 145 65 Q175 75 180 100 Q165 105 150 95 Q165 130 170 190 Z" fill="url(#gradFrost)" stroke="#bae6fd" stroke-width="6" filter="url(#glow)"/>
                  <path d="M128 45 L128 95 M103 70 L153 70 M110 52 L146 88 M110 88 L146 52" stroke="#ffffff" stroke-width="4" stroke-linecap="round" filter="url(#glow)"/>`
    },
    pyro_bishop: {
        name: "Tượng Hỏa Pháp",
        bgStart: "#7c2d12", bgEnd: "#431407",
        glow: "#ea580c",
        border: "#fb923c",
        symbol: "♗",
        subIcon: "🔥",
        title: "PYRO BISHOP",
        details: `<path d="M128 40 Q168 70 168 120 Q168 160 148 185 L108 185 Q88 160 88 120 Q88 70 128 40 Z" fill="url(#gradFire)" stroke="#fdba74" stroke-width="6" filter="url(#glow)"/>
                  <circle cx="128" cy="35" r="10" fill="#fef08a" filter="url(#glow)"/>
                  <path d="M128 75 L128 145 M108 100 L148 100" stroke="#451a03" stroke-width="6" stroke-linecap="round"/>`
    },
    juggernaut: {
        name: "Thiết Giáp Khổng Lồ",
        bgStart: "#1c1917", bgEnd: "#0c0a09",
        glow: "#a8a29e",
        border: "#d6d3d1",
        symbol: "🗿",
        subIcon: "🛡️",
        title: "JUGGERNAUT",
        details: `<rect x="75" y="65" width="106" height="120" rx="16" fill="url(#gradSteel)" stroke="#e7e5e4" stroke-width="7" filter="url(#glow)"/>
                  <rect x="95" y="85" width="66" height="20" rx="6" fill="#0369a1" filter="url(#glow)"/>
                  <path d="M75 125 L181 125 M128 65 L128 185" stroke="#44403c" stroke-width="5"/>
                  <circle cx="128" cy="155" r="14" fill="#0284c7" filter="url(#glow)"/>`
    },
    cannon: {
        name: "Pháo Công Thành",
        bgStart: "#451a03", bgEnd: "#18181b",
        glow: "#f97316",
        border: "#fb923c",
        symbol: "💣",
        subIcon: "💥",
        title: "SIEGE CANNON",
        details: `<path d="M60 145 L170 85 L185 110 L75 170 Z" fill="url(#gradSteel)" stroke="#f97316" stroke-width="5" filter="url(#glow)"/>
                  <circle cx="100" cy="165" r="28" fill="#27272a" stroke="#fbbf24" stroke-width="6"/>
                  <circle cx="100" cy="165" r="10" fill="#f59e0b"/>
                  <circle cx="195" cy="85" r="18" fill="#ef4444" filter="url(#glow)"/>`
    },
    frost_rook: {
        name: "Xe Băng Giá",
        bgStart: "#0369a1", bgEnd: "#082f49",
        glow: "#38bdf8",
        border: "#7dd3fc",
        symbol: "♖",
        subIcon: "❄️",
        title: "FROST ROOK",
        details: `<path d="M80 65 L95 65 L95 85 L115 85 L115 65 L141 65 L141 85 L161 85 L161 65 L176 65 L170 185 L86 185 Z" fill="url(#gradFrost)" stroke="#e0f2fe" stroke-width="6" filter="url(#glow)"/>
                  <rect x="110" y="115" width="36" height="50" rx="18" fill="#0c4a6e" stroke="#38bdf8" stroke-width="4"/>`
    },
    grand_queen: {
        name: "Hậu Tối Thượng",
        bgStart: "#581c87", bgEnd: "#1e1b4b",
        glow: "#c084fc",
        border: "#fbbf24",
        symbol: "♕",
        subIcon: "👑",
        title: "GRAND QUEEN",
        details: `<path d="M72 80 L90 175 L166 175 L184 80 L148 115 L128 65 L108 115 Z" fill="url(#gradGold)" stroke="#fef08a" stroke-width="6" filter="url(#glow)"/>
                  <circle cx="72" cy="75" r="8" fill="#f43f5e" filter="url(#glow)"/>
                  <circle cx="128" cy="60" r="10" fill="#38bdf8" filter="url(#glow)"/>
                  <circle cx="184" cy="75" r="8" fill="#f43f5e" filter="url(#glow)"/>
                  <circle cx="128" cy="140" r="16" fill="#a855f7" stroke="#ffffff" stroke-width="3" filter="url(#glow)"/>`
    },
    chancellor: {
        name: "Đại Thừa Tướng",
        bgStart: "#831843", bgEnd: "#3b0764",
        glow: "#f43f5e",
        border: "#fbbf24",
        symbol: "🐉",
        subIcon: "👑",
        title: "CHANCELLOR",
        details: `<path d="M70 70 L128 40 L186 70 L176 160 L128 190 L80 160 Z" fill="url(#gradGold)" stroke="#fde047" stroke-width="6" filter="url(#glow)"/>
                  <path d="M95 105 Q128 75 161 105 Q145 150 128 165 Q111 150 95 105 Z" fill="#831843" stroke="#f43f5e" stroke-width="4"/>
                  <text x="128" y="145" font-size="34" text-anchor="middle" filter="url(#glow)">🐉</text>`
    },
    gambler: {
        name: "Con Bạc Gian Lận",
        bgStart: "#4c0519", bgEnd: "#18181b",
        glow: "#fb7185",
        border: "#f43f5e",
        symbol: "🃏",
        subIcon: "🎲",
        title: "GAMBLER",
        details: `<rect x="85" y="65" width="60" height="90" rx="8" transform="rotate(-15 115 110)" fill="#f1f5f9" stroke="#e11d48" stroke-width="4"/>
                  <rect x="110" y="65" width="60" height="90" rx="8" transform="rotate(15 140 110)" fill="#f8fafc" stroke="#2563eb" stroke-width="4"/>
                  <circle cx="128" cy="155" r="22" fill="#fbbf24" stroke="#78350f" stroke-width="3"/>
                  <text x="128" y="163" font-size="22" text-anchor="middle">🎲</text>`
    },
    corsair: {
        name: "Thuyền Trưởng Hải Tặc",
        bgStart: "#1c1917", bgEnd: "#450a0a",
        glow: "#f59e0b",
        border: "#fbbf24",
        symbol: "🏴‍☠️",
        subIcon: "🦜",
        title: "CORSAIR",
        details: `<path d="M70 100 Q128 60 186 100 L166 125 Q128 105 90 125 Z" fill="#09090b" stroke="#fbbf24" stroke-width="5" filter="url(#glow)"/>
                  <circle cx="128" cy="145" r="26" fill="#18181b" stroke="#ef4444" stroke-width="4"/>
                  <path d="M110 135 L146 155 M146 135 L110 155" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>`
    }
};

for (const [id, spec] of Object.entries(PIECE_ART_SPECS)) {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="${spec.bgStart}" />
      <stop offset="100%" stop-color="${spec.bgEnd}" />
    </radialGradient>
    
    <!-- Shaders & Metallic Gradients -->
    <linearGradient id="gradGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#eab308" />
      <stop offset="100%" stop-color="#854d0e" />
    </linearGradient>

    <linearGradient id="gradFire" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="40%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#b91c1c" />
    </linearGradient>

    <linearGradient id="gradFrost" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f0f9ff" />
      <stop offset="50%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>

    <linearGradient id="gradSteel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="50%" stop-color="#94a3b8" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>

    <linearGradient id="gradKnight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#93c5fd" />
      <stop offset="60%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>

    <!-- Outer Glow Filter -->
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- Holographic Shine Filter -->
    <linearGradient id="foilShine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.4)" />
      <stop offset="50%" stop-color="rgba(255,255,255,0.0)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.2)" />
    </linearGradient>
  </defs>

  <!-- Background Base -->
  <rect width="256" height="256" rx="28" fill="url(#bgGrad)" />

  <!-- Outer Arena Frame -->
  <rect x="8" y="8" width="240" height="240" rx="22" fill="none" stroke="${spec.border}" stroke-width="4" opacity="0.85" />
  <rect x="14" y="14" width="228" height="228" rx="18" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />

  <!-- Themed Halo Behind Character -->
  <circle cx="128" cy="120" r="76" fill="${spec.glow}" opacity="0.18" filter="url(#glow)" />
  <circle cx="128" cy="120" r="54" fill="none" stroke="${spec.glow}" stroke-width="1.5" stroke-dasharray="4,6" opacity="0.45" />

  <!-- Hero Art Illustration -->
  <g transform="translate(0, -6)">
    ${spec.details}
  </g>

  <!-- Title & Symbol Badges -->
  <g transform="translate(0, 198)">
    <!-- Plate -->
    <rect x="24" y="0" width="208" height="38" rx="8" fill="rgba(15, 23, 42, 0.85)" stroke="${spec.border}" stroke-width="1.5" />
    <!-- Text -->
    <text x="128" y="24" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="14" fill="#ffffff" letter-spacing="1.5" text-anchor="middle">${spec.name.toUpperCase()}</text>
  </g>

  <!-- Top Corner Class Crest -->
  <circle cx="40" cy="40" r="18" fill="rgba(15, 23, 42, 0.88)" stroke="${spec.border}" stroke-width="2" />
  <text x="40" y="47" font-size="18" text-anchor="middle">${spec.subIcon}</text>

  <!-- Subtle Foil Reflection Layer -->
  <rect width="256" height="256" rx="28" fill="url(#foilShine)" pointer-events="none" />
</svg>`;

    const filePath = path.join(outDir, `${id}.svg`);
    fs.writeFileSync(filePath, svgContent, 'utf8');
    console.log(`Generated SVG Art for: ${id} -> ${filePath}`);
}

console.log('All 15 + King SVG piece artworks successfully generated!');

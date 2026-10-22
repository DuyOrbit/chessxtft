const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'assets', 'pieces');

// Palette PICO-8 / NES
const P = {
    _: 'none',
    K: '#111116', // Black outline
    W: '#ffffff', // White
    S: '#c2c3c7', // Silver/Grey
    D: '#5f574f', // Dark Grey
    Y: '#ffec27', // Bright Yellow
    O: '#ffa300', // Gold / Orange
    R: '#ff004d', // Red / Crimson
    DR: '#7e2553', // Dark Red
    B: '#29adff', // Cyan / Light Blue
    DB: '#1d2b53', // Navy Blue
    G: '#00e436', // Green
    DG: '#008751', // Dark Green
    SK: '#ffccaa', // Skin tone
    DSK: '#d49b7b', // Dark skin
    BR: '#8b4513', // Brown
    DBR: '#4a2508', // Dark Brown
    P: '#c259ff', // Purple
    DP: '#581845', // Dark Purple
    ICE: '#e0f7fa', // Ice white
    DICE: '#00bcd4'  // Dark ice
};

// Helper: converts a string grid (32 rows x 32 cols) into SVG rects
function gridToSVG(name, rows) {
    let rects = '';
    for (let y = 0; y < rows.length; y++) {
        const row = rows[y];
        for (let x = 0; x < row.length; x++) {
            const char = row[x];
            if (P[char] && P[char] !== 'none') {
                rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${P[char]}"/>`;
            }
        }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="256" height="256" shape-rendering="crispEdges">
  <defs>
    <style>
      rect { shape-rendering: crispEdges; }
    </style>
  </defs>
  <!-- Background Badge (Dark 8-bit stone base) -->
  <rect x="1" y="1" width="30" height="30" rx="4" fill="#131722" stroke="#2c354d" stroke-width="1"/>
  <!-- 8-Bit Pixel Character -->
  <g transform="translate(4, 3)">
    ${rects}
  </g>
</svg>`;
}

// 24x24 character templates centered inside 32x32 badge
// 1. KING (Quốc Vương): Golden crown, beard, royal blue robe, holding scepter
const kingGrid = [
    "________KKKK________",
    "_______KYOYOK_______",
    "______KYOYOYOK______",
    "______KYYYYYYK______",
    "______KKSKSKSK______",
    "_____KSKSKSKSKK_____",
    "_____KSKDKKDKSK_____",
    "_____KSDSKKSDSK_____",
    "_____KDBRDBRBRK_____",
    "____KDBRDBRBRBRK____",
    "____KWWDBRBRWWK____W",
    "___KDBWWWWWWDBK___KY",
    "___KDBWWYYWWDBK__KYK",
    "___KDBBBYYBBBDBK_KYK",
    "___KDBBBYYBBBDBKKKYK",
    "____KDBBYYBBDBK_KDKK",
    "____KDBBWWBBDBK__KDK",
    "____KDBWWWWWBK___KDK",
    "____KDBBWWBBDBK__KDK",
    "____KDBBWWBBDBK__KDK",
    "_____KDBBBBBDBK__KDK",
    "_____KDBRKKRDBK__KDK",
    "_____KDBRKKRDBK__KDK",
    "______KKK__KKK____KK"
];

// 2. GRAND QUEEN (Hậu Tối Thượng): Royal purple gown, golden tiara, starry wand
const queenGrid = [
    "________KKKK________",
    "_______KYPYPK_______",
    "______KYPYPYPK______",
    "______KYYYYYYK______",
    "______KKSKSKSK______",
    "_____KSKSKSKSKK_____",
    "_____KSKDKKDKSK_____",
    "_____KSDSKKSDSK_____",
    "_____KSKSKSSSKK____P",
    "____KDPSSSSSPSDK__KP",
    "____KPWWWWWWWPDK_KPK",
    "___KDPWWYYWWPDK__KPK",
    "___KDPPPYYPPPDK_KPPK",
    "___KDPPPYYPPPDKKKPPK",
    "____KDPPYYPPDK__KDKK",
    "____KDPPWWPPDK___KDK",
    "____KDPWWWWWPDK__KDK",
    "____KDPPWWPPDK___KDK",
    "____KDPPWWPPDK___KDK",
    "___KDPPPPPPPPDK__KDK",
    "___KDPPPPPPPPDK__KDK",
    "___KDPPDDDDDPDK__KDK",
    "____KDDDKKKDDDK__KDK",
    "_____KKK___KKK____KK"
];

// 3. SHIELD PAWN (Tốt Khiên): Iron pot helmet, wooden shield, short sword
const pawnGrid = [
    "________KKKK________",
    "_______KSSSSK_______",
    "______KSSSSSSK______",
    "_____KSSSSSSSSK_____",
    "_____KSSSSSSSSK_____",
    "_____KKKKKKKKKK_____",
    "______KSKSKSKK______",
    "______KDKKDKSK______",
    "______KSDSKDDK______",
    "______KSSSSSKK______",
    "_____KDSSSSSDK______",
    "____KDBRWWBRRDK_____",
    "__KKDBRBRBRBRDKKK___",
    "_KBRKDBRBRBRDKKSSK__",
    "KBRBRKDBRBRDKKSSSKK_",
    "KBRBRKDBRBRDKKSSSSK_",
    "KBRBRKDDDDDDKKSSSKK_",
    "KBRBRKDSSSSDDKKSSK__",
    "_KBRKDDSSSSDDKKKK___",
    "__KKKDSSSSDDK__KWK__",
    "_____KDDDDDDK__KWK__",
    "_____KDBKKBDK__KWK__",
    "_____KDBKKBDK___KK__",
    "______KK__KK________"
];

// 4. FROST ROOK (Xe Băng Giá): Stone battlements with frost runes & glowing eyes
const frostRookGrid = [
    "___KKK_KKK_KKK_KKK__",
    "___KBK_KBK_KBK_KBK__",
    "___KBKKKBKKKBKKBK___",
    "___KBBBBBBBBBBBBK___",
    "___KBBBBBBBBBBBBK___",
    "____KBBBBBBBBBBK____",
    "____KBBWWBBWWBBK____",
    "____KBBWKBWWKBKK____",
    "____KBBKKBBKKBBK____",
    "____KBBBBBBBBBBK____",
    "____KBBWBBBBWBBK____",
    "____KBBWBBBBWBBK____",
    "____KBBBBWWBBBBK____",
    "____KBBBBWWBBBBK____",
    "____KBBBBBBBBBBK____",
    "____KBBBBBBBBBBK____",
    "____KBBWWWWWWBBK____",
    "____KBBWKKKKWBBK____",
    "____KBBWKKKKWBBK____",
    "____KBBWKKKKWBBK____",
    "____KBBWKKKKWBBK____",
    "___KBBBWKKKKWBBBK___",
    "__KBBBBWKKKKWBBBBK__",
    "__KKKKKKKKKKKKKKKK__"
];

// 5. JUGGERNAUT (Thiết Giáp Khổng Lồ): Ironclad behemoth with glowing horned visor
const juggernautGrid = [
    "_____KK______KK_____",
    "____KDKK____KKDK____",
    "____KDDKKKKKKDDK____",
    "____KDDSSSSSSDDK____",
    "____KSSSSSSSSSSK____",
    "____KSSKKKKKKSSK____",
    "____KSSKRRRRKSSK____",
    "____KSSKRRRRKSSK____",
    "____KSSKKKKKKSSK____",
    "____KSSSSSSSSSSK____",
    "___KKSSSSSSSSSSKK___",
    "__KDDSSSSSSSSSSDD_K_",
    "_KDDKSSSSSSSSSSKDDK_",
    "_KDDKSSKKKKKKSSKDDK_",
    "_KDDSSSKKKKKKSSSDDK_",
    "_KDDSSSSSSSSSSSSDDDK",
    "_KDDSSSSSSSSSSSSDDDK",
    "__KKSSSSSSSSSSSSKK__",
    "___KDDDSSSSSDDDDK___",
    "___KDDDSSSSSDDDDK___",
    "___KDDDSSSSSDDDDK___",
    "___KDDDKKKKKDDDDDK__",
    "___KDDKK___KKDDDKK__",
    "____KK_______KK_____"
];

// 6. KNIGHT (Mã Đột Kích): Armored knight riding brown warhorse
const knightGrid = [
    "________KKKK________",
    "_______KSSSSK_______",
    "______KSSSSSSK______",
    "______KRRSSSSSK_____",
    "______KRRSSDKSK_____",
    "______KSSSSSDDK_____",
    "______KDDSSSDDK_____",
    "______KDDDDDDDK_____",
    "_______KDBRBRDK_____",
    "____KKKKDBRBRDKKK___",
    "___KBRBRKDBRDKKSSK__",
    "__KBRBRBRKKKK_KSSSK_",
    "_KBRBRKKBRBRK__KSSK_",
    "_KBRKK_KBRBRK___KKK_",
    "_KKK___KBRBRK___KWK_",
    "_______KDBRDK___KWK_",
    "_______KDBRDK___KWK_",
    "_______KDBRDK___KK__",
    "_______KDBRDK_______",
    "______KDBKKRDK______",
    "______KDBKKRDK______",
    "______KDK__KDK______",
    "______KDK__KDK______",
    "_______KK___KK______"
];

// 7. FROST KNIGHT (Kỵ Sĩ Băng): Cyan-armored knight with ice spear
const frostKnightGrid = [
    "________KKKK________",
    "_______KBWWKB_______",
    "______KBBWWBK_______",
    "______KBBBBBBK______",
    "______KBBDKBBK______",
    "______KBBBBBBK______",
    "______KDDDDDDK______",
    "______KDDBBDDK______",
    "_______KDBBBDK______",
    "____KKKKDBBBDKKK____",
    "___KBBBKDBBBDKBBK___",
    "__KBBBBKDBBBDKBBK___",
    "_KBBBK_KDBBBDK_KKK__",
    "_KKKK__KDBBBDK__KBK_",
    "_______KDBBBDK__KBK_",
    "_______KDBBBDK__KBK_",
    "_______KDBBBDK__KBK_",
    "_______KDBBBDK__KK__",
    "_______KDBBBDK______",
    "______KDBKKBDK______",
    "______KDBKKBDK______",
    "______KBK__KBK______",
    "______KBK__KBK______",
    "_______KK___KK______"
];

// 8. MERCENARY (Lính Đánh Thuê): Hooded rogue with dual daggers
const mercenaryGrid = [
    "________KKKK________",
    "_______KDGDKK_______",
    "______KDGGDGGK______",
    "______KDGGDGGK______",
    "______KDGKKGGK______",
    "______KSKSSKSK______",
    "______KDKDKKSK______",
    "______KSDSKKSK______",
    "______KDGDDDDK______",
    "____KKKDGDDDDKKK____",
    "___KSKKDGDGGDDKSK___",
    "__KSKKKDGDGGDDKKSK__",
    "__KSKK_KDGDDDDK_KSK_",
    "__KWK__KDGDDDDK__KWK",
    "__KWK__KDGDDDDK__KWK",
    "__KWK__KDGDDDDK__KWK",
    "__KWK__KDBRBRDK__KWK",
    "___KK__KDBRBRDK___KK",
    "_______KDBRBRDK_____",
    "______KDBRKKRDK_____",
    "______KDBRKKRDK_____",
    "______KDBK_KBDK_____",
    "______KDK___KDK_____",
    "_______KK___KK______"
];

// 9. FIRE MAGE (Phù Thủy Lửa): Wizard hat, robes, dual floating fireballs
const fireMageGrid = [
    "________KKKK________",
    "_______KRRRRK_______",
    "______KRRRRRRK______",
    "_____KRRRRYRRRK_____",
    "____KRRRRRYYRRRK____",
    "___KKKKKKKKKKKKKK___",
    "______KSKSKSKSK_____",
    "______KSKDKKDKSK____",
    "______KSDSKKSDSK____",
    "_KK___KDRDRRDRDK___K",
    "KYRK_KDRDRRRDRDK_KRY",
    "KYYRKDRRRRRRRRRDKKYY",
    "_KYRKDRRRRYYRRRDKRYK",
    "_KK_KDRRRRYYRRRDKKK_",
    "____KDRRRRRRRRRDK___",
    "____KDRRRRRRRRRDK___",
    "____KDRRRRRRRRRDK___",
    "____KDRRRRRRRRRDK___",
    "____KDRRRRRRRRRDK___",
    "____KDRRRRRRRRRDK___",
    "____KDRRRRRRRRRDK___",
    "____KDRDDDDDDDRDK___",
    "_____KKKKKKKKKKK____",
    "____________________"
];

// 10. PYRO BISHOP (Tượng Hỏa Pháp): Red/gold robes channeling sun staff
const pyroBishopGrid = [
    "________KKKK________",
    "_______KYRYRK_______",
    "______KYRYRYRK______",
    "______KYRYRYRK______",
    "______KYYYYYYK______",
    "______KKSKSKSK______",
    "_____KSKSKSKSKK_____",
    "_____KSKDKKDKSK_____",
    "_____KSDSKKSDSK_____",
    "_____KDRDRRDRDK____K",
    "____KDRRRRRRRDK___KY",
    "____KDRRRYYRRDK__KYK",
    "___KDRRRRYYRRRDKKYYK",
    "___KDRRRRYYRRRDK_KYK",
    "____KDRRRYYRRDK__KDK",
    "____KDRRRRRRRDK__KDK",
    "____KDRRRRRRRDK__KDK",
    "____KDRRRRRRRDK__KDK",
    "____KDRRRRRRRDK__KDK",
    "____KDRRRRRRRDK__KDK",
    "____KDRRRRRRRDK__KDK",
    "____KDRDDDDDDDK__KDK",
    "_____KKKKKKKKK____KK",
    "____________________"
];

// 11. ARCHER (Cung Thủ): Green tunic, feather cap, wooden bow
const archerGrid = [
    "________KKKK________",
    "_______KDGDKK_______",
    "______KDGGDGGK______",
    "______KDGGDGGK______",
    "______KYYYYGGK______",
    "______KSKSKSKK______",
    "______KSKDKKSK______",
    "______KSDSKDDK______",
    "______KDGDDDDK______",
    "____KKKDGDDDDK______",
    "___KBRKDGDDDDK_KKKKK",
    "__KBRK_KDGDDDDKKYYYK",
    "_KBRK__KDGDDDDKKYYYK",
    "_KBRK__KDGDDDDK_KKKK",
    "_KBRK__KDGDDDDK_____",
    "_KBRK__KDBRBRDK_____",
    "_KBRK__KDBRBRDK_____",
    "__KBRK_KDBRBRDK_____",
    "___KKK_KDBRBRDK_____",
    "______KDBRKKRDK_____",
    "______KDBRKKRDK_____",
    "______KDBK_KBDK_____",
    "______KDK___KDK_____",
    "_______KK___KK______"
];

// 12. CANNON (Pháo Công Thành): Iron cannon on wooden wheels with red fuse
const cannonGrid = [
    "____________________",
    "_________RR_________",
    "________RYR_________",
    "________KK__________",
    "_______KSSK_________",
    "______KSSSSK________",
    "_____KSSSSSSK_______",
    "____KSSSSSSSSK______",
    "___KSSSSSSSSSSK_____",
    "__KSSSSSSSSSSSSK____",
    "_KSSSSSSSSSSSSSSK___",
    "_KSSSSSSSSSSSSSSK___",
    "__KSSSSSSSSSSSSK____",
    "___KSSSSSSSSSSK_____",
    "____KKSSSSSSKK______",
    "______KKKKKK________",
    "____KDBRBRBRDK______",
    "___KDBRBRBRBRDK_____",
    "__KDBRKKKKKKRBDK____",
    "__KDBKSSSSSSKBDK____",
    "__KDBKSSSSSSKBDK____",
    "__KDBRKKKKKKRBDK____",
    "___KDBRBRBRBRDK_____",
    "____KKKKKKKKKK______"
];

// 13. CORSAIR (Thuyền Trưởng Cướp Biển): Tricorn hat, eyepatch, cutlass
const corsairGrid = [
    "________KKKK________",
    "______KKDRDRKK______",
    "_____KDRDRDRDRK_____",
    "____KDRDRDRDRDRK____",
    "____KKKKKKKKKKKK____",
    "______KSKSKSKK______",
    "______KSKDKKSK______",
    "______KSDSKDDK______",
    "______KDBRBRDK______",
    "____KKKDRDRDRKKK____",
    "___KBRKDRDRDRK_KWK__",
    "__KBRK_KDRDRDRK_KWK_",
    "_KBRK__KDRDRDRK_KWK_",
    "_KBRK__KDRDRDRK_KWK_",
    "_KKK___KDRDRDRK__KK_",
    "_______KDBRBRDK_____",
    "_______KDBRBRDK_____",
    "_______KDBRBRDK_____",
    "_______KDBRBRDK_____",
    "______KDBRKKRDK_____",
    "______KDBRKKRDK_____",
    "______KDBK_KBDK_____",
    "______KDK___KDK_____",
    "_______KK___KK______"
];

// 14. GAMBLER (Đại Thừa Tướng): Turban, holding golden dice
const gamblerGrid = [
    "________KKKK________",
    "_______KYOYOK_______",
    "______KYOYOYOK______",
    "______KYOYOYOK______",
    "______KKSKSKSK______",
    "_____KSKSKSKSKK_____",
    "_____KSKDKKDKSK_____",
    "_____KSDSKKSDSK_____",
    "_____KDBRDBRBRK____K",
    "____KDBRDBRBRBRK__KW",
    "____KWWDBRBRWWK__KWK",
    "___KDBWWWWWWDBK_KWKK",
    "___KDBWWYYWWDBKKWKKK",
    "___KDBBBYYBBBDBKKKK_",
    "____KDBBYYBBDBK_____",
    "____KDBBWWBBDBK_____",
    "____KDBWWWWWBK______",
    "____KDBBWWBBDBK_____",
    "____KDBBWWBBDBK_____",
    "_____KDBBBBBDBK_____",
    "_____KDBRKKRDBK_____",
    "_____KDBRKKRDBK_____",
    "______KKK__KKK______",
    "____________________"
];

// 15. CHANCELLOR (Thần Xúc Xắc): Jester / Dice Mage
const chancellorGrid = [
    "_____KK______KK_____",
    "____KYPK____KPYK____",
    "____KYPYKKKKPYPK____",
    "____KYPYPYPYPYPK____",
    "_____KKKKKKKKKK_____",
    "______KSKSKSKK______",
    "______KSKDKKSK______",
    "______KSDSKDDK______",
    "______KYPYPYPK______",
    "____KKKYPYPYPKKK____",
    "___KWK_KYPYPYPK_KWK_",
    "__KWKK_KYPYPYPK_KWKK",
    "_KWKKK_KYPYPYPK_KWKK",
    "_KKKK__KYPYPYPK__KKK",
    "_______KYPYPYPK_____",
    "_______KYPYPYPK_____",
    "_______KYPYPYPK_____",
    "_______KDPDDDPK_____",
    "_______KDPDDDPK_____",
    "______KDPKKKPDK_____",
    "______KDPKKKPDK_____",
    "______KDK___KDK_____",
    "______KDK___KDK_____",
    "_______KK___KK______"
];

// 16. STONE GOLEM (Khổng Lồ Đá Tĩnh): Massive mossy stone boss with yellow eyes
const stoneGolemGrid = [
    "________KKKK________",
    "______KKDDDDDKK_____",
    "_____KDDGDDDDDK_____",
    "____KDDGGDDDDDDDK___",
    "___KDDDGDDDDDDGGDK__",
    "___KDDDDYYYYDDGGDK__",
    "___KDDDDKKKKDDGGDK__",
    "___KDDDDYYYYDDGGDK__",
    "___KDDDDDDDDDDDDDK__",
    "___KKDDDDDDDDDDKK___",
    "__KDDDDDDDDDDDDDDK__",
    "_KDDDGDDDDDDDDGGDKK_",
    "KDDKDGDDDDDDDDGGDKDK",
    "KDDKDDDDDDDDDDDDDKDK",
    "KDDKDDDDDDDDDDDDDKDK",
    "_KKKDDDDDDDDDDDDDKKK",
    "___KDDDDDDDDDDDDK___",
    "___KDDDDDDDDDDDDK___",
    "___KDDDGDDDDDDDDK___",
    "____KDDGDDDDDDDK____",
    "____KDDGKKKKDDDK____",
    "____KDDDK__KDDDK____",
    "____KDDDK__KDDDK____",
    "_____KKK____KKK_____"
];

// 17. STONE MINION (Tượng Quái Đá / Slime): Classic cute green 8-bit slime
const stoneMinionGrid = [
    "____________________",
    "____________________",
    "________KKKK________",
    "_______KGGGGK_______",
    "______KGGGGGGK______",
    "_____KGGGGGGGGK_____",
    "____KGGGGGGGGGGK____",
    "____KGGGGGGGGGGK____",
    "___KGGWKGWWKGGGGK___",
    "___KGGKKGWWKKGGGK___",
    "___KGGKKGKKKKGGGK___",
    "__KGGGGGGGGGGGGGGK__",
    "__KGGGGGGGGGGGGGGK__",
    "__KGGGGGGGGGGGGGGK__",
    "_KGGGGGGKKKKGGGGGGK_",
    "_KGGGGGKGKKGKKGGGGK_",
    "_KGGGGGGKKKKGGGGGGK_",
    "KGGGGGGGGGGGGGGGGGGK",
    "KGGGGGGGGGGGGGGGGGGK",
    "KGGGGGGGGGGGGGGGGGGK",
    "KGGGGGGGGGGGGGGGGGGK",
    "KGGGGGGGGGGGGGGGGGGK",
    "_KKKKKKKKKKKKKKKKKK_",
    "____________________"
];

const pieces = {
    king: kingGrid,
    grand_queen: queenGrid,
    shield_pawn: pawnGrid,
    frost_rook: frostRookGrid,
    juggernaut: juggernautGrid,
    knight: knightGrid,
    frost_knight: frostKnightGrid,
    mercenary: mercenaryGrid,
    fire_mage: fireMageGrid,
    pyro_bishop: pyroBishopGrid,
    archer: archerGrid,
    cannon: cannonGrid,
    corsair: corsairGrid,
    gambler: gamblerGrid,
    chancellor: chancellorGrid,
    stone_golem: stoneGolemGrid,
    stone_minion: stoneMinionGrid
};

let count = 0;
for (const [id, grid] of Object.entries(pieces)) {
    const svg = gridToSVG(id, grid);
    const filePath = path.join(targetDir, `${id}.svg`);
    fs.writeFileSync(filePath, svg, 'utf8');
    count++;
}

console.log(`✅ Đã tạo thành công ${count} file SVG thuần 8-bit chuẩn retro vào ${targetDir}!`);

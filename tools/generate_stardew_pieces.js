const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'assets', 'pieces');

// Stardew Valley Authentic Color Palette
const P = {
    _: 'none',
    K: '#241712', // Warm dark wood outline (Stardew dark brown/black)
    W: '#ffffff', // White / eye glint
    CR: '#fcedc7', // Cream / Parchment
    // Skin
    SK: '#fcd3a7', // Stardew skin tone
    DSK: '#d99f73', // Skin shadow
    // Hair & Wood
    HBR: '#733e1d', // Dark hair / brown
    LBR: '#b06d3b', // Light brown / wood
    WD: '#c98a4b', // Stardew oak wood
    DWD: '#875122', // Dark wood
    // Gold & Yellow
    Y: '#fcd116', // Gold / Crown
    DY: '#c49008', // Dark gold
    // Clothes
    RD: '#b52f25', // Stardew red vest / apple
    DRD: '#7a1913', // Dark red
    BL: '#32609e', // Denim overalls / blue
    DBL: '#1e385c', // Dark blue
    GR: '#58a832', // Junimo green / grass
    DGR: '#366d1b', // Dark green
    LGR: '#8ee65c', // Bright sprout green
    // Purple / Wizard
    P: '#7e469e', // Rasmodius purple
    DP: '#4e2366', // Dark purple
    LP: '#b275d9', // Light purple
    // Silver / Iron
    S: '#a8b5c2', // Pot helmet / iron
    DS: '#6c7782', // Dark iron
    // Straw / Scarecrow
    STR: '#f2c96d', // Straw hat yellow
    DSTR: '#ba8e34'  // Dark straw
};

function gridToSVG(id, name, rows) {
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
  <!-- Stardew Valley Warm Wood Token Base -->
  <rect x="2" y="2" width="28" height="28" rx="5" fill="#f6ecd2" stroke="#9e6634" stroke-width="2"/>
  <rect x="4" y="4" width="24" height="24" rx="3" fill="#e8d5b0"/>
  <!-- Character Sprite -->
  <g transform="translate(4, 4)">
    ${rects}
  </g>
</svg>`;
}

// 24x24 Stardew Valley Character Grids

// 1. KING: Mayor Lewis with little gold crown, mustache, red vest, brown boots
const kingGrid = [
    "________KKKK________",
    "_______KYDYDK_______",
    "______KYDYDYDK______",
    "______KKKKKKKK______",
    "_____KHBRHBRHBRK____",
    "____KHBRSKDSKSKHK___",
    "____KHBRSKKSKKSKHK__",
    "____KHBKSKDSKSKHBK__",
    "____KKKHBRHBRHBRKK__",
    "____KDRDDRDDRDDRDK__",
    "___KDRDRDRDRDRDRDK__",
    "___KDRDRDGRGRDDRDK__",
    "___KDRDRDGRGRDDRDK__",
    "___KDRDRDRDRDRDRDK__",
    "___KDRDRDRDRDRDRDK__",
    "___KDRKKKKKKKKDRDK__",
    "____KKDBLBLBLDBLKK__",
    "____KDBLBLBLBLDBLK__",
    "____KDBLBLKKBLDBLK__",
    "____KDBLBLKKBLDBLK__",
    "____KDBLBLKKBLDBLK__",
    "____KHBRHBRKHBRHBRK_",
    "____KDBRDBRKDBRDBRK_",
    "_____KKKKK___KKKKK__"
];

// 2. GRAND QUEEN: Wizard Rasmodius with tall purple hat, star belt, wooden staff
const queenGrid = [
    "_________KK_________",
    "________KPDK________",
    "_______KPPDPK_______",
    "______KPPPDDPK______",
    "_____KPPPPPDDPK_____",
    "____KPPPPPPPDDPK____",
    "___KKKKKKKKKKKKKK___",
    "_____KHBRSKDSKHK____",
    "____KHBRSKKSKKSKHK__",
    "____KHBKSKDSKSKHBK__",
    "____KKKHBRHBRHBRKK__",
    "____KDPPPDDPPDPPDK__W",
    "___KDPPPPDDPPDPPPDK_KY",
    "___KDPPPPDDPPDPPPDKKYK",
    "___KDPPPPYYYYPPPDKKYK",
    "___KDPPPPDDPPDPPPDKKDK",
    "___KDPPPPDDPPDPPPDKKDK",
    "___KDPPPPDDPPDPPPDKKDK",
    "___KDPPPPDDPPDPPPDKKDK",
    "___KDPPPPDDPPDPPPDKKDK",
    "___KDPPDDDDDPPDDPDKKDK",
    "___KDPPDDDDDPPDDPDKKDK",
    "____KKKKKKKKKKKKK__KDK",
    "____________________KK"
];

// 3. SHIELD PAWN: Cute Green Junimo with little sprout leaf!
const pawnGrid = [
    "_________LGR________",
    "________KLGRK_______",
    "________KDGRK_______",
    "_______KKDGRKK______",
    "______KGRGRGRGK_____",
    "_____KGRGRGRGRGK____",
    "____KGRGRGRGRGRGK___",
    "___KGRGRGRGRGRGRGK__",
    "___KGRGRGRGRGRGRGK__",
    "__KGRGRGRGRGRGRGRGK_",
    "__KGRKWKGRGRKWKGRGK_",
    "__KGRKKKGRGRKKKGRGK_",
    "__KGRGRGRGRGRGRGRGK_",
    "__KGRGRGRGRGRGRGRGK_",
    "__KGRGRGRGRGRGRGRGK_",
    "__KGRGRGRGRGRGRGRGK_",
    "___KGRGRGRGRGRGRGK__",
    "___KGRGRGRGRGRGRGK__",
    "____KGRGRGRGRGRGK___",
    "_____KDGRDGRDGRK____",
    "______KKKKKKKKKK____",
    "______KK______KK____",
    "_____KDGRK___KDGRK__",
    "______KK______KK____"
];

// 4. FROST ROOK: Cute Straw Scarecrow with patched tunic and wooden cross
const scarecrowGrid = [
    "________KKKK________",
    "_______KSTRK________",
    "______KSTRSTRK______",
    "_____KSTRSTRSTRK____",
    "___KKKKKKKKKKKKKK___",
    "____KKDSTRDSTRKK____",
    "_____KCRCRCRCRK_____",
    "____KCRKCRKCRKCRK___",
    "____KCRKCRKCRKCRK___",
    "____KCRCRCRCRCRCK___",
    "KKKKKCRCRCRCRCRCKKKK",
    "KWDKKKBLBLBLBLDBKKWD",
    "KWDKRDYBLBLBLDBRKKWD",
    "KWDKRBLBLBLBLDBRKKWD",
    "KKKKKDBLBLBLDBLKKKKK",
    "_____KDBLBLBLDBLK___",
    "_____KDBLBLBLDBLK___",
    "_____KSTRSTRSTRSK___",
    "______KWDWDWDWDK____",
    "______KWDWDWDWDK____",
    "______KWDWDWDWDK____",
    "______KWDWDWDWDK____",
    "______KWDWDWDWDK____",
    "_______KKKKKKKK_____"
];

// 5. KNIGHT: Farmer Knight with tin pot helmet, overalls & pitchfork
const knightGrid = [
    "________KKKK________",
    "_______KSSSSK_______",
    "______KSSSSSSK______",
    "_____KSSSSSSSSK_____",
    "____KSSSSSSSSSSK____",
    "____KSSSKKKKSSSK____",
    "____KSSKDSKDSKSK____",
    "____KSSKDSKDSKSK____",
    "____KSSSSKKSSSSK____",
    "____KSSSSSSSSSSK___KS",
    "___KCRBLBLBLBLCRK_KSS",
    "___KBLBLBLBLBLBLK_KSS",
    "___KBLBLBLBLBLBLKKSSS",
    "___KBLBLBLBLBLBLKKSSS",
    "___KBLBLBLBLBLBLK_KDK",
    "___KBLBLBLBLBLBLK_KDK",
    "___KBLBLBLBLBLBLK_KDK",
    "___KBLBLKKKKBLBLK_KDK",
    "____KBLBLKKBLBLK__KDK",
    "____KBLBLKKBLBLK__KDK",
    "____KHBRHK_KHBRK__KDK",
    "____KDBRDK_KDBRK__KDK",
    "____KDBRDK_KDBRK___KK",
    "_____KKK____KKK_____"
];

// 6. FROST KNIGHT: Winter Farmer with blue woolen beanie, snow boots & ice rod
const frostKnightGrid = [
    "________KKKK________",
    "_______KDBLBLK______",
    "______KDBLBLBLBK____",
    "_____KDBLBLBLBLBK___",
    "____KWWWWWWWWWWWWK__",
    "____KWWWWWWWWWWWWK__",
    "____KHBRSKDSKSKHK___",
    "____KHBRSKKSKKSKHK__",
    "____KHBKSKDSKSKHBK__",
    "____KKKHBRHBRHBRKK_KB",
    "___KDBLBLBLBLBLBK_KBB",
    "___KBLBLBLBLBLBLK_KBB",
    "___KBLBLBLBLBLBLKKBBB",
    "___KBLBLBLBLBLBLKKBBB",
    "___KBLBLBLBLBLBLK_KDK",
    "___KBLBLBLBLBLBLK_KDK",
    "___KBLBLBLBLBLBLK_KDK",
    "___KBLBLKKKKBLBLK_KDK",
    "____KBLBLKKBLBLK__KDK",
    "____KBLBLKKBLBLK__KDK",
    "____KWWWWK_KWWWWK_KDK",
    "____KDBLDK_KDBLDK_KDK",
    "____KDBLDK_KDBLDK__KK",
    "_____KKK____KKK_____"
];

// 7. PYRO BISHOP / HARVEY: Doctor Harvey with glasses, green coat, potion tonic
const pyroBishopGrid = [
    "________KKKK________",
    "_______KHBRHBRK_____",
    "______KHBRHBRHBRK___",
    "_____KHBRHBRHBRHBRK_",
    "_____KHBRSKDSKSKHK__",
    "_____KHBRKDKKDKKHK__",
    "_____KHBKKSKKSKHBK__",
    "_____KKKHBRHBRHBRKK_",
    "_____KDGRDGRDGRDGK__",
    "____KDGRDGRDGRDGRDK_",
    "___KDGRGRWWRWDGRDGRK",
    "___KDGRGRRDWWDGRDGRK",
    "___KDGRGRRDWWDGRDGRK",
    "___KDGRGRWWRWDGRDGRK",
    "___KDGRDGRDGRDGRDGRK",
    "___KDGRDGRDGRDGRDGRK",
    "____KDGRDGRDGRDGRDK_B",
    "____KDBRKKKKKKDBRK_KB",
    "____KDBRBRKKBRDBRK_KB",
    "____KDBRBRKKBRDBRK_KK",
    "____KDBRBRKKBRDBRK__",
    "____KHBRHK__KHBRK___",
    "____KDBRDK__KDBRK___",
    "_____KKK_____KKK____"
];

// 8. FIRE MAGE: Cute little Furnace Spirit with campfire hat and dual fire embers
const fireMageGrid = [
    "________KKKK________",
    "_______KDRDRK_______",
    "______KDRDRDRDK_____",
    "_____KDRDRYDRDRDK___",
    "____KDRDRYYYYDRDRDK_",
    "___KKKKKKKKKKKKKKKK_",
    "____KHBRSKDSKSKHK___",
    "____KHBRSKKSKKSKHK__",
    "____KHBKSKDSKSKHBK__",
    "____KKKHBRHBRHBRKK__",
    "_KRK_KDRDRDRDRDRDK_KR",
    "KYRKDRDRDRDRDRDRDKKRY",
    "KYYKDRDRDYYDDRDRDKKYY",
    "_KYKDRDRDYYDDRDRDK_KY",
    "_KKKDRDRDRDRDRDRDK_KK",
    "____KDRDRDRDRDRDK___",
    "____KDRDRDRDRDRDK___",
    "____KDRDRDRDRDRDK___",
    "____KDRDRDRDRDRDK___",
    "____KDRDRKKDRDRDK___",
    "____KDRDRKKDRDRDK___",
    "____KHBRHK_KHBRK____",
    "____KDBRDK_KDBRK____",
    "_____KKK____KKK_____"
];

// 9. ARCHER: Forest Forager with green cap, feather, wooden bow
const archerGrid = [
    "________KKKK________",
    "_______KDGRDGRK_____",
    "______KDGRDGRDGRK___",
    "_____KDGRDGRYYYYK___",
    "____KKKKKKKKKKKKK___",
    "_____KHBRSKDSKHK____",
    "____KHBRSKKSKKSKHK__",
    "____KHBKSKDSKSKHBK__",
    "____KKKHBRHBRHBRKK__",
    "___KDGRDGRDGRDGRDGRK",
    "__KDGRDGRDGRDGRDGRDK",
    "_KWKDGRDGRDGRDGRDGRDK",
    "_KWKDGRDGRDGRDGRDGRDK",
    "_KWKKKKKKKKKKKKKKKKK",
    "_KWK__KWDWDWDWDWDK__",
    "_KWK__KWDWDWDWDWDK__",
    "_KWK__KWDWDWDWDWDK__",
    "_KKK__KWDWDWDWDWDK__",
    "______KDBRBRBRBRDK__",
    "______KDBRKKKKRBDK__",
    "______KDBRKKKKRBDK__",
    "______KHBRHK_KHBRK__",
    "______KDBRDK_KDBRK__",
    "_______KKK____KKK___"
];

// 10. JUGGERNAUT: Blacksmith Clint with leather apron & giant forge hammer
const juggernautGrid = [
    "________KKKK________",
    "_______KHBRHBRK_____",
    "______KHBRHBRHBRK___",
    "_____KHBRHBRHBRHBRK_",
    "_____KHBRSKDSKSKHK__",
    "_____KHBRSKKSKKSKHK__",
    "_____KHBRHBRHBRHBRK_",
    "_____KKHBRHBRHBRKK__",
    "____KDBRDBRBRDBRDBRK",
    "___KDBRDBRBRBRDBRDBK_S",
    "___KDBRBRCRCRBRDBRDKKS",
    "___KDBRBRCRCRBRDBRDKSS",
    "___KDBRBRCRCRBRDBRDKSS",
    "___KDBRBRCRCRBRDBRDKSS",
    "___KDBRBRCRCRBRDBRDKDK",
    "___KDBRBRCRCRBRDBRDKDK",
    "___KDBRBRCRCRBRDBRDKDK",
    "____KDBRDBRDBRDBRDKKDK",
    "____KDBLBLKKBLBLDBLKDK",
    "____KDBLBLKKBLBLDBLKDK",
    "____KDBLBLKKBLBLDBLKDK",
    "____KDBRDBRKDBRDBRK_KK",
    "____KDBRDBRKDBRDBRK___",
    "_____KKKKK___KKKKK____"
];

// 11. MERCENARY: Saloon Bouncer / Adventurer with club and gold pouch
const mercenaryGrid = [
    "________KKKK________",
    "_______KDBLBLK______",
    "______KDBLBLBLBK____",
    "_____KDBLBLBLBLBK___",
    "____KKKKKKKKKKKKK___",
    "_____KHBRSKDSKHK____",
    "____KHBRSKKSKKSKHK__",
    "____KHBKSKDSKSKHBK__",
    "____KKKHBRHBRHBRKK__",
    "___KDBRDBRBRBRDBRDK_",
    "__KDBRDBRBRBRBRDBRDK",
    "_KWDKDBRBRBRBRBRDBRDK",
    "_KWDKDBRBRBRBRBRDBRDK",
    "_KWDKDBRBRBRBRBRDBRDK",
    "_KWKKKKKKKKKKKKKKKKK",
    "_KK___KDBRBRBRBRDK__",
    "______KDBRBRBRBRDK__",
    "______KDBRBRBRBRDK__",
    "______KDBLBLKKBLDBLK",
    "______KDBLBLKKBLDBLK",
    "______KDBLBLKKBLDBLK",
    "______KHBRHK_KHBRK__",
    "______KDBRDK_KDBRK__",
    "_______KKK____KKK___"
];

// 12. CANNON: Wooden farm wagon with iron pumpkin launcher
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
    "____KWDWDWDWDWDK____",
    "___KWDWDWDWDWDWDK___",
    "__KWDWKKKKKKWDWDK___",
    "__KWDWDSTRSTRKWDDK__",
    "__KWDWDSTRSTRKWDDK__",
    "__KWDWKKKKKKWDWDK___",
    "___KWDWDWDWDWDWDK___",
    "____KKKKKKKKKKKK____"
];

// 13. CORSAIR: Old Fisherman Willy with wool beanie, gray beard & fishing rod
const corsairGrid = [
    "________KKKK________",
    "_______KDRDRK_______",
    "______KDRDRDRDK_____",
    "_____KDRDRDRDRDK____",
    "____KKKKKKKKKKKK____",
    "_____KDSKDSKDSK_____",
    "____KDSKDKKDKDSK____",
    "____KDSKDSKDSKDSK___",
    "____KKKSSSSSSKKK____",
    "___KDBLBLBLBLBLDBLK_R",
    "__KDBLBLBLBLBLBLDBLKW",
    "_KDBLBLBLBLBLBLBLDBKK",
    "_KDBLBLBLBLBLBLBLDBLK",
    "_KKKKKKKKKKKKKKKKKKK",
    "_____KBLBLBLBLBLBK__",
    "_____KBLBLBLBLBLBK__",
    "_____KBLBLBLBLBLBK__",
    "_____KDBRBRKKRBRDBLK",
    "_____KDBRBRKKRBRDBLK",
    "_____KDBRBRKKRBRDBLK",
    "_____KHBRHK__KHBRK__",
    "_____KDBRDK__KDBRK__",
    "______KKK_____KKK___",
    "____________________"
];

// 14. GAMBLER: Saloon Bartender Gus with white apron & glass
const gamblerGrid = [
    "________KKKK________",
    "_______KHBRHBRK_____",
    "______KHBRHBRHBRK___",
    "_____KHBRHBRHBRHBRK_",
    "_____KHBRSKDSKSKHK__",
    "_____KHBRSKKSKKSKHK__",
    "_____KHBRHBRHBRHBRK_",
    "_____KKHBRHBRHBRKK__",
    "____KRDCRCRCRCRDRDK_",
    "___KRDCRCRCRCRCRDRDK",
    "___KRDCRCRCRCRCRDRDK",
    "___KRDCRCRCRCRCRDRDK",
    "___KRDCRCRCRCRCRDRDK",
    "___KRDCRCRCRCRCRDRDK",
    "___KRDCRCRCRCRCRDRDK",
    "____KKCRCRCRCRCRKK__",
    "____KDBLBLKKBLBLDBLK",
    "____KDBLBLKKBLBLDBLK",
    "____KDBLBLKKBLBLDBLK",
    "____KDBLBLKKBLBLDBLK",
    "____KDBRDBRKDBRDBRK_",
    "____KDBRDBRKDBRDBRK_",
    "_____KKKKK___KKKKK__",
    "____________________"
];

// 15. CHANCELLOR: Town Musician Sam with guitar & blond hair
const chancellorGrid = [
    "________KKKK________",
    "_______KYYYYK_______",
    "______KYYYYYYK______",
    "_____KYYYYYYYYK_____",
    "____KYYYYYYYYYYK____",
    "_____KYSKDSKSKYK____",
    "____KYSKDKKDKSKYK___",
    "____KYSKDSKDSKSKYK__",
    "____KKKYSKSKSKYKKK__",
    "___KBLBLBLBLBLBLBLK_K",
    "__KBLBLBLBLBLBLBLBLKW",
    "_KBLBLBLBLBLBLBLBLBKK",
    "_KBLBLBLBLBLBLBLBLBLK",
    "_KKKKKKKKKKKKKKKKKKK",
    "_____KBLBLBLBLBLBK__",
    "_____KBLBLBLBLBLBK__",
    "_____KBLBLBLBLBLBK__",
    "_____KDBRBRKKRBRDBLK",
    "_____KDBRBRKKRBRDBLK",
    "_____KDBRBRKKRBRDBLK",
    "_____KHBRHK__KHBRK__",
    "_____KDBRDK__KDBRK__",
    "______KKK_____KKK___",
    "____________________"
];

// 16. STONE GOLEM: Cave Golem with mossy stone head & glowing yellow eyes
const stoneGolemGrid = [
    "________KKKK________",
    "______KKDWDWDWKK____",
    "_____KDWDWDWDWDWK___",
    "____KDWDWGRGRDWDWDWK",
    "___KDWDWDGRGRDWDWDWK",
    "___KDWDWYYYYDWDWDWDK",
    "___KDWDWKKKKDWDWDWDK",
    "___KDWDWYYYYDWDWDWDK",
    "___KDWDWDWDWDWDWDWDK",
    "___KKDWDWDWDWDWDWKK_",
    "__KDWDWDWDWDWDWDWDWK",
    "_KDWDWGRDWDWDWDWGRDK",
    "KDWKDWGRDWDWDWDWGRDK",
    "KDWKDWDWDWDWDWDWDWDK",
    "KDWKDWDWDWDWDWDWDWDK",
    "_KKKDWDWDWDWDWDWDKKK",
    "___KDWDWDWDWDWDWDK__",
    "___KDWDWDWDWDWDWDK__",
    "___KDWDWGRDWDWDWDK__",
    "____KDWGRDWDWDWDDK__",
    "____KDWGRKKKKDWDDK__",
    "____KDWDWK__KDWDWK__",
    "____KDWDWK__KDWDWK__",
    "_____KKK_____KKK____"
];

// 17. STONE MINION: Cave Green Slime with black dot eyes & bounce
const stoneMinionGrid = [
    "____________________",
    "____________________",
    "________KKKK________",
    "_______KGRGRK_______",
    "______KGRGRGRGK_____",
    "_____KGRGRGRGRGK____",
    "____KGRGRGRGRGRGK___",
    "____KGRGRGRGRGRGK___",
    "___KGRKWKGRGRKWKGRK_",
    "___KGRKKKGRGRKKKGRK_",
    "___KGRKKKGRGRKKKGRK_",
    "__KGRGRGRGRGRGRGRGK_",
    "__KGRGRGRGRGRGRGRGK_",
    "__KGRGRGRGRGRGRGRGK_",
    "_KGRGRGRKKKKGRGRGRGK",
    "_KGRGRGKGKKGKKGRGRGK",
    "_KGRGRGRKKKKGRGRGRGK",
    "KGRGRGRGRGRGRGRGRGRK",
    "KGRGRGRGRGRGRGRGRGRK",
    "KGRGRGRGRGRGRGRGRGRK",
    "KGRGRGRGRGRGRGRGRGRK",
    "KGRGRGRGRGRGRGRGRGRK",
    "_KKKKKKKKKKKKKKKKKK_",
    "____________________"
];

const pieces = {
    king: kingGrid,
    grand_queen: queenGrid,
    shield_pawn: pawnGrid,
    frost_rook: scarecrowGrid,
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
    const svg = gridToSVG(id, id, grid);
    const filePath = path.join(targetDir, `${id}.svg`);
    fs.writeFileSync(filePath, svg, 'utf8');
    count++;
}

console.log(`✅ Đã xuất thành công ${count} file SVG Stardew Valley 16-bit chuẩn retro vào ${targetDir}!`);

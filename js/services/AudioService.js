// ============================================================================
// CHESS TFT - AUDIO SERVICE & SOUND SYNTHESIZER (ES MODULE)
// Manages Web Audio API sound effects and Dual-Deck Equal-Power Crossfade BGM
// ============================================================================

import { eventBus } from '../core/events/EventBus.js';
import { GAME_EVENTS } from '../core/events/GameEvents.js';

export class SoundFX {
    constructor() {
        this.ctx = null;
        this.sfxMuted = false;
        this.bgmMuted = localStorage.getItem("chess_tft_bgm_muted") === "true";
        this.bgmVolume = parseFloat(localStorage.getItem("chess_tft_bgm_vol") || "0.45");

        this.currentTrack = null;
        this.activeTrackSrc = null;

        // DUAL-DECK EQUAL-POWER CROSSFADE AUDIO SYSTEM
        this.deckA = new Audio();
        this.deckA.loop = true;
        this.deckB = new Audio();
        this.deckB.loop = true;

        this.activeDeck = this.deckA;
        this.idleDeck = this.deckB;
        this.activeDeck.volume = this.bgmMuted ? 0 : this.bgmVolume;
        this.idleDeck.volume = 0;

        this.fadeTimer = null;
        this.fadeDurationMs = 1200; // 1.2s smooth cinematic Equal-Power Crossfade
        this.duckTimer = null;
        this.isDucked = false;

        this.currentPack = localStorage.getItem("chess_tft_sound_pack") || "expedition33";
        this.packs = {
            expedition33: {
                name: "Clair Obscur: Expedition 33",
                tracks: {
                    title: "assets/audio/expedition33_lumiere.webm",
                    lobby: "assets/audio/expedition33_lumiere.webm",
                    prep: "assets/audio/expedition33_yellow_forest.webm",
                    prep_alt: "assets/audio/expedition33_prep.webm",
                    carousel: "assets/audio/expedition33_monoco.webm",
                    armory: "assets/audio/expedition33_monoco.webm",
                    combat_early: "assets/audio/expedition33_beneath_the_blue_tree.webm",
                    combat: "assets/audio/expedition33_clea.webm",
                    combat_climax: "assets/audio/expedition33_combat_climax.webm"
                },
                names: {
                    title: "Lumière (Expedition 33)",
                    lobby: "Lumière (Expedition 33)",
                    prep: "Yellow Forest - Number the Hours",
                    prep_alt: "Camp Preparation - Tactical Briefing",
                    carousel: "Monoco - Vòng Đi Chợ",
                    armory: "Monoco - Kho Tiếp Tế",
                    combat_early: "Spring Meadows - Beneath the Blue Tree",
                    combat: "The Manor - Clea!",
                    combat_climax: "Forgotten Battlefield - Divided Swords"
                }
            },
            classic: {
                name: "Cổ Điển / Classic Theme",
                tracks: {
                    title: "assets/audio/lobby_theme.mp3",
                    lobby: "assets/audio/lobby_theme.mp3",
                    prep: "assets/audio/lobby_theme.mp3",
                    carousel: "assets/audio/lobby_theme.mp3",
                    armory: "assets/audio/lobby_theme.mp3",
                    combat_early: "assets/audio/combat_theme.ogg",
                    combat: "assets/audio/combat_theme.ogg",
                    combat_climax: "assets/audio/combat_theme.ogg"
                },
                names: {
                    title: "Classic Lobby Theme",
                    lobby: "Classic Lobby Theme",
                    prep: "Classic Lobby Theme",
                    carousel: "Classic Lobby Theme",
                    armory: "Classic Lobby Theme",
                    combat_early: "Classic Combat Blitz",
                    combat: "Classic Combat Blitz",
                    combat_climax: "Classic Combat Blitz"
                }
            }
        };

        this.userUnlocked = false;
        this.setupUserUnlock();
    }

    get bgmAudio() {
        return this.activeDeck;
    }

    get activePack() {
        return this.packs[this.currentPack] || this.packs.expedition33;
    }

    getCurrentTrackName() {
        if (!this.currentTrack) return "Không có";
        const pack = this.activePack;
        return (pack.names && pack.names[this.currentTrack]) || this.currentTrack;
    }

    cycleSoundPack() {
        this.currentPack = this.currentPack === "expedition33" ? "classic" : "expedition33";
        localStorage.setItem("chess_tft_sound_pack", this.currentPack);
        if (this.currentTrack) {
            const track = this.currentTrack;
            this.currentTrack = null;
            this.activeTrackSrc = null;
            this.playBgm(track, { duration: 800 });
        }
        return this.activePack;
    }

    setupUserUnlock() {
        const unlock = () => {
            this.userUnlocked = true;
            this.init();
            if (!this.bgmMuted && this.currentTrack && this.activeDeck.paused) {
                this.activeDeck.play().catch(() => {});
            }
            window.removeEventListener("click", unlock);
            window.removeEventListener("keydown", unlock);
            window.removeEventListener("touchstart", unlock);
        };
        window.addEventListener("click", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
        window.addEventListener("touchstart", unlock, { once: true });
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => {});
        }
    }

    resolveTrackSrc(trackName) {
        const pack = this.activePack;
        let targetSrc = pack.tracks[trackName];
        if (!targetSrc) {
            if (trackName === "title" || trackName === "lobby") targetSrc = pack.tracks.lobby || pack.tracks.title;
            else if (trackName === "carousel" || trackName === "armory") targetSrc = pack.tracks.carousel || pack.tracks.armory || pack.tracks.prep;
            else if (trackName.startsWith("prep")) targetSrc = pack.tracks.prep || pack.tracks.lobby;
            else if (trackName.startsWith("combat")) targetSrc = pack.tracks.combat;
            else return null;
        }
        return targetSrc;
    }

    preloadTrack(trackName) {
        const targetSrc = this.resolveTrackSrc(trackName);
        if (!targetSrc) return;
        if (!this.idleDeck.src || this.idleDeck.src.indexOf(targetSrc) === -1) {
            this.idleDeck.src = targetSrc;
            this.idleDeck.preload = "auto";
        }
    }

    playBgm(trackName, options = {}) {
        const targetSrc = this.resolveTrackSrc(trackName);
        if (!targetSrc) return;

        // Nếu trùng file đang phát thì giữ nguyên luồng âm thanh
        const currentSrc = this.activeDeck.src || "";
        const isSameFile = this.activeTrackSrc === targetSrc || (currentSrc && currentSrc.indexOf(targetSrc) !== -1);

        if (isSameFile) {
            this.currentTrack = trackName;
            if (this.userUnlocked && !this.bgmMuted && this.activeDeck.paused) {
                this.activeDeck.play().catch(() => {});
            }
            return;
        }

        // Khởi động chuyển đổi Equal-Power Crossfade mượt mà
        this.currentTrack = trackName;
        this.activeTrackSrc = targetSrc;

        const outDeck = this.activeDeck;
        const inDeck = this.idleDeck;
        const duration = options.duration || this.fadeDurationMs;
        const targetVol = this.bgmMuted ? 0 : this.bgmVolume;

        if (this.fadeTimer) {
            clearInterval(this.fadeTimer);
            this.fadeTimer = null;
        }

        if (!inDeck.src || inDeck.src.indexOf(targetSrc) === -1) {
            try {
                inDeck.pause();
            } catch (e) {}
            inDeck.src = targetSrc;
            inDeck.load();
        }
        inDeck.currentTime = 0;
        inDeck.volume = 0;

        // Hoán đổi con trỏ Deck ngay lập tức
        this.activeDeck = inDeck;
        this.idleDeck = outDeck;

        if (this.userUnlocked && !this.bgmMuted) {
            const playPromise = inDeck.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    if (e.name !== "AbortError") {
                        // Suppress expected track aborts on fast screen changes
                    }
                });
            }
        }

        if (outDeck.paused || outDeck.volume <= 0.01) {
            outDeck.pause();
            outDeck.volume = 0;
            this.fadeIn(inDeck, targetVol, duration);
            return;
        }

        const startTime = performance.now();
        const startOutVol = outDeck.volume;

        this.fadeTimer = setInterval(() => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(1, Math.max(0, elapsed / duration));

            // Equal-Power Crossfade curve (cos & sin)
            const outFactor = Math.cos(t * Math.PI * 0.5);
            const inFactor = Math.sin(t * Math.PI * 0.5);

            const curMasterVol = this.bgmMuted ? 0 : this.bgmVolume;
            outDeck.volume = Math.max(0, Math.min(1, startOutVol * outFactor));
            inDeck.volume = Math.max(0, Math.min(1, curMasterVol * inFactor));

            if (t >= 1) {
                clearInterval(this.fadeTimer);
                this.fadeTimer = null;
                outDeck.pause();
                outDeck.currentTime = 0;
                outDeck.volume = 0;
                inDeck.volume = curMasterVol;
            }
        }, 30);
    }

    fadeIn(deck, targetVol, duration) {
        const startTime = performance.now();
        this.fadeTimer = setInterval(() => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(1, Math.max(0, elapsed / duration));
            const curMasterVol = this.bgmMuted ? 0 : this.bgmVolume;
            deck.volume = Math.sin(t * Math.PI * 0.5) * curMasterVol;
            if (t >= 1) {
                clearInterval(this.fadeTimer);
                this.fadeTimer = null;
                deck.volume = curMasterVol;
            }
        }, 30);
    }

    duckBgm(duckFactor = 0.35, durationMs = 1200) {
        if (this.bgmMuted || !this.activeDeck || this.activeDeck.paused) return;
        if (this.isDucked) return;

        this.isDucked = true;
        const normalVol = this.bgmVolume;
        const duckedVol = normalVol * duckFactor;

        this.activeDeck.volume = duckedVol;

        clearTimeout(this.duckTimer);
        this.duckTimer = setTimeout(() => {
            const startTime = performance.now();
            const rampInterval = setInterval(() => {
                const elapsed = performance.now() - startTime;
                const t = Math.min(1, elapsed / 400);
                if (this.activeDeck && !this.bgmMuted) {
                    this.activeDeck.volume = duckedVol + (normalVol - duckedVol) * t;
                }
                if (t >= 1) {
                    clearInterval(rampInterval);
                    this.isDucked = false;
                    if (this.activeDeck && !this.bgmMuted) {
                        this.activeDeck.volume = normalVol;
                    }
                }
            }, 30);
        }, durationMs);
    }

    toggleBgm() {
        this.bgmMuted = !this.bgmMuted;
        localStorage.setItem("chess_tft_bgm_muted", this.bgmMuted ? "true" : "false");
        if (this.bgmMuted) {
            this.activeDeck.pause();
            this.idleDeck.pause();
            this.activeDeck.volume = 0;
            this.idleDeck.volume = 0;
        } else {
            this.activeDeck.volume = this.bgmVolume;
            if (this.currentTrack) {
                this.activeDeck.play().catch(() => {});
            }
        }
        return !this.bgmMuted;
    }

    setBgmVolume(val) {
        this.bgmVolume = Math.max(0, Math.min(1, val));
        localStorage.setItem("chess_tft_bgm_vol", this.bgmVolume.toString());
        if (!this.bgmMuted && !this.fadeTimer) {
            this.activeDeck.volume = this.bgmVolume;
        }
    }

    playTone(freq, type = "sine", duration = 0.12, vol = 0.12) {
        if (this.sfxMuted) return;
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    move() { this.playTone(340, "triangle", 0.09, 0.12); }
    ranged() {
        this.playTone(620, "sawtooth", 0.08, 0.1);
        setTimeout(() => this.playTone(440, "triangle", 0.12, 0.12), 50);
    }
    hitArmor() { this.playTone(190, "square", 0.14, 0.15); }
    capture() {
        this.playTone(280, "sawtooth", 0.12, 0.15);
        setTimeout(() => this.playTone(520, "triangle", 0.15, 0.14), 60);
    }
    starUp() {
        this.duckBgm(0.4, 800);
        [440, 554, 659, 880].forEach((f, idx) => {
            setTimeout(() => this.playTone(f, "triangle", 0.16, 0.15), idx * 70);
        });
    }
    victory() {
        this.duckBgm(0.28, 1600);
        [523, 659, 784, 1046].forEach((f, idx) => {
            setTimeout(() => this.playTone(f, "sine", 0.22, 0.16), idx * 90);
        });
    }
    defeat() {
        this.duckBgm(0.28, 1600);
        [392, 349, 311, 261].forEach((f, idx) => {
            setTimeout(() => this.playTone(f, "sawtooth", 0.22, 0.14), idx * 100);
        });
    }
    buy() { this.playTone(520, "triangle", 0.1, 0.12); }
    sell() { this.playTone(380, "triangle", 0.1, 0.12); }
    upgrade() { this.starUp(); }
    combatStart() {
        this.duckBgm(0.3, 1000);
        [330, 440, 550, 660].forEach((f, idx) => {
            setTimeout(() => this.playTone(f, "sine", 0.15, 0.15), idx * 60);
        });
    }
}

// Wire EventBus listeners for decoupled audio triggers
export const audioService = new SoundFX();

eventBus.on(GAME_EVENTS.PLAY_SFX, (name, ...args) => {
    if (typeof audioService[name] === 'function') {
        audioService[name](...args);
    }
});

eventBus.on(GAME_EVENTS.PLAY_BGM, (track, options) => {
    audioService.playBgm(track, options);
});

eventBus.on(GAME_EVENTS.STOP_BGM, () => {
    if (audioService.activeDeck) {
        audioService.activeDeck.pause();
    }
});

export { SoundFX as AudioService };
export default audioService;

// Sound system for Block Puzzle game
// Uses Howler.js for audio management
// To use this system, you'll need to:
// 1. Add Howler.js to your project (via CDN or npm)
// 2. Create a sounds directory with appropriate sound files

// Define sound categories
const SOUND_TYPES = {
    BLOCK_PLACE: 'block_place',
    BLOCK_INVALID: 'block_invalid',
    LINE_CLEAR: 'line_clear',
    MULTI_LINE_CLEAR: 'multi_line_clear',
    GAME_OVER: 'game_over',
    MENU_SELECT: 'menu_select',
    MUSIC_MAIN: 'music_main',
    MUSIC_GAME_OVER: 'music_game_over'
};

// Sound file paths
const SOUND_PATHS = {
    [SOUND_TYPES.BLOCK_PLACE]: 'sounds/effects/block_place.mp3',
    [SOUND_TYPES.BLOCK_INVALID]: 'sounds/effects/block_invalid.mp3',
    [SOUND_TYPES.LINE_CLEAR]: 'sounds/effects/line_clear.mp3',
    [SOUND_TYPES.MULTI_LINE_CLEAR]: 'sounds/effects/multi_line_clear.mp3',
    [SOUND_TYPES.GAME_OVER]: 'sounds/effects/game_over.mp3',
    [SOUND_TYPES.MENU_SELECT]: 'sounds/effects/menu_select.mp3',
    [SOUND_TYPES.MUSIC_MAIN]: 'sounds/music/main_theme.mp3',
    [SOUND_TYPES.MUSIC_GAME_OVER]: 'sounds/music/game_over.mp3'
};

export class SoundSystem {
    constructor(gameStateManager) {
        this.gameStateManager = gameStateManager;
        this.sounds = {};
        this.music = {};
        this.isMuted = false;
        this.musicVolume = 0.2;
        this.soundVolume = 0.5;
        this.masterVolume = 1.0;

        if (typeof Howl === 'undefined') {
            this.initSoundStubs();
        } else {
            this.initSounds();
        }
    }

    initSounds() {
        try {
            this.sounds = {
                [SOUND_TYPES.BLOCK_PLACE]: this.loadSound(SOUND_TYPES.BLOCK_PLACE, SOUND_PATHS[SOUND_TYPES.BLOCK_PLACE]),
                [SOUND_TYPES.BLOCK_INVALID]: this.loadSound(SOUND_TYPES.BLOCK_INVALID, SOUND_PATHS[SOUND_TYPES.BLOCK_INVALID]),
                [SOUND_TYPES.LINE_CLEAR]: this.loadSound(SOUND_TYPES.LINE_CLEAR, SOUND_PATHS[SOUND_TYPES.LINE_CLEAR]),
                [SOUND_TYPES.MULTI_LINE_CLEAR]: this.loadSound(SOUND_TYPES.MULTI_LINE_CLEAR, SOUND_PATHS[SOUND_TYPES.MULTI_LINE_CLEAR]),
                [SOUND_TYPES.GAME_OVER]: this.loadSound(SOUND_TYPES.GAME_OVER, SOUND_PATHS[SOUND_TYPES.GAME_OVER]),
                [SOUND_TYPES.MENU_SELECT]: this.loadSound(SOUND_TYPES.MENU_SELECT, SOUND_PATHS[SOUND_TYPES.MENU_SELECT])
            };

            this.music = {
                [SOUND_TYPES.MUSIC_MAIN]: new Howl({
                    src: [SOUND_PATHS[SOUND_TYPES.MUSIC_MAIN]],
                    volume: this.musicVolume * this.masterVolume,
                    loop: true
                }),
                [SOUND_TYPES.MUSIC_GAME_OVER]: new Howl({
                    src: [SOUND_PATHS[SOUND_TYPES.MUSIC_GAME_OVER]],
                    volume: this.musicVolume * this.masterVolume,
                    loop: false
                })
            };
        } catch (error) {
            console.error('SoundSystem: Howler init failed, falling back to stubs', error);
            this.initSoundStubs();
        }
    }
    
    loadSound(key, path) {
        try {
            return new Howl({
                src: [path],
                volume: this.soundVolume * this.masterVolume,
                onloaderror: () => {
                    if (this.gameStateManager) {
                        this.gameStateManager.setError(`Failed to load sound: ${key}`);
                    }
                }
            });
        } catch (error) {
            if (this.gameStateManager) {
                this.gameStateManager.setError(`Sound initialization error: ${error.message}`);
            }
            return null;
        }
    }

    initSoundStubs() {
        // No-op stubs that mirror the Howler surface (play/stop/volume) so the rest of
        // the system behaves identically whether Howler is present or not.
        const noop = () => {};
        const makeStub = () => ({ play: noop, stop: noop, pause: noop, volume: noop });

        this.sounds = {
            [SOUND_TYPES.BLOCK_PLACE]: makeStub(),
            [SOUND_TYPES.BLOCK_INVALID]: makeStub(),
            [SOUND_TYPES.LINE_CLEAR]: makeStub(),
            [SOUND_TYPES.MULTI_LINE_CLEAR]: makeStub(),
            [SOUND_TYPES.GAME_OVER]: makeStub(),
            [SOUND_TYPES.MENU_SELECT]: makeStub()
        };

        this.music = {
            [SOUND_TYPES.MUSIC_MAIN]: makeStub(),
            [SOUND_TYPES.MUSIC_GAME_OVER]: makeStub()
        };
    }
    
    // New volume control methods
    setMasterVolume(volume) {
        // Validate volume is between 0 and 1
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    setSoundEffectsVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    mute() {
        this.isMuted = true;
        this.updateAllVolumes();
    }

    unmute() {
        this.isMuted = false;
        this.updateAllVolumes();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.updateAllVolumes();
    }

    updateAllVolumes() {
        const effectVolume = this.isMuted ? 0 : this.soundVolume * this.masterVolume;
        const musicVolume = this.isMuted ? 0 : this.musicVolume * this.masterVolume;

        Object.values(this.sounds).forEach(sound => {
            if (sound && typeof sound.volume === 'function') sound.volume(effectVolume);
        });
        Object.values(this.music).forEach(music => {
            if (music && typeof music.volume === 'function') music.volume(musicVolume);
        });
    }

    // Play a sound effect
    playSound(soundType) {
        if (this.isMuted) return;
        try {
            const sound = this.sounds[soundType];
            if (sound && typeof sound.play === 'function') {
                sound.play();
            }
        } catch (error) {
            if (this.gameStateManager) {
                this.gameStateManager.setError(`Sound playback error: ${error.message}`);
            }
        }
    }

    // Start playing background music
    playMusic(musicType) {
        if (this.isMuted) return;
        this.stopAllMusic();
        const music = this.music[musicType];
        if (music && typeof music.play === 'function') music.play();
    }

    // Stop all music
    stopAllMusic() {
        Object.values(this.music).forEach(track => {
            if (!track) return;
            if (typeof track.stop === 'function') track.stop();
            else if (typeof track.pause === 'function') track.pause();
        });
    }
}

// Export sound types for use in other modules
export { SOUND_TYPES };

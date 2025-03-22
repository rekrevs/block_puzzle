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
    constructor() {
        console.log('SoundSystem: Initializing...');
        this.sounds = {};
        this.music = {};
        this.isMuted = false;
        this.musicVolume = 0.5;
        this.soundVolume = 0.7;
        
        // Check if Howler is available
        if (typeof Howl === 'undefined') {
            console.warn('SoundSystem: Howler.js not found, using stub implementation');
            this.initSoundStubs();
        } else {
            this.initSounds();
        }
    }
    
    initSounds() {
        try {
            // Initialize sound effects with Howler
            this.sounds = {
                [SOUND_TYPES.BLOCK_PLACE]: new Howl({
                    src: [SOUND_PATHS[SOUND_TYPES.BLOCK_PLACE]],
                    volume: this.soundVolume
                }),
                [SOUND_TYPES.BLOCK_INVALID]: new Howl({
                    src: [SOUND_PATHS[SOUND_TYPES.BLOCK_INVALID]],
                    volume: this.soundVolume
                }),
                [SOUND_TYPES.LINE_CLEAR]: new Howl({
                    src: [SOUND_PATHS[SOUND_TYPES.LINE_CLEAR]],
                    volume: this.soundVolume
                }),
                [SOUND_TYPES.MULTI_LINE_CLEAR]: new Howl({
                    src: [SOUND_PATHS[SOUND_TYPES.MULTI_LINE_CLEAR]],
                    volume: this.soundVolume
                }),
                [SOUND_TYPES.GAME_OVER]: new Howl({
                    src: [SOUND_PATHS[SOUND_TYPES.GAME_OVER]],
                    volume: this.soundVolume
                }),
                [SOUND_TYPES.MENU_SELECT]: new Howl({
                    src: [SOUND_PATHS[SOUND_TYPES.MENU_SELECT]],
                    volume: this.soundVolume
                })
            };
            
            // Initialize music with Howler
            this.music = {
                [SOUND_TYPES.MUSIC_MAIN]: new Howl({
                    src: [SOUND_PATHS[SOUND_TYPES.MUSIC_MAIN]],
                    volume: this.musicVolume,
                    loop: true
                }),
                [SOUND_TYPES.MUSIC_GAME_OVER]: new Howl({
                    src: [SOUND_PATHS[SOUND_TYPES.MUSIC_GAME_OVER]],
                    volume: this.musicVolume,
                    loop: false
                })
            };
            console.log('SoundSystem: Initialized with Howler.js');
        } catch (error) {
            console.error('SoundSystem: Error initializing sounds with Howler', error);
            this.initSoundStubs();
        }
    }
    
    initSoundStubs() {
        // Fallback stub implementations for sounds
        this.sounds = {
            [SOUND_TYPES.BLOCK_PLACE]: {
                play: () => console.log('Sound: Playing block place sound')
            },
            [SOUND_TYPES.BLOCK_INVALID]: {
                play: () => console.log('Sound: Playing invalid placement sound')
            },
            [SOUND_TYPES.LINE_CLEAR]: {
                play: () => console.log('Sound: Playing line clear sound')
            },
            [SOUND_TYPES.MULTI_LINE_CLEAR]: {
                play: () => console.log('Sound: Playing multi-line clear sound')
            },
            [SOUND_TYPES.GAME_OVER]: {
                play: () => console.log('Sound: Playing game over sound')
            },
            [SOUND_TYPES.MENU_SELECT]: {
                play: () => console.log('Sound: Playing menu select sound')
            }
        };
        
        // Music stubs
        this.music = {
            [SOUND_TYPES.MUSIC_MAIN]: {
                play: () => console.log('Music: Playing main game music'),
                stop: () => console.log('Music: Stopping main game music'),
                loop: true
            },
            [SOUND_TYPES.MUSIC_GAME_OVER]: {
                play: () => console.log('Music: Playing game over music'),
                stop: () => console.log('Music: Stopping game over music'),
                loop: false
            }
        };
        console.log('SoundSystem: Initialized with stubs');
    }
    
    // Play a sound effect
    playSound(soundType) {
        if (this.isMuted) return;
        
        const sound = this.sounds[soundType];
        if (sound) {
            if (typeof sound.play === 'function') {
                sound.play();
            }
        } else {
            console.warn(`SoundSystem: Sound ${soundType} not found`);
        }
    }
    
    // Start playing background music
    playMusic(musicType) {
        if (this.isMuted) return;
        
        // Stop any currently playing music
        this.stopAllMusic();
        
        const music = this.music[musicType];
        if (music) {
            if (typeof music.play === 'function') {
                music.play();
            }
            console.log(`SoundSystem: Playing ${musicType} music`);
        } else {
            console.warn(`SoundSystem: Music ${musicType} not found`);
        }
    }
    
    // Stop all music
    stopAllMusic() {
        Object.values(this.music).forEach(track => {
            if (track) {
                if (typeof track.stop === 'function') {
                    track.stop();
                } else if (typeof track.pause === 'function') {
                    // Howler uses stop(), but we'll handle pause too for compatibility
                    track.pause();
                }
            }
        });
    }
    
    // Toggle mute for all sounds and music
    toggleMute() {
        this.isMuted = !this.isMuted;
        console.log(`SoundSystem: Sound ${this.isMuted ? 'muted' : 'unmuted'}`);
        
        if (this.isMuted) {
            this.stopAllMusic();
        }
        
        // If using Howler, update all sound volumes
        if (typeof Howl !== 'undefined') {
            Object.values(this.sounds).forEach(sound => {
                if (sound && typeof sound.volume === 'function') {
                    sound.volume(this.isMuted ? 0 : this.soundVolume);
                }
            });
            
            Object.values(this.music).forEach(track => {
                if (track && typeof track.volume === 'function') {
                    track.volume(this.isMuted ? 0 : this.musicVolume);
                }
            });
        }
        
        return this.isMuted;
    }
    
    // Set volume for sound effects
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        console.log(`SoundSystem: Sound volume set to ${this.soundVolume}`);
        
        // Update volume for all sound effects if using Howler
        if (!this.isMuted && typeof Howl !== 'undefined') {
            Object.values(this.sounds).forEach(sound => {
                if (sound && typeof sound.volume === 'function') {
                    sound.volume(this.soundVolume);
                }
            });
        }
    }
    
    // Set volume for music
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        console.log(`SoundSystem: Music volume set to ${this.musicVolume}`);
        
        // Update volume for all music if using Howler
        if (!this.isMuted && typeof Howl !== 'undefined') {
            Object.values(this.music).forEach(track => {
                if (track && typeof track.volume === 'function') {
                    track.volume(this.musicVolume);
                }
            });
        }
    }
}

// Export sound types for use in other modules
export { SOUND_TYPES };

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SoundSystem, SOUND_TYPES } from '../js/soundSystem.js';

class MockHowl {
    constructor(opts) {
        this.opts = opts;
        this.currentVolume = opts.volume;
        this.playCount = 0;
        this.stopped = false;
        MockHowl.instances.push(this);
    }

    play() {
        this.playCount += 1;
        this.stopped = false;
    }

    stop() {
        this.stopped = true;
    }

    volume(v) {
        if (v !== undefined) this.currentVolume = v;
        return this.currentVolume;
    }
}

describe('SoundSystem mute behavior', () => {
    let system;

    beforeEach(() => {
        MockHowl.instances = [];
        globalThis.Howl = MockHowl;
        system = new SoundSystem(null);
    });

    afterEach(() => {
        delete globalThis.Howl;
    });

    const mainTheme = () => system.music[SOUND_TYPES.MUSIC_MAIN];
    const placeSound = () => system.sounds[SOUND_TYPES.BLOCK_PLACE];

    it('starts music while muted so unmuting resumes it audibly', () => {
        system.mute();
        system.playMusic(SOUND_TYPES.MUSIC_MAIN);

        expect(mainTheme().playCount).toBe(1);
        expect(mainTheme().currentVolume).toBe(0);

        system.unmute();
        expect(mainTheme().currentVolume).toBeCloseTo(system.musicVolume * system.masterVolume);
    });

    it('plays sound effects while muted at zero volume', () => {
        system.mute();
        system.playSound(SOUND_TYPES.BLOCK_PLACE);

        expect(placeSound().playCount).toBe(1);
        expect(placeSound().currentVolume).toBe(0);
    });

    it('mute after playback drops volumes to zero without stopping tracks', () => {
        system.playMusic(SOUND_TYPES.MUSIC_MAIN);
        system.mute();

        expect(mainTheme().stopped).toBe(false);
        expect(mainTheme().currentVolume).toBe(0);
        expect(placeSound().currentVolume).toBe(0);
    });

    it('playMusic stops the other track before starting', () => {
        system.playMusic(SOUND_TYPES.MUSIC_MAIN);
        system.playMusic(SOUND_TYPES.MUSIC_GAME_OVER);

        expect(mainTheme().stopped).toBe(true);
        expect(system.music[SOUND_TYPES.MUSIC_GAME_OVER].playCount).toBe(1);
    });
});

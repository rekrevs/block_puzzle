import { describe, it, expect, beforeEach, vi } from 'vitest';
import GameStateManager from '../js/GameStateManager.js';

describe('GameStateManager', () => {
    let mgr;
    beforeEach(() => {
        mgr = new GameStateManager();
    });

    it('starts with sane defaults', () => {
        const s = mgr.getState();
        expect(s.score).toBe(0);
        expect(s.isGameOver).toBe(false);
        expect(s.error).toBe(null);
    });

    it('updateState merges partial updates', () => {
        mgr.updateState({ score: 42 });
        expect(mgr.getState().score).toBe(42);
        expect(mgr.getState().isGameOver).toBe(false);
        mgr.updateState({ isGameOver: true });
        expect(mgr.getState().score).toBe(42);
        expect(mgr.getState().isGameOver).toBe(true);
    });

    it('addObserver registers callback that fires on every update', () => {
        const cb = vi.fn();
        mgr.addObserver(cb);
        mgr.updateState({ score: 1 });
        mgr.updateState({ score: 2 });
        expect(cb).toHaveBeenCalledTimes(2);
        expect(cb).toHaveBeenLastCalledWith(expect.objectContaining({ score: 2 }));
    });

    it('multiple observers all fire', () => {
        const a = vi.fn();
        const b = vi.fn();
        mgr.addObserver(a);
        mgr.addObserver(b);
        mgr.updateState({ score: 5 });
        expect(a).toHaveBeenCalledOnce();
        expect(b).toHaveBeenCalledOnce();
    });

    it('setError / clearError trigger observer with error field', () => {
        const cb = vi.fn();
        mgr.addObserver(cb);
        mgr.setError('boom');
        expect(mgr.getState().error).toBe('boom');
        mgr.clearError();
        expect(mgr.getState().error).toBe(null);
        expect(cb).toHaveBeenCalledTimes(2);
    });
});

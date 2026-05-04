import { describe, it, expect } from 'vitest';

describe('test rig sanity', () => {
    it('runs vitest', () => {
        expect(1 + 1).toBe(2);
    });

    it('has jsdom available', () => {
        const div = document.createElement('div');
        div.textContent = 'hello';
        expect(div.textContent).toBe('hello');
    });
});

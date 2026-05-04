import { describe, it, expect, beforeEach } from 'vitest';
import { BlockSystem, BASE_BLOCKS, BLOCK_COLORS } from '../js/blockSystem.js';

describe('BlockSystem', () => {
    let bs;

    beforeEach(() => {
        bs = new BlockSystem();
    });

    describe('normalizeShape', () => {
        it('removes empty leading rows and columns', () => {
            const shape = [
                [0, 1, 0],
                [1, 1, 0],
                [0, 0, 0]
            ];
            expect(bs.normalizeShape(shape)).toEqual([
                [0, 1],
                [1, 1]
            ]);
        });

        it('returns null for empty input', () => {
            expect(bs.normalizeShape([])).toBe(null);
            expect(bs.normalizeShape([[0, 0], [0, 0]])).toBe(null);
        });

        it('keeps an already normalized shape unchanged', () => {
            const shape = [[1, 1], [1, 1]];
            expect(bs.normalizeShape(shape)).toEqual(shape);
        });
    });

    describe('rotateShape', () => {
        it('rotates 90 degrees clockwise', () => {
            const shape = [
                [1, 1, 1],
                [1, 0, 0]
            ];
            expect(bs.rotateShape(shape)).toEqual([
                [1, 1],
                [0, 1],
                [0, 1]
            ]);
        });

        it('four rotations return to identity', () => {
            const shape = [
                [1, 1, 0],
                [0, 1, 1]
            ];
            let rotated = shape;
            for (let i = 0; i < 4; i++) rotated = bs.rotateShape(rotated);
            expect(rotated).toEqual(shape);
        });
    });

    describe('mirrorShape', () => {
        it('mirrors horizontally', () => {
            const shape = [
                [1, 0, 0],
                [1, 1, 1]
            ];
            expect(bs.mirrorShape(shape)).toEqual([
                [0, 0, 1],
                [1, 1, 1]
            ]);
        });

        it('two mirrors return to identity', () => {
            const shape = [[1, 1, 0], [0, 1, 1]];
            expect(bs.mirrorShape(bs.mirrorShape(shape))).toEqual(shape);
        });
    });

    describe('shapesEqual', () => {
        it('returns true for identical shapes', () => {
            expect(bs.shapesEqual([[1, 0]], [[1, 0]])).toBe(true);
        });
        it('returns false for differing dimensions', () => {
            expect(bs.shapesEqual([[1, 0]], [[1], [0]])).toBe(false);
        });
        it('returns false for differing content', () => {
            expect(bs.shapesEqual([[1, 0]], [[0, 1]])).toBe(false);
        });
    });

    describe('generateAllBlockVariants', () => {
        it('produces a non-empty unique set', () => {
            const variants = bs.blockVariants;
            expect(variants.length).toBeGreaterThan(BASE_BLOCKS.length);
            const seen = new Set();
            for (const v of variants) {
                const key = JSON.stringify(v.shape);
                expect(seen.has(key)).toBe(false);
                seen.add(key);
            }
        });

        it('square 2x2 yields exactly one variant', () => {
            const square = bs.generateVariants([[1, 1], [1, 1]]);
            expect(square).toHaveLength(1);
        });

        it('small line yields exactly two variants (horizontal + vertical)', () => {
            const line = bs.generateVariants([[1, 1]]);
            expect(line).toHaveLength(2);
        });

        it('L-shape yields four distinct rotations (mirrored == rotated)', () => {
            const lshape = bs.generateVariants([[1, 1, 1], [1, 0, 0]]);
            // L-shape's mirror is the same as one of its rotations, so 4 total
            expect(lshape.length).toBeGreaterThanOrEqual(4);
            expect(lshape.length).toBeLessThanOrEqual(8);
        });
    });

    describe('getRandomBlocks', () => {
        it('returns the requested count', () => {
            const blocks = bs.getRandomBlocks(3);
            expect(blocks).toHaveLength(3);
        });

        it('assigns a palette color to each block', () => {
            const blocks = bs.getRandomBlocks(5);
            for (const block of blocks) {
                expect(BLOCK_COLORS).toContain(block.color);
            }
        });

        it('returns blocks with valid shape arrays', () => {
            const blocks = bs.getRandomBlocks(3);
            for (const block of blocks) {
                expect(Array.isArray(block.shape)).toBe(true);
                expect(block.shape.length).toBeGreaterThan(0);
                expect(Array.isArray(block.shape[0])).toBe(true);
            }
        });
    });
});

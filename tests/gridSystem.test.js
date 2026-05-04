import { describe, it, expect, beforeEach } from 'vitest';
import { GridSystem } from '../js/gridSystem.js';

function setupGridDom() {
    document.body.innerHTML = '<div id="gameGrid"></div>';
}

describe('GridSystem', () => {
    let grid;

    beforeEach(() => {
        setupGridDom();
        grid = new GridSystem(8, 8);
    });

    describe('canPlaceBlock', () => {
        it('accepts valid placement on empty grid', () => {
            const block = { shape: [[1, 1], [1, 1]], color: '#4285F4' };
            expect(grid.canPlaceBlock(block, 0, 0)).toBe(true);
            expect(grid.canPlaceBlock(block, 6, 6)).toBe(true);
        });

        it('rejects placement out of bounds', () => {
            const block = { shape: [[1, 1], [1, 1]], color: '#4285F4' };
            expect(grid.canPlaceBlock(block, 7, 7)).toBe(false);
            expect(grid.canPlaceBlock(block, -1, 0)).toBe(false);
            expect(grid.canPlaceBlock(block, 0, -1)).toBe(false);
        });

        it('rejects placement that overlaps an existing block', () => {
            const block = { shape: [[1, 1], [1, 1]], color: '#4285F4' };
            grid.placeBlock(block, 0, 0);
            expect(grid.canPlaceBlock(block, 0, 0)).toBe(false);
            expect(grid.canPlaceBlock(block, 1, 1)).toBe(false);
        });

        it('allows placement adjacent to filled cells', () => {
            const block = { shape: [[1, 1], [1, 1]], color: '#4285F4' };
            grid.placeBlock(block, 0, 0);
            expect(grid.canPlaceBlock(block, 0, 2)).toBe(true);
        });
    });

    describe('placeBlock', () => {
        it('mutates grid and DOM', () => {
            const block = { shape: [[1, 1]], color: '#EA4335' };
            const ok = grid.placeBlock(block, 3, 3);
            expect(ok).toBe(true);
            expect(grid.grid[3][3]).toBe('#EA4335');
            expect(grid.grid[3][4]).toBe('#EA4335');
            const cell = grid.getCellElement(3, 3);
            expect(cell.classList.contains('filled')).toBe(true);
        });

        it('returns false when invalid', () => {
            const block = { shape: [[1, 1]], color: '#EA4335' };
            grid.placeBlock(block, 0, 0);
            expect(grid.placeBlock(block, 0, 0)).toBe(false);
        });
    });

    describe('clearLines', () => {
        function fillRow(grid, row, color = '#4285F4') {
            for (let c = 0; c < grid.width; c++) {
                grid.grid[row][c] = color;
                const cell = grid.getCellElement(row, c);
                cell.style.backgroundColor = color;
                cell.classList.add('filled');
            }
        }

        function fillCol(grid, col, color = '#4285F4') {
            for (let r = 0; r < grid.height; r++) {
                grid.grid[r][col] = color;
                const cell = grid.getCellElement(r, col);
                cell.style.backgroundColor = color;
                cell.classList.add('filled');
            }
        }

        it('clears a single full row', () => {
            fillRow(grid, 3);
            const result = grid.clearLines();
            expect(result.rowsCleared).toBe(1);
            expect(result.colsCleared).toBe(0);
            expect(grid.grid[3].every(c => c === null)).toBe(true);
        });

        it('clears a single full column', () => {
            fillCol(grid, 5);
            const result = grid.clearLines();
            expect(result.rowsCleared).toBe(0);
            expect(result.colsCleared).toBe(1);
            for (let r = 0; r < grid.height; r++) {
                expect(grid.grid[r][5]).toBe(null);
            }
        });

        it('clears multiple rows and columns simultaneously', () => {
            fillRow(grid, 0);
            fillRow(grid, 7);
            fillCol(grid, 0);
            fillCol(grid, 7);
            const result = grid.clearLines();
            expect(result.rowsCleared).toBe(2);
            expect(result.colsCleared).toBe(2);
        });

        it('returns zero score when nothing to clear', () => {
            const result = grid.clearLines();
            expect(result.score).toBe(0);
            expect(result.rowsCleared).toBe(0);
            expect(result.colsCleared).toBe(0);
        });

        it('clears transform style on cleared cells', () => {
            fillRow(grid, 2);
            // Simulate previewLineClear having set transform
            for (let c = 0; c < grid.width; c++) {
                grid.getCellElement(2, c).style.transform = 'scale(0.95)';
            }
            grid.clearLines();
            for (let c = 0; c < grid.width; c++) {
                expect(grid.getCellElement(2, c).style.transform).toBe('');
            }
        });
    });

    describe('isGridEmpty', () => {
        it('true for new grid', () => {
            expect(grid.isGridEmpty()).toBe(true);
        });

        it('false after placing a block', () => {
            const block = { shape: [[1]], color: '#4285F4' };
            grid.placeBlock(block, 0, 0);
            expect(grid.isGridEmpty()).toBe(false);
        });

        it('true after clearing all', () => {
            const block = { shape: [[1]], color: '#4285F4' };
            grid.placeBlock(block, 0, 0);
            grid.grid[0][0] = null;
            expect(grid.isGridEmpty()).toBe(true);
        });
    });

    describe('canPlaceAnyBlock', () => {
        it('true for empty grid + any block', () => {
            const block = { shape: [[1, 1, 1, 1, 1]], color: '#4285F4' };
            expect(grid.canPlaceAnyBlock([block])).toBe(true);
        });

        it('false when grid is full and block does not fit anywhere', () => {
            for (let r = 0; r < grid.height; r++) {
                for (let c = 0; c < grid.width; c++) {
                    grid.grid[r][c] = '#4285F4';
                }
            }
            const block = { shape: [[1]], color: '#4285F4' };
            expect(grid.canPlaceAnyBlock([block])).toBe(false);
        });

        it('false for empty input list', () => {
            expect(grid.canPlaceAnyBlock([])).toBe(false);
            expect(grid.canPlaceAnyBlock(null)).toBe(false);
        });
    });
});

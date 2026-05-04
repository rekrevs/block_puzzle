import { describe, it, expect, beforeEach } from 'vitest';
import { GridSystem } from '../js/gridSystem.js';

function setupGridDom() {
    document.body.innerHTML = '<div id="gameGrid"></div>';
}

function fillRow(grid, row, color = '#4285F4') {
    for (let c = 0; c < grid.width; c++) grid.grid[row][c] = color;
}
function fillCol(grid, col, color = '#4285F4') {
    for (let r = 0; r < grid.height; r++) grid.grid[r][col] = color;
}
// Adds a single filled cell that won't be cleared, so the grid never empties
// and the +200 full-grid-clear bonus does not apply.
function placeIsolatedBlocker(grid, row = 5, col = 5) {
    grid.grid[row][col] = '#34A853';
}

/**
 * Per SPECIFICATION.md:
 *   Line clear = 12 points per line. Each additional line adds 50% to the base score.
 *   Example: 3 lines = 12 + (12*1.5) + (12*2) = 54 points.
 *   Simultaneous row + column clears double the total.
 *   Full grid clear bonus: +200.
 */
describe('scoring (clearLines)', () => {
    let grid;
    beforeEach(() => {
        setupGridDom();
        grid = new GridSystem(8, 8);
    });

    it('1 row = 12 points', () => {
        fillRow(grid, 0);
        placeIsolatedBlocker(grid);
        const { score } = grid.clearLines();
        expect(score).toBe(12);
    });

    it('1 column = 12 points', () => {
        fillCol(grid, 0);
        placeIsolatedBlocker(grid);
        const { score } = grid.clearLines();
        expect(score).toBe(12);
    });

    it('2 rows = 12 + 18 = 30', () => {
        fillRow(grid, 0);
        fillRow(grid, 1);
        placeIsolatedBlocker(grid);
        const { score } = grid.clearLines();
        expect(score).toBe(30);
    });

    it('3 rows = 12 + 18 + 24 = 54', () => {
        fillRow(grid, 0);
        fillRow(grid, 1);
        fillRow(grid, 2);
        placeIsolatedBlocker(grid);
        const { score } = grid.clearLines();
        expect(score).toBe(54);
    });

    it('1 row + 1 column simultaneously doubles: (12+18)*2 = 60', () => {
        fillRow(grid, 0);
        fillCol(grid, 7);
        placeIsolatedBlocker(grid, 4, 4);
        const { score } = grid.clearLines();
        expect(score).toBe(60);
    });

    it('full-grid clear adds the 200 bonus', () => {
        for (let r = 0; r < grid.height; r++) fillRow(grid, r);
        const { score } = grid.clearLines();
        // 8 rows + 8 cols = 16 lines, doubled because both rows and cols cleared.
        // Sum_{n=0..15} 12*(1 + n*0.5) = 192 + 720 = 912; doubled 1824; +200 bonus = 2024.
        expect(score).toBe(2024);
    });
});

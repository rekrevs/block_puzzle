export class GridSystem {
    constructor(width = 8, height = 8) {
        this.width = width;
        this.height = height;
        this.grid = Array(height).fill().map(() => Array(width).fill(null));
        this.element = document.getElementById('gameGrid');
        this.initializeGrid();
    }

    initializeGrid() {
        // Clear existing grid
        this.element.innerHTML = '';
        
        // Create grid cells
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                this.element.appendChild(cell);
            }
        }
    }

    // Check if a block can be placed at given position
    canPlaceBlock(block, row, col) {
        const shape = block.shape;
        
        // Check if block is within grid bounds
        if (row < 0 || col < 0 || 
            row + shape.length > this.height || 
            col + shape[0].length > this.width) {
            return false;
        }

        // Check for overlaps with existing blocks
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (shape[i][j] === 1 && this.grid[row + i][col + j] !== null) {
                    return false;
                }
            }
        }

        return true;
    }

    // Place a block on the grid
    placeBlock(block, row, col) {
        if (!this.canPlaceBlock(block, row, col)) {
            return false;
        }

        const shape = block.shape;
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (shape[i][j] === 1) {
                    this.grid[row + i][col + j] = block.color;
                    const cell = this.getCellElement(row + i, col + j);
                    cell.style.backgroundColor = block.color;
                    cell.classList.add('filled');
                }
            }
        }

        return true;
    }

    // Preview block placement
    previewPlacement(block, row, col) {
        this.clearPreview();
        
        if (!block || !block.shape) return false;
        
        const canPlace = this.canPlaceBlock(block, row, col);
        const previewOpacity = canPlace ? '80' : '40'; // More opaque for valid placements

        const shape = block.shape;
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (shape[i][j] === 1) {
                    const gridRow = row + i;
                    const gridCol = col + j;
                    if (gridRow >= 0 && gridRow < this.height && 
                        gridCol >= 0 && gridCol < this.width) {
                        const cell = this.getCellElement(gridRow, gridCol);
                        if (cell) {
                            // Skip already filled cells
                            if (!cell.classList.contains('filled')) {
                                // Use block's color for preview only on empty cells
                                cell.style.backgroundColor = block.color + previewOpacity;
                                cell.classList.add('preview');
                                cell.classList.toggle('invalid-placement', !canPlace);
                            }
                        }
                    }
                }
            }
        }
        
        // Only show line clear preview for valid placements
        if (canPlace) {
            this.previewLineClear(block, row, col);
        }
        return true;
    }

    // Clear placement preview
    clearPreview() {
        const cells = this.element.getElementsByClassName('grid-cell');
        for (const cell of cells) {
            // Only reset background color for non-filled cells
            if (!cell.classList.contains('filled')) {
                cell.style.backgroundColor = '';
                cell.style.transform = '';
            }
            cell.classList.remove('preview');
            cell.classList.remove('potential-clear');
            cell.classList.remove('invalid-placement');
        }
    }

    // Preview which lines would be cleared
    previewLineClear(block, row, col) {
        const affectedRows = new Set();
        const affectedCols = new Set();
        const shape = block.shape;

        // Find potentially affected rows and columns
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (shape[i][j] === 1) {
                    affectedRows.add(row + i);
                    affectedCols.add(col + j);
                }
            }
        }

        // Check each affected row
        for (const r of affectedRows) {
            if (this.wouldRowBeFull(r, block, row, col)) {
                for (let j = 0; j < this.width; j++) {
                    const cell = this.getCellElement(r, j);
                    if (!cell.classList.contains('preview')) {
                        cell.classList.add('potential-clear');
                        // Don't change color of filled cells
                        if (!cell.classList.contains('filled')) {
                            cell.style.backgroundColor = block.color + '40';
                            cell.style.transform = 'scale(0.95)';
                        }
                    }
                }
            }
        }

        // Check each affected column
        for (const c of affectedCols) {
            if (this.wouldColumnBeFull(c, block, row, col)) {
                for (let i = 0; i < this.height; i++) {
                    const cell = this.getCellElement(i, c);
                    if (!cell.classList.contains('preview')) {
                        cell.classList.add('potential-clear');
                        // Don't change color of filled cells
                        if (!cell.classList.contains('filled')) {
                            cell.style.backgroundColor = block.color + '40';
                            cell.style.transform = 'scale(0.95)';
                        }
                    }
                }
            }
        }
    }

    // Check if row would be full after placing block
    wouldRowBeFull(row, block, blockRow, blockCol) {
        const tempRow = [...this.grid[row]];
        
        // Add block to temporary row
        if (row >= blockRow && row < blockRow + block.shape.length) {
            for (let j = 0; j < block.shape[0].length; j++) {
                if (block.shape[row - blockRow][j] === 1) {
                    tempRow[blockCol + j] = block.color;
                }
            }
        }

        return tempRow.every(cell => cell !== null);
    }

    // Check if column would be full after placing block
    wouldColumnBeFull(col, block, blockRow, blockCol) {
        const tempCol = this.grid.map(row => row[col]);
        
        // Add block to temporary column
        if (col >= blockCol && col < blockCol + block.shape[0].length) {
            for (let i = 0; i < block.shape.length; i++) {
                if (block.shape[i][col - blockCol] === 1) {
                    tempCol[blockRow + i] = block.color;
                }
            }
        }

        return tempCol.every(cell => cell !== null);
    }

    // Get grid cell element at specified position
    getCellElement(row, col) {
        return this.element.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }

    // Clear filled lines and return score
    clearLines() {
        const clearedRows = new Set();
        const clearedCols = new Set();

        // Find full rows
        for (let i = 0; i < this.height; i++) {
            if (this.grid[i].every(cell => cell !== null)) {
                clearedRows.add(i);
            }
        }

        // Find full columns
        for (let j = 0; j < this.width; j++) {
            if (this.grid.every(row => row[j] !== null)) {
                clearedCols.add(j);
            }
        }

        // Clear rows
        clearedRows.forEach(row => {
            this.grid[row].fill(null);
            for (let j = 0; j < this.width; j++) {
                const cell = this.getCellElement(row, j);
                cell.style.backgroundColor = '';
                cell.classList.remove('filled');
            }
        });

        // Clear columns
        clearedCols.forEach(col => {
            for (let i = 0; i < this.height; i++) {
                this.grid[i][col] = null;
                const cell = this.getCellElement(i, col);
                cell.style.backgroundColor = '';
                cell.classList.remove('filled');
            }
        });

        // Calculate score
        let score = 0;
        const basePoints = 12;
        
        if (clearedRows.size > 0 || clearedCols.size > 0) {
            let multiplier = 1;
            
            // Add points for each line with increasing multiplier
            [...clearedRows, ...clearedCols].forEach((_, index) => {
                score += basePoints * (1 + index * 0.5);
            });

            // Double score if both rows and columns were cleared
            if (clearedRows.size > 0 && clearedCols.size > 0) {
                score *= 2;
            }

            // Check for full grid clear
            if (this.isGridEmpty()) {
                score += 200;
            }
        }

        return Math.floor(score);
    }

    // Check if grid is completely empty
    isGridEmpty() {
        return this.grid.every(row => row.every(cell => cell === null));
    }

    // Check if any of the given blocks can be placed
    canPlaceAnyBlock(blocks) {
        console.log('Checking if any blocks can be placed:', blocks);
        if (!blocks || blocks.length === 0) {
            console.log('No blocks to check');
            return false;
        }

        for (const block of blocks) {
            if (!block.shape || block.shape.length === 0) {
                console.log('Invalid block shape:', block);
                continue;
            }

            // Try every possible position on the grid
            for (let i = 0; i < this.height; i++) {
                for (let j = 0; j < this.width; j++) {
                    if (this.canPlaceBlock(block, i, j)) {
                        console.log(`Found valid placement for block at ${i},${j}:`, block);
                        return true;
                    }
                }
            }
        }

        console.log('No valid placements found for any blocks');
        return false;
    }
}

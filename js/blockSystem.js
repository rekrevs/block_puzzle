// Block colors from our rainbow palette
export const BLOCK_COLORS = [
    '#4285F4', // Google Blue
    '#EA4335', // Google Red
    '#FBBC05', // Google Yellow
    '#34A853'  // Google Green
];

// Base block definitions
export const BASE_BLOCKS = [
    {
        name: 'Square2x2',
        shape: [
            [1, 1],
            [1, 1]
        ]
    },
    {
        name: 'L-Shape',
        shape: [
            [1, 1, 1],
            [1, 0, 0]
        ]
    },
    {
        name: 'SmallLine',
        shape: [
            [1, 1]
        ]
    },
    {
        name: 'MediumLine',
        shape: [
            [1, 1, 1]
        ]
    },
    {
        name: 'LongLine',
        shape: [
            [1, 1, 1, 1]
        ]
    },
    {
        name: 'ExtraLongLine',
        shape: [
            [1, 1, 1, 1, 1]
        ]
    },
    {
        name: 'Hook',
        shape: [
            [1, 0],
            [1, 1]
        ]
    },
    {
        name: 'ExtendedL',
        shape: [
            [1, 1, 1],
            [1, 0, 0],
            [1, 0, 0]
        ]
    },
    {
        name: 'Square3x3',
        shape: [
            [1, 1, 1],
            [1, 1, 1],
            [1, 1, 1]
        ]
    },
    {
        name: 'ZigZag',
        shape: [
            [0, 1, 1],
            [1, 1, 0]
        ]
    },
    {
        name: 'Rectangle2x3',
        shape: [
            [1, 1, 1],
            [1, 1, 1]
        ]
    },
    {
        name: 'T-Shape',
        shape: [
            [1, 0],
            [1, 1],
            [1, 0]
        ]
    }
];

export class BlockSystem {
    constructor() {
        this.blockVariants = this.generateAllBlockVariants();
    }

    // Normalize a block shape by moving it to top-left alignment
    normalizeShape(shape) {
        if (!shape || shape.length === 0 || shape[0].length === 0) return null;

        // Find the bounds of the shape
        let minRow = shape.length;
        let minCol = shape[0].length;
        let maxRow = -1;
        let maxCol = -1;

        // Find the actual bounds of the shape (excluding empty rows/columns)
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (shape[i][j] === 1) {
                    minRow = Math.min(minRow, i);
                    minCol = Math.min(minCol, j);
                    maxRow = Math.max(maxRow, i);
                    maxCol = Math.max(maxCol, j);
                }
            }
        }

        // If no filled cells found, return null
        if (maxRow === -1) return null;

        // Create the normalized shape
        const normalizedShape = [];
        for (let i = minRow; i <= maxRow; i++) {
            const row = [];
            for (let j = minCol; j <= maxCol; j++) {
                row.push(shape[i][j]);
            }
            normalizedShape.push(row);
        }

        return normalizedShape;
    }

    // Rotate a shape 90 degrees clockwise
    rotateShape(shape) {
        const rows = shape.length;
        const cols = shape[0].length;
        const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                rotated[j][rows - 1 - i] = shape[i][j];
            }
        }
        
        return rotated;
    }

    // Mirror a shape horizontally
    mirrorShape(shape) {
        return shape.map(row => [...row].reverse());
    }

    // Compare two shapes for equality
    shapesEqual(shape1, shape2) {
        if (shape1.length !== shape2.length || shape1[0].length !== shape2[0].length) {
            return false;
        }

        for (let i = 0; i < shape1.length; i++) {
            for (let j = 0; j < shape1[i].length; j++) {
                if (shape1[i][j] !== shape2[i][j]) {
                    return false;
                }
            }
        }

        return true;
    }

    // Check if a shape already exists in our collection
    shapeExists(shape, shapes) {
        return shapes.some(existing => this.shapesEqual(existing.shape, shape));
    }

    // Generate all unique variants (rotations and mirrors) of a base shape
    generateVariants(baseShape) {
        const variants = [];
        const consider = shape => {
            const normalized = this.normalizeShape(shape);
            if (normalized && !this.shapeExists(normalized, variants)) {
                variants.push({ shape: normalized });
            }
        };

        let current = baseShape;
        for (let i = 0; i < 4; i++) {
            consider(current);
            current = this.rotateShape(current);
        }

        current = this.mirrorShape(baseShape);
        for (let i = 0; i < 4; i++) {
            consider(current);
            current = this.rotateShape(current);
        }

        return variants;
    }

    // Generate all block variants from base blocks
    generateAllBlockVariants() {
        const allVariants = [];
        BASE_BLOCKS.forEach(baseBlock => {
            const variants = this.generateVariants(baseBlock.shape);
            variants.forEach((variant, index) => {
                allVariants.push({
                    id: `${baseBlock.name}-${index}`,
                    baseShape: baseBlock.name,
                    shape: variant.shape
                });
            });
        });
        return allVariants;
    }

    // Get a random selection of blocks with random colors
    getRandomBlocks(count) {
        const pool = [...this.blockVariants];
        const selected = [];

        while (selected.length < count && pool.length > 0) {
            const index = Math.floor(Math.random() * pool.length);
            const variant = pool.splice(index, 1)[0];
            const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
            selected.push({ ...variant, color });
        }

        return selected;
    }
}

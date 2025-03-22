# Block Puzzle Game Specification

## Core Game Mechanics

### Grid and Layout
- Grid size: M×N (default 8×8)
- Clear grid lines for block placement
- Score display above grid
- Three available blocks displayed below grid
- Modern, clean interface with subtle grid markers

### Block System
```javascript
// Example block definition format
{
  id: "L3",           // Unique ID
  baseShape: "L",     // Original shape type
  color: "#0000FF",   // Block color (from predefined palette)
  shape: [            // Shape matrix, normalized to top-left
    [1, 0],
    [1, 0],
    [1, 1]
  ]
}

// Color palette
const BLOCK_COLORS = [
  '#0000FF', // Blue
  '#FF0000', // Red
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#800080', // Purple
  '#FFA500', // Orange
  '#00FFFF'  // Cyan
]
```

#### Base Block Shapes
1. Square (2×2)
   ```
   XX
   XX
   ```

2. L-Shape (3×2)
   ```
   XXX
   X
   ```

3. Small Line (2×1)
   ```
   XX
   ```

4. Medium Line (3×1)
   ```
   XXX
   ```

5. Long Line (4×1)
   ```
   XXXX
   ```

6. Extra Long Line (5×1)
   ```
   XXXXX
   ```

7. Hook Shape (3×2)
   ```
   X
   XX
   ```

8. Extended L (4×2)
   ```
   XXX
   X
   X
   ```

9. Square Plus (2×2)
   ```
   XX
   XX
   ```

10. Large Square (3×3)
    ```
    XXX
    XXX
    XXX
    ```

11. ZigZag (3×2)
    ```
    .XX
    XX.
    ```

12. Rectangle (2×3)
    ```
    XXX
    XXX
    ```

### Block Generation System
- Generate rotations and mirrors for each base block shape
- Normalization process:
  1. Find leftmost filled square(s) in the shape
  2. Find topmost filled square(s) in the shape
  3. Shift entire shape so these align with x=0 and y=0
  4. Store as minimal bounding box (no empty rows/columns)
- Deduplication:
  1. Compare normalized matrices exactly (size and content)
  2. If matrices match, blocks are duplicates
  3. Keep only one copy of each unique shape
- Example normalization:
  ```
  Original:  Normalized:
  0 1 0      1 0
  1 1 0  →   1 1
  0 0 0
  ```
- Assign colors randomly from predefined palette
- Each unique block variant becomes part of the selection pool

## Gameplay Flow

### Round Structure
1. Start with empty grid
2. Present three random blocks below grid:
   - Blocks appear in fixed positions with equal spacing
   - Each block centered in its area
   - Clear visual separation from main grid
3. For each block:
   - Player can drag any of the remaining blocks
   - Valid placement: block stays, move to next
   - Invalid placement: block returns to original position
   - If no valid placements possible: game ends
4. After all three blocks placed, new round begins

### Block Placement
- Drag and drop interface
- Visual feedback during drag:
  - Semi-transparent preview of placement position
  - Highlight potential line clears in block's color
- Center-based snapping for intuitive placement:
  - Calculate grid position based on the center of the block
  - Consistent snapping behavior in both horizontal and vertical directions
  - Block snaps to the grid cell that overlaps most with it
- Clean visual design with no bounding box artifacts during dragging
- Instant snap-back for invalid placements (no animation)
- Blocks cannot overlap or extend beyond grid

### Scoring System
1. Basic Points
   - Points per block = number of squares in block
   - Line clear = 12 points per line (row or column)
   - Multiple line clears:
     - Each additional line adds 50% to the base score
     - Example: 3 lines = 12 + (12 * 1.5) + (12 * 2) = 54 points
   - Simultaneous row and column clears double the total
   - Full grid clear bonus: 200 points

### Game Over Conditions
- Occurs when no available block can be legally placed
- System proactively checks if any available block can be placed anywhere on the grid
- If no valid placements are possible, game over is declared immediately
- Check performed after each block placement and line clear
- Display final score and offer restart option

## Visual Design

### Block Styling
- Solid colors from rainbow palette
- Simple border for definition
- Semi-transparent version for placement preview
- No 3D effects in initial version

### Grid Design
- Light gridlines (1px, #CCCCCC)
- Empty cells: white background
- Filled cells: solid block color with 1px darker border
- Preview highlights:
  - Valid placement: semi-transparent block color (50% opacity)
  - Potential line clears: same color as block being placed (30% opacity)
  - Grid lines remain visible through highlights

### Animations
1. Block Placement
   - Smooth lifting effect on drag start
   - Gentle bounce on placement
   - Snap animation for grid alignment

2. Line Clearing
   - Brief highlight of completed lines
   - Fade-out effect for cleared blocks
   - Smooth collapse animation for remaining blocks

3. New Blocks
   - Fade-in with slight scale effect
   - Subtle bounce on appearance

## Audio System (Stubbed)

### Sound Effect Types
```javascript
const SOUND_EFFECTS = {
  BLOCK_PICKUP: 'pickup.mp3',
  BLOCK_PLACE: 'plonk.mp3',
  LINE_CLEAR: 'clear.mp3',
  MULTI_CLEAR: 'multi_clear.mp3',
  FULL_CLEAR: 'full_clear.mp3',
  GAME_OVER: 'game_over.mp3'
};
```

## Technical Implementation

### Required Libraries
1. Core Framework
   - Vanilla JavaScript (ES2025)
   - CSS3 for styling and basic animations

2. Drag and Drop
   - interact.js v2.x
   - Custom touch event handling for mobile

3. Animation
   - GSAP 5.x for complex animations
   - CSS transitions for simple effects

4. Audio
   - Howler.js 3.x for sound management

### Browser Support
- Modern browsers (last 2 versions)
- Mobile-first responsive design
- Touch and mouse input support

### Performance Considerations
- Efficient block collision detection
- Optimized line clearing checks
- Smooth animations (60 FPS target)
- Minimal DOM updates

## Code Architecture

### Module Structure
```
src/
├── core/
│   ├── GameState.js
│   ├── BlockManager.js
│   └── ScoreManager.js
├── ui/
│   ├── GridRenderer.js
│   ├── BlockRenderer.js
│   └── AnimationManager.js
├── utils/
│   ├── BlockGenerator.js
│   └── CollisionDetector.js
└── audio/
    └── SoundManager.js
```

### State Management
```javascript
class GameState {
  grid: number[][];           // Current grid state
  score: number;              // Current score
  availableBlocks: Block[];   // Current round's blocks
  gameOver: boolean;          // Game state
  combo: number;              // Current combo multiplier
}
```

This specification provides a solid foundation for implementing an engaging and polished block puzzle game while maintaining flexibility for future enhancements.

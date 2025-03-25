import { BlockSystem } from './blockSystem.js';
import { GridSystem } from './gridSystem.js';
import { SoundSystem, SOUND_TYPES } from './soundSystem.js';

class Game {
    constructor() {
        console.log('Game: Initializing...');
        // Set grid dimensions to 8x8
        const gridSize = 8;
        this.blockSystem = new BlockSystem();
        console.log('Game: BlockSystem created');
        this.gridSystem = new GridSystem(gridSize, gridSize);
        this.soundSystem = new SoundSystem();
        console.log('Game: SoundSystem created');
        console.log('Game: GridSystem created');
        this.score = 0;
        this.availableBlocks = [];
        this.draggingBlock = null;
        this.draggingElement = null;
        
        // Initialize audio controls before game setup
        this.initAudioControls();
        
        // Then set up the game
        this.setupGame();
        console.log('Game: Setup complete');
    }

    setupGame() {
        this.updateScore(0);
        this.generateNewBlocks();
        this.setupDragAndDrop();
        // Start background music
        this.soundSystem.playMusic(SOUND_TYPES.MUSIC_MAIN);
    }

    generateNewBlocks() {
        console.log('Game: Generating new blocks...');
        const blockContainer = document.getElementById('availableBlocks');
        if (!blockContainer) {
            console.error('Game: Could not find availableBlocks container!');
            return;
        }
        
        // Clear container and get new blocks
        blockContainer.innerHTML = '';
        const newBlocks = this.blockSystem.getRandomBlocks(3);
        
        // Deep copy the blocks to ensure data integrity
        this.availableBlocks = newBlocks.map(block => ({
            id: block.id,
            baseShape: block.baseShape,
            shape: block.shape.map(row => [...row]),
            color: block.color
        }));
        
        console.log('Game: Got random blocks:', this.availableBlocks);

        // Create DOM elements for blocks
        this.availableBlocks.forEach((block, index) => {
            console.log(`Game: Creating block element ${index}:`, block);
            const blockElement = this.createBlockElement(block);
            blockElement.dataset.blockIndex = index;
            blockContainer.appendChild(blockElement);
        });

        // Re-setup drag and drop for new blocks
        this.setupDragAndDrop();
        
        // Check if any block can be placed, if not, game over
        this.checkForGameOver();
    }

    createBlockElement(block) {
        const container = document.createElement('div');
        container.className = 'block';
        container.dataset.blockId = block.id;
        
        // Calculate the total size of the block
        const rows = block.shape.length;
        const cols = block.shape[0].length;
        
        // Create a wrapper with no visible boundaries
        container.style.position = 'relative';
        container.style.background = 'transparent';
        container.style.border = 'none';
        container.style.outline = 'none';
        container.style.width = `${cols * 40}px`; // 40px is --grid-size
        container.style.height = `${rows * 40}px`;
        
        // Create a grid for better alignment with no visible boundaries
        container.style.display = 'grid';
        container.style.gridTemplateRows = `repeat(${rows}, 40px)`;
        container.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
        container.style.gap = '0';
        
        // Only create cells for filled spaces
        for (let i = 0; i < block.shape.length; i++) {
            for (let j = 0; j < block.shape[i].length; j++) {
                if (block.shape[i][j] === 1) {
                    const cell = document.createElement('div');
                    cell.className = 'block-cell';
                    cell.style.backgroundColor = block.color;
                    cell.style.gridRow = `${i + 1}`;
                    cell.style.gridColumn = `${j + 1}`;
                    cell.style.border = 'none';
                    cell.style.outline = 'none';
                    container.appendChild(cell);
                }
            }
        }

        return container;
    }

    setupDragAndDrop() {
        // Remove any existing interact instances
        const blocks = document.querySelectorAll('.block');
        blocks.forEach(block => {
            if (block._interact) {
                block._interact.unset();
            }
        });

        // Reset any lingering dragging state
        this.draggingBlock = null;
        this.draggingElement = null;
        this.draggingBlockIndex = undefined;

        interact('.block').draggable({
            inertia: false,
            autoScroll: true,
            allowFrom: '.block',
            modifiers: [
                interact.modifiers.restrict({
                    restriction: '.game-container'
                })
            ],
            listeners: {
                start: event => {
                    // Ensure we're not already dragging something
                    if (this.draggingBlock || this.draggingElement) {
                        this.draggingBlock = null;
                        this.draggingElement = null;
                        this.draggingBlockIndex = undefined;
                    }
                    
                    this.onDragStart(event);
                    // Ensure immediate response
                    event.target.style.willChange = 'transform';
                    event.target.style.transition = 'none';
                },
                move: event => {
                    // Skip if we lost track of dragging element
                    if (!this.draggingElement || !this.draggingBlock) return;
                    
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                    
                    // Direct transform without requestAnimationFrame for immediate response
                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                    
                    // Call our move handler for grid preview
                    this.onDragMove(event);
                },
                end: event => {
                    event.target.style.willChange = 'auto';
                    this.onDragEnd(event);
                    
                    // Force reset the element's transform
                    event.target.style.transform = 'none';
                    event.target.setAttribute('data-x', 0);
                    event.target.setAttribute('data-y', 0);
                }
            }
        });
    }

    onDragStart(event) {
        // Ensure we're starting with the block element
        const blockElement = event.target.closest('.block');
        if (!blockElement) return;
        
        const blockIndex = parseInt(blockElement.dataset.blockIndex);
        console.log('Drag start - Block index:', blockIndex, 'Available blocks:', this.availableBlocks);
        
        if (blockIndex >= 0 && blockIndex < this.availableBlocks.length) {
            // Create a deep copy of the block including shape array
            const block = this.availableBlocks[blockIndex];
            this.draggingBlock = {
                id: block.id,
                baseShape: block.baseShape,
                shape: block.shape.map(row => [...row]),
                color: block.color
            };
            
            this.draggingElement = blockElement;
            this.draggingBlockIndex = blockIndex;
            blockElement.classList.add('dragging');
            
            // Store initial position
            const rect = blockElement.getBoundingClientRect();
            blockElement._initialX = rect.left;
            blockElement._initialY = rect.top;
            
            console.log('Started dragging block:', this.draggingBlock);
        } else {
            console.error('Invalid block index:', blockIndex);
        }
    }

    onDragMove(event) {
        if (!this.draggingElement || !this.draggingBlock) return;

        // Skip the transform calculation since it's already done in the interact move handler
        // This makes the preview update faster

        // Calculate grid position using the upper-left corner of the block
        const gridRect = this.gridSystem.element.getBoundingClientRect();
        const targetRect = this.draggingElement.getBoundingClientRect();
        
        const cellSize = 40; // var(--grid-size)
        
        // Get the upper-left corner coordinates
        const upperLeftX = targetRect.left;
        const upperLeftY = targetRect.top;
        
        // Calculate relative position to the grid
        const relativeX = upperLeftX - gridRect.left;
        const relativeY = upperLeftY - gridRect.top;
        
        // Round to the nearest grid cell
        const gridX = Math.round(relativeX / cellSize);
        const gridY = Math.round(relativeY / cellSize);
        
        // Block dimensions
        const blockRows = this.draggingBlock.shape.length;
        const blockCols = this.draggingBlock.shape[0].length;
        
        // No need to adjust since we're using the upper-left corner directly
        const adjustedGridX = gridX;
        const adjustedGridY = gridY;

        // Only show preview if over the grid
        if (adjustedGridX >= 0 && adjustedGridY >= 0 && 
            adjustedGridX + blockCols <= this.gridSystem.width && 
            adjustedGridY + blockRows <= this.gridSystem.height) {
            // Ensure we're using the correct block data
            const previewBlock = {
                ...this.draggingBlock,
                shape: this.draggingBlock.shape.map(row => [...row])
            };
            
            this.gridSystem.previewPlacement(previewBlock, adjustedGridY, adjustedGridX);
        } else {
            this.gridSystem.clearPreview();
        }
    }

    onDragEnd(event) {
        if (!this.draggingElement || this.draggingBlock === null || this.draggingBlockIndex === undefined) {
            console.log('Invalid drag end state');
            return;
        }

        const target = this.draggingElement;
        
        // Calculate grid position using the upper-left corner of the block
        const gridRect = this.gridSystem.element.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        
        const cellSize = 40; // var(--grid-size)
        
        // Get the upper-left corner coordinates
        const upperLeftX = targetRect.left;
        const upperLeftY = targetRect.top;
        
        // Calculate relative position to the grid
        const relativeX = upperLeftX - gridRect.left;
        const relativeY = upperLeftY - gridRect.top;
        
        // Round to the nearest grid cell
        const gridX = Math.round(relativeX / cellSize);
        const gridY = Math.round(relativeY / cellSize);
        
        // Block dimensions
        const blockRows = this.draggingBlock.shape.length;
        const blockCols = this.draggingBlock.shape[0].length;
        
        // No need to adjust since we're using the upper-left corner directly
        const adjustedGridX = gridX;
        const adjustedGridY = gridY;

        // Try to place the block
        if (this.gridSystem.canPlaceBlock(this.draggingBlock, adjustedGridY, adjustedGridX)) {
            console.log('Placing block at', adjustedGridY, adjustedGridX, 'Block:', this.draggingBlock);
            
            // Place block
            if (this.gridSystem.placeBlock(this.draggingBlock, adjustedGridY, adjustedGridX)) {
                console.log('Block placed successfully');
                // Play block placement sound
                this.soundSystem.playSound(SOUND_TYPES.BLOCK_PLACE);
                
                // Remove block from available blocks using stored index
                if (this.draggingBlockIndex !== undefined) {
                    // Remove the block element from DOM first
                    const blockElements = document.getElementById('availableBlocks').children;
                    for (let i = 0; i < blockElements.length; i++) {
                        if (parseInt(blockElements[i].dataset.blockIndex) === this.draggingBlockIndex) {
                            blockElements[i].remove();
                            break;
                        }
                    }
                    
                    // Then remove from available blocks array
                    this.availableBlocks.splice(this.draggingBlockIndex, 1);
                    console.log('Removed block from available blocks. Remaining:', [...this.availableBlocks]);
                    
                    // Update indices of remaining block elements
                    Array.from(document.getElementById('availableBlocks').children).forEach((elem, idx) => {
                        elem.dataset.blockIndex = idx.toString();
                    });
                }
                
                // Clear any previews
                this.gridSystem.clearPreview();
                
                // Update score
                const placementScore = this.calculatePlacementScore(this.draggingBlock);
                const clearScore = this.gridSystem.clearLines();
                
                // Play line clear sound if lines were cleared
                if (clearScore > 0) {
                    const linesCleared = clearScore / 10; // Assuming 10 points per line
                    if (linesCleared > 1) {
                        this.soundSystem.playSound(SOUND_TYPES.MULTI_LINE_CLEAR);
                    } else {
                        this.soundSystem.playSound(SOUND_TYPES.LINE_CLEAR);
                    }
                }
                
                this.updateScore(this.score + placementScore + clearScore);
            } else {
                console.error('Failed to place block');
            }

            // Generate new blocks if we're out
            if (this.availableBlocks.length === 0) {
                setTimeout(() => {
                    this.generateNewBlocks();
                    // The checkForGameOver is now called inside generateNewBlocks
                }, 100); // Small delay to ensure clean transition
            }
            // If we still have blocks, check if any can be placed
            else {
                this.checkForGameOver();
            }
        } else {
            // Instant snap back to original position
            target.style.transition = 'none';
            target.style.transform = 'none';
            target.setAttribute('data-x', 0);
            target.setAttribute('data-y', 0);
            
            // Play invalid placement sound
            this.soundSystem.playSound(SOUND_TYPES.BLOCK_INVALID);
            
            this.gridSystem.clearPreview();
            
            // Ensure dragged element returns to its original position in the available blocks area
            const blockContainer = document.getElementById('availableBlocks');
            if (blockContainer && !blockContainer.contains(target)) {
                blockContainer.appendChild(target);
            }
        }

        target.classList.remove('dragging');
        this.draggingBlock = null;
        this.draggingElement = null;
        this.draggingBlockIndex = undefined; // Clear stored index
    }

    calculatePlacementScore(block) {
        // Score is equal to the number of squares in the block
        return block.shape.reduce((sum, row) => 
            sum + row.reduce((rowSum, cell) => rowSum + cell, 0), 0);
    }

    updateScore(newScore) {
        this.score = newScore;
        document.getElementById('score').textContent = this.score;
    }

    checkForGameOver() {
        // Check if any available block can be placed on the grid
        const canPlaceAnyBlock = this.availableBlocks.some(block => {
            // Scan the entire grid for a valid placement
            for (let y = 0; y < this.gridSystem.height; y++) {
                for (let x = 0; x < this.gridSystem.width; x++) {
                    if (this.gridSystem.canPlaceBlock(block, y, x)) {
                        // Found a valid placement, no need to check further
                        return true;
                    }
                }
            }
            // No valid placement found for this block
            return false;
        });
        
        // If no block can be placed, game over
        if (!canPlaceAnyBlock) {
            console.log('Game over: No valid placements possible');
            this.gameOver();
            return true;
        }
        
        return false;
    }
    
    gameOver() {
        // Stop main game music and play game over sound
        this.soundSystem.stopAllMusic();
        this.soundSystem.playSound(SOUND_TYPES.GAME_OVER);
        this.soundSystem.playMusic(SOUND_TYPES.MUSIC_GAME_OVER);
        
        // Create game over overlay if it doesn't exist
        let overlay = document.getElementById('gameOverOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gameOverOverlay';
            overlay.className = 'game-over-overlay';
            
            const content = document.createElement('div');
            content.className = 'game-over-content';
            
            const title = document.createElement('h2');
            title.className = 'game-over-title';
            title.textContent = 'Game Over!';
            
            const scoreText = document.createElement('p');
            scoreText.className = 'game-over-score';
            scoreText.id = 'finalScore';
            
            const restartBtn = document.createElement('button');
            restartBtn.className = 'restart-button';
            restartBtn.textContent = 'Play Again';
            restartBtn.addEventListener('click', () => {
                overlay.classList.remove('visible');
                // Reset game after a brief delay for animation
                setTimeout(() => {
                    this.gridSystem = new GridSystem(8, 8);
                    this.score = 0;
                    this.setupGame();
                }, 300);
            });
            
            content.appendChild(title);
            content.appendChild(scoreText);
            content.appendChild(restartBtn);
            overlay.appendChild(content);
            document.body.appendChild(overlay);
        }
        
        // Update score and show overlay
        document.getElementById('finalScore').textContent = `Final Score: ${this.score}`;
        overlay.classList.add('visible');
    }

    initAudioControls() {
        const masterVolumeSlider = document.getElementById('masterVolume');
        const muteToggle = document.getElementById('muteToggle');

        // Initialize volume slider
        masterVolumeSlider.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value);
            this.soundSystem.setMasterVolume(volume);
        });

        // Initialize mute toggle
        muteToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.soundSystem.mute();
            } else {
                this.soundSystem.unmute();
            }
        });
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});

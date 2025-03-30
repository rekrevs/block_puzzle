import { BlockSystem } from './blockSystem.js';
import { GridSystem } from './gridSystem.js';
import { SoundSystem, SOUND_TYPES } from './soundSystem.js';
import GameStateManager from './GameStateManager.js';

const gameStateManager = new GameStateManager();

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
        this.pendingGameOverCheck = false;
        
        // Initialize audio controls before game setup
        this.initAudioControls();
        
        // Then set up the game
        this.setupGame();
        console.log('Game: Setup complete');
        
        // Set up animation frame handling
        this.lastTime = 0;
        this.setupAnimationLoop();
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
        
        // Schedule a game over check after generating new blocks
        this.scheduleGameOverCheck();
    }

    createBlockElement(block) {
        // Create a BlockGroup element - a wrapper for cells with no bounding box
        const blockGroup = document.createElement('div');
        blockGroup.className = 'block-group';
        blockGroup.dataset.blockId = block.id;
        
        // Store block dimensions and properties
        const rows = block.shape.length;
        const cols = block.shape[0].length;
        const cellSize = 40; // 40px is --grid-size
        
        // Add metadata about shape to the group
        blockGroup.dataset.rows = rows;
        blockGroup.dataset.cols = cols;
                
        // Track filled cell positions to calculate center and bounds
        const filledCells = [];
        
        // Create individual cell elements - no container with empty spaces
        for (let i = 0; i < block.shape.length; i++) {
            for (let j = 0; j < block.shape[i].length; j++) {
                if (block.shape[i][j] === 1) {
                    // Create cell with correct styling
                    const cell = document.createElement('div');
                    cell.className = 'block-cell';
                    cell.style.backgroundColor = block.color;
                    cell.style.width = `${cellSize}px`;
                    cell.style.height = `${cellSize}px`;
                    cell.style.position = 'absolute';
                    cell.style.left = `${j * cellSize}px`;
                    cell.style.top = `${i * cellSize}px`;
                    cell.style.border = 'none';
                    cell.style.outline = 'none';
                    
                    // Save position data for calculations
                    cell.dataset.row = i;
                    cell.dataset.col = j;
                    filledCells.push({row: i, col: j});
                    
                    // Add to block group
                    blockGroup.appendChild(cell);
                }
            }
        }
        
        // Get the overall block dimensions for proper positioning
        const top = Math.min(...filledCells.map(cell => cell.row)) * cellSize;
        const left = Math.min(...filledCells.map(cell => cell.col)) * cellSize;
        const right = (Math.max(...filledCells.map(cell => cell.col)) + 1) * cellSize;
        const bottom = (Math.max(...filledCells.map(cell => cell.row)) + 1) * cellSize;
        
        // Calculate exact width and height of the actual shape (not the bounding box)
        const width = right - left;
        const height = bottom - top;
        
        // Make the group match the shape's exact dimensions
        blockGroup.style.width = `${width}px`;
        blockGroup.style.height = `${height}px`;
        blockGroup.style.position = 'relative';
        blockGroup.style.cursor = 'grab';
        
        // Store important data for dragging
        blockGroup.dataset.width = width;
        blockGroup.dataset.height = height;
        
        return blockGroup;
    }

    setupDragAndDrop() {
        // Remove any existing interact instances
        const blockGroups = document.querySelectorAll('.block-group');
        blockGroups.forEach(blockGroup => {
            if (blockGroup._interact) {
                blockGroup._interact.unset();
            }
        });

        // Reset any lingering dragging state
        this.draggingBlock = null;
        this.draggingElement = null;
        this.draggingBlockIndex = undefined;

        interact('.block-group').draggable({
            inertia: false,
            autoScroll: true,
            allowFrom: '.block-group, .block-cell',
            ignoreFrom: 'img', // Ignore any images that might create ghosts
            modifiers: [
                interact.modifiers.restrict({
                    restriction: '.game-container'
                })
            ],
            listeners: {
                start: event => {
                    // Prevent default browser behavior and stop propagation
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // Ensure we're not already dragging something
                    if (this.draggingBlock || this.draggingElement) {
                        this.draggingBlock = null;
                        this.draggingElement = null;
                        this.draggingBlockIndex = undefined;
                        // Reset any previous transforms
                        this.dragX = undefined;
                        this.dragY = undefined;
                        this._lastDragX = undefined;
                        this._lastDragY = undefined;
                    }
                    
                    // Add dragging class to enable additional CSS - all styling should be in CSS
                    event.target.classList.add('dragging');
                    
                    // Call our drag start handler
                    this.onDragStart(event);
                    
                    // Mark the start time for performance tracking
                    this.dragStartTime = performance.now();
                },
                move: event => {
                    // Prevent default browser behavior and stop propagation
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // Skip if we lost track of dragging element
                    if (!this.draggingElement || !this.draggingBlock) return;
                    
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                    
                    // Store the values to use in animation frame
                    this.dragX = x;
                    this.dragY = y;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                    
                    // Let the animation frame handle transform updates for better performance
                    // This delegates the actual DOM update to our optimized animation loop
                    
                    // Call our move handler for grid preview
                    this.onDragMove(event);
                },
                end: event => {
                    // Prevent default browser behavior and stop propagation
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // Remove the dragging class
                    event.target.classList.remove('dragging');
                    
                    // Handle drag end logic
                    this.onDragEnd(event);
                    
                    // Reset drag tracking variables
                    this.dragX = undefined;
                    this.dragY = undefined;
                    this._lastDragX = undefined;
                    this._lastDragY = undefined;
                    
                    // Use CSS class for consistent handling of transform reset
                    // We'll remove it after a short delay to allow for any animations
                    event.target.classList.add('snap-back');
                    setTimeout(() => {
                        event.target.classList.remove('snap-back');
                        event.target.setAttribute('data-x', 0);
                        event.target.setAttribute('data-y', 0);
                    }, 200); // Longer timeout to match transition duration in CSS
                }
            }
        });
    }

    onDragStart(event) {
        // Ensure we're starting with the block group element
        const blockGroupElement = event.target.closest('.block-group');
        if (!blockGroupElement) return;
        
        const blockIndex = parseInt(blockGroupElement.dataset.blockIndex);
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
            
            this.draggingElement = blockGroupElement;
            this.draggingBlockIndex = blockIndex;
            blockGroupElement.classList.add('dragging');
            
            // Apply styles for better dragging experience
            blockGroupElement.style.zIndex = '100';
            
            // Add transition to all cells for smoother movement
            const cells = blockGroupElement.querySelectorAll('.block-cell');
            cells.forEach(cell => {
                cell.style.transition = 'none';
                cell.style.willChange = 'transform';
            });
            
            // Store initial position
            const rect = blockGroupElement.getBoundingClientRect();
            blockGroupElement._initialX = rect.left;
            blockGroupElement._initialY = rect.top;
            
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
                    // Game over check will happen after blocks are visible
                }, 100); // Small delay to ensure clean transition
            }
            // Schedule a game over check after a successful move
            this.scheduleGameOverCheck();
        } else {
            // Instant snap back to original position - use class for consistent styling
            target.classList.add('snap-back');
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
            
            // Remove any snap-back class after a delay to allow animation to complete
            setTimeout(() => {
                target.classList.remove('snap-back');
            }, 200);
        }

        // Final cleanup of drag state
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
        
        // Properly clean up resources before showing game over
        this.cleanup();
        
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
                    this.resetGame();
                }, 300);
            });
            
            content.appendChild(title);
            content.appendChild(scoreText);
            content.appendChild(restartBtn);
            overlay.appendChild(content);
            document.body.appendChild(overlay);
        } else {
            // If overlay exists, ensure we don't have multiple listeners
            const restartBtn = overlay.querySelector('.restart-button');
            if (restartBtn) {
                const newRestartBtn = restartBtn.cloneNode(true);
                newRestartBtn.addEventListener('click', () => {
                    overlay.classList.remove('visible');
                    setTimeout(() => {
                        this.resetGame();
                    }, 300);
                });
                restartBtn.parentNode.replaceChild(newRestartBtn, restartBtn);
            }
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

    setupAnimationLoop() {
        // Start the animation loop
        const animate = (currentTime) => {
            // Calculate delta time
            const deltaTime = currentTime - (this.lastTime || currentTime);
            this.lastTime = currentTime;
            
            // Update any animations
            this.updateAnimations(deltaTime);
            
            // Continue the loop
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        this.animationFrameId = requestAnimationFrame(animate);
    }
    
    stopAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    updateAnimations(deltaTime) {
        // Handle drag animations - Only update if the position has changed
        if (this.draggingElement && this.dragX !== undefined && this.dragY !== undefined) {
            // Store last position to avoid unnecessary DOM updates
            if (this._lastDragX !== this.dragX || this._lastDragY !== this.dragY) {
                // Update block position with requestAnimationFrame for smoother movement
                this.draggingElement.style.transform = `translate(${this.dragX}px, ${this.dragY}px)`;
                // Store last position
                this._lastDragX = this.dragX;
                this._lastDragY = this.dragY;
            }
        }
        
        // Could add other animations here in the future
    }
    
    /**
     * Schedule a game over check with a delay
     * This ensures the user can see new blocks before the game possibly ends
     */
    scheduleGameOverCheck() {
        // Only schedule if no check is already pending
        if (!this.pendingGameOverCheck) {
            this.pendingGameOverCheck = true;
            setTimeout(() => {
                // Check if any block can be placed, if not, game over
                this.checkForGameOver();
                this.pendingGameOverCheck = false;
            }, 500); // Half-second delay - enough to see blocks but not disrupt gameplay
        }
    }
    
    // Reset the game to its initial state
    resetGame() {
        console.log('Game: Resetting game state...');
        
        // Ensure proper cleanup before creating new game components
        this.cleanup();
        
        // Reset grid system
        this.gridSystem = new GridSystem(8, 8);
        
        // Reset score and game state flags
        this.score = 0;
        this.pendingGameOverCheck = false;
        
        // Clear block container
        const blockContainer = document.getElementById('availableBlocks');
        if (blockContainer) {
            blockContainer.innerHTML = '';
        }
        
        // Reinitialize the game
        this.setupGame();
        
        // Make sure animation loop is running
        if (!this.animationFrameId) {
            this.setupAnimationLoop();
        }
        
        console.log('Game: Reset complete');
    }
    
    // Clean up all resources and event handlers
    cleanup() {
        console.log('Game: Cleaning up resources...');
        // Stop animation loop
        this.stopAnimationLoop();
        
        // Remove any interact instances
        const blockGroups = document.querySelectorAll('.block-group');
        blockGroups.forEach(blockGroup => {
            if (blockGroup._interact) {
                blockGroup._interact.unset();
            }
        });
        
        // Clear audio event listeners
        const masterVolumeSlider = document.getElementById('masterVolume');
        const muteToggle = document.getElementById('muteToggle');
        
        if (masterVolumeSlider) {
            const newSlider = masterVolumeSlider.cloneNode(true);
            masterVolumeSlider.parentNode.replaceChild(newSlider, masterVolumeSlider);
        }
        
        if (muteToggle) {
            const newToggle = muteToggle.cloneNode(true);
            muteToggle.parentNode.replaceChild(newToggle, muteToggle);
        }
        
        // Reset game state
        this.draggingBlock = null;
        this.draggingElement = null;
        this.draggingBlockIndex = undefined;
        this.dragX = undefined;
        this.dragY = undefined;
        this._lastDragX = undefined;
        this._lastDragY = undefined;
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});

import { BlockSystem } from './blockSystem.js';
import { GridSystem } from './gridSystem.js';
import { SoundSystem, SOUND_TYPES } from './soundSystem.js';
import GameStateManager from './GameStateManager.js';
import { bindUI } from './uiBindings.js';

const GAME_OVER_CHECK_DELAY_MS = 500;
const GAME_OVER_CHECK_RETRY_MS = 200;
const SNAP_BACK_MS = 200;
const NEW_BLOCKS_DELAY_MS = 100;
const DEFAULT_CELL_SIZE_PX = 40;

class Game {
    constructor(stateManager) {
        this.gameStateManager = stateManager;
        this.blockSystem = new BlockSystem();
        this.gridSystem = new GridSystem(8, 8);
        this.soundSystem = new SoundSystem(stateManager);

        this.cellSize = this.readCellSize();
        this.score = 0;
        this.isGameOver = false;
        this.gameOverTimeoutId = null;
        this.blockInteractable = null;
        this.availableBlocks = [];
        this.dragState = null;
        this.dragRafId = null;
        this.audioListeners = [];
        this.onResize = () => {
            this.cellSize = this.readCellSize();
            if (this.dragState) {
                this.dragState.centerOffset = this.calculateBlockCenterOffset(this.dragState.block);
            }
        };
        window.addEventListener('resize', this.onResize);

        this.gameStateManager.updateState({
            score: 0,
            isGameOver: false,
            availableBlocks: [],
            draggingBlockId: null,
            pendingGameOverCheck: false,
            error: null
        });

        this.initAudioControls();
        this.setupDragAndDrop();
        this.setupGame();
    }

    readCellSize() {
        const raw = getComputedStyle(document.documentElement)
            .getPropertyValue('--grid-size').trim();
        const parsed = parseInt(raw, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CELL_SIZE_PX;
    }

    setupGame() {
        this.updateScore(0);
        this.generateNewBlocks();
        this.soundSystem.playMusic(SOUND_TYPES.MUSIC_MAIN);
    }

    generateNewBlocks() {
        if (this.isGameOver) return;

        const blockContainer = document.getElementById('availableBlocks');
        if (!blockContainer) {
            console.error('Game: availableBlocks container missing');
            return;
        }

        blockContainer.innerHTML = '';
        const newBlocks = this.blockSystem.getRandomBlocks(3);

        this.availableBlocks = newBlocks.map(block => ({
            id: block.id,
            baseShape: block.baseShape,
            shape: block.shape.map(row => [...row]),
            color: block.color
        }));

        this.availableBlocks.forEach((block, index) => {
            const blockElement = this.createBlockElement(block);
            blockElement.dataset.blockIndex = index;
            blockContainer.appendChild(blockElement);
        });

        this.publishAvailableBlocks();
        this.scheduleGameOverCheck();
    }

    createBlockElement(block) {
        const blockGroup = document.createElement('div');
        blockGroup.className = 'block-group';
        blockGroup.dataset.blockId = block.id;

        const cellSize = this.cellSize;
        const filledCells = [];

        for (let i = 0; i < block.shape.length; i++) {
            for (let j = 0; j < block.shape[i].length; j++) {
                if (block.shape[i][j] === 1) {
                    const cell = document.createElement('div');
                    cell.className = 'block-cell';
                    cell.style.backgroundColor = block.color;
                    cell.style.width = `${cellSize}px`;
                    cell.style.height = `${cellSize}px`;
                    cell.style.left = `${j * cellSize}px`;
                    cell.style.top = `${i * cellSize}px`;
                    cell.dataset.row = i;
                    cell.dataset.col = j;
                    filledCells.push({ row: i, col: j });
                    blockGroup.appendChild(cell);
                }
            }
        }

        const minRow = Math.min(...filledCells.map(c => c.row));
        const minCol = Math.min(...filledCells.map(c => c.col));
        const maxRow = Math.max(...filledCells.map(c => c.row));
        const maxCol = Math.max(...filledCells.map(c => c.col));
        const width = (maxCol - minCol + 1) * cellSize;
        const height = (maxRow - minRow + 1) * cellSize;

        blockGroup.style.width = `${width}px`;
        blockGroup.style.height = `${height}px`;
        blockGroup.style.position = 'relative';
        blockGroup.style.cursor = 'grab';
        blockGroup.dataset.width = width;
        blockGroup.dataset.height = height;

        return blockGroup;
    }

    setupDragAndDrop() {
        if (this.blockInteractable) {
            this.blockInteractable.unset();
            this.blockInteractable = null;
        }

        this.dragState = null;
        this.gameStateManager.updateState({ draggingBlockId: null });

        this.blockInteractable = interact('.block-group').draggable({
            inertia: false,
            autoScroll: true,
            allowFrom: '.block-group, .block-cell',
            ignoreFrom: 'img',
            modifiers: [
                interact.modifiers.restrict({ restriction: '.game-container' })
            ],
            listeners: {
                start: event => this.onDragStart(event),
                move: event => this.onDragMove(event),
                end: event => this.onDragEnd(event)
            }
        });
    }

    onDragStart(event) {
        event.preventDefault();
        event.stopPropagation();

        const blockGroupElement = event.target.closest('.block-group');
        if (!blockGroupElement) return;

        const blockIndex = parseInt(blockGroupElement.dataset.blockIndex, 10);
        if (!Number.isInteger(blockIndex) || blockIndex < 0 || blockIndex >= this.availableBlocks.length) {
            return;
        }

        const source = this.availableBlocks[blockIndex];
        const block = {
            id: source.id,
            baseShape: source.baseShape,
            shape: source.shape.map(row => [...row]),
            color: source.color
        };

        this.dragState = {
            block,
            element: blockGroupElement,
            blockIndex,
            centerOffset: this.calculateBlockCenterOffset(block),
            x: 0,
            y: 0,
            lastAppliedX: null,
            lastAppliedY: null
        };

        blockGroupElement.classList.add('dragging');
        blockGroupElement.style.zIndex = '100';
        this.gameStateManager.updateState({ draggingBlockId: block.id });
        this.startDragLoop();
    }

    onDragMove(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!this.dragState) return;
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
        this.dragState.x = x;
        this.dragState.y = y;

        const targetRect = target.getBoundingClientRect();
        const snapped = this.getSnappedGridPosition(targetRect);
        if (!snapped) {
            this.gridSystem.clearPreview();
            return;
        }

        const { gridX, gridY } = snapped;
        const blockRows = this.dragState.block.shape.length;
        const blockCols = this.dragState.block.shape[0].length;

        if (gridX >= 0 && gridY >= 0 &&
            gridX + blockCols <= this.gridSystem.width &&
            gridY + blockRows <= this.gridSystem.height) {
            this.gridSystem.previewPlacement(this.dragState.block, gridY, gridX);
        } else {
            this.gridSystem.clearPreview();
        }
    }

    onDragEnd(event) {
        event.preventDefault();
        event.stopPropagation();

        const state = this.dragState;
        if (!state) return;

        const target = state.element;
        const targetRect = target.getBoundingClientRect();
        const snapped = this.getSnappedGridPosition(targetRect);
        const gridX = snapped ? snapped.gridX : NaN;
        const gridY = snapped ? snapped.gridY : NaN;

        const placed = !Number.isNaN(gridX) && !Number.isNaN(gridY) &&
            this.gridSystem.canPlaceBlock(state.block, gridY, gridX) &&
            this.gridSystem.placeBlock(state.block, gridY, gridX);

        if (placed) {
            this.soundSystem.playSound(SOUND_TYPES.BLOCK_PLACE);
            this.removePlacedBlock(state.blockIndex);
            this.gridSystem.clearPreview();

            const placementScore = this.calculatePlacementScore(state.block);
            const clearResult = this.gridSystem.clearLines();
            const totalLinesCleared = clearResult.rowsCleared + clearResult.colsCleared;

            if (clearResult.score > 0) {
                this.soundSystem.playSound(
                    totalLinesCleared > 1 ? SOUND_TYPES.MULTI_LINE_CLEAR : SOUND_TYPES.LINE_CLEAR
                );
            }

            this.updateScore(this.score + placementScore + clearResult.score);

            if (this.availableBlocks.length === 0) {
                setTimeout(() => this.generateNewBlocks(), NEW_BLOCKS_DELAY_MS);
            }
            this.scheduleGameOverCheck();
        } else {
            this.soundSystem.playSound(SOUND_TYPES.BLOCK_INVALID);
            this.gridSystem.clearPreview();
            this.snapBack(target);
        }

        target.classList.remove('dragging');
        target.style.zIndex = '';
        this.dragState = null;
        this.gameStateManager.updateState({ draggingBlockId: null });
        this.stopDragLoop();
    }

    snapBack(target) {
        target.classList.add('snap-back');
        target.setAttribute('data-x', 0);
        target.setAttribute('data-y', 0);
        target.style.transform = '';
        setTimeout(() => target.classList.remove('snap-back'), SNAP_BACK_MS);
    }

    removePlacedBlock(blockIndex) {
        const container = document.getElementById('availableBlocks');
        if (!container) return;

        const elements = Array.from(container.children);
        const match = elements.find(el => parseInt(el.dataset.blockIndex, 10) === blockIndex);
        if (match) match.remove();

        this.availableBlocks.splice(blockIndex, 1);

        Array.from(container.children).forEach((elem, idx) => {
            elem.dataset.blockIndex = String(idx);
        });

        this.publishAvailableBlocks();
    }

    publishAvailableBlocks() {
        const summary = this.availableBlocks.map(block => ({
            id: block.id,
            color: block.color,
            shape: block.shape.map(row => [...row])
        }));
        this.gameStateManager.updateState({ availableBlocks: summary });
    }

    calculatePlacementScore(block) {
        return block.shape.reduce(
            (sum, row) => sum + row.reduce((rs, cell) => rs + cell, 0),
            0
        );
    }

    calculateBlockCenterOffset(block) {
        const shape = block.shape || [];
        const filled = [];
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] === 1) filled.push({ row, col });
            }
        }

        if (filled.length === 0) {
            const cols = (shape[0]?.length || 0) / 2;
            const rows = shape.length / 2;
            return {
                offsetCols: cols,
                offsetRows: rows,
                offsetXPx: cols * this.cellSize,
                offsetYPx: rows * this.cellSize
            };
        }

        const sumRows = filled.reduce((s, c) => s + c.row + 0.5, 0);
        const sumCols = filled.reduce((s, c) => s + c.col + 0.5, 0);
        const offsetRows = sumRows / filled.length;
        const offsetCols = sumCols / filled.length;
        return {
            offsetCols,
            offsetRows,
            offsetXPx: offsetCols * this.cellSize,
            offsetYPx: offsetRows * this.cellSize
        };
    }

    getSnappedGridPosition(targetRect) {
        if (!targetRect || !this.gridSystem || !this.gridSystem.element || !this.dragState) {
            return null;
        }

        const gridRect = this.gridSystem.element.getBoundingClientRect();
        const center = this.dragState.centerOffset;
        if (!center) return null;

        const relCenterX = (targetRect.left - gridRect.left) + center.offsetXPx;
        const relCenterY = (targetRect.top - gridRect.top) + center.offsetYPx;
        const gridX = Math.round((relCenterX / this.cellSize) - center.offsetCols);
        const gridY = Math.round((relCenterY / this.cellSize) - center.offsetRows);
        return { gridX, gridY };
    }

    updateScore(newScore) {
        this.score = newScore;
        this.gameStateManager.updateState({ score: this.score });
    }

    checkForGameOver() {
        if (this.isGameOver) return true;
        const canPlace = this.gridSystem.canPlaceAnyBlock(this.availableBlocks);
        if (!canPlace) {
            this.gameOver();
            return true;
        }
        return false;
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.gameStateManager.updateState({ isGameOver: true });

        this.soundSystem.stopAllMusic();
        this.soundSystem.playSound(SOUND_TYPES.GAME_OVER);
        this.soundSystem.playMusic(SOUND_TYPES.MUSIC_GAME_OVER);

        this.cleanup({ keepStateManagerListeners: true });

        this.showGameOverOverlay();
    }

    showGameOverOverlay() {
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

            content.appendChild(title);
            content.appendChild(scoreText);
            content.appendChild(restartBtn);
            overlay.appendChild(content);
            document.body.appendChild(overlay);
        }

        const restartBtn = overlay.querySelector('.restart-button');
        if (this.restartHandler && restartBtn) {
            restartBtn.removeEventListener('click', this.restartHandler);
        }
        this.restartHandler = () => this.handleRestart(overlay);
        if (restartBtn) restartBtn.addEventListener('click', this.restartHandler);

        document.getElementById('finalScore').textContent = `Final Score: ${this.score}`;
        overlay.classList.add('visible');
    }

    handleRestart(overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => this.resetGame(), 300);
    }

    initAudioControls() {
        // Remove any previously bound listeners (idempotent).
        this.removeAudioListeners();

        const masterVolumeSlider = document.getElementById('masterVolume');
        const muteToggle = document.getElementById('muteToggle');
        if (!masterVolumeSlider || !muteToggle) return;

        const initialVolume = parseFloat(masterVolumeSlider.value);
        if (Number.isFinite(initialVolume)) this.soundSystem.setMasterVolume(initialVolume);

        const onVolume = e => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) this.soundSystem.setMasterVolume(v);
        };
        const onMute = e => {
            if (e.target.checked) this.soundSystem.mute();
            else this.soundSystem.unmute();
        };

        masterVolumeSlider.addEventListener('input', onVolume);
        muteToggle.addEventListener('change', onMute);
        this.audioListeners.push(
            { el: masterVolumeSlider, type: 'input', fn: onVolume },
            { el: muteToggle, type: 'change', fn: onMute }
        );
    }

    removeAudioListeners() {
        for (const { el, type, fn } of this.audioListeners) {
            el.removeEventListener(type, fn);
        }
        this.audioListeners = [];
    }

    startDragLoop() {
        if (this.dragRafId) return;
        const tick = () => {
            if (!this.dragState) {
                this.dragRafId = null;
                return;
            }
            const { element, x, y, lastAppliedX, lastAppliedY } = this.dragState;
            if (x !== lastAppliedX || y !== lastAppliedY) {
                element.style.transform = `translate(${x}px, ${y}px)`;
                this.dragState.lastAppliedX = x;
                this.dragState.lastAppliedY = y;
            }
            this.dragRafId = requestAnimationFrame(tick);
        };
        this.dragRafId = requestAnimationFrame(tick);
    }

    stopDragLoop() {
        if (this.dragRafId) {
            cancelAnimationFrame(this.dragRafId);
            this.dragRafId = null;
        }
    }

    scheduleGameOverCheck() {
        if (this.isGameOver) return;
        if (this.gameOverTimeoutId) {
            clearTimeout(this.gameOverTimeoutId);
            this.gameOverTimeoutId = null;
        }

        this.gameStateManager.updateState({ pendingGameOverCheck: true });

        const fire = () => {
            if (this.isGameOver) return;
            // Avoid declaring game over while the player is mid-drag — retry shortly.
            if (this.dragState) {
                this.gameOverTimeoutId = setTimeout(fire, GAME_OVER_CHECK_RETRY_MS);
                return;
            }
            this.gameOverTimeoutId = null;
            this.gameStateManager.updateState({ pendingGameOverCheck: false });
            this.checkForGameOver();
        };

        this.gameOverTimeoutId = setTimeout(fire, GAME_OVER_CHECK_DELAY_MS);
    }

    clearScheduledGameOverCheck() {
        if (this.gameOverTimeoutId) {
            clearTimeout(this.gameOverTimeoutId);
            this.gameOverTimeoutId = null;
        }
        this.gameStateManager.updateState({ pendingGameOverCheck: false });
    }

    resetGame() {
        this.cleanup({ keepStateManagerListeners: true });

        this.gridSystem = new GridSystem(8, 8);
        this.score = 0;
        this.isGameOver = false;
        this.gameOverTimeoutId = null;
        this.cellSize = this.readCellSize();

        this.gameStateManager.updateState({
            isGameOver: false,
            pendingGameOverCheck: false,
            error: null
        });

        const blockContainer = document.getElementById('availableBlocks');
        if (blockContainer) blockContainer.innerHTML = '';

        this.availableBlocks = [];
        this.publishAvailableBlocks();

        this.initAudioControls();
        this.setupDragAndDrop();
        this.setupGame();
    }

    cleanup(options = {}) {
        this.stopDragLoop();
        this.clearScheduledGameOverCheck();

        if (this.blockInteractable) {
            this.blockInteractable.unset();
            this.blockInteractable = null;
        }

        this.removeAudioListeners();

        this.availableBlocks = [];
        if (!options.keepStateManagerListeners) {
            window.removeEventListener('resize', this.onResize);
        }
        this.publishAvailableBlocks();

        this.dragState = null;
        this.gameStateManager.updateState({ draggingBlockId: null });
    }
}

window.addEventListener('load', () => {
    const stateManager = new GameStateManager();
    bindUI(stateManager);
    new Game(stateManager);
});

export { Game };

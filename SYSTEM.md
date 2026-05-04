# Block Puzzle Game System Architecture

This document explains how the codebase is structured to fulfill the specification, describing module boundaries, responsibilities, and key design decisions.

## Overview

The game follows a component-based architecture with these systems:

1. **Game Core** (`main.js`) — bootstraps subsystems, owns the drag lifecycle, coordinates score and game-over flow.
2. **Grid System** (`gridSystem.js`) — owns the 8×8 grid, validation, placement, line-clearing math, and preview rendering.
3. **Block System** (`blockSystem.js`) — generates shape variants (rotations + mirrors) and supplies random selections.
4. **Sound System** (`soundSystem.js`) — Howler-based audio with a no-op stub fallback.
5. **State Manager** (`GameStateManager.js`) — single source of truth for UI-relevant state, broadcast via observers.
6. **UI Bindings** (`uiBindings.js`) — connects state to DOM (score, error toast).

## Module Layout

```
js/
├── blockSystem.js       // Block generation and variant logic
├── gridSystem.js        // Grid state, placement, clearing
├── soundSystem.js       // Audio playback and volume controls
├── GameStateManager.js  // Centralized state + observer pattern
├── uiBindings.js        // State → DOM bridge
└── main.js              // Game bootstrap, drag lifecycle, scoring
```

## Component Details

### Game Core (`main.js`)
- Reads `--grid-size` from CSS at startup and on `resize` so block snapping stays correct on every breakpoint.
- Owns a single `dragState` object during drag instead of a swarm of fields.
- Runs the drag-time `requestAnimationFrame` loop only while a drag is active.
- Stores audio listener references and removes them cleanly on reset (no `cloneNode` tricks).
- `setupDragAndDrop` runs once; `interact('.block-group')` matches new tiles dynamically.
- Schedules game-over checks with a 500 ms delay and a 200 ms retry while a drag is in progress.

### Grid System (`gridSystem.js`)
- Caches grid cell DOM nodes for O(1) access during previews and clears.
- `clearLines` returns `{ score, rowsCleared, colsCleared }`.
- Score formula iterates over `totalLines = rowsCleared + colsCleared` (deterministic), applies the row+column doubling, and adds the +200 full-grid-clear bonus when the grid empties.
- `clearLines` resets each cleared cell's `transform` and removes preview-related classes so no visual artifacts remain.

### Block System (`blockSystem.js`)
- 12 base shapes; rotations + mirrors deduplicated into 36 unique variants.
- Random selection draws from the variant pool with a palette color from the Google four-color palette.

### Sound System (`soundSystem.js`)
- Initializes Howler when present, otherwise installs no-op stubs that mirror Howler's `play`/`stop`/`volume` surface so muting and volume control behave identically in both modes.
- Reports load/playback failures via `GameStateManager.setError`, which `uiBindings.js` surfaces as a toast.

### State Manager (`GameStateManager.js`)
- State shape:
  ```javascript
  {
    score: number,
    isGameOver: boolean,
    error: string | null,
    availableBlocks: BlockSummary[],
    draggingBlockId: string | null,
    pendingGameOverCheck: boolean
  }
  ```
- `updateState` rejects unknown keys (whitelist).
- `addObserver` returns an unsubscribe function.

### UI Bindings (`uiBindings.js`)
- Subscribes to state changes once.
- Updates `#score` only when score actually changes.
- Shows/hides the error toast based on `state.error` with a 4-second auto-dismiss.

## External Dependencies

### Howler.js (v2.2.4)
- Cross-browser audio playback. Loaded via CDN.

### interact.js (v1.10+)
- Drag-and-drop with touch + mouse. Loaded via CDN.

### Vitest + JSDOM (dev only)
- Test runner and DOM environment for the test suites under `tests/`.

### Core Framework
- Vanilla JavaScript (ES modules)
- No frontend framework, no UI library

## Testing

Run `npm test`. Suites cover:
- `blockSystem.test.js` — normalization, rotation, mirroring, variant generation, random selection.
- `gridSystem.test.js` — placement, clearing rows/columns/both, transform cleanup, `canPlaceAnyBlock`.
- `scoring.test.js` — exact line-clear scoring per SPECIFICATION (1, 2, 3 lines; row+col doubling; +200 bonus).
- `gameStateManager.test.js` — observer fan-out, partial updates, error lifecycle.

## Notes for future work
- Persistence (localStorage for high scores and volume) is not implemented.
- Accessibility (ARIA, keyboard control) is out of scope in this iteration.
- Subresource integrity / CSP for the CDN scripts is not configured.

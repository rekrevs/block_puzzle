# Block Puzzle

A vanilla-JavaScript block puzzle game with drag-and-drop placement, line clearing, and combo scoring on an 8×8 grid.

## Quick start

```bash
# Play it: serve the static files (any local server works)
npm run serve     # → http://localhost:8080
# or simply open index.html via any static file server.
```

ES modules require an HTTP origin — opening `file://` directly does not work in most browsers.

## Tests

```bash
npm install
npm test           # one-shot run
npm run test:watch # watch mode
```

Test runner: [Vitest](https://vitest.dev) with [JSDOM](https://github.com/jsdom/jsdom) for DOM-touching tests. Suites cover block-shape generation, grid placement/clearing, scoring math, and the state manager's observer behavior.

## Project layout

```
index.html                # Entry point
styles.css                # All styling (responsive, no preprocessor)
js/
├── main.js               # Game class: bootstrap, drag lifecycle, scoring
├── blockSystem.js        # Base shapes + variant/rotation/mirror generation
├── gridSystem.js         # 8×8 grid model, placement, clearing, previews
├── soundSystem.js        # Howler.js wrapper with stub fallback
├── GameStateManager.js   # Centralized state with observer pattern
└── uiBindings.js         # Observer that pushes state into the DOM
sounds/                   # Effects + music (mp3)
tests/                    # Vitest suites
SPECIFICATION.md          # Product spec
SYSTEM.md                 # Architecture
STATUS.md                 # Project health snapshot
```

## Dependencies

Runtime (loaded via CDN, see `index.html`):

- [interact.js](https://interactjs.io) 1.10+ — drag and drop
- [Howler.js](https://howlerjs.com) 2.2.4 — audio playback (with a no-op stub fallback if Howler fails to load)

Dev:

- `vitest` — test runner
- `jsdom` — DOM environment for tests

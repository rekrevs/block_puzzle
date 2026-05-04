const ALLOWED_KEYS = new Set([
    'score',
    'isGameOver',
    'error',
    'availableBlocks',
    'draggingBlockId',
    'pendingGameOverCheck'
]);

class GameStateManager {
    constructor() {
        this.state = {
            score: 0,
            isGameOver: false,
            error: null,
            availableBlocks: [],
            draggingBlockId: null,
            pendingGameOverCheck: false
        };
        this.observers = [];
    }

    getState() {
        return this.state;
    }

    updateState(partial) {
        if (!partial || typeof partial !== 'object') return;
        const next = { ...this.state };
        for (const [key, value] of Object.entries(partial)) {
            if (!ALLOWED_KEYS.has(key)) continue;
            next[key] = value;
        }
        this.state = next;
        this.notifyObservers();
    }

    setError(error) {
        this.updateState({ error });
    }

    clearError() {
        this.updateState({ error: null });
    }

    addObserver(callback) {
        if (typeof callback !== 'function') return () => {};
        this.observers.push(callback);
        return () => {
            this.observers = this.observers.filter(o => o !== callback);
        };
    }

    notifyObservers() {
        for (const cb of this.observers) {
            try {
                cb(this.state);
            } catch (err) {
                console.error('Observer error:', err);
            }
        }
    }
}

export default GameStateManager;

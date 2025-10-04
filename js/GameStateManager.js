class GameStateManager {
  constructor() {
    this.state = {
      score: 0,
      level: 1,
      isGameOver: false,
      isPaused: false,
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

  updateState(newState) {
    this.state = { ...this.state, ...newState };
    this.notifyObservers();
  }

  setError(error) {
    this.updateState({ error });
  }

  clearError() {
    this.updateState({ error: null });
  }

  addObserver(callback) {
    this.observers.push(callback);
  }

  notifyObservers() {
    if (this.observers) {
      this.observers.forEach(callback => callback(this.state));
    }
  }
}

export default GameStateManager;

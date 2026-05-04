const ERROR_TOAST_TIMEOUT_MS = 4000;

export function bindUI(stateManager) {
    const scoreEl = document.getElementById('score');
    const errorToast = document.getElementById('errorToast');

    let lastScore;
    let lastError;
    let errorDismissTimer = null;

    const showError = message => {
        if (!errorToast) return;
        errorToast.textContent = message;
        errorToast.classList.add('visible');
        if (errorDismissTimer) clearTimeout(errorDismissTimer);
        errorDismissTimer = setTimeout(() => {
            errorToast.classList.remove('visible');
            stateManager.clearError();
            errorDismissTimer = null;
        }, ERROR_TOAST_TIMEOUT_MS);
    };

    const hideError = () => {
        if (!errorToast) return;
        errorToast.classList.remove('visible');
        if (errorDismissTimer) {
            clearTimeout(errorDismissTimer);
            errorDismissTimer = null;
        }
    };

    return stateManager.addObserver(state => {
        if (scoreEl && state.score !== lastScore) {
            scoreEl.textContent = state.score;
            lastScore = state.score;
        }
        if (state.error !== lastError) {
            if (state.error) showError(state.error);
            else hideError();
            lastError = state.error;
        }
    });
}

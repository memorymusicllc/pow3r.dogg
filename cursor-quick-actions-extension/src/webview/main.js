(function() {
    const vscode = acquireVsCodeApi();

    // Button click handlers
    document.querySelectorAll('.action-button').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            vscode.postMessage({
                type: 'executeAction',
                action: action
            });
        });
    });

    // Settings link
    document.getElementById('settings-link').addEventListener('click', (e) => {
        e.preventDefault();
        vscode.postMessage({
            type: 'openSettings'
        });
    });

    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'config':
                updateCustomButtonDescriptions(message.prompts);
                break;
        }
    });

    function updateCustomButtonDescriptions(prompts) {
        for (let i = 1; i <= 4; i++) {
            const descEl = document.getElementById(`custom${i}-desc`);
            const prompt = prompts[`custom${i}`];
            if (descEl) {
                if (prompt && prompt.trim()) {
                    // Show first 50 chars of prompt
                    const preview = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt;
                    descEl.textContent = preview;
                } else {
                    descEl.textContent = 'Click to configure';
                }
            }
        }
    }

    // Request initial config
    vscode.postMessage({ type: 'getConfig' });
})();



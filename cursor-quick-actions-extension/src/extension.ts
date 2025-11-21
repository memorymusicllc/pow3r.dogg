import * as vscode from 'vscode';
import { QuickActionsPanel } from './webview/panel';
import { Config } from './config';
import { MCPClient } from './mcp/client';

let mcpClient: MCPClient;

export function activate(context: vscode.ExtensionContext) {
  console.log('Cursor Quick Actions extension is now active');

  // Initialize MCP client
  const mcpConfig = Config.getMCPConfig();
  mcpClient = new MCPClient(mcpConfig);

  // Create webview panel provider
  const provider = new QuickActionsPanelProvider(context.extensionUri, mcpClient);

  // Register view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('quickActionsPanel', provider)
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('quickActions.deploy', () => {
      provider.executeAction('deploy');
    }),
    vscode.commands.registerCommand('quickActions.organize', () => {
      provider.executeAction('organize');
    }),
    vscode.commands.registerCommand('quickActions.review', () => {
      provider.executeAction('review');
    }),
    vscode.commands.registerCommand('quickActions.plan', () => {
      provider.executeAction('plan');
    }),
    vscode.commands.registerCommand('quickActions.custom1', () => {
      provider.executeAction('custom1');
    }),
    vscode.commands.registerCommand('quickActions.custom2', () => {
      provider.executeAction('custom2');
    }),
    vscode.commands.registerCommand('quickActions.custom3', () => {
      provider.executeAction('custom3');
    }),
    vscode.commands.registerCommand('quickActions.custom4', () => {
      provider.executeAction('custom4');
    }),
    vscode.commands.registerCommand('quickActions.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:quickActions');
    })
  );
}

export function deactivate() {
  if (mcpClient) {
    mcpClient.dispose();
  }
}

class QuickActionsPanelProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private mcpClient: MCPClient;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    mcpClient: MCPClient
  ) {
    this.mcpClient = mcpClient;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'executeAction':
          await this.executeAction(data.action);
          break;
        case 'getConfig':
          this.sendConfig();
          break;
        case 'updatePrompt':
          await Config.setCustomPrompt(data.button, data.prompt);
          this.sendConfig();
          break;
        case 'openSettings':
          vscode.commands.executeCommand('workbench.action.openSettings', '@ext:quickActions');
          break;
      }
    });

    // Send initial config
    this.sendConfig();
  }

  private sendConfig() {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'config',
        mcp: Config.getMCPConfig(),
        prompts: Config.getCustomPrompts()
      });
    }
  }

  public async executeAction(action: string) {
    const { QuickActionsPanel } = await import('./webview/panel');
    await QuickActionsPanel.executeAction(action, this.mcpClient);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Inline the JavaScript since we can't easily bundle it
    // The script will be embedded in the HTML

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quick Actions</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 10px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .button-container {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
            margin-top: 10px;
        }
        .action-button {
            padding: 12px;
            border: 1px solid var(--vscode-button-border);
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: pointer;
            border-radius: 4px;
            text-align: left;
            font-size: 13px;
            transition: background-color 0.2s;
        }
        .action-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .action-button:active {
            opacity: 0.8;
        }
        .action-button.primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .action-button.primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .button-label {
            font-weight: 500;
            margin-bottom: 4px;
        }
        .button-description {
            font-size: 11px;
            opacity: 0.8;
            margin-top: 4px;
        }
        .settings-link {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--vscode-panel-border);
            text-align: center;
        }
        .settings-link a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            font-size: 12px;
        }
        .settings-link a:hover {
            text-decoration: underline;
        }
        .status {
            font-size: 11px;
            opacity: 0.7;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="button-container">
        <button class="action-button primary" data-action="deploy">
            <div class="button-label">🚀 Deploy</div>
            <div class="button-description">Deploy to production</div>
        </button>
        <button class="action-button primary" data-action="organize">
            <div class="button-label">📁 Organize Repo</div>
            <div class="button-description">Clean up repository structure</div>
        </button>
        <button class="action-button primary" data-action="review">
            <div class="button-label">🔍 Code Review</div>
            <div class="button-description">Generate detailed code review</div>
        </button>
        <button class="action-button primary" data-action="plan">
            <div class="button-label">📋 Generate Plan</div>
            <div class="button-description">Create XMAP.json blueprint</div>
        </button>
        <button class="action-button" data-action="custom1">
            <div class="button-label">Custom 1</div>
            <div class="button-description" id="custom1-desc">Click to configure</div>
        </button>
        <button class="action-button" data-action="custom2">
            <div class="button-label">Custom 2</div>
            <div class="button-description" id="custom2-desc">Click to configure</div>
        </button>
        <button class="action-button" data-action="custom3">
            <div class="button-label">Custom 3</div>
            <div class="button-description" id="custom3-desc">Click to configure</div>
        </button>
        <button class="action-button" data-action="custom4">
            <div class="button-label">Custom 4</div>
            <div class="button-description" id="custom4-desc">Click to configure</div>
        </button>
    </div>
    <div class="settings-link">
        <a href="#" id="settings-link">⚙️ Configure Settings</a>
    </div>
    <script>
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
                    const descEl = document.getElementById(\`custom\${i}-desc\`);
                    const prompt = prompts[\`custom\${i}\`];
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
    </script>
</body>
</html>`;
  }
}


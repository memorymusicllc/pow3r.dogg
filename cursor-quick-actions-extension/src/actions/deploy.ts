import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { MCPClient } from '../mcp/client';

export class DeployAction {
  public static async execute(workspaceFolder: vscode.WorkspaceFolder, mcpClient: MCPClient): Promise<void> {
    const rootPath = workspaceFolder.uri.fsPath;
    
    // Detect project type
    const packageJsonPath = path.join(rootPath, 'package.json');
    const hasPackageJson = fs.existsSync(packageJsonPath);
    
    if (!hasPackageJson) {
      vscode.window.showErrorMessage('No package.json found. Cannot determine deployment method.');
      return;
    }

    // Read package.json to find deploy script
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const scripts = packageJson.scripts || {};
    
    // Look for deploy scripts
    const deployScript = scripts['deploy:production'] || scripts['deploy'] || scripts['build'];
    
    if (!deployScript) {
      vscode.window.showErrorMessage('No deployment script found in package.json');
      return;
    }

    // Show progress
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Deploying...',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Starting deployment...' });

      // Execute deployment command
      const terminal = vscode.window.createTerminal('Deploy');
      terminal.show();
      
      // Change to workspace directory
      terminal.sendText(`cd "${rootPath}"`);
      
      // Run deploy command
      if (deployScript.includes('npm')) {
        terminal.sendText(`npm run ${scripts['deploy:production'] ? 'deploy:production' : 'deploy'}`);
      } else {
        terminal.sendText(deployScript);
      }

      progress.report({ increment: 50, message: 'Deployment command executed' });

      // Notify Abi if MCP client is configured
      try {
        await mcpClient.notify('deployment_started', {
          project: packageJson.name || 'unknown',
          script: deployScript,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        // Non-critical, just log
        console.warn('Failed to notify Abi:', error);
      }

      progress.report({ increment: 100, message: 'Deployment initiated' });
      
      vscode.window.showInformationMessage('Deployment command executed in terminal. Check terminal for output.');
    });
  }
}



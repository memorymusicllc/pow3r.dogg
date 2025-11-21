import * as vscode from 'vscode';
import { MCPClient } from '../mcp/client';
import { DeployAction } from '../actions/deploy';
import { OrganizeAction } from '../actions/organize';
import { ReviewAction } from '../actions/review';
import { PlanAction } from '../actions/plan';
import { insertPromptIntoCursor } from '../utils/cursor-integration';
import { Config } from '../config';

export class QuickActionsPanel {
  public static async executeAction(action: string, mcpClient: MCPClient) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    try {
      switch (action) {
        case 'deploy':
          await DeployAction.execute(workspaceFolder, mcpClient);
          break;
        case 'organize':
          await OrganizeAction.execute(workspaceFolder);
          break;
        case 'review':
          await ReviewAction.execute(workspaceFolder);
          break;
        case 'plan':
          await PlanAction.execute(workspaceFolder, mcpClient);
          break;
        case 'custom1':
        case 'custom2':
        case 'custom3':
        case 'custom4':
          await this.executeCustomAction(action);
          break;
        default:
          vscode.window.showErrorMessage(`Unknown action: ${action}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Action failed: ${message}`);
    }
  }

  private static async executeCustomAction(button: string) {
    const prompts = Config.getCustomPrompts();
    const prompt = prompts[button as keyof typeof prompts];

    if (!prompt || prompt.trim() === '') {
      // Open settings to configure
      vscode.window.showInformationMessage(
        `Custom button ${button} is not configured. Opening settings...`,
        'Open Settings'
      ).then(selection => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand('quickActions.openSettings');
        }
      });
      return;
    }

    // Insert prompt into Cursor chat
    await insertPromptIntoCursor(prompt);
    vscode.window.showInformationMessage(`Inserted prompt into Cursor chat`);
  }
}



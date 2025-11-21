import * as vscode from 'vscode';

export interface MCPConfig {
  ddog?: string;
  xSystems?: string;
  xPlugin?: string;
}

export interface CustomPrompts {
  custom1: string;
  custom2: string;
  custom3: string;
  custom4: string;
}

export class Config {
  private static getConfig(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('quickActions');
  }

  static getMCPConfig(): MCPConfig {
    const config = this.getConfig();
    return {
      ddog: config.get<string>('mcp.ddog', ''),
      xSystems: config.get<string>('mcp.xSystems', ''),
      xPlugin: config.get<string>('mcp.xPlugin', '')
    };
  }

  static getCustomPrompts(): CustomPrompts {
    const config = this.getConfig();
    return {
      custom1: config.get<string>('customPrompts.custom1', ''),
      custom2: config.get<string>('customPrompts.custom2', ''),
      custom3: config.get<string>('customPrompts.custom3', ''),
      custom4: config.get<string>('customPrompts.custom4', '')
    };
  }

  static async setCustomPrompt(button: 'custom1' | 'custom2' | 'custom3' | 'custom4', prompt: string): Promise<void> {
    const config = this.getConfig();
    await config.update(`customPrompts.${button}`, prompt, vscode.ConfigurationTarget.Workspace);
  }

  static async setMCPUrl(server: 'ddog' | 'xSystems' | 'xPlugin', url: string): Promise<void> {
    const config = this.getConfig();
    await config.update(`mcp.${server}`, url, vscode.ConfigurationTarget.Workspace);
  }
}



import { MCPConfig } from '../config';

export class MCPClient {
  private config: MCPConfig;
  private connections: Map<string, boolean> = new Map();

  constructor(config: MCPConfig) {
    this.config = config;
    this.initializeConnections();
  }

  private initializeConnections(): void {
    // Track which MCP servers are configured
    // Actual connections will be made on-demand via HTTP requests
    if (this.config.ddog) {
      this.connections.set('ddog', true);
    }
    if (this.config.xSystems) {
      this.connections.set('xSystems', true);
    }
    if (this.config.xPlugin) {
      this.connections.set('xPlugin', true);
    }
  }

  public async notify(eventType: string, data: Record<string, unknown>): Promise<void> {
    // Try to notify all configured MCP servers
    const promises: Promise<void>[] = [];

    for (const [name, isConfigured] of this.connections.entries()) {
      if (isConfigured) {
        const url = this.getUrlForServer(name);
        if (url) {
          // Remove /sse suffix if present for notifications
          const notifyUrl = url.replace(/\/sse$/, '') + '/notify';
          promises.push(
            fetch(notifyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventType, data })
            }).then(() => {}).catch(err => {
              console.warn(`Failed to notify ${name}:`, err);
            })
          );
        }
      }
    }

    await Promise.allSettled(promises);
  }

  private getUrlForServer(name: string): string | null {
    switch (name) {
      case 'ddog':
        return this.config.ddog || null;
      case 'xSystems':
        return this.config.xSystems || null;
      case 'xPlugin':
        return this.config.xPlugin || null;
      default:
        return null;
    }
  }

  public async callTool(server: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const url = this.getUrlForServer(server);
    if (!url) {
      throw new Error(`MCP server ${server} not configured`);
    }

    // Remove /sse suffix if present for tool calls
    const baseUrl = url.replace(/\/sse$/, '');
    const toolUrl = `${baseUrl}/tools/call`;

    try {
      const response = await fetch(toolUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName, arguments: args })
      });

      if (!response.ok) {
        throw new Error(`MCP tool call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`MCP tool call error for ${server}/${toolName}:`, error);
      throw error;
    }
  }

  public dispose(): void {
    // Clear all connections
    this.connections.clear();
  }
}


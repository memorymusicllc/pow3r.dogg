/**
 * XMAP MCP Client Integration
 * 
 * Provides client interface for XMAP MCP server operations including:
 * - Generate XMAP from repository
 * - Update development status
 * - Validate XMAP with Guardian gates
 * - Merge multiple XMAP instances
 * - Sync from repository
 */

export interface XMAPConfig {
  mcpServer: string;
  tools: string[];
  storage: {
    configStore: string;
    versionHistory: string;
  };
  sync: {
    githubWebhook: string;
    kvPolling: string;
    historyApi: string;
  };
}

export interface XMAPNode {
  id: string;
  type: string;
  label: string;
  metadata?: Record<string, unknown>;
  position?: { x: number; y: number; z?: number };
}

export interface XMAPEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface XMAPData {
  nodes: XMAPNode[];
  edges: XMAPEdge[];
  metadata?: Record<string, unknown>;
}

export class XMAPClient {
  private baseUrl: string;
  private config: XMAPConfig;

  constructor(config: XMAPConfig) {
    this.config = config;
    this.baseUrl = config.mcpServer;
  }

  /**
   * Initialize MCP connection
   */
  async initialize(): Promise<{ name: string; version: string; capabilities: unknown }> {
    const response = await fetch(`${this.baseUrl}/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`XMAP initialization failed: ${response.statusText}`);
    }

      const data = await response.json() as {
      data?: { name: string; version: string; capabilities: unknown };
    };
    return data.data || { name: '', version: '', capabilities: {} };
  }

  /**
   * Generate XMAP from repository
   */
  async generateFromRepo(repoUrl: string, options?: { branch?: string }): Promise<XMAPData> {
    const response = await fetch(`${this.baseUrl}/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'xmap_generate_from_repo',
        arguments: {
          repo_url: repoUrl,
          branch: options?.branch || 'main',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`XMAP generation failed: ${response.statusText}`);
    }

      const result = await response.json() as Record<string, unknown>;
    return result.content[0].text as unknown as XMAPData;
  }

  /**
   * Update development status in XMAP
   */
  async updateDevStatus(
    xmapId: string,
    nodeId: string,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'xmap_update_dev_status',
        arguments: {
          xmap_id: xmapId,
          node_id: nodeId,
          status,
          metadata: metadata || {},
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`XMAP status update failed: ${response.statusText}`);
    }
  }

  /**
   * Validate XMAP with Guardian gates
   */
  async validate(xmapData: XMAPData): Promise<{ valid: boolean; errors?: string[] }> {
    const response = await fetch(`${this.baseUrl}/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'xmap_validate',
        arguments: {
          xmap_data: xmapData,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`XMAP validation failed: ${response.statusText}`);
    }

      const result = await response.json() as {
        content?: Array<{ type: string; text: string }>;
      };
      if (result.content && result.content[0]) {
        return JSON.parse(result.content[0].text) as { valid: boolean; errors?: string[] };
      }
      return { valid: false, errors: ['No content in response'] };
  }

  /**
   * Merge multiple XMAP instances
   */
  async mergeRepos(xmapIds: string[], targetXmapId: string): Promise<XMAPData> {
    const response = await fetch(`${this.baseUrl}/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'xmap_merge_repos',
        arguments: {
          xmap_ids: xmapIds,
          target_xmap_id: targetXmapId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`XMAP merge failed: ${response.statusText}`);
    }

      const result = await response.json() as Record<string, unknown>;
    return result.content[0].text as unknown as XMAPData;
  }

  /**
   * Sync XMAP from repository
   */
  async syncFromRepo(xmapId: string, repoUrl: string): Promise<XMAPData> {
    const response = await fetch(`${this.baseUrl}/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'xmap_sync_from_repo',
        arguments: {
          xmap_id: xmapId,
          repo_url: repoUrl,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`XMAP sync failed: ${response.statusText}`);
    }

      const result = await response.json() as Record<string, unknown>;
    return result.content[0].text as unknown as XMAPData;
  }
}


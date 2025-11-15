/**
 * XMAP Real-Time Sync Handler
 * 
 * Handles real-time synchronization of XMAP data including:
 * - GitHub webhook processing
 * - KV polling for changes
 * - Diff calculation
 * - Abi notification triggers
 */

import type { Env } from '../types';
import type { XMAPData } from './integration';

export interface XMAPSyncEvent {
  xmapId: string;
  repoUrl: string;
  changeType: 'update' | 'merge' | 'sync';
  changedBy: 'github_webhook' | 'mcp_tool' | 'manual';
  timestamp: string;
  diff?: XMAPDiff;
}

export interface XMAPDiff {
  nodesAdded: number;
  nodesRemoved: number;
  nodesModified: number;
  edgesAdded: number;
  edgesRemoved: number;
  summary: string;
}

export class XMAPSyncHandler {
  private env: Env;
  private kv: KVNamespace;
  private d1: D1Database;

  constructor(env: Env) {
    this.env = env;
    this.kv = env.CONFIG_STORE;
    this.d1 = env.DEFENDER_DB;
  }

  /**
   * Handle GitHub webhook events
   */
  async handleGitHubWebhook(event: {
    action: string;
    repository: { url: string; full_name: string };
    commits?: Array<{ id: string; message: string }>;
  }): Promise<XMAPSyncEvent> {
    const repoUrl = event.repository.url;
    const repoName = event.repository.full_name;

    // Generate or update XMAP for this repository
    const xmapId = `xmap:${repoName.replace('/', ':')}`;
    
    // Store event for processing
    await this.kv.put(
      `xmap:webhook:${Date.now()}`,
      JSON.stringify({
        xmapId,
        repoUrl,
        action: event.action,
        timestamp: new Date().toISOString(),
      }),
      { expirationTtl: 86400 } // 24 hours
    );

    // Trigger sync
    const syncEvent = await this.syncXMAP(xmapId, repoUrl, 'github_webhook');

    return syncEvent;
  }

  /**
   * Poll KV for XMAP changes and trigger sync
   */
  async pollKVChanges(xmapId?: string): Promise<XMAPSyncEvent[]> {
    const events: XMAPSyncEvent[] = [];
    const prefix = xmapId ? `xmap:${xmapId}:` : 'xmap:';

    // List all XMAP keys (simplified - in production use pagination)
    const keys = await this.kv.list({ prefix });

    for (const key of keys.keys) {
      const value = await this.kv.get(key.name);
      if (value) {
        const data = JSON.parse(value);
        if (data.needsSync) {
          const event = await this.syncXMAP(
            data.xmapId,
            data.repoUrl,
            'kv_polling'
          );
          events.push(event);

          // Mark as synced
          await this.kv.put(key.name, JSON.stringify({ ...data, needsSync: false }));
        }
      }
    }

    return events;
  }

  /**
   * Sync XMAP from repository
   */
  private async syncXMAP(
    xmapId: string,
    repoUrl: string,
    changedBy: 'github_webhook' | 'mcp_tool' | 'manual'
  ): Promise<XMAPSyncEvent> {
    // Get previous version for diff calculation
    const previousVersion = await this.getPreviousVersion(xmapId);

    // Generate new XMAP (this would call XMAP MCP client)
    // For now, we'll store the sync event
    const syncEvent: XMAPSyncEvent = {
      xmapId,
      repoUrl,
      changeType: 'sync',
      changedBy,
      timestamp: new Date().toISOString(),
    };

    // Calculate diff if previous version exists
    if (previousVersion) {
      syncEvent.diff = await this.calculateDiff(previousVersion, syncEvent);
    }

    // Store version history
    await this.storeVersionHistory(syncEvent);

    // Trigger Abi notification if configured (graceful failure)
    if (this.env.ABI_WEBHOOK_URL) {
      try {
        await this.notifyAbi(syncEvent);
      } catch (error) {
        console.warn('Abi notification failed (non-critical, continuing):', error);
      }
    }

    return syncEvent;
  }

  /**
   * Get previous XMAP version from D1
   */
  private async getPreviousVersion(xmapId: string): Promise<XMAPData | null> {
    const result = await this.d1
      .prepare('SELECT xmap_data FROM xmap_history WHERE xmap_id = ? ORDER BY timestamp DESC LIMIT 1')
      .bind(xmapId)
      .first<{ xmap_data: string }>();

    if (result) {
      return JSON.parse(result.xmap_data) as XMAPData;
    }

    return null;
  }

  /**
   * Calculate diff between XMAP versions
   */
  private async calculateDiff(
    previous: XMAPData,
    current: XMAPSyncEvent
  ): Promise<XMAPDiff> {
    // Simplified diff calculation
    // In production, this would compare actual node/edge structures
    return {
      nodesAdded: 0,
      nodesRemoved: 0,
      nodesModified: 0,
      edgesAdded: 0,
      edgesRemoved: 0,
      summary: `XMAP sync for ${current.xmapId} at ${current.timestamp}`,
    };
  }

  /**
   * Store version history in D1
   */
  private async storeVersionHistory(event: XMAPSyncEvent): Promise<void> {
    await this.d1
      .prepare(
        'INSERT INTO xmap_history (version_id, xmap_id, repo_url, xmap_data, timestamp, change_type, changed_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        crypto.randomUUID(),
        event.xmapId,
        event.repoUrl,
        JSON.stringify({}), // Would contain actual XMAP data
        event.timestamp,
        event.changeType,
        event.changedBy
      )
      .run();
  }

  /**
   * Notify Abi of XMAP changes
   */
  private async notifyAbi(event: XMAPSyncEvent): Promise<void> {
    if (!this.env.ABI_WEBHOOK_URL) {
      return;
    }

    try {
      const response = await fetch(this.env.ABI_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'xmap_node_updated',
          xmap_id: event.xmapId,
          repo_url: event.repoUrl,
          change_type: event.changeType,
          timestamp: event.timestamp,
          diff: event.diff,
        }),
      });

      if (!response.ok) {
        throw new Error(`Abi notification failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to notify Abi:', error);
      // Don't throw - notification failure shouldn't break sync
    }
  }
}


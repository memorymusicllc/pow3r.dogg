/**
 * XMAP Version History Management
 * 
 * Manages XMAP version history in D1 database including:
 * - Version storage and retrieval
 * - Time-series replay
 * - Diff visualization
 */

import type { Env } from '../types';

export interface XMAPVersion {
  versionId: string;
  xmapId: string;
  repoUrl: string;
  xmapData: unknown;
  timestamp: string;
  changeType: 'update' | 'merge' | 'sync';
  changedBy: 'github_webhook' | 'mcp_tool' | 'manual';
}

export interface XMAPHistoryQuery {
  xmapId: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

export class XMAPHistoryManager {
  private d1: D1Database;

  constructor(env: Env) {
    this.d1 = env.DEFENDER_DB;
  }

  /**
   * Initialize D1 schema for XMAP history
   */
  async initializeSchema(): Promise<void> {
    await this.d1.exec(`
      CREATE TABLE IF NOT EXISTS xmap_history (
        version_id TEXT PRIMARY KEY,
        xmap_id TEXT NOT NULL,
        repo_url TEXT NOT NULL,
        xmap_data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        change_type TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_xmap_id ON xmap_history(xmap_id);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON xmap_history(timestamp);
      CREATE INDEX IF NOT EXISTS idx_xmap_timestamp ON xmap_history(xmap_id, timestamp);
    `);
  }

  /**
   * Store a new XMAP version
   */
  async storeVersion(version: Omit<XMAPVersion, 'versionId'>): Promise<string> {
    const versionId = crypto.randomUUID();

    await this.d1
      .prepare(
        'INSERT INTO xmap_history (version_id, xmap_id, repo_url, xmap_data, timestamp, change_type, changed_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        versionId,
        version.xmapId,
        version.repoUrl,
        JSON.stringify(version.xmapData),
        version.timestamp,
        version.changeType,
        version.changedBy
      )
      .run();

    return versionId;
  }

  /**
   * Get version history for an XMAP
   */
  async getHistory(query: XMAPHistoryQuery): Promise<XMAPVersion[]> {
    let sql = 'SELECT * FROM xmap_history WHERE xmap_id = ?';
    const bindings: unknown[] = [query.xmapId];

    if (query.startTime) {
      sql += ' AND timestamp >= ?';
      bindings.push(query.startTime);
    }

    if (query.endTime) {
      sql += ' AND timestamp <= ?';
      bindings.push(query.endTime);
    }

    sql += ' ORDER BY timestamp DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      bindings.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      bindings.push(query.offset);
    }

    const result = await this.d1.prepare(sql).bind(...bindings).all<XMAPVersion>();

    return result.results.map((row) => ({
      ...row,
      xmapData: JSON.parse(row.xmapData as string),
    }));
  }

  /**
   * Get a specific version by ID
   */
  async getVersion(versionId: string): Promise<XMAPVersion | null> {
    const result = await this.d1
      .prepare('SELECT * FROM xmap_history WHERE version_id = ?')
      .bind(versionId)
      .first<XMAPVersion>();

    if (!result) {
      return null;
    }

    return {
      ...result,
      xmapData: JSON.parse(result.xmapData as string),
    };
  }

  /**
   * Get latest version for an XMAP
   */
  async getLatestVersion(xmapId: string): Promise<XMAPVersion | null> {
    const result = await this.d1
      .prepare(
        'SELECT * FROM xmap_history WHERE xmap_id = ? ORDER BY timestamp DESC LIMIT 1'
      )
      .bind(xmapId)
      .first<XMAPVersion>();

    if (!result) {
      return null;
    }

    return {
      ...result,
      xmapData: JSON.parse(result.xmapData as string),
    };
  }

  /**
   * Compare two versions and generate diff
   */
  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: XMAPVersion;
    version2: XMAPVersion;
    diff: {
      nodesAdded: number;
      nodesRemoved: number;
      nodesModified: number;
      edgesAdded: number;
      edgesRemoved: number;
    };
  }> {
    const version1 = await this.getVersion(versionId1);
    const version2 = await this.getVersion(versionId2);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    // Simplified diff calculation
    // In production, this would do deep comparison of XMAP structures
    const v1Data = version1.xmapData as { nodes?: unknown[]; edges?: unknown[] };
    const v2Data = version2.xmapData as { nodes?: unknown[]; edges?: unknown[] };

    const nodes1 = v1Data.nodes || [];
    const nodes2 = v2Data.nodes || [];
    const edges1 = v1Data.edges || [];
    const edges2 = v2Data.edges || [];

    return {
      version1,
      version2,
      diff: {
        nodesAdded: Math.max(0, nodes2.length - nodes1.length),
        nodesRemoved: Math.max(0, nodes1.length - nodes2.length),
        nodesModified: 0, // Would require deep comparison
        edgesAdded: Math.max(0, edges2.length - edges1.length),
        edgesRemoved: Math.max(0, edges1.length - edges2.length),
      },
    };
  }

  /**
   * Replay XMAP history up to a specific timestamp
   */
  async replayToTimestamp(xmapId: string, targetTimestamp: string): Promise<XMAPVersion> {
    const versions = await this.getHistory({
      xmapId,
      endTime: targetTimestamp,
      limit: 1,
    });

    if (versions.length === 0) {
      throw new Error(`No version found for XMAP ${xmapId} at or before ${targetTimestamp}`);
    }

    return versions[0];
  }
}


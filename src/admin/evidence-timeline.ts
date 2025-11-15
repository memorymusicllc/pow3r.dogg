/**
 * Evidence Timeline and Reports
 * 
 * Timeline view, export, and reporting for evidence
 */

import type { Env } from '../types';
import { EnhancedEvidenceChain } from '../forensic/chain';

export interface EvidenceTimelineEntry {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  collectedBy: string;
  investigationId?: string;
  attackerId?: string;
  hash: string;
  metadata: Record<string, unknown>;
  chainIndex: number;
}

export interface EvidenceReport {
  reportId: string;
  generatedAt: number;
  investigationId?: string;
  attackerId?: string;
  dateRange: {
    start: number;
    end: number;
  };
  entries: EvidenceTimelineEntry[];
  summary: {
    totalEvidence: number;
    byType: Record<string, number>;
    byCollector: Record<string, number>;
    chainIntegrity: boolean;
  };
}

export class EvidenceTimeline {
  private env: Env;
  private evidenceChain: EnhancedEvidenceChain;

  constructor(env: Env) {
    this.env = env;
    this.evidenceChain = new EnhancedEvidenceChain(env);
  }

  /**
   * Get evidence timeline for investigation or attacker
   */
  async getTimeline(options: {
    investigationId?: string;
    attackerId?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  }): Promise<EvidenceTimelineEntry[]> {
    const entries: EvidenceTimelineEntry[] = [];

    try {
      // Try D1 first
      if (this.env.DEFENDER_DB) {
        let sql = 'SELECT * FROM evidence_chain WHERE 1=1';
        const bindings: unknown[] = [];

        if (options.investigationId) {
          sql += ' AND investigation_id = ?';
          bindings.push(options.investigationId);
        }
        if (options.attackerId) {
          sql += ' AND attacker_id = ?';
          bindings.push(options.attackerId);
        }
        if (options.startDate) {
          sql += ' AND timestamp >= ?';
          bindings.push(options.startDate);
        }
        if (options.endDate) {
          sql += ' AND timestamp <= ?';
          bindings.push(options.endDate);
        }

        sql += ' ORDER BY timestamp DESC, chain_index ASC';
        if (options.limit) {
          sql += ' LIMIT ?';
          bindings.push(options.limit);
        }

        const result = await this.env.DEFENDER_DB.prepare(sql).bind(...bindings).all();
        for (const row of result.results || []) {
          entries.push(this.mapRowToEntry(row as Record<string, unknown>));
        }
        return entries;
      }
    } catch (error) {
      console.warn('D1 timeline query failed, using KV fallback:', error);
    }

    // KV fallback
    const kv = this.env.DEFENDER_FORGE;
    const prefix = options.investigationId
      ? `evidence:investigation:${options.investigationId}:`
      : options.attackerId
      ? `evidence:attacker:${options.attackerId}:`
      : 'evidence:';

    let cursor: string | undefined;
    do {
      const list = await kv.list({ prefix, cursor });
      for (const key of list.keys) {
        const data = await kv.get(key.name);
        if (data) {
          const entry = JSON.parse(data) as EvidenceTimelineEntry;
          if (
            (!options.startDate || entry.timestamp >= options.startDate) &&
            (!options.endDate || entry.timestamp <= options.endDate)
          ) {
            entries.push(entry);
          }
        }
      }
      cursor = list.list_complete ? undefined : (list as { cursor?: string }).cursor;
    } while (cursor && (!options.limit || entries.length < options.limit));

    return entries.sort((a, b) => {
      if (a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
      return a.chainIndex - b.chainIndex;
    });
  }

  /**
   * Generate evidence report
   */
  async generateReport(options: {
    investigationId?: string;
    attackerId?: string;
    startDate: number;
    endDate: number;
  }): Promise<EvidenceReport> {
    const entries = await this.getTimeline({
      investigationId: options.investigationId,
      attackerId: options.attackerId,
      startDate: options.startDate,
      endDate: options.endDate,
      limit: 10000,
    });

    // Calculate summary
    const byType: Record<string, number> = {};
    const byCollector: Record<string, number> = {};
    let chainIntegrity = true;

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      byCollector[entry.collectedBy] = (byCollector[entry.collectedBy] || 0) + 1;

      // Verify chain integrity
      if (entry.chainIndex > 0) {
        const prevEntry = entries.find(e => e.chainIndex === entry.chainIndex - 1);
        if (prevEntry && prevEntry.hash !== entry.metadata.previousHash) {
          chainIntegrity = false;
        }
      }
    }

    return {
      reportId: crypto.randomUUID(),
      generatedAt: Date.now(),
      investigationId: options.investigationId,
      attackerId: options.attackerId,
      dateRange: {
        start: options.startDate,
        end: options.endDate,
      },
      entries,
      summary: {
        totalEvidence: entries.length,
        byType,
        byCollector,
        chainIntegrity,
      },
    };
  }

  /**
   * Export evidence bundle (already implemented in evidence chain, but add timeline format)
   */
  async exportTimelineBundle(options: {
    investigationId?: string;
    attackerId?: string;
    startDate?: number;
    endDate?: number;
    format: 'json' | 'csv' | 'pdf';
  }): Promise<{ format: string; data: string; mimeType: string }> {
    const entries = await this.getTimeline({
      investigationId: options.investigationId,
      attackerId: options.attackerId,
      startDate: options.startDate,
      endDate: options.endDate,
      limit: 10000,
    });

    if (options.format === 'json') {
      return {
        format: 'json',
        data: JSON.stringify(entries, null, 2),
        mimeType: 'application/json',
      };
    } else if (options.format === 'csv') {
      const csv = [
        'ID,Timestamp,Type,Description,Collected By,Investigation ID,Attacker ID,Hash,Chain Index',
        ...entries.map(e =>
          [
            e.id,
            new Date(e.timestamp).toISOString(),
            e.type,
            e.description.replace(/,/g, ';'),
            e.collectedBy,
            e.investigationId || '',
            e.attackerId || '',
            e.hash,
            e.chainIndex,
          ].join(',')
        ),
      ].join('\n');
      return {
        format: 'csv',
        data: csv,
        mimeType: 'text/csv',
      };
    } else {
      // PDF format - return JSON for now (would need PDF generation library)
      return {
        format: 'pdf',
        data: JSON.stringify(entries, null, 2),
        mimeType: 'application/json',
      };
    }
  }

  private mapRowToEntry(row: Record<string, unknown>): EvidenceTimelineEntry {
    return {
      id: row.id as string,
      timestamp: (row.timestamp as number) || Date.now(),
      type: row.type as string,
      description: row.description as string,
      collectedBy: row.collected_by as string,
      investigationId: row.investigation_id as string | undefined,
      attackerId: row.attacker_id as string | undefined,
      hash: row.hash as string,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata as Record<string, unknown>),
      chainIndex: (row.chain_index as number) || 0,
    };
  }
}


/**
 * Attacker Database Management
 * 
 * Full CRUD operations for attacker profiles with search and network analysis
 */

import type { Env } from '../types';

export interface AttackerProfile {
  id: string;
  fingerprint?: string;
  ipAddress?: string;
  phoneNumber?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  firstSeen: number;
  lastSeen: number;
  threatScore: number;
  aliases: string[];
  relatedAttackers: string[];
  evidenceIds: string[];
  investigationIds: string[];
}

export interface AttackerQuery {
  fingerprint?: string;
  ipAddress?: string;
  phoneNumber?: string;
  minThreatScore?: number;
  investigationId?: string;
  dateRange?: {
    start: number;
    end: number;
  };
  limit?: number;
  offset?: number;
}

export interface AttackerNetwork {
  attacker: AttackerProfile;
  connections: {
    attackerId: string;
    relationship: 'same_device' | 'same_ip' | 'same_phone' | 'same_network' | 'communication';
    confidence: number;
  }[];
}

export class AttackerDatabase {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Query attackers with filters
   */
  async queryAttackers(query: AttackerQuery): Promise<AttackerProfile[]> {
    try {
      // Try D1 first
      if (this.env.DEFENDER_DB) {
        let sql = 'SELECT * FROM attacker_profiles WHERE 1=1';
        const bindings: unknown[] = [];

        if (query.fingerprint) {
          sql += ' AND fingerprint = ?';
          bindings.push(query.fingerprint);
        }
        if (query.ipAddress) {
          sql += ' AND ip_address = ?';
          bindings.push(query.ipAddress);
        }
        if (query.phoneNumber) {
          sql += ' AND phone_number = ?';
          bindings.push(query.phoneNumber);
        }
        if (query.minThreatScore !== undefined) {
          sql += ' AND threat_score >= ?';
          bindings.push(query.minThreatScore);
        }
        if (query.investigationId) {
          sql += ' AND investigation_id = ?';
          bindings.push(query.investigationId);
        }
        if (query.dateRange) {
          sql += ' AND last_seen >= ? AND last_seen <= ?';
          bindings.push(query.dateRange.start, query.dateRange.end);
        }

        sql += ' ORDER BY last_seen DESC';
        if (query.limit) {
          sql += ' LIMIT ?';
          bindings.push(query.limit);
        }
        if (query.offset) {
          sql += ' OFFSET ?';
          bindings.push(query.offset);
        }

        const result = await this.env.DEFENDER_DB.prepare(sql).bind(...bindings).all();
        return (result.results || []).map((row: any) => this.mapRowToProfile(row));
      }
    } catch (error) {
      console.warn('D1 query failed, using KV fallback:', error);
    }

    // KV fallback - scan all attacker keys
    const attackers: AttackerProfile[] = [];
    const kv = this.env.DEFENDER_FORGE;
    const prefix = 'attacker:';
    let cursor: string | undefined;

    do {
      const list = await kv.list({ prefix, cursor });
      for (const key of list.keys) {
        const data = await kv.get(key.name);
        if (data) {
          const profile = JSON.parse(data) as AttackerProfile;
          if (this.matchesQuery(profile, query)) {
            attackers.push(profile);
          }
        }
      }
      cursor = list.list_complete ? undefined : (list as { cursor?: string }).cursor;
    } while (cursor && (!query.limit || attackers.length < query.limit));

    return attackers
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(query.offset || 0, (query.offset || 0) + (query.limit || 100));
  }

  /**
   * Get attacker by ID
   */
  async getAttacker(id: string): Promise<AttackerProfile | null> {
    try {
      if (this.env.DEFENDER_DB) {
        const result = await this.env.DEFENDER_DB
          .prepare('SELECT * FROM attacker_profiles WHERE id = ?')
          .bind(id)
          .first();
        if (result) {
          return this.mapRowToProfile(result as Record<string, unknown>);
        }
      }
    } catch (error) {
      console.warn('D1 get failed, using KV fallback:', error);
    }

    const kv = this.env.DEFENDER_FORGE;
    const data = await kv.get(`attacker:${id}`);
    if (data) {
      return JSON.parse(data) as AttackerProfile;
    }
    return null;
  }

  /**
   * Get attacker network (related attackers)
   */
  async getAttackerNetwork(attackerId: string): Promise<AttackerNetwork | null> {
    const attacker = await this.getAttacker(attackerId);
    if (!attacker) return null;

    const connections: AttackerNetwork['connections'] = [];

    // Find attackers with same fingerprint
    if (attacker.fingerprint) {
      const sameFingerprint = await this.queryAttackers({ fingerprint: attacker.fingerprint });
      for (const related of sameFingerprint) {
        if (related.id !== attackerId) {
          connections.push({
            attackerId: related.id,
            relationship: 'same_device',
            confidence: 0.95,
          });
        }
      }
    }

    // Find attackers with same IP
    if (attacker.ipAddress) {
      const sameIP = await this.queryAttackers({ ipAddress: attacker.ipAddress });
      for (const related of sameIP) {
        if (related.id !== attackerId && !connections.find(c => c.attackerId === related.id)) {
          connections.push({
            attackerId: related.id,
            relationship: 'same_ip',
            confidence: 0.75,
          });
        }
      }
    }

    // Find attackers with same phone
    if (attacker.phoneNumber) {
      const samePhone = await this.queryAttackers({ phoneNumber: attacker.phoneNumber });
      for (const related of samePhone) {
        if (related.id !== attackerId && !connections.find(c => c.attackerId === related.id)) {
          connections.push({
            attackerId: related.id,
            relationship: 'same_phone',
            confidence: 0.85,
          });
        }
      }
    }

    return {
      attacker,
      connections,
    };
  }

  /**
   * Search attackers by text (searches all fields)
   */
  async searchAttackers(searchText: string, limit = 50): Promise<AttackerProfile[]> {
    const allAttackers = await this.queryAttackers({ limit: 1000 });
    const lowerSearch = searchText.toLowerCase();

    return allAttackers
      .filter(attacker => {
        return (
          attacker.fingerprint?.toLowerCase().includes(lowerSearch) ||
          attacker.ipAddress?.toLowerCase().includes(lowerSearch) ||
          attacker.phoneNumber?.toLowerCase().includes(lowerSearch) ||
          attacker.userAgent?.toLowerCase().includes(lowerSearch) ||
          attacker.aliases.some(alias => alias.toLowerCase().includes(lowerSearch)) ||
          JSON.stringify(attacker.metadata).toLowerCase().includes(lowerSearch)
        );
      })
      .slice(0, limit);
  }

  /**
   * Update attacker profile
   */
  async updateAttacker(id: string, updates: Partial<AttackerProfile>): Promise<AttackerProfile | null> {
    const existing = await this.getAttacker(id);
    if (!existing) return null;

    const updated: AttackerProfile = {
      ...existing,
      ...updates,
      id,
      lastSeen: Date.now(),
    };

    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB
          .prepare(
            'UPDATE attacker_profiles SET fingerprint = ?, ip_address = ?, phone_number = ?, user_agent = ?, metadata = ?, threat_score = ?, aliases = ?, related_attackers = ?, last_seen = ? WHERE id = ?'
          )
          .bind(
            updated.fingerprint,
            updated.ipAddress,
            updated.phoneNumber,
            updated.userAgent,
            JSON.stringify(updated.metadata),
            updated.threatScore,
            JSON.stringify(updated.aliases),
            JSON.stringify(updated.relatedAttackers),
            updated.lastSeen,
            id
          )
          .run();
      }
    } catch (error) {
      console.warn('D1 update failed, using KV fallback:', error);
    }

    // Store in KV
    await this.env.DEFENDER_FORGE.put(`attacker:${id}`, JSON.stringify(updated));
    return updated;
  }

  /**
   * Delete attacker
   */
  async deleteAttacker(id: string): Promise<boolean> {
    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB.prepare('DELETE FROM attacker_profiles WHERE id = ?').bind(id).run();
      }
    } catch (error) {
      console.warn('D1 delete failed, using KV fallback:', error);
    }

    await this.env.DEFENDER_FORGE.delete(`attacker:${id}`);
    return true;
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalAttackers: number;
    highThreatCount: number;
    activeLast24h: number;
    activeLast7d: number;
  }> {
    const allAttackers = await this.queryAttackers({ limit: 10000 });
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    return {
      totalAttackers: allAttackers.length,
      highThreatCount: allAttackers.filter(a => a.threatScore >= 0.7).length,
      activeLast24h: allAttackers.filter(a => a.lastSeen >= dayAgo).length,
      activeLast7d: allAttackers.filter(a => a.lastSeen >= weekAgo).length,
    };
  }

  private matchesQuery(profile: AttackerProfile, query: AttackerQuery): boolean {
    if (query.fingerprint && profile.fingerprint !== query.fingerprint) return false;
    if (query.ipAddress && profile.ipAddress !== query.ipAddress) return false;
    if (query.phoneNumber && profile.phoneNumber !== query.phoneNumber) return false;
    if (query.minThreatScore !== undefined && profile.threatScore < query.minThreatScore) return false;
    if (query.dateRange) {
      if (profile.lastSeen < query.dateRange.start || profile.lastSeen > query.dateRange.end) return false;
    }
    return true;
  }

  private mapRowToProfile(row: Record<string, unknown>): AttackerProfile {
    return {
      id: row.id as string,
      fingerprint: row.fingerprint as string | undefined,
      ipAddress: row.ip_address as string | undefined,
      phoneNumber: row.phone_number as string | undefined,
      userAgent: row.user_agent as string | undefined,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata as Record<string, unknown>),
      firstSeen: (row.first_seen as number) || Date.now(),
      lastSeen: (row.last_seen as number) || Date.now(),
      threatScore: (row.threat_score as number) || 0,
      aliases: typeof row.aliases === 'string' ? JSON.parse(row.aliases) : (row.aliases as string[]) || [],
      relatedAttackers: typeof row.related_attackers === 'string' ? JSON.parse(row.related_attackers) : (row.related_attackers as string[]) || [],
      evidenceIds: typeof row.evidence_ids === 'string' ? JSON.parse(row.evidence_ids) : (row.evidence_ids as string[]) || [],
      investigationIds: typeof row.investigation_ids === 'string' ? JSON.parse(row.investigation_ids) : (row.investigation_ids as string[]) || [],
    };
  }
}


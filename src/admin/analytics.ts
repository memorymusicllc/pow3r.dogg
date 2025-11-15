/**
 * Analytics Engine for Dashboard
 * 
 * Real-time threat monitoring, risk scoring, and trend analysis
 */

import type { Env } from '../types';
import { AttackerDatabase, type AttackerProfile } from './attacker-db';

export interface ThreatMetrics {
  timestamp: number;
  totalThreats: number;
  highThreatCount: number;
  mediumThreatCount: number;
  lowThreatCount: number;
  newThackers24h: number;
  activeAttackers24h: number;
  averageThreatScore: number;
}

export interface RiskTrend {
  date: string;
  threatScore: number;
  attackerCount: number;
  evidenceCount: number;
}

export interface AttackerNetworkGraph {
  nodes: {
    id: string;
    label: string;
    type: 'attacker' | 'device' | 'ip' | 'phone' | 'network';
    threatScore: number;
    size: number;
  }[];
  edges: {
    source: string;
    target: string;
    relationship: string;
    weight: number;
  }[];
}

export class AnalyticsEngine {
  private env: Env;
  private attackerDb: AttackerDatabase;

  constructor(env: Env) {
    this.env = env;
    this.attackerDb = new AttackerDatabase(env);
  }

  /**
   * Get current threat metrics
   */
  async getThreatMetrics(): Promise<ThreatMetrics> {
    const stats = await this.attackerDb.getStatistics();
    const allAttackers = await this.attackerDb.queryAttackers({ limit: 10000 });
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const newAttackers = allAttackers.filter(a => a.firstSeen >= dayAgo);
    const activeAttackers = allAttackers.filter(a => a.lastSeen >= dayAgo);

    const highThreat = allAttackers.filter(a => a.threatScore >= 0.7).length;
    const mediumThreat = allAttackers.filter(a => a.threatScore >= 0.4 && a.threatScore < 0.7).length;
    const lowThreat = allAttackers.filter(a => a.threatScore < 0.4).length;

    const avgScore = allAttackers.length > 0
      ? allAttackers.reduce((sum, a) => sum + a.threatScore, 0) / allAttackers.length
      : 0;

    return {
      timestamp: now,
      totalThreats: allAttackers.length,
      highThreatCount: highThreat,
      mediumThreatCount: mediumThreat,
      lowThreatCount: lowThreat,
      newThackers24h: newAttackers.length,
      activeAttackers24h: activeAttackers.length,
      averageThreatScore: avgScore,
    };
  }

  /**
   * Get risk trends over time
   */
  async getRiskTrends(days: number = 30): Promise<RiskTrend[]> {
    const allAttackers = await this.attackerDb.queryAttackers({ limit: 10000 });
    const trends: Map<string, { threatScore: number; attackerCount: number; evidenceCount: number }> = new Map();

    const now = Date.now();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      trends.set(dateStr, { threatScore: 0, attackerCount: 0, evidenceCount: 0 });
    }

    // Aggregate by date
    for (const attacker of allAttackers) {
      const date = new Date(attacker.lastSeen);
      const dateStr = date.toISOString().split('T')[0];
      const trend = trends.get(dateStr);
      if (trend) {
        trend.attackerCount++;
        trend.threatScore += attacker.threatScore;
      }
    }

    // Get evidence counts (would need evidence DB access)
    // For now, estimate from attacker evidenceIds
    for (const attacker of allAttackers) {
      const date = new Date(attacker.lastSeen);
      const dateStr = date.toISOString().split('T')[0];
      const trend = trends.get(dateStr);
      if (trend) {
        trend.evidenceCount += attacker.evidenceIds.length;
      }
    }

    return Array.from(trends.entries()).map(([date, data]) => ({
      date,
      threatScore: data.attackerCount > 0 ? data.threatScore / data.attackerCount : 0,
      attackerCount: data.attackerCount,
      evidenceCount: data.evidenceCount,
    }));
  }

  /**
   * Generate attacker network graph
   */
  async getAttackerNetworkGraph(limit: number = 100): Promise<AttackerNetworkGraph> {
    const attackers = await this.attackerDb.queryAttackers({ limit });
    const nodes: AttackerNetworkGraph['nodes'] = [];
    const edges: AttackerNetworkGraph['edges'] = [];
    const nodeMap = new Map<string, string>();

    // Create nodes
    for (const attacker of attackers) {
      const nodeId = `attacker-${attacker.id}`;
      nodeMap.set(attacker.id, nodeId);
      nodes.push({
        id: nodeId,
        label: attacker.fingerprint || attacker.ipAddress || attacker.id.substring(0, 8),
        type: 'attacker',
        threatScore: attacker.threatScore,
        size: Math.max(10, attacker.threatScore * 50),
      });

      // Add device node if fingerprint exists
      if (attacker.fingerprint) {
        const deviceId = `device-${attacker.fingerprint}`;
        if (!nodes.find(n => n.id === deviceId)) {
          nodes.push({
            id: deviceId,
            label: `Device: ${attacker.fingerprint.substring(0, 8)}`,
            type: 'device',
            threatScore: attacker.threatScore,
            size: 15,
          });
        }
        edges.push({
          source: nodeId,
          target: deviceId,
          relationship: 'uses',
          weight: 1,
        });
      }

      // Add IP node
      if (attacker.ipAddress) {
        const ipId = `ip-${attacker.ipAddress}`;
        if (!nodes.find(n => n.id === ipId)) {
          nodes.push({
            id: ipId,
            label: attacker.ipAddress,
            type: 'ip',
            threatScore: attacker.threatScore,
            size: 12,
          });
        }
        edges.push({
          source: nodeId,
          target: ipId,
          relationship: 'from',
          weight: 1,
        });
      }

      // Add phone node
      if (attacker.phoneNumber) {
        const phoneId = `phone-${attacker.phoneNumber}`;
        if (!nodes.find(n => n.id === phoneId)) {
          nodes.push({
            id: phoneId,
            label: attacker.phoneNumber,
            type: 'phone',
            threatScore: attacker.threatScore,
            size: 12,
          });
        }
        edges.push({
          source: nodeId,
          target: phoneId,
          relationship: 'uses',
          weight: 1,
        });
      }
    }

    // Add connections between related attackers
    for (const attacker of attackers) {
      const sourceId = nodeMap.get(attacker.id);
      if (!sourceId) continue;

      for (const relatedId of attacker.relatedAttackers) {
        const targetId = nodeMap.get(relatedId);
        if (targetId && !edges.find(e => e.source === sourceId && e.target === targetId)) {
          edges.push({
            source: sourceId,
            target: targetId,
            relationship: 'related',
            weight: 0.5,
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Get top threats
   */
  async getTopThreats(limit: number = 10): Promise<Array<AttackerProfile & { networkSize: number }>> {
    const attackers = await this.attackerDb.queryAttackers({ limit: 1000 });
    const sorted = attackers.sort((a, b) => b.threatScore - a.threatScore).slice(0, limit);

    return Promise.all(
      sorted.map(async attacker => {
        const network = await this.attackerDb.getAttackerNetwork(attacker.id);
        return {
          ...attacker,
          networkSize: network?.connections.length || 0,
        };
      })
    );
  }
}


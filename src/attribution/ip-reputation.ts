/**
 * IP Reputation Scorer
 * 
 * Replaces IP Quality Score with:
 * - AbuseIPDB free API (1,000 queries/day)
 * - FireHOL blocklists (open-source, daily updates)
 * - Custom scoring algorithm
 */

import type { Env } from '../types';

export interface IPReputationScore {
  score: number; // 0-1, higher = more suspicious
  confidence: number; // 0-1
  sources: string[];
  details: {
    abuseScore?: number; // 0-100 from AbuseIPDB
    blocklistMatches?: number;
    isVPN?: boolean;
    isTor?: boolean;
  };
}

export class IPReputationScorer {
  private env: Env;
  private blocklistCache: Map<string, Set<string>> = new Map();

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Calculate fraud/risk score for an IP address
   */
  async calculateFraudScore(ip: string, isVPN: boolean = false): Promise<IPReputationScore> {
    const sources: string[] = [];
    const details: IPReputationScore['details'] = {};

    let score = 0.0;
    let confidence = 0.0;

    // 1. AbuseIPDB (free tier: 1,000 queries/day)
    try {
      const abuseResult = await this.getAbuseIPDBScore(ip);
      if (abuseResult) {
        details.abuseScore = abuseResult.score;
        sources.push('AbuseIPDB');
        
        // AbuseIPDB score contributes 40% to total score
        score += (abuseResult.score / 100) * 0.4;
        confidence += 0.4;
      }
    } catch (error) {
      console.error('AbuseIPDB lookup failed:', error);
    }

    // 2. FireHOL blocklists
    try {
      const blocklistMatches = await this.checkBlocklists(ip);
      details.blocklistMatches = blocklistMatches.length;
      
      if (blocklistMatches.length > 0) {
        sources.push(...blocklistMatches);
        
        // Each blocklist match adds 0.2 (capped at 0.2 total)
        score += Math.min(blocklistMatches.length * 0.1, 0.2);
        confidence += Math.min(blocklistMatches.length * 0.1, 0.2);
      }
    } catch (error) {
      console.error('Blocklist check failed:', error);
    }

    // 3. VPN detection (from IP2Proxy or other sources)
    if (isVPN) {
      details.isVPN = true;
      sources.push('VPN Detection');
      score += 0.3;
      confidence += 0.3;
    }

    // 4. Tor exit nodes (optional - can be added later)
    // For now, we'll skip this as it requires maintaining a Tor exit node list

    // Normalize confidence
    confidence = Math.min(confidence, 1.0);
    
    // Ensure score is between 0 and 1
    score = Math.min(Math.max(score, 0.0), 1.0);

    return {
      score,
      confidence,
      sources,
      details,
    };
  }

  /**
   * Get abuse score from AbuseIPDB (free tier)
   */
  private async getAbuseIPDBScore(ip: string): Promise<{ score: number } | null> {
    try {
      // AbuseIPDB free tier doesn't require API key for basic lookups
      // But we can use their API with optional API key for higher limits
      const apiKey = this.env.ABUSEIPDB_API_KEY || ''; // Optional, free tier works without it
      
      const url = apiKey
        ? `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90&verbose`
        : `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`;

      const response = await fetch(url, {
        headers: apiKey ? {
          'Key': apiKey,
          'Accept': 'application/json',
        } : {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as {
          data?: {
            abuseConfidenceScore?: number;
            usageType?: string;
            isp?: string;
            countryCode?: string;
          };
        };

        if (data.data?.abuseConfidenceScore !== undefined) {
          return {
            score: data.data.abuseConfidenceScore, // 0-100
          };
        }
      } else if (response.status === 429) {
        // Rate limited - free tier is 1,000 queries/day
        console.warn('AbuseIPDB rate limit reached');
      }
    } catch (error) {
      console.error('AbuseIPDB API error:', error);
    }

    return null;
  }

  /**
   * Check IP against FireHOL blocklists
   * 
   * Note: In production, these lists should be:
   * 1. Downloaded daily via Cron Trigger
   * 2. Parsed and stored in Workers KV or R2
   * 3. Loaded into memory/cache for fast lookups
   * 
   * For now, this is a placeholder that can be extended
   */
  private async checkBlocklists(ip: string): Promise<string[]> {
    const matches: string[] = [];

    // FireHOL blocklists are available at:
    // https://github.com/firehol/blocklist-ipsets
    
    // Common blocklists to check:
    const blocklists = [
      'firehol_level1', // Known bad IPs
      'firehol_level2', // Aggressive IPs
      'firehol_level3', // Web attacks
      'firehol_level4', // Compromised IPs
    ];

    // In production, load from Workers KV or R2
    // For now, we'll check a cached version if available
    for (const listName of blocklists) {
      const cached = this.blocklistCache.get(listName);
      if (cached && cached.has(ip)) {
        matches.push(listName);
      }
    }

    // TODO: Implement actual blocklist loading from:
    // - Workers KV (for small lists)
    // - R2 (for large lists)
    // - Or use a DNS-based blocklist service

    return matches;
  }

  /**
   * Load blocklist into cache (to be called by Cron Trigger)
   */
  async loadBlocklist(listName: string, ipList: string[]): Promise<void> {
    const ipSet = new Set(ipList);
    this.blocklistCache.set(listName, ipSet);
    
    // Optionally store in Workers KV for persistence
    if (this.env.DEFENDER_FORGE) {
      await this.env.DEFENDER_FORGE.put(
        `blocklist:${listName}`,
        JSON.stringify(Array.from(ipSet)),
        { expirationTtl: 86400 } // 24 hours
      );
    }
  }

  /**
   * Load blocklist from Workers KV
   */
  async loadBlocklistFromKV(listName: string): Promise<void> {
    if (!this.env.DEFENDER_FORGE) return;

    try {
      const cached = await this.env.DEFENDER_FORGE.get(`blocklist:${listName}`);
      if (cached) {
        const ipList = JSON.parse(cached) as string[];
        this.blocklistCache.set(listName, new Set(ipList));
      }
    } catch (error) {
      console.error(`Failed to load blocklist ${listName} from KV:`, error);
    }
  }
}


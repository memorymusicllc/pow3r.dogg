/**
 * VPN/Proxy Detector
 * 
 * Replaces Spur.us with:
 * - IP2Proxy LITE database (free, monthly updates)
 * - X4BNet VPN IP lists (GitHub, daily updates)
 * - AbuseIPDB for additional context
 */

import type { Env } from '../types';

export interface VPNDetectionResult {
  detected: boolean;
  provider?: string;
  method: 'ip2proxy' | 'vpn-list' | 'abuseipdb' | 'behavioral' | 'database';
  confidence: number;
  trueIP?: string;
}

export class VPNDetector {
  private env: Env;
  private vpnRanges: Set<string> = new Set();
  private vpnIPs: Set<string> = new Set();

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Detect VPN/Proxy for an IP address
   */
  async detectVPN(ip: string, headers: Record<string, string>): Promise<VPNDetectionResult> {
    // 1. Check IP2Proxy LITE database (if available)
    // Note: IP2Proxy LITE requires downloading the BIN file and using a library
    // For Cloudflare Workers, we'll use a service or load the data into KV/R2
    const ip2proxyResult = await this.checkIP2Proxy(ip);
    if (ip2proxyResult.detected) {
      return ip2proxyResult;
    }

    // 2. Check VPN IP lists (X4BNet or similar)
    const vpnListResult = await this.checkVPNLists(ip);
    if (vpnListResult.detected) {
      return vpnListResult;
    }

    // 3. Check AbuseIPDB for proxy/VPN indicators
    const abuseResult = await this.checkAbuseIPDB(ip);
    if (abuseResult.detected) {
      return abuseResult;
    }

    // 4. Behavioral detection (fallback)
    const behavioralResult = this.behavioralDetection(headers);
    if (behavioralResult.detected) {
      return behavioralResult;
    }

    return {
      detected: false,
      method: 'database',
      confidence: 0.0,
    };
  }

  /**
   * Check IP2Proxy LITE database
   * 
   * Note: IP2Proxy LITE BIN file needs to be:
   * 1. Downloaded monthly from https://lite.ip2location.com/ip2proxy-lite
   * 2. Parsed and stored in R2 or Workers KV
   * 3. Queried via a library or service
   * 
   * For now, this is a placeholder that can be extended
   */
  private async checkIP2Proxy(ip: string): Promise<VPNDetectionResult> {
    // TODO: Implement IP2Proxy LITE lookup
    // Options:
    // 1. Use a service that provides IP2Proxy queries
    // 2. Load BIN file into R2 and query via a library
    // 3. Use Workers KV to store IP ranges
    
    // For now, return not detected
    return {
      detected: false,
      method: 'ip2proxy',
      confidence: 0.0,
    };
  }

  /**
   * Check VPN IP lists (X4BNet lists_vpn)
   * 
   * These lists are updated daily and can be loaded from:
   * - GitHub: https://github.com/X4BNet/lists_vpn
   * - Workers KV (cached)
   * - R2 (for large lists)
   */
  private async checkVPNLists(ip: string): Promise<VPNDetectionResult> {
    // Check cached VPN IPs
    if (this.vpnIPs.has(ip)) {
      return {
        detected: true,
        provider: 'VPN',
        method: 'vpn-list',
        confidence: 0.85,
      };
    }

    // Check IP ranges (simplified - would need proper CIDR matching)
    // For now, we'll check if the IP is in any known VPN range
    for (const range of this.vpnRanges) {
      if (this.ipInRange(ip, range)) {
        return {
          detected: true,
          provider: 'VPN',
          method: 'vpn-list',
          confidence: 0.85,
        };
      }
    }

    // Try loading from Workers KV
    if (this.env.DEFENDER_FORGE) {
      try {
        const cached = await this.env.DEFENDER_FORGE.get(`vpn:${ip}`);
        if (cached === 'true') {
          return {
            detected: true,
            provider: 'VPN',
            method: 'vpn-list',
            confidence: 0.85,
          };
        }
      } catch (error) {
        // Ignore KV errors
      }
    }

    return {
      detected: false,
      method: 'vpn-list',
      confidence: 0.0,
    };
  }

  /**
   * Check AbuseIPDB for proxy/VPN indicators
   */
  private async checkAbuseIPDB(ip: string): Promise<VPNDetectionResult> {
    try {
      const apiKey = this.env.ABUSEIPDB_API_KEY || '';
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
            usageType?: string;
            isp?: string;
            abuseConfidenceScore?: number;
          };
        };

        // Check if usageType indicates proxy/VPN
        const usageType = data.data?.usageType?.toLowerCase() || '';
        if (usageType.includes('hosting') || usageType.includes('datacenter')) {
          // High abuse score + hosting/datacenter = likely VPN/proxy
          const abuseScore = data.data?.abuseConfidenceScore || 0;
          if (abuseScore > 50) {
            return {
              detected: true,
              provider: data.data?.isp || 'Unknown',
              method: 'abuseipdb',
              confidence: Math.min(abuseScore / 100, 0.8),
            };
          }
        }
      }
    } catch (error) {
      console.error('AbuseIPDB VPN check failed:', error);
    }

    return {
      detected: false,
      method: 'abuseipdb',
      confidence: 0.0,
    };
  }

  /**
   * Behavioral VPN detection
   */
  private behavioralDetection(headers: Record<string, string>): VPNDetectionResult {
    // Check for VPN-related headers
    const vpnHeaders = ['x-forwarded-for', 'cf-connecting-ip', 'x-real-ip'];
    const hasVPNHeaders = vpnHeaders.some((h) => headers[h.toLowerCase()]);

    if (hasVPNHeaders) {
      return {
        detected: true,
        method: 'behavioral',
        confidence: 0.6,
      };
    }

    return {
      detected: false,
      method: 'behavioral',
      confidence: 0.0,
    };
  }

  /**
   * Check if IP is in a CIDR range (simplified)
   */
  private ipInRange(ip: string, range: string): boolean {
    // Simplified CIDR check - in production, use a proper CIDR library
    if (range.includes('/')) {
      // CIDR notation
      const [network, prefix] = range.split('/');
      // TODO: Implement proper CIDR matching
      return false; // Placeholder
    } else {
      // Exact IP match
      return ip === range;
    }
  }

  /**
   * Load VPN IPs from Workers KV
   */
  async loadVPNIPsFromKV(): Promise<void> {
    if (!this.env.DEFENDER_FORGE) return;

    try {
      const list = await this.env.DEFENDER_FORGE.list({ prefix: 'vpn:' });
      for (const key of list.keys) {
        const ip = key.name.replace('vpn:', '');
        this.vpnIPs.add(ip);
      }
    } catch (error) {
      console.error('Failed to load VPN IPs from KV:', error);
    }
  }

  /**
   * Load VPN ranges from Workers KV
   */
  async loadVPNRangesFromKV(): Promise<void> {
    if (!this.env.DEFENDER_FORGE) return;

    try {
      const ranges = await this.env.DEFENDER_FORGE.get('vpn:ranges');
      if (ranges) {
        const rangeList = JSON.parse(ranges) as string[];
        this.vpnRanges = new Set(rangeList);
      }
    } catch (error) {
      console.error('Failed to load VPN ranges from KV:', error);
    }
  }
}


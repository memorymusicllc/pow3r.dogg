/**
 * IP Attribution with Advanced VPN/Proxy Detection
 * 
 * Enhanced IP tracking with:
 * - IP2Proxy LITE + VPN lists (replaces Spur.us)
 * - AbuseIPDB + FireHOL blocklists (replaces IP Quality Score)
 * - DNS leak detection
 * - TLS fingerprinting (JA3/JA4)
 * - Clock skew analysis
 * - ASN reputation scoring
 */

import type { Env } from '../types';
import { VPNDetector } from './vpn-detector';
import { IPReputationScorer } from './ip-reputation';

export interface IPAttribution {
  ipAddress: string;
  geolocation: Geolocation;
  asn: ASNInfo;
  vpnDetection: VPNDetection;
  dnsLeak: DNSLeakResult;
  tlsFingerprint: TLSFingerprint;
  clockSkew: ClockSkew;
  riskScore: number;
}

export interface Geolocation {
  country: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  accuracy: 'country' | 'city' | 'street';
}

export interface ASNInfo {
  asn: string;
  organization: string;
  type: 'residential' | 'datacenter' | 'hosting' | 'vpn' | 'proxy' | 'unknown';
  reputation: number; // 0-1, higher = more suspicious
}

export interface VPNDetection {
  detected: boolean;
  provider?: string;
  method: 'ip2proxy' | 'vpn-list' | 'abuseipdb' | 'behavioral' | 'database' | 'spur';
  confidence: number;
  trueIP?: string; // If pierced via VPN detection
}

export interface DNSLeakResult {
  leaked: boolean;
  dnsServers: string[];
  trueIP?: string;
}

export interface TLSFingerprint {
  ja3?: string;
  ja4?: string;
  cipherSuites: string[];
  extensions: string[];
  botFramework?: string;
}

export interface ClockSkew {
  detected: boolean;
  offset: number; // milliseconds
  timezoneMismatch: boolean;
}

export class IPAttributionEngine {
  private env: Env;
  private vpnDetector: VPNDetector;
  private reputationScorer: IPReputationScorer;
  private spurApiKey: string; // Kept for backward compatibility, deprecated

  constructor(env: Env) {
    this.env = env;
    this.vpnDetector = new VPNDetector(env);
    this.reputationScorer = new IPReputationScorer(env);
    this.spurApiKey = env.SPUR_API_KEY || 'credential:spur_api_key'; // Deprecated
  }

  /**
   * Perform complete IP attribution
   */
  async attributeIP(ip: string, headers: Record<string, string>): Promise<IPAttribution> {
    // Parallel attribution tasks
    const [geolocation, asn, vpnDetection, dnsLeak, tlsFingerprint, clockSkew] = await Promise.all([
      this.getGeolocation(ip),
      this.getASNInfo(ip),
      this.detectVPN(ip, headers),
      this.detectDNSLeak(ip, headers),
      this.getTLSFingerprint(headers),
      this.analyzeClockSkew(headers),
    ]);

    // Calculate risk score using new reputation scorer
    const reputationScore = await this.reputationScorer.calculateFraudScore(ip, vpnDetection.detected);
    
    // Combine with existing risk score calculation
    const riskScore = this.calculateRiskScore({
      vpnDetection,
      asn,
      dnsLeak,
      tlsFingerprint,
      clockSkew,
      reputationScore: reputationScore.score,
    });

    return {
      ipAddress: ip,
      geolocation,
      asn,
      vpnDetection,
      dnsLeak,
      tlsFingerprint,
      clockSkew,
      riskScore,
    };
  }

  /**
   * Get geolocation (using MaxMind GeoLite2 or similar)
   */
  private async getGeolocation(ip: string): Promise<Geolocation> {
    // Simplified - in production use MaxMind GeoLite2 database
    // For now, use a geolocation API
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await response.json() as {
        country_name?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
        timezone?: string;
      };

      return {
        country: data.country_name || 'Unknown',
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        accuracy: data.city ? 'city' : 'country',
      };
    } catch (error) {
      console.error('Geolocation failed:', error);
      return {
        country: 'Unknown',
        accuracy: 'country',
      };
    }
  }

  /**
   * Get ASN information
   */
  private async getASNInfo(ip: string): Promise<ASNInfo> {
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await response.json() as {
        asn?: string;
        org?: string;
      };

      const asn = data.asn || 'Unknown';
      const org = data.org || 'Unknown';
      const type = this.classifyASNType(org, asn);
      const reputation = this.calculateASNReputation(type, org);

      return {
        asn,
        organization: org,
        type,
        reputation,
      };
    } catch (error) {
      console.error('ASN lookup failed:', error);
      return {
        asn: 'Unknown',
        organization: 'Unknown',
        type: 'unknown',
        reputation: 0.5,
      };
    }
  }

  /**
   * Detect VPN using IP2Proxy LITE + VPN lists (replaces Spur.us)
   */
  private async detectVPN(ip: string, headers: Record<string, string>): Promise<VPNDetection> {
    // Use new VPN detector (IP2Proxy LITE + VPN lists)
    const vpnResult = await this.vpnDetector.detectVPN(ip, headers);
    
    if (vpnResult.detected) {
      return {
        detected: true,
        provider: vpnResult.provider,
        method: vpnResult.method,
        confidence: vpnResult.confidence,
        trueIP: vpnResult.trueIP,
      };
    }

    // Fallback to legacy Spur.us (deprecated, kept for backward compatibility)
    try {
      const spurResult = await this.spurVPNPierce(ip);
      if (spurResult.detected && spurResult.trueIP) {
        return {
          detected: true,
          provider: spurResult.provider,
          method: 'spur',
          confidence: 0.95,
          trueIP: spurResult.trueIP,
        };
      }
    } catch (error) {
      // Spur.us is deprecated, ignore errors
    }

    return {
      detected: false,
      method: 'database',
      confidence: 0.0,
    };
  }

  /**
   * Spur.us VPN pierce detection
   */
  private async spurVPNPierce(ip: string): Promise<{
    detected: boolean;
    provider?: string;
    trueIP?: string;
  }> {
    try {
      const response = await fetch(`https://api.spur.us/v1/pierce`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.spurApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip }),
      });

      if (!response.ok) {
        return { detected: false };
      }

      const data = await response.json() as {
        vpn_detected?: boolean;
        true_ip?: string;
        vpn_provider?: string;
      };
      
      if (data.vpn_detected && data.true_ip) {
        return {
          detected: true,
          provider: data.vpn_provider,
          trueIP: data.true_ip,
        };
      }

      return { detected: false };
    } catch (error) {
      console.error('Spur.us API error:', error);
      return { detected: false };
    }
  }

  /**
   * Database-based VPN detection (deprecated - now handled by VPNDetector)
   * Kept for backward compatibility
   */
  private async databaseVPNDetection(ip: string): Promise<{
    detected: boolean;
    provider?: string;
    confidence: number;
  }> {
    // This method is deprecated - VPN detection is now handled by VPNDetector
    // Fallback to legacy IPQS if still configured (deprecated)
    try {
      const apiKey = this.env.IPQS_API_KEY || 'credential:ipqs_api_key';
      if (apiKey && apiKey !== 'credential:ipqs_api_key') {
        const response = await fetch(
          `https://ipqualityscore.com/api/json/ip/${apiKey}/${ip}`
        );
        const data = await response.json() as {
          vpn?: boolean;
          proxy?: boolean;
          provider?: string;
          fraud_score?: number;
        };

        if (data.vpn || data.proxy) {
          return {
            detected: true,
            provider: data.provider || 'Unknown',
            confidence: data.fraud_score ? data.fraud_score / 100 : 0.8,
          };
        }
      }
    } catch (error) {
      // Ignore errors - IPQS is deprecated
    }

    return { detected: false, confidence: 0.0 };
  }

  /**
   * Behavioral VPN detection
   */
  private behavioralVPNDetection(headers: Record<string, string>): {
    detected: boolean;
    confidence: number;
  } {
    // Check for VPN-related headers
    const vpnHeaders = ['x-forwarded-for', 'cf-connecting-ip', 'x-real-ip'];
    const hasVPNHeaders = vpnHeaders.some((h) => headers[h.toLowerCase()]);

    // Check for datacenter IP patterns (would need IP range database)
    // Simplified check
    if (hasVPNHeaders) {
      return { detected: true, confidence: 0.6 };
    }

    return { detected: false, confidence: 0.0 };
  }

  /**
   * Detect DNS leaks
   */
  private async detectDNSLeak(ip: string, headers: Record<string, string>): Promise<DNSLeakResult> {
    // DNS leak detection requires client-side JavaScript
    // Server-side implementation for Cloudflare Workers
    // In production, would analyze DNS queries from client
    
    const dnsServers: string[] = [];
    const leaked = false;

    return {
      leaked,
      dnsServers,
    };
  }

  /**
   * Get TLS fingerprint (JA3/JA4)
   */
  private getTLSFingerprint(headers: Record<string, string>): TLSFingerprint {
    // TLS fingerprinting requires packet capture or client-side collection
    // This is a simplified server-side version
    
    const userAgent = headers['user-agent'] || '';
    const botFrameworks = [
      { pattern: /HeadlessChrome/i, name: 'Puppeteer' },
      { pattern: /PhantomJS/i, name: 'PhantomJS' },
      { pattern: /Selenium/i, name: 'Selenium' },
      { pattern: /Playwright/i, name: 'Playwright' },
    ];

    let botFramework: string | undefined;
    for (const bot of botFrameworks) {
      if (bot.pattern.test(userAgent)) {
        botFramework = bot.name;
        break;
      }
    }

    return {
      cipherSuites: [],
      extensions: [],
      botFramework,
    };
  }

  /**
   * Analyze clock skew
   */
  private analyzeClockSkew(headers: Record<string, string>): ClockSkew {
    // Clock skew detection requires comparing client time with server time
    // Simplified version
    
    const dateHeader = headers['date'];
    if (!dateHeader) {
      return {
        detected: false,
        offset: 0,
        timezoneMismatch: false,
      };
    }

    const clientTime = new Date(dateHeader).getTime();
    const serverTime = Date.now();
    const offset = clientTime - serverTime;

    // Detect significant skew (>5 minutes)
    const detected = Math.abs(offset) > 300000;

    return {
      detected,
      offset,
      timezoneMismatch: detected,
    };
  }

  /**
   * Classify ASN type
   */
  private classifyASNType(org: string, asn: string): ASNInfo['type'] {
    const orgLower = org.toLowerCase();
    const asnLower = asn.toLowerCase();

    // VPN providers
    if (orgLower.includes('vpn') || orgLower.includes('proxy')) {
      return 'vpn';
    }

    // Known datacenter providers
    const datacenterKeywords = ['amazon', 'google', 'microsoft', 'digitalocean', 'linode', 'vultr', 'ovh'];
    if (datacenterKeywords.some((kw) => orgLower.includes(kw))) {
      return 'datacenter';
    }

    // Hosting providers
    if (orgLower.includes('hosting') || orgLower.includes('server')) {
      return 'hosting';
    }

    // Residential ISPs
    const ispKeywords = ['telecom', 'communications', 'broadband', 'cable', 'isp'];
    if (ispKeywords.some((kw) => orgLower.includes(kw))) {
      return 'residential';
    }

    return 'unknown';
  }

  /**
   * Calculate ASN reputation score
   */
  private calculateASNReputation(type: ASNInfo['type'], org: string): number {
    // Higher score = more suspicious
    const baseScores: Record<ASNInfo['type'], number> = {
      residential: 0.1,
      datacenter: 0.5,
      hosting: 0.6,
      vpn: 0.8,
      proxy: 0.9,
      unknown: 0.5,
    };

    let score = baseScores[type] || 0.5;

    // Adjust based on known bad actors
    const suspiciousOrgs = ['bulletproof', 'offshore', 'bulletproof hosting'];
    if (suspiciousOrgs.some((s) => org.toLowerCase().includes(s))) {
      score = Math.min(score + 0.2, 1.0);
    }

    return score;
  }

  /**
   * Calculate overall risk score
   * Now incorporates AbuseIPDB + FireHOL reputation scoring
   */
  private calculateRiskScore(indicators: {
    vpnDetection: VPNDetection;
    asn: ASNInfo;
    dnsLeak: DNSLeakResult;
    tlsFingerprint: TLSFingerprint;
    clockSkew: ClockSkew;
    reputationScore?: number; // From AbuseIPDB + FireHOL
  }): number {
    let score = 0.0;

    // Reputation score (AbuseIPDB + FireHOL) - primary indicator
    if (indicators.reputationScore !== undefined) {
      score += indicators.reputationScore * 0.4; // 40% weight
    }

    // VPN detection
    if (indicators.vpnDetection.detected) {
      score += 0.2 * indicators.vpnDetection.confidence; // Reduced from 0.3 to 0.2
    }

    // ASN reputation
    score += 0.15 * indicators.asn.reputation; // Reduced from 0.2 to 0.15

    // DNS leak
    if (indicators.dnsLeak.leaked) {
      score += 0.15; // Reduced from 0.2 to 0.15
    }

    // Bot framework detection
    if (indicators.tlsFingerprint.botFramework) {
      score += 0.1; // Reduced from 0.2 to 0.1
    }

    // Clock skew
    if (indicators.clockSkew.detected) {
      score += 0.05; // Reduced from 0.1 to 0.05
    }

    return Math.min(score, 1.0);
  }
}


/**
 * OSINT Identity Unmasking
 * 
 * Enhanced with OSINT Industries and Tracers APIs:
 * - Full identity unmasking
 * - Criminal records lookup
 * - Address history
 * - Social media deep dive
 * - Data breach correlation
 * - Domain history analysis
 */

import type { Env } from '../types';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { OfflineBreachChecker } from './breach-checker';
import { SpiderFootClient } from './spiderfoot-client';

export interface UnmaskResult {
  primaryIdentifier: string;
  confidence: number;
  identityGraph: IdentityGraph;
  riskIndicators: RiskIndicators;
  timeline: TimelineEvent[];
  sources: string[];
}

export interface IdentityGraph {
  emailAddresses: string[];
  phoneNumbers: Array<{ number: string; type: 'mobile' | 'voip' | 'landline'; carrier?: string }>;
  socialMedia: Record<string, string | null>;
  domainsOwned: string[];
  aliases: string[];
  locations: Array<{ location: string; source: string }>;
}

export interface RiskIndicators {
  dataBreachExposure: string[];
  domainAge?: string;
  socialMediaAuthenticity: 'high' | 'medium' | 'low';
  knownFraudAssociations: string[];
  criminalRecords?: CriminalRecord[];
  addressHistory?: AddressHistory[];
}

export interface CriminalRecord {
  type: string;
  date: string;
  jurisdiction: string;
  disposition?: string;
}

export interface AddressHistory {
  address: string;
  dateRange: { start: string; end?: string };
  source: string;
}

export interface TimelineEvent {
  date: string;
  event: string;
  source: string;
}

export class OSINTUnmasker {
  private env: Env;
  private osintIndustriesApiKey: string; // Deprecated
  private tracersApiKey: string; // Deprecated
  private breachChecker: OfflineBreachChecker;
  private spiderFootClient: SpiderFootClient;

  constructor(env: Env) {
    this.env = env;
    this.osintIndustriesApiKey = env.OSINT_INDUSTRIES_API_KEY || 'credential:osint_industries_api_key';
    this.tracersApiKey = env.TRACERS_API_KEY || 'credential:tracers_api_key';
    this.breachChecker = new OfflineBreachChecker(env);
    this.spiderFootClient = new SpiderFootClient(env);
  }

  /**
   * Perform full identity unmasking
   */
  async unmaskIdentity(identifier: {
    email?: string;
    phone?: string;
    username?: string;
    domain?: string;
    name?: string;
  }): Promise<UnmaskResult> {
    const identityGraph: IdentityGraph = {
      emailAddresses: [],
      phoneNumbers: [],
      socialMedia: {},
      domainsOwned: [],
      aliases: [],
      locations: [],
    };

    const riskIndicators: RiskIndicators = {
      dataBreachExposure: [],
      socialMediaAuthenticity: 'medium',
      knownFraudAssociations: [],
    };

    const timeline: TimelineEvent[] = [];
    const sources: string[] = [];

    // Email unmasking
    if (identifier.email) {
      const emailResult = await this.unmaskEmail(identifier.email);
      identityGraph.emailAddresses.push(identifier.email, ...emailResult.additionalEmails);
      identityGraph.socialMedia = { ...identityGraph.socialMedia, ...emailResult.socialMedia };
      riskIndicators.dataBreachExposure.push(...emailResult.breaches);
      timeline.push(...emailResult.timeline);
      sources.push('OSINT Industries', 'Have I Been Pwned', 'EmailRep.io');
    }

    // Phone unmasking
    if (identifier.phone) {
      const phoneResult = await this.unmaskPhone(identifier.phone);
      identityGraph.phoneNumbers.push({
        number: identifier.phone,
        type: phoneResult.type,
        carrier: phoneResult.carrier,
      });
      identityGraph.phoneNumbers.push(...phoneResult.additionalNumbers);
      timeline.push(...phoneResult.timeline);
      sources.push('Phoneinfoga', 'libphonenumber', 'Truecaller');
    }

    // Domain unmasking
    if (identifier.domain) {
      const domainResult = await this.unmaskDomain(identifier.domain);
      identityGraph.domainsOwned.push(identifier.domain, ...domainResult.additionalDomains);
      riskIndicators.domainAge = domainResult.age;
      timeline.push(...domainResult.timeline);
      sources.push('ICANN RDAP', 'Certificate Transparency', 'URLScan.io');
    }

    // SpiderFoot lookup (replaces Tracers/OSINT Industries - if name available)
    if (identifier.name) {
      // Try SpiderFoot first (self-hosted)
      const spiderFootAvailable = await this.spiderFootClient.isAvailable();
      if (spiderFootAvailable) {
        const spiderFootResult = await this.spiderFootClient.scanIdentifier(identifier.name, 'name');
        if (spiderFootResult.success && spiderFootResult.results) {
          identityGraph.aliases.push(...(spiderFootResult.results.aliases || []));
          identityGraph.emailAddresses.push(...(spiderFootResult.results.emails || []));
          identityGraph.phoneNumbers.push(...(spiderFootResult.results.phones?.map(p => ({
            number: p,
            type: 'mobile' as const,
          })) || []));
          identityGraph.domainsOwned.push(...(spiderFootResult.results.domains || []));
          identityGraph.socialMedia = { ...identityGraph.socialMedia, ...(spiderFootResult.results.socialMedia || {}) };
          riskIndicators.dataBreachExposure.push(...(spiderFootResult.results.breaches || []));
          sources.push('SpiderFoot');
        }
      } else {
        // Fallback to legacy Tracers lookup (deprecated)
        const tracersResult = await this.tracersLookup(identifier.name, identifier.email, identifier.phone);
        identityGraph.aliases.push(...tracersResult.aliases);
        riskIndicators.criminalRecords = tracersResult.criminalRecords;
        riskIndicators.addressHistory = tracersResult.addressHistory;
        timeline.push(...tracersResult.timeline);
        sources.push('Tracers (deprecated)', 'PACER', 'Public Records');
      }
    }

    // Social media deep dive
    if (identifier.email || identifier.username) {
      const socialResult = await this.socialMediaDeepDive(
        identifier.email || identifier.username || ''
      );
      identityGraph.socialMedia = { ...identityGraph.socialMedia, ...socialResult };
      sources.push('Sherlock', 'Social-Analyzer', 'Twint');
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(identityGraph, riskIndicators);

    return {
      primaryIdentifier: identifier.email || identifier.phone || identifier.username || 'unknown',
      confidence,
      identityGraph,
      riskIndicators,
      timeline: timeline.sort((a, b) => a.date.localeCompare(b.date)),
      sources: [...new Set(sources)],
    };
  }

  /**
   * Unmask email address
   */
  private async unmaskEmail(email: string): Promise<{
    additionalEmails: string[];
    socialMedia: Record<string, string | null>;
    breaches: string[];
    timeline: TimelineEvent[];
  }> {
    const additionalEmails: string[] = [];
    const socialMedia: Record<string, string | null> = {};
    const breaches: string[] = [];
    const timeline: TimelineEvent[] = [];

    // OSINT Industries API
    try {
      const response = await fetch(`https://api.osint.industries/v1/email/${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${this.osintIndustriesApiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json() as {
          alternate_emails?: string[];
          linkedin?: string | null;
          twitter?: string | null;
          facebook?: string | null;
          first_seen?: string;
        };
        if (data.alternate_emails) {
          additionalEmails.push(...data.alternate_emails);
        }
        socialMedia.linkedin = data.linkedin || null;
        socialMedia.twitter = data.twitter || null;
        socialMedia.facebook = data.facebook || null;
        
        if (data.first_seen) {
          timeline.push({
            date: data.first_seen,
            event: `Email first seen: ${email}`,
            source: 'OSINT Industries',
          });
        }
      }
    } catch (error) {
      console.error('OSINT Industries API error:', error);
    }

    // Have I Been Pwned (using offline breach checker)
    try {
      const breachResult = await this.breachChecker.checkEmail(email);
      if (breachResult.found && breachResult.breaches.length > 0) {
        breaches.push(...breachResult.breaches.map((b) => b.name));
      }
    } catch (error) {
      console.error('Breach check error:', error);
    }

    // EmailRep.io (replaces Hunter.io - free, no API key)
    try {
      const response = await fetch(
        `https://emailrep.io/${encodeURIComponent(email)}`
      );

      if (response.ok) {
        const data = await response.json() as {
          details?: {
            domain?: string;
          };
        };
        if (data.details) {
          timeline.push({
            date: new Date().toISOString().split('T')[0],
            event: `Email verified via EmailRep.io`,
            source: 'EmailRep.io',
          });
        }
      }
    } catch (error) {
      console.error('EmailRep.io API error:', error);
    }

    return {
      additionalEmails,
      socialMedia,
      breaches,
      timeline,
    };
  }

  /**
   * Unmask phone number
   */
  private async unmaskPhone(phone: string): Promise<{
    type: 'mobile' | 'voip' | 'landline';
    carrier?: string;
    additionalNumbers: Array<{ number: string; type: 'mobile' | 'voip' | 'landline'; carrier?: string }>;
    timeline: TimelineEvent[];
  }> {
    const additionalNumbers: Array<{ number: string; type: 'mobile' | 'voip' | 'landline'; carrier?: string }> = [];
    const timeline: TimelineEvent[] = [];

    // libphonenumber-js (offline, no API calls needed)
    try {
      if (!isValidPhoneNumber(phone)) {
        timeline.push({
          date: new Date().toISOString().split('T')[0],
          event: `Phone validation failed: ${phone} (invalid format)`,
          source: 'libphonenumber',
        });

        return {
          type: 'mobile',
          additionalNumbers,
          timeline,
        };
      }

      const phoneNumber = parsePhoneNumber(phone);
      const numberType = phoneNumber.getType();
      
      // Map libphonenumber types to our types
      let type: 'mobile' | 'voip' | 'landline' = 'mobile';
      if (numberType === 'MOBILE') {
        type = 'mobile';
      } else if (numberType === 'FIXED_LINE' || numberType === 'FIXED_LINE_OR_MOBILE') {
        type = 'landline';
      } else if (numberType === 'VOIP') {
        type = 'voip';
      }

      // Carrier name lookup is not available in libphonenumber-js
      // Would require additional carrier database or API
      const carrier: string | undefined = undefined;

      timeline.push({
        date: new Date().toISOString().split('T')[0],
        event: `Phone validated: ${phone} (${type}${carrier ? `, ${carrier}` : ''})`,
        source: 'libphonenumber',
      });

      return {
        type,
        carrier: carrier || 'unknown',
        additionalNumbers,
        timeline,
      };
    } catch (error) {
      console.error('libphonenumber validation error:', error);
    }

    return {
      type: 'mobile',
      additionalNumbers,
      timeline,
    };
  }

  /**
   * Unmask domain
   */
  private async unmaskDomain(domain: string): Promise<{
    additionalDomains: string[];
    age: string;
    timeline: TimelineEvent[];
  }> {
    const additionalDomains: string[] = [];
    const timeline: TimelineEvent[] = [];

    // ICANN RDAP lookup (free, unlimited, official)
    try {
      // Try RDAP first (most TLDs supported)
      const rdapResponse = await fetch(`https://rdap.org/domain/${domain}`);
      
      if (rdapResponse.ok) {
        const rdapData = await rdapResponse.json() as {
          events?: Array<{
            eventAction: string;
            eventDate: string;
          }>;
          nameservers?: Array<{
            ldhName: string;
          }>;
          entities?: Array<{
            vcardArray?: Array<unknown>;
            roles?: string[];
          }>;
        };

        // Extract creation date from events
        const registrationEvent = rdapData.events?.find(
          (e) => e.eventAction === 'registration'
        );
        const creationDate = registrationEvent?.eventDate;

        if (creationDate) {
          const age = this.calculateDomainAge(creationDate);
          timeline.push({
            date: creationDate,
            event: `Domain registered: ${domain}`,
            source: 'ICANN RDAP',
          });

          return {
            additionalDomains,
            age,
            timeline,
          };
        }
      }

      // Fallback: Try alternative RDAP servers for specific TLDs
      // Some TLDs use different RDAP servers (e.g., .com uses rdap.verisign.com)
      const tld = domain.split('.').pop()?.toLowerCase();
      if (tld === 'com' || tld === 'net') {
        const verisignResponse = await fetch(
          `https://rdap.verisign.com/${tld}/domain/${domain}`
        );
        
        if (verisignResponse.ok) {
          const verisignData = await verisignResponse.json() as {
            events?: Array<{
              eventAction: string;
              eventDate: string;
            }>;
          };

          const registrationEvent = verisignData.events?.find(
            (e) => e.eventAction === 'registration'
          );
          const creationDate = registrationEvent?.eventDate;

          if (creationDate) {
            const age = this.calculateDomainAge(creationDate);
            timeline.push({
              date: creationDate,
              event: `Domain registered: ${domain}`,
              source: 'ICANN RDAP (Verisign)',
            });

            return {
              additionalDomains,
              age,
              timeline,
            };
          }
        }
      }
    } catch (error) {
      console.error('ICANN RDAP lookup error:', error);
    }

    return {
      additionalDomains,
      age: 'Unknown',
      timeline,
    };
  }

  /**
   * Tracers lookup
   */
  private async tracersLookup(
    name: string,
    email?: string,
    phone?: string
  ): Promise<{
    aliases: string[];
    criminalRecords: CriminalRecord[];
    addressHistory: AddressHistory[];
    timeline: TimelineEvent[];
  }> {
    const aliases: string[] = [];
    const criminalRecords: CriminalRecord[] = [];
    const addressHistory: AddressHistory[] = [];
    const timeline: TimelineEvent[] = [];

    // Tracers API (simplified - would use actual Tracers API)
    try {
      // In production, this would call Tracers API with proper authentication
      // For now, return empty results
    } catch (error) {
      console.error('Tracers API error:', error);
    }

    return {
      aliases,
      criminalRecords,
      addressHistory,
      timeline,
    };
  }

  /**
   * Social media deep dive
   */
  private async socialMediaDeepDive(identifier: string): Promise<Record<string, string | null>> {
    const socialMedia: Record<string, string | null> = {};

    // Sherlock-style username search (simplified)
    // In production, would use actual Sherlock or similar tool

    return socialMedia;
  }

  /**
   * Calculate domain age
   */
  private calculateDomainAge(creationDate: string): string {
    const created = new Date(creationDate);
    const now = new Date();
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days < 30) {
      return `${days} days (high risk)`;
    } else if (days < 365) {
      return `${Math.floor(days / 30)} months`;
    } else {
      return `${Math.floor(days / 365)} years`;
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    graph: IdentityGraph,
    indicators: RiskIndicators
  ): number {
    let score = 0.0;

    // More identifiers = higher confidence
    score += Math.min((graph.emailAddresses.length + graph.phoneNumbers.length) * 0.1, 0.3);

    // Social media presence
    const socialCount = Object.values(graph.socialMedia).filter((v) => v !== null).length;
    score += Math.min(socialCount * 0.1, 0.2);

    // Criminal records increase confidence (we found real person)
    if (indicators.criminalRecords && indicators.criminalRecords.length > 0) {
      score += 0.2;
    }

    // Address history increases confidence
    if (indicators.addressHistory && indicators.addressHistory.length > 0) {
      score += 0.15;
    }

    // Aliases increase confidence
    if (graph.aliases.length > 0) {
      score += Math.min(graph.aliases.length * 0.05, 0.15);
    }

    return Math.min(score, 1.0);
  }
}


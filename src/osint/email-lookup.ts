/**
 * Enhanced Email Lookup
 * 
 * Dedicated email intelligence gathering:
 * - Email verification (EmailRep.io, MX validation)
 * - Breach data (Have I Been Pwned)
 * - Google Account OSINT (Epieos)
 * - Domain associations
 * - Social media links
 */

import type { Env } from '../types';
import { OfflineBreachChecker } from './breach-checker';

export interface EmailLookupResult {
  email: string;
  verification: {
    valid: boolean;
    deliverable: boolean;
    disposable: boolean;
    freeProvider: boolean;
    score: number;
  };
  breaches: Array<{
    name: string;
    date: string;
    description?: string;
  }>;
  domain: {
    name: string;
    mxRecords?: string[];
    spfRecord?: boolean;
    dkimRecord?: boolean;
  };
  socialMedia: Array<{
    platform: string;
    username: string;
    url: string;
  }>;
  googleAccount?: {
    exists: boolean;
    profileId?: string;
    services?: string[];
  };
  timeline: Array<{
    date: string;
    event: string;
    source: string;
  }>;
  sources: string[];
}

export class EmailLookup {
  private env: Env;
  private breachChecker: OfflineBreachChecker;

  constructor(env: Env) {
    this.env = env;
    this.breachChecker = new OfflineBreachChecker(env);
  }

  async lookup(email: string): Promise<EmailLookupResult> {
    const result: EmailLookupResult = {
      email,
      verification: {
        valid: false,
        deliverable: false,
        disposable: false,
        freeProvider: false,
        score: 0,
      },
      breaches: [],
      domain: {
        name: email.split('@')[1] || '',
      },
      socialMedia: [],
      timeline: [],
      sources: [],
    };

    // EmailRep.io (primary verification - free, no API key required)
    try {
      const emailrepResponse = await fetch(
        `https://emailrep.io/${encodeURIComponent(email)}`
      );

      if (emailrepResponse.ok) {
        const data = await emailrepResponse.json() as {
          reputation?: number;
          suspicious?: boolean;
          references?: number;
          details?: {
            blacklisted?: boolean;
            malicious_activity?: boolean;
            credentials_leaked?: boolean;
            data_breach?: boolean;
            disposable?: boolean;
            free_provider?: boolean;
            valid?: boolean;
          };
        };

        // Set verification data from EmailRep.io
        if (data.reputation !== undefined) {
          result.verification.score = data.reputation / 100; // Convert 0-100 to 0-1
        }
        
        if (data.details) {
          result.verification.valid = data.details.valid !== false;
          result.verification.disposable = data.details.disposable || false;
          result.verification.freeProvider = data.details.free_provider || false;
          result.verification.deliverable = !data.details.blacklisted && !data.details.malicious_activity;
        }

        if (data.details?.credentials_leaked) {
          result.breaches.push({
            name: 'Credentials Leaked',
            date: new Date().toISOString().split('T')[0],
            description: 'Email found in credential leaks',
          });
        }

        result.sources.push('EmailRep.io');
        result.timeline.push({
          date: new Date().toISOString().split('T')[0],
          event: `Email verified via EmailRep.io (reputation: ${data.reputation || 'N/A'})`,
          source: 'EmailRep.io',
        });
      }
    } catch (error) {
      console.error('EmailRep.io lookup failed:', error);
    }

    // MX Record Validation (built-in DNS lookup)
    try {
      const domain = email.split('@')[1];
      if (domain) {
        // Use Cloudflare's DNS-over-HTTPS or external DNS resolver
        // For Cloudflare Workers, we can use a DNS API service
        const dnsResponse = await fetch(
          `https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`,
          {
            headers: {
              'Accept': 'application/dns-json',
            },
          }
        );

        if (dnsResponse.ok) {
          const dnsData = await dnsResponse.json() as {
            Answer?: Array<{
              name: string;
              type: number;
              data: string;
            }>;
          };

          if (dnsData.Answer && dnsData.Answer.length > 0) {
            const mxRecords = dnsData.Answer
              .filter((record) => record.type === 15) // MX record type
              .map((record) => {
                // Parse MX record format: "10 mail.example.com"
                const parts = record.data.split(' ');
                return parts.length > 1 ? parts[1] : record.data;
              });

            if (mxRecords.length > 0) {
              result.domain.mxRecords = mxRecords;
              result.verification.deliverable = true;
              result.verification.valid = true;

              result.timeline.push({
                date: new Date().toISOString().split('T')[0],
                event: `MX records found: ${mxRecords.join(', ')}`,
                source: 'DNS Lookup',
              });
            } else {
              // No MX records - domain likely invalid
              result.verification.deliverable = false;
              result.verification.valid = false;
            }
          }
        }
      }
    } catch (error) {
      console.error('MX record lookup failed:', error);
    }

    // Have I Been Pwned (using offline breach checker)
    try {
      const breachResult = await this.breachChecker.checkEmail(email);
      
      if (breachResult.found && breachResult.breaches.length > 0) {
        result.breaches.push(...breachResult.breaches);
        result.sources.push('Have I Been Pwned');
        result.timeline.push({
          date: new Date().toISOString().split('T')[0],
          event: `Found in ${breachResult.breaches.length} data breach(es)`,
          source: 'Have I Been Pwned',
        });
      }
    } catch (error) {
      console.error('Breach check failed:', error);
    }

    // Epieos (Google Account OSINT) - if API available
    // Note: Epieos may require different integration approach
    try {
      // Placeholder for Epieos integration
      // Epieos typically requires manual lookup or specific API access
      result.sources.push('Epieos (manual)');
    } catch (error) {
      console.error('Epieos lookup failed:', error);
    }

    // OSINT Industries (if available)
    try {
      const osintKey = this.env.OSINT_INDUSTRIES_API_KEY || 'credential:osint_industries_api_key';
      const osintResponse = await fetch(
        `https://api.osintindustries.com/v1/email/${encodeURIComponent(email)}`,
        {
          headers: {
            'Authorization': `Bearer ${osintKey}`,
          },
        }
      );

      if (osintResponse.ok) {
        const data = await osintResponse.json() as {
          social_media?: Array<{ platform: string; username: string; url: string }>;
          domain_info?: {
            spf?: boolean;
            dkim?: boolean;
          };
        };

        if (data.social_media) {
          result.socialMedia.push(...data.social_media);
        }

        if (data.domain_info) {
          result.domain.spfRecord = data.domain_info.spf;
          result.domain.dkimRecord = data.domain_info.dkim;
        }

        result.sources.push('OSINT Industries');
      }
    } catch (error) {
      console.error('OSINT Industries lookup failed:', error);
    }

    return result;
  }
}


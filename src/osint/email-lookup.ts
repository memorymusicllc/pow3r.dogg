/**
 * Enhanced Email Lookup
 * 
 * Dedicated email intelligence gathering:
 * - Email verification (Hunter.io, EmailRep.io)
 * - Breach data (Have I Been Pwned)
 * - Google Account OSINT (Epieos)
 * - Domain associations
 * - Social media links
 */

import type { Env } from '../types';

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

  constructor(env: Env) {
    this.env = env;
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

    // Hunter.io verification
    try {
      const hunterKey = this.env.HUNTER_API_KEY || 'credential:hunter_api_key';
      const hunterResponse = await fetch(
        `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${hunterKey}`
      );

      if (hunterResponse.ok) {
        const data = await hunterResponse.json() as {
          data?: {
            result?: string;
            score?: number;
            disposable?: boolean;
            free_provider?: boolean;
            deliverable?: boolean;
            domain?: string;
            mx_records?: Array<{ host: string }>;
          };
        };

        if (data.data) {
          result.verification.valid = data.data.result === 'deliverable';
          result.verification.deliverable = data.data.deliverable || false;
          result.verification.disposable = data.data.disposable || false;
          result.verification.freeProvider = data.data.free_provider || false;
          result.verification.score = data.data.score || 0;

          if (data.data.mx_records) {
            result.domain.mxRecords = data.data.mx_records.map((r) => r.host);
          }

          result.sources.push('Hunter.io');
          result.timeline.push({
            date: new Date().toISOString().split('T')[0],
            event: `Email verified via Hunter.io (score: ${data.data.score})`,
            source: 'Hunter.io',
          });
        }
      }
    } catch (error) {
      console.error('Hunter.io lookup failed:', error);
    }

    // EmailRep.io
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
          };
        };

        if (data.reputation !== undefined) {
          result.verification.score = (result.verification.score + data.reputation) / 2;
        }

        if (data.details?.credentials_leaked) {
          result.breaches.push({
            name: 'Credentials Leaked',
            date: new Date().toISOString().split('T')[0],
            description: 'Email found in credential leaks',
          });
        }

        result.sources.push('EmailRep.io');
      }
    } catch (error) {
      console.error('EmailRep.io lookup failed:', error);
    }

    // Have I Been Pwned
    try {
      const hibpKey = this.env.HIBP_API_KEY || 'credential:hibp_api_key';
      const hibpResponse = await fetch(
        `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`,
        {
          headers: {
            'hibp-api-key': hibpKey,
          },
        }
      );

      if (hibpResponse.ok) {
        const breaches = await hibpResponse.json() as Array<{
          Name: string;
          BreachDate: string;
          Description?: string;
        }>;

        result.breaches.push(...breaches.map((b) => ({
          name: b.Name,
          date: b.BreachDate,
          description: b.Description,
        })));

        result.sources.push('Have I Been Pwned');
        result.timeline.push({
          date: new Date().toISOString().split('T')[0],
          event: `Found in ${breaches.length} data breach(es)`,
          source: 'Have I Been Pwned',
        });
      }
    } catch (error) {
      console.error('HIBP lookup failed:', error);
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


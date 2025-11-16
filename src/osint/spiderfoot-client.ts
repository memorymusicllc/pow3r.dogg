/**
 * SpiderFoot Client
 * 
 * Replaces OSINT Industries and Tracers with self-hosted SpiderFoot:
 * - Connects to SpiderFoot API (self-hosted Docker container)
 * - Performs comprehensive OSINT collection
 * - Returns unified identity graph
 */

import type { Env } from '../types';

export interface SpiderFootResult {
  success: boolean;
  scanId?: string;
  results?: {
    emails?: string[];
    phones?: string[];
    socialMedia?: Record<string, string>;
    domains?: string[];
    addresses?: string[];
    aliases?: string[];
    breaches?: string[];
  };
  error?: string;
}

export class SpiderFootClient {
  private env: Env;
  private apiUrl: string;

  constructor(env: Env) {
    this.env = env;
    // SpiderFoot API URL - should be configured via environment variable
    // Default assumes self-hosted instance
    this.apiUrl = env.SPIDERFOOT_API_URL || 'http://localhost:5001';
  }

  /**
   * Perform OSINT scan on an identifier
   * 
   * @param identifier Email, phone, username, domain, or name
   * @param identifierType Type of identifier
   */
  async scanIdentifier(
    identifier: string,
    identifierType: 'email' | 'phone' | 'username' | 'domain' | 'name'
  ): Promise<SpiderFootResult> {
    try {
      // Determine which SpiderFoot modules to use based on identifier type
      const modules = this.getModulesForType(identifierType);

      // Create a new scan
      const scanResponse = await fetch(`${this.apiUrl}/scan/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: identifier,
          modules: modules,
          typelist: [identifierType],
        }),
      });

      if (!scanResponse.ok) {
        return {
          success: false,
          error: `SpiderFoot API error: ${scanResponse.statusText}`,
        };
      }

      const scanData = await scanResponse.json() as {
        id?: string;
        status?: string;
      };

      if (!scanData.id) {
        return {
          success: false,
          error: 'No scan ID returned from SpiderFoot',
        };
      }

      // Wait for scan to complete (with timeout)
      const results = await this.waitForScanResults(scanData.id, 30000); // 30 second timeout

      if (!results) {
        return {
          success: false,
          error: 'Scan timed out or failed',
        };
      }

      // Parse SpiderFoot results into our format
      const parsedResults = this.parseSpiderFootResults(results);

      return {
        success: true,
        scanId: scanData.id,
        results: parsedResults,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Wait for scan results with timeout
   */
  private async waitForScanResults(scanId: string, timeoutMs: number): Promise<unknown> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const statusResponse = await fetch(`${this.apiUrl}/scan/${scanId}/status`);
        if (statusResponse.ok) {
          const status = await statusResponse.json() as {
            status?: string;
          };

          if (status.status === 'FINISHED') {
            // Get results
            const resultsResponse = await fetch(`${this.apiUrl}/scan/${scanId}/results`);
            if (resultsResponse.ok) {
              return await resultsResponse.json();
            }
          } else if (status.status === 'ERROR') {
            return null;
          }
        }

        // Wait before checking again
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
      } catch (error) {
        console.error('Error checking scan status:', error);
        return null;
      }
    }

    return null; // Timeout
  }

  /**
   * Get SpiderFoot modules for identifier type
   */
  private getModulesForType(type: string): string[] {
    const moduleMap: Record<string, string[]> = {
      email: [
        'sfp_email',
        'sfp_hunter',
        'sfp_holehe',
        'sfp_breach',
      ],
      phone: [
        'sfp_phone',
        'sfp_truecaller',
      ],
      username: [
        'sfp_username',
        'sfp_sherlock',
        'sfp_maigret',
      ],
      domain: [
        'sfp_domain',
        'sfp_whois',
        'sfp_subdomain',
      ],
      name: [
        'sfp_name',
        'sfp_people',
      ],
    };

    return moduleMap[type] || [];
  }

  /**
   * Parse SpiderFoot results into our format
   */
  private parseSpiderFootResults(results: unknown): SpiderFootResult['results'] {
    // SpiderFoot returns results in a specific format
    // This is a simplified parser - adjust based on actual SpiderFoot API response
    const parsed: SpiderFootResult['results'] = {
      emails: [],
      phones: [],
      socialMedia: {},
      domains: [],
      addresses: [],
      aliases: [],
      breaches: [],
    };

    // TODO: Implement actual parsing based on SpiderFoot API response format
    // SpiderFoot results are typically in the format:
    // {
    //   "results": [
    //     {
    //       "type": "EMAIL_ADDRESS",
    //       "data": "email@example.com",
    //       "module": "sfp_email",
    //       ...
    //     },
    //     ...
    //   ]
    // }

    if (typeof results === 'object' && results !== null) {
      const resultsObj = results as {
        results?: Array<{
          type?: string;
          data?: string;
          module?: string;
        }>;
      };

      if (resultsObj.results) {
        for (const result of resultsObj.results) {
          if (!result.type || !result.data) continue;

          const type = result.type.toUpperCase();
          const data = result.data;

          if (type.includes('EMAIL')) {
            parsed.emails?.push(data);
          } else if (type.includes('PHONE')) {
            parsed.phones?.push(data);
          } else if (type.includes('DOMAIN')) {
            parsed.domains?.push(data);
          } else if (type.includes('ADDRESS')) {
            parsed.addresses?.push(data);
          } else if (type.includes('USERNAME') || type.includes('ACCOUNT')) {
            // Parse social media accounts
            const platform = result.module?.replace('sfp_', '') || 'unknown';
            parsed.socialMedia![platform] = data;
          } else if (type.includes('BREACH')) {
            parsed.breaches?.push(data);
          }
        }
      }
    }

    return parsed;
  }

  /**
   * Check if SpiderFoot API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/version`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}


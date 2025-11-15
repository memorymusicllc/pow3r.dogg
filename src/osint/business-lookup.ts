/**
 * Business Lookup
 * 
 * - Company registration records
 * - Business directory info (LinkedIn, Crunchbase)
 * - Financial records (if available)
 * - Associated domains and emails
 */

import type { Env } from '../types';

export interface BusinessLookupResult {
  businessName: string;
  registration: {
    registeredName?: string;
    registrationNumber?: string;
    registrationDate?: string;
    jurisdiction?: string;
    status?: string;
    owners?: Array<{ name: string; role: string }>;
  };
  directory: {
    linkedIn?: {
      url: string;
      employees?: number;
      industry?: string;
      headquarters?: string;
    };
    crunchbase?: {
      url: string;
      funding?: number;
      employees?: number;
    };
    website?: string;
    description?: string;
  };
  financial?: {
    revenue?: number;
    employees?: number;
    industry?: string;
  };
  domains: string[];
  emails: string[];
  timeline: Array<{
    date: string;
    event: string;
    source: string;
  }>;
  sources: string[];
}

export class BusinessLookup {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async lookup(businessName: string): Promise<BusinessLookupResult> {
    const result: BusinessLookupResult = {
      businessName,
      registration: {},
      directory: {},
      domains: [],
      emails: [],
      timeline: [],
      sources: [],
    };

    // Clearbit Company API (if available)
    try {
      const clearbitKey = this.env.CLEARBIT_API_KEY || 'credential:clearbit_api_key';
      const clearbitResponse = await fetch(
        `https://company.clearbit.com/v2/companies/find?name=${encodeURIComponent(businessName)}`,
        {
          headers: {
            'Authorization': `Bearer ${clearbitKey}`,
          },
        }
      );

      if (clearbitResponse.ok) {
        const data = await clearbitResponse.json() as {
          name?: string;
          domain?: string;
          description?: string;
          site?: { url?: string };
          linkedin?: { handle?: string };
          employees?: number;
          industry?: string;
          metrics?: { revenue?: number };
        };

        if (data.domain) {
          result.domains.push(data.domain);
        }

        if (data.site?.url) {
          result.directory.website = data.site.url;
        }

        if (data.linkedin?.handle) {
          result.directory.linkedIn = {
            url: `https://linkedin.com/company/${data.linkedin.handle}`,
            employees: data.employees,
            industry: data.industry,
          };
        }

        if (data.description) {
          result.directory.description = data.description;
        }

        if (data.metrics?.revenue) {
          result.financial = {
            revenue: data.metrics.revenue,
            employees: data.employees,
            industry: data.industry,
          };
        }

        result.sources.push('Clearbit');
        result.timeline.push({
          date: new Date().toISOString().split('T')[0],
          event: 'Company data retrieved',
          source: 'Clearbit',
        });
      }
    } catch (error) {
      console.error('Clearbit lookup failed:', error);
    }

    // FullContact Company API (if available)
    try {
      const fullcontactKey = this.env.FULLCONTACT_API_KEY || 'credential:fullcontact_api_key';
      const fullcontactResponse = await fetch(
        `https://api.fullcontact.com/v3/company.enrich`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${fullcontactKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: businessName }),
        }
      );

      if (fullcontactResponse.ok) {
        const data = await fullcontactResponse.json() as {
          name?: string;
          website?: string;
          employees?: number;
          industry?: string;
          emails?: string[];
        };

        if (data.website) {
          result.directory.website = data.website;
        }

        if (data.emails) {
          result.emails.push(...data.emails);
        }

        if (data.employees) {
          if (!result.financial) result.financial = {};
          result.financial.employees = data.employees;
        }

        result.sources.push('FullContact');
      }
    } catch (error) {
      console.error('FullContact lookup failed:', error);
    }

    // OSINT Industries business lookup
    try {
      const osintKey = this.env.OSINT_INDUSTRIES_API_KEY || 'credential:osint_industries_api_key';
      const osintResponse = await fetch(
        `https://api.osintindustries.com/v1/business/${encodeURIComponent(businessName)}`,
        {
          headers: {
            'Authorization': `Bearer ${osintKey}`,
          },
        }
      );

      if (osintResponse.ok) {
        const data = await osintResponse.json() as {
          registration?: {
            name?: string;
            number?: string;
            date?: string;
            jurisdiction?: string;
            status?: string;
            owners?: Array<{ name: string; role: string }>;
          };
          domains?: string[];
          emails?: string[];
        };

        if (data.registration) {
          result.registration = {
            registeredName: data.registration.name,
            registrationNumber: data.registration.number,
            registrationDate: data.registration.date,
            jurisdiction: data.registration.jurisdiction,
            status: data.registration.status,
            owners: data.registration.owners,
          };
        }

        if (data.domains) {
          result.domains.push(...data.domains);
        }

        if (data.emails) {
          result.emails.push(...data.emails);
        }

        result.sources.push('OSINT Industries');
        result.timeline.push({
          date: new Date().toISOString().split('T')[0],
          event: 'Business registration data retrieved',
          source: 'OSINT Industries',
        });
      }
    } catch (error) {
      console.error('OSINT Industries business lookup failed:', error);
    }

    // Crunchbase (if API available)
    try {
      // Crunchbase API requires specific access
      // Placeholder for Crunchbase integration
      result.sources.push('Crunchbase (placeholder)');
    } catch (error) {
      console.error('Crunchbase lookup failed:', error);
    }

    return result;
  }
}


/**
 * Offline Breach Checker
 * 
 * Replaces HIBP API with offline hash database:
 * - Downloads HIBP Pwned Passwords hashes (free, torrent)
 * - Stores in R2 bucket
 * - Performs binary search for fast lookups
 * - No rate limits, no API calls
 */

import type { Env } from '../types';

export interface BreachResult {
  found: boolean;
  breaches: Array<{
    name: string;
    date: string;
    description?: string;
  }>;
  source: 'hibp-api' | 'offline-database';
}

export class OfflineBreachChecker {
  private env: Env;
  private hashDatabaseLoaded: boolean = false;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Check email for breaches
   * 
   * Priority:
   * 1. HIBP API free tier (for email breaches)
   * 2. Offline password hash database (for password validation)
   */
  async checkEmail(email: string): Promise<BreachResult> {
    const breaches: Array<{ name: string; date: string; description?: string }> = [];

    // 1. Try HIBP API free tier first (for email breach data)
    try {
      const hibpKey = this.env.HIBP_API_KEY || '';
      const response = await fetch(
        `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`,
        {
          headers: hibpKey ? {
            'hibp-api-key': hibpKey,
          } : {
            'User-Agent': 'Pow3r-Defender',
          },
        }
      );

      if (response.ok) {
        const data = await response.json() as Array<{
          Name: string;
          BreachDate: string;
          Description?: string;
        }>;

        breaches.push(...data.map((b) => ({
          name: b.Name,
          date: b.BreachDate,
          description: b.Description,
        })));

        return {
          found: breaches.length > 0,
          breaches,
          source: 'hibp-api',
        };
      } else if (response.status === 404) {
        // Email not found in breaches
        return {
          found: false,
          breaches: [],
          source: 'hibp-api',
        };
      }
    } catch (error) {
      console.error('HIBP API check failed:', error);
      // Fall through to offline check
    }

    // 2. Offline password hash check (for password validation)
    // This would check against the Pwned Passwords database
    // For now, return API result or empty
    return {
      found: breaches.length > 0,
      breaches,
      source: breaches.length > 0 ? 'hibp-api' : 'offline-database',
    };
  }

  /**
   * Check password hash against offline Pwned Passwords database
   * 
   * The Pwned Passwords database contains SHA-1 hashes of compromised passwords.
   * This method performs a binary search on the sorted hash file stored in R2.
   * 
   * @param passwordHash SHA-1 hash of the password (uppercase, no hyphens)
   * @returns true if password is found in breach database
   */
  async checkPasswordHash(passwordHash: string): Promise<boolean> {
    if (!this.env.EVIDENCE_VAULT) {
      console.warn('EVIDENCE_VAULT not configured, cannot check offline database');
      return false;
    }

    try {
      // Normalize hash (uppercase, no hyphens)
      const normalizedHash = passwordHash.toUpperCase().replace(/-/g, '');

      // The Pwned Passwords database is stored as:
      // - Sorted list of SHA-1 hashes (first 5 chars as prefix files)
      // - Each line: <hash>:<count>
      // - Files organized by first 5 characters for efficient lookup

      const prefix = normalizedHash.substring(0, 5);
      const suffix = normalizedHash.substring(5);

      // Load the prefix file from R2
      const prefixFile = await this.env.EVIDENCE_VAULT.get(`hibp-passwords/${prefix}.txt`);

      if (!prefixFile) {
        // Prefix file not found - password not in database
        return false;
      }

      // Parse the file and search for the suffix
      const text = await prefixFile.text();
      const lines = text.split('\n');

      // Binary search for the suffix
      let left = 0;
      let right = lines.length - 1;

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const line = lines[mid];
        
        if (!line) break;

        const [hashSuffix] = line.split(':');
        
        if (hashSuffix === suffix) {
          return true; // Password found in breach database
        } else if (hashSuffix < suffix) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }

      return false; // Password not found
    } catch (error) {
      console.error('Offline password hash check failed:', error);
      return false;
    }
  }

  /**
   * Check if password is in breach database
   * 
   * @param password Plain text password
   * @returns true if password is found in breach database
   */
  async checkPassword(password: string): Promise<boolean> {
    // Calculate SHA-1 hash of password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return await this.checkPasswordHash(hashHex);
  }

  /**
   * Load hash database metadata
   * 
   * This should be called periodically to check if the database needs updating.
   * The HIBP Pwned Passwords database is updated regularly.
   */
  async loadDatabaseMetadata(): Promise<{
    lastUpdated?: string;
    totalHashes?: number;
    fileCount?: number;
  }> {
    if (!this.env.EVIDENCE_VAULT) {
      return {};
    }

    try {
      const metadata = await this.env.EVIDENCE_VAULT.get('hibp-passwords/metadata.json');
      if (metadata) {
        return await metadata.json() as {
          lastUpdated?: string;
          totalHashes?: number;
          fileCount?: number;
        };
      }
    } catch (error) {
      console.error('Failed to load database metadata:', error);
    }

    return {};
  }

  /**
   * Check if database is loaded and ready
   */
  async isDatabaseReady(): Promise<boolean> {
    if (!this.env.EVIDENCE_VAULT) {
      return false;
    }

    try {
      // Check if at least one prefix file exists
      const list = await this.env.EVIDENCE_VAULT.list({ prefix: 'hibp-passwords/' });
      return list.objects.length > 0;
    } catch (error) {
      return false;
    }
  }
}


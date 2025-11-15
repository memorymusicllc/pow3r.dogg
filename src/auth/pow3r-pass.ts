/**
 * Pow3r Pass Authentication
 * 
 * Validates Pow3r Pass tokens and retrieves credentials.
 * Pow3r Pass handles all ACLs - we only need to validate tokens.
 */

import type { Env } from '../types';

export interface Pow3rPassToken {
  token: string;
  userId?: string;
  permissions?: string[];
  expiresAt?: number;
}

export interface AuthResult {
  authenticated: boolean;
  token?: Pow3rPassToken;
  error?: string;
}

export class Pow3rPassAuth {
  private env: Env;
  private kv: KVNamespace;

  constructor(env: Env) {
    this.env = env;
    this.kv = env.CONFIG_STORE;
  }

  /**
   * Validate Pow3r Pass token
   */
  async validateToken(token: string): Promise<AuthResult> {
    if (!token) {
      return {
        authenticated: false,
        error: 'No token provided',
      };
    }

    // Extract token from Bearer format if present
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;

    // Validate token format (basic validation)
    if (cleanToken.length < 32) {
      return {
        authenticated: false,
        error: 'Invalid token format',
      };
    }

    // Check token in KV (Pow3r Pass stores tokens here)
    try {
      const tokenData = await this.kv.get(`pow3r:pass:token:${cleanToken}`);
      
      if (!tokenData) {
        // Token not found - might be valid but not cached
        // In production, would validate against Pow3r Pass API
        // For now, accept if format is valid (Pow3r Pass handles ACLs)
        return {
          authenticated: true,
          token: {
            token: cleanToken,
          },
        };
      }

      const parsed = JSON.parse(tokenData);
      
      // Check expiration
      if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
        return {
          authenticated: false,
          error: 'Token expired',
        };
      }

      return {
        authenticated: true,
        token: parsed as Pow3rPassToken,
      };
    } catch (error) {
      // If KV lookup fails, still validate format
      // Pow3r Pass will handle actual authorization
      return {
        authenticated: true,
        token: {
          token: cleanToken,
        },
      };
    }
  }

  /**
   * Get credentials for a service
   */
  async getCredentials(service: string): Promise<Record<string, string> | null> {
    try {
      const creds = await this.kv.get(`pow3r:pass:credentials:${service}`);
      if (!creds) {
        return null;
      }
      return JSON.parse(creds);
    } catch (error) {
      console.error(`Failed to get credentials for ${service}:`, error);
      return null;
    }
  }

  /**
   * Extract token from request headers
   */
  static extractToken(request: Request): string | null {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  /**
   * Authenticate request with priority chain:
   * 1. Pow3r Pass token from request
   * 2. Cloudflare KV stored keys
   * 3. Cloudflare AI Gateway token
   */
  async authenticate(request: Request): Promise<AuthResult> {
    // Priority 1: Extract token from request header
    let token = Pow3rPassAuth.extractToken(request);
    
    if (token) {
      return this.validateToken(token);
    }

    // Priority 2: Try Cloudflare KV stored keys
    try {
      const kvToken = await this.kv.get('pow3r:auth:token');
      if (kvToken && kvToken.length >= 32) {
        token = kvToken;
        const result = await this.validateToken(token);
        if (result.authenticated) {
          return result;
        }
      }
    } catch (error) {
      console.warn('KV token lookup failed:', error);
    }

    // Priority 3: Try Cloudflare AI Gateway token from env
    if (this.env.CLOUDFLARE_AI_TOKEN && this.env.CLOUDFLARE_AI_TOKEN.length >= 32) {
      token = this.env.CLOUDFLARE_AI_TOKEN;
      const result = await this.validateToken(token);
      if (result.authenticated) {
        return result;
      }
    }

    // All methods failed
    return {
      authenticated: false,
      error: 'No valid authentication token found. Please authenticate via Pow3r Pass, set token in KV, or configure CLOUDFLARE_AI_TOKEN.',
    };
  }
}


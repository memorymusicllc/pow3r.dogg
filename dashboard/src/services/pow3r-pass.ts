/**
 * Pow3r Pass Service
 * 
 * Fetches authentication tokens and credentials from Pow3r Pass API
 */

const POW3R_PASS_BASE = 'https://config.superbots.link/pass';

export interface Pow3rPassToken {
  token: string;
  userId?: string;
  permissions?: string[];
  expiresAt?: number;
}

export class Pow3rPassService {
  private static instance: Pow3rPassService;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  private constructor() {}

  static getInstance(): Pow3rPassService {
    if (!Pow3rPassService.instance) {
      Pow3rPassService.instance = new Pow3rPassService();
    }
    return Pow3rPassService.instance;
  }

  /**
   * Get authentication token with priority chain:
   * 1. Pow3r Pass API
   * 2. Cloudflare KV stored keys (via worker endpoint)
   * 3. Cloudflare AI Gateway token
   * 4. localStorage (fallback)
   */
  async getAuthToken(): Promise<string | null> {
    // Check cache first
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    // Priority 1: Try Pow3r Pass API
    try {
      const response = await fetch(`${POW3R_PASS_BASE}/token`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as { success: boolean; data?: { token: string } };
        if (data.success && data.data?.token) {
          this.cachedToken = data.data.token;
          this.tokenExpiry = Date.now() + 3600000; // 1 hour cache
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('pow3r-auth-token', this.cachedToken);
          }
          
          return this.cachedToken;
        }
      }
    } catch (error) {
      console.warn('Pow3r Pass API unavailable, trying fallbacks:', error);
    }

    // Priority 2: Try Cloudflare KV stored keys (via worker endpoint)
    try {
      const workerUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${workerUrl}/admin/auth/kv-token`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as { success: boolean; token?: string };
        if (data.success && data.token && data.token.length >= 32) {
          this.cachedToken = data.token;
          this.tokenExpiry = Date.now() + 3600000;
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('pow3r-auth-token', this.cachedToken);
          }
          
          return this.cachedToken;
        }
      }
    } catch (error) {
      console.warn('Cloudflare KV token unavailable, trying AI Gateway:', error);
    }

    // Priority 3: Try Cloudflare AI Gateway token
    try {
      const workerUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${workerUrl}/admin/auth/ai-gateway-token`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as { success: boolean; token?: string };
        if (data.success && data.token && data.token.length >= 32) {
          this.cachedToken = data.token;
          this.tokenExpiry = Date.now() + 3600000;
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('pow3r-auth-token', this.cachedToken);
          }
          
          return this.cachedToken;
        }
      }
    } catch (error) {
      console.warn('Cloudflare AI Gateway token unavailable, using localStorage:', error);
    }

    // Priority 4: Fallback to localStorage
    if (typeof window !== 'undefined') {
      const localToken = localStorage.getItem('pow3r-auth-token');
      if (localToken && localToken.length >= 32) {
        this.cachedToken = localToken;
        this.tokenExpiry = Date.now() + 3600000;
        return localToken;
      }
    }

    return null;
  }

  /**
   * Validate token with Pow3r Pass API
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${POW3R_PASS_BASE}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json() as { success: boolean; valid?: boolean };
        return data.success && data.valid === true;
      }
    } catch (error) {
      console.warn('Pow3r Pass validation failed:', error);
      // Fallback: accept if token format is valid
      return token.length >= 32;
    }

    return false;
  }

  /**
   * Set token manually (for testing or manual auth)
   */
  setToken(token: string): void {
    this.cachedToken = token;
    this.tokenExpiry = Date.now() + 3600000;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pow3r-auth-token', token);
    }
  }
}

export const pow3rPassService = Pow3rPassService.getInstance();


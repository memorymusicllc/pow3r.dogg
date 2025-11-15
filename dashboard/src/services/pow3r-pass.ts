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
   * Get authentication token from Pow3r Pass
   * Falls back to localStorage if API unavailable
   */
  async getAuthToken(): Promise<string | null> {
    // Check cache first
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    // Check localStorage
    if (typeof window !== 'undefined') {
      const localToken = localStorage.getItem('pow3r-auth-token');
      if (localToken && localToken.length >= 32) {
        this.cachedToken = localToken;
        this.tokenExpiry = Date.now() + 3600000; // 1 hour cache
        return localToken;
      }
    }

    // Try to fetch from Pow3r Pass API
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
          
          // Store in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('pow3r-auth-token', this.cachedToken);
          }
          
          return this.cachedToken;
        }
      }
    } catch (error) {
      console.warn('Pow3r Pass API unavailable, using localStorage fallback:', error);
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


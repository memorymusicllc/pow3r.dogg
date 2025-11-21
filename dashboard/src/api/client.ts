import { pow3rPassService } from '../services/pow3r-pass';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || 
  (typeof window !== 'undefined' ? window.location.origin : '');

export interface ApiError {
  message: string;
  status: number;
}

export class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private authFailureCount: number = 0;
  private readonly MAX_AUTH_FAILURES = 3;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
    // Get auth token from Pow3r Pass service
    this.initializeAuth();
  }

  private async initializeAuth() {
    if (typeof window !== 'undefined') {
      try {
        this.authToken = await pow3rPassService.getAuthToken();
        // Reset failure count on successful auth
        this.authFailureCount = 0;
      } catch (error) {
        console.warn('Failed to get auth token from Pow3r Pass:', error);
        // Fallback to localStorage
        this.authToken = localStorage.getItem('pow3r-auth-token');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Reset failure count on success (before checking for errors)
    if (response.ok) {
      this.authFailureCount = 0;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const error: ApiError = {
        message: errorText,
        status: response.status,
      };
      
      // Handle 401 Unauthorized - trigger auth check but limit retries
      if (response.status === 401) {
        this.authFailureCount++;
        if (this.authFailureCount >= this.MAX_AUTH_FAILURES) {
          // Stop making requests after too many auth failures
          console.warn('Too many authentication failures. Stopping API requests.');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth-required', { 
              detail: { message: 'Authentication required. Please authenticate via Pow3r Pass.', stopRetries: true }
            }));
          }
          // Don't throw error, return empty response instead to prevent retry loops
          return {} as T;
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-required', { 
            detail: { message: 'Authentication required. Please authenticate via Pow3r Pass.' }
          }));
        }
      }
      
      throw error;
    }

    return response.json() as Promise<T>;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {};

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    // Reset failure count on success (before checking for errors)
    if (response.ok) {
      this.authFailureCount = 0;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const error: ApiError = {
        message: errorText,
        status: response.status,
      };
      
      // Handle 401 Unauthorized - trigger auth check but limit retries
      if (response.status === 401) {
        this.authFailureCount++;
        if (this.authFailureCount >= this.MAX_AUTH_FAILURES) {
          // Stop making requests after too many auth failures
          console.warn('Too many authentication failures. Stopping API requests.');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth-required', { 
              detail: { message: 'Authentication required. Please authenticate via Pow3r Pass.', stopRetries: true }
            }));
          }
          // Don't throw error, return empty response instead to prevent retry loops
          return {} as T;
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-required', { 
            detail: { message: 'Authentication required. Please authenticate via Pow3r Pass.' }
          }));
        }
      }
      
      throw error;
    }

    return response.json() as Promise<T>;
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  setAuthToken(token: string) {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pow3r-auth-token', token);
    }
  }
}

export const apiClient = new ApiClient();

// Export MCP client
export { mcpClient } from './mcp-client';


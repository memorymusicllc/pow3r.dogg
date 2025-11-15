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

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
    // Get auth token from Pow3r Pass service
    this.initializeAuth();
  }

  private async initializeAuth() {
    if (typeof window !== 'undefined') {
      try {
        this.authToken = await pow3rPassService.getAuthToken();
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

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const error: ApiError = {
        message: errorText,
        status: response.status,
      };
      
      // Handle 401 Unauthorized - trigger auth check
      if (response.status === 401) {
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

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const error: ApiError = {
        message: errorText,
        status: response.status,
      };
      
      // Handle 401 Unauthorized - trigger auth check
      if (response.status === 401) {
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

  setAuthToken(token: string) {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pow3r-auth-token', token);
    }
  }
}

export const apiClient = new ApiClient();


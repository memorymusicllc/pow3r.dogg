import { pow3rPassService } from '../services/pow3r-pass';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || 
  (typeof window !== 'undefined' ? window.location.origin : '');

export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  isError?: boolean;
}

export interface MCPToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export class MCPClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
    this.initializeAuth();
  }

  private async initializeAuth() {
    if (typeof window !== 'undefined') {
      try {
        this.authToken = await pow3rPassService.getAuthToken();
      } catch (error) {
        console.warn('Failed to get auth token from Pow3r Pass:', error);
        this.authToken = localStorage.getItem('pow3r-auth-token');
      }
    }
  }

  /**
   * Call an MCP tool
   */
  async callTool<T = unknown>(
    toolName: string,
    args: Record<string, unknown> = {}
  ): Promise<MCPToolResult & { data?: T }> {
    const url = `${this.baseUrl}/mcp/tools/call`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: toolName,
          arguments: args,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth-required', { 
              detail: { message: 'Authentication required. Please authenticate via Pow3r Pass.' }
            }));
          }
        }

        return {
          success: false,
          error: errorText,
          isError: true,
        };
      }

      const result: MCPToolResponse = await response.json();

      if (result.isError) {
        try {
          const errorData = JSON.parse(result.content[0]?.text || '{}');
          return {
            success: false,
            error: errorData.error || 'MCP tool execution failed',
            isError: true,
          };
        } catch {
          return {
            success: false,
            error: result.content[0]?.text || 'MCP tool execution failed',
            isError: true,
          };
        }
      }

      // Parse the result from content[0].text
      try {
        const data = JSON.parse(result.content[0]?.text || '{}');
        return {
          success: true,
          data: data as T,
        };
      } catch {
        // If parsing fails, return the raw text
        return {
          success: true,
          data: result.content[0]?.text as T,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        isError: true,
      };
    }
  }

  /**
   * List available MCP tools
   */
  async listTools(): Promise<Array<{ name: string; description: string; inputSchema: unknown }>> {
    const url = `${this.baseUrl}/mcp/tools/list`;
    const headers: Record<string, string> = {};

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.tools || [];
    } catch (error) {
      console.error('Failed to list MCP tools:', error);
      return [];
    }
  }

  setAuthToken(token: string) {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pow3r-auth-token', token);
    }
  }
}

export const mcpClient = new MCPClient();


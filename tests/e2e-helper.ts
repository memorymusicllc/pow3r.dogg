/**
 * E2E Test Helper Utilities
 * 
 * Provides utilities for E2E tests including error diagnostics
 */

const PROD_URL = 'https://pow3r-defender-production.contact-7d8.workers.dev';

export interface TestError {
  status: number;
  statusText: string;
  body: string;
  headers: Record<string, string>;
}

/**
 * Extract detailed error information from a failed request
 */
export async function extractError(response: Response): Promise<TestError> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let body = '';
  try {
    body = await response.text();
  } catch {
    body = 'Unable to read response body';
  }

  return {
    status: response.status,
    statusText: response.statusText,
    body,
    headers,
  };
}

/**
 * Format error for test output
 */
export function formatError(error: TestError): string {
  let formatted = `Status: ${error.status} ${error.statusText}\n`;
  
  if (error.body) {
    try {
      const json = JSON.parse(error.body);
      formatted += `Error: ${JSON.stringify(json, null, 2)}\n`;
    } catch {
      formatted += `Body: ${error.body.substring(0, 200)}\n`;
    }
  }

  if (error.headers['www-authenticate']) {
    formatted += `WWW-Authenticate: ${error.headers['www-authenticate']}\n`;
  }

  return formatted;
}

/**
 * Check if worker is accessible
 */
export async function checkWorkerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${PROD_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Try to get a valid auth token from worker endpoints
 */
export async function tryGetWorkerAuthToken(): Promise<string | null> {
  // Try KV token endpoint
  try {
    const response = await fetch(`${PROD_URL}/admin/auth/kv-token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json() as { success: boolean; token?: string };
      if (data.success && data.token && data.token.length >= 32) {
        return data.token;
      }
    }
  } catch {
    // Ignore
  }

  // Try AI Gateway token endpoint
  try {
    const response = await fetch(`${PROD_URL}/admin/auth/ai-gateway-token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json() as { success: boolean; token?: string };
      if (data.success && data.token && data.token.length >= 32) {
        return data.token;
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Test authentication with a token
 * Note: This tests against a protected endpoint. If it returns 401, token is invalid.
 * If it returns 200 or other non-401 status, token is accepted (even if endpoint has other errors).
 */
export async function testAuth(token: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`${PROD_URL}/admin/analytics/threat-metrics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // If we get 401, token is definitely invalid
    if (response.status === 401) {
      const error = await extractError(response);
      return { valid: false, error: formatError(error) };
    }
    
    // Any other status (200, 404, 500, etc.) means token was accepted
    // The endpoint might have other issues, but auth passed
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
}


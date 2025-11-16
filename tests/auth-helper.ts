/**
 * Authentication Helper for Tests
 * 
 * Provides auth tokens for Playwright tests
 * Tests MUST use auth, otherwise they will fail
 * 
 * Note: Pow3r Pass itself is open access (no auth required), but this worker
 * requires authentication. This helper gets tokens for authenticating with the worker.
 */

const PROD_URL = 'https://pow3r-defender-production.contact-7d8.workers.dev';
const POW3R_PASS_URL = 'https://config.superbots.link/pass';

/**
 * Get auth token for tests with priority chain:
 * 1. Environment variable POW3R_AUTH_TOKEN
 * 2. Pow3r Pass API
 * 3. Cloudflare KV stored keys (via worker)
 * 4. Cloudflare AI Gateway token (via worker)
 * 5. Generate test token (for CI/local testing - will fail auth)
 */
export async function getAuthToken(): Promise<string> {
  const PROD_URL = 'https://pow3r-defender-production.contact-7d8.workers.dev';

  // Priority 1: Environment variable
  const envToken = process.env.POW3R_AUTH_TOKEN;
  if (envToken && envToken.length >= 32) {
    return envToken;
  }

  // Priority 2: Pow3r Pass API
  // Note: Pow3r Pass /token endpoint doesn't exist (404) - Pow3r Pass uses open access
  // This is for future use if Pow3r Pass adds token-based auth
  try {
    // Try health check first to verify connection
    const healthResponse = await fetch(`${POW3R_PASS_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header - Pow3r Pass is open access
      },
    });

    if (healthResponse.ok) {
      // Health check passed, try to get token (endpoint doesn't exist, but we try anyway)
      const tokenResponse = await fetch(`${POW3R_PASS_URL}/token`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header - Pow3r Pass is open access
        },
      });

      if (tokenResponse.ok) {
        const data = await tokenResponse.json() as { success: boolean; data?: { token: string } };
        if (data.success && data.data?.token && data.data.token.length >= 32) {
          console.log('✅ Pow3r Pass token retrieved successfully');
          return data.data.token;
        }
      } else if (tokenResponse.status === 404) {
        // Token endpoint not available, but Pow3r Pass is connected
        // Use credentials endpoint as alternative or fall through to other methods
        console.log('ℹ️  Pow3r Pass connected (token endpoint not available, using fallbacks)');
      } else {
        console.warn(`⚠️  Pow3r Pass token endpoint returned ${tokenResponse.status}`);
      }
    } else {
      console.warn(`⚠️  Pow3r Pass health check returned ${healthResponse.status}`);
    }
  } catch (error) {
    console.warn('⚠️  Pow3r Pass API unavailable, trying fallbacks:', error instanceof Error ? error.message : String(error));
  }

  // Priority 3: Cloudflare KV stored keys
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
  } catch (error) {
    console.warn('Cloudflare KV token unavailable, trying AI Gateway:', error);
  }

  // Priority 4: Cloudflare AI Gateway token
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
  } catch (error) {
    console.warn('Cloudflare AI Gateway token unavailable, generating test token:', error);
  }

  // Priority 5: Generate test token (will fail actual auth but pass format validation)
  const testToken = `test-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
  
  if (testToken.length < 32) {
    throw new Error('Failed to generate valid test token. Set POW3R_AUTH_TOKEN environment variable or ensure Pow3r Pass/KV/AI Gateway tokens are available.');
  }

  console.warn('⚠️  Using generated test token. This may fail authentication. Set POW3R_AUTH_TOKEN or configure Pow3r Pass/KV/AI Gateway.');
  return testToken;
}

/**
 * Create authenticated request headers (synchronous version for tests)
 */
export function getAuthHeaders(token?: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token || 'test-token'}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Set auth token in page context (for browser tests)
 */
export async function setAuthTokenInPage(page: any, token?: string, baseUrl?: string): Promise<void> {
  const authToken = token || await getAuthToken();
  // Navigate to the actual domain first to get localStorage access
  const url = baseUrl || 'https://pow3r-defender-production.contact-7d8.workers.dev';
  await page.goto(`${url}/admin`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t: string) => {
    localStorage.setItem('pow3r-auth-token', t);
  }, authToken);
}


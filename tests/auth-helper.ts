/**
 * Authentication Helper for Tests
 * 
 * Provides auth tokens for Playwright tests
 * Tests MUST use auth, otherwise they will fail
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
  try {
    const response = await fetch(`${POW3R_PASS_URL}/token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json() as { success: boolean; data?: { token: string } };
      if (data.success && data.data?.token && data.data.token.length >= 32) {
        return data.data.token;
      }
    }
  } catch (error) {
    console.warn('Pow3r Pass API unavailable, trying fallbacks:', error);
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
 * Create authenticated request headers
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
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


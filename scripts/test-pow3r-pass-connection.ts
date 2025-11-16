/**
 * Test Pow3r Pass Connection
 * 
 * Verifies connection to Pow3r Pass API
 * 
 * Security Model: Pow3r Pass uses open access - no authentication required.
 * Security is enforced server-side through CORS, rate limiting, IP allowlists, and audit logging.
 * The /token endpoint doesn't exist (returns 404) - this is intentional.
 * 
 * See: docs/POW3R_PASS_SECURITY_MODEL.md
 */

const POW3R_PASS_BASE = 'https://config.superbots.link/pass';

interface Pow3rPassResponse {
  success: boolean;
  data?: {
    token?: string;
    credentials?: Record<string, string>;
    provider?: string;
    value?: string;
  };
  error?: string;
}

/**
 * Test Pow3r Pass health endpoint
 */
async function testHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${POW3R_PASS_BASE}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header - Pow3r Pass is open access
      },
    });

    if (response.ok) {
      const data = await response.json() as Pow3rPassResponse;
      console.log('✅ Pow3r Pass Health Check:', data);
      return data.success === true;
    } else {
      console.error('❌ Pow3r Pass Health Check Failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Pow3r Pass Health Check Error:', error);
    return false;
  }
}

/**
 * Test getting authentication token
 * Note: This endpoint doesn't exist (returns 404) - Pow3r Pass uses open access model.
 * This test verifies the endpoint status for documentation purposes.
 */
async function testGetToken(): Promise<string | null> {
  try {
    const response = await fetch(`${POW3R_PASS_BASE}/token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header - Pow3r Pass is open access
      },
    });

    if (response.ok) {
      const data = await response.json() as Pow3rPassResponse;
      if (data.success && data.data?.token) {
        console.log('✅ Pow3r Pass Token Retrieved:', data.data.token.substring(0, 20) + '...');
        return data.data.token;
      } else {
        console.warn('⚠️  Pow3r Pass Token Response:', data);
        return null;
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Pow3r Pass Token Request Failed:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Pow3r Pass Token Request Error:', error);
    return null;
  }
}

/**
 * Test getting credentials for a provider
 */
async function testGetCredentials(provider: string): Promise<boolean> {
  try {
    const response = await fetch(`${POW3R_PASS_BASE}/credentials/${provider}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header - Pow3r Pass is open access
      },
    });

    if (response.ok) {
      const data = await response.json() as Pow3rPassResponse;
      if (data.success && data.data?.value) {
        console.log(`✅ Pow3r Pass Credentials for ${provider}:`, data.data.value.substring(0, 20) + '...');
        return true;
      } else {
        console.warn(`⚠️  Pow3r Pass Credentials for ${provider}:`, data);
        return false;
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ Pow3r Pass Credentials Request Failed for ${provider}:`, response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error(`❌ Pow3r Pass Credentials Request Error for ${provider}:`, error);
    return false;
  }
}

/**
 * Test getting all credentials
 */
async function testGetAllCredentials(): Promise<boolean> {
  try {
    const response = await fetch(`${POW3R_PASS_BASE}/credentials`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header - Pow3r Pass is open access
      },
    });

    if (response.ok) {
      const data = await response.json() as Pow3rPassResponse;
      if (data.success && data.data?.credentials) {
        const providers = Object.keys(data.data.credentials);
        console.log(`✅ Pow3r Pass All Credentials: ${providers.length} providers found`);
        console.log('   Providers:', providers.join(', '));
        return true;
      } else {
        console.warn('⚠️  Pow3r Pass All Credentials Response:', data);
        return false;
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Pow3r Pass All Credentials Request Failed:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Pow3r Pass All Credentials Request Error:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🔍 Testing Pow3r Pass Connection...\n');
  console.log(`📍 Base URL: ${POW3R_PASS_BASE}\n`);

  // Test 1: Health Check
  console.log('1️⃣  Testing Health Endpoint...');
  const healthOk = await testHealth();
  console.log('');

  // Test 2: Get Token
  console.log('2️⃣  Testing Token Endpoint...');
  const token = await testGetToken();
  console.log('');

  // Test 3: Get Credentials (test with common providers)
  console.log('3️⃣  Testing Credentials Endpoints...');
  const testProviders = ['gemini', 'openai', 'replicate', 'anthropic'];
  let credentialsOk = 0;
  for (const provider of testProviders) {
    if (await testGetCredentials(provider)) {
      credentialsOk++;
    }
  }
  console.log('');

  // Test 4: Get All Credentials
  console.log('4️⃣  Testing All Credentials Endpoint...');
  const allCredentialsOk = await testGetAllCredentials();
  console.log('');

  // Summary
  console.log('📊 Test Summary:');
  console.log(`   Health Check: ${healthOk ? '✅' : '❌'}`);
  console.log(`   Token Retrieval: ${token ? '✅' : '❌'}`);
  console.log(`   Credentials (${credentialsOk}/${testProviders.length}): ${credentialsOk > 0 ? '✅' : '❌'}`);
  console.log(`   All Credentials: ${allCredentialsOk ? '✅' : '❌'}`);
  console.log('');

  // Note: Token endpoint doesn't exist (404) - this is expected
  // Pow3r Pass uses open access model - no token needed
  if (healthOk && (credentialsOk > 0 || allCredentialsOk)) {
    console.log('✅ Pow3r Pass Connection: SUCCESS');
    console.log('\n📝 Security Model: Open Access (no authentication required)');
    console.log('   - Security enforced server-side (CORS, rate limiting, IP allowlists)');
    console.log('   - /token endpoint not implemented (returns 404)');
    console.log('   - Credentials accessible without Authorization header');
    console.log('\n💡 For E2E tests, use worker authentication token:');
    console.log('   export POW3R_AUTH_TOKEN="your-worker-auth-token"');
    process.exit(0);
  } else {
    console.log('❌ Pow3r Pass Connection: FAILED');
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Verify Pow3r Pass is deployed at https://config.superbots.link/pass');
    console.log('   2. Check network connectivity');
    console.log('   3. Verify CORS is configured correctly');
    console.log('   4. Check Pow3r Pass logs for errors');
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});


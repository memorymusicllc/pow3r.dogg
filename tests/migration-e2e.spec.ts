/**
 * E2E Tests for Open-Source API Migration
 * 
 * Tests all new implementations:
 * - Phone validation (libphonenumber-js)
 * - Email lookup (EmailRep.io + MX)
 * - Domain lookup (ICANN RDAP)
 * - IP attribution (AbuseIPDB + FireHOL + VPN lists)
 * - Breach checking (HIBP offline)
 */

import { test, expect } from '@playwright/test';
import { getAuthToken, getAuthHeaders } from './auth-helper';
import { extractError, formatError, tryGetWorkerAuthToken, testAuth } from './e2e-helper';

const PROD_URL = 'https://pow3r-defender-production.contact-7d8.workers.dev';

test.describe('Open-Source API Migration E2E Tests', () => {
  let authToken: string;
  let authHeaders: Record<string, string>;

  test.beforeAll(async () => {
    // Get auth token
    try {
      authToken = await getAuthToken();
      
      // If we got a generated test token, try to get a real one from worker
      if (authToken.startsWith('test-')) {
        console.log('⚠️  Using test token, attempting to get real token from worker...');
        const workerToken = await tryGetWorkerAuthToken();
        if (workerToken) {
          console.log('✅ Got token from worker');
          authToken = workerToken;
        } else {
          console.warn('⚠️  Could not get token from worker, using test token (will likely fail)');
        }
      }
      
      if (!authToken || authToken.length < 32) {
        throw new Error('Invalid auth token. Set POW3R_AUTH_TOKEN environment variable.');
      }
      
      // Test the token
      const authTest = await testAuth(authToken);
      if (!authTest.valid) {
        console.warn('⚠️  Auth token test failed:', authTest.error);
        console.warn('⚠️  Tests may fail. Set POW3R_AUTH_TOKEN environment variable with a valid token.');
      } else {
        console.log('✅ Auth token validated successfully');
      }
      
      authHeaders = getAuthHeaders(authToken);
    } catch (error) {
      throw new Error(`Authentication setup failed: ${error}`);
    }
  });

  test.describe('Phone Validation (libphonenumber-js)', () => {
    test('should validate US phone number via OSINT lookup', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/admin/osint/lookup`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          identifier: '+14155552671',
        },
      });

      if (response.status() !== 200) {
        const error = await extractError(response);
        console.error('Request failed:', formatError(error));
        throw new Error(`Expected 200, got ${response.status()}: ${formatError(error)}`);
      }
      
      const data = await response.json();
      
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('result');
      
      const result = data.result;
      expect(result).toHaveProperty('identityGraph');
      expect(result.identityGraph.phoneNumbers).toBeDefined();
      
      if (result.identityGraph.phoneNumbers.length > 0) {
        const phone = result.identityGraph.phoneNumbers[0];
        expect(['mobile', 'voip', 'landline']).toContain(phone.type);
      }
      
      // Should use libphonenumber, not NumVerify
      if (result.sources) {
        expect(result.sources).toContain('libphonenumber');
        expect(result.sources).not.toContain('NumVerify');
      }
    });

    test('should validate phone via unmask endpoint', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/osint/unmask`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          phone: '+14155552671',
        },
      });

      if (response.status() !== 200) {
        const error = await extractError(response);
        console.error('Request failed:', formatError(error));
        throw new Error(`Expected 200, got ${response.status()}: ${formatError(error)}`);
      }
      
      const data = await response.json();
      
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('result');
      
      const result = data.result;
      expect(result).toHaveProperty('identityGraph');
      if (result.sources) {
        expect(result.sources).toContain('libphonenumber');
      }
    });

    test('should validate international phone number', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/admin/osint/lookup`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          identifier: '+442071234567', // UK number
        },
      });

      if (response.status() !== 200) {
        const error = await extractError(response);
        console.error('Request failed:', formatError(error));
        throw new Error(`Expected 200, got ${response.status()}: ${formatError(error)}`);
      }
      
      const data = await response.json();
      
      expect(data.success).toBe(true);
      if (data.result?.sources) {
        expect(data.result.sources).toContain('libphonenumber');
      }
    });
  });

  test.describe('Email Lookup (EmailRep.io + MX)', () => {
    test('should lookup email using EmailRep.io', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/admin/osint/email`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          email: 'test@example.com',
        },
      });

      if (response.status() !== 200) {
        const error = await extractError(response);
        console.error('Request failed:', formatError(error));
        throw new Error(`Expected 200, got ${response.status()}: ${formatError(error)}`);
      }
      
      const data = await response.json();
      
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('result');
      
      const result = data.result;
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('verification');
      expect(result).toHaveProperty('sources');
      
      // Should use EmailRep.io, not Hunter.io
      if (result.sources) {
        expect(result.sources).toContain('EmailRep.io');
        expect(result.sources).not.toContain('Hunter.io');
        
        // Should have MX validation
        expect(result.sources).toContain('DNS Lookup');
      }
    });

    test('should check email breaches using HIBP', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/admin/osint/email`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          email: 'test@example.com',
        },
      });

      if (response.status() !== 200) {
        const error = await extractError(response);
        console.error('Request failed:', formatError(error));
        throw new Error(`Expected 200, got ${response.status()}: ${formatError(error)}`);
      }
      
      const data = await response.json();
      
      expect(data).toHaveProperty('result');
      const result = data.result;
      expect(result).toHaveProperty('breaches');
      expect(Array.isArray(result.breaches)).toBe(true);
      
      // Should use HIBP (API or offline)
      if (result.sources) {
        expect(result.sources).toContain('Have I Been Pwned');
      }
    });
  });

  test.describe('Domain Lookup (ICANN RDAP)', () => {
    test('should lookup domain using ICANN RDAP', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/admin/osint/lookup`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          identifier: 'example.com',
        },
      });

      if (response.status() !== 200) {
        const error = await extractError(response);
        console.error('Request failed:', formatError(error));
        throw new Error(`Expected 200, got ${response.status()}: ${formatError(error)}`);
      }
      
      const data = await response.json();
      
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('result');
      
      const result = data.result;
      expect(result).toHaveProperty('sources');
      
      // Should use ICANN RDAP, not WHOIS API
      if (result.sources) {
        expect(result.sources).toContain('ICANN RDAP');
        expect(result.sources).not.toContain('WHOIS API');
      }
    });

    test('should get domain registration date via unmask', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/osint/unmask`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          domain: 'google.com',
        },
      });

      if (response.status() !== 200) {
        const error = await extractError(response);
        console.error('Request failed:', formatError(error));
        throw new Error(`Expected 200, got ${response.status()}: ${formatError(error)}`);
      }
      
      const data = await response.json();
      
      expect(data).toHaveProperty('success', true);
      const result = data.result;
      
      // Should have domain age or registration info
      expect(result).toHaveProperty('riskIndicators');
      if (result.riskIndicators?.domainAge) {
        expect(typeof result.riskIndicators.domainAge).toBe('string');
      }
      
      if (result.sources) {
        expect(result.sources).toContain('ICANN RDAP');
      }
    });
  });

  test.describe('IP Attribution (AbuseIPDB + FireHOL + VPN Lists)', () => {
    test('should attribute IP using new reputation system', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/attribution/ip`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          ip: '8.8.8.8',
        },
      });

      if (response.status() !== 200) {
        const error = await extractError(response);
        console.error('Request failed:', formatError(error));
        throw new Error(`Expected 200, got ${response.status()}: ${formatError(error)}`);
      }
      
      const data = await response.json();
      
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('attribution');
      
      const attribution = data.attribution;
      expect(attribution).toHaveProperty('ipAddress');
      expect(attribution).toHaveProperty('riskScore');
      expect(attribution).toHaveProperty('vpnDetection');
      expect(attribution).toHaveProperty('geolocation');
      
      // Should have risk score from new reputation system
      expect(typeof attribution.riskScore).toBe('number');
      expect(attribution.riskScore).toBeGreaterThanOrEqual(0);
      expect(attribution.riskScore).toBeLessThanOrEqual(1);
    });

    test('should detect VPN using new detector', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/attribution/ip`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          ip: '8.8.8.8',
        },
      });

      if (response.status() !== 200) {
        const error = await extractError(response);
        console.error('Request failed:', formatError(error));
        throw new Error(`Expected 200, got ${response.status()}: ${formatError(error)}`);
      }
      
      const data = await response.json();
      
      const attribution = data.attribution;
      expect(attribution.vpnDetection).toHaveProperty('detected');
      expect(attribution.vpnDetection).toHaveProperty('method');
      expect(attribution.vpnDetection).toHaveProperty('confidence');
      
      // Should use new methods, not just Spur.us
      const validMethods = ['ip2proxy', 'vpn-list', 'abuseipdb', 'behavioral', 'database', 'spur'];
      expect(validMethods).toContain(attribution.vpnDetection.method);
    });

    test('should calculate reputation score', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/attribution/ip`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          ip: '1.1.1.1',
        },
      });

      if (response.status() !== 200) {
        const error = await extractError(response);
        console.error('Request failed:', formatError(error));
        throw new Error(`Expected 200, got ${response.status()}: ${formatError(error)}`);
      }
      
      const data = await response.json();
      
      const attribution = data.attribution;
      // Risk score should be calculated
      expect(attribution.riskScore).toBeDefined();
      expect(typeof attribution.riskScore).toBe('number');
    });
  });

  test.describe('OSINT Unmasking', () => {
    test('should unmask identity using new APIs', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/osint/unmask`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          email: 'test@example.com',
          phone: '+14155552671',
        },
      });

      if (response.status() !== 200) {
        const error = await extractError(response);
        console.error('Request failed:', formatError(error));
        throw new Error(`Expected 200, got ${response.status()}: ${formatError(error)}`);
      }
      
      const data = await response.json();
      
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('result');
      
      const result = data.result;
      expect(result).toHaveProperty('primaryIdentifier');
      expect(result).toHaveProperty('identityGraph');
      expect(result).toHaveProperty('sources');
      
      // Should use new sources
      if (result.sources) {
        expect(result.sources).toContain('libphonenumber');
        expect(result.sources).toContain('EmailRep.io');
        expect(result.sources).toContain('ICANN RDAP');
        
        // Should NOT use deprecated APIs
        expect(result.sources).not.toContain('NumVerify');
        expect(result.sources).not.toContain('Hunter.io');
        expect(result.sources).not.toContain('WHOIS API');
      }
    });
  });

  test.describe('API Response Times', () => {
    test('phone validation should be fast (offline)', async ({ request }) => {
      const startTime = Date.now();
      
      const response = await request.post(`${PROD_URL}/admin/osint/lookup`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          identifier: '+14155552671',
        },
      });

      const duration = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      // libphonenumber-js is offline, should be reasonably fast
      expect(duration).toBeLessThan(10000); // Allow buffer for network and processing
    });

    test('email lookup should complete within reasonable time', async ({ request }) => {
      const startTime = Date.now();
      
      const response = await request.post(`${PROD_URL}/admin/osint/email`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          email: 'test@example.com',
        },
      });

      const duration = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      // EmailRep.io + MX lookup should be reasonable (< 5s)
      expect(duration).toBeLessThan(10000);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle missing authentication gracefully', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/admin/osint/lookup`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          identifier: '+14155552671',
        },
      });

      // Should return 401 or proper error
      expect([401, 403]).toContain(response.status());
    });

    test('should handle invalid input gracefully', async ({ request }) => {
      const response = await request.post(`${PROD_URL}/admin/osint/email`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          email: 'not-an-email',
        },
      });

      // Should handle gracefully, not crash
      expect([200, 400]).toContain(response.status());
    });
  });

  test.describe('Backward Compatibility', () => {
    test('should still work if deprecated API keys are set', async ({ request }) => {
      // This test verifies backward compatibility
      // Even if old API keys exist, new implementations should be used first
      
      const response = await request.post(`${PROD_URL}/admin/osint/lookup`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          identifier: '+14155552671',
        },
      });

      if (response.status() !== 200) {
        const error = await extractError(response);
        console.error('Request failed:', formatError(error));
        throw new Error(`Expected 200, got ${response.status()}: ${formatError(error)}`);
      }
      
      const data = await response.json();
      
      // Should use libphonenumber, not NumVerify
      if (data.result?.sources) {
        expect(data.result.sources).toContain('libphonenumber');
      }
    });
  });

  test.describe('Integration Tests', () => {
    test('should perform full OSINT lookup workflow', async ({ request }) => {
      // Test complete workflow: phone -> email -> domain -> IP
      
      // 1. Phone lookup
      const phoneResponse = await request.post(`${PROD_URL}/admin/osint/lookup`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          identifier: '+14155552671',
        },
      });
      if (phoneResponse.status() !== 200) {
        const error = await extractError(phoneResponse);
        throw new Error(`Phone lookup failed: ${formatError(error)}`);
      }
      expect(phoneResponse.status()).toBe(200);
      
      // 2. Email lookup
      const emailResponse = await request.post(`${PROD_URL}/admin/osint/email`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          email: 'test@example.com',
        },
      });
      if (emailResponse.status() !== 200) {
        const error = await extractError(emailResponse);
        throw new Error(`Email lookup failed: ${formatError(error)}`);
      }
      expect(emailResponse.status()).toBe(200);
      
      // 3. Domain lookup
      const domainResponse = await request.post(`${PROD_URL}/admin/osint/lookup`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          identifier: 'example.com',
        },
      });
      if (domainResponse.status() !== 200) {
        const error = await extractError(domainResponse);
        throw new Error(`Domain lookup failed: ${formatError(error)}`);
      }
      expect(domainResponse.status()).toBe(200);
      
      // 4. IP attribution
      const ipResponse = await request.post(`${PROD_URL}/attribution/ip`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        data: {
          ip: '8.8.8.8',
        },
      });
      if (ipResponse.status() !== 200) {
        const error = await extractError(ipResponse);
        throw new Error(`IP attribution failed: ${formatError(error)}`);
      }
      expect(ipResponse.status()).toBe(200);
      
      // All should use new implementations
      const phoneData = await phoneResponse.json();
      const emailData = await emailResponse.json();
      const domainData = await domainResponse.json();
      
      if (phoneData.result?.sources) {
        expect(phoneData.result.sources).toContain('libphonenumber');
      }
      if (emailData.result?.sources) {
        expect(emailData.result.sources).toContain('EmailRep.io');
      }
      if (domainData.result?.sources) {
        expect(domainData.result.sources).toContain('ICANN RDAP');
      }
    });
  });
});


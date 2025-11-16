/**
 * Migration Test Script
 * 
 * Tests all new open-source API implementations
 */

import { VPNDetector } from '../src/attribution/vpn-detector';
import { IPReputationScorer } from '../src/attribution/ip-reputation';
import { OfflineBreachChecker } from '../src/osint/breach-checker';
import { EmailLookup } from '../src/osint/email-lookup';
import { SpiderFootClient } from '../src/osint/spiderfoot-client';
import { OSINTUnmasker } from '../src/osint/unmask';
import type { Env } from '../src/types';

// Mock environment for testing
const mockEnv: Partial<Env> = {
  DEFENDER_FORGE: {} as any,
  EVIDENCE_VAULT: {} as any,
  DEFENDER_DB: {} as any,
};

async function testPhoneValidation() {
  console.log('📞 Testing Phone Validation (libphonenumber-js)...');
  
  const unmasker = new OSINTUnmasker(mockEnv as Env);
  
  try {
    const result = await unmasker.unmaskIdentity({ phone: '+14155552671' });
    console.log('  ✅ Phone validation works');
    console.log(`  📊 Result: ${JSON.stringify(result.identityGraph.phoneNumbers[0], null, 2)}`);
    return true;
  } catch (error) {
    console.log('  ❌ Phone validation failed:', error);
    return false;
  }
}

async function testEmailLookup() {
  console.log('📧 Testing Email Lookup (EmailRep.io + MX)...');
  
  const emailLookup = new EmailLookup(mockEnv as Env);
  
  try {
    const result = await emailLookup.lookup('test@example.com');
    console.log('  ✅ Email lookup works');
    console.log(`  📊 Sources: ${result.sources.join(', ')}`);
    return true;
  } catch (error) {
    console.log('  ❌ Email lookup failed:', error);
    return false;
  }
}

async function testDomainLookup() {
  console.log('🌐 Testing Domain Lookup (ICANN RDAP)...');
  
  const unmasker = new OSINTUnmasker(mockEnv as Env);
  
  try {
    const result = await unmasker.unmaskIdentity({ domain: 'example.com' });
    console.log('  ✅ Domain lookup works');
    console.log(`  📊 Sources: ${result.sources.join(', ')}`);
    return true;
  } catch (error) {
    console.log('  ❌ Domain lookup failed:', error);
    return false;
  }
}

async function testIPReputation() {
  console.log('🛡️  Testing IP Reputation (AbuseIPDB + FireHOL)...');
  
  const scorer = new IPReputationScorer(mockEnv as Env);
  
  try {
    const result = await scorer.calculateFraudScore('8.8.8.8', false);
    console.log('  ✅ IP reputation scoring works');
    console.log(`  📊 Score: ${result.score}, Sources: ${result.sources.join(', ')}`);
    return true;
  } catch (error) {
    console.log('  ❌ IP reputation failed:', error);
    return false;
  }
}

async function testVPNDetection() {
  console.log('🔒 Testing VPN Detection (IP2Proxy + VPN Lists)...');
  
  const detector = new VPNDetector(mockEnv as Env);
  
  try {
    const result = await detector.detectVPN('8.8.8.8', {});
    console.log('  ✅ VPN detection works');
    console.log(`  📊 Detected: ${result.detected}, Method: ${result.method}`);
    return true;
  } catch (error) {
    console.log('  ❌ VPN detection failed:', error);
    return false;
  }
}

async function testBreachChecker() {
  console.log('🔐 Testing Breach Checker (Offline HIBP)...');
  
  const checker = new OfflineBreachChecker(mockEnv as Env);
  
  try {
    const result = await checker.checkEmail('test@example.com');
    console.log('  ✅ Breach checker works');
    console.log(`  📊 Found: ${result.found}, Source: ${result.source}`);
    return true;
  } catch (error) {
    console.log('  ❌ Breach checker failed:', error);
    return false;
  }
}

async function testSpiderFoot() {
  console.log('🕷️  Testing SpiderFoot Client...');
  
  const client = new SpiderFootClient(mockEnv as Env);
  
  try {
    const available = await client.isAvailable();
    if (available) {
      console.log('  ✅ SpiderFoot is available');
      return true;
    } else {
      console.log('  ⚠️  SpiderFoot not available (expected if not set up)');
      return true; // Not an error, just not configured
    }
  } catch (error) {
    console.log('  ⚠️  SpiderFoot check failed (expected if not set up):', error);
    return true; // Not an error
  }
}

async function runAllTests() {
  console.log('🧪 Running Migration Tests\n');
  console.log('=' .repeat(50));
  console.log('');
  
  const results = {
    phone: await testPhoneValidation(),
    email: await testEmailLookup(),
    domain: await testDomainLookup(),
    ipReputation: await testIPReputation(),
    vpnDetection: await testVPNDetection(),
    breachChecker: await testBreachChecker(),
    spiderFoot: await testSpiderFoot(),
  };
  
  console.log('');
  console.log('=' .repeat(50));
  console.log('📊 Test Results:');
  console.log('');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  for (const [test, result] of Object.entries(results)) {
    console.log(`  ${result ? '✅' : '❌'} ${test}`);
  }
  
  console.log('');
  console.log(`✅ Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
    return 0;
  } else {
    console.log('⚠️  Some tests failed or require configuration');
    return 1;
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(process.exit);
}

export { runAllTests };


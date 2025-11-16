# E2E Test Summary - Open-Source API Migration

## Overview

Comprehensive end-to-end tests for all open-source API migration implementations.

## Test Suite

**File**: `tests/migration-e2e.spec.ts`  
**Total Tests**: 17 test cases  
**Coverage**: All migration phases (1, 2, 3)

---

## Test Categories

### 1. Phone Validation (libphonenumber-js) - 3 tests
- ✅ US phone number validation via OSINT lookup
- ✅ Phone validation via unmask endpoint
- ✅ International phone number validation

**Verifies**:
- Uses `libphonenumber-js` (offline)
- Does NOT use `NumVerify` API
- Handles international numbers correctly

### 2. Email Lookup (EmailRep.io + MX) - 2 tests
- ✅ Email lookup using EmailRep.io
- ✅ Email breach checking using HIBP

**Verifies**:
- Uses `EmailRep.io` (free, no API key)
- Uses MX record validation (DNS lookup)
- Does NOT use `Hunter.io` API
- Integrates HIBP breach checking

### 3. Domain Lookup (ICANN RDAP) - 2 tests
- ✅ Domain lookup using ICANN RDAP
- ✅ Domain registration date retrieval

**Verifies**:
- Uses `ICANN RDAP` (free, unlimited)
- Does NOT use `WHOIS API`
- Retrieves domain age/registration info

### 4. IP Attribution (AbuseIPDB + FireHOL + VPN Lists) - 3 tests
- ✅ IP attribution using new reputation system
- ✅ VPN detection using new detector
- ✅ Reputation score calculation

**Verifies**:
- Uses `AbuseIPDB` + `FireHOL` blocklists
- Uses `IP2Proxy LITE` + VPN lists
- Does NOT use `IP Quality Score` or `Spur.us` (unless fallback)
- Calculates risk scores correctly

### 5. OSINT Unmasking - 1 test
- ✅ Full identity unmasking using new APIs

**Verifies**:
- Uses all new implementations
- Does NOT use deprecated APIs
- Returns complete identity graph

### 6. Performance Tests - 2 tests
- ✅ Phone validation speed (offline, should be fast)
- ✅ Email lookup completion time

**Verifies**:
- Response times are acceptable
- Offline operations are fast

### 7. Error Handling - 2 tests
- ✅ Missing authentication handling
- ✅ Invalid input handling

**Verifies**:
- Proper error responses
- Graceful failure handling

### 8. Backward Compatibility - 1 test
- ✅ Works even if deprecated API keys are set

**Verifies**:
- New implementations take priority
- Backward compatibility maintained

### 9. Integration Tests - 1 test
- ✅ Complete OSINT workflow (phone → email → domain → IP)

**Verifies**:
- All endpoints work together
- End-to-end workflow functions correctly

---

## Running Tests

### Prerequisites

1. **Set Authentication Token**:
   ```bash
   export POW3R_AUTH_TOKEN="your-token-here"
   ```

2. **Install Dependencies** (if not already):
   ```bash
   npm install
   ```

### Run All Migration Tests

```bash
npm run test:e2e -- tests/migration-e2e.spec.ts
```

### Run Specific Test Category

```bash
# Phone validation tests only
npx playwright test tests/migration-e2e.spec.ts -g "Phone Validation"

# Email lookup tests only
npx playwright test tests/migration-e2e.spec.ts -g "Email Lookup"

# IP attribution tests only
npx playwright test tests/migration-e2e.spec.ts -g "IP Attribution"
```

### Debug Mode

```bash
# Run with UI for debugging
npx playwright test tests/migration-e2e.spec.ts --ui

# Run with trace
npx playwright test tests/migration-e2e.spec.ts --trace on
```

---

## Expected Results

### Success Criteria

✅ **All tests pass** with valid authentication  
✅ **Response times** < 10 seconds  
✅ **Sources verified** (new APIs used, deprecated APIs not used)  
✅ **Data structures** match expected format  
✅ **Error handling** works correctly  

### Test Assertions

Each test verifies:
1. **HTTP Status**: 200 for successful requests
2. **Response Structure**: Correct JSON format
3. **Source Verification**: New APIs in sources array
4. **Deprecated API Absence**: Old APIs NOT in sources array
5. **Data Validity**: Expected fields present and valid

---

## Common Issues & Solutions

### Issue: Authentication Failures (401)

**Solution**:
```bash
# Set environment variable
export POW3R_AUTH_TOKEN="your-actual-token"

# Or use Pow3r Pass API
# Tests will automatically fetch from https://config.superbots.link/pass
```

### Issue: Timeout Errors

**Solution**:
- Check network connectivity
- Verify API endpoints are accessible
- Increase timeout in `playwright.config.ts`

### Issue: Source Verification Failures

**Solution**:
- Verify new implementations are deployed
- Check that code changes are in production
- Review response sources array

### Issue: Test Token Warnings

**Solution**:
- Set `POW3R_AUTH_TOKEN` environment variable
- Or ensure Pow3r Pass/KV/AI Gateway tokens are available
- Generated test tokens will fail actual authentication

---

## Test Results Interpretation

### Passing Tests ✅
- All assertions pass
- Response times acceptable
- Sources verified correctly
- No deprecated APIs used

### Failing Tests ❌
1. **Check authentication first** (most common issue)
2. Verify API endpoints are deployed
3. Review error messages in test output
4. Check network connectivity
5. Verify test data (phone numbers, emails, domains, IPs)

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install
      - run: npm run test:e2e -- tests/migration-e2e.spec.ts
        env:
          POW3R_AUTH_TOKEN: ${{ secrets.POW3R_AUTH_TOKEN }}
```

---

## Maintenance

### Adding New Tests

1. Add to appropriate `test.describe` block
2. Use correct endpoint paths (check `src/index-admin-handler.ts`)
3. Verify response structure matches implementation
4. Test both success and error cases

### Updating Tests

- When API responses change → update assertions
- When new endpoints added → add corresponding tests
- When deprecated APIs removed → update source verification

---

## Test Coverage Matrix

| Feature | Endpoint | New API | Deprecated API | Tests |
|---------|----------|---------|---------------|-------|
| Phone Validation | `/admin/osint/lookup` | libphonenumber-js | NumVerify | 3 |
| Email Lookup | `/admin/osint/email` | EmailRep.io + MX | Hunter.io | 2 |
| Domain Lookup | `/admin/osint/lookup` | ICANN RDAP | WHOIS API | 2 |
| IP Attribution | `/attribution/ip` | AbuseIPDB + FireHOL | IPQS | 3 |
| VPN Detection | `/attribution/ip` | IP2Proxy + VPN Lists | Spur.us | 3 |
| OSINT Unmask | `/osint/unmask` | All new APIs | All old APIs | 1 |
| Performance | Various | N/A | N/A | 2 |
| Error Handling | Various | N/A | N/A | 2 |
| Integration | Multiple | All new APIs | All old APIs | 1 |

**Total**: 17 test cases covering all migration implementations

---

## Next Steps

1. ✅ Set `POW3R_AUTH_TOKEN` environment variable
2. ✅ Run tests: `npm run test:e2e -- tests/migration-e2e.spec.ts`
3. ✅ Review test results
4. ✅ Fix any failing tests
5. ✅ Add to CI/CD pipeline

---

**Status**: ✅ **E2E Tests Ready**

All test cases are implemented and ready to run. Set authentication token and execute tests to verify migration success.


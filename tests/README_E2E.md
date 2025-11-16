# E2E Testing Guide for Migration

## Prerequisites

### Authentication Setup

E2E tests require authentication. Set one of the following:

1. **Environment Variable** (Recommended for CI/CD):
   ```bash
   export POW3R_AUTH_TOKEN="your-token-here"
   ```

2. **Pow3r Pass API** (if available):
   - Tests will automatically fetch token from `https://config.superbots.link/pass`

3. **Cloudflare KV** (fallback):
   - Token stored in KV namespace

4. **Cloudflare AI Gateway** (fallback):
   - Token from environment

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run migration-specific tests
npm run test:e2e -- tests/migration-e2e.spec.ts

# Run with UI (debugging)
npx playwright test tests/migration-e2e.spec.ts --ui

# Run specific test
npx playwright test tests/migration-e2e.spec.ts -g "phone validation"
```

## Test Coverage

### Phone Validation (libphonenumber-js)
- ✅ US phone number validation
- ✅ International phone number validation
- ✅ Invalid phone number handling
- ✅ Source verification (libphonenumber, not NumVerify)

### Email Lookup (EmailRep.io + MX)
- ✅ EmailRep.io integration
- ✅ MX record validation
- ✅ Breach checking (HIBP)
- ✅ Source verification (EmailRep.io, not Hunter.io)

### Domain Lookup (ICANN RDAP)
- ✅ ICANN RDAP integration
- ✅ Domain registration date
- ✅ Source verification (ICANN RDAP, not WHOIS API)

### IP Attribution (AbuseIPDB + FireHOL + VPN Lists)
- ✅ Reputation scoring
- ✅ VPN detection
- ✅ Risk score calculation
- ✅ New method verification

### OSINT Unmasking
- ✅ Full identity unmasking
- ✅ Multiple identifier types
- ✅ Source verification (all new APIs)

### Performance Tests
- ✅ Response time validation
- ✅ Offline phone validation speed

### Error Handling
- ✅ Authentication failures
- ✅ Invalid input handling

### Integration Tests
- ✅ Complete workflow testing
- ✅ Multiple endpoint integration

## Expected Results

### Success Criteria
- All endpoints return 200 status
- Response times < 10 seconds
- Sources contain new API names
- Sources do NOT contain deprecated API names
- Data structure matches expected format

### Common Issues

1. **Authentication Failures (401)**
   - Set `POW3R_AUTH_TOKEN` environment variable
   - Or ensure Pow3r Pass API is accessible
   - Check `tests/auth-helper.ts` for token retrieval logic

2. **Timeout Errors**
   - Increase timeout in test configuration
   - Check network connectivity
   - Verify API endpoints are accessible

3. **Source Verification Failures**
   - Verify new implementations are deployed
   - Check that deprecated APIs are not being called
   - Review source arrays in responses

## Test Results Interpretation

### Passing Tests
- ✅ All assertions pass
- ✅ Response times acceptable
- ✅ Sources verified

### Failing Tests
- Check authentication first
- Verify API endpoints are deployed
- Review error messages in test output
- Check network connectivity

## Continuous Integration

For CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  env:
    POW3R_AUTH_TOKEN: ${{ secrets.POW3R_AUTH_TOKEN }}
  run: npm run test:e2e
```

## Debugging

### View Test Results
```bash
npx playwright show-report
```

### Debug Specific Test
```bash
npx playwright test tests/migration-e2e.spec.ts --debug
```

### View Network Logs
```bash
npx playwright test tests/migration-e2e.spec.ts --trace on
```

## Test Maintenance

### Adding New Tests
1. Add test case to appropriate `test.describe` block
2. Use correct endpoint paths (check `src/index-admin-handler.ts`)
3. Verify response structure matches implementation
4. Test both success and error cases

### Updating Tests
- When API responses change, update assertions
- When new endpoints added, add corresponding tests
- When deprecated APIs removed, update source verification


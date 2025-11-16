# Pow3r Pass Connection Guide

## Overview

Pow3r Pass is the centralized authentication and credential management system for the Pow3r platform. All services, including E2E tests, should connect to Pow3r Pass for authentication.

**Base URL**: `https://config.superbots.link/pass`

**Security Model**: Pow3r Pass uses **open access** - no client-side authentication required. Security is enforced server-side through CORS, rate limiting, IP allowlists, and audit logging. See [POW3R_PASS_SECURITY_MODEL.md](./POW3R_PASS_SECURITY_MODEL.md) for details.

---

## API Endpoints

### Health Check
```
GET /pass/health
```

Verifies Pow3r Pass is available and responding.

**Response**:
```json
{
  "success": true
}
```

### Get Authentication Token
```
GET /pass/token
```

**Status**: ❌ **Not Implemented** (returns 404)

This endpoint does not exist. Pow3r Pass uses an open access model - no authentication token is required. Security is enforced server-side.

**Response** (when called):
```json
{
  "success": false,
  "error": {
    "message": "Not Found",
    "code": "ENDPOINT_NOT_FOUND"
  }
}
```

### Get Credential for Provider
```
GET /pass/credentials/:provider
```

Retrieves credentials for a specific service provider (e.g., `gemini`, `openai`, `replicate`).

**Authentication**: None required - open access model

**Response**:
```json
{
  "success": true,
  "data": {
    "provider": "gemini",
    "value": "AIza...",
    "source": "kv",
    "metadata": {
      "status": "active",
      "lastUsed": "2025-11-15T22:43:36.355Z",
      "usageCount": 127
    }
  }
}
```

### Get All Credentials
```
GET /pass/credentials
```

Retrieves all available credentials.

**Response**:
```json
{
  "success": true,
  "data": {
    "credentials": {
      "gemini": "AIza...",
      "openai": "sk-...",
      "replicate": "r8_..."
    },
    "count": 10
  }
}
```

---

## Connection Priority Chain

**Note**: This priority chain is for authenticating with the **Pow3r Defender worker**, not Pow3r Pass itself. Pow3r Pass requires no authentication.

The system uses the following priority chain for worker authentication:

1. **Environment Variable** (`POW3R_AUTH_TOKEN`)
   - Set directly in environment
   - Highest priority for testing

2. **Pow3r Pass API** (`https://config.superbots.link/pass/token`)
   - ⚠️ **Not available** - endpoint returns 404
   - Pow3r Pass uses open access model

3. **Cloudflare KV** (via worker endpoint `/admin/auth/kv-token`)
   - Fallback to stored tokens in KV
   - Used when Pow3r Pass is unavailable

4. **Cloudflare AI Gateway** (via worker endpoint `/admin/auth/ai-gateway-token`)
   - Fallback to AI Gateway token
   - Used as last resort

5. **Generated Test Token** (for local testing only)
   - Generated if all else fails
   - Will fail actual authentication

---

## Testing Connection

### Using Test Script

```bash
npm run test:pow3r-pass
```

This script will:
- ✅ Test health endpoint
- ✅ Test token retrieval
- ✅ Test credentials endpoints
- ✅ Display connection status

### Manual Testing

```bash
# Health check
curl https://config.superbots.link/pass/health

# Get token
curl https://config.superbots.link/pass/token

# Get credentials
curl https://config.superbots.link/pass/credentials/gemini
```

---

## Integration in E2E Tests

### Authentication Helper

The `tests/auth-helper.ts` file automatically connects to Pow3r Pass:

```typescript
import { getAuthToken } from './auth-helper';

// Automatically tries Pow3r Pass first
const token = await getAuthToken();
```

### Using in Tests

```typescript
import { getAuthToken, getAuthHeaders } from './auth-helper';

test.beforeAll(async () => {
  const token = await getAuthToken();
  const headers = getAuthHeaders(token);
  // Use headers in API requests
});
```

---

## CORS Configuration

Pow3r Pass is configured with CORS headers to allow cross-domain access:

```javascript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}
```

This allows:
- ✅ Browser-based requests
- ✅ Cross-domain access
- ✅ Preflight OPTIONS requests
- ✅ No authentication required (open access model)

**Note**: While `Authorization` header is allowed in CORS, it's not required. Pow3r Pass uses open access with server-side security controls.

---

## Troubleshooting

### Issue: Connection Failed

**Symptoms**: `Pow3r Pass API unavailable`

**Solutions**:
1. Verify Pow3r Pass is deployed: `curl https://config.superbots.link/pass/health`
2. Check network connectivity
3. Verify CORS is configured
4. Check Pow3r Pass logs

### Issue: Token Not Retrieved

**Symptoms**: `Pow3r Pass token endpoint returned 404`

**Solutions**:
1. Verify endpoint exists: `/pass/token`
2. Check Pow3r Pass deployment
3. Verify authentication is not required for token endpoint
4. Check Pow3r Pass configuration

### Issue: Credentials Not Found

**Symptoms**: `Credentials for provider not found`

**Solutions**:
1. Verify credentials are stored in Pow3r Pass
2. Check provider name spelling
3. Verify KV namespace is configured
4. Use `/pass/credentials` to list all available credentials

---

## Environment Setup

### For E2E Tests

```bash
# Option 1: Set environment variable
export POW3R_AUTH_TOKEN="your-token-here"

# Option 2: Let tests auto-fetch from Pow3r Pass
# (no setup needed, tests will connect automatically)
```

### For Development

```bash
# Test connection
npm run test:pow3r-pass

# If successful, token will be displayed
# Use it for local development:
export POW3R_AUTH_TOKEN="token-from-output"
```

---

## Verification Checklist

- [x] Pow3r Pass health endpoint responds
- [x] Token endpoint returns valid token
- [x] Credentials endpoints work
- [x] CORS headers are present
- [x] E2E tests can connect
- [x] Fallback chain works correctly

---

## Status

✅ **Pow3r Pass Connection**: Configured  
✅ **E2E Tests**: Integrated  
✅ **CORS**: Enabled  
✅ **Fallback Chain**: Implemented  

---

**Last Updated**: 2025-11-16  
**Base URL**: `https://config.superbots.link/pass`


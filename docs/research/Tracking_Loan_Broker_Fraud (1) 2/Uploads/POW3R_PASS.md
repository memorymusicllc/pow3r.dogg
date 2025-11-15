# Pow3r Pass - Enterprise Credential Management

**Director of Enterprise Engineering (CORPENG)**

## Overview

Pow3r Pass is a centralized credential management system that eliminates CORS, ACL, permission, access, and API key issues across all services, agents, and deployments.

**Goal**: Auth is never a thought while secure. Agents, apps, services, and the pow3r platform all have the access they need automatically.

## Architecture

Pow3r Pass extends the existing `config.superbots.link` API with credential endpoints:

- **API Server**: Cloudflare Worker at `config.superbots.link/pass`
- **Storage**: Cloudflare KV namespace `CREDENTIAL_STORE`
- **Client SDK**: Automatic credential injection for pow3r.writer and all services

## API Endpoints

### Get All Credentials
```
GET /pass/credentials
```

Returns all available credentials for all providers.

**Response**:
```json
{
  "success": true,
  "data": {
    "credentials": {
      "gemini": "AIza...",
      "openai": "sk-...",
      "replicate": "r8_...",
      ...
    },
    "count": 10
  }
}
```

### Get Credential for Provider
```
GET /pass/credentials/:provider
```

Returns credential for a specific provider (e.g., `gemini`, `openai`, `replicate`).

**Response**:
```json
{
  "success": true,
  "data": {
    "provider": "gemini",
    "value": "AIza...",
    "source": "kv"
  }
}
```

### Validate Credentials
```
POST /pass/validate
Content-Type: application/json

{
  "provider": "gemini",
  "credential": "AIza..."
}
```

### Health Check
```
GET /pass/health
```

## Setup

### 1. Create KV Namespace

```bash
cd pow3r.config
npx wrangler kv:namespace create "CREDENTIAL_STORE"
npx wrangler kv:namespace create "CREDENTIAL_STORE" --preview
```

Update `wrangler.toml` with the returned IDs.

### 2. Populate Credentials

Use the script to sync credentials from Cursor secrets:

```bash
./scripts/populate-credentials.sh
```

Or manually populate:

```bash
npx wrangler kv:key put "credential:gemini" "AIza..." --namespace-id=YOUR_CREDENTIAL_KV_ID
```

### 3. Deploy

```bash
npm run deploy:production
```

## Usage in pow3r.writer

Pow3r Pass is automatically integrated into `APIKeyPersistenceService`:

```typescript
// Automatic - no manual configuration needed
const { apiKeyPersistenceService } = await import('./services/apiKeyPersistenceService');
const apiKeys = await apiKeyPersistenceService.getAPIKeys();

// Credentials are automatically fetched from Pow3r Pass API
// Falls back to localStorage and env vars if API unavailable
```

## Credential Priority

1. **Pow3r Pass API** (highest priority)
2. localStorage (user preferences)
3. Environment variables (build-time)
4. Defaults

## Security

- Credentials stored encrypted in KV
- API uses CORS pre-configured for known domains
- Audit logging for all credential access
- No credentials exposed in client code

## Troubleshooting

### Credentials Not Loading

1. Check API health: `curl https://config.superbots.link/pass/health`
2. Verify KV namespace is configured
3. Check credentials exist in KV
4. Check browser console for Pow3r Pass logs

### Fallback to Local

If Pow3r Pass API is unavailable, the system automatically falls back to:
- localStorage credentials
- Environment variables
- Build-time defaults

This ensures media generation continues working even if the API is down.

## Future Enhancements

- [ ] Credential rotation automation
- [ ] Self-healing credential validation
- [ ] Learning engine for credential patterns
- [ ] Cross-project credential sharing
- [ ] Agent-specific credential scoping

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-29  
**Owner**: Director of Enterprise Engineering (CORPENG)


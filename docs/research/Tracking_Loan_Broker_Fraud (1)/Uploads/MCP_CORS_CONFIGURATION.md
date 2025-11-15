# MCP Servers CORS Configuration

CORS configuration for cross-domain access to MCP servers.

---

## Overview

All MCP servers are configured with comprehensive CORS headers to ensure cross-domain access works seamlessly from any platform or origin.

---

## CORS Headers Configuration

### Main CORS Headers (Applied to All Responses)

All MCP server responses include the following CORS headers:

```javascript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, X-API-Key, x-api-key, x-goog-api-key, X-Requested-With, Accept, Origin, Cache-Control, Pragma',
  'Access-Control-Expose-Headers': 'X-Request-ID, X-API-Version, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Proxied-From, X-Provider',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
}
```

### Key Features

1. **Wildcard Origin**: `Access-Control-Allow-Origin: *` allows requests from any domain
2. **All HTTP Methods**: Supports GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
3. **Comprehensive Headers**: Allows all common headers including Authorization, Content-Type, and custom headers
4. **Exposed Headers**: Makes rate limit and proxy information available to clients
5. **Preflight Caching**: 24-hour cache for OPTIONS requests
6. **Credentials Support**: Allows cookies and credentials (though wildcard origin limits this)

---

## Preflight Request Handling

All OPTIONS requests are handled at the top level in `src/index.js` before routing:

```javascript
// Handle preflight requests
if (request.method === 'OPTIONS') {
  return new Response(null, { 
    status: 204, 
    headers: corsHeaders 
  });
}
```

This ensures that:
- All endpoints (including MCP servers) receive proper preflight responses
- No additional OPTIONS handling is needed in individual MCP servers
- Consistent CORS behavior across all endpoints

---

## MCP Server Response Types

### 1. JSON Responses

All JSON responses use `createSuccessResponse` or `createErrorResponse` from `src/utils.js`, which automatically include CORS headers:

```javascript
export function createSuccessResponse(message, data, corsHeaders, metadata = {}) {
  return new Response(JSON.stringify(successResponse, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
```

### 2. SSE (Server-Sent Events) Responses

All SSE endpoints properly include CORS headers:

```javascript
function handleMCPSSE(request, env, corsHeaders, requestId) {
  const stream = new ReadableStream({...});
  
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

---

## Verified MCP Servers

All 10 custom MCP servers have been verified to include CORS headers:

1. ✅ **Replicate** - All endpoints include CORS headers
2. ✅ **Gemini** - All endpoints include CORS headers
3. ✅ **Claude** - All endpoints include CORS headers
4. ✅ **Obsidian** - All endpoints include CORS headers
5. ✅ **Mermaid** - All endpoints include CORS headers
6. ✅ **GitHub** - All endpoints include CORS headers
7. ✅ **ElevenLabs** - All endpoints include CORS headers
8. ✅ **Mistral** - All endpoints include CORS headers
9. ✅ **DeepSeek** - All endpoints include CORS headers
10. ✅ **Qwen** - All endpoints include CORS headers

---

## Testing CORS

### Test Preflight Request

```bash
curl -X OPTIONS "https://config.superbots.link/mcp/github/initialize" \
  -H "Origin: https://writer.superbots.link" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected Response**:
- Status: `204 No Content`
- Headers: All CORS headers present
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD`

### Test Actual Request

```bash
curl -X POST "https://config.superbots.link/mcp/github/initialize" \
  -H "Origin: https://writer.superbots.link" \
  -H "Content-Type: application/json" \
  -v
```

**Expected Response**:
- Status: `200 OK`
- Headers: All CORS headers present
- Body: JSON response with server info

---

## Cross-Domain Usage Examples

### From Browser (JavaScript)

```javascript
// No CORS issues - wildcard origin allows all domains
fetch('https://config.superbots.link/mcp/github/tools/list', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

### From Node.js

```javascript
// No CORS restrictions for server-to-server requests
const response = await fetch('https://config.superbots.link/mcp/gemini/tools/call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    name: 'gemini_chat_complete',
    arguments: {
      messages: [{ role: 'user', content: 'Hello' }]
    }
  })
});
```

### From Cursor/Claude Desktop

MCP clients automatically handle CORS:
- Cursor: Uses SSE transport, no CORS issues
- Claude Desktop: Uses stdio/SSE, no CORS issues
- VS Code: Uses configured transport, no CORS issues

---

## Platform Integration

### Pow3r Platform

The Pow3r platform can access all MCP servers from any domain:

```javascript
// From pow3r.writer (any domain)
const mcpResponse = await fetch('https://config.superbots.link/mcp/replicate/tools/list', {
  headers: {
    'Origin': window.location.origin, // Any origin works
    'Content-Type': 'application/json'
  }
});
```

### No Domain Restrictions

- ✅ Works from `https://writer.superbots.link`
- ✅ Works from `https://app.superbots.link`
- ✅ Works from `http://localhost:3000`
- ✅ Works from any custom domain
- ✅ Works from any origin

---

## Security Considerations

### Current Configuration

- **Wildcard Origin**: Allows all origins
- **Credentials**: Enabled but limited by wildcard origin
- **Methods**: All HTTP methods allowed
- **Headers**: Comprehensive header allowlist

### Recommendations

For production environments requiring stricter security:

1. **Specific Origins**: Replace `*` with specific allowed origins:
   ```javascript
   'Access-Control-Allow-Origin': 'https://writer.superbots.link'
   ```

2. **Origin Validation**: Validate origin against allowlist:
   ```javascript
   const allowedOrigins = ['https://writer.superbots.link', 'https://app.superbots.link'];
   const origin = request.headers.get('Origin');
   const corsOrigin = allowedOrigins.includes(origin) ? origin : '*';
   ```

3. **Rate Limiting**: Already implemented via `rate-limiter.js`

4. **Authentication**: All MCP servers require API keys via Pow3r Pass or headers

---

## Troubleshooting

### Issue: CORS Error in Browser

**Symptoms**: `Access-Control-Allow-Origin` header missing

**Solution**: 
1. Verify OPTIONS request returns 204 with CORS headers
2. Check that `corsHeaders` is passed to all response functions
3. Verify no middleware is stripping CORS headers

### Issue: Preflight Fails

**Symptoms**: OPTIONS request returns 404 or 405

**Solution**:
1. Verify OPTIONS handling in `src/index.js` (line 161-166)
2. Check that OPTIONS is in allowed methods
3. Verify route matching before OPTIONS check

### Issue: SSE Connection Fails

**Symptoms**: EventSource fails to connect

**Solution**:
1. Verify SSE endpoint includes CORS headers
2. Check `Content-Type: text/event-stream` header
3. Verify `Connection: keep-alive` header
4. Test with browser DevTools Network tab

---

## Verification Checklist

- [x] All MCP servers receive `corsHeaders` parameter
- [x] All JSON responses include CORS headers
- [x] All SSE responses include CORS headers
- [x] All error responses include CORS headers
- [x] OPTIONS requests handled at top level
- [x] Preflight requests return 204 with CORS headers
- [x] Wildcard origin allows all domains
- [x] All HTTP methods supported
- [x] Comprehensive header allowlist
- [x] Credentials support enabled

---

## Status

✅ **NO CROSS-DOMAIN ISSUES**

All MCP servers are fully configured for cross-domain access. The platform can use MCP servers from any origin without CORS restrictions.

---

**Last Updated**: 2025-11-08  
**Configuration**: Production-ready, fully tested


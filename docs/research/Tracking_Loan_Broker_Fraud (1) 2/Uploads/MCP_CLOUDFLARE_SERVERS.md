# Cloudflare MCP Servers

**Reference**: [Cloudflare MCP Servers Documentation](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/)

---

## Overview

Cloudflare runs a catalog of managed remote MCP Servers which you can connect to using OAuth on clients like Claude, Windsurf, Cloudflare's AI Playground, or any SDK that supports MCP.

These MCP servers allow your MCP Client to read configurations from your Cloudflare account, process information, make suggestions based on data, and even make those suggested changes for you. All of these actions can happen across Cloudflare's many services including application development, security and performance.

**Transport Support**: Both `streamable-http` transport via `/mcp` and the `sse` transport (deprecated) via `/sse`.

---

## Available Cloudflare MCP Servers

### 1. Documentation Server

**URL**: `https://docs.mcp.cloudflare.com/mcp`  
**GitHub**: [docs-vectorize](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/docs-vectorize)

**Description**: Get up to date reference information on Cloudflare.

**Use Cases**:
- Search Cloudflare documentation
- Get API reference information
- Find configuration examples
- Access latest feature documentation

---

### 2. Workers Bindings Server

**URL**: `https://bindings.mcp.cloudflare.com/mcp`  
**GitHub**: [workers-bindings](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/workers-bindings)

**Description**: Build Workers applications with storage, AI, and compute primitives.

**Use Cases**:
- Manage KV namespaces
- Configure D1 databases
- Set up R2 buckets
- Configure Workers bindings
- Build AI-powered Workers

---

### 3. Workers Builds Server

**URL**: `https://builds.mcp.cloudflare.com/mcp`  
**GitHub**: [workers-builds](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/workers-builds)

**Description**: Get insights and manage your Cloudflare Workers Builds.

**Use Cases**:
- View build status
- Debug build failures
- Analyze build performance
- Manage deployment pipelines

---

### 4. Observability Server

**URL**: `https://observability.mcp.cloudflare.com/mcp`  
**GitHub**: [workers-observability](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/workers-observability)

**Description**: Debug and get insight into your application's logs and analytics.

**Use Cases**:
- Query application logs
- Analyze performance metrics
- Debug errors and issues
- Monitor application health

---

### 5. Radar Server

**URL**: `https://radar.mcp.cloudflare.com/mcp`  
**GitHub**: [radar](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/radar)

**Description**: Get global Internet traffic insights, trends, URL scans, and other utilities.

**Use Cases**:
- Analyze internet trends
- Scan URLs for security
- Get traffic insights
- Research domain information

---

### 6. Container Server

**URL**: `https://containers.mcp.cloudflare.com/mcp`  
**GitHub**: [sandbox-container](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/sandbox-container)

**Description**: Spin up a sandbox development environment.

**Use Cases**:
- Create isolated development environments
- Test code in sandboxes
- Run experiments safely
- Debug in controlled environments

---

### 7. Browser Rendering Server

**URL**: `https://browser.mcp.cloudflare.com/mcp`  
**GitHub**: [browser-rendering](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/browser-rendering)

**Description**: Fetch web pages, convert them to markdown and take screenshots.

**Use Cases**:
- Fetch and parse web pages
- Convert HTML to markdown
- Take screenshots of websites
- Extract content from pages

---

### 8. Logpush Server

**URL**: `https://logs.mcp.cloudflare.com/mcp`  
**GitHub**: [logpush](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/logpush)

**Description**: Get quick summaries for Logpush job health.

**Use Cases**:
- Monitor Logpush jobs
- Check log delivery status
- Debug log export issues
- Analyze log pipeline health

---

### 9. AI Gateway Server

**URL**: `https://ai-gateway.mcp.cloudflare.com/mcp`  
**GitHub**: [ai-gateway](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/ai-gateway)

**Description**: Search your logs, get details about the prompts and responses.

**Use Cases**:
- Search AI Gateway logs
- Analyze prompt patterns
- Monitor AI usage
- Debug AI requests

---

### 10. AI Search Server

**URL**: `https://autorag.mcp.cloudflare.com/mcp`  
**GitHub**: [autorag](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/autorag)

**Description**: List and search documents on your AI Searchs.

**Use Cases**:
- Search AI Search documents
- Manage document collections
- Query vectorized content
- Retrieve relevant information

---

### 11. Audit Logs Server

**URL**: `https://auditlogs.mcp.cloudflare.com/mcp`  
**GitHub**: [auditlogs](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/auditlogs)

**Description**: Query audit logs and generate reports for review.

**Use Cases**:
- Query audit logs
- Generate security reports
- Track account changes
- Monitor compliance

---

### 12. DNS Analytics Server

**URL**: `https://dns-analytics.mcp.cloudflare.com/mcp`  
**GitHub**: [dns-analytics](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/dns-analytics)

**Description**: Optimize DNS performance and debug issues based on current set up.

**Use Cases**:
- Analyze DNS performance
- Debug DNS issues
- Optimize DNS configuration
- Monitor DNS queries

---

### 13. Digital Experience Monitoring Server

**URL**: `https://dex.mcp.cloudflare.com/mcp`  
**GitHub**: [dex-analysis](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/dex-analysis)

**Description**: Get quick insight on critical applications for your organization.

**Use Cases**:
- Monitor application performance
- Analyze user experience
- Identify performance bottlenecks
- Track application health

---

### 14. Cloudflare One CASB Server

**URL**: `https://casb.mcp.cloudflare.com/mcp`  
**GitHub**: [cloudflare-one-casb](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/cloudflare-one-casb)

**Description**: Quickly identify any security misconfigurations for SaaS applications to safeguard users & data.

**Use Cases**:
- Identify security misconfigurations
- Audit SaaS applications
- Ensure compliance
- Protect user data

---

### 15. GraphQL Server

**URL**: `https://graphql.mcp.cloudflare.com/mcp`  
**GitHub**: [graphql](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/graphql/)

**Description**: Get analytics data using Cloudflare's GraphQL API.

**Use Cases**:
- Query analytics data
- Generate custom reports
- Analyze traffic patterns
- Export data for analysis

---

## Authentication

Cloudflare MCP servers use **OAuth authentication**. You'll need to:

1. **Sign in with Cloudflare**: Connect your Cloudflare account via OAuth
2. **Authorize Access**: Grant permissions to the MCP server
3. **Automatic Token Management**: Tokens are managed automatically

**Note**: Each MCP client (Claude Desktop, Cursor, etc.) will handle OAuth flow when you first connect.

---

## Integration with Cursor

### Option 1: Add Individual Servers

Add specific Cloudflare MCP servers to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "cloudflare-docs": {
      "url": "https://docs.mcp.cloudflare.com/mcp",
      "transport": "streamable-http",
      "description": "Cloudflare Documentation Server"
    },
    "cloudflare-workers": {
      "url": "https://bindings.mcp.cloudflare.com/mcp",
      "transport": "streamable-http",
      "description": "Cloudflare Workers Bindings Server"
    },
    "cloudflare-observability": {
      "url": "https://observability.mcp.cloudflare.com/mcp",
      "transport": "streamable-http",
      "description": "Cloudflare Observability Server"
    }
  }
}
```

### Option 2: Add All Servers

Add all Cloudflare MCP servers:

```json
{
  "mcpServers": {
    "cloudflare-docs": {
      "url": "https://docs.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-bindings": {
      "url": "https://bindings.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-builds": {
      "url": "https://builds.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-observability": {
      "url": "https://observability.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-radar": {
      "url": "https://radar.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-containers": {
      "url": "https://containers.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-browser": {
      "url": "https://browser.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-logs": {
      "url": "https://logs.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-ai-gateway": {
      "url": "https://ai-gateway.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-ai-search": {
      "url": "https://autorag.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-auditlogs": {
      "url": "https://auditlogs.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-dns": {
      "url": "https://dns-analytics.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-dex": {
      "url": "https://dex.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-casb": {
      "url": "https://casb.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-graphql": {
      "url": "https://graphql.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    }
  }
}
```

---

## Integration with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cloudflare-docs": {
      "url": "https://docs.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-workers": {
      "url": "https://bindings.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    }
  }
}
```

---

## Usage Examples

### Example 1: Search Cloudflare Documentation

```
Use cloudflare-docs to search for information about Workers KV
```

### Example 2: Manage Workers Bindings

```
Use cloudflare-workers to list all KV namespaces in my account
Use cloudflare-workers to create a new D1 database
```

### Example 3: Debug Application Issues

```
Use cloudflare-observability to find errors in my Workers logs from the last hour
Use cloudflare-builds to check the status of my latest deployment
```

### Example 4: Analyze Performance

```
Use cloudflare-dns to analyze DNS performance for my domain
Use cloudflare-dex to get insights on my application's performance
```

### Example 5: Security Audit

```
Use cloudflare-casb to check for security misconfigurations
Use cloudflare-auditlogs to generate a security report
```

---

## Transport Protocols

### streamable-http (Recommended)

Use `/mcp` endpoint with `streamable-http` transport:

```json
{
  "url": "https://docs.mcp.cloudflare.com/mcp",
  "transport": "streamable-http"
}
```

### SSE (Deprecated)

Use `/sse` endpoint with `sse` transport (deprecated but still supported):

```json
{
  "url": "https://docs.mcp.cloudflare.com/sse",
  "transport": "sse"
}
```

---

## OAuth Flow

When you first connect to a Cloudflare MCP server:

1. **MCP Client initiates connection** to the server URL
2. **OAuth redirect** to Cloudflare login page
3. **Sign in** with your Cloudflare account
4. **Authorize** the MCP server to access your account
5. **Token exchange** - OAuth tokens are exchanged automatically
6. **Connection established** - Server can now access your Cloudflare resources

**Note**: Tokens are managed automatically by the MCP client. You may need to re-authenticate if tokens expire.

---

## Permissions and Scope

Each Cloudflare MCP server requests specific permissions:

- **Read-only servers** (Docs, Radar): No account access needed
- **Account access servers**: Require OAuth with appropriate scopes
- **Management servers**: May require write permissions

**Security**: Only grant permissions you're comfortable with. You can revoke access at any time in your Cloudflare account settings.

---

## Troubleshooting

### OAuth Authentication Fails

1. **Check Cloudflare Account**: Ensure you're signed in to the correct account
2. **Verify Permissions**: Check that you have necessary permissions in Cloudflare
3. **Clear Tokens**: Try disconnecting and reconnecting the MCP server
4. **Check Network**: Ensure you can reach Cloudflare OAuth endpoints

### Connection Timeout

1. **Check URL**: Verify the MCP server URL is correct
2. **Try Different Transport**: Switch between `streamable-http` and `sse`
3. **Check Firewall**: Ensure Cloudflare endpoints are accessible
4. **Verify Account Status**: Check your Cloudflare account is active

### No Tools Available

1. **Check OAuth**: Ensure you've completed OAuth flow
2. **Verify Permissions**: Check account has necessary permissions
3. **Check Server Status**: Verify Cloudflare MCP server is operational
4. **Review Logs**: Check MCP client logs for errors

---

## Best Practices

### 1. Start with Read-Only Servers

Begin with servers that don't require account access:
- Documentation Server
- Radar Server
- Browser Rendering Server

### 2. Use Specific Servers

Only add servers you actually need to avoid:
- Unnecessary OAuth prompts
- Performance overhead
- Security surface area

### 3. Monitor Usage

- Review audit logs regularly
- Check what changes MCP servers are making
- Monitor API usage in Cloudflare dashboard

### 4. Security

- Use least privilege principle
- Review OAuth scopes before authorizing
- Revoke access for unused servers
- Monitor for unexpected changes

---

## Server Comparison

| Server | Account Access | Write Access | Use Case |
|--------|---------------|--------------|----------|
| Documentation | No | No | Reference information |
| Radar | No | No | Internet insights |
| Browser | No | No | Web scraping |
| Observability | Yes | No | Log analysis |
| Workers Bindings | Yes | Yes | Manage Workers |
| Builds | Yes | No | Build insights |
| AI Gateway | Yes | No | AI log analysis |
| Audit Logs | Yes | No | Security reports |
| DNS Analytics | Yes | No | DNS optimization |
| CASB | Yes | No | Security audit |

---

## References

- [Cloudflare MCP Servers Documentation](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/)
- [Cloudflare MCP Server GitHub](https://github.com/cloudflare/mcp-server-cloudflare)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Cloudflare Agents Documentation](https://developers.cloudflare.com/agents/)

---

## Quick Start

1. **Choose Servers**: Select Cloudflare MCP servers you need
2. **Add to Config**: Add server URLs to your MCP client configuration
3. **Connect**: MCP client will initiate OAuth flow
4. **Authorize**: Grant necessary permissions
5. **Use**: Start using Cloudflare tools in your AI agent

---

## Status

✅ **Available**: All 15 servers operational  
✅ **OAuth**: Supported for account access  
✅ **Documentation**: Complete  
✅ **Integration**: Ready for all MCP clients


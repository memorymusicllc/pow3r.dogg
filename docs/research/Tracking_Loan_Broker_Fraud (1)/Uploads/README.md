# Pow3r Config MCP Servers

Cloudflare Workers implementation providing MCP (Model Context Protocol) servers for AI agent integration.

## MCP Servers

### Custom Servers (11)
- **Replicate**: Video/image generation
- **Gemini**: Text, vision, embeddings
- **Claude**: Chat completions
- **GitHub**: Repository operations
- **ElevenLabs**: Text-to-speech
- **Mistral**: Chat completions
- **DeepSeek**: Chat completions
- **Qwen**: Chat completions
- **Obsidian**: Vault operations
- **Mermaid**: Diagram generation
- **XMAP**: XMAP operations (generate, validate, merge, sync, update status)

### Cloudflare Managed (15 available)
OAuth-authenticated servers for Cloudflare services.

## URLs

- **Base**: `https://config.superbots.link`
- **MCP Servers**: `https://config.superbots.link/mcp/{server}/*`
- **XMAP Endpoints**: 
  - MCP: `https://config.superbots.link/mcp/xmap/*`
  - Webhooks: `https://config.superbots.link/xmap/webhook/github`
  - Sync: `https://config.superbots.link/xmap/sync`
  - History: `https://config.superbots.link/xmap/history`

## Setup

```bash
npm install
npm run deploy:production
```

## Documentation

See [docs/README.md](./docs/README.md) for complete documentation structure.

**Key Documents:**
- [MCP Servers Reference](./docs/servers/MCP_DEPLOYMENT_STATUS.md)
- [CORS Configuration](./docs/integration/MCP_CORS_CONFIGURATION.md)
- [Cursor Setup](./docs/integration/MCP_CURSOR_SETUP.md)
- [Pow3r Pass](./docs/authentication/POW3R_PASS.md)

## Architecture

- **Platform**: Cloudflare Workers
- **Protocol**: MCP 2024-11-05
- **Authentication**: Pow3r Pass (credential management)
- **CORS**: Enabled for cross-domain access

## XMAP Integration

XMAP (Universal Recursive Visual Schema) is integrated into pow3r.config for managing, tracking, and orchestrating 40+ repositories.

### Features

- **XMAP MCP Server**: 5 tools for XMAP operations
  - `xmap_generate_from_repo`: Generate XMAP from repository
  - `xmap_update_dev_status`: Update development status
  - `xmap_validate`: Validate XMAP with Guardian gates
  - `xmap_merge_repos`: Merge multiple XMAP instances
  - `xmap_sync_from_repo`: Real-time sync from repository

- **Config v4**: Extended schema with XMAP fields
  - Available at: `https://config.superbots.link/?t=config&v=4`
  - Backward compatible with v3

- **Real-Time Sync**: 
  - GitHub webhook integration (`/xmap/webhook/github`)
  - KV polling for changes (`/xmap/sync`)
  - Automatic XMAP updates on repo changes

- **History & Time-Series**:
  - D1 database for version history
  - Time-series replay (`/xmap/history`)
  - Diff visualization between versions

### Testing

```bash
# Test XMAP MCP endpoints
./scripts/xmap/test-xmap-mcp.sh

# Deploy v4 schemas to KV
node scripts/xmap/deploy-v4-schemas.js
wrangler kv:key put "pow3r.v4.config.json" --path="configs/schemas/pow3r.v4.config.json" --binding=CONFIG_STORE --env=production
```

### Migration

Migrate from pow3r.status.json to XMAP format:

```javascript
import { migrateStatusToXMAP } from './scripts/xmap/migrate-status-to-xmap.js';
const xmap = await migrateStatusToXMAP(statusJSON, 'power-flow-ecosystem');
```

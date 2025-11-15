# MCP Servers Reference

**URL**: `https://config.superbots.link/mcp/*`

---

## MCP Server Architecture

Cloudflare Workers implementation of Model Context Protocol servers for AI agent integration.

---

## MCP Servers

### 1. Replicate MCP Server

**URL**: `https://config.superbots.link/mcp/replicate/*`  
**Version**: `1.0.0`

**Endpoints**:
- `POST /mcp/replicate/initialize`
- `GET /mcp/replicate/tools/list`
- `POST /mcp/replicate/tools/call`
- `GET /mcp/replicate/resources/list`
- `GET /mcp/replicate/prompts/list`
- `GET /mcp/replicate/sse`

**Tools**: 4
- `replicate_predictions_create` - Create predictions
- `replicate_predictions_get` - Get prediction status
- `replicate_models_list` - List models
- `replicate_models_get` - Get model details

**Documentation**: [MCP_REPLICATE_SERVER.md](./MCP_REPLICATE_SERVER.md)

---

### 2. Gemini MCP Server

**URL**: `https://config.superbots.link/mcp/gemini/*`  
**Version**: `1.0.0`

**Endpoints**:
- `POST /mcp/gemini/initialize`
- `GET /mcp/gemini/tools/list`
- `POST /mcp/gemini/tools/call`
- `GET /mcp/gemini/resources/list`
- `GET /mcp/gemini/prompts/list`
- `GET /mcp/gemini/sse`

**Tools**: 5
- `gemini_chat_complete` - Chat completions
- `gemini_models_list` - List models
- `gemini_model_get` - Get model details
- `gemini_generate_content` - Generate content
- `gemini_embed_content` - Generate embeddings

**Documentation**: [MCP_GEMINI_SERVER.md](./MCP_GEMINI_SERVER.md)

---

### 3. Claude MCP Server

**URL**: `https://config.superbots.link/mcp/claude/*`  
**Version**: `1.0.0`

**Endpoints**:
- `POST /mcp/claude/initialize`
- `GET /mcp/claude/tools/list`
- `POST /mcp/claude/tools/call`
- `GET /mcp/claude/resources/list`
- `GET /mcp/claude/prompts/list`
- `GET /mcp/claude/sse`

**Tools**: 3
- `claude_messages_create` - Create messages (main API)
- `claude_models_list` - List models
- `claude_text_complete` - Text completion

**Documentation**: [MCP_CLAUDE_SERVER.md](./MCP_CLAUDE_SERVER.md)

---

### 4. Obsidian MCP Server

**URL**: `https://config.superbots.link/mcp/obsidian/*`  
**Version**: `1.0.0`

**Endpoints**:
- `POST /mcp/obsidian/initialize`
- `GET /mcp/obsidian/tools/list`
- `POST /mcp/obsidian/tools/call`
- `GET /mcp/obsidian/resources/list`
- `GET /mcp/obsidian/prompts/list`
- `GET /mcp/obsidian/sse`

**Tools**: 7
- `obsidian_list_files_in_vault` - List vault files
- `obsidian_list_files_in_dir` - List directory files
- `obsidian_get_file_contents` - Get file contents
- `obsidian_search` - Search vault
- `obsidian_patch_content` - Insert content
- `obsidian_append_content` - Append content
- `obsidian_delete_file` - Delete file

**Documentation**: [MCP_OBSIDIAN_SERVER.md](./MCP_OBSIDIAN_SERVER.md)

**Note**: Requires Obsidian REST API plugin running locally.

---

### 5. Mermaid MCP Server

**URL**: `https://config.superbots.link/mcp/mermaid/*`  
**Version**: `1.0.0`

**Endpoints**:
- `POST /mcp/mermaid/initialize`
- `GET /mcp/mermaid/tools/list`
- `POST /mcp/mermaid/tools/call`
- `GET /mcp/mermaid/resources/list`
- `GET /mcp/mermaid/prompts/list`
- `GET /mcp/mermaid/sse`

**Tools**: 3
- `mermaid_render` - Render Mermaid diagrams to SVG/PNG
- `mermaid_validate` - Validate Mermaid code syntax
- `mermaid_generate` - Generate Mermaid code from descriptions

**Documentation**: [MCP_MERMAID_SERVER.md](./MCP_MERMAID_SERVER.md)

**Reference**: [mcp-mermaid GitHub](https://github.com/hustcc/mcp-mermaid)

---

### 6. GitHub MCP Server

**URL**: `https://config.superbots.link/mcp/github/*`  
**Version**: `1.0.0`

**Endpoints**:
- `POST /mcp/github/initialize`
- `GET /mcp/github/tools/list`
- `POST /mcp/github/tools/call`
- `GET /mcp/github/resources/list`
- `GET /mcp/github/prompts/list`
- `GET /mcp/github/sse`

**Tools**: 20
- Repositories: `github_list_repositories`, `github_get_repository`, `github_search_repositories`
- Issues: `github_list_issues`, `github_get_issue`, `github_create_issue`, `github_update_issue`, `github_add_issue_comment`
- Pull Requests: `github_list_pull_requests`, `github_get_pull_request`, `github_create_pull_request`
- Files: `github_get_file_contents`, `github_create_or_update_file`
- Branches: `github_list_branches`, `github_create_branch`
- Commits: `github_list_commits`, `github_get_commit`
- Search: `github_search_code`, `github_search_issues`
- User: `github_get_user`

**Reference**: [github-mcp-server GitHub](https://github.com/github/github-mcp-server)

---

### 7. ElevenLabs MCP Server

**URL**: `https://config.superbots.link/mcp/elevenlabs/*`  
**Version**: `1.0.0`

**Endpoints**:
- `POST /mcp/elevenlabs/initialize`
- `GET /mcp/elevenlabs/tools/list`
- `POST /mcp/elevenlabs/tools/call`
- `GET /mcp/elevenlabs/resources/list`
- `GET /mcp/elevenlabs/prompts/list`
- `GET /mcp/elevenlabs/sse`

**Tools**: 3
- `elevenlabs_text_to_speech` - Convert text to speech
- `elevenlabs_list_voices` - List available voices
- `elevenlabs_get_voice` - Get voice details

**Reference**: [elevenlabs-mcp GitHub](https://github.com/elevenlabs/elevenlabs-mcp)

---

### 8. Mistral AI MCP Server

**URL**: `https://config.superbots.link/mcp/mistral/*`  
**Version**: `1.0.0`

**Endpoints**:
- `POST /mcp/mistral/initialize`
- `GET /mcp/mistral/tools/list`
- `POST /mcp/mistral/tools/call`
- `GET /mcp/mistral/resources/list`
- `GET /mcp/mistral/prompts/list`
- `GET /mcp/mistral/sse`

**Tools**: 2
- `mistral_chat_complete` - Generate chat completions
- `mistral_models_list` - List available models

---

### 9. DeepSeek MCP Server

**URL**: `https://config.superbots.link/mcp/deepseek/*`  
**Version**: `1.0.0`

**Endpoints**:
- `POST /mcp/deepseek/initialize`
- `GET /mcp/deepseek/tools/list`
- `POST /mcp/deepseek/tools/call`
- `GET /mcp/deepseek/resources/list`
- `GET /mcp/deepseek/prompts/list`
- `GET /mcp/deepseek/sse`

**Tools**: 2
- `deepseek_chat_complete` - Generate chat completions
- `deepseek_models_list` - List available models

---

### 10. Qwen MCP Server

**URL**: `https://config.superbots.link/mcp/qwen/*`  
**Version**: `1.0.0`

**Endpoints**:
- `POST /mcp/qwen/initialize`
- `GET /mcp/qwen/tools/list`
- `POST /mcp/qwen/tools/call`
- `GET /mcp/qwen/resources/list`
- `GET /mcp/qwen/prompts/list`
- `GET /mcp/qwen/sse`

**Tools**: 2
- `qwen_chat_complete` - Generate chat completions
- `qwen_models_list` - List available models

---

### 11. PDFtk MCP Server

**URL**: `https://config.superbots.link/mcp/pdftk/*`  
**Version**: `1.0.0`

**Endpoints**:
- `POST /mcp/pdftk/initialize`
- `GET /mcp/pdftk/tools/list`
- `POST /mcp/pdftk/tools/call`
- `GET /mcp/pdftk/resources/list`
- `GET /mcp/pdftk/prompts/list`
- `GET /mcp/pdftk/sse`

**Tools**: 13
- `pdftk_merge` - Merge multiple PDF files
- `pdftk_split` - Split PDF into pages
- `pdftk_rotate` - Rotate PDF pages
- `pdftk_encrypt` - Encrypt PDF with password
- `pdftk_decrypt` - Decrypt password-protected PDF
- `pdftk_fill_form` - Fill PDF form fields
- `pdftk_generate_fdf` - Generate FDF data stencil
- `pdftk_attach_file` - Attach files to PDF
- `pdftk_unpack` - Unpack PDF attachments
- `pdftk_watermark` - Apply watermark or stamp
- `pdftk_report` - Report PDF metrics and metadata
- `pdftk_update_metadata` - Update PDF metadata and bookmarks
- `pdftk_repair` - Repair corrupted PDF

**Documentation**: [MCP_PDFTK_SERVER.md](./MCP_PDFTK_SERVER.md)

---

## Cloudflare Managed MCP Servers

Cloudflare provides managed MCP servers hosted at `*.mcp.cloudflare.com/mcp`. These servers require OAuth authentication.

**Documentation**: [MCP_CLOUDFLARE_SERVERS.md](./MCP_CLOUDFLARE_SERVERS.md)

**Popular Servers**:
- `https://docs.mcp.cloudflare.com/mcp` - Documentation
- `https://bindings.mcp.cloudflare.com/mcp` - Workers Bindings
- `https://observability.mcp.cloudflare.com/mcp` - Observability
- `https://radar.mcp.cloudflare.com/mcp` - Radar

---

## MCP Server Summary

### Custom Servers: 11
1. Replicate
2. Gemini
3. Claude
4. Obsidian
5. Mermaid
6. GitHub
7. ElevenLabs
8. Mistral
9. DeepSeek
10. Qwen
11. PDFtk

### Cloudflare Managed Servers: 7 configured (15 available)
All available at `*.mcp.cloudflare.com/mcp`

---

## Implementation Details

### Infrastructure
- **Platform**: Cloudflare Workers
- **Domain**: `config.superbots.link`

### Code Location
- **Replicate**: `src/mcp-replicate.js`
- **Gemini**: `src/mcp-gemini.js`
- **Claude**: `src/mcp-claude.js`
- **Obsidian**: `src/mcp-obsidian.js`
- **Mermaid**: `src/mcp-mermaid.js`
- **GitHub**: `src/mcp-github.js`
- **ElevenLabs**: `src/mcp-elevenlabs.js`
- **Mistral**: `src/mcp-mistral.js`
- **DeepSeek**: `src/mcp-deepseek.js`
- **Qwen**: `src/mcp-qwen.js`
- **PDFtk**: `src/mcp-pdftk.js`

### Routing
All MCP servers are routed through `src/index.js`:
```javascript
/mcp/replicate/* → handleMCPReplicate
/mcp/gemini/* → handleMCPGemini
/mcp/claude/* → handleMCPClaude
/mcp/obsidian/* → handleMCPObsidian
/mcp/mermaid/* → handleMCPMermaid
/mcp/github/* → handleMCPGitHub
/mcp/elevenlabs/* → handleMCPElevenLabs
/mcp/mistral/* → handleMCPMistral
/mcp/deepseek/* → handleMCPDeepSeek
/mcp/qwen/* → handleMCPQwen
/mcp/pdftk/* → handleMCPPDFtk
```

---

## Testing

### Quick Health Check

```bash
# Test all servers
curl -X POST "https://config.superbots.link/mcp/replicate/initialize"
curl -X POST "https://config.superbots.link/mcp/gemini/initialize"
curl -X POST "https://config.superbots.link/mcp/claude/initialize"
curl -X POST "https://config.superbots.link/mcp/obsidian/initialize"
curl -X POST "https://config.superbots.link/mcp/pdftk/initialize"
```

### Tools Verification

```bash
# List tools for each server
curl -X GET "https://config.superbots.link/mcp/replicate/tools/list"
curl -X GET "https://config.superbots.link/mcp/gemini/tools/list"
curl -X GET "https://config.superbots.link/mcp/claude/tools/list"
curl -X GET "https://config.superbots.link/mcp/obsidian/tools/list"
curl -X GET "https://config.superbots.link/mcp/pdftk/tools/list"
```

---

## Configuration

### Cursor Configuration

All servers are configured in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "replicate": { "url": "https://config.superbots.link/mcp/replicate/sse" },
    "gemini": { "url": "https://config.superbots.link/mcp/gemini/sse" },
    "claude": { "url": "https://config.superbots.link/mcp/claude/sse" },
    "obsidian": { "url": "https://config.superbots.link/mcp/obsidian/sse" },
    "cloudflare-docs": { "url": "https://docs.mcp.cloudflare.com/mcp" },
    "cloudflare-bindings": { "url": "https://bindings.mcp.cloudflare.com/mcp" },
    "cloudflare-builds": { "url": "https://builds.mcp.cloudflare.com/mcp" },
    "cloudflare-observability": { "url": "https://observability.mcp.cloudflare.com/mcp" },
    "cloudflare-radar": { "url": "https://radar.mcp.cloudflare.com/mcp" },
    "cloudflare-browser": { "url": "https://browser.mcp.cloudflare.com/mcp" },
    "cloudflare-ai-gateway": { "url": "https://ai-gateway.mcp.cloudflare.com/mcp" }
  }
}
```

---

## Authentication

### Custom Servers
- **Replicate**: Pow3r Pass credentials (automatic)
- **Gemini**: Pow3r Pass credentials (automatic)
- **Claude**: Pow3r Pass credentials (automatic)
- **Obsidian**: Pow3r Pass or request args

### Cloudflare Servers
- **OAuth**: Cloudflare account authentication (automatic on first use)

---

## Monitoring

### Health Endpoints

Each server provides health check via initialize endpoint:
- `POST /mcp/{server}/initialize` - Returns server info and capabilities

### Logging

All servers use structured logging via `src/logger.js`:
- Request ID tracking
- Error logging with context
- Service identification

---

## Deployment Commands

### Deploy to Production

```bash
npm run deploy:production
```

### Deploy to Staging

```bash
npm run deploy:staging
```

### View Logs

```bash
npm run tail:production
```

---

## Authentication

### Custom Servers
- **Replicate**: Pow3r Pass credentials
- **Gemini**: Pow3r Pass credentials
- **Claude**: Pow3r Pass credentials
- **GitHub**: Pow3r Pass credentials
- **ElevenLabs**: Pow3r Pass credentials
- **Mistral**: Pow3r Pass credentials
- **DeepSeek**: Pow3r Pass credentials
- **Qwen**: Pow3r Pass credentials
- **Obsidian**: Pow3r Pass or request args

### Cloudflare Servers
- **OAuth**: Cloudflare account authentication

---

## Support

For issues or questions:
- Check individual server documentation
- Review [MCP_CURSOR_SETUP.md](./MCP_CURSOR_SETUP.md)


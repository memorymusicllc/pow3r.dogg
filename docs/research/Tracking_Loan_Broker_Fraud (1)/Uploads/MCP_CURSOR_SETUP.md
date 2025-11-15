# Cursor MCP Setup Guide

**Configuration File**: `.cursor/mcp.json`

---

## Overview

This guide shows how to configure Cursor IDE to use all available MCP servers deployed on Cloudflare. Cursor can connect to multiple MCP servers simultaneously, giving you access to Replicate, Gemini, and Claude capabilities directly in your IDE.

---

## Quick Start

The configuration file `.cursor/mcp.json` is already set up in this repository. Cursor will automatically detect and connect to all configured MCP servers.

### Configuration File Location

```
.cursor/mcp.json
```

### Current Configuration

```json
{
  "mcpServers": {
    "replicate": {
      "url": "https://config.superbots.link/mcp/replicate/sse",
      "transport": "sse",
      "description": "Replicate MCP Server - Video and image generation"
    },
    "gemini": {
      "url": "https://config.superbots.link/mcp/gemini/sse",
      "transport": "sse",
      "description": "Gemini MCP Server - Google AI text, vision, and embeddings"
    },
    "claude": {
      "url": "https://config.superbots.link/mcp/claude/sse",
      "transport": "sse",
      "description": "Claude MCP Server - Anthropic Claude AI"
    }
  }
}
```

---

## Available MCP Servers

### 1. Replicate MCP Server

**URL**: `https://config.superbots.link/mcp/replicate/*`

**Capabilities**:
- Video generation (text-to-video)
- Image generation
- Model discovery
- Prediction management

**Tools Available**:
- `replicate_predictions_create` - Create predictions (generate videos/images)
- `replicate_predictions_get` - Get prediction status
- `replicate_models_list` - List available models
- `replicate_models_get` - Get model details

**Example Usage in Cursor**:
```
Use the replicate_messages_create tool to generate a video of "a sunset over mountains"
```

---

### 2. Gemini MCP Server

**URL**: `https://config.superbots.link/mcp/gemini/*`

**Capabilities**:
- Text generation
- Vision (image analysis)
- Embeddings
- Multi-turn conversations

**Tools Available**:
- `gemini_chat_complete` - Chat completions
- `gemini_models_list` - List models
- `gemini_model_get` - Get model details
- `gemini_generate_content` - Generate content
- `gemini_embed_content` - Generate embeddings

**Example Usage in Cursor**:
```
Use gemini_chat_complete to explain quantum computing
Use gemini_generate_content to write a haiku about AI
```

---

### 3. Claude MCP Server

**URL**: `https://config.superbots.link/mcp/claude/*`

**Capabilities**:
- Text generation
- Multi-turn conversations
- System prompts
- Long context (200k tokens)

**Tools Available**:
- `claude_messages_create` - Create messages (main API)
- `claude_models_list` - List models
- `claude_text_complete` - Text completion

**Example Usage in Cursor**:
```
Use claude_messages_create to help me write code
Use claude_text_complete to generate documentation
```

---

## Setup Instructions

### Automatic Setup (Recommended)

The `.cursor/mcp.json` file is already configured. Simply:

1. **Open Cursor IDE** in this repository
2. **Restart Cursor** if it's already running (to detect the new config)
3. **Verify Connection**: Check the MCP status in Cursor's settings

### Manual Setup

If you need to configure manually:

1. **Create `.cursor` directory** in your project root (if it doesn't exist)
2. **Create `mcp.json`** file with the configuration above
3. **Restart Cursor**

### Per-User Configuration

You can also configure MCP servers globally for your user:

**macOS**:
```
~/Library/Application Support/Cursor/User/globalStorage/mcp.json
```

**Windows**:
```
%APPDATA%\Cursor\User\globalStorage\mcp.json
```

**Linux**:
```
~/.config/Cursor/User/globalStorage/mcp.json
```

---

## Verification

### Check MCP Server Status

1. Open Cursor Settings
2. Navigate to **MCP** or **Extensions** section
3. You should see all three servers listed:
   - ✅ Replicate
   - ✅ Gemini
   - ✅ Claude

### Test Connection

In Cursor's chat, try:

```
@replicate List available video generation models
@gemini Explain quantum computing
@claude Write a haiku about coding
```

---

## Authentication

All MCP servers automatically retrieve credentials from Pow3r Pass. No manual API key configuration needed!

**Credentials are stored at**:
- `https://config.superbots.link/pass/credentials/{provider}`

**To update credentials**:
```bash
curl -X POST "https://config.superbots.link/pass/credentials/replicate" \
  -H "Content-Type: application/json" \
  -d '{"value": "your-api-key"}'
```

---

## Usage Examples

### Generate a Video

```
Use replicate_predictions_create to generate a video with prompt "a beautiful sunset over mountains, cinematic, 4K"
```

### Chat with Gemini

```
Use gemini_chat_complete with model "gemini-2.5-flash" and message "Explain how neural networks work"
```

### Get Code Help from Claude

```
Use claude_messages_create with system prompt "You are a helpful coding assistant" and message "How do I implement a binary search tree in Python?"
```

### Generate Embeddings

```
Use gemini_embed_content to generate embeddings for the text "Machine learning is fascinating"
```

---

## Troubleshooting

### MCP Servers Not Connecting

1. **Check Internet Connection**: MCP servers are hosted on Cloudflare
2. **Verify Credentials**: Ensure API keys are stored in Pow3r Pass
3. **Check Cursor Logs**: Look for connection errors in Cursor's developer console
4. **Restart Cursor**: Sometimes a restart is needed to detect new configs

### Authentication Errors

If you see authentication errors:

1. **Verify Credentials Exist**:
   ```bash
   curl https://config.superbots.link/pass/credentials/replicate
   curl https://config.superbots.link/pass/credentials/gemini
   curl https://config.superbots.link/pass/credentials/anthropic
   ```

2. **Store Missing Credentials**:
   ```bash
   curl -X POST "https://config.superbots.link/pass/credentials/{provider}" \
     -H "Content-Type: application/json" \
     -d '{"value": "your-api-key"}'
   ```

### SSE Connection Issues

If SSE streaming fails:

1. **Check Firewall**: Ensure port 443 (HTTPS) is open
2. **Try HTTP Fallback**: Some networks block SSE, but our servers support HTTP polling
3. **Check Cursor Version**: Ensure you're using a recent version of Cursor

---

## Advanced Configuration

### Custom Transport

You can use HTTP instead of SSE:

```json
{
  "mcpServers": {
    "replicate": {
      "url": "https://config.superbots.link/mcp/replicate",
      "transport": "http",
      "description": "Replicate MCP Server"
    }
  }
}
```

### Environment-Specific URLs

For different environments:

```json
{
  "mcpServers": {
    "replicate": {
      "url": "https://config-staging.superbots.link/mcp/replicate/sse",
      "transport": "sse",
      "description": "Replicate MCP Server (Staging)"
    }
  }
}
```

---

## MCP Server Endpoints Reference

### Replicate
- Initialize: `POST /mcp/replicate/initialize`
- Tools: `GET /mcp/replicate/tools/list`
- Call Tool: `POST /mcp/replicate/tools/call`
- SSE: `GET /mcp/replicate/sse`

### Gemini
- Initialize: `POST /mcp/gemini/initialize`
- Tools: `GET /mcp/gemini/tools/list`
- Call Tool: `POST /mcp/gemini/tools/call`
- SSE: `GET /mcp/gemini/sse`

### Claude
- Initialize: `POST /mcp/claude/initialize`
- Tools: `GET /mcp/claude/tools/list`
- Call Tool: `POST /mcp/claude/tools/call`
- SSE: `GET /mcp/claude/sse`

---

## Documentation Links

- [Replicate MCP Server Docs](./MCP_REPLICATE_SERVER.md)
- [Gemini MCP Server Docs](./MCP_GEMINI_SERVER.md)
- [Claude MCP Server Docs](./MCP_CLAUDE_SERVER.md)
- [Model Context Protocol Spec](https://modelcontextprotocol.io)

---

## Cloudflare MCP Servers

Cloudflare provides 15 managed MCP servers for various Cloudflare services. See [Cloudflare MCP Servers Documentation](./MCP_CLOUDFLARE_SERVERS.md) for details.

**Quick Add**: Copy servers from `configs/cloudflare-mcp-servers.json` to your `.cursor/mcp.json`.

**Popular Servers**:
- `cloudflare-docs` - Cloudflare documentation
- `cloudflare-workers` - Workers bindings management
- `cloudflare-observability` - Logs and analytics
- `cloudflare-radar` - Internet insights

**Note**: Cloudflare MCP servers use OAuth authentication. You'll be prompted to sign in with your Cloudflare account when first connecting.

---

## Status

✅ **Configuration**: Complete  
✅ **Servers**: All deployed and tested  
✅ **Documentation**: Complete  
✅ **Cloudflare MCPs**: Documented  
✅ **Ready**: For production use

---

## Support

For issues or questions:
1. Check the individual MCP server documentation
2. Review Cursor's MCP documentation
3. Check server status at `https://config.superbots.link`


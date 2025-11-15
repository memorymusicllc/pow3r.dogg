# Replicate MCP Server

**URL**: `https://config.superbots.link/mcp/replicate/*`  
**Version**: `1.0.0`

---

## Overview

The Replicate MCP (Model Context Protocol) server provides a standardized interface for AI agents to interact with Replicate's video and image generation capabilities. It implements the MCP protocol specification, enabling seamless integration with AI tools like Claude Desktop, Cursor, and VS Code.

**Reference**: [Replicate MCP Documentation](https://replicate.com/docs/reference/mcp)

---

## Features

- ✅ **MCP Protocol Compliance**: Full implementation of MCP protocol endpoints
- ✅ **Replicate Integration**: Direct access to Replicate API for video/image generation
- ✅ **Credential Management**: Automatic credential retrieval via Pow3r Pass
- ✅ **Tool Discovery**: List available tools, resources, and prompts
- ✅ **SSE Streaming**: Server-Sent Events support for real-time updates
- ✅ **CORS Support**: Full CORS headers for cross-origin access

---

## API Endpoints

### Initialize MCP Connection

```http
POST /mcp/replicate/initialize
```

Initialize the MCP server connection and get server capabilities.

**Response**:
```json
{
  "success": true,
  "data": {
    "name": "replicate-mcp-server",
    "version": "1.0.0",
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": { "subscribe": true, "listChanged": true },
      "prompts": { "listChanged": true }
    }
  }
}
```

---

### List Available Tools

```http
GET /mcp/replicate/tools/list
```

Get a list of all available MCP tools (Replicate operations).

**Available Tools**:
1. **`replicate_predictions_create`** - Create a new prediction (generate video/image)
2. **`replicate_predictions_get`** - Get prediction status and output
3. **`replicate_models_list`** - List available Replicate models
4. **`replicate_models_get`** - Get model details

**Response**:
```json
{
  "success": true,
  "data": {
    "tools": [
      {
        "name": "replicate_predictions_create",
        "description": "Create a new prediction on Replicate...",
        "inputSchema": { ... }
      },
      ...
    ]
  }
}
```

---

### Call a Tool

```http
POST /mcp/replicate/tools/call
Content-Type: application/json

{
  "name": "replicate_predictions_create",
  "arguments": {
    "version": "9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
    "input": {
      "prompt": "Lamborghini racing on Mars",
      "num_frames": 24,
      "fps": 8,
      "width": 1024,
      "height": 576
    }
  }
}
```

Execute an MCP tool with the provided arguments.

**Example: Create Video Prediction**:
```bash
curl -X POST "https://config.superbots.link/mcp/replicate/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "replicate_predictions_create",
    "arguments": {
      "version": "9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
      "input": {
        "prompt": "Lamborghini racing on Mars, cinematic, high speed",
        "num_frames": 24,
        "fps": 8
      }
    }
  }'
```

**Example: Get Prediction Status**:
```bash
curl -X POST "https://config.superbots.link/mcp/replicate/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "replicate_predictions_get",
    "arguments": {
      "prediction_id": "wv9cwng4v1rj00ctcgrscpnezm"
    }
  }'
```

**Example: List Models**:
```bash
curl -X POST "https://config.superbots.link/mcp/replicate/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "replicate_models_list",
    "arguments": {
      "collection": "text-to-video"
    }
  }'
```

---

### List Resources

```http
GET /mcp/replicate/resources/list
```

Get a list of available MCP resources.

**Response**:
```json
{
  "success": true,
  "data": {
    "resources": [
      {
        "uri": "replicate://models",
        "name": "Replicate Models",
        "description": "List of available Replicate models",
        "mimeType": "application/json"
      },
      {
        "uri": "replicate://predictions",
        "name": "Replicate Predictions",
        "description": "List of recent predictions",
        "mimeType": "application/json"
      }
    ]
  }
}
```

---

### List Prompts

```http
GET /mcp/replicate/prompts/list
```

Get a list of available MCP prompts (predefined prompt templates).

**Response**:
```json
{
  "success": true,
  "data": {
    "prompts": [
      {
        "name": "generate_video",
        "description": "Generate a video from a text prompt using Replicate",
        "arguments": [
          {
            "name": "prompt",
            "description": "Text description of the video to generate",
            "required": true
          }
        ]
      },
      {
        "name": "generate_image",
        "description": "Generate an image from a text prompt using Replicate",
        "arguments": [...]
      }
    ]
  }
}
```

---

### SSE Streaming

```http
GET /mcp/replicate/sse
```

Server-Sent Events endpoint for real-time updates.

**Response**: `text/event-stream` with connection status and ping messages.

---

## Integration with AI Tools

### Claude Desktop

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "replicate": {
      "url": "https://config.superbots.link/mcp/replicate/sse",
      "transport": "sse"
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "replicate": {
      "url": "https://config.superbots.link/mcp/replicate/sse",
      "transport": "sse"
    }
  }
}
```

### VS Code with GitHub Copilot

Add to `.vscode/mcp.json`:
```json
{
  "mcpServers": {
    "replicate": {
      "url": "https://config.superbots.link/mcp/replicate/sse",
      "transport": "sse"
    }
  }
}
```

---

## Authentication

The MCP server automatically retrieves Replicate credentials from Pow3r Pass. Ensure credentials are stored:

```bash
# Store Replicate API key
curl -X POST "https://config.superbots.link/pass/credentials/replicate" \
  -H "Content-Type: application/json" \
  -d '{"value": "r8_your_api_key_here"}'
```

Or use the populate script:
```bash
./scripts/populate-credentials.sh
```

---

## Example Workflow

### 1. Initialize Connection
```bash
curl -X POST "https://config.superbots.link/mcp/replicate/initialize"
```

### 2. List Available Tools
```bash
curl -X GET "https://config.superbots.link/mcp/replicate/tools/list"
```

### 3. Create Video Prediction
```bash
curl -X POST "https://config.superbots.link/mcp/replicate/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "replicate_predictions_create",
    "arguments": {
      "version": "9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
      "input": {
        "prompt": "Lamborghini racing on Mars",
        "num_frames": 24,
        "fps": 8
      }
    }
  }'
```

### 4. Poll for Completion
```bash
# Use the prediction ID from step 3
curl -X POST "https://config.superbots.link/mcp/replicate/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "replicate_predictions_get",
    "arguments": {
      "prediction_id": "wv9cwng4v1rj00ctcgrscpnezm"
    }
  }'
```

---

## Popular Replicate Models

### Text-to-Video
- **`google/veo-3.1`** - Google's Veo 3.1 (high quality, with audio)
- **`google/veo-3.1-fast`** - Faster version of Veo 3.1
- **`anotherjesse/zeroscope-v2-xl`** - Zeroscope V2 XL (open source)
- **`pixverse/pixverse-v5`** - PixVerse v5 (anime characters)
- **`wan-video/wan-2.5-t2v-fast`** - Wan 2.5 (fast, open source)

### Image-to-Video
- **`wan-video/wan-2.5-i2v-fast`** - Wan 2.5 image-to-video
- **`minimax/hailuo-2.3-fast`** - Hailuo 2.3 image-to-video

### Image Generation
- **`stability-ai/sdxl`** - Stable Diffusion XL
- **`black-forest-labs/flux`** - Flux model

---

## Error Handling

All errors include `aiGuidance` for AI agents:

```json
{
  "success": false,
  "error": {
    "message": "Authentication Required",
    "code": "MISSING_CREDENTIALS",
    "aiGuidance": {
      "issue": "Missing Replicate credentials",
      "solution": "Store credentials using Pow3r Pass API",
      "steps": [
        "1. Store credential: POST /pass/credentials/replicate",
        "2. Verify credential exists: GET /pass/credentials/replicate"
      ]
    }
  }
}
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│         AI Agent (Claude/Cursor)        │
└──────────────┬──────────────────────────┘
               │ MCP Protocol
               │ (SSE/HTTP)
               ▼
┌─────────────────────────────────────────┐
│    Replicate MCP Server (Cloudflare)    │
│    config.superbots.link/mcp/replicate  │
└──────────────┬──────────────────────────┘
               │
               ├──► Pow3r Pass (Credentials)
               │
               └──► Replicate API
                    api.replicate.com
```

---

## Testing

Test the MCP server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

Or use curl:

```bash
# Initialize
curl -X POST "https://config.superbots.link/mcp/replicate/initialize"

# List tools
curl -X GET "https://config.superbots.link/mcp/replicate/tools/list"

# Test tool call
curl -X POST "https://config.superbots.link/mcp/replicate/tools/call" \
  -H "Content-Type: application/json" \
  -d '{"name":"replicate_models_list","arguments":{}}'
```

---

## References

- [Replicate MCP Documentation](https://replicate.com/docs/reference/mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Cloudflare MCP Server Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [Replicate Text-to-Video Collection](https://replicate.com/collections/text-to-video)

---

## Status

✅ **Deployed**: Production  
✅ **Tested**: Basic endpoints verified  
✅ **Documentation**: Complete  
✅ **Integration**: Ready for AI tools


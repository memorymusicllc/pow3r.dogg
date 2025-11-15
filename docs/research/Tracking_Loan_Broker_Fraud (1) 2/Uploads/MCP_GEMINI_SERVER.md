# Gemini MCP Server

**URL**: `https://config.superbots.link/mcp/gemini/*`  
**Version**: `1.0.0`

---

## Overview

The Gemini MCP (Model Context Protocol) server provides a standardized interface for AI agents to interact with Google's Gemini AI capabilities. It implements the MCP protocol specification, enabling seamless integration with AI tools like Claude Desktop, Cursor, and VS Code.

---

## Features

- ✅ **MCP Protocol Compliance**: Full implementation of MCP protocol endpoints
- ✅ **Gemini Integration**: Direct access to Gemini API for text, vision, and embeddings
- ✅ **Credential Management**: Automatic credential retrieval via Pow3r Pass
- ✅ **Tool Discovery**: List available tools, resources, and prompts
- ✅ **SSE Streaming**: Server-Sent Events support for real-time updates
- ✅ **CORS Support**: Full CORS headers for cross-origin access
- ✅ **Multimodal Support**: Text, images, and embeddings

---

## API Endpoints

### Initialize MCP Connection

```http
POST /mcp/gemini/initialize
```

Initialize the MCP server connection and get server capabilities.

**Response**:
```json
{
  "success": true,
  "data": {
    "name": "gemini-mcp-server",
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
GET /mcp/gemini/tools/list
```

Get a list of all available MCP tools (Gemini operations).

**Available Tools**:
1. **`gemini_chat_complete`** - Generate chat completions with multi-turn conversations
2. **`gemini_models_list`** - List available Gemini models
3. **`gemini_model_get`** - Get model details
4. **`gemini_generate_content`** - Generate content (text/image/video)
5. **`gemini_embed_content`** - Generate embeddings for text

**Response**:
```json
{
  "success": true,
  "data": {
    "tools": [
      {
        "name": "gemini_chat_complete",
        "description": "Generate text completions using Gemini models...",
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
POST /mcp/gemini/tools/call
Content-Type: application/json

{
  "name": "gemini_chat_complete",
  "arguments": {
    "model": "gemini-pro",
    "messages": [
      {
        "role": "user",
        "content": "Hello! How are you?"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 2048
  }
}
```

Execute an MCP tool with the provided arguments.

**Example: Chat Completion**:
```bash
curl -X POST "https://config.superbots.link/mcp/gemini/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gemini_chat_complete",
    "arguments": {
      "model": "gemini-pro",
      "messages": [
        {"role": "user", "content": "Write a haiku about AI"}
      ],
      "temperature": 0.7
    }
  }'
```

**Example: List Models**:
```bash
curl -X POST "https://config.superbots.link/mcp/gemini/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gemini_models_list",
    "arguments": {
      "filter": "text"
    }
  }'
```

**Example: Generate Content**:
```bash
curl -X POST "https://config.superbots.link/mcp/gemini/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gemini_generate_content",
    "arguments": {
      "model": "gemini-pro",
      "prompt": "Explain quantum computing in simple terms"
    }
  }'
```

**Example: Generate Embeddings**:
```bash
curl -X POST "https://config.superbots.link/mcp/gemini/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gemini_embed_content",
    "arguments": {
      "model": "text-embedding-004",
      "content": "This is text to embed",
      "task_type": "RETRIEVAL_DOCUMENT"
    }
  }'
```

---

### List Resources

```http
GET /mcp/gemini/resources/list
```

Get a list of available MCP resources.

**Response**:
```json
{
  "success": true,
  "data": {
    "resources": [
      {
        "uri": "gemini://models",
        "name": "Gemini Models",
        "description": "List of available Gemini models",
        "mimeType": "application/json"
      },
      {
        "uri": "gemini://chat-history",
        "name": "Chat History",
        "description": "Recent chat conversations",
        "mimeType": "application/json"
      }
    ]
  }
}
```

---

### List Prompts

```http
GET /mcp/gemini/prompts/list
```

Get a list of available MCP prompts (predefined prompt templates).

**Response**:
```json
{
  "success": true,
  "data": {
    "prompts": [
      {
        "name": "chat_complete",
        "description": "Have a conversation with Gemini",
        "arguments": [
          {
            "name": "message",
            "description": "Your message to Gemini",
            "required": true
          }
        ]
      },
      {
        "name": "generate_text",
        "description": "Generate text content using Gemini",
        "arguments": [...]
      },
      {
        "name": "analyze_image",
        "description": "Analyze an image using Gemini Vision",
        "arguments": [...]
      },
      {
        "name": "generate_embedding",
        "description": "Generate embeddings for text",
        "arguments": [...]
      }
    ]
  }
}
```

---

### SSE Streaming

```http
GET /mcp/gemini/sse
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
    "gemini": {
      "url": "https://config.superbots.link/mcp/gemini/sse",
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
    "gemini": {
      "url": "https://config.superbots.link/mcp/gemini/sse",
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
    "gemini": {
      "url": "https://config.superbots.link/mcp/gemini/sse",
      "transport": "sse"
    }
  }
}
```

---

## Authentication

The MCP server automatically retrieves Gemini credentials from Pow3r Pass. Ensure credentials are stored:

```bash
# Store Gemini API key
curl -X POST "https://config.superbots.link/pass/credentials/gemini" \
  -H "Content-Type: application/json" \
  -d '{"value": "AIzaSy..."}'
```

Or use the populate script:
```bash
./scripts/populate-credentials.sh
```

---

## Available Gemini Models

### Text Models
- **`gemini-pro`** - Standard Gemini Pro model
- **`gemini-1.5-pro`** - Gemini 1.5 Pro (longer context)
- **`gemini-1.5-flash`** - Gemini 1.5 Flash (faster)

### Vision Models
- **`gemini-pro-vision`** - Gemini Pro with vision capabilities
- **`gemini-1.5-pro`** - Also supports vision

### Video Models
- **`veo-3.1-generate-preview`** - Veo 3.1 video generation

### Embedding Models
- **`text-embedding-004`** - Text embedding model

---

## Example Workflows

### 1. Initialize Connection
```bash
curl -X POST "https://config.superbots.link/mcp/gemini/initialize"
```

### 2. List Available Tools
```bash
curl -X GET "https://config.superbots.link/mcp/gemini/tools/list"
```

### 3. Chat Completion
```bash
curl -X POST "https://config.superbots.link/mcp/gemini/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gemini_chat_complete",
    "arguments": {
      "model": "gemini-pro",
      "messages": [
        {"role": "user", "content": "Hello!"}
      ]
    }
  }'
```

### 4. Multi-turn Conversation
```bash
# First message
curl -X POST "https://config.superbots.link/mcp/gemini/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gemini_chat_complete",
    "arguments": {
      "model": "gemini-pro",
      "messages": [
        {"role": "user", "content": "My name is Alice"}
      ]
    }
  }'

# Follow-up message (include previous messages)
curl -X POST "https://config.superbots.link/mcp/gemini/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gemini_chat_complete",
    "arguments": {
      "model": "gemini-pro",
      "messages": [
        {"role": "user", "content": "My name is Alice"},
        {"role": "assistant", "content": "Hello Alice! Nice to meet you."},
        {"role": "user", "content": "What is my name?"}
      ]
    }
  }'
```

### 5. Generate Embeddings
```bash
curl -X POST "https://config.superbots.link/mcp/gemini/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gemini_embed_content",
    "arguments": {
      "model": "text-embedding-004",
      "content": "This is the text to embed",
      "task_type": "RETRIEVAL_DOCUMENT"
    }
  }'
```

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
      "issue": "Missing Gemini credentials",
      "solution": "Store credentials using Pow3r Pass API",
      "steps": [
        "1. Store credential: POST /pass/credentials/gemini",
        "2. Verify credential exists: GET /pass/credentials/gemini"
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
│    Gemini MCP Server (Cloudflare)       │
│    config.superbots.link/mcp/gemini     │
└──────────────┬──────────────────────────┘
               │
               ├──► Pow3r Pass (Credentials)
               │
               └──► Gemini API
                    generativelanguage.googleapis.com
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
curl -X POST "https://config.superbots.link/mcp/gemini/initialize"

# List tools
curl -X GET "https://config.superbots.link/mcp/gemini/tools/list"

# Test chat completion
curl -X POST "https://config.superbots.link/mcp/gemini/tools/call" \
  -H "Content-Type: application/json" \
  -d '{"name":"gemini_chat_complete","arguments":{"model":"gemini-pro","messages":[{"role":"user","content":"Hello"}]}}'
```

---

## References

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Cloudflare MCP Server Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)

---

## Status

✅ **Deployed**: Production  
✅ **Tested**: Basic endpoints verified  
✅ **Documentation**: Complete  
✅ **Integration**: Ready for AI tools


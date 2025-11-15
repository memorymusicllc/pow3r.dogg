# Claude MCP Server

**URL**: `https://config.superbots.link/mcp/claude/*`  
**Version**: `1.0.0`

---

## Overview

The Claude MCP (Model Context Protocol) server provides a standardized interface for AI agents to interact with Anthropic's Claude AI capabilities. It implements the MCP protocol specification, enabling seamless integration with AI tools like Claude Desktop, Cursor, and VS Code.

---

## Features

- ✅ **MCP Protocol Compliance**: Full implementation of MCP protocol endpoints
- ✅ **Claude Integration**: Direct access to Anthropic Claude API for text generation
- ✅ **Credential Management**: Automatic credential retrieval via Pow3r Pass
- ✅ **Tool Discovery**: List available tools, resources, and prompts
- ✅ **SSE Streaming**: Server-Sent Events support for real-time updates
- ✅ **CORS Support**: Full CORS headers for cross-origin access
- ✅ **Multi-turn Conversations**: Support for conversation history
- ✅ **System Prompts**: Configure Claude's behavior and personality

---

## API Endpoints

### Initialize MCP Connection

```http
POST /mcp/claude/initialize
```

Initialize the MCP server connection and get server capabilities.

**Response**:
```json
{
  "success": true,
  "data": {
    "name": "claude-mcp-server",
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
GET /mcp/claude/tools/list
```

Get a list of all available MCP tools (Claude operations).

**Available Tools**:
1. **`claude_messages_create`** - Create messages with Claude (main API, supports multi-turn conversations)
2. **`claude_models_list`** - List available Claude models
3. **`claude_text_complete`** - Generate text completions (simplified interface)

**Response**:
```json
{
  "success": true,
  "data": {
    "tools": [
      {
        "name": "claude_messages_create",
        "description": "Create a message with Claude...",
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
POST /mcp/claude/tools/call
Content-Type: application/json

{
  "name": "claude_messages_create",
  "arguments": {
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {
        "role": "user",
        "content": "Hello! How are you?"
      }
    ],
    "system": "You are a helpful assistant.",
    "max_tokens": 4096,
    "temperature": 0.7
  }
}
```

Execute an MCP tool with the provided arguments.

**Example: Simple Message**:
```bash
curl -X POST "https://config.superbots.link/mcp/claude/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude_messages_create",
    "arguments": {
      "model": "claude-3-5-sonnet-20241022",
      "messages": [
        {"role": "user", "content": "Write a haiku about AI"}
      ],
      "temperature": 0.7
    }
  }'
```

**Example: Multi-turn Conversation**:
```bash
curl -X POST "https://config.superbots.link/mcp/claude/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude_messages_create",
    "arguments": {
      "model": "claude-3-5-sonnet-20241022",
      "messages": [
        {"role": "user", "content": "My name is Alice"},
        {"role": "assistant", "content": "Hello Alice! Nice to meet you."},
        {"role": "user", "content": "What is my name?"}
      ]
    }
  }'
```

**Example: With System Prompt**:
```bash
curl -X POST "https://config.superbots.link/mcp/claude/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude_messages_create",
    "arguments": {
      "model": "claude-3-5-sonnet-20241022",
      "system": "You are a helpful coding assistant. Always provide code examples.",
      "messages": [
        {"role": "user", "content": "How do I sort an array in JavaScript?"}
      ]
    }
  }'
```

**Example: Text Complete (Simplified)**:
```bash
curl -X POST "https://config.superbots.link/mcp/claude/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude_text_complete",
    "arguments": {
      "prompt": "Explain quantum computing in simple terms",
      "model": "claude-3-5-sonnet-20241022"
    }
  }'
```

**Example: List Models**:
```bash
curl -X POST "https://config.superbots.link/mcp/claude/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude_models_list",
    "arguments": {}
  }'
```

---

### List Resources

```http
GET /mcp/claude/resources/list
```

Get a list of available MCP resources.

**Response**:
```json
{
  "success": true,
  "data": {
    "resources": [
      {
        "uri": "claude://models",
        "name": "Claude Models",
        "description": "List of available Claude models",
        "mimeType": "application/json"
      },
      {
        "uri": "claude://conversations",
        "name": "Conversations",
        "description": "Recent conversations with Claude",
        "mimeType": "application/json"
      }
    ]
  }
}
```

---

### List Prompts

```http
GET /mcp/claude/prompts/list
```

Get a list of available MCP prompts (predefined prompt templates).

**Response**:
```json
{
  "success": true,
  "data": {
    "prompts": [
      {
        "name": "chat",
        "description": "Have a conversation with Claude",
        "arguments": [
          {
            "name": "message",
            "description": "Your message to Claude",
            "required": true
          },
          {
            "name": "model",
            "description": "Model to use",
            "required": false
          }
        ]
      },
      {
        "name": "complete_text",
        "description": "Generate text completion using Claude",
        "arguments": [...]
      },
      {
        "name": "multi_turn_conversation",
        "description": "Continue a multi-turn conversation with Claude",
        "arguments": [...]
      }
    ]
  }
}
```

---

### SSE Streaming

```http
GET /mcp/claude/sse
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
    "claude": {
      "url": "https://config.superbots.link/mcp/claude/sse",
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
    "claude": {
      "url": "https://config.superbots.link/mcp/claude/sse",
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
    "claude": {
      "url": "https://config.superbots.link/mcp/claude/sse",
      "transport": "sse"
    }
  }
}
```

---

## Authentication

The MCP server automatically retrieves Anthropic credentials from Pow3r Pass. Ensure credentials are stored:

```bash
# Store Anthropic API key
curl -X POST "https://config.superbots.link/pass/credentials/anthropic" \
  -H "Content-Type: application/json" \
  -d '{"value": "sk-ant-..."}'
```

Or use the populate script:
```bash
./scripts/populate-credentials.sh
```

---

## Available Claude Models

### Current Models
- **`claude-3-5-sonnet-20241022`** - Claude 3.5 Sonnet (recommended, most capable)
- **`claude-3-opus-20240229`** - Claude 3 Opus (most powerful)
- **`claude-3-sonnet-20240229`** - Claude 3 Sonnet (balanced)
- **`claude-3-haiku-20240307`** - Claude 3 Haiku (fastest, most cost-effective)

### Model Capabilities
- **Context Window**: 200,000 tokens for all models
- **Max Output**: 4,096 tokens (8,192 for Claude 3.5 Sonnet)
- **Multimodal**: Text input/output (no vision in current API)

---

## Example Workflows

### 1. Initialize Connection
```bash
curl -X POST "https://config.superbots.link/mcp/claude/initialize"
```

### 2. Simple Chat
```bash
curl -X POST "https://config.superbots.link/mcp/claude/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude_messages_create",
    "arguments": {
      "model": "claude-3-5-sonnet-20241022",
      "messages": [
        {"role": "user", "content": "Hello!"}
      ]
    }
  }'
```

### 3. Multi-turn Conversation
```bash
# First message
RESPONSE=$(curl -s -X POST "https://config.superbots.link/mcp/claude/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude_messages_create",
    "arguments": {
      "model": "claude-3-5-sonnet-20241022",
      "messages": [
        {"role": "user", "content": "My name is Alice"}
      ]
    }
  }')

# Extract assistant response and continue conversation
# (In practice, you'd parse the response and include it in the next request)
```

### 4. With System Prompt
```bash
curl -X POST "https://config.superbots.link/mcp/claude/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude_messages_create",
    "arguments": {
      "model": "claude-3-5-sonnet-20241022",
      "system": "You are a helpful coding assistant. Always provide clear explanations and code examples.",
      "messages": [
        {"role": "user", "content": "How do I reverse a string in Python?"}
      ]
    }
  }'
```

### 5. Text Completion (Simplified)
```bash
curl -X POST "https://config.superbots.link/mcp/claude/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude_text_complete",
    "arguments": {
      "prompt": "The future of AI is",
      "model": "claude-3-5-sonnet-20241022",
      "max_tokens": 100
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
      "issue": "Missing Anthropic credentials",
      "solution": "Store credentials using Pow3r Pass API",
      "steps": [
        "1. Store credential: POST /pass/credentials/anthropic",
        "2. Verify credential exists: GET /pass/credentials/anthropic"
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
│    Claude MCP Server (Cloudflare)       │
│    config.superbots.link/mcp/claude     │
└──────────────┬──────────────────────────┘
               │
               ├──► Pow3r Pass (Credentials)
               │
               └──► Anthropic API
                    api.anthropic.com
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
curl -X POST "https://config.superbots.link/mcp/claude/initialize"

# List tools
curl -X GET "https://config.superbots.link/mcp/claude/tools/list"

# Test message creation
curl -X POST "https://config.superbots.link/mcp/claude/tools/call" \
  -H "Content-Type: application/json" \
  -d '{"name":"claude_messages_create","arguments":{"model":"claude-3-5-sonnet-20241022","messages":[{"role":"user","content":"Hello"}]}}'
```

---

## References

- [Anthropic API Documentation](https://docs.anthropic.com)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Cloudflare MCP Server Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)

---

## Status

✅ **Deployed**: Production  
✅ **Tested**: Basic endpoints verified  
✅ **Documentation**: Complete  
✅ **Integration**: Ready for AI tools


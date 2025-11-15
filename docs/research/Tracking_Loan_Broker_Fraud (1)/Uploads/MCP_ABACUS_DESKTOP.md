# Abacus AI Desktop MCP

**Reference**: [Abacus AI Desktop MCP Documentation](https://abacus.ai/help/howTo/chatllm/deepagent_desktop_how_to/deepagent_desktop_mcp)  
**Type**: MCP Client Application (Desktop)

---

## Overview

Abacus AI Desktop is a desktop application that integrates with MCP (Model Context Protocol) servers to provide AI-powered desktop automation and real-world context. It acts as an MCP client, similar to Cursor or Claude Desktop, allowing you to connect multiple MCP servers and use them through a unified AI assistant interface.

The application enables your AI assistant to:
- Read and update live documents
- Push code to GitHub
- Manage desktop applications
- Query databases
- Automate system tasks
- Trigger workflows
- Connect to external tools and APIs

---

## What is MCP?

**Model Context Protocol (MCP)** is an open standard that lets Abacus AI Desktop connect with external tools, APIs, databases, and services through a structured interface. It enables the AI assistant to see, act, and reason beyond static context, providing real-time memory extensions for your AI desktop assistant.

---

## Features

- ✅ **Real-Time Context**: Feed live data from your tools directly into Abacus AI Desktop
- ✅ **Actionable Desktop Automation**: Let your agent take action — push commits, run scripts, manage applications, or hit APIs — all through secure tool calls
- ✅ **Custom Desktop Workflows**: Tailor the AI to match your team's exact desktop workflow, using internal tools or 3rd-party integrations
- ✅ **Human-in-the-Loop**: All actions require approval before execution
- ✅ **Multiple MCP Servers**: Support for connecting multiple MCP servers simultaneously
- ✅ **Transport Support**: Supports both Stdio (local) and SSE (remote) transport types

---

## Setting Up MCP Servers in Abacus AI Desktop

### 1. Access MCP Configuration

1. Navigate to Abacus AI Desktop's **Settings** in the top right corner on the sidebar by clicking the gear icon
2. Click on the **MCP settings tab** on the left section of the settings page

### 2. Add a New MCP Server

1. Click the **plus button** to add a new server
2. Choose the type of MCP server to add:
   - **Stdio** (Standard Input/Output): For local servers
   - **SSE** (Server-Sent Events): For remote servers
3. Enter the URL, name, and select whether the server is workspace- or user-based

### 3. Configure Server Details

Configure the MCP server JSON based on its transport type:

#### Stdio (Local Servers)

For local servers, provide the required parameters (`command`, `args`, `env`, etc.):

```json
{
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-github"
  ],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
  }
}
```

#### SSE (Remote Servers)

For remote servers, provide the server URL and other optional parameters:

```json
{
  "url": "http://example.com:8000/sse"
}
```

### 4. Example Configuration

The example below shows the JSON configuration for two MCP servers: GitHub and Google Tasks.

```json
{
  "mcp.servers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    },
    "google_tasks": {
      "url": "<REMOTE_SERVER_URL>"
    }
  }
}
```

**Important Notes**:
- Each server config JSON starts with the server name (`"github"`, `"google_tasks"`)
- Multiple server configurations are separated by a comma
- When copying configs from other platforms, include only the server configuration JSON, not wrapper structures

### 5. Test the Connection

- Go to the MCP Settings page to check the status of the servers
- Check the badge next to the server:
  - **Green** = Active
  - **Red** = Error
  - **Grey** = Inactive

---

## Using MCPs with the Desktop Agent

Once your server is active, you can ask the agent to perform desktop automation tasks like:

- _"Push my latest code to GitHub and update the project documentation"_
- _"Scrape this website and update my local database"_
- _"Trigger CI/CD pipeline and monitor the build status"_
- _"Automate my daily desktop workflow with these applications"_

Abacus AI Desktop will:
1. Look up the available MCP tools
2. Propose a tool call
3. Ask you to approve (Human-in-the-Loop)
4. Execute the task via the server

You stay in control. The AI never acts without your go-ahead.

---

## Integration with pow3r.config MCP Servers

Abacus AI Desktop can connect to any of the MCP servers documented in this repository. Here are examples for connecting to pow3r.config servers:

### Cloudflare MCP Servers

```json
{
  "mcp.servers": {
    "cloudflare-docs": {
      "url": "https://docs.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-workers": {
      "url": "https://bindings.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    },
    "cloudflare-observability": {
      "url": "https://observability.mcp.cloudflare.com/mcp",
      "transport": "streamable-http"
    }
  }
}
```

### Google Cloud MCP Servers

```json
{
  "mcp.servers": {
    "gcloud": {
      "command": "npx",
      "args": ["-y", "@google-cloud/gcloud-mcp"]
    },
    "cloud-run": {
      "command": "npx",
      "args": ["-y", "@google-cloud/cloud-run-mcp"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "my-project-id",
        "GOOGLE_CLOUD_REGION": "us-central1"
      }
    }
  }
}
```

### pow3r.config API Servers

```json
{
  "mcp.servers": {
    "pow3r-replicate": {
      "url": "https://config.superbots.link/mcp/replicate/sse",
      "transport": "sse"
    },
    "pow3r-gemini": {
      "url": "https://config.superbots.link/mcp/gemini/sse",
      "transport": "sse"
    },
    "pow3r-claude": {
      "url": "https://config.superbots.link/mcp/claude/sse",
      "transport": "sse"
    }
  }
}
```

---

## Finding MCP Servers

Explore trusted MCP server directories at:
- [Zapier MCP Directory](https://zapier.com/mcp)
- [GitHub MCP Repositories](https://github.com/modelcontextprotocol/servers)

These directories guide you through getting the required API keys or tokens to activate each tool.

---

## Best Practices

### Security First

- Only use MCP servers from trusted sources
- Always enable authentication (OAuth, API keys, PATs)
- Follow the principle of least privilege — give only required access
- Be especially careful with desktop automation permissions

### Clear Server Setup

- Every MCP server must:
  - Have a unique name
  - Follow the expected config JSON format
  - Be tested before use in production workflows

### Performance

- Limit the number of tools to ensure better performance
- Avoid overwhelming the LLM with too much context
- Use only the servers you actually need

---

## Troubleshooting

### Why isn't my MCP server connecting?

1. **Verify Configuration**:
   - Ensure the command or URL in config JSON is correct
   - Verify the JSON format matches the example config
   - Check that the server is running

2. **Common Mistakes**:
   - Copying sample config without replacing placeholder values (e.g., `<YOUR_TOKEN>`)
   - Missing required authentication parameters (access tokens)
   - Including wrapper structures when copying configs

   **Example of incorrect config**:
   ```json
   {
     "github": {
       "command": "npx",
       "args": ["-y", "@modelcontextprotocol/server-github"],
       "env": {
         "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"  // ❌ Placeholder not replaced
       }
     }
   }
   ```

   **Correct config**:
   ```json
   {
     "github": {
       "command": "npx",
       "args": ["-y", "@modelcontextprotocol/server-github"],
       "env": {
         "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"  // ✅ Valid token
       }
     }
   }
   ```

3. **Wrapper Structure Issue**:
   Some platforms wrap the JSON config. When copying, include only the server configuration JSON, not the wrapper:

   **Don't copy this**:
   ```json
   {
     "mcpServers": {
       <your server config json>
     }
   }
   ```

   **Copy only this**:
   ```json
   {
     <your server config json>
   }
   ```

### Can I use multiple MCP servers?

Yes, Abacus AI Desktop supports adding multiple MCP servers, and there is no hard limit on the number of tools you can connect across them. However, the effective limit may depend on the language model (LLM) being used by the agent.

As a best practice, limit the number of tools to ensure better performance and avoid overwhelming the LLM with too much context.

### How do I secure my MCP connections?

- Use MCP servers from trusted sources only
- Follow OAuth authentication in remote servers
- For desktop automation, be especially careful about:
  - File system access permissions
  - Application control permissions
  - Network access restrictions
  - User data privacy

---

## Use Cases

### Development Workflow Automation

- Push code to GitHub automatically
- Run tests and CI/CD pipelines
- Update project documentation
- Manage pull requests and issues

### Data Management

- Query databases in real-time
- Update local databases
- Scrape websites and process data
- Manage file systems

### Application Management

- Control desktop applications
- Automate daily workflows
- Monitor system resources
- Manage configurations

### Integration Tasks

- Connect to external APIs
- Trigger webhooks
- Process web data
- Manage cloud resources

---

## Comparison with Other MCP Clients

| Feature | Abacus AI Desktop | Cursor | Claude Desktop |
|---------|------------------|--------|----------------|
| Desktop Automation | ✅ | ✅ | ❌ |
| Multiple Servers | ✅ | ✅ | ✅ |
| Human-in-the-Loop | ✅ | ✅ | ✅ |
| Workspace/User Scope | ✅ | ✅ | ✅ |
| Transport Types | Stdio, SSE | Stdio, SSE, HTTP | Stdio, SSE |

---

## References

- [Abacus AI Desktop MCP Documentation](https://abacus.ai/help/howTo/chatllm/deepagent_desktop_how_to/deepagent_desktop_mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [MCP Server Directory](https://github.com/modelcontextprotocol/servers)
- [Zapier MCP Directory](https://zapier.com/mcp)

---

## Support

For further assistance with Abacus AI Desktop MCP integration, please contact:
- **Email**: support@abacus.ai
- **Documentation**: [Abacus AI Help Center](https://abacus.ai/help)

---

## Status

✅ **Available**: Abacus AI Desktop supports MCP servers  
✅ **Transport**: Stdio and SSE supported  
✅ **Documentation**: Complete  
✅ **Integration**: Ready for all MCP-compliant servers


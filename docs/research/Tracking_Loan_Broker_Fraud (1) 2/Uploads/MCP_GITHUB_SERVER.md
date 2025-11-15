# GitHub MCP Server

**URL**: `https://config.superbots.link/mcp/github/*`  
**Version**: `1.0.0`  
**Reference**: [GitHub MCP Server](https://github.com/github/github-mcp-server)

---

## Overview

The GitHub MCP (Model Context Protocol) server provides a standardized interface for AI agents to interact with GitHub repositories, issues, pull requests, and branch protection rules. It implements the MCP protocol specification, enabling seamless integration with AI tools like Cursor, Claude Desktop, and Abi orchestrator.

**Key Feature**: Enables Abi to autonomously configure Guardian System branch protection rules across 50+ repositories.

---

## Features

- ✅ **MCP Protocol Compliance**: Full implementation of MCP protocol endpoints
- ✅ **GitHub API Integration**: Direct access to GitHub REST API v3
- ✅ **Credential Management**: Automatic credential retrieval via Pow3r Pass
- ✅ **Branch Protection**: Configure and manage branch protection rules
- ✅ **Guardian Authorization**: Only Abi or User can modify Guardian rules
- ✅ **Tool Discovery**: List available tools, resources, and prompts
- ✅ **SSE Streaming**: Server-Sent Events support for real-time updates
- ✅ **CORS Support**: Full CORS headers for cross-origin access

---

## API Endpoints

### Initialize MCP Connection

```http
POST /mcp/github/initialize
```

Initialize the MCP server connection and get server capabilities.

**Response**:
```json
{
  "success": true,
  "data": {
    "name": "github-mcp-server",
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
GET /mcp/github/tools/list
```

Get a list of all available MCP tools (GitHub operations).

**Available Tools** (22 tools):

**Repositories**:
1. `github_list_repositories` - List repositories for authenticated user
2. `github_list_org_repositories` - List repositories for an organization
3. `github_get_repository` - Get repository details
4. `github_search_repositories` - Search repositories

**Branch Protection** (Guardian System):
5. `github_get_branch_protection` - Get branch protection rules
6. `github_update_branch_protection` - Update branch protection rules (Abi/User only)

**Branches**:
7. `github_list_branches` - List repository branches
8. `github_create_branch` - Create a new branch

**Issues**:
9. `github_list_issues` - List repository issues
10. `github_get_issue` - Get issue details
11. `github_create_issue` - Create a new issue
12. `github_update_issue` - Update an issue
13. `github_add_issue_comment` - Add comment to issue

**Pull Requests**:
14. `github_list_pull_requests` - List pull requests
15. `github_get_pull_request` - Get pull request details
16. `github_create_pull_request` - Create a pull request

**Files**:
17. `github_get_file_contents` - Get file contents
18. `github_create_or_update_file` - Create or update file

**Commits**:
19. `github_list_commits` - List commits
20. `github_get_commit` - Get commit details

**Search**:
21. `github_search_code` - Search code
22. `github_search_issues` - Search issues and PRs

**User**:
23. `github_get_user` - Get user information

---

### Call a Tool

```http
POST /mcp/github/tools/call
Content-Type: application/json

{
  "name": "github_update_branch_protection",
  "arguments": {
    "owner": "memorymusicllc",
    "repo": "pow3r.abi",
    "branch": "main",
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "validate / Gate 1 - Schema Validation (v4)",
        "validate / Gate 2 - Mock Code Scan",
        "validate / Gate 3 - Full Test Suite",
        "validate / Gate 5 - Configuration Integrity",
        "validate / Gate 6 - Constitutional Compliance (v4)"
      ]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true
    },
    "allow_force_pushes": false,
    "allow_deletions": false,
    "required_conversation_resolution": true
  }
}
```

**Authorization Headers Required** (for `github_update_branch_protection`):
- **Abi-initiated**: `X-Abi-Orchestrator` + `X-User-Approval-Token`
- **User-initiated**: `X-User-Token`

---

## Branch Protection Tools

### Get Branch Protection

**Tool**: `github_get_branch_protection`

**Example**:
```bash
curl -X POST "https://config.superbots.link/mcp/github/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "github_get_branch_protection",
    "arguments": {
      "owner": "memorymusicllc",
      "repo": "pow3r.abi",
      "branch": "main"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "content": [{
      "type": "text",
      "text": "{\"url\":\"...\",\"required_status_checks\":{...},\"enforce_admins\":true,...}"
    }],
    "isError": false
  }
}
```

---

### Update Branch Protection (Guardian System)

**Tool**: `github_update_branch_protection`

**CRITICAL**: Only Abi or User can modify Guardian rules.

**Authorization**:
- **Abi**: Must include `X-Abi-Orchestrator` header and `X-User-Approval-Token`
- **User**: Must include `X-User-Token` header

**Example - Abi-initiated**:
```bash
curl -X POST "https://config.superbots.link/mcp/github/tools/call" \
  -H "Content-Type: application/json" \
  -H "X-Abi-Orchestrator: <abi-token>" \
  -H "X-User-Approval-Token: <approval-token>" \
  -d '{
    "name": "github_update_branch_protection",
    "arguments": {
      "owner": "memorymusicllc",
      "repo": "pow3r.abi",
      "branch": "main",
      "required_status_checks": {
        "strict": true,
        "contexts": [
          "validate / Gate 1 - Schema Validation (v4)",
          "validate / Gate 2 - Mock Code Scan",
          "validate / Gate 3 - Full Test Suite",
          "validate / Gate 5 - Configuration Integrity",
          "validate / Gate 6 - Constitutional Compliance (v4)"
        ]
      },
      "enforce_admins": true,
      "required_pull_request_reviews": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews": true
      },
      "allow_force_pushes": false,
      "allow_deletions": false,
      "required_conversation_resolution": true
    }
  }'
```

**Example - User-initiated**:
```bash
curl -X POST "https://config.superbots.link/mcp/github/tools/call" \
  -H "Content-Type: application/json" \
  -H "X-User-Token: <user-token>" \
  -d '{
    "name": "github_update_branch_protection",
    "arguments": {
      "owner": "memorymusicllc",
      "repo": "pow3r.abi",
      "branch": "main",
      "required_status_checks": {
        "strict": true,
        "contexts": ["validate / Gate 1 - Schema Validation (v4)"]
      },
      "allow_force_pushes": false,
      "allow_deletions": false
    }
  }'
```

**Guardian Requirements** (enforced):
- `allow_force_pushes`: Must be `false`
- `allow_deletions`: Must be `false`
- `enforce_admins`: Should be `true` (recommended)

**Unauthorized Response**:
```json
{
  "success": false,
  "error": {
    "message": "Unauthorized",
    "code": "GUARDIAN_AUTHORIZATION_REQUIRED",
    "details": "Only Abi or User can modify Guardian rules",
    "aiGuidance": {
      "issue": "Unauthorized attempt to modify Guardian rules",
      "solution": "Request must be from Abi (with user approval) or User",
      "steps": [
        "For Abi: Include X-Abi-Orchestrator header and X-User-Approval-Token",
        "For User: Include X-User-Token header"
      ]
    }
  }
}
```

---

## Repository Discovery

### List Organization Repositories

**Tool**: `github_list_org_repositories`

**Example**:
```bash
curl -X POST "https://config.superbots.link/mcp/github/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "github_list_org_repositories",
    "arguments": {
      "org": "memorymusicllc",
      "type": "all",
      "per_page": 100
    }
  }'
```

**Use Case**: Discover all pow3r ecosystem repositories for batch Guardian configuration.

---

## Authentication

The MCP server automatically retrieves GitHub credentials from Pow3r Pass. Ensure credentials are stored:

```bash
# Store GitHub token
curl -X POST "https://config.superbots.link/pass/credentials/github" \
  -H "Content-Type: application/json" \
  -d '{"value": "github_pat_..."}'
```

**Token Requirements**:
- `repo` scope (full repository access)
- `admin:repo_hook` (for branch protection)

---

## Integration with Abi

### Cursor Configuration

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "github": {
      "url": "https://config.superbots.link/mcp/github/sse",
      "transport": "sse",
      "description": "GitHub MCP Server - Repository and branch protection management"
    }
  }
}
```

### Abi Orchestrator Integration

Abi can use GitHub MCP Server to:

1. **Discover Repositories**:
   ```typescript
   // List all pow3r repositories
   const repos = await callGitHubMCPTool('github_list_org_repositories', {
     org: 'memorymusicllc',
     type: 'all',
     per_page: 100
   });
   ```

2. **Configure Branch Protection**:
   ```typescript
   // Configure Guardian rules
   await callGitHubMCPTool('github_update_branch_protection', {
     owner: 'memorymusicllc',
     repo: 'pow3r.abi',
     branch: 'main',
     required_status_checks: {
       strict: true,
       contexts: [
         'validate / Gate 1 - Schema Validation (v4)',
         'validate / Gate 2 - Mock Code Scan',
         'validate / Gate 3 - Full Test Suite',
         'validate / Gate 5 - Configuration Integrity',
         'validate / Gate 6 - Constitutional Compliance (v4)'
       ]
     },
     enforce_admins: true,
     required_pull_request_reviews: {
       required_approving_review_count: 1,
       dismiss_stale_reviews: true
     },
     allow_force_pushes: false,
     allow_deletions: false,
     required_conversation_resolution: true
   });
   ```

---

## Security & Authorization

### Guardian Rule Modifications

**CRITICAL**: Only Abi or User can configure or modify Guardian rules on GitHub.

**Authorization Methods**:

1. **Abi-Initiated**:
   - Header: `X-Abi-Orchestrator` (Abi service token)
   - Header: `X-User-Approval-Token` (User approval token)
   - System verifies Abi identity
   - System validates user approval
   - Request proceeds with audit logging

2. **User-Initiated**:
   - Header: `X-User-Token` (User authentication token)
   - System verifies user identity
   - Request proceeds immediately with audit logging

3. **Unauthorized**:
   - Request rejected with 403 Forbidden
   - Attempt logged for security review
   - Alert sent to administrators

### Audit Logging

All Guardian rule modifications are logged:
- **WHO**: Abi or User identity
- **WHAT**: Configuration changes
- **WHEN**: Timestamp
- **WHY**: Reason/approval reference
- **WHERE**: Repository affected

---

## Example Workflows

### 1. Discover All Pow3r Repositories

```bash
curl -X POST "https://config.superbots.link/mcp/github/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "github_list_org_repositories",
    "arguments": {
      "org": "memorymusicllc",
      "type": "all",
      "per_page": 100
    }
  }'
```

### 2. Get Current Branch Protection

```bash
curl -X POST "https://config.superbots.link/mcp/github/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "github_get_branch_protection",
    "arguments": {
      "owner": "memorymusicllc",
      "repo": "pow3r.abi",
      "branch": "main"
    }
  }'
```

### 3. Configure Guardian Branch Protection

```bash
curl -X POST "https://config.superbots.link/mcp/github/tools/call" \
  -H "Content-Type: application/json" \
  -H "X-Abi-Orchestrator: <token>" \
  -H "X-User-Approval-Token: <approval>" \
  -d '{
    "name": "github_update_branch_protection",
    "arguments": {
      "owner": "memorymusicllc",
      "repo": "pow3r.abi",
      "branch": "main",
      "required_status_checks": {
        "strict": true,
        "contexts": [
          "validate / Gate 1 - Schema Validation (v4)",
          "validate / Gate 2 - Mock Code Scan",
          "validate / Gate 3 - Full Test Suite",
          "validate / Gate 5 - Configuration Integrity",
          "validate / Gate 6 - Constitutional Compliance (v4)"
        ]
      },
      "enforce_admins": true,
      "required_pull_request_reviews": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews": true
      },
      "allow_force_pushes": false,
      "allow_deletions": false,
      "required_conversation_resolution": true
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
    "message": "Unauthorized",
    "code": "GUARDIAN_AUTHORIZATION_REQUIRED",
    "aiGuidance": {
      "issue": "Unauthorized attempt to modify Guardian rules",
      "solution": "Request must be from Abi (with user approval) or User",
      "steps": [
        "For Abi: Include X-Abi-Orchestrator header and X-User-Approval-Token",
        "For User: Include X-User-Token header"
      ]
    }
  }
}
```

---

## Rate Limiting

GitHub API rate limits apply:
- **Authenticated**: 5,000 requests/hour
- **Search API**: 30 requests/minute

The MCP server respects rate limits and returns appropriate error messages.

---

## Testing

Test the MCP server:

```bash
# Initialize
curl -X POST "https://config.superbots.link/mcp/github/initialize"

# List tools
curl -X GET "https://config.superbots.link/mcp/github/tools/list"

# Get branch protection (no auth needed for read)
curl -X POST "https://config.superbots.link/mcp/github/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "github_get_branch_protection",
    "arguments": {
      "owner": "memorymusicllc",
      "repo": "pow3r.abi"
    }
  }'
```

---

## References

- [GitHub MCP Server](https://github.com/github/github-mcp-server) - Official repository
- [GitHub REST API](https://docs.github.com/en/rest) - API documentation
- [GitHub Branch Protection API](https://docs.github.com/en/rest/branches/branch-protection) - Branch protection reference
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
- [Pow3r Pass Integration](../authentication/POW3R_PASS_INTEGRATION.md) - Authentication guide

---

## Status

✅ **Deployed**: Production  
✅ **Tested**: Basic endpoints verified  
✅ **Documentation**: Complete  
✅ **Guardian Integration**: Authorization enforced  
✅ **Abi Ready**: Can configure branch protection autonomously

---

**Last Updated**: 2025-11-12  
**Maintained By**: Pow3r Core Team


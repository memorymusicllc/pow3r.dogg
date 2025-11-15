# Google Cloud (gcloud) MCP Server

**Package**: `@google-cloud/gcloud-mcp`  
**GitHub**: [googleapis/gcloud-mcp](https://github.com/googleapis/gcloud-mcp)  
**Type**: Command-based MCP Server (local)

---

## Overview

The Google Cloud MCP server provides AI agents with the ability to execute gcloud commands and manage Google Cloud Platform (GCP) resources. It implements the Model Context Protocol (MCP) specification, enabling seamless integration with AI tools like Cursor, Claude Desktop, and VS Code.

This server runs locally using Node.js and npx, connecting directly to your Google Cloud account via the gcloud CLI.

---

## Features

- ✅ **MCP Protocol Compliance**: Full implementation of MCP protocol specification
- ✅ **gcloud Command Execution**: Execute gcloud CLI commands securely
- ✅ **Google Cloud Storage**: Manage GCS buckets and objects
- ✅ **Cloud Logging**: Query logs and manage log buckets
- ✅ **Cloud Monitoring**: View metrics, time series, and alert policies
- ✅ **Cloud Trace**: Search and retrieve traces
- ✅ **Error Reporting**: List error groups and statistics
- ✅ **Security**: Command restrictions prevent dangerous operations
- ✅ **IAM Integration**: Permissions tied to active gcloud account

---

## Configuration

### Cursor Configuration

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "gcloud": {
      "command": "npx",
      "args": ["-y", "@google-cloud/gcloud-mcp"],
      "description": "Google Cloud MCP Server - Execute gcloud commands and manage GCP resources"
    }
  }
}
```

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gcloud": {
      "command": "npx",
      "args": ["-y", "@google-cloud/gcloud-mcp"]
    }
  }
}
```

### VS Code Configuration

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "gcloud": {
      "command": "npx",
      "args": ["-y", "@google-cloud/gcloud-mcp"]
    }
  }
}
```

---

## Prerequisites

### 1. Install Google Cloud SDK

Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) for your platform.

### 2. Authenticate with Google Cloud

```bash
# Login to your Google account
gcloud auth login

# Set up application default credentials
gcloud auth application-default login
```

### 3. Set Default Project (Optional)

```bash
gcloud config set project YOUR_PROJECT_ID
```

---

## Available Tools

### gcloud Command Execution

#### `run_gcloud_command`

Execute a gcloud command. Some commands are restricted for security.

**Parameters**:
- `args` (array, required): Array of gcloud command arguments

**Example**:
```json
{
  "name": "run_gcloud_command",
  "arguments": {
    "args": ["compute", "instances", "list"]
  }
}
```

**Restricted Commands**:
The MCP server prevents execution of commands that:
- Run arbitrary inputs
- Initiate interactive sessions
- Could cause security issues

See the [official documentation](https://github.com/googleapis/gcloud-mcp) for the full list of denied commands.

---

### Google Cloud Storage Tools

#### `list_buckets`

List all buckets in a project.

**Parameters**:
- `project` (string, optional): GCP project ID (defaults to active project)

**Example**:
```json
{
  "name": "list_buckets",
  "arguments": {
    "project": "my-project-id"
  }
}
```

#### `create_bucket`

Create a new GCS bucket.

**Parameters**:
- `name` (string, required): Bucket name
- `project` (string, optional): GCP project ID
- `location` (string, optional): Bucket location

#### `delete_bucket`

Delete a bucket.

**Parameters**:
- `name` (string, required): Bucket name
- `project` (string, optional): GCP project ID

#### `list_objects`

List objects in a GCS bucket.

**Parameters**:
- `bucket` (string, required): Bucket name
- `prefix` (string, optional): Object name prefix filter

#### `read_object_content`

Read the content of a specific object.

**Parameters**:
- `bucket` (string, required): Bucket name
- `object` (string, required): Object name

#### `write_object`

Write a new object to a bucket.

**Parameters**:
- `bucket` (string, required): Bucket name
- `object` (string, required): Object name
- `content` (string, required): Object content
- `contentType` (string, optional): Content type

#### `delete_object`

Delete an object from a bucket.

**Parameters**:
- `bucket` (string, required): Bucket name
- `object` (string, required): Object name

---

### Cloud Logging Tools

#### `list_log_entries`

List log entries from a project.

**Parameters**:
- `project` (string, required): GCP project ID
- `filter` (string, optional): Log filter expression
- `pageSize` (number, optional): Number of entries per page
- `orderBy` (string, optional): Sort order

#### `list_log_names`

List log names from a project.

**Parameters**:
- `project` (string, required): GCP project ID

#### `list_buckets` (Logging)

List log buckets from a project.

**Parameters**:
- `project` (string, required): GCP project ID

#### `list_views`

List log views from a project.

**Parameters**:
- `project` (string, required): GCP project ID

#### `list_sinks`

List log sinks from a project.

**Parameters**:
- `project` (string, required): GCP project ID

---

### Cloud Monitoring Tools

#### `list_metric_descriptors`

List metric descriptors for a project.

**Parameters**:
- `project` (string, required): GCP project ID
- `filter` (string, optional): Filter expression

#### `list_time_series`

List time series data for a given metric.

**Parameters**:
- `project` (string, required): GCP project ID
- `filter` (string, required): Metric filter
- `interval` (object, optional): Time interval
  - `startTime` (string): Start time (ISO 8601)
  - `endTime` (string): End time (ISO 8601)

#### `list_alert_policies`

List alert policies in a project.

**Parameters**:
- `project` (string, required): GCP project ID

---

### Cloud Trace Tools

#### `list_traces`

Search for traces in a project.

**Parameters**:
- `project` (string, required): GCP project ID
- `filter` (string, optional): Trace filter
- `startTime` (string, optional): Start time (ISO 8601)
- `endTime` (string, optional): End time (ISO 8601)

#### `get_trace`

Get a specific trace by ID.

**Parameters**:
- `project` (string, required): GCP project ID
- `traceId` (string, required): Trace ID

---

### Error Reporting Tools

#### `list_group_stats`

List error groups for a project.

**Parameters**:
- `project` (string, required): GCP project ID
- `timeRange` (object, optional): Time range filter

---

## Usage Examples

### List Compute Instances

```json
{
  "name": "run_gcloud_command",
  "arguments": {
    "args": ["compute", "instances", "list", "--format=json"]
  }
}
```

### List GCS Buckets

```json
{
  "name": "list_buckets",
  "arguments": {
    "project": "my-project-id"
  }
}
```

### Query Logs

```json
{
  "name": "list_log_entries",
  "arguments": {
    "project": "my-project-id",
    "filter": "resource.type=\"cloud_run_revision\"",
    "pageSize": 50
  }
}
```

### Get Time Series Metrics

```json
{
  "name": "list_time_series",
  "arguments": {
    "project": "my-project-id",
    "filter": "metric.type=\"run.googleapis.com/request_count\"",
    "interval": {
      "startTime": "2024-01-01T00:00:00Z",
      "endTime": "2024-01-02T00:00:00Z"
    }
  }
}
```

---

## Security & Permissions

### Permission Model

The MCP server's permissions are directly tied to your active gcloud account. The server can only perform operations that your authenticated account has permission to execute.

### Least Privilege Setup

For enhanced security, use service account impersonation:

1. **Create a Service Account**:
   ```bash
   gcloud iam service-accounts create mcp-service-account \
     --display-name="MCP Service Account"
   ```

2. **Assign Limited Roles**:
   ```bash
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:mcp-service-account@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.objectViewer"
   ```

3. **Impersonate the Service Account**:
   ```bash
   gcloud config set auth/impersonate_service_account \
     mcp-service-account@PROJECT_ID.iam.gserviceaccount.com
   ```

### Command Restrictions

The server automatically prevents execution of:
- Commands that run arbitrary inputs
- Interactive commands
- Commands that could cause security issues

See the [official repository](https://github.com/googleapis/gcloud-mcp) for the complete list of restricted commands.

---

## Troubleshooting

### Authentication Issues

**Problem**: Server fails to authenticate

**Solution**:
```bash
# Re-authenticate
gcloud auth login
gcloud auth application-default login

# Verify authentication
gcloud auth list
```

### Permission Denied Errors

**Problem**: "Permission denied" errors when executing commands

**Solution**:
- Verify your account has the necessary IAM roles
- Check project-level permissions
- Consider using service account impersonation for limited access

### Command Not Found

**Problem**: gcloud command not found

**Solution**:
- Ensure Google Cloud SDK is installed
- Verify `gcloud` is in your PATH
- Restart your terminal/IDE after installation

---

## Related MCP Servers

Google Cloud offers additional MCP servers:

- **Cloud Run MCP**: Deploy apps to Cloud Run
- **Firebase MCP**: Firebase services
- **Google Analytics MCP**: Analytics data
- **GKE MCP**: Kubernetes Engine operations
- **Storage MCP**: Advanced storage operations

---

## References

- [Google Cloud MCP GitHub Repository](https://github.com/googleapis/gcloud-mcp)
- [Google Cloud SDK Documentation](https://cloud.google.com/sdk/docs)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Google Cloud IAM Documentation](https://cloud.google.com/iam/docs)

---

## Important Notes

⚠️ **Preview Status**: This repository is currently in preview and may see breaking changes.

⚠️ **Not Officially Supported**: This repository provides a solution, not an officially supported Google product. It is not covered under Google Cloud Terms of Service.

⚠️ **Breaking Changes**: The server may break when the MCP specification, SDKs, or other solutions change.

See also the [Security Policy](https://github.com/googleapis/gcloud-mcp/blob/main/SECURITY.md) in the official repository.


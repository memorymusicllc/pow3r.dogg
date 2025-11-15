# Cloud Run MCP Server

**Package**: `@google-cloud/cloud-run-mcp`  
**GitHub**: [GoogleCloudPlatform/cloud-run-mcp](https://github.com/GoogleCloudPlatform/cloud-run-mcp)  
**Type**: Command-based MCP Server (local)

---

## Overview

The Cloud Run MCP server enables AI agents to deploy applications to Google Cloud Run directly from their development environment. It implements the Model Context Protocol (MCP) specification, providing tools for deploying code, managing services, and monitoring deployments.

This server runs locally using Node.js and npx, connecting directly to your Google Cloud account via the gcloud CLI.

---

## Features

- ✅ **MCP Protocol Compliance**: Full implementation of MCP protocol specification
- ✅ **Deploy from Files**: Deploy applications by providing file contents directly
- ✅ **Deploy from Folders**: Deploy local directories to Cloud Run
- ✅ **Service Management**: List, get details, and monitor Cloud Run services
- ✅ **Log Access**: Retrieve logs and error messages for services
- ✅ **Project Management**: List and create GCP projects (local only)
- ✅ **Environment Configuration**: Support for default project, region, and service names

---

## Configuration

### Cursor Configuration

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "cloud-run": {
      "command": "npx",
      "args": ["-y", "@google-cloud/cloud-run-mcp"],
      "description": "Cloud Run MCP Server - Deploy apps to Google Cloud Run"
    }
  }
}
```

### With Default Environment Variables

```json
{
  "mcpServers": {
    "cloud-run": {
      "command": "npx",
      "args": ["-y", "@google-cloud/cloud-run-mcp"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "my-project-id",
        "GOOGLE_CLOUD_REGION": "us-central1",
        "DEFAULT_SERVICE_NAME": "my-service"
      }
    }
  }
}
```

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cloud-run": {
      "command": "npx",
      "args": ["-y", "@google-cloud/cloud-run-mcp"]
    }
  }
}
```

### VS Code Configuration

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "cloud-run": {
      "command": "npx",
      "args": ["-y", "@google-cloud/cloud-run-mcp"]
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

### 3. Enable Cloud Run API

```bash
gcloud services enable run.googleapis.com
```

### 4. Set Default Project (Optional)

```bash
gcloud config set project YOUR_PROJECT_ID
```

---

## Available Tools

### Deployment Tools

#### `deploy_file_contents`

Deploy files to Cloud Run by providing their contents directly. Use this when files only exist in the chat context.

**Parameters**:
- `project` (string, required): Google Cloud project ID
- `service` (string, required): Name of the Cloud Run service
- `region` (string, optional): Region to deploy to (default: `europe-west1`)
- `files` (array, required): Array of file objects
  - `filename` (string, required): Name and path of the file (e.g., `"src/index.js"`)
  - `content` (string, required): Text content of the file

**Example**:
```json
{
  "name": "deploy_file_contents",
  "arguments": {
    "project": "my-project-id",
    "service": "my-service",
    "region": "us-central1",
    "files": [
      {
        "filename": "package.json",
        "content": "{\"name\": \"my-app\", \"version\": \"1.0.0\"}"
      },
      {
        "filename": "index.js",
        "content": "console.log('Hello World');"
      }
    ]
  }
}
```

#### `deploy_local_folder`

Deploy a local folder to Cloud Run. **Only available when running locally.**

**Parameters**:
- `project` (string, required): Google Cloud project ID
- `service` (string, required): Name of the Cloud Run service
- `region` (string, optional): Region to deploy to (default: `europe-west1`)
- `folderPath` (string, required): Absolute path to the folder to deploy

**Example**:
```json
{
  "name": "deploy_local_folder",
  "arguments": {
    "project": "my-project-id",
    "service": "my-service",
    "region": "us-central1",
    "folderPath": "/Users/username/my-app"
  }
}
```

---

### Service Management Tools

#### `list_services`

List Cloud Run services in a given project and region.

**Parameters**:
- `project` (string, required): Google Cloud project ID
- `region` (string, optional): Region to list services from (default: `europe-west1`)

**Example**:
```json
{
  "name": "list_services",
  "arguments": {
    "project": "my-project-id",
    "region": "us-central1"
  }
}
```

**Response**:
```json
{
  "services": [
    {
      "name": "my-service",
      "region": "us-central1",
      "url": "https://my-service-xyz.run.app",
      "status": "ACTIVE"
    }
  ]
}
```

#### `get_service`

Get details for a specific Cloud Run service.

**Parameters**:
- `project` (string, required): Google Cloud project ID
- `service` (string, required): Name of the Cloud Run service
- `region` (string, optional): Region where the service is located (default: `europe-west1`)

**Example**:
```json
{
  "name": "get_service",
  "arguments": {
    "project": "my-project-id",
    "service": "my-service",
    "region": "us-central1"
  }
}
```

#### `get_service_log`

Get logs and error messages for a specific Cloud Run service.

**Parameters**:
- `project` (string, required): Google Cloud project ID
- `service` (string, required): Name of the Cloud Run service
- `region` (string, optional): Region where the service is located (default: `europe-west1`)

**Example**:
```json
{
  "name": "get_service_log",
  "arguments": {
    "project": "my-project-id",
    "service": "my-service",
    "region": "us-central1"
  }
}
```

---

### Project Management Tools (Local Only)

#### `list_projects`

List available GCP projects. **Only available when running locally.**

**Parameters**: None

**Example**:
```json
{
  "name": "list_projects",
  "arguments": {}
}
```

#### `create_project`

Create a new GCP project and attach it to the first available billing account. **Only available when running locally.**

**Parameters**:
- `projectId` (string, optional): Desired ID for the new project (auto-generated if not provided)

**Example**:
```json
{
  "name": "create_project",
  "arguments": {
    "projectId": "my-new-project"
  }
}
```

---

## Available Prompts

Prompts are natural language commands that simplify common tasks.

### `deploy`

Deploy the current working directory to Cloud Run. If a service name is not provided, it will use:
1. The `DEFAULT_SERVICE_NAME` environment variable
2. The name of the current working directory

**Usage**: Simply invoke the `deploy` prompt without arguments, or specify:
- `service`: Service name
- `project`: Project ID
- `region`: Region

### `logs`

Get logs for a Cloud Run service. If a service name is not provided, it will use:
1. The `DEFAULT_SERVICE_NAME` environment variable
2. The name of the current working directory

**Usage**: Simply invoke the `logs` prompt without arguments, or specify:
- `service`: Service name
- `project`: Project ID
- `region`: Region

---

## Usage Examples

### Deploy a Simple Node.js Application

```json
{
  "name": "deploy_file_contents",
  "arguments": {
    "project": "my-project-id",
    "service": "hello-world",
    "region": "us-central1",
    "files": [
      {
        "filename": "package.json",
        "content": "{\"name\": \"hello-world\", \"version\": \"1.0.0\", \"scripts\": {\"start\": \"node index.js\"}, \"dependencies\": {}}"
      },
      {
        "filename": "index.js",
        "content": "const http = require('http');\nconst port = process.env.PORT || 8080;\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, {'Content-Type': 'text/plain'});\n  res.end('Hello from Cloud Run!\\n');\n});\nserver.listen(port, () => {\n  console.log(`Server running on port ${port}`);\n});"
      }
    ]
  }
}
```

### Deploy a Python Application

```json
{
  "name": "deploy_file_contents",
  "arguments": {
    "project": "my-project-id",
    "service": "python-app",
    "region": "us-central1",
    "files": [
      {
        "filename": "main.py",
        "content": "from flask import Flask\napp = Flask(__name__)\n\n@app.route('/')\ndef hello():\n    return 'Hello from Cloud Run!'\n\nif __name__ == '__main__':\n    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))"
      },
      {
        "filename": "requirements.txt",
        "content": "Flask==2.3.0"
      }
    ]
  }
}
```

### List All Services

```json
{
  "name": "list_services",
  "arguments": {
    "project": "my-project-id",
    "region": "us-central1"
  }
}
```

### Get Service Details

```json
{
  "name": "get_service",
  "arguments": {
    "project": "my-project-id",
    "service": "my-service",
    "region": "us-central1"
  }
}
```

### View Service Logs

```json
{
  "name": "get_service_log",
  "arguments": {
    "project": "my-project-id",
    "service": "my-service",
    "region": "us-central1"
  }
}
```

---

## Environment Variables

You can configure default values using environment variables:

- **`GOOGLE_CLOUD_PROJECT`**: Default GCP project ID
- **`GOOGLE_CLOUD_REGION`**: Default region (default: `europe-west1`)
- **`DEFAULT_SERVICE_NAME`**: Default service name

Set these in your MCP configuration:

```json
{
  "cloud-run": {
    "command": "npx",
    "args": ["-y", "@google-cloud/cloud-run-mcp"],
    "env": {
      "GOOGLE_CLOUD_PROJECT": "my-project-id",
      "GOOGLE_CLOUD_REGION": "us-central1",
      "DEFAULT_SERVICE_NAME": "my-default-service"
    }
  }
}
```

---

## Deployment Methods

### Method 1: Deploy File Contents

Use `deploy_file_contents` when files only exist in the chat context:

```json
{
  "name": "deploy_file_contents",
  "arguments": {
    "project": "my-project",
    "service": "my-service",
    "files": [
      {"filename": "app.js", "content": "..."}
    ]
  }
}
```

### Method 2: Deploy Local Folder

Use `deploy_local_folder` when deploying from your local filesystem (local only):

```json
{
  "name": "deploy_local_folder",
  "arguments": {
    "project": "my-project",
    "service": "my-service",
    "folderPath": "/absolute/path/to/folder"
  }
}
```

---

## Troubleshooting

### Authentication Issues

**Problem**: "Permission denied" or authentication errors

**Solution**:
```bash
# Re-authenticate
gcloud auth login
gcloud auth application-default login

# Verify authentication
gcloud auth list
```

### Cloud Run API Not Enabled

**Problem**: "API not enabled" error

**Solution**:
```bash
gcloud services enable run.googleapis.com
```

### Deployment Failures

**Problem**: Deployment fails with build errors

**Solution**:
- Ensure your application has a proper `Dockerfile` or uses a buildpack
- Check that all dependencies are specified (e.g., `requirements.txt`, `package.json`)
- Verify the entry point is correctly configured
- Review service logs: `get_service_log`

### Service Not Found

**Problem**: "Service not found" errors

**Solution**:
- Verify the service name is correct
- Check the region matches where the service was deployed
- List services to see available services: `list_services`

---

## Security Considerations

### IAM Permissions

The MCP server requires the following IAM roles:

- **Cloud Run Admin** (`roles/run.admin`): Deploy and manage services
- **Service Account User** (`roles/iam.serviceAccountUser`): Use service accounts
- **Storage Admin** (`roles/storage.admin`): Upload build artifacts (if needed)

### Least Privilege Setup

For enhanced security, create a service account with limited permissions:

```bash
# Create service account
gcloud iam service-accounts create cloud-run-mcp \
  --display-name="Cloud Run MCP Service Account"

# Grant minimal permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:cloud-run-mcp@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Use service account impersonation
gcloud config set auth/impersonate_service_account \
  cloud-run-mcp@PROJECT_ID.iam.gserviceaccount.com
```

---

## Related Resources

- **Google Cloud MCP**: General gcloud command execution
- **Cloud Run Documentation**: [Cloud Run Docs](https://cloud.google.com/run/docs)
- **Cloud Run API**: [Cloud Run API Reference](https://cloud.google.com/run/docs/reference/rest)

---

## References

- [Cloud Run MCP GitHub Repository](https://github.com/GoogleCloudPlatform/cloud-run-mcp)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Cloud Run Deployment Guide](https://cloud.google.com/run/docs/deploying)

---

## Important Notes

⚠️ **Local vs Remote**: Some tools (`deploy_local_folder`, `list_projects`, `create_project`) are only available when running the MCP server locally.

⚠️ **Project Requirements**: You must have a Google Cloud project with billing enabled to deploy services.

⚠️ **Build Requirements**: Cloud Run requires either:
- A `Dockerfile` in your project
- Support for Cloud Buildpacks (automatic detection)

See the [official repository](https://github.com/GoogleCloudPlatform/cloud-run-mcp) for the latest updates and examples.


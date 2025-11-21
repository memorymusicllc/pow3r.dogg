# Cursor Quick Actions Extension

A VS Code extension that provides a custom widget panel with 8 action buttons for common development tasks. Works seamlessly with Cursor IDE and integrates with MCP servers.

## Features

### Predefined Actions (4)

1. **🚀 Deploy** - Automatically detects project type and runs deployment commands
2. **📁 Organize Repo** - Cleans up repository structure, removes summary files, updates README
3. **🔍 Code Review** - Generates comprehensive code review prompts for Cursor chat
4. **📋 Generate Plan** - Creates XMAP.json blueprint files with AI-generated implementation plans

### Custom Actions (4)

Four customizable buttons that can store and insert prompts directly into Cursor's chat input. Configure your most-used prompts for quick access.

## Installation

### From Source

1. Clone or download this extension
2. Open in VS Code/Cursor
3. Run `npm install` in the extension directory
4. Press `F5` to launch Extension Development Host
5. Or package with `vsce package` and install the `.vsix` file

### Manual Installation

1. Build the extension:
   ```bash
   cd cursor-quick-actions-extension
   npm install
   npm run compile
   ```

2. Package the extension:
   ```bash
   npx @vscode/vsce package
   ```

3. Install the `.vsix` file:
   - Open VS Code/Cursor
   - Go to Extensions view
   - Click "..." menu → "Install from VSIX..."
   - Select the generated `.vsix` file

## Configuration

### MCP Server URLs

Configure MCP server connections in VS Code settings:

1. Open Settings (`Cmd/Ctrl + ,`)
2. Search for "Quick Actions"
3. Configure:
   - `quickActions.mcp.ddog` - ddog MCP server URL
   - `quickActions.mcp.xSystems` - x-systems MCP server URL
   - `quickActions.mcp.xPlugin` - x-plugin MCP server URL

### Custom Button Prompts

Configure custom button prompts in settings:

- `quickActions.customPrompts.custom1` - Prompt for Custom Button 1
- `quickActions.customPrompts.custom2` - Prompt for Custom Button 2
- `quickActions.customPrompts.custom3` - Prompt for Custom Button 3
- `quickActions.customPrompts.custom4` - Prompt for Custom Button 4

Or use the "Configure Quick Actions" command from the command palette.

## Usage

### Accessing the Panel

1. Open the "Quick Actions" view in the sidebar (rocket icon)
2. Click any button to execute the corresponding action

### Deploy Action

- Automatically detects `package.json` and deployment scripts
- Runs `npm run deploy:production` or equivalent
- Shows output in integrated terminal
- Sends notifications to configured MCP servers

### Organize Repo Action

- Removes summary files (`*_COMPLETE.md`, `*_SUMMARY.md`, `*_STATUS.md`)
- Updates `README.md` with current project structure
- Follows rules from `.cursor/rules.md` if present
- Cleans up outdated documentation

### Code Review Action

- Collects changed files from git
- Generates comprehensive review prompt
- Inserts prompt into Cursor chat for AI analysis

### Plan Action

- Analyzes repository structure
- Generates `XMAP.json` blueprint file
- Creates nodes and edges representing project structure
- Includes AI-generated implementation plan

### Custom Buttons

1. Configure prompts in settings
2. Click custom button to insert prompt into Cursor chat
3. If not configured, clicking opens settings

## XMAP.json Format

The Plan action generates XMAP blueprints in the following format:

```json
{
  "version": "1.0",
  "repository": "repo-name",
  "nodes": [
    {
      "id": "node-id",
      "type": "component|service|config",
      "label": "Display Name",
      "metadata": {},
      "position": { "x": 0, "y": 0 }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "node-id",
      "target": "node-id",
      "type": "dependency|data-flow"
    }
  ],
  "metadata": {
    "generated": "timestamp",
    "plan": "AI-generated implementation plan"
  }
}
```

## MCP Integration

The extension integrates with MCP (Model Context Protocol) servers:

- **ddog** - For deployment and monitoring notifications
- **x-systems** - For system-level operations
- **x-plugin** - For plugin-specific functionality

MCP servers can be configured via SSE (Server-Sent Events) or HTTP transport.

## Development

### Project Structure

```
cursor-quick-actions-extension/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── config.ts             # Configuration management
│   ├── webview/
│   │   ├── panel.ts          # Webview panel provider
│   │   └── main.js           # Webview JavaScript
│   ├── actions/
│   │   ├── deploy.ts         # Deploy action
│   │   ├── organize.ts       # Organize action
│   │   ├── review.ts         # Code review action
│   │   └── plan.ts           # Plan/XMAP generation
│   ├── mcp/
│   │   └── client.ts         # MCP client integration
│   └── utils/
│       └── cursor-integration.ts  # Cursor chat integration
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

### Building

```bash
npm install
npm run compile
```

### Testing

1. Press `F5` in VS Code to launch Extension Development Host
2. Test the extension in the development window
3. Check the Debug Console for logs

## Requirements

- VS Code 1.74.0 or higher
- Cursor IDE (for full chat integration)
- Node.js 18+ (for development)

## License

Proprietary

## Contributing

This extension is designed for use with Cursor IDE and the pow3r.ddog project ecosystem.



# Installation Guide

## Prerequisites

- Node.js 18+ installed
- VS Code or Cursor IDE
- npm or yarn package manager

## Building the Extension

1. Navigate to the extension directory:
   ```bash
   cd cursor-quick-actions-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile TypeScript:
   ```bash
   npm run compile
   ```

## Packaging the Extension

1. Install VS Code Extension Manager (vsce) if not already installed:
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   vsce package
   ```

   This will create a `.vsix` file in the extension directory.

## Installing the Extension

### Method 1: Install from VSIX (Recommended)

1. Open VS Code or Cursor IDE
2. Go to Extensions view (Cmd/Ctrl + Shift + X)
3. Click the "..." menu in the Extensions view
4. Select "Install from VSIX..."
5. Choose the generated `.vsix` file
6. Reload the window when prompted

### Method 2: Development Mode

1. Open the extension folder in VS Code/Cursor
2. Press `F5` to launch Extension Development Host
3. In the new window, the extension will be active
4. Open the "Quick Actions" view in the sidebar

## Configuration

After installation, configure the extension:

1. Open Settings (Cmd/Ctrl + ,)
2. Search for "Quick Actions"
3. Configure:
   - MCP server URLs (ddog, x-systems, x-plugin)
   - Custom button prompts (custom1-4)

Or use the "Configure Quick Actions" command from the command palette.

## Verification

1. Open the Quick Actions panel (rocket icon in sidebar)
2. You should see 8 buttons:
   - 4 predefined actions (Deploy, Organize, Review, Plan)
   - 4 custom buttons (configure in settings)
3. Click any button to test functionality

## Troubleshooting

### Extension not appearing
- Reload the window (Cmd/Ctrl + R)
- Check Extensions view for errors
- Verify the extension is enabled

### Buttons not working
- Check the Output panel for errors
- Verify workspace folder is open
- Check that required tools (git, npm) are available

### MCP connections failing
- Verify MCP server URLs are correct
- Check network connectivity
- Review extension logs in Output panel



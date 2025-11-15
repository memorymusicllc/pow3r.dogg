# PDFtk MCP Server

**URL**: `https://config.superbots.link/mcp/pdftk/*`  
**Version**: `1.0.0`

---

## Overview

The PDFtk MCP (Model Context Protocol) server provides a standardized interface for AI agents to interact with PDFtk Server's PDF manipulation capabilities. It implements the MCP protocol specification, enabling seamless integration with AI tools like Claude Desktop, Cursor, and VS Code.

**Reference**: [PDFtk Server Documentation](https://www.pdflabs.com/tools/pdftk-server/)

**Note**: This MCP server generates PDFtk commands for client-side execution. PDFtk Server must be installed on the client system to execute the generated commands. For server-side processing, a backend service with PDFtk installed can be integrated.

---

## Features

- ✅ **MCP Protocol Compliance**: Full implementation of MCP protocol endpoints
- ✅ **PDFtk Integration**: Command generation for all PDFtk operations
- ✅ **13 PDF Operations**: Merge, split, rotate, encrypt, decrypt, fill forms, and more
- ✅ **Tool Discovery**: List available tools, resources, and prompts
- ✅ **SSE Streaming**: Server-Sent Events support for real-time updates
- ✅ **CORS Support**: Full CORS headers for cross-origin access
- ✅ **Command Generation**: Generates ready-to-execute PDFtk commands

---

## Prerequisites

### Install PDFtk Server

**Windows**:
- Download and install from [PDFtk Server](https://www.pdflabs.com/tools/pdftk-server/)
- After installation, verify: `pdftk --version`

**macOS**:
```bash
brew install pdftk-java
```

**Linux**:
```bash
sudo apt-get install pdftk  # Debian/Ubuntu
sudo yum install pdftk      # RHEL/CentOS
```

---

## API Endpoints

### Initialize MCP Connection

```http
POST /mcp/pdftk/initialize
```

Initialize the MCP server connection and get server capabilities.

**Response**:
```json
{
  "success": true,
  "data": {
    "name": "pdftk-mcp-server",
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
GET /mcp/pdftk/tools/list
```

Get a list of all available MCP tools (PDFtk operations).

**Available Tools** (13 total):
1. **`pdftk_merge`** - Merge multiple PDF files into one
2. **`pdftk_split`** - Split PDF into individual pages
3. **`pdftk_rotate`** - Rotate PDF pages (90°, 180°, 270°)
4. **`pdftk_encrypt`** - Encrypt PDF with password
5. **`pdftk_decrypt`** - Decrypt password-protected PDF
6. **`pdftk_fill_form`** - Fill PDF form fields
7. **`pdftk_generate_fdf`** - Generate FDF data stencil from form
8. **`pdftk_attach_file`** - Attach files to PDF
9. **`pdftk_unpack`** - Unpack PDF attachments
10. **`pdftk_watermark`** - Apply watermark or stamp
11. **`pdftk_report`** - Report PDF metrics and metadata
12. **`pdftk_update_metadata`** - Update PDF metadata and bookmarks
13. **`pdftk_repair`** - Repair corrupted PDF

**Response**:
```json
{
  "success": true,
  "data": {
    "tools": [
      {
        "name": "pdftk_merge",
        "description": "Merge multiple PDF files into a single PDF document",
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
POST /mcp/pdftk/tools/call
Content-Type: application/json

{
  "name": "pdftk_merge",
  "arguments": {
    "files": ["base64_pdf1", "base64_pdf2"],
    "output": "merged.pdf"
  }
}
```

Execute an MCP tool and generate a PDFtk command.

**Example: Merge PDFs**:
```bash
curl -X POST "https://config.superbots.link/mcp/pdftk/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pdftk_merge",
    "arguments": {
      "files": ["base64_encoded_pdf1", "base64_encoded_pdf2"],
      "output": "merged.pdf"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"operation\": \"merge\",\n  \"command\": \"pdftk input1.pdf input2.pdf cat output merged.pdf\",\n  \"instructions\": { ... }\n}"
      }
    ]
  }
}
```

**Example: Split PDF**:
```bash
curl -X POST "https://config.superbots.link/mcp/pdftk/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pdftk_split",
    "arguments": {
      "input": "base64_encoded_pdf",
      "pages": "burst"
    }
  }'
```

**Example: Encrypt PDF**:
```bash
curl -X POST "https://config.superbots.link/mcp/pdftk/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pdftk_encrypt",
    "arguments": {
      "input": "base64_encoded_pdf",
      "userPassword": "userpass123",
      "ownerPassword": "ownerpass123"
    }
  }'
```

**Example: Fill PDF Form**:
```bash
curl -X POST "https://config.superbots.link/mcp/pdftk/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pdftk_fill_form",
    "arguments": {
      "input": "base64_encoded_form",
      "data": {
        "name": "John Doe",
        "email": "john@example.com",
        "date": "2024-01-01"
      },
      "flatten": true
    }
  }'
```

---

### List Resources

```http
GET /mcp/pdftk/resources/list
```

Get a list of available MCP resources.

**Response**:
```json
{
  "success": true,
  "data": {
    "resources": [
      {
        "uri": "pdftk://operations",
        "name": "PDFtk Operations",
        "description": "List of available PDFtk operations",
        "mimeType": "application/json"
      },
      {
        "uri": "pdftk://commands",
        "name": "Generated Commands",
        "description": "PDFtk commands generated by the server",
        "mimeType": "text/plain"
      }
    ]
  }
}
```

---

### List Prompts

```http
GET /mcp/pdftk/prompts/list
```

Get a list of available MCP prompts (predefined prompt templates).

**Response**:
```json
{
  "success": true,
  "data": {
    "prompts": [
      {
        "name": "merge_pdfs",
        "description": "Merge multiple PDF files into one",
        "arguments": [
          {
            "name": "files",
            "description": "Array of PDF files to merge",
            "required": true
          }
        ]
      },
      {
        "name": "split_pdf",
        "description": "Split PDF into individual pages",
        "arguments": [...]
      },
      {
        "name": "encrypt_pdf",
        "description": "Encrypt PDF with password",
        "arguments": [...]
      },
      {
        "name": "fill_pdf_form",
        "description": "Fill PDF form with data",
        "arguments": [...]
      }
    ]
  }
}
```

---

### SSE Streaming

```http
GET /mcp/pdftk/sse
```

Server-Sent Events endpoint for real-time updates.

**Response**: `text/event-stream` with connection status and ping messages.

---

## Tool Details

### pdftk_merge

Merge multiple PDF files into a single document.

**Parameters**:
- `files` (array, required): Array of PDF files (base64 or URL)
- `output` (string, optional): Output filename (default: `merged.pdf`)

**Command Example**:
```bash
pdftk input1.pdf input2.pdf cat output merged.pdf
```

---

### pdftk_split

Split PDF into individual pages or page ranges.

**Parameters**:
- `input` (string, required): Input PDF file (base64 or URL)
- `pages` (string, optional): Page range (e.g., `"1-5"`, `"1,3,5"`, `"burst"` for all pages)
- `outputPattern` (string, optional): Output filename pattern (default: `page_%02d.pdf`)

**Command Examples**:
```bash
# Split all pages
pdftk input.pdf burst output page_%02d.pdf

# Extract specific pages
pdftk input.pdf cat 1-5 output pages_1-5.pdf
```

---

### pdftk_rotate

Rotate PDF pages by 90, 180, or 270 degrees.

**Parameters**:
- `input` (string, required): Input PDF file (base64 or URL)
- `rotation` (integer, required): Rotation angle (90, 180, or 270)
- `pages` (string, optional): Page range (default: `"all"`)

**Command Example**:
```bash
pdftk input.pdf cat 1-5E output rotated.pdf  # Rotate pages 1-5 by 90° (E=East)
```

---

### pdftk_encrypt

Encrypt PDF with password protection.

**Parameters**:
- `input` (string, required): Input PDF file (base64 or URL)
- `userPassword` (string, required): User password (required to open PDF)
- `ownerPassword` (string, optional): Owner password (defaults to user password)
- `permissions` (object, optional): PDF permissions
  - `allowPrinting` (boolean, default: true)
  - `allowModify` (boolean, default: false)
  - `allowCopy` (boolean, default: false)
  - `allowScreenReaders` (boolean, default: true)

**Command Example**:
```bash
pdftk input.pdf output encrypted.pdf user_pw userpass owner_pw ownerpass
```

---

### pdftk_decrypt

Decrypt password-protected PDF.

**Parameters**:
- `input` (string, required): Encrypted PDF file (base64 or URL)
- `password` (string, required): Password to decrypt PDF

**Command Example**:
```bash
pdftk encrypted.pdf input_pw password output decrypted.pdf
```

---

### pdftk_fill_form

Fill PDF form fields with data.

**Parameters**:
- `input` (string, required): PDF form file (base64 or URL)
- `data` (object, required): Form field values as key-value pairs
- `flatten` (boolean, optional): Flatten form (make fields non-editable, default: false)

**Command Example**:
```bash
pdftk form.pdf fill_form data.fdf output filled.pdf flatten
```

---

### pdftk_generate_fdf

Generate FDF data stencil from PDF form.

**Parameters**:
- `input` (string, required): PDF form file (base64 or URL)

**Command Example**:
```bash
pdftk form.pdf generate_fdf output data.fdf
```

---

### pdftk_attach_file

Attach files to PDF document or pages.

**Parameters**:
- `input` (string, required): PDF file (base64 or URL)
- `attachments` (array, required): Files to attach (base64 or URL)
- `pageNumber` (integer, optional): Page number to attach to (attaches to document if omitted)

**Command Example**:
```bash
pdftk input.pdf attach_files file1.pdf file2.pdf output output.pdf
```

---

### pdftk_unpack

Unpack PDF attachments.

**Parameters**:
- `input` (string, required): PDF file with attachments (base64 or URL)

**Command Example**:
```bash
pdftk input.pdf unpack_files output attachments/
```

---

### pdftk_watermark

Apply background watermark or foreground stamp to PDF.

**Parameters**:
- `input` (string, required): Input PDF file (base64 or URL)
- `watermark` (string, required): Watermark PDF file (base64 or URL)
- `position` (string, optional): Watermark position (`"background"` or `"foreground"`, default: `"background"`)

**Command Example**:
```bash
pdftk input.pdf stamp watermark.pdf output watermarked.pdf
```

---

### pdftk_report

Report PDF metrics, bookmarks, and metadata.

**Parameters**:
- `input` (string, required): PDF file (base64 or URL)
- `reportType` (string, optional): Type of report (`"metadata"`, `"bookmarks"`, `"pages"`, or `"all"`, default: `"all"`)

**Command Example**:
```bash
pdftk input.pdf dump_data output report.txt
```

---

### pdftk_update_metadata

Add or update PDF bookmarks and metadata.

**Parameters**:
- `input` (string, required): PDF file (base64 or URL)
- `metadata` (object, optional): Metadata fields to update
  - `Title`, `Author`, `Subject`, `Keywords`, `Creator`, `Producer`
- `bookmarks` (array, optional): Bookmarks to add
  - `title` (string, required)
  - `page` (integer, required)
  - `level` (integer, optional, default: 1)

**Command Example**:
```bash
pdftk input.pdf update_info metadata.txt output output.pdf
```

---

### pdftk_repair

Repair corrupted PDF (where possible).

**Parameters**:
- `input` (string, required): Corrupted PDF file (base64 or URL)

**Command Example**:
```bash
pdftk corrupted.pdf output repaired.pdf
```

---

## Integration with AI Tools

### Claude Desktop

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "pdftk": {
      "url": "https://config.superbots.link/mcp/pdftk/sse",
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
    "pdftk": {
      "url": "https://config.superbots.link/mcp/pdftk/sse",
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
    "pdftk": {
      "url": "https://config.superbots.link/mcp/pdftk/sse",
      "transport": "sse"
    }
  }
}
```

---

## Usage Workflow

### 1. Initialize Connection
```bash
curl -X POST "https://config.superbots.link/mcp/pdftk/initialize"
```

### 2. List Available Tools
```bash
curl -X GET "https://config.superbots.link/mcp/pdftk/tools/list"
```

### 3. Generate PDFtk Command
```bash
curl -X POST "https://config.superbots.link/mcp/pdftk/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pdftk_merge",
    "arguments": {
      "files": ["base64_pdf1", "base64_pdf2"],
      "output": "merged.pdf"
    }
  }'
```

### 4. Execute Command Locally
```bash
# Save PDF files from base64
echo "base64_pdf1" | base64 -d > input1.pdf
echo "base64_pdf2" | base64 -d > input2.pdf

# Execute generated command
pdftk input1.pdf input2.pdf cat output merged.pdf
```

---

## File Handling

### Input Methods

1. **Base64 Encoding**: PDF content as base64 string
   ```json
   {
     "input": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9MZW5ndGggNCAwIFIvRmlsdGVyL0ZsYXRlRGVjb2RlPj4Kc3RyZWFtCngB..."
   }
   ```

2. **URL**: Fetch PDF from URL
   ```json
   {
     "input": "https://example.com/document.pdf"
   }
   ```

### Output

The MCP server returns PDFtk commands with execution instructions. The client must:
1. Decode base64 PDFs to files (if using base64 input)
2. Execute the generated PDFtk command
3. Handle the output PDF file

---

## Error Handling

All errors include `aiGuidance` for AI agents:

```json
{
  "success": false,
  "error": {
    "message": "Bad Request",
    "code": "INVALID_ARGUMENTS",
    "details": "files array with at least 2 PDF files is required",
    "aiGuidance": {
      "issue": "Invalid arguments provided",
      "solution": "Ensure files array contains at least 2 PDF files"
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
│    PDFtk MCP Server (Cloudflare)       │
│    config.superbots.link/mcp/pdftk    │
└──────────────┬──────────────────────────┘
               │
               └──► Command Generation
                    (PDFtk commands)
                    │
                    ▼
            ┌───────────────┐
            │  Client System │
            │  (with PDFtk)  │
            └───────────────┘
```

---

## Limitations

1. **Client-Side Execution**: Commands must be executed on a system with PDFtk installed
2. **File Handling**: Client must handle base64 decoding and file I/O
3. **No Server-Side Processing**: Cloudflare Workers cannot execute PDFtk directly

---

## Future Enhancements

### Backend Service Integration
- Deploy Node.js/Python service with PDFtk installed
- Process PDFs server-side
- Return processed PDFs directly
- Support for large file processing

### Advanced Features
- Batch processing
- PDF comparison/diff
- OCR integration
- PDF/A compliance
- Digital signatures

---

## Testing

Test the MCP server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

Or use curl:

```bash
# Initialize
curl -X POST "https://config.superbots.link/mcp/pdftk/initialize"

# List tools
curl -X GET "https://config.superbots.link/mcp/pdftk/tools/list"

# Test tool call
curl -X POST "https://config.superbots.link/mcp/pdftk/tools/call" \
  -H "Content-Type: application/json" \
  -d '{"name":"pdftk_merge","arguments":{"files":["test1","test2"]}}'
```

---

## References

- [PDFtk Server Documentation](https://www.pdflabs.com/tools/pdftk-server/)
- [PDFtk Manual](https://www.pdflabs.com/docs/pdftk-man-page/)
- [PDFtk Examples](https://www.pdflabs.com/docs/pdftk-cli-examples/)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

---

## Status

✅ **Deployed**: Production  
✅ **Tested**: Basic endpoints verified  
✅ **Documentation**: Complete  
✅ **Integration**: Ready for AI tools  
⚠️ **Note**: Requires PDFtk Server installation on client system


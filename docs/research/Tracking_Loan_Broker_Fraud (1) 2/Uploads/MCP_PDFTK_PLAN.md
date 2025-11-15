# PDFtk MCP Server - Implementation Plan

**Status**: Planning  
**Version**: 1.0.0 (Planned)  
**Reference**: [PDFtk Server Documentation](https://www.pdflabs.com/tools/pdftk-server/)

---

## Overview

This document outlines the plan to build a PDFtk MCP (Model Context Protocol) server that exposes PDFtk's PDF manipulation capabilities to AI agents. PDFtk Server is a command-line tool for working with PDFs, providing operations like merge, split, rotate, encrypt, decrypt, fill forms, and more.

**Challenge**: PDFtk is a command-line tool that requires system-level execution. Cloudflare Workers cannot execute local commands directly. This plan addresses this architectural constraint.

---

## Architecture Considerations

### Challenge: Cloudflare Workers Limitation

Cloudflare Workers run in a sandboxed environment and cannot:
- Execute system commands (like `pdftk`)
- Install or access local binaries
- Access the file system directly

### Solution Approaches

#### Option 1: Backend Proxy Service (Recommended)
- Deploy a backend service (Node.js/Python) with PDFtk installed
- MCP server proxies requests to the backend service
- Backend executes PDFtk commands and returns results
- **Pros**: Full PDFtk functionality, secure execution
- **Cons**: Requires separate backend infrastructure

#### Option 2: Client-Side Command Generation
- MCP server generates PDFtk commands for client execution
- Client must have PDFtk installed locally
- **Pros**: No backend required, direct execution
- **Cons**: Requires PDFtk on client, limited for server-side AI agents

#### Option 3: Hybrid Approach (Recommended for MVP)
- Generate commands for local execution (Option 2)
- Provide API endpoints for backend proxy (Option 1)
- Support both modes based on client capabilities
- **Pros**: Flexible, works in multiple scenarios
- **Cons**: More complex implementation

---

## Implementation Plan

### Phase 1: Core MCP Server Structure

#### 1.1 Create MCP Server Module
- **File**: `src/mcp-pdftk.js`
- **Pattern**: Follow existing MCP server structure (like `mcp-replicate.js`)
- **Endpoints**:
  - `POST /mcp/pdftk/initialize` - Initialize MCP connection
  - `GET /mcp/pdftk/tools/list` - List available PDFtk tools
  - `POST /mcp/pdftk/tools/call` - Execute PDFtk operations
  - `GET /mcp/pdftk/resources/list` - List PDF resources
  - `GET /mcp/pdftk/prompts/list` - List prompt templates
  - `GET /mcp/pdftk/sse` - SSE streaming endpoint

#### 1.2 Routing Integration
- **File**: `src/index.js`
- Add route: `/mcp/pdftk/*` → `handleMCPPDFtk`
- Import and register handler

#### 1.3 MCP Protocol Compliance
- Implement MCP protocol version `2024-11-05`
- Follow existing server patterns for consistency
- Include proper error handling with `aiGuidance`

### Phase 2: PDFtk Tools Implementation

#### 2.1 Core PDF Operations

**Tool: `pdftk_merge`**
- Merge multiple PDF files into one
- Input: Array of PDF files (base64 or URLs), output filename
- Command: `pdftk file1.pdf file2.pdf cat output merged.pdf`

**Tool: `pdftk_split`**
- Split PDF into individual pages
- Input: PDF file, page range or "burst" (all pages)
- Command: `pdftk input.pdf burst output page_%02d.pdf`

**Tool: `pdftk_rotate`**
- Rotate PDF pages
- Input: PDF file, rotation (90, 180, 270), page range
- Command: `pdftk input.pdf cat 1-5E 6-end output rotated.pdf`

**Tool: `pdftk_encrypt`**
- Encrypt PDF with password
- Input: PDF file, user password, owner password, permissions
- Command: `pdftk input.pdf output encrypted.pdf user_pw password owner_pw owner`

**Tool: `pdftk_decrypt`**
- Decrypt password-protected PDF
- Input: PDF file, password
- Command: `pdftk encrypted.pdf input_pw password output decrypted.pdf`

**Tool: `pdftk_fill_form`**
- Fill PDF form fields
- Input: PDF form, FDF/XFDF data or JSON field values
- Command: `pdftk form.pdf fill_form data.fdf output filled.pdf`

**Tool: `pdftk_generate_fdf`**
- Generate FDF data stencil from PDF form
- Input: PDF form file
- Command: `pdftk form.pdf generate_fdf output data.fdf`

**Tool: `pdftk_attach_file`**
- Attach files to PDF
- Input: PDF file, attachment file(s)
- Command: `pdftk input.pdf attach_files file1.pdf file2.pdf output output.pdf`

**Tool: `pdftk_unpack`**
- Unpack PDF attachments
- Input: PDF file with attachments
- Command: `pdftk input.pdf unpack_files output attachments/`

**Tool: `pdftk_watermark`**
- Apply background watermark or foreground stamp
- Input: PDF file, watermark PDF, position
- Command: `pdftk input.pdf stamp watermark.pdf output watermarked.pdf`

**Tool: `pdftk_report`**
- Report PDF metrics, bookmarks, and metadata
- Input: PDF file, report type (metadata, bookmarks, etc.)
- Command: `pdftk input.pdf dump_data output report.txt`

**Tool: `pdftk_update_metadata`**
- Add/update PDF bookmarks or metadata
- Input: PDF file, metadata JSON or update_data file
- Command: `pdftk input.pdf update_info metadata.txt output output.pdf`

**Tool: `pdftk_repair`**
- Repair corrupted PDF (where possible)
- Input: Corrupted PDF file
- Command: `pdftk corrupted.pdf output repaired.pdf`

#### 2.2 Command Generation Strategy

For MVP (Phase 1), implement command generation:

```javascript
function generatePDFtkCommand(operation, args) {
  switch (operation) {
    case 'merge':
      return `pdftk ${args.files.join(' ')} cat output ${args.output}`;
    case 'split':
      return `pdftk ${args.input} burst output ${args.outputPattern || 'page_%02d.pdf'}`;
    // ... other operations
  }
}
```

Return command with instructions for execution.

### Phase 3: Backend Service Integration (Future)

#### 3.1 Backend Service Requirements
- **Language**: Node.js or Python
- **Dependencies**: PDFtk Server installed
- **API**: RESTful API for PDFtk operations
- **Storage**: Temporary file storage for PDF processing
- **Security**: Input validation, file size limits, timeout handling

#### 3.2 Backend API Design
```
POST /api/pdftk/execute
{
  "operation": "merge",
  "files": ["base64_encoded_pdf1", "base64_encoded_pdf2"],
  "options": { "output": "merged.pdf" }
}
```

#### 3.3 MCP Server Integration
- Add configuration for backend URL
- Proxy requests to backend service
- Handle file uploads/downloads
- Manage authentication if required

### Phase 4: File Handling

#### 4.1 Input Methods
- **Base64 encoding**: PDF content as base64 string
- **URL**: Fetch PDF from URL
- **Cloudflare R2**: Store PDFs in R2 bucket (if available)

#### 4.2 Output Methods
- **Base64 response**: Return processed PDF as base64
- **R2 storage**: Store in R2 and return URL
- **Temporary URL**: Generate temporary download URL

### Phase 5: Documentation

#### 5.1 Server Documentation
- **File**: `docs/servers/MCP_PDFTK_SERVER.md`
- Follow format of `MCP_REPLICATE_SERVER.md`
- Include:
  - API endpoints
  - Tool descriptions
  - Example requests/responses
  - Integration guides
  - Error handling

#### 5.2 Update Deployment Status
- **File**: `docs/servers/MCP_DEPLOYMENT_STATUS.md`
- Add PDFtk server entry

---

## Tool Schema Definitions

### pdftk_merge
```json
{
  "name": "pdftk_merge",
  "description": "Merge multiple PDF files into a single PDF",
  "inputSchema": {
    "type": "object",
    "properties": {
      "files": {
        "type": "array",
        "items": {
          "type": "string",
          "description": "PDF file as base64 string or URL"
        },
        "description": "Array of PDF files to merge"
      },
      "output": {
        "type": "string",
        "description": "Output filename (optional)"
      }
    },
    "required": ["files"]
  }
}
```

### pdftk_split
```json
{
  "name": "pdftk_split",
  "description": "Split PDF into individual pages or page ranges",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "Input PDF file as base64 or URL"
      },
      "pages": {
        "type": "string",
        "description": "Page range (e.g., '1-5', '1,3,5', 'burst' for all pages)",
        "default": "burst"
      },
      "outputPattern": {
        "type": "string",
        "description": "Output filename pattern (e.g., 'page_%02d.pdf')",
        "default": "page_%02d.pdf"
      }
    },
    "required": ["input"]
  }
}
```

### pdftk_rotate
```json
{
  "name": "pdftk_rotate",
  "description": "Rotate PDF pages by 90, 180, or 270 degrees",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "Input PDF file as base64 or URL"
      },
      "rotation": {
        "type": "integer",
        "enum": [90, 180, 270],
        "description": "Rotation angle in degrees"
      },
      "pages": {
        "type": "string",
        "description": "Page range (e.g., '1-5', '1-end', 'all')",
        "default": "all"
      }
    },
    "required": ["input", "rotation"]
  }
}
```

### pdftk_encrypt
```json
{
  "name": "pdftk_encrypt",
  "description": "Encrypt PDF with password protection",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "Input PDF file as base64 or URL"
      },
      "userPassword": {
        "type": "string",
        "description": "User password (required to open PDF)"
      },
      "ownerPassword": {
        "type": "string",
        "description": "Owner password (required for permissions)"
      },
      "permissions": {
        "type": "object",
        "description": "PDF permissions (printing, copying, etc.)",
        "properties": {
          "allowPrinting": { "type": "boolean" },
          "allowModify": { "type": "boolean" },
          "allowCopy": { "type": "boolean" },
          "allowScreenReaders": { "type": "boolean" }
        }
      }
    },
    "required": ["input", "userPassword"]
  }
}
```

### pdftk_decrypt
```json
{
  "name": "pdftk_decrypt",
  "description": "Decrypt password-protected PDF",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "Encrypted PDF file as base64 or URL"
      },
      "password": {
        "type": "string",
        "description": "Password to decrypt PDF"
      }
    },
    "required": ["input", "password"]
  }
}
```

### pdftk_fill_form
```json
{
  "name": "pdftk_fill_form",
  "description": "Fill PDF form fields with data",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "PDF form file as base64 or URL"
      },
      "data": {
        "type": "object",
        "description": "Form field values as key-value pairs",
        "additionalProperties": { "type": "string" }
      },
      "flatten": {
        "type": "boolean",
        "description": "Flatten form (make fields non-editable)",
        "default": false
      }
    },
    "required": ["input", "data"]
  }
}
```

### pdftk_generate_fdf
```json
{
  "name": "pdftk_generate_fdf",
  "description": "Generate FDF data stencil from PDF form",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "PDF form file as base64 or URL"
      }
    },
    "required": ["input"]
  }
}
```

### pdftk_attach_file
```json
{
  "name": "pdftk_attach_file",
  "description": "Attach files to PDF document or pages",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "PDF file as base64 or URL"
      },
      "attachments": {
        "type": "array",
        "items": {
          "type": "string",
          "description": "File to attach (base64 or URL)"
        },
        "description": "Files to attach to PDF"
      },
      "pageNumber": {
        "type": "integer",
        "description": "Page number to attach to (optional, attaches to document if omitted)"
      }
    },
    "required": ["input", "attachments"]
  }
}
```

### pdftk_unpack
```json
{
  "name": "pdftk_unpack",
  "description": "Unpack PDF attachments",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "PDF file with attachments as base64 or URL"
      }
    },
    "required": ["input"]
  }
}
```

### pdftk_watermark
```json
{
  "name": "pdftk_watermark",
  "description": "Apply background watermark or foreground stamp to PDF",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "Input PDF file as base64 or URL"
      },
      "watermark": {
        "type": "string",
        "description": "Watermark PDF file as base64 or URL"
      },
      "position": {
        "type": "string",
        "enum": ["background", "foreground"],
        "description": "Watermark position",
        "default": "background"
      }
    },
    "required": ["input", "watermark"]
  }
}
```

### pdftk_report
```json
{
  "name": "pdftk_report",
  "description": "Report PDF metrics, bookmarks, and metadata",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "PDF file as base64 or URL"
      },
      "reportType": {
        "type": "string",
        "enum": ["metadata", "bookmarks", "pages", "all"],
        "description": "Type of report to generate",
        "default": "all"
      }
    },
    "required": ["input"]
  }
}
```

### pdftk_update_metadata
```json
{
  "name": "pdftk_update_metadata",
  "description": "Add or update PDF bookmarks and metadata",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "PDF file as base64 or URL"
      },
      "metadata": {
        "type": "object",
        "description": "Metadata fields to update",
        "properties": {
          "Title": { "type": "string" },
          "Author": { "type": "string" },
          "Subject": { "type": "string" },
          "Keywords": { "type": "string" },
          "Creator": { "type": "string" },
          "Producer": { "type": "string" }
        }
      },
      "bookmarks": {
        "type": "array",
        "description": "Bookmarks to add",
        "items": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "page": { "type": "integer" },
            "level": { "type": "integer" }
          }
        }
      }
    },
    "required": ["input"]
  }
}
```

### pdftk_repair
```json
{
  "name": "pdftk_repair",
  "description": "Repair corrupted PDF (where possible)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "Corrupted PDF file as base64 or URL"
      }
    },
    "required": ["input"]
  }
}
```

---

## Implementation Steps

### Step 1: Create MCP Server Module
1. Create `src/mcp-pdftk.js`
2. Implement MCP protocol endpoints
3. Add tool definitions (command generation for MVP)
4. Add error handling with `aiGuidance`

### Step 2: Add Routing
1. Update `src/index.js`
2. Add route handler for `/mcp/pdftk/*`
3. Import and register `handleMCPPDFtk`

### Step 3: Implement Command Generation
1. Create command generation functions for each operation
2. Return commands with execution instructions
3. Include validation and error messages

### Step 4: File Handling Utilities
1. Create utilities for base64 encoding/decoding
2. Add URL fetching for PDF files
3. Implement file size validation

### Step 5: Documentation
1. Create `docs/servers/MCP_PDFTK_SERVER.md`
2. Update `docs/servers/MCP_DEPLOYMENT_STATUS.md`
3. Add examples and integration guides

### Step 6: Testing
1. Test MCP protocol endpoints
2. Test command generation
3. Test error handling
4. Test with MCP Inspector

---

## MVP Implementation (Phase 1)

For the initial implementation, focus on:

1. **Command Generation Mode**: Generate PDFtk commands for client execution
2. **Core Operations**: Merge, split, rotate, encrypt, decrypt
3. **Basic File Handling**: Base64 input/output
4. **MCP Protocol Compliance**: Full protocol implementation
5. **Documentation**: Complete API documentation

This allows the MCP server to be functional immediately while a backend service can be added later.

---

## Future Enhancements

### Backend Service Integration
- Deploy Node.js/Python service with PDFtk
- Implement file processing pipeline
- Add authentication and rate limiting
- Support for large file processing

### Advanced Features
- Batch processing
- PDF comparison/diff
- OCR integration
- PDF/A compliance
- Digital signatures

### Performance Optimizations
- Streaming for large files
- Parallel processing
- Caching for repeated operations
- CDN integration for output files

---

## Security Considerations

1. **File Size Limits**: Enforce maximum file sizes
2. **Input Validation**: Validate all PDF inputs
3. **Command Injection**: Sanitize all command parameters
4. **Rate Limiting**: Prevent abuse
5. **Authentication**: Secure backend service (if implemented)

---

## Dependencies

### Required (for command generation mode)
- None (pure JavaScript in Cloudflare Worker)

### Required (for backend service)
- PDFtk Server (system installation)
- Node.js or Python runtime
- File storage (temporary)

---

## References

- [PDFtk Server Documentation](https://www.pdflabs.com/tools/pdftk-server/)
- [PDFtk Manual](https://www.pdflabs.com/docs/pdftk-man-page/)
- [PDFtk Examples](https://www.pdflabs.com/docs/pdftk-cli-examples/)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

---

## Status

- [ ] Phase 1: Core MCP Server Structure
- [ ] Phase 2: PDFtk Tools Implementation
- [ ] Phase 3: Backend Service Integration
- [ ] Phase 4: File Handling
- [ ] Phase 5: Documentation
- [ ] Phase 6: Testing

**Next Steps**: Begin Phase 1 implementation


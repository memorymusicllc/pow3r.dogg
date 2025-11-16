#!/bin/bash
# Test XMAP MCP Server Connection
# Verifies that XMAP MCP server is accessible and responding

set -e

XMAP_BASE_URL="${XMAP_BASE_URL:-https://config.superbots.link/mcp/xmap}"

echo "🔍 Testing XMAP MCP Server Connection"
echo "======================================"
echo ""
echo "Base URL: $XMAP_BASE_URL"
echo ""

# Test 1: Initialize connection
echo "📡 Test 1: Initialize MCP connection..."
INIT_RESPONSE=$(curl -s -X POST "$XMAP_BASE_URL/initialize" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$INIT_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$INIT_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Connection successful"
  echo "Response: $BODY"
  
  # Parse response
  NAME=$(echo "$BODY" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
  VERSION=$(echo "$BODY" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
  
  echo ""
  echo "Server Info:"
  echo "  Name: $NAME"
  echo "  Version: $VERSION"
else
  echo "❌ Connection failed (HTTP $HTTP_STATUS)"
  echo "Response: $BODY"
  exit 1
fi

echo ""

# Test 2: List available tools (if endpoint exists)
echo "📋 Test 2: Checking available tools..."
TOOLS_RESPONSE=$(curl -s -X POST "$XMAP_BASE_URL/tools/list" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP_STATUS:%{http_code}" 2>/dev/null || echo "HTTP_STATUS:404")

TOOLS_HTTP_STATUS=$(echo "$TOOLS_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2 || echo "404")

if [ "$TOOLS_HTTP_STATUS" = "200" ]; then
  echo "✅ Tools endpoint accessible"
  TOOLS_BODY=$(echo "$TOOLS_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "Available tools:"
  echo "$TOOLS_BODY" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sed 's/^/  - /' || echo "  (Unable to parse)"
else
  echo "⚠️  Tools endpoint not available (this is OK if using direct tool calls)"
fi

echo ""
echo "✅ XMAP MCP Server connection test completed successfully!"
echo ""
echo "Next steps:"
echo "  1. Verify XMAP client configuration in src/xmap/integration.ts"
echo "  2. Test XMAP operations via MCP tools"
echo "  3. Configure GitHub webhook for XMAP sync"


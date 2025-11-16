#!/bin/bash
# Comprehensive Setup Verification Script
# Verifies all next steps are properly configured

set -e

WORKER_URL="${WORKER_URL:-https://pow3r-defender-production.workers.dev}"
XMAP_BASE_URL="${XMAP_BASE_URL:-https://config.superbots.link/mcp/xmap}"

echo "🔍 Pow3r Defender Setup Verification"
echo "===================================="
echo ""
echo "Worker URL: $WORKER_URL"
echo "XMAP URL: $XMAP_BASE_URL"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Function to check result
check_result() {
  local name=$1
  local status=$2
  local message=$3
  
  if [ "$status" = "pass" ]; then
    echo "✅ $name: $message"
    ((PASSED++))
  elif [ "$status" = "warn" ]; then
    echo "⚠️  $name: $message"
    ((WARNINGS++))
  else
    echo "❌ $name: $message"
    ((FAILED++))
  fi
}

# Step 1: Telegram Bot Credentials
echo "📱 Step 1: Telegram Bot Credentials"
echo "-----------------------------------"

# Check if secrets are set (via wrangler)
if command -v wrangler &> /dev/null || command -v npx &> /dev/null; then
  SECRETS_CHECK=$(npx wrangler secret list 2>/dev/null | grep -E "(TELEGRAM_API_ID|TELEGRAM_API_HASH|TELEGRAM_BOT_TOKEN)" || echo "")
  if [ -n "$SECRETS_CHECK" ]; then
    check_result "Telegram Secrets" "pass" "Secrets configured via Wrangler"
  else
    check_result "Telegram Secrets" "warn" "Secrets may not be set (check manually)"
  fi
else
  check_result "Telegram Secrets" "warn" "Wrangler not available, check manually"
fi

# Test worker health
HEALTH_RESPONSE=$(curl -s "$WORKER_URL/health" --max-time 5 || echo "ERROR")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
  check_result "Worker Health" "pass" "Worker is online"
else
  check_result "Worker Health" "fail" "Worker is not responding"
fi

echo ""

# Step 2: XMAP MCP Server Connection
echo "🗺️  Step 2: XMAP MCP Server Connection"
echo "--------------------------------------"

XMAP_RESPONSE=$(curl -s -X POST "$XMAP_BASE_URL/initialize" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 10 \
  -w "\nHTTP_STATUS:%{http_code}" || echo "ERROR")

if echo "$XMAP_RESPONSE" | grep -q "HTTP_STATUS:200"; then
  check_result "XMAP Connection" "pass" "XMAP MCP server is accessible"
  
  # Check server info
  NAME=$(echo "$XMAP_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || echo "")
  if [ -n "$NAME" ]; then
    check_result "XMAP Server Info" "pass" "Server name: $NAME"
  fi
else
  check_result "XMAP Connection" "fail" "Cannot connect to XMAP MCP server"
fi

echo ""

# Step 3: Abi Webhook URL
echo "🤖 Step 3: Abi Webhook URL"
echo "--------------------------"

# Check if ABI_WEBHOOK_URL is set
if [ -n "$ABI_WEBHOOK_URL" ]; then
  check_result "Abi Webhook URL" "pass" "Environment variable set"
  
  # Test connectivity
  ABI_TEST=$(curl -s -X POST "$ABI_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{"event_type":"test","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' \
    --max-time 10 \
    -w "\nHTTP_STATUS:%{http_code}" 2>/dev/null || echo "ERROR")
  
  if echo "$ABI_TEST" | grep -q "HTTP_STATUS:200\|HTTP_STATUS:201\|HTTP_STATUS:202"; then
    check_result "Abi Webhook Connectivity" "pass" "Webhook is accessible"
  else
    check_result "Abi Webhook Connectivity" "warn" "Webhook may not be responding correctly"
  fi
else
  check_result "Abi Webhook URL" "warn" "ABI_WEBHOOK_URL not set (may be configured via Wrangler secret)"
fi

echo ""

# Step 4: Guard Dog Monitoring
echo "🐕 Step 4: Guard Dog Monitoring"
echo "-------------------------------"

# Test Guard Dog endpoint
GUARD_TEST=$(curl -s -X POST "$WORKER_URL/telegram/guard/deploy" \
  -H "Content-Type: application/json" \
  -d '{"chatId":"test_verify","userId":"test_user"}' \
  --max-time 10 \
  -w "\nHTTP_STATUS:%{http_code}" 2>/dev/null || echo "ERROR")

if echo "$GUARD_TEST" | grep -q "HTTP_STATUS:200"; then
  check_result "Guard Dog Endpoint" "pass" "Guard Dog API is accessible"
  
  # Check state endpoint
  GUARD_STATE=$(curl -s -X GET "$WORKER_URL/telegram/guard/state?chatId=test_verify&userId=test_user" \
    --max-time 10 \
    -w "\nHTTP_STATUS:%{http_code}" 2>/dev/null || echo "ERROR")
  
  if echo "$GUARD_STATE" | grep -q "HTTP_STATUS:200"; then
    check_result "Guard Dog State Endpoint" "pass" "State retrieval works"
  else
    check_result "Guard Dog State Endpoint" "warn" "State endpoint may need testing"
  fi
else
  check_result "Guard Dog Endpoint" "fail" "Guard Dog API is not accessible"
fi

echo ""

# Step 5: Impersonation Bot
echo "🤖 Step 5: Impersonation Bot"
echo "----------------------------"

# Test Impersonation endpoint
IMPERSON_TEST=$(curl -s -X POST "$WORKER_URL/telegram/impersonate/enable" \
  -H "Content-Type: application/json" \
  -d '{"chatId":"test_verify","attackerId":"test_attacker","victimId":"test_victim"}' \
  --max-time 10 \
  -w "\nHTTP_STATUS:%{http_code}" 2>/dev/null || echo "ERROR")

if echo "$IMPERSON_TEST" | grep -q "HTTP_STATUS:200"; then
  check_result "Impersonation Endpoint" "pass" "Impersonation API is accessible"
  
  # Check state endpoint
  IMPERSON_STATE=$(curl -s -X GET "$WORKER_URL/telegram/impersonate/state?chatId=test_verify&attackerId=test_attacker" \
    --max-time 10 \
    -w "\nHTTP_STATUS:%{http_code}" 2>/dev/null || echo "ERROR")
  
  if echo "$IMPERSON_STATE" | grep -q "HTTP_STATUS:200"; then
    check_result "Impersonation State Endpoint" "pass" "State retrieval works"
  else
    check_result "Impersonation State Endpoint" "warn" "State endpoint may need testing"
  fi
  
  # Clean up test data
  curl -s -X POST "$WORKER_URL/telegram/impersonate/disable" \
    -H "Content-Type: application/json" \
    -d '{"chatId":"test_verify","attackerId":"test_attacker"}' \
    --max-time 10 > /dev/null 2>&1 || true
else
  check_result "Impersonation Endpoint" "fail" "Impersonation API is not accessible"
fi

echo ""

# Summary
echo "📊 Verification Summary"
echo "======================="
echo "✅ Passed: $PASSED"
echo "⚠️  Warnings: $WARNINGS"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    echo "🎉 All checks passed! Setup is complete."
    exit 0
  else
    echo "✅ Core setup is complete, but some optional checks have warnings."
    echo "   Review warnings above and address as needed."
    exit 0
  fi
else
  echo "❌ Some checks failed. Please review and fix the issues above."
  exit 1
fi


#!/bin/bash
# End-to-End Testing with Abi Notifications
# Tests all endpoints and reports progress to Abi

set -e

WORKER_URL="${WORKER_URL:-https://pow3r-defender-production.contact-7d8.workers.dev}"
XMAP_BASE_URL="${XMAP_BASE_URL:-https://config.superbots.link/mcp/xmap}"

# Test IDs
TEST_CHAT_ID="e2e_test_$(date +%s)"
TEST_USER_ID="e2e_user_$(date +%s)"
TEST_ATTACKER_ID="e2e_attacker_$(date +%s)"
TEST_VICTIM_ID="e2e_victim_$(date +%s)"

PASSED=0
FAILED=0
WARNINGS=0

# Notify Abi function
notify_abi() {
  local step="$1"
  local status="$2"
  local message="$3"
  
  if [ -f "./scripts/notify-abi.sh" ] && [ -n "$ABI_WEBHOOK_URL" ]; then
    ./scripts/notify-abi.sh "$step" "$status" "$message" || true
  fi
  
  echo "[Abi] $step: $status - $message"
}

# Test result function
test_result() {
  local name="$1"
  local status="$2"
  local message="$3"
  
  if [ "$status" = "pass" ]; then
    echo "✅ $name: $message"
    ((PASSED++))
    notify_abi "test_$name" "completed" "$message"
  elif [ "$status" = "warn" ]; then
    echo "⚠️  $name: $message"
    ((WARNINGS++))
    notify_abi "test_$name" "warning" "$message"
  else
    echo "❌ $name: $message"
    ((FAILED++))
    notify_abi "test_$name" "failed" "$message"
  fi
}

echo "🧪 Pow3r Defender E2E Testing with Abi"
echo "========================================"
echo ""
echo "Worker URL: $WORKER_URL"
echo "Test Chat ID: $TEST_CHAT_ID"
echo ""

notify_abi "e2e_testing" "in_progress" "Starting E2E test suite"

# Test 1: Health Check
echo "📡 Test 1: Health Check"
echo "----------------------"
HEALTH_RESPONSE=$(curl -s "$WORKER_URL/health" --max-time 10 || echo "ERROR")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
  test_result "health_check" "pass" "Worker is healthy"
  echo "Response: $HEALTH_RESPONSE"
else
  test_result "health_check" "fail" "Health check failed"
  echo "Response: $HEALTH_RESPONSE"
  exit 1
fi
echo ""

# Test 2: Guard Dog Deploy
echo "🐕 Test 2: Guard Dog Deployment"
echo "-------------------------------"
GUARD_DEPLOY=$(curl -s -X POST "$WORKER_URL/telegram/guard/deploy" \
  -H "Content-Type: application/json" \
  -d "{
    \"chatId\": \"$TEST_CHAT_ID\",
    \"userId\": \"$TEST_USER_ID\"
  }" \
  --max-time 10 \
  -w "\nHTTP_STATUS:%{http_code}" || echo "ERROR")

HTTP_STATUS=$(echo "$GUARD_DEPLOY" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2 || echo "000")
BODY=$(echo "$GUARD_DEPLOY" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "200" ]; then
  test_result "guard_dog_deploy" "pass" "Guard Dog deployed successfully"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  test_result "guard_dog_deploy" "fail" "Deployment failed (HTTP $HTTP_STATUS)"
  echo "Response: $BODY"
fi
echo ""

# Test 3: Guard Dog State
echo "📊 Test 3: Guard Dog State Retrieval"
echo "-------------------------------------"
GUARD_STATE=$(curl -s -X GET "$WORKER_URL/telegram/guard/state?chatId=$TEST_CHAT_ID&userId=$TEST_USER_ID" \
  --max-time 10 \
  -w "\nHTTP_STATUS:%{http_code}" || echo "ERROR")

STATE_HTTP=$(echo "$GUARD_STATE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2 || echo "000")
STATE_BODY=$(echo "$GUARD_STATE" | sed '/HTTP_STATUS:/d')

if [ "$STATE_HTTP" = "200" ]; then
  test_result "guard_dog_state" "pass" "State retrieved successfully"
  echo "$STATE_BODY" | jq '.' 2>/dev/null || echo "$STATE_BODY"
else
  test_result "guard_dog_state" "fail" "State retrieval failed (HTTP $STATE_HTTP)"
  echo "Response: $STATE_BODY"
fi
echo ""

# Test 4: Guard Dog Manipulation Detection
echo "🔍 Test 4: Guard Dog Manipulation Detection"
echo "-------------------------------------------"
GUARD_DETECT=$(curl -s -X POST "$WORKER_URL/telegram/guard" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"process\",
    \"chatId\": \"$TEST_CHAT_ID\",
    \"userId\": \"$TEST_USER_ID\",
    \"message\": {
      \"text\": \"URGENT! Need password immediately!\",
      \"messageId\": \"msg_$(date +%s)\",
      \"timestamp\": $(date +%s)000,
      \"isSelfDestruct\": false
    }
  }" \
  --max-time 10 \
  -w "\nHTTP_STATUS:%{http_code}" || echo "ERROR")

DETECT_HTTP=$(echo "$GUARD_DETECT" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2 || echo "000")
DETECT_BODY=$(echo "$GUARD_DETECT" | sed '/HTTP_STATUS:/d')

if [ "$DETECT_HTTP" = "200" ]; then
  DETECTED=$(echo "$DETECT_BODY" | jq -r '.detection.detected // false' 2>/dev/null || echo "false")
  if [ "$DETECTED" = "true" ]; then
    test_result "guard_dog_detection" "pass" "Manipulation detected successfully"
  else
    test_result "guard_dog_detection" "warn" "Message processed but no manipulation detected"
  fi
  echo "$DETECT_BODY" | jq '.' 2>/dev/null || echo "$DETECT_BODY"
else
  test_result "guard_dog_detection" "fail" "Detection failed (HTTP $DETECT_HTTP)"
  echo "Response: $DETECT_BODY"
fi
echo ""

# Test 5: Impersonation Bot Enable
echo "🤖 Test 5: Impersonation Bot Enable"
echo "-----------------------------------"
IMPERSON_ENABLE=$(curl -s -X POST "$WORKER_URL/telegram/impersonate/enable" \
  -H "Content-Type: application/json" \
  -d "{
    \"chatId\": \"$TEST_CHAT_ID\",
    \"attackerId\": \"$TEST_ATTACKER_ID\",
    \"victimId\": \"$TEST_VICTIM_ID\",
    \"styleData\": {
      \"averageResponseTime\": 60,
      \"emojiUsage\": [\"👍\"],
      \"punctuationStyle\": \"standard\"
    }
  }" \
  --max-time 10 \
  -w "\nHTTP_STATUS:%{http_code}" || echo "ERROR")

IMP_ENABLE_HTTP=$(echo "$IMPERSON_ENABLE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2 || echo "000")
IMP_ENABLE_BODY=$(echo "$IMPERSON_ENABLE" | sed '/HTTP_STATUS:/d')

if [ "$IMP_ENABLE_HTTP" = "200" ]; then
  test_result "impersonation_enable" "pass" "Impersonation bot enabled"
  echo "$IMP_ENABLE_BODY" | jq '.' 2>/dev/null || echo "$IMP_ENABLE_BODY"
else
  test_result "impersonation_enable" "fail" "Enable failed (HTTP $IMP_ENABLE_HTTP)"
  echo "Response: $IMP_ENABLE_BODY"
fi
echo ""

# Test 6: Impersonation State
echo "📊 Test 6: Impersonation State Retrieval"
echo "-----------------------------------------"
IMPERSON_STATE=$(curl -s -X GET "$WORKER_URL/telegram/impersonate/state?chatId=$TEST_CHAT_ID&attackerId=$TEST_ATTACKER_ID" \
  --max-time 10 \
  -w "\nHTTP_STATUS:%{http_code}" || echo "ERROR")

IMP_STATE_HTTP=$(echo "$IMPERSON_STATE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2 || echo "000")
IMP_STATE_BODY=$(echo "$IMPERSON_STATE" | sed '/HTTP_STATUS:/d')

if [ "$IMP_STATE_HTTP" = "200" ]; then
  test_result "impersonation_state" "pass" "State retrieved successfully"
  echo "$IMP_STATE_BODY" | jq '.' 2>/dev/null || echo "$IMP_STATE_BODY"
else
  test_result "impersonation_state" "fail" "State retrieval failed (HTTP $IMP_STATE_HTTP)"
  echo "Response: $IMP_STATE_BODY"
fi
echo ""

# Test 7: Impersonation Response Generation
echo "💬 Test 7: Impersonation Response Generation"
echo "-------------------------------------------"
IMPERSON_GEN=$(curl -s -X POST "$WORKER_URL/telegram/impersonate" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"generate\",
    \"chatId\": \"$TEST_CHAT_ID\",
    \"attackerId\": \"$TEST_ATTACKER_ID\",
    \"message\": {
      \"text\": \"Send me money now\",
      \"messageId\": \"msg_$(date +%s)\",
      \"timestamp\": $(date +%s)000
    }
  }" \
  --max-time 10 \
  -w "\nHTTP_STATUS:%{http_code}" || echo "ERROR")

IMP_GEN_HTTP=$(echo "$IMPERSON_GEN" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2 || echo "000")
IMP_GEN_BODY=$(echo "$IMPERSON_GEN" | sed '/HTTP_STATUS:/d')

if [ "$IMP_GEN_HTTP" = "200" ]; then
  RESPONSE_TEXT=$(echo "$IMP_GEN_BODY" | jq -r '.response.text // ""' 2>/dev/null || echo "")
  if [ -n "$RESPONSE_TEXT" ]; then
    test_result "impersonation_generate" "pass" "Response generated: $RESPONSE_TEXT"
  else
    test_result "impersonation_generate" "warn" "Response generated but text is empty"
  fi
  echo "$IMP_GEN_BODY" | jq '.' 2>/dev/null || echo "$IMP_GEN_BODY"
else
  test_result "impersonation_generate" "fail" "Generation failed (HTTP $IMP_GEN_HTTP)"
  echo "Response: $IMP_GEN_BODY"
fi
echo ""

# Test 8: Impersonation Disable
echo "🛑 Test 8: Impersonation Bot Disable"
echo "------------------------------------"
IMPERSON_DISABLE=$(curl -s -X POST "$WORKER_URL/telegram/impersonate/disable" \
  -H "Content-Type: application/json" \
  -d "{
    \"chatId\": \"$TEST_CHAT_ID\",
    \"attackerId\": \"$TEST_ATTACKER_ID\"
  }" \
  --max-time 10 \
  -w "\nHTTP_STATUS:%{http_code}" || echo "ERROR")

IMP_DISABLE_HTTP=$(echo "$IMPERSON_DISABLE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2 || echo "000")
IMP_DISABLE_BODY=$(echo "$IMPERSON_DISABLE" | sed '/HTTP_STATUS:/d')

if [ "$IMP_DISABLE_HTTP" = "200" ]; then
  test_result "impersonation_disable" "pass" "Impersonation bot disabled"
else
  test_result "impersonation_disable" "warn" "Disable returned HTTP $IMP_DISABLE_HTTP"
  echo "Response: $IMP_DISABLE_BODY"
fi
echo ""

# Test 9: XMAP Connection
echo "🗺️  Test 9: XMAP MCP Connection"
echo "-------------------------------"
XMAP_RESPONSE=$(curl -s -X POST "$XMAP_BASE_URL/initialize" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 10 \
  -w "\nHTTP_STATUS:%{http_code}" || echo "ERROR")

XMAP_HTTP=$(echo "$XMAP_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2 || echo "000")
XMAP_BODY=$(echo "$XMAP_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$XMAP_HTTP" = "200" ]; then
  test_result "xmap_connection" "pass" "XMAP MCP server accessible"
  echo "$XMAP_BODY" | jq '.' 2>/dev/null || echo "$XMAP_BODY"
else
  test_result "xmap_connection" "warn" "XMAP connection returned HTTP $XMAP_HTTP"
  echo "Response: $XMAP_BODY"
fi
echo ""

# Summary
echo "📊 E2E Test Summary"
echo "==================="
echo "✅ Passed: $PASSED"
echo "⚠️  Warnings: $WARNINGS"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    notify_abi "e2e_testing" "completed" "All tests passed ($PASSED passed, $WARNINGS warnings, $FAILED failed)"
    echo "🎉 All tests passed!"
    exit 0
  else
    notify_abi "e2e_testing" "completed" "Tests completed with warnings ($PASSED passed, $WARNINGS warnings, $FAILED failed)"
    echo "✅ Core tests passed, but some warnings exist"
    exit 0
  fi
else
  notify_abi "e2e_testing" "failed" "Some tests failed ($PASSED passed, $WARNINGS warnings, $FAILED failed)"
  echo "❌ Some tests failed. Review output above."
  exit 1
fi


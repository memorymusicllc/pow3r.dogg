#!/bin/bash
# Test Guard Dog Monitoring
# Tests Guard Dog deployment, state checking, and manipulation detection

set -e

WORKER_URL="${WORKER_URL:-https://pow3r-defender-production.workers.dev}"
CHAT_ID="${CHAT_ID:-test_chat_123}"
USER_ID="${USER_ID:-test_user_456}"

echo "🐕 Testing Guard Dog Monitoring"
echo "================================"
echo ""
echo "Worker URL: $WORKER_URL"
echo "Chat ID: $CHAT_ID"
echo "User ID: $USER_ID"
echo ""

# Test 1: Deploy Guard Dog
echo "📡 Test 1: Deploying Guard Dog..."
DEPLOY_RESPONSE=$(curl -s -X POST "$WORKER_URL/telegram/guard/deploy" \
  -H "Content-Type: application/json" \
  -d "{
    \"chatId\": \"$CHAT_ID\",
    \"userId\": \"$USER_ID\"
  }" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$DEPLOY_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$DEPLOY_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Guard Dog deployed successfully"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ Deployment failed (HTTP $HTTP_STATUS)"
  echo "Response: $BODY"
  exit 1
fi

echo ""

# Test 2: Check Guard Dog state
echo "📊 Test 2: Checking Guard Dog state..."
STATE_RESPONSE=$(curl -s -X GET "$WORKER_URL/telegram/guard/state?chatId=$CHAT_ID&userId=$USER_ID" \
  -w "\nHTTP_STATUS:%{http_code}")

STATE_HTTP_STATUS=$(echo "$STATE_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
STATE_BODY=$(echo "$STATE_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$STATE_HTTP_STATUS" = "200" ]; then
  echo "✅ State retrieved successfully"
  echo "$STATE_BODY" | jq '.' 2>/dev/null || echo "$STATE_BODY"
  
  # Extract threat score
  THREAT_SCORE=$(echo "$STATE_BODY" | jq -r '.state.threatScore // 0' 2>/dev/null || echo "0")
  MESSAGE_COUNT=$(echo "$STATE_BODY" | jq -r '.state.messageCount // 0' 2>/dev/null || echo "0")
  
  echo ""
  echo "Current Status:"
  echo "  Threat Score: $THREAT_SCORE"
  echo "  Message Count: $MESSAGE_COUNT"
else
  echo "❌ State check failed (HTTP $STATE_HTTP_STATUS)"
  echo "Response: $STATE_BODY"
  exit 1
fi

echo ""

# Test 3: Test manipulation detection (social engineering)
echo "🔍 Test 3: Testing manipulation detection..."
DETECTION_RESPONSE=$(curl -s -X POST "$WORKER_URL/telegram/guard" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"process\",
    \"chatId\": \"$CHAT_ID\",
    \"userId\": \"$USER_ID\",
    \"message\": {
      \"text\": \"URGENT! Need your password immediately to verify your account!\",
      \"messageId\": \"msg_$(date +%s)\",
      \"timestamp\": $(date +%s)000,
      \"isSelfDestruct\": false,
      \"isEdited\": false,
      \"isDeleted\": false
    }
  }" \
  -w "\nHTTP_STATUS:%{http_code}")

DETECTION_HTTP_STATUS=$(echo "$DETECTION_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
DETECTION_BODY=$(echo "$DETECTION_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$DETECTION_HTTP_STATUS" = "200" ]; then
  echo "✅ Message processed"
  echo "$DETECTION_BODY" | jq '.' 2>/dev/null || echo "$DETECTION_BODY"
  
  # Check if manipulation was detected
  DETECTED=$(echo "$DETECTION_BODY" | jq -r '.detection.detected // false' 2>/dev/null || echo "false")
  CONFIDENCE=$(echo "$DETECTION_BODY" | jq -r '.detection.confidence // 0' 2>/dev/null || echo "0")
  
  echo ""
  if [ "$DETECTED" = "true" ]; then
    echo "✅ Manipulation DETECTED"
    echo "  Confidence: $CONFIDENCE"
    echo "  Rule: $(echo "$DETECTION_BODY" | jq -r '.detection.rule // "unknown"' 2>/dev/null || echo "unknown")"
  else
    echo "⚠️  No manipulation detected (may need to adjust thresholds)"
  fi
else
  echo "❌ Detection test failed (HTTP $DETECTION_HTTP_STATUS)"
  echo "Response: $DETECTION_BODY"
  exit 1
fi

echo ""

# Test 4: Test self-destruct detection
echo "💣 Test 4: Testing self-destruct message detection..."
SELF_DESTRUCT_RESPONSE=$(curl -s -X POST "$WORKER_URL/telegram/guard" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"process\",
    \"chatId\": \"$CHAT_ID\",
    \"userId\": \"$USER_ID\",
    \"message\": {
      \"text\": \"This message will self-destruct\",
      \"messageId\": \"msg_$(date +%s)\",
      \"timestamp\": $(date +%s)000,
      \"isSelfDestruct\": true,
      \"isEdited\": false,
      \"isDeleted\": false
    }
  }" \
  -w "\nHTTP_STATUS:%{http_code}")

SD_HTTP_STATUS=$(echo "$SELF_DESTRUCT_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
SD_BODY=$(echo "$SELF_DESTRUCT_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$SD_HTTP_STATUS" = "200" ]; then
  SD_DETECTED=$(echo "$SD_BODY" | jq -r '.detection.detected // false' 2>/dev/null || echo "false")
  if [ "$SD_DETECTED" = "true" ]; then
    echo "✅ Self-destruct message detected"
    echo "  Action: $(echo "$SD_BODY" | jq -r '.detection.action // "unknown"' 2>/dev/null || echo "unknown")"
  else
    echo "⚠️  Self-destruct not detected (check configuration)"
  fi
else
  echo "❌ Self-destruct test failed (HTTP $SD_HTTP_STATUS)"
fi

echo ""
echo "✅ Guard Dog monitoring test completed!"
echo ""
echo "Next steps:"
echo "  1. Monitor real Telegram messages"
echo "  2. Check Abi notifications for detected manipulations"
echo "  3. Review threat scores and adjust thresholds if needed"


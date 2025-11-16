#!/bin/bash
# Test Impersonation Bot
# Tests impersonation bot enable, response generation, and state management

set -e

WORKER_URL="${WORKER_URL:-https://pow3r-defender-production.workers.dev}"
CHAT_ID="${CHAT_ID:-test_chat_123}"
ATTACKER_ID="${ATTACKER_ID:-attacker_789}"
VICTIM_ID="${VICTIM_ID:-victim_012}"

echo "🤖 Testing Impersonation Bot"
echo "============================="
echo ""
echo "Worker URL: $WORKER_URL"
echo "Chat ID: $CHAT_ID"
echo "Attacker ID: $ATTACKER_ID"
echo "Victim ID: $VICTIM_ID"
echo ""

# Test 1: Enable impersonation
echo "📡 Test 1: Enabling impersonation bot..."
ENABLE_RESPONSE=$(curl -s -X POST "$WORKER_URL/telegram/impersonate/enable" \
  -H "Content-Type: application/json" \
  -d "{
    \"chatId\": \"$CHAT_ID\",
    \"attackerId\": \"$ATTACKER_ID\",
    \"victimId\": \"$VICTIM_ID\",
    \"styleData\": {
      \"averageResponseTime\": 60,
      \"emojiUsage\": [\"👍\", \"😊\"],
      \"punctuationStyle\": \"standard\",
      \"commonPhrases\": [\"Let me think about that\", \"I need to check\"]
    }
  }" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$ENABLE_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$ENABLE_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Impersonation bot enabled successfully"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ Enable failed (HTTP $HTTP_STATUS)"
  echo "Response: $BODY"
  exit 1
fi

echo ""

# Test 2: Check impersonation state
echo "📊 Test 2: Checking impersonation state..."
STATE_RESPONSE=$(curl -s -X GET "$WORKER_URL/telegram/impersonate/state?chatId=$CHAT_ID&attackerId=$ATTACKER_ID" \
  -w "\nHTTP_STATUS:%{http_code}")

STATE_HTTP_STATUS=$(echo "$STATE_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
STATE_BODY=$(echo "$STATE_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$STATE_HTTP_STATUS" = "200" ]; then
  echo "✅ State retrieved successfully"
  echo "$STATE_BODY" | jq '.' 2>/dev/null || echo "$STATE_BODY"
  
  # Extract metrics
  TIME_WASTED=$(echo "$STATE_BODY" | jq -r '.state.timeWasted // 0' 2>/dev/null || echo "0")
  MESSAGE_COUNT=$(echo "$STATE_BODY" | jq -r '.state.messageCount // 0' 2>/dev/null || echo "0")
  ENABLED=$(echo "$STATE_BODY" | jq -r '.state.enabled // false' 2>/dev/null || echo "false")
  
  echo ""
  echo "Current Status:"
  echo "  Enabled: $ENABLED"
  echo "  Time Wasted: ${TIME_WASTED}s ($(echo "scale=2; $TIME_WASTED/3600" | bc) hours)"
  echo "  Message Count: $MESSAGE_COUNT"
else
  echo "❌ State check failed (HTTP $STATE_HTTP_STATUS)"
  echo "Response: $STATE_BODY"
  exit 1
fi

echo ""

# Test 3: Generate response
echo "💬 Test 3: Generating response to attacker message..."
GENERATE_RESPONSE=$(curl -s -X POST "$WORKER_URL/telegram/impersonate" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"generate\",
    \"chatId\": \"$CHAT_ID\",
    \"attackerId\": \"$ATTACKER_ID\",
    \"message\": {
      \"text\": \"I need you to send me $5000 immediately for an urgent payment\",
      \"messageId\": \"msg_$(date +%s)\",
      \"timestamp\": $(date +%s)000
    }
  }" \
  -w "\nHTTP_STATUS:%{http_code}")

GEN_HTTP_STATUS=$(echo "$GENERATE_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
GEN_BODY=$(echo "$GENERATE_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$GEN_HTTP_STATUS" = "200" ]; then
  echo "✅ Response generated"
  echo "$GEN_BODY" | jq '.' 2>/dev/null || echo "$GEN_BODY"
  
  # Extract response details
  RESPONSE_TEXT=$(echo "$GEN_BODY" | jq -r '.response.text // "No response"' 2>/dev/null || echo "No response")
  DELAY=$(echo "$GEN_BODY" | jq -r '.response.delay // 0' 2>/dev/null || echo "0")
  SHOULD_CONTINUE=$(echo "$GEN_BODY" | jq -r '.response.shouldContinue // false' 2>/dev/null || echo "false")
  
  echo ""
  echo "Generated Response:"
  echo "  Text: $RESPONSE_TEXT"
  echo "  Delay: ${DELAY}ms ($(echo "scale=2; $DELAY/1000" | bc)s)"
  echo "  Should Continue: $SHOULD_CONTINUE"
else
  echo "❌ Response generation failed (HTTP $GEN_HTTP_STATUS)"
  echo "Response: $GEN_BODY"
  exit 1
fi

echo ""

# Test 4: Test time waste strategy selection
echo "⏱️  Test 4: Testing time waste strategies..."
echo "Testing different time waste scenarios..."

# Test extended questions (0-2 hours)
echo "  - Extended questions strategy (early stage)..."
EARLY_RESPONSE=$(curl -s -X POST "$WORKER_URL/telegram/impersonate" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"generate\",
    \"chatId\": \"$CHAT_ID\",
    \"attackerId\": \"$ATTACKER_ID\",
    \"message\": {
      \"text\": \"Can you send the money now?\",
      \"messageId\": \"msg_early\",
      \"timestamp\": $(date +%s)000
    }
  }" 2>/dev/null)

EARLY_TEXT=$(echo "$EARLY_RESPONSE" | jq -r '.response.text // ""' 2>/dev/null || echo "")
if [ -n "$EARLY_TEXT" ]; then
  echo "    ✅ Response: $EARLY_TEXT"
else
  echo "    ⚠️  No response generated"
fi

echo ""

# Test 5: Disable impersonation
echo "🛑 Test 5: Disabling impersonation bot..."
DISABLE_RESPONSE=$(curl -s -X POST "$WORKER_URL/telegram/impersonate/disable" \
  -H "Content-Type: application/json" \
  -d "{
    \"chatId\": \"$CHAT_ID\",
    \"attackerId\": \"$ATTACKER_ID\"
  }" \
  -w "\nHTTP_STATUS:%{http_code}")

DISABLE_HTTP_STATUS=$(echo "$DISABLE_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
DISABLE_BODY=$(echo "$DISABLE_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$DISABLE_HTTP_STATUS" = "200" ]; then
  echo "✅ Impersonation bot disabled successfully"
else
  echo "❌ Disable failed (HTTP $DISABLE_HTTP_STATUS)"
  echo "Response: $DISABLE_BODY"
fi

echo ""
echo "✅ Impersonation bot test completed!"
echo ""
echo "Next steps:"
echo "  1. Enable impersonation for real attacker conversations"
echo "  2. Monitor time wasted metrics"
echo "  3. Adjust style profiles based on victim behavior"
echo "  4. Check Abi notifications for impersonation events"


#!/bin/bash
# Test Abi Webhook Integration
# Verifies Abi webhook URL is configured and can receive notifications

set -e

ABI_WEBHOOK_URL="${ABI_WEBHOOK_URL:-}"

echo "🤖 Testing Abi Webhook Integration"
echo "=================================="
echo ""

# Check if webhook URL is set
if [ -z "$ABI_WEBHOOK_URL" ]; then
  echo "⚠️  ABI_WEBHOOK_URL not set in environment"
  echo ""
  echo "Please set it via one of these methods:"
  echo "  1. Environment variable: export ABI_WEBHOOK_URL=\"https://your-abi-instance.com/webhooks/pow3r-defender\""
  echo "  2. Wrangler secret: npx wrangler secret put ABI_WEBHOOK_URL"
  echo "  3. Or enter it now:"
  read -p "Abi Webhook URL: " ABI_WEBHOOK_URL
fi

if [ -z "$ABI_WEBHOOK_URL" ]; then
  echo "❌ Abi webhook URL is required"
  exit 1
fi

echo "Webhook URL: $ABI_WEBHOOK_URL"
echo ""

# Test 1: Basic connectivity
echo "📡 Test 1: Testing webhook connectivity..."
CONNECTIVITY_RESPONSE=$(curl -s -X POST "$ABI_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Pow3r-Defender-Test/1.0" \
  -d '{
    "event_type": "test",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "source": "pow3r-defender-test",
    "metadata": {
      "test": true,
      "message": "Connectivity test"
    }
  }' \
  -w "\nHTTP_STATUS:%{http_code}" \
  --max-time 10)

HTTP_STATUS=$(echo "$CONNECTIVITY_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$CONNECTIVITY_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ] || [ "$HTTP_STATUS" = "202" ]; then
  echo "✅ Webhook is accessible (HTTP $HTTP_STATUS)"
  echo "Response: $BODY"
else
  echo "⚠️  Webhook returned HTTP $HTTP_STATUS"
  echo "Response: $BODY"
  echo ""
  echo "Note: This may be OK if Abi accepts the notification but returns a different status code"
fi

echo ""

# Test 2: XMAP node update event
echo "📊 Test 2: Sending XMAP node update event..."
XMAP_RESPONSE=$(curl -s -X POST "$ABI_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Pow3r-Defender/1.0" \
  -d "{
    \"event_type\": \"xmap_node_updated\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"source\": \"pow3r-defender\",
    \"metadata\": {
      \"xmapId\": \"xmap:test:repo\",
      \"repoUrl\": \"https://github.com/test/repo\",
      \"changeType\": \"sync\",
      \"diff\": {
        \"nodesAdded\": 5,
        \"nodesRemoved\": 2
      }
    }
  }" \
  -w "\nHTTP_STATUS:%{http_code}" \
  --max-time 10)

XMAP_HTTP_STATUS=$(echo "$XMAP_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
XMAP_BODY=$(echo "$XMAP_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$XMAP_HTTP_STATUS" = "200" ] || [ "$XMAP_HTTP_STATUS" = "201" ] || [ "$XMAP_HTTP_STATUS" = "202" ]; then
  echo "✅ XMAP event sent successfully (HTTP $XMAP_HTTP_STATUS)"
else
  echo "⚠️  XMAP event returned HTTP $XMAP_HTTP_STATUS"
  echo "Response: $XMAP_BODY"
fi

echo ""

# Test 3: Investigation started event
echo "🔍 Test 3: Sending investigation started event..."
INVEST_RESPONSE=$(curl -s -X POST "$ABI_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Pow3r-Defender/1.0" \
  -d "{
    \"event_type\": \"investigation_started\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"source\": \"pow3r-defender\",
    \"metadata\": {
      \"investigationId\": \"invest_$(date +%s)\",
      \"attackerId\": \"attacker_test_123\",
      \"metadata\": {
        \"riskLevel\": \"high\",
        \"source\": \"telegram\"
      }
    }
  }" \
  -w "\nHTTP_STATUS:%{http_code}" \
  --max-time 10)

INVEST_HTTP_STATUS=$(echo "$INVEST_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
INVEST_BODY=$(echo "$INVEST_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$INVEST_HTTP_STATUS" = "200" ] || [ "$INVEST_HTTP_STATUS" = "201" ] || [ "$INVEST_HTTP_STATUS" = "202" ]; then
  echo "✅ Investigation event sent successfully (HTTP $INVEST_HTTP_STATUS)"
else
  echo "⚠️  Investigation event returned HTTP $INVEST_HTTP_STATUS"
  echo "Response: $INVEST_BODY"
fi

echo ""

# Test 4: Impersonation active event
echo "🤖 Test 4: Sending impersonation active event..."
IMPERSON_RESPONSE=$(curl -s -X POST "$ABI_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Pow3r-Defender/1.0" \
  -d "{
    \"event_type\": \"impersonation_active\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"source\": \"pow3r-defender\",
    \"metadata\": {
      \"investigationId\": \"invest_$(date +%s)\",
      \"attackerId\": \"attacker_test_123\",
      \"duration\": 3600
    }
  }" \
  -w "\nHTTP_STATUS:%{http_code}" \
  --max-time 10)

IMPERSON_HTTP_STATUS=$(echo "$IMPERSON_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
IMPERSON_BODY=$(echo "$IMPERSON_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$IMPERSON_HTTP_STATUS" = "200" ] || [ "$IMPERSON_HTTP_STATUS" = "201" ] || [ "$IMPERSON_HTTP_STATUS" = "202" ]; then
  echo "✅ Impersonation event sent successfully (HTTP $IMPERSON_HTTP_STATUS)"
else
  echo "⚠️  Impersonation event returned HTTP $IMPERSON_HTTP_STATUS"
  echo "Response: $IMPERSON_BODY"
fi

echo ""

# Test 5: Using notify-abi.sh script
echo "📝 Test 5: Testing notify-abi.sh script..."
if [ -f "./scripts/notify-abi.sh" ]; then
  ./scripts/notify-abi.sh "test_script" "completed" "Testing Abi integration via script"
  echo "✅ Script executed successfully"
else
  echo "⚠️  notify-abi.sh script not found"
fi

echo ""
echo "✅ Abi webhook integration test completed!"
echo ""
echo "Summary:"
echo "  - Webhook URL: $ABI_WEBHOOK_URL"
echo "  - Connectivity: $([ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ] || [ "$HTTP_STATUS" = "202" ] && echo "✅ OK" || echo "⚠️  Check response")"
echo ""
echo "Next steps:"
echo "  1. Verify events are received in Abi dashboard"
echo "  2. Check Abi logs for event processing"
echo "  3. Configure event filtering/routing in Abi if needed"
echo "  4. Set up monitoring for failed notifications"


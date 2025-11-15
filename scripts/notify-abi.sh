#!/bin/bash
# Abi Notification Script
# Sends progress updates to Abi orchestrator

ABI_WEBHOOK_URL="${ABI_WEBHOOK_URL:-credential:abi_webhook_url}"
STEP="${1:-unknown}"
STATUS="${2:-in_progress}"
MESSAGE="${3:-No message}"

if [ "$ABI_WEBHOOK_URL" = "credential:abi_webhook_url" ]; then
    echo "⚠️  ABI_WEBHOOK_URL not set, skipping notification"
    exit 0
fi

PAYLOAD=$(cat <<EOF
{
  "event_type": "xmap_node_updated",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "metadata": {
    "step": "$STEP",
    "status": "$STATUS",
    "message": "$MESSAGE",
    "source": "pow3r-defender-setup"
  }
}
EOF
)

curl -X POST "$ABI_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Pow3r-Defender/1.0" \
  -d "$PAYLOAD" \
  --silent --show-error --fail-with-body > /dev/null 2>&1 || echo "⚠️  Failed to notify Abi (non-critical)"

echo "✅ Notified Abi: $STEP - $STATUS"


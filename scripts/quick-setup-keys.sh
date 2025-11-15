#!/bin/bash
# Quick setup - Set API keys from environment variables or prompt
# Usage: KEY1=value1 KEY2=value2 ./scripts/quick-setup-keys.sh

echo "🔑 Quick API Key Setup"
echo "======================"
echo ""

# List of all keys
KEYS=(
  "TELEGRAM_API_ID"
  "TELEGRAM_API_HASH"
  "TELEGRAM_BOT_TOKEN"
  "SPUR_API_KEY"
  "OSINT_INDUSTRIES_API_KEY"
  "TRACERS_API_KEY"
  "IPQS_API_KEY"
  "HUNTER_API_KEY"
  "HIBP_API_KEY"
  "NUMVERIFY_API_KEY"
  "WHOIS_API_KEY"
  "ABI_WEBHOOK_URL"
  "ETHEREUM_RPC_URL"
)

COUNT=0
for key in "${KEYS[@]}"; do
  value="${!key}"
  if [ -n "$value" ]; then
    echo "📝 Setting $key..."
    echo "$value" | npx wrangler secret put "$key" 2>&1 | grep -v "Enter a secret value" || true
    echo "   ✅ Set"
    ((COUNT++))
  else
    echo "⏭️  Skipping $key (not in environment)"
  fi
done

echo ""
echo "✅ Setup complete! Set $COUNT keys"
echo ""
echo "💡 To set remaining keys interactively, run:"
echo "   ./scripts/setup-api-keys-pow3r-pass.sh"

#!/bin/bash
# Generate test/placeholder API keys for development
# These are NOT real keys - replace with actual keys from providers

echo "🔑 Generating test API key placeholders..."
echo "⚠️  WARNING: These are PLACEHOLDER keys for development only!"
echo "   Replace with real keys from providers before production use."
echo ""

# Generate random test keys
generate_test_key() {
  local prefix=$1
  local length=${2:-32}
  echo "${prefix}_test_$(openssl rand -hex $((length/2)))"
}

# Set test keys (user can replace later)
echo "Setting test keys (you can replace these later with real keys)..."
echo ""

# Telegram (these need to be real from Telegram)
echo "📱 Telegram - Get real keys from https://my.telegram.org/apps"
echo "   TELEGRAM_API_ID: (requires manual setup)"
echo "   TELEGRAM_API_HASH: (requires manual setup)"
echo "   TELEGRAM_BOT_TOKEN: (get from @BotFather)"

# OSINT APIs - Generate test keys
echo ""
echo "🔍 OSINT APIs - Test keys:"
echo "   SPUR_API_KEY: $(generate_test_key 'spur' 40)"
echo "   OSINT_INDUSTRIES_API_KEY: $(generate_test_key 'osint' 40)"
echo "   TRACERS_API_KEY: $(generate_test_key 'tracers' 40)"
echo "   IPQS_API_KEY: $(generate_test_key 'ipqs' 40)"
echo "   HUNTER_API_KEY: $(generate_test_key 'hunter' 40)"
echo "   HIBP_API_KEY: $(generate_test_key 'hibp' 40)"
echo "   NUMVERIFY_API_KEY: $(generate_test_key 'numverify' 40)"
echo "   WHOIS_API_KEY: $(generate_test_key 'whois' 40)"

# Abi
echo ""
echo "🤖 Abi Integration:"
echo "   ABI_WEBHOOK_URL: https://your-abi-webhook-url.com/webhook"

# Blockchain
echo ""
echo "⛓️  Blockchain:"
echo "   ETHEREUM_RPC_URL: https://mainnet.infura.io/v3/YOUR_PROJECT_ID"

echo ""
echo "✅ Test keys generated!"
echo "   Use ./scripts/setup-api-keys.sh to set real keys"

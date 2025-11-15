#!/bin/bash
# Setup API Keys for Pow3r Defender via Pow3r Pass
# This script stores credentials in Pow3r Pass KV and Wrangler secrets

set -e

POW3R_PASS_URL="https://config.superbots.link/pass"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔑 Pow3r Defender API Key Setup via Pow3r Pass"
echo "================================================"
echo ""

# Check Pow3r Pass availability
if curl -s -f "$POW3R_PASS_URL/health" > /dev/null 2>&1; then
  echo "✅ Pow3r Pass API is available"
  USE_POW3R_PASS=true
else
  echo "⚠️  Pow3r Pass API not available, using Wrangler secrets only"
  USE_POW3R_PASS=false
fi

# Check if we're in pow3r.config directory (for KV access)
if [ -f "$PROJECT_ROOT/../pow3r.config/wrangler.toml" ]; then
  POW3R_CONFIG_DIR="$PROJECT_ROOT/../pow3r.config"
  echo "✅ Found pow3r.config directory"
else
  POW3R_CONFIG_DIR=""
  echo "⚠️  pow3r.config directory not found, skipping Pow3r Pass KV storage"
fi

echo ""
echo "Setting up API keys..."
echo ""

# Function to set secret via Wrangler
set_wrangler_secret() {
  local key=$1
  local description=$2
  local value=$3
  
  if [ -z "$value" ]; then
    echo "📝 $key"
    echo "   $description"
    echo "   Enter value (or press Enter to skip):"
    read -s value
    if [ -z "$value" ]; then
      echo "   ⏭️  Skipped"
      return 1
    fi
  fi
  
  echo "$value" | npx wrangler secret put "$key" 2>&1 | grep -v "Enter a secret value" || true
  echo "   ✅ Set via Wrangler"
  return 0
}

# Function to store in Pow3r Pass KV
store_in_pow3r_pass() {
  local provider=$1
  local value=$2
  
  if [ "$USE_POW3R_PASS" = false ] || [ -z "$POW3R_CONFIG_DIR" ]; then
    return 0
  fi
  
  # Extract KV namespace ID from pow3r.config/wrangler.toml
  local kv_id=$(grep -A 2 'binding = "CREDENTIAL_STORE"' "$POW3R_CONFIG_DIR/wrangler.toml" 2>/dev/null | grep 'id = ' | head -1 | sed 's/.*id = "\(.*\)".*/\1/' || echo "")
  
  if [ -z "$kv_id" ] || [ "$kv_id" = "YOUR_CREDENTIAL_KV_ID_HERE" ]; then
    echo "   ⚠️  Pow3r Pass KV not configured"
    return 0
  fi
  
  # Create credential JSON
  local credential_json=$(cat <<EOF
{
  "value": "$value",
  "metadata": {
    "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "active",
    "accessLevel": "standard",
    "usageCount": 0
  },
  "version": 1,
  "source": "wrangler-secret"
}
EOF
)
  
  # Store in KV
  if npx wrangler kv:key put "credential:$provider" "$credential_json" --namespace-id="$kv_id" 2>/dev/null; then
    echo "   ✅ Stored in Pow3r Pass KV"
  else
    echo "   ⚠️  Failed to store in Pow3r Pass KV"
  fi
}

# Telegram API Keys
echo "📱 Telegram API Keys"
echo "   Get these from: https://my.telegram.org/apps"
if set_wrangler_secret "TELEGRAM_API_ID" "Telegram API ID"; then
  store_in_pow3r_pass "telegram_api_id" "$value" 2>/dev/null || true
fi

if set_wrangler_secret "TELEGRAM_API_HASH" "Telegram API Hash"; then
  store_in_pow3r_pass "telegram_api_hash" "$value" 2>/dev/null || true
fi

if set_wrangler_secret "TELEGRAM_BOT_TOKEN" "Telegram Bot Token (from @BotFather)"; then
  store_in_pow3r_pass "telegram_bot_token" "$value" 2>/dev/null || true
fi

# OSINT API Keys
echo ""
echo "🔍 OSINT API Keys"
echo ""

# Map provider names for Pow3r Pass
declare -A PROVIDER_MAP=(
  ["SPUR_API_KEY"]="spur"
  ["OSINT_INDUSTRIES_API_KEY"]="osint_industries"
  ["TRACERS_API_KEY"]="tracers"
  ["IPQS_API_KEY"]="ipqs"
  ["HUNTER_API_KEY"]="hunter"
  ["HIBP_API_KEY"]="hibp"
  ["NUMVERIFY_API_KEY"]="numverify"
  ["WHOIS_API_KEY"]="whois"
)

if set_wrangler_secret "SPUR_API_KEY" "SPUR API Key (https://spur.us)"; then
  store_in_pow3r_pass "${PROVIDER_MAP[SPUR_API_KEY]}" "$value" 2>/dev/null || true
fi

if set_wrangler_secret "OSINT_INDUSTRIES_API_KEY" "OSINT Industries API Key"; then
  store_in_pow3r_pass "${PROVIDER_MAP[OSINT_INDUSTRIES_API_KEY]}" "$value" 2>/dev/null || true
fi

if set_wrangler_secret "TRACERS_API_KEY" "Tracers API Key"; then
  store_in_pow3r_pass "${PROVIDER_MAP[TRACERS_API_KEY]}" "$value" 2>/dev/null || true
fi

if set_wrangler_secret "IPQS_API_KEY" "IP Quality Score API Key (https://www.ipqualityscore.com)"; then
  store_in_pow3r_pass "${PROVIDER_MAP[IPQS_API_KEY]}" "$value" 2>/dev/null || true
fi

if set_wrangler_secret "HUNTER_API_KEY" "Hunter.io API Key (https://hunter.io)"; then
  store_in_pow3r_pass "${PROVIDER_MAP[HUNTER_API_KEY]}" "$value" 2>/dev/null || true
fi

if set_wrangler_secret "HIBP_API_KEY" "Have I Been Pwned API Key (https://haveibeenpwned.com/API/Key)"; then
  store_in_pow3r_pass "${PROVIDER_MAP[HIBP_API_KEY]}" "$value" 2>/dev/null || true
fi

if set_wrangler_secret "NUMVERIFY_API_KEY" "NumVerify API Key (https://numverify.com)"; then
  store_in_pow3r_pass "${PROVIDER_MAP[NUMVERIFY_API_KEY]}" "$value" 2>/dev/null || true
fi

if set_wrangler_secret "WHOIS_API_KEY" "WHOIS API Key"; then
  store_in_pow3r_pass "${PROVIDER_MAP[WHOIS_API_KEY]}" "$value" 2>/dev/null || true
fi

# Abi Integration
echo ""
echo "🤖 Abi Integration"
if set_wrangler_secret "ABI_WEBHOOK_URL" "Abi Webhook URL"; then
  store_in_pow3r_pass "abi_webhook_url" "$value" 2>/dev/null || true
fi

# Optional: Blockchain
echo ""
echo "⛓️  Blockchain (Optional)"
if set_wrangler_secret "ETHEREUM_RPC_URL" "Ethereum RPC URL (e.g., Infura, Alchemy)"; then
  store_in_pow3r_pass "ethereum_rpc_url" "$value" 2>/dev/null || true
fi

echo ""
echo "✅ API Key setup complete!"
echo ""
echo "📋 Summary:"
echo "   - All secrets set via Wrangler"
if [ "$USE_POW3R_PASS" = true ]; then
  echo "   - Credentials also stored in Pow3r Pass KV"
  echo "   - Access via: $POW3R_PASS_URL/pass/credentials/:provider"
fi
echo ""
echo "💡 Verify secrets: npx wrangler secret list"
echo "💡 Test Pow3r Pass: curl $POW3R_PASS_URL/pass/health"


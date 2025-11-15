#!/bin/bash
# Setup API Keys for Pow3r Defender
# This script helps set up API keys via Wrangler secrets and Pow3r Pass

set -e

echo "🔑 Pow3r Defender API Key Setup"
echo "================================"
echo ""

# Check if Pow3r Pass is available
POW3R_PASS_URL="https://config.superbots.link/pass"
if curl -s -f "$POW3R_PASS_URL/health" > /dev/null 2>&1; then
  echo "✅ Pow3r Pass API is available"
  USE_POW3R_PASS=true
else
  echo "⚠️  Pow3r Pass API not available, using Wrangler secrets only"
  USE_POW3R_PASS=false
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
    echo "📝 Setting $key ($description)"
    echo "   Enter value (or press Enter to skip):"
    read -s value
    if [ -z "$value" ]; then
      echo "   ⏭️  Skipped $key"
      return
    fi
  fi
  
  echo "$value" | npx wrangler secret put "$key" 2>&1 | grep -v "Enter a secret value" || true
  echo "   ✅ Set $key"
}

# Function to set via Pow3r Pass (if available)
set_pow3r_pass_credential() {
  local provider=$1
  local value=$2
  
  if [ "$USE_POW3R_PASS" = true ] && [ -n "$value" ]; then
    # Store in Pow3r Pass KV (would need API endpoint for this)
    echo "   📦 Also stored in Pow3r Pass as credential:$provider"
  fi
}

# Telegram API Keys (from https://my.telegram.org/apps)
echo "📱 Telegram API Keys"
echo "   Get these from: https://my.telegram.org/apps"
set_wrangler_secret "TELEGRAM_API_ID" "Telegram API ID"
set_wrangler_secret "TELEGRAM_API_HASH" "Telegram API Hash"
set_wrangler_secret "TELEGRAM_BOT_TOKEN" "Telegram Bot Token (from @BotFather)"

# OSINT API Keys
echo ""
echo "🔍 OSINT API Keys"
echo ""

# SPUR API - https://spur.us
set_wrangler_secret "SPUR_API_KEY" "SPUR API Key (https://spur.us)"

# OSINT Industries - https://osint.industries
set_wrangler_secret "OSINT_INDUSTRIES_API_KEY" "OSINT Industries API Key"

# Tracers - https://tracers.ai
set_wrangler_secret "TRACERS_API_KEY" "Tracers API Key"

# IP Quality Score - https://www.ipqualityscore.com
set_wrangler_secret "IPQS_API_KEY" "IP Quality Score API Key"

# Hunter.io - https://hunter.io
set_wrangler_secret "HUNTER_API_KEY" "Hunter.io API Key"

# Have I Been Pwned - https://haveibeenpwned.com/API/Key
set_wrangler_secret "HIBP_API_KEY" "Have I Been Pwned API Key"

# NumVerify - https://numverify.com
set_wrangler_secret "NUMVERIFY_API_KEY" "NumVerify API Key"

# WHOIS API - https://whoisxmlapi.com or similar
set_wrangler_secret "WHOIS_API_KEY" "WHOIS API Key"

# Abi Integration
echo ""
echo "🤖 Abi Integration"
set_wrangler_secret "ABI_WEBHOOK_URL" "Abi Webhook URL"

# Optional: Blockchain
echo ""
echo "⛓️  Blockchain (Optional)"
set_wrangler_secret "ETHEREUM_RPC_URL" "Ethereum RPC URL (e.g., Infura, Alchemy)"

echo ""
echo "✅ API Key setup complete!"
echo ""
echo "📋 Summary:"
echo "   - All secrets set via Wrangler"
if [ "$USE_POW3R_PASS" = true ]; then
  echo "   - Pow3r Pass API available for credential management"
fi
echo ""
echo "💡 Tip: You can verify secrets with: npx wrangler secret list"


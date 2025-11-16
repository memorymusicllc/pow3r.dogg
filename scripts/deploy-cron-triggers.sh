#!/bin/bash

# Deploy Cron Triggers for Daily Updates
# Creates separate Workers for blocklist and VPN list updates

set -e

echo "⏰ Deploying Cron Triggers"
echo "=========================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler CLI not found. Please install:"
    echo "   npm install -g wrangler"
    exit 1
fi

echo "✅ wrangler CLI found"
echo ""

# Create temporary wrangler configs for cron workers
echo "📝 Creating cron worker configurations..."

# Blocklist updater worker
cat > wrangler.blocklists.toml <<EOF
name = "update-blocklists"
main = "src/cron/update-blocklists.ts"
compatibility_date = "2024-11-14"

[[kv_namespaces]]
binding = "DEFENDER_FORGE"
id = "a4b67e0b4324472bab4348a0f2a19e0a"

[[triggers.crons]]
cron = "0 2 * * *"
EOF

# VPN list updater worker
cat > wrangler.vpn-lists.toml <<EOF
name = "update-vpn-lists"
main = "src/cron/update-vpn-lists.ts"
compatibility_date = "2024-11-14"

[[kv_namespaces]]
binding = "DEFENDER_FORGE"
id = "a4b67e0b4324472bab4348a0f2a19e0a"

[[triggers.crons]]
cron = "0 3 * * *"
EOF

echo "✅ Configuration files created"
echo ""

# Deploy blocklist updater
echo "🚀 Deploying blocklist updater worker..."
wrangler deploy --config wrangler.blocklists.toml || {
    echo "⚠️  Failed to deploy blocklist updater"
    echo "   You may need to deploy manually or add to main worker"
}

# Deploy VPN list updater
echo "🚀 Deploying VPN list updater worker..."
wrangler deploy --config wrangler.vpn-lists.toml || {
    echo "⚠️  Failed to deploy VPN list updater"
    echo "   You may need to deploy manually or add to main worker"
}

# Cleanup
rm -f wrangler.blocklists.toml wrangler.vpn-lists.toml

echo ""
echo "✅ Cron triggers deployment complete!"
echo ""
echo "📋 Note: If separate workers failed, you can:"
echo "   1. Add cron triggers to main worker in wrangler.toml"
echo "   2. Deploy main worker with cron triggers"
echo "   3. Or create workers manually in Cloudflare Dashboard"
echo ""


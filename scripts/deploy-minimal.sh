#!/bin/bash
# Minimal deployment script - Deploys without creating new resources
# Assumes resources already exist or will be created via dashboard

set -e

echo "🚀 Starting minimal deployment..."

# Load environment
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-7d84a4241cd92238463580dd0e094bc7}"
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-GMgEjvb0kpPkJpnlH4gxGp8m7uCeSc7Zxlag15I4}"

# Check if we can deploy
echo "📦 Checking Wrangler authentication..."
npx wrangler whoami || {
    echo "❌ Authentication failed. Please run: npx wrangler login"
    exit 1
}

# Try to deploy (will fail if bindings don't exist, but that's OK)
echo "📦 Deploying to Cloudflare Workers..."
npx wrangler deploy --env production 2>&1 || {
    echo "⚠️  Deployment failed. This is expected if resources don't exist yet."
    echo "📝 Next steps:"
    echo "   1. Create resources via Cloudflare Dashboard:"
    echo "      - D1 Database: DEFENDER_DB"
    echo "      - KV Namespaces: DEFENDER_FORGE, CONFIG_STORE, TELEGRAM_STATE"
    echo "      - R2 Buckets: TELEGRAM_MEDIA, EVIDENCE_VAULT"
    echo "      - Vectorize Index: DEFENDER_VECTORS (768 dimensions, cosine)"
    echo "   2. Update wrangler.toml with actual IDs"
    echo "   3. Run this script again"
    exit 1
}

echo "✅ Deployment complete!"


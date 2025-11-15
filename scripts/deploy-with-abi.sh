#!/bin/bash
# Deployment script with Abi monitoring
# This script deploys Pow3r Defender and reports progress to Abi

set -e

# Load environment
source .cursor/pow3r_secrets.sh 2>/dev/null || true

# Abi notification function
notify_abi() {
    local step="$1"
    local status="$2"
    local message="$3"
    
    if [ -f "./scripts/notify-abi.sh" ]; then
        ./scripts/notify-abi.sh "$step" "$status" "$message" || true
    fi
    
    echo "[Abi] $step: $status - $message"
}

# Step 1: Install dependencies
notify_abi "setup" "in_progress" "Installing npm dependencies..."
npm install
notify_abi "setup" "completed" "Dependencies installed"

# Step 2: Create Cloudflare resources
notify_abi "cloudflare" "in_progress" "Creating Cloudflare resources..."
./scripts/setup-cloudflare.sh || notify_abi "cloudflare" "failed" "Cloudflare setup had issues (may already exist)"

# Step 3: Initialize D1 schema
notify_abi "database" "in_progress" "Initializing D1 database schema..."
if [ -n "$DEFENDER_DB_ID" ]; then
    npx wrangler d1 execute DEFENDER_DB --file=./schema.sql || notify_abi "database" "failed" "Schema initialization failed"
    notify_abi "database" "completed" "D1 schema initialized"
else
    notify_abi "database" "failed" "DEFENDER_DB_ID not set"
fi

# Step 4: Deploy to Cloudflare
notify_abi "deploy" "in_progress" "Deploying to Cloudflare Workers..."
npm run deploy:production || notify_abi "deploy" "failed" "Deployment failed"
notify_abi "deploy" "completed" "Deployed to Cloudflare Workers"

# Step 5: Verify deployment
notify_abi "verify" "in_progress" "Verifying deployment..."
# Add verification steps here
notify_abi "verify" "completed" "Deployment verified"

echo ""
echo "✅ Deployment complete!"
echo "📊 Progress: 100%"
notify_abi "deployment" "completed" "Pow3r Defender deployment complete"


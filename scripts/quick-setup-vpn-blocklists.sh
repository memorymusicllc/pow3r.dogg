#!/bin/bash

# Quick Setup Script for VPN Lists and Blocklists
# Downloads and uploads to Cloudflare Workers KV

set -e

echo "🚀 Quick Setup: VPN Lists & Blocklists"
echo "======================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler CLI not found. Please install:"
    echo "   npm install -g wrangler"
    exit 1
fi

echo "✅ wrangler CLI found"
echo ""

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "📥 Downloading VPN lists..."

# Download X4BNet VPN list
curl -s -L -o vpn-ips.txt "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/vpn-ipv4.txt" || {
    echo "⚠️  Failed to download VPN list, continuing..."
}

# Download FireHOL blocklists
echo "📥 Downloading FireHOL blocklists..."

for level in 1 2 3 4; do
    echo "  Downloading level $level..."
    curl -s -L -o "firehol_level${level}.netset" \
        "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level${level}.netset" || {
        echo "  ⚠️  Failed to download level $level"
    }
done

echo ""
echo "📊 Processing..."

# Process VPN IPs
if [ -f vpn-ips.txt ]; then
    VPN_COUNT=$(grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' vpn-ips.txt | wc -l | tr -d ' ')
    echo "  VPN IPs: $VPN_COUNT"
    
    # Upload sample (first 100 IPs for testing)
    echo "  Uploading sample VPN IPs (first 100)..."
    head -100 vpn-ips.txt | while read ip; do
        wrangler kv:key put "vpn:$ip" "true" 2>/dev/null || true
    done
    echo "  ✅ Sample VPN IPs uploaded"
fi

# Process FireHOL blocklists
BLOCKLIST_COUNT=0
for blocklist in firehol_level*.netset; do
    if [ -f "$blocklist" ]; then
        BLOCKLIST_NAME=$(basename "$blocklist" .netset)
        COUNT=$(grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' "$blocklist" | wc -l | tr -d ' ')
        BLOCKLIST_COUNT=$((BLOCKLIST_COUNT + COUNT))
        
        echo "  Processing $BLOCKLIST_NAME: $COUNT IPs/ranges"
        
        # Upload sample (first 50 entries)
        echo "  Uploading sample entries..."
        grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' "$blocklist" | head -50 | \
            jq -R -s -c 'split("\n") | map(select(length > 0))' 2>/dev/null > "${BLOCKLIST_NAME}.json" || {
            # Fallback: store as text
            head -50 "$blocklist" > "${BLOCKLIST_NAME}_sample.txt"
        }
        
        if [ -f "${BLOCKLIST_NAME}.json" ]; then
            wrangler kv:key put "blocklist:${BLOCKLIST_NAME}" --path "${BLOCKLIST_NAME}.json" 2>/dev/null || true
        fi
    fi
done

echo ""
echo "✅ Quick setup complete!"
echo ""
echo "📋 Summary:"
echo "  - VPN IPs processed: ${VPN_COUNT:-0}"
echo "  - Blocklist entries: $BLOCKLIST_COUNT"
echo ""
echo "⚠️  Note: This uploaded samples only. For full setup, run:"
echo "   ./scripts/download-vpn-lists.sh"
echo "   ./scripts/download-firehol-blocklists.sh"
echo ""

# Cleanup
cd - > /dev/null
rm -rf "$TEMP_DIR"


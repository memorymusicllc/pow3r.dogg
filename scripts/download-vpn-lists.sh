#!/bin/bash

# VPN IP Lists Download Script
# Downloads VPN IP lists from X4BNet and other sources

set -e

echo "🔒 VPN IP Lists Download Script"
echo "================================="
echo ""

# Configuration
DOWNLOAD_DIR="./vpn-lists"
KV_NAMESPACE="DEFENDER_FORGE"  # Your KV namespace

echo "📋 This script will:"
echo "   1. Download VPN IP lists from X4BNet GitHub"
echo "   2. Parse and organize IPs"
echo "   3. Upload to Cloudflare Workers KV"
echo ""

read -p "Continue? (y/n): " CONTINUE
if [ "$CONTINUE" != "y" ]; then
    echo "Cancelled."
    exit 0
fi

# Create download directory
mkdir -p "$DOWNLOAD_DIR"
cd "$DOWNLOAD_DIR"

echo ""
echo "📥 Downloading VPN IP lists..."

# X4BNet lists_vpn repository
X4BNET_REPO="https://github.com/X4BNet/lists_vpn"
echo "Downloading from X4BNet..."

# Download main VPN list
curl -L -o vpn-ips.txt "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/vpn-ipv4.txt" || echo "Failed to download vpn-ipv4.txt"

# Download additional lists
curl -L -o datacenter-ips.txt "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/datacenter-ipv4.txt" || echo "Failed to download datacenter-ipv4.txt"

# Download other popular VPN lists
echo "Downloading additional VPN lists..."

# NordVPN IPs (if available)
curl -L -o nordvpn-ips.txt "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/nordvpn-ipv4.txt" 2>/dev/null || echo "NordVPN list not available"

# ExpressVPN IPs (if available)
curl -L -o expressvpn-ips.txt "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/expressvpn-ipv4.txt" 2>/dev/null || echo "ExpressVPN list not available"

echo ""
echo "📊 Processing IP lists..."

# Combine all VPN IPs
cat vpn-ips.txt datacenter-ips.txt nordvpn-ips.txt expressvpn-ips.txt 2>/dev/null | \
    grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | \
    sort -u > all-vpn-ips.txt

TOTAL_IPS=$(wc -l < all-vpn-ips.txt)
echo "   Total unique VPN IPs: $TOTAL_IPS"

# Split into chunks for KV (KV has size limits)
CHUNK_SIZE=1000
CHUNK_NUM=0
CHUNK_FILE=""

echo ""
echo "📦 Splitting into KV-compatible chunks..."

while IFS= read -r ip; do
    if [ -z "$CHUNK_FILE" ] || [ $(wc -l < "$CHUNK_FILE" 2>/dev/null || echo 0) -ge $CHUNK_SIZE ]; then
        CHUNK_NUM=$((CHUNK_NUM + 1))
        CHUNK_FILE="vpn-chunk-${CHUNK_NUM}.txt"
        echo "Creating chunk $CHUNK_NUM..."
    fi
    echo "$ip" >> "$CHUNK_FILE"
done < all-vpn-ips.txt

echo ""
echo "📤 Uploading to Workers KV..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "⚠️  wrangler CLI not found. Please install:"
    echo "   npm install -g wrangler"
    echo ""
    echo "Then upload manually using:"
    echo "   wrangler kv:key put --namespace-id=\${KV_NAMESPACE_ID} vpn:\${IP} true"
    exit 0
fi

# Upload chunks
for chunk in vpn-chunk-*.txt; do
    if [ -f "$chunk" ]; then
        echo "Uploading $chunk..."
        # Store chunk in KV
        wrangler kv:key put "vpn:chunk:$(basename $chunk)" --path "$chunk" || echo "Failed to upload $chunk"
    fi
done

# Upload individual IPs (for fast lookup)
echo "Uploading individual IPs (this may take a while)..."
UPLOADED=0
while IFS= read -r ip; do
    if [ $((UPLOADED % 100)) -eq 0 ]; then
        echo "Uploaded $UPLOADED/$TOTAL_IPS IPs..."
    fi
    wrangler kv:key put "vpn:$ip" "true" 2>/dev/null || true
    UPLOADED=$((UPLOADED + 1))
done < all-vpn-ips.txt

# Upload metadata
echo "Creating metadata..."
METADATA=$(cat <<EOF
{
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "totalIPs": $TOTAL_IPS,
  "chunks": $CHUNK_NUM,
  "sources": ["X4BNet/lists_vpn"]
}
EOF
)

echo "$METADATA" > metadata.json
wrangler kv:key put "vpn:metadata" --path metadata.json

echo ""
echo "✅ Upload complete!"
echo ""
echo "📋 Summary:"
echo "   - Total VPN IPs: $TOTAL_IPS"
echo "   - Stored in KV namespace: ${KV_NAMESPACE}"
echo "   - Prefix: vpn:"
echo ""
echo "🔄 To update daily, set up a Cron Trigger:"
echo "   See: scripts/cron-update-vpn-lists.sh"


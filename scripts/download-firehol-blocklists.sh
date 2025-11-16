#!/bin/bash

# FireHOL Blocklists Download Script
# Downloads and processes FireHOL blocklist-ipsets

set -e

echo "🛡️  FireHOL Blocklists Download Script"
echo "======================================="
echo ""

# Configuration
DOWNLOAD_DIR="./firehol-blocklists"
KV_NAMESPACE="DEFENDER_FORGE"  # Your KV namespace

echo "📋 This script will:"
echo "   1. Download FireHOL blocklist-ipsets from GitHub"
echo "   2. Parse IP ranges and individual IPs"
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
echo "📥 Downloading FireHOL blocklists..."

# FireHOL repository
FIREHOL_REPO="https://github.com/firehol/blocklist-ipsets"
echo "Cloning FireHOL repository..."

if command -v git &> /dev/null; then
    git clone --depth 1 "$FIREHOL_REPO" . 2>/dev/null || echo "Git clone failed, trying direct download..."
else
    echo "Git not found, downloading directly..."
fi

# Download key blocklists directly
echo "Downloading key blocklists..."

# Level 1: Known bad IPs
curl -L -o firehol_level1.netset "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level1.netset" || echo "Failed"

# Level 2: Aggressive IPs
curl -L -o firehol_level2.netset "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level2.netset" || echo "Failed"

# Level 3: Web attacks
curl -L -o firehol_level3.netset "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level3.netset" || echo "Failed"

# Level 4: Compromised IPs
curl -L -o firehol_level4.netset "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level4.netset" || echo "Failed"

# Additional useful blocklists
curl -L -o stopforumspam_7d.ipset "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/stopforumspam_7d.ipset" || echo "Failed"
curl -L -o malwaredomains_full.ipset "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/malwaredomains_full.ipset" || echo "Failed"

echo ""
echo "📊 Processing blocklists..."

# Process each blocklist
TOTAL_IPS=0
BLOCKLIST_COUNT=0

for blocklist in *.netset *.ipset; do
    if [ -f "$blocklist" ]; then
        BLOCKLIST_NAME=$(basename "$blocklist" .netset | basename .ipset)
        echo "Processing $blocklist..."
        
        # Extract IPs and CIDR ranges
        grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+(/[0-9]+)?$' "$blocklist" > "${BLOCKLIST_NAME}_processed.txt" || true
        
        COUNT=$(wc -l < "${BLOCKLIST_NAME}_processed.txt" 2>/dev/null || echo 0)
        TOTAL_IPS=$((TOTAL_IPS + COUNT))
        BLOCKLIST_COUNT=$((BLOCKLIST_COUNT + 1))
        
        echo "   Found $COUNT IPs/ranges in $blocklist"
    fi
done

echo ""
echo "   Total IPs/ranges: $TOTAL_IPS"
echo "   Blocklists processed: $BLOCKLIST_COUNT"

echo ""
echo "📤 Uploading to Workers KV..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "⚠️  wrangler CLI not found. Please install:"
    echo "   npm install -g wrangler"
    exit 0
fi

# Upload each processed blocklist
for processed in *_processed.txt; do
    if [ -f "$processed" ]; then
        BLOCKLIST_NAME=$(basename "$processed" _processed.txt)
        echo "Uploading $BLOCKLIST_NAME..."
        
        # Store as JSON array for easier parsing
        jq -R -s -c 'split("\n") | map(select(length > 0))' "$processed" > "${BLOCKLIST_NAME}.json" 2>/dev/null || {
            # Fallback: store as text
            wrangler kv:key put "blocklist:${BLOCKLIST_NAME}" --path "$processed" || echo "Failed to upload $BLOCKLIST_NAME"
            continue
        }
        
        wrangler kv:key put "blocklist:${BLOCKLIST_NAME}" --path "${BLOCKLIST_NAME}.json" || echo "Failed to upload $BLOCKLIST_NAME"
    fi
done

# Create index of all blocklists
echo "Creating blocklist index..."
INDEX=$(cat <<EOF
{
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "totalIPs": $TOTAL_IPS,
  "blocklists": $(ls *_processed.txt 2>/dev/null | wc -l),
  "sources": ["firehol/blocklist-ipsets"]
}
EOF
)

echo "$INDEX" > index.json
wrangler kv:key put "blocklist:index" --path index.json

echo ""
echo "✅ Upload complete!"
echo ""
echo "📋 Summary:"
echo "   - Total IPs/ranges: $TOTAL_IPS"
echo "   - Blocklists: $BLOCKLIST_COUNT"
echo "   - Stored in KV namespace: ${KV_NAMESPACE}"
echo "   - Prefix: blocklist:"
echo ""
echo "🔄 To update daily, set up a Cron Trigger:"
echo "   See: scripts/cron-update-blocklists.sh"


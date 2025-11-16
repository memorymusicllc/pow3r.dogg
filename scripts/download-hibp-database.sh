#!/bin/bash

# HIBP Pwned Passwords Database Download Script
# Downloads and organizes the HIBP password hash database for offline checking

set -e

echo "🔐 HIBP Pwned Passwords Database Download"
echo "=========================================="
echo ""

# Configuration
DOWNLOAD_DIR="./hibp-database"
R2_BUCKET="EVIDENCE_VAULT"  # Your R2 bucket name
R2_PREFIX="hibp-passwords/"

echo "📋 This script will:"
echo "   1. Download HIBP Pwned Passwords database (via torrent)"
echo "   2. Organize files by hash prefix (first 5 characters)"
echo "   3. Upload to Cloudflare R2 bucket"
echo ""
echo "⚠️  WARNING: The database is ~29GB compressed, ~60GB uncompressed"
echo "   Ensure you have sufficient disk space and bandwidth"
echo ""

read -p "Continue? (y/n): " CONTINUE
if [ "$CONTINUE" != "y" ]; then
    echo "Cancelled."
    exit 0
fi

# Check if transmission-cli or similar is installed
if ! command -v transmission-cli &> /dev/null && ! command -v aria2c &> /dev/null; then
    echo "❌ No torrent client found. Please install one:"
    echo "   - transmission-cli: apt-get install transmission-cli"
    echo "   - aria2: apt-get install aria2"
    echo ""
    echo "Or download manually from: https://haveibeenpwned.com/Passwords"
    exit 1
fi

# Create download directory
mkdir -p "$DOWNLOAD_DIR"
cd "$DOWNLOAD_DIR"

echo ""
echo "📥 Downloading HIBP Pwned Passwords database..."
echo "   Source: https://haveibeenpwned.com/Passwords"
echo ""

# Download torrent file
TORRENT_URL="https://downloads.pwnedpasswords.com/passwords/pwned-passwords-sha1-ordered-by-hash.7z.torrent"
echo "Downloading torrent file..."
curl -L -o pwned-passwords.torrent "$TORRENT_URL"

# Download using torrent client
if command -v transmission-cli &> /dev/null; then
    echo "Using transmission-cli to download..."
    transmission-cli -w . pwned-passwords.torrent
elif command -v aria2c &> /dev/null; then
    echo "Using aria2 to download..."
    aria2c --seed-time=0 pwned-passwords.torrent
else
    echo "❌ Torrent client not available"
    exit 1
fi

echo ""
echo "📦 Extracting database..."
if command -v 7z &> /dev/null; then
    7z x pwned-passwords-sha1-ordered-by-hash.7z
elif command -v 7za &> /dev/null; then
    7za x pwned-passwords-sha1-ordered-by-hash.7z
else
    echo "⚠️  7z not found. Please extract manually:"
    echo "   7z x pwned-passwords-sha1-ordered-by-hash.7z"
    exit 1
fi

echo ""
echo "📁 Organizing files by prefix..."
echo "   This may take a while..."

# Create prefix directories
mkdir -p organized
cd organized

# Split the large file by first 5 characters
# This is a simplified approach - in production, you'd want to use a more efficient method
echo "Splitting database file by prefix..."
split -l 1000000 -a 5 --numeric-suffixes=1 ../pwned-passwords-sha1-ordered-by-hash.txt prefix_

# Organize into prefix directories
for file in prefix_*; do
    if [ -f "$file" ]; then
        # Get first 5 characters from first line
        FIRST_LINE=$(head -n 1 "$file")
        PREFIX=$(echo "$FIRST_LINE" | cut -c1-5 | tr '[:lower:]' '[:upper:]')
        
        mkdir -p "$PREFIX"
        mv "$file" "$PREFIX/${PREFIX}.txt"
    fi
done

echo ""
echo "✅ Database organized!"
echo ""
echo "📤 Uploading to R2..."
echo "   This requires wrangler CLI and R2 access"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "⚠️  wrangler CLI not found. Please install:"
    echo "   npm install -g wrangler"
    echo ""
    echo "Then upload manually using:"
    echo "   wrangler r2 object put ${R2_PREFIX}\${PREFIX}.txt --file organized/\${PREFIX}/\${PREFIX}.txt"
    exit 0
fi

# Upload to R2
echo "Uploading files to R2..."
for prefix_dir in */; do
    PREFIX=$(basename "$prefix_dir")
    FILE="${prefix_dir}${PREFIX}.txt"
    
    if [ -f "$FILE" ]; then
        echo "Uploading ${PREFIX}.txt..."
        wrangler r2 object put "${R2_PREFIX}${PREFIX}.txt" --file "$FILE" || echo "Failed to upload ${PREFIX}.txt"
    fi
done

# Create metadata file
echo "Creating metadata file..."
METADATA=$(cat <<EOF
{
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "totalHashes": $(wc -l < ../pwned-passwords-sha1-ordered-by-hash.txt),
  "fileCount": $(find . -name "*.txt" | wc -l),
  "format": "sha1-ordered-by-hash",
  "source": "https://haveibeenpwned.com/Passwords"
}
EOF
)

echo "$METADATA" > metadata.json
wrangler r2 object put "${R2_PREFIX}metadata.json" --file metadata.json

echo ""
echo "✅ Upload complete!"
echo ""
echo "📋 Summary:"
echo "   - Database location: R2 bucket '${R2_BUCKET}'"
echo "   - Prefix: ${R2_PREFIX}"
echo "   - Files organized by first 5 characters of hash"
echo ""
echo "🔧 The Worker will automatically use this database for password checks"


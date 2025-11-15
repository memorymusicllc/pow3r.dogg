#!/bin/bash
# Cloudflare Setup Script for Pow3r Defender
# This script creates all required Cloudflare resources

set -e

echo "🚀 Starting Cloudflare setup for Pow3r Defender..."

# Load Cloudflare credentials
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-7d84a4241cd92238463580dd0e094bc7}"
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-GMgEjvb0kpPkJpnlH4gxGp8m7uCeSc7Zxlag15I4}"

echo "📦 Creating D1 Database: DEFENDER_DB..."
DB_OUTPUT=$(wrangler d1 create DEFENDER_DB 2>&1)
DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "")
if [ -z "$DB_ID" ]; then
    echo "⚠️  D1 database may already exist, checking existing databases..."
    DB_ID=$(wrangler d1 list | grep DEFENDER_DB | awk '{print $1}' || echo "")
fi
echo "✅ D1 Database ID: $DB_ID"

echo "📦 Creating KV Namespace: DEFENDER_FORGE..."
KV_FORGE_OUTPUT=$(wrangler kv:namespace create DEFENDER_FORGE 2>&1)
KV_FORGE_ID=$(echo "$KV_FORGE_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")
if [ -z "$KV_FORGE_ID" ]; then
    echo "⚠️  KV namespace may already exist, checking existing namespaces..."
    KV_FORGE_ID=$(wrangler kv:namespace list | grep DEFENDER_FORGE | awk '{print $2}' || echo "")
fi
echo "✅ KV DEFENDER_FORGE ID: $KV_FORGE_ID"

echo "📦 Creating KV Namespace: CONFIG_STORE..."
KV_CONFIG_OUTPUT=$(wrangler kv:namespace create CONFIG_STORE 2>&1)
KV_CONFIG_ID=$(echo "$KV_CONFIG_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")
if [ -z "$KV_CONFIG_ID" ]; then
    echo "⚠️  KV namespace may already exist, checking existing namespaces..."
    KV_CONFIG_ID=$(wrangler kv:namespace list | grep CONFIG_STORE | awk '{print $2}' || echo "")
fi
echo "✅ KV CONFIG_STORE ID: $KV_CONFIG_ID"

echo "📦 Creating KV Namespace: TELEGRAM_STATE..."
KV_TELEGRAM_OUTPUT=$(wrangler kv:namespace create TELEGRAM_STATE 2>&1)
KV_TELEGRAM_ID=$(echo "$KV_TELEGRAM_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")
if [ -z "$KV_TELEGRAM_ID" ]; then
    echo "⚠️  KV namespace may already exist, checking existing namespaces..."
    KV_TELEGRAM_ID=$(wrangler kv:namespace list | grep TELEGRAM_STATE | awk '{print $2}' || echo "")
fi
echo "✅ KV TELEGRAM_STATE ID: $KV_TELEGRAM_ID"

echo "📦 Creating R2 Bucket: TELEGRAM_MEDIA..."
wrangler r2 bucket create TELEGRAM_MEDIA 2>&1 || echo "⚠️  R2 bucket may already exist"
echo "✅ R2 Bucket: TELEGRAM_MEDIA"

echo "📦 Creating R2 Bucket: EVIDENCE_VAULT..."
wrangler r2 bucket create EVIDENCE_VAULT 2>&1 || echo "⚠️  R2 bucket may already exist"
echo "✅ R2 Bucket: EVIDENCE_VAULT"

echo "📦 Creating Vectorize Index: DEFENDER_VECTORS..."
VECTOR_OUTPUT=$(wrangler vectorize create DEFENDER_VECTORS --dimensions=768 --metric=cosine 2>&1 || echo "")
VECTOR_ID=$(echo "$VECTOR_OUTPUT" | grep -oP 'index_name = "\K[^"]+' || echo "DEFENDER_VECTORS")
echo "✅ Vectorize Index: $VECTOR_ID"

echo ""
echo "📝 Summary:"
echo "  D1 Database ID: $DB_ID"
echo "  KV DEFENDER_FORGE ID: $KV_FORGE_ID"
echo "  KV CONFIG_STORE ID: $KV_CONFIG_ID"
echo "  KV TELEGRAM_STATE ID: $KV_TELEGRAM_ID"
echo "  R2 Buckets: TELEGRAM_MEDIA, EVIDENCE_VAULT"
echo "  Vectorize Index: $VECTOR_ID"
echo ""
echo "⚠️  Please update wrangler.toml with these IDs before deploying!"


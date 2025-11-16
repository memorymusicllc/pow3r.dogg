#!/bin/bash

# SpiderFoot Setup Script
# This script helps set up SpiderFoot on a VPS/server

set -e

echo "🕷️  SpiderFoot Setup Script"
echo "============================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Prompt for configuration
read -p "Enter your server's public IP or domain: " SERVER_IP
read -p "Enter port for SpiderFoot (default: 5001): " PORT
PORT=${PORT:-5001}

read -p "Do you want to use Cloudflare Tunnel? (y/n): " USE_TUNNEL
USE_TUNNEL=${USE_TUNNEL:-n}

# Pull SpiderFoot image
echo ""
echo "📥 Pulling SpiderFoot Docker image..."
docker pull spiderfoot/spiderfoot:latest

# Stop existing container if running
if docker ps -a | grep -q spiderfoot; then
    echo "🛑 Stopping existing SpiderFoot container..."
    docker stop spiderfoot 2>/dev/null || true
    docker rm spiderfoot 2>/dev/null || true
fi

# Run SpiderFoot container
echo "🚀 Starting SpiderFoot container..."
docker run -d \
  --name spiderfoot \
  -p ${PORT}:5001 \
  -v spiderfoot-data:/var/lib/spiderfoot \
  --restart unless-stopped \
  spiderfoot/spiderfoot:latest

echo ""
echo "✅ SpiderFoot container started!"
echo ""
echo "📋 Configuration:"
echo "   - Web UI: http://${SERVER_IP}:${PORT}"
echo "   - Default username: admin"
echo "   - Default password: spiderfoot_admin"
echo ""
echo "⚠️  IMPORTANT: Change the default password immediately!"
echo ""

if [ "$USE_TUNNEL" = "y" ]; then
    echo "🌐 Cloudflare Tunnel Setup:"
    echo "   1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    echo "   2. Run: cloudflared tunnel login"
    echo "   3. Run: cloudflared tunnel create spiderfoot"
    echo "   4. Run: cloudflared tunnel route dns spiderfoot spiderfoot.yourdomain.com"
    echo "   5. Run: cloudflared tunnel run spiderfoot"
    echo ""
    echo "   Then set SPIDERFOOT_API_URL=https://spiderfoot.yourdomain.com in your Worker"
else
    echo "🔧 Worker Configuration:"
    echo "   Set SPIDERFOOT_API_URL=http://${SERVER_IP}:${PORT} in your Worker:"
    echo "   npx wrangler secret put SPIDERFOOT_API_URL"
    echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Access SpiderFoot web UI and change default password"
echo "   2. Configure API settings (optional)"
echo "   3. Enable required modules (sfp_email, sfp_phone, etc.)"
echo "   4. Set SPIDERFOOT_API_URL in your Cloudflare Worker"
echo "   5. Test connection from your Worker"


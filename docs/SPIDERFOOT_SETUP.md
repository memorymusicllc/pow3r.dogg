# SpiderFoot Setup Guide

SpiderFoot replaces OSINT Industries and Tracers APIs, providing comprehensive OSINT collection capabilities.

## Prerequisites

- VPS or server with Docker installed
- Minimum 2GB RAM
- 10GB+ disk space
- Public IP or domain name (for API access)

## Quick Start

### 1. Deploy SpiderFoot with Docker

```bash
# Pull the official SpiderFoot image
docker pull spiderfoot/spiderfoot:latest

# Run SpiderFoot container
docker run -d \
  --name spiderfoot \
  -p 5001:5001 \
  -v spiderfoot-data:/var/lib/spiderfoot \
  spiderfoot/spiderfoot:latest
```

### 2. Access SpiderFoot Web UI

Open your browser and navigate to:
```
http://your-server-ip:5001
```

Default credentials:
- Username: `admin`
- Password: `spiderfoot_admin` (change immediately!)

### 3. Configure API Access

1. Log into SpiderFoot web UI
2. Go to **Settings** → **API**
3. Generate an API key (optional, for authentication)
4. Note the API URL (usually `http://your-server-ip:5001`)

### 4. Configure Cloudflare Worker

Set the `SPIDERFOOT_API_URL` environment variable in your Cloudflare Worker:

```bash
npx wrangler secret put SPIDERFOOT_API_URL
# Enter: http://your-server-ip:5001
```

Or if using Cloudflare Tunnel:

```bash
npx wrangler secret put SPIDERFOOT_API_URL
# Enter: https://spiderfoot.yourdomain.com
```

### 5. Test Connection

The Worker will automatically check if SpiderFoot is available using the `isAvailable()` method. If SpiderFoot is not reachable, it will fall back to legacy APIs.

## Advanced Configuration

### Using Cloudflare Tunnel (Recommended)

For secure access without exposing your server:

```bash
# Install cloudflared
brew install cloudflared  # macOS
# or
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create spiderfoot

# Configure tunnel
cloudflared tunnel route dns spiderfoot spiderfoot.yourdomain.com

# Run tunnel
cloudflared tunnel run spiderfoot
```

Then set `SPIDERFOOT_API_URL=https://spiderfoot.yourdomain.com` in your Worker.

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  spiderfoot:
    image: spiderfoot/spiderfoot:latest
    container_name: spiderfoot
    ports:
      - "5001:5001"
    volumes:
      - spiderfoot-data:/var/lib/spiderfoot
    environment:
      - SF_MODULES_ENABLED=sfp_email,sfp_phone,sfp_username,sfp_domain,sfp_hunter,sfp_holehe,sfp_sherlock
    restart: unless-stopped

volumes:
  spiderfoot-data:
```

Run with:
```bash
docker-compose up -d
```

### Module Configuration

Enable/disable modules in SpiderFoot web UI:
- **Settings** → **Modules**
- Enable: `sfp_email`, `sfp_phone`, `sfp_username`, `sfp_domain`, `sfp_hunter`, `sfp_holehe`, `sfp_sherlock`, `sfp_maigret`

## Troubleshooting

### SpiderFoot not accessible from Worker

1. Check firewall rules (port 5001)
2. Verify SpiderFoot is running: `docker ps | grep spiderfoot`
3. Test API endpoint: `curl http://your-server-ip:5001/version`
4. Check Cloudflare Tunnel status if using tunnel

### API Authentication Issues

If you've enabled API authentication:
1. Update `SpiderFootClient` to include API key in headers
2. Or disable authentication in SpiderFoot settings

### Performance Issues

- Increase container memory: `docker update --memory=4g spiderfoot`
- Limit concurrent scans in SpiderFoot settings
- Use SpiderFoot's queue system for batch operations

## Cost Estimate

- VPS: $10-20/month (DigitalOcean, Linode, Vultr)
- Cloudflare Tunnel: Free
- Total: ~$10-20/month (vs $400-1,000/month for OSINT Industries/Tracers)

## References

- [SpiderFoot Documentation](https://www.spiderfoot.net/documentation/)
- [SpiderFoot GitHub](https://github.com/smicallef/spiderfoot)
- [Docker Hub](https://hub.docker.com/r/spiderfoot/spiderfoot)


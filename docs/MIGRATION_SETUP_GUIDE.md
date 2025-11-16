# Open-Source API Migration Setup Guide

Complete guide for setting up all infrastructure components after the API migration.

## Overview

This guide covers the setup of:
1. **SpiderFoot** - Self-hosted OSINT automation (replaces OSINT Industries/Tracers)
2. **HIBP Password Database** - Offline breach checking (replaces HIBP API rate limits)
3. **VPN IP Lists** - X4BNet lists for VPN detection (replaces Spur.us)
4. **FireHOL Blocklists** - IP reputation lists (replaces IP Quality Score)

---

## 1. SpiderFoot Setup

### Quick Setup

```bash
# Run the setup script
./scripts/setup-spiderfoot.sh
```

### Manual Setup

See detailed guide: [SPIDERFOOT_SETUP.md](./SPIDERFOOT_SETUP.md)

### Configuration

After setup, configure your Worker:

```bash
npx wrangler secret put SPIDERFOOT_API_URL
# Enter: http://your-server-ip:5001
# Or: https://spiderfoot.yourdomain.com (if using Cloudflare Tunnel)
```

**Cost**: $10-20/month (VPS hosting)

---

## 2. HIBP Password Database

### One-Time Setup

The HIBP Pwned Passwords database is large (~29GB compressed, ~60GB uncompressed).

### Option A: Automated Script

```bash
# Run the download script (requires torrent client)
./scripts/download-hibp-database.sh
```

### Option B: Manual Download

1. Download torrent from: https://haveibeenpwned.com/Passwords
2. Download using your torrent client
3. Extract the 7z archive
4. Organize files by first 5 characters of hash
5. Upload to R2 bucket under `hibp-passwords/` prefix

### R2 Upload

```bash
# Upload organized files to R2
wrangler r2 object put hibp-passwords/00000.txt --file organized/00000/00000.txt
# Repeat for all prefix files
```

**Storage Cost**: ~$5-10/month (R2 storage)

---

## 3. VPN IP Lists

### One-Time Setup

```bash
# Run the download script
./scripts/download-vpn-lists.sh
```

### Manual Setup

1. Download from: https://github.com/X4BNet/lists_vpn
2. Parse IPs from text files
3. Upload to Workers KV with prefix `vpn:`

### Daily Updates

The Cron Trigger will automatically update VPN lists daily. Ensure the trigger is configured in `wrangler.toml`.

**Cost**: Free (Workers KV)

---

## 4. FireHOL Blocklists

### One-Time Setup

```bash
# Run the download script
./scripts/download-firehol-blocklists.sh
```

### Manual Setup

1. Download from: https://github.com/firehol/blocklist-ipsets
2. Process `.netset` and `.ipset` files
3. Upload to Workers KV with prefix `blocklist:`

### Daily Updates

The Cron Trigger will automatically update blocklists daily. Ensure the trigger is configured in `wrangler.toml`.

**Cost**: Free (Workers KV)

---

## 5. Cron Triggers Configuration

### Deploy Cron Triggers

The cron triggers are defined in `wrangler.toml`:

```toml
[[triggers.crons]]
cron = "0 2 * * *"  # Daily at 2 AM UTC
script = "update-blocklists"

[[triggers.crons]]
cron = "0 3 * * *"  # Daily at 3 AM UTC
script = "update-vpn-lists"
```

### Deploy Separate Workers

Create separate Workers for cron triggers:

```bash
# Deploy blocklist updater
wrangler deploy --name update-blocklists --compatibility-date 2024-11-14

# Deploy VPN list updater
wrangler deploy --name update-vpn-lists --compatibility-date 2024-11-14
```

Or use the main Worker with cron triggers configured.

---

## 6. Environment Variables

### Required (Optional but Recommended)

```bash
# AbuseIPDB API key (optional - free tier works without it)
npx wrangler secret put ABUSEIPDB_API_KEY

# SpiderFoot API URL (required if using SpiderFoot)
npx wrangler secret put SPIDERFOOT_API_URL
```

### Deprecated (Can be removed)

These API keys are no longer needed but kept for backward compatibility:

- `SPUR_API_KEY` - Replaced with IP2Proxy LITE + VPN lists
- `IPQS_API_KEY` - Replaced with AbuseIPDB + FireHOL
- `HUNTER_API_KEY` - Replaced with EmailRep.io
- `NUMVERIFY_API_KEY` - Replaced with libphonenumber-js
- `WHOIS_API_KEY` - Replaced with ICANN RDAP
- `OSINT_INDUSTRIES_API_KEY` - Replaced with SpiderFoot
- `TRACERS_API_KEY` - Replaced with SpiderFoot

---

## 7. Testing

### Test Phone Validation

```bash
curl -X POST https://your-worker.workers.dev/admin/osint/phone \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

Should use `libphonenumber-js` (no API calls).

### Test Email Lookup

```bash
curl -X POST https://your-worker.workers.dev/admin/osint/email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

Should use `EmailRep.io` + MX validation (no Hunter.io).

### Test Domain Lookup

```bash
curl -X POST https://your-worker.workers.dev/admin/osint/domain \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'
```

Should use `ICANN RDAP` (no WHOIS API).

### Test IP Attribution

```bash
curl -X POST https://your-worker.workers.dev/attribution \
  -H "Content-Type: application/json" \
  -d '{"ip": "1.2.3.4"}'
```

Should use `AbuseIPDB` + `FireHOL` + `VPN lists` (no IPQS/Spur.us).

---

## 8. Monitoring

### Check Cron Trigger Status

```bash
# View cron trigger logs
wrangler tail update-blocklists
wrangler tail update-vpn-lists
```

### Monitor API Usage

- **AbuseIPDB**: Check dashboard for query count (1,000/day free tier)
- **EmailRep.io**: No limits (free)
- **ICANN RDAP**: No limits (free)
- **SpiderFoot**: Monitor VPS resources

### Verify Data Updates

```bash
# Check KV for last update time
wrangler kv:key get blocklist:lastUpdated
wrangler kv:key get vpn:metadata
```

---

## 9. Troubleshooting

### SpiderFoot Not Accessible

1. Check VPS firewall (port 5001)
2. Verify Docker container is running: `docker ps | grep spiderfoot`
3. Test API: `curl http://your-server-ip:5001/version`
4. Check Cloudflare Tunnel if using tunnel

### HIBP Database Not Working

1. Verify files in R2: `wrangler r2 object list hibp-passwords/`
2. Check file organization (should be by first 5 chars)
3. Verify binary search implementation in `breach-checker.ts`

### VPN Lists Not Updating

1. Check Cron Trigger configuration in `wrangler.toml`
2. Verify Cron Trigger is deployed
3. Check KV namespace permissions
4. Review logs: `wrangler tail update-vpn-lists`

### Blocklists Not Updating

1. Check Cron Trigger configuration
2. Verify GitHub access (FireHOL repo)
3. Check KV namespace permissions
4. Review logs: `wrangler tail update-blocklists`

---

## 10. Cost Summary

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| SpiderFoot VPS | $10-20 | DigitalOcean/Linode/Vultr |
| HIBP Database (R2) | $5-10 | One-time download, monthly updates |
| VPN Lists (KV) | Free | Workers KV free tier |
| FireHOL Blocklists (KV) | Free | Workers KV free tier |
| AbuseIPDB | Free | 1,000 queries/day free tier |
| **Total** | **$15-30/month** | vs $850-2,250/month for paid APIs |

**Annual Savings**: $10,020-26,640/year

---

## 11. Next Steps

1. ✅ Set up SpiderFoot (if using OSINT Industries/Tracers replacement)
2. ✅ Download HIBP password database (if using offline password checking)
3. ✅ Run VPN lists download script
4. ✅ Run FireHOL blocklists download script
5. ✅ Deploy Cron Triggers for daily updates
6. ✅ Test all endpoints
7. ✅ Monitor for 1 week
8. ✅ Remove deprecated API keys (optional)

---

## Support

For issues or questions:
- Check individual setup guides in `docs/`
- Review script comments in `scripts/`
- Check Cloudflare Workers logs
- Review Cron Trigger execution logs


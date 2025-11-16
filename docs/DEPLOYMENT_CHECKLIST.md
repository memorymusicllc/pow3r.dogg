# Deployment Checklist

Complete checklist for deploying the open-source API migration.

## Pre-Deployment

### Code Verification
- [x] All TypeScript code compiles (`npm run typecheck`)
- [x] No linter errors
- [x] All tests pass (if applicable)
- [x] Backward compatibility maintained

### Environment Variables
- [ ] Set `ABUSEIPDB_API_KEY` (optional, for higher rate limits)
- [ ] Set `SPIDERFOOT_API_URL` (if using SpiderFoot)
- [ ] Verify deprecated API keys are optional

### Dependencies
- [x] `libphonenumber-js` installed (`npm install`)

---

## Infrastructure Setup

### 1. SpiderFoot (Optional - for OSINT Industries/Tracers replacement)
- [ ] VPS/server provisioned ($10-20/month)
- [ ] Docker installed on VPS
- [ ] SpiderFoot container running
- [ ] Web UI accessible
- [ ] API URL configured in Worker
- [ ] Test connection from Worker

**Script**: `./scripts/setup-spiderfoot.sh`

### 2. HIBP Password Database (Optional - for offline password checking)
- [ ] Sufficient disk space (~60GB)
- [ ] Torrent client installed
- [ ] Database downloaded
- [ ] Files organized by prefix
- [ ] Uploaded to R2 bucket (`hibp-passwords/`)
- [ ] Test binary search lookup

**Script**: `./scripts/download-hibp-database.sh`

### 3. VPN IP Lists (Recommended)
- [ ] VPN lists downloaded
- [ ] Uploaded to Workers KV
- [ ] Test VPN detection

**Script**: `./scripts/download-vpn-lists.sh` or `./scripts/quick-setup-vpn-blocklists.sh`

### 4. FireHOL Blocklists (Recommended)
- [ ] Blocklists downloaded
- [ ] Processed and uploaded to Workers KV
- [ ] Test IP reputation scoring

**Script**: `./scripts/download-firehol-blocklists.sh` or `./scripts/quick-setup-vpn-blocklists.sh`

### 5. Cron Triggers (Recommended)
- [ ] Cron triggers configured in `wrangler.toml`
- [ ] Separate workers deployed OR
- [ ] Cron triggers added to main worker
- [ ] Test cron execution

**Script**: `./scripts/deploy-cron-triggers.sh`

---

## Deployment Steps

### 1. Deploy Main Worker
```bash
npm run deploy:production
```

### 2. Deploy Cron Workers (if separate)
```bash
./scripts/deploy-cron-triggers.sh
```

### 3. Verify Deployment
```bash
# Test phone validation
curl -X POST https://your-worker.workers.dev/admin/osint/phone \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'

# Test email lookup
curl -X POST https://your-worker.workers.dev/admin/osint/email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Test domain lookup
curl -X POST https://your-worker.workers.dev/admin/osint/domain \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'

# Test IP attribution
curl -X POST https://your-worker.workers.dev/attribution \
  -H "Content-Type: application/json" \
  -d '{"ip": "8.8.8.8"}'
```

---

## Post-Deployment

### Monitoring (First Week)
- [ ] Monitor API response times
- [ ] Check error rates
- [ ] Verify Cron Triggers are executing
- [ ] Monitor AbuseIPDB rate limits (if using)
- [ ] Check SpiderFoot availability (if using)
- [ ] Verify VPN lists are updating
- [ ] Verify blocklists are updating

### Validation
- [ ] Phone validation working (libphonenumber-js)
- [ ] Email lookup working (EmailRep.io + MX)
- [ ] Domain lookup working (ICANN RDAP)
- [ ] IP reputation working (AbuseIPDB + FireHOL)
- [ ] VPN detection working (IP2Proxy + VPN lists)
- [ ] Breach checking working (HIBP API or offline)
- [ ] SpiderFoot working (if configured)

### Cleanup (Optional)
- [ ] Remove deprecated API keys from environment
- [ ] Update documentation with new endpoints
- [ ] Archive old API integration code (if desired)

---

## Rollback Plan

If issues occur:

1. **Revert Worker Deployment**
   ```bash
   git revert <migration-commit>
   npm run deploy:production
   ```

2. **Re-enable Old API Keys**
   - Set deprecated API keys back in environment
   - System will fall back to old APIs automatically

3. **Monitor and Fix**
   - Check logs for specific failures
   - Fix issues incrementally
   - Re-deploy

---

## Success Criteria

✅ All endpoints responding correctly  
✅ No increase in error rates  
✅ Response times acceptable  
✅ Cost savings verified  
✅ Cron Triggers executing daily  
✅ Data updates working  

---

## Support Resources

- **Migration Guide**: `docs/MIGRATION_SETUP_GUIDE.md`
- **SpiderFoot Setup**: `docs/SPIDERFOOT_SETUP.md`
- **Migration Summary**: `docs/MIGRATION_COMPLETE.md`
- **Test Script**: `scripts/test-migration.ts`

---

## Quick Reference

### Test All Implementations
```bash
# Run test script (if using Node.js)
npx tsx scripts/test-migration.ts
```

### Quick Setup (VPN Lists + Blocklists)
```bash
./scripts/quick-setup-vpn-blocklists.sh
```

### Full Setup
```bash
# VPN Lists
./scripts/download-vpn-lists.sh

# Blocklists
./scripts/download-firehol-blocklists.sh

# Cron Triggers
./scripts/deploy-cron-triggers.sh
```

---

**Status**: Ready for deployment ✅


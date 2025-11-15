# Pow3r Defender Setup Guide

## Prerequisites

1. **Cloudflare Account** with Workers, D1, R2, KV, and Vectorize enabled
2. **Wrangler CLI** authenticated with proper permissions
3. **GitHub Repository** (already set up at: https://github.com/memorymusicllc/pow3r.dogg)

## Step-by-Step Setup

### 1. Authenticate Wrangler

```bash
# Login to Cloudflare (will open browser)
npx wrangler login

# Or set API token with full permissions:
export CLOUDFLARE_API_TOKEN="your-token-with-d1-r2-kv-permissions"
```

**Required Token Permissions:**
- Account: Workers Scripts:Edit
- Account: Workers KV Storage:Edit
- Account: Workers D1:Edit
- Account: Workers R2:Edit
- Account: Workers Vectorize:Edit

### 2. Create Cloudflare Resources

Run the setup script:
```bash
./scripts/setup-cloudflare.sh
```

Or create manually:

#### D1 Database
```bash
npx wrangler d1 create DEFENDER_DB
# Note the database_id from output
```

#### KV Namespaces
```bash
npx wrangler kv:namespace create DEFENDER_FORGE
npx wrangler kv:namespace create CONFIG_STORE
npx wrangler kv:namespace create TELEGRAM_STATE
# Note the id from each output
```

#### R2 Buckets
```bash
npx wrangler r2 bucket create TELEGRAM_MEDIA
npx wrangler r2 bucket create EVIDENCE_VAULT
```

#### Vectorize Index
```bash
npx wrangler vectorize create DEFENDER_VECTORS --dimensions=768 --metric=cosine
```

### 3. Update wrangler.toml

Edit `wrangler.toml` and replace placeholder IDs with actual values from step 2:

```toml
[[env.production.d1_databases]]
binding = "DEFENDER_DB"
database_name = "defender-db"
database_id = "YOUR_ACTUAL_D1_DATABASE_ID"  # Replace this

[[env.production.kv_namespaces]]
binding = "DEFENDER_FORGE"
id = "YOUR_ACTUAL_KV_FORGE_ID"  # Replace this

[[env.production.kv_namespaces]]
binding = "CONFIG_STORE"
id = "YOUR_ACTUAL_KV_CONFIG_ID"  # Replace this

[[env.production.kv_namespaces]]
binding = "TELEGRAM_STATE"
id = "YOUR_ACTUAL_KV_TELEGRAM_ID"  # Replace this
```

### 4. Initialize D1 Schema

```bash
npx wrangler d1 execute DEFENDER_DB --file=./schema.sql
```

### 5. Set Secrets

Set all required secrets via Wrangler:

```bash
# Telegram
npx wrangler secret put TELEGRAM_API_ID
npx wrangler secret put TELEGRAM_API_HASH
npx wrangler secret put TELEGRAM_BOT_TOKEN

# OSINT APIs
npx wrangler secret put SPUR_API_KEY
npx wrangler secret put OSINT_INDUSTRIES_API_KEY
npx wrangler secret put TRACERS_API_KEY
npx wrangler secret put IPQS_API_KEY
npx wrangler secret put HUNTER_API_KEY
npx wrangler secret put HIBP_API_KEY
npx wrangler secret put NUMVERIFY_API_KEY
npx wrangler secret put WHOIS_API_KEY

# Abi Integration
npx wrangler secret put ABI_WEBHOOK_URL

# Optional: Blockchain
npx wrangler secret put ETHEREUM_RPC_URL
```

### 6. Deploy

```bash
npm run deploy:production
```

### 7. Verify Deployment

Check the deployment:
```bash
npx wrangler deployments list
```

## Abi Monitoring

Abi will automatically receive notifications for:
- XMAP node updates
- Investigation starts
- High-risk attacker detection
- Evidence package ready
- Impersonation active

To test Abi notifications:
```bash
./scripts/notify-abi.sh "test" "completed" "Testing Abi integration"
```

## Troubleshooting

### Authentication Errors
- Ensure `CLOUDFLARE_API_TOKEN` has all required permissions
- Try `npx wrangler login` for interactive authentication

### Missing Bindings
- Verify all IDs in `wrangler.toml` are correct
- Check binding names match exactly

### Deployment Failures
- Check Cloudflare dashboard for error logs
- Verify all secrets are set
- Ensure D1 schema is initialized

## Next Steps

1. Configure Telegram bot credentials
2. Set up XMAP MCP server connection
3. Configure Abi webhook URL
4. Test Guard Dog monitoring
5. Deploy impersonation bot


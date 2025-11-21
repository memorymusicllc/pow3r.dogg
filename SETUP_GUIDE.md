# Pow3r Defender Setup Guide

## Prerequisites

1. **Cloudflare Account** with Workers, D1, R2, KV, and Vectorize enabled
2. **Wrangler CLI** authenticated with proper permissions
3. **GitHub Repository** (already set up at: https://github.com/memorymusicllc/pow3r.ddog)

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

### 1. Configure Telegram Bot Credentials

Telegram bot credentials are required for Guard Dog monitoring and impersonation bot functionality.

#### Get Telegram API Credentials

1. **Get API ID and Hash**:
   - Visit: https://my.telegram.org/apps
   - Log in with your phone number
   - Create a new application (if needed)
   - Note your `api_id` and `api_hash`

2. **Get Bot Token**:
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` command
   - Follow prompts to create a bot
   - Copy the bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

#### Set Credentials

**Option A: Using Setup Script (Recommended)**
```bash
./scripts/setup-api-keys.sh
```

**Option B: Manual Setup via Wrangler**
```bash
# Set Telegram API credentials
npx wrangler secret put TELEGRAM_API_ID
# Enter your API ID when prompted

npx wrangler secret put TELEGRAM_API_HASH
# Enter your API Hash when prompted

npx wrangler secret put TELEGRAM_BOT_TOKEN
# Enter your bot token when prompted
```

**Option C: Using Pow3r Pass**
```bash
./scripts/setup-api-keys-pow3r-pass.sh
```

#### Verify Configuration

Check that secrets are set:
```bash
npx wrangler secret list
```

You should see:
- `TELEGRAM_API_ID`
- `TELEGRAM_API_HASH`
- `TELEGRAM_BOT_TOKEN`

---

### 2. Set Up XMAP MCP Server Connection

XMAP (Universal Recursive Visual Schema) integration enables knowledge graph visualization and repository tracking.

#### XMAP MCP Server Details

- **Base URL**: `https://config.superbots.link/mcp/xmap`
- **Protocol**: MCP 2024-11-05
- **Authentication**: Pow3r Pass (if configured)

#### Configuration

The XMAP client is automatically configured in the codebase. Verify the connection:

**Option A: Using Test Script (Recommended)**
```bash
./scripts/test-xmap-connection.sh
```

**Option B: Manual Test via curl**
```bash
# Test via curl
curl -X POST https://config.superbots.link/mcp/xmap/initialize \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response**:
```json
{
  "name": "xmap",
  "version": "1.0.0",
  "capabilities": {}
}
```

#### XMAP Tools Available

1. **xmap_generate_from_repo** - Generate XMAP from GitHub repository
2. **xmap_update_dev_status** - Update development status
3. **xmap_validate** - Validate XMAP with Guardian gates
4. **xmap_merge_repos** - Merge multiple XMAP instances
5. **xmap_sync_from_repo** - Sync XMAP from repository

#### Integration Points

- **Storage**: `CONFIG_STORE` (KV) for XMAP configs
- **History**: `DEFENDER_DB` (D1) for version history
- **Webhooks**: `/xmap/webhook/github` for GitHub sync
- **Sync API**: `/xmap/sync` for KV polling

#### Verify Integration

Check XMAP client in code:
```typescript
// src/xmap/integration.ts
const xmapConfig = {
  mcpServer: 'https://config.superbots.link/mcp/xmap',
  // ... configuration
};
```

---

### 3. Configure Abi Webhook URL

Abi orchestrator receives real-time notifications for monitoring and progress tracking.

#### Get Abi Webhook URL

Obtain your Abi webhook endpoint URL from your Abi orchestrator setup. It should be in the format:
```
https://your-abi-instance.com/webhooks/pow3r-defender
```

#### Set Webhook URL

**Option A: Via Wrangler Secret**
```bash
npx wrangler secret put ABI_WEBHOOK_URL
# Enter your Abi webhook URL when prompted
```

**Option B: Environment Variable (Development)**
```bash
export ABI_WEBHOOK_URL="https://your-abi-instance.com/webhooks/pow3r-defender"
```

**Option C: Via Pow3r Pass**
```bash
# Store as credential:abi_webhook_url in Pow3r Pass KV
```

#### Event Types Abi Receives

1. **xmap_node_updated** - XMAP sync, merge, or update events
2. **investigation_started** - New investigation begins
3. **high_risk_attacker** - High-risk attacker detected
4. **evidence_package_ready** - Evidence package exported
5. **impersonation_active** - Impersonation bot active

#### Test Abi Integration

**Option A: Using Test Script (Recommended)**
```bash
./scripts/test-abi-webhook.sh
```

**Option B: Using notify-abi.sh Script**
```bash
# Send test notification
./scripts/notify-abi.sh "test" "completed" "Testing Abi integration"
```

**Expected Output**:
```
✅ Notified Abi: test - completed
```

#### Verify Configuration

Check that the webhook URL is accessible:
```bash
# Test webhook endpoint (replace with your URL)
curl -X POST "$ABI_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","timestamp":"2025-01-14T12:00:00Z"}'
```

#### Monitoring

Track progress via:
```bash
# Show progress status
./scripts/monitor-progress.sh show

# Get summary
./scripts/monitor-progress.sh summary
```

See [ABI_MONITORING.md](./ABI_MONITORING.md) for complete documentation.

---

### 4. Test Guard Dog Monitoring

Guard Dog provides real-time Telegram message monitoring and manipulation detection.

#### Prerequisites

- Telegram bot credentials configured (Step 1)
- Worker deployed to Cloudflare
- Telegram bot added to target chat

#### Test Guard Dog

**Option A: Using Test Script (Recommended)**
```bash
# Set environment variables if needed
export WORKER_URL="https://your-worker.workers.dev"
export CHAT_ID="your_chat_id"
export USER_ID="your_user_id"

# Run test script
./scripts/test-guard-dog.sh
```

**Option B: Manual Testing**

#### Deploy Guard Dog

Guard Dog is automatically deployed when processing Telegram messages. To manually deploy:

**Via API**:
```bash
curl -X POST https://your-worker.workers.dev/telegram/guard/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "CHAT_ID",
    "userId": "USER_ID"
  }'
```

**Via Code**:
```typescript
import { GuardDog } from './src/telegram/guard';

const guardDog = new GuardDog(env);
const state = await guardDog.deploy(chatId, userId);
```

#### Test Manipulation Detection

Guard Dog detects:
- **Self-destruct messages** - 100% capture rate
- **Social engineering patterns** - Urgency, credential requests, payment demands
- **Message frequency anomalies** - Rapid message bursts
- **Message deletion spikes** - Suspicious deletion patterns

**Test Scenarios**:

1. **Self-Destruct Message**:
   - Send a disappearing message in monitored chat
   - Guard Dog should capture immediately

2. **Social Engineering**:
   - Send message with urgency language: "URGENT! Need password immediately!"
   - Guard Dog should detect and flag

3. **Message Frequency**:
   - Send 10+ messages in rapid succession
   - Guard Dog should detect anomaly

#### Check Guard Dog State

```bash
# Query Guard Dog state via API
curl https://your-worker.workers.dev/telegram/guard/state?chatId=CHAT_ID&userId=USER_ID
```

**Response**:
```json
{
  "chatId": "CHAT_ID",
  "userId": "USER_ID",
  "enabled": true,
  "threatScore": 0.75,
  "lastActivity": "2025-01-14T12:00:00Z",
  "messageCount": 15,
  "manipulationCount": 3
}
```

#### View Detection Logs

Check Cloudflare Workers logs:
```bash
npx wrangler tail
```

Look for:
- `guard_deployed` - Guard Dog activated
- `manipulation_detected` - Pattern detected
- `capture_immediately` - Self-destruct captured

#### Verify Abi Notifications

Guard Dog automatically notifies Abi when:
- Manipulation is detected
- Threat score exceeds threshold
- Guard Dog is deployed

Check Abi dashboard for notifications.

---

### 5. Deploy Impersonation Bot

The impersonation bot engages attackers with victim-style responses to waste time (12-48 hours).

#### Prerequisites

- Telegram bot credentials configured (Step 1)
- Guard Dog monitoring active (Step 4)
- Vectorize index configured (for style embeddings)
- Claude 3.7 Sonnet MCP access (for response generation)

#### Test Impersonation Bot

**Option A: Using Test Script (Recommended)**
```bash
# Set environment variables if needed
export WORKER_URL="https://your-worker.workers.dev"
export CHAT_ID="your_chat_id"
export ATTACKER_ID="attacker_id"
export VICTIM_ID="victim_id"

# Run test script
./scripts/test-impersonation-bot.sh
```

**Option B: Manual Testing**

#### Enable Impersonation

**Via API**:
```bash
curl -X POST https://your-worker.workers.dev/telegram/impersonate/enable \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "CHAT_ID",
    "attackerId": "ATTACKER_ID",
    "victimId": "VICTIM_ID",
    "styleData": {
      "averageResponseTime": 60,
      "emojiUsage": ["👍", "😊"],
      "punctuationStyle": "standard",
      "commonPhrases": ["Let me think about that"]
    }
  }'
```

**Via Code**:
```typescript
import { ImpersonationBot } from './src/telegram/impersonate';

const impersonationBot = new ImpersonationBot(env);
const state = await impersonationBot.enable(chatId, attackerId, victimId, styleData);
```

#### Time Waste Strategies

The bot uses progressive strategies:

1. **0-2 hours**: Extended questions
2. **2-4 hours**: Document review delays
3. **4-8 hours**: Consultation delays
4. **8-12 hours**: Technical issues
5. **12-48 hours**: Payment processing delays

#### Generate Response

The bot automatically generates responses when attacker sends messages:

```typescript
const response = await impersonationBot.generateResponse(chatId, attackerId, {
  text: "Attacker message",
  messageId: "MSG_ID",
  timestamp: Date.now()
});

// response.text - Generated response text
// response.delay - Delay in milliseconds before sending
// response.shouldContinue - Whether to continue impersonation
```

#### Monitor Impersonation

**Check State**:
```bash
curl https://your-worker.workers.dev/telegram/impersonate/state?chatId=CHAT_ID&attackerId=ATTACKER_ID
```

**Response**:
```json
{
  "chatId": "CHAT_ID",
  "attackerId": "ATTACKER_ID",
  "victimId": "VICTIM_ID",
  "enabled": true,
  "startTime": "2025-01-14T10:00:00Z",
  "messageCount": 25,
  "timeWasted": 14400,
  "styleProfile": {
    "averageResponseTime": 60,
    "emojiUsage": ["👍"],
    "punctuationStyle": "standard",
    "commonPhrases": []
  }
}
```

#### Disable Impersonation

```bash
curl -X POST https://your-worker.workers.dev/telegram/impersonate/disable \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "CHAT_ID",
    "attackerId": "ATTACKER_ID"
  }'
```

Or via code:
```typescript
await impersonationBot.disable(chatId, attackerId);
```

#### Verify Abi Notifications

Impersonation bot automatically notifies Abi when:
- Impersonation starts
- Impersonation ends
- Time wasted milestones reached

Check Abi dashboard for `impersonation_active` events.

#### Stealth Features

The impersonation bot includes:
- **Read receipt delays** - 5-30 seconds (normal distribution)
- **Typing indicators** - Human-like patterns
- **Online status** - Automatic switching
- **Response delays** - 10-300 seconds based on urgency

All configured in `src/telegram/stealth.ts`.

---

## Verification Checklist

After completing all steps, verify:

- [ ] Telegram bot credentials set and verified
- [ ] XMAP MCP server connection tested
- [ ] Abi webhook URL configured and tested
- [ ] Guard Dog monitoring active and detecting patterns
- [ ] Impersonation bot deployed and generating responses
- [ ] Abi receiving notifications for all event types
- [ ] Cloudflare Workers logs showing no errors
- [ ] All secrets properly configured

### Automated Verification

Run the comprehensive verification script to check all components:

```bash
# Set environment variables
export WORKER_URL="https://your-worker.workers.dev"
export XMAP_BASE_URL="https://config.superbots.link/mcp/xmap"
export ABI_WEBHOOK_URL="https://your-abi-instance.com/webhooks/pow3r-defender"

# Run verification
./scripts/verify-setup.sh
```

This script will:
- ✅ Check Telegram bot credentials configuration
- ✅ Test XMAP MCP server connection
- ✅ Verify Abi webhook URL and connectivity
- ✅ Test Guard Dog API endpoints
- ✅ Test Impersonation bot API endpoints
- ✅ Provide a summary of all checks

## Troubleshooting

### Telegram Bot Issues

- **Bot not responding**: Check `TELEGRAM_BOT_TOKEN` is correct
- **API errors**: Verify `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`
- **Permission denied**: Ensure bot is added to target chat

### XMAP Connection Issues

- **Connection timeout**: Check `https://config.superbots.link` is accessible
- **Authentication errors**: Verify Pow3r Pass credentials if using
- **Tool not found**: Ensure XMAP MCP server is deployed

### Abi Webhook Issues

- **Notifications not received**: Verify `ABI_WEBHOOK_URL` is correct
- **Timeout errors**: Check Abi webhook endpoint is accessible
- **Event format errors**: Verify payload matches Abi's expected format

### Guard Dog Issues

- **Not detecting patterns**: Check message format and patterns
- **State not persisting**: Verify `TELEGRAM_STATE` KV namespace
- **Abi notifications missing**: Check `ABI_WEBHOOK_URL` is set

### Impersonation Bot Issues

- **Responses not generating**: Check Claude MCP access
- **Style not matching**: Verify Vectorize index is configured
- **Time waste not working**: Check strategy selection logic

For more help, see [Troubleshooting](#troubleshooting) section above.


# Abi Monitoring Integration

Pow3r Defender is fully integrated with Abi orchestrator for real-time progress monitoring and event notifications.

## Overview

Abi receives notifications for:
- **XMAP Updates**: Node changes, sync events, version history
- **Investigation Events**: Investigation starts, high-risk attacker detection
- **Evidence Events**: Evidence package ready, capture events
- **Telegram Events**: Impersonation active, manipulation detected
- **Deployment Progress**: Setup steps, deployment status

## Configuration

### Webhook URL

Set the Abi webhook URL as a Cloudflare secret:

```bash
npx wrangler secret put ABI_WEBHOOK_URL
```

Or set in environment:
```bash
export ABI_WEBHOOK_URL="https://your-abi-webhook-url.com/events"
```

### Event Types

Abi receives the following event types:

1. **xmap_node_updated**
   - Triggered on XMAP sync, merge, or update
   - Includes: xmapId, repoUrl, changeType, diff

2. **investigation_started**
   - Triggered when new investigation begins
   - Includes: investigationId, attackerId, metadata

3. **high_risk_attacker**
   - Triggered when high-risk attacker detected
   - Includes: attackerId, riskScore, metadata

4. **evidence_package_ready**
   - Triggered when evidence package is exported
   - Includes: investigationId, evidencePackageId, metadata

5. **impersonation_active**
   - Triggered when impersonation bot is active
   - Includes: investigationId, attackerId, duration

## Progress Monitoring

### Command Line

Track deployment progress:
```bash
# Initialize tracking
./scripts/monitor-progress.sh init

# Update step
./scripts/monitor-progress.sh update cloudflare_resources completed "All resources created"

# Show status
./scripts/monitor-progress.sh show

# Get summary
./scripts/monitor-progress.sh summary
```

### Programmatic

Use the `AbiProgressMonitor` class in TypeScript:

```typescript
import { AbiProgressMonitor } from './src/xmap/abi-monitor';

const monitor = new AbiProgressMonitor(env);

// Start step
await monitor.startStep('deployment', 'Deploying to Cloudflare...');

// Complete step
await monitor.completeStep('deployment', 'Deployed successfully', {
  deploymentId: 'abc123',
  url: 'https://defender.workers.dev'
});

// Fail step
await monitor.failStep('deployment', 'Deployment failed', error);

// Get summary
const summary = monitor.getProgressSummary();
console.log(`Progress: ${summary.percentage}%`);
```

## Notification Scripts

### notify-abi.sh

Send manual notifications:
```bash
./scripts/notify-abi.sh "step_name" "status" "message"
```

Example:
```bash
./scripts/notify-abi.sh "database" "completed" "D1 schema initialized"
```

### Automatic Notifications

The following operations automatically notify Abi:

1. **XMAP Sync** (`src/xmap/sync.ts`)
   - GitHub webhook events
   - KV polling changes
   - Version updates

2. **Evidence Chain** (`src/forensic/chain.ts`)
   - Evidence stored
   - Chain of custody entries
   - Package exports

3. **Telegram Events** (`src/telegram/abi-notify.ts`)
   - Manipulation detected
   - Impersonation started/ended
   - Evidence captured

## Event Payload Format

All events follow this structure:

```json
{
  "event_type": "xmap_node_updated",
  "timestamp": "2025-01-14T12:00:00Z",
  "source": "pow3r-defender",
  "metadata": {
    "step": "xmap_sync",
    "status": "completed",
    "xmap_id": "xmap:repo:name",
    "repo_url": "https://github.com/org/repo",
    "change_type": "sync",
    "diff": {
      "nodesAdded": 5,
      "nodesRemoved": 2
    }
  }
}
```

## Retry Logic

Abi notifications include automatic retry with exponential backoff:

- **Max Retries**: 3
- **Backoff**: Exponential (1s, 2s, 4s)
- **Timeout**: 5 seconds
- **Deduplication**: 60-second window

Failed notifications are logged to KV for manual retry.

## Testing

Test Abi integration:

```bash
# Test notification
./scripts/notify-abi.sh "test" "completed" "Testing Abi integration"

# Check progress
./scripts/monitor-progress.sh show
```

## Monitoring Dashboard

Abi can query progress via:

1. **Progress File**: `.deployment-progress.json`
2. **KV Store**: `DEFENDER_FORGE` namespace with key `abi:progress`
3. **Webhook Events**: Real-time event stream

## Integration Points

### XMAP Integration
- **File**: `src/xmap/abi-notify.ts`
- **Events**: XMAP updates, sync events
- **Method**: `notifyXMAPUpdate()`

### Telegram Integration
- **File**: `src/telegram/abi-notify.ts`
- **Events**: Manipulation, impersonation, evidence
- **Methods**: `notifyManipulationDetected()`, `notifyImpersonationStarted()`, etc.

### Deployment Integration
- **File**: `scripts/deploy-with-abi.sh`
- **Events**: Setup steps, deployment status
- **Method**: `notify_abi()` function

## Next Steps

1. Set `ABI_WEBHOOK_URL` secret in Cloudflare
2. Configure Abi to listen for Pow3r Defender events
3. Set up Abi dashboard for progress visualization
4. Test notification flow end-to-end


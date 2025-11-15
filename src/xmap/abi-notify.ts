/**
 * Abi Notification System for XMAP Changes
 * 
 * Notifies Abi orchestrator of XMAP changes and investigation events
 * with retry logic, deduplication, and structured event payloads
 */

import type { Env } from '../types';

export interface AbiNotificationEvent {
  eventType:
    | 'xmap_node_updated'
    | 'investigation_started'
    | 'high_risk_attacker'
    | 'evidence_package_ready'
    | 'impersonation_active';
  xmapId?: string;
  investigationId?: string;
  attackerId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AbiNotificationConfig {
  webhookUrl: string;
  retryPolicy: {
    maxRetries: number;
    backoff: 'exponential' | 'linear';
    timeout: number;
  };
  deduplicationWindow: number; // seconds
}

export class AbiNotifier {
  private env: Env;
  private kv: KVNamespace;
  private config: AbiNotificationConfig;

  constructor(env: Env) {
    this.env = env;
    this.kv = env.DEFENDER_FORGE;

    // Get webhook URL from Pow3r Pass or env
    const webhookUrl =
      env.ABI_WEBHOOK_URL || 'credential:abi_webhook_url';

    this.config = {
      webhookUrl,
      retryPolicy: {
        maxRetries: 3,
        backoff: 'exponential',
        timeout: 5000,
      },
      deduplicationWindow: 60, // 1 minute
    };
  }

  /**
   * Notify Abi of an event
   */
  async notify(event: AbiNotificationEvent): Promise<void> {
    // Check for duplicate events
    const eventKey = this.getEventKey(event);
    const recentEvent = await this.kv.get(eventKey);

    if (recentEvent) {
      console.log(`Skipping duplicate event: ${eventKey}`);
      return;
    }

    // Mark event as sent (with TTL for deduplication window)
    await this.kv.put(
      eventKey,
      JSON.stringify({ timestamp: Date.now() }),
      { expirationTtl: this.config.deduplicationWindow }
    );

    // Send notification with retry logic
    await this.sendWithRetry(event);
  }

  /**
   * Send notification with exponential backoff retry
   */
  private async sendWithRetry(event: AbiNotificationEvent, attempt = 1): Promise<void> {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Pow3r-Defender/1.0',
        },
        body: JSON.stringify({
          ...event,
          source: 'pow3r-defender',
          attempt,
        }),
        signal: AbortSignal.timeout(this.config.retryPolicy.timeout),
      });

      if (!response.ok) {
        throw new Error(`Abi notification failed: ${response.status} ${response.statusText}`);
      }

      console.log(`Successfully notified Abi of event: ${event.eventType}`);
    } catch (error) {
      if (attempt < this.config.retryPolicy.maxRetries) {
        const delay = this.calculateBackoff(attempt);
        console.log(`Retrying Abi notification (attempt ${attempt + 1}) after ${delay}ms`);
        await this.sleep(delay);
        return this.sendWithRetry(event, attempt + 1);
      }

      // Log failure but don't throw - notification failure shouldn't break operations
      console.error(`Failed to notify Abi after ${attempt} attempts:`, error);
      
      // Store failed notification for manual retry
      await this.kv.put(
        `abi:failed:${Date.now()}`,
        JSON.stringify({ event, error: String(error), timestamp: new Date().toISOString() }),
        { expirationTtl: 86400 } // 24 hours
      );
    }
  }

  /**
   * Calculate backoff delay
   */
  private calculateBackoff(attempt: number): number {
    if (this.config.retryPolicy.backoff === 'exponential') {
      return Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30s
    }
    return 1000 * attempt; // Linear: 1s, 2s, 3s...
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate deduplication key for event
   */
  private getEventKey(event: AbiNotificationEvent): string {
    const parts = [
      event.eventType,
      event.xmapId || event.investigationId || event.attackerId || 'unknown',
      Math.floor(Date.now() / (this.config.deduplicationWindow * 1000)), // Round to window
    ];
    return `abi:event:${parts.join(':')}`;
  }

  /**
   * Notify Abi of XMAP node update
   */
  async notifyXMAPUpdate(
    xmapId: string,
    nodeId: string,
    changeType: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.notify({
      eventType: 'xmap_node_updated',
      xmapId,
      timestamp: new Date().toISOString(),
      metadata: {
        nodeId,
        changeType,
        ...metadata,
      },
    });
  }

  /**
   * Notify Abi of investigation start
   */
  async notifyInvestigationStart(
    investigationId: string,
    attackerId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.notify({
      eventType: 'investigation_started',
      investigationId,
      attackerId,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Notify Abi of high-risk attacker detection
   */
  async notifyHighRiskAttacker(
    attackerId: string,
    riskScore: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.notify({
      eventType: 'high_risk_attacker',
      attackerId,
      timestamp: new Date().toISOString(),
      metadata: {
        riskScore,
        ...metadata,
      },
    });
  }

  /**
   * Notify Abi of evidence package ready
   */
  async notifyEvidenceReady(
    investigationId: string,
    evidencePackageId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.notify({
      eventType: 'evidence_package_ready',
      investigationId,
      timestamp: new Date().toISOString(),
      metadata: {
        evidencePackageId,
        ...metadata,
      },
    });
  }

  /**
   * Notify Abi of active impersonation
   */
  async notifyImpersonationActive(
    investigationId: string,
    attackerId: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.notify({
      eventType: 'impersonation_active',
      investigationId,
      attackerId,
      timestamp: new Date().toISOString(),
      metadata: {
        duration,
        ...metadata,
      },
    });
  }
}


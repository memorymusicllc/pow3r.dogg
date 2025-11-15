/**
 * Abi Notification Handler for Telegram Events
 * 
 * Extends base AbiNotifier with Telegram-specific event handling
 */

import { AbiNotifier, type AbiNotificationEvent } from '../xmap/abi-notify';
import type { Env } from '../types';

export interface TelegramAbiEvent extends AbiNotificationEvent {
  telegramChatId?: string;
  telegramUserId?: string;
  messageId?: string;
  eventSubtype?: 'manipulation_detected' | 'impersonation_started' | 'impersonation_ended' | 'evidence_captured';
}

export class TelegramAbiNotifier extends AbiNotifier {
  constructor(env: Env) {
    super(env);
  }

  /**
   * Notify Abi of Telegram manipulation detection
   */
  async notifyManipulationDetected(
    chatId: string,
    userId: string,
    messageId: string,
    manipulationType: string,
    confidence: number
  ): Promise<void> {
    await this.notify({
      eventType: 'xmap_node_updated',
      timestamp: new Date().toISOString(),
      metadata: {
        telegramChatId: chatId,
        telegramUserId: userId,
        messageId,
        manipulationType,
        confidence,
        eventSubtype: 'manipulation_detected',
      },
    } as TelegramAbiEvent);
  }

  /**
   * Notify Abi of impersonation start
   */
  async notifyImpersonationStarted(
    investigationId: string,
    attackerId: string,
    chatId: string,
    userId: string
  ): Promise<void> {
    await this.notify({
      eventType: 'impersonation_active',
      investigationId,
      attackerId,
      timestamp: new Date().toISOString(),
      metadata: {
        telegramChatId: chatId,
        telegramUserId: userId,
        eventSubtype: 'impersonation_started',
      },
    } as TelegramAbiEvent);
  }

  /**
   * Notify Abi of impersonation end
   */
  async notifyImpersonationEnded(
    investigationId: string,
    attackerId: string,
    duration: number,
    timeWasted: number
  ): Promise<void> {
    await this.notify({
      eventType: 'impersonation_active',
      investigationId,
      attackerId,
      timestamp: new Date().toISOString(),
      metadata: {
        duration,
        timeWasted,
        eventSubtype: 'impersonation_ended',
      },
    } as TelegramAbiEvent);
  }

  /**
   * Notify Abi of evidence capture
   */
  async notifyEvidenceCaptured(
    investigationId: string,
    messageId: string,
    captureType: 'screenshot' | 'ocr' | 'metadata',
    evidenceId: string
  ): Promise<void> {
    await this.notify({
      eventType: 'evidence_package_ready',
      investigationId,
      timestamp: new Date().toISOString(),
      metadata: {
        messageId,
        captureType,
        evidenceId,
        eventSubtype: 'evidence_captured',
      },
    } as TelegramAbiEvent);
  }
}


/**
 * Telegram Guard Dog - Real-time Monitoring and Manipulation Detection
 * 
 * Monitors Telegram messages in real-time and detects manipulation patterns
 */

import type { Env } from '../types';
import { TelegramConfigLoader } from './config';
import { TelegramStealth } from './stealth';
import { TelegramAbiNotifier } from './abi-notify';

export interface GuardDogState {
  chatId: string;
  userId: string;
  enabled: boolean;
  threatScore: number;
  lastActivity: string;
  messageCount: number;
  manipulationCount: number;
}

export interface ManipulationDetection {
  detected: boolean;
  rule: string;
  confidence: number;
  patterns: string[];
  action: string;
}

export class GuardDog {
  private env: Env;
  private kv: KVNamespace;
  private config: any;
  private stealth: TelegramStealth;
  private abiNotifier: TelegramAbiNotifier;

  constructor(env: Env) {
    this.env = env;
    this.kv = env.TELEGRAM_STATE;
    
    // Load config (graceful if unavailable)
    this.loadConfig().catch(() => {
      console.warn('Telegram config not available, using defaults');
    });

    this.stealth = new TelegramStealth({
      readReceiptDelays: { minSeconds: 5, maxSeconds: 30, distribution: 'normal' },
      typingIndicators: { enabled: true, pattern: 'human_like', variation: 0.3, minChars: 3, maxChars: 50 },
      onlineStatus: { guardDog: 'offline', impersonation: 'online', switching: 'automatic' },
      messageTiming: { responseDelayMin: 10, responseDelayMax: 300, urgencyModifier: 0.5, naturalVariation: true },
    });

    this.abiNotifier = new TelegramAbiNotifier(env);
  }

  /**
   * Load Telegram bot configuration
   */
  private async loadConfig(): Promise<void> {
    try {
      const configYaml = await this.kv.get('telegram-bot.yaml');
      if (configYaml) {
        this.config = await TelegramConfigLoader.loadConfig(configYaml);
      }
    } catch (error) {
      console.warn('Failed to load Telegram config:', error);
    }
  }

  /**
   * Deploy Guard Dog to a chat
   */
  async deploy(chatId: string, userId: string, config?: Record<string, unknown>): Promise<GuardDogState> {
    const state: GuardDogState = {
      chatId,
      userId,
      enabled: true,
      threatScore: 0,
      lastActivity: new Date().toISOString(),
      messageCount: 0,
      manipulationCount: 0,
    };

    await this.kv.put(`guard:${chatId}:${userId}`, JSON.stringify(state));

    // Notify Abi (graceful failure)
    try {
      await this.abiNotifier.notifyManipulationDetected(
        chatId,
        userId,
        'system',
        'guard_deployed',
        1.0
      );
    } catch (error) {
      console.warn('Abi notification failed (non-critical):', error);
    }

    return state;
  }

  /**
   * Process incoming message
   */
  async processMessage(
    chatId: string,
    userId: string,
    message: {
      text?: string;
      messageId: string;
      timestamp: number;
      isSelfDestruct?: boolean;
      isEdited?: boolean;
      isDeleted?: boolean;
    }
  ): Promise<ManipulationDetection> {
    // Get or create state
    const stateKey = `guard:${chatId}:${userId}`;
    let state = await this.getState(chatId, userId);
    
    if (!state) {
      state = await this.deploy(chatId, userId);
    }

    // Update message count
    state.messageCount++;
    state.lastActivity = new Date().toISOString();

    // Detect manipulation patterns
    const detection = await this.detectManipulation(message, state);

    if (detection.detected) {
      state.manipulationCount++;
      state.threatScore = Math.min(state.threatScore + detection.confidence * 0.1, 1.0);

      // Execute action
      await this.executeAction(detection, chatId, userId, message);

      // Notify Abi (graceful failure)
      try {
        await this.abiNotifier.notifyManipulationDetected(
          chatId,
          userId,
          message.messageId,
          detection.rule,
          detection.confidence
        );
      } catch (error) {
        console.warn('Abi notification failed (non-critical):', error);
      }
    }

    // Save state
    await this.kv.put(stateKey, JSON.stringify(state));

    return detection;
  }

  /**
   * Detect manipulation patterns
   */
  private async detectManipulation(
    message: {
      text?: string;
      isSelfDestruct?: boolean;
      isEdited?: boolean;
      isDeleted?: boolean;
    },
    state: GuardDogState
  ): Promise<ManipulationDetection> {
    const text = message.text || '';
    const textLower = text.toLowerCase();

    // Self-destruct detection
    if (message.isSelfDestruct) {
      return {
        detected: true,
        rule: 'self_destruct_detection',
        confidence: 1.0,
        patterns: ['disappearing_messages'],
        action: 'capture_immediately',
      };
    }

    // Social engineering patterns
    const urgencyPatterns = ['urgent', 'immediately', 'asap', 'now', 'hurry'];
    const credentialPatterns = ['password', 'login', 'credentials', 'account', 'verify'];
    const paymentPatterns = ['payment', 'transfer', 'wire', 'send money', 'bitcoin', 'crypto'];

    let urgencyScore = 0;
    let credentialScore = 0;
    let paymentScore = 0;

    for (const pattern of urgencyPatterns) {
      if (textLower.includes(pattern)) urgencyScore += 0.2;
    }
    for (const pattern of credentialPatterns) {
      if (textLower.includes(pattern)) credentialScore += 0.3;
    }
    for (const pattern of paymentPatterns) {
      if (textLower.includes(pattern)) paymentScore += 0.3;
    }

    // Combine scores (urgency + credential/payment is more suspicious)
    // Cap individual scores at 1.0, then combine with weighted sum
    urgencyScore = Math.min(urgencyScore, 1.0);
    credentialScore = Math.min(credentialScore, 1.0);
    paymentScore = Math.min(paymentScore, 1.0);
    
    // Weighted combination: urgency amplifies other patterns
    const combinedScore = Math.max(
      urgencyScore + credentialScore * 0.7, // Urgency + credentials
      urgencyScore + paymentScore * 0.7,   // Urgency + payment
      credentialScore + paymentScore,       // Credentials + payment
      urgencyScore * 1.5,                   // High urgency alone
      credentialScore * 1.2,                // High credential requests alone
      paymentScore * 1.2                   // High payment demands alone
    );

    const socialEngineeringScore = Math.min(combinedScore, 1.0);

    if (socialEngineeringScore >= 0.6) {
      const patterns: string[] = [];
      if (urgencyScore > 0) patterns.push('urgency_language');
      if (credentialScore > 0) patterns.push('credential_requests');
      if (paymentScore > 0) patterns.push('payment_demands');
      
      return {
        detected: true,
        rule: 'social_engineering_patterns',
        confidence: socialEngineeringScore,
        patterns,
        action: socialEngineeringScore >= 0.85 ? 'auto_warn' : 'flag_for_review',
      };
    }

    // Message frequency anomaly
    const timeSinceLastActivity = Date.now() - new Date(state.lastActivity).getTime();
    const messagesPerMinute = state.messageCount / (timeSinceLastActivity / 60000 + 1);

    if (messagesPerMinute > 10) {
      return {
        detected: true,
        rule: 'message_frequency_anomaly',
        confidence: 0.75,
        patterns: ['rapid_message_burst'],
        action: 'flag_for_review',
      };
    }

    // Message deletion spike
    if (message.isDeleted && state.manipulationCount > 0) {
      return {
        detected: true,
        rule: 'message_frequency_anomaly',
        confidence: 0.8,
        patterns: ['message_deletion_spikes'],
        action: 'flag_for_review',
      };
    }

    return {
      detected: false,
      rule: '',
      confidence: 0,
      patterns: [],
      action: '',
    };
  }

  /**
   * Execute action based on detection
   */
  private async executeAction(
    detection: ManipulationDetection,
    chatId: string,
    userId: string,
    message: { messageId: string; text?: string }
  ): Promise<void> {
    switch (detection.action) {
      case 'capture_immediately':
        // Trigger capture (will be handled by capture.ts)
        await this.kv.put(`capture:${message.messageId}`, JSON.stringify({
          chatId,
          userId,
          messageId: message.messageId,
          reason: detection.rule,
          timestamp: new Date().toISOString(),
        }));
        break;

      case 'auto_warn':
        // Store warning
        await this.kv.put(`warning:${chatId}:${userId}`, JSON.stringify({
          rule: detection.rule,
          confidence: detection.confidence,
          timestamp: new Date().toISOString(),
        }));
        break;

      case 'flag_for_review':
        // Flag for review
        await this.kv.put(`review:${chatId}:${userId}`, JSON.stringify({
          rule: detection.rule,
          confidence: detection.confidence,
          timestamp: new Date().toISOString(),
        }));
        break;
    }
  }

  /**
   * Get Guard Dog state
   */
  async getState(chatId: string, userId: string): Promise<GuardDogState | null> {
    const stateData = await this.kv.get(`guard:${chatId}:${userId}`);
    if (!stateData) {
      return null;
    }
    return JSON.parse(stateData) as GuardDogState;
  }

  /**
   * Get threat score
   */
  async getThreatScore(chatId: string, userId: string): Promise<number> {
    const state = await this.getState(chatId, userId);
    return state?.threatScore || 0;
  }
}


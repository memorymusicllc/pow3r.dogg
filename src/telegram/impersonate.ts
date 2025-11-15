/**
 * Telegram Victim Impersonation Bot
 * 
 * Perfect user cloning with style mirroring, emotional mirroring, and time waste strategies
 */

import type { Env } from '../types';
import { TelegramStealth } from './stealth';
import { TelegramAbiNotifier } from './abi-notify';
import { LanguageProfiler } from '../attribution/language';

export interface ImpersonationState {
  chatId: string;
  attackerId: string;
  victimId: string;
  enabled: boolean;
  startTime: string;
  messageCount: number;
  timeWasted: number; // seconds
  styleProfile: StyleProfile;
}

export interface StyleProfile {
  averageResponseTime: number;
  emojiUsage: string[];
  punctuationStyle: string;
  commonPhrases: string[];
  languageProfile?: any;
}

export interface ImpersonationResponse {
  text: string;
  delay: number; // milliseconds
  shouldContinue: boolean;
}

export class ImpersonationBot {
  private env: Env;
  private kv: KVNamespace;
  private vectors: VectorizeIndex | null;
  private stealth: TelegramStealth;
  private abiNotifier: TelegramAbiNotifier;
  private languageProfiler: LanguageProfiler;

  constructor(env: Env) {
    this.env = env;
    this.kv = env.TELEGRAM_STATE;
    this.vectors = env.DEFENDER_VECTORS || null; // Graceful if unavailable
    this.stealth = new TelegramStealth({
      readReceiptDelays: { minSeconds: 5, maxSeconds: 30, distribution: 'normal' },
      typingIndicators: { enabled: true, pattern: 'human_like', variation: 0.3, minChars: 3, maxChars: 50 },
      onlineStatus: { guardDog: 'offline', impersonation: 'online', switching: 'automatic' },
      messageTiming: { responseDelayMin: 10, responseDelayMax: 300, urgencyModifier: 0.5, naturalVariation: true },
    });
    this.abiNotifier = new TelegramAbiNotifier(env);
    this.languageProfiler = new LanguageProfiler();
  }

  /**
   * Enable impersonation for a chat
   */
  async enable(
    chatId: string,
    attackerId: string,
    victimId: string,
    styleData?: Record<string, unknown>
  ): Promise<ImpersonationState> {
    // Analyze style from historical data or provided styleData
    const styleProfile = await this.analyzeStyle(victimId, styleData);

    const state: ImpersonationState = {
      chatId,
      attackerId,
      victimId,
      enabled: true,
      startTime: new Date().toISOString(),
      messageCount: 0,
      timeWasted: 0,
      styleProfile,
    };

    await this.kv.put(`impersonate:${chatId}:${attackerId}`, JSON.stringify(state));

    // Notify Abi (graceful failure)
    try {
      await this.abiNotifier.notifyImpersonationStarted(
        `investigation:${attackerId}`,
        attackerId,
        chatId,
        victimId
      );
    } catch (error) {
      console.warn('Abi notification failed (non-critical):', error);
    }

    return state;
  }

  /**
   * Generate response to attacker message
   */
  async generateResponse(
    chatId: string,
    attackerId: string,
    message: {
      text: string;
      messageId: string;
      timestamp: number;
    }
  ): Promise<ImpersonationResponse> {
    const state = await this.getState(chatId, attackerId);
    if (!state || !state.enabled) {
      throw new Error('Impersonation not enabled for this chat');
    }

    state.messageCount++;
    const timeSinceStart = (Date.now() - new Date(state.startTime).getTime()) / 1000;
    state.timeWasted = timeSinceStart;

    // Analyze attacker message for emotion and intent
    const attackerProfile = await this.languageProfiler.analyzeText(message.text);

    // Generate response using time waste strategy
    const strategy = this.selectTimeWasteStrategy(state);
    const response = await this.generateResponseWithStrategy(
      message.text,
      state.styleProfile,
      strategy,
      attackerProfile
    );

    // Calculate delay based on urgency and strategy
    const urgency = this.detectUrgency(message.text);
    const delay = this.stealth.calculateResponseDelay(urgency);

    // Update state
    await this.kv.put(`impersonate:${chatId}:${attackerId}`, JSON.stringify(state));

    return {
      text: response,
      delay,
      shouldContinue: timeSinceStart < 48 * 3600, // Continue for up to 48 hours
    };
  }

  /**
   * Analyze victim style
   */
  private async analyzeStyle(
    victimId: string,
    styleData?: Record<string, unknown>
  ): Promise<StyleProfile> {
    // Try to load from Vectorize (graceful fallback to KV)
    let styleProfile: StyleProfile | null = null;

    if (this.vectors && !styleData) {
      try {
        // Query Vectorize for style embeddings
        // For now, use default profile
      } catch (error) {
        console.warn('Vectorize query failed, using KV fallback:', error);
      }
    }

    // Fallback to KV or default
    if (!styleProfile) {
      const kvData = await this.kv.get(`style:${victimId}`);
      if (kvData) {
        styleProfile = JSON.parse(kvData) as StyleProfile;
      } else if (styleData) {
        styleProfile = {
          averageResponseTime: (styleData.averageResponseTime as number) || 60,
          emojiUsage: (styleData.emojiUsage as string[]) || [],
          punctuationStyle: (styleData.punctuationStyle as string) || 'standard',
          commonPhrases: (styleData.commonPhrases as string[]) || [],
        };
      } else {
        // Default profile
        styleProfile = {
          averageResponseTime: 60,
          emojiUsage: [],
          punctuationStyle: 'standard',
          commonPhrases: [],
        };
      }
    }

    return styleProfile;
  }

  /**
   * Select time waste strategy
   */
  private selectTimeWasteStrategy(state: ImpersonationState): string {
    const hoursWasted = state.timeWasted / 3600;

    if (hoursWasted < 2) {
      return 'extended_questions';
    } else if (hoursWasted < 4) {
      return 'document_review';
    } else if (hoursWasted < 8) {
      return 'consultation_delay';
    } else if (hoursWasted < 12) {
      return 'technical_issues';
    } else {
      return 'payment_processing';
    }
  }

  /**
   * Generate response with strategy
   */
  private async generateResponseWithStrategy(
    attackerMessage: string,
    styleProfile: StyleProfile,
    strategy: string,
    attackerProfile: any
  ): Promise<string> {
    // In production, this would use Claude 3.7 Sonnet via MCP
    // For now, generate template responses

    switch (strategy) {
      case 'extended_questions':
        return this.generateExtendedQuestion(attackerMessage, styleProfile);

      case 'document_review':
        return 'I need to review the documents you sent. Let me check them carefully and get back to you.';

      case 'consultation_delay':
        return 'I need to consult with my family/advisor about this. Can you give me some time to think it over?';

      case 'technical_issues':
        return 'Sorry, I\'m having some technical issues with my phone. Can we continue this later?';

      case 'payment_processing':
        return 'I\'m working on the payment, but my bank is having issues processing it. I\'ll try again tomorrow.';

      default:
        return 'Let me think about this and get back to you.';
    }
  }

  /**
   * Generate extended question
   */
  private generateExtendedQuestion(message: string, styleProfile: StyleProfile): string {
    const questions = [
      'Can you provide more details about that?',
      'I want to make sure I understand correctly - can you clarify?',
      'Before I proceed, I have a few questions...',
      'Can you explain that in more detail?',
    ];

    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Detect urgency in message
   */
  private detectUrgency(text: string): 'low' | 'medium' | 'high' {
    const textLower = text.toLowerCase();
    const urgentWords = ['urgent', 'immediately', 'asap', 'now', 'hurry', 'quickly'];
    
    let urgentCount = 0;
    for (const word of urgentWords) {
      if (textLower.includes(word)) urgentCount++;
    }

    if (urgentCount >= 2) return 'high';
    if (urgentCount >= 1) return 'medium';
    return 'low';
  }

  /**
   * Get impersonation state
   */
  async getState(chatId: string, attackerId: string): Promise<ImpersonationState | null> {
    const stateData = await this.kv.get(`impersonate:${chatId}:${attackerId}`);
    if (!stateData) {
      return null;
    }
    return JSON.parse(stateData) as ImpersonationState;
  }

  /**
   * Disable impersonation
   */
  async disable(chatId: string, attackerId: string): Promise<void> {
    const state = await this.getState(chatId, attackerId);
    if (state) {
      state.enabled = false;
      await this.kv.put(`impersonate:${chatId}:${attackerId}`, JSON.stringify(state));

      // Notify Abi (graceful failure)
      try {
        await this.abiNotifier.notifyImpersonationEnded(
          `investigation:${attackerId}`,
          attackerId,
          state.timeWasted,
          state.timeWasted
        );
      } catch (error) {
        console.warn('Abi notification failed (non-critical):', error);
      }
    }
  }
}


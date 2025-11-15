/**
 * Telegram Stealth Features
 * 
 * Implements stealth measures for Telegram operations:
 * - Message read receipt delays
 * - Typing indicator simulation
 * - Online status masking
 * - Message deletion timing
 * - Profile photo caching
 */

export interface StealthConfig {
  readReceiptDelays: {
    minSeconds: number;
    maxSeconds: number;
    distribution: 'normal' | 'uniform' | 'exponential';
  };
  typingIndicators: {
    enabled: boolean;
    pattern: 'human_like' | 'fast' | 'slow';
    variation: number; // 0-1
    minChars: number;
    maxChars: number;
  };
  onlineStatus: {
    guardDog: 'online' | 'offline' | 'last_seen';
    impersonation: 'online' | 'offline' | 'last_seen';
    switching: 'automatic' | 'manual';
  };
  messageTiming: {
    responseDelayMin: number; // seconds
    responseDelayMax: number; // seconds
    urgencyModifier: number; // 0-1, multiplies delay
    naturalVariation: boolean;
  };
}

export class TelegramStealth {
  private config: StealthConfig;
  private profilePhotoCache: Map<string, { photo: string; timestamp: number }> = new Map();

  constructor(config: StealthConfig) {
    this.config = config;
  }

  /**
   * Calculate read receipt delay
   */
  calculateReadReceiptDelay(): number {
    const { minSeconds, maxSeconds, distribution } = this.config.readReceiptDelays;

    switch (distribution) {
      case 'normal': {
        // Normal distribution centered between min and max
        const mean = (minSeconds + maxSeconds) / 2;
        const stdDev = (maxSeconds - minSeconds) / 4;
        let value: number;
        do {
          // Box-Muller transform for normal distribution
          const u1 = Math.random();
          const u2 = Math.random();
          const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          value = mean + z0 * stdDev;
        } while (value < minSeconds || value > maxSeconds);
        return Math.round(value * 1000); // Convert to milliseconds
      }
      case 'exponential': {
        const lambda = 1 / ((minSeconds + maxSeconds) / 2);
        const value = -Math.log(1 - Math.random()) / lambda;
        return Math.round(Math.max(minSeconds, Math.min(maxSeconds, value)) * 1000);
      }
      case 'uniform':
      default:
        return Math.round((minSeconds + Math.random() * (maxSeconds - minSeconds)) * 1000);
    }
  }

  /**
   * Simulate typing indicator
   */
  async simulateTyping(message: string, onTyping: () => Promise<void>): Promise<void> {
    if (!this.config.typingIndicators.enabled) {
      return;
    }

    const { pattern, variation, minChars, maxChars } = this.config.typingIndicators;
    const messageLength = message.length;
    const charsPerTyping = Math.floor(minChars + Math.random() * (maxChars - minChars));

    // Calculate typing duration based on pattern
    let baseDelay: number;
    switch (pattern) {
      case 'fast':
        baseDelay = 50; // 50ms per character
        break;
      case 'slow':
        baseDelay = 150; // 150ms per character
        break;
      case 'human_like':
      default:
        baseDelay = 80 + Math.random() * 40; // 80-120ms per character
        break;
    }

    // Add variation
    const delay = baseDelay * (1 + (Math.random() - 0.5) * variation * 2);

    // Simulate typing in chunks
    for (let i = 0; i < messageLength; i += charsPerTyping) {
      await onTyping();
      await this.sleep(Math.round(delay * charsPerTyping));
    }
  }

  /**
   * Calculate message response delay
   */
  calculateResponseDelay(urgency: 'low' | 'medium' | 'high' = 'medium'): number {
    const { responseDelayMin, responseDelayMax, urgencyModifier, naturalVariation } =
      this.config.messageTiming;

    // Base delay
    let delay = responseDelayMin + Math.random() * (responseDelayMax - responseDelayMin);

    // Apply urgency modifier
    const urgencyMultipliers = {
      low: 1.5,
      medium: 1.0,
      high: urgencyModifier,
    };
    delay *= urgencyMultipliers[urgency];

    // Add natural variation
    if (naturalVariation) {
      delay *= 0.8 + Math.random() * 0.4; // ±20% variation
    }

    return Math.round(delay * 1000); // Convert to milliseconds
  }

  /**
   * Get online status for mode
   */
  getOnlineStatus(mode: 'guard_dog' | 'impersonation'): 'online' | 'offline' | 'last_seen' {
    if (mode === 'guard_dog') {
      return this.config.onlineStatus.guardDog;
    }
    return this.config.onlineStatus.impersonation;
  }

  /**
   * Cache profile photo
   */
  cacheProfilePhoto(userId: string, photoUrl: string): void {
    this.profilePhotoCache.set(userId, {
      photo: photoUrl,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached profile photo
   */
  getCachedProfilePhoto(userId: string, maxAge: number = 86400000): string | null {
    const cached = this.profilePhotoCache.get(userId);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
      this.profilePhotoCache.delete(userId);
      return null;
    }

    return cached.photo;
  }

  /**
   * Delay message deletion capture to appear natural
   */
  calculateDeletionCaptureDelay(): number {
    // Capture immediately but add small random delay to appear natural
    return Math.round(100 + Math.random() * 200); // 100-300ms
  }

  /**
   * Generate natural typing pattern
   */
  generateTypingPattern(messageLength: number): number[] {
    const pattern: number[] = [];
    let position = 0;

    while (position < messageLength) {
      // Variable chunk sizes (3-8 characters)
      const chunkSize = 3 + Math.floor(Math.random() * 6);
      const actualChunk = Math.min(chunkSize, messageLength - position);

      // Variable delays between chunks (100-500ms)
      const delay = 100 + Math.random() * 400;
      pattern.push(delay);

      position += actualChunk;
    }

    return pattern;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear old cache entries
   */
  clearOldCache(maxAge: number = 86400000): void {
    const now = Date.now();
    for (const [userId, cached] of this.profilePhotoCache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.profilePhotoCache.delete(userId);
      }
    }
  }
}


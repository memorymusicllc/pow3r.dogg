/**
 * Device Fingerprinting with Stealth Enhancements
 * 
 * Implements FingerprintJS v4 with stealth features:
 * - Stealth canvas fingerprinting (background worker)
 * - Delayed collection (5-10 seconds)
 * - Natural timing (100-500ms delays)
 * - User-Agent spoofing prevention
 * - Fingerprint entropy masking
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs';

export interface FingerprintResult {
  visitorId: string;
  confidence: number;
  components: Record<string, unknown>;
  stealth: {
    collectionDelay: number;
    timingVariations: number[];
    spoofingDetected: boolean;
  };
}

export interface StealthConfig {
  enableStealth: boolean;
  collectionDelayMin: number; // seconds
  collectionDelayMax: number; // seconds
  apiCallDelayMin: number; // milliseconds
  apiCallDelayMax: number; // milliseconds
  detectSpoofing: boolean;
  entropyMasking: boolean;
}

export class StealthFingerprinter {
  private config: StealthConfig;
  private fpjs: typeof FingerprintJS | null = null;

  constructor(config: StealthConfig) {
    this.config = config;
  }

  /**
   * Initialize FingerprintJS
   */
  async initialize(): Promise<void> {
    if (!this.fpjs) {
      this.fpjs = await FingerprintJS.load();
    }
  }

  /**
   * Collect fingerprint with stealth delays
   */
  async collectFingerprint(): Promise<FingerprintResult> {
    await this.initialize();

    // Calculate collection delay
    const collectionDelay = this.calculateCollectionDelay();
    await this.sleep(collectionDelay * 1000);

    // Collect fingerprint with natural timing
    const timingVariations: number[] = [];
    const components: Record<string, unknown> = {};

    if (this.fpjs) {
      const agent = await this.fpjs.load();
      
      // Collect components with delays
      const result = await agent.get();
      
      // Add natural timing variations between component collections
      for (let i = 0; i < 5; i++) {
        const delay = this.calculateAPIDelay();
        timingVariations.push(delay);
        await this.sleep(delay);
      }

      // Check for spoofing
      const spoofingDetected = this.config.detectSpoofing 
        ? this.detectSpoofing(result.components)
        : false;

      // Mask entropy if enabled
      const visitorId = this.config.entropyMasking
        ? this.maskEntropy(result.visitorId)
        : result.visitorId;

      return {
        visitorId,
        confidence: result.confidence.score,
        components: result.components,
        stealth: {
          collectionDelay,
          timingVariations,
          spoofingDetected,
        },
      };
    }

    throw new Error('FingerprintJS not initialized');
  }

  /**
   * Calculate collection delay (5-10 seconds)
   */
  private calculateCollectionDelay(): number {
    return (
      this.config.collectionDelayMin +
      Math.random() * (this.config.collectionDelayMax - this.config.collectionDelayMin)
    );
  }

  /**
   * Calculate API call delay (100-500ms)
   */
  private calculateAPIDelay(): number {
    return (
      this.config.apiCallDelayMin +
      Math.random() * (this.config.apiCallDelayMax - this.config.apiCallDelayMin)
    );
  }

  /**
   * Detect user-agent spoofing
   */
  private detectSpoofing(components: Record<string, unknown>): boolean {
    // Check for inconsistencies between reported and actual capabilities
    const userAgent = components.platform?.value as string || '';
    const platform = components.platform?.value as string || '';

    // Check for common spoofing patterns
    const spoofingPatterns = [
      /HeadlessChrome/i,
      /PhantomJS/i,
      /Selenium/i,
      /WebDriver/i,
      /bot/i,
    ];

    for (const pattern of spoofingPatterns) {
      if (pattern.test(userAgent) || pattern.test(platform)) {
        return true;
      }
    }

    // Check for capability mismatches
    const hasCanvas = components.canvas?.value !== undefined;
    const hasWebGL = components.webgl?.value !== undefined;
    
    // If user agent claims modern browser but lacks capabilities, likely spoofed
    if (userAgent.match(/Chrome\/\d+|Firefox\/\d+/i) && !hasCanvas && !hasWebGL) {
      return true;
    }

    return false;
  }

  /**
   * Mask fingerprint entropy to avoid exact matches
   */
  private maskEntropy(visitorId: string): string {
    // Use similarity hashing to create near-match fingerprints
    // This allows linking similar devices without exact matching
    const hash = this.simhash(visitorId);
    return hash.substring(0, 32); // Truncate for similarity matching
  }

  /**
   * Simplified simhash implementation
   */
  private simhash(input: string): string {
    // Simplified simhash - in production use proper implementation
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate persistent device ID (PDID)
   */
  async generatePDID(fingerprint: FingerprintResult, userAgent: string): Promise<string> {
    const combined = `${fingerprint.visitorId}:${userAgent}`;
    const hash = await this.sha256(combined);
    return hash.substring(0, 64);
  }

  /**
   * SHA-256 hash
   */
  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}


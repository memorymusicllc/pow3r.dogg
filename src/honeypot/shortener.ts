/**
 * URL Shortening Service with Stealth Tracking
 * 
 * Generates harmless-looking short URLs with non-detectable tracking
 */

import type { Env } from '../types';
import { TrackingRedirectGenerator } from './redirect';
import { CovertTracker } from './tracking';

export interface ShortenedURL {
  id: string;
  shortCode: string;
  originalUrl: string;
  trackingId: string;
  shortUrl: string;
  qrCodeUrl?: string;
  createdAt: number;
  expiresAt?: number;
  clickCount: number;
  clickLimit?: number;
  creatorId?: string;
}

export interface ShortenOptions {
  customDomain?: string;
  customCode?: string;
  expiresIn?: number; // seconds
  clickLimit?: number;
  generateQR?: boolean;
  intermediateDomains?: string[];
  creatorId?: string;
}

export class URLShortener {
  private env: Env;
  private redirectGenerator: TrackingRedirectGenerator;
  private baseDomain: string;

  constructor(env: Env) {
    this.env = env;
    this.redirectGenerator = new TrackingRedirectGenerator(env);
    // Use custom domain if available, otherwise use worker domain
    if (env.SHORTENER_DOMAIN) {
      this.baseDomain = env.SHORTENER_DOMAIN;
    } else {
      // Try to extract from request context or use default
      this.baseDomain = 'pow3r-defender.workers.dev';
    }
  }

  /**
   * Generate short code
   */
  private generateShortCode(customCode?: string): string {
    if (customCode) {
      // Validate custom code (alphanumeric, 3-20 chars)
      if (!/^[a-zA-Z0-9]{3,20}$/.test(customCode)) {
        throw new Error('Custom code must be 3-20 alphanumeric characters');
      }
      return customCode;
    }

    // Generate random code (6-8 characters)
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 6 + Math.floor(Math.random() * 3); // 6-8 chars
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Shorten URL with tracking
   */
  async shorten(
    originalUrl: string,
    options: ShortenOptions = {}
  ): Promise<ShortenedURL> {
    // Validate URL
    try {
      new URL(originalUrl);
    } catch {
      throw new Error('Invalid URL');
    }

    // Generate tracking redirect first
    const trackingId = crypto.randomUUID();
    const redirect = await this.redirectGenerator.generate(
      originalUrl,
      options.intermediateDomains || [],
      trackingId
    );

    // Generate short code
    const shortCode = this.generateShortCode(options.customCode);

    // Check if code already exists (in production, check database)
    // For now, we'll use KV to check
    const existing = await this.env.CONFIG_STORE.get(`short:${shortCode}`);
    if (existing) {
      if (options.customCode) {
        throw new Error('Custom code already exists');
      }
      // Retry with new code
      return this.shorten(originalUrl, { ...options, customCode: undefined });
    }

    // Build short URL
    const domain = options.customDomain || this.baseDomain;
    const protocol = domain.startsWith('http') ? '' : 'https://';
    const shortUrl = `${protocol}${domain}/s/${shortCode}`;

    // Calculate expiration
    const createdAt = Date.now();
    const expiresAt = options.expiresIn
      ? createdAt + options.expiresIn * 1000
      : undefined;

    // Store in KV (in production, use D1)
    const shortened: ShortenedURL = {
      id: crypto.randomUUID(),
      shortCode,
      originalUrl: redirect.redirectChain.hops[0]?.url || originalUrl,
      trackingId,
      shortUrl,
      createdAt,
      expiresAt,
      clickCount: 0,
      clickLimit: options.clickLimit,
      creatorId: options.creatorId,
    };

    await this.env.CONFIG_STORE.put(
      `short:${shortCode}`,
      JSON.stringify(shortened),
      {
        expirationTtl: expiresAt ? Math.floor((expiresAt - Date.now()) / 1000) : undefined,
      }
    );

    // Generate QR code if requested
    if (options.generateQR) {
      shortened.qrCodeUrl = await this.generateQRCode(shortUrl);
    }

    return shortened;
  }

  /**
   * Resolve short URL and track click
   */
  async resolve(shortCode: string, requestMetadata: {
    ip?: string;
    userAgent?: string;
    referer?: string;
  }): Promise<string | null> {
    // Get from KV
    const data = await this.env.CONFIG_STORE.get(`short:${shortCode}`);
    if (!data) {
      return null;
    }

    const shortened = JSON.parse(data) as ShortenedURL;

    // Check expiration
    if (shortened.expiresAt && Date.now() > shortened.expiresAt) {
      await this.env.CONFIG_STORE.delete(`short:${shortCode}`);
      return null;
    }

    // Check click limit
    if (shortened.clickLimit && shortened.clickCount >= shortened.clickLimit) {
      return null;
    }

    // Increment click count
    shortened.clickCount++;
    await this.env.CONFIG_STORE.put(
      `short:${shortCode}`,
      JSON.stringify(shortened)
    );

    // Record click event for tracking
    await this.recordClick(shortened.trackingId, {
      shortCode,
      ...requestMetadata,
      timestamp: Date.now(),
    });

    // Return the original URL (which is actually the first hop of redirect chain)
    return shortened.originalUrl;
  }

  /**
   * Get analytics for shortened URL
   */
  async getAnalytics(shortCode: string): Promise<{
    clickCount: number;
    clicks: Array<{
      timestamp: number;
      ip?: string;
      userAgent?: string;
      referer?: string;
    }>;
  } | null> {
    const data = await this.env.CONFIG_STORE.get(`short:${shortCode}`);
    if (!data) {
      return null;
    }

    const shortened = JSON.parse(data) as ShortenedURL;

    // Get click history from KV
    const clicksData = await this.env.CONFIG_STORE.get(`short:${shortCode}:clicks`);
    const clicks = clicksData ? JSON.parse(clicksData) as Array<{
      timestamp: number;
      ip?: string;
      userAgent?: string;
      referer?: string;
    }> : [];

    return {
      clickCount: shortened.clickCount,
      clicks,
    };
  }

  /**
   * Record click event
   */
  private async recordClick(
    trackingId: string,
    metadata: {
      shortCode: string;
      ip?: string;
      userAgent?: string;
      referer?: string;
      timestamp: number;
    }
  ): Promise<void> {
    // Store click in KV
    const clicksKey = `short:${metadata.shortCode}:clicks`;
    const existing = await this.env.CONFIG_STORE.get(clicksKey);
    const clicks = existing ? JSON.parse(existing) as typeof metadata[] : [];
    clicks.push(metadata);
    
    // Keep only last 1000 clicks
    if (clicks.length > 1000) {
      clicks.shift();
    }

    await this.env.CONFIG_STORE.put(clicksKey, JSON.stringify(clicks));

    // Also ingest as beacon for attacker tracking
    const tracker = new CovertTracker(trackingId);
    // This would trigger the full tracking pipeline
    // For now, we store the click data
  }

  /**
   * Generate QR code URL
   */
  private async generateQRCode(url: string): Promise<string> {
    // Generate QR code using QR Server API
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }

  /**
   * Delete shortened URL
   */
  async delete(shortCode: string): Promise<boolean> {
    const data = await this.env.CONFIG_STORE.get(`short:${shortCode}`);
    if (!data) {
      return false;
    }

    await this.env.CONFIG_STORE.delete(`short:${shortCode}`);
    await this.env.CONFIG_STORE.delete(`short:${shortCode}:clicks`);
    return true;
  }
}


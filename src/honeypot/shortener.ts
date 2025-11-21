/**
 * URL Shortening Service with Stealth Tracking
 * 
 * Generates harmless-looking short URLs with non-detectable tracking
 * Uses D1 as primary storage with KV fallback
 */

import type { Env } from '../types';
import { TrackingRedirectGenerator } from './redirect';
import { CovertTracker } from './tracking';
import { extractDeviceInfo, extractGeolocation, type DeviceInfo, type GeolocationInfo } from '../utils/device-info';

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
  customDomain?: string;
  tags?: string[];
}

export interface ShortenOptions {
  customDomain?: string;
  customCode?: string;
  expiresIn?: number; // seconds
  clickLimit?: number;
  generateQR?: boolean;
  intermediateDomains?: string[];
  creatorId?: string;
  tags?: string[];
}

export interface LinkClick {
  id: string;
  shortCode: string;
  trackingId: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  country?: string;
  city?: string;
  deviceFingerprint?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface LinkListOptions {
  limit?: number;
  offset?: number;
  creatorId?: string;
  search?: string;
}

export interface LinkListResult {
  links: ShortenedURL[];
  total: number;
  limit: number;
  offset: number;
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
   * Shorten URL with tracking - stores in D1 with KV fallback
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

    // Check if code already exists
    const existing = await this.getLinkByCode(shortCode);
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

    const id = crypto.randomUUID();
    const shortened: ShortenedURL = {
      id,
      shortCode,
      originalUrl: redirect.redirectChain.hops[0]?.url || originalUrl,
      trackingId,
      shortUrl,
      createdAt,
      expiresAt,
      clickCount: 0,
      clickLimit: options.clickLimit,
      creatorId: options.creatorId,
      customDomain: options.customDomain,
      tags: options.tags,
    };

    // Generate QR code if requested
    if (options.generateQR) {
      shortened.qrCodeUrl = await this.generateQRCode(shortUrl);
    }

    // Store in D1 (primary) with KV fallback
    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB
          .prepare(
            'INSERT INTO shortened_urls (id, short_code, original_url, tracking_id, created_at, expires_at, click_count, click_limit, creator_id, custom_domain, tags, qr_code_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            id,
            shortCode,
            shortened.originalUrl,
            trackingId,
            createdAt,
            expiresAt || null,
            0,
            options.clickLimit || null,
            options.creatorId || null,
            options.customDomain || null,
            options.tags ? JSON.stringify(options.tags) : null,
            shortened.qrCodeUrl || null
          )
          .run();
      } else {
        // Fallback to KV
        await this.env.CONFIG_STORE.put(
          `short:${shortCode}`,
          JSON.stringify(shortened),
          {
            expirationTtl: expiresAt ? Math.floor((expiresAt - Date.now()) / 1000) : undefined,
          }
        );
      }
    } catch (error) {
      console.error('Failed to store shortened URL:', error);
      // Still store in KV as fallback
      await this.env.CONFIG_STORE.put(
        `short:${shortCode}`,
        JSON.stringify(shortened),
        {
          expirationTtl: expiresAt ? Math.floor((expiresAt - Date.now()) / 1000) : undefined,
        }
      );
    }

    return shortened;
  }

  /**
   * Get link by short code
   */
  private async getLinkByCode(shortCode: string): Promise<ShortenedURL | null> {
    try {
      if (this.env.DEFENDER_DB) {
        const result = await this.env.DEFENDER_DB
          .prepare('SELECT * FROM shortened_urls WHERE short_code = ?')
          .bind(shortCode)
          .first<{
            id: string;
            short_code: string;
            original_url: string;
            tracking_id: string;
            created_at: number;
            expires_at: number | null;
            click_count: number;
            click_limit: number | null;
            creator_id: string | null;
            custom_domain: string | null;
            tags: string | null;
            qr_code_url: string | null;
          }>();

        if (!result) return null;

        const domain = result.custom_domain || this.baseDomain;
        const protocol = domain.startsWith('http') ? '' : 'https://';
        const shortUrl = `${protocol}${domain}/s/${result.short_code}`;

        return {
          id: result.id,
          shortCode: result.short_code,
          originalUrl: result.original_url,
          trackingId: result.tracking_id,
          shortUrl,
          qrCodeUrl: result.qr_code_url || undefined,
          createdAt: result.created_at,
          expiresAt: result.expires_at || undefined,
          clickCount: result.click_count,
          clickLimit: result.click_limit || undefined,
          creatorId: result.creator_id || undefined,
          customDomain: result.custom_domain || undefined,
          tags: result.tags ? JSON.parse(result.tags) : undefined,
        };
      } else {
        // Fallback to KV
        const data = await this.env.CONFIG_STORE.get(`short:${shortCode}`);
        if (!data) return null;
        return JSON.parse(data) as ShortenedURL;
      }
    } catch (error) {
      console.error('Failed to get link:', error);
      // Fallback to KV
      const data = await this.env.CONFIG_STORE.get(`short:${shortCode}`);
      if (!data) return null;
      return JSON.parse(data) as ShortenedURL;
    }
  }

  /**
   * Resolve short URL and track click with enhanced metadata
   */
  async resolve(
    shortCode: string,
    requestMetadata: {
      ip?: string;
      userAgent?: string;
      referer?: string;
      headers?: Headers;
    }
  ): Promise<string | null> {
    const shortened = await this.getLinkByCode(shortCode);
    if (!shortened) {
      return null;
    }

    // Check expiration
    if (shortened.expiresAt && Date.now() > shortened.expiresAt) {
      await this.delete(shortCode);
      return null;
    }

    // Check click limit
    if (shortened.clickLimit && shortened.clickCount >= shortened.clickLimit) {
      return null;
    }

    // Extract enhanced metadata
    const deviceInfo = requestMetadata.userAgent
      ? extractDeviceInfo(requestMetadata.userAgent)
      : undefined;
    const geoInfo = requestMetadata.headers
      ? extractGeolocation(requestMetadata.headers)
      : undefined;

    // Record click with enhanced metadata
    await this.recordClick(shortened.trackingId, {
      shortCode,
      ip: requestMetadata.ip,
      userAgent: requestMetadata.userAgent,
      referer: requestMetadata.referer,
      deviceInfo,
      geoInfo,
      timestamp: Date.now(),
    });

    // Increment click count
    shortened.clickCount++;
    await this.updateLink(shortened);

    // Return the original URL (which is actually the first hop of redirect chain)
    return shortened.originalUrl;
  }

  /**
   * Update link in database
   */
  private async updateLink(link: ShortenedURL): Promise<void> {
    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB
          .prepare(
            'UPDATE shortened_urls SET click_count = ?, qr_code_url = ? WHERE short_code = ?'
          )
          .bind(link.clickCount, link.qrCodeUrl || null, link.shortCode)
          .run();
      } else {
        // Fallback to KV
        await this.env.CONFIG_STORE.put(
          `short:${link.shortCode}`,
          JSON.stringify(link)
        );
      }
    } catch (error) {
      console.error('Failed to update link:', error);
      // Fallback to KV
      await this.env.CONFIG_STORE.put(
        `short:${link.shortCode}`,
        JSON.stringify(link)
      );
    }
  }

  /**
   * Get analytics for shortened URL
   */
  async getAnalytics(shortCode: string, options?: {
    limit?: number;
    offset?: number;
    startDate?: number;
    endDate?: number;
  }): Promise<{
    link: ShortenedURL;
    clickCount: number;
    clicks: LinkClick[];
    total: number;
  } | null> {
    const link = await this.getLinkByCode(shortCode);
    if (!link) {
      return null;
    }

    const clicks = await this.getClicks(shortCode, options);

    return {
      link,
      clickCount: link.clickCount,
      clicks: clicks.clicks,
      total: clicks.total,
    };
  }

  /**
   * Get clicks for a link
   */
  async getClicks(shortCode: string, options?: {
    limit?: number;
    offset?: number;
    startDate?: number;
    endDate?: number;
  }): Promise<{
    clicks: LinkClick[];
    total: number;
  }> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    try {
      if (this.env.DEFENDER_DB) {
        let query = 'SELECT * FROM link_clicks WHERE short_code = ?';
        const params: unknown[] = [shortCode];

        if (options?.startDate) {
          query += ' AND timestamp >= ?';
          params.push(options.startDate);
        }
        if (options?.endDate) {
          query += ' AND timestamp <= ?';
          params.push(options.endDate);
        }

        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const result = await this.env.DEFENDER_DB
          .prepare(query)
          .bind(...params)
          .all<{
            id: string;
            short_code: string;
            tracking_id: string;
            ip_address: string | null;
            user_agent: string | null;
            referer: string | null;
            country: string | null;
            city: string | null;
            device_fingerprint: string | null;
            timestamp: number;
            metadata: string | null;
          }>();

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM link_clicks WHERE short_code = ?';
        const countParams: unknown[] = [shortCode];
        if (options?.startDate) {
          countQuery += ' AND timestamp >= ?';
          countParams.push(options.startDate);
        }
        if (options?.endDate) {
          countQuery += ' AND timestamp <= ?';
          countParams.push(options.endDate);
        }

        const countResult = await this.env.DEFENDER_DB
          .prepare(countQuery)
          .bind(...countParams)
          .first<{ total: number }>();

        const clicks: LinkClick[] = result.results.map((row) => ({
          id: row.id,
          shortCode: row.short_code,
          trackingId: row.tracking_id,
          ipAddress: row.ip_address || undefined,
          userAgent: row.user_agent || undefined,
          referer: row.referer || undefined,
          country: row.country || undefined,
          city: row.city || undefined,
          deviceFingerprint: row.device_fingerprint || undefined,
          timestamp: row.timestamp,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        }));

        return {
          clicks,
          total: countResult?.total || 0,
        };
      } else {
        // Fallback to KV
        const clicksData = await this.env.CONFIG_STORE.get(`short:${shortCode}:clicks`);
        const allClicks = clicksData
          ? (JSON.parse(clicksData) as LinkClick[])
          : [];

        // Filter by date if provided
        let filtered = allClicks;
        if (options?.startDate) {
          filtered = filtered.filter((c) => c.timestamp >= options.startDate!);
        }
        if (options?.endDate) {
          filtered = filtered.filter((c) => c.timestamp <= options.endDate!);
        }

        // Sort and paginate
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        const clicks = filtered.slice(offset, offset + limit);

        return {
          clicks,
          total: filtered.length,
        };
      }
    } catch (error) {
      console.error('Failed to get clicks:', error);
      return { clicks: [], total: 0 };
    }
  }

  /**
   * Record click event with enhanced metadata
   */
  private async recordClick(
    trackingId: string,
    metadata: {
      shortCode: string;
      ip?: string;
      userAgent?: string;
      referer?: string;
      deviceInfo?: DeviceInfo;
      geoInfo?: GeolocationInfo;
      timestamp: number;
    }
  ): Promise<void> {
    const clickId = crypto.randomUUID();
    const click: LinkClick = {
      id: clickId,
      shortCode: metadata.shortCode,
      trackingId,
      ipAddress: metadata.ip,
      userAgent: metadata.userAgent,
      referer: metadata.referer,
      country: metadata.geoInfo?.country,
      city: metadata.geoInfo?.city,
      deviceFingerprint: metadata.deviceInfo?.deviceFingerprint,
      timestamp: metadata.timestamp,
      metadata: {
        deviceType: metadata.deviceInfo?.deviceType,
        os: metadata.deviceInfo?.os,
        browser: metadata.deviceInfo?.browser,
        region: metadata.geoInfo?.region,
        timezone: metadata.geoInfo?.timezone,
      },
    };

    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB
          .prepare(
            'INSERT INTO link_clicks (id, short_code, tracking_id, ip_address, user_agent, referer, country, city, device_fingerprint, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            clickId,
            metadata.shortCode,
            trackingId,
            metadata.ip || null,
            metadata.userAgent || null,
            metadata.referer || null,
            metadata.geoInfo?.country || null,
            metadata.geoInfo?.city || null,
            metadata.deviceInfo?.deviceFingerprint || null,
            metadata.timestamp,
            JSON.stringify(click.metadata || {})
          )
          .run();
      } else {
        // Fallback to KV
        const clicksKey = `short:${metadata.shortCode}:clicks`;
        const existing = await this.env.CONFIG_STORE.get(clicksKey);
        const clicks = existing
          ? (JSON.parse(existing) as LinkClick[])
          : [];
        clicks.push(click);

        // Keep only last 1000 clicks
        if (clicks.length > 1000) {
          clicks.shift();
        }

        await this.env.CONFIG_STORE.put(clicksKey, JSON.stringify(clicks));
      }
    } catch (error) {
      console.error('Failed to record click:', error);
      // Still try KV fallback
      const clicksKey = `short:${metadata.shortCode}:clicks`;
      const existing = await this.env.CONFIG_STORE.get(clicksKey);
      const clicks = existing ? (JSON.parse(existing) as LinkClick[]) : [];
      clicks.push(click);
      if (clicks.length > 1000) {
        clicks.shift();
      }
      await this.env.CONFIG_STORE.put(clicksKey, JSON.stringify(clicks));
    }

    // Also ingest as beacon for attacker tracking
    const tracker = new CovertTracker(trackingId);
    // This would trigger the full tracking pipeline
  }

  /**
   * List all links with pagination and filtering
   */
  async listLinks(options: LinkListOptions = {}): Promise<LinkListResult> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    try {
      if (this.env.DEFENDER_DB) {
        let query = 'SELECT * FROM shortened_urls WHERE 1=1';
        const params: unknown[] = [];

        if (options.creatorId) {
          query += ' AND creator_id = ?';
          params.push(options.creatorId);
        }

        if (options.search) {
          query += ' AND (short_code LIKE ? OR original_url LIKE ?)';
          const searchTerm = `%${options.search}%`;
          params.push(searchTerm, searchTerm);
        }

        // Get total count
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const countResult = await this.env.DEFENDER_DB
          .prepare(countQuery)
          .bind(...params)
          .first<{ total: number }>();

        // Get paginated results
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const result = await this.env.DEFENDER_DB
          .prepare(query)
          .bind(...params)
          .all<{
            id: string;
            short_code: string;
            original_url: string;
            tracking_id: string;
            created_at: number;
            expires_at: number | null;
            click_count: number;
            click_limit: number | null;
            creator_id: string | null;
            custom_domain: string | null;
            tags: string | null;
            qr_code_url: string | null;
          }>();

        const links: ShortenedURL[] = result.results.map((row) => {
          const domain = row.custom_domain || this.baseDomain;
          const protocol = domain.startsWith('http') ? '' : 'https://';
          const shortUrl = `${protocol}${domain}/s/${row.short_code}`;

          return {
            id: row.id,
            shortCode: row.short_code,
            originalUrl: row.original_url,
            trackingId: row.tracking_id,
            shortUrl,
            qrCodeUrl: row.qr_code_url || undefined,
            createdAt: row.created_at,
            expiresAt: row.expires_at || undefined,
            clickCount: row.click_count,
            clickLimit: row.click_limit || undefined,
            creatorId: row.creator_id || undefined,
            customDomain: row.custom_domain || undefined,
            tags: row.tags ? JSON.parse(row.tags) : undefined,
          };
        });

        return {
          links,
          total: countResult?.total || 0,
          limit,
          offset,
        };
      } else {
        // Fallback to KV - list all keys with prefix
        const list = await this.env.CONFIG_STORE.list({ prefix: 'short:' });
        const allLinks: ShortenedURL[] = [];

        for (const key of list.keys) {
          if (key.name.endsWith(':clicks')) continue; // Skip click data
          const data = await this.env.CONFIG_STORE.get(key.name);
          if (data) {
            const link = JSON.parse(data) as ShortenedURL;
            if (options.creatorId && link.creatorId !== options.creatorId) continue;
            if (options.search) {
              const searchLower = options.search.toLowerCase();
              if (
                !link.shortCode.toLowerCase().includes(searchLower) &&
                !link.originalUrl.toLowerCase().includes(searchLower)
              ) {
                continue;
              }
            }
            allLinks.push(link);
          }
        }

        allLinks.sort((a, b) => b.createdAt - a.createdAt);
        const links = allLinks.slice(offset, offset + limit);

        return {
          links,
          total: allLinks.length,
          limit,
          offset,
        };
      }
    } catch (error) {
      console.error('Failed to list links:', error);
      return { links: [], total: 0, limit, offset };
    }
  }

  /**
   * Get link by short code (public method)
   */
  async getLink(shortCode: string): Promise<ShortenedURL | null> {
    return this.getLinkByCode(shortCode);
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
    try {
      if (this.env.DEFENDER_DB) {
        // Delete clicks first
        await this.env.DEFENDER_DB
          .prepare('DELETE FROM link_clicks WHERE short_code = ?')
          .bind(shortCode)
          .run();

        // Delete link
        const result = await this.env.DEFENDER_DB
          .prepare('DELETE FROM shortened_urls WHERE short_code = ?')
          .bind(shortCode)
          .run();

        return result.success;
      } else {
        // Fallback to KV
        await this.env.CONFIG_STORE.delete(`short:${shortCode}`);
        await this.env.CONFIG_STORE.delete(`short:${shortCode}:clicks`);
        return true;
      }
    } catch (error) {
      console.error('Failed to delete link:', error);
      // Fallback to KV
      await this.env.CONFIG_STORE.delete(`short:${shortCode}`);
      await this.env.CONFIG_STORE.delete(`short:${shortCode}:clicks`);
      return true;
    }
  }
}

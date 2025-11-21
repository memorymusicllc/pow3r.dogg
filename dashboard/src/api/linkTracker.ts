/**
 * Link Tracker API Client
 */

import { apiClient } from './client';

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

export interface LinkListResult {
  links: ShortenedURL[];
  total: number;
  limit: number;
  offset: number;
}

export interface LinkAnalytics {
  link: ShortenedURL;
  clickCount: number;
  clicks: LinkClick[];
  total: number;
}

export interface LinkListOptions {
  limit?: number;
  offset?: number;
  creatorId?: string;
  search?: string;
}

export interface LinkClickOptions {
  limit?: number;
  offset?: number;
  startDate?: number;
  endDate?: number;
}

export const linkTrackerApi = {
  /**
   * List all tracking links
   */
  async listLinks(options: LinkListOptions = {}): Promise<LinkListResult> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.creatorId) params.set('creatorId', options.creatorId);
    if (options.search) params.set('search', options.search);

    const query = params.toString();
    return apiClient.get<{ success: boolean; data: LinkListResult }>(
      `/api/links${query ? `?${query}` : ''}`
    ).then(res => res.data);
  },

  /**
   * Get link by short code
   */
  async getLink(shortCode: string): Promise<ShortenedURL> {
    return apiClient.get<{ success: boolean; data: ShortenedURL }>(
      `/api/links/${shortCode}`
    ).then(res => res.data);
  },

  /**
   * Get link analytics
   */
  async getAnalytics(shortCode: string, options: LinkClickOptions = {}): Promise<LinkAnalytics> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.startDate) params.set('startDate', options.startDate.toString());
    if (options.endDate) params.set('endDate', options.endDate.toString());

    const query = params.toString();
    return apiClient.get<{ success: boolean; data: LinkAnalytics }>(
      `/api/shorten/${shortCode}/analytics${query ? `?${query}` : ''}`
    ).then(res => res.data);
  },

  /**
   * Get clicks for a link
   */
  async getClicks(shortCode: string, options: LinkClickOptions = {}): Promise<{ clicks: LinkClick[]; total: number }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.startDate) params.set('startDate', options.startDate.toString());
    if (options.endDate) params.set('endDate', options.endDate.toString());

    const query = params.toString();
    return apiClient.get<{ success: boolean; data: { clicks: LinkClick[]; total: number } }>(
      `/api/links/${shortCode}/clicks${query ? `?${query}` : ''}`
    ).then(res => res.data);
  },

  /**
   * Create a new tracking link
   */
  async createLink(data: {
    url: string;
    customCode?: string;
    expiresIn?: number;
    clickLimit?: number;
    generateQR?: boolean;
    customDomain?: string;
    intermediateDomains?: string[];
    creatorId?: string;
    tags?: string[];
  }): Promise<ShortenedURL> {
    return apiClient.post<{ success: boolean; data: ShortenedURL }>(
      '/api/shorten',
      data
    ).then(res => res.data);
  },

  /**
   * Delete a link
   */
  async deleteLink(shortCode: string): Promise<void> {
    await apiClient.delete(`/api/links/${shortCode}`);
  },

  /**
   * Export links data
   */
  async exportLinks(options: {
    format?: 'json' | 'csv';
    startDate?: number;
    endDate?: number;
    creatorId?: string;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    if (options.format) params.set('format', options.format);
    if (options.startDate) params.set('startDate', options.startDate.toString());
    if (options.endDate) params.set('endDate', options.endDate.toString());
    if (options.creatorId) params.set('creatorId', options.creatorId);

    const query = params.toString();
    const response = await fetch(`${apiClient['baseUrl']}/api/links/export${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiClient['authToken']}`,
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  },
};



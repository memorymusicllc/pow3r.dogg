/**
 * File Tracker API Client
 */

import { apiClient } from './client';

export interface HoneypotDocument {
  documentId: string;
  format: 'pdf' | 'docx' | 'xlsx';
  content: string;
  trackingPixels: string[];
  downloadUrl: string;
  trackingId: string;
  createdAt?: number;
  expiresAt?: number;
  creatorId?: string;
  contentDescription?: string;
}

export interface FileEvent {
  id: string;
  documentId: string;
  trackingId: string;
  eventType: 'download' | 'view' | 'open';
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  deviceFingerprint?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface FileListResult {
  files: HoneypotDocument[];
  total: number;
  limit: number;
  offset: number;
}

export interface FileAnalytics {
  file: HoneypotDocument;
  downloadCount: number;
  viewCount: number;
  openCount: number;
  events: FileEvent[];
  total: number;
}

export interface FileListOptions {
  limit?: number;
  offset?: number;
  creatorId?: string;
  format?: 'pdf' | 'docx' | 'xlsx';
  search?: string;
}

export interface FileEventOptions {
  limit?: number;
  offset?: number;
  eventType?: 'download' | 'view' | 'open';
  startDate?: number;
  endDate?: number;
}

export const fileTrackerApi = {
  /**
   * List all tracked files
   */
  async listFiles(options: FileListOptions = {}): Promise<FileListResult> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.creatorId) params.set('creatorId', options.creatorId);
    if (options.format) params.set('format', options.format);
    if (options.search) params.set('search', options.search);

    const query = params.toString();
    return apiClient.get<{ success: boolean; data: FileListResult }>(
      `/api/files${query ? `?${query}` : ''}`
    ).then(res => res.data);
  },

  /**
   * Get file by document ID
   */
  async getFile(documentId: string): Promise<HoneypotDocument> {
    return apiClient.get<{ success: boolean; data: HoneypotDocument }>(
      `/api/files/${documentId}`
    ).then(res => res.data);
  },

  /**
   * Get file analytics
   */
  async getAnalytics(documentId: string, options: FileEventOptions = {}): Promise<FileAnalytics> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.eventType) params.set('eventType', options.eventType);
    if (options.startDate) params.set('startDate', options.startDate.toString());
    if (options.endDate) params.set('endDate', options.endDate.toString());

    const query = params.toString();
    return apiClient.get<{ success: boolean; data: FileAnalytics }>(
      `/api/files/${documentId}/analytics${query ? `?${query}` : ''}`
    ).then(res => res.data);
  },

  /**
   * Get events for a file
   */
  async getEvents(documentId: string, options: FileEventOptions = {}): Promise<{ events: FileEvent[]; total: number }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.eventType) params.set('eventType', options.eventType);
    if (options.startDate) params.set('startDate', options.startDate.toString());
    if (options.endDate) params.set('endDate', options.endDate.toString());

    const query = params.toString();
    return apiClient.get<{ success: boolean; data: { events: FileEvent[]; total: number } }>(
      `/api/files/${documentId}/events${query ? `?${query}` : ''}`
    ).then(res => res.data);
  },

  /**
   * Create a new tracked file
   */
  async createFile(data: {
    format: 'pdf' | 'docx' | 'xlsx';
    content: string;
    contentDescription?: string;
    trackingId?: string;
    creatorId?: string;
    expiresIn?: number;
  }): Promise<HoneypotDocument> {
    // Use MCP tool to generate file
    const { mcpClient } = await import('./client');
    const result = await mcpClient.callTool('defender_generate_honeypot_document', {
      format: data.format,
      content: data.content,
      trackingId: data.trackingId,
    });
    
    if (result.isError) {
      throw new Error('Failed to create file');
    }

    const content = (result as any).content || (result as any).data;
    const doc = typeof content === 'string' ? JSON.parse(content) : (Array.isArray(content) ? JSON.parse(content[0]?.text || '{}') : content) as HoneypotDocument;
    return doc;
  },

  /**
   * Delete a file
   */
  async deleteFile(documentId: string): Promise<void> {
    await apiClient.delete(`/api/files/${documentId}`);
  },

  /**
   * Export files data
   */
  async exportFiles(options: {
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
    const response = await fetch(`${(apiClient as any).baseUrl}/api/files/export${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${(apiClient as any).authToken || ''}`,
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  },
};


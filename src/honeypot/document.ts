/**
 * Honeypot Document Generation with Full Tracking
 * 
 * Generates tracking documents (PDF, DOCX, XLSX) with embedded tracking pixels
 * Tracks downloads, views, and opens in D1 database
 */

import type { Env } from '../types';
import { CovertTracker } from './tracking';
import { extractDeviceInfo, extractGeolocation, type DeviceInfo, type GeolocationInfo } from '../utils/device-info';

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

export interface FileListOptions {
  limit?: number;
  offset?: number;
  creatorId?: string;
  format?: 'pdf' | 'docx' | 'xlsx';
  search?: string;
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

export class HoneypotDocumentGenerator {
  private env: Env;
  private r2: R2Bucket;
  private tracker: CovertTracker;

  constructor(env: Env) {
    this.env = env;
    this.r2 = env.EVIDENCE_VAULT;
    this.tracker = new CovertTracker();
  }

  /**
   * Generate honeypot document and store in D1
   */
  async generate(
    format: 'pdf' | 'docx' | 'xlsx',
    content: string,
    options?: {
      trackingId?: string;
      creatorId?: string;
      contentDescription?: string;
      expiresIn?: number; // seconds
    }
  ): Promise<HoneypotDocument> {
    const documentId = crypto.randomUUID();
    const finalTrackingId = options?.trackingId || crypto.randomUUID();
    this.tracker = new CovertTracker(finalTrackingId);

    // Generate tracking pixels
    const trackingPixels = this.generateTrackingPixels(finalTrackingId);

    // Embed tracking in content
    const contentWithTracking = this.embedTracking(content, trackingPixels);

    // Generate document based on format
    let documentData: Uint8Array;
    switch (format) {
      case 'pdf':
        documentData = await this.generatePDF(contentWithTracking, trackingPixels);
        break;
      case 'docx':
        documentData = await this.generateDOCX(contentWithTracking, trackingPixels);
        break;
      case 'xlsx':
        documentData = await this.generateXLSX(contentWithTracking, trackingPixels);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Store in R2
    const r2Key = `honeypot/${documentId}.${format}`;
    const createdAt = Date.now();
    const expiresAt = options?.expiresIn
      ? createdAt + options.expiresIn * 1000
      : undefined;

    await this.r2.put(r2Key, documentData, {
      httpMetadata: {
        contentType: this.getContentType(format),
      },
      customMetadata: {
        documentId,
        trackingId: finalTrackingId,
        format,
        createdAt: createdAt.toString(),
      },
    });

    // Store metadata in D1
    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB
          .prepare(
            'INSERT INTO tracked_files (id, document_id, tracking_id, file_name, file_path, format, content_description, created_at, expires_at, creator_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            documentId,
            documentId,
            finalTrackingId,
            `honeypot.${format}`,
            r2Key,
            format,
            options?.contentDescription || null,
            createdAt,
            expiresAt || null,
            options?.creatorId || null,
            JSON.stringify({ trackingPixels })
          )
          .run();
      }
    } catch (error) {
      console.error('Failed to store file metadata in D1:', error);
      // Continue - file is in R2
    }

    // Generate download URL
    const downloadUrl = `/api/files/${documentId}/download`;

    return {
      documentId,
      format,
      content: contentWithTracking,
      trackingPixels,
      downloadUrl,
      trackingId: finalTrackingId,
      createdAt,
      expiresAt,
      creatorId: options?.creatorId,
      contentDescription: options?.contentDescription,
    };
  }

  /**
   * Track file download
   */
  async trackDownload(
    documentId: string,
    requestMetadata: {
      ip?: string;
      userAgent?: string;
      headers?: Headers;
    }
  ): Promise<void> {
    const file = await this.getFile(documentId);
    if (!file) {
      throw new Error('File not found');
    }

    // Extract enhanced metadata
    const deviceInfo = requestMetadata.userAgent
      ? extractDeviceInfo(requestMetadata.userAgent)
      : undefined;
    const geoInfo = requestMetadata.headers
      ? extractGeolocation(requestMetadata.headers)
      : undefined;

    await this.recordEvent(file.trackingId, {
      documentId,
      eventType: 'download',
      ip: requestMetadata.ip,
      userAgent: requestMetadata.userAgent,
      deviceInfo,
      geoInfo,
      timestamp: Date.now(),
    });
  }

  /**
   * Track file view
   */
  async trackView(
    documentId: string,
    requestMetadata: {
      ip?: string;
      userAgent?: string;
      headers?: Headers;
    }
  ): Promise<void> {
    const file = await this.getFile(documentId);
    if (!file) {
      throw new Error('File not found');
    }

    // Extract enhanced metadata
    const deviceInfo = requestMetadata.userAgent
      ? extractDeviceInfo(requestMetadata.userAgent)
      : undefined;
    const geoInfo = requestMetadata.headers
      ? extractGeolocation(requestMetadata.headers)
      : undefined;

    await this.recordEvent(file.trackingId, {
      documentId,
      eventType: 'view',
      ip: requestMetadata.ip,
      userAgent: requestMetadata.userAgent,
      deviceInfo,
      geoInfo,
      timestamp: Date.now(),
    });
  }

  /**
   * Record file event
   */
  private async recordEvent(
    trackingId: string,
    metadata: {
      documentId: string;
      eventType: 'download' | 'view' | 'open';
      ip?: string;
      userAgent?: string;
      deviceInfo?: DeviceInfo;
      geoInfo?: GeolocationInfo;
      timestamp: number;
    }
  ): Promise<void> {
    const eventId = crypto.randomUUID();
    const event: FileEvent = {
      id: eventId,
      documentId: metadata.documentId,
      trackingId,
      eventType: metadata.eventType,
      ipAddress: metadata.ip,
      userAgent: metadata.userAgent,
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
            'INSERT INTO file_events (id, document_id, tracking_id, event_type, ip_address, user_agent, country, city, device_fingerprint, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            eventId,
            metadata.documentId,
            trackingId,
            metadata.eventType,
            metadata.ip || null,
            metadata.userAgent || null,
            metadata.geoInfo?.country || null,
            metadata.geoInfo?.city || null,
            metadata.deviceInfo?.deviceFingerprint || null,
            metadata.timestamp,
            JSON.stringify(event.metadata || {})
          )
          .run();
      }
    } catch (error) {
      console.error('Failed to record file event:', error);
    }
  }

  /**
   * Get file by document ID
   */
  async getFile(documentId: string): Promise<HoneypotDocument | null> {
    try {
      if (this.env.DEFENDER_DB) {
        const result = await this.env.DEFENDER_DB
          .prepare('SELECT * FROM tracked_files WHERE document_id = ?')
          .bind(documentId)
          .first<{
            id: string;
            document_id: string;
            tracking_id: string;
            file_name: string;
            file_path: string;
            format: string;
            content_description: string | null;
            created_at: number;
            expires_at: number | null;
            creator_id: string | null;
            metadata: string | null;
          }>();

        if (!result) return null;

        // Get file from R2 to extract tracking pixels
        const object = await this.r2.get(result.file_path);
        const metadata = result.metadata ? JSON.parse(result.metadata) : {};
        const trackingPixels = metadata.trackingPixels || [];

        return {
          documentId: result.document_id,
          format: result.format as 'pdf' | 'docx' | 'xlsx',
          content: '', // Would extract from document
          trackingPixels,
          downloadUrl: `/api/files/${result.document_id}/download`,
          trackingId: result.tracking_id,
          createdAt: result.created_at,
          expiresAt: result.expires_at || undefined,
          creatorId: result.creator_id || undefined,
          contentDescription: result.content_description || undefined,
        };
      } else {
        // Fallback: try to get from R2
        return this.getDocument(documentId);
      }
    } catch (error) {
      console.error('Failed to get file:', error);
      return this.getDocument(documentId);
    }
  }

  /**
   * Get document by ID (legacy method, tries R2)
   */
  async getDocument(documentId: string): Promise<HoneypotDocument | null> {
    // Try different formats
    for (const format of ['pdf', 'docx', 'xlsx']) {
      try {
        const object = await this.r2.get(`honeypot/${documentId}.${format}`);
        if (object) {
          const metadata = object.customMetadata || {};
          return {
            documentId,
            format: format as 'pdf' | 'docx' | 'xlsx',
            content: '', // Would extract from document
            trackingPixels: [],
            downloadUrl: `/api/files/${documentId}/download`,
            trackingId: metadata.trackingId || '',
          };
        }
      } catch {
        // Continue to next format
      }
    }

    return null;
  }

  /**
   * Get file analytics
   */
  async getAnalytics(
    documentId: string,
    options?: {
      limit?: number;
      offset?: number;
      eventType?: 'download' | 'view' | 'open';
      startDate?: number;
      endDate?: number;
    }
  ): Promise<FileAnalytics | null> {
    const file = await this.getFile(documentId);
    if (!file) {
      return null;
    }

    const events = await this.getEvents(documentId, options);

    // Count by type
    const downloadCount = events.events.filter((e) => e.eventType === 'download').length;
    const viewCount = events.events.filter((e) => e.eventType === 'view').length;
    const openCount = events.events.filter((e) => e.eventType === 'open').length;

    return {
      file,
      downloadCount,
      viewCount,
      openCount,
      events: events.events,
      total: events.total,
    };
  }

  /**
   * Get events for a file
   */
  async getEvents(
    documentId: string,
    options?: {
      limit?: number;
      offset?: number;
      eventType?: 'download' | 'view' | 'open';
      startDate?: number;
      endDate?: number;
    }
  ): Promise<{
    events: FileEvent[];
    total: number;
  }> {
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    try {
      if (this.env.DEFENDER_DB) {
        let query = 'SELECT * FROM file_events WHERE document_id = ?';
        const params: unknown[] = [documentId];

        if (options?.eventType) {
          query += ' AND event_type = ?';
          params.push(options.eventType);
        }
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
            document_id: string;
            tracking_id: string;
            event_type: string;
            ip_address: string | null;
            user_agent: string | null;
            country: string | null;
            city: string | null;
            device_fingerprint: string | null;
            timestamp: number;
            metadata: string | null;
          }>();

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM file_events WHERE document_id = ?';
        const countParams: unknown[] = [documentId];
        if (options?.eventType) {
          countQuery += ' AND event_type = ?';
          countParams.push(options.eventType);
        }
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

        const events: FileEvent[] = result.results.map((row) => ({
          id: row.id,
          documentId: row.document_id,
          trackingId: row.tracking_id,
          eventType: row.event_type as 'download' | 'view' | 'open',
          ipAddress: row.ip_address || undefined,
          userAgent: row.user_agent || undefined,
          country: row.country || undefined,
          city: row.city || undefined,
          deviceFingerprint: row.device_fingerprint || undefined,
          timestamp: row.timestamp,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        }));

        return {
          events,
          total: countResult?.total || 0,
        };
      } else {
        return { events: [], total: 0 };
      }
    } catch (error) {
      console.error('Failed to get events:', error);
      return { events: [], total: 0 };
    }
  }

  /**
   * List all tracked files
   */
  async listFiles(options: FileListOptions = {}): Promise<FileListResult> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    try {
      if (this.env.DEFENDER_DB) {
        let query = 'SELECT * FROM tracked_files WHERE 1=1';
        const params: unknown[] = [];

        if (options.creatorId) {
          query += ' AND creator_id = ?';
          params.push(options.creatorId);
        }

        if (options.format) {
          query += ' AND format = ?';
          params.push(options.format);
        }

        if (options.search) {
          query += ' AND (file_name LIKE ? OR content_description LIKE ?)';
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
            document_id: string;
            tracking_id: string;
            file_name: string;
            file_path: string;
            format: string;
            content_description: string | null;
            created_at: number;
            expires_at: number | null;
            creator_id: string | null;
            metadata: string | null;
          }>();

        const files: HoneypotDocument[] = result.results.map((row) => {
          const metadata = row.metadata ? JSON.parse(row.metadata) : {};
          return {
            documentId: row.document_id,
            format: row.format as 'pdf' | 'docx' | 'xlsx',
            content: '',
            trackingPixels: metadata.trackingPixels || [],
            downloadUrl: `/api/files/${row.document_id}/download`,
            trackingId: row.tracking_id,
            createdAt: row.created_at,
            expiresAt: row.expires_at || undefined,
            creatorId: row.creator_id || undefined,
            contentDescription: row.content_description || undefined,
          };
        });

        return {
          files,
          total: countResult?.total || 0,
          limit,
          offset,
        };
      } else {
        return { files: [], total: 0, limit, offset };
      }
    } catch (error) {
      console.error('Failed to list files:', error);
      return { files: [], total: 0, limit, offset };
    }
  }

  /**
   * Delete tracked file
   */
  async delete(documentId: string): Promise<boolean> {
    try {
      if (this.env.DEFENDER_DB) {
        // Delete events first
        await this.env.DEFENDER_DB
          .prepare('DELETE FROM file_events WHERE document_id = ?')
          .bind(documentId)
          .run();

        // Get file path before deleting
        const file = await this.getFile(documentId);
        if (file) {
          // Delete from R2
          try {
            await this.r2.delete(`honeypot/${documentId}.${file.format}`);
          } catch (error) {
            console.error('Failed to delete from R2:', error);
          }
        }

        // Delete from D1
        const result = await this.env.DEFENDER_DB
          .prepare('DELETE FROM tracked_files WHERE document_id = ?')
          .bind(documentId)
          .run();

        return result.success;
      } else {
        // Fallback: try to delete from R2
        for (const format of ['pdf', 'docx', 'xlsx']) {
          try {
            await this.r2.delete(`honeypot/${documentId}.${format}`);
            return true;
          } catch {
            // Continue
          }
        }
        return false;
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Generate tracking pixels
   */
  private generateTrackingPixels(trackingId: string): string[] {
    const pixels: string[] = [];
    
    // Generate multiple tracking pixels
    for (let i = 0; i < 3; i++) {
      const pixel = this.tracker.generateTrackingPixel({
        id: trackingId,
        pixel: i.toString(),
        t: Date.now().toString(),
      });
      pixels.push(pixel.url);
    }

    return pixels;
  }

  /**
   * Embed tracking in content
   */
  private embedTracking(content: string, trackingPixels: string[]): string {
    // Embed tracking pixels as HTML comments or metadata
    const trackingHTML = trackingPixels
      .map((pixel) => `<!-- Tracking: ${pixel} -->`)
      .join('\n');

    return `${content}\n\n${trackingHTML}`;
  }

  /**
   * Generate PDF (simplified)
   */
  private async generatePDF(content: string, trackingPixels: string[]): Promise<Uint8Array> {
    // In production, would use a PDF generation library
    // For now, create a simple text-based representation
    const pdfContent = `%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n\n% Content: ${content}\n% Tracking: ${trackingPixels.join(', ')}\n`;
    return new TextEncoder().encode(pdfContent);
  }

  /**
   * Generate DOCX (simplified)
   */
  private async generateDOCX(content: string, trackingPixels: string[]): Promise<Uint8Array> {
    // In production, would use a DOCX generation library
    // For now, create a simple representation
    const docxContent = `<?xml version="1.0"?>\n<document>\n<content>${content}</content>\n<tracking>${trackingPixels.join(', ')}</tracking>\n</document>`;
    return new TextEncoder().encode(docxContent);
  }

  /**
   * Generate XLSX (simplified)
   */
  private async generateXLSX(content: string, trackingPixels: string[]): Promise<Uint8Array> {
    // In production, would use an XLSX generation library
    // For now, create a simple representation
    const xlsxContent = `<?xml version="1.0"?>\n<workbook>\n<sheet>\n<row><cell>${content}</cell></row>\n<row><cell>Tracking: ${trackingPixels.join(', ')}</cell></row>\n</sheet>\n</workbook>`;
    return new TextEncoder().encode(xlsxContent);
  }

  /**
   * Get content type for format
   */
  private getContentType(format: string): string {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/octet-stream';
    }
  }
}

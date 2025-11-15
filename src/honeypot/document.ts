/**
 * Honeypot Document Generation
 * 
 * Generates tracking documents (PDF, DOCX, XLSX) with embedded tracking pixels
 */

import type { Env } from '../types';
import { CovertTracker } from './tracking';

export interface HoneypotDocument {
  documentId: string;
  format: 'pdf' | 'docx' | 'xlsx';
  content: string;
  trackingPixels: string[];
  downloadUrl: string;
  trackingId: string;
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
   * Generate honeypot document
   */
  async generate(
    format: 'pdf' | 'docx' | 'xlsx',
    content: string,
    trackingId?: string
  ): Promise<HoneypotDocument> {
    const documentId = crypto.randomUUID();
    const finalTrackingId = trackingId || crypto.randomUUID();
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
    await this.r2.put(r2Key, documentData, {
      httpMetadata: {
        contentType: this.getContentType(format),
      },
      customMetadata: {
        documentId,
        trackingId: finalTrackingId,
        format,
      },
    });

    // Generate download URL (would be actual URL in production)
    const downloadUrl = `/honeypot/download/${documentId}`;

    return {
      documentId,
      format,
      content: contentWithTracking,
      trackingPixels,
      downloadUrl,
      trackingId: finalTrackingId,
    };
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

  /**
   * Get document by ID
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
            downloadUrl: `/honeypot/download/${documentId}`,
            trackingId: metadata.trackingId || '',
          };
        }
      } catch {
        // Continue to next format
      }
    }

    return null;
  }
}


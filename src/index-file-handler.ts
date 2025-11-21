/**
 * File Tracker Handler
 * 
 * Handles all file tracking endpoints
 */

import type { Env } from './types';
import { HoneypotDocumentGenerator } from './honeypot/document';

export async function handleFiles(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // List all files
  if (url.pathname === '/api/files' && request.method === 'GET') {
    try {
      const generator = new HoneypotDocumentGenerator(env);
      const limit = url.searchParams.get('limit')
        ? parseInt(url.searchParams.get('limit')!)
        : 50;
      const offset = url.searchParams.get('offset')
        ? parseInt(url.searchParams.get('offset')!)
        : 0;
      const creatorId = url.searchParams.get('creatorId') || undefined;
      const format = url.searchParams.get('format') as 'pdf' | 'docx' | 'xlsx' | undefined;
      const search = url.searchParams.get('search') || undefined;

      const result = await generator.listFiles({
        limit,
        offset,
        creatorId,
        format,
        search,
      });

      return jsonResponse({ success: true, data: result }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'List files failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Get file detail
  if (url.pathname.startsWith('/api/files/') && !url.pathname.includes('/events') && !url.pathname.includes('/download') && !url.pathname.includes('/view') && !url.pathname.includes('/export') && request.method === 'GET') {
    try {
      const documentId = url.pathname.split('/api/files/')[1];
      if (!documentId) {
        return jsonResponse({ error: 'Missing document ID' }, corsHeaders, 400);
      }

      const generator = new HoneypotDocumentGenerator(env);
      const file = await generator.getFile(documentId);

      if (!file) {
        return jsonResponse({ error: 'File not found' }, corsHeaders, 404);
      }

      return jsonResponse({ success: true, data: file }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Get file failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Get file events
  if (url.pathname.startsWith('/api/files/') && url.pathname.includes('/events') && request.method === 'GET') {
    try {
      const pathParts = url.pathname.split('/');
      const documentId = pathParts[pathParts.length - 2]; // /api/files/{id}/events
      if (!documentId) {
        return jsonResponse({ error: 'Missing document ID' }, corsHeaders, 400);
      }

      const generator = new HoneypotDocumentGenerator(env);
      const limit = url.searchParams.get('limit')
        ? parseInt(url.searchParams.get('limit')!)
        : 100;
      const offset = url.searchParams.get('offset')
        ? parseInt(url.searchParams.get('offset')!)
        : 0;
      const eventType = url.searchParams.get('eventType') as 'download' | 'view' | 'open' | undefined;
      const startDate = url.searchParams.get('startDate')
        ? parseInt(url.searchParams.get('startDate')!)
        : undefined;
      const endDate = url.searchParams.get('endDate')
        ? parseInt(url.searchParams.get('endDate')!)
        : undefined;

      const events = await generator.getEvents(documentId, {
        limit,
        offset,
        eventType,
        startDate,
        endDate,
      });

      return jsonResponse({ success: true, data: events }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Get events failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Download file (tracks download event)
  if (url.pathname.startsWith('/api/files/') && url.pathname.includes('/download') && request.method === 'GET') {
    try {
      const pathParts = url.pathname.split('/');
      const documentId = pathParts[pathParts.length - 2]; // /api/files/{id}/download
      if (!documentId) {
        return jsonResponse({ error: 'Missing document ID' }, corsHeaders, 400);
      }

      const generator = new HoneypotDocumentGenerator(env);
      const file = await generator.getFile(documentId);

      if (!file) {
        return jsonResponse({ error: 'File not found' }, corsHeaders, 404);
      }

      // Track download
      const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      await generator.trackDownload(documentId, {
        ip: clientIP,
        userAgent,
        headers: request.headers,
      });

      // Get file from R2
      const r2Key = `honeypot/${documentId}.${file.format}`;
      const object = await env.EVIDENCE_VAULT.get(r2Key);

      if (!object) {
        return jsonResponse({ error: 'File not found in storage' }, corsHeaders, 404);
      }

      const fileData = await object.arrayBuffer();
      // Get content type based on format
      let contentType = 'application/octet-stream';
      switch (file.format) {
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
      }

      return new Response(fileData, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${file.contentDescription || `honeypot.${file.format}`}"`,
        },
      });
    } catch (error) {
      return jsonResponse(
        { error: 'Download failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Track file view (returns tracking pixel)
  if (url.pathname.startsWith('/api/files/') && url.pathname.includes('/view') && request.method === 'GET') {
    try {
      const pathParts = url.pathname.split('/');
      const documentId = pathParts[pathParts.length - 2]; // /api/files/{id}/view
      if (!documentId) {
        return jsonResponse({ error: 'Missing document ID' }, corsHeaders, 400);
      }

      const generator = new HoneypotDocumentGenerator(env);
      const file = await generator.getFile(documentId);

      if (!file) {
        return jsonResponse({ error: 'File not found' }, corsHeaders, 404);
      }

      // Track view
      const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      await generator.trackView(documentId, {
        ip: clientIP,
        userAgent,
        headers: request.headers,
      });

      // Return 1x1 transparent pixel
      const pixel = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
        0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x04, 0x01, 0x00, 0x3b,
      ]);

      return new Response(pixel, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (error) {
      return jsonResponse(
        { error: 'View tracking failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Get file analytics
  if (url.pathname.startsWith('/api/files/') && url.pathname.includes('/analytics') && request.method === 'GET') {
    try {
      const pathParts = url.pathname.split('/');
      const documentId = pathParts[pathParts.length - 2]; // /api/files/{id}/analytics
      if (!documentId) {
        return jsonResponse({ error: 'Missing document ID' }, corsHeaders, 400);
      }

      const generator = new HoneypotDocumentGenerator(env);
      const limit = url.searchParams.get('limit')
        ? parseInt(url.searchParams.get('limit')!)
        : 100;
      const offset = url.searchParams.get('offset')
        ? parseInt(url.searchParams.get('offset')!)
        : 0;
      const eventType = url.searchParams.get('eventType') as 'download' | 'view' | 'open' | undefined;
      const startDate = url.searchParams.get('startDate')
        ? parseInt(url.searchParams.get('startDate')!)
        : undefined;
      const endDate = url.searchParams.get('endDate')
        ? parseInt(url.searchParams.get('endDate')!)
        : undefined;

      const analytics = await generator.getAnalytics(documentId, {
        limit,
        offset,
        eventType,
        startDate,
        endDate,
      });

      if (!analytics) {
        return jsonResponse({ error: 'File not found' }, corsHeaders, 404);
      }

      return jsonResponse({ success: true, data: analytics }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Analytics failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Delete file
  if (url.pathname.startsWith('/api/files/') && request.method === 'DELETE') {
    try {
      const documentId = url.pathname.split('/api/files/')[1];
      if (!documentId) {
        return jsonResponse({ error: 'Missing document ID' }, corsHeaders, 400);
      }

      const generator = new HoneypotDocumentGenerator(env);
      const deleted = await generator.delete(documentId);

      if (!deleted) {
        return jsonResponse({ error: 'File not found' }, corsHeaders, 404);
      }

      return jsonResponse({ success: true, message: 'File deleted' }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Delete failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Export files data
  if (url.pathname === '/api/files/export' && request.method === 'GET') {
    try {
      const format = url.searchParams.get('format') || 'json';
      const startDate = url.searchParams.get('startDate')
        ? parseInt(url.searchParams.get('startDate')!)
        : undefined;
      const endDate = url.searchParams.get('endDate')
        ? parseInt(url.searchParams.get('endDate')!)
        : undefined;
      const creatorId = url.searchParams.get('creatorId') || undefined;

      const generator = new HoneypotDocumentGenerator(env);
      const result = await generator.listFiles({
        limit: 10000, // Large limit for export
        offset: 0,
        creatorId,
      });

      // Filter by date if provided
      let files = result.files;
      if (startDate || endDate) {
        files = files.filter((file) => {
          if (!file.createdAt) return false;
          if (startDate && file.createdAt < startDate) return false;
          if (endDate && file.createdAt > endDate) return false;
          return true;
        });
      }

      if (format === 'csv') {
        // Generate CSV
        const headers = ['Document ID', 'Format', 'Description', 'Downloads', 'Views', 'Created', 'Expires', 'Creator ID'];
        const rows = files.map(async (file) => {
          const analytics = await generator.getAnalytics(file.documentId);
          return [
            file.documentId,
            file.format,
            file.contentDescription || '',
            analytics?.downloadCount.toString() || '0',
            analytics?.viewCount.toString() || '0',
            file.createdAt ? new Date(file.createdAt).toISOString() : '',
            file.expiresAt ? new Date(file.expiresAt).toISOString() : '',
            file.creatorId || '',
          ];
        });

        const resolvedRows = await Promise.all(rows);
        const csv = [headers.join(','), ...resolvedRows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

        return new Response(csv, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="files-export-${Date.now()}.csv"`,
          },
        });
      } else {
        // JSON format
        return jsonResponse({ success: true, data: files, total: files.length }, corsHeaders);
      }
    } catch (error) {
      return jsonResponse(
        { error: 'Export failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders });
}

function jsonResponse(data: unknown, headers: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}


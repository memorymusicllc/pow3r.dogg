/**
 * URL Shortening Handler
 */

import type { Env } from './types';
import { URLShortener } from './honeypot/shortener';

export async function handleShorten(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // Shorten URL
  if (url.pathname === '/api/shorten' && request.method === 'POST') {
    try {
      const body = await request.json() as {
        url: string;
        customCode?: string;
        expiresIn?: number;
        clickLimit?: number;
        generateQR?: boolean;
        customDomain?: string;
        intermediateDomains?: string[];
      };

      const shortener = new URLShortener(env);
      const shortened = await shortener.shorten(body.url, {
        customCode: body.customCode,
        expiresIn: body.expiresIn,
        clickLimit: body.clickLimit,
        generateQR: body.generateQR,
        customDomain: body.customDomain,
        intermediateDomains: body.intermediateDomains,
      });

      return jsonResponse({ success: true, data: shortened }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Shortening failed', message: error instanceof Error ? error.message : String(error) },
        corsHeaders,
        400
      );
    }
  }

  // Resolve short URL (redirect)
  if (url.pathname.startsWith('/s/') && request.method === 'GET') {
    try {
      const shortCode = url.pathname.split('/s/')[1]?.split('?')[0];
      if (!shortCode) {
        return new Response('Invalid short code', { status: 404, headers: corsHeaders });
      }

      const shortener = new URLShortener(env);
      const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      const referer = request.headers.get('Referer') || undefined;

      const originalUrl = await shortener.resolve(shortCode, {
        ip: clientIP,
        userAgent,
        referer,
        headers: request.headers,
      });

      if (!originalUrl) {
        return new Response('Short URL not found or expired', { status: 404, headers: corsHeaders });
      }

      // Redirect to original URL
      return Response.redirect(originalUrl, 302);
    } catch (error) {
      return new Response('Redirect failed', { status: 500, headers: corsHeaders });
    }
  }

  // List all links
  if (url.pathname === '/api/links' && request.method === 'GET') {
    try {
      const shortener = new URLShortener(env);
      const limit = url.searchParams.get('limit')
        ? parseInt(url.searchParams.get('limit')!)
        : 50;
      const offset = url.searchParams.get('offset')
        ? parseInt(url.searchParams.get('offset')!)
        : 0;
      const creatorId = url.searchParams.get('creatorId') || undefined;
      const search = url.searchParams.get('search') || undefined;

      const result = await shortener.listLinks({
        limit,
        offset,
        creatorId,
        search,
      });

      return jsonResponse({ success: true, data: result }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'List links failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Get link detail
  if (url.pathname.startsWith('/api/links/') && !url.pathname.includes('/clicks') && !url.pathname.includes('/export') && request.method === 'GET') {
    try {
      const shortCode = url.pathname.split('/api/links/')[1];
      if (!shortCode) {
        return jsonResponse({ error: 'Missing short code' }, corsHeaders, 400);
      }

      const shortener = new URLShortener(env);
      const link = await shortener.getLink(shortCode);

      if (!link) {
        return jsonResponse({ error: 'Link not found' }, corsHeaders, 404);
      }

      return jsonResponse({ success: true, data: link }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Get link failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Get clicks for a link
  if (url.pathname.startsWith('/api/links/') && url.pathname.includes('/clicks') && request.method === 'GET') {
    try {
      const pathParts = url.pathname.split('/');
      const shortCode = pathParts[pathParts.length - 2]; // /api/links/{code}/clicks
      if (!shortCode) {
        return jsonResponse({ error: 'Missing short code' }, corsHeaders, 400);
      }

      const shortener = new URLShortener(env);
      const limit = url.searchParams.get('limit')
        ? parseInt(url.searchParams.get('limit')!)
        : 100;
      const offset = url.searchParams.get('offset')
        ? parseInt(url.searchParams.get('offset')!)
        : 0;
      const startDate = url.searchParams.get('startDate')
        ? parseInt(url.searchParams.get('startDate')!)
        : undefined;
      const endDate = url.searchParams.get('endDate')
        ? parseInt(url.searchParams.get('endDate')!)
        : undefined;

      const clicks = await shortener.getClicks(shortCode, {
        limit,
        offset,
        startDate,
        endDate,
      });

      return jsonResponse({ success: true, data: clicks }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Get clicks failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Get analytics (legacy endpoint, also supports new format)
  if (url.pathname.startsWith('/api/shorten/') && url.pathname.endsWith('/analytics') && request.method === 'GET') {
    try {
      const shortCode = url.pathname.split('/api/shorten/')[1]?.replace('/analytics', '');
      if (!shortCode) {
        return jsonResponse({ error: 'Missing short code' }, corsHeaders, 400);
      }

      const shortener = new URLShortener(env);
      const limit = url.searchParams.get('limit')
        ? parseInt(url.searchParams.get('limit')!)
        : 100;
      const offset = url.searchParams.get('offset')
        ? parseInt(url.searchParams.get('offset')!)
        : 0;
      const startDate = url.searchParams.get('startDate')
        ? parseInt(url.searchParams.get('startDate')!)
        : undefined;
      const endDate = url.searchParams.get('endDate')
        ? parseInt(url.searchParams.get('endDate')!)
        : undefined;

      const analytics = await shortener.getAnalytics(shortCode, {
        limit,
        offset,
        startDate,
        endDate,
      });

      if (!analytics) {
        return jsonResponse({ error: 'Short URL not found' }, corsHeaders, 404);
      }

      return jsonResponse({ success: true, data: analytics }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Analytics retrieval failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Delete link
  if (url.pathname.startsWith('/api/links/') && request.method === 'DELETE') {
    try {
      const shortCode = url.pathname.split('/api/links/')[1];
      if (!shortCode) {
        return jsonResponse({ error: 'Missing short code' }, corsHeaders, 400);
      }

      const shortener = new URLShortener(env);
      const deleted = await shortener.delete(shortCode);

      if (!deleted) {
        return jsonResponse({ error: 'Link not found' }, corsHeaders, 404);
      }

      return jsonResponse({ success: true, message: 'Link deleted' }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Delete failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Export links data
  if (url.pathname === '/api/links/export' && request.method === 'GET') {
    try {
      const format = url.searchParams.get('format') || 'json';
      const startDate = url.searchParams.get('startDate')
        ? parseInt(url.searchParams.get('startDate')!)
        : undefined;
      const endDate = url.searchParams.get('endDate')
        ? parseInt(url.searchParams.get('endDate')!)
        : undefined;
      const creatorId = url.searchParams.get('creatorId') || undefined;

      const shortener = new URLShortener(env);
      const result = await shortener.listLinks({
        limit: 10000, // Large limit for export
        offset: 0,
        creatorId,
      });

      // Filter by date if provided
      let links = result.links;
      if (startDate || endDate) {
        links = links.filter((link) => {
          if (startDate && link.createdAt < startDate) return false;
          if (endDate && link.createdAt > endDate) return false;
          return true;
        });
      }

      if (format === 'csv') {
        // Generate CSV
        const headers = ['Short Code', 'Original URL', 'Short URL', 'Clicks', 'Created', 'Expires', 'Creator ID'];
        const rows = links.map((link) => [
          link.shortCode,
          link.originalUrl,
          link.shortUrl,
          link.clickCount.toString(),
          new Date(link.createdAt).toISOString(),
          link.expiresAt ? new Date(link.expiresAt).toISOString() : '',
          link.creatorId || '',
        ]);

        const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

        return new Response(csv, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="links-export-${Date.now()}.csv"`,
          },
        });
      } else {
        // JSON format
        return jsonResponse({ success: true, data: links, total: links.length }, corsHeaders);
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


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

  // Get analytics
  if (url.pathname.startsWith('/api/shorten/') && url.pathname.endsWith('/analytics') && request.method === 'GET') {
    try {
      const shortCode = url.pathname.split('/api/shorten/')[1]?.replace('/analytics', '');
      if (!shortCode) {
        return jsonResponse({ error: 'Missing short code' }, corsHeaders, 400);
      }

      const shortener = new URLShortener(env);
      const analytics = await shortener.getAnalytics(shortCode);

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


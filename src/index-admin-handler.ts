/**
 * Admin Dashboard API Handler
 * 
 * Endpoints for admin/research manager dashboard
 */

import type { Env } from './types';
import { Pow3rPassAuth } from './auth/pow3r-pass';
import { AttackerDatabase } from './admin/attacker-db';
import { AnalyticsEngine } from './admin/analytics';
import { OSINTInterface } from './admin/osint-interface';
import { EvidenceTimeline } from './admin/evidence-timeline';
import { EmailLookup } from './osint/email-lookup';
import { ImageLookup } from './osint/image-lookup';
import { AddressLookup } from './osint/address-lookup';
import { BusinessLookup } from './osint/business-lookup';
import { FileUploadHandler } from './admin/file-upload';

function jsonResponse(data: unknown, headers: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

export async function handleAdmin(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // Auth endpoints (no auth required for these)
  if (url.pathname === '/admin/auth/kv-token' && request.method === 'GET') {
    try {
      // Get token from KV
      const kvToken = await env.CONFIG_STORE.get('pow3r:auth:token');
      if (kvToken && kvToken.length >= 32) {
        return jsonResponse(
          { success: true, token: kvToken, source: 'kv' },
          corsHeaders
        );
      }
      return jsonResponse(
        { success: false, error: 'No KV token found' },
        corsHeaders,
        404
      );
    } catch (error) {
      return jsonResponse(
        { success: false, error: String(error) },
        corsHeaders,
        500
      );
    }
  }

  if (url.pathname === '/admin/auth/ai-gateway-token' && request.method === 'GET') {
    try {
      // Get token from env (Cloudflare AI Gateway)
      if (env.CLOUDFLARE_AI_TOKEN && env.CLOUDFLARE_AI_TOKEN.length >= 32) {
        return jsonResponse(
          { success: true, token: env.CLOUDFLARE_AI_TOKEN, source: 'ai-gateway' },
          corsHeaders
        );
      }
      return jsonResponse(
        { success: false, error: 'No AI Gateway token configured' },
        corsHeaders,
        404
      );
    } catch (error) {
      return jsonResponse(
        { success: false, error: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Authenticate all other admin endpoints
  const auth = new Pow3rPassAuth(env);
  const authResult = await auth.authenticate(request);
  if (!authResult.authenticated) {
    return jsonResponse(
      { error: 'Unauthorized', message: authResult.error },
      corsHeaders,
      401
    );
  }

  // Attacker Database endpoints
  if (url.pathname.startsWith('/admin/attackers')) {
    const attackerDb = new AttackerDatabase(env);

    // GET /admin/attackers - List attackers
    if (url.pathname === '/admin/attackers' && request.method === 'GET') {
      const params = url.searchParams;
      const query = {
        fingerprint: params.get('fingerprint') || undefined,
        ipAddress: params.get('ipAddress') || undefined,
        phoneNumber: params.get('phoneNumber') || undefined,
        minThreatScore: params.get('minThreatScore') ? parseFloat(params.get('minThreatScore')!) : undefined,
        investigationId: params.get('investigationId') || undefined,
        dateRange: params.get('startDate') && params.get('endDate')
          ? {
              start: parseInt(params.get('startDate')!),
              end: parseInt(params.get('endDate')!),
            }
          : undefined,
        limit: params.get('limit') ? parseInt(params.get('limit')!) : 100,
        offset: params.get('offset') ? parseInt(params.get('offset')!) : 0,
      };

      try {
        const attackers = await attackerDb.queryAttackers(query);
        return jsonResponse({ success: true, attackers }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Query failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // GET /admin/attackers/:id - Get attacker
    if (url.pathname.match(/^\/admin\/attackers\/[^/]+$/) && request.method === 'GET') {
      const id = url.pathname.split('/').pop();
      if (!id) {
        return jsonResponse({ error: 'Missing attacker ID' }, corsHeaders, 400);
      }

      try {
        const attacker = await attackerDb.getAttacker(id);
        if (!attacker) {
          return jsonResponse({ error: 'Attacker not found' }, corsHeaders, 404);
        }
        return jsonResponse({ success: true, attacker }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Get failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // GET /admin/attackers/:id/network - Get attacker network
    if (url.pathname.match(/^\/admin\/attackers\/[^/]+\/network$/) && request.method === 'GET') {
      const id = url.pathname.split('/')[3];
      if (!id) {
        return jsonResponse({ error: 'Missing attacker ID' }, corsHeaders, 400);
      }

      try {
        const network = await attackerDb.getAttackerNetwork(id);
        if (!network) {
          return jsonResponse({ error: 'Attacker not found' }, corsHeaders, 404);
        }
        return jsonResponse({ success: true, network }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Network query failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // GET /admin/attackers/search - Search attackers
    if (url.pathname === '/admin/attackers/search' && request.method === 'GET') {
      const searchText = url.searchParams.get('q');
      if (!searchText) {
        return jsonResponse({ error: 'Missing search query' }, corsHeaders, 400);
      }

      const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 50;

      try {
        const attackers = await attackerDb.searchAttackers(searchText, limit);
        return jsonResponse({ success: true, attackers }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Search failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // GET /admin/attackers/statistics - Get statistics
    if (url.pathname === '/admin/attackers/statistics' && request.method === 'GET') {
      try {
        const stats = await attackerDb.getStatistics();
        return jsonResponse({ success: true, statistics: stats }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Statistics failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // POST /admin/attackers - Create new attacker
    if (url.pathname === '/admin/attackers' && request.method === 'POST') {
      try {
        const body = await request.json() as Partial<AttackerProfile>;
        const attacker = await attackerDb.createAttacker(body);
        return jsonResponse({ success: true, attacker }, corsHeaders, 201);
      } catch (error) {
        return jsonResponse(
          { error: 'Create failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }
  }

  // Analytics endpoints
  if (url.pathname.startsWith('/admin/analytics')) {
    const analytics = new AnalyticsEngine(env);

    // GET /admin/analytics/threat-metrics - Get threat metrics
    if (url.pathname === '/admin/analytics/threat-metrics' && request.method === 'GET') {
      try {
        const metrics = await analytics.getThreatMetrics();
        return jsonResponse({ success: true, metrics }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Metrics failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // GET /admin/analytics/risk-trends - Get risk trends
    if (url.pathname === '/admin/analytics/risk-trends' && request.method === 'GET') {
      const days = url.searchParams.get('days') ? parseInt(url.searchParams.get('days')!) : 30;
      try {
        const trends = await analytics.getRiskTrends(days);
        return jsonResponse({ success: true, trends }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Trends failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // GET /admin/analytics/network-graph - Get network graph
    if (url.pathname === '/admin/analytics/network-graph' && request.method === 'GET') {
      const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100;
      try {
        const graph = await analytics.getAttackerNetworkGraph(limit);
        return jsonResponse({ success: true, graph }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Graph failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // GET /admin/analytics/top-threats - Get top threats
    if (url.pathname === '/admin/analytics/top-threats' && request.method === 'GET') {
      const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 10;
      try {
        const threats = await analytics.getTopThreats(limit);
        return jsonResponse({ success: true, threats }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Top threats failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }
  }

  // OSINT endpoints
  if (url.pathname.startsWith('/admin/osint')) {
    const osint = new OSINTInterface(env);

    // POST /admin/osint/lookup - Deep OSINT lookup
    if (url.pathname === '/admin/osint/lookup' && request.method === 'POST') {
      try {
        const body = await request.json() as { identifier: string; uploadData?: Record<string, unknown> };
        if (!body.identifier) {
          return jsonResponse({ error: 'Missing identifier' }, corsHeaders, 400);
        }

        const result = await osint.deepLookup(body.identifier, body.uploadData);
        return jsonResponse({ success: true, result }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'OSINT lookup failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // POST /admin/osint/email - Email lookup
    if (url.pathname === '/admin/osint/email' && request.method === 'POST') {
      try {
        const body = await request.json() as { email: string };
        if (!body.email) {
          return jsonResponse({ error: 'Missing email' }, corsHeaders, 400);
        }

        const emailLookup = new EmailLookup(env);
        const result = await emailLookup.lookup(body.email);
        return jsonResponse({ success: true, result }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Email lookup failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // POST /admin/osint/image - Image lookup (reverse search + face recognition)
    if (url.pathname === '/admin/osint/image' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const imageFile = formData.get('image') as File | null;
        if (!imageFile) {
          return jsonResponse({ error: 'Missing image file' }, corsHeaders, 400);
        }

        const imageData = await imageFile.arrayBuffer();
        const imageLookup = new ImageLookup(env);
        const result = await imageLookup.lookup(imageData, imageFile.type);
        return jsonResponse({ success: true, result }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Image lookup failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // POST /admin/osint/address - Address lookup
    if (url.pathname === '/admin/osint/address' && request.method === 'POST') {
      try {
        const body = await request.json() as { address: string };
        if (!body.address) {
          return jsonResponse({ error: 'Missing address' }, corsHeaders, 400);
        }

        const addressLookup = new AddressLookup(env);
        const result = await addressLookup.lookup(body.address);
        return jsonResponse({ success: true, result }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Address lookup failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // POST /admin/osint/business - Business lookup
    if (url.pathname === '/admin/osint/business' && request.method === 'POST') {
      try {
        const body = await request.json() as { businessName: string };
        if (!body.businessName) {
          return jsonResponse({ error: 'Missing business name' }, corsHeaders, 400);
        }

        const businessLookup = new BusinessLookup(env);
        const result = await businessLookup.lookup(body.businessName);
        return jsonResponse({ success: true, result }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Business lookup failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }
  }

  // File upload endpoints
  if (url.pathname.startsWith('/admin/files')) {
    const fileUpload = new FileUploadHandler(env);

    // POST /admin/files/upload - Upload Markdown file
    if (url.pathname === '/admin/files/upload' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const attackerId = formData.get('attackerId') as string | null;
        const uploadedBy = formData.get('uploadedBy') as string | null || 'system';

        if (!file) {
          return jsonResponse({ error: 'Missing file' }, corsHeaders, 400);
        }
        if (!attackerId) {
          return jsonResponse({ error: 'Missing attacker ID' }, corsHeaders, 400);
        }

        if (file.type !== 'text/markdown' && !file.name.endsWith('.md')) {
          return jsonResponse({ error: 'File must be Markdown (.md)' }, corsHeaders, 400);
        }

        const fileData = await file.arrayBuffer();
        const result = await fileUpload.uploadFile(fileData, file.name, attackerId, uploadedBy);
        return jsonResponse({ success: true, result }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'File upload failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // GET /admin/files/:attackerId - Get files for attacker
    if (url.pathname.match(/^\/admin\/files\/[^/]+$/) && request.method === 'GET') {
      const attackerId = url.pathname.split('/').pop();
      if (!attackerId) {
        return jsonResponse({ error: 'Missing attacker ID' }, corsHeaders, 400);
      }

      try {
        const files = await fileUpload.getFiles(attackerId);
        return jsonResponse({ success: true, files }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Get files failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }
  }

  // Knowledge graph endpoints
  if (url.pathname.startsWith('/admin/knowledge-graph')) {
    const fileUpload = new FileUploadHandler(env);

    // GET /admin/knowledge-graph/:attackerId - Get knowledge graph data
    if (url.pathname.match(/^\/admin\/knowledge-graph\/[^/]+$/) && request.method === 'GET') {
      const attackerId = url.pathname.split('/').pop();
      if (!attackerId) {
        return jsonResponse({ error: 'Missing attacker ID' }, corsHeaders, 400);
      }

      try {
        const data = await fileUpload.getKnowledgeGraphData(attackerId);
        return jsonResponse({ success: true, data }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Get knowledge graph failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }
  }

  // Evidence Timeline endpoints
  if (url.pathname.startsWith('/admin/evidence')) {
    const timeline = new EvidenceTimeline(env);

    // GET /admin/evidence/timeline - Get evidence timeline
    if (url.pathname === '/admin/evidence/timeline' && request.method === 'GET') {
      const params = url.searchParams;
      const options = {
        investigationId: params.get('investigationId') || undefined,
        attackerId: params.get('attackerId') || undefined,
        startDate: params.get('startDate') ? parseInt(params.get('startDate')!) : undefined,
        endDate: params.get('endDate') ? parseInt(params.get('endDate')!) : undefined,
        limit: params.get('limit') ? parseInt(params.get('limit')!) : 1000,
      };

      try {
        const entries = await timeline.getTimeline(options);
        return jsonResponse({ success: true, entries }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Timeline failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // POST /admin/evidence/report - Generate evidence report
    if (url.pathname === '/admin/evidence/report' && request.method === 'POST') {
      try {
        const body = await request.json() as {
          investigationId?: string;
          attackerId?: string;
          startDate: number;
          endDate: number;
        };

        if (!body.startDate || !body.endDate) {
          return jsonResponse({ error: 'Missing date range' }, corsHeaders, 400);
        }

        const report = await timeline.generateReport(body);
        return jsonResponse({ success: true, report }, corsHeaders);
      } catch (error) {
        return jsonResponse(
          { error: 'Report generation failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }

    // POST /admin/evidence/export - Export timeline
    if (url.pathname === '/admin/evidence/export' && request.method === 'POST') {
      try {
        const body = await request.json() as {
          investigationId?: string;
          attackerId?: string;
          startDate?: number;
          endDate?: number;
          format: 'json' | 'csv' | 'pdf';
        };

        if (!body.format) {
          return jsonResponse({ error: 'Missing format' }, corsHeaders, 400);
        }

        const exportData = await timeline.exportTimelineBundle({
          investigationId: body.investigationId,
          attackerId: body.attackerId,
          startDate: body.startDate,
          endDate: body.endDate,
          format: body.format,
        });

        return new Response(exportData.data, {
          headers: {
            ...corsHeaders,
            'Content-Type': exportData.mimeType,
            'Content-Disposition': `attachment; filename="evidence-timeline.${exportData.format}"`,
          },
        });
      } catch (error) {
        return jsonResponse(
          { error: 'Export failed', message: String(error) },
          corsHeaders,
          500
        );
      }
    }
  }

  return jsonResponse({ error: 'Not Found' }, corsHeaders, 404);
}


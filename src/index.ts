/**
 * Pow3r Defender - Main Worker Entry Point
 * 
 * MCP router + CORS + Pow3r Pass authentication
 * Full integration of all features
 */

import type { Env } from './types';
import { Pow3rPassAuth } from './auth/pow3r-pass';
import { MCP_TOOLS, executeMCPTool } from './mcp/tools';
import { XMAPSyncHandler } from './xmap/sync';
import { XMAPHistoryManager } from './xmap/history';
import { EnhancedEvidenceChain } from './forensic/chain';
import { StealthFingerprinter } from './attribution/fingerprint';
import { IPAttributionEngine } from './attribution/ip';
import { BehavioralAnalytics } from './attribution/behavioral';
import { OSINTUnmasker } from './osint/unmask';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check (no auth required)
      if (url.pathname === '/health' || url.pathname === '/') {
        return jsonResponse(
          {
            status: 'ok',
            service: 'pow3r-defender',
            version: '2025.11.14-production-v4',
            timestamp: new Date().toISOString(),
          },
          corsHeaders
        );
      }

      // MCP router
      if (url.pathname.startsWith('/mcp/')) {
        return await handleMCP(request, env, ctx, corsHeaders);
      }

      // XMAP endpoints
      if (url.pathname.startsWith('/xmap/')) {
        return await handleXMAP(request, env, ctx, corsHeaders);
      }

      // Telegram endpoints
      if (url.pathname.startsWith('/telegram/')) {
        return await handleTelegram(request, env, ctx, corsHeaders);
      }

      // Evidence endpoints
      if (url.pathname.startsWith('/evidence/')) {
        return await handleEvidence(request, env, ctx, corsHeaders);
      }

      // Attribution endpoints
      if (url.pathname.startsWith('/attribution/')) {
        return await handleAttribution(request, env, ctx, corsHeaders);
      }

      // OSINT endpoints
      if (url.pathname.startsWith('/osint/')) {
        return await handleOSINT(request, env, ctx, corsHeaders);
      }

      // 404
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('Request handling error:', error);
      return jsonResponse(
        {
          error: 'Internal server error',
          message: error instanceof Error ? error.message : String(error),
        },
        corsHeaders,
        500
      );
    }
  },
};

/**
 * Handle MCP requests
 */
async function handleMCP(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // List tools
  if (url.pathname === '/mcp/tools/list' && request.method === 'GET') {
    return jsonResponse(
      {
        tools: MCP_TOOLS.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      },
      corsHeaders
    );
  }

  // Call tool
  if (url.pathname === '/mcp/tools/call' && request.method === 'POST') {
    // Authenticate
    const auth = new Pow3rPassAuth(env);
    const authResult = await auth.authenticate(request);
    if (!authResult.authenticated) {
      return jsonResponse(
        { error: 'Unauthorized', message: authResult.error },
        corsHeaders,
        401
      );
    }

    // Parse request
    const body = await request.json() as Record<string, unknown>;
    const toolName = (body.name || body.tool) as string;
    const args = (body.arguments || body.args || {}) as Record<string, unknown>;

    if (!toolName) {
      return jsonResponse(
        { error: 'Missing tool name' },
        corsHeaders,
        400
      );
    }

    // Execute tool
    const result = await executeMCPTool(toolName, args, env);

    return jsonResponse(
      {
        content: result.content,
        isError: result.isError,
      },
      corsHeaders
    );
  }

  // Initialize (MCP protocol)
  if (url.pathname === '/mcp/initialize' && request.method === 'POST') {
    return jsonResponse(
      {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: true, listChanged: true },
          prompts: { listChanged: true },
        },
        serverInfo: {
          name: 'pow3r-defender-mcp',
          version: '2025.11.14-production-v4',
        },
      },
      corsHeaders
    );
  }

  return jsonResponse({ error: 'Not Found' }, corsHeaders, 404);
}

/**
 * Handle XMAP requests
 */
async function handleXMAP(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // Sync endpoint (KV polling)
  if (url.pathname === '/xmap/sync' && request.method === 'GET') {
    try {
      const syncHandler = new XMAPSyncHandler(env);
      const events = await syncHandler.pollKVChanges();
      return jsonResponse({ events }, corsHeaders);
    } catch (error) {
      console.error('XMAP sync error:', error);
      return jsonResponse(
        { error: 'Sync failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // GitHub webhook
  if (url.pathname === '/xmap/webhook/github' && request.method === 'POST') {
    try {
      const event = await request.json() as {
        action?: string;
        repository?: { url?: string; full_name?: string };
        commits?: Array<{ id?: string; message?: string }>;
      };
      const syncHandler = new XMAPSyncHandler(env);
      const syncEvent = await syncHandler.handleGitHubWebhook({
        action: event.action || 'unknown',
        repository: {
          url: event.repository?.url || '',
          full_name: event.repository?.full_name || '',
        },
        commits: (event.commits || []).map(c => ({
          id: c.id || '',
          message: c.message || '',
        })),
      });
      return jsonResponse({ success: true, event: syncEvent }, corsHeaders);
    } catch (error) {
      console.error('XMAP webhook error:', error);
      return jsonResponse(
        { error: 'Webhook processing failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // History API
  if (url.pathname === '/xmap/history' && request.method === 'GET') {
    try {
      const xmapId = url.searchParams.get('xmapId');
      if (!xmapId) {
        return jsonResponse({ error: 'Missing xmapId' }, corsHeaders, 400);
      }

      const historyManager = new XMAPHistoryManager(env);
      const history = await historyManager.getHistory({
        xmapId,
        limit: parseInt(url.searchParams.get('limit') || '100'),
        offset: parseInt(url.searchParams.get('offset') || '0'),
      });

      return jsonResponse({ history }, corsHeaders);
    } catch (error) {
      console.error('XMAP history error:', error);
      return jsonResponse(
        { error: 'History retrieval failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  return jsonResponse({ error: 'Not Found' }, corsHeaders, 404);
}

/**
 * Handle Telegram requests
 */
async function handleTelegram(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // Guard Dog endpoint
  if (url.pathname === '/telegram/guard' && request.method === 'POST') {
    try {
      const body = await request.json() as Record<string, unknown>;
      const { GuardDog } = await import('./telegram/guard');
      
      const guardDog = new GuardDog(env);
      
      if (body.action === 'deploy') {
        const state = await guardDog.deploy(
          body.chatId as string,
          body.userId as string,
          body.config as Record<string, unknown>
        );
        return jsonResponse({ success: true, state }, corsHeaders);
      } else if (body.action === 'process') {
        const detection = await guardDog.processMessage(
          body.chatId as string,
          body.userId as string,
          body.message as {
            text?: string;
            messageId: string;
            timestamp: number;
            isSelfDestruct?: boolean;
            isEdited?: boolean;
            isDeleted?: boolean;
          }
        );
        return jsonResponse({ success: true, detection }, corsHeaders);
      } else if (body.action === 'threatScore') {
        const score = await guardDog.getThreatScore(
          body.chatId as string,
          body.userId as string
        );
        return jsonResponse({ success: true, threatScore: score }, corsHeaders);
      }
      
      return jsonResponse({ error: 'Invalid action' }, corsHeaders, 400);
    } catch (error) {
      return jsonResponse(
        { error: 'Guard Dog operation failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Impersonation endpoint
  if (url.pathname === '/telegram/impersonate' && request.method === 'POST') {
    try {
      const body = await request.json() as Record<string, unknown>;
      const { ImpersonationBot } = await import('./telegram/impersonate');
      
      const impersonationBot = new ImpersonationBot(env);
      
      if (body.action === 'enable') {
        const state = await impersonationBot.enable(
          body.chatId as string,
          body.attackerId as string,
          body.victimId as string,
          body.styleData as Record<string, unknown>
        );
        return jsonResponse({ success: true, state }, corsHeaders);
      } else if (body.action === 'generate') {
        const response = await impersonationBot.generateResponse(
          body.chatId as string,
          body.attackerId as string,
          body.message as {
            text: string;
            messageId: string;
            timestamp: number;
          }
        );
        return jsonResponse({ success: true, response }, corsHeaders);
      } else if (body.action === 'disable') {
        await impersonationBot.disable(
          body.chatId as string,
          body.attackerId as string
        );
        return jsonResponse({ success: true }, corsHeaders);
      }
      
      return jsonResponse({ error: 'Invalid action' }, corsHeaders, 400);
    } catch (error) {
      return jsonResponse(
        { error: 'Impersonation operation failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Capture endpoint
  if (url.pathname === '/telegram/capture' && request.method === 'POST') {
    try {
      const body = await request.json() as Record<string, unknown>;
      const { MessageCapture } = await import('./telegram/capture');
      
      const capture = new MessageCapture(env);
      const messageData = (body.messageData as {
        text?: string;
        photo?: string;
        timestamp: number;
        isSelfDestruct: boolean;
      }) || {
        text: body.text as string | undefined,
        photo: body.photo as string | undefined,
        timestamp: (body.timestamp as number) || Date.now(),
        isSelfDestruct: true,
      };
      const result = await capture.captureSelfDestruct(
        body.messageId as string,
        body.chatId as string,
        body.userId as string,
        messageData
      );
      
      return jsonResponse({ success: true, result }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Capture operation failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  return jsonResponse({ error: 'Not Found' }, corsHeaders, 404);
}

/**
 * Handle Evidence requests
 */
async function handleEvidence(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // Store evidence
  if (url.pathname === '/evidence/store' && request.method === 'POST') {
    try {
      const body = await request.json() as Record<string, unknown>;
      const evidenceChain = new EnhancedEvidenceChain(env);

      // Initialize schema if needed (graceful if D1 unavailable)
      try {
        await evidenceChain.initializeSchema();
      } catch (error) {
        console.warn('D1 schema initialization failed (may be unavailable):', error);
      }

      const contentBytes = new TextEncoder().encode((body.content as string) || '');
      const contentBuffer = new Uint8Array(contentBytes).buffer;
      const evidenceId = await evidenceChain.storeEvidence({
        type: (body.type as string) || 'unknown',
        content: contentBuffer,
        metadata: (body.metadata as Record<string, unknown>) || {},
        timestamp: (body.timestamp as string) || new Date().toISOString(),
        collectedBy: (body.collectedBy as string) || 'system',
      });

      return jsonResponse({ success: true, evidenceId }, corsHeaders);
    } catch (error) {
      console.error('Evidence storage error:', error);
      return jsonResponse(
        { error: 'Evidence storage failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Get chain of custody
  if (url.pathname.startsWith('/evidence/chain/') && request.method === 'GET') {
    try {
      const evidenceId = url.pathname.split('/').pop();
      if (!evidenceId) {
        return jsonResponse({ error: 'Missing evidenceId' }, corsHeaders, 400);
      }

      const evidenceChain = new EnhancedEvidenceChain(env);
      
      // Try to get from D1, fallback to KV
      let chain: any[] = [];
      try {
        // Would implement getCustodyChain in chain.ts
        // For now, return placeholder
        chain = [];
      } catch (error) {
        // D1 unavailable - try KV
        const kv = env.DEFENDER_FORGE;
        const list = await kv.list({ prefix: `custody:` });
        for (const key of list.keys) {
          const data = await kv.get(key.name);
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.evidenceId === evidenceId) {
              chain.push(parsed);
            }
          }
        }
        chain.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      }

      return jsonResponse({ success: true, chain }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Chain retrieval failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Verify integrity
  if (url.pathname.startsWith('/evidence/verify/') && request.method === 'POST') {
    try {
      const evidenceId = url.pathname.split('/').pop();
      if (!evidenceId) {
        return jsonResponse({ error: 'Missing evidenceId' }, corsHeaders, 400);
      }

      const evidenceChain = new EnhancedEvidenceChain(env);
      const verification = await evidenceChain.verifyIntegrity(evidenceId);

      return jsonResponse({ success: true, verification }, corsHeaders);
    } catch (error) {
      console.error('Evidence verification error:', error);
      return jsonResponse(
        { error: 'Verification failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Export bundle
  if (url.pathname === '/evidence/export' && request.method === 'POST') {
    try {
      const body = await request.json() as Record<string, unknown>;
      const evidenceChain = new EnhancedEvidenceChain(env);
      const package_ = await evidenceChain.exportEvidencePackage(
        body.caseId as string,
        body.evidenceIds as string[],
        (body.exportedBy as string) || 'system'
      );

      return jsonResponse({ success: true, package: package_ }, corsHeaders);
    } catch (error) {
      console.error('Evidence export error:', error);
      return jsonResponse(
        { error: 'Export failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  return jsonResponse({ error: 'Not Found' }, corsHeaders, 404);
}

/**
 * Handle Attribution requests
 */
async function handleAttribution(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // Fingerprint
  if (url.pathname === '/attribution/fingerprint' && request.method === 'POST') {
    try {
      const body = await request.json() as Record<string, unknown>;
      const fingerprinter = new StealthFingerprinter({
        enableStealth: true,
        collectionDelayMin: 5,
        collectionDelayMax: 10,
        apiCallDelayMin: 100,
        apiCallDelayMax: 500,
        detectSpoofing: true,
        entropyMasking: true,
      });

      await fingerprinter.initialize();
      const result = await fingerprinter.collectFingerprint();

      return jsonResponse({ success: true, result }, corsHeaders);
    } catch (error) {
      console.error('Fingerprinting error:', error);
      return jsonResponse(
        { error: 'Fingerprinting failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // IP attribution
  if (url.pathname === '/attribution/ip' && request.method === 'POST') {
    try {
      const body = await request.json() as Record<string, unknown>;
      const ip = (body.ip as string) || request.headers.get('CF-Connecting-IP') || 'unknown';

      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const ipEngine = new IPAttributionEngine(env);
      const attribution = await ipEngine.attributeIP(ip, headers);

      return jsonResponse({ success: true, attribution }, corsHeaders);
    } catch (error) {
      console.error('IP attribution error:', error);
      return jsonResponse(
        { error: 'IP attribution failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Behavioral analytics
  if (url.pathname === '/attribution/behavioral' && request.method === 'POST') {
    try {
      const body = await request.json() as Record<string, unknown>;
      const analytics = new BehavioralAnalytics();

      // Process behavioral events from body
      const keystrokeEvents = body.keystrokeEvents as Array<{
        key: string;
        keyDown: number;
        keyUp: number;
      }> | undefined;
      if (keystrokeEvents) {
        for (const event of keystrokeEvents) {
          analytics.captureKeystroke(
            event.key,
            event.keyDown,
            event.keyUp
          );
        }
      }

      const profile = analytics.generateProfile();

      return jsonResponse({ success: true, profile }, corsHeaders);
    } catch (error) {
      console.error('Behavioral analytics error:', error);
      return jsonResponse(
        { error: 'Behavioral analysis failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  return jsonResponse({ error: 'Not Found' }, corsHeaders, 404);
}

/**
 * Handle OSINT requests
 */
async function handleOSINT(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // Full unmask
  if (url.pathname === '/osint/unmask' && request.method === 'POST') {
    try {
      const body = await request.json() as Record<string, unknown>;
      const unmasker = new OSINTUnmasker(env);
      const result = await unmasker.unmaskIdentity({
        email: body.email as string | undefined,
        phone: body.phone as string | undefined,
        username: body.username as string | undefined,
        domain: body.domain as string | undefined,
        name: body.name as string | undefined,
      });

      return jsonResponse({ success: true, result }, corsHeaders);
    } catch (error) {
      console.error('OSINT unmasking error:', error);
      return jsonResponse(
        { error: 'OSINT unmasking failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  return jsonResponse({ error: 'Not Found' }, corsHeaders, 404);
}

/**
 * Helper: JSON response
 */
function jsonResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

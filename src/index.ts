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

      // Dashboard UI - serve from R2 or inline
      if (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/')) {
        try {
          // Try to serve from R2
          const r2Key = url.pathname === '/dashboard' || url.pathname === '/dashboard/'
            ? 'dashboard/index.html'
            : url.pathname.substring(1); // Remove leading /
          
          const object = await env.EVIDENCE_VAULT.get(r2Key);
          if (object) {
            return new Response(await object.text(), {
              headers: {
                ...corsHeaders,
                'Content-Type': object.httpMetadata?.contentType || 'text/html',
              },
            });
          }
        } catch (error) {
          console.warn('Failed to load dashboard from R2:', error);
        }

        // Fallback: serve inline dashboard
        if (url.pathname === '/dashboard' || url.pathname === '/dashboard/') {
          const apiBase = url.origin;
          return new Response(
            `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pow3r Defender Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = { darkMode: 'class' }</script>
  <style>
    body { background: #0a0a0a; color: #e5e5e5; font-family: system-ui, sans-serif; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 1.5rem; max-width: 520px; width: 100%; }
    .btn { background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 500; transition: background 0.2s; }
    .btn:hover { background: #2563eb; }
    .btn-secondary { background: #2a2a2a; }
    .input { background: #0a0a0a; border: 1px solid #2a2a2a; color: #e5e5e5; padding: 0.75rem; border-radius: 8px; width: 100%; }
    .input:focus { outline: none; border-color: #3b82f6; }
    .nav-bottom { position: fixed; bottom: 0; left: 0; right: 0; background: #1a1a1a; border-top: 1px solid #2a2a2a; padding: 0.75rem; display: flex; justify-content: space-around; z-index: 1000; }
    @media (min-width: 1024px) { .nav-bottom { left: 0; top: 0; bottom: 0; width: 80px; flex-direction: column; border-top: none; border-right: 1px solid #2a2a2a; } }
    .nav-item { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.5rem; cursor: pointer; color: #666; text-decoration: none; transition: color 0.2s; }
    .nav-item.active { color: #3b82f6; }
    .nav-item:hover { color: #3b82f6; }
    .nav-item span { font-size: 0.75rem; }
    .content { padding: 1rem; padding-bottom: 100px; }
    @media (min-width: 1024px) { .content { margin-left: 80px; padding-bottom: 1rem; } }
    .page { display: none; }
    .page.active { display: block; }
    .grid { display: grid; gap: 1rem; grid-template-columns: 1fr; }
    @media (min-width: 768px) { .grid { grid-template-columns: repeat(2, 1fr); } }
  </style>
</head>
<body>
  <nav class="nav-bottom">
    <a href="#" class="nav-item active" data-page="dashboard">📊<span>Dashboard</span></a>
    <a href="#" class="nav-item" data-page="tracking">🔗<span>Tracking</span></a>
    <a href="#" class="nav-item" data-page="attackers">👤<span>Attackers</span></a>
    <a href="#" class="nav-item" data-page="investigations">📋<span>Cases</span></a>
  </nav>
  <div class="content">
    <div id="dashboard" class="page active">
      <h1 class="text-2xl font-bold mb-6">Pow3r Defender Dashboard</h1>
      <div class="grid">
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
          <div class="space-y-3">
            <button class="btn w-full" onclick="showPage('tracking')">Create Tracking Link</button>
            <button class="btn btn-secondary w-full" onclick="showPage('attackers')">Add Attacker Info</button>
            <button class="btn btn-secondary w-full" onclick="showPage('investigations')">View Investigations</button>
          </div>
        </div>
        <div class="card">
          <h2 class="text-xl font-semibold mb-4">System Status</h2>
          <div class="space-y-2">
            <div class="flex justify-between"><span>API Status</span><span id="api-status" class="text-green-400">Checking...</span></div>
            <div class="flex justify-between"><span>Active Trackers</span><span id="active-trackers">0</span></div>
            <div class="flex justify-between"><span>Monitored Attackers</span><span id="monitored-attackers">0</span></div>
          </div>
        </div>
      </div>
    </div>
    <div id="tracking" class="page">
      <h1 class="text-2xl font-bold mb-6">Create Tracking Link</h1>
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Generate Honeypot Redirect</h2>
        <form id="tracking-form" class="space-y-4">
          <div><label class="block mb-2 text-sm font-medium">Final URL</label><input type="url" id="final-url" class="input" placeholder="https://example.com" required></div>
          <div><label class="block mb-2 text-sm font-medium">Intermediate Domains (Optional)</label><input type="text" id="intermediate-domains" class="input" placeholder="domain1.com, domain2.com"></div>
          <div><label class="block mb-2 text-sm font-medium">Tracking ID (Optional)</label><input type="text" id="tracking-id" class="input" placeholder="Auto-generated if empty"></div>
          <button type="submit" class="btn w-full">Generate Tracking Link</button>
        </form>
        <div id="tracking-result" class="mt-4 hidden">
          <div class="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
            <h3 class="font-semibold mb-2">Tracking Link Created</h3>
            <div class="space-y-2">
              <div><label class="text-sm text-gray-400">Tracking ID:</label><p class="font-mono text-sm" id="result-tracking-id"></p></div>
              <div class="flex gap-2"><input type="text" id="result-redirect-url" class="input flex-1 font-mono text-sm" readonly><button onclick="copyToClipboard('result-redirect-url')" class="btn">Copy</button></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="attackers" class="page">
      <h1 class="text-2xl font-bold mb-6">Manage Attackers</h1>
      <div class="card mb-4">
        <h2 class="text-xl font-semibold mb-4">Add Attacker Information</h2>
        <form id="attacker-form" class="space-y-4">
          <div><label class="block mb-2 text-sm font-medium">Fingerprint</label><input type="text" id="attacker-fingerprint" class="input" placeholder="Device fingerprint"></div>
          <div><label class="block mb-2 text-sm font-medium">IP Address</label><input type="text" id="attacker-ip" class="input" placeholder="192.168.1.1"></div>
          <div><label class="block mb-2 text-sm font-medium">Phone Number</label><input type="tel" id="attacker-phone" class="input" placeholder="+1234567890"></div>
          <div><label class="block mb-2 text-sm font-medium">User Agent</label><input type="text" id="attacker-useragent" class="input" placeholder="Mozilla/5.0..."></div>
          <div><label class="block mb-2 text-sm font-medium">Additional Metadata (JSON)</label><textarea id="attacker-metadata" class="input" rows="3" placeholder='{"notes": "Suspicious activity"}'></textarea></div>
          <button type="submit" class="btn w-full">Add Attacker</button>
        </form>
      </div>
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Monitored Attackers</h2>
        <div id="attackers-list" class="space-y-3"><p class="text-gray-400 text-center py-8">No attackers monitored yet</p></div>
      </div>
    </div>
    <div id="investigations" class="page">
      <h1 class="text-2xl font-bold mb-6">Investigations</h1>
      <div class="card"><h2 class="text-xl font-semibold mb-4">Active Investigations</h2><div id="investigations-list" class="space-y-3"><p class="text-gray-400 text-center py-8">No active investigations</p></div></div>
    </div>
  </div>
  <script>
    const API_BASE = '${apiBase}';
    let authToken = localStorage.getItem('pow3r_auth_token') || '';
    document.querySelectorAll('.nav-item').forEach(item => { item.addEventListener('click', e => { e.preventDefault(); showPage(item.dataset.page); }); });
    function showPage(pageId) { document.querySelectorAll('.page, .nav-item').forEach(el => el.classList.remove('active')); document.getElementById(pageId).classList.add('active'); document.querySelector(\`[data-page="\${pageId}"]\`).classList.add('active'); }
    async function checkAPIStatus() { try { const res = await fetch(\`\${API_BASE}/health\`); const data = await res.json(); document.getElementById('api-status').textContent = 'Online'; document.getElementById('api-status').className = 'text-green-400'; } catch (error) { document.getElementById('api-status').textContent = 'Offline'; document.getElementById('api-status').className = 'text-red-400'; } }
    document.getElementById('tracking-form').addEventListener('submit', async e => { e.preventDefault(); const finalUrl = document.getElementById('final-url').value; const intermediateDomains = document.getElementById('intermediate-domains').value.split(',').map(d => d.trim()).filter(d => d); const trackingId = document.getElementById('tracking-id').value || undefined; try { const res = await fetch(\`\${API_BASE}/mcp/tools/call\`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${authToken}\` }, body: JSON.stringify({ name: 'defender_generate_tracking_redirect', arguments: { finalUrl, intermediateDomains, trackingId } }) }); const result = await res.json(); if (result.isError) throw new Error(result.content[0].text); const data = JSON.parse(result.content[0].text); document.getElementById('result-tracking-id').textContent = data.trackingId; document.getElementById('result-redirect-url').value = data.redirectChain.hops[0]?.url || finalUrl; document.getElementById('tracking-result').classList.remove('hidden'); } catch (error) { alert('Error: ' + error.message); } });
    document.getElementById('attacker-form').addEventListener('submit', async e => { e.preventDefault(); const fingerprint = document.getElementById('attacker-fingerprint').value; const ip = document.getElementById('attacker-ip').value; const phone = document.getElementById('attacker-phone').value; const userAgent = document.getElementById('attacker-useragent').value; let metadata = {}; try { metadata = JSON.parse(document.getElementById('attacker-metadata').value || '{}'); } catch (e) { alert('Invalid JSON in metadata field'); return; } try { const res = await fetch(\`\${API_BASE}/mcp/tools/call\`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${authToken}\` }, body: JSON.stringify({ name: 'defender_ingest_beacon', arguments: { fingerprint: fingerprint || undefined, ip: ip || undefined, phone: phone || undefined, userAgent: userAgent || undefined, metadata } }) }); const result = await res.json(); if (result.isError) throw new Error(result.content[0].text); alert('Attacker information added successfully!'); document.getElementById('attacker-form').reset(); } catch (error) { alert('Error: ' + error.message); } });
    function copyToClipboard(elementId) { const el = document.getElementById(elementId); el.select(); document.execCommand('copy'); alert('Copied to clipboard!'); }
    checkAPIStatus(); setInterval(checkAPIStatus, 30000);
  </script>
</body>
</html>`,
            {
              headers: {
                ...corsHeaders,
                'Content-Type': 'text/html',
              },
            }
          );
        }
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

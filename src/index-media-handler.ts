/**
 * Media Generation Handler
 * 
 * Handles all media generation API endpoints
 */

import type { Env } from './types';
import { MediaGenerator } from './media/generator';
import { LLMAccountManager } from './media/llm-accounts';
import { ModelPresetManager } from './media/model-presets';
import { initializeDefaultPresets } from './media/default-presets';

export async function handleMedia(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // Initialize default presets on first request
  if (url.pathname === '/api/media/init' && request.method === 'POST') {
    try {
      const presetManager = new ModelPresetManager(env);
      await initializeDefaultPresets(presetManager);
      return jsonResponse({ success: true, message: 'Default presets initialized' }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Initialization failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Generate media
  if (url.pathname === '/api/media/generate' && request.method === 'POST') {
    try {
      const body = await request.json() as {
        mediaType: 'image' | 'video' | 'audio' | 'text' | 'document';
        prompt: string;
        workflowType?: 'simple' | 'adaptive';
        presetId?: string;
        priority?: number;
        maxAttempts?: number;
        parameters?: Record<string, unknown>;
      };

      if (!body.mediaType || !body.prompt) {
        return jsonResponse(
          { error: 'Missing required fields: mediaType, prompt' },
          corsHeaders,
          400
        );
      }

      const generator = new MediaGenerator(env);
      const result = await generator.generate({
        mediaType: body.mediaType,
        prompt: body.prompt,
        workflowType: body.workflowType,
        presetId: body.presetId,
        priority: body.priority,
        maxAttempts: body.maxAttempts,
        parameters: body.parameters,
      });

      return jsonResponse({ success: true, data: result }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Generation failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Get job status
  if (url.pathname.startsWith('/api/media/jobs/') && request.method === 'GET') {
    try {
      const jobId = url.pathname.split('/api/media/jobs/')[1];
      if (!jobId) {
        return jsonResponse({ error: 'Missing job ID' }, corsHeaders, 400);
      }

      const generator = new MediaGenerator(env);
      const job = await generator.getJob(jobId);

      if (!job) {
        return jsonResponse({ error: 'Job not found' }, corsHeaders, 404);
      }

      return jsonResponse({ success: true, data: job }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Get job failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // List jobs
  if (url.pathname === '/api/media/jobs' && request.method === 'GET') {
    try {
      const generator = new MediaGenerator(env);
      const mediaType = url.searchParams.get('mediaType') as 'image' | 'video' | 'audio' | 'text' | 'document' | undefined;
      const status = url.searchParams.get('status') as 'pending' | 'processing' | 'completed' | 'failed' | 'retrying' | undefined;
      const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 50;
      const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : 0;

      const result = await generator.listJobs({
        mediaType,
        status,
        limit,
        offset,
      });

      return jsonResponse({ success: true, data: result }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'List jobs failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // LLM Account Management
  if (url.pathname === '/api/media/accounts' && request.method === 'GET') {
    try {
      const accountManager = new LLMAccountManager(env);
      const provider = url.searchParams.get('provider') as any;
      const accounts = await accountManager.getActiveAccounts(provider);
      return jsonResponse({ success: true, data: accounts }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Get accounts failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  if (url.pathname === '/api/media/accounts' && request.method === 'POST') {
    try {
      const body = await request.json() as {
        provider: string;
        accountName: string;
        apiKey?: string;
        endpointUrl?: string;
        models: string[];
        rateLimitPerMinute?: number;
        rateLimitPerDay?: number;
        costPerToken?: number;
        metadata?: Record<string, unknown>;
      };

      const accountManager = new LLMAccountManager(env);
      const account = await accountManager.createAccount({
        provider: body.provider as 'openai' | 'anthropic' | 'azure' | 'self-hosted' | 'google' | 'cohere',
        accountName: body.accountName,
        apiKey: body.apiKey,
        endpointUrl: body.endpointUrl,
        models: body.models,
        rateLimitPerMinute: body.rateLimitPerMinute,
        rateLimitPerDay: body.rateLimitPerDay,
        costPerToken: body.costPerToken,
        metadata: body.metadata,
      });
      return jsonResponse({ success: true, data: account }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Create account failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Model Preset Management
  if (url.pathname === '/api/media/presets' && request.method === 'GET') {
    try {
      const presetManager = new ModelPresetManager(env);
      const mediaType = url.searchParams.get('mediaType') as any;
      const workflowType = url.searchParams.get('workflowType') as any;
      const presets = await presetManager.getPresets(mediaType, workflowType);
      return jsonResponse({ success: true, data: presets }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Get presets failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  if (url.pathname === '/api/media/presets' && request.method === 'POST') {
    try {
      const body = await request.json() as {
        name: string;
        description?: string;
        mediaType: 'image' | 'video' | 'audio' | 'text' | 'document';
        workflowType: 'simple' | 'adaptive';
        modelConfig: any;
        priority?: number;
        metadata?: Record<string, unknown>;
      };

      const presetManager = new ModelPresetManager(env);
      const preset = await presetManager.createPreset(body);
      return jsonResponse({ success: true, data: preset }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Create preset failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Serve generated media files
  if (url.pathname.startsWith('/api/media/') && request.method === 'GET') {
    try {
      const pathParts = url.pathname.split('/api/media/')[1];
      if (!pathParts || pathParts === 'generate' || pathParts === 'jobs' || pathParts === 'accounts' || pathParts === 'presets' || pathParts === 'init') {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }

      // Get file from R2
      const object = await env.EVIDENCE_VAULT.get(pathParts);
      if (!object) {
        return new Response('File not found', { status: 404, headers: corsHeaders });
      }

      const fileData = await object.arrayBuffer();
      const contentType = object.httpMetadata?.contentType || 'application/octet-stream';

      return new Response(fileData, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } catch (error) {
      return new Response('File retrieval failed', { status: 500, headers: corsHeaders });
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


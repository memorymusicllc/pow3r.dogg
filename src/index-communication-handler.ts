/**
 * Communication Handler
 */

import type { Env } from './types';
import { CommunicationRecorder } from './communication/recorder';
import { ReplySuggestionEngine } from './communication/reply-suggestions';
import { Pow3rPassAuth } from './auth/pow3r-pass';

export async function handleCommunication(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);

  // Authenticate (except for public endpoints)
  const auth = new Pow3rPassAuth(env);
  const authResult = await auth.authenticate(request);
  if (!authResult.authenticated && !url.pathname.includes('/public/')) {
    return jsonResponse(
      { error: 'Unauthorized', message: authResult.error },
      corsHeaders,
      401
    );
  }

  // Record communication
  if (url.pathname === '/api/communication/record' && request.method === 'POST') {
    try {
      const body = await request.json() as {
        channel: 'email' | 'sms' | 'telegram' | 'chat';
        content: string;
        senderIdentifier?: string;
        recipientIdentifier?: string;
        metadata?: Record<string, unknown>;
        investigationId?: string;
      };

      const recorder = new CommunicationRecorder(env);
      const record = await recorder.record(body.channel, body.content, {
        senderIdentifier: body.senderIdentifier,
        recipientIdentifier: body.recipientIdentifier,
        metadata: body.metadata,
        investigationId: body.investigationId,
      });

      return jsonResponse({ success: true, data: record }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Recording failed', message: error instanceof Error ? error.message : String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Get communication record
  if (url.pathname.startsWith('/api/communication/') && url.pathname !== '/api/communication/record' && url.pathname !== '/api/communication/search' && url.pathname !== '/api/communication/suggest-reply' && request.method === 'GET') {
    try {
      const recordId = url.pathname.split('/api/communication/')[1];
      if (!recordId) {
        return jsonResponse({ error: 'Missing record ID' }, corsHeaders, 400);
      }

      const recorder = new CommunicationRecorder(env);
      const record = await recorder.get(recordId);

      if (!record) {
        return jsonResponse({ error: 'Record not found' }, corsHeaders, 404);
      }

      return jsonResponse({ success: true, data: record }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Record retrieval failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Search communications
  if (url.pathname === '/api/communication/search' && request.method === 'POST') {
    try {
      const body = await request.json() as {
        channel?: 'email' | 'sms' | 'telegram' | 'chat';
        senderIdentifier?: string;
        recipientIdentifier?: string;
        investigationId?: string;
        startDate?: number;
        endDate?: number;
        limit?: number;
      };

      const recorder = new CommunicationRecorder(env);
      const records = await recorder.search(body);

      return jsonResponse({ success: true, data: records }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Search failed', message: String(error) },
        corsHeaders,
        500
      );
    }
  }

  // Suggest replies
  if (url.pathname === '/api/communication/suggest-reply' && request.method === 'POST') {
    try {
      const body = await request.json() as {
        threatLevel: 'low' | 'medium' | 'high' | 'critical';
        attackerProfile?: {
          riskScore?: number;
          knownIdentities?: string[];
          communicationHistory?: Array<{
            content: string;
            timestamp: number;
          }>;
        };
        userStyle?: {
          averageResponseTime?: number;
          commonPhrases?: string[];
          formality?: 'formal' | 'casual' | 'mixed';
        };
        goal: 'waste_time' | 'gather_intel' | 'disengage' | 'neutral';
        messageContext: {
          incomingMessage: string;
          conversationHistory?: Array<{
            role: 'user' | 'attacker';
            content: string;
            timestamp: number;
          }>;
        };
      };

      const engine = new ReplySuggestionEngine(env);
      const suggestions = await engine.suggestReplies(body);

      return jsonResponse({ success: true, data: suggestions }, corsHeaders);
    } catch (error) {
      return jsonResponse(
        { error: 'Suggestion generation failed', message: String(error) },
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


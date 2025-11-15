/**
 * Telegram Bot Webhook Handler
 */

import type { Env } from './types';
import { TelegramChatbotHandler, type TelegramUpdate } from './telegram/chatbot/handler';

export async function handleTelegramBot(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as TelegramUpdate;
    const handler = new TelegramChatbotHandler(env);

    // Handle update asynchronously
    ctx.waitUntil(handler.handleUpdate(body));

    // Return 200 immediately (Telegram requires quick response)
    return new Response('OK', {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Telegram bot webhook error:', error);
    return new Response('Error', {
      status: 500,
      headers: corsHeaders,
    });
  }
}


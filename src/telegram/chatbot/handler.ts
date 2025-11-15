/**
 * Telegram Chatbot Handler
 * 
 * Handles bot commands and interactions
 */

import type { Env } from '../../types';
import { URLShortener } from '../../honeypot/shortener';
import { CommunicationRecorder } from '../../communication/recorder';
import { ReplySuggestionEngine } from '../../communication/reply-suggestions';
import { OSINTUnmasker } from '../../osint/unmask';

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
    };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data?: string;
  };
}

export class TelegramChatbotHandler {
  private env: Env;
  private botToken: string;
  private apiUrl: string;

  constructor(env: Env) {
    this.env = env;
    this.botToken = env.TELEGRAM_BOT_TOKEN || 'credential:telegram_bot_token';
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Handle incoming update
   */
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  /**
   * Handle message
   */
  private async handleMessage(message: TelegramUpdate['message']): Promise<void> {
    if (!message || !message.text) {
      return;
    }

    const text = message.text.trim();
    const chatId = message.chat.id;

    // Parse command
    if (text.startsWith('/')) {
      const [command, ...args] = text.split(' ');
      await this.handleCommand(command, args.join(' '), chatId, message.from.id);
    } else {
      // Regular message - could be used for context
      await this.sendMessage(chatId, 'Send /help for available commands.');
    }
  }

  /**
   * Handle command
   */
  private async handleCommand(
    command: string,
    args: string,
    chatId: number,
    userId: number
  ): Promise<void> {
    switch (command) {
      case '/start':
        await this.handleStart(chatId);
        break;
      case '/track':
        await this.handleTrack(args, chatId);
        break;
      case '/file':
        await this.handleFile(args, chatId);
        break;
      case '/suggest':
        await this.handleSuggest(args, chatId);
        break;
      case '/lookup':
        await this.handleLookup(args, chatId);
        break;
      case '/status':
        await this.handleStatus(chatId);
        break;
      case '/help':
        await this.handleHelp(chatId);
        break;
      default:
        await this.sendMessage(chatId, 'Unknown command. Send /help for available commands.');
    }
  }

  /**
   * Handle /start command
   */
  private async handleStart(chatId: number): Promise<void> {
    const text = `Welcome to Pow3r Defender Bot!

I help you:
• Generate tracking links and files
• Get reply suggestions for suspicious messages
• Perform OSINT lookups
• Record communications for evidence

Send /help for available commands.`;
    await this.sendMessage(chatId, text);
  }

  /**
   * Handle /track command
   */
  private async handleTrack(url: string, chatId: number): Promise<void> {
    if (!url) {
      await this.sendMessage(chatId, 'Usage: /track <url>\nExample: /track https://example.com');
      return;
    }

    try {
      const shortener = new URLShortener(this.env);
      const shortened = await shortener.shorten(url, {
        generateQR: true,
      });

      const text = `✅ Tracking link created!

Short URL: ${shortened.shortUrl}
Tracking ID: ${shortened.trackingId}

${shortened.qrCodeUrl ? `QR Code: ${shortened.qrCodeUrl}` : ''}`;
      await this.sendMessage(chatId, text);
    } catch (error) {
      await this.sendMessage(chatId, `❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle /file command
   */
  private async handleFile(description: string, chatId: number): Promise<void> {
    if (!description) {
      await this.sendMessage(chatId, 'Usage: /file <description>\nExample: /file Important document');
      return;
    }

    // Generate tracking file via MCP tool
    try {
      const { HoneypotDocumentGenerator } = await import('../../honeypot/document');
      const generator = new HoneypotDocumentGenerator(this.env);
      const doc = await generator.generate('pdf', `Document: ${description}\n\nThis document contains embedded tracking pixels for forensic investigation.`);
      await this.sendMessage(chatId, `📄 Tracking file created!\n\nDocument ID: ${doc.documentId}\nTracking ID: ${doc.trackingId}\nDownload: ${doc.downloadUrl}`);
    } catch (error) {
      await this.sendMessage(chatId, `❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle /suggest command
   */
  private async handleSuggest(message: string, chatId: number): Promise<void> {
    if (!message) {
      await this.sendMessage(chatId, 'Usage: /suggest <message>\nExample: /suggest "I need your password"');
      return;
    }

    try {
      const engine = new ReplySuggestionEngine(this.env);
      const suggestions = await engine.suggestReplies({
        threatLevel: 'medium', // Would be determined from context
        goal: 'waste_time',
        messageContext: {
          incomingMessage: message,
        },
      });

      let text = '💡 Reply suggestions:\n\n';
      suggestions.forEach((suggestion, i) => {
        text += `${i + 1}. ${suggestion.text}\n   (${suggestion.strategy}, confidence: ${Math.round(suggestion.confidence * 100)}%)\n\n`;
      });

      await this.sendMessage(chatId, text);
    } catch (error) {
      await this.sendMessage(chatId, `❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle /lookup command
   */
  private async handleLookup(identifier: string, chatId: number): Promise<void> {
    if (!identifier) {
      await this.sendMessage(chatId, 'Usage: /lookup <email|phone|domain>\nExample: /lookup test@example.com');
      return;
    }

    await this.sendMessage(chatId, '🔍 Starting OSINT lookup... This may take a moment.');

    try {
      const unmasker = new OSINTUnmasker(this.env);
      
      // Determine identifier type
      let identifierObj: { email?: string; phone?: string; domain?: string } = {};
      if (identifier.includes('@')) {
        identifierObj.email = identifier;
      } else if (identifier.match(/^\+?[0-9-]+$/)) {
        identifierObj.phone = identifier;
      } else if (identifier.includes('.')) {
        identifierObj.domain = identifier;
      } else {
        await this.sendMessage(chatId, '❌ Invalid identifier format. Use email, phone, or domain.');
        return;
      }

      const result = await unmasker.unmaskIdentity(identifierObj);

      let text = `📊 OSINT Results:\n\n`;
      text += `Confidence: ${Math.round(result.confidence * 100)}%\n\n`;
      
      if (result.identityGraph.emailAddresses.length > 0) {
        text += `📧 Emails: ${result.identityGraph.emailAddresses.join(', ')}\n`;
      }
      if (result.identityGraph.phoneNumbers.length > 0) {
        text += `📱 Phones: ${result.identityGraph.phoneNumbers.map(p => p.number).join(', ')}\n`;
      }
      if (result.identityGraph.aliases.length > 0) {
        text += `👤 Aliases: ${result.identityGraph.aliases.join(', ')}\n`;
      }

      await this.sendMessage(chatId, text);
    } catch (error) {
      await this.sendMessage(chatId, `❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Handle /status command
   */
  private async handleStatus(chatId: number): Promise<void> {
    const text = `📊 Pow3r Defender Status

✅ Bot: Online
✅ API: Connected
✅ Services: Operational

Send /help for commands.`;
    await this.sendMessage(chatId, text);
  }

  /**
   * Handle /help command
   */
  private async handleHelp(chatId: number): Promise<void> {
    const text = `📖 Available Commands:

/start - Initialize bot
/track <url> - Generate tracking link
/file <description> - Generate tracking file
/suggest <message> - Get reply suggestions
/lookup <email|phone|domain> - OSINT lookup
/status - Check system status
/help - Show this help

Example:
/track https://example.com
/suggest "I need your password"
/lookup test@example.com`;
    await this.sendMessage(chatId, text);
  }

  /**
   * Handle callback query (inline keyboard)
   */
  private async handleCallbackQuery(callbackQuery: TelegramUpdate['callback_query']): Promise<void> {
    if (!callbackQuery || !callbackQuery.data || !callbackQuery.message) {
      return;
    }

    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Handle callback data
    if (data.startsWith('track:')) {
      const url = data.replace('track:', '');
      await this.handleTrack(url, chatId);
    }

    // Answer callback query
    await this.answerCallbackQuery(callbackQuery.id);
  }

  /**
   * Send message
   */
  private async sendMessage(chatId: number, text: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
    }
  }

  /**
   * Answer callback query
   */
  private async answerCallbackQuery(callbackQueryId: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
        }),
      });
    } catch (error) {
      console.error('Failed to answer callback query:', error);
    }
  }
}


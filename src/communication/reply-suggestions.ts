/**
 * Reply Language Suggestion Engine
 * 
 * AI-powered reply suggestions based on threat level and context
 */

import type { Env } from '../types';

export interface ReplySuggestion {
  text: string;
  strategy: 'waste_time' | 'gather_intel' | 'disengage' | 'neutral';
  confidence: number;
  reasoning: string;
}

export interface SuggestionContext {
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
}

export class ReplySuggestionEngine {
  private env: Env;
  private mcpServerUrl: string;

  constructor(env: Env) {
    this.env = env;
    // Use Claude MCP server for suggestions
    this.mcpServerUrl = env.CLAUDE_MCP_URL || 'https://config.superbots.link/mcp/claude';
  }

  /**
   * Generate reply suggestions
   */
  async suggestReplies(context: SuggestionContext): Promise<ReplySuggestion[]> {
    // Build prompt for Claude
    const prompt = this.buildPrompt(context);

    try {
      // Call Claude via MCP
      const response = await fetch(`${this.mcpServerUrl}/tools/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.ABI_WEBHOOK_URL || ''}`, // Use auth token
        },
        body: JSON.stringify({
          name: 'claude_generate_text',
          arguments: {
            prompt,
            max_tokens: 1000,
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`MCP server error: ${response.statusText}`);
      }

      const result = await response.json() as {
        content?: Array<{ type: string; text: string }>;
        isError?: boolean;
      };

      if (result.isError || !result.content) {
        throw new Error('Failed to get suggestions from MCP');
      }

      // Parse suggestions from Claude response
      const suggestionsText = result.content[0]?.text || '';
      return this.parseSuggestions(suggestionsText, context);
    } catch (error) {
      console.warn('Failed to get AI suggestions, using fallback:', error);
      return this.generateFallbackSuggestions(context);
    }
  }

  /**
   * Build prompt for Claude
   */
  private buildPrompt(context: SuggestionContext): string {
    const { threatLevel, attackerProfile, userStyle, goal, messageContext } = context;

    let prompt = `You are a security communication assistant helping a user respond to a potential attacker.

THREAT LEVEL: ${threatLevel.toUpperCase()}
GOAL: ${goal.replace('_', ' ')}
INCOMING MESSAGE: "${messageContext.incomingMessage}"

`;

    if (attackerProfile) {
      prompt += `ATTACKER PROFILE:
- Risk Score: ${attackerProfile.riskScore || 'Unknown'}
- Known Identities: ${attackerProfile.knownIdentities?.join(', ') || 'None'}
`;

      if (attackerProfile.communicationHistory && attackerProfile.communicationHistory.length > 0) {
        prompt += `- Recent Messages:\n`;
        attackerProfile.communicationHistory.slice(-3).forEach((msg, i) => {
          prompt += `  ${i + 1}. "${msg.content}"\n`;
        });
      }
    }

    if (userStyle) {
      prompt += `\nUSER COMMUNICATION STYLE:
- Formality: ${userStyle.formality || 'mixed'}
- Common Phrases: ${userStyle.commonPhrases?.join(', ') || 'None'}
`;
    }

    if (messageContext.conversationHistory && messageContext.conversationHistory.length > 0) {
      prompt += `\nCONVERSATION HISTORY:\n`;
      messageContext.conversationHistory.slice(-5).forEach((msg) => {
        prompt += `- ${msg.role === 'user' ? 'User' : 'Attacker'}: "${msg.content}"\n`;
      });
    }

    prompt += `\nGenerate 3 reply suggestions that:
1. Match the user's communication style
2. Achieve the goal: ${goal}
3. Are natural and don't raise suspicion
4. ${goal === 'waste_time' ? 'Keep the conversation going with questions or delays' : ''}
   ${goal === 'gather_intel' ? 'Extract information subtly' : ''}
   ${goal === 'disengage' ? 'End the conversation politely but firmly' : ''}
   ${goal === 'neutral' ? 'Respond appropriately without revealing information' : ''}

Format your response as JSON array:
[
  {
    "text": "suggestion text here",
    "strategy": "${goal}",
    "confidence": 0.0-1.0,
    "reasoning": "why this suggestion"
  }
]`;

    return prompt;
  }

  /**
   * Parse suggestions from Claude response
   */
  private parseSuggestions(text: string, context: SuggestionContext): ReplySuggestion[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ReplySuggestion[];
        return parsed.slice(0, 3); // Limit to 3 suggestions
      }
    } catch (error) {
      console.warn('Failed to parse suggestions JSON:', error);
    }

    // Fallback: try to extract suggestions from text
    return this.generateFallbackSuggestions(context);
  }

  /**
   * Generate fallback suggestions when AI is unavailable
   */
  private generateFallbackSuggestions(context: SuggestionContext): ReplySuggestion[] {
    const { goal, messageContext, threatLevel } = context;

    const suggestions: ReplySuggestion[] = [];

    if (goal === 'waste_time') {
      suggestions.push({
        text: "I need to check on that. Can you give me a bit more detail about what you're looking for?",
        strategy: 'waste_time',
        confidence: 0.7,
        reasoning: 'Asks for clarification to delay response',
      });
      suggestions.push({
        text: "Let me verify that information. I'll get back to you shortly.",
        strategy: 'waste_time',
        confidence: 0.6,
        reasoning: 'Creates expectation of follow-up',
      });
    } else if (goal === 'gather_intel') {
      suggestions.push({
        text: "That's interesting. How did you come across this?",
        strategy: 'gather_intel',
        confidence: 0.7,
        reasoning: 'Asks for source information',
      });
      suggestions.push({
        text: "Can you tell me more about your situation?",
        strategy: 'gather_intel',
        confidence: 0.6,
        reasoning: 'Encourages attacker to share more',
      });
    } else if (goal === 'disengage') {
      suggestions.push({
        text: "I'm not able to help with that. Thank you for reaching out.",
        strategy: 'disengage',
        confidence: 0.8,
        reasoning: 'Polite but firm disengagement',
      });
      suggestions.push({
        text: "I don't think I'm the right person for this. Good luck!",
        strategy: 'disengage',
        confidence: 0.7,
        reasoning: 'Friendly but clear boundary',
      });
    } else {
      // Neutral
      suggestions.push({
        text: "Thanks for your message. I'll need to look into this.",
        strategy: 'neutral',
        confidence: 0.7,
        reasoning: 'Neutral acknowledgment',
      });
      suggestions.push({
        text: "I received your message. Let me get back to you.",
        strategy: 'neutral',
        confidence: 0.6,
        reasoning: 'Non-committal response',
      });
    }

    // Add a generic suggestion
    if (suggestions.length < 3) {
      suggestions.push({
        text: "I'll need to review this and get back to you.",
        strategy: goal,
        confidence: 0.5,
        reasoning: 'Generic delay response',
      });
    }

    return suggestions.slice(0, 3);
  }
}


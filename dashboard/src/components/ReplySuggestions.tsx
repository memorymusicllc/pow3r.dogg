import { useState } from 'react';
import { apiClient } from '../api/client';
import { emitComponentEvent } from '../utils/observability';
import { LightBulbIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const COMPONENT_ID = 'reply-suggestions';

interface ReplySuggestion {
  text: string;
  strategy: 'waste_time' | 'gather_intel' | 'disengage' | 'neutral';
  confidence: number;
  reasoning: string;
}

export default function ReplySuggestions() {
  const [message, setMessage] = useState('');
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [goal, setGoal] = useState<'waste_time' | 'gather_intel' | 'disengage' | 'neutral'>('waste_time');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);

  const handleGetSuggestions = async () => {
    if (!message.trim()) {
      setError('Incoming message is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      emitComponentEvent(COMPONENT_ID, 'suggest_start', { threatLevel, goal });
      
      const response = await apiClient.post<{ success: boolean; suggestions: ReplySuggestion[] }>('/api/communication/suggest-reply', {
        threatLevel,
        goal,
        messageContext: {
          incomingMessage: message,
        },
      });

      if (response.success && response.suggestions) {
        setSuggestions(response.suggestions);
        emitComponentEvent(COMPONENT_ID, 'suggest_success', { count: response.suggestions.length });
      } else {
        throw new Error('Failed to get suggestions');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get suggestions';
      setError(errorMessage);
      emitComponentEvent(COMPONENT_ID, 'suggest_error', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'waste_time':
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-500/50';
      case 'gather_intel':
        return 'bg-blue-900/20 text-blue-400 border-blue-500/50';
      case 'disengage':
        return 'bg-red-900/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-900/20 text-gray-400 border-gray-500/50';
    }
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      default:
        return 'text-green-400';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">
          Reply Suggestions
        </h2>
        <p className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted mt-1">
          AI-powered reply suggestions based on threat level and context
        </p>
      </div>

      <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Incoming Message *</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text focus:outline-none focus:border-blue-500"
            placeholder="Message from attacker..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Threat Level</label>
            <select
              value={threatLevel}
              onChange={(e) => setThreatLevel(e.target.value as typeof threatLevel)}
              className="w-full px-3 py-2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text focus:outline-none focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Goal</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as typeof goal)}
              className="w-full px-3 py-2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text focus:outline-none focus:border-blue-500"
            >
              <option value="waste_time">Waste Time</option>
              <option value="gather_intel">Gather Intel</option>
              <option value="disengage">Disengage</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleGetSuggestions}
          disabled={loading || !message.trim()}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <LightBulbIcon className="w-5 h-5" />
          {loading ? 'Generating Suggestions...' : 'Get Suggestions'}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <LightBulbIcon className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold">Suggestions</h3>
            <span className={`ml-auto px-3 py-1 rounded-full text-sm font-semibold ${getThreatColor(threatLevel)}`}>
              {threatLevel.toUpperCase()}
            </span>
          </div>

          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-4 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text mb-1">
                      {suggestion.text}
                    </div>
                    {suggestion.reasoning && (
                      <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                        {suggestion.reasoning}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStrategyColor(suggestion.strategy)}`}>
                    {suggestion.strategy.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className="text-xs text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


import { useState } from 'react';
import { apiClient } from '../api/client';
import { emitComponentEvent } from '../utils/observability';
import {
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';

const COMPONENT_ID = 'communication-recorder';

interface CommunicationRecord {
  id: string;
  channel: 'email' | 'sms' | 'telegram' | 'chat';
  content: string;
  senderIdentifier?: string;
  evidenceHash: string;
  recordedAt: number;
}

export default function CommunicationRecorder() {
  const [channel, setChannel] = useState<'email' | 'sms' | 'telegram' | 'chat'>('email');
  const [content, setContent] = useState('');
  const [sender, setSender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRecord, setLastRecord] = useState<CommunicationRecord | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const channelIcons = {
    email: EnvelopeIcon,
    sms: DevicePhoneMobileIcon,
    telegram: PaperAirplaneIcon,
    chat: ChatBubbleLeftRightIcon,
  };

  const handleRecord = async () => {
    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      emitComponentEvent(COMPONENT_ID, 'record_start', { channel });
      
      const response = await apiClient.post<{ success: boolean; record: CommunicationRecord }>('/api/communication/record', {
        channel,
        content,
        senderIdentifier: sender || undefined,
      });

      if (response.success && response.record) {
        setLastRecord(response.record);
        setShowSuccessDialog(true);
        setContent('');
        setSender('');
        emitComponentEvent(COMPONENT_ID, 'record_success', { recordId: response.record.id });
      } else {
        throw new Error('Failed to record communication');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record communication';
      setError(errorMessage);
      emitComponentEvent(COMPONENT_ID, 'record_error', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const ChannelIcon = channelIcons[channel];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">
          Record Communication
        </h2>
        <p className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted mt-1">
          Record communications for evidence chain
        </p>
      </div>

      <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Channel *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['email', 'sms', 'telegram', 'chat'] as const).map((ch) => {
              const Icon = channelIcons[ch];
              return (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    channel === ch
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-true-black-border theme-light:border-light-border theme-glass:border-glass-border hover:border-true-black-accent theme-light:hover:border-light-accent theme-glass:hover:border-glass-accent'
                  }`}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm font-medium capitalize">{ch}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Content *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text focus:outline-none focus:border-blue-500"
            placeholder="Enter communication content..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Sender (optional)</label>
          <input
            type="text"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            className="w-full px-3 py-2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text focus:outline-none focus:border-blue-500"
            placeholder="sender@example.com or phone number"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleRecord}
          disabled={loading || !content.trim()}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ChannelIcon className="w-5 h-5" />
          {loading ? 'Recording...' : 'Record Communication'}
        </button>
      </div>

      {/* Success Dialog */}
      <Dialog.Root open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg p-6 w-full max-w-md z-50">
            <Dialog.Title className="text-xl font-bold mb-4">Communication Recorded</Dialog.Title>
            {lastRecord && (
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Record ID</div>
                  <div className="font-mono text-sm">{lastRecord.id}</div>
                </div>
                <div>
                  <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Evidence Hash</div>
                  <div className="font-mono text-xs break-all">{lastRecord.evidenceHash}</div>
                </div>
                <div>
                  <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Recorded At</div>
                  <div className="text-sm">{new Date(lastRecord.recordedAt).toLocaleString()}</div>
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowSuccessDialog(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}


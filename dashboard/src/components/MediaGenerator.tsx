import { useState, useEffect } from 'react';
import { mediaGeneratorApi, type MediaType, type WorkflowType, type MediaGenerationJob, type LLMAccount, type ModelPreset } from '../api/mediaGenerator';
import { emitComponentEvent } from '../utils/observability';
import { PhotoIcon, VideoCameraIcon, MusicalNoteIcon, DocumentTextIcon, SparklesIcon, PlusIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';

const COMPONENT_ID = 'media-generator';

export default function MediaGenerator() {
  const [jobs, setJobs] = useState<MediaGenerationJob[]>([]);
  const [accounts, setAccounts] = useState<LLMAccount[]>([]);
  const [presets, setPresets] = useState<ModelPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>('image');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType>('simple');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [generateForm, setGenerateForm] = useState({
    prompt: '',
    mediaType: 'image' as MediaType,
    workflowType: 'simple' as WorkflowType,
    presetId: '',
    priority: '0',
    maxAttempts: '3',
    parameters: '',
  });

  const [accountForm, setAccountForm] = useState({
    provider: 'openai',
    accountName: '',
    apiKey: '',
    endpointUrl: '',
    models: '',
    rateLimitPerMinute: '60',
    rateLimitPerDay: '10000',
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [page, selectedMediaType]);

  const loadData = async () => {
    try {
      const [jobsRes, accountsRes, presetsRes] = await Promise.all([
        mediaGeneratorApi.listJobs({
          mediaType: selectedMediaType,
          limit,
          offset: page * limit,
        }),
        mediaGeneratorApi.getAccounts(),
        mediaGeneratorApi.getPresets(selectedMediaType, selectedWorkflow),
      ]);

      setJobs(jobsRes.jobs);
      setTotal(jobsRes.total);
      setAccounts(accountsRes);
      setPresets(presetsRes);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleGenerate = async () => {
    if (!generateForm.prompt.trim()) {
      setError('Prompt is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const parameters = generateForm.parameters
        ? JSON.parse(generateForm.parameters)
        : undefined;

      const result = await mediaGeneratorApi.generate({
        mediaType: generateForm.mediaType,
        prompt: generateForm.prompt,
        workflowType: generateForm.workflowType,
        presetId: generateForm.presetId || undefined,
        priority: parseInt(generateForm.priority) || 0,
        maxAttempts: parseInt(generateForm.maxAttempts) || 3,
        parameters,
      });

      emitComponentEvent(COMPONENT_ID, 'generate_started', { jobId: result.jobId });
      setShowGenerateDialog(false);
      setGenerateForm({
        prompt: '',
        mediaType: 'image',
        workflowType: 'simple',
        presetId: '',
        priority: '0',
        maxAttempts: '3',
        parameters: '',
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate media');
      emitComponentEvent(COMPONENT_ID, 'generate_error', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!accountForm.accountName || !accountForm.models) {
      setError('Account name and models are required');
      return;
    }

    try {
      setLoading(true);
      await mediaGeneratorApi.createAccount({
        provider: accountForm.provider,
        accountName: accountForm.accountName,
        apiKey: accountForm.apiKey || undefined,
        endpointUrl: accountForm.endpointUrl || undefined,
        models: accountForm.models.split(',').map(m => m.trim()),
        rateLimitPerMinute: parseInt(accountForm.rateLimitPerMinute) || 60,
        rateLimitPerDay: parseInt(accountForm.rateLimitPerDay) || 10000,
      });
      setShowAccountDialog(false);
      setAccountForm({
        provider: 'openai',
        accountName: '',
        apiKey: '',
        endpointUrl: '',
        models: '',
        rateLimitPerMinute: '60',
        rateLimitPerDay: '10000',
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializePresets = async () => {
    try {
      setLoading(true);
      await mediaGeneratorApi.initializePresets();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize presets');
    } finally {
      setLoading(false);
    }
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case 'image':
        return PhotoIcon;
      case 'video':
        return VideoCameraIcon;
      case 'audio':
        return MusicalNoteIcon;
      case 'text':
        return DocumentTextIcon;
      case 'document':
        return DocumentTextIcon;
      default:
        return SparklesIcon;
    }
  };

  const getStatusIcon = (status: MediaGenerationJob['status']) => {
    switch (status) {
      case 'completed':
        return CheckCircleIcon;
      case 'failed':
        return XCircleIcon;
      case 'processing':
      case 'retrying':
        return ClockIcon;
      default:
        return ClockIcon;
    }
  };

  const getStatusColor = (status: MediaGenerationJob['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'processing':
      case 'retrying':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">
            Media Generator
          </h2>
          <p className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted mt-1">
            Generate images, videos, audio, text, and documents with LLM-powered workflows
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleInitializePresets}
            className="px-4 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text hover:bg-true-black-bg-hover theme-light:hover:bg-light-bg-hover theme-glass:hover:bg-glass-bg-hover"
          >
            Init Presets
          </button>
          <button
            onClick={() => setShowAccountDialog(true)}
            className="px-4 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text hover:bg-true-black-bg-hover theme-light:hover:bg-light-bg-hover theme-glass:hover:bg-glass-bg-hover flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Account
          </button>
          <button
            onClick={() => setShowGenerateDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <SparklesIcon className="w-4 h-4" />
            Generate
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary rounded-lg">
          <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Total Jobs</div>
          <div className="text-2xl font-bold">{total}</div>
        </div>
        <div className="p-4 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary rounded-lg">
          <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Active Accounts</div>
          <div className="text-2xl font-bold">{accounts.filter(a => a.status === 'active').length}</div>
        </div>
        <div className="p-4 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary rounded-lg">
          <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Presets</div>
          <div className="text-2xl font-bold">{presets.length}</div>
        </div>
        <div className="p-4 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary rounded-lg">
          <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Success Rate</div>
          <div className="text-2xl font-bold">
            {jobs.length > 0
              ? Math.round(
                  (jobs.filter(j => j.status === 'completed').length / jobs.length) * 100
                )
              : 0}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={selectedMediaType}
          onChange={(e) => {
            setSelectedMediaType(e.target.value as MediaType);
            setPage(0);
          }}
          className="px-4 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text"
        >
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="text">Text</option>
          <option value="document">Documents</option>
        </select>
        <select
          value={selectedWorkflow}
          onChange={(e) => {
            setSelectedWorkflow(e.target.value as WorkflowType);
            loadData();
          }}
          className="px-4 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text"
        >
          <option value="simple">Simple Pipeline</option>
          <option value="adaptive">Adaptive Workflow</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Jobs List */}
      {loading && jobs.length === 0 ? (
        <div className="text-center py-12 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
          Loading jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
          No jobs found. Generate your first media!
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const MediaIcon = getMediaIcon(job.jobType);
            const StatusIcon = getStatusIcon(job.status);
            return (
              <div
                key={job.id}
                className="p-4 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <MediaIcon className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text capitalize">
                        {job.jobType}
                      </span>
                      <StatusIcon className={`w-5 h-5 ${getStatusColor(job.status)}`} />
                      <span className={`text-sm ${getStatusColor(job.status)} capitalize`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted truncate mb-2">
                      {job.prompt}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                      <span>Created: {formatDate(job.createdAt)}</span>
                      {job.modelUsed && <span>Model: {job.modelUsed}</span>}
                      {job.generationTimeMs && (
                        <span>Time: {job.generationTimeMs}ms</span>
                      )}
                      {job.attempts > 0 && <span>Attempts: {job.attempts}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {job.resultUrl && job.status === 'completed' && (
                      <a
                        href={job.resultUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        View Result
                      </a>
                    )}
                    {job.errorMessage && (
                      <span className="px-3 py-1.5 bg-red-900/20 text-red-400 rounded text-xs">
                        {job.errorMessage.substring(0, 50)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">
            Page {page + 1} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * limit >= total}
            className="px-4 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog.Root open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg p-6 w-full max-w-md z-50 max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-xl font-bold mb-4">Generate Media</Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Media Type *</label>
                <select
                  value={generateForm.mediaType}
                  onChange={(e) => setGenerateForm({ ...generateForm, mediaType: e.target.value as MediaType })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="text">Text</option>
                  <option value="document">Document</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Workflow Type *</label>
                <select
                  value={generateForm.workflowType}
                  onChange={(e) => setGenerateForm({ ...generateForm, workflowType: e.target.value as WorkflowType })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                >
                  <option value="simple">Simple Pipeline</option>
                  <option value="adaptive">Adaptive Workflow</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prompt *</label>
                <textarea
                  value={generateForm.prompt}
                  onChange={(e) => setGenerateForm({ ...generateForm, prompt: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  rows={4}
                  placeholder="Describe what you want to generate..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Preset (optional)</label>
                <select
                  value={generateForm.presetId}
                  onChange={(e) => setGenerateForm({ ...generateForm, presetId: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                >
                  <option value="">Auto-select</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} ({preset.successRate > 0 ? Math.round(preset.successRate * 100) : 0}% success)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <input
                    type="number"
                    value={generateForm.priority}
                    onChange={(e) => setGenerateForm({ ...generateForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Attempts</label>
                  <input
                    type="number"
                    value={generateForm.maxAttempts}
                    onChange={(e) => setGenerateForm({ ...generateForm, maxAttempts: e.target.value })}
                    className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Parameters (JSON, optional)</label>
                <textarea
                  value={generateForm.parameters}
                  onChange={(e) => setGenerateForm({ ...generateForm, parameters: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded font-mono text-sm"
                  rows={3}
                  placeholder='{"size": "1024x1024", "quality": "hd"}'
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowGenerateDialog(false)}
                  className="px-4 py-2 border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Account Dialog */}
      <Dialog.Root open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg p-6 w-full max-w-md z-50 max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-xl font-bold mb-4">Add LLM Account</Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Provider *</label>
                <select
                  value={accountForm.provider}
                  onChange={(e) => setAccountForm({ ...accountForm, provider: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="azure">Azure OpenAI</option>
                  <option value="google">Google</option>
                  <option value="cohere">Cohere</option>
                  <option value="self-hosted">Self-hosted</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Name *</label>
                <input
                  type="text"
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  placeholder="My OpenAI Account"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input
                  type="password"
                  value={accountForm.apiKey}
                  onChange={(e) => setAccountForm({ ...accountForm, apiKey: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Endpoint URL (optional)</label>
                <input
                  type="url"
                  value={accountForm.endpointUrl}
                  onChange={(e) => setAccountForm({ ...accountForm, endpointUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Models * (comma-separated)</label>
                <input
                  type="text"
                  value={accountForm.models}
                  onChange={(e) => setAccountForm({ ...accountForm, models: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  placeholder="gpt-4, gpt-3.5-turbo, dall-e-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Rate Limit (per minute)</label>
                  <input
                    type="number"
                    value={accountForm.rateLimitPerMinute}
                    onChange={(e) => setAccountForm({ ...accountForm, rateLimitPerMinute: e.target.value })}
                    className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rate Limit (per day)</label>
                  <input
                    type="number"
                    value={accountForm.rateLimitPerDay}
                    onChange={(e) => setAccountForm({ ...accountForm, rateLimitPerDay: e.target.value })}
                    className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAccountDialog(false)}
                  className="px-4 py-2 border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAccount}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}


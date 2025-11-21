/**
 * Media Generation API Client
 */

import { apiClient } from './client';

export type MediaType = 'image' | 'video' | 'audio' | 'text' | 'document';
export type WorkflowType = 'simple' | 'adaptive';

export interface MediaGenerationRequest {
  mediaType: MediaType;
  prompt: string;
  workflowType?: WorkflowType;
  presetId?: string;
  priority?: number;
  maxAttempts?: number;
  parameters?: Record<string, unknown>;
}

export interface MediaGenerationJob {
  id: string;
  jobType: MediaType;
  prompt: string;
  presetId?: string;
  workflowType: WorkflowType;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  priority: number;
  attempts: number;
  maxAttempts: number;
  llmAccountId?: string;
  modelUsed?: string;
  resultUrl?: string;
  resultStorageKey?: string;
  resultMetadata?: Record<string, unknown>;
  errorMessage?: string;
  generationTimeMs?: number;
  cost: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface LLMAccount {
  id: string;
  provider: string;
  accountName: string;
  models: string[];
  status: string;
  successCount: number;
  failureCount: number;
}

export interface ModelPreset {
  id: string;
  name: string;
  description?: string;
  mediaType: MediaType;
  workflowType: WorkflowType;
  priority: number;
  successRate: number;
  usageCount: number;
}

export const mediaGeneratorApi = {
  /**
   * Generate media
   */
  async generate(request: MediaGenerationRequest): Promise<{ jobId: string; status: string }> {
    return apiClient.post<{ success: boolean; data: { jobId: string; status: string } }>(
      '/api/media/generate',
      request
    ).then(res => res.data);
  },

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<MediaGenerationJob> {
    return apiClient.get<{ success: boolean; data: MediaGenerationJob }>(
      `/api/media/jobs/${jobId}`
    ).then(res => res.data);
  },

  /**
   * List jobs
   */
  async listJobs(options: {
    mediaType?: MediaType;
    status?: MediaGenerationJob['status'];
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: MediaGenerationJob[]; total: number }> {
    const params = new URLSearchParams();
    if (options.mediaType) params.set('mediaType', options.mediaType);
    if (options.status) params.set('status', options.status);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());

    const query = params.toString();
    return apiClient.get<{ success: boolean; data: { jobs: MediaGenerationJob[]; total: number } }>(
      `/api/media/jobs${query ? `?${query}` : ''}`
    ).then(res => res.data);
  },

  /**
   * Get LLM accounts
   */
  async getAccounts(provider?: string): Promise<LLMAccount[]> {
    const params = provider ? `?provider=${provider}` : '';
    return apiClient.get<{ success: boolean; data: LLMAccount[] }>(
      `/api/media/accounts${params}`
    ).then(res => res.data);
  },

  /**
   * Create LLM account
   */
  async createAccount(account: {
    provider: string;
    accountName: string;
    apiKey?: string;
    endpointUrl?: string;
    models: string[];
    rateLimitPerMinute?: number;
    rateLimitPerDay?: number;
    costPerToken?: number;
    metadata?: Record<string, unknown>;
  }): Promise<LLMAccount> {
    return apiClient.post<{ success: boolean; data: LLMAccount }>(
      '/api/media/accounts',
      account
    ).then(res => res.data);
  },

  /**
   * Get model presets
   */
  async getPresets(mediaType?: MediaType, workflowType?: WorkflowType): Promise<ModelPreset[]> {
    const params = new URLSearchParams();
    if (mediaType) params.set('mediaType', mediaType);
    if (workflowType) params.set('workflowType', workflowType);

    const query = params.toString();
    return apiClient.get<{ success: boolean; data: ModelPreset[] }>(
      `/api/media/presets${query ? `?${query}` : ''}`
    ).then(res => res.data);
  },

  /**
   * Create model preset
   */
  async createPreset(preset: {
    name: string;
    description?: string;
    mediaType: MediaType;
    workflowType: WorkflowType;
    modelConfig: any;
    priority?: number;
    metadata?: Record<string, unknown>;
  }): Promise<ModelPreset> {
    return apiClient.post<{ success: boolean; data: ModelPreset }>(
      '/api/media/presets',
      preset
    ).then(res => res.data);
  },

  /**
   * Initialize default presets
   */
  async initializePresets(): Promise<void> {
    await apiClient.post('/api/media/init', {});
  },
};


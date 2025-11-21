/**
 * Media Generation Engine
 * 
 * Handles media generation with simple and adaptive workflows
 * Supports: images, videos, audio, text, documents
 */

import type { Env } from '../types';
import { LLMAccountManager } from './llm-accounts';
import { ModelPresetManager, type MediaType, type WorkflowType } from './model-presets';

export interface MediaGenerationRequest {
  mediaType: MediaType;
  prompt: string;
  workflowType?: WorkflowType;
  presetId?: string;
  priority?: number;
  maxAttempts?: number;
  parameters?: Record<string, unknown>;
}

export interface MediaGenerationResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  resultUrl?: string;
  resultStorageKey?: string;
  errorMessage?: string;
  generationTimeMs?: number;
  cost?: number;
  modelUsed?: string;
  attempts?: number;
}

export interface MediaGenerationJob {
  id: string;
  jobType: MediaType;
  prompt: string;
  presetId?: string;
  workflowType: WorkflowType;
  status: MediaGenerationResult['status'];
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

export class MediaGenerator {
  private env: Env;
  private accountManager: LLMAccountManager;
  private presetManager: ModelPresetManager;

  constructor(env: Env) {
    this.env = env;
    this.accountManager = new LLMAccountManager(env);
    this.presetManager = new ModelPresetManager(env);
  }

  /**
   * Generate media with automatic workflow selection
   */
  async generate(request: MediaGenerationRequest): Promise<MediaGenerationResult> {
    const jobId = crypto.randomUUID();
    const workflowType = request.workflowType || 'simple';
    const startTime = Date.now();

    // Create job record
    const job: MediaGenerationJob = {
      id: jobId,
      jobType: request.mediaType,
      prompt: request.prompt,
      presetId: request.presetId,
      workflowType,
      status: 'pending',
      priority: request.priority || 0,
      attempts: 0,
      maxAttempts: request.maxAttempts || 3,
      cost: 0,
      createdAt: Date.now(),
    };

    await this.saveJob(job);

    // Start generation in background
    this.processJob(job, request).catch((error) => {
      console.error('Job processing error:', error);
    });

    return {
      jobId,
      status: 'pending',
    };
  }

  /**
   * Process generation job
   */
  private async processJob(
    job: MediaGenerationJob,
    request: MediaGenerationRequest
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Update status to processing
      job.status = 'processing';
      job.startedAt = Date.now();
      await this.saveJob(job);
      await this.recordEvent(job.id, 'started', {});

      // Select preset if not provided
      let preset = request.presetId
        ? await this.presetManager.getPreset(request.presetId)
        : null;

      if (!preset) {
        const presets = await this.presetManager.getPresets(
          request.mediaType,
          job.workflowType
        );
        preset = presets[0] || null;
      }

      if (!preset) {
        throw new Error(`No preset found for ${request.mediaType} with ${job.workflowType} workflow`);
      }

      // Select LLM account
      const account = await this.accountManager.selectBestAccount(
        preset.modelConfig.primary.provider as any,
        preset.modelConfig.primary.model
      );

      if (!account) {
        throw new Error(`No available account for ${preset.modelConfig.primary.provider}`);
      }

      job.llmAccountId = account.id;
      await this.saveJob(job);
      await this.recordEvent(job.id, 'model_selected', {
        accountId: account.id,
        model: preset.modelConfig.primary.model,
      });

      // Generate based on workflow type
      let result: { url?: string; storageKey?: string; metadata?: Record<string, unknown> };
      
      if (job.workflowType === 'simple') {
        result = await this.simplePipeline(job, preset, account, request);
      } else {
        result = await this.adaptiveWorkflow(job, preset, account, request);
      }

      // Store result
      if (result.storageKey) {
        job.resultStorageKey = result.storageKey;
      }
      if (result.url) {
        job.resultUrl = result.url;
      }
      job.resultMetadata = result.metadata;
      job.status = 'completed';
      job.completedAt = Date.now();
      job.generationTimeMs = Date.now() - startTime;
      job.modelUsed = preset.modelConfig.primary.model;

      await this.saveJob(job);
      await this.recordEvent(job.id, 'generation_complete', {
        duration: job.generationTimeMs,
        model: job.modelUsed,
      });
      await this.recordEvent(job.id, 'success', {
        duration: job.generationTimeMs,
      });

      // Update account and preset success
      await this.accountManager.recordUsage(account.id, true, job.cost);
      if (preset) {
        await this.presetManager.updateSuccessRate(preset.id, true);
      }
    } catch (error) {
      job.attempts++;
      job.errorMessage = error instanceof Error ? error.message : String(error);
      
      if (job.attempts < job.maxAttempts) {
        job.status = 'retrying';
        await this.saveJob(job);
        await this.recordEvent(job.id, 'retry', {
          attempt: job.attempts,
          error: job.errorMessage,
        });

        // Retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, job.attempts - 1), 30000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.processJob(job, request);
      } else {
        job.status = 'failed';
        job.completedAt = Date.now();
        await this.saveJob(job);
        await this.recordEvent(job.id, 'generation_failed', {
          error: job.errorMessage,
          attempts: job.attempts,
        });
        await this.recordEvent(job.id, 'failure', {
          error: job.errorMessage,
        });

        // Update account and preset failure
        if (job.llmAccountId) {
          await this.accountManager.recordUsage(job.llmAccountId, false, job.cost);
        }
        const failedPreset = request.presetId
          ? await this.presetManager.getPreset(request.presetId)
          : null;
        if (failedPreset) {
          await this.presetManager.updateSuccessRate(failedPreset.id, false);
        }
      }
    }
  }

  /**
   * Simple pipeline: try primary model, then fallbacks sequentially
   */
  private async simplePipeline(
    job: MediaGenerationJob,
    preset: any,
    account: any,
    request: MediaGenerationRequest
  ): Promise<{ url?: string; storageKey?: string; metadata?: Record<string, unknown> }> {
    const models = [preset.modelConfig.primary, ...preset.modelConfig.fallback];
    
    for (const modelConfig of models) {
      try {
        const result = await this.generateWithModel(
          job.jobType,
          request.prompt,
          account,
          modelConfig,
          request.parameters
        );
        return result;
      } catch (error) {
        console.warn(`Model ${modelConfig.model} failed, trying next:`, error);
        // Try next model
        continue;
      }
    }

    throw new Error('All models failed in simple pipeline');
  }

  /**
   * Adaptive workflow: intelligent model selection and mixing
   */
  private async adaptiveWorkflow(
    job: MediaGenerationJob,
    preset: any,
    account: any,
    request: MediaGenerationRequest
  ): Promise<{ url?: string; storageKey?: string; metadata?: Record<string, unknown> }> {
    // Check if mixing is enabled
    if (preset.modelConfig.mixing?.enabled) {
      return this.generateWithMixing(
        job.jobType,
        request.prompt,
        account,
        preset.modelConfig.mixing,
        request.parameters
      );
    }

    // Adaptive selection: try models based on success rate
    const models = [preset.modelConfig.primary, ...preset.modelConfig.fallback];
    
    // Sort by expected success (would use historical data)
    models.sort((a, b) => {
      // In real implementation, would check historical success rates
      return 0;
    });

    for (const modelConfig of models) {
      try {
        const result = await this.generateWithModel(
          job.jobType,
          request.prompt,
          account,
          modelConfig,
          request.parameters
        );
        return result;
      } catch (error) {
        console.warn(`Model ${modelConfig.model} failed:`, error);
        continue;
      }
    }

    throw new Error('All models failed in adaptive workflow');
  }

  /**
   * Generate with specific model
   */
  private async generateWithModel(
    mediaType: MediaType,
    prompt: string,
    account: any,
    modelConfig: any,
    parameters?: Record<string, unknown>
  ): Promise<{ url?: string; storageKey?: string; metadata?: Record<string, unknown> }> {
    // Route to appropriate generator based on media type
    switch (mediaType) {
      case 'image':
        return this.generateImage(prompt, account, modelConfig, parameters);
      case 'video':
        return this.generateVideo(prompt, account, modelConfig, parameters);
      case 'audio':
        return this.generateAudio(prompt, account, modelConfig, parameters);
      case 'text':
        return this.generateText(prompt, account, modelConfig, parameters);
      case 'document':
        return this.generateDocument(prompt, account, modelConfig, parameters);
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }
  }

  /**
   * Generate with model mixing
   */
  private async generateWithMixing(
    mediaType: MediaType,
    prompt: string,
    account: any,
    mixing: any,
    parameters?: Record<string, unknown>
  ): Promise<{ url?: string; storageKey?: string; metadata?: Record<string, unknown> }> {
    if (mixing.strategy === 'weighted') {
      // Generate with multiple models and combine
      const results = await Promise.allSettled(
        mixing.models.map((model: any) =>
          this.generateWithModel(mediaType, prompt, account, model, parameters)
        )
      );

      // Combine results based on weights
      // This is simplified - real implementation would merge outputs
      const successful = results.find((r) => r.status === 'fulfilled');
      if (successful && successful.status === 'fulfilled') {
        return successful.value;
      }
    } else if (mixing.strategy === 'ensemble') {
      // Generate with all models and vote/combine
      const results = await Promise.allSettled(
        mixing.models.map((model: any) =>
          this.generateWithModel(mediaType, prompt, account, model, parameters)
        )
      );

      const successful = results.find((r) => r.status === 'fulfilled');
      if (successful && successful.status === 'fulfilled') {
        return successful.value;
      }
    }

    throw new Error('Model mixing failed');
  }

  /**
   * Generate image
   */
  private async generateImage(
    prompt: string,
    account: any,
    modelConfig: any,
    parameters?: Record<string, unknown>
  ): Promise<{ url?: string; storageKey?: string; metadata?: Record<string, unknown> }> {
    // Call image generation API based on provider
    if (account.provider === 'openai' || account.provider === 'azure') {
      return this.generateImageOpenAI(prompt, account, modelConfig, parameters);
    } else if (account.provider === 'anthropic') {
      // Anthropic doesn't do images directly, would need to use a different service
      throw new Error('Anthropic does not support image generation');
    } else {
      // Generic API call
      return this.generateImageGeneric(prompt, account, modelConfig, parameters);
    }
  }

  /**
   * Generate image via OpenAI/DALL-E
   */
  private async generateImageOpenAI(
    prompt: string,
    account: any,
    modelConfig: any,
    parameters?: Record<string, unknown>
  ): Promise<{ url?: string; storageKey?: string; metadata?: Record<string, unknown> }> {
    const endpoint = account.endpointUrl || 'https://api.openai.com/v1/images/generations';
    const apiKey = account.apiKey;

    if (!apiKey) {
      throw new Error('API key not available');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelConfig.model || 'dall-e-3',
        prompt,
        n: 1,
        size: parameters?.size || '1024x1024',
        quality: parameters?.quality || 'standard',
        ...modelConfig.parameters,
        ...parameters,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Image generation failed: ${response.status} ${error}`);
    }

    const data = await response.json() as { data?: Array<{ url?: string; b64_json?: string }> };
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    // Download and store in R2
    const imageResponse = await fetch(imageUrl);
    const imageData = await imageResponse.arrayBuffer();
    const storageKey = `media/images/${crypto.randomUUID()}.png`;
    
    await this.env.EVIDENCE_VAULT.put(storageKey, imageData, {
      httpMetadata: {
        contentType: 'image/png',
      },
    });

    // Generate public URL
    const publicUrl = `/api/media/${storageKey}`;

    return {
      url: publicUrl,
      storageKey,
      metadata: {
        provider: account.provider,
        model: modelConfig.model,
        size: parameters?.size || '1024x1024',
      },
    };
  }

  /**
   * Generate image via generic API
   */
  private async generateImageGeneric(
    prompt: string,
    account: any,
    modelConfig: any,
    parameters?: Record<string, unknown>
  ): Promise<{ url?: string; storageKey?: string; metadata?: Record<string, unknown> }> {
    // Generic implementation - would call account's endpoint
    const endpoint = account.endpointUrl;
    if (!endpoint) {
      throw new Error('No endpoint URL configured');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': account.apiKey ? `Bearer ${account.apiKey}` : '',
      },
      body: JSON.stringify({
        prompt,
        model: modelConfig.model,
        ...modelConfig.parameters,
        ...parameters,
      }),
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.status}`);
    }

    const data = await response.json() as { url?: string; image?: string; data?: string };
    const imageUrl = data.url || data.image || data.data;

    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    // Download and store
    const imageResponse = await fetch(imageUrl);
    const imageData = await imageResponse.arrayBuffer();
    const storageKey = `media/images/${crypto.randomUUID()}.png`;
    
    await this.env.EVIDENCE_VAULT.put(storageKey, imageData, {
      httpMetadata: {
        contentType: 'image/png',
      },
    });

    return {
      url: `/api/media/${storageKey}`,
      storageKey,
      metadata: {
        provider: account.provider,
        model: modelConfig.model,
      },
    };
  }

  /**
   * Generate video
   */
  private async generateVideo(
    prompt: string,
    account: any,
    modelConfig: any,
    parameters?: Record<string, unknown>
  ): Promise<{ url?: string; storageKey?: string; metadata?: Record<string, unknown> }> {
    // Video generation via API (Runway, Pika, etc.)
    const endpoint = account.endpointUrl || this.getVideoEndpoint(account.provider);
    
    if (!endpoint) {
      throw new Error(`Video generation not supported for provider: ${account.provider}`);
    }

    const apiKey = account.apiKey;
    if (!apiKey) {
      throw new Error('API key not available');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        model: modelConfig.model,
        ...modelConfig.parameters,
        ...parameters,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Video generation failed: ${response.status} ${error}`);
    }

    const data = await response.json() as { url?: string; video_url?: string; output?: string };
    const videoUrl = data.url || data.video_url || data.output;

    if (!videoUrl) {
      throw new Error('No video URL in response');
    }

    // Download and store in R2
    const videoResponse = await fetch(videoUrl);
    const videoData = await videoResponse.arrayBuffer();
    const storageKey = `media/videos/${crypto.randomUUID()}.mp4`;
    
    await this.env.EVIDENCE_VAULT.put(storageKey, videoData, {
      httpMetadata: {
        contentType: 'video/mp4',
      },
    });

    return {
      url: `/api/media/${storageKey}`,
      storageKey,
      metadata: {
        provider: account.provider,
        model: modelConfig.model,
        duration: parameters?.duration || '5s',
      },
    };
  }

  /**
   * Generate audio
   */
  private async generateAudio(
    prompt: string,
    account: any,
    modelConfig: any,
    parameters?: Record<string, unknown>
  ): Promise<{ url?: string; storageKey?: string; metadata?: Record<string, unknown> }> {
    // Audio generation via API (ElevenLabs, etc.)
    const endpoint = account.endpointUrl || this.getAudioEndpoint(account.provider);
    
    if (!endpoint) {
      throw new Error(`Audio generation not supported for provider: ${account.provider}`);
    }

    const apiKey = account.apiKey;
    if (!apiKey) {
      throw new Error('API key not available');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text: prompt, // Audio generation typically uses 'text' not 'prompt'
        model: modelConfig.model,
        ...modelConfig.parameters,
        ...parameters,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Audio generation failed: ${response.status} ${error}`);
    }

    // Audio APIs typically return binary data directly
    let audioData: ArrayBuffer;
    let audioUrl: string | undefined;

    const contentType = response.headers.get('content-type');
    if (contentType?.startsWith('audio/')) {
      // Binary audio data
      audioData = await response.arrayBuffer();
    } else {
      // JSON response with URL
      const data = await response.json() as { url?: string; audio_url?: string; output?: string };
      audioUrl = data.url || data.audio_url || data.output;
      
      if (!audioUrl) {
        throw new Error('No audio URL in response');
      }

      const audioResponse = await fetch(audioUrl);
      audioData = await audioResponse.arrayBuffer();
    }

    const storageKey = `media/audio/${crypto.randomUUID()}.mp3`;
    
    await this.env.EVIDENCE_VAULT.put(storageKey, audioData, {
      httpMetadata: {
        contentType: 'audio/mpeg',
      },
    });

    return {
      url: `/api/media/${storageKey}`,
      storageKey,
      metadata: {
        provider: account.provider,
        model: modelConfig.model,
        format: 'mp3',
      },
    };
  }

  /**
   * Get video endpoint for provider
   */
  private getVideoEndpoint(provider: string): string {
    const endpoints: Record<string, string> = {
      'runway': 'https://api.runwayml.com/v1/generate',
      'pika': 'https://api.pika.art/v1/generate',
      'stability': 'https://api.stability.ai/v2beta/image-to-video',
    };
    return endpoints[provider] || '';
  }

  /**
   * Get audio endpoint for provider
   */
  private getAudioEndpoint(provider: string): string {
    const endpoints: Record<string, string> = {
      'elevenlabs': 'https://api.elevenlabs.io/v1/text-to-speech',
      'openai': 'https://api.openai.com/v1/audio/speech',
      'google': 'https://texttospeech.googleapis.com/v1/text:synthesize',
    };
    return endpoints[provider] || '';
  }

  /**
   * Generate text
   */
  private async generateText(
    prompt: string,
    account: any,
    modelConfig: any,
    parameters?: Record<string, unknown>
  ): Promise<{ url?: string; storageKey?: string; metadata?: Record<string, unknown> }> {
    const apiKey = account.apiKey;
    if (!apiKey) {
      throw new Error('API key not available');
    }

    let text = '';

    // Handle different providers
    if (account.provider === 'anthropic') {
      // Anthropic uses messages API
      const endpoint = account.endpointUrl || 'https://api.anthropic.com/v1/messages';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelConfig.model,
          max_tokens: parameters?.max_tokens || 1000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          ...modelConfig.parameters,
          ...parameters,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Text generation failed: ${response.status} ${error}`);
      }

      const data = await response.json() as { content?: Array<{ text?: string; type?: string }> };
      text = data.content?.find(c => c.type === 'text')?.text || '';
    } else if (account.provider === 'openai' || account.provider === 'azure') {
      // OpenAI uses chat completions
      const endpoint = account.endpointUrl || (account.provider === 'azure' 
        ? `https://${account.metadata?.resource || 'resource'}.openai.azure.com/openai/deployments/${modelConfig.model}/chat/completions?api-version=2024-02-15-preview`
        : 'https://api.openai.com/v1/chat/completions');
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': account.provider === 'azure' ? `api-key ${apiKey}` : `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelConfig.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: parameters?.max_tokens || 1000,
          temperature: parameters?.temperature || 0.7,
          ...modelConfig.parameters,
          ...parameters,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Text generation failed: ${response.status} ${error}`);
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      text = data.choices?.[0]?.message?.content || '';
    } else {
      // Generic API call
      const endpoint = account.endpointUrl || this.getDefaultEndpoint(account.provider);
      if (!endpoint) {
        throw new Error(`No endpoint configured for provider: ${account.provider}`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelConfig.model,
          prompt,
          max_tokens: parameters?.max_tokens || 1000,
          temperature: parameters?.temperature || 0.7,
          ...modelConfig.parameters,
          ...parameters,
        }),
      });

      if (!response.ok) {
        throw new Error(`Text generation failed: ${response.status}`);
      }

      const data = await response.json() as { text?: string; content?: string; choices?: Array<{ text?: string }> };
      text = data.text || data.content || data.choices?.[0]?.text || '';
    }

    if (!text) {
      throw new Error('No text generated');
    }

    // Store text in R2
    const textData = new TextEncoder().encode(text);
    const storageKey = `media/text/${crypto.randomUUID()}.txt`;
    
    await this.env.EVIDENCE_VAULT.put(storageKey, textData, {
      httpMetadata: {
        contentType: 'text/plain',
      },
    });

    return {
      url: `/api/media/${storageKey}`,
      storageKey,
      metadata: {
        provider: account.provider,
        model: modelConfig.model,
        length: text.length,
        text: text.substring(0, 100), // Store preview
      },
    };
  }

  /**
   * Generate document
   */
  private async generateDocument(
    prompt: string,
    account: any,
    modelConfig: any,
    parameters?: Record<string, unknown>
  ): Promise<{ url?: string; storageKey?: string; metadata?: Record<string, unknown> }> {
    // Generate text first, then format as document
    const textResult = await this.generateText(prompt, account, modelConfig, parameters);
    
    // Convert to document format (PDF, DOCX, etc.)
    const format = parameters?.format || 'pdf';
    const storageKey = `media/documents/${crypto.randomUUID()}.${format}`;
    
    // In production, would use a document generation library
    // For now, store as text
    await this.env.EVIDENCE_VAULT.put(storageKey, new TextEncoder().encode(textResult.metadata?.text as string || ''), {
      httpMetadata: {
        contentType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    });

    return {
      url: `/api/media/${storageKey}`,
      storageKey,
      metadata: {
        ...textResult.metadata,
        format,
      },
    };
  }

  /**
   * Get default endpoint for provider
   */
  private getDefaultEndpoint(provider: string): string {
    const endpoints: Record<string, string> = {
      openai: 'https://api.openai.com/v1/completions',
      anthropic: 'https://api.anthropic.com/v1/messages',
      azure: 'https://{resource}.openai.azure.com/openai/deployments/{deployment}/completions',
      google: 'https://generativelanguage.googleapis.com/v1/models',
      cohere: 'https://api.cohere.ai/v1/generate',
    };
    return endpoints[provider] || '';
  }

  /**
   * Save job to database
   */
  private async saveJob(job: MediaGenerationJob): Promise<void> {
    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB
          .prepare(
            'INSERT OR REPLACE INTO media_generation_jobs (id, job_type, prompt, preset_id, workflow_type, status, priority, attempts, max_attempts, llm_account_id, model_used, result_url, result_storage_key, result_metadata, error_message, generation_time_ms, cost, created_at, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            job.id,
            job.jobType,
            job.prompt,
            job.presetId || null,
            job.workflowType,
            job.status,
            job.priority,
            job.attempts,
            job.maxAttempts,
            job.llmAccountId || null,
            job.modelUsed || null,
            job.resultUrl || null,
            job.resultStorageKey || null,
            job.resultMetadata ? JSON.stringify(job.resultMetadata) : null,
            job.errorMessage || null,
            job.generationTimeMs || null,
            job.cost,
            job.createdAt,
            job.startedAt || null,
            job.completedAt || null
          )
          .run();
      } else {
        await this.env.CONFIG_STORE.put(`media_job:${job.id}`, JSON.stringify(job));
      }
    } catch (error) {
      console.error('Failed to save job:', error);
      await this.env.CONFIG_STORE.put(`media_job:${job.id}`, JSON.stringify(job));
    }
  }

  /**
   * Record generation event
   */
  private async recordEvent(
    jobId: string,
    eventType: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const eventId = crypto.randomUUID();
    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB
          .prepare(
            'INSERT INTO media_generation_events (id, job_id, event_type, llm_account_id, model_used, duration_ms, cost, error_message, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            eventId,
            jobId,
            eventType,
            metadata.accountId || null,
            metadata.model || null,
            metadata.duration || null,
            metadata.cost || 0,
            metadata.error || null,
            JSON.stringify(metadata),
            Date.now()
          )
          .run();
      }
    } catch (error) {
      console.error('Failed to record event:', error);
    }
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<MediaGenerationJob | null> {
    try {
      if (this.env.DEFENDER_DB) {
        const result = await this.env.DEFENDER_DB
          .prepare('SELECT * FROM media_generation_jobs WHERE id = ?')
          .bind(jobId)
          .first<{
            id: string;
            job_type: string;
            prompt: string;
            preset_id: string | null;
            workflow_type: string;
            status: string;
            priority: number;
            attempts: number;
            max_attempts: number;
            llm_account_id: string | null;
            model_used: string | null;
            result_url: string | null;
            result_storage_key: string | null;
            result_metadata: string | null;
            error_message: string | null;
            generation_time_ms: number | null;
            cost: number;
            created_at: number;
            started_at: number | null;
            completed_at: number | null;
          }>();

        if (!result) return null;

        return {
          id: result.id,
          jobType: result.job_type as MediaType,
          prompt: result.prompt,
          presetId: result.preset_id || undefined,
          workflowType: result.workflow_type as WorkflowType,
          status: result.status as MediaGenerationJob['status'],
          priority: result.priority,
          attempts: result.attempts,
          maxAttempts: result.max_attempts,
          llmAccountId: result.llm_account_id || undefined,
          modelUsed: result.model_used || undefined,
          resultUrl: result.result_url || undefined,
          resultStorageKey: result.result_storage_key || undefined,
          resultMetadata: result.result_metadata ? JSON.parse(result.result_metadata) : undefined,
          errorMessage: result.error_message || undefined,
          generationTimeMs: result.generation_time_ms || undefined,
          cost: result.cost,
          createdAt: result.created_at,
          startedAt: result.started_at || undefined,
          completedAt: result.completed_at || undefined,
        };
      } else {
        const data = await this.env.CONFIG_STORE.get(`media_job:${jobId}`);
        if (!data) return null;
        return JSON.parse(data) as MediaGenerationJob;
      }
    } catch (error) {
      console.error('Failed to get job:', error);
      return null;
    }
  }

  /**
   * List jobs
   */
  async listJobs(options: {
    mediaType?: MediaType;
    status?: MediaGenerationJob['status'];
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: MediaGenerationJob[]; total: number }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    try {
      if (this.env.DEFENDER_DB) {
        let query = 'SELECT * FROM media_generation_jobs WHERE 1=1';
        const params: unknown[] = [];

        if (options.mediaType) {
          query += ' AND job_type = ?';
          params.push(options.mediaType);
        }
        if (options.status) {
          query += ' AND status = ?';
          params.push(options.status);
        }

        // Get total
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const countResult = await this.env.DEFENDER_DB
          .prepare(countQuery)
          .bind(...params)
          .first<{ total: number }>();

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const result = await this.env.DEFENDER_DB
          .prepare(query)
          .bind(...params)
          .all<{
            id: string;
            job_type: string;
            prompt: string;
            preset_id: string | null;
            workflow_type: string;
            status: string;
            priority: number;
            attempts: number;
            max_attempts: number;
            llm_account_id: string | null;
            model_used: string | null;
            result_url: string | null;
            result_storage_key: string | null;
            result_metadata: string | null;
            error_message: string | null;
            generation_time_ms: number | null;
            cost: number;
            created_at: number;
            started_at: number | null;
            completed_at: number | null;
          }>();

        const jobs: MediaGenerationJob[] = result.results.map((row) => ({
          id: row.id,
          jobType: row.job_type as MediaType,
          prompt: row.prompt,
          presetId: row.preset_id || undefined,
          workflowType: row.workflow_type as WorkflowType,
          status: row.status as MediaGenerationJob['status'],
          priority: row.priority,
          attempts: row.attempts,
          maxAttempts: row.max_attempts,
          llmAccountId: row.llm_account_id || undefined,
          modelUsed: row.model_used || undefined,
          resultUrl: row.result_url || undefined,
          resultStorageKey: row.result_storage_key || undefined,
          resultMetadata: row.result_metadata ? JSON.parse(row.result_metadata) : undefined,
          errorMessage: row.error_message || undefined,
          generationTimeMs: row.generation_time_ms || undefined,
          cost: row.cost,
          createdAt: row.created_at,
          startedAt: row.started_at || undefined,
          completedAt: row.completed_at || undefined,
        }));

        return {
          jobs,
          total: countResult?.total || 0,
        };
      } else {
        return { jobs: [], total: 0 };
      }
    } catch (error) {
      console.error('Failed to list jobs:', error);
      return { jobs: [], total: 0 };
    }
  }
}


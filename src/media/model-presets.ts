/**
 * Model Mix Presets System
 * 
 * Defines model combinations and configurations for different media types and workflows
 */

import type { Env } from '../types';

export type MediaType = 'image' | 'video' | 'audio' | 'text' | 'document';
export type WorkflowType = 'simple' | 'adaptive';

export interface ModelConfig {
  provider: string;
  model: string;
  parameters?: Record<string, unknown>;
  weight?: number; // For mixing
}

export interface ModelPreset {
  id: string;
  name: string;
  description?: string;
  mediaType: MediaType;
  workflowType: WorkflowType;
  modelConfig: {
    primary: ModelConfig;
    fallback: ModelConfig[];
    mixing?: {
      enabled: boolean;
      models: ModelConfig[];
      strategy: 'weighted' | 'ensemble' | 'sequential';
    };
  };
  priority: number;
  successRate: number;
  usageCount: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface ModelPresetOptions {
  name: string;
  description?: string;
  mediaType: MediaType;
  workflowType: WorkflowType;
  modelConfig: ModelPreset['modelConfig'];
  priority?: number;
  metadata?: Record<string, unknown>;
}

export class ModelPresetManager {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Create a model preset
   */
  async createPreset(options: ModelPresetOptions): Promise<ModelPreset> {
    const id = crypto.randomUUID();
    const preset: ModelPreset = {
      id,
      name: options.name,
      description: options.description,
      mediaType: options.mediaType,
      workflowType: options.workflowType,
      modelConfig: options.modelConfig,
      priority: options.priority || 0,
      successRate: 0.0,
      usageCount: 0,
      metadata: options.metadata,
      createdAt: Date.now(),
    };

    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB
          .prepare(
            'INSERT INTO model_presets (id, name, description, media_type, workflow_type, model_config, priority, success_rate, usage_count, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            id,
            options.name,
            options.description || null,
            options.mediaType,
            options.workflowType,
            JSON.stringify(options.modelConfig),
            preset.priority,
            0.0,
            0,
            options.metadata ? JSON.stringify(options.metadata) : null,
            preset.createdAt
          )
          .run();
      } else {
        await this.env.CONFIG_STORE.put(`model_preset:${id}`, JSON.stringify(preset));
      }
    } catch (error) {
      console.error('Failed to create preset:', error);
      await this.env.CONFIG_STORE.put(`model_preset:${id}`, JSON.stringify(preset));
    }

    return preset;
  }

  /**
   * Get presets for media type and workflow
   */
  async getPresets(
    mediaType: MediaType,
    workflowType?: WorkflowType
  ): Promise<ModelPreset[]> {
    try {
      if (this.env.DEFENDER_DB) {
        let query = 'SELECT * FROM model_presets WHERE media_type = ?';
        const params: unknown[] = [mediaType];

        if (workflowType) {
          query += ' AND workflow_type = ?';
          params.push(workflowType);
        }

        query += ' ORDER BY priority DESC, success_rate DESC';

        const result = await this.env.DEFENDER_DB
          .prepare(query)
          .bind(...params)
          .all<{
            id: string;
            name: string;
            description: string | null;
            media_type: string;
            workflow_type: string;
            model_config: string;
            priority: number;
            success_rate: number;
            usage_count: number;
            metadata: string | null;
            created_at: number;
          }>();

        return result.results.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description || undefined,
          mediaType: row.media_type as MediaType,
          workflowType: row.workflow_type as WorkflowType,
          modelConfig: JSON.parse(row.model_config) as ModelPreset['modelConfig'],
          priority: row.priority,
          successRate: row.success_rate,
          usageCount: row.usage_count,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          createdAt: row.created_at,
        }));
      } else {
        const list = await this.env.CONFIG_STORE.list({ prefix: 'model_preset:' });
        const presets: ModelPreset[] = [];

        for (const key of list.keys) {
          const data = await this.env.CONFIG_STORE.get(key.name);
          if (data) {
            const preset = JSON.parse(data) as ModelPreset;
            if (preset.mediaType === mediaType && (!workflowType || preset.workflowType === workflowType)) {
              presets.push(preset);
            }
          }
        }

        return presets.sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return b.successRate - a.successRate;
        });
      }
    } catch (error) {
      console.error('Failed to get presets:', error);
      return [];
    }
  }

  /**
   * Get preset by ID
   */
  async getPreset(presetId: string): Promise<ModelPreset | null> {
    try {
      if (this.env.DEFENDER_DB) {
        const result = await this.env.DEFENDER_DB
          .prepare('SELECT * FROM model_presets WHERE id = ?')
          .bind(presetId)
          .first<{
            id: string;
            name: string;
            description: string | null;
            media_type: string;
            workflow_type: string;
            model_config: string;
            priority: number;
            success_rate: number;
            usage_count: number;
            metadata: string | null;
            created_at: number;
          }>();

        if (!result) return null;

        return {
          id: result.id,
          name: result.name,
          description: result.description || undefined,
          mediaType: result.media_type as MediaType,
          workflowType: result.workflow_type as WorkflowType,
          modelConfig: JSON.parse(result.model_config) as ModelPreset['modelConfig'],
          priority: result.priority,
          successRate: result.success_rate,
          usageCount: result.usage_count,
          metadata: result.metadata ? JSON.parse(result.metadata) : undefined,
          createdAt: result.created_at,
        };
      } else {
        const data = await this.env.CONFIG_STORE.get(`model_preset:${presetId}`);
        if (!data) return null;
        return JSON.parse(data) as ModelPreset;
      }
    } catch (error) {
      console.error('Failed to get preset:', error);
      return null;
    }
  }

  /**
   * Update preset success rate
   */
  async updateSuccessRate(presetId: string, success: boolean): Promise<void> {
    try {
      if (this.env.DEFENDER_DB) {
        const preset = await this.getPreset(presetId);
        if (!preset) return;

        const newUsageCount = preset.usageCount + 1;
        const successCount = Math.floor(preset.successRate * preset.usageCount) + (success ? 1 : 0);
        const newSuccessRate = successCount / newUsageCount;

        await this.env.DEFENDER_DB
          .prepare(
            'UPDATE model_presets SET usage_count = ?, success_rate = ? WHERE id = ?'
          )
          .bind(newUsageCount, newSuccessRate, presetId)
          .run();
      } else {
        const data = await this.env.CONFIG_STORE.get(`model_preset:${presetId}`);
        if (data) {
          const preset = JSON.parse(data) as ModelPreset;
          preset.usageCount++;
          const successCount = Math.floor(preset.successRate * (preset.usageCount - 1)) + (success ? 1 : 0);
          preset.successRate = successCount / preset.usageCount;
          await this.env.CONFIG_STORE.put(`model_preset:${presetId}`, JSON.stringify(preset));
        }
      }
    } catch (error) {
      console.error('Failed to update success rate:', error);
    }
  }
}


/**
 * Default Model Presets
 * 
 * Pre-configured model presets for all media types and workflows
 */

import type { ModelPresetOptions } from './model-presets';

export const DEFAULT_PRESETS: ModelPresetOptions[] = [
  // Image Generation - Simple Pipeline
  {
    name: 'DALL-E 3 Simple',
    description: 'Simple image generation using DALL-E 3',
    mediaType: 'image',
    workflowType: 'simple',
    modelConfig: {
      primary: {
        provider: 'openai',
        model: 'dall-e-3',
        parameters: { size: '1024x1024', quality: 'standard' },
      },
      fallback: [
        {
          provider: 'openai',
          model: 'dall-e-2',
          parameters: { size: '1024x1024' },
        },
      ],
    },
    priority: 10,
  },

  // Image Generation - Adaptive Workflow
  {
    name: 'DALL-E Adaptive',
    description: 'Adaptive image generation with model mixing',
    mediaType: 'image',
    workflowType: 'adaptive',
    modelConfig: {
      primary: {
        provider: 'openai',
        model: 'dall-e-3',
        parameters: { size: '1024x1024', quality: 'hd' },
      },
      fallback: [
        {
          provider: 'openai',
          model: 'dall-e-2',
          parameters: { size: '1024x1024' },
        },
      ],
      mixing: {
        enabled: true,
        models: [
          {
            provider: 'openai',
            model: 'dall-e-3',
            weight: 0.7,
            parameters: { size: '1024x1024', quality: 'hd' },
          },
          {
            provider: 'openai',
            model: 'dall-e-2',
            weight: 0.3,
            parameters: { size: '1024x1024' },
          },
        ],
        strategy: 'weighted',
      },
    },
    priority: 9,
  },

  // Text Generation - Simple Pipeline
  {
    name: 'GPT-4 Simple',
    description: 'Simple text generation using GPT-4',
    mediaType: 'text',
    workflowType: 'simple',
    modelConfig: {
      primary: {
        provider: 'openai',
        model: 'gpt-4-turbo',
        parameters: { temperature: 0.7, max_tokens: 2000 },
      },
      fallback: [
        {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          parameters: { temperature: 0.7, max_tokens: 2000 },
        },
        {
          provider: 'anthropic',
          model: 'claude-3-opus',
          parameters: { temperature: 0.7, max_tokens: 2000 },
        },
      ],
    },
    priority: 10,
  },

  // Text Generation - Adaptive Workflow
  {
    name: 'Multi-LLM Adaptive',
    description: 'Adaptive text generation with multiple LLM providers',
    mediaType: 'text',
    workflowType: 'adaptive',
    modelConfig: {
      primary: {
        provider: 'openai',
        model: 'gpt-4-turbo',
        parameters: { temperature: 0.7, max_tokens: 2000 },
      },
      fallback: [
        {
          provider: 'anthropic',
          model: 'claude-3-opus',
          parameters: { temperature: 0.7, max_tokens: 2000 },
        },
        {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          parameters: { temperature: 0.7, max_tokens: 2000 },
        },
      ],
      mixing: {
        enabled: true,
        models: [
          {
            provider: 'openai',
            model: 'gpt-4-turbo',
            weight: 0.5,
            parameters: { temperature: 0.7, max_tokens: 2000 },
          },
          {
            provider: 'anthropic',
            model: 'claude-3-opus',
            weight: 0.5,
            parameters: { temperature: 0.7, max_tokens: 2000 },
          },
        ],
        strategy: 'ensemble',
      },
    },
    priority: 9,
  },

  // Document Generation - Simple Pipeline
  {
    name: 'Document Simple',
    description: 'Simple document generation',
    mediaType: 'document',
    workflowType: 'simple',
    modelConfig: {
      primary: {
        provider: 'openai',
        model: 'gpt-4-turbo',
        parameters: { temperature: 0.7, max_tokens: 4000 },
      },
      fallback: [
        {
          provider: 'anthropic',
          model: 'claude-3-opus',
          parameters: { temperature: 0.7, max_tokens: 4000 },
        },
      ],
    },
    priority: 10,
  },

  // Document Generation - Adaptive Workflow
  {
    name: 'Document Adaptive',
    description: 'Adaptive document generation with quality optimization',
    mediaType: 'document',
    workflowType: 'adaptive',
    modelConfig: {
      primary: {
        provider: 'anthropic',
        model: 'claude-3-opus',
        parameters: { temperature: 0.7, max_tokens: 4000 },
      },
      fallback: [
        {
          provider: 'openai',
          model: 'gpt-4-turbo',
          parameters: { temperature: 0.7, max_tokens: 4000 },
        },
      ],
    },
    priority: 9,
  },
];

/**
 * Initialize default presets
 */
export async function initializeDefaultPresets(
  presetManager: any
): Promise<void> {
  for (const preset of DEFAULT_PRESETS) {
    try {
      // Check if preset already exists
      const existing = await presetManager.getPresets(
        preset.mediaType,
        preset.workflowType
      );
      
      const alreadyExists = existing.some((p: any) => p.name === preset.name);
      if (!alreadyExists) {
        await presetManager.createPreset(preset);
        console.log(`Created default preset: ${preset.name}`);
      }
    } catch (error) {
      console.error(`Failed to create preset ${preset.name}:`, error);
    }
  }
}


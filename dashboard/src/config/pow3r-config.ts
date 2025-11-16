const MCP_CONFIG_URL = 'https://config.superbots.link/';

export type RenderingMode = '2d' | '3d' | 'react_flow' | 'threejs';
export type Theme = 'true-black' | 'light' | 'glass';

export interface RenderingConfig {
  enabled: boolean;
  component?: string;
  props?: Record<string, unknown>;
  data_driven?: boolean;
  theme_aware?: boolean;
}

export interface ThemeConfig {
  chart_colors?: string[];
  backdrop_filter?: string;
  colors?: {
    background?: string;
    surface?: string;
    border?: string;
    text?: string;
    text_secondary?: string;
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

export interface ObservabilityConfig {
  emit_traces?: boolean;
  log_predictions?: boolean;
  log_features?: boolean;
  log_explanations?: boolean;
  log_events?: boolean;
  event_types?: string[];
}

export interface ComponentConfig {
  component_id: string;
  component_type: string;
  version: string;
  config: {
    rendering: {
      '2d'?: RenderingConfig;
      '3d'?: RenderingConfig;
      react_flow?: RenderingConfig;
      threejs?: RenderingConfig;
    };
    themes: {
      dark?: ThemeConfig;
      light?: ThemeConfig;
      glass?: ThemeConfig;
    };
    observability?: ObservabilityConfig;
    inputs?: Record<string, string>;
    outputs?: Record<string, string>;
    [key: string]: unknown;
  };
}

export interface WorkflowConfig {
  workflow_id: string;
  name: string;
  steps: Array<{
    step_id: string;
    component_id: string;
    inputs: Record<string, string>;
    outputs: Record<string, string>;
  }>;
}

export interface KnowledgeGraphConfig {
  graph_id: string;
  schema: {
    entities: Array<{
      type: string;
      properties: Record<string, unknown>;
    }>;
    relationships: Array<{
      type: string;
      source: string;
      target: string;
    }>;
  };
}

export interface Pow3rConfig {
  version: string;
  schema: string;
  components?: Record<string, ComponentConfig>;
  workflows?: Record<string, WorkflowConfig>;
  knowledgeGraph?: Record<string, KnowledgeGraphConfig>;
  global?: {
    default_rendering_mode?: RenderingMode;
    default_theme?: Theme;
    observability?: ObservabilityConfig;
  };
}

let cachedConfig: Pow3rConfig | null = null;

export async function fetchPow3rConfig(): Promise<Pow3rConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const response = await fetch(`${MCP_CONFIG_URL}/config/pow3r-v4`);
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.statusText}`);
    }
    cachedConfig = await response.json() as Pow3rConfig;
    return cachedConfig;
  } catch (error) {
    console.warn('Failed to fetch Pow3r config, using defaults:', error);
    // Return default config if fetch fails
    return {
      version: '4.0.0',
      schema: 'pow3r-v4',
      components: {},
      workflows: {},
      knowledgeGraph: {},
      global: {
        default_rendering_mode: '2d',
        default_theme: 'true-black',
        observability: {
          emit_traces: true,
          log_events: true,
        },
      },
    };
  }
}

export function getConfig(): Pow3rConfig | null {
  return cachedConfig;
}

export function getComponentConfig(componentId: string): ComponentConfig | null {
  const config = getConfig();
  if (!config || !config.components) {
    return null;
  }
  return config.components[componentId] || null;
}

export function getWorkflowConfig(workflowId: string): WorkflowConfig | null {
  const config = getConfig();
  if (!config || !config.workflows) {
    return null;
  }
  return config.workflows[workflowId] || null;
}

export function getKnowledgeGraphConfig(graphId: string): KnowledgeGraphConfig | null {
  const config = getConfig();
  if (!config || !config.knowledgeGraph) {
    return null;
  }
  return config.knowledgeGraph[graphId] || null;
}

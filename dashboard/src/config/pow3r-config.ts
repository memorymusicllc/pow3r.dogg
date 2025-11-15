const MCP_CONFIG_URL = 'https://config.superbots.link/';

export interface Pow3rConfig {
  version: string;
  schema: string;
  components?: Record<string, unknown>;
  workflows?: Record<string, unknown>;
  knowledgeGraph?: Record<string, unknown>;
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
    };
  }
}

export function getConfig(): Pow3rConfig | null {
  return cachedConfig;
}


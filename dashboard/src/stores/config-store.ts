import { create } from 'zustand';
import {
  fetchPow3rConfig,
  getComponentConfig,
  type Pow3rConfig,
  type RenderingMode,
  type Theme,
} from '../config/pow3r-config';
import type { ObservationalData, ComponentEvent } from '../types/observational';
import { emitComponentEvent } from '../utils/observability';

interface ConfigStore {
  config: Pow3rConfig | null;
  loading: boolean;
  error: string | null;
  renderingMode: RenderingMode;
  theme: Theme;
  observationalData: Map<string, ObservationalData[]>;
  fetchConfig: () => Promise<void>;
  setRenderingMode: (mode: RenderingMode) => void;
  setTheme: (theme: Theme) => void;
  getComponentConfig: (componentId: string) => ReturnType<typeof getComponentConfig>;
  addObservationalData: (componentId: string, data: ObservationalData) => void;
  getObservationalData: (componentId: string) => ObservationalData[];
  emitEvent: (componentId: string, event: ComponentEvent) => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: null,
  loading: false,
  error: null,
  renderingMode: '2d',
  theme: 'true-black',
  observationalData: new Map(),
  fetchConfig: async () => {
    set({ loading: true, error: null });
    try {
      const config = await fetchPow3rConfig();
      set({
        config,
        loading: false,
        renderingMode:
          config.global?.default_rendering_mode || '2d',
        theme: config.global?.default_theme || 'true-black',
      });
      emitComponentEvent('config-store', 'config_loaded', {
        version: config.version,
        schema: config.schema,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch config';
      set({
        error: errorMessage,
        loading: false,
      });
      emitComponentEvent('config-store', 'config_error', {
        error: errorMessage,
      });
    }
  },
  setRenderingMode: (mode: RenderingMode) => {
    set({ renderingMode: mode });
    emitComponentEvent('config-store', 'rendering_mode_changed', { mode });
  },
  setTheme: (theme: Theme) => {
    set({ theme });
    emitComponentEvent('config-store', 'theme_changed', { theme });
  },
  getComponentConfig: (componentId: string) => {
    return getComponentConfig(componentId);
  },
  addObservationalData: (componentId: string, data: ObservationalData) => {
    const { observationalData } = get();
    const existing = observationalData.get(componentId) || [];
    const updated = new Map(observationalData);
    updated.set(componentId, [...existing, data]);
    set({ observationalData: updated });
  },
  getObservationalData: (componentId: string) => {
    const { observationalData } = get();
    return observationalData.get(componentId) || [];
  },
  emitEvent: (componentId: string, event: ComponentEvent) => {
    emitComponentEvent(componentId, event.event_type, event.data, event.metadata);
  },
}));
